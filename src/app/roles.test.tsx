import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { RequireOrg, RequireSystemAdmin } from './guards';

const session = vi.hoisted(() => ({ org: null as unknown, isSystemAdmin: false }));
vi.mock('../lib/session', () => ({ useSession: () => session }));

function app(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route index element={<p>início</p>} />
        <Route element={<RequireOrg />}>
          <Route path="equipes" element={<p>equipes</p>} />
        </Route>
        <Route element={<RequireSystemAdmin />}>
          <Route path="admin/atleticas" element={<p>atléticas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

it('só atleta (sem atlética) volta ao início, não à criação de entidade', () => {
  app('/equipes');
  expect(screen.getByText('início')).toBeInTheDocument();
});

it('telas do admin da plataforma: os demais voltam ao início', () => {
  app('/admin/atleticas');
  expect(screen.getByText('início')).toBeInTheDocument();
});

it('admin da plataforma entra nas telas de administração', () => {
  session.isSystemAdmin = true;
  app('/admin/atleticas');
  expect(screen.getByText('atléticas')).toBeInTheDocument();
  session.isSystemAdmin = false;
});
