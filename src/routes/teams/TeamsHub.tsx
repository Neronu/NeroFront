import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { MyTeam } from '../../lib/api/contract';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';
import { OrgTeams } from './Teams';

function roleLabel(t: MyTeam): string {
  const parts = [
    t.role === 'owner' ? 'Sua equipe' : `Você joga${t.number != null ? ` com a ${t.number}` : ''}`,
    t.role === 'owner' && t.number != null && `você joga com a ${t.number}`,
    !t.organization.isPersonal && t.organization.name,
    `${t.playerCount} ${t.playerCount === 1 ? 'atleta' : 'atletas'}`,
  ];
  return parts.filter(Boolean).join(' · ');
}

/**
 * Equipes (menu). Todo usuário é atleta: vê as equipes em que joga, cria as dele e convida
 * atletas por e-mail. Membro de atlética vê também as equipes da atlética.
 */
export function TeamsHub() {
  const { org } = useSession();
  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader title="Equipes" />
      <MyTeams />
      {org && <OrgTeams />}
    </div>
  );
}

function MyTeams() {
  const [teams, reload] = useAsync(() => api.myTeams(), 'my-teams');
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [plays, setPlays] = useState(true);
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Equipes de atlética que o usuário administra aparecem na seção da atlética.
  const mine = teams.status === 'ok' ? teams.data.filter((t) => t.role !== 'admin') : [];

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const team = await api.createMyTeam({
        name,
        playMyself: plays,
        ...(plays && number ? { number: Number(number) } : {}),
      });
      // A primeira equipe cria a entidade pessoal: a sessão passa a conhecê-la.
      await refresh();
      navigate(`/equipes/${team.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <section className="ui-stack" aria-labelledby="my-teams">
      <h2 id="my-teams">Minhas equipes</h2>
      <Card>
        <form onSubmit={create} className="ui-form">
          <div className="ui-form-row">
            <TextField
              label="Nome da nova equipe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Os Brabos"
              required
            />
            {plays && (
              <TextField
                label="Seu nº"
                fieldClassName="ui-field--num"
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              Criar equipe
            </Button>
          </div>
          <label className="ui-checkline">
            <input
              type="checkbox"
              className="ui-check"
              checked={plays}
              onChange={(e) => setPlays(e.target.checked)}
            />
            Também jogo nesta equipe
          </label>
          <p className="t-small t-muted">
            Depois de criar, convide os atletas por e-mail. A equipe pode se inscrever em
            campeonatos pelo link de convite da organizadora.
          </p>
          {error && <Notice tone="danger">{error}</Notice>}
        </form>
      </Card>
      {teams.status === 'loading' && <Skeleton />}
      {teams.status === 'error' && <ErrorState message={teams.message} onRetry={reload} />}
      {teams.status === 'ok' &&
        (mine.length === 0 ? (
          <EmptyState>
            Você ainda não está em nenhuma equipe. Crie a sua ou aceite um convite.
          </EmptyState>
        ) : (
          <ul className="ui-list" aria-label="Minhas equipes">
            {mine.map((t) => (
              <li key={t.team.id}>
                <span className="ui-list__main">
                  <Link to={`/equipes/${t.team.id}`} className="ui-list__title">
                    {t.team.name}
                  </Link>
                  <span className="ui-list__meta">{roleLabel(t)}</span>
                </span>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
