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
import {
  isMatchPoint,
  isSetPoint,
  isTieBreak,
  setLabel,
  setTarget,
  sideSwitchAt,
  substitutionsLeft,
  timeoutsLeft as vbTimeouts,
  totalErrors,
  type ErrorKind,
  type PointKind,
  type RallyState,
  type SanctionKind,
  type VolleyballState,
} from '@neronu/sport-volleyball';
import {
  sideSwitchDue,
  sideSwitchEvery,
  technicalTimeoutDue,
  type BeachState,
} from '@neronu/sport-volleyball-beach';
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

export type PlayerStatus = 'active' | 'fouled_out' | 'disqualified' | 'expelled';

/** Selo ao lado do nome de quem não pode mais ser lançado. */
export const STATUS_TAG: Record<Exclude<PlayerStatus, 'active'>, string> = {
  fouled_out: 'EXC',
  disqualified: 'DESQ',
  expelled: 'EXP',
};

export interface TablePlayer {
  athleteId: string;
  side: Side;
  number: number;
  /** Valores das colunas de `playerColumns`, na mesma ordem. */
  stats: readonly number[];
  status: PlayerStatus;
  /** Em quadra; ausente quando o esporte não controla quem está em quadra. */
  onCourt?: boolean;
  /** Está sacando (vôlei de praia, saque por atleta). */
  serving?: boolean;
}

/** Coluna numérica da linha do atleta na mesa ("PTS", "FLT"). */
export interface PlayerColumn {
  short: string;
  /** Rótulo acessível, no plural ("pontos"). */
  label: string;
}

/** Botão de lançamento na linha do atleta. */
export interface ScoreButton {
  key: string;
  /** Texto do botão ("+2", "LL", "ATQ"). */
  label: string;
  /** Complemento do rótulo acessível ("+2 para o número 4"). */
  aria: string;
  draft(athleteId: string): Draft;
  /** Desligado no momento (ex.: ace de quem não saca); sem a função, sempre ligado. */
  enabled?(state: SportState, player: TablePlayer): boolean;
}

/**
 * Último botão da linha do atleta, mais largo: lança direto (Falta, no basquete) ou abre uma
 * escolha (Erro → saque, ataque, falta de jogo, no vôlei).
 */
export type RowAction =
  | { label: string; draft(athleteId: string): Draft }
  | { label: string; options: readonly ScoreButton[] };

export interface TeamMeta {
  label: string;
  value: number;
  /** Aviso ao lado ("Bônus", "2 LL", "Saque"). */
  flag?: string;
}

export interface TeamAction {
  key: string;
  label: string;
  /** Lançamento direto. */
  draft?: Draft;
  /** Abre um seletor em vez de lançar direto. */
  picker?: 'substitution';
  /** Disponível agora; sem o campo, só com o período em andamento. */
  enabled?: boolean;
  /** Pergunta de confirmação antes de lançar. */
  confirm?: string;
}

/** Formulário antes de lançar (ex.: quem saca primeiro no set e, no praia, os sacadores). */
export interface MomentForm {
  title: string;
  /** Texto do botão de confirmar. */
  submit: string;
  /** Campos de escolha; o primeiro valor de cada um já vem selecionado. */
  fields: { key: string; label: string; options: { value: string; label: string }[] }[];
  build(values: Record<string, string>): Draft;
}

/** A ação do momento na mesa; sem `draft` nem `form`, é só informativa (botão desabilitado). */
export interface MomentAction {
  label: string;
  confirm?: string;
  draft?: Draft;
  /** Escolhas antes de lançar. */
  form?: MomentForm;
}

/** Lançamento sobre um atleta fora da linha dele (faltas especiais, sanções). */
export interface AthleteAction {
  key: string;
  label: string;
  draft(athleteId: string, side: Side): Draft;
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
  event(athleteId: string, side: Side): { type: string; payload: Record<string, unknown> };
}

export interface PeriodScore {
  label: string;
  home: number;
  away: number;
}

