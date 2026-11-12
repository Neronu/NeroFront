import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

/** Vazio: uma frase dizendo o que falta e o botão que resolve. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-state">
      <p className="t-muted">{children}</p>
      {action}
    </div>
  );
}

/** Erro: palavra + o que aconteceu + como tentar de novo. */
export function ErrorState({
  title = 'Erro ao carregar',
  message,
  onRetry,
}: {
  title?: string;
  message?: ReactNode;
  onRetry?(): void;
}) {
  return (
    <div className="ui-state ui-state--error" role="alert">
      <p className="ui-state__title">
        <Icon icon={CircleAlert} />
        {title}
      </p>
      {message && <p>{message}</p>}
      {onRetry && <Button onClick={onRetry}>Tentar de novo</Button>}
    </div>
  );
}

/** Carregando: blocos em surface-sunken no formato do conteúdo, sem texto piscando. */
export function Skeleton({ lines = 3, height = 44 }: { lines?: number; height?: number }) {
  return (
    <div className="ui-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="ui-skeleton__block"
          style={{ height, width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

/** Aviso em linha: cor nunca vai sozinha, sempre com ícone e palavra. */
export function Notice({
  tone = 'muted',
  icon,
  children,
  role,
}: {
  tone?: 'danger' | 'positive' | 'muted' | 'ink';
  icon?: LucideIcon;
  children: ReactNode;
  role?: 'alert' | 'status';
}) {
  const glyph =
    icon ?? (tone === 'danger' ? CircleAlert : tone === 'positive' ? CircleCheck : Info);
  return (
    <p
      className={`ui-notice ui-notice--${tone}`}
      role={role ?? (tone === 'danger' ? 'alert' : undefined)}
    >
      <Icon icon={glyph} />
      <span>{children}</span>
    </p>
  );
}
