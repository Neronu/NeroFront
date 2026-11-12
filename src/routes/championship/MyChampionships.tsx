import { ChampionshipCards } from '../../components/ChampionshipCards';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { api } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/**
 * Campeonatos (menu): todos os do usuário — os das atléticas dele e os em que joga ou tem
 * equipe inscrita. Admin de atlética cria campeonatos aqui.
 */
export function MyChampionships() {
  const { org, role } = useSession();
  const canCreate = !!org && role === 'admin';
  const [mine, reload] = useAsync(() => api.myChampionships(), 'mine');

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader
        title="Campeonatos"
        action={
          canCreate ? (
            <Button to="/campeonatos/novo" variant="primary">
              Novo campeonato
            </Button>
          ) : undefined
        }
      />
      {mine.status === 'loading' && <Skeleton />}
      {mine.status === 'error' && <ErrorState message={mine.message} onRetry={reload} />}
      {mine.status === 'ok' &&
        (mine.data.length === 0 ? (
          <EmptyState>
            {canCreate
              ? 'Nenhum campeonato ainda. Crie o primeiro ou entre em um pelo código.'
              : 'Nenhum campeonato ainda. Quando sua equipe for inscrita, ele aparece aqui.'}
          </EmptyState>
        ) : (
          <ChampionshipCards items={mine.data} label="Meus campeonatos" />
        ))}
    </div>
  );
}
