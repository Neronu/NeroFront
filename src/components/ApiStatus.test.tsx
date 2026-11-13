import { basketball } from '@neronu/sport-basketball';
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiStatus } from './ApiStatus';

afterEach(() => vi.unstubAllGlobals());

it('mostra a API online com a versão do módulo', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ status: 'ok', sportModules: { basketball: basketball.version } }),
        ),
    ),
  );
  render(<ApiStatus />);
  expect(await screen.findByText(/API online/)).toHaveTextContent(basketball.version);
});

it('avisa quando o banco está sem migrações desta versão da API', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 'degraded',
            db: 'ok',
            storage: 'ok',
            migrations: 'pending',
            sportModules: {},
          }),
          { status: 503 },
        ),
    ),
  );
  render(<ApiStatus />);
  const notice = await screen.findByText(/não recebeu todas as migrações/);
  expect(notice).toHaveTextContent('prisma:deploy');
  expect(notice).not.toHaveTextContent('Supabase');
});

it('lista banco e storage fora com aviso do Supabase', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 'degraded',
            db: 'error',
            storage: 'error',
            migrations: 'error',
            sportModules: {},
          }),
          { status: 503 },
        ),
    ),
  );
  render(<ApiStatus />);
  expect(await screen.findByText(/API no ar com falha/)).toHaveTextContent(
    'API no ar com falha em banco de dados e armazenamento de PDFs. Reative o projeto no Supabase antes da rodada.',
  );
});
