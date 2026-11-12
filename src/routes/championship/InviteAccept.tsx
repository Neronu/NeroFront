import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Button,
  Card,
  ErrorState,
  Notice,
  PageHeader,
  SelectField,
  Skeleton,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/** Destino do link de convite: a entidade convidada aceita participar. */
export function InviteAccept() {
  const { token = '' } = useParams();
  const { me, refresh, personalOrg } = useSession();
  const [invite] = useAsync(() => api.invite(token), token);
  // Atléticas que administra e, se tiver, a entidade pessoal (equipes criadas pelo atleta).
  const admins = [
    ...(me?.memberships ?? []).filter((m) => m.role === 'admin' && !m.organization.isGuest),
    ...(personalOrg ? [{ organization: personalOrg, role: 'admin' as const }] : []),
  ];
  const label = (o: { name: string; isPersonal?: boolean }) =>
    o.isPersonal ? 'suas equipes' : o.name;
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (invite.status === 'loading') return <Skeleton lines={3} />;
  if (invite.status === 'error')
    return <ErrorState title="Convite inválido" message={invite.message} />;
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

  const chosenOrg =
    admins.find((a) => a.organization.id === orgId)?.organization ?? admins[0]?.organization;
  const chosen = chosenOrg && label(chosenOrg);

  return (
    <div className="ui-stack">
      <PageHeader eyebrow="Convite" title={championship.name} />
      <Card className="ui-stack">
        <p>
          A <strong>{organizer.name}</strong> convidou sua entidade para o campeonato.
        </p>
        {acceptedBy && !admins.some((a) => a.organization.id === acceptedBy.id) ? (
          <Notice>Este convite já foi usado pela {acceptedBy.name}.</Notice>
        ) : admins.length === 0 ? (
          <p>
            Para participar, crie uma equipe em <Link to="/equipes">Equipes</Link> e volte a este
            link. Atléticas são cadastradas pela administração do Neronu.
          </p>
        ) : (
          <>
            {admins.length > 1 && (
              <SelectField
                label="Entidade"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                {admins.map((a) => (
                  <option key={a.organization.id} value={a.organization.id}>
                    {a.organization.isPersonal ? 'Suas equipes' : a.organization.name}
                  </option>
                ))}
              </SelectField>
            )}
            {error && <Notice tone="danger">{error}</Notice>}
            <Button variant="primary" block onClick={accept}>
              Participar com {chosen}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
