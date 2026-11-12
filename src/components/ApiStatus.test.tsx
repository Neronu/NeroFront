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
