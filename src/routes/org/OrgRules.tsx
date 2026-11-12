import { RulesForm } from '../../components/RulesForm';
import { ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { api } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

export function OrgRules() {
  const { org, isAdmin } = useOrg();
  const [rules, reload] = useAsync(() => api.orgRules(org.id), org.id);
  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      <PageHeader
        eyebrow="Módulo de esporte"
        title="Regras do basquete"
        meta={`Padrão da ${org.name}: novas partidas e campeonatos nascem com estas regras. Cada campeonato ainda pode ajustá-las.`}
      />
      {rules.status === 'loading' && <Skeleton lines={6} />}
      {rules.status === 'error' && <ErrorState message={rules.message} onRetry={reload} />}
      {rules.status === 'ok' && (
        <RulesForm
          data={rules.data}
          readOnly={!isAdmin}
          onSave={(changes) => api.putOrgRules(org.id, changes)}
        />
      )}
    </div>
  );
}
