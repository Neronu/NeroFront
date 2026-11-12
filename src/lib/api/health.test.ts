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

  it('aponta banco ou storage fora quando /health/ready responde 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ status: 'degraded', db: 'error', storage: 'ok', sportModules: {} }),
            { status: 503 },
          ),
      ),
    );
    expect(await fetchApiStatus('http://api')).toEqual({
      kind: 'degraded',
      db: 'error',
      storage: 'ok',
    });
  });

  it('cai para /health quando a API não tem /health/ready', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/ready')
        ? new Response('{}', { status: 404 })
        : new Response(JSON.stringify({ status: 'ok', sportModules: {} })),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchApiStatus('http://api')).kind).toBe('mismatch');
    expect(fetchMock).toHaveBeenCalledWith('http://api/health', expect.anything());
  });
});
