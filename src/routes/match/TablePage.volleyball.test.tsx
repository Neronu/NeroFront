import type { MatchStateResponse, StoredEvent } from '../../lib/api/contract';
import { defaultRules } from '@neronu/sport-volleyball';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TablePage } from './TablePage';

/** 8 atletas por equipe, camisas 4..11; as seis primeiras são titulares. */
const roster = (prefix: string, team: string) =>
  Array.from({ length: 8 }, (_, i) => ({
    athleteId: `${prefix}${i + 4}`,
    name: `${team}${i + 4} Silva`,
    number: i + 4,
    isStarter: i < 6,
  }));

/** Servidor falso de vôlei: melhor de 3, sets de 10 para o teste andar rápido. */
function fakeServer() {
  const events: StoredEvent[] = [];
  const server = { events };
  const state = (): MatchStateResponse => ({
    match: {
      id: 'm1',
      organizationId: 'o1',
      championshipId: null,
      sportKey: 'volleyball',
      rules: { ...defaultRules, setsToWin: 2, setPoints: 10, tieBreakPoints: 5 },
      status: 'in_progress',
      homeTeam: { id: 'th', organizationId: 'o1', name: 'Casa', shortName: null },
      awayTeam: { id: 'ta', organizationId: 'o1', name: 'Fora', shortName: null },
      scheduledAt: null,
      venue: null,
      createdAt: '2026-11-10T00:00:00Z',
      closedAt: null,
    },
    roster: {
      home: { teamId: 'th', roster: roster('h', 'Casa') },
      away: { teamId: 'ta', roster: roster('a', 'Fora') },
    },
    events,
    state: null,
    summary: { status: 'not_started', score: { home: 0, away: 0 }, phaseLabel: '' },
    playerStats: [],
    sheets: [],
  });
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/state')) return new Response(JSON.stringify(state()));
    const body = JSON.parse(String(init!.body));
    const stored = { ...body, seq: events.length + 1, recordedAt: body.recordedAt ?? null };
    events.push(stored as StoredEvent);
    return new Response(
      JSON.stringify({ event: stored, created: true, summary: state().summary }),
      { status: 201 },
    );
  });
  return { server, fetchMock };
}

let fake: ReturnType<typeof fakeServer>;

beforeEach(() => {
  localStorage.clear();
  fake = fakeServer();
  vi.stubGlobal('fetch', fake.fetchMock);
  vi.stubGlobal('confirm', () => true);
});
afterEach(() => vi.unstubAllGlobals());

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));
const button = (name: RegExp | string) => screen.getByRole('button', { name });
const tap = (name: RegExp | string) => fireEvent.click(button(name));
const who = (n: number, team: 'Casa' | 'Fora') => `número ${n}, ${team}${n} Silva`;
const board = () => screen.getByRole('region', { name: 'Placar' });

const renderTable = () =>
  render(
    <MemoryRouter initialEntries={['/partidas/m1/mesa']}>
      <Routes>
        <Route path="/partidas/:id/mesa" element={<TablePage />} />
      </Routes>
    </MemoryRouter>,
  );

/** Inicia o set escolhendo quem saca. */
async function startSet(label: RegExp, serving: 'home' | 'away') {
  fireEvent.click(await screen.findByRole('button', { name: label }));
  const dialog = screen.getByRole('dialog', { name: label });
  fireEvent.change(within(dialog).getByLabelText('Quem saca primeiro'), {
    target: { value: serving },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: label }));
}

it('lança pontos por atleta, controla o saque e abre o menu de erro', async () => {
  renderTable();
  await startSet(/Iniciar 1º set/, 'home');

  // Sem relógio nem cronômetro de posse no vôlei.
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  // Ace só para quem saca.
  expect(button(`Ace para o ${who(4, 'Casa')}`)).toBeEnabled();
  expect(button(`Ace para o ${who(4, 'Fora')}`)).toBeDisabled();

  tap(`Ponto de ataque para o ${who(4, 'Casa')}`);
  tap(`Erro para o ${who(5, 'Fora')}`);
  const menu = screen.getByRole('dialog', { name: /Erro · #5 Fora5 Silva/ });
  // O erro de saque é só de quem saca (a Casa).
  expect(within(menu).getByRole('button', { name: 'Erro de saque' })).toBeDisabled();
  fireEvent.click(within(menu).getByRole('button', { name: 'Erro de ataque' }));
  await flush();

  expect(within(board()).getByText('2')).toBeInTheDocument();
  expect(within(board()).getByText('Sets 0–0')).toBeInTheDocument();
  expect(screen.getByText(/Erro de ataque · #5 Fora5 Silva/)).toBeInTheDocument();
  expect(fake.server.events.map((e) => e.type)).toEqual(['set_start', 'point', 'point']);
});

it('substitui pelo "Mais lançamentos" e fecha o set sozinho', async () => {
  renderTable();
  await startSet(/Iniciar 1º set/, 'away');

  tap('Mais lançamentos');
  const more = screen.getByRole('dialog', { name: 'Mais lançamentos' });
  fireEvent.click(within(more).getAllByRole('button', { name: /Substituição \(6 restantes/ })[0]!);
  const sheet = screen.getByRole('dialog', { name: 'Substituição · Casa' });
  fireEvent.change(within(sheet).getByLabelText('Sai'), { target: { value: 'h4' } });
  fireEvent.change(within(sheet).getByLabelText('Entra'), { target: { value: 'h10' } });
  fireEvent.click(within(sheet).getByRole('button', { name: 'Confirmar substituição' }));
  await flush();
  expect(fake.server.events.at(-1)).toMatchObject({
    type: 'substitution',
    payload: { side: 'home', outId: 'h4', inId: 'h10' },
  });

  for (let i = 0; i < 10; i++) tap(`Ponto de ataque para o ${who(10, 'Casa')}`);
  await flush();
  // Set fechado: o placar grande passa a mostrar os sets e o próximo set alterna o saque.
  expect(within(board()).getByText(/Intervalo/)).toBeInTheDocument();
  fireEvent.click(button(/Iniciar 2º set/));
  const dialog = screen.getByRole('dialog', { name: /Iniciar 2º set/ });
  // O 1º set começou com a Fora sacando: a sugestão agora é a Casa.
  expect(within(dialog).getByLabelText('Quem saca primeiro')).toHaveValue('home');
});
