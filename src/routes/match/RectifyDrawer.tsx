import { periodLabel, type PlayerFoulKind } from '@neronu/sport-basketball';
import { effectiveEvents } from '@neronu/sport-core';
import { useMemo, useState, type FormEvent } from 'react';
import { Button, Notice, Overlay, SelectField, TextAreaField } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { RectifyChange } from '../../lib/api/contract';
import { describeEvent, FOUL_LABEL, type Who } from '../../lib/match/describe';
import { previewRectification } from '../../lib/match/rectify';
import { newEventId, type TableEvent, type TableSnapshot } from '../../lib/match/table';

type Side = 'home' | 'away';

/** Ações que dá para incluir numa retificação: pontos e faltas de atleta. */
const ACTIONS = [
  { key: 'score:1', label: 'Lance livre (+1)' },
  { key: 'score:2', label: 'Cesta de 2 (+2)' },
  { key: 'score:3', label: 'Cesta de 3 (+3)' },
  ...(Object.keys(FOUL_LABEL) as PlayerFoulKind[]).map((k) => ({
    key: `foul:${k}`,
    label: FOUL_LABEL[k],
  })),
];

function draftEvent(action: string, athleteId: string) {
  const [type, value] = action.split(':') as ['score' | 'foul', string];
  return {
    id: newEventId(),
    type,
    payload: type === 'score' ? { athleteId, points: Number(value) } : { athleteId, kind: value },
  };
}

const REASON_MIN = 5;
const REASON_MAX = 500;

/**
 * Retificação de súmula fechada (E11), só para a organizadora: anular e incluir lances, ver o
 * novo placar antes de enviar e registrar o motivo. A API gera uma nova revisão e um novo PDF;
 * a anterior continua consultável.
 */
export function RectifyDrawer({
  open,
  onClose,
  snapshot,
  onDone,
}: {
  open: boolean;
  onClose(): void;
  snapshot: TableSnapshot;
  onDone(): void;
}) {
  const { server, setup, rules, confirmed, state } = snapshot;
  const [changes, setChanges] = useState<RectifyChange[]>([]);
  const [anchor, setAnchor] = useState('');
  const [athleteId, setAthleteId] = useState('');
  const [action, setAction] = useState('score:2');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const teamName = (s: Side) => (s === 'home' ? server.match.homeTeam : server.match.awayTeam).name;
  const who = useMemo(() => {
    const m = new Map<string, Who>();
    for (const s of ['home', 'away'] as const)
      for (const r of server.roster[s].roster)
        m.set(r.athleteId, { number: r.number, name: r.name, side: s });
    return m;
  }, [server]);
  const describe = (e: TableEvent) =>
    describeEvent(
      e,
      (id) => who.get(id),
      teamName,
      (p) => periodLabel(state, p),
    );

  const events = useMemo(() => effectiveEvents(confirmed), [confirmed]);
  const voided = new Set(changes.flatMap((c) => (c.op === 'void' ? [c.targetId] : [])));
  const preview = changes.length ? previewRectification(setup, rules, confirmed, changes) : null;

  const toggleVoid = (id: string) =>
    setChanges(
      voided.has(id)
        ? changes.filter((c) => !(c.op === 'void' && c.targetId === id))
        : [...changes, { op: 'void', targetId: id }],
    );

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!athleteId) return;
    setChanges([
      ...changes,
      { op: 'add', afterEventId: anchor || null, event: draftEvent(action, athleteId) },
    ]);
  };

  const changeLabel = (c: RectifyChange) => {
    if (c.op === 'void') {
      const target = events.find((e) => e.id === c.targetId);
      return `Anular: ${target ? describe(target) : 'lance'}`;
    }
    const after = c.afterEventId ? events.find((e) => e.id === c.afterEventId) : null;
    return `Incluir: ${describe(c.event as unknown as TableEvent)} · ${
      after ? `depois de ${describe(after)}` : 'antes do primeiro lance'
    }`;
  };

  const trimmed = reason.trim();
  const canSubmit =
    !!preview?.ok && trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX && !busy;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await api.rectify(server.match.id, { reason: trimmed, changes });
      setChanges([]);
      setReason('');
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay open={open} onClose={onClose} title="Retificar súmula" kind="drawer">
      <div className="ui-stack ui-stack--section">
        <section className="ui-stack" aria-labelledby="rect-changes">
          <h3 id="rect-changes">Mudanças</h3>
          {changes.length === 0 ? (
            <p className="t-small t-muted">
              Anule lances na lista abaixo ou inclua um lance que faltou.
            </p>
          ) : (
            <ul className="ui-list" aria-labelledby="rect-changes">
              {changes.map((c, i) => (
                <li key={c.op === 'void' ? `v-${c.targetId}` : `a-${c.event.id}`}>
                  <span className="ui-list__main t-small">{changeLabel(c)}</span>
                  <Button
                    variant="quiet"
                    onClick={() => setChanges(changes.filter((_, j) => j !== i))}
                  >
                    Desfazer
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {preview?.ok && (
            <Notice tone="ink" role="status">
              Novo placar: {teamName('home')}{' '}
              <span className="t-stat">{preview.state.teams.home.score}</span> ×{' '}
              <span className="t-stat">{preview.state.teams.away.score}</span> {teamName('away')}{' '}
              (antes {state.teams.home.score} × {state.teams.away.score})
            </Notice>
          )}
          {preview && !preview.ok && (
            <Notice tone="danger">
              {preview.message}
              {preview.event && ` (${describe(preview.event)})`}
            </Notice>
          )}
        </section>

        <form className="ui-form" onSubmit={add} aria-labelledby="rect-add">
          <h3 id="rect-add">Incluir lance</h3>
          <SelectField
            label="Atleta"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            required
          >
            <option value="">Escolha…</option>
            {(['home', 'away'] as const).map((s) => (
              <optgroup key={s} label={teamName(s)}>
                {server.roster[s].roster.map((r) => (
                  <option key={r.athleteId} value={r.athleteId}>
                    {r.number} · {r.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
          <SelectField label="Lance" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Posição" value={anchor} onChange={(e) => setAnchor(e.target.value)}>
            <option value="">Antes do primeiro lance</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                Depois de: {describe(ev)}
              </option>
            ))}
          </SelectField>
          <div>
            <Button type="submit" variant="secondary">
              Incluir lance
            </Button>
          </div>
        </form>

        <section className="ui-stack" aria-labelledby="rect-events">
          <h3 id="rect-events">Lances da súmula</h3>
          <ol className="ui-list" aria-labelledby="rect-events">
            {events.map((ev) => {
              const isVoided = voided.has(ev.id);
              return (
                <li key={ev.id}>
                  <span className="ui-list__main t-small">
                    {isVoided ? <s>{describe(ev)}</s> : describe(ev)}
                  </span>
                  <Button
                    variant={isVoided ? 'quiet' : 'danger-text'}
                    onClick={() => toggleVoid(ev.id)}
                  >
                    {isVoided ? 'Manter' : 'Anular'}
                  </Button>
                </li>
              );
            })}
          </ol>
        </section>

        <form className="ui-form" onSubmit={submit}>
          <TextAreaField
            label="Motivo"
            help={`Obrigatório, de ${REASON_MIN} a ${REASON_MAX} caracteres. Fica no histórico da súmula.`}
            rows={3}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" variant="primary" block disabled={!canSubmit}>
            {busy ? 'Retificando…' : 'Retificar e gerar novo PDF'}
          </Button>
        </form>
      </div>
    </Overlay>
  );
}
