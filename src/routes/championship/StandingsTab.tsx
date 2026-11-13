import type {
  BracketResponse,
  BracketSide,
  StandingRow,
  StandingsResponse,
} from '../../lib/api/contract';
import {
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  LiveBadge,
  Skeleton,
  type Column,
} from '../../components/ui';
import { api } from '../../lib/api/client';
import { signed } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { usePolling } from '../../lib/usePolling';

const LEAD: Column<StandingRow>[] = [
  {
    key: 'pos',
    header: '#',
    title: 'Posição',
    numeric: true,
    lead: true,
    className: 'ch-col-pos',
    render: (r) => r.position,
  },
  {
    key: 'team',
    header: 'Equipe',
    lead: true,
    className: 'ch-col-team',
    render: (r) => r.teamName,
  },
];

const avg = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Basquete 5x5: pontos de classificação e saldo. */
const COLUMNS: Column<StandingRow>[] = [
  ...LEAD,
  { key: 'points', header: 'P', title: 'Pontos', numeric: true, render: (r) => r.points },
  { key: 'played', header: 'J', title: 'Jogos', numeric: true, render: (r) => r.played },
  { key: 'won', header: 'V', title: 'Vitórias', numeric: true, render: (r) => r.won },
  { key: 'lost', header: 'D', title: 'Derrotas', numeric: true, render: (r) => r.lost },
  { key: 'pf', header: 'PF', title: 'Pontos feitos', numeric: true, render: (r) => r.pointsFor },
  {
    key: 'pc',
    header: 'PC',
    title: 'Pontos sofridos',
    numeric: true,
    render: (r) => r.pointsAgainst,
  },
  { key: 'diff', header: 'Saldo', numeric: true, render: (r) => signed(r.diff) },
];

/** Basquete 3x3 (critério FIBA 3x3): vitórias e média de pontos marcados; sem saldo. */
const COLUMNS_3X3: Column<StandingRow>[] = [
  ...LEAD,
  { key: 'played', header: 'J', title: 'Jogos', numeric: true, render: (r) => r.played },
  { key: 'won', header: 'V', title: 'Vitórias', numeric: true, render: (r) => r.won },
  { key: 'lost', header: 'D', title: 'Derrotas', numeric: true, render: (r) => r.lost },
  { key: 'pf', header: 'PF', title: 'Pontos feitos', numeric: true, render: (r) => r.pointsFor },
  {
    key: 'avg',
    header: 'Méd',
    title: 'Média de pontos marcados (critério de desempate)',
    numeric: true,
    render: (r) => (r.played ? avg.format(r.pointsFor / r.played) : '—'),
  },
];

export function standingColumns(sportKey: string): Column<StandingRow>[] {
  return sportKey === 'basketball_3x3' ? COLUMNS_3X3 : COLUMNS;
}

/** Última equipe que avança: a divisória em border entra depois dela. */
export function qualifiesCut(rows: StandingRow[]): number {
  let last = -1;
  rows.forEach((r, i) => {
    if (r.qualifies) last = i;
  });
  // Sem divisória quando ninguém avança ou quando todos avançam.
  return last === rows.length - 1 ? -1 : last;
}

type GroupView = { name: string; rows: StandingRow[] };

/**
 * Vaga do mata-mata ainda indefinida ("1º do Grupo A"): mostra quem ocupa a posição agora.
 * Depende do rótulo do backend; se ele não casar, a vaga fica só com o texto original.
 */
export function projectSide(
  side: BracketSide,
  groups: GroupView[],
): { name: string; source?: string } {
  const m = side.registrationId ? null : /^(\d+)º do (.+)$/.exec(side.label);
  if (!m) return { name: side.label };
  const row = groups.find((g) => g.name === m[2])?.rows.find((r) => r.position === Number(m[1]));
  return row ? { name: row.teamName, source: side.label } : { name: side.label };
}

/** Intervalo da atualização automática da tabela e da chave. */
const REFRESH_MS = 15_000;

async function load(id: string): Promise<[StandingsResponse, BracketResponse]> {
  return Promise.all([api.standings(id), api.bracket(id)]);
}

/**
 * Aba Classificação: tabela densa e sem destaques, depois a chave do mata-mata (se houver), as
 * duas atualizadas sozinhas enquanto o campeonato está em andamento. A zona de classificação é
 * só uma divisória em border; as siglas se explicam pelo title.
 */
export function StandingsTab({ id, sportKey = 'basketball' }: { id: string; sportKey?: string }) {
  const [data, reload] = useAsync(() => load(id), id);
  const live =
    data.status === 'ok' &&
    data.data[1].champion === null &&
    data.data[1].phases.some((p) => p.rounds.length > 0);
  usePolling(reload, REFRESH_MS, live);
  if (data.status === 'loading') return <Skeleton lines={6} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  const [standings, bracket] = data.data;
  const groups = standings.phases.flatMap((p) => p.groups.map((g) => ({ phase: p.name, ...g })));
  const bracketPhases = bracket.phases.filter((p) => p.rounds.length > 0);

  if (groups.length === 0 && bracketPhases.length === 0) {
    return <EmptyState>A classificação aparece quando a tabela for montada.</EmptyState>;
  }

  return (
    <div className="ui-stack ui-stack--section">
      {groups.length > 0 && (
        <div className="ui-stack">
          {groups.map((g) => {
            const cut = qualifiesCut(g.rows);
            return (
              <section className="ui-stack" key={g.id} aria-labelledby={`grp-${g.id}`}>
                {groups.length > 1 && (
                  <div className="ui-section-head">
                    <h3 id={`grp-${g.id}`}>{g.name}</h3>
                    {g.complete && <Badge tone="closed">Encerrado</Badge>}
                  </div>
                )}
                <DataTable
                  caption={groups.length > 1 ? `Classificação · ${g.name}` : 'Classificação'}
                  mode="scroll"
                  className="ch-standings"
                  rows={g.rows}
                  rowKey={(r) => r.registrationId}
                  columns={standingColumns(sportKey)}
                  dividerAfter={(_, i) => i === cut}
                />
              </section>
            );
          })}
        </div>
      )}

      {bracketPhases.map((p) => (
        <section className="ui-stack" key={p.id} aria-labelledby={`br-${p.id}`}>
          <h3 id={`br-${p.id}`}>{p.name}</h3>
          <div className="ch-bracket">
            {p.rounds.map((r) => (
              <div className="ch-bracket__round" key={r.round}>
                <h4 className="t-label t-muted">{r.name}</h4>
                <div className="ch-bracket__slots">
                  {r.slots.map((s) => (
                    <div className="ch-bracket__slot" key={s.id}>
                      {s.match?.status === 'in_progress' && (
                        <div className="ch-bracket__live">
                          <LiveBadge />
                        </div>
                      )}
                      {(['home', 'away'] as const).map((side) => {
                        const team = s[side];
                        const decided = s.winnerRegistrationId !== null;
                        const won = decided && team.registrationId === s.winnerRegistrationId;
                        const score = s.match
                          ? side === 'home'
                            ? s.match.homeScore
                            : s.match.awayScore
                          : null;
                        const shown = projectSide(team, groups);
                        const cls = !team.registrationId
                          ? 'is-tbd'
                          : decided
                            ? won
                              ? 'is-winner'
                              : 'is-loser'
                            : '';
                        return (
                          <div key={side} className={`ch-bracket__team ${cls}`}>
                            <span className="ch-bracket__name">
                              {shown.name}
                              {shown.source && (
                                <span className="ch-bracket__source">{shown.source}</span>
                              )}
                            </span>
                            <span className="ch-bracket__score">{score ?? ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
