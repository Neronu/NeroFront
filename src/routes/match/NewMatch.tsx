import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  SelectField,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

export function NewMatch() {
  const { org } = useOrg();
  const [teams, reload] = useAsync(() => api.teams(org.id), org.id);
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [venue, setVenue] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const match = await api.createMatch({
        organizationId: org.id,
        sportKey: 'basketball',
        homeTeamId: home,
        awayTeamId: away,
        ...(venue ? { venue } : {}),
      });
      navigate(`/partidas/${match.id}/preparar`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const header = <PageHeader title="Nova partida" />;
  if (teams.status === 'loading') return <Skeleton lines={4} />;
  if (teams.status === 'error') return <ErrorState message={teams.message} onRetry={reload} />;
  if (teams.data.length < 2) {
    return (
      <div className="ui-stack ui-stack--section lyt-reading">
        {header}
        <EmptyState
          action={
            <Button to="/equipes" variant="secondary">
              Cadastrar equipes
            </Button>
          }
        >
          Uma partida precisa de duas equipes. Cadastre pelo menos mais uma para começar.
        </EmptyState>
      </div>
    );
  }
  const options = teams.data.map((t) => (
    <option key={t.id} value={t.id}>
      {t.name}
    </option>
  ));
  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      {header}
      <Card>
        <form onSubmit={create} className="ui-form">
          <SelectField
            label="Mandante (A)"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            required
          >
            <option value="">Escolha…</option>
            {options}
          </SelectField>
          <SelectField
            label="Visitante (B)"
            value={away}
            onChange={(e) => setAway(e.target.value)}
            error={home && home === away ? 'Escolha duas equipes diferentes.' : undefined}
            required
          >
            <option value="">Escolha…</option>
            {options}
          </SelectField>
          <TextField
            label="Local (opcional)"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Ginásio da UFMT"
          />
          <p className="t-small t-muted">
            A partida usa as <Link to="/regras">regras da entidade</Link>.
          </p>
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="ui-savebar">
            <Button type="submit" variant="primary" disabled={!home || !away || home === away}>
              Criar e escolher relacionados
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
