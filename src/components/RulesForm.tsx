import type { RuleValue, SportRulesResponse } from '../lib/api/contract';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../lib/api/client';
import { Button, Notice } from './ui';

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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const changes = Object.fromEntries(
    Object.entries(values).filter(([k, v]) => saved.rules[k] !== v),
  );
  const dirty = Object.keys(changes).length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await onSave(changes);
      setSaved(res);
      setValues(res.rules);
      setMsg({ ok: true, text: 'Regras salvas.' });
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const set = (key: string, v: RuleValue) => {
    setValues((s) => ({ ...s, [key]: v }));
    setMsg(null);
  };

  return (
    <form onSubmit={submit} className="ui-form">
      <div className="ui-list">
        {data.fields.map((f) => {
          const changed = values[f.key] !== data.defaults[f.key];
          const id = `rule-${f.key}`;
          return (
            <div key={f.key} className={`ui-rule ${changed ? 'is-changed' : ''}`}>
              <label htmlFor={id} className="ui-rule__label">
                {f.label}
                {f.help && <span className="ui-rule__help">{f.help}</span>}
              </label>
              {f.type === 'boolean' ? (
                <input
                  id={id}
                  className="ui-check"
                  type="checkbox"
                  checked={values[f.key] === true}
                  disabled={readOnly}
                  onChange={(e) => set(f.key, e.target.checked)}
                />
              ) : f.type === 'integer' ? (
                <input
                  id={id}
                  className="ui-control ui-control--num"
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
                  className="ui-control ui-rule__select"
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
                <span className="ui-rule__default">
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
      </div>
      {msg && <Notice tone={msg.ok ? 'positive' : 'danger'}>{msg.text}</Notice>}
      {!readOnly && (
        <div className="ui-savebar">
          <Button type="submit" variant="primary" disabled={!dirty || busy}>
            Salvar regras
          </Button>
        </div>
      )}
    </form>
  );
}
