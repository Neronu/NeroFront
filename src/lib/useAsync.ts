import { useEffect, useRef, useState } from 'react';
import { errorMessage } from './api/client';

export type Async<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: T };

/**
 * Carrega dados e recarrega quando `key` muda; `reload` busca de novo.
 * Ignora respostas de efeitos já desmontados.
 */
export function useAsync<T>(fn: () => Promise<T>, key: string): [Async<T>, () => void] {
  const [state, setState] = useState<Async<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    let alive = true;
    fnRef.current().then(
      (data) => alive && setState({ status: 'ok', data }),
      (err: unknown) => alive && setState({ status: 'error', message: errorMessage(err) }),
    );
    return () => {
      alive = false;
    };
  }, [key, tick]);
  return [state, () => setTick((t) => t + 1)];
}
