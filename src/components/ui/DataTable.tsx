import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Rótulo em texto usado no modo cartão (celular); padrão: o header, se for texto. */
  label?: string;
  /** Título acessível da sigla (ex.: "Vitórias" para "V"). */
  title?: string;
  render(row: T): ReactNode;
  /** Número comparável em coluna: stat, alinhado à direita. */
  numeric?: boolean;
  /** Coluna de destaque: vira o título (h3) do cartão; fica fixa no modo `scroll`. */
  lead?: boolean;
  /** Classe extra na célula e no cabeçalho (ex.: largura fixa). */
  className?: string;
}

/**
 * Tabela em surface, cabeçalho em label sobre surface-sunken e linhas separadas por line.
 * mode="cards": abaixo de bp-md cada linha vira um cartão empilhado.
 * mode="scroll": as colunas lead ficam fixas e os números rolam na horizontal.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  mode = 'cards',
  onRowClick,
  dividerAfter,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey(row: T): string;
  caption?: string;
  mode?: 'cards' | 'scroll';
  onRowClick?(row: T): void;
  /** Linha depois da qual entra a divisória forte em border (zona de classificação). */
  dividerAfter?(row: T, index: number): boolean;
  className?: string;
}) {
  return (
    <div className={cls('ui-table-wrap', mode === 'scroll' && 'ui-table-wrap--scroll', className)}>
      <table className={`ui-table ${mode === 'cards' ? 'ui-table--cards' : 'ui-table--sticky'}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                title={c.title}
                className={cls(c.numeric && 'is-num', c.lead && 'is-lead', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              className={cls(
                onRowClick && 'is-clickable',
                dividerAfter?.(row, i) && 'is-divider-after',
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.label ?? c.title ?? (typeof c.header === 'string' ? c.header : '')}
                  className={cls(c.numeric && 'is-num', c.lead && 'is-lead', c.className)}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cls = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(' ') || undefined;
