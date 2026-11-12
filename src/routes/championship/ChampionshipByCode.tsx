import { Navigate, useParams } from 'react-router';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { api, HttpError } from '../../lib/api/client';
import type { Championship } from '../../lib/api/contract';
import { useAsync } from '../../lib/useAsync';

async function load(code: string): Promise<Championship | null> {
  try {
    return await api.championshipByCode(code);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return null;
    throw err;
  }
}

/**
 * `/c/:code`: link curto e compartilhável pelo código (slug). Resolve o id e vai para a página do
 * campeonato. Também usado onde só o slug é conhecido (estatísticas do atleta).
 */
export function ChampionshipByCode() {
  const { code = '' } = useParams();
  const [data, reload] = useAsync(() => load(code), code);

  if (data.status === 'loading') return <Skeleton lines={4} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  if (data.data) return <Navigate to={`/campeonatos/${data.data.id}`} replace />;
  return (
    <div className="ui-stack">
      <PageHeader title="Campeonato não encontrado" />
      <EmptyState
        action={
          <Button to="/" variant="secondary">
            Buscar outro código
          </Button>
        }
      >
        Nenhum campeonato com este código.
      </EmptyState>
    </div>
  );
}
