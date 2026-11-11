import type { RuleValue, SportRulesResponse } from '@neronu/api-contract';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../lib/api/client';

/**
 * Formulário gerado pelo `rulesSchema` do módulo: mostra todas as regras configuráveis,
 * marca as que diferem do padrão e envia só o que mudou.
 */
export function RulesForm({
  data,
  readOnly,
  onSave,
}: {
  data: SportRulesResponse;
  readOnly?: boolean;
  onSave: (changes: Record<string, RuleValue>) => Promise<SportRulesResponse>;
}) {
  const [values, setValues] = useState<Record<string, RuleValue>>(data.rules);
  const [saved, setSaved] = useState(data);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const changes = Object.fromEntries(
    Object.entries(values).filter(([k, v]) => saved.rules[k] !== v),
  );
  const dirty = Object.keys(changes).length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const res = await onSave(changes);
      setSaved(res);
      setValues(res.rules);
      setMsg('Regras salvas.');
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (key: string, v: RuleValue) => {
    setValues((s) => ({ ...s, [key]: v }));
    setMsg('');
  };

  return (
    <form onSubmit={submit} className="stack">
      {data.fields.map((f) => {
        const changed = values[f.key] !== data.defaults[f.key];
        const id = `rule-${f.key}`;
        return (
          <div key={f.key} className={`rule ${changed ? 'changed' : ''}`}>
            <label htmlFor={id} className="rule-label">
              {f.label}
              {f.help && <span className="muted small">{f.help}</span>}
            </label>
            {f.type === 'boolean' ? (
              <input
                id={id}
                type="checkbox"
                checked={values[f.key] === true}
                disabled={readOnly}
                onChange={(e) => set(f.key, e.target.checked)}
              />
            ) : f.type === 'integer' ? (
              <input
                id={id}
                className="num-input"
                type="number"
                min={f.min}
                max={f.max}
                value={String(values[f.key] ?? '')}
                disabled={readOnly}
                onChange={(e) => set(f.key, Number(e.target.value))}
              />
            ) : (
              <select
                id={id}
                value={String(values[f.key])}
                disabled={readOnly}
                onChange={(e) => {
                  const opt = f.options.find((o) => String(o.value) === e.target.value)!;
                  set(f.key, opt.value);
                }}
              >
                {f.options.map((o) => (
                  <option key={String(o.value)} value={String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            {changed && (
              <span className="muted small rule-default">
                padrão:{' '}
                {String(
                  data.defaults[f.key] === true
                    ? 'sim'
                    : data.defaults[f.key] === false
                      ? 'não'
                      : data.defaults[f.key],
                )}
              </span>
            )}
          </div>
        );
      })}
      {msg && <p className={msg === 'Regras salvas.' ? 'status-ok' : 'status-error'}>{msg}</p>}
      {!readOnly && (
        <button type="submit" className="primary" disabled={!dirty || busy}>
          Salvar regras
        </button>
      )}
    </form>
  );
}
