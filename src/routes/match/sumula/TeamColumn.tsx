import type { ScoreButton, TablePlayer } from '../../../lib/match/sport-table';

type Side = 'home' | 'away';

/**
 * Metade do quadro de uma equipe: cada linha traz número, nome, pontos e faltas em stat,
 * e os botões de cesta do esporte e Falta sempre à mostra. Rótulo em texto, nunca só ícone.
 */
export function TeamColumn({
  side,
  teamName,
  players,
  scoreButtons,
  nameOf,
  disabled,
  onScore,
  onFoul,
}: {
  side: Side;
  teamName: string;
  players: TablePlayer[];
  scoreButtons: readonly ScoreButton[];
  nameOf: (athleteId: string) => string;
  disabled: boolean;
  onScore: (player: TablePlayer, button: ScoreButton) => void;
  onFoul: (player: TablePlayer) => void;
}) {
  return (
    <section className={`sm-team sm-team--${side}`} aria-label={`Atletas · ${teamName}`}>
      <div className="sm-team__head t-label" aria-hidden="true">
        <span>Nº</span>
        <span>Atleta</span>
        <span className="is-num">PTS</span>
        <span className="is-num">FLT</span>
        <span className="sm-team__head-actions">Lançar</span>
      </div>
      <ol
        className="sm-team__rows"
        style={{ gridTemplateRows: `repeat(${Math.max(players.length, 1)}, var(--sm-row))` }}
      >
        {players.map((p) => {
          const name = nameOf(p.athleteId);
          const out = p.status !== 'active';
          const off = disabled || out;
          const who = `número ${p.number}, ${name}`;
          return (
            <li key={p.athleteId} className={`sm-row ${out ? 'is-out' : ''}`}>
              <span className="sm-row__num">{p.number}</span>
              <span className="sm-row__name">
                {name}
                {out && (
                  <span className="sm-row__status">
                    {p.status === 'fouled_out' ? 'EXC' : 'DESQ'}
                  </span>
                )}
              </span>
              <span className="sm-row__stat" aria-label={`${p.points} pontos`}>
                {p.points}
              </span>
              <span className="sm-row__stat" aria-label={`${p.fouls} faltas`}>
                {p.fouls}
              </span>
              <span className="sm-row__actions">
                {scoreButtons.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className="sm-btn sm-btn--score"
                    disabled={off}
                    aria-label={`${b.aria} para o ${who}`}
                    onClick={() => onScore(p, b)}
                  >
                    {b.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="sm-btn sm-btn--foul"
                  disabled={off}
                  aria-label={`Falta para o ${who}`}
                  onClick={() => onFoul(p)}
                >
                  Falta
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
