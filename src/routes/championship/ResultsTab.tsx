import type {
  ChampionshipDetail,
  ChampionshipMatch,
  GenerateScheduleRequest,
} from '../../lib/api/contract';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Group,
  EmptyState,
  ErrorState,
  LiveBadge,
  Notice,
  SelectField,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import {
  CHAMPIONSHIP_FORMATS,
  championshipFormatName,
  dayKey,
  dayLabel,
  timeLabel,
} from '../../lib/format';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';
import { usePolling } from '../../lib/usePolling';
import { matchLink } from '../../components/MatchList';

/** Agrupa por dia (no fuso do aparelho), em ordem; jogos sem data vão para o fim. */
export function groupByDay(matches: ChampionshipMatch[]): [string | null, ChampionshipMatch[]][] {
  const byDay = new Map<string | null, ChampionshipMatch[]>();
  const sorted = [...matches].sort((a, b) => {
    if (a.scheduledAt === b.scheduledAt) return 0;
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return a.scheduledAt < b.scheduledAt ? -1 : 1;
  });
  for (const m of sorted) {
    const key = dayKey(m.scheduledAt);
    byDay.set(key, [...(byDay.get(key) ?? []), m]);
  }
  return [...byDay];
}

/** Intervalo da atualização dos placares enquanto houver jogo ao vivo. */
export const LIVE_REFRESH_MS = 5_000;

/**
 * Aba Resultados: lista limpa de jogos por data. O único elemento colorido é o selo "Ao vivo".
 * Com jogo em andamento, os placares se atualizam sozinhos; relógio e posse ficam só na mesa.
 */
