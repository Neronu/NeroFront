import type { ReactNode } from 'react';

/** h1 à esquerda e a ação principal à direita (uma por página). */
export function PageHeader({
  title,
  eyebrow,
  meta,
  action,
}: {
  title: ReactNode;
  /** Rótulo acima do título, em label (ex.: esporte e categoria). */
  eyebrow?: ReactNode;
  /** Abaixo do título: texto em small ou um <MetaGrid>. */
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__titles">
        {eyebrow && <span className="t-label ui-page-header__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {meta && <div className="ui-page-header__meta">{meta}</div>}
      </div>
      {action}
    </header>
  );
}
