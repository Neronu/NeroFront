import { basketball } from '@neronu/sport-basketball';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { Home } from './Home';

vi.mock('../lib/session', () => ({
  useOrg: () => ({
    org: { id: 'o1', name: 'Atlética', slug: 'atletica', isGuest: false },
    role: 'admin',
    isAdmin: true,
  }),
}));

afterEach(() => vi.unstubAllGlobals());

it('mostra o painel da entidade e a API online', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      String(url).endsWith('/health')
        ? new Response(
            JSON.stringify({ status: 'ok', sportModules: { basketball: basketball.version } }),
          )
        : new Response('[]'),
    ),
  );
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(await screen.findByText(/API online/)).toHaveTextContent(basketball.version);
  expect(await screen.findByText(/Nenhum campeonato/)).toBeInTheDocument();
  expect(await screen.findByText(/Nenhuma partida/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Novo campeonato' })).toBeInTheDocument();
});