/** Como cada esporte aparece na mesa, na conferência e na retificação. Só dados, sem React. */
export interface SportTable {
  /** Dá para lançar agora (período ou set em andamento)? */
  live(state: SportState): boolean;
  /** Período ou set atual (0 antes do início). */
  period(state: SportState): number;
  /** Placar grande do topo e uma linha de apoio (ex.: "Sets 1–0"). */
  scoreboard(state: SportState): { home: number; away: number; detail?: string };
  /** Parciais jogadas, para a conferência. */
  periodScores(state: SportState): PeriodScore[];
  /** Título da tabela de parciais e cabeçalho da coluna de total, na conferência. */
  periodsCaption: string;
  total: { short: string; label: string };
  players(state: SportState): TablePlayer[];
  playerColumns: readonly PlayerColumn[];
  scoreButtons: readonly ScoreButton[];
  rowAction: RowAction;
  /** Lançamentos sobre um atleta no "Mais lançamentos". */
  athleteActions: { title: string; actions: readonly AthleteAction[] };
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
  /** Relógio em `now`; nulo sem período em andamento, em período sem relógio ou sem relógio. */
  clock(state: SportState, now: Date): TableClock | null;
  /** Desde quando o relógio corre (ISO); nulo parado ou sem relógio. */
  clockSince(state: SportState): string | null;
  /** Próxima ação de período; nulo com o jogo encerrado. */
  moment(
    state: SportState,
    teamName: (side: Side) => string,
    athletes: (side: Side) => { id: string; label: string }[],
  ): MomentAction | null;
  /** Aviso do momento para a mesa (ex.: troca de lado no tie-break). */
  notice?(state: SportState): string | null;
  rectifyActions: readonly RectifyAction[];
  /** Cronômetro de posse: duração cheia e os reinícios oferecidos na mesa; ausente sem posse. */
  shotClock?: ShotClockConfig;
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

/** Pontos e faltas, as duas colunas da linha do atleta nos basquetes. */
const BASKETBALL_COLUMNS: readonly PlayerColumn[] = [
  { short: 'PTS', label: 'pontos' },
  { short: 'FLT', label: 'faltas' },
];

const basketballRowAction: RowAction = {
  label: 'Falta',
  draft: (athleteId) => ({ type: 'foul', payload: { athleteId, kind: 'personal' } }),
};

const specialFouls = {
  title: 'Faltas especiais',
  actions: SPECIAL_FOULS.map((kind) => ({
    key: kind,
    label: FOUL_LABEL[kind],
    draft: (athleteId: string): Draft => ({ type: 'foul', payload: { athleteId, kind } }),
  })),
};

/** Parciais pela pontuação de cada período (basquetes). */
function scoreByPeriod(
  teams: Record<Side, { scoreByPeriod: readonly number[] }>,
  periods: number,
  name: (period: number) => string,
): PeriodScore[] {
  return Array.from({ length: periods }, (_, i) => ({
    label: name(i + 1),
    home: teams.home.scoreByPeriod[i] ?? 0,
    away: teams.away.scoreByPeriod[i] ?? 0,
  }));
}

// ─── Basquete 5x5 ─────────────────────────────────────────────────────────────

const b5 = (s: SportState) => s as BasketballState;

const basketballTable: SportTable = {
  live: (state) => b5(state).status === 'in_period',
  period: (state) => b5(state).period,
  scoreboard: (state) => ({ home: b5(state).teams.home.score, away: b5(state).teams.away.score }),
  periodScores: (state) => {
    const s = b5(state);
    return scoreByPeriod(s.teams, s.period, (p) => basketballPeriod(s, p));
  },
  periodsCaption: 'Pontos por período',
  total: { short: 'T', label: 'Total' },
  players: (state) =>
    Object.values(b5(state).players).map((p) => ({
      athleteId: p.athleteId,
      side: p.side,
      number: p.number,
      stats: [p.points, basketballFouls(p)],
      status: p.status,
    })),
  playerColumns: BASKETBALL_COLUMNS,
  scoreButtons: ([1, 2, 3] as const).map((points) => ({
    key: String(points),
    label: `+${points}`,
    aria: `+${points}`,
    draft: (athleteId) => ({ type: 'score', payload: { athleteId, points } }),
  })),
  rowAction: basketballRowAction,
  athleteActions: specialFouls,
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
      default:
        return 'Lance';
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
  clockSince: (state) => b5(state).clock?.runningSince ?? null,
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
  live: (state) => b3(state).status === 'in_period',
  period: (state) => b3(state).period,
  scoreboard: (state) => ({ home: b3(state).teams.home.score, away: b3(state).teams.away.score }),
  periodScores: (state) => {
    const s = b3(state);
    return scoreByPeriod(s.teams, s.period, (p) => x3Period(s, p));
  },
  periodsCaption: 'Pontos por período',
  total: { short: 'T', label: 'Total' },
  players: (state) =>
    Object.values(b3(state).players).map((p) => ({
      athleteId: p.athleteId,
      side: p.side,
      number: p.number,
      stats: [p.points, x3Fouls(p)],
      status: p.status,
    })),
  playerColumns: BASKETBALL_COLUMNS,
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
  rowAction: basketballRowAction,
  athleteActions: specialFouls,
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
  clockSince: (state) => b3(state).clock?.runningSince ?? null,
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

// ─── Vôlei ────────────────────────────────────────────────────────────────────

/** O que o adaptador lê dos dois vôleis: o núcleo comum mais o sacador do praia. */
type AnyVolleyball = RallyState & { readonly server?: string | null };
const vb = (s: SportState) => s as unknown as AnyVolleyball;

export const POINT_LABEL: Record<PointKind, string> = {
  attack: 'Ponto de ataque',
  block: 'Ponto de bloqueio',
  ace: 'Ace',
  serve_error: 'Erro de saque',
  attack_error: 'Erro de ataque',
  fault: 'Falta de jogo',
};

export const SANCTION_LABEL: Record<SanctionKind, string> = {
  warning: 'Advertência',
  penalty: 'Penalização',
  expulsion: 'Expulsão',
  disqualification: 'Desqualificação',
};

const pointDraft =
  (kind: PointKind) =>
  (athleteId: string): Draft => ({ type: 'point', payload: { athleteId, kind } });

/** "1º set 25–20 · 2º set 18–25". */
const partials = (s: AnyVolleyball) =>
  s.sets.map((set, i) => `${setLabel(s, i + 1)} ${set.home}–${set.away}`).join(' · ');

/** Equipes na ordem de saque sugerida: alterna a cada set; no decisivo, sem sugestão. */
function serveOrder(s: AnyVolleyball, next: number): Side[] {
  const last = s.sets.at(-1)?.firstServe;
  return last && !isTieBreak(s, next)
    ? [last === 'home' ? 'away' : 'home', last]
    : ['home', 'away'];
}

/** O que muda entre o vôlei de quadra e o de praia. */
interface VolleyballVariant {
  /** "equipe" ou "dupla", nos textos. */
  team: string;
  /** Quem pode fazer ace e erro de saque agora. */
  canServe(state: AnyVolleyball, p: TablePlayer): boolean;
  /** Campos próprios da linha do atleta (quadra/banco, sacador). */
  playerExtras(state: AnyVolleyball, athleteId: string): Partial<TablePlayer>;
  /** Item próprio da equipe no topo, depois de Sets e Tempos. */
  extraMeta(state: AnyVolleyball, side: Side): TeamMeta[];
  /** Ações próprias da equipe (substituição, abandono), antes das comuns. */
  extraActions(state: AnyVolleyball, side: Side): TeamAction[];
  /** Formulário de início do set. */
  setStart(
    state: AnyVolleyball,
    next: number,
    teamName: (side: Side) => string,
    athletes: (side: Side) => { id: string; label: string }[],
  ): MomentForm;
  /** Descrição dos eventos próprios; nulo para os comuns. */
  describe(
    e: TableEvent,
    who: (athleteId: string) => Who | undefined,
    teamName: (side: Side) => string,
    state: AnyVolleyball,
  ): string | null;
  notice(state: AnyVolleyball): string | null;
  hint: string;
}

function makeVolleyballTable(v: VolleyballVariant): SportTable {
  const canServe = (state: SportState, p: TablePlayer) => v.canServe(vb(state), p);
  const errorOptions: readonly ScoreButton[] = (
    [
      ['serve_error', 'Erro de saque'],
      ['attack_error', 'Erro de ataque'],
      ['fault', 'Falta de jogo (rede, invasão, condução…)'],
    ] as const satisfies readonly (readonly [ErrorKind, string])[]
  ).map(([kind, label]) => ({
    key: kind,
    label,
    aria: label,
    draft: pointDraft(kind),
    ...(kind === 'serve_error' ? { enabled: canServe } : {}),
  }));

  return {
    live: (state) => vb(state).status === 'in_set',
    period: (state) => vb(state).set,
    scoreboard: (state) => {
      const s = vb(state);
      const sets = `Sets ${s.teams.home.setsWon}–${s.teams.away.setsWon}`;
      const current = s.sets[s.set - 1];
      if (s.status === 'in_set' && current) {
        return { home: current.home, away: current.away, detail: sets };
      }
      return {
        home: s.teams.home.setsWon,
        away: s.teams.away.setsWon,
        ...(s.sets.length ? { detail: partials(s) } : {}),
      };
    },
    periodScores: (state) => {
      const s = vb(state);
      return s.sets.map((set, i) => ({
        label: setLabel(s, i + 1),
        home: set.home,
        away: set.away,
      }));
    },
    periodsCaption: 'Pontos por set',
    total: { short: 'Sets', label: 'Sets vencidos' },
    players: (state) => {
      const s = vb(state);
      return Object.values(s.players).map((p) => ({
        athleteId: p.athleteId,
        side: p.side,
        number: p.number,
        stats: [p.points, totalErrors(p)],
        status: p.status,
        ...v.playerExtras(s, p.athleteId),
      }));
    },
    playerColumns: [
      { short: 'PTS', label: 'pontos' },
      { short: 'ERR', label: 'erros' },
    ],
    scoreButtons: (
      [
        ['attack', 'ATQ', 'Ponto de ataque'],
        ['block', 'BLQ', 'Ponto de bloqueio'],
        ['ace', 'ACE', 'Ace'],
      ] as const
    ).map(([kind, label, aria]) => ({
      key: kind,
      label,
      aria,
      draft: pointDraft(kind),
      ...(kind === 'ace' ? { enabled: canServe } : {}),
    })),
    rowAction: { label: 'Erro', options: errorOptions },
    athleteActions: {
      title: 'Sanções',
      actions: (Object.keys(SANCTION_LABEL) as SanctionKind[]).map((kind) => ({
        key: kind,
        label: SANCTION_LABEL[kind],
        draft: (athleteId, side) => ({ type: 'sanction', payload: { side, athleteId, kind } }),
      })),
    },
    phase: (state) => {
      const s = vb(state);
      if (s.status === 'finished') return 'Encerrado';
      if (s.status === 'not_started') return 'Antes do início';
      if (s.status === 'break') return `Intervalo · fim do ${setLabel(s).toLowerCase()}`;
      const base = `${setLabel(s)} · até ${setTarget(s)}`;
      if (isMatchPoint(s, 'home') || isMatchPoint(s, 'away')) return `${base} · match point`;
      if (isSetPoint(s, 'home') || isSetPoint(s, 'away')) return `${base} · set point`;
      return base;
    },
    teamMeta: (state, side) => {
      const s = vb(state);
      return [
        {
          label: 'Sets',
          value: s.teams[side].setsWon,
          ...(s.status === 'in_set' && s.serving === side ? { flag: 'Saque' } : {}),
        },
        { label: 'Tempos', value: vbTimeouts(s, side) },
        ...v.extraMeta(s, side),
      ];
    },
    teamActions: (state, side) => {
      const s = vb(state);
      return [
        ...v.extraActions(s, side),
        {
          key: 'timeout',
          label: `Pedir tempo (${vbTimeouts(s, side)} restantes no set)`,
          draft: { type: 'timeout', payload: { side } },
        },
        {
          key: 'team-warning',
          label: `Advertência à ${v.team}`,
          draft: { type: 'sanction', payload: { side, kind: 'warning' } },
        },
        {
          key: 'team-penalty',
          label: `Penalização à ${v.team} (ponto ao adversário)`,
          draft: { type: 'sanction', payload: { side, kind: 'penalty' } },
        },
      ];
    },
    periodName: (state, period) => setLabel(vb(state), period),
    shortPeriod: (p) =>
      p === 'Tie-break' ? 'TB' : p === 'Set único' ? 'S' : p.replace('º set', 'S'),
    describe: (e, who, teamName, state) => {
      if (isVoidEvent(e)) return 'Anulação';
      const own = v.describe(e, who, teamName, vb(state));
      if (own !== null) return own;
      switch (e.type) {
        case 'point':
          return `${POINT_LABEL[e.payload.kind]} · ${athlete(who(e.payload.athleteId), teamName)}`;
        case 'timeout':
          return `Tempo · ${teamName(e.payload.side)}`;
        case 'sanction': {
          const target = e.payload.athleteId
            ? athlete(who(e.payload.athleteId), teamName)
            : teamName(e.payload.side);
          return `${SANCTION_LABEL[e.payload.kind]} · ${target}`;
        }
        default:
          return 'Lance';
      }
    },
    clock: () => null,
    clockSince: () => null,
    moment: (state, teamName, athletes) => {
      const s = vb(state);
      if (s.status === 'finished') return null;
      if (s.status === 'in_set') return { label: `${setLabel(s)} até ${setTarget(s)}` };
      const next = s.set + 1;
      return {
        label: `Iniciar ${setLabel(s, next).toLowerCase()}`,
        form: v.setStart(s, next, teamName, athletes),
      };
    },
    notice: (state) => v.notice(vb(state)),
    rectifyActions: [
      ...(Object.keys(POINT_LABEL) as PointKind[]).map((kind) => ({
        key: `point:${kind}`,
        label: POINT_LABEL[kind],
        event: (athleteId: string) => ({ type: 'point', payload: { athleteId, kind } }),
      })),
      ...(Object.keys(SANCTION_LABEL) as SanctionKind[]).map((kind) => ({
        key: `sanction:${kind}`,
        label: SANCTION_LABEL[kind],
        event: (athleteId: string, side: Side) => ({
          type: 'sanction',
          payload: { side, athleteId, kind },
        }),
      })),
    ],
    hint: v.hint,
  };
}

// ─── Vôlei de quadra ──────────────────────────────────────────────────────────

const indoor = (s: AnyVolleyball) => s as unknown as VolleyballState;

const volleyballTable = makeVolleyballTable({
  team: 'equipe',
  canServe: (s, p) => s.serving === p.side,
  playerExtras: (s, id) => {
    const p = s.players[id]!;
    return { onCourt: indoor(s).teams[p.side].onCourt.includes(id) };
  },
  extraMeta: (s, side) => [{ label: 'Subst.', value: substitutionsLeft(indoor(s), side) }],
  extraActions: (s, side) => [
    {
      key: 'substitution',
      label: `Substituição (${substitutionsLeft(indoor(s), side)} restantes no set)`,
      picker: 'substitution',
      // Entre sets também: é mudança de formação e não conta no limite.
      enabled: s.status === 'in_set' || s.status === 'break',
    },
  ],
  setStart: (s, next, teamName) => {
    const label = `Iniciar ${setLabel(s, next).toLowerCase()}`;
    return {
      title: label,
      submit: label,
      fields: [
        {
          key: 'serving',
          label: 'Quem saca primeiro',
          options: serveOrder(s, next).map((side) => ({ value: side, label: teamName(side) })),
        },
      ],
      build: (values) => ({
        type: 'set_start',
        payload: { set: next, serving: values['serving'] as Side },
      }),
    };
  },
  describe: (e, who, teamName, s) => {
    const num = (id: string) => `#${who(id)?.number ?? '?'}`;
    if (e.type === 'set_start') {
      return `Início do ${setLabel(s, e.payload.set).toLowerCase()} · saque ${teamName(e.payload.serving)}`;
    }
    if (e.type === 'substitution') {
      return `Substituição · sai ${num(e.payload.outId)}, entra ${num(e.payload.inId)} (${teamName(e.payload.side)})`;
    }
    return null;
  },
  notice: (s) => {
    const current = s.sets[s.set - 1];
    if (s.status !== 'in_set' || !current || !isTieBreak(s)) return null;
    const switchAt = sideSwitchAt(indoor(s).rules);
    return Math.max(current.home, current.away) === switchAt
      ? `Tie-break: ${switchAt} pontos, as equipes trocam de lado.`
      : null;
  },
  hint: 'O set termina sozinho ao chegar aos pontos do set (com 2 de diferença, se a regra exigir). Ace e erro de saque só para quem saca.',
});

// ─── Vôlei de praia ───────────────────────────────────────────────────────────

const beach = (s: AnyVolleyball) => s as unknown as BeachState;

const volleyballBeachTable = makeVolleyballTable({
  team: 'dupla',
  canServe: (s, p) => s.server === p.athleteId,
  playerExtras: (s, id) => ({ serving: s.status === 'in_set' && s.server === id }),
  extraMeta: () => [],
  extraActions: (s, side) => [
    {
      key: 'retirement',
      label: 'Abandono (lesão): a dupla perde o jogo',
      draft: { type: 'retirement', payload: { side } },
      confirm: 'Registrar o abandono? A dupla perde o jogo, conservando os pontos feitos.',
      enabled: s.status === 'in_set' || s.status === 'break',
    },
  ],
  setStart: (s, next, teamName, athletes) => {
    const label = `Iniciar ${setLabel(s, next).toLowerCase()}`;
    return {
      title: label,
      submit: label,
      fields: [
        {
          key: 'serving',
          label: 'Dupla que saca primeiro',
          options: serveOrder(s, next).map((side) => ({ value: side, label: teamName(side) })),
        },
        ...(['home', 'away'] as const).map((side) => ({
          key: side,
          label: `1º sacador · ${teamName(side)}`,
          options: athletes(side).map((a) => ({ value: a.id, label: a.label })),
        })),
      ],
      build: (values) => ({
        type: 'set_start',
        payload: {
          set: next,
          serving: values['serving'] as Side,
          firstServer: { home: values['home']!, away: values['away']! },
        },
      }),
    };
  },
  describe: (e, who, teamName, s) => {
    if (e.type === 'set_start' && 'firstServer' in e.payload) {
      const server = who(e.payload.firstServer[e.payload.serving]);
      return `Início do ${setLabel(s, e.payload.set).toLowerCase()} · saque ${teamName(e.payload.serving)} (#${server?.number ?? '?'})`;
    }
    if (e.type === 'retirement') return `Abandono · ${teamName(e.payload.side)}`;
    return null;
  },
  notice: (s) => {
    const b = beach(s);
    if (technicalTimeoutDue(b)) return 'Tempo técnico.';
    if (sideSwitchDue(b)) return `Troca de lado (a cada ${sideSwitchEvery(b)} pontos).`;
    return null;
  },
  hint: 'O set termina sozinho ao chegar aos pontos do set (com 2 de diferença, se a regra exigir). Ace e erro de saque só para o atleta que está sacando.',
});

const TABLES: Record<string, SportTable> = {
  basketball: basketballTable,
  basketball_3x3: basketball3x3Table,
  volleyball: volleyballTable,
  volleyball_beach: volleyballBeachTable,
};

export function sportTable(sportKey: string): SportTable {
  const table = TABLES[sportKey];
  if (!table) throw new Error(`Mesa não disponível para o esporte ${sportKey}.`);
  return table;
}
