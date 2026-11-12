import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { Home } from './Home';

const api = vi.hoisted(() => ({
  myChampionships: vi.fn(),
  myTeamInvites: vi.fn(),
  acceptTeamInvite: vi.fn(),
  declineTeamInvite: vi.fn(),
  matches: vi.fn(async () => []),
}));
vi.mock('../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../lib/api/client')>()),
  api,
}));

const session = vi.hoisted(() => ({
  current: {
    org: { id: 'o1', name: 'Atlética', slug: 'atletica', isGuest: false } as object | null,
    role: 'admin' as string | null,
  },
}));
vi.mock('../lib/session', () => ({ useSession: () => session.current }));

const org = { id: 'o2', name: 'Atlética Computação', slug: 'comp', isGuest: false };
const champ = (over: object) => ({
  id: 'c1',
  name: 'Copa Inter-Atléticas 2026',
  slug: 'cia-2026',
  sportKey: 'basketball',
  rules: {},
  status: 'running',
  organizer: org,
  startsAt: null,
  endsAt: null,
  rosterLockAt: null,
  rosterLocked: false,
  live: false,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.myTeamInvites.mockResolvedValue([]);
});

it('atlética: busca por código, campeonatos em andamento e partidas avulsas', async () => {
  session.current = { ...session.current, role: 'admin' };
  api.myChampionships.mockResolvedValue([
    champ({ live: true }),
    champ({ id: 'c2', name: 'Torneio dos Calouros', slug: 'tdc', status: 'registration' }),
  ]);
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText('Buscar campeonato pelo código')).toBeInTheDocument();
  const list = await screen.findByRole('list', { name: 'Campeonatos em andamento' });
  // Só os em andamento; a lista completa fica em Campeonatos.
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(1);
  expect(within(items[0]!).getByText('Ao vivo')).toBeInTheDocument();
  expect(within(items[0]!).getByText('CIA-2026')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver todos os campeonatos' })).toHaveAttribute(
    'href',
    '/campeonatos',
  );
  expect(await screen.findByText(/Nenhuma partida avulsa/)).toBeInTheDocument();
});

it('atleta: aceita convite de equipe na Home', async () => {
  session.current = { org: null, role: null };
  api.myChampionships.mockResolvedValue([]);
  api.myTeamInvites.mockResolvedValue([
    {
      id: 'i1',
      team: { id: 't1', name: 'Os Brabos' },
      organization: { ...org, isPersonal: true },
      email: 'caio@ex.com',
      name: 'Caio',
      number: 7,
      status: 'pending',
      invitedBy: { name: 'Bia' },
      createdAt: '2026-11-12T10:00:00Z',
    },
  ]);
  api.acceptTeamInvite.mockResolvedValue({});
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  const invites = await screen.findByRole('list', { name: 'Convites para equipes' });
  expect(within(invites).getByText('Convite de Bia · camisa 7')).toBeInTheDocument();
  api.myTeamInvites.mockResolvedValue([]);
  fireEvent.click(within(invites).getByRole('button', { name: 'Aceitar' }));
  expect(await screen.findByText('Você agora joga na Os Brabos.')).toBeInTheDocument();
  expect(api.acceptTeamInvite).toHaveBeenCalledWith('i1');
  expect(screen.queryByText('Partidas avulsas')).not.toBeInTheDocument();
  expect(screen.getByText(/Quando sua equipe for inscrita/)).toBeInTheDocument();
});
