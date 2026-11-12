import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamDetailPage } from './TeamDetailPage';
import { TeamsHub } from './TeamsHub';

const api = vi.hoisted(() => ({
  myTeams: vi.fn(),
  createMyTeam: vi.fn(),
  team: vi.fn(),
  teamInvites: vi.fn(async () => []),
  inviteToTeam: vi.fn(),
  orgAthletes: vi.fn(async () => []),
}));
vi.mock('../../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../../lib/api/client')>()),
  api,
}));

const personal = {
  id: 'p1',
  name: 'Bia',
  slug: 'bia',
  isGuest: false,
  publicationConsent: true,
  isPersonal: true,
};
const session = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock('../../lib/session', () => ({ useSession: () => session.current }));

const team = (organizationId: string) => ({
  id: 't1',
  organizationId,
  name: 'Os Brabos',
  shortName: null,
  players: [{ athleteId: 'a1', name: 'Bia', number: 10 }],
});

beforeEach(() => {
  vi.clearAllMocks();
  session.current = {
    org: null,
    me: { memberships: [] },
    personalOrg: personal,
    refresh: vi.fn(async () => {}),
  };
});

describe('Equipes', () => {
  it('atleta cria a própria equipe jogando com o número', async () => {
    api.myTeams.mockResolvedValue([]);
    api.createMyTeam.mockResolvedValue({ id: 't9' });
    render(
      <MemoryRouter initialEntries={['/equipes']}>
        <Routes>
          <Route path="/equipes" element={<TeamsHub />} />
          <Route path="/equipes/:id" element={<p>detalhe</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Você ainda não está em nenhuma equipe/)).toBeInTheDocument();
    // Sem atlética: sem a seção de equipes da atlética.
    expect(screen.queryByRole('heading', { name: /Equipes da/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Nome da nova equipe'), {
      target: { value: 'Os Brabos' },
    });
    fireEvent.change(screen.getByLabelText('Seu nº'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar equipe' }));
    expect(await screen.findByText('detalhe')).toBeInTheDocument();
    expect(api.createMyTeam).toHaveBeenCalledWith({
      name: 'Os Brabos',
      playMyself: true,
      number: 10,
    });
  });

  it('lista as equipes em que joga, com papel e número', async () => {
    api.myTeams.mockResolvedValue([
      {
        team: { id: 't1', organizationId: 'p1', name: 'Os Brabos', shortName: null },
        organization: personal,
        role: 'owner',
        number: 10,
        playerCount: 6,
      },
      {
        team: { id: 't2', organizationId: 'o1', name: 'Computação', shortName: null },
        organization: { ...personal, id: 'o1', name: 'Atlética Computação', isPersonal: false },
        role: 'player',
        number: 7,
        playerCount: 12,
      },
    ]);
    render(
      <MemoryRouter>
        <TeamsHub />
      </MemoryRouter>,
    );
    const list = await screen.findByRole('list', { name: 'Minhas equipes' });
    expect(
      within(list).getByText('Sua equipe · você joga com a 10 · 6 atletas'),
    ).toBeInTheDocument();
    expect(
      within(list).getByText('Você joga com a 7 · Atlética Computação · 12 atletas'),
    ).toBeInTheDocument();
  });
});

describe('detalhe da equipe', () => {
  const at = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/equipes/:id" element={<TeamDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('dono da equipe pessoal convida por e-mail; não cadastra atleta direto', async () => {
    api.team.mockResolvedValue(team('p1'));
    api.inviteToTeam.mockResolvedValue({});
    at('/equipes/t1');
    expect(await screen.findByRole('heading', { name: 'Os Brabos' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome do atleta')).toBeNull();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Caio' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'caio@ex.com' } });
    fireEvent.change(screen.getByLabelText('Nº'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(await screen.findByText('Convite enviado para caio@ex.com.')).toBeInTheDocument();
    expect(api.inviteToTeam).toHaveBeenCalledWith('t1', {
      email: 'caio@ex.com',
      name: 'Caio',
      number: 7,
    });
  });

  it('quem só joga vê o elenco, sem ações', async () => {
    session.current = { ...session.current, personalOrg: null };
    api.team.mockResolvedValue(team('p1'));
    at('/equipes/t1');
    const list = await screen.findByRole('list', { name: 'Atletas da equipe' });
    expect(within(list).getByText('Bia')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Convidar atletas' })).toBeNull();
  });
});
