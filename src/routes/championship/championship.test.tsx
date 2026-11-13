import type { ChampionshipMatch, StandingRow } from '../../lib/api/contract';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api/client';
import { resolveTab } from './ChampionshipPage';
import { NewChampionship } from './NewChampionship';
import { groupByDay, LIVE_REFRESH_MS, ResultsTab } from './ResultsTab';
import { projectSide, qualifiesCut, standingColumns, StandingsTab } from './StandingsTab';
import { StatsTab } from './StatsTab';

const row = (
  position: number,
  teamName: string,
  extra: Partial<StandingRow> = {},
): StandingRow => ({
  position,
  registrationId: `r${position}`,
  teamName,
  organizationName: 'Org',
  played: 3,
  won: 3 - position + 1,
  drawn: 0,
  lost: position - 1,
  pointsFor: 200,
  pointsAgainst: 180,
  diff: 20 - position * 10,
  points: 7 - position,
  qualifies: false,
  ...extra,
});

const match = (id: string, extra: Partial<ChampionshipMatch>): ChampionshipMatch => ({
  id,
  phaseId: 'p1',
  phaseName: 'Fase de grupos',
  groupId: 'g1',
  groupName: 'Grupo A',
  round: 1,
  roundName: 'Rodada 1',
  home: { registrationId: 'h', teamName: 'Computação' },
  away: { registrationId: 'a', teamName: 'Direito' },
  status: 'closed',
  homeScore: 58,
  awayScore: 51,
  scheduledAt: '2026-11-14T22:30:00.000Z',
  venue: 'Ginásio da UFMT',
  ...extra,
});

const standings = {
  phases: [
    {
      id: 'p1',
      name: 'Fase de grupos',
      groups: [
        {
          id: 'g1',
          name: 'Grupo A',
          complete: false,
          rows: [
            row(1, 'Computação', { qualifies: true }),
            row(2, 'Direito', { qualifies: true }),
            row(3, 'Medicina'),
          ],
        },
      ],
    },
  ],
};

vi.mock('../../lib/api/client', () => ({
  api: {
    createChampionship: vi.fn(async () => ({ id: 'novo' })),
    standings: vi.fn(async () => standings),
    bracket: vi.fn(async () => ({ phases: [], champion: null })),
    highlights: vi.fn(async () => ({
      champion: { registrationId: 'r2', teamName: 'Direito' },
      topScorer: {
        position: 1,
        athleteId: 'a3',
        name: 'Bia',
        teamName: 'Direito',
        registrationId: 'r2',
        games: 2,
        value: 31,
      },
    })),
    // Atletas ocultos chegam sem id e com o número no lugar do nome (E9).
    leaderboards: vi.fn(async () => ({
      boards: [
        {
          key: 'points',
          label: 'Pontos',
          stat: 'points',
          rows: [
            {
              position: 1,
              athleteId: null,
              name: 'Atleta nº 12',
              teamName: 'Computação',
              registrationId: 'r1',
              games: 2,
              value: 40,
            },
            {
              position: 1,
              athleteId: null,
              name: 'Atleta nº 7',
              teamName: 'Computação',
              registrationId: 'r1',
              games: 2,
              value: 40,
            },
            {
              position: 3,
              athleteId: 'a3',
              name: 'Bia',
              teamName: 'Direito',
              registrationId: 'r2',
              games: 2,
              value: 31,
            },
          ],
        },
      ],
    })),
    championshipMatches: vi.fn(async () => [
      match('m1', {}),
      match('m2', {
        status: 'in_progress',
        homeScore: 20,
        awayScore: 22,
        home: { registrationId: 'x', teamName: 'Engenharia' },
        away: { registrationId: 'y', teamName: 'Medicina' },
      }),
      match('m3', { status: 'scheduled', homeScore: null, awayScore: null, scheduledAt: null }),
    ]),
  },
  errorMessage: (e: unknown) => String(e),
}));
vi.mock('../../lib/session', () => ({
  useSession: () => ({ me: null, organizations: [] }),
  useOrg: () => ({ org: { id: 'o1', name: 'Atlética Computação' } }),
}));

