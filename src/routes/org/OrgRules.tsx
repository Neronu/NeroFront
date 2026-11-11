import { RulesForm } from '../../components/RulesForm';
import { api } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

export function OrgRules() {
  const { org, isAdmin } = useOrg();
  const [rules] = useAsync(() => api.orgRules(org.id), org.id);
  return (
    <section className="card stack">
      <h1>Regras do basquete</h1>
      <p className="muted small">
        Padrão da {org.name}: novas partidas e campeonatos nascem com estas regras. Cada campeonato
        ainda pode ajustá-las.
      </p>
      {rules.status === 'loading' && <p className="muted">Carregando…</p>}
      {rules.status === 'error' && <p className="status-error">{rules.message}</p>}
      {rules.status === 'ok' && (
        <RulesForm
          data={rules.data}
          readOnly={!isAdmin}
          onSave={(changes) => api.putOrgRules(org.id, changes)}
        />
      )}
    </section>
  );
}
