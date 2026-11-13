/**
 * Cronômetro de posse (24s no 5x5, 12s no 3x3). Fica só na mesa: não vira evento nem entra
 * na súmula. Corre e pausa junto com o relógio de jogo; a mesa só o reinicia.
 */
export interface ShotClockState {
  /** Tempo que faltava na última parada ou no último reinício. */
  readonly remainingMs: number;
  /** Desde quando está correndo (ISO 8601); nulo parado. */
  readonly runningSince: string | null;
  /** Período em que o estado vale; outro período começa com a posse cheia. */
  readonly period: number;
}

/** Duração cheia e os valores de reinício oferecidos na mesa (o primeiro é o cheio). */
export interface ShotClockConfig {
  readonly durationMs: number;
  readonly resets: readonly number[];
}

export function initialShot(config: ShotClockConfig, period: number): ShotClockState {
  return { remainingMs: config.durationMs, runningSince: null, period };
}

/** Quanto falta em `now`. Nunca negativo. */
export function shotRemaining(s: ShotClockState, now: Date): number {
  if (!s.runningSince) return s.remainingMs;
  const elapsed = Math.max(0, now.getTime() - Date.parse(s.runningSince));
  return Math.max(0, s.remainingMs - elapsed);
}

/** Acompanha o relógio de jogo: começa quando ele começa e congela quando ele para. */
export function syncWithGame(s: ShotClockState, gameRunning: boolean, now: Date): ShotClockState {
  if (gameRunning === !!s.runningSince) return s;
  return gameRunning
    ? { ...s, runningSince: now.toISOString() }
    : { ...s, remainingMs: shotRemaining(s, now), runningSince: null };
}

/** Reinicia em `ms`; com o jogo correndo, já sai correndo. */
export function resetShot(
  s: ShotClockState,
  ms: number,
  gameRunning: boolean,
  now: Date,
): ShotClockState {
  return { ...s, remainingMs: ms, runningSince: gameRunning ? now.toISOString() : null };
}

/** Valida um estado salvo; qualquer coisa fora do formato vira nulo. */
export function parseShot(v: unknown): ShotClockState | null {
  if (typeof v !== 'object' || v === null) return null;
  const { remainingMs, runningSince, period } = v as Record<string, unknown>;
  if (typeof remainingMs !== 'number' || !Number.isFinite(remainingMs) || remainingMs < 0) {
    return null;
  }
  if (runningSince !== null && (typeof runningSince !== 'string' || !Date.parse(runningSince))) {
    return null;
  }
  if (typeof period !== 'number') return null;
  return { remainingMs, runningSince, period };
}
