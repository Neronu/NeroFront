import type { ChampionshipDetail } from '@neronu/api-contract';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { useAsync } from '../../lib/useAsync';
import { BracketTab, LeaderboardsTab, StandingsTab } from './ResultsTabs';
import { MatchesTab } from './MatchesTab';
import { RegistrationsTab } from './RegistrationsTab';

const TABS = [
  ['inscricoes', 'Inscrições'],
  ['jogos', 'Jogos'],
  ['classificacao', 'Classificação'],
  ['chave', 'Chave'],
  ['rankings', 'Rankings'],
] as const;
type Tab = (typeof TABS)[number][0];

const STATUS = {
  registration: 'Inscrições abertas',
  running: 'Em andamento',
  finished: 'Encerrado',
};

export function ChampionshipPage() {
  const { id = '' } = useParams();
  const [detail, reload] = useAsync(() => api.championship(id), id);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('aba') as Tab) ?? 'inscricoes');

  if (detail.status === 'loading') return <p className="muted">Carregando…</p>;
  if (detail.status === 'error') return <p className="status-error">{detail.message}</p>;
  const ch: ChampionshipDetail = detail.data;

  const select = (t: Tab) => {
    setTab(t);
    setParams({ aba: t }, { replace: true });
  };

  return (
    <div className="stack">
      <section className="card stack tight">
        <div className="row between">
          <h1>{ch.name}</h1>
          <span className="badge">{STATUS[ch.status]}</span>
        </div>
        <p className="muted small">
          Organização: {ch.organizer.name}
          {ch.startsAt && ` · início ${formatDateTime(ch.startsAt)}`}
          {ch.rosterLockAt &&
            ` · elencos ${ch.rosterLocked ? 'travados' : `travam em ${formatDateTime(ch.rosterLockAt)}`}`}
        </p>
        <p className="small">
          <Link to={`/campeonatos/${id}/regras`}>
            {ch.canManage ? 'Regras do campeonato' : 'Ver regras'}
          </Link>
        </p>
      </section>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'on' : ''}
            onClick={() => select(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'inscricoes' && <RegistrationsTab ch={ch} onChange={reload} />}
      {tab === 'jogos' && <MatchesTab ch={ch} onChange={reload} />}
      {tab === 'classificacao' && <StandingsTab id={id} />}
      {tab === 'chave' && <BracketTab id={id} />}
      {tab === 'rankings' && <LeaderboardsTab id={id} />}
    </div>
  );
}
