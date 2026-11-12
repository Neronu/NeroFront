import type { MatchStateResponse, StoredEvent } from '../../lib/api/contract';
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
/** Um toque por lançamento: o botão da própria linha do atleta. */
const launch = (label: '+1' | '+2' | '+3' | 'Falta', n: number, team: 'Casa' | 'Fora') =>
  tap(`${label} para o número ${n}, ${team}${n} Silva`);
const board = () => screen.getByRole('region', { name: 'Placar' });

const renderTable = () =>
  render(
    <MemoryRouter initialEntries={['/partidas/m1/mesa']}>
      <Routes>
        <Route path="/partidas/:id/mesa" element={<TablePage />} />
      </Routes>
    </MemoryRouter>,
  );

it('anota com um toque por lançamento e não perde lances quando a conexão cai', async () => {
  renderTable();
  fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));

  launch('+3', 4, 'Casa');
  launch('+2', 5, 'Fora');
  await flush();
  expect(fake.server.events).toHaveLength(3);
  expect(screen.getByText(/\+2 · #5 Fora5 Silva/)).toBeInTheDocument();

  // Cai a conexão: a mesa continua anotando e avisa numa faixa acima do rodapé.
  fake.server.down = true;
  launch('Falta', 4, 'Casa');
  launch('+2', 6, 'Casa');
  await flush();
  expect(screen.getByRole('button', { name: /Sem conexão · 2 na fila/ })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(/Sem conexão\. 2 lançamento/);
  expect(within(board()).getByText('5')).toBeInTheDocument();
  expect(within(board()).getByText('2')).toBeInTheDocument();

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

  // Desfazer anula o último lançamento.
  tap(/Desfazer/);
  await flush();
  expect(fake.server.events.at(-1)).toMatchObject({
    type: 'void',
    payload: { targetId: fake.server.events[4]!.id },
  });
  expect(within(board()).getByText('3')).toBeInTheDocument();

  // E qualquer lance pode ser anulado pelo histórico em "Mais lançamentos".
  tap(/Mais lançamentos/);
  const sheet = screen.getByRole('dialog', { name: 'Mais lançamentos' });
  fireEvent.click(within(sheet).getAllByRole('button', { name: 'Anular' })[0]!);
  await flush();
  expect(fake.server.events.at(-1)).toMatchObject({
    type: 'void',
    payload: { targetId: fake.server.events[3]!.id },
  });
});

it('recusa na mesa o lance de atleta excluído', async () => {
  renderTable();
  fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
  for (let i = 0; i < 5; i++) launch('Falta', 7, 'Fora');
  await flush();
  expect(screen.getByRole('button', { name: '+1 para o número 7, Fora7 Silva' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Falta para o número 7, Fora7 Silva' })).toBeDisabled();
  expect(screen.getByText('EXC')).toBeInTheDocument();
});

it('mostra os botões de lançamento só durante o período', async () => {
  renderTable();
  await screen.findByRole('button', { name: /Iniciar 1º quarto/ });
  expect(screen.getByRole('button', { name: '+2 para o número 4, Casa4 Silva' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Desfazer/ })).toBeDisabled();
});
