import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

const DEBOUNCE_MS = 300;

/**
 * Busca das listas do admin: o texto digitado vai para `?q=` depois de uma pausa, para a busca
 * sobreviver ao voltar da página e poder ser compartilhada.
 */
export function useSearchParam(): { input: string; setInput(v: string): void; query: string } {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [input, setInput] = useState(query);

  useEffect(() => {
    if (input.trim() === query) return;
    const t = setTimeout(() => {
      setParams(input.trim() ? { q: input.trim() } : {}, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input, query, setParams]);

  return { input, setInput, query };
}
