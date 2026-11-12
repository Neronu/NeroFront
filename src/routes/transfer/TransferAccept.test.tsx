import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransferAthlete, TransferPreview } from '../../lib/api/contract';
import { buildDecisions, TransferAccept } from './TransferAccept';

const api = vi.hoisted(() => ({ transfer: vi.fn(), acceptTransfer: vi.fn() }));
vi.mock('../../lib/api/client', async (orig) => ({
  ...(await orig<typeof import('../../lib/api/client')>()),
  api,
}));
const session = vi.hoisted(() => ({ refresh: vi.fn(async () => {}), selectOrg: vi.fn() }));
vi.mock('../../lib/session', () => ({ useSession: () => session }));

const org = {
  id: 'o2',
  name: 'Atlética Medicina',
  slug: 'med',
  isGuest: false,
  publicationConsent: true,
  isPersonal: false,
};

const athletes: TransferAthlete[] = [
  {
    athleteId: 'g1',
    name: 'Ana Souza',
    number: 4,
    hasEmail: true,
    autoMergeInto: { athleteId: 'd1', name: 'Ana Souza' },
    candidates: [],
  },
  {
    athleteId: 'g2',
    name: 'Bia Lima',
    number: 7,
    hasEmail: false,
    autoMergeInto: null,
    candidates: [{ athleteId: 'd2', name: 'Bia Lima' }],
  },
  {
    athleteId: 'g3',
    name: 'Caio',
    number: 9,
    hasEmail: false,
    autoMergeInto: null,
    candidates: [],
  },
];

const preview: TransferPreview = {
  team: { id: 't1', name: 'Medicina' },
  from: { name: 'Atlética Computação' },
  acceptedBy: null,
  destinations: [{ organization: org, athletes }],
};

beforeEach(() => vi.clearAllMocks());

describe('decisões da transferência', () => {
  it('só manda atletas sem e-mail com candidato; vazio = manter separado', () => {
    expect(buildDecisions(athletes, {})).toEqual([{ athleteId: 'g2', mergeInto: null }]);
    expect(buildDecisions(athletes, { g2: 'd2' })).toEqual([{ athleteId: 'g2', mergeInto: 'd2' }]);
  });
});

describe('aceite da transferência', () => {
  it('mostra o destino de cada atleta e envia a escolha', async () => {
    api.transfer.mockResolvedValue(preview);
    api.acceptTransfer.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/transferencias/tok']}>
        <Routes>
          <Route path="/transferencias/:token" element={<TransferAccept />} />
          <Route path="/equipes/:id" element={<p>equipe</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Unificado com Ana Souza (mesmo e-mail)')).toBeInTheDocument();
    // Bia (sem escolha ainda) e Caio (sem candidato) entram como novos.
    expect(screen.getAllByText('Entra como atleta novo')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('O que fazer com Bia Lima'), {
      target: { value: 'd2' },
    });
    expect(screen.getByText('Unificado com Bia Lima')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Receber equipe na Atlética Medicina' }));
    expect(await screen.findByText('equipe')).toBeInTheDocument();
    expect(api.acceptTransfer).toHaveBeenCalledWith('tok', {
      organizationId: 'o2',
      decisions: [{ athleteId: 'g2', mergeInto: 'd2' }],
    });
    expect(session.selectOrg).toHaveBeenCalledWith('o2');
  });

  it('transferência já aceita não oferece aceite', async () => {
    api.transfer.mockResolvedValue({ ...preview, acceptedBy: org, destinations: [] });
    render(
      <MemoryRouter initialEntries={['/transferencias/tok']}>
        <Routes>
          <Route path="/transferencias/:token" element={<TransferAccept />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/já foi transferida para a Atlética Medicina/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