describe('Novo campeonato', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <NewChampionship />
      </MemoryRouter>,
    );

  it('pede esporte e formato da disputa e os envia na criação', async () => {
    renderPage();
    const sport = screen.getByLabelText('Esporte');
    expect(sport).toHaveValue('basketball');
    expect(screen.getByText(/regras de basquete da Atlética Computação/)).toBeInTheDocument();
    const format = screen.getByLabelText('Formato da disputa');
    expect(format).toHaveValue('');
    expect(
      within(format)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Escolha o formato', 'Mata-mata', 'Pontos corridos', 'Misto (grupos + mata-mata)']);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Copa 2026' } });
    fireEvent.change(format, { target: { value: 'knockout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    await vi.waitFor(() =>
      expect(api.createChampionship).toHaveBeenCalledWith({
        organizationId: 'o1',
        name: 'Copa 2026',
        sportKey: 'basketball',
        format: 'knockout',
      }),
    );
  });

  it('não cria sem formato escolhido', () => {
    vi.mocked(api.createChampionship).mockClear();
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Copa 2026' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Criar campeonato' }).closest('form')!);
    expect(api.createChampionship).not.toHaveBeenCalled();
  });
});

describe('abas do campeonato', () => {
  it('leva os valores antigos de ?aba= para as abas novas', () => {
    expect(resolveTab('jogos', 'running')).toBe('resultados');
    expect(resolveTab('chave', 'running')).toBe('classificacao');
    expect(resolveTab('rankings', 'running')).toBe('estatisticas');
    expect(resolveTab('inscricoes', 'running')).toBe('equipes');
    expect(resolveTab('classificacao', 'running')).toBe('classificacao');
    expect(resolveTab(null, 'registration')).toBe('equipes');
    expect(resolveTab('xyz', 'running')).toBe('resultados');
  });
});

