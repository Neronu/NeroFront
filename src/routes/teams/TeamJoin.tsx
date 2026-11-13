import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Button,
  ErrorState,
  Group,
  Notice,
  PageHeader,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/** Destino do link fixo da equipe: a pessoa entra na equipe com a própria conta. */
export function TeamJoin() {
  const { token = '' } = useParams();
  const { refresh } = useSession();
  const [preview] = useAsync(() => api.teamLink(token), `team-link-${token}`);
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (preview.status === 'loading') return <Skeleton lines={3} />;
  if (preview.status === 'error')
    return <ErrorState title="Link inválido" message={preview.message} />;
  const { team, organization, alreadyMember } = preview.data;
  const orgName = organization.isPersonal ? null : organization.name;

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const mine = await api.joinTeamByLink(token, number ? { number: Number(number) } : {});
      await refresh();
      navigate(`/equipes/${mine.team.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="ui-stack">
      <PageHeader eyebrow="Convite para equipe" title={team.name} meta={orgName} />
      <Group className="ui-stack">
        {alreadyMember ? (
          <Notice tone="positive">
            Você já joga nesta equipe. <Link to={`/equipes/${team.id}`}>Ver equipe</Link>
          </Notice>
        ) : (
          <form onSubmit={join} className="ui-form">
            <p>
              Você foi convidado(a) para jogar na <strong>{team.name}</strong>
              {orgName && <> ({orgName})</>}.
            </p>
            <TextField
              label="Número da camisa (opcional)"
              fieldClassName="ui-field--num"
              inputMode="numeric"
              pattern="[0-9]{1,2}"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            {error && (
              <Notice tone="danger" role="alert">
                {error}
              </Notice>
            )}
            <Button type="submit" variant="primary" block disabled={busy}>
              Entrar na equipe
            </Button>
          </form>
        )}
      </Group>
    </div>
  );
}
