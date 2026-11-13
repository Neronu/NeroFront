import type { MatchStateResponse, StoredEvent } from '../../lib/api/contract';
import { defaultRules } from '@neronu/sport-basketball';
import { defaultRules as rules3x3 } from '@neronu/sport-basketball-3x3';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TablePage } from './TablePage';

const roster = (prefix: string, team: string, size = 7, starters = 5) =>
  Array.from({ length: size }, (_, i) => ({
    athleteId: `${prefix}${i + 4}`,
    name: `${team}${i + 4} Silva`,
    number: i + 4,
    isStarter: i < starters,
  }));

/** Servidor falso: grava com sequência e idempotência; pode ficar fora do ar. */
function fakeServer(sport: '5x5' | '3x3' = '5x5') {
  const x3 = sport === '3x3';
  const events: StoredEvent[] = [];
  const server = { events, down: false, posts: 0 };
  const state = (): MatchStateResponse => ({
    match: {
      id: 'm1',
      organizationId: 'o1',
      championshipId: null,
      sportKey: x3 ? 'basketball_3x3' : 'basketball',
      rules: x3 ? { ...rules3x3 } : { ...defaultRules },
      status: 'in_progress',
      homeTeam: { id: 'th', organizationId: 'o1', name: 'Casa', shortName: null },
      awayTeam: { id: 'ta', organizationId: 'o1', name: 'Fora', shortName: null },
      scheduledAt: null,
      venue: null,
      createdAt: '2026-11-10T00:00:00Z',
      closedAt: null,
    },
    roster: {
      home: { teamId: 'th', roster: x3 ? roster('h', 'Casa', 4, 3) : roster('h', 'Casa') },
      away: { teamId: 'ta', roster: x3 ? roster('a', 'Fora', 4, 3) : roster('a', 'Fora') },
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

it('3x3: cestas de 1 e 2, lance livre, faltas coletivas e fim aos 21', async () => {
  fake = fakeServer('3x3');
  vi.stubGlobal('fetch', fake.fetchMock);
  renderTable();
  fireEvent.click(await screen.findByRole('button', { name: 'Iniciar jogo' }));
  expect(within(board()).getByText('Tempo normal · até 21')).toBeInTheDocument();
  // Sem botão de +3 nem técnico na linha do atleta.
  expect(screen.queryByRole('button', { name: /^\+3 para/ })).not.toBeInTheDocument();

  tap('+1, cesta de 1 para o número 4, Casa4 Silva');
  tap('Lance livre para o número 5, Fora5 Silva');
  await flush();
  expect(screen.getByText(/\+1 lance livre · #5 Fora5 Silva/)).toBeInTheDocument();

  for (let i = 0; i < 6; i++) tap('Falta para o número 4, Casa4 Silva');
  // A próxima falta coletiva da Casa dá 2 lances livres.
  expect(screen.getByText('2 LL')).toBeInTheDocument();

  for (let i = 0; i < 10; i++) tap('+2, cesta de 2 para o número 6, Casa6 Silva');
  await flush();
  expect(within(board()).getByText('21')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Conferir súmula' })).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '+1, cesta de 1 para o número 4, Casa4 Silva' }),
  ).toBeDisabled();
});

describe('relógio', () => {
  const T0 = new Date('2026-11-10T20:00:00.000Z');
  beforeEach(() => {
    // Só a hora e o tick do relógio são falsos; o setTimeout do `flush` continua real.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  const timer = () => screen.getByRole('timer', { name: 'Relógio do período' });
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it('inicia, pausa e retoma, gravando eventos; o Desfazer ignora o relógio', async () => {
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
    expect(timer()).toHaveTextContent('10:00');

    tap('Iniciar relógio');
    advance(5_000);
    expect(timer()).toHaveTextContent('09:55');
    launch('+2', 4, 'Casa');

    tap('Pausar relógio');
    advance(30_000);
    expect(timer()).toHaveTextContent('09:55');
    tap('Retomar relógio');
    advance(1_000);
    expect(timer()).toHaveTextContent('09:54');
    await flush();

    const types = fake.server.events.map((e) => e.type);
    expect(types).toEqual(['period_start', 'clock_start', 'score', 'clock_stop', 'clock_start']);
    expect(fake.server.events[1]!.recordedAt).toBe(T0.toISOString());
    expect(fake.server.events[3]).toMatchObject({ payload: { remainingMs: 595_000 } });

    // Último lançamento continua sendo a cesta; desfazer anula a cesta, não o relógio.
    expect(screen.getByText(/\+2 · #4 Casa4 Silva/)).toBeInTheDocument();
    tap(/Desfazer/);
    await flush();
    expect(fake.server.events.at(-1)).toMatchObject({
      type: 'void',
      payload: { targetId: fake.server.events[2]!.id },
    });
  });

  it('ao zerar, para sozinho, avisa e libera o encerramento sem confirmação', async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmSpy);
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
    tap('Iniciar relógio');
    advance(600_500);
    await flush();

    expect(timer()).toHaveTextContent('0.0');
    expect(fake.server.events.at(-1)).toMatchObject({
      type: 'clock_stop',
      payload: { remainingMs: 0 },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/Tempo esgotado/);
    expect(screen.getByRole('button', { name: /relógio/ })).toBeDisabled();

    tap(/Encerrar 1º quarto/);
    await flush();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fake.server.events.at(-1)).toMatchObject({ type: 'period_end' });
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('a barra de espaço alterna o relógio', async () => {
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(screen.getByRole('button', { name: 'Pausar relógio' })).toBeInTheDocument();
    advance(1_000);
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(screen.getByRole('button', { name: 'Retomar relógio' })).toBeInTheDocument();
  });

  const shotTimer = () => screen.getByRole('timer', { name: 'Tempo de posse' });

  it('posse corre com o relógio, reinicia em 24 ou 14 e não vira evento', async () => {
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
    expect(shotTimer()).toHaveTextContent('24.0');

    tap('Iniciar relógio');
    advance(5_000);
    expect(shotTimer()).toHaveTextContent('19.0');
    tap('Pausar relógio');
    advance(10_000);
    expect(shotTimer()).toHaveTextContent('19.0');

    tap('Reiniciar posse em 14 segundos');
    expect(shotTimer()).toHaveTextContent('14.0');
    tap('Retomar relógio');
    advance(2_000);
    expect(shotTimer()).toHaveTextContent('12.0');

    // Teclado: R volta a 24, T a 14.
    fireEvent.keyDown(document.body, { code: 'KeyR', key: 'r' });
    expect(shotTimer()).toHaveTextContent('24.0');
    fireEvent.keyDown(document.body, { code: 'KeyT', key: 't' });
    expect(shotTimer()).toHaveTextContent('14.0');

    await flush();
    expect(fake.server.events.map((e) => e.type)).toEqual([
      'period_start',
      'clock_start',
      'clock_stop',
      'clock_start',
    ]);
  });

  it('posse estoura: avisa sem parar o jogo e some ao reiniciar', async () => {
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
    tap('Iniciar relógio');
    advance(24_500);
    await flush();

    expect(shotTimer()).toHaveTextContent('0.0');
    expect(screen.getByRole('alert')).toHaveTextContent(/Estouro do tempo de posse/);
    expect(screen.getByRole('button', { name: 'Pausar relógio' })).toBeInTheDocument();
    expect(fake.server.events.at(-1)).toMatchObject({ type: 'clock_start' });

    tap(/Reiniciar 24s/);
    expect(shotTimer()).toHaveTextContent('24.0');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('posse desliga quando o jogo tem menos tempo que ela', async () => {
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
    tap('Iniciar relógio');
    // 59 × 10s = 590s, reiniciando a posse antes de estourar.
    for (let i = 0; i < 59; i++) {
      advance(10_000);
      fireEvent.keyDown(document.body, { code: 'KeyR', key: 'r' });
    }
    // 10s no jogo, 24s na posse.
    expect(timer()).toHaveTextContent('10.0');
    expect(shotTimer()).toHaveTextContent('—');
  });

  it('posse sobrevive a recarregar a mesa', async () => {
    const view = renderTable();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar 1º quarto/ }));
    tap('Reiniciar posse em 14 segundos');
    await flush();
    view.unmount();
    renderTable();
    await screen.findByRole('button', { name: /Encerrar 1º quarto/ });
    expect(shotTimer()).toHaveTextContent('14.0');
  });

  it('3x3: posse de 12s, só com reinício em 12', async () => {
    fake = fakeServer('3x3');
    vi.stubGlobal('fetch', fake.fetchMock);
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar jogo' }));
    expect(shotTimer()).toHaveTextContent('12.0');
    expect(screen.getByRole('button', { name: 'Reiniciar posse em 12 segundos' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Reiniciar posse em 14/ })).not.toBeInTheDocument();
  });

  it('3x3: regressivo no tempo normal, crescente e sem limite na prorrogação', async () => {
    fake = fakeServer('3x3');
    vi.stubGlobal('fetch', fake.fetchMock);
    renderTable();
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar jogo' }));
    expect(timer()).toHaveTextContent('10:00');
    tap(/Encerrar tempo normal/);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar prorrogação/ }));
    expect(timer()).toHaveTextContent('00:00');
    expect(shotTimer()).toHaveTextContent('12.0');

    tap('Iniciar relógio');
    advance(65_000);
    expect(timer()).toHaveTextContent('01:05');
    // A posse corre junto e não é desligada pelo relógio crescente.
    expect(shotTimer()).toHaveTextContent('0.0');
    expect(screen.getByRole('alert')).toHaveTextContent(/Estouro do tempo de posse/);
    tap('Reiniciar posse em 12 segundos');

    tap('Pausar relógio');
    advance(10_000);
    expect(timer()).toHaveTextContent('01:05');
    tap('Retomar relógio');
    advance(3_600_000);
    expect(timer()).toHaveTextContent('61:05');
    await flush();
    expect(
      fake.server.events.find((e) => e.type === 'clock_stop' && 'elapsedMs' in e.payload),
    ).toMatchObject({ payload: { elapsedMs: 65_000 } });
  });
});
