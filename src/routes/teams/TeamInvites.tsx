import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Notice, TextField } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { TeamInvite } from '../../lib/api/contract';
import { useAsync } from '../../lib/useAsync';

const STATUS: Record<TeamInvite['status'], { label: string; tone: 'neutral' | 'closed' }> = {
  pending: { label: 'Aguardando', tone: 'neutral' },
  accepted: { label: 'Aceito', tone: 'closed' },
  declined: { label: 'Recusado', tone: 'closed' },
};

/**
 * Convites por e-mail para jogar na equipe. A pessoa aceita na conta dela (quem não tem conta
 * recebe o convite por e-mail e aceita depois de se cadastrar com esse e-mail).
 */
export function TeamInvites({ teamId, onChange }: { teamId: string; onChange(): void }) {
  const [invites, reload] = useAsync(() => api.teamInvites(teamId), teamId);
  const [form, setForm] = useState({ email: '', name: '', number: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.inviteToTeam(teamId, {
        email: form.email.trim(),
        name: form.name,
        ...(form.number ? { number: Number(form.number) } : {}),
      });
      setMsg({ ok: true, text: `Convite enviado para ${form.email.trim()}.` });
      setForm({ email: '', name: '', number: '' });
      reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (i: TeamInvite) => {
    setMsg(null);
    try {
      await api.cancelTeamInvite(i.id);
      reload();
      onChange();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };

  return (
    <section className="ui-stack" aria-labelledby="team-invites-head">
      <h2 id="team-invites-head">Convidar atletas</h2>
      <Card>
        <form onSubmit={send} className="ui-form">
          <div className="ui-form-row">
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <TextField
              label="Nº"
              fieldClassName="ui-field--num"
              inputMode="numeric"
              pattern="[0-9]{1,2}"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Enviar convite
            </Button>
          </div>
          {msg && (
            <Notice tone={msg.ok ? 'positive' : 'danger'} role="status">
              {msg.text}
            </Notice>
          )}
        </form>
      </Card>
      {invites.status === 'ok' && invites.data.length > 0 && (
        <ul className="ui-list" aria-label="Convites enviados">
          {invites.data.map((i) => (
            <li key={i.id}>
              <span className="ui-list__main">
                <span className="ui-list__title">
                  {i.number != null && <span className="t-stat">{i.number} </span>}
                  {i.name}
                </span>
                <span className="ui-list__meta">{i.email}</span>
              </span>
              <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
              {i.status === 'pending' && (
                <Button variant="danger-text" onClick={() => void cancel(i)}>
                  Cancelar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
