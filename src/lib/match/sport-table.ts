import {
  clockRemaining as basketballClock,
  isInBonus,
  periodDurationMs,
  periodLabel as basketballPeriod,
  teamFoulsInPeriod,
  timeoutsLeft as basketballTimeouts,
  totalFouls as basketballFouls,
  type BasketballState,
} from '@neronu/sport-basketball';
import {
  clockElapsed as x3Elapsed,
  clockRemaining as x3Clock,
  gameDurationMs,
  nextFoulPenalty,
  OVERTIME,
  periodLabel as x3Period,
  pointsToWin,
  REGULATION,
  SHOT_POINTS,
  teamFouls,
  timeoutsLeft as x3Timeouts,
  totalFouls as x3Fouls,
  type Basketball3x3State,
  type Shot,
} from '@neronu/sport-basketball-3x3';
import { isVoidEvent } from '@neronu/sport-core';
import { formatClock, formatElapsed } from '../format';
import type { ShotClockConfig } from './shot-clock';
import type { Draft, SportState, TableEvent } from './table';

type Side = 'home' | 'away';

/** Os dois basquetes têm os mesmos tipos de falta de atleta. */
export type FoulKind = 'personal' | 'technical' | 'unsportsmanlike' | 'disqualifying';

export const FOUL_LABEL: Record<FoulKind, string> = {
  personal: 'Falta',
  technical: 'Falta técnica',
  unsportsmanlike: 'Falta antidesportiva',
  disqualifying: 'Falta desqualificante',
};
export const SPECIAL_FOULS: readonly FoulKind[] = ['technical', 'unsportsmanlike', 'disqualifying'];

export interface Who {
  number: number;
  name: string;
  side: Side;
}

export interface TablePlayer {
  athleteId: string;
  side: Side;
  number: number;
  points: number;
  fouls: number;
  status: 'active' | 'fouled_out' | 'disqualified';
}

/** Botão de cesta na linha do atleta. */
export interface ScoreButton {
  key: string;
  /** Texto do botão ("+2", "LL"). */
  label: string;
  /** Complemento do rótulo acessível ("+2 para o número 4"). */
  aria: string;
  draft(athleteId: string): Draft;
}

export interface TeamMeta {
  label: string;
  value: number;
  /** Aviso ao lado ("Bônus", "2 LL"). */
  flag?: string;
}

export interface TeamAction {
  key: string;
  label: string;
  draft: Draft;
}

/** A ação do momento na mesa; sem `draft`, é só informativa (botão desabilitado). */
export interface MomentAction {
  label: string;
  confirm?: string;
  draft?: Draft;
}

/**
 * Relógio do período no instante pedido: regressivo (termina em zero) ou crescente, sem limite
 * (prorrogação do 3x3, que acaba por pontos).
 */
export type TableClock =
  | {
      kind: 'countdown';
      remainingMs: number;
      running: boolean;
      /** Duração cheia do período: com `remainingMs` igual a ela, o relógio ainda não começou. */
      durationMs: number;
    }
  | { kind: 'stopwatch'; elapsedMs: number; running: boolean };

/** Relógio regressivo zerado. */
export const clockExpired = (c: TableClock | null): boolean =>
  c?.kind === 'countdown' && c.remainingMs === 0;

/** Ainda não começou: regressivo cheio ou crescente em zero. */
export const clockFresh = (c: TableClock): boolean =>
  c.kind === 'countdown' ? c.remainingMs >= c.durationMs : c.elapsedMs === 0;

/** Payload do `clock_stop`: quanto falta no regressivo, quanto passou no crescente. */
export const clockStopPayload = (c: TableClock) =>
  c.kind === 'countdown'
    ? { remainingMs: Math.round(c.remainingMs) }
    : { elapsedMs: Math.round(c.elapsedMs) };

/** Lance que dá para incluir numa retificação. */
export interface RectifyAction {
  key: string;
  label: string;
  event(athleteId: string): { type: string; payload: Record<string, unknown> };
}

