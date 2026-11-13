import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { InviteAccept } from './InviteAccept';

const api = vi.hoisted(() => ({ invite: vi.fn(), acceptInvite: vi.fn() }));
vi.mock('../../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../../lib/api/client')>()),
  api,
}));
const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../lib/session', () => ({ useSession: () => session.current }));

const preview = {
  championship: { id: 'c1', name: 'Copa' },
  organizer: { name: 'Liga' },
  acceptedBy: null,
};

function at() {
  render(
    <MemoryRouter initialEntries={['/convites/tok']}>
      <Routes>
        <Route path="/convites/:token" element={<InviteAccept />} />
        <Route path="/campeonatos/:id" element={<p>campeonato</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.invite.mockResolvedValue(preview);
});

it('atleta sem atlética participa com as próprias equipes', async () => {
  session.current = {
    me: { organizations: [] },
    organizations: [],
    personalOrg: { id: 'p1', name: 'Bia', isPersonal: true, isGuest: false },
    refresh: vi.fn(async () => {}),
  };
  api.acceptInvite.mockResolvedValue({ id: 'c1' });
  at();
  fireEvent.click(await screen.findByRole('button', { name: 'Participar com suas equipes' }));
  expect(await screen.findByText('campeonato')).toBeInTheDocument();
  expect(api.acceptInvite).toHaveBeenCalledWith('tok', 'p1');
});

it('sem atlética nem equipe: indica criar uma equipe', async () => {
  session.current = {
    me: { organizations: [] },
    organizations: [],
    personalOrg: null,
    refresh: vi.fn(),
  };
  at();
  expect(await screen.findByRole('link', { name: 'Equipes' })).toHaveAttribute('href', '/equipes');
  expect(screen.queryByRole('button', { name: /Participar/ })).toBeNull();
});
