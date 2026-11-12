import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Button,
  Card,
  ErrorState,
  Notice,
  PageHeader,
  SelectField,
  Skeleton,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { AcceptTransferRequest, TransferAthlete } from '../../lib/api/contract';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

/** O que acontece com cada atleta ao aceitar, conforme o e-mail e a escolha da entidade. */
function outcome(a: TransferAthlete, mergeInto: string | null): string {
  if (a.autoMergeInto) return `Unificado com ${a.autoMergeInto.name} (mesmo e-mail)`;
  if (mergeInto) {
    const c = a.candidates.find((x) => x.athleteId === mergeInto);
    return `Unificado com ${c?.name ?? 'atleta escolhido'}`;
  }
  return 'Entra como atleta novo';
}

/** Decisões a enviar: só atletas sem e-mail que têm candidatos de mesmo nome. */
export function buildDecisions(
  athletes: TransferAthlete[],
  choices: Record<string, string>,
): NonNullable<AcceptTransferRequest['decisions']> {
  return athletes
    .filter((a) => !a.autoMergeInto && a.candidates.length > 0)
    .map((a) => ({ athleteId: a.athleteId, mergeInto: choices[a.athleteId] || null }));
}

/**
 * Destino do link de transferência (E10): a entidade recebe a equipe convidada, com súmulas e
 * estatísticas. Atletas com o mesmo e-mail são unificados sozinhos; os sem e-mail com nome igual
 * a um atleta da entidade ficam à escolha: unificar ou manter separado.
 */
export function TransferAccept() {
  const { token = '' } = useParams();
  const { refresh, selectOrg } = useSession();
  const navigate = useNavigate();
  const [preview] = useAsync(() => api.transfer(token), token);
  const [orgId, setOrgId] = useState('');
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (preview.status === 'loading') return <Skeleton lines={4} />;
  if (preview.status === 'error')
    return <ErrorState title="Transferência inválida" message={preview.message} />;
  const { team, from, acceptedBy, destinations } = preview.data;
  const dest = destinations.find((d) => d.organization.id === orgId) ?? destinations[0];

  const accept = async () => {
    if (!dest) return;
    setBusy(true);
    setError('');
    try {
      await api.acceptTransfer(token, {
        organizationId: dest.organization.id,
        decisions: buildDecisions(dest.athletes, choices),
      });
      await refresh();
      selectOrg(dest.organization.id);
      navigate(`/equipes/${team.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="ui-stack">
      <PageHeader eyebrow="Transferência de equipe" title={team.name} />
      <Card className="ui-stack">
        <p>
          A <strong>{from.name}</strong> cadastrou esta equipe como convidada. Ao aceitar, ela passa
          para a sua entidade com as súmulas e estatísticas já registradas.
        </p>
        {acceptedBy ? (
          <Notice tone="positive">Esta equipe já foi transferida para a {acceptedBy.name}.</Notice>
        ) : !dest ? (
          <p>
            Você precisa administrar uma atlética para receber a equipe. Atléticas são cadastradas
            pela administração do Neronu: peça ao responsável pela sua que entre em contato.
          </p>
        ) : (
          <>
            {destinations.length > 1 && (
              <SelectField
                label="Entidade de destino"
                value={dest.organization.id}
                onChange={(e) => {
                  setOrgId(e.target.value);
                  setChoices({});
                }}
              >
                {destinations.map((d) => (
                  <option key={d.organization.id} value={d.organization.id}>
                    {d.organization.name}
                  </option>
                ))}
              </SelectField>
            )}
            <section className="ui-stack" aria-labelledby="transfer-athletes">
              <h2 id="transfer-athletes">Atletas</h2>
              <ul className="ui-list" aria-labelledby="transfer-athletes">
                {dest.athletes.map((a) => {
                  const chosen = choices[a.athleteId] || null;
                  const choosable = !a.autoMergeInto && a.candidates.length > 0;
                  return (
                    <li key={a.athleteId}>
                      <span className="ui-list__main">
                        <span className="ui-list__title">
                          {a.number != null && <span className="t-stat">{a.number} </span>}
                          {a.name}
                        </span>
                        <span className="ui-list__meta">{outcome(a, chosen)}</span>
                      </span>
                      {choosable && (
                        <div className="ui-list__full">
                          <SelectField
                            label={`O que fazer com ${a.name}`}
                            help="Sem e-mail: a entidade tem um atleta com o mesmo nome."
                            value={chosen ?? ''}
                            onChange={(e) =>
                              setChoices({ ...choices, [a.athleteId]: e.target.value })
                            }
                          >
                            <option value="">Manter separado</option>
                            {a.candidates.map((c) => (
                              <option key={c.athleteId} value={c.athleteId}>
                                Unificar com {c.name}
                              </option>
                            ))}
                          </SelectField>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
            {error && <Notice tone="danger">{error}</Notice>}
            <Button variant="primary" block disabled={busy} onClick={() => void accept()}>
              Receber equipe na {dest.organization.name}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
