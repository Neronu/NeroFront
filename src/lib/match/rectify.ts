import { effectiveEvents, replayStrict, type MatchSetup, type RuleSet } from '@neronu/sport-core';
import type { RectifyChange } from '../api/contract';
import type { AnySport } from '../sports';
import type { SportState, TableEvent } from './table';

type Effective = Exclude<TableEvent, { type: 'void' }>;

/**
 * Lista de lances que valem depois das mudanças, na ordem de jogo: sem os anulados e com os
 * incluídos logo depois do lance âncora (null = antes do primeiro). Mesmo efeito que a API aplica.
 */
export function applyChanges(events: readonly TableEvent[], changes: readonly RectifyChange[]) {
  const voided = new Set(changes.flatMap((c) => (c.op === 'void' ? [c.targetId] : [])));
  let list: Effective[] = effectiveEvents(events) as Effective[];
  // Inclusões na ordem em que foram feitas: duas com a mesma âncora ficam em sequência.
  const after = new Map<string | null, Effective[]>();
  for (const c of changes) {
    if (c.op !== 'add') continue;
    const bucket = after.get(c.afterEventId) ?? [];
    bucket.push(c.event as unknown as Effective);
    after.set(c.afterEventId, bucket);
  }
  const out: Effective[] = [...(after.get(null) ?? [])];
  for (const e of list) {
    out.push(e);
    out.push(...(after.get(e.id) ?? []));
  }
  list = out.filter((e) => !voided.has(e.id));
  return list;
}

export type Preview =
  { ok: true; state: SportState } | { ok: false; message: string; event: Effective | undefined };

/** Reaplica o jogo inteiro com as mudanças, validando cada lance, como a API fará. */
export function previewRectification(
  sport: AnySport,
  setup: MatchSetup,
  rules: RuleSet,
  events: readonly TableEvent[],
  changes: readonly RectifyChange[],
): Preview {
  const list = applyChanges(events, changes);
  const result = replayStrict(sport, setup, rules, list);
  if (result.ok) {
    const state = result.state as SportState;
    if (state.status !== 'finished')
      return { ok: false, message: 'Depois das mudanças o jogo não termina.', event: undefined };
    return { ok: true, state };
  }
  return { ok: false, message: result.message, event: list[result.index] };
}
