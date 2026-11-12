import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOrganizations } from './AdminOrganizations';
import { AdminUsers } from './AdminUsers';
import { NewOrganization } from './NewOrganization';

const api = vi.hoisted(() => ({
  adminOrganizations: vi.fn(),
  adminUsers: vi.fn(),
  createOrganization: vi.fn(),
}));
vi.mock('../../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../../lib/api/client')>()),
  api,
}));

const org = {
  id: 'o1',
  name: 'Atlética Computação',
  slug: 'computacao',
  isGuest: false,
  publicationConsent: true,
  isPersonal: false,
};

beforeEach(() => vi.clearAllMocks());

describe('admin da plataforma', () => {
  it('lista atléticas com responsáveis e busca pelo ?q=', async () => {
    api.adminOrganizations.mockResolvedValue([
      {
        ...org,
        createdAt: '2026-11-12T10:00:00Z',
        memberCount: 2,
        athleteCount: 30,
        championshipCount: 1,
        admins: [{ name: null, email: 'ana@ex.com', pending: true }],
      },
    ]);
    render(
      <MemoryRouter initialEntries={['/admin/atleticas?q=comp']}>
        <Routes>
          <Route path="/admin/atleticas" element={<AdminOrganizations />} />
        </Routes>
      </MemoryRouter>,
    );
    const table = await screen.findByRole('table', { name: 'Atléticas' });
    expect(within(table).getByText('ana@ex.com (convite pendente)')).toBeInTheDocument();
    expect(api.adminOrganizations).toHaveBeenCalledWith('comp');
    expect(screen.getByLabelText('Buscar por nome ou código')).toHaveValue('comp');
  });

  it('usuário mostra os perfis acumulados: atleta, atlética e admin', async () => {
    api.adminUsers.mockResolvedValue([
      {
        id: 'u1',
        name: 'Ana',
        email: 'ana@ex.com',
        emailVerified: true,
        createdAt: '2026-11-12T10:00:00Z',
        isSystemAdmin: true,
        memberships: [{ organization: org, role: 'scorer' }],
        athleteCount: 1,
      },
    ]);
    render(
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Atleta · Atlética Computação (mesário) · Admin da plataforma'),
    ).toBeInTheDocument();
    expect(api.adminUsers).toHaveBeenCalledWith('');
  });

  it('nova atlética envia o e-mail do responsável e volta à lista', async () => {
    api.createOrganization.mockResolvedValue(org);
    render(
      <MemoryRouter initialEntries={['/admin/atleticas/nova']}>
        <Routes>
          <Route path="/admin/atleticas/nova" element={<NewOrganization />} />
          <Route path="/admin/atleticas" element={<p>lista</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Atlética Computação' } });
    fireEvent.change(screen.getByLabelText(/E-mail do responsável/), {
      target: { value: ' ana@ex.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar atlética' }));
    expect(await screen.findByText('lista')).toBeInTheDocument();
    expect(api.createOrganization).toHaveBeenCalledWith({
      name: 'Atlética Computação',
      adminEmail: 'ana@ex.com',
      publicationConsent: false,
    });
  });
});
