import type { ChampionshipDetail, Registration } from '../../lib/api/contract';
import { Copy, Link2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Notice,
  SelectField,
  Skeleton,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';
import { PublicationConsentCheck } from '../org/PublicationConsent';

/** Situação da inscrição: positivo e perigo sempre com palavra e ícone, nunca só cor. */
function RegistrationStatus({ status }: { status: Registration['status'] }) {
  if (status === 'approved') return <Notice tone="positive">Aprovada</Notice>;
  if (status === 'rejected')
    return (
      <Notice tone="danger" role="status">
        Recusada
      </Notice>
    );
  return <Notice>Aguardando aprovação</Notice>;
}

type Msg = { ok: boolean; text: string } | null;

/** Aba Equipes: inscrições, elencos, convites e equipes convidadas. */
export function TeamsTab({ ch, onChange }: { ch: ChampionshipDetail; onChange: () => void }) {
  const [regs, reload] = useAsync(() => api.registrations(ch.id), ch.id);
  const [error, setError] = useState('');
  const open = ch.status === 'registration';
  const { status } = useSession();
  const location = useLocation();
  const next = encodeURIComponent(location.pathname + location.search);

  const decide = async (r: Registration, status: 'approved' | 'rejected') => {
    try {
      await api.decideRegistration(r.id, status);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="ui-stack ui-stack--section">
      <section className="ui-stack" aria-labelledby="teams-registered">
        <h3 id="teams-registered">Equipes inscritas</h3>
        {regs.status === 'loading' && <Skeleton lines={3} />}
        {regs.status === 'error' && <ErrorState message={regs.message} onRetry={reload} />}
        {regs.status === 'ok' && regs.data.length === 0 && (
          <EmptyState>
            {open && ch.canManage
              ? 'Nenhuma inscrição ainda. Inscreva uma equipe ou convide outras atléticas.'
              : open
                ? 'Nenhuma equipe confirmada ainda.'
                : 'Nenhuma equipe inscrita.'}
          </EmptyState>
        )}
        {regs.status === 'ok' && regs.data.length > 0 && (
          <ul className="ui-list" aria-label="Equipes inscritas">
            {regs.data.map((r) => (
              <li key={r.id}>
                <span className="ui-list__main">
                  <span className="ui-list__title">{r.team.name}</span>
                  <span className="ui-list__meta">
                    {r.organization.name}
                    {r.organization.isGuest && ' · convidada'}
                    {r.organization.isPersonal && ' · equipe independente'}
                  </span>
                </span>
                <RegistrationStatus status={r.status} />
                <span className="ch-reg-actions">
                  {r.roster !== null && (
                    <Button to={`/inscricoes/${r.id}`} variant="quiet">
                      {r.canEditRoster ? 'Editar elenco' : 'Ver elenco'} ({r.roster.length})
                    </Button>
                  )}
                  {ch.canManage && open && r.status !== 'approved' && (
                    <Button variant="secondary" onClick={() => decide(r, 'approved')}>
                      Aprovar
                    </Button>
                  )}
                  {ch.canManage && open && r.status !== 'rejected' && (
                    <Button variant="danger-text" onClick={() => decide(r, 'rejected')}>
                      Recusar
                    </Button>
                  )}
                </span>
                {ch.canManage && r.organization.isGuest && <TransferLink teamId={r.team.id} />}
              </li>
            ))}
          </ul>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </section>

      {open && ch.myOrganizations.length > 0 && <RegisterTeam ch={ch} onDone={reload} />}
      {open && status === 'anonymous' && (
        <Notice>
          Sua atlética foi convidada? <Link to={`/entrar?next=${next}`}>Entre</Link> para inscrever
          uma equipe.
        </Notice>
      )}
      {ch.canManage && <Invites ch={ch} onChange={onChange} />}
      {ch.canManage && open && <GuestTeam ch={ch} onDone={reload} />}
    </div>
  );
}

function RegisterTeam({ ch, onDone }: { ch: ChampionshipDetail; onDone: () => void }) {
  const [orgId, setOrgId] = useState(ch.myOrganizations[0]!.id);
  const [teams] = useAsync(() => api.teams(orgId), orgId);
  const [teamId, setTeamId] = useState('');
  const [msg, setMsg] = useState<Msg>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.registerTeam(ch.id, teamId);
      setMsg({ ok: true, text: 'Inscrição enviada. Monte o elenco e aguarde a aprovação.' });
      setTeamId('');
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };

  return (
    <Card>
      <form onSubmit={submit} className="ui-form">
        <h3>Inscrever equipe</h3>
        <div className="ui-form-row">
          {ch.myOrganizations.length > 1 && (
            <SelectField label="Atlética" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {ch.myOrganizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.isPersonal ? 'Suas equipes' : o.name}
                </option>
              ))}
            </SelectField>
          )}
          <SelectField
            label="Equipe"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
          >
            <option value="">Escolha…</option>
            {teams.status === 'ok' &&
              teams.data.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </SelectField>
          <Button type="submit" variant="primary">
            Inscrever equipe
          </Button>
        </div>
        {msg && <Notice tone={msg.ok ? 'positive' : 'danger'}>{msg.text}</Notice>}
      </form>
    </Card>
  );
}

function Invites({ ch, onChange }: { ch: ChampionshipDetail; onChange: () => void }) {
  const [invites, reload] = useAsync(() => api.invites(ch.id), ch.id);
  const [copied, setCopied] = useState('');
  const url = (path: string) => `${window.location.origin}${path}`;
  const copy = (token: string, path: string) =>
    navigator.clipboard?.writeText(url(path)).then(
      () => setCopied(token),
      () => {},
    );

  const create = async () => {
    const inv = await api.createInvite(ch.id);
    reload();
    await copy(inv.token, inv.path);
  };

  return (
    <section className="ui-stack" aria-labelledby="teams-invites">
      <div className="ui-section-head">
        <h3 id="teams-invites">Convites</h3>
        <Button variant="secondary" onClick={create}>
          <Icon icon={Link2} />
          Gerar link
        </Button>
      </div>
      <p className="t-small t-muted">
        Cada link vale para uma atlética. Envie para a convidada; o link é copiado ao ser gerado.
      </p>
      {invites.status === 'ok' && invites.data.length > 0 && (
        <ul className="ui-list" aria-label="Convites">
          {invites.data.map((i) => (
            <li key={i.token}>
              {i.acceptedBy ? (
                <Notice tone="positive">Aceito por {i.acceptedBy.name}</Notice>
              ) : (
                <>
                  <code className="ui-list__main ch-invite-url">{url(i.path)}</code>
                  <Button variant="quiet" onClick={() => copy(i.token, i.path)}>
                    <Icon icon={Copy} />
                    {copied === i.token ? 'Copiado' : 'Copiar'}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {ch.participants.length > 1 && (
        <p className="t-small t-muted">
          Participantes: {ch.participants.map((p) => p.name).join(', ')}.{' '}
          <Button variant="quiet" onClick={onChange}>
            Atualizar lista
          </Button>
        </p>
      )}
    </section>
  );
}

/** Equipe convidada sem conta: a organizadora cadastra tudo, um atleta por linha. */
function GuestTeam({ ch, onDone }: { ch: ChampionshipDetail; onDone: () => void }) {
  const [orgName, setOrgName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [lines, setLines] = useState('');
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const parse = () =>
    lines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        // E-mail opcional no fim da linha: liga o atleta à conta dele e unifica na transferência.
        const m = l.match(/^(\d{1,2})\s+(.+?)(?:\s+(\S+@\S+))?$/);
        if (!m) return null;
        return { number: Number(m[1]), name: m[2]!.trim(), ...(m[3] ? { email: m[3] } : {}) };
      });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const athletes = parse();
    if (athletes.some((a) => a === null) || athletes.length === 0) {
      setMsg({
        ok: false,
        text: 'Use uma linha por atleta: número, nome e, se quiser, e-mail (ex.: "7 Ana Souza").',
      });
      return;
    }
    try {
      await api.createGuestTeam(ch.id, {
        organizationName: orgName,
        teamName: teamName || orgName,
        athletes: athletes as { number: number; name: string; email?: string }[],
        publicationConsent: consent,
      });
      setOrgName('');
      setTeamName('');
      setLines('');
      setConsent(false);
      setMsg({ ok: true, text: 'Equipe convidada inscrita e aprovada.' });
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };

  return (
    <Card>
      <form onSubmit={submit} className="ui-form">
        <h3>Equipe convidada sem conta</h3>
        <div className="ui-form-row">
          <TextField
            label="Atlética"
            placeholder="Atlética de Medicina"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <TextField
            label="Nome da equipe (opcional)"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>
        <TextAreaField
          label="Atletas"
          help="Um atleta por linha: número, nome e e-mail (opcional)."
          rows={6}
          placeholder={'4 Ana Souza ana@email.com\n7 Bia Lima'}
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          required
        />
        <PublicationConsentCheck checked={consent} onChange={setConsent} />
        {msg && <Notice tone={msg.ok ? 'positive' : 'danger'}>{msg.text}</Notice>}
        <div>
          <Button type="submit" variant="secondary">
            Cadastrar e inscrever
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Link de transferência da equipe convidada (E10): quando a atlética criar conta, ela aceita o
 * link e passa a cuidar da equipe, com súmulas e estatísticas já registradas.
 */
function TransferLink({ teamId }: { teamId: string }) {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setError('');
    try {
      const t = await api.createTransfer(teamId);
      const url = `${window.location.origin}${t.path}`;
      setLink(url);
      await navigator.clipboard?.writeText(url).then(
        () => setCopied(true),
        () => {},
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="ui-list__full ui-stack">
      {link ? (
        <div className="ui-form-row">
          <code className="ui-list__main ch-invite-url">{link}</code>
          <Button
            variant="quiet"
            onClick={() =>
              navigator.clipboard?.writeText(link).then(
                () => setCopied(true),
                () => {},
              )
            }
          >
            <Icon icon={Copy} />
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="quiet" onClick={() => void create()}>
            <Icon icon={Link2} />
            Gerar link de transferência
          </Button>
        </div>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
