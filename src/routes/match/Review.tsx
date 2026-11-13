import { useState } from 'react';
import { ChevronLeft, FilePen, FileText } from 'lucide-react';
import { useParams } from 'react-router';
import {
  Button,
  Group,
  DataTable,
  ErrorState,
  Icon,
  Notice,
  PageHeader,
  Skeleton,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { Match } from '../../lib/api/contract';
import { formatDateTime } from '../../lib/dates';
import { sportTable } from '../../lib/match/sport-table';
import { useMatchTable } from '../../lib/match/useMatchTable';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';
import { RectifyDrawer } from './RectifyDrawer';

type Side = 'home' | 'away';

/** Resumo do jogo antes de fechar a súmula; depois de fechada, o PDF. */
export function Review() {
  const { id = '' } = useParams();
  const { table, snapshot, loadError } = useMatchTable(id);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const [rectifying, setRectifying] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  if (loadError) return <ErrorState message={loadError} />;
  if (!snapshot) return <Skeleton lines={8} />;

  const { state, server } = snapshot;
  const closed = server.match.status === 'closed';
  const teamName = (s: Side) => (s === 'home' ? server.match.homeTeam : server.match.awayTeam).name;
  const names = new Map(
    (['home', 'away'] as const).flatMap((s) =>
      server.roster[s].roster.map((r) => [r.athleteId, r.name] as const),
    ),
  );
  const { module } = snapshot.sport;
  const sport = sportTable(snapshot.sport.key);
  const stats = module.playerStats(state);
  const periods = Array.from({ length: state.period }, (_, i) => sport.periodName(state, i + 1));
  const finished = state.status === 'finished';
  const pending = snapshot.pending.length;
  const sides = ['home', 'away'] as const;

  const close = async () => {
    if (!confirm('Fechar a súmula? Depois disso, nenhum lance pode ser alterado na mesa.')) return;
    setClosing(true);
    setError('');
    try {
      await api.close(id);
      table.markClosed(await api.state(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="ui-stack ui-stack--section">
      {!closed && (
        <div>
          <Button to={`/partidas/${id}/mesa`} variant="quiet">
            <Icon icon={ChevronLeft} />
            Voltar à mesa
          </Button>
        </div>
      )}
      <PageHeader eyebrow="Súmula" title="Conferência" />

      {/* Placar: um dos dois usos de court, sempre bloco cheio; números em gold. */}
      <section className="review-score on-court" aria-label="Placar final">
        <span className="review-score__team">{teamName('home')}</span>
        <span className="t-score review-score__value">
          {state.teams.home.score}
          <span aria-hidden="true"> : </span>
          <span className="sr-only"> a </span>
          {state.teams.away.score}
        </span>
        <span className="review-score__team">{teamName('away')}</span>
      </section>

      <DataTable
        caption="Pontos por período"
        mode="scroll"
        rows={[...sides]}
        rowKey={(s) => s}
        columns={[
          { key: 'team', header: 'Equipe', lead: true, render: (s) => teamName(s) },
          ...periods.map((p, i) => ({
            key: p,
            header: sport.shortPeriod(p),
            title: p,
            numeric: true,
            render: (s: (typeof sides)[number]) => state.teams[s].scoreByPeriod[i] ?? 0,
          })),
          {
            key: 'total',
            header: 'T',
            title: 'Total',
            numeric: true,
            render: (s) => <strong>{state.teams[s].score}</strong>,
          },
        ]}
      />

      {sides.map((s) => (
        <section className="ui-stack" key={s} aria-labelledby={`review-${s}`}>
          <h2 id={`review-${s}`}>{teamName(s)}</h2>
          <DataTable
            caption={`Estatísticas · ${teamName(s)}`}
            mode="scroll"
            rows={stats.filter((l) => l.side === s)}
            rowKey={(l) => l.athleteId}
            columns={[
              { key: 'num', header: 'Nº', numeric: true, render: (l) => l.number },
              { key: 'name', header: 'Atleta', lead: true, render: (l) => names.get(l.athleteId) },
              ...module.statsSchema.map((c) => ({
                key: c.key,
                header: c.short,
                title: c.label,
                numeric: true,
                render: (l: (typeof stats)[number]) => l.stats[c.key],
              })),
            ]}
          />
        </section>
      ))}

      <Group className="ui-stack">
        {closed ? (
          <>
            <Notice tone="positive">Súmula fechada.</Notice>
            <RectifyAction match={server.match} onOpen={() => setRectifying(true)} />
            <SheetHistory matchId={id} refreshKey={historyKey} />
          </>
        ) : (
          <>
            {!finished && <Notice>Encerre o último período na mesa antes de fechar.</Notice>}
            {pending > 0 && (
              <Notice>{pending} lance(s) ainda não enviados. Aguarde a conexão para fechar.</Notice>
            )}
            {error && <Notice tone="danger">{error}</Notice>}
            <div className="ui-savebar">
              <Button
                variant="primary"
                fluid
                disabled={!finished || pending > 0 || closing}
                onClick={close}
              >
                {closing ? 'Fechando…' : 'Fechar súmula e gerar PDF'}
              </Button>
            </div>
          </>
        )}
      </Group>
      {closed && rectifying && (
        <RectifyDrawer
          open
          onClose={() => setRectifying(false)}
          snapshot={snapshot}
          onDone={() => {
            setRectifying(false);
            setHistoryKey((k) => k + 1);
            void table.load();
          }}
        />
      )}
    </div>
  );
}

/**
 * Só a organizadora retifica: num jogo de campeonato, quem administra o campeonato; numa
 * partida avulsa, a atlética dona. A API confere de novo.
 */
function useCanRectify(match: Match): boolean {
  const { organizations } = useSession();
  const [ch] = useAsync(
    () => (match.championshipId ? api.championship(match.championshipId) : Promise.resolve(null)),
    match.championshipId ?? '',
  );
  if (match.championshipId) return ch.status === 'ok' && !!ch.data?.canManage;
  return organizations.some((o) => o.id === match.organizationId);
}

function RectifyAction({ match, onOpen }: { match: Match; onOpen(): void }) {
  if (!useCanRectify(match)) return null;
  return (
    <div>
      <Button variant="secondary" onClick={onOpen}>
        <Icon icon={FilePen} />
        Retificar súmula
      </Button>
    </div>
  );
}

/** Histórico de revisões (E11): cada uma com placar, motivo, autor e o PDF. */
function SheetHistory({ matchId, refreshKey }: { matchId: string; refreshKey: number }) {
  const [sheets, reload] = useAsync(() => api.sheets(matchId), `${matchId}:${refreshKey}`);
  const [error, setError] = useState('');
  if (sheets.status === 'loading') return <Skeleton lines={2} />;
  if (sheets.status === 'error') return <ErrorState message={sheets.message} onRetry={reload} />;
  const latest = Math.max(...sheets.data.map((s) => s.revision));

  return (
    <section className="ui-stack" aria-labelledby="sheet-history">
      <h2 id="sheet-history">Revisões da súmula</h2>
      {error && <Notice tone="danger">{error}</Notice>}
      <ol className="ui-list" aria-labelledby="sheet-history">
        {[...sheets.data].reverse().map((sh) => {
          const changes =
            sh.revision > 1
              ? [
                  sh.changes.added.length > 0 && `${sh.changes.added.length} incluído(s)`,
                  sh.changes.voided.length > 0 && `${sh.changes.voided.length} anulado(s)`,
                ]
                  .filter(Boolean)
                  .join(', ')
              : '';
          return (
            <li key={sh.revision}>
              <span className="ui-list__main">
                <span className="ui-list__title">
                  Revisão {sh.revision}
                  {sh.revision === 1 ? ' · fechamento' : ' · retificação'}
                  {sh.revision === latest && ' · atual'}
                </span>
                <span className="ui-list__meta">
                  Placar{' '}
                  <span className="t-stat">
                    {sh.homeScore} × {sh.awayScore}
                  </span>{' '}
                  · {formatDateTime(sh.createdAt)}
                  {sh.createdBy && ` · ${sh.createdBy.name}`}
                </span>
                {sh.reason && <span className="ui-list__meta">Motivo: {sh.reason}</span>}
                {changes && <span className="ui-list__meta">Lances: {changes}</span>}
              </span>
              {sh.hasPdf ? (
                <Button
                  variant="quiet"
                  onClick={() =>
                    api
                      .openSheet(matchId, sh.revision)
                      .catch(() => setError('Erro ao abrir o PDF. Tente de novo.'))
                  }
                >
                  <Icon icon={FileText} />
                  PDF
                </Button>
              ) : (
                <span className="t-small t-muted">PDF em geração</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