describe('Classificação', () => {
  it('põe a divisória depois da última equipe que avança, e só quando nem todas avançam', () => {
    expect(qualifiesCut([row(1, 'A', { qualifies: true }), row(2, 'B')])).toBe(0);
    expect(qualifiesCut([row(1, 'A', { qualifies: true })])).toBe(-1);
    expect(qualifiesCut([row(1, 'A'), row(2, 'B')])).toBe(-1);
  });

  it('mostra as colunas na ordem combinada, com P, saldo com sinal e a divisória', async () => {
    render(<StandingsTab id="c1" />);
    const table = await screen.findByRole('table', { name: 'Classificação' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['#', 'Equipe', 'P', 'J', 'V', 'D', 'PF', 'PC', 'Saldo']);
    expect(within(table).getByText('+10')).toBeInTheDocument();
    expect(within(table).getByText('−10')).toBeInTheDocument();
    expect(within(table).getByText('Direito').closest('tr')).toHaveClass('is-divider-after');
    expect(screen.queryByText(/Acima da linha/)).toBeNull();
    expect(screen.queryByText(/P: pontos/)).toBeNull();
  });

  it('projeta a vaga indefinida do mata-mata com a posição atual do grupo', () => {
    const groups = [{ name: 'Grupo A', rows: [row(1, 'Medicina'), row(2, 'Direito')] }];
    const open = { label: '2º do Grupo A', registrationId: null, bye: false };
    expect(projectSide(open, groups)).toEqual({ name: 'Direito', source: '2º do Grupo A' });
    const set = { label: 'Odonto', registrationId: 'r9', bye: false };
    expect(projectSide(set, groups)).toEqual({ name: 'Odonto' });
    const other = { label: '1º do Grupo B', registrationId: null, bye: false };
    expect(projectSide(other, groups)).toEqual({ name: '1º do Grupo B' });
  });
});

describe('Resultados', () => {
  it('agrupa por dia com os jogos sem data no fim', () => {
    const groups = groupByDay([
      match('b', { scheduledAt: null }),
      match('a', { scheduledAt: '2026-11-14T22:30:00.000Z' }),
    ]);
    expect(groups.map(([day]) => day)).toEqual([expect.stringMatching(/^2026-11-1/), null]);
  });

  it('marca o vencedor só pelo peso, mostra Ao vivo e horário no jogo marcado', async () => {
    render(
      <MemoryRouter>
        <ResultsTab
          ch={
            {
              id: 'c1',
              status: 'running',
              canManage: false,
              organizer: { id: 'o1', name: 'Org' },
            } as never
          }
          onChange={() => {}}
        />
      </MemoryRouter>,
    );
    const final = await screen.findByRole('table', { name: /Computação 58 a 51 Direito/ });
    expect(within(final).getByText('Computação').closest('tr')).toHaveClass('is-winner');
    expect(within(final).getByText('Direito').closest('tr')).toHaveClass('is-loser');
    // Jogo em andamento: sem vencedor, com o selo.
    const live = screen.getByRole('table', { name: /Engenharia 20 a 22 Medicina/ });
    expect(within(live).getByText('Medicina').closest('tr')).not.toHaveClass('is-winner');
    expect(screen.getAllByText('Ao vivo')).toHaveLength(1);
    // Jogo marcado sem data: sem números.
    expect(screen.getByText('Sem data')).toBeInTheDocument();
    expect(screen.getByText('A definir')).toBeInTheDocument();
  });

  it('atualiza os placares sozinha a cada 5s enquanto há jogo ao vivo', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const calls = vi.mocked(api.championshipMatches);
      calls.mockClear();
      render(
        <MemoryRouter>
          <ResultsTab
            ch={
              {
                id: 'c1',
                status: 'running',
                canManage: false,
                organizer: { id: 'o1', name: 'Org' },
              } as never
            }
            onChange={() => {}}
          />
        </MemoryRouter>,
      );
      await screen.findByRole('table', { name: /Engenharia 20 a 22 Medicina/ });
      expect(calls).toHaveBeenCalledTimes(1);

      // O placar ao vivo muda na API e aparece sem recarregar a página.
      calls.mockResolvedValueOnce([
        match('m2', {
          status: 'in_progress',
          homeScore: 24,
          awayScore: 22,
          home: { registrationId: 'x', teamName: 'Engenharia' },
          away: { registrationId: 'y', teamName: 'Medicina' },
        }),
      ]);
      act(() => vi.advanceTimersByTime(LIVE_REFRESH_MS));
      expect(
        await screen.findByRole('table', { name: /Engenharia 24 a 22 Medicina/ }),
      ).toBeInTheDocument();
      expect(calls).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('não fica consultando sem jogo ao vivo', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const calls = vi.mocked(api.championshipMatches);
      calls.mockClear();
      calls.mockResolvedValueOnce([match('m1', {})]);
      render(
        <MemoryRouter>
          <ResultsTab
            ch={
              {
                id: 'c1',
                status: 'running',
                canManage: false,
                organizer: { id: 'o1', name: 'Org' },
              } as never
            }
            onChange={() => {}}
          />
        </MemoryRouter>,
      );
      await screen.findByRole('table', { name: /Computação 58 a 51 Direito/ });
      act(() => vi.advanceTimersByTime(LIVE_REFRESH_MS * 3));
      expect(calls).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  const generating = (format: string | null) =>
    render(
      <MemoryRouter>
        <ResultsTab
          ch={
            {
              id: 'c1',
              status: 'registration',
              format,
              canManage: true,
              organizer: { id: 'o1', name: 'Org' },
            } as never
          }
          onChange={() => {}}
        />
      </MemoryRouter>,
    );

  it('monta a tabela no formato escolhido na criação, sem perguntar de novo', () => {
    generating('round_robin');
    expect(screen.queryByLabelText('Formato')).not.toBeInTheDocument();
    expect(screen.getByText('Pontos corridos')).toBeInTheDocument();
    expect(screen.getByText('Turno e returno')).toBeInTheDocument();
  });

  it('campeonato antigo, sem formato, ainda escolhe ao montar a tabela', () => {
    generating(null);
    expect(screen.getByLabelText('Formato')).toHaveValue('groups_knockout');
  });
});

describe('Estatísticas', () => {
  it('lista atletas ocultos (sem id) sem colidir as linhas', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <StatsTab id="c1" />
      </MemoryRouter>,
    );
    const table = await screen.findByRole('table', { name: 'Pontos' });
    // Oculto: sem link para a página pública.
    expect(within(table).getByText('Atleta nº 12').closest('a')).toBeNull();
    expect(within(table).getByText('Atleta nº 7')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'Bia' })).toHaveAttribute('href', '/atletas/a3');
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining('same key'), expect.anything());
    error.mockRestore();
  });

  it('mostra campeão e cestinha vindos dos destaques da API', async () => {
    render(
      <MemoryRouter>
        <StatsTab id="c1" />
      </MemoryRouter>,
    );
    const aside = await screen.findByRole('complementary', { name: 'Destaques' });
    expect(within(aside).getByText('Direito')).toBeInTheDocument();
    expect(within(aside).getByRole('link', { name: 'Bia' })).toHaveAttribute('href', '/atletas/a3');
  });
});

describe('colunas da classificação por esporte', () => {
  it('3x3 mostra vitórias e média, sem pontos de classificação nem saldo', () => {
    const keys = (sport: string) => standingColumns(sport).map((c) => c.key);
    expect(keys('basketball')).toContain('diff');
    expect(keys('basketball_3x3')).toEqual(['pos', 'team', 'played', 'won', 'lost', 'pf', 'avg']);
  });
});
