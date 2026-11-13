import type { Match, MatchCandidates, MatchRoster, TeamSide } from '../../lib/api/contract';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button, Group, ErrorState, Notice, PageHeader, Skeleton } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { sportOf } from '../../lib/sports';
import { useAsync } from '../../lib/useAsync';

interface Pick {
  selected: boolean;
  number: string;
  isStarter: boolean;
}
type Picks = Record<string, Pick>;

interface Loaded {
  match: Match;
  roster: MatchRoster;
  candidates: MatchCandidates;
}

async function load(id: string): Promise<Loaded> {
  const [s, candidates] = await Promise.all([api.state(id), api.candidates(id)]);
  return { match: s.match, roster: s.roster, candidates };
}

/** Máximo de relacionados pelas regras da partida (sem limite se a regra não existir). */
function rosterMax(match: Match): number {
  const max = (match.rules as Record<string, unknown>)['rosterMax'];
  return typeof max === 'number' ? max : Infinity;
}

function initialPicks(data: Loaded, side: TeamSide): Picks {
  const saved = new Map(data.roster[side].roster.map((r) => [r.athleteId, r]));
  const max = rosterMax(data.match);
  return Object.fromEntries(
    data.candidates[side].map((p, i) => {
      const s = saved.get(p.athleteId);
      return [
        p.athleteId,
        {
          // Sem escalação salva, já vêm marcados os primeiros do elenco, até o máximo da regra.
          selected: saved.size ? !!s : i < max,
          number: String(s?.number ?? p.number ?? ''),
          isStarter: s?.isStarter ?? false,
        },
      ];
    }),
  );
}

/** Relacionados e titulares de cada equipe; o módulo confere tudo antes de salvar. */
export function Prepare() {
  const { id = '' } = useParams();
  const [data, reload] = useAsync(() => load(id), id);
  if (data.status === 'loading') return <Skeleton lines={8} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  if (data.data.match.status !== 'scheduled') {
    return <Navigate to={`/partidas/${id}/mesa`} replace />;
  }
  return <PrepareForm id={id} data={data.data} />;
}

function PrepareForm({ id, data }: { id: string; data: Loaded }) {
  const [picks, setPicks] = useState<Record<TeamSide, Picks>>(() => ({
    home: initialPicks(data, 'home'),
    away: initialPicks(data, 'away'),
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { match, candidates } = data;
  const teamName = (side: TeamSide) => (side === 'home' ? match.homeTeam : match.awayTeam).name;
  // No campeonato, o número é o do elenco inscrito e não muda aqui.
  const fixedNumbers = match.championshipId !== null;
  const { starters: STARTERS } = sportOf(match.sportKey);

  const update = (side: TeamSide, athleteId: string, change: Partial<Pick>) =>
    setPicks((p) => ({
      ...p,
      [side]: { ...p[side], [athleteId]: { ...p[side][athleteId]!, ...change } },
    }));

  const save = async () => {
    setError('');
    setSaving(true);
    const side = (s: TeamSide) =>
      Object.entries(picks[s])
        .filter(([, p]) => p.selected)
        .map(([athleteId, p]) => ({ athleteId, number: Number(p.number), isStarter: p.isStarter }));
    try {
      await api.putRoster(id, { home: side('home'), away: side('away') });
      navigate(`/partidas/${id}/mesa`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader
        eyebrow="Preparação"
        title={`${teamName('home')} × ${teamName('away')}`}
        meta={`Marque os relacionados e os ${STARTERS} titulares de cada equipe.`}
      />
      <div className="lyt-grid">
        {(['home', 'away'] as const).map((side) => {
          const list = picks[side];
          const starters = Object.values(list).filter((p) => p.selected && p.isStarter).length;
          const selected = Object.values(list).filter((p) => p.selected).length;
          const ready = starters === STARTERS;
          return (
            <section className="ui-stack prepare-team" key={side} aria-labelledby={`prep-${side}`}>
              <div className="ui-section-head">
                <h2 id={`prep-${side}`}>
                  {side === 'home' ? 'A' : 'B'} · {teamName(side)}
                </h2>
                <Notice tone={ready ? 'positive' : 'muted'}>
                  {selected} relacionados · {starters}/{STARTERS} titulares
                </Notice>
              </div>
              {candidates[side].length === 0 ? (
                <Group>
                  <Notice>Nenhum atleta disponível. Cadastre a equipe ou o elenco inscrito.</Notice>
                </Group>
              ) : (
                <ul className="ui-list">
                  {candidates[side].map((p) => {
                    const pick = list[p.athleteId];
                    if (!pick) return null;
                    return (
                      <li key={p.athleteId}>
                        <input
                          type="checkbox"
                          className="ui-check"
                          aria-label={`Relacionar ${p.name}`}
                          checked={pick.selected}
                          onChange={(e) =>
                            update(side, p.athleteId, {
                              selected: e.target.checked,
                              ...(e.target.checked ? {} : { isStarter: false }),
                            })
                          }
                        />
                        <input
                          className="ui-control ui-control--num"
                          inputMode="numeric"
                          aria-label={`Número de ${p.name}`}
                          value={pick.number}
                          readOnly={fixedNumbers}
                          onChange={(e) => update(side, p.athleteId, { number: e.target.value })}
                        />
                        <span className="ui-list__main">
                          <span className="ui-list__title">{p.name}</span>
                        </span>
                        <button
                          type="button"
                          className="ui-toggle"
                          aria-pressed={pick.isStarter}
                          disabled={!pick.selected}
                          onClick={() => update(side, p.athleteId, { isStarter: !pick.isStarter })}
                        >
                          Titular
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="ui-savebar">
        <Button variant="primary" fluid onClick={save} disabled={saving}>
          Ir para a mesa
        </Button>
      </div>
    </div>
  );
}
