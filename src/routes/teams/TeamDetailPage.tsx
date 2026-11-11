import { useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/** Cadastro rápido: nome e número, um atrás do outro, sem sair da tela. */
export function TeamDetailPage() {
  const { id = '' } = useParams();
  const { org, isAdmin } = useOrg();
  const [team, reload] = useAsync(() => api.team(id), id);
  const [athletes, reloadAthletes] = useAsync(() => api.orgAthletes(org.id), org.id);
  const [existing, setExisting] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createAthlete({
        organizationId: org.id,
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
      await api.putTeamPlayer(id, { athleteId: existing, number: number ? Number(number) : null });
      setExisting('');
      setNumber('');
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (athleteId: string) => {
    await api.removeTeamPlayer(id, athleteId).catch(() => {});
    reload();
  };

  if (team.status === 'loading') return <p className="muted">Carregando…</p>;
  if (team.status === 'error') return <p className="status-error">{team.message}</p>;
  return (
    <section className="card stack">
      <h1>{team.data.name}</h1>
      {isAdmin && (
        <>
          <form onSubmit={add} className="row">
            <input
              ref={nameRef}
              placeholder="Nome do atleta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="num-input"
              placeholder="Nº"
              inputMode="numeric"
              pattern="[0-9]{1,2}"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <button type="submit" className="primary">
              Adicionar
            </button>
          </form>
          {athletes.status === 'ok' && (
            <form onSubmit={addExisting} className="row">
              <select value={existing} onChange={(e) => setExisting(e.target.value)} required>
                <option value="">Atleta já cadastrado…</option>
                {athletes.data
                  .filter((a) => !team.data.players.some((p) => p.athleteId === a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
              <button type="submit">Pôr na equipe</button>
            </form>
          )}
        </>
      )}
      {error && <p className="status-error">{error}</p>}
      <ul className="list">
        {team.data.players.map((p) => (
          <li key={p.athleteId} className="row">
            <span className="jersey">{p.number ?? '–'}</span>
            <span className="grow">{p.name}</span>
            {isAdmin && (
              <button className="link danger" onClick={() => remove(p.athleteId)}>
                Tirar
              </button>
            )}
          </li>
        ))}
      </ul>
      {team.data.players.length === 0 && <p className="muted">Nenhum atleta ainda.</p>}
    </section>
  );
}
