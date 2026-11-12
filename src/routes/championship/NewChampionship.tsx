import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Notice, PageHeader, TextField } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { fromLocalInput } from '../../lib/dates';
import { useOrg } from '../../lib/session';

export function NewChampionship() {
  const { org } = useOrg();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [rosterLockAt, setRosterLockAt] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const ch = await api.createChampionship({
        organizationId: org.id,
        name,
        sportKey: 'basketball',
        ...(code.trim() ? { slug: code.trim().toLowerCase() } : {}),
        ...(startsAt ? { startsAt: fromLocalInput(startsAt)! } : {}),
        ...(rosterLockAt ? { rosterLockAt: fromLocalInput(rosterLockAt)! } : {}),
      });
      navigate(`/campeonatos/${ch.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      <PageHeader
        title="Novo campeonato"
        meta={`O campeonato nasce com as regras de basquete da ${org.name}; você pode ajustá-las depois.`}
      />
      <Card>
        <form onSubmit={submit} className="ui-form">
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Copa das Atléticas 2026"
            required
          />
          <TextField
            label="Código (opcional)"
            help="Quem tiver o código encontra o campeonato. Letras, números e hífen; se vazio, geramos a partir do nome."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CIA-2026"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*"
            minLength={3}
            maxLength={60}
          />
          <div className="ui-form-row">
            <TextField
              label="Início"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <TextField
              label="Trava dos elencos"
              type="datetime-local"
              help="Depois disso, as equipes não mudam o elenco inscrito."
              value={rosterLockAt}
              onChange={(e) => setRosterLockAt(e.target.value)}
            />
          </div>
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="ui-savebar">
            <Button type="submit" variant="primary">
              Criar campeonato
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
