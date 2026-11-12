import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger-text';

interface Common {
  /** primary: ação principal, uma por tela. secondary: apoio. quiet: link de ação. */
  variant?: ButtonVariant;
  /** Ocupa a largura toda sempre. */
  block?: boolean;
  /** Ocupa a largura toda só no celular (botão principal). */
  fluid?: boolean;
  children: ReactNode;
}

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type AsLink = Common & { to: string; className?: string; replace?: boolean };

export function buttonClass({
  variant = 'secondary',
  block,
  fluid,
  className,
}: Pick<Common, 'variant' | 'block' | 'fluid'> & { className?: string }): string {
  return [
    'ui-button',
    `ui-button--${variant}`,
    block && 'ui-button--block',
    fluid && 'ui-button--fluid',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Botão chapado: sem contorno, sem sombra; o estado só troca a cor. Com `to`, vira link. */
export function Button(props: AsButton | AsLink) {
  if (props.to !== undefined) {
    const { to, variant, block, fluid, className, replace, children } = props;
    return (
      <Link to={to} replace={replace} className={buttonClass({ variant, block, fluid, className })}>
        {children}
      </Link>
    );
  }
  const { variant, block, fluid, className, type = 'button', children, ...rest } = props;
  return (
    <button type={type} className={buttonClass({ variant, block, fluid, className })} {...rest}>
      {children}
    </button>
  );
}
