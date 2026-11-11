import type { OrganizationAthlete, Registration } from '@neronu/api-contract';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useAsync } from '../../lib/useAsync';

async function load(id: string) {
  const reg = await api.registration(id);
  const athletes = reg.canEditRoster ? await api.orgAthletes(reg.organization.id) : [];
  return { reg, athletes };
}

/** Elenco inscrito: atletas da entidade com o número de camisa do campeonato. */
export function RegistrationRoster() {
  const { id = '' } = useParams();
  const [data] = useAsync(() => load(id), id);
  if (data.status === 'loading') return <p className="muted">Carregando…</p>;
  if (data.status === 'error') return <p className="status-error">{data.message}</p>;
  return <RosterEditor reg={data.data.reg} athletes={data.data.athletes} />;
}

function RosterEditor({ reg, athletes }: { reg: Registration; athletes: OrganizationAthlete[] }) {
  const initial = new Map((reg.roster ?? []).map((r) => [r.athleteId, String(r.number)]));
  const [picks, setPicks] = useState<Map<string, string>>(initial);
  const [msg, setMsg] = useState('');
  const teamNumber = (a: OrganizationAthlete) => a.teams.find((t) => t.id === reg.team.id)?.number;

  const toggle = (a: OrganizationAthlete, on: boolean) =>
    setPicks((p) => {
      const next = new Map(p);
      if (on) next.set(a.id, String(teamNumber(a) ?? ''));
      else next.delete(a.id);
      return next;
    });

  const save = async () => {
    try {
      await api.putRegistrationRoster(reg.id, {
        entries: [...picks].map(([athleteId, number]) => ({ athleteId, number: Number(number) })),
      });
      setMsg('Elenco salvo.');
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  return (
    <section className="card stack">
      <div className="row between">
        <h1>Elenco · {reg.team.name}</h1>
        <Link to={`/campeonatos/${reg.championshipId}`}>‹ Campeonato</Link>
      </div>
      {!reg.canEditRoster ? (
        <>
          <ul className="list">
            {(reg.roster ?? []).map((r) => (
              <li key={r.athleteId} className="row">
                <span className="jersey">{r.number}</span>
                {r.name}
              </li>
            ))}
          </ul>
          <p className="muted small">
            O elenco não pode ser alterado por você (ou já está travado).
          </p>
        </>
      ) : (
        <>
          <p className="muted small">
            {picks.size} atletas. Atletas da equipe aparecem primeiro; qualquer atleta da{' '}
            {reg.organization.name} pode ser inscrito.
          </p>
          <ul className="list">
            {[...athletes]
              .sort(
                (a, b) =>
                  Number(teamNumber(b) !== undefined) - Number(teamNumber(a) !== undefined) ||
                  a.name.localeCompare(b.name),
              )
              .map((a) => (
                <li key={a.id} className="row">
                  <input
                    type="checkbox"
                    aria-label={`Inscrever ${a.name}`}
                    checked={picks.has(a.id)}
                    onChange={(e) => toggle(a, e.target.checked)}
                  />
                  <input
                    className="num-input"
                    inputMode="numeric"
                    aria-label={`Número de ${a.name}`}
                    disabled={!picks.has(a.id)}
                    value={picks.get(a.id) ?? ''}
                    onChange={(e) => setPicks((p) => new Map(p).set(a.id, e.target.value))}
                  />
                  <span className="grow">{a.name}</span>
                </li>
              ))}
          </ul>
          {msg && <p className={msg === 'Elenco salvo.' ? 'status-ok' : 'status-error'}>{msg}</p>}
          <button className="primary" onClick={save}>
            Salvar elenco
          </button>
        </>
      )}
    </section>
  );
}
