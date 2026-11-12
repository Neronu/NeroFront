import { isVoidEvent, voidedIds } from '@neronu/sport-core';
import { periodLabel, type BasketballState, type PlayerState } from '@neronu/sport-basketball';
import { RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Button, ErrorState, Icon, Skeleton } from '../../components/ui';
import { describeEvent, type Who } from '../../lib/match/describe';
import type { Draft, TableEvent } from '../../lib/match/table';
import { useMatchTable } from '../../lib/match/useMatchTable';
import { MoreSheet } from './sumula/MoreSheet';
import { SumulaFooter } from './sumula/SumulaFooter';
import { SumulaTop, SyncButton } from './sumula/SumulaTop';
import { TeamColumn } from './sumula/TeamColumn';
import { FRAME_H, FRAME_W, useFrameFit } from './sumula/useFrameFit';

type Side = 'home' | 'away';
const SIDES: Side[] = ['home', 'away'];

/**
 * Súmula ao vivo (seção 14): quadro sempre 16:9, desenhado em 1280 × 720 e escalado para caber,
 * com court nas sobras. Sem barra lateral e sem navegação global: só o jogo.
 */
export function TablePage() {
  const { id = '' } = useParams();
  const { table, snapshot, loadError } = useMatchTable(id);
  const fit = useFrameFit();
  const [alert, setAlert] = useState('');
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(''), 4000);
    return () => clearTimeout(t);
  }, [alert]);

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
      <div className="lyt-content lyt-reading ui-stack">
        <ErrorState title="Erro ao abrir a mesa" message={loadError} />
        <div>
          <Button to="/" variant="secondary">
            Voltar ao painel
          </Button>
        </div>
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="lyt-content">
        <Skeleton lines={6} />
      </div>
    );
  }
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
  const nameOf = (athleteId: string) => names.get(athleteId)?.name ?? '';
  const closed = server.match.status === 'closed';
  const canRecord = !closed && state.status === 'in_period';

  /** Lança e mostra o resultado na hora; erro vira faixa danger com texto. */
  const send = (draft: Draft): boolean => {
    const r = table.record(draft);
    if (!r.ok) setAlert(r.message);
    else if ('vibrate' in navigator) navigator.vibrate(30);
    return r.ok;
  };
  const describe = (e: TableEvent) =>
    describeEvent(
      e,
      (a) => names.get(a),
      teamName,
      (p) => periodLabel(state, p).toLowerCase(),
    );
  const voidEvent = (eventId: string) => {
    const r = table.voidEvent(eventId);
    if (!r.ok) setAlert(r.message);
  };

  const all = [...snapshot.confirmed, ...snapshot.pending];
  const voided = voidedIds(all);
  const last = [...all].reverse().find((e) => !isVoidEvent(e) && !voided.has(e.id));
  const pendingIds = new Set(snapshot.pending.map((e) => e.id));
  const playersOf = (side: Side): PlayerState[] =>
    Object.values(state.players)
      .filter((p) => p.side === side)
      .sort((a, b) => a.number - b.number);

  const banners: ReactNode[] = [];
  if (snapshot.sync === 'offline' || snapshot.sync === 'unauthorized') {
    banners.push(
      <div className="sm-banner" role="alert" key="sync">
        <span>
          {snapshot.sync === 'offline'
            ? `Sem conexão. ${snapshot.pending.length} lançamento(s) na fila; continue anotando, eles serão enviados quando a conexão voltar.`
            : `Sessão expirada. ${snapshot.pending.length} lançamento(s) na fila; entre de novo para enviar.`}
        </span>
        <button type="button" className="sm-banner__action" onClick={() => table.retryNow()}>
          <Icon icon={RotateCw} />
          Tentar de novo
        </button>
      </div>,
    );
  }
  if (snapshot.rejections.length > 0) {
    banners.push(
      <div className="sm-banner" role="alert" key="rejected">
        <span>
          A API recusou {snapshot.rejections.length} lançamento(s):{' '}
          {snapshot.rejections.map((r) => r.message).join(' ')}
        </span>
        <button
          type="button"
          className="sm-banner__action"
          onClick={() => table.dismissRejections()}
        >
          Entendi
        </button>
      </div>,
    );
  }
  if (alert) {
    banners.push(
      <div className="sm-banner" role="alert" key="alert">
        <span>Erro: {alert}</span>
      </div>,
    );
  }

  return (
    <div className="sm-viewport">
      <div className="sm-rotate" role="status">
        <Icon icon={RotateCw} size={24} />
        <p>Gire o aparelho para usar a súmula.</p>
      </div>
      <div className="sm-fit" style={{ width: fit.width, height: fit.height }}>
        <div
          className={`sm-frame ${fit.compact ? 'is-compact' : ''}`}
          style={
            fit.compact
              ? { width: fit.width, height: fit.height }
              : { width: FRAME_W, height: FRAME_H, transform: `scale(${fit.scale})` }
          }
        >
          <SumulaTop state={state} teamName={teamName} />
          <div className="sm-body">
            {SIDES.map((side) => (
              <TeamColumn
                key={side}
                side={side}
                teamName={teamName(side)}
                players={playersOf(side)}
                nameOf={nameOf}
                disabled={!canRecord}
                onScore={(p, points) =>
                  send({ type: 'score', payload: { athleteId: p.athleteId, points } })
                }
                onFoul={(p) =>
                  send({ type: 'foul', payload: { athleteId: p.athleteId, kind: 'personal' } })
                }
              />
            ))}
          </div>
          {banners.length > 0 && <div className="sm-banners">{banners}</div>}
          <SumulaFooter
            last={last ? describe(last) : null}
            lastPending={!!last && pendingIds.has(last.id)}
            canUndo={!!last && !closed}
            onUndo={() => last && voidEvent(last.id)}
            onMore={() => setMore(true)}
            sync={<SyncButton snapshot={snapshot} onRetry={() => table.retryNow()} />}
            action={<MomentAction matchId={id} send={send} closed={closed} state={state} />}
          />
        </div>
      </div>
      <MoreSheet
        open={more}
        onClose={() => setMore(false)}
        state={state}
        snapshot={snapshot}
        teamName={teamName}
        nameOf={nameOf}
        canRecord={canRecord}
        closed={closed}
        send={send}
        describe={describe}
        onVoid={voidEvent}
      />
    </div>
  );
}

