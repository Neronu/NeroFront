import { Link } from 'react-router';
import type { AthleteChampionshipStats, AthleteSportStats } from '../lib/api/contract';
import { DataTable, type Column } from './ui';

type Row = { kind: 'championship'; c: AthleteChampionshipStats } | { kind: 'total' };

/**
 * Estatísticas de um atleta em um esporte: uma linha por campeonato e o total.
 * As colunas vêm do `statsSchema` do módulo (`columns`), sem nada fixo do basquete.
 */
export function SportStatsTable({ sport }: { sport: AthleteSportStats }) {
  const rows: Row[] = [
    ...sport.byChampionship.map((c) => ({ kind: 'championship' as const, c })),
    ...(sport.byChampionship.length > 1 ? [{ kind: 'total' as const }] : []),
  ];
  const value = (r: Row, key: string) =>
    (r.kind === 'total' ? sport.totals[key] : r.c.totals[key]) ?? 0;

  const columns: Column<Row>[] = [
    {
      key: 'championship',
      header: 'Campeonato',
      lead: true,
      render: (r) =>
        r.kind === 'total' ? (
          <strong>Total</strong>
        ) : (
          <Link to={`/c/${r.c.championship.slug}`}>{r.c.championship.name}</Link>
        ),
    },
    {
      key: 'team',
      header: 'Equipe',
      render: (r) =>
        r.kind === 'total'
          ? ''
          : `${r.c.teamName}${r.c.number != null ? ` · nº ${r.c.number}` : ''}`,
    },
    {
      key: 'games',
      header: 'J',
      title: 'Jogos',
      numeric: true,
      render: (r) => (r.kind === 'total' ? sport.games : r.c.games),
    },
    ...sport.columns.map<Column<Row>>((col) => ({
      key: col.key,
      header: col.short,
      title: col.label,
      label: col.label,
      numeric: true,
      render: (r) => value(r, col.key),
    })),
  ];

  return (
    <DataTable
      caption={`Estatísticas de ${sport.sportName}`}
      mode="scroll"
      rows={rows}
      rowKey={(r) => (r.kind === 'total' ? 'total' : r.c.championship.slug)}
      columns={columns}
    />
  );
}
