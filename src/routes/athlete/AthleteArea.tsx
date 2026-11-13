import { Link, useSearchParams } from 'react-router';
import { SportStatsTable } from '../../components/SportStatsTable';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Group,
  Notice,
  Skeleton,
  TabPanel,
  Tabs,
} from '../../components/ui';
import { api, HttpError } from '../../lib/api/client';
import type {
  AthleteChampionship,
  MeAthleteChampionshipsResponse,
  MeStatsResponse,
} from '../../lib/api/contract';
import { shortDate, sportName } from '../../lib/format';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

const TABS = [
  { key: 'campeonatos', label: 'Campeonatos' },
  { key: 'estatisticas', label: 'Estatísticas' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/** A área do atleta exige e-mail confirmado (403 `email_not_verified`). */
async function guarded<T>(fn: () => Promise<T>): Promise<T | 'unverified'> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError && err.code === 'email_not_verified') return 'unverified';
    throw err;
  }
}

/**
 * Dados de atleta (E10), no Perfil, somente leitura: os campeonatos e as estatísticas de todos os cadastros
 * de atleta ligados à conta pelo e-mail, de qualquer entidade.
 */
export function AthleteArea() {
  const { me } = useSession();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('aba') === 'estatisticas' ? 'estatisticas' : 'campeonatos';
  const links = me?.athletes ?? [];
  const orgs = [...new Set(links.map((a) => a.organization.name))];

  return (
    <section className="ui-stack" aria-labelledby="athlete-area">
      <div className="ui-stack ui-stack--tight">
        <h2 id="athlete-area">Dados de atleta</h2>
        {orgs.length > 0 && <p className="t-small t-muted">Cadastros ligados: {orgs.join(', ')}</p>}
      </div>
      <Group as="div">
        {links.length === 0 ? (
          <EmptyState>
            Nenhum cadastro de atleta ligado à sua conta. Quando uma atlética cadastrar você com o
            e-mail {me?.user.email}, seus campeonatos e estatísticas aparecem aqui.
          </EmptyState>
        ) : (
          <div className="ui-stack">
            <Tabs
              label="Seções da área do atleta"
              idPrefix="atl"
              items={TABS}
              value={tab}
              onChange={(t) => setParams({ aba: t }, { replace: true })}
            />
            <TabPanel tabKey={tab} idPrefix="atl">
              {tab === 'campeonatos' ? <Championships /> : <Stats />}
            </TabPanel>
          </div>
        )}
      </Group>
    </section>
  );
}

function Unverified() {
  return (
    <Notice>
      Confirme seu e-mail para ver seus campeonatos.{' '}
      <Link to="/verificar-email">Confirmar e-mail</Link>
    </Notice>
  );
}

function Championships() {
  const [data, reload] = useAsync(
    () => guarded<MeAthleteChampionshipsResponse>(api.meAthleteChampionships),
    'me-athlete-championships',
  );
  if (data.status === 'loading') return <Skeleton lines={4} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  if (data.data === 'unverified') return <Unverified />;
  const { current, future, past } = data.data;
  if (current.length + future.length + past.length === 0)
    return <EmptyState>Você ainda não está no elenco de nenhum campeonato.</EmptyState>;

  return (
    <div className="ui-stack ui-stack--section">
      <ChampionshipGroup id="atl-current" title="Em andamento" items={current} />
      <ChampionshipGroup id="atl-future" title="Próximos" items={future} />
      <ChampionshipGroup id="atl-past" title="Encerrados" items={past} />
    </div>
  );
}

function ChampionshipGroup({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: AthleteChampionship[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="ui-stack" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      <ul className="ui-list" aria-labelledby={id}>
        {items.map((a) => (
          <li key={`${a.championship.id}-${a.athleteId}`}>
            <span className="ui-list__main">
              <Link className="ui-list__title" to={`/campeonatos/${a.championship.id}`}>
                {a.championship.name}
              </Link>
              <span className="ui-list__meta">
                {sportName(a.championship.sportKey)} · {a.team.name} · nº {a.number} ·{' '}
                {a.organization.name}
              </span>
              {a.championship.startsAt && a.championship.status === 'registration' && (
                <span className="ui-list__meta">
                  Começa em {shortDate(a.championship.startsAt)}
                </span>
              )}
            </span>
            {a.registrationStatus === 'pending' && <Badge>Inscrição em análise</Badge>}
            {a.registrationStatus === 'rejected' && <Badge tone="closed">Inscrição recusada</Badge>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stats() {
  const [data, reload] = useAsync(
    () => guarded<MeStatsResponse>(api.meAthleteStats),
    'me-athlete-stats',
  );
  if (data.status === 'loading') return <Skeleton lines={4} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  if (data.data === 'unverified') return <Unverified />;
  const { sports } = data.data;
  if (sports.length === 0)
    return (
      <EmptyState
        action={
          <Button to="/perfil?aba=campeonatos" variant="secondary">
            Ver campeonatos
          </Button>
        }
      >
        Ainda sem jogos de campeonato registrados.
      </EmptyState>
    );
  return (
    <div className="ui-stack ui-stack--section">
      {sports.map((s) => (
        <section className="ui-stack" key={s.sportKey} aria-labelledby={`atl-sport-${s.sportKey}`}>
          <h3 id={`atl-sport-${s.sportKey}`}>{s.sportName}</h3>
          <SportStatsTable sport={s} />
        </section>
      ))}
    </div>
  );
}
