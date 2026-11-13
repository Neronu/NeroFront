import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Bloco de conteúdo em lista contínua: separa por linha fina (line) e espaço, nunca por caixa,
 * fundo ou sombra. Fica direto sobre bg, alinhado ao texto da página.
 */
export function Group({
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
      className={['ui-group', flush && 'ui-group--flush', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
