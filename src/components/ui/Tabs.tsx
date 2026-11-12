import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem<K extends string> {
  key: K;
  label: string;
}

/**
 * Abas: texto com sublinhado sólido de 2px em ink na ativa, sem fundo.
 * Setas, Home e End movem entre as abas (padrão WAI-ARIA de ativação automática).
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix = 'tab',
}: {
  items: readonly TabItem<K>[];
  value: NoInfer<K>;
  onChange(key: NoInfer<K>): void;
  /** Nome acessível do grupo de abas. */
  label: string;
  idPrefix?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.key);
    refs.current[next]?.focus();
  };

  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {items.map((item, i) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-${item.key}`}
            type="button"
            role="tab"
            className="ui-tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${item.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  tabKey,
  idPrefix = 'tab',
  children,
}: {
  tabKey: string;
  idPrefix?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-${tabKey}`}
    >
      {children}
    </div>
  );
}
