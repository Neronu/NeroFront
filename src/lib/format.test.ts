import { expect, it } from 'vitest';
import {
  championshipCode,
  dayKey,
  dayLabel,
  formatClock,
  formatElapsed,
  shortDate,
  signed,
  sportName,
} from './format';

it('formata saldo com sinal e menos tipográfico', () => {
  expect(signed(37)).toBe('+37');
  expect(signed(-21)).toBe('−21');
  expect(signed(0)).toBe('0');
});

it('agrupa por dia local e escreve a data por extenso', () => {
  const key = dayKey(new Date(2026, 10, 14, 19, 30).toISOString());
  expect(key).toBe('2026-11-14');
  expect(dayLabel(key!)).toMatch(/sábado, 14 de novembro/);
  expect(dayKey(null)).toBeNull();
});

it('traduz a chave do esporte', () => {
  expect(sportName('basketball')).toBe('Basquete');
});

it('escreve data curta e o código do campeonato', () => {
  expect(shortDate(new Date(2026, 10, 20, 10).toISOString())).toBe('20 nov');
  expect(championshipCode('cia-2026')).toBe('CIA-2026');
});

it('escreve o relógio de jogo em mm:ss e com décimos no último minuto', () => {
  expect(formatClock(600_000)).toBe('10:00');
  expect(formatClock(599_001)).toBe('10:00');
  expect(formatClock(65_000)).toBe('01:05');
  expect(formatClock(60_000)).toBe('01:00');
  expect(formatClock(59_999)).toBe('59.9');
  expect(formatClock(4_250)).toBe('4.2');
  expect(formatClock(0)).toBe('0.0');
  expect(formatClock(-5)).toBe('0.0');
});

it('formata o relógio crescente sempre em mm:ss, sem limite', () => {
  expect(formatElapsed(0)).toBe('00:00');
  expect(formatElapsed(5_900)).toBe('00:05');
  expect(formatElapsed(65_000)).toBe('01:05');
  expect(formatElapsed(3_665_000)).toBe('61:05');
  expect(formatElapsed(-1)).toBe('00:00');
});
