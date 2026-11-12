import type { ReactNode } from 'react';

/** Selo chapado: neutral, closed (encerrado) ou live ("Ao vivo", só com jogo em andamento). */
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'closed' | 'live';
  children: ReactNode;
}) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function LiveBadge() {
  return <Badge tone="live">Ao vivo</Badge>;
}
