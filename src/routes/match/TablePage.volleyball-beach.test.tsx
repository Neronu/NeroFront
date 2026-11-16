import type { MatchStateResponse, StoredEvent } from '../../lib/api/contract';
import { defaultRules } from '@neronu/sport-volleyball-beach';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TablePage } from './TablePage';

/** Duplas com camisas 4 e 5. */
const roster = (prefix: string, team: string) =>
  [4, 5].map((n) => ({
    athleteId: `${prefix}${n}`,
    name: `${team}${n} Silva`,
    number: n,
    isStarter: true,
  }));

/** Servidor falso de vôlei de praia: set único a 21. */
function fakeServer() {
  const events: StoredEvent[] = [];
  const server = { events };
  const state = (): MatchStateResponse => ({
    match: {
      id: 'm1',
      organizationId: 'o1',
      championshipId: null,
      sportKey: 'volleyball_beach',
      rules: { ...defaultRules, setsToWin: 1 },
      status: 'in_progress',
      homeTeam: { id: 'th', organizationId: 'o1', name: 'Areia', shortName: null },
      awayTeam: { id: 'ta', organizationId: 'o1', name: 'Mar', shortName: null },
      scheduledAt: null,
      venue: null,
      createdAt: '2026-11-10T00:00:00Z',
      closedAt: null,
    },
    roster: {
      home: { teamId: 'th', roster: roster('h', 'Areia') },
      away: { teamId: 'ta', roster: roster('a', 'Mar') },
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
const who = (n: number, team: 'Areia' | 'Mar') => `número ${n}, ${team}${n} Silva`;
const row = (n: number, team: 'Areia' | 'Mar') =>
  screen.getByRole('button', { name: `Ponto de ataque para o ${who(n, team)}` }).closest('li')!;

const renderTable = () =>
  render(
    <MemoryRouter initialEntries={['/partidas/m1/mesa']}>
      <Routes>
        <Route path="/partidas/:id/mesa" element={<TablePage />} />
      </Routes>
    </MemoryRouter>,
  );

it('inicia o set com os sacadores, alterna o saque por atleta e avisa a troca de lado', async () => {
  renderTable();
  fireEvent.click(await screen.findByRole('button', { name: /Iniciar set único/ }));
  const dialog = screen.getByRole('dialog', { name: /Iniciar set único/ });
  fireEvent.change(within(dialog).getByLabelText('1º sacador · Areia'), {
    target: { value: 'h5' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: /Iniciar set único/ }));
  await flush();
  expect(fake.server.events[0]).toMatchObject({
    type: 'set_start',
    payload: { set: 1, serving: 'home', firstServer: { home: 'h5', away: 'a4' } },
  });

  // Só o sacador (nº 5 da Areia) tem o ace ligado e o selo "Saca".
  expect(button(`Ace para o ${who(5, 'Areia')}`)).toBeEnabled();
  expect(button(`Ace para o ${who(4, 'Areia')}`)).toBeDisabled();
  expect(within(row(5, 'Areia')).getByText('Saca')).toBeInTheDocument();

  // A Mar recupera o saque: saca o 1º sacador dela (nº 4).
  fireEvent.click(button(`Ponto de ataque para o ${who(5, 'Mar')}`));
  expect(button(`Ace para o ${who(4, 'Mar')}`)).toBeEnabled();
  expect(button(`Ace para o ${who(5, 'Areia')}`)).toBeDisabled();

  // 7 pontos somados: aviso de troca de lado.
  for (let i = 0; i < 6; i++) fireEvent.click(button(`Ponto de ataque para o ${who(4, 'Mar')}`));
  expect(screen.getByText(/Troca de lado/)).toBeInTheDocument();
});

it('registra o abandono pelo "Mais lançamentos" e encerra o jogo', async () => {
  renderTable();
  fireEvent.click(await screen.findByRole('button', { name: /Iniciar set único/ }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: /Iniciar set único/ })).getByRole('button', {
      name: /Iniciar set único/,
    }),
  );
  fireEvent.click(button('Mais lançamentos'));
  const more = screen.getByRole('dialog', { name: 'Mais lançamentos' });
  // Sem substituição no vôlei de praia.
  expect(within(more).queryByRole('button', { name: /Substituição/ })).not.toBeInTheDocument();
  fireEvent.click(within(more).getAllByRole('button', { name: /Abandono/ })[1]!);
  await flush();
  expect(fake.server.events.at(-1)).toMatchObject({
    type: 'retirement',
    payload: { side: 'away' },
  });
  expect(screen.getByRole('link', { name: 'Conferir súmula' })).toBeInTheDocument();
});
