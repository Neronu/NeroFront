import { basketball, defaultRules, type BasketballRules } from '@neronu/sport-basketball';
import { computeState, type MatchSetup } from '@neronu/sport-core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { MatchStateResponse } from '../../lib/api/contract';
import type { TableEvent, TableSnapshot } from '../../lib/match/table';
import { RectifyDrawer } from './RectifyDrawer';
import { sportOf } from '../../lib/sports';

const api = vi.hoisted(() => ({ rectify: vi.fn() }));
vi.mock('../../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../../lib/api/client')>()),
  api,
}));

const roster = (p: string) =>
  Array.from({ length: 5 }, (_, i) => ({
    athleteId: `${p}${i + 4}`,
    name: `${p === 'h' ? 'Casa' : 'Fora'} ${i + 4}`,
    number: i + 4,
    isStarter: true,
  }));
const rules = defaultRules as BasketballRules;
const server = {
  match: {
    id: 'm1',
    organizationId: 'o1',
    championshipId: null,
    sportKey: 'basketball',
    rules: { ...defaultRules },
    status: 'closed',
    homeTeam: { id: 'th', organizationId: 'o1', name: 'Computação', shortName: null },
    awayTeam: { id: 'ta', organizationId: 'o1', name: 'Direito', shortName: null },
    scheduledAt: null,
    venue: null,
    createdAt: '2026-11-10T00:00:00Z',
    closedAt: '2026-11-10T02:00:00Z',
  },
  roster: {
    home: { teamId: 'th', roster: roster('h') },
    away: { teamId: 'ta', roster: roster('a') },
  },
} as unknown as MatchStateResponse;
const setup: MatchSetup = {
  home: { teamId: 'th', roster: roster('h') },
  away: { teamId: 'ta', roster: roster('a') },
};

const ev = (id: string, type: string, payload: Record<string, unknown>) =>
  ({ id, type, payload }) as TableEvent;
const confirmed: TableEvent[] = [];
for (let p = 1; p <= 4; p++) {
  confirmed.push(ev(`s${p}`, 'period_start', { period: p }));
  if (p === 1) {
    confirmed.push(ev('c1', 'score', { athleteId: 'h4', points: 3 }));
    confirmed.push(ev('c2', 'score', { athleteId: 'a4', points: 2 }));
  }
  confirmed.push(ev(`e${p}`, 'period_end', { period: p }));
}
const snapshot = {
  server,
  sport: sportOf('basketball'),
  setup,
  rules,
  confirmed,
  pending: [],
  state: computeState(basketball, setup, rules, confirmed),
  sync: 'synced',
  rejections: [],
  fromCache: false,
} as TableSnapshot;

beforeEach(() => vi.clearAllMocks());

it('inclui um lance, mostra o novo placar e envia com o motivo', async () => {
  api.rectify.mockResolvedValue({});
  const onDone = vi.fn();
  render(<RectifyDrawer open onClose={() => {}} snapshot={snapshot} onDone={onDone} />);
  const submit = screen.getByRole('button', { name: 'Retificar e gerar novo PDF' });
  expect(submit).toBeDisabled();

  // Cesta de 3 da Fora depois da cesta dela: 3 × 5.
  fireEvent.change(screen.getByLabelText('Atleta'), { target: { value: 'a5' } });
  fireEvent.change(screen.getByLabelText('Lance'), { target: { value: 'score:3' } });
  fireEvent.change(screen.getByLabelText('Posição'), { target: { value: 'c2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Incluir lance' }));
  expect(screen.getByRole('status')).toHaveTextContent(/Novo placar: Computação 3 × 5 Direito/);

  // Motivo curto não libera o envio.
  const reason = screen.getByLabelText(/Motivo/);
  fireEvent.change(reason, { target: { value: 'erro' } });
  expect(submit).toBeDisabled();
  fireEvent.change(reason, { target: { value: 'Cesta de 3 do nº 5 não anotada' } });
  fireEvent.click(submit);

  await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  const [id, body] = api.rectify.mock.calls[0]!;
  expect(id).toBe('m1');
  expect(body.reason).toBe('Cesta de 3 do nº 5 não anotada');
  expect(body.changes).toEqual([
    {
      op: 'add',
      afterEventId: 'c2',
      event: { id: expect.any(String), type: 'score', payload: { athleteId: 'a5', points: 3 } },
    },
  ]);
});

it('anular e manter um lance atualiza a prévia do placar', () => {
  render(<RectifyDrawer open onClose={() => {}} snapshot={snapshot} onDone={() => {}} />);
  const list = screen.getByRole('list', { name: 'Lances da súmula' });
  const row = within(list)
    .getByText(/\+3 · #4 Casa 4/)
    .closest('li')!;
  fireEvent.click(within(row).getByRole('button', { name: 'Anular' }));
  // 0 × 2 continua válido: placar novo aparece.
  expect(screen.getByRole('status')).toHaveTextContent(/0 × 2/);
  fireEvent.click(within(row).getByRole('button', { name: 'Manter' }));
  expect(screen.queryByRole('status')).toBeNull();
});
