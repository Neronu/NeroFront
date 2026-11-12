import { defaultRules, type BasketballRules } from '@neronu/sport-basketball';
import type { MatchSetup } from '@neronu/sport-core';
import { describe, expect, it } from 'vitest';
import { applyChanges, previewRectification } from './rectify';
import type { TableEvent } from './table';

const side = (p: string, teamId: string) => ({
  teamId,
  roster: Array.from({ length: 5 }, (_, i) => ({
    athleteId: `${p}${i + 4}`,
    number: i + 4,
    isStarter: true,
  })),
});
const setup: MatchSetup = { home: side('h', 'th'), away: side('a', 'ta') };
const rules = defaultRules as BasketballRules;

const ev = (id: string, type: string, payload: Record<string, unknown>) =>
  ({ id, type, payload }) as TableEvent;

/** Jogo de 4 quartos: casa 3 × 2 fora, com uma cesta anulada na mesa. */
function game(): TableEvent[] {
  const out: TableEvent[] = [];
  for (let p = 1; p <= 4; p++) {
    out.push(ev(`s${p}`, 'period_start', { period: p }));
    if (p === 1) {
      out.push(ev('c1', 'score', { athleteId: 'h4', points: 3 }));
      out.push(ev('c2', 'score', { athleteId: 'a4', points: 2 }));
      out.push(ev('c3', 'score', { athleteId: 'a5', points: 2 }));
      out.push(ev('v1', 'void', { targetId: 'c3' }));
    }
    out.push(ev(`e${p}`, 'period_end', { period: p }));
  }
  return out;
}

describe('retificação', () => {
  it('aplica anulação e inclusão na ordem de jogo, sem os já anulados', () => {
    const list = applyChanges(game(), [
      { op: 'void', targetId: 'c2' },
      {
        op: 'add',
        afterEventId: 'c1',
        event: { id: 'n1', type: 'score', payload: { athleteId: 'a6', points: 1 } },
      },
    ]);
    expect(list.slice(0, 4).map((e) => e.id)).toEqual(['s1', 'c1', 'n1', 'e1']);
    expect(list.some((e) => e.id === 'c3' || e.id === 'v1')).toBe(false);
  });

  it('mostra o novo placar antes de enviar', () => {
    const preview = previewRectification(setup, rules, game(), [
      {
        op: 'add',
        afterEventId: 'c2',
        event: { id: 'n1', type: 'score', payload: { athleteId: 'a4', points: 3 } },
      },
    ]);
    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.state.teams.home.score).toBe(3);
      expect(preview.state.teams.away.score).toBe(5);
    }
  });

  it('recusa mudança que deixa o jogo inválido, apontando o lance', () => {
    // Cesta antes do início do 1º quarto: período não está rodando.
    const preview = previewRectification(setup, rules, game(), [
      {
        op: 'add',
        afterEventId: null,
        event: { id: 'n1', type: 'score', payload: { athleteId: 'h4', points: 2 } },
      },
    ]);
    expect(preview.ok).toBe(false);
    if (!preview.ok) expect(preview.event?.id).toBe('n1');
  });

  it('recusa empate no fim (o jogo deixa de terminar)', () => {
    const preview = previewRectification(setup, rules, game(), [
      { op: 'void', targetId: 'c1' },
      { op: 'void', targetId: 'c2' },
    ]);
    expect(preview.ok).toBe(false);
  });
});
