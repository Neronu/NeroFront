import { basketball } from '@neronu/sport-basketball';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compareModule, fetchApiStatus } from './health';

const [major] = basketball.version.split('.');

describe('compareModule', () => {
  it('aceita o mesmo major', () => {
    expect(
      compareModule({ status: 'ok', sportModules: { basketball: `${major}.99.0` } }).kind,
    ).toBe('ok');
  });
  it('acusa major diferente', () => {
    expect(
      compareModule({ status: 'ok', sportModules: { basketball: `${Number(major) + 1}.0.0` } })
        .kind,
    ).toBe('mismatch');
  });
  it('acusa módulo ausente na API', () => {
    expect(compareModule({ status: 'ok', sportModules: {} }).kind).toBe('mismatch');
  });
});

describe('fetchApiStatus', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('devolve offline quando a rede falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await fetchApiStatus('http://api')).toEqual({
      kind: 'offline',
      message: 'Failed to fetch',
    });
  });
});
