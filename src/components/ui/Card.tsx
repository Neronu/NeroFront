import type { HTMLAttributes, ReactNode } from 'react';

/** Superfície (surface sobre bg): separa por cor de fundo, nunca por sombra ou borda. */
export function Card({
  flush,
  as: Tag = 'section',
  className,
  children,
  ...rest
}: {
  flush?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={['ui-card', flush && 'ui-card--flush', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
