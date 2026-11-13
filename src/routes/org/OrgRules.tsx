import { useState } from 'react';
import { RulesForm } from '../../components/RulesForm';
import { ErrorState, PageHeader, Skeleton, TabPanel, Tabs } from '../../components/ui';
import { api } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { DEFAULT_SPORT, SPORTS } from '../../lib/sports';
import { useAsync } from '../../lib/useAsync';

/** Regras padrão da entidade, uma aba por esporte. */
export function OrgRules() {
  const { org } = useOrg();
  const [sportKey, setSportKey] = useState(DEFAULT_SPORT.key);
  const [rules, reload] = useAsync(() => api.orgRules(org.id, sportKey), `${org.id}:${sportKey}`);
  const sport = SPORTS.find((s) => s.key === sportKey) ?? DEFAULT_SPORT;
  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      <PageHeader
        eyebrow="Módulo de esporte"
        title={`Regras do ${sport.name.toLowerCase()}`}
        meta={`Padrão da ${org.name}: novas partidas e campeonatos nascem com estas regras. Cada campeonato ainda pode ajustá-las.`}
      />
      {SPORTS.length > 1 && (
        <Tabs
          label="Esportes"
          idPrefix="rules"
          items={SPORTS.map((s) => ({ key: s.key, label: s.name }))}
          value={sportKey}
          onChange={setSportKey}
        />
      )}
      <TabPanel tabKey={sportKey} idPrefix="rules">
        {rules.status === 'loading' && <Skeleton lines={6} />}
        {rules.status === 'error' && <ErrorState message={rules.message} onRetry={reload} />}
        {rules.status === 'ok' && (
          <RulesForm
            key={sportKey}
            data={rules.data}
            onSave={(changes) => api.putOrgRules(org.id, changes, sportKey)}
          />
        )}
      </TabPanel>
    </div>
  );
}
