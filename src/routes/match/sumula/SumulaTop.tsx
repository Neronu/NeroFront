import { Pause, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../../../components/ui';
import { formatClock, formatElapsed } from '../../../lib/format';
import {
  clockExpired,
  clockFresh,
  type SportTable,
  type TableClock,
} from '../../../lib/match/sport-table';
import type { ShotClockView } from '../../../lib/match/useShotClock';
import type { SportState, TableSnapshot } from '../../../lib/match/table';

type Side = 'home' | 'away';

/** Estado do envio, em texto; tocar força um novo envio. */
export function SyncButton({
  snapshot,
  onRetry,
}: {
  snapshot: TableSnapshot;
  onRetry: () => void;
}) {
  return (
    <button
      type="button"
      className={`sm-sync is-${snapshot.sync}`}
      onClick={onRetry}
      title="Tentar enviar agora"
    >
      {syncLabel(snapshot)}
    </button>
  );
}

export function syncLabel(snapshot: TableSnapshot): string {
  const n = snapshot.pending.length;
  switch (snapshot.sync) {
    case 'synced':
      return 'Sincronizado';
    case 'sending':
      return `Enviando ${n}…`;
    case 'unauthorized':
      return `Sessão expirada · ${n} na fila`;
    default:
      return `Sem conexão · ${n} na fila`;
  }
}

/**
 * Topo em court (96px): nome e faltas de cada equipe nas pontas, placar em score na cor gold,
 * período no centro. Texto e foco em on-court.
 */
export function SumulaTop({
  state,
  sport,
  teamName,
  clock,
  shotClock,
}: {
  state: SportState;
  sport: SportTable;
  teamName: (side: Side) => string;
  /** Controle do relógio; ausente em período sem relógio. */
  clock?: ReactNode;
  /** Cronômetro de posse; ausente junto com o relógio. */
  shotClock?: ReactNode;
}) {
  const team = (side: Side) => (
    <div className={`sm-top__team sm-top__team--${side}`}>
      <span className="sm-top__name">{teamName(side)}</span>
      <span className="sm-top__meta">
        {sport.teamMeta(state, side).map((m) => (
          <span key={m.label} className="sm-top__item">
            <span>
              {m.label} <span className="t-stat">{m.value}</span>
            </span>
            {m.flag && <span className="sm-top__bonus">{m.flag}</span>}
          </span>
        ))}
      </span>
    </div>
  );
  return (
    <header className="sm-top on-court">
      {team('home')}
      <div className="sm-top__mid">
        <section className="sm-top__center" aria-label="Placar">
          <span className="sm-top__score">
            <span className="t-score">{state.teams.home.score}</span>
            <span className="sm-top__sep" aria-hidden="true">
              :
            </span>
            <span className="sr-only"> a </span>
            <span className="t-score">{state.teams.away.score}</span>
          </span>
          <span className="sm-top__period t-stat">{sport.phase(state)}</span>
        </section>
        {clock}
        {shotClock}
      </div>
      {team('away')}
    </header>
  );
}

/** Rótulo do botão do relógio: iniciar (cheio e parado), pausar (correndo) ou retomar. */
export function clockAction(clock: TableClock): 'Iniciar' | 'Pausar' | 'Retomar' {
  if (clock.running) return 'Pausar';
  return clockFresh(clock) ? 'Iniciar' : 'Retomar';
}

/**
 * Cronômetro de posse ao lado do relógio: corre com ele e só se reinicia por aqui.
 * Desligado (relógio de jogo com menos tempo que a posse), mostra um traço.
 */
export function ShotClockControl({
  shot,
  resets,
  disabled,
}: {
  shot: ShotClockView;
  resets: readonly number[];
  disabled: boolean;
}) {
  const low = !shot.off && shot.remainingMs <= 5_000;
  return (
    <div className={`sm-shot ${low ? 'is-low' : ''}`}>
      <span className="sm-shot__time" role="timer" aria-label="Tempo de posse">
        {shot.off ? '—' : formatClock(shot.remainingMs)}
      </span>
      <span className="sm-shot__resets">
        {resets.map((ms, i) => {
          const s = Math.round(ms / 1000);
          return (
            <button
              key={ms}
              type="button"
              className="sm-shot__btn"
              disabled={disabled}
              onClick={() => shot.reset(ms)}
              aria-label={`Reiniciar posse em ${s} segundos`}
              title={`Reiniciar posse em ${s}s (tecla ${i === 0 ? 'R' : 'T'})`}
            >
              {s}
            </button>
          );
        })}
      </span>
    </div>
  );
}

/** Relógio do período ao lado do placar, com o botão de iniciar, pausar e retomar. */
export function ClockControl({
  clock,
  disabled,
  onToggle,
}: {
  clock: TableClock;
  disabled: boolean;
  onToggle: () => void;
}) {
  const action = clockAction(clock);
  const expired = clockExpired(clock);
  const low =
    expired || (clock.kind === 'countdown' && clock.running && clock.remainingMs <= 10_000);
  return (
    <div className={`sm-clock ${low ? 'is-low' : ''}`}>
      <span className="sm-clock__time" role="timer" aria-label="Relógio do período">
        {clock.kind === 'countdown'
          ? formatClock(clock.remainingMs)
          : formatElapsed(clock.elapsedMs)}
      </span>
      <button
        type="button"
        className="sm-clock__btn"
        disabled={disabled || expired}
        onClick={onToggle}
        aria-label={`${action} relógio`}
        title={`${action} relógio (barra de espaço)`}
      >
        <Icon icon={clock.running ? Pause : Play} size={20} />
        <span className="sm-clock__label">{expired ? 'Tempo esgotado' : action}</span>
      </button>
    </div>
  );
}
