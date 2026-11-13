import { describe, expect, it } from 'vitest';
import { initialShot, parseShot, resetShot, shotRemaining, syncWithGame } from './shot-clock';

const config = { durationMs: 24_000, resets: [24_000, 14_000] };
const at = (ms: number) => new Date(Date.parse('2026-11-10T20:00:00.000Z') + ms);

describe('cronômetro de posse', () => {
  it('começa cheio e parado', () => {
    const s = initialShot(config, 1);
    expect(s).toEqual({ remainingMs: 24_000, runningSince: null, period: 1 });
    expect(shotRemaining(s, at(10_000))).toBe(24_000);
  });

  it('corre e pausa junto com o relógio de jogo', () => {
    let s = syncWithGame(initialShot(config, 1), true, at(0));
    expect(shotRemaining(s, at(5_000))).toBe(19_000);
    s = syncWithGame(s, false, at(5_000));
    expect(s.runningSince).toBeNull();
    expect(shotRemaining(s, at(60_000))).toBe(19_000);
    s = syncWithGame(s, true, at(60_000));
    expect(shotRemaining(s, at(61_000))).toBe(18_000);
  });

  it('não muda quando o jogo já está no mesmo estado', () => {
    const s = syncWithGame(initialShot(config, 1), true, at(0));
    expect(syncWithGame(s, true, at(3_000))).toBe(s);
  });

  it('nunca fica negativo', () => {
    const s = syncWithGame(initialShot(config, 1), true, at(0));
    expect(shotRemaining(s, at(30_000))).toBe(0);
  });

  it('reinicia correndo ou parado, conforme o jogo', () => {
    const running = syncWithGame(initialShot(config, 1), true, at(0));
    const r = resetShot(running, 14_000, true, at(20_000));
    expect(shotRemaining(r, at(21_000))).toBe(13_000);
    const stopped = resetShot(running, 24_000, false, at(20_000));
    expect(stopped.runningSince).toBeNull();
    expect(shotRemaining(stopped, at(99_000))).toBe(24_000);
  });

  it('descarta estado salvo fora do formato', () => {
    const ok = { remainingMs: 10_000, runningSince: null, period: 2 };
    expect(parseShot(ok)).toEqual(ok);
    expect(parseShot(null)).toBeNull();
    expect(parseShot('x')).toBeNull();
    expect(parseShot({ ...ok, remainingMs: -1 })).toBeNull();
    expect(parseShot({ ...ok, runningSince: 'ontem' })).toBeNull();
    expect(parseShot({ ...ok, period: '2' })).toBeNull();
  });
});
