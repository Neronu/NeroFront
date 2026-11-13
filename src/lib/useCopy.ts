import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copia texto para a área de transferência e lembra qual item foi copiado por alguns segundos
 * (para trocar "Copiar" por "Copiado"). `key` distingue itens numa lista; padrão: o próprio texto.
 */
export function useCopy(resetMs = 2000) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key = text) => {
      try {
        await navigator.clipboard?.writeText(text);
      } catch {
        return;
      }
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), resetMs);
    },
    [resetMs],
  );

  return { copied, copy };
}
