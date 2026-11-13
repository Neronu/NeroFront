import { useState } from 'react';
import { MatchList } from '../../components/MatchList';
import { Button, EmptyState, ErrorState, Notice, PageHeader, Skeleton } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { Match } from '../../lib/api/contract';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/**
 * Partidas (menu da atlética): todas as partidas avulsas, criadas fora de campeonatos. Cria
 * partida e exclui (menos ao vivo). As de campeonato ficam na tabela do campeonato.
 */
export function Matches() {
  const { org } = useOrg();
  const [matches, reload] = useAsync(() => api.matches(org.id), `all-${org.id}`);
  const [error, setError] = useState('');

  const remove = async (m: Match) => {
    const name = `${m.homeTeam.name} × ${m.awayTeam.name}`;
    if (!confirm(`Excluir a partida ${name}? A súmula e o PDF dela serão apagados.`)) return;
    setError('');
    try {
      await api.deleteMatch(m.id);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader
        title="Partidas"
        meta="Amistosos e treinos, fora de campeonatos."
        action={
          <Button to="/partidas/nova" variant="primary">
            Nova partida
          </Button>
        }
      />
      {error && (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      )}
      {matches.status === 'loading' && <Skeleton />}
      {matches.status === 'error' && <ErrorState message={matches.message} onRetry={reload} />}
      {matches.status === 'ok' &&
        (matches.data.length === 0 ? (
          <EmptyState>
            Nenhuma partida avulsa. Crie uma para anotar um amistoso ou treino.
          </EmptyState>
        ) : (
          <MatchList items={matches.data} label="Partidas avulsas" onDelete={remove} />
        ))}
    </div>
  );
}
