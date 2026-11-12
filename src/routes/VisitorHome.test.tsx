import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { VisitorHome } from './VisitorHome';

afterEach(() => vi.unstubAllGlobals());

function app() {
  render(
    <MemoryRouter>
      <Routes>
        <Route index element={<VisitorHome />} />
        <Route path="campeonatos/:id" element={<p>página do campeonato</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function search(code: string) {
  fireEvent.change(screen.getByLabelText('Código do campeonato'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
}

it('mostra só o campo de código e "OK" ao lado', () => {
  app();
  expect(screen.getByPlaceholderText('Insira o código do campeonato')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
});

it('código existente leva à página do campeonato', async () => {
  const fetch = vi.fn(async (url: string) => new Response(JSON.stringify({ id: 'c1', url })));
  vi.stubGlobal('fetch', fetch);
  app();
  search(' cia-2026 ');
  expect(await screen.findByText('página do campeonato')).toBeInTheDocument();
  expect(String(fetch.mock.calls[0]![0])).toMatch(/\/public\/championships\/cia-2026$/);
});

it('código inexistente mostra o erro abaixo do campo', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'not_found', message: 'Campeonato não encontrado.' }), {
          status: 404,
        }),
    ),
  );
  app();
  search('XYZ');
  expect(await screen.findByText('Nenhum campeonato com este código.')).toBeInTheDocument();
  expect(screen.getByLabelText('Código do campeonato')).toHaveAttribute('aria-invalid', 'true');
});

it('campo vazio pede o código sem chamar a API', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  app();
  search('');
  expect(screen.getByText('Digite o código do campeonato.')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
