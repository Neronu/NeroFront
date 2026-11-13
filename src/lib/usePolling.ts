import { useEffect, useRef } from 'react';

/**
 * Chama `refresh` a cada `ms` enquanto a aba do navegador está visível, e de novo ao voltar a ela.
 * Com `enabled` falso não faz nada (ex.: campeonato já encerrado).
 */
export function usePolling(refresh: () => void, ms: number, enabled = true): void {
  const ref = useRef(refresh);
  useEffect(() => {
    ref.current = refresh;
  });
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (!document.hidden) ref.current();
    };
    const id = window.setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms, enabled]);
}
