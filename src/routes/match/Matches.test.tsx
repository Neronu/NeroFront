import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { Matches } from './Matches';

const api = vi.hoisted(() => ({ matches: vi.fn(), deleteMatch: vi.fn(async () => {}) }));
vi.mock('../../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../../lib/api/client')>()),
  api,
}));
vi.mock('../../lib/session', () => ({
  useOrg: () => ({ org: { id: 'o1', name: 'Atlética' } }),
}));

const team = (id: string, name: string) => ({ id, name });
const match = (id: string, status: string, extra: object = {}) => ({
  id,
  status,
  homeTeam: team('h', 'Computação'),
  awayTeam: team('a', 'Direito'),
  scheduledAt: null,
  venue: null,
  championshipId: null,
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

it('lista as partidas avulsas, cria e exclui (menos ao vivo)', async () => {
  api.matches.mockResolvedValue([
    match('m1', 'scheduled', { scheduledAt: '2030-05-01T12:00:00Z', venue: 'Ginásio' }),
    match('m2', 'in_progress'),
    match('m3', 'closed'),
  ]);
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  );
  render(
    <MemoryRouter>
      <Matches />
    </MemoryRouter>,
  );
  const list = await screen.findByRole('list', { name: 'Partidas avulsas' });
  expect(api.matches).toHaveBeenCalledWith('o1');
  expect(screen.getByRole('link', { name: 'Nova partida' })).toHaveAttribute(
    'href',
    '/partidas/nova',
  );
  const rows = within(list).getAllByRole('listitem');
  expect(within(rows[0]!).getByText(/Ginásio/)).toBeInTheDocument();
  expect(within(rows[1]!).getByText('Sem data')).toBeInTheDocument();
  // Ao vivo: sem lixo.
  expect(within(rows[1]!).queryByRole('button', { name: /Excluir/ })).toBeNull();
  const del = within(rows[2]!).getByRole('button', {
    name: 'Excluir partida Computação × Direito',
  });
  fireEvent.click(del);
  await vi.waitFor(() => expect(api.deleteMatch).toHaveBeenCalledWith('m3'));
  await vi.waitFor(() => expect(api.matches).toHaveBeenCalledTimes(2));
  vi.unstubAllGlobals();
});
