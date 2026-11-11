import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/** Destino do link de convite: a entidade convidada aceita participar. */
export function InviteAccept() {
  const { token = '' } = useParams();
  const { me, refresh } = useSession();
  const [invite] = useAsync(() => api.invite(token), token);
  const admins = (me?.memberships ?? []).filter(
    (m) => m.role === 'admin' && !m.organization.isGuest,
  );
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (invite.status === 'loading') return <p className="muted">Carregando…</p>;
  if (invite.status === 'error') return <p className="status-error">{invite.message}</p>;
  const { championship, organizer, acceptedBy } = invite.data;

  const accept = async () => {
    try {
      const ch = await api.acceptInvite(token, orgId || admins[0]!.organization.id);
      await refresh();
      navigate(`/campeonatos/${ch.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="card narrow stack">
      <h1>{championship.name}</h1>
      <p>
        A <strong>{organizer.name}</strong> convidou sua entidade para o campeonato.
      </p>
      {acceptedBy && !admins.some((a) => a.organization.id === acceptedBy.id) ? (
        <p className="status-warn">Este convite já foi usado pela {acceptedBy.name}.</p>
      ) : admins.length === 0 ? (
        <p>
          Você precisa administrar uma entidade para aceitar.{' '}
          <Link to="/entidades/nova">Criar entidade</Link>
        </p>
      ) : (
        <>
          {admins.length > 1 && (
            <label>
              Entidade
              <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                {admins.map((a) => (
                  <option key={a.organization.id} value={a.organization.id}>
                    {a.organization.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <p className="status-error">{error}</p>}
          <button className="primary" onClick={accept}>
            Participar com{' '}
            {admins.find((a) => a.organization.id === orgId)?.organization.name ??
              admins[0]!.organization.name}
          </button>
        </>
      )}
    </section>
  );
}
