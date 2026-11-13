import type { MatchStateResponse, PostEventRequest, StoredEvent } from '../api/contract';
import { defaultRules } from '@neronu/sport-basketball';
import { defaultRules as rules3x3 } from '@neronu/sport-basketball-3x3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError, NetworkError } from '../api/client';
import { MatchTable } from './table';

const roster = (prefix: string) =>
  Array.from({ length: 8 }, (_, i) => ({
    athleteId: `${prefix}${i + 4}`,
    name: `${prefix}${i + 4}`,
    number: i + 4,
    isStarter: i < 5,
  }));

function serverState(events: StoredEvent[] = []): MatchStateResponse {
  return {
    match: {
      id: 'm1',
      organizationId: 'o1',
      championshipId: null,
      sportKey: 'basketball',
      rules: { ...defaultRules },
      status: 'in_progress',
      homeTeam: { id: 'th', organizationId: 'o1', name: 'Casa', shortName: null },
      awayTeam: { id: 'ta', organizationId: 'o1', name: 'Fora', shortName: null },
      scheduledAt: null,
      venue: null,
      createdAt: '2026-11-10T00:00:00Z',
      closedAt: null,
    },
    roster: {
      home: { teamId: 'th', roster: roster('h') },
      away: { teamId: 'ta', roster: roster('a') },
    },
    events,
    state: null,
    summary: { status: 'not_started', score: { home: 0, away: 0 }, phaseLabel: '' },
    playerStats: [],
    sheets: [],
  };
}

/** API falsa: grava eventos com sequência e idempotência, e pode "cair". */
class FakeApi {
  events: StoredEvent[] = [];
  down = false;
  /** Grava mas perde a resposta (timeout depois do commit). */
  loseNextResponse = false;
  rejectNext: HttpError | null = null;

  state = vi.fn(async () => {
    if (this.down) throw new NetworkError('offline');
    return serverState(this.events);
  });

  postEvent = vi.fn(async (_id: string, e: PostEventRequest) => {
    if (this.down) throw new NetworkError('offline');
    if (this.rejectNext) {
      const err = this.rejectNext;
      this.rejectNext = null;
      throw err;
    }
    let stored = this.events.find((x) => x.id === e.id);
    if (!stored) {
      stored = {
        id: e.id,
        seq: this.events.length + 1,
        type: e.type,
        payload: e.payload,
        recordedAt: e.recordedAt ?? null,
        revision: 1,
      };
      this.events.push(stored);
    }
    if (this.loseNextResponse) {
      this.loseNextResponse = false;
      throw new NetworkError('timeout');
    }
    return { event: stored, created: true, summary: serverState().summary };
  });
}

function memoryStore() {
  const m = new Map<string, string>();
  return {
    get: <T>(k: string) => (m.has(k) ? (JSON.parse(m.get(k)!) as T) : null),
    set: (k: string, v: unknown) => void m.set(k, JSON.stringify(v)),
    remove: (k: string) => void m.delete(k),
  };
}

let fake: FakeApi;
let storage: ReturnType<typeof memoryStore>;
let timers: (() => void)[];
let n: number;

function makeTable() {
  return new MatchTable('m1', {
    api: fake,
    store: storage,
    newId: () => `e${++n}`,
    setTimeout: (fn) => timers.push(fn),
    clearTimeout: () => {},
  });
}
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  fake = new FakeApi();
  storage = memoryStore();
  timers = [];
  n = 0;
});

