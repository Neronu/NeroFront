import { Link, useParams } from 'react-router';
import { SportStatsTable } from '../../components/SportStatsTable';
import { Button, Group, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { api, HttpError } from '../../lib/api/client';
import type { PublicAthlete } from '../../lib/api/contract';
import { useAsync } from '../../lib/useAsync';

/** 404 cobre perfil oculto, entidade sem autorização e id inexistente, sem distinguir. */
async function load(id: string): Promise<PublicAthlete | null> {
  try {
    return await api.publicAthlete(id);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return null;
    throw err;
  }
}

/** Página pública do atleta (E9): só nome, equipe, número e estatísticas. */
export function PublicAthletePage() {
  const { id = '' } = useParams();
  const [data, reload] = useAsync(() => load(id), id);

  if (data.status === 'loading') return <Skeleton lines={6} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  const athlete = data.data;

  if (!athlete) {
    return (
      <div className="ui-stack">
        <PageHeader title="Perfil indisponível" />
        <EmptyState
          action={
            <Button to="/" variant="secondary">
              Voltar ao início
            </Button>
          }
        >
          Este atleta não tem página pública.
        </EmptyState>
      </div>
    );
  }

  const { current } = athlete;
  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader eyebrow="Atleta" title={athlete.name} meta={athlete.organization.name} />

      {current && (
        <Group aria-labelledby="atleta-atual" className="ui-stack">
          <span id="atleta-atual" className="t-label">
            Campeonato atual
          </span>
          <Link to={`/c/${current.championship.slug}`}>{current.championship.name}</Link>
          <span className="t-small t-muted">
            {current.teamName}
            {current.number != null && ` · nº ${current.number}`} ·{' '}
            <span className="t-stat">{current.games}</span> {current.games === 1 ? 'jogo' : 'jogos'}
          </span>
        </Group>
      )}

      {athlete.sports.length === 0 ? (
        <EmptyState>Ainda sem jogos de campeonato registrados.</EmptyState>
      ) : (
        athlete.sports.map((sport) => (
          <section
            className="ui-stack"
            key={sport.sportKey}
            aria-labelledby={`esp-${sport.sportKey}`}
          >
            <h2 id={`esp-${sport.sportKey}`}>{sport.sportName}</h2>
            <SportStatsTable sport={sport} />
          </section>
        ))
      )}
    </div>
  );
}
