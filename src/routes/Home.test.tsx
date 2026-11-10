import { render, screen } from '@testing-library/react';
import { basketball } from '@neronu/sport-basketball';
import { afterEach, expect, it, vi } from 'vitest';
import { Home } from './Home';

afterEach(() => vi.unstubAllGlobals());

it('mostra a API online com a versão do módulo', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'ok', sportModules: { basketball: basketball.version } }),
        ),
      ),
  );
  render(<Home />);
  expect(await screen.findByText(/API online/)).toHaveTextContent(basketball.version);
});
