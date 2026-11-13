import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePolling } from './usePolling';

const setHidden = (hidden: boolean) =>
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });

beforeEach(() => {
  vi.useFakeTimers();
  setHidden(false);
});
afterEach(() => {
  vi.useRealTimers();
  setHidden(false);
});

it('chama refresh a cada intervalo enquanto a página está visível', () => {
  const refresh = vi.fn();
  renderHook(() => usePolling(refresh, 1000));
  vi.advanceTimersByTime(3000);
  expect(refresh).toHaveBeenCalledTimes(3);
});

it('não chama com a página oculta e atualiza ao voltar', () => {
  const refresh = vi.fn();
  renderHook(() => usePolling(refresh, 1000));
  setHidden(true);
  vi.advanceTimersByTime(3000);
  expect(refresh).not.toHaveBeenCalled();
  setHidden(false);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('não chama quando desligado', () => {
  const refresh = vi.fn();
  renderHook(() => usePolling(refresh, 1000, false));
  vi.advanceTimersByTime(3000);
  expect(refresh).not.toHaveBeenCalled();
});
