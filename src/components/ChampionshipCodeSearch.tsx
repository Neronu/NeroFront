import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, TextField } from './ui';
import { api, errorMessage, HttpError } from '../lib/api/client';

/**
 * Campo "Código do campeonato" com "OK" ao lado (seção 9, ajustada pelo usuário em 12/11/2026:
 * o botão fica na lateral do campo, também no celular). Leva direto à página do campeonato.
 * Código inexistente mostra o erro em danger, com texto, abaixo do campo.
 */
export function ChampionshipCodeSearch({
  label,
  hideLabel,
}: {
  label: string;
  /** O rótulo fica só para leitores de tela (o placeholder já explica o campo). */
  hideLabel?: boolean;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Digite o código do campeonato.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ch = await api.championshipByCode(code);
      navigate(`/campeonatos/${ch.id}`);
    } catch (err) {
      setError(
        err instanceof HttpError && err.status === 404
          ? 'Nenhum campeonato com este código.'
          : errorMessage(err),
      );
      setBusy(false);
    }
  };

  return (
    <form className="code-search" onSubmit={submit} noValidate>
      {/* Rótulo visível fora da linha, para o "OK" alinhar sempre com o campo.
          O nome acessível vem do rótulo (só para leitores de tela) do próprio campo. */}
      {!hideLabel && (
        <span className="ui-field__label" aria-hidden="true">
          {label}
        </span>
      )}
      <div className="code-search__row">
        <TextField
          label={<span className="sr-only">{label}</span>}
          fieldClassName="code-search__field"
          placeholder="Insira o código do campeonato"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError('');
          }}
          error={error || undefined}
        />
        <Button type="submit" variant="primary" disabled={busy} aria-busy={busy || undefined}>
          OK
        </Button>
      </div>
    </form>
  );
}
