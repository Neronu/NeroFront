import { expect, it } from 'vitest';
import { fitFrame } from './useFrameFit';

it('escala o quadro de 1280 × 720 para caber, sempre em 16:9', () => {
  expect(fitFrame(1920, 1080)).toEqual({ compact: false, scale: 1.5, width: 1920, height: 1080 });
  const tall = fitFrame(1280, 1000);
  expect(tall).toMatchObject({ compact: false, scale: 1, width: 1280, height: 720 });
  const wide = fitFrame(1440, 600);
  expect(wide.height).toBe(600);
  expect(wide.width / wide.height).toBeCloseTo(16 / 9);
});

it('abaixo de bp-lg (celular deitado) não escala: fica compacto e 16:9', () => {
  const phone = fitFrame(740, 360);
  expect(phone.compact).toBe(true);
  expect(phone.scale).toBe(1);
  expect(phone.height).toBe(360);
  expect(phone.width).toBeCloseTo(640);
});
