import type { MatchStateResponse, PostEventRequest, StoredEvent } from '@neronu/api-contract';
import {
  basketball,
  type BasketballEvent,
  type BasketballRules,
  type BasketballState,
} from '@neronu/sport-basketball';
import { computeState, validateNext, type MatchSetup, type VoidEvent } from '@neronu/sport-core';
import { api as defaultApi, HttpError, NetworkError } from '../api/client';
import { store as defaultStore } from '../storage';

export type TableEvent = BasketballEvent | VoidEvent;
export type Draft = Omit<BasketballEvent, 'id'> | Omit<VoidEvent, 'id'>;

export type SyncStatus =
  /** Tudo enviado. */
  | 'synced'
  /** Enviando a fila. */
  | 'sending'
  /** Sem conexão ou API fora; a fila espera e é reenviada sozinha. */
  | 'offline'
  /** A API recusou a chave de acesso; a fila espera. */
  | 'unauthorized';

export interface Rejection {
  event: TableEvent;
  code: string;
  message: string;
}

export interface TableSnapshot {
  /** Dados da partida vindos da API (cacheados para abrir sem rede). */
  server: MatchStateResponse;
  setup: MatchSetup;
  rules: BasketballRules;
  /** Eventos já gravados na API, em ordem de sequência. */
  confirmed: TableEvent[];
  /** Eventos registrados na mesa e ainda não confirmados, na ordem do toque. */
  pending: TableEvent[];
  /** Estado calculado com confirmados + pendentes: é o que a tela mostra. */
  state: BasketballState;
  sync: SyncStatus;
  /** Eventos que a API recusou depois de aplicados na mesa (raro: só se a mesa divergir). */
  rejections: Rejection[];
  /** Carregado do cache local porque a API não respondeu. */
  fromCache: boolean;
}

export type RecordResult = { ok: true; id: string } | { ok: false; code: string; message: string };

interface Deps {
  api: Pick<typeof defaultApi, 'state' | 'postEvent'>;
  store: typeof defaultStore;
  now: () => Date;
  newId: () => string;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

const MAX_BACKOFF_MS = 15_000;

/** Id de evento. `crypto.randomUUID` só existe em contexto seguro; o celular em http da rede local não tem. */
export function newEventId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const toTableEvent = (e: StoredEvent): TableEvent =>
  ({
    id: e.id,
    seq: e.seq,
    type: e.type,
    payload: e.payload,
    ...(e.recordedAt ? { recordedAt: e.recordedAt } : {}),
  }) as TableEvent;

const toRequest = (e: TableEvent): PostEventRequest => ({
  id: e.id,
  type: e.type,
  payload: e.payload as unknown as Record<string, unknown>,
  ...(e.recordedAt ? { recordedAt: e.recordedAt } : {}),
});

function setupFrom(server: MatchStateResponse): MatchSetup {
  const side = (s: 'home' | 'away') => ({
    teamId: server.roster[s].teamId,
    roster: server.roster[s].roster.map((r) => ({
      athleteId: r.athleteId,
      number: r.number,
      isStarter: r.isStarter,
    })),
  });
  return { home: side('home'), away: side('away') };
}

/**
 * Motor da tela de mesa. Cada toque vira um evento aplicado na hora com o módulo do esporte
 * e entra numa fila persistida no aparelho; a fila é enviada em ordem e reenviada sozinha
 * quando a conexão volta. O id do evento é a chave de idempotência, então reenviar é seguro.
 */
export class MatchTable {
  private snapshot: TableSnapshot | null = null;
  private listeners = new Set<() => void>();
  private flushing = false;
  private retryHandle: unknown = null;
  private backoff = 1000;
  private disposed = false;
  private readonly deps: Deps;

  constructor(
    readonly matchId: string,
    deps: Partial<Deps> = {},
  ) {
    this.deps = {
      api: defaultApi,
      store: defaultStore,
      now: () => new Date(),
      newId: newEventId,
      setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
      clearTimeout: (h) => globalThis.clearTimeout(h as number),
      ...deps,
    };
  }

  private get keys() {
    return {
      server: `neronu:match:${this.matchId}`,
      pending: `neronu:pending:${this.matchId}`,
    };
  }

  // ─── Assinatura (useSyncExternalStore) ──────────────────────────────────────

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): TableSnapshot | null => this.snapshot;

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  // ─── Carga ──────────────────────────────────────────────────────────────────

  /** Carrega da API; sem rede, abre do cache local. Lança se não houver nenhum dos dois. */
  async load(): Promise<void> {
    let server: MatchStateResponse;
    let fromCache = false;
    try {
      server = await this.deps.api.state(this.matchId);
      this.deps.store.set(this.keys.server, server);
    } catch (err) {
      const cached = this.deps.store.get<MatchStateResponse>(this.keys.server);
      if (!(err instanceof NetworkError) || !cached) throw err;
      server = cached;
      fromCache = true;
    }
    const confirmed = server.events.map(toTableEvent);
    const known = new Set(confirmed.map((e) => e.id));
    // Pendentes que já chegaram à API (a resposta se perdeu) saem da fila.
    const pending = (this.deps.store.get<TableEvent[]>(this.keys.pending) ?? []).filter(
      (e) => !known.has(e.id),
    );
    this.set({
      server,
      setup: setupFrom(server),
      rules: server.match.rules as BasketballRules,
      confirmed,
      pending,
      rejections: this.snapshot?.rejections ?? [],
      sync: pending.length ? 'sending' : 'synced',
      fromCache,
    });
    if (pending.length) void this.flush();
  }

