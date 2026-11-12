import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { expect, it, vi } from 'vitest';
import { ThemeProvider } from '../lib/theme';
import { HomeEntry, RequireAuth } from './guards';

vi.mock('../lib/session', () => ({ useSession: () => ({ status: 'anonymous' }) }));

function Where() {
  const l = useLocation();
  return <p>{l.pathname + l.search}</p>;
}

function app(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="equipes" element={<p>equipes</p>} />
        </Route>
        <Route path="entrar" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

it('visitante numa tela do painel é levado ao login e volta depois', () => {
  app('/equipes');
  expect(screen.getByText('/entrar?next=%2Fequipes')).toBeInTheDocument();
});

it('o início não exige login: visitante vê a busca pelo código', () => {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route index element={<HomeEntry />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Código do campeonato')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
});
