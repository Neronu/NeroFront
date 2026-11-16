import { useState, type FormEvent } from 'react';
import { Button, Overlay, SelectField } from '../../../components/ui';
import type { MomentForm } from '../../../lib/match/sport-table';
import type { Draft } from '../../../lib/match/table';

/**
 * Escolhas antes da ação do momento (ex.: quem saca primeiro no set e, no vôlei de praia, o 1º
 * sacador de cada dupla). Cada campo já vem com a primeira opção, a sugerida pelo esporte.
 */
export function MomentFormSheet({
  form,
  onClose,
  send,
}: {
  form: MomentForm;
  onClose(): void;
  send: (draft: Draft) => boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((f) => [f.key, f.options[0]?.value ?? ''])),
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (send(form.build(values))) onClose();
  };
  return (
    <Overlay open onClose={onClose} title={form.title}>
      <form className="ui-form" onSubmit={submit}>
        {form.fields.map((f) => (
          <SelectField
            key={f.key}
            label={f.label}
            value={values[f.key] ?? ''}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        ))}
        <div className="ui-form-row">
          <Button type="submit">{form.submit}</Button>
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Overlay>
  );
}
