import type { OrganizationAthlete } from '../../lib/api/contract';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Group,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/**
 * Atletas da entidade. E-mail e RGA são opcionais e nunca aparecem em páginas públicas.
 * O admin pode ocultar o perfil público de um atleta, a pedido dele (E9).
 */
export function Athletes() {
  const { org } = useOrg();
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
    <div className="ui-stack ui-stack--section">
      <PageHeader title="Atletas" />
      {!org.publicationConsent && (
        <Notice>
          As páginas públicas dos atletas estão desligadas até a entidade declarar que tem
          autorização para publicar os dados. Isso é feito em{' '}
          <Link to="/configuracoes">Configurações</Link>.
        </Notice>
      )}
      <Group>
        <form onSubmit={add} className="ui-form">
          <div className="ui-form-row">
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              label="E-mail (opcional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="RGA (opcional)"
              value={form.rga}
              onChange={(e) => setForm({ ...form, rga: e.target.value })}
            />
          </div>
          <p className="t-small t-muted">E-mail e RGA nunca aparecem nas páginas públicas.</p>
          {error && <Notice tone="danger">{error}</Notice>}
          <div>
            <Button type="submit" variant="primary" fluid>
              Adicionar atleta
            </Button>
          </div>
        </form>
      </Group>
      {list.status === 'loading' && <Skeleton />}
      {list.status === 'error' && <ErrorState message={list.message} onRetry={reload} />}
      {list.status === 'ok' &&
        (list.data.length === 0 ? (
          <EmptyState>Nenhum atleta ainda. Cadastre o primeiro acima.</EmptyState>
        ) : (
          <ul className="ui-list" aria-label="Atletas">
            {list.data.map((a) => (
              <AthleteRow key={a.id} athlete={a} editable onSaved={reload} />
            ))}
          </ul>
        ))}
    </div>
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
  const [busy, setBusy] = useState(false);

  const togglePublic = async (publicProfile: boolean) => {
    setBusy(true);
    setError('');
    try {
      await api.updateAthlete(athlete.id, { publicProfile });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

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

  const contact = [athlete.email, athlete.rga && `RGA ${athlete.rga}`].filter(Boolean).join(' · ');
  const status = [athlete.linked && 'Conta ligada', !athlete.publicProfile && 'Perfil oculto']
    .filter(Boolean)
    .join(' · ');
  const teams = athlete.teams
    .map((t) => `${t.name}${t.number !== null ? ` #${t.number}` : ''}`)
    .join(', ');

  return (
    <li>
      <span className="ui-list__main">
        <span className="ui-list__title">{athlete.name}</span>
        {contact && <span className="ui-list__meta">{contact}</span>}
        {teams && <span className="ui-list__meta">{teams}</span>}
        {status && <span className="ui-list__meta">{status}</span>}
      </span>
      {editable && (
        <label className="ui-checkline t-small">
          <input
            type="checkbox"
            className="ui-check"
            checked={athlete.publicProfile}
            disabled={busy}
            onChange={(e) => void togglePublic(e.target.checked)}
          />
          Perfil público
        </label>
      )}
      {editable && !editing && (
        <Button variant="quiet" onClick={() => setEditing(true)}>
          Editar
        </Button>
      )}
      {editing && (
        <form onSubmit={save} className="ui-form ui-list__full">
          <div className="ui-form-row">
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField label="RGA" value={rga} onChange={(e) => setRga(e.target.value)} />
          </div>
          <div className="ui-form-row">
            <Button type="submit" variant="primary">
              Salvar atleta
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {error && (
        <div className="ui-list__full">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </li>
  );
}
