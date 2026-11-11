import type { OrganizationAthlete } from '@neronu/api-contract';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/** Atletas da entidade. E-mail e RGA são opcionais e nunca aparecem em páginas públicas. */
export function Athletes() {
  const { org, isAdmin } = useOrg();
  const [list, reload] = useAsync(() => api.orgAthletes(org.id), org.id);
  const [form, setForm] = useState({ name: '', email: '', rga: '' });
  const [error, setError] = useState('');

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createAthlete({
        organizationId: org.id,
        name: form.name,
        ...(form.email ? { email: form.email } : {}),
        ...(form.rga ? { rga: form.rga } : {}),
      });
      setForm({ name: '', email: '', rga: '' });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="card stack">
      <h1>Atletas</h1>
      {isAdmin && (
        <form onSubmit={add} className="stack">
          <div className="row wrap">
            <input
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="E-mail (opcional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="RGA (opcional)"
              value={form.rga}
              onChange={(e) => setForm({ ...form, rga: e.target.value })}
            />
            <button type="submit" className="primary">
              Adicionar
            </button>
          </div>
          {error && <p className="status-error">{error}</p>}
        </form>
      )}
      {list.status === 'error' && <p className="status-error">{list.message}</p>}
      {list.status === 'ok' && (
        <ul className="list">
          {list.data.map((a) => (
            <AthleteRow key={a.id} athlete={a} editable={isAdmin} onSaved={reload} />
          ))}
        </ul>
      )}
      {list.status === 'ok' && list.data.length === 0 && (
        <p className="muted">Nenhum atleta ainda.</p>
      )}
    </section>
  );
}

function AthleteRow({
  athlete,
  editable,
  onSaved,
}: {
  athlete: OrganizationAthlete;
  editable: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(athlete.email ?? '');
  const [rga, setRga] = useState(athlete.rga ?? '');
  const [error, setError] = useState('');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAthlete(athlete.id, { email: email || null, rga: rga || null });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <li className="stack tight">
      <div className="row between">
        <span>
          <strong>{athlete.name}</strong>
          <span className="muted small">
            {' '}
            {[athlete.email, athlete.rga && `RGA ${athlete.rga}`].filter(Boolean).join(' · ')}
          </span>
        </span>
        {editable && !editing && (
          <button className="link" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}
      </div>
      {athlete.teams.length > 0 && (
        <span className="muted small">
          {athlete.teams
            .map((t) => `${t.name}${t.number !== null ? ` #${t.number}` : ''}`)
            .join(', ')}
        </span>
      )}
      {editing && (
        <form onSubmit={save} className="row wrap">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input placeholder="RGA" value={rga} onChange={(e) => setRga(e.target.value)} />
          <button type="submit" className="primary">
            Salvar
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancelar
          </button>
          {error && <p className="status-error">{error}</p>}
        </form>
      )}
    </li>
  );
}
