import {
  STATUS_TAG,
  type PlayerColumn,
  type RowAction,
  type ScoreButton,
  type TablePlayer,
} from '../../../lib/match/sport-table';
import type { SportState } from '../../../lib/match/table';

type Side = 'home' | 'away';

/**
 * Metade do quadro de uma equipe: cada linha traz número, nome, as colunas do esporte em stat
 * (PTS/FLT no basquete, PTS/ERR no vôlei), os botões de lançamento e o botão largo do fim
 * (Falta ou Erro), sempre à mostra. Rótulo em texto, nunca só ícone. Quem está no banco, nos
 * esportes que controlam a quadra, aparece depois e esmaecido.
 */
export function TeamColumn({
  side,
  teamName,
  players,
  columns,
  scoreButtons,
  rowAction,
  state,
  nameOf,
  disabled,
  onScore,
  onRowAction,
}: {
  side: Side;
  teamName: string;
  players: TablePlayer[];
  columns: readonly PlayerColumn[];
  scoreButtons: readonly ScoreButton[];
  rowAction: RowAction;
  state: SportState;
  nameOf: (athleteId: string) => string;
  disabled: boolean;
  onScore: (player: TablePlayer, button: ScoreButton) => void;
  onRowAction: (player: TablePlayer) => void;
}) {
  return (
    <section className={`sm-team sm-team--${side}`} aria-label={`Atletas · ${teamName}`}>
      <div className="sm-team__head t-label" aria-hidden="true">
        <span>Nº</span>
        <span>Atleta</span>
        {columns.map((c) => (
          <span key={c.short} className="is-num">
            {c.short}
          </span>
        ))}
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
          const bench = p.onCourt === false;
          const who = `número ${p.number}, ${name}`;
          return (
            <li
              key={p.athleteId}
              className={`sm-row ${out ? 'is-out' : ''} ${bench ? 'is-bench' : ''}`}
            >
              <span className="sm-row__num">{p.number}</span>
              <span className="sm-row__name">
                {name}
                {p.status !== 'active' && (
                  <span className="sm-row__status">{STATUS_TAG[p.status]}</span>
                )}
                {bench && !out && <span className="sr-only"> (no banco)</span>}
                {p.serving && <span className="sm-row__serve">Saca</span>}
              </span>
              {columns.map((c, i) => (
                <span
                  key={c.short}
                  className="sm-row__stat"
                  aria-label={`${p.stats[i] ?? 0} ${c.label}`}
                >
                  {p.stats[i] ?? 0}
                </span>
              ))}
              <span className="sm-row__actions">
                {scoreButtons.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className="sm-btn sm-btn--score"
                    disabled={off || (b.enabled ? !b.enabled(state, p) : false)}
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
                  aria-label={`${rowAction.label} para o ${who}`}
                  onClick={() => onRowAction(p)}
                >
                  {rowAction.label}
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
