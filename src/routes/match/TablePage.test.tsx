import type { MatchStateResponse, StoredEvent } from '@neronu/api-contract';
import { defaultRules } from '@neronu/sport-basketball';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TablePage } from './TablePage';

const roster = (prefix: string, team: string) =>
  Array.from({ length: 7 }, (_, i) => ({
    athleteId: `${prefix}${i + 4}`,
    name: `${team}${i + 4} Silva`,
    number: i + 4,
    isStarter: i < 5,
  }));

/** Servidor falso: grava com sequência e idempotência; pode ficar fora do ar. */
function fakeServer() {
  const events: StoredEvent[] = [];
  const server = { events, down: false, posts: 0 };
  const state = (): MatchStateResponse => ({
    match: {
      id: 'm1',
      organizationId: 'o1',
      championshipId: null,
      sportKey: 'basketball',
      rules: { ...defaultRules },
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
    if (server.down) throw new TypeError('Failed to fetch');
    if (String(url).endsWith('/state')) return new Response(JSON.stringify(state()));
    const body = JSON.parse(String(init!.body));
    server.posts++;
    let stored = events.find((e) => e.id === body.id);
    if (!stored) {
      stored = {
        ...body,
        seq: events.length + 1,
        recordedAt: body.recordedAt ?? null,
      } as StoredEvent;
      events.push(stored);
    }
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
const tap = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));
const player = (n: number, team: 'Casa' | 'Fora') => tap(new RegExp(`^Número ${n}, ${team}${n} `));

it('anota um período em dois toques e não perde lances quando a conexão cai', async () => {
  render(
    <MemoryRouter initialEntries={['/partidas/m1/mesa']}>
      <Routes>
        <Route path="/partidas/:id/mesa" element={<TablePage />} />
      </Routes>
    </MemoryRouter>,
  );
  tap(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }).then((b) => b.textContent!));

  player(4, 'Casa');
  tap('+3');
  player(5, 'Fora');
  tap('+2');
  await flush();
  expect(fake.server.events).toHaveLength(3);

  // Cai a conexão: a mesa continua anotando.
  fake.server.down = true;
  player(4, 'Casa');
  tap('Falta');
  player(6, 'Casa');
  tap('+2');
  await flush();
  expect(screen.getByRole('button', { name: /Sem conexão · 2 na fila/ })).toBeInTheDocument();
  const board = document.querySelector('.scoreboard') as HTMLElement;
  expect(within(board).getByText('5')).toBeInTheDocument();
  expect(within(board).getByText('2')).toBeInTheDocument();

  // Volta a conexão.
  fake.server.down = false;
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
  await flush();
  await flush();
  expect(screen.getByRole('button', { name: 'Sincronizado' })).toBeInTheDocument();
  expect(fake.server.events.map((e) => e.type)).toEqual([
    'period_start',
    'score',
    'score',
    'foul',
    'score',
  ]);

  // Anula a última cesta pela lista de lances.
  fireEvent.click(screen.getAllByRole('button', { name: 'Anular' })[0]!);
  await flush();
  expect(fake.server.events.at(-1)).toMatchObject({
    type: 'void',
    payload: { targetId: fake.server.events[4]!.id },
  });
  expect(within(board).getByText('3')).toBeInTheDocument();
});

it('recusa na mesa o lance de atleta excluído', async () => {
  render(
    <MemoryRouter initialEntries={['/partidas/m1/mesa']}>
      <Routes>
        <Route path="/partidas/:id/mesa" element={<TablePage />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
  for (let i = 0; i < 5; i++) {
    player(7, 'Fora');
    tap('Falta');
  }
  await flush();
  expect(screen.getByRole('button', { name: /^Número 7, Fora7/ })).toBeDisabled();
  expect(screen.getByText(/EXC/)).toBeInTheDocument();
});
