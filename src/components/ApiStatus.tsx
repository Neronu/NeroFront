import { useEffect, useState } from 'react';
import { fetchApiStatus, type ApiStatus as Status } from '../lib/api/health';
import { API_URL } from '../lib/env';
import { Notice } from './ui';

/** Estado da API e compatibilidade do módulo de esporte (Configurações). */
export function ApiStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchApiStatus(API_URL, ctrl.signal).then(setStatus, () => {});
    return () => ctrl.abort();
  }, []);

  if (!status) return <Notice>Verificando a API…</Notice>;
  switch (status.kind) {
    case 'ok':
      return (
        <Notice tone="positive" role="status">
          API online · módulo de basquete {status.apiVersion}
        </Notice>
      );
    case 'mismatch':
      return (
        <Notice tone="danger">
          Versões incompatíveis: API {status.apiVersion}, este app {status.localVersion}. Atualize a
          página.
        </Notice>
      );
    case 'degraded':
      return (
        <Notice tone="danger">
          API no ar com falha em{' '}
          {[
            status.db === 'error' && 'banco de dados',
            status.storage === 'error' && 'armazenamento de PDFs',
          ]
            .filter(Boolean)
            .join(' e ')}
          . Reative o projeto no Supabase antes da rodada.
        </Notice>
      );
    case 'offline':
      return (
        <Notice tone="danger">
          API indisponível ({status.message}). Tente de novo em instantes.
        </Notice>
      );
  }
}
