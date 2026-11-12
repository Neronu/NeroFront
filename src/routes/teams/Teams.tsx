import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/** Equipes da atlética selecionada; o admin cria e monta os elencos. */
export function OrgTeams() {
  const { org, isAdmin } = useOrg();
  const [teams, reload] = useAsync(() => api.teams(org.id), org.id);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const team = await api.createTeam({ organizationId: org.id, name });
      navigate(`/equipes/${team.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="ui-stack" aria-labelledby="org-teams">
      <h2 id="org-teams">Equipes da {org.name}</h2>
      {isAdmin && (
        <Card>
          <form onSubmit={create} className="ui-form">
            <div className="ui-form-row">
              <TextField
                label="Nome da equipe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Basquete masculino"
                required
              />
              <Button type="submit" variant="primary">
                Criar equipe
              </Button>
            </div>
            {error && <Notice tone="danger">{error}</Notice>}
          </form>
        </Card>
      )}
      {teams.status === 'loading' && <Skeleton />}
      {teams.status === 'error' && <ErrorState message={teams.message} onRetry={reload} />}
      {teams.status === 'ok' &&
        (teams.data.length === 0 ? (
          <EmptyState>
            {isAdmin
              ? 'Nenhuma equipe ainda. Crie a primeira e adicione os atletas.'
              : 'Nenhuma equipe ainda.'}
          </EmptyState>
        ) : (
          <ul className="ui-list" aria-label={`Equipes da ${org.name}`}>
            {teams.data.map((t) => (
              <li key={t.id}>
                <Link to={`/equipes/${t.id}`} className="ui-list__title">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
