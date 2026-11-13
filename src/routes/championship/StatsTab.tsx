import { Link } from 'react-router';
import type {
  ChampionshipHighlights,
  LeaderboardRow,
  LeaderboardsResponse,
} from '../../lib/api/contract';
import { DataTable, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { api } from '../../lib/api/client';
import { useAsync } from '../../lib/useAsync';

async function load(id: string): Promise<[LeaderboardsResponse, ChampionshipHighlights]> {
  return Promise.all([api.leaderboards(id), api.highlights(id)]);
}

/** Nome do atleta com link para a página pública; oculto ("Atleta nº 12") fica sem link. */
export function AthleteName({ row }: { row: Pick<LeaderboardRow, 'athleteId' | 'name'> }) {
  return row.athleteId ? <Link to={`/atletas/${row.athleteId}`}>{row.name}</Link> : row.name;
}

/**
 * Aba Estatísticas: conteúdo em 8 colunas e lateral em 4 a partir de bp-lg.
 * A lateral é o único lugar com destaque (court, o azul do sistema): cestinha e campeão.
 */
export function StatsTab({ id }: { id: string }) {
  const [data, reload] = useAsync(() => load(id), id);
  if (data.status === 'loading') return <Skeleton lines={6} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  const [{ boards }, { champion, topScorer: top }] = data.data;
  const hasHighlights = !!top || !!champion;

  return (
    <div className="lyt-grid ch-stats">
      {hasHighlights && (
        <aside className="lyt-span-4 ch-stats__aside ui-stack" aria-label="Destaques">
          {champion && (
            <div className="ch-merit on-court">
              <span className="t-label">Campeão</span>
              <span className="ch-merit__name">{champion.teamName}</span>
            </div>
          )}
          {top && (
            <div className="ch-merit on-court">
              <span className="t-label">Cestinha</span>
              <span className="ch-merit__name">
                <AthleteName row={top} />
              </span>
              <span className="ch-merit__meta">
                {top.teamName} · <span className="t-stat">{top.value}</span> pontos em{' '}
                <span className="t-stat">{top.games}</span> jogos
              </span>
            </div>
          )}
        </aside>
      )}
      <div
        className={`${hasHighlights ? 'lyt-span-8' : ''} ch-stats__main ui-stack ui-stack--section`}
      >
        {boards.map((b) => (
          <section className="ui-stack" key={b.key} aria-labelledby={`board-${b.key}`}>
            <h3 id={`board-${b.key}`}>{b.label}</h3>
            {b.rows.length === 0 ? (
              <EmptyState>
                Nenhum jogo encerrado ainda. As estatísticas aparecem quando a primeira súmula for
                fechada.
              </EmptyState>
            ) : (
              <DataTable
                caption={b.label}
                mode="scroll"
                rows={b.rows}
                // Atleta oculto (sem autorização para publicar) vem com athleteId null e
                // nome "Atleta nº 12": o número é único no elenco da inscrição.
                rowKey={(r) => r.athleteId ?? `${r.registrationId}-${r.name}`}
                columns={[
                  {
                    key: 'pos',
                    header: '#',
                    title: 'Posição',
                    numeric: true,
                    render: (r) => r.position,
                  },
                  {
                    key: 'name',
                    header: 'Atleta',
                    lead: true,
                    render: (r) => <AthleteName row={r} />,
                  },
                  { key: 'team', header: 'Equipe', render: (r) => r.teamName },
                  {
                    key: 'games',
                    header: 'J',
                    title: 'Jogos',
                    numeric: true,
                    render: (r) => r.games,
                  },
                  { key: 'value', header: 'Total', numeric: true, render: (r) => r.value },
                ]}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
