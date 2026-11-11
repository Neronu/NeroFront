import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { errorMessage } from '../api/client';
import { MatchTable } from './table';

/** Motor da mesa ligado ao React: carrega, reenvia ao voltar a conexão e mantém a tela acesa. */
export function useMatchTable(matchId: string) {
  const table = useMemo(() => new MatchTable(matchId), [matchId]);
  const snapshot = useSyncExternalStore(table.subscribe, table.getSnapshot);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    table.load().catch((err: unknown) => setLoadError(errorMessage(err)));
    const online = () => table.retryNow();
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('online', online);
      table.dispose();
    };
  }, [table]);

  // A tela não pode apagar no meio do jogo.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(
          (l) => (lock = l),
          () => {},
        );
      }
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, []);

  return { table, snapshot, loadError };
}
