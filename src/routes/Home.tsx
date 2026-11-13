import { Button, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { ChampionshipList } from '../components/ChampionshipList';
import { MatchList } from '../components/MatchList';
import { ChampionshipCodeSearch } from '../components/ChampionshipCodeSearch';
import { TeamInvitesPanel } from '../components/TeamInvitesPanel';
import { api } from '../lib/api/client';
import { useSession } from '../lib/session';
import { useAsync } from '../lib/useAsync';

/**
 * Home logada, numa coluna central: código do campeonato no topo, logo abaixo o que está em
 * andamento agora, depois convites de equipe pendentes e, para a atlética, as próximas partidas
 * avulsas. As listas completas ficam em Campeonatos e Partidas.
 */
export function Home() {
  const { org } = useSession();
  const [mine, reloadMine] = useAsync(() => api.myChampionships(), 'mine');
  const now = mine.status === 'ok' ? mine.data.filter((c) => c.live || c.status === 'running') : [];

  return (
    <div className="home-dash ui-stack ui-stack--section">
      <h1 className="sr-only">Início</h1>
      <ChampionshipCodeSearch label="Buscar campeonato pelo código" hideLabel />

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
              {org
                ? 'Nenhum campeonato em andamento. Crie um em Campeonatos ou entre em um pelo código.'
                : 'Nenhum campeonato em andamento. Quando sua equipe for inscrita, ele aparece aqui.'}
            </EmptyState>
          ) : (
            <ChampionshipList items={now} label="Campeonatos em andamento" />
          ))}
      </section>

      <TeamInvitesPanel />
      {org && <SingleMatches orgId={org.id} />}
    </div>
  );
}

/** Próximas partidas avulsas da atlética; a lista completa (e criar/excluir) fica em Partidas. */
function SingleMatches({ orgId }: { orgId: string }) {
  const [matches, reloadMatches] = useAsync(() => api.matches(orgId, 3), `next-${orgId}`);
  return (
    <section className="ui-stack" aria-labelledby="home-matches">
      <div className="ui-section-head">
        <h2 id="home-matches">Partidas avulsas</h2>
        <Button to="/partidas" variant="quiet">
          Ver todas as partidas
        </Button>
      </div>
      {matches.status === 'loading' && <Skeleton />}
      {matches.status === 'error' && (
        <ErrorState message={matches.message} onRetry={reloadMatches} />
      )}
      {matches.status === 'ok' &&
        (matches.data.length === 0 ? (
          <EmptyState>Nenhuma partida avulsa marcada.</EmptyState>
        ) : (
          <MatchList items={matches.data} label="Próximas partidas avulsas" />
        ))}
    </section>
  );
}