/** Como cada esporte aparece na mesa, na conferência e na retificação. Só dados, sem React. */
export interface SportTable {
  players(state: SportState): TablePlayer[];
  scoreButtons: readonly ScoreButton[];
  /** Texto do centro do topo ("2º quarto", "Tempo normal · até 21"). */
  phase(state: SportState): string;
  teamMeta(state: SportState, side: Side): TeamMeta[];
  teamActions(state: SportState, side: Side): TeamAction[];
  periodName(state: SportState, period: number): string;
  /** Cabeçalho curto da coluna de período na conferência. */
  shortPeriod(label: string): string;
  describe(
    e: TableEvent,
    who: (athleteId: string) => Who | undefined,
    teamName: (side: Side) => string,
    state: SportState,
  ): string;
  /** Relógio em `now`; nulo sem período em andamento ou em período sem relógio. */
  clock(state: SportState, now: Date): TableClock | null;
  /** Próxima ação de período; nulo com o jogo encerrado. */
  moment(state: SportState): MomentAction | null;
  rectifyActions: readonly RectifyAction[];
  /** Cronômetro de posse: duração cheia e os reinícios oferecidos na mesa. */
  shotClock: ShotClockConfig;
  /** Explica as letras da coluna de faltas e a regra de fim, quando houver. */
  hint?: string;
}

const athlete = (w: Who | undefined, teamName: (side: Side) => string) =>
  `#${w?.number ?? '?'} ${w?.name ?? ''} (${w ? teamName(w.side) : ''})`;

const foulActions: RectifyAction[] = (Object.keys(FOUL_LABEL) as FoulKind[]).map((k) => ({
  key: `foul:${k}`,
  label: FOUL_LABEL[k],
  event: (athleteId) => ({ type: 'foul', payload: { athleteId, kind: k } }),
}));

// ─── Basquete 5x5 ─────────────────────────────────────────────────────────────

const b5 = (s: SportState) => s as BasketballState;

const basketballTable: SportTable = {
  players: (state) =>
    Object.values(b5(state).players).map((p) => ({
      athleteId: p.athleteId,
      side: p.side,
      number: p.number,
      points: p.points,
      fouls: basketballFouls(p),
      status: p.status,
    })),
  scoreButtons: ([1, 2, 3] as const).map((points) => ({
    key: String(points),
    label: `+${points}`,
    aria: `+${points}`,
    draft: (athleteId) => ({ type: 'score', payload: { athleteId, points } }),
  })),
  phase: (state) => {
    const s = b5(state);
    if (s.status === 'finished') return 'Encerrado';
    if (s.status === 'not_started') return 'Antes do início';
    if (s.status === 'break') return `Intervalo · fim do ${basketballPeriod(s).toLowerCase()}`;
    return basketballPeriod(s);
  },
  teamMeta: (state, side) => {
    const s = b5(state);
    return [
      {
        label: 'Faltas',
        value: teamFoulsInPeriod(s, side),
        ...(isInBonus(s, side) ? { flag: 'Bônus' } : {}),
      },
      { label: 'Tempos', value: basketballTimeouts(s, side) },
    ];
  },
  teamActions: (state, side) => [
    {
      key: 'timeout',
      label: `Pedir tempo (${basketballTimeouts(b5(state), side)} restantes)`,
      draft: { type: 'timeout', payload: { side } },
    },
    {
      key: 'coach-technical',
      label: 'Técnica do técnico',
      draft: { type: 'coach_foul', payload: { side, kind: 'technical' } },
    },
    {
      key: 'coach-bench',
      label: 'Técnica do banco',
      draft: { type: 'coach_foul', payload: { side, kind: 'bench' } },
    },
  ],
  periodName: (state, period) => basketballPeriod(b5(state), period),
  shortPeriod: (p) => p.replace(' quarto', 'Q').replace(' tempo', 'T'),
  describe: (e, who, teamName, state) => {
    if (isVoidEvent(e)) return 'Anulação';
    const period = (p: number) => basketballPeriod(b5(state), p).toLowerCase();
    switch (e.type) {
      case 'period_start':
        return `Início do ${period(e.payload.period)}`;
      case 'period_end':
        return `Fim do ${period(e.payload.period)}`;
      case 'score':
        if (!('points' in e.payload)) return 'Cesta';
        return `+${e.payload.points} · ${athlete(who(e.payload.athleteId), teamName)}`;
      case 'foul':
        return `${FOUL_LABEL[e.payload.kind]} · ${athlete(who(e.payload.athleteId), teamName)}`;
      case 'coach_foul':
        return `${e.payload.kind === 'technical' ? 'Técnica do técnico' : 'Técnica do banco'} · ${teamName(e.payload.side)}`;
      case 'timeout':
        return `Tempo técnico · ${teamName(e.payload.side)}`;
      case 'clock_start':
        return 'Relógio iniciado';
      case 'clock_stop':
        return 'remainingMs' in e.payload
          ? `Relógio parado · ${formatClock(e.payload.remainingMs)}`
          : 'Relógio parado';
    }
  },
  clock: (state, now) => {
    const s = b5(state);
    const remainingMs = basketballClock(s, now);
    if (remainingMs === null || !s.clock) return null;
    return {
      kind: 'countdown',
      remainingMs,
      running: !!s.clock.runningSince,
      durationMs: periodDurationMs(s),
    };
  },
  moment: (state) => {
    const s = b5(state);
    if (s.status === 'finished') return null;
    if (s.status === 'in_period') {
      const label = basketballPeriod(s).toLowerCase();
      return {
        label: `Encerrar ${label}`,
        confirm: `Encerrar o ${label} antes de o relógio zerar?`,
        draft: { type: 'period_end', payload: { period: s.period } },
      };
    }
    const next = s.period + 1;
    const tied = s.teams.home.score === s.teams.away.score;
    return {
      label: `Iniciar ${basketballPeriod(s, next).toLowerCase()}${s.period >= s.rules.periods && tied ? ' (empate)' : ''}`,
      draft: { type: 'period_start', payload: { period: next } },
    };
  },
  rectifyActions: [
    ...(
      [
        [1, 'Lance livre (+1)'],
        [2, 'Cesta de 2 (+2)'],
        [3, 'Cesta de 3 (+3)'],
      ] as const
    ).map(([points, label]) => ({
      key: `score:${points}`,
      label,
      event: (athleteId: string) => ({ type: 'score', payload: { athleteId, points } }),
    })),
    ...foulActions,
  ],
  // FIBA: 24s; 14s após rebote ofensivo e em algumas faltas.
  shotClock: { durationMs: 24_000, resets: [24_000, 14_000] },
};

