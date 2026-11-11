import type { Match, MatchCandidates, MatchRoster, TeamSide } from '@neronu/api-contract';
import { STARTERS } from '@neronu/sport-basketball';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
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

function initialPicks(data: Loaded, side: TeamSide): Picks {
  const saved = new Map(data.roster[side].roster.map((r) => [r.athleteId, r]));
  return Object.fromEntries(
    data.candidates[side].map((p) => {
      const s = saved.get(p.athleteId);
      return [
        p.athleteId,
        {
          selected: saved.size ? !!s : true,
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
  const [data] = useAsync(() => load(id), id);
  if (data.status === 'loading') return <p className="muted">Carregando…</p>;
  if (data.status === 'error') return <p className="status-error">{data.message}</p>;
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
    <div className="stack">
      {(['home', 'away'] as const).map((side) => {
        const list = picks[side];
        const starters = Object.values(list).filter((p) => p.selected && p.isStarter).length;
        const selected = Object.values(list).filter((p) => p.selected).length;
        return (
          <section className="card stack" key={side}>
            <div className="row between">
              <h2>
                {side === 'home' ? 'A' : 'B'} · {teamName(side)}
              </h2>
              <span className={starters === STARTERS ? 'status-ok small' : 'status-warn small'}>
                {selected} relacionados · {starters}/{STARTERS} titulares
              </span>
            </div>
            {candidates[side].length === 0 && (
              <p className="status-warn">
                Nenhum atleta disponível: cadastre a equipe ou o elenco inscrito.
              </p>
            )}
            <ul className="list">
              {candidates[side].map((p) => {
                const pick = list[p.athleteId];
                if (!pick) return null;
                return (
                  <li key={p.athleteId} className="row">
                    <input
                      type="checkbox"
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
                      className="num-input"
                      inputMode="numeric"
                      aria-label={`Número de ${p.name}`}
                      value={pick.number}
                      readOnly={fixedNumbers}
                      onChange={(e) => update(side, p.athleteId, { number: e.target.value })}
                    />
                    <span className="grow">{p.name}</span>
                    <button
                      type="button"
                      className={pick.isStarter ? 'chip on' : 'chip'}
                      disabled={!pick.selected}
                      onClick={() => update(side, p.athleteId, { isStarter: !pick.isStarter })}
                    >
                      Titular
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {error && <p className="status-error">{error}</p>}
      <button className="primary big" onClick={save} disabled={saving}>
        Ir para a mesa
      </button>
    </div>
  );
}
