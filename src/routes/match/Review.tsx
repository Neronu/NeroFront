import { basketball, periodLabel } from '@neronu/sport-basketball';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useMatchTable } from '../../lib/match/useMatchTable';

type Side = 'home' | 'away';

/** Resumo do jogo antes de fechar a súmula; depois de fechada, o PDF. */
export function Review() {
  const { id = '' } = useParams();
  const { table, snapshot, loadError } = useMatchTable(id);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  if (loadError) return <p className="status-error">{loadError}</p>;
  if (!snapshot) return <p className="muted">Carregando…</p>;

  const { state, server } = snapshot;
  const closed = server.match.status === 'closed';
  const teamName = (s: Side) => (s === 'home' ? server.match.homeTeam : server.match.awayTeam).name;
  const names = new Map(
    (['home', 'away'] as const).flatMap((s) =>
      server.roster[s].roster.map((r) => [r.athleteId, r.name] as const),
    ),
  );
  const stats = basketball.playerStats(state);
  const periods = Array.from({ length: state.period }, (_, i) => periodLabel(state, i + 1));
  const finished = state.status === 'finished';
  const pending = snapshot.pending.length;

  const close = async () => {
    if (!confirm('Fechar a súmula? Depois disso, nenhum lance pode ser alterado na mesa.')) return;
    setClosing(true);
    setError('');
    try {
      await api.close(id);
      table.markClosed(await api.state(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row between">
          <h1>Conferência</h1>
          {!closed && <Link to={`/partidas/${id}/mesa`}>‹ Voltar à mesa</Link>}
        </div>
        <div className="final-score">
          <span>{teamName('home')}</span>
          <strong>
            {state.teams.home.score} – {state.teams.away.score}
          </strong>
          <span>{teamName('away')}</span>
        </div>
        <table className="grid">
          <thead>
            <tr>
              <th>Equipe</th>
              {periods.map((p) => (
                <th key={p}>{p.replace(' quarto', 'Q').replace(' tempo', 'T')}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(['home', 'away'] as const).map((s) => (
              <tr key={s}>
                <td>{teamName(s)}</td>
                {periods.map((p, i) => (
                  <td key={p}>{state.teams[s].scoreByPeriod[i] ?? 0}</td>
                ))}
                <td>
                  <strong>{state.teams[s].score}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {(['home', 'away'] as const).map((s) => (
        <section className="card" key={s}>
          <h2>{teamName(s)}</h2>
          <table className="grid">
            <thead>
              <tr>
                <th>Nº</th>
                <th className="left">Atleta</th>
                {basketball.statsSchema.map((c) => (
                  <th key={c.key} title={c.label}>
                    {c.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats
                .filter((l) => l.side === s)
                .map((l) => (
                  <tr key={l.athleteId}>
                    <td>{l.number}</td>
                    <td className="left">{names.get(l.athleteId)}</td>
                    {basketball.statsSchema.map((c) => (
                      <td key={c.key}>{l.stats[c.key]}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="card stack">
        {closed ? (
          <>
            <p className="status-ok">Súmula fechada.</p>
            {error && <p className="status-error">{error}</p>}
            {server.sheets.map((sh) => (
              <p key={sh.revision} className="small">
                <button
                  className="link"
                  onClick={() =>
                    api
                      .openSheet(id, sh.revision)
                      .catch(() => setError('Não foi possível abrir o PDF.'))
                  }
                >
                  Abrir PDF · revisão {sh.revision}
                </button>
                <span className="muted"> · hash {sh.eventsHash.slice(0, 12)}…</span>
                {sh.reason && <span className="muted"> · {sh.reason}</span>}
              </p>
            ))}
          </>
        ) : (
          <>
            {!finished && (
              <p className="status-warn">Encerre o último período na mesa antes de fechar.</p>
            )}
            {pending > 0 && (
              <p className="status-warn">
                {pending} lance(s) ainda não enviados. Aguarde a conexão para fechar.
              </p>
            )}
            {error && <p className="status-error">{error}</p>}
            <button
              className="primary big"
              disabled={!finished || pending > 0 || closing}
              onClick={close}
            >
              {closing ? 'Fechando…' : 'Fechar súmula e gerar PDF'}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
