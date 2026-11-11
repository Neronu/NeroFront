import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

export function NewMatch() {
  const { org } = useOrg();
  const [teams] = useAsync(() => api.teams(org.id), org.id);
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [venue, setVenue] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const match = await api.createMatch({
        organizationId: org.id,
        sportKey: 'basketball',
        homeTeamId: home,
        awayTeamId: away,
        ...(venue ? { venue } : {}),
      });
      navigate(`/partidas/${match.id}/preparar`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (teams.status === 'loading') return <p className="muted">Carregando…</p>;
  if (teams.status === 'error') return <p className="status-error">{teams.message}</p>;
  if (teams.data.length < 2) {
    return (
      <section className="card">
        <p>
          Cadastre pelo menos duas equipes em <Link to="/equipes">Equipes</Link>.
        </p>
      </section>
    );
  }
  const options = teams.data.map((t) => (
    <option key={t.id} value={t.id}>
      {t.name}
    </option>
  ));
  return (
    <section className="card">
      <h1>Nova partida</h1>
      <form onSubmit={create} className="stack">
        <label>
          Mandante (A)
          <select value={home} onChange={(e) => setHome(e.target.value)} required>
            <option value="">Escolha…</option>
            {options}
          </select>
        </label>
        <label>
          Visitante (B)
          <select value={away} onChange={(e) => setAway(e.target.value)} required>
            <option value="">Escolha…</option>
            {options}
          </select>
        </label>
        <label>
          Local
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Opcional" />
        </label>
        <p className="muted small">
          A partida usa as <Link to="/regras">regras da entidade</Link>.
        </p>
        {error && <p className="status-error">{error}</p>}
        <button type="submit" className="primary" disabled={!home || !away || home === away}>
          Criar e escolher relacionados
        </button>
      </form>
    </section>
  );
}
