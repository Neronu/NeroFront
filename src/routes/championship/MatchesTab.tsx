import type {
  ChampionshipDetail,
  ChampionshipMatch,
  GenerateScheduleRequest,
} from '@neronu/api-contract';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';
import { matchLink } from '../Home';

export function MatchesTab({ ch, onChange }: { ch: ChampionshipDetail; onChange: () => void }) {
  const [matches, reload] = useAsync(() => api.championshipMatches(ch.id), ch.id);
  const { me } = useSession();
  // Membros da organizadora (administradores e mesários) anotam os jogos.
  const canScore = (me?.memberships ?? []).some((m) => m.organization.id === ch.organizer.id);

  const grouped = new Map<string, ChampionshipMatch[]>();
  if (matches.status === 'ok') {
    for (const m of matches.data) {
      const key = `${m.phaseName} · ${m.groupName ? `${m.groupName} · ` : ''}${m.roundName}`;
      grouped.set(key, [...(grouped.get(key) ?? []), m]);
    }
  }

  return (
    <div className="stack">
      {ch.canManage && ch.status === 'registration' && (
        <Generate
          ch={ch}
          onDone={() => {
            reload();
            onChange();
          }}
        />
      )}
      {matches.status === 'error' && <p className="status-error">{matches.message}</p>}
      {matches.status === 'ok' && matches.data.length === 0 && (
        <p className="muted card">A tabela ainda não foi gerada.</p>
      )}
      {[...grouped].map(([title, list]) => (
        <section className="card stack tight" key={title}>
          <h2>{title}</h2>
          <ul className="list">
            {list.map((m) => (
              <li key={m.id} className="match-row">
                <span className="grow">
                  {m.home.teamName} <strong>{m.homeScore ?? ''}</strong> ×{' '}
                  <strong>{m.awayScore ?? ''}</strong> {m.away.teamName}
                  {(m.scheduledAt || m.venue) && (
                    <span className="muted small">
                      {' '}
                      · {[formatDateTime(m.scheduledAt), m.venue].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                {canScore ? (
                  <Link to={matchLink(m)} className="small">
                    {m.status === 'closed'
                      ? 'Súmula'
                      : m.status === 'in_progress'
                        ? 'Mesa'
                        : 'Preparar'}
                  </Link>
                ) : (
                  m.status === 'closed' && <span className="muted small">Encerrado</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Generate({ ch, onDone }: { ch: ChampionshipDetail; onDone: () => void }) {
  const [format, setFormat] = useState<GenerateScheduleRequest['format']>('groups_knockout');
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
    <section className="card stack">
      <h2>Gerar tabela</h2>
      <form onSubmit={submit} className="stack">
        <label>
          Formato
          <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
            <option value="groups_knockout">Grupos + mata-mata</option>
            <option value="round_robin">Pontos corridos</option>
            <option value="knockout">Mata-mata</option>
          </select>
        </label>
        {format === 'groups_knockout' && (
          <div className="row">
            <label>
              Grupos
              <input
                type="number"
                min={2}
                max={8}
                value={groups}
                onChange={(e) => setGroups(Number(e.target.value))}
              />
            </label>
            <label>
              Classificados por grupo
              <input
                type="number"
                min={1}
                max={4}
                value={qualifiers}
                onChange={(e) => setQualifiers(Number(e.target.value))}
              />
            </label>
          </div>
        )}
        {format === 'round_robin' && (
          <label className="row">
            <input
              type="checkbox"
              checked={doubleRound}
              onChange={(e) => setDoubleRound(e.target.checked)}
            />
            Turno e returno
          </label>
        )}
        {error && <p className="status-error">{error}</p>}
        <button type="submit" className="primary">
          Gerar
        </button>
      </form>
    </section>
  );
}
