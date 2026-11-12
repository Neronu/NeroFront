import { expect, it } from 'vitest';
import { championshipCode, dayKey, dayLabel, shortDate, signed, sportName, winPct } from './format';

it('formata saldo com sinal e menos tipográfico', () => {
  expect(signed(37)).toBe('+37');
  expect(signed(-21)).toBe('−21');
  expect(signed(0)).toBe('0');
});

it('calcula o aproveitamento', () => {
  expect(winPct(2, 3)).toBe('67%');
  expect(winPct(0, 0)).toBe('–');
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
