import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { Icon } from './Icon';

/**
 * Um único botão que alterna entre claro e escuro (sem opção "Sistema").
 * Sem escolha salva, o app abre no tema do aparelho; o primeiro clique salva a escolha.
 * É um interruptor "Tema escuro": ligado = escuro.
 */
export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { resolved, setChoice } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      className={['ui-button', 'ui-button--quiet', 'ui-theme-toggle', compact && 'is-compact']
        .filter(Boolean)
        .join(' ')}
      onClick={() => setChoice(dark ? 'light' : 'dark')}
    >
      <Icon icon={dark ? Sun : Moon} />
      {compact ? (
        <span className="sr-only">Tema escuro</span>
      ) : (
        <>
          Tema escuro
          <span className="t-small t-muted">{dark ? 'Ligado' : 'Desligado'}</span>
        </>
      )}
    </button>
  );
}