// ─── Basquete 3x3 ─────────────────────────────────────────────────────────────

const b3 = (s: SportState) => s as Basketball3x3State;

export const SHOT_LABEL: Record<Shot, string> = {
  inside: 'Cesta de 1',
  outside: 'Cesta de 2',
  free_throw: 'Lance livre',
};

const PENALTY_FLAG = {
  none: undefined,
  free_throws: '2 LL',
  free_throws_possession: '2 LL + posse',
} as const;

/** "do tempo normal", "da prorrogação". */
const x3Of = (s: Basketball3x3State, period: number) =>
  period === OVERTIME ? 'da prorrogação' : `do ${x3Period(s, period).toLowerCase()}`;

const basketball3x3Table: SportTable = {
  players: (state) =>
    Object.values(b3(state).players).map((p) => ({
      athleteId: p.athleteId,
      side: p.side,
      number: p.number,
      points: p.points,
      fouls: x3Fouls(p),
      status: p.status,
    })),
  scoreButtons: (
    [
      ['inside', '+1', '+1, cesta de 1'],
      ['outside', '+2', '+2, cesta de 2'],
      ['free_throw', 'LL', 'Lance livre'],
    ] as const
  ).map(([shot, label, aria]) => ({
    key: shot,
    label,
    aria,
    draft: (athleteId: string) => ({ type: 'score', payload: { athleteId, shot } }),
  })),
  phase: (state) => {
    const s = b3(state);
    if (s.status === 'finished') return 'Encerrado';
    if (s.status === 'not_started') return 'Antes do início';
    if (s.status === 'break') return 'Empate · vai para a prorrogação';
    if (s.period === OVERTIME)
      return `Prorrogação · vence quem fizer ${s.rules.overtimePointsToWin}`;
    return s.rules.scoreLimitEnabled ? `Tempo normal · até ${s.rules.scoreLimit}` : 'Tempo normal';
  },
  teamMeta: (state, side) => {
    const s = b3(state);
    const flag = PENALTY_FLAG[nextFoulPenalty(s, side)];
    const toWin = s.status === 'in_period' ? pointsToWin(s, side) : null;
    return [
      { label: 'Faltas', value: teamFouls(s, side), ...(flag ? { flag } : {}) },
      { label: 'Tempos', value: x3Timeouts(s, side) },
      ...(toWin !== null ? [{ label: 'Faltam', value: toWin }] : []),
    ];
  },
  teamActions: (state, side) => [
    {
      key: 'timeout',
      label: `Pedir tempo (${x3Timeouts(b3(state), side)} restantes)`,
      draft: { type: 'timeout', payload: { side } },
    },
  ],
  periodName: (state, period) => x3Period(b3(state), period),
  shortPeriod: (p) => (p === 'Prorrogação' ? 'PR' : 'TN'),
  describe: (e, who, teamName, state) => {
    if (isVoidEvent(e)) return 'Anulação';
    const s = b3(state);
    switch (e.type) {
      case 'period_start':
        return `Início ${x3Of(s, e.payload.period)}`;
      case 'period_end':
        return `Fim ${x3Of(s, e.payload.period)}`;
      case 'score': {
        if (!('shot' in e.payload)) return 'Cesta';
        const { shot } = e.payload;
        return `+${SHOT_POINTS[shot]} ${SHOT_LABEL[shot].toLowerCase()} · ${athlete(who(e.payload.athleteId), teamName)}`;
      }
      case 'foul':
        return `${FOUL_LABEL[e.payload.kind]} · ${athlete(who(e.payload.athleteId), teamName)}`;
      case 'timeout':
        return `Tempo · ${teamName(e.payload.side)}`;
      case 'clock_start':
        return 'Relógio iniciado';
      case 'clock_stop':
        return 'elapsedMs' in e.payload
          ? `Relógio parado · ${formatElapsed(e.payload.elapsedMs)}`
          : `Relógio parado · ${formatClock(e.payload.remainingMs)}`;
      default:
        return 'Lance';
    }
  },
  clock: (state, now) => {
    const s = b3(state);
    if (!s.clock) return null;
    const running = !!s.clock.runningSince;
    const elapsedMs = x3Elapsed(s, now);
    if (elapsedMs !== null) return { kind: 'stopwatch', elapsedMs, running };
    const remainingMs = x3Clock(s, now);
    if (remainingMs === null) return null;
    return { kind: 'countdown', remainingMs, running, durationMs: gameDurationMs(s) };
  },
  moment: (state) => {
    const s = b3(state);
    if (s.status === 'finished') return null;
    if (s.status === 'not_started') {
      return {
        label: 'Iniciar jogo',
        draft: { type: 'period_start', payload: { period: REGULATION } },
      };
    }
    if (s.status === 'break') {
      return {
        label: 'Iniciar prorrogação (empate)',
        draft: { type: 'period_start', payload: { period: OVERTIME } },
      };
    }
    if (s.period === OVERTIME) {
      return { label: `Prorrogação: vence quem fizer ${s.rules.overtimePointsToWin}` };
    }
    return {
      label: 'Encerrar tempo normal',
      confirm: 'Encerrar o tempo normal antes de o relógio zerar?',
      draft: { type: 'period_end', payload: { period: REGULATION } },
    };
  },
  rectifyActions: [
    ...(['inside', 'outside', 'free_throw'] as const).map((shot) => ({
      key: `score:${shot}`,
      label: `${SHOT_LABEL[shot]} (+${SHOT_POINTS[shot]})`,
      event: (athleteId: string) => ({ type: 'score', payload: { athleteId, shot } }),
    })),
    ...foulActions,
  ],
  // FIBA 3x3: 12s.
  shotClock: { durationMs: 12_000, resets: [12_000] },
  hint: 'O jogo termina sozinho quando uma equipe chega ao limite de pontos ou vence a prorrogação.',
};

const TABLES: Record<string, SportTable> = {
  basketball: basketballTable,
  basketball_3x3: basketball3x3Table,
};

export function sportTable(sportKey: string): SportTable {
  const table = TABLES[sportKey];
  if (!table) throw new Error(`Mesa não disponível para o esporte ${sportKey}.`);
  return table;
}
