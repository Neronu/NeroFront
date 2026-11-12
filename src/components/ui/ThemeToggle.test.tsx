import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { THEME_KEY, ThemeProvider } from '../../lib/theme';
import { ThemeToggle } from './ThemeToggle';

function stubDevice(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: dark, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => vi.unstubAllGlobals());

const renderToggle = (compact?: boolean) =>
  render(
    <ThemeProvider>
      <ThemeToggle compact={compact} />
    </ThemeProvider>,
  );

it('é um único botão que alterna entre claro e escuro e salva a escolha', () => {
  stubDevice(false);
  renderToggle(true);
  const toggle = screen.getByRole('switch', { name: 'Tema escuro' });
  expect(screen.getAllByRole('switch')).toHaveLength(1);
  expect(screen.queryByText(/sistema/i)).not.toBeInTheDocument();
  expect(toggle).toHaveAttribute('aria-checked', 'false');

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(JSON.parse(localStorage.getItem(THEME_KEY)!)).toBe('dark');

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
});

it('sem escolha salva, abre no tema do aparelho', () => {
  stubDevice(true);
  renderToggle();
  expect(screen.getByRole('switch', { name: /Tema escuro/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(screen.getByText('Ligado')).toBeInTheDocument();
});
