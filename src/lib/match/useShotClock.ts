import { useEffect, useState } from 'react';
import { store } from '../storage';
import {
  initialShot,
  parseShot,
  resetShot,
  shotRemaining,
  syncWithGame,
  type ShotClockConfig,
  type ShotClockState,
} from './shot-clock';
import type { TableClock } from './sport-table';

export interface ShotClockView {
  remainingMs: number;
  running: boolean;
  /** Relógio de jogo com menos tempo que a posse: o cronômetro de posse fica desligado. */
  off: boolean;
  reset(ms: number): void;
}

const keyOf = (matchId: string) => `neronu:shot:${matchId}`;

/**
 * Cronômetro de posse da mesa, salvo no aparelho por partida. Acompanha o relógio de jogo
 * (`game`) e volta cheio a cada período. Quem renderiza de tempos em tempos é o `useTick`
 * da mesa; aqui só se lê a hora no render.
 */
export function useShotClock(
  matchId: string,
  config: ShotClockConfig | null,
  game: TableClock | null,
  period: number,
): ShotClockView | null {
  const durationMs = config?.durationMs ?? 0;
  const [shot, setShot] = useState<ShotClockState>(
    () => parseShot(store.get(keyOf(matchId))) ?? initialShot({ durationMs, resets: [] }, period),
  );
  const gameRunning = !!game?.running;

  // Período novo: posse cheia e parada. Depois, segue o relógio de jogo. Sem relógio de jogo
  // (carregando, intervalo) não mexe em nada, para não perder o estado salvo.
  // Ajuste no render quando as entradas mudam, sem efeito (react.dev: "you might not need an effect").
  const inputs = config && game ? `${period}:${gameRunning}` : null;
  const [seen, setSeen] = useState<string | null>(null);
  if (inputs !== seen) {
    setSeen(inputs);
    if (config && inputs) {
      setShot((s) => {
        const base = s.period === period ? s : initialShot(config, period);
        return syncWithGame(base, gameRunning, new Date());
      });
    }
  }

  useEffect(() => {
    if (config) store.set(keyOf(matchId), shot);
  }, [config, matchId, shot]);

  if (!config || !game) return null;
  const remainingMs = shot.period === period ? shotRemaining(shot, new Date()) : durationMs;
  return {
    remainingMs,
    running: !!shot.runningSince,
    off: game.kind === 'countdown' && game.remainingMs <= remainingMs,
    reset: (ms) => setShot((s) => resetShot(s, ms, gameRunning, new Date())),
  };
}
