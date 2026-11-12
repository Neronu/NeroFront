import {
  isInBonus,
  periodLabel,
  teamFoulsInPeriod,
  timeoutsLeft,
  type BasketballState,
} from '@neronu/sport-basketball';
import type { TableSnapshot } from '../../../lib/match/table';

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

function phase(state: BasketballState): string {
  if (state.status === 'finished') return 'Encerrado';
  if (state.status === 'not_started') return 'Antes do início';
  if (state.status === 'break') return `Intervalo · fim do ${periodLabel(state).toLowerCase()}`;
  return periodLabel(state);
}

/**
 * Topo em court (96px): nome e faltas de cada equipe nas pontas, placar em score na cor gold,
 * período no centro. Texto e foco em on-court.
 */
export function SumulaTop({
  state,
  teamName,
}: {
  state: BasketballState;
  teamName: (side: Side) => string;
}) {
  const team = (side: Side) => {
    const bonus = isInBonus(state, side);
    return (
      <div className={`sm-top__team sm-top__team--${side}`}>
        <span className="sm-top__name">{teamName(side)}</span>
        <span className="sm-top__meta">
          <span>
            Faltas <span className="t-stat">{teamFoulsInPeriod(state, side)}</span>
          </span>
          {bonus && <span className="sm-top__bonus">Bônus</span>}
          <span>
            Tempos <span className="t-stat">{timeoutsLeft(state, side)}</span>
          </span>
        </span>
      </div>
    );
  };
  return (
    <header className="sm-top on-court">
      {team('home')}
      <section className="sm-top__center" aria-label="Placar">
        <span className="sm-top__score">
          <span className="t-score">{state.teams.home.score}</span>
          <span className="sm-top__sep" aria-hidden="true">
            :
          </span>
          <span className="sr-only"> a </span>
          <span className="t-score">{state.teams.away.score}</span>
        </span>
        <span className="sm-top__period t-stat">{phase(state)}</span>
      </section>
      {team('away')}
    </header>
  );
}
