import { isVoidEvent, voidedIds } from '@neronu/sport-core';
import { useState } from 'react';
import { Button, Notice, Overlay, SelectField } from '../../../components/ui';
import { FOUL_LABEL, SPECIAL_FOULS, type SportTable } from '../../../lib/match/sport-table';
import type { Draft, SportState, TableEvent, TableSnapshot } from '../../../lib/match/table';

type Side = 'home' | 'away';
const SIDES: Side[] = ['home', 'away'];

/**
 * Lançamentos fora da linha do atleta: faltas especiais, ações de equipe do esporte (tempo, técnicas),
 * e o histórico com anulação. Ação de quadra, nunca escondida atrás de ícone.
 */
export function MoreSheet({
  open,
  onClose,
  state,
  sport,
  snapshot,
  teamName,
  nameOf,
  canRecord,
  closed,
  send,
  describe,
  onVoid,
}: {
  open: boolean;
  onClose: () => void;
  state: SportState;
  sport: SportTable;
  snapshot: TableSnapshot;
  teamName: (side: Side) => string;
  nameOf: (athleteId: string) => string;
  canRecord: boolean;
  closed: boolean;
  send: (draft: Draft) => boolean;
  describe: (e: TableEvent) => string;
  onVoid: (id: string) => void;
}) {
  const [athleteId, setAthleteId] = useState('');
  const active = sport
    .players(state)
    .filter((p) => p.status === 'active')
    .sort((a, b) => (a.side === b.side ? a.number - b.number : a.side === 'home' ? -1 : 1));

  const run = (draft: Draft) => {
    if (send(draft)) onClose();
  };

  const all = [...snapshot.confirmed, ...snapshot.pending];
  const voided = voidedIds(all);
  const pending = new Set(snapshot.pending.map((e) => e.id));
  const recent = all
    .filter((e) => !isVoidEvent(e))
    .slice(-15)
    .reverse();

  return (
    <Overlay open={open} onClose={onClose} title="Mais lançamentos">
      <div className="ui-stack ui-stack--section">
        {!canRecord && !closed && (
          <Notice>Inicie o período para lançar faltas e ações de equipe.</Notice>
        )}
        <section className="ui-stack" aria-labelledby="more-fouls">
          <h3 id="more-fouls">Faltas especiais</h3>
          <SelectField
            label="Atleta"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            disabled={!canRecord}
          >
            <option value="">Escolha…</option>
            {active.map((p) => (
              <option key={p.athleteId} value={p.athleteId}>
                #{p.number} {nameOf(p.athleteId)} · {teamName(p.side)}
              </option>
            ))}
          </SelectField>
          <div className="ui-form-row">
            {SPECIAL_FOULS.map((kind) => (
              <Button
                key={kind}
                variant="secondary"
                disabled={!canRecord || !athleteId}
                onClick={() => run({ type: 'foul', payload: { athleteId, kind } })}
              >
                {FOUL_LABEL[kind]}
              </Button>
            ))}
          </div>
        </section>

        <section className="ui-stack" aria-labelledby="more-team">
          <h3 id="more-team">Equipes</h3>
          <div className="sm-more__teams">
            {SIDES.map((side) => (
              <div key={side} className="ui-stack">
                <span className="t-label t-muted">{teamName(side)}</span>
                {sport.teamActions(state, side).map((a) => (
                  <Button
                    key={a.key}
                    variant="secondary"
                    disabled={!canRecord}
                    onClick={() => run(a.draft)}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="ui-stack" aria-labelledby="more-log">
          <h3 id="more-log">Lançamentos</h3>
          {recent.length === 0 ? (
            <p className="t-muted">Nenhum lançamento ainda.</p>
          ) : (
            <ul className="ui-list sm-more__log" aria-label="Últimos lançamentos">
              {recent.map((e) => (
                <li key={e.id} className={voided.has(e.id) ? 'is-voided' : undefined}>
                  <span className="ui-list__main">
                    <span>{describe(e)}</span>
                    {(voided.has(e.id) || pending.has(e.id)) && (
                      <span className="ui-list__meta">
                        {voided.has(e.id) ? 'Anulado' : 'Na fila, ainda não enviado'}
                      </span>
                    )}
                  </span>
                  {!voided.has(e.id) && !closed && (
                    <Button variant="danger-text" onClick={() => onVoid(e.id)}>
                      Anular
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div>
          <Button to="/" variant="quiet">
            Sair da mesa
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
