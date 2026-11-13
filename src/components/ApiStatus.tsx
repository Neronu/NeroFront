import { useEffect, useState } from 'react';
import { fetchApiStatus, type ApiStatus as Status } from '../lib/api/health';
import { API_URL } from '../lib/env';
import { Notice } from './ui';

const listFormat = new Intl.ListFormat('pt-BR', { type: 'conjunction' });

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
          Versões incompatíveis do módulo {status.sport}: API {status.apiVersion}, este app{' '}
          {status.localVersion}. Atualize a página.
        </Notice>
      );
    case 'degraded': {
      const down = [
        status.db === 'error' && 'banco de dados',
        status.storage === 'error' && 'armazenamento de PDFs',
        // Com o banco fora a conferência também falha: não repete o aviso.
        status.migrations === 'error' && status.db !== 'error' && 'conferência das migrações',
      ].filter((s): s is string => Boolean(s));
      return (
        <Notice tone="danger">
          {down.length > 0 && (
            <>
              API no ar com falha em {listFormat.format(down)}.
              {(status.db === 'error' || status.storage === 'error') &&
                ' Reative o projeto no Supabase antes da rodada.'}{' '}
            </>
          )}
          {status.migrations === 'pending' &&
            'O banco não recebeu todas as migrações desta versão da API, e salvar dados pode falhar. Rode pnpm --filter api prisma:deploy no neroBack antes da rodada.'}
        </Notice>
      );
    }
    case 'offline':
      return (
        <Notice tone="danger">
          API indisponível ({status.message}). Tente de novo em instantes.
        </Notice>
      );
  }
}
