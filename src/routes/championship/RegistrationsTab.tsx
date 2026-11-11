import type { ChampionshipDetail, Registration } from '@neronu/api-contract';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useAsync } from '../../lib/useAsync';

const STATUS = { pending: 'Aguardando aprovação', approved: 'Aprovada', rejected: 'Recusada' };

export function RegistrationsTab({
  ch,
  onChange,
}: {
  ch: ChampionshipDetail;
  onChange: () => void;
}) {
  const [regs, reload] = useAsync(() => api.registrations(ch.id), ch.id);
  const [error, setError] = useState('');
  const open = ch.status === 'registration';

  const decide = async (r: Registration, status: 'approved' | 'rejected') => {
    try {
      await api.decideRegistration(r.id, status);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Equipes inscritas</h2>
        {regs.status === 'error' && <p className="status-error">{regs.message}</p>}
        {regs.status === 'ok' && regs.data.length === 0 && (
          <p className="muted">Nenhuma inscrição ainda.</p>
        )}
        {regs.status === 'ok' && (
          <ul className="list">
            {regs.data.map((r) => (
              <li key={r.id} className="stack tight">
                <div className="row between">
                  <span>
                    <strong>{r.team.name}</strong>
                    <span className="muted small">
                      {' '}
                      · {r.organization.name}
                      {r.organization.isGuest && ' (convidada)'}
                    </span>
                  </span>
                  <span
                    className={`small ${r.status === 'approved' ? 'status-ok' : r.status === 'rejected' ? 'status-error' : 'status-warn'}`}
                  >
                    {STATUS[r.status]}
                  </span>
                </div>
                <div className="row wrap small">
                  {r.roster !== null && (
                    <Link to={`/inscricoes/${r.id}`}>
                      Elenco ({r.roster.length}){r.canEditRoster ? ' · editar' : ''}
                    </Link>
                  )}
                  {ch.canManage && open && r.status !== 'approved' && (
                    <button className="link" onClick={() => decide(r, 'approved')}>
                      Aprovar
                    </button>
                  )}
                  {ch.canManage && open && r.status !== 'rejected' && (
                    <button className="link danger" onClick={() => decide(r, 'rejected')}>
                      Recusar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="status-error">{error}</p>}
      </section>

      {open && ch.myOrganizations.length > 0 && <RegisterTeam ch={ch} onDone={reload} />}
      {ch.canManage && <Invites ch={ch} onChange={onChange} />}
      {ch.canManage && open && <GuestTeam ch={ch} onDone={reload} />}
    </div>
  );
}

function RegisterTeam({ ch, onDone }: { ch: ChampionshipDetail; onDone: () => void }) {
  const [orgId, setOrgId] = useState(ch.myOrganizations[0]!.id);
  const [teams] = useAsync(() => api.teams(orgId), orgId);
  const [teamId, setTeamId] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.registerTeam(ch.id, teamId);
      setMsg('Inscrição enviada. Monte o elenco e aguarde a aprovação.');
      setTeamId('');
      onDone();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  return (
    <section className="card stack">
      <h2>Inscrever equipe</h2>
      <form onSubmit={submit} className="row wrap">
        {ch.myOrganizations.length > 1 && (
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {ch.myOrganizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} required>
          <option value="">Equipe…</option>
          {teams.status === 'ok' &&
            teams.data.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        <button type="submit" className="primary">
          Inscrever
        </button>
      </form>
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}

function Invites({ ch, onChange }: { ch: ChampionshipDetail; onChange: () => void }) {
  const [invites, reload] = useAsync(() => api.invites(ch.id), ch.id);
  const [copied, setCopied] = useState('');
  const url = (path: string) => `${window.location.origin}${path}`;

  const create = async () => {
    const inv = await api.createInvite(ch.id);
    reload();
    await navigator.clipboard?.writeText(url(inv.path)).then(
      () => setCopied(inv.token),
      () => {},
    );
  };

  return (
    <section className="card stack">
      <div className="row between">
        <h2>Convites</h2>
        <button onClick={create}>Gerar link</button>
      </div>
      <p className="muted small">
        Cada link vale para uma entidade. Envie para a atlética convidada.
      </p>
      {invites.status === 'ok' && (
        <ul className="list">
          {invites.data.map((i) => (
            <li key={i.token} className="row between">
              {i.acceptedBy ? (
                <span className="status-ok small">Aceito por {i.acceptedBy.name}</span>
              ) : (
                <code className="small grow ellipsis">{url(i.path)}</code>
              )}
              {!i.acceptedBy && (
                <button
                  className="link"
                  onClick={() =>
                    navigator.clipboard?.writeText(url(i.path)).then(
                      () => setCopied(i.token),
                      () => {},
                    )
                  }
                >
                  {copied === i.token ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {ch.participants.length > 1 && (
        <p className="small muted">
          Participantes: {ch.participants.map((p) => p.name).join(', ')}{' '}
          <button className="link" onClick={onChange}>
            atualizar
          </button>
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
  const [msg, setMsg] = useState('');

  const parse = () =>
    lines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(\d{1,2})\s+(.+)$/);
        return m ? { number: Number(m[1]), name: m[2]!.trim() } : null;
      });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const athletes = parse();
    if (athletes.some((a) => a === null) || athletes.length === 0) {
      setMsg('Use uma linha por atleta: número e nome (ex.: "7 Ana Souza").');
      return;
    }
    try {
      await api.createGuestTeam(ch.id, {
        organizationName: orgName,
        teamName: teamName || orgName,
        athletes: athletes as { number: number; name: string }[],
      });
      setOrgName('');
      setTeamName('');
      setLines('');
      setMsg('Equipe convidada inscrita e aprovada.');
      onDone();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  return (
    <section className="card stack">
      <h2>Equipe convidada (sem conta)</h2>
      <form onSubmit={submit} className="stack">
        <div className="row wrap">
          <input
            placeholder="Entidade (ex.: Atlética de Medicina)"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <input
            placeholder="Nome da equipe (opcional)"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>
        <textarea
          rows={6}
          placeholder={'Um atleta por linha:\n4 Ana Souza\n7 Bia Lima'}
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          required
        />
        <button type="submit">Cadastrar e inscrever</button>
        {msg && <p className="small">{msg}</p>}
      </form>
    </section>
  );
}
