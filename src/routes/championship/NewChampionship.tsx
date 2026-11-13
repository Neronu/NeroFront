import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Group, Notice, PageHeader, SelectField, TextField } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import type { ChampionshipFormat } from '../../lib/api/contract';
import { fromLocalInput } from '../../lib/dates';
import { CHAMPIONSHIP_FORMATS, championshipFormatName, sportName } from '../../lib/format';
import { useOrg } from '../../lib/session';
import { SPORTS } from '../../lib/sports';

export function NewChampionship() {
  const { org } = useOrg();
  const [name, setName] = useState('');
  const [sportKey, setSportKey] = useState(SPORTS[0]!.key);
  const [format, setFormat] = useState<ChampionshipFormat | ''>('');
  const [code, setCode] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [rosterLockAt, setRosterLockAt] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!format) return;
    try {
      const ch = await api.createChampionship({
        organizationId: org.id,
        name,
        sportKey,
        format,
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
        meta={`O campeonato nasce com as regras de ${sportName(sportKey).toLowerCase()} da ${org.name}.`}
      />
      <Group>
        <form onSubmit={submit} className="ui-form">
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Copa das Atléticas 2026"
            required
          />
          <div className="ui-form-row ui-form-row--top">
            <SelectField
              label="Esporte"
              value={sportKey}
              onChange={(e) => setSportKey(e.target.value)}
              required
            >
              {SPORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Formato da disputa"
              value={format}
              onChange={(e) => setFormat(e.target.value as ChampionshipFormat)}
              required
            >
              <option value="" disabled>
                Escolha o formato
              </option>
              {CHAMPIONSHIP_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {championshipFormatName(f)}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            label="Código (opcional)"
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
          <div className="ui-form-row ui-form-row--top">
            <TextField
              label="Início"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <TextField
              label="Fim das inscrições"
              type="datetime-local"
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
      </Group>
    </div>
  );
}
