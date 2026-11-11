import { isVoidEvent, voidedIds } from '@neronu/sport-core';
import {
  isInBonus,
  periodLabel,
  teamFoulsInPeriod,
  timeoutsLeft,
  totalFouls,
  type PlayerFoulKind,
  type PlayerState,
  type Points,
} from '@neronu/sport-basketball';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { describeEvent, type Who } from '../../lib/match/describe';
import type { Draft, TableSnapshot } from '../../lib/match/table';
import { useMatchTable } from '../../lib/match/useMatchTable';

type Side = 'home' | 'away';
const SIDES: Side[] = ['home', 'away'];

export function TablePage() {
  const { id = '' } = useParams();
  const { table, snapshot, loadError } = useMatchTable(id);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [teamPanel, setTeamPanel] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const names = useMemo(() => {
    const map = new Map<string, Who>();
    if (snapshot) {
      for (const side of SIDES) {
        for (const r of snapshot.server.roster[side].roster) {
          map.set(r.athleteId, { number: r.number, name: r.name, side });
        }
      }
    }
    return map;
  }, [snapshot]);

  if (loadError) {
    return (
      <div className="shell">
        <p className="status-error">{loadError}</p>
        <Link to="/">Voltar</Link>
      </div>
    );
  }
  if (!snapshot) return <div className="shell muted">Carregando a partida…</div>;
  if (
    snapshot.server.match.status === 'scheduled' &&
    snapshot.confirmed.length === 0 &&
    snapshot.setup.home.roster.length === 0
  ) {
    return <Navigate to={`/partidas/${id}/preparar`} replace />;
  }

  const { state, server } = snapshot;
  const teamName = (side: Side) =>
    (side === 'home' ? server.match.homeTeam : server.match.awayTeam).name;
  const closed = server.match.status === 'closed';

  const send = (draft: Draft) => {
    const r = table.record(draft);
    if (!r.ok) setToast(r.message);
    setSelected(null);
    if (r.ok && 'vibrate' in navigator) navigator.vibrate(30);
  };

  const player = selected ? state.players[selected] : undefined;
  const nextPeriod = state.period + 1;

  return (
    <div className="table-screen">
      <TopBar snapshot={snapshot} matchId={id} onRetry={() => table.retryNow()} />

      <section className="scoreboard">
        {SIDES.map((side) => (
          <div key={side} className={`sb-team ${side}`}>
            <div className="sb-name">
              {side === 'home' ? 'A' : 'B'} · {teamName(side)}
            </div>
            <div className="sb-score">{state.teams[side].score}</div>
            <div className="sb-meta">
              <span className={isInBonus(state, side) ? 'bonus on' : 'bonus'}>
                Faltas {teamFoulsInPeriod(state, side)}
                {isInBonus(state, side) ? ' · BÔNUS' : ''}
              </span>
              <span>Tempos {timeoutsLeft(state, side)}</span>
            </div>
          </div>
        ))}
        <div className="sb-period">
          {state.status === 'finished' ? 'Encerrado' : periodLabel(state)}
        </div>
      </section>

      {snapshot.rejections.length > 0 && (
        <div className="banner error" role="alert">
          A API recusou {snapshot.rejections.length} lance(s):{' '}
          {snapshot.rejections.map((r) => r.message).join(' ')}
          <button onClick={() => table.dismissRejections()}>Ok</button>
        </div>
      )}

      <PeriodControl
        snapshot={snapshot}
        matchId={id}
        onStart={() => send({ type: 'period_start', payload: { period: nextPeriod } })}
        onEnd={() => send({ type: 'period_end', payload: { period: state.period } })}
        closed={closed}
      />

      <section className="rosters">
        {SIDES.map((side) => (
          <div key={side} className="roster-col">
            {Object.values(state.players)
              .filter((p) => p.side === side)
              .sort((a, b) => a.number - b.number)
              .map((p) => (
                <PlayerButton
                  key={p.athleteId}
                  player={p}
                  name={names.get(p.athleteId)?.name ?? ''}
                  selected={selected === p.athleteId}
                  disabled={closed || state.status !== 'in_period'}
                  onClick={() => setSelected(selected === p.athleteId ? null : p.athleteId)}
                />
              ))}
          </div>
        ))}
      </section>

      {player && (
        <ActionBar
          player={player}
          name={names.get(player.athleteId)?.name ?? ''}
          onScore={(points) =>
            send({ type: 'score', payload: { athleteId: player.athleteId, points } })
          }
          onFoul={(kind) => send({ type: 'foul', payload: { athleteId: player.athleteId, kind } })}
          onCancel={() => setSelected(null)}
        />
      )}

      {!player && state.status === 'in_period' && !closed && (
        <section className="team-actions">
          <button className="link" onClick={() => setTeamPanel(!teamPanel)}>
            {teamPanel ? 'Ocultar ações de equipe' : 'Tempo técnico e faltas do técnico'}
          </button>
          {teamPanel && (
            <div className="team-grid">
              {SIDES.map((side) => (
                <div key={side} className="stack tight">
                  <strong>{teamName(side)}</strong>
                  <button onClick={() => send({ type: 'timeout', payload: { side } })}>
                    Tempo ({timeoutsLeft(state, side)})
                  </button>
                  <button
                    onClick={() =>
                      send({ type: 'coach_foul', payload: { side, kind: 'technical' } })
                    }
                  >
                    Técnica do técnico
                  </button>
                  <button
                    onClick={() => send({ type: 'coach_foul', payload: { side, kind: 'bench' } })}
                  >
                    Técnica do banco
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <EventLog
        snapshot={snapshot}
        describe={(e) =>
          describeEvent(
            e,
            (a) => names.get(a),
            teamName,
            (p) => periodLabel(state, p).toLowerCase(),
          )
        }
        onVoid={(eventId) => {
          if (!confirm('Anular este lance?')) return;
          const r = table.voidEvent(eventId);
          if (!r.ok) setToast(r.message);
        }}
        closed={closed}
      />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function TopBar({
  snapshot,
  matchId,
  onRetry,
}: {
  snapshot: TableSnapshot;
  matchId: string;
  onRetry: () => void;
}) {
  const n = snapshot.pending.length;
  const label =
    snapshot.sync === 'synced'
      ? 'Sincronizado'
      : snapshot.sync === 'sending'
        ? `Enviando ${n}…`
        : snapshot.sync === 'unauthorized'
          ? `Chave inválida · ${n} na fila`
          : `Sem conexão · ${n} na fila`;
  return (
    <header className="table-top">
      <Link to="/" aria-label="Voltar">
        ‹ Partidas
      </Link>
      <button className={`sync ${snapshot.sync}`} onClick={onRetry} title="Tentar enviar agora">
        {label}
      </button>
      {snapshot.state.status === 'finished' && (
        <Link to={`/partidas/${matchId}/conferencia`}>Conferência ›</Link>
      )}
    </header>
  );
}

function PeriodControl({
  snapshot,
  matchId,
  onStart,
  onEnd,
  closed,
}: {
  snapshot: TableSnapshot;
  matchId: string;
  onStart: () => void;
  onEnd: () => void;
  closed: boolean;
}) {
  const { state } = snapshot;
  if (closed) {
    return (
      <Link className="button big" to={`/partidas/${matchId}/conferencia`}>
        Súmula fechada · ver conferência
      </Link>
    );
  }
  if (state.status === 'finished') {
    return (
      <Link className="button primary big" to={`/partidas/${matchId}/conferencia`}>
        Conferir e fechar a súmula
      </Link>
    );
  }
  if (state.status === 'in_period') {
    return (
      <button
        className="big period-end"
        onClick={() => confirm(`Encerrar o ${periodLabel(state).toLowerCase()}?`) && onEnd()}
      >
        Encerrar {periodLabel(state).toLowerCase()}
      </button>
    );
  }
  const tied = state.teams.home.score === state.teams.away.score;
  const label = periodLabel(state, state.period + 1).toLowerCase();
  return (
    <button className="primary big" onClick={onStart}>
      Iniciar {label}
      {state.period >= state.rules.periods && tied ? ' (empate)' : ''}
    </button>
  );
}

function PlayerButton({
  player,
  name,
  selected,
  disabled,
  onClick,
}: {
  player: PlayerState;
  name: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const out = player.status !== 'active';
  const fouls = totalFouls(player);
  return (
    <button
      className={`player ${selected ? 'selected' : ''} ${out ? 'out' : ''}`}
      onClick={onClick}
      disabled={disabled || out}
      aria-pressed={selected}
      aria-label={`Número ${player.number}, ${name}`}
    >
      <span className="p-num">{player.number}</span>
      <span className="p-name">{name.split(' ')[0]}</span>
      <span className="p-meta">
        {out ? (player.status === 'fouled_out' ? 'EXC' : 'DESQ') : `${player.points} pts`}
        <span className="dots" aria-label={`${fouls} faltas`}>
          {'●'.repeat(fouls)}
        </span>
      </span>
    </button>
  );
}

function ActionBar({
  player,
  name,
  onScore,
  onFoul,
  onCancel,
}: {
  player: PlayerState;
  name: string;
  onScore: (p: Points) => void;
  onFoul: (k: PlayerFoulKind) => void;
  onCancel: () => void;
}) {
  return (
    <section className="action-bar" aria-label={`Ações para o número ${player.number}`}>
      <div className="row between">
        <strong>
          #{player.number} {name}
        </strong>
        <button className="link" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      <div className="actions-main">
        <button className="act score" onClick={() => onScore(1)}>
          +1
        </button>
        <button className="act score" onClick={() => onScore(2)}>
          +2
        </button>
        <button className="act score" onClick={() => onScore(3)}>
          +3
        </button>
        <button className="act foul" onClick={() => onFoul('personal')}>
          Falta
        </button>
      </div>
      <div className="actions-more">
        <button onClick={() => onFoul('technical')}>Técnica</button>
        <button onClick={() => onFoul('unsportsmanlike')}>Antidesportiva</button>
        <button onClick={() => onFoul('disqualifying')}>Desqualificante</button>
      </div>
    </section>
  );
}

function EventLog({
  snapshot,
  describe,
  onVoid,
  closed,
}: {
  snapshot: TableSnapshot;
  describe: (e: TableSnapshot['confirmed'][number]) => string;
  onVoid: (id: string) => void;
  closed: boolean;
}) {
  const all = [...snapshot.confirmed, ...snapshot.pending];
  const voided = voidedIds(all);
  const pending = new Set(snapshot.pending.map((e) => e.id));
  const recent = all
    .filter((e) => !isVoidEvent(e))
    .slice(-10)
    .reverse();
  if (!recent.length) return null;
  return (
    <section className="event-log">
      <h2>Últimos lances</h2>
      <ul>
        {recent.map((e) => (
          <li key={e.id} className={voided.has(e.id) ? 'voided' : ''}>
            <span className="grow">
              {describe(e)}
              {pending.has(e.id) && (
                <span className="pending-dot" title="Ainda não enviado">
                  {' '}
                  ●
                </span>
              )}
            </span>
            {!voided.has(e.id) && !closed && (
              <button className="link danger" onClick={() => onVoid(e.id)}>
                Anular
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