/** A ação do momento, em brand: iniciar, encerrar o período ou conferir a súmula. */
function MomentAction({
  matchId,
  state,
  closed,
  send,
}: {
  matchId: string;
  state: BasketballState;
  closed: boolean;
  send: (draft: Draft) => boolean;
}) {
  const conferencia = `/partidas/${matchId}/conferencia`;
  if (closed) {
    return (
      <Link to={conferencia} className="sm-btn sm-btn--primary">
        Ver súmula fechada
      </Link>
    );
  }
  if (state.status === 'finished') {
    return (
      <Link to={conferencia} className="sm-btn sm-btn--primary">
        Conferir súmula
      </Link>
    );
  }
  if (state.status === 'in_period') {
    const label = periodLabel(state).toLowerCase();
    return (
      <button
        type="button"
        className="sm-btn sm-btn--primary"
        onClick={() =>
          confirm(`Encerrar o ${label}?`) &&
          send({ type: 'period_end', payload: { period: state.period } })
        }
      >
        Encerrar {label}
      </button>
    );
  }
  const next = state.period + 1;
  const tied = state.teams.home.score === state.teams.away.score;
  return (
    <button
      type="button"
      className="sm-btn sm-btn--primary"
      onClick={() => send({ type: 'period_start', payload: { period: next } })}
    >
      Iniciar {periodLabel(state, next).toLowerCase()}
      {state.period >= state.rules.periods && tied ? ' (empate)' : ''}
    </button>
  );
}
