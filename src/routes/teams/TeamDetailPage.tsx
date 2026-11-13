import { useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import {
  Button,
  Group,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  SelectField,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { OrganizationAthlete, TeamDetail } from '../../lib/api/contract';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';
import { TeamInvites } from './TeamInvites';

/**
 * Equipe. Quem pode o quê vem da entidade da equipe:
 * - admin da atlética: cadastro rápido (nome e número, um atrás do outro) e convites;
 * - dono da equipe pessoal (atleta): convida atletas por e-mail e tira da equipe;
 * - quem joga nela: vê o elenco.
 */
export function TeamDetailPage() {
  const { id = '' } = useParams();
  const { organizations, personalOrg } = useSession();
  const [team, reload] = useAsync(() => api.team(id), id);

  if (team.status === 'loading') return <Skeleton lines={4} />;
  if (team.status === 'error') return <ErrorState message={team.message} onRetry={reload} />;
  const orgId = team.data.organizationId;
  const athleticOrg = organizations.find((o) => o.id === orgId);
  const athletic = !!athleticOrg;
  const owner = personalOrg?.id === orgId;

  return (
    <TeamView
      team={team.data}
      reload={reload}
      athletic={athletic}
      canManage={athletic || owner}
      orgName={owner ? 'Sua equipe' : (athleticOrg?.name ?? 'Equipe')}
    />
  );
}

function TeamView({
  team: data,
  reload,
  athletic,
  canManage,
  orgName,
}: {
  team: TeamDetail;
  reload(): void;
  /** Admin da atlética dona da equipe: cadastra atletas direto. */
  athletic: boolean;
  /** Admin da atlética ou dono da equipe pessoal. */
  canManage: boolean;
  orgName: string;
}) {
  const id = data.id;
  const orgId = data.organizationId;
  const [athletes, reloadAthletes] = useAsync<OrganizationAthlete[]>(
    () => (athletic ? api.orgAthletes(orgId) : Promise.resolve([])),
    `${orgId}:${athletic}`,
  );
  const [existing, setExisting] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [existingNumber, setExistingNumber] = useState('');
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createAthlete({
        organizationId: orgId,
        name,
        teamId: id,
        ...(number ? { number: Number(number) } : {}),
      });
      reloadAthletes();
      setName('');
      setNumber('');
      reload();
      nameRef.current?.focus();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const addExisting = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.putTeamPlayer(id, {
        athleteId: existing,
        number: existingNumber ? Number(existingNumber) : null,
      });
      setExisting('');
      setExistingNumber('');
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (athleteId: string) => {
    await api.removeTeamPlayer(id, athleteId).catch(() => {});
    reload();
  };

  const available =
    athletes.status === 'ok'
      ? athletes.data.filter((a) => !data.players.some((p) => p.athleteId === a.id))
      : [];

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader eyebrow={orgName} title={data.name} />
      {athletic && (
        <Group>
          <div className="ui-form">
            <form onSubmit={add} className="ui-form-row">
              <TextField
                ref={nameRef}
                label="Nome do atleta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <TextField
                label="Nº"
                fieldClassName="ui-field--num"
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
              <Button type="submit" variant="primary">
                Adicionar atleta
              </Button>
            </form>
            {available.length > 0 && (
              <form onSubmit={addExisting} className="ui-form-row">
                <SelectField
                  label="Atleta já cadastrado"
                  value={existing}
                  onChange={(e) => setExisting(e.target.value)}
                  required
                >
                  <option value="">Escolha…</option>
                  {available.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Nº"
                  fieldClassName="ui-field--num"
                  inputMode="numeric"
                  pattern="[0-9]{1,2}"
                  value={existingNumber}
                  onChange={(e) => setExistingNumber(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  Pôr na equipe
                </Button>
              </form>
            )}
            {error && <Notice tone="danger">{error}</Notice>}
          </div>
        </Group>
      )}
      {data.players.length === 0 ? (
        <EmptyState>
          {athletic
            ? 'Nenhum atleta ainda. Adicione o primeiro acima.'
            : canManage
              ? 'Nenhum atleta ainda. Convide o primeiro abaixo.'
              : 'Nenhum atleta ainda.'}
        </EmptyState>
      ) : (
        <ul className="ui-list" aria-label="Atletas da equipe">
          {data.players.map((p) => (
            <li key={p.athleteId}>
              <span className="ui-jersey">{p.number ?? '–'}</span>
              <span className="ui-list__main">
                <span className="ui-list__title">{p.name}</span>
              </span>
              {canManage && (
                <Button variant="danger-text" onClick={() => remove(p.athleteId)}>
                  Tirar da equipe
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && <TeamInvites teamId={id} onChange={reload} />}
    </div>
  );
}