  private set(next: Omit<TableSnapshot, 'state'>): void {
    const state = computeState(basketball, next.setup, next.rules, [
      ...next.confirmed,
      ...next.pending,
    ]);
    this.snapshot = { ...next, state };
    this.deps.store.set(this.keys.pending, next.pending);
    this.emit();
  }

  private patch(changes: Partial<Omit<TableSnapshot, 'state'>>): void {
    if (!this.snapshot) return;
    const { state: _ignored, ...rest } = this.snapshot;
    void _ignored;
    this.set({ ...rest, ...changes });
  }

  // ─── Registro ───────────────────────────────────────────────────────────────

  get events(): TableEvent[] {
    return this.snapshot ? [...this.snapshot.confirmed, ...this.snapshot.pending] : [];
  }

  get closed(): boolean {
    return this.snapshot?.server.match.status === 'closed';
  }

  /** Confere com o módulo, aplica na tela e põe na fila. Recusa na hora o que a regra não permite. */
  record(draft: Draft): RecordResult {
    const snap = this.snapshot;
    if (!snap) return { ok: false, code: 'not_loaded', message: 'Partida ainda não carregada.' };
    if (this.closed)
      return { ok: false, code: 'match_closed', message: 'A súmula já foi fechada.' };
    const event = {
      ...draft,
      id: this.deps.newId(),
      recordedAt: this.deps.now().toISOString(),
    } as TableEvent;
    const check = validateNext(basketball, snap.setup, snap.rules, this.events, event);
    if (!check.ok) return { ok: false, code: check.code, message: check.message };
    this.patch({ pending: [...snap.pending, event], sync: 'sending' });
    void this.flush();
    return { ok: true, id: event.id };
  }

  /** Anula um evento já registrado (o núcleo recusa se quebrar um lance posterior). */
  voidEvent(targetId: string): RecordResult {
    return this.record({ type: 'void', payload: { targetId } });
  }

  dismissRejections(): void {
    this.patch({ rejections: [] });
  }

  // ─── Envio ──────────────────────────────────────────────────────────────────

  /** Envia a fila em ordem, um evento por vez. Só um envio roda por vez. */
  async flush(): Promise<void> {
    if (this.flushing || this.disposed) return;
    this.flushing = true;
    this.clearRetry();
    try {
      while (this.snapshot && this.snapshot.pending.length && !this.disposed) {
        const event = this.snapshot.pending[0]!;
        try {
          const res = await this.deps.api.postEvent(this.matchId, toRequest(event));
          this.backoff = 1000;
          const snap = this.snapshot;
          this.patch({
            confirmed: [...snap.confirmed, toTableEvent(res.event)],
            pending: snap.pending.filter((e) => e.id !== event.id),
            fromCache: false,
          });
        } catch (err) {
          if (this.isRetryable(err)) {
            this.patch({
              sync: err instanceof HttpError && err.status === 401 ? 'unauthorized' : 'offline',
            });
            this.scheduleRetry();
            return;
          }
          const httpErr = err as HttpError;
          this.reject(event, httpErr.code, httpErr.message);
        }
      }
      this.patch({ sync: 'synced' });
    } finally {
      this.flushing = false;
    }
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof NetworkError) return true;
    if (err instanceof HttpError)
      return err.status >= 500 || err.status === 401 || err.status === 429;
    return true;
  }

  /**
   * A API recusou o evento: tira da fila e também os pendentes que deixaram de ser válidos sem ele,
   * para a mesa voltar a bater com a súmula oficial.
   */
  private reject(event: TableEvent, code: string, message: string): void {
    const snap = this.snapshot!;
    const rejections = [...snap.rejections, { event, code, message }];
    const kept: TableEvent[] = [];
    for (const e of snap.pending) {
      if (e.id === event.id) continue;
      const check = validateNext(
        basketball,
        snap.setup,
        snap.rules,
        [...snap.confirmed, ...kept],
        e,
      );
      if (check.ok) kept.push(e);
      else rejections.push({ event: e, code: check.code, message: check.message });
    }
    this.patch({ pending: kept, rejections });
  }

  private scheduleRetry(): void {
    this.clearRetry();
    this.retryHandle = this.deps.setTimeout(() => {
      this.retryHandle = null;
      void this.flush();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
  }

  private clearRetry(): void {
    if (this.retryHandle !== null) this.deps.clearTimeout(this.retryHandle);
    this.retryHandle = null;
  }

  /** Conexão voltou: tenta já, sem esperar o backoff. */
  retryNow(): void {
    this.backoff = 1000;
    void this.flush();
  }

  /** Atualiza os dados da partida depois de fechar a súmula. */
  markClosed(server: MatchStateResponse): void {
    this.deps.store.set(this.keys.server, server);
    this.patch({ server });
  }

  dispose(): void {
    this.disposed = true;
    this.clearRetry();
    this.listeners.clear();
  }
}
