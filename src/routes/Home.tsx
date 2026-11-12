import type { Match } from '../lib/api/contract';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LiveBadge,
  Skeleton,
} from '../components/ui';
import { ChampionshipCards } from '../components/ChampionshipCards';
import { ChampionshipCodeSearch } from '../components/ChampionshipCodeSearch';
import { TeamInvitesPanel } from '../components/TeamInvitesPanel';
import { api } from '../lib/api/client';
import { useSession } from '../lib/session';
import { useAsync } from '../lib/useAsync';

const STATUS: Record<Match['status'], ReactNode> = {
  scheduled: <Badge>Preparação</Badge>,
  in_progress: <LiveBadge />,
  closed: <Badge tone="closed">Súmula fechada</Badge>,
};

export function matchLink(m: Pick<Match, 'id' | 'status'>): string {
  if (m.status === 'scheduled') return `/partidas/${m.id}/preparar`;
  if (m.status === 'closed') return `/partidas/${m.id}/conferencia`;
  return `/partidas/${m.id}/mesa`;
}

/**
 * Home logada: código do campeonato no topo, convites de equipe pendentes, o que está em
 * andamento agora e, para a atlética, as partidas avulsas. A lista completa fica em Campeonatos.
 */
export function Home() {
  const { org, role } = useSession();
  const isAdmin = role === 'admin';
  const [mine, reloadMine] = useAsync(() => api.myChampionships(), 'mine');
  const now = mine.status === 'ok' ? mine.data.filter((c) => c.live || c.status === 'running') : [];

  return (
    <div className="ui-stack ui-stack--section">
      <h1 className="sr-only">Início</h1>
      <ChampionshipCodeSearch label="Buscar campeonato pelo código" hideLabel />
      <TeamInvitesPanel />

      <section className="ui-stack" aria-labelledby="home-champs">
        <div className="ui-section-head">
          <h2 id="home-champs">Em andamento</h2>
          <Button to="/campeonatos" variant="quiet">
            Ver todos os campeonatos
          </Button>
        </div>
        {mine.status === 'loading' && <Skeleton />}
        {mine.status === 'error' && <ErrorState message={mine.message} onRetry={reloadMine} />}
        {mine.status === 'ok' &&
          (now.length === 0 ? (
            <EmptyState>
              {org && isAdmin
                ? 'Nenhum campeonato em andamento. Crie um em Campeonatos ou entre em um pelo código.'
                : 'Nenhum campeonato em andamento. Quando sua equipe for inscrita, ele aparece aqui.'}
            </EmptyState>
          ) : (
            <ChampionshipCards items={now} label="Campeonatos em andamento" />
          ))}
      </section>

      {org && <SingleMatches orgId={org.id} isAdmin={isAdmin} />}
    </div>
  );
}

/** Partidas avulsas da atlética (amistosos e treinos). */
function SingleMatches({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const [matches, reloadMatches] = useAsync(() => api.matches(orgId), orgId);
  return (
    <>
      <section className="ui-stack" aria-labelledby="home-matches">
        <div className="ui-section-head">
          <h2 id="home-matches">Partidas avulsas</h2>
          {isAdmin && (
            <Button to="/partidas/nova" variant="secondary">
              Nova partida
            </Button>
          )}
        </div>
        {matches.status === 'loading' && <Skeleton />}
        {matches.status === 'error' && (
          <ErrorState message={matches.message} onRetry={reloadMatches} />
        )}
        {matches.status === 'ok' &&
          (matches.data.length === 0 ? (
            <EmptyState>
              Nenhuma partida avulsa. Crie uma para anotar um amistoso ou treino.
            </EmptyState>
          ) : (
            <DataTable
              caption="Partidas avulsas"
              rows={matches.data}
              rowKey={(m) => m.id}
              columns={[
                {
                  key: 'teams',
                  header: 'Partida',
                  lead: true,
                  render: (m) => (
                    <Link to={matchLink(m)}>
                      {m.homeTeam.name} × {m.awayTeam.name}
                    </Link>
                  ),
                },
                { key: 'status', header: 'Situação', render: (m) => STATUS[m.status] },
              ]}
            />
          ))}
      </section>
    </>
  );
}