export function ResultsTab({ ch, onChange }: { ch: ChampionshipDetail; onChange: () => void }) {
  const [matches, reload] = useAsync(() => api.championshipMatches(ch.id), ch.id);
  const live = matches.status === 'ok' && matches.data.some((m) => m.status === 'in_progress');
  usePolling(reload, LIVE_REFRESH_MS, live);
  const { organizations } = useSession();
  // A atlética organizadora anota os jogos.
  const canScore = organizations.some((o) => o.id === ch.organizer.id);

  return (
    <div className="ui-stack ui-stack--section">
      {ch.canManage && ch.status === 'registration' && (
        <Generate
          ch={ch}
          onDone={() => {
            reload();
            onChange();
          }}
        />
      )}
      {matches.status === 'loading' && <Skeleton lines={5} />}
      {matches.status === 'error' && <ErrorState message={matches.message} onRetry={reload} />}
      {matches.status === 'ok' && matches.data.length === 0 && (
        <EmptyState>
          {ch.canManage
            ? 'Nenhum jogo marcado. Monte a tabela para começar.'
            : 'Nenhum jogo marcado ainda.'}
        </EmptyState>
      )}
      {matches.status === 'ok' &&
        groupByDay(matches.data).map(([day, list]) => (
          <section
            className="ui-stack"
            key={day ?? 'sem-data'}
            aria-label={day ? dayLabel(day) : 'Sem data'}
          >
            <h3 className="ch-day">{day ? dayLabel(day) : 'Sem data'}</h3>
            <div className="ch-games">
              {list.map((m) => (
                <Game key={m.id} m={m} canScore={canScore} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

function Game({ m, canScore }: { m: ChampionshipMatch; canScore: boolean }) {
  const scheduled = m.status === 'scheduled';
  const hasScore = !scheduled && m.homeScore !== null && m.awayScore !== null;
  const winner =
    m.status === 'closed' && hasScore && m.homeScore !== m.awayScore
      ? m.homeScore! > m.awayScore!
        ? 'home'
        : 'away'
      : null;
  const weight = (side: 'home' | 'away') =>
    winner === null ? '' : winner === side ? 'is-winner' : 'is-loser';
  const meta = [m.phaseName, m.groupName, m.roundName, m.venue].filter(Boolean).join(' · ');
  const sheet = m.status === 'closed' ? 'Súmula' : m.status === 'in_progress' ? 'Mesa' : 'Preparar';

  return (
    <article className="ch-game">
      <div className="ch-game__meta">
        <span>{meta}</span>
        {m.status === 'in_progress' && <LiveBadge />}
      </div>
      <div className="ch-game__body">
        <table className="ch-game__table">
          <caption className="sr-only">
            {m.home.teamName}
            {hasScore ? ` ${m.homeScore} a ${m.awayScore} ` : ' contra '}
            {m.away.teamName}
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Equipe</th>
              <th scope="col">{scheduled ? 'Horário' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {(['home', 'away'] as const).map((side, i) => (
              <tr key={side} className={weight(side)}>
                <th scope="row" className="ch-game__team">
                  {m[side].teamName}
                </th>
                {scheduled ? (
                  i === 0 && (
                    <td rowSpan={2} className="ch-game__time">
                      {m.scheduledAt ? timeLabel(m.scheduledAt) : 'A definir'}
                    </td>
                  )
                ) : (
                  <td className="ch-game__total">
                    {side === 'home' ? (m.homeScore ?? '') : (m.awayScore ?? '')}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pontos por período e cestinha de cada equipe entram quando o contrato trouxer. */}
        <div className="ch-game__side">
          {!scheduled && m.scheduledAt && (
            <span className="ch-game__when">{timeLabel(m.scheduledAt)}</span>
          )}
          {canScore && (
            <Link to={matchLink(m)} className="ch-game__link">
              {sheet}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function Generate({ ch, onDone }: { ch: ChampionshipDetail; onDone: () => void }) {
  // Campeonatos criados antes do formato existir ainda escolhem aqui.
  const [format, setFormat] = useState<GenerateScheduleRequest['format']>(
    ch.format ?? 'groups_knockout',
  );
  const [groups, setGroups] = useState(2);
  const [qualifiers, setQualifiers] = useState(2);
  const [doubleRound, setDoubleRound] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: GenerateScheduleRequest =
      format === 'groups_knockout'
        ? { format, groups, qualifiersPerGroup: qualifiers }
        : format === 'round_robin'
          ? { format, doubleRound }
          : { format };
    if (!confirm('Gerar a tabela com as inscrições aprovadas? As inscrições serão encerradas.'))
      return;
    try {
      await api.generateSchedule(ch.id, body);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Group>
      <form onSubmit={submit} className="ui-form">
        <h3>Montar a tabela</h3>
        <p className="t-small t-muted">
          Usa as inscrições aprovadas. Depois de gerada, as inscrições se encerram.
        </p>
        {ch.format ? (
          <p className="t-small">
            Formato da disputa: <strong>{championshipFormatName(ch.format)}</strong>
          </p>
        ) : (
          <SelectField
            label="Formato"
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
          >
            {CHAMPIONSHIP_FORMATS.map((f) => (
              <option key={f} value={f}>
                {championshipFormatName(f)}
              </option>
            ))}
          </SelectField>
        )}
        {format === 'groups_knockout' && (
          <div className="ui-form-row">
            <TextField
              label="Grupos"
              type="number"
              min={2}
              max={8}
              value={groups}
              onChange={(e) => setGroups(Number(e.target.value))}
            />
            <TextField
              label="Classificados por grupo"
              type="number"
              min={1}
              max={4}
              value={qualifiers}
              onChange={(e) => setQualifiers(Number(e.target.value))}
            />
          </div>
        )}
        {format === 'round_robin' && (
          <label className="ui-checkline">
            <input
              type="checkbox"
              className="ui-check"
              checked={doubleRound}
              onChange={(e) => setDoubleRound(e.target.checked)}
            />
            Turno e returno
          </label>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
        <div>
          <Button type="submit" variant="primary" fluid>
            Gerar tabela
          </Button>
        </div>
      </form>
    </Group>
  );
}
