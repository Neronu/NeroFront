import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

export function Teams() {
  const { org, isAdmin } = useOrg();
  const [teams] = useAsync(() => api.teams(org.id), org.id);
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
    <section className="card stack">
      <h1>Equipes</h1>
      {isAdmin && (
        <form onSubmit={create} className="row">
          <input
            placeholder="Nome da equipe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="primary">
            Criar
          </button>
        </form>
      )}
      {error && <p className="status-error">{error}</p>}
      {teams.status === 'error' && <p className="status-error">{teams.message}</p>}
      {teams.status === 'ok' && (
        <ul className="list">
          {teams.data.map((t) => (
            <li key={t.id}>
              <Link to={`/equipes/${t.id}`}>{t.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
