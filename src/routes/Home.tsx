import type { Match } from '@neronu/api-contract';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api/client';
import { fetchApiStatus, type ApiStatus } from '../lib/api/health';
import { API_URL } from '../lib/env';
import { useOrg } from '../lib/session';
import { useAsync } from '../lib/useAsync';

const STATUS_LABEL: Record<Match['status'], string> = {
  scheduled: 'Preparação',
  in_progress: 'Em andamento',
  closed: 'Súmula fechada',
};

export function matchLink(m: Pick<Match, 'id' | 'status'>): string {
  if (m.status === 'scheduled') return `/partidas/${m.id}/preparar`;
  if (m.status === 'closed') return `/partidas/${m.id}/conferencia`;
  return `/partidas/${m.id}/mesa`;
}

/** Painel da entidade: campeonatos, partidas e cadastros. */
export function Home() {
  const { org, isAdmin } = useOrg();
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [matches] = useAsync(() => api.matches(org.id), org.id);
  const [championships] = useAsync(() => api.championships(org.id), org.id);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchApiStatus(API_URL, ctrl.signal).then(setStatus, () => {});
    return () => ctrl.abort();
  }, []);

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row between">
          <h1>Campeonatos</h1>
          {isAdmin && (
            <Link to="/campeonatos/novo" className="button primary">
              Novo campeonato
            </Link>
          )}
        </div>
        {championships.status === 'error' && (
          <p className="status-error">{championships.message}</p>
        )}
        {championships.status === 'ok' &&
          (championships.data.length === 0 ? (
            <p className="muted">Nenhum campeonato ainda.</p>
          ) : (
            <ul className="list">
              {championships.data.map((c) => (
                <li key={c.id}>
                  <Link to={`/campeonatos/${c.id}`} className="row between">
                    <span>{c.name}</span>
                    <span className="muted small">
                      {c.organizer.id === org.id ? 'Organizadora' : c.organizer.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <section className="card stack">
        <div className="row between">
          <h1>Partidas</h1>
          {isAdmin && (
            <Link to="/partidas/nova" className="button">
              Partida avulsa
            </Link>
          )}
        </div>
        {matches.status === 'loading' && <p className="muted">Carregando…</p>}
        {matches.status === 'error' && <p className="status-error">{matches.message}</p>}
        {matches.status === 'ok' &&
          (matches.data.length === 0 ? (
            <p className="muted">Nenhuma partida ainda.</p>
          ) : (
            <ul className="list">
              {matches.data.map((m) => (
                <li key={m.id}>
                  <Link to={matchLink(m)} className="row between">
                    <span>
                      {m.homeTeam.name} × {m.awayTeam.name}
                    </span>
                    <span className="muted small">{STATUS_LABEL[m.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </section>

      <nav className="card tiles">
        <Link to="/equipes">Equipes</Link>
        <Link to="/atletas">Atletas</Link>
        <Link to="/regras">Regras</Link>
        <Link to="/membros">Membros</Link>
      </nav>
      <ApiBadge status={status} />
    </div>
  );
}

function ApiBadge({ status }: { status: ApiStatus | null }) {
  if (!status) return <p className="muted small">Verificando a API…</p>;
  switch (status.kind) {
    case 'ok':
      return <p className="status-ok small">API online · módulo de basquete {status.apiVersion}</p>;
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
