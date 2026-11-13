import { useState } from 'react';
import { api, errorMessage } from '../lib/api/client';
import type { TeamInvite } from '../lib/api/contract';
import { useAsync } from '../lib/useAsync';
import { Button, Group, Notice } from './ui';

/**
 * Convites para jogar em equipes, para o e-mail da conta. Aceitar faz da pessoa atleta da
 * equipe (com o número do convite); some quando não há nenhum pendente.
 */
export function TeamInvitesPanel({ onAccepted }: { onAccepted?(): void }) {
  const [invites, reload] = useAsync(() => api.myTeamInvites(), 'team-invites');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (invites.status !== 'ok' || (invites.data.length === 0 && !msg)) return null;

  const answer = async (i: TeamInvite, accept: boolean) => {
    setBusy(i.id);
    setMsg(null);
    try {
      if (accept) await api.acceptTeamInvite(i.id);
      else await api.declineTeamInvite(i.id);
      setMsg({
        ok: true,
        text: accept ? `Você agora joga na ${i.team.name}.` : `Convite da ${i.team.name} recusado.`,
      });
      reload();
      if (accept) onAccepted?.();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="ui-stack" aria-labelledby="team-invites">
      <h2 id="team-invites">Convites para equipes</h2>
      {msg && (
        <Notice tone={msg.ok ? 'positive' : 'danger'} role="status">
          {msg.text}
        </Notice>
      )}
      {invites.data.length > 0 && (
        <Group>
          <ul className="ui-list" aria-labelledby="team-invites">
            {invites.data.map((i) => (
              <li key={i.id}>
                <span className="ui-list__main">
                  <span className="ui-list__title">{i.team.name}</span>
                  <span className="ui-list__meta">
                    {i.invitedBy ? `Convite de ${i.invitedBy.name}` : 'Convite'}
                    {i.number != null && ` · camisa ${i.number}`}
                    {!i.organization.isPersonal && ` · ${i.organization.name}`}
                  </span>
                </span>
                <Button
                  variant="primary"
                  disabled={busy === i.id}
                  onClick={() => void answer(i, true)}
                >
                  Aceitar
                </Button>
                <Button
                  variant="danger-text"
                  disabled={busy === i.id}
                  onClick={() => void answer(i, false)}
                >
                  Recusar
                </Button>
              </li>
            ))}
          </ul>
        </Group>
      )}
    </section>
  );
}
