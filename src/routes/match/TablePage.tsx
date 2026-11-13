import { isVoidEvent, voidedIds } from '@neronu/sport-core';
import { RotateCw } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Button, ErrorState, Icon, Skeleton } from '../../components/ui';
import {
  clockExpired,
  clockStopPayload,
  sportTable,
  type MomentAction as SportMoment,
  type TableClock,
  type TablePlayer,
  type Who,
} from '../../lib/match/sport-table';
import type { Draft, TableEvent } from '../../lib/match/table';
import { useMatchTable } from '../../lib/match/useMatchTable';
import { useShotClock } from '../../lib/match/useShotClock';
import { useTick } from '../../lib/match/useTick';
import { MoreSheet } from './sumula/MoreSheet';
import { SumulaFooter } from './sumula/SumulaFooter';
import { ClockControl, ShotClockControl, SumulaTop, SyncButton } from './sumula/SumulaTop';
import { TeamColumn } from './sumula/TeamColumn';
import { FRAME_H, FRAME_W, useFrameFit } from './sumula/useFrameFit';

type Side = 'home' | 'away';
const SIDES: Side[] = ['home', 'away'];
const CLOCK_EVENTS = new Set(['clock_start', 'clock_stop']);

/** Foco num campo, botão ou diálogo: a barra de espaço é dele, não do relógio. */
function ownsSpace(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    !!target.closest('input, textarea, select, button, a, [role="dialog"], dialog')
  );
}

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

  // Relógio: lido no render a partir do estado; renderiza a cada 100 ms só enquanto corre.
  const runningSince = snapshot?.state.clock?.runningSince ?? null;
  useTick(!!runningSince);
  const sportKey = snapshot?.sport.key;
  const clock = snapshot ? sportTable(snapshot.sport.key).clock(snapshot.state, new Date()) : null;
  const closedMatch = snapshot?.server.match.status === 'closed';

  // Posse: só na mesa, corre com o relógio de jogo. Ao zerar, avisa uma vez até o reinício.
  const shot = useShotClock(
    id,
    sportKey ? sportTable(sportKey).shotClock : null,
    closedMatch ? null : clock,
    snapshot?.state.period ?? 0,
  );
  const shotExpired = !!shot && !shot.off && shot.remainingMs === 0;
  const shotWarned = useRef(false);
  useEffect(() => {
    if (!shotExpired) {
      shotWarned.current = false;
      return;
    }
    if (shotWarned.current) return;
    shotWarned.current = true;
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  }, [shotExpired]);

  const toggleClock = (c: TableClock) => {
    const r = c.running
      ? table.record({ type: 'clock_stop', payload: clockStopPayload(c) })
      : table.record({ type: 'clock_start', payload: {} });
    if (!r.ok) setAlert(r.message);
    else if ('vibrate' in navigator) navigator.vibrate(30);
  };

  // Ao zerar, para o relógio uma vez por corrida (cobre também reabrir a mesa depois da hora).
  const expired = clockExpired(clock);
  const stopAtZero = useEffectEvent(() => {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    const r = table.record({ type: 'clock_stop', payload: { remainingMs: 0 } });
    if (!r.ok) setAlert(r.message);
  });
  const expiredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!runningSince || !expired || closedMatch || expiredFor.current === runningSince) return;
    expiredFor.current = runningSince;
    stopAtZero();
  }, [runningSince, expired, closedMatch]);

  // Barra de espaço alterna o relógio (mesa com notebook).
  const onSpace = useEffectEvent((e: KeyboardEvent) => {
    if (!clock || expired || closedMatch || more || ownsSpace(e.target)) return;
    e.preventDefault();
    toggleClock(clock);
  });
  // R reinicia a posse cheia; T, o segundo reinício (14s no 5x5).
  const onShotKey = useEffectEvent((e: KeyboardEvent, index: number) => {
    if (!shot || !sportKey || more || ownsSpace(e.target)) return;
    const ms = sportTable(sportKey).shotClock.resets[index];
    if (ms === undefined) return;
    e.preventDefault();
    shot.reset(ms);
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') onSpace(e);
      else if (e.code === 'KeyR') onShotKey(e, 0);
      else if (e.code === 'KeyT') onShotKey(e, 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const sport = sportTable(snapshot.sport.key);
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
  const describe = (e: TableEvent) => sport.describe(e, (a) => names.get(a), teamName, state);
  const voidEvent = (eventId: string) => {
    const r = table.voidEvent(eventId);
    if (!r.ok) setAlert(r.message);
  };

  const all = [...snapshot.confirmed, ...snapshot.pending];
  const voided = voidedIds(all);
  // O relógio tem botão próprio: pausar e retomar não entram no "Desfazer".
  const last = [...all]
    .reverse()
    .find((e) => !isVoidEvent(e) && !voided.has(e.id) && !CLOCK_EVENTS.has(e.type));
  const pendingIds = new Set(snapshot.pending.map((e) => e.id));
  const playersOf = (side: Side): TablePlayer[] =>
    sport
      .players(state)
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
  const moment = closed ? null : sport.moment(state);
  if (expired && !closed) {
    banners.push(
      <div className="sm-banner" role="alert" key="clock">
        <span>
          Tempo esgotado.
          {moment?.draft ? ` Toque em “${moment.label}” para encerrar.` : ''}
        </span>
      </div>,
    );
  }
  if (shotExpired && !closed) {
    banners.push(
      <div className="sm-banner" role="alert" key="shot">
        <span>Estouro do tempo de posse. Reinicie a posse.</span>
        <button
          type="button"
          className="sm-banner__action"
          onClick={() => shot?.reset(sport.shotClock.durationMs)}
        >
          <Icon icon={RotateCw} />
          Reiniciar {Math.round(sport.shotClock.durationMs / 1000)}s
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
          <SumulaTop
            state={state}
            sport={sport}
            teamName={teamName}
            clock={
              clock && (
                <ClockControl clock={clock} disabled={closed} onToggle={() => toggleClock(clock)} />
              )
            }
            shotClock={
              shot && (
                <ShotClockControl shot={shot} resets={sport.shotClock.resets} disabled={closed} />
              )
            }
          />
          <div className="sm-body">
            {SIDES.map((side) => (
              <TeamColumn
                key={side}
                side={side}
                teamName={teamName(side)}
                players={playersOf(side)}
                scoreButtons={sport.scoreButtons}
                nameOf={nameOf}
                disabled={!canRecord}
                onScore={(p, b) => send(b.draft(p.athleteId))}
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
            action={
              <MomentAction
                matchId={id}
                send={send}
                closed={closed}
                moment={moment}
                expired={expired}
              />
            }
          />
        </div>
      </div>
      <MoreSheet
        open={more}
        onClose={() => setMore(false)}
        state={state}
        sport={sport}
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

/**
 * A ação do momento, em brand: iniciar, encerrar o período ou conferir a súmula.
 * Com o relógio zerado, encerrar vira destaque e dispensa a confirmação.
 */
function MomentAction({
  matchId,
  moment,
  closed,
  expired,
  send,
}: {
  matchId: string;
  moment: SportMoment | null;
  closed: boolean;
  expired: boolean;
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
  if (!moment) {
    return (
      <Link to={conferencia} className="sm-btn sm-btn--primary">
        Conferir súmula
      </Link>
    );
  }
  const { draft } = moment;
  const question = expired ? undefined : moment.confirm;
  return (
    <button
      type="button"
      className={`sm-btn sm-btn--primary ${expired && draft ? 'is-attention' : ''}`}
      disabled={!draft}
      onClick={() => draft && (!question || confirm(question)) && send(draft)}
    >
      {moment.label}
    </button>
  );
}
