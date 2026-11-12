import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { store } from './storage';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Mesma chave lida pelo script inline do index.html, antes da primeira pintura. */
export const THEME_KEY = 'neronu:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): ResolvedTheme {
  return typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function readChoice(): ThemeChoice {
  const saved = store.get<ThemeChoice>(THEME_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** Em `system`, o atributo some e o CSS segue o aparelho; a escolha salva vale mais. */
function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

interface ThemeContextValue {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice(choice: ThemeChoice): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  useEffect(() => apply(choice), [choice]);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(DARK_QUERY);
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    if (next === 'system') store.remove(THEME_KEY);
    else store.set(THEME_KEY, next);
    setChoiceState(next);
  }, []);

  const value = useMemo(
    () => ({ choice, resolved: choice === 'system' ? system : choice, setChoice }),
    [choice, system, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme fora do ThemeProvider');
  return ctx;
}
