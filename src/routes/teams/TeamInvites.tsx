import { Copy, RefreshCw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Group, Icon, Notice, Skeleton, TextField } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { TeamInvite } from '../../lib/api/contract';
import { useAsync } from '../../lib/useAsync';
import { useCopy } from '../../lib/useCopy';

const STATUS: Record<TeamInvite['status'], { label: string; tone: 'neutral' | 'closed' }> = {
  pending: { label: 'Aguardando', tone: 'neutral' },
  accepted: { label: 'Aceito', tone: 'closed' },
  declined: { label: 'Recusado', tone: 'closed' },
};

/**
 * Link fixo para entrar na equipe: o dono copia e manda (ex.: no grupo do time). Quem abre entra
 * logado, escolhendo o número. Gerar outro link invalida o anterior.
 */
function InviteLink({ teamId }: { teamId: string }) {
  const [link, reload] = useAsync(() => api.teamInviteLink(teamId), `team-link-${teamId}`);
  const { copied, copy } = useCopy();
  const [error, setError] = useState('');

  const reset = async () => {
    if (!confirm('Gerar um novo link? O link atual deixa de funcionar.')) return;
    setError('');
    try {
      await api.resetTeamInviteLink(teamId);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (link.status === 'loading') return <Skeleton lines={1} />;
  if (link.status === 'error') return <Notice tone="danger">{link.message}</Notice>;
  const url = `${window.location.origin}${link.data.path}`;
  return (
    <div className="ui-stack">
      <p className="t-small t-muted">
        Quem abrir o link entra na equipe com a própria conta e escolhe o número.
      </p>
      <div className="ui-form-row team-link">
        <code className="ch-invite-url team-link__url">{url}</code>
        <Button variant="secondary" onClick={() => void copy(url)}>
          <Icon icon={Copy} />
          {copied === url ? 'Copiado' : 'Copiar link'}
        </Button>
        <Button variant="quiet" onClick={() => void reset()}>
          <Icon icon={RefreshCw} />
          Gerar novo
        </Button>
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}

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
      <Group>
        <InviteLink teamId={teamId} />
      </Group>
      <h3>Por e-mail</h3>
      <Group>
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
      </Group>
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