describe('MatchTable', () => {
  it('aplica na hora e envia em ordem', async () => {
    const t = makeTable();
    await t.load();
    expect(t.record({ type: 'period_start', payload: { period: 1 } }).ok).toBe(true);
    t.record({ type: 'score', payload: { athleteId: 'h4', points: 3 } });
    expect(t.getSnapshot()!.state.teams.home.score).toBe(3);
    await settle();
    expect(fake.events.map((e) => e.seq)).toEqual([1, 2]);
    expect(t.getSnapshot()!.pending).toHaveLength(0);
    expect(t.getSnapshot()!.sync).toBe('synced');
  });

  it('recusa na hora o que a regra não permite', async () => {
    const t = makeTable();
    await t.load();
    const r = t.record({ type: 'score', payload: { athleteId: 'h4', points: 2 } });
    expect(r).toMatchObject({ ok: false, code: 'period_not_running' });
    expect(fake.postEvent).not.toHaveBeenCalled();
  });

  it('segura a fila sem conexão e reenvia quando volta', async () => {
    const t = makeTable();
    await t.load();
    fake.down = true;
    t.record({ type: 'period_start', payload: { period: 1 } });
    t.record({ type: 'score', payload: { athleteId: 'a5', points: 2 } });
    await settle();
    expect(t.getSnapshot()!.sync).toBe('offline');
    expect(t.getSnapshot()!.pending).toHaveLength(2);
    expect(t.getSnapshot()!.state.teams.away.score).toBe(2);

    fake.down = false;
    timers.shift()!();
    await settle();
    expect(fake.events).toHaveLength(2);
    expect(t.getSnapshot()!.sync).toBe('synced');
  });

  it('não duplica quando a resposta se perde depois de gravar', async () => {
    const t = makeTable();
    await t.load();
    fake.loseNextResponse = true;
    t.record({ type: 'period_start', payload: { period: 1 } });
    await settle();
    expect(t.getSnapshot()!.pending).toHaveLength(1);
    timers.shift()!();
    await settle();
    expect(fake.events).toHaveLength(1);
    expect(t.getSnapshot()!.confirmed).toHaveLength(1);
  });

  it('a fila sobrevive a recarregar a página', async () => {
    const t1 = makeTable();
    await t1.load();
    fake.down = true;
    t1.record({ type: 'period_start', payload: { period: 1 } });
    await settle();
    t1.dispose();

    fake.down = false;
    const t2 = makeTable();
    await t2.load();
    await settle();
    expect(fake.events).toHaveLength(1);
    expect(t2.getSnapshot()!.pending).toHaveLength(0);
  });

  it('abre do cache sem conexão', async () => {
    const t1 = makeTable();
    await t1.load();
    t1.dispose();
    fake.down = true;
    const t2 = makeTable();
    await t2.load();
    expect(t2.getSnapshot()!.fromCache).toBe(true);
  });

  it('anula um lance', async () => {
    const t = makeTable();
    await t.load();
    t.record({ type: 'period_start', payload: { period: 1 } });
    const r = t.record({ type: 'score', payload: { athleteId: 'h4', points: 3 } });
    if (!r.ok) throw new Error();
    expect(t.voidEvent(r.id).ok).toBe(true);
    expect(t.getSnapshot()!.state.teams.home.score).toBe(0);
    await settle();
    expect(fake.events.map((e) => e.type)).toEqual(['period_start', 'score', 'void']);
  });

  it('tira da fila o evento recusado pela API e os que dependiam dele', async () => {
    const t = makeTable();
    await t.load();
    fake.down = true;
    t.record({ type: 'period_start', payload: { period: 1 } });
    t.record({ type: 'score', payload: { athleteId: 'h4', points: 2 } });
    await settle();
    fake.down = false;
    fake.rejectNext = new HttpError(422, 'invalid_period_order', 'O próximo período é o 2.');
    timers.shift()!();
    await settle();
    const snap = t.getSnapshot()!;
    expect(snap.pending).toHaveLength(0);
    expect(snap.rejections.map((r) => r.code)).toEqual([
      'invalid_period_order',
      'period_not_running',
    ]);
    expect(snap.state.teams.home.score).toBe(0);
  });
});

describe('MatchTable no 3x3', () => {
  it('usa o módulo do esporte da partida', async () => {
    const base = serverState();
    fake.state.mockImplementation(async () => ({
      ...serverState(fake.events),
      match: { ...base.match, sportKey: 'basketball_3x3', rules: { ...rules3x3 } },
    }));
    const t = makeTable();
    await t.load();
    expect(t.getSnapshot()!.sport.key).toBe('basketball_3x3');
    t.record({ type: 'period_start', payload: { period: 1 } });
    // Formato do 5x5 é recusado na hora pelo módulo do 3x3.
    expect(t.record({ type: 'score', payload: { athleteId: 'h4', points: 3 } }).ok).toBe(false);
    for (let i = 0; i < 10; i++)
      t.record({ type: 'score', payload: { athleteId: 'h4', shot: 'outside' } });
    t.record({ type: 'score', payload: { athleteId: 'h5', shot: 'free_throw' } });
    expect(t.getSnapshot()!.state.status).toBe('finished');
    expect(t.getSnapshot()!.state.teams.home.score).toBe(21);
    const late = t.record({ type: 'score', payload: { athleteId: 'a4', shot: 'inside' } });
    expect(late).toMatchObject({ ok: false, code: 'match_finished' });
    await settle();
    expect(fake.events).toHaveLength(12);
  });
});
