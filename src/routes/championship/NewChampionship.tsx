import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { fromLocalInput } from '../../lib/dates';
import { useOrg } from '../../lib/session';

export function NewChampionship() {
  const { org } = useOrg();
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [rosterLockAt, setRosterLockAt] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const ch = await api.createChampionship({
        organizationId: org.id,
        name,
        sportKey: 'basketball',
        ...(startsAt ? { startsAt: fromLocalInput(startsAt)! } : {}),
        ...(rosterLockAt ? { rosterLockAt: fromLocalInput(rosterLockAt)! } : {}),
      });
      navigate(`/campeonatos/${ch.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="card narrow">
      <h1>Novo campeonato</h1>
      <form onSubmit={submit} className="stack">
        <label>
          Nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Copa das Atléticas 2026"
            required
          />
        </label>
        <label>
          Início
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label>
          Trava dos elencos
          <input
            type="datetime-local"
            value={rosterLockAt}
            onChange={(e) => setRosterLockAt(e.target.value)}
          />
        </label>
        <p className="muted small">
          O campeonato nasce com as regras de basquete da {org.name}; você pode ajustá-las depois.
        </p>
        {error && <p className="status-error">{error}</p>}
        <button type="submit" className="primary">
          Criar campeonato
        </button>
      </form>
    </section>
  );
}
