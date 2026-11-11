import { api } from '../../lib/api/client';
import { useAsync } from '../../lib/useAsync';

export function StandingsTab({ id }: { id: string }) {
  const [data] = useAsync(() => api.standings(id), id);
  if (data.status === 'loading') return <p className="muted">Carregando…</p>;
  if (data.status === 'error') return <p className="status-error">{data.message}</p>;
  if (!data.data.phases.length) return <p className="muted card">Sem fase de grupos.</p>;
  return (
    <div className="stack">
      {data.data.phases.flatMap((p) =>
        p.groups.map((g) => (
          <section className="card" key={g.id}>
            <h2>
              {g.name}
              {g.complete && <span className="muted small"> · encerrado</span>}
            </h2>
            <table className="grid">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Equipe</th>
                  <th title="Pontos">P</th>
                  <th title="Jogos">J</th>
                  <th title="Vitórias">V</th>
                  <th title="Derrotas">D</th>
                  <th title="Pontos marcados">PM</th>
                  <th title="Pontos sofridos">PS</th>
                  <th title="Saldo">S</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.registrationId} className={r.qualifies ? 'qualifies' : ''}>
                    <td>{r.position}</td>
                    <td className="left">{r.teamName}</td>
                    <td>
                      <strong>{r.points}</strong>
                    </td>
                    <td>{r.played}</td>
                    <td>{r.won}</td>
                    <td>{r.lost}</td>
                    <td>{r.pointsFor}</td>
                    <td>{r.pointsAgainst}</td>
                    <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )),
      )}
      <p className="muted small">
        Desempate: confronto direto entre os empatados, depois saldo e pontos marcados.
      </p>
    </div>
  );
}

export function BracketTab({ id }: { id: string }) {
  const [data] = useAsync(() => api.bracket(id), id);
  if (data.status === 'loading') return <p className="muted">Carregando…</p>;
  if (data.status === 'error') return <p className="status-error">{data.message}</p>;
  const { phases, champion } = data.data;
  return (
    <div className="stack">
      {champion && (
        <section className="card champion">
          🏆 Campeão: <strong>{champion.teamName}</strong>
        </section>
      )}
      {phases.length === 0 && <p className="muted card">Sem mata-mata.</p>}
      {phases.map((p) => (
        <section className="card bracket" key={p.id}>
          {p.rounds.map((r) => (
            <div className="bracket-round" key={r.round}>
              <h2>{r.name}</h2>
              {r.slots.map((s) => (
                <div className="bracket-slot" key={s.id}>
                  {(['home', 'away'] as const).map((side) => {
                    const team = s[side];
                    const won =
                      !!team.registrationId && team.registrationId === s.winnerRegistrationId;
                    const score = s.match
                      ? side === 'home'
                        ? s.match.homeScore
                        : s.match.awayScore
                      : null;
                    return (
                      <div
                        key={side}
                        className={`bracket-team ${won ? 'won' : ''} ${team.registrationId ? '' : 'muted'}`}
                      >
                        <span className="grow ellipsis">{team.label}</span>
                        <span>{score ?? ''}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function LeaderboardsTab({ id }: { id: string }) {
  const [data] = useAsync(() => api.leaderboards(id), id);
  if (data.status === 'loading') return <p className="muted">Carregando…</p>;
  if (data.status === 'error') return <p className="status-error">{data.message}</p>;
  return (
    <div className="stack">
      {data.data.boards.map((b) => (
        <section className="card" key={b.key}>
          <h2>{b.label}</h2>
          {b.rows.length === 0 ? (
            <p className="muted">Sem jogos encerrados.</p>
          ) : (
            <table className="grid">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Atleta</th>
                  <th className="left">Equipe</th>
                  <th>J</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.athleteId}>
                    <td>{r.position}</td>
                    <td className="left">{r.name}</td>
                    <td className="left">{r.teamName}</td>
                    <td>{r.games}</td>
                    <td>
                      <strong>{r.value}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
