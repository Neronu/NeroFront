import type { MemberRole } from '../../lib/api/contract';
import { useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Notice,
  SelectField,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

const ROLE: Record<MemberRole, string> = { admin: 'Administrador(a)', scorer: 'Mesário(a)' };

/** Seção de membros, dentro de Configurações. */
export function Members() {
  const { org, isAdmin } = useOrg();
  const [members, reload] = useAsync(() => api.members(org.id), org.id);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('scorer');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const m = await api.addMember(org.id, { email, role });
      setMsg({
        ok: true,
        text: m.pending ? `Convite enviado para ${m.email}.` : `${m.name} entrou na entidade.`,
      });
      setEmail('');
      reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };

  return (
    <section className="ui-stack" aria-labelledby="settings-members">
      <h2 id="settings-members">Membros</h2>
      {members.status === 'loading' && <Skeleton lines={2} />}
      {members.status === 'error' && <ErrorState message={members.message} onRetry={reload} />}
      {members.status === 'ok' && (
        <ul className="ui-list">
          {members.data.map((m) => (
            <li key={m.email}>
              <span className="ui-list__main">
                <span className="ui-list__title">{m.name ?? m.email}</span>
                {m.name && <span className="ui-list__meta">{m.email}</span>}
              </span>
              <span className="t-small t-muted">{ROLE[m.role]}</span>
              {m.pending && <Badge>Convite pendente</Badge>}
            </li>
          ))}
        </ul>
      )}
      {isAdmin && (
        <Card>
          <form onSubmit={add} className="ui-form">
            <h3>Convidar membro</h3>
            <div className="ui-form-row">
              <TextField
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <SelectField
                label="Papel"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                <option value="scorer">Mesário(a)</option>
                <option value="admin">Administrador(a)</option>
              </SelectField>
            </div>
            <p className="t-small t-muted">
              Mesários anotam e fecham súmulas; administradores também cuidam de cadastros, regras e
              campeonatos.
            </p>
            {msg && <Notice tone={msg.ok ? 'positive' : 'danger'}>{msg.text}</Notice>}
            <div>
              <Button type="submit" variant="secondary">
                Convidar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}
