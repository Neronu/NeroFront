import type { MemberRole } from '@neronu/api-contract';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

const ROLE: Record<MemberRole, string> = { admin: 'Administrador(a)', scorer: 'Mesário(a)' };

export function Members() {
  const { org, isAdmin } = useOrg();
  const [members, reload] = useAsync(() => api.members(org.id), org.id);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('scorer');
  const [msg, setMsg] = useState('');

  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const m = await api.addMember(org.id, { email, role });
      setMsg(m.pending ? `Convite enviado para ${m.email}.` : `${m.name} entrou na entidade.`);
      setEmail('');
      reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  return (
    <section className="card stack">
      <h1>Membros</h1>
      {members.status === 'ok' && (
        <ul className="list">
          {members.data.map((m) => (
            <li key={m.email} className="row between">
              <span>
                {m.name ?? m.email}
                {m.name && <span className="muted small"> · {m.email}</span>}
              </span>
              <span className="muted small">
                {ROLE[m.role]}
                {m.pending && ' · convite pendente'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {isAdmin && (
        <form onSubmit={add} className="stack">
          <h2>Convidar</h2>
          <div className="row wrap">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              <option value="scorer">Mesário(a)</option>
              <option value="admin">Administrador(a)</option>
            </select>
            <button type="submit" className="primary">
              Convidar
            </button>
          </div>
          <p className="muted small">
            Mesários anotam e fecham súmulas; administradores também cuidam de cadastros, regras e
            campeonatos.
          </p>
          {msg && <p>{msg}</p>}
        </form>
      )}
    </section>
  );
}
