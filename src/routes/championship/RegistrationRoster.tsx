import type { OrganizationAthlete, Registration } from '../../lib/api/contract';
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useParams } from 'react-router';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Notice,
  PageHeader,
  Skeleton,
} from '../../components/ui';
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
  const [data, reload] = useAsync(() => load(id), id);
  if (data.status === 'loading') return <Skeleton lines={6} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  return <RosterEditor reg={data.data.reg} athletes={data.data.athletes} />;
}

function RosterEditor({ reg, athletes }: { reg: Registration; athletes: OrganizationAthlete[] }) {
  const initial = new Map((reg.roster ?? []).map((r) => [r.athleteId, String(r.number)]));
  const [picks, setPicks] = useState<Map<string, string>>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
      setMsg({ ok: true, text: 'Elenco salvo.' });
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };

  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      <div>
        <Button to={`/campeonatos/${reg.championshipId}`} variant="quiet">
          <Icon icon={ChevronLeft} />
          Campeonato
        </Button>
      </div>
      <PageHeader
        eyebrow="Elenco inscrito"
        title={reg.team.name}
        meta={
          reg.canEditRoster
            ? `${picks.size} atletas. Atletas da equipe aparecem primeiro; qualquer atleta da ${reg.organization.name} pode ser inscrito.`
            : undefined
        }
      />
      {!reg.canEditRoster ? (
        <>
          {(reg.roster ?? []).length === 0 ? (
            <EmptyState>Nenhum atleta inscrito.</EmptyState>
          ) : (
            <ul className="ui-list" aria-label="Elenco">
              {(reg.roster ?? []).map((r) => (
                <li key={r.athleteId}>
                  <span className="ui-jersey">{r.number}</span>
                  <span className="ui-list__main">
                    <span className="ui-list__title">{r.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Notice>O elenco não pode ser alterado por você ou já está travado.</Notice>
        </>
      ) : (
        <>
          <ul className="ui-list" aria-label="Atletas da entidade">
            {[...athletes]
              .sort(
                (a, b) =>
                  Number(teamNumber(b) !== undefined) - Number(teamNumber(a) !== undefined) ||
                  a.name.localeCompare(b.name),
              )
              .map((a) => (
                <li key={a.id}>
                  <input
                    type="checkbox"
                    className="ui-check"
                    aria-label={`Inscrever ${a.name}`}
                    checked={picks.has(a.id)}
                    onChange={(e) => toggle(a, e.target.checked)}
                  />
                  <input
                    className="ui-control ui-control--num"
                    inputMode="numeric"
                    aria-label={`Número de ${a.name}`}
                    disabled={!picks.has(a.id)}
                    value={picks.get(a.id) ?? ''}
                    onChange={(e) => setPicks((p) => new Map(p).set(a.id, e.target.value))}
                  />
                  <span className="ui-list__main">
                    <span className="ui-list__title">{a.name}</span>
                  </span>
                </li>
              ))}
          </ul>
          {msg && <Notice tone={msg.ok ? 'positive' : 'danger'}>{msg.text}</Notice>}
          <div className="ui-savebar">
            <Button variant="primary" onClick={save}>
              Salvar elenco
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
