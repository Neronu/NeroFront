import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AthleteSportStats, PublicAthlete } from '../../lib/api/contract';
import { HttpError } from '../../lib/api/client';
import { AthleteArea } from './AthleteArea';
import { PublicAthletePage } from './PublicAthletePage';

const api = vi.hoisted(() => ({
  publicAthlete: vi.fn(),
  meAthleteChampionships: vi.fn(),
  meAthleteStats: vi.fn(),
}));
vi.mock('../../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../../lib/api/client')>()),
  api,
}));

const session = vi.hoisted(() => ({ me: null as unknown }));
vi.mock('../../lib/session', () => ({ useSession: () => session }));

/** Colunas vêm do statsSchema do módulo: o teste usa siglas que o basquete não tem. */
const sport: AthleteSportStats = {
  sportKey: 'volei',
  sportName: 'Vôlei',
  columns: [
    { key: 'aces', short: 'ACE', label: 'Aces' },
    { key: 'blocks', short: 'BLK', label: 'Bloqueios' },
  ],
  games: 5,
  totals: { aces: 9, blocks: 4 },
  byChampionship: [
    {
      championship: { name: 'Copa 2026', slug: 'copa-2026', status: 'running', startsAt: null },
      teamName: 'Computação',
      organizationName: 'Atlética Computação',
      number: 7,
      games: 3,
      totals: { aces: 6, blocks: 1 },
    },
    {
      championship: { name: 'Copa 2025', slug: 'copa-2025', status: 'finished', startsAt: null },
      teamName: 'Computação',
      organizationName: 'Atlética Computação',
      number: 9,
      games: 2,
      totals: { aces: 3, blocks: 3 },
    },
  ],
};

const athlete: PublicAthlete = {
  id: 'a1',
  name: 'Bia Lima',
  organization: { name: 'Atlética Computação', slug: 'computacao' },
  current: sport.byChampionship[0]!,
  sports: [sport],
};

function renderAt(path: string, element: React.ReactNode, route: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('página pública do atleta', () => {
  it('monta a tabela com as colunas do módulo e o total', async () => {
    api.publicAthlete.mockResolvedValue(athlete);
    renderAt('/atletas/a1', <PublicAthletePage />, '/atletas/:id');
    expect(await screen.findByRole('heading', { name: 'Bia Lima' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Estatísticas de Vôlei' });
    expect(within(table).getByRole('columnheader', { name: 'ACE' })).toHaveAttribute(
      'title',
      'Aces',
    );
    const total = within(table).getByText('Total').closest('tr')!;
    expect(within(total).getByText('9')).toBeInTheDocument();
    // Campeonato por slug: link curto que resolve o id.
    expect(within(table).getByRole('link', { name: 'Copa 2025' })).toHaveAttribute(
      'href',
      '/c/copa-2025',
    );
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('perfil oculto ou sem autorização: "Perfil indisponível"', async () => {
    api.publicAthlete.mockRejectedValue(new HttpError(404, 'not_found', 'Não encontrado'));
    renderAt('/atletas/a1', <PublicAthletePage />, '/atletas/:id');
    expect(await screen.findByRole('heading', { name: 'Perfil indisponível' })).toBeInTheDocument();
  });
});

describe('área do atleta', () => {
  const org = {
    id: 'o1',
    name: 'Atlética Computação',
    slug: 'c',
    isGuest: false,
    publicationConsent: true,
    isPersonal: false,
  };

  it('sem cadastro ligado, explica como aparecer', () => {
    session.me = { user: { email: 'bia@ex.com' }, memberships: [], athletes: [] };
    renderAt('/atleta', <AthleteArea />, '/atleta');
    expect(screen.getByText(/bia@ex\.com/)).toBeInTheDocument();
    expect(api.meAthleteChampionships).not.toHaveBeenCalled();
  });

  it('e-mail não confirmado: pede a confirmação', async () => {
    session.me = {
      user: { email: 'bia@ex.com' },
      memberships: [],
      athletes: [{ id: 'a1', name: 'Bia', organization: org }],
    };
    api.meAthleteChampionships.mockRejectedValue(
      new HttpError(403, 'email_not_verified', 'Confirme'),
    );
    renderAt('/atleta', <AthleteArea />, '/atleta');
    expect(await screen.findByRole('link', { name: 'Confirmar e-mail' })).toBeInTheDocument();
  });

  it('lista campeonatos atuais e passados com equipe e número', async () => {
    session.me = {
      user: { email: 'bia@ex.com' },
      memberships: [],
      athletes: [{ id: 'a1', name: 'Bia', organization: org }],
    };
    const item = (id: string, name: string, status: 'running' | 'finished') => ({
      championship: {
        id,
        name,
        slug: id,
        sportKey: 'basketball',
        status,
        startsAt: null,
        endsAt: null,
      },
      athleteId: 'a1',
      team: { id: 't1', name: 'Computação' },
      organization: org,
      number: 7,
      registrationStatus: 'approved' as const,
    });
    api.meAthleteChampionships.mockResolvedValue({
      current: [item('c1', 'Copa 2026', 'running')],
      past: [item('c0', 'Copa 2025', 'finished')],
      future: [],
    });
    renderAt('/atleta', <AthleteArea />, '/atleta');
    const current = await screen.findByRole('list', { name: 'Em andamento' });
    expect(within(current).getByRole('link', { name: 'Copa 2026' })).toHaveAttribute(
      'href',
      '/campeonatos/c1',
    );
    expect(within(current).getByText(/Computação · nº 7/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Encerrados' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Próximos' })).toBeNull();
  });
});
