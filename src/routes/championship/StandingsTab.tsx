import type { BracketResponse, StandingRow, StandingsResponse } from '../../lib/api/contract';
import {
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  Skeleton,
  type Column,
} from '../../components/ui';
import { api } from '../../lib/api/client';
import { signed, winPct } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

const COLUMNS: Column<StandingRow>[] = [
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
  { key: 'points', header: 'P', title: 'Pontos', numeric: true, render: (r) => r.points },
  { key: 'played', header: 'J', title: 'Jogos', numeric: true, render: (r) => r.played },
  { key: 'won', header: 'V', title: 'Vitórias', numeric: true, render: (r) => r.won },
  { key: 'lost', header: 'D', title: 'Derrotas', numeric: true, render: (r) => r.lost },
  {
    key: 'pct',
    header: '% Vit.',
    title: 'Aproveitamento',
    numeric: true,
    render: (r) => winPct(r.won, r.played),
  },
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

/** Última equipe que avança: a divisória em border entra depois dela. */
export function qualifiesCut(rows: StandingRow[]): number {
  let last = -1;
  rows.forEach((r, i) => {
    if (r.qualifies) last = i;
  });
  // Sem divisória quando ninguém avança ou quando todos avançam.
  return last === rows.length - 1 ? -1 : last;
}

async function load(id: string): Promise<[StandingsResponse, BracketResponse]> {
  return Promise.all([api.standings(id), api.bracket(id)]);
}

/**
 * Aba Classificação: tabela única, densa e sem destaques. Nenhuma linha tem fundo, selo ou ícone;
 * a zona de classificação é só uma divisória em border, explicada em texto.
 */
export function StandingsTab({ id }: { id: string }) {
  const [data, reload] = useAsync(() => load(id), id);
  if (data.status === 'loading') return <Skeleton lines={6} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  const [standings, bracket] = data.data;
  const groups = standings.phases.flatMap((p) => p.groups.map((g) => ({ phase: p.name, ...g })));
  const bracketPhases = bracket.phases.filter((p) => p.rounds.length > 0);

  if (groups.length === 0 && bracketPhases.length === 0) {
    return <EmptyState>A classificação aparece quando a tabela for montada.</EmptyState>;
  }
  const anyCut = groups.some((g) => qualifiesCut(g.rows) >= 0);

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
                  columns={COLUMNS}
                  dividerAfter={(_, i) => i === cut}
                />
              </section>
            );
          })}
          {anyCut && (
            <p className="t-small t-muted">
              Acima da linha: equipes que avançam para a fase seguinte.
            </p>
          )}
          <p className="t-small t-muted">
            P: pontos · J: jogos · V: vitórias · D: derrotas · % Vit.: aproveitamento · PF: pontos
            feitos · PC: pontos sofridos · Saldo: PF menos PC. Desempate: confronto direto entre os
            empatados, depois saldo e pontos feitos.
          </p>
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
                      {(['home', 'away'] as const).map((side) => {
                        const team = s[side];
                        const decided = s.winnerRegistrationId !== null;
                        const won = decided && team.registrationId === s.winnerRegistrationId;
                        const score = s.match
                          ? side === 'home'
                            ? s.match.homeScore
                            : s.match.awayScore
                          : null;
                        const cls = !team.registrationId
                          ? 'is-tbd'
                          : decided
                            ? won
                              ? 'is-winner'
                              : 'is-loser'
                            : '';
                        return (
                          <div key={side} className={`ch-bracket__team ${cls}`}>
                            <span className="ch-bracket__name">{team.label}</span>
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
