import type { ReactNode } from 'react';

export type MetaItem = { label: string; value: ReactNode };

/**
 * Pares rótulo/valor em grid (ex.: metadados no PageHeader).
 * Colunas se ajustam à largura; itens sem valor são omitidos.
 */
export function MetaGrid({
  items,
  columns,
}: {
  items: Array<MetaItem | false | null | undefined>;
  /** 1 = uma coluna (ex.: em coluna lateral estreita). Padrão: colunas automáticas. */
  columns?: 1;
}) {
  const visible = items.filter((i): i is MetaItem => !!i && i.value != null && i.value !== '');
  if (visible.length === 0) return null;
  return (
    <dl className={columns === 1 ? 'ui-meta-grid ui-meta-grid--single' : 'ui-meta-grid'}>
      {visible.map((item) => (
        <div key={item.label} className="ui-meta-grid__item">
          <dt className="t-label ui-meta-grid__label">{item.label}</dt>
          <dd className="ui-meta-grid__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
