import { useEffect, useReducer } from 'react';

/**
 * Faz o componente renderizar a cada `intervalMs` enquanto `active`, para quem lê a hora
 * no render (o relógio da mesa). Parado, não agenda nada: só gasta bateria correndo.
 */
export function useTick(active: boolean, intervalMs = 100): void {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(tick, intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs]);
}
