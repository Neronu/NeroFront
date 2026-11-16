import { useState, type FormEvent } from 'react';
import { Button, Overlay, SelectField } from '../../../components/ui';
import type { TablePlayer } from '../../../lib/match/sport-table';
import type { Draft } from '../../../lib/match/table';

type Side = 'home' | 'away';

/**
 * Substituição (vôlei): quem sai entre os que estão em quadra, quem entra entre os do banco.
 * A mesa e a API conferem o limite do set; entre sets a troca é mudança de formação.
 */
export function SubstitutionSheet({
  open,
  onClose,
  side,
  teamName,
  players,
  nameOf,
  left,
  send,
}: {
  open: boolean;
  onClose(): void;
  side: Side;
  teamName: string;
  players: TablePlayer[];
  nameOf: (athleteId: string) => string;
  /** Texto com o que resta no set ("Substituição (4 restantes no set)"). */
  left?: string;
  send: (draft: Draft) => boolean;
}) {
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const onCourt = players.filter((p) => p.onCourt);
  const bench = players.filter((p) => !p.onCourt && p.status === 'active');
  const label = (p: TablePlayer) =>
    `#${p.number} ${nameOf(p.athleteId)}${p.status !== 'active' ? ' (fora do jogo)' : ''}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!outId || !inId) return;
    if (send({ type: 'substitution', payload: { side, outId, inId } })) onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} title={`Substituição · ${teamName}`}>
      <form className="ui-form" onSubmit={submit}>
        {left && <p className="t-small t-muted">{left}</p>}
        <SelectField label="Sai" value={outId} onChange={(e) => setOutId(e.target.value)} required>
          <option value="">Escolha quem está em quadra…</option>
          {onCourt.map((p) => (
            <option key={p.athleteId} value={p.athleteId}>
              {label(p)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Entra" value={inId} onChange={(e) => setInId(e.target.value)} required>
          <option value="">Escolha quem está no banco…</option>
          {bench.map((p) => (
            <option key={p.athleteId} value={p.athleteId}>
              {label(p)}
            </option>
          ))}
        </SelectField>
        <div className="ui-form-row">
          <Button type="submit" disabled={!outId || !inId}>
            Confirmar substituição
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Overlay>
  );
}
