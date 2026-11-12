import { CircleAlert } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface ControlProps {
  id: string;
  className: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface FieldProps {
  label: ReactNode;
  help?: ReactNode;
  /** Mensagem de erro em texto, abaixo do campo; a borda vira danger. */
  error?: ReactNode;
  className?: string;
  /** Recebe os atributos de acessibilidade e a classe do controle. */
  children: (control: ControlProps) => ReactNode;
}

/** Rótulo + controle + ajuda + erro. O campo é o único controle com borda. */
export function Field({ label, help, error, className, children }: FieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={['ui-field', className].filter(Boolean).join(' ')}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        className: 'ui-control',
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error && (
        <p className="ui-field__error" id={errorId}>
          <Icon icon={CircleAlert} />
          {error}
        </p>
      )}
      {help && !error && (
        <p className="ui-field__help" id={helpId}>
          {help}
        </p>
      )}
    </div>
  );
}

type Labelled = { label: ReactNode; help?: ReactNode; error?: ReactNode; fieldClassName?: string };

export function TextField({
  label,
  help,
  error,
  fieldClassName,
  ...input
}: Labelled & ComponentProps<'input'>) {
  return (
    <Field label={label} help={help} error={error} className={fieldClassName}>
      {(c) => <input {...input} {...c} />}
    </Field>
  );
}

export function SelectField({
  label,
  help,
  error,
  fieldClassName,
  children,
  ...select
}: Labelled & ComponentProps<'select'>) {
  return (
    <Field label={label} help={help} error={error} className={fieldClassName}>
      {(c) => (
        <select {...select} {...c}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  help,
  error,
  fieldClassName,
  ...area
}: Labelled & ComponentProps<'textarea'>) {
  return (
    <Field label={label} help={help} error={error} className={fieldClassName}>
      {(c) => <textarea {...area} {...c} />}
    </Field>
  );
}
