import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { LayoutPainel } from './LayoutPainel';

const session = vi.hoisted(() => ({ isSystemAdmin: false }));
vi.mock('../../lib/session', () => ({
  useSession: () => ({
    isSystemAdmin: session.isSystemAdmin,
    status: 'authenticated',
    me: {
      user: { id: 'u1', name: 'Ana', email: 'ana@exemplo.com' },
      memberships: [{ organization: { id: 'o1', name: 'Atlética Computação' }, role: 'admin' }],
    },
    org: { id: 'o1', name: 'Atlética Computação' },
    role: 'admin',
    selectOrg: vi.fn(),
    signOut: vi.fn(),
  }),
}));

it('mostra o menu da atlética, marca a seção ativa e abre a gaveta pelo botão Menu', () => {
  render(
    <MemoryRouter initialEntries={['/equipes']}>
      <Routes>
        <Route element={<LayoutPainel />}>
          <Route path="equipes" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  const sidebar = screen.getByRole('complementary', { name: 'Menu principal' });
  // Comum a todos (todo usuário é atleta).
  for (const label of ['Home', 'Campeonatos', 'Equipes', 'Perfil'])
    expect(within(sidebar).getByRole('link', { name: label })).toBeInTheDocument();
  // Extras só da atlética, num grupo com o nome dela.
  const athletic = within(sidebar).getByRole('list', { name: 'Atlética Computação' });
  for (const label of ['Atletas', 'Módulos de esporte', 'Configurações'])
    expect(within(athletic).getByRole('link', { name: label })).toBeInTheDocument();
  // Atlética é cadastrada pelo admin da plataforma; sem grupo Administração para os demais.
  expect(within(sidebar).queryByRole('link', { name: /Nova entidade/ })).toBeNull();
  expect(within(sidebar).queryByRole('list', { name: 'Administração' })).toBeNull();
  expect(within(sidebar).getByRole('link', { name: 'Equipes' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  const menu = screen.getByRole('button', { name: 'Menu' });
  expect(menu).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(menu);
  const drawer = screen.getByRole('dialog', { name: 'Menu' });
  expect(within(drawer).getByRole('link', { name: 'Atletas' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('admin da plataforma vê o grupo Administração', () => {
  session.isSystemAdmin = true;
  render(
    <MemoryRouter initialEntries={['/admin/atleticas']}>
      <Routes>
        <Route element={<LayoutPainel />}>
          <Route path="admin/atleticas" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  const sidebar = screen.getByRole('complementary', { name: 'Menu principal' });
  const admin = within(sidebar).getByRole('list', { name: 'Administração' });
  for (const label of ['Atléticas', 'Usuários', 'Todos os campeonatos'])
    expect(within(admin).getByRole('link', { name: label })).toBeInTheDocument();
  session.isSystemAdmin = false;
});
