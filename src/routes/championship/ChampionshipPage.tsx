import type { ChampionshipDetail } from '../../lib/api/contract';
import { useParams, useSearchParams } from 'react-router';
import {
  Badge,
  Button,
  ErrorState,
  MetaGrid,
  PageHeader,
  Skeleton,
  TabPanel,
  Tabs,
} from '../../components/ui';
import { api } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { championshipCode, sportName } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { ResultsTab } from './ResultsTab';
import { StandingsTab } from './StandingsTab';
import { StatsTab } from './StatsTab';
import { TeamsTab } from './TeamsTab';

const TABS = [
  { key: 'resultados', label: 'Resultados' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'estatisticas', label: 'Estatísticas' },
  { key: 'equipes', label: 'Equipes' },
] as const;
export type Tab = (typeof TABS)[number]['key'];

/** Valores de `?aba=` anteriores à identidade visual, para não quebrar links salvos. */
const LEGACY_TAB: Record<string, Tab> = {
  jogos: 'resultados',
  chave: 'classificacao',
  rankings: 'estatisticas',
  inscricoes: 'equipes',
};

export function resolveTab(param: string | null, status: ChampionshipDetail['status']): Tab {
  if (param && TABS.some((t) => t.key === param)) return param as Tab;
  if (param && LEGACY_TAB[param]) return LEGACY_TAB[param];
  // Com inscrições abertas ainda não há jogos: abre nas equipes.
  return status === 'registration' ? 'equipes' : 'resultados';
}

export const CHAMPIONSHIP_STATUS: Record<
  ChampionshipDetail['status'],
  { label: string; tone: 'neutral' | 'closed' }
> = {
  registration: { label: 'Inscrições abertas', tone: 'neutral' },
  running: { label: 'Em andamento', tone: 'neutral' },
  finished: { label: 'Encerrado', tone: 'closed' },
};

export function ChampionshipPage() {
  const { id = '' } = useParams();
  const [detail, reload] = useAsync(() => api.championship(id), id);
  const [params, setParams] = useSearchParams();

  if (detail.status === 'loading') return <Skeleton lines={6} />;
  if (detail.status === 'error') return <ErrorState message={detail.message} onRetry={reload} />;
  const ch = detail.data;
  const tab = resolveTab(params.get('aba'), ch.status);
  const status = CHAMPIONSHIP_STATUS[ch.status];

  const meta = (
    <MetaGrid
      items={[
        { label: 'Organização', value: ch.organizer.name },
        { label: 'Código', value: championshipCode(ch.slug) },
        !!ch.startsAt && { label: 'Início', value: formatDateTime(ch.startsAt) },
        !!ch.rosterLockAt && {
          label: 'Elencos',
          value: ch.rosterLocked ? 'Travados' : `Travam em ${formatDateTime(ch.rosterLockAt)}`,
        },
      ]}
    />
  );

  return (
    <div className="ui-stack ui-stack--section">
      {/* Cabeçalho só em texto sobre bg, igual em todas as abas. Sem bloco de cor. */}
      <PageHeader
        eyebrow={sportName(ch.sportKey)}
        title={ch.name}
        meta={meta}
        action={
          <div className="ch-head-actions">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Button to={`/campeonatos/${id}/regras`} variant="quiet">
              {ch.canManage ? 'Regras do campeonato' : 'Ver regras'}
            </Button>
          </div>
        }
      />

      <div className="ui-stack">
        <Tabs
          label="Seções do campeonato"
          idPrefix="ch"
          items={TABS}
          value={tab}
          onChange={(t) => setParams({ aba: t }, { replace: true })}
        />
        <TabPanel tabKey={tab} idPrefix="ch">
          {tab === 'resultados' && <ResultsTab ch={ch} onChange={reload} />}
          {tab === 'classificacao' && <StandingsTab id={id} sportKey={ch.sportKey} />}
          {tab === 'estatisticas' && <StatsTab id={id} />}
          {tab === 'equipes' && <TeamsTab ch={ch} onChange={reload} />}
        </TabPanel>
      </div>
    </div>
  );
}
