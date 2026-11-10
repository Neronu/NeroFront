import { useEffect, useState } from 'react';
import { fetchApiStatus, type ApiStatus } from '../lib/api/health';
import { API_URL } from '../lib/env';

export function Home() {
  const [status, setStatus] = useState<ApiStatus | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchApiStatus(API_URL, ctrl.signal).then(setStatus, () => {});
    return () => ctrl.abort();
  }, []);

  return (
    <section className="card">
      <h1 style={{ marginTop: 0, fontSize: '1.1rem' }}>Súmula digital</h1>
      <p className="muted">Em construção. A tela de mesa chega no E3.</p>
      <ApiBadge status={status} />
    </section>
  );
}

function ApiBadge({ status }: { status: ApiStatus | null }) {
  if (!status) return <p className="muted">Verificando a API…</p>;
  switch (status.kind) {
    case 'ok':
      return <p className="status-ok">API online · módulo de basquete {status.apiVersion}</p>;
    case 'mismatch':
      return (
        <p className="status-warn">
          Versões incompatíveis: API {status.apiVersion}, este app {status.localVersion}. Atualize a
          página.
        </p>
      );
    case 'offline':
      return <p className="status-error">API indisponível ({status.message})</p>;
  }
}
