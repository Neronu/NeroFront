import { useState } from 'react';
import { useLocation } from 'react-router';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Skeleton,
  TextField,
} from '../../components/ui';
import type { AdminOrganization } from '../../lib/api/contract';
import { api, errorMessage } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { championshipCode } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { useSearchParam } from './useSearchParam';

/** Atléticas do sistema (admin da plataforma): busca, e-mail da atlética e cadastro de nova. */
export function AdminOrganizations() {
  const { input, setInput, query } = useSearchParam();
  const [list, reload] = useAsync(() => api.adminOrganizations(query), query);
  const created = (useLocation().state as { created?: string } | null)?.created;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const changeEmail = async (o: AdminOrganization) => {
    const email = prompt(
      `Novo e-mail da ${o.name}. A conta do e-mail atual deixa de gerenciar a atlética.`,
      o.email ?? '',
    )?.trim();
    if (!email || email === o.email) return;
    try {
      await api.updateOrganizationAccount(o.id, { email });
      setMsg({ ok: true, text: `E-mail da ${o.name} trocado para ${email}.` });
      reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader
        eyebrow="Administração"
        title="Atléticas"
        action={
          <Button to="/admin/atleticas/nova" variant="primary">
            Nova atlética
          </Button>
        }
      />
      {created && (
        <Notice tone="positive" role="status">
          {created}
        </Notice>
      )}
      {msg && (
        <Notice tone={msg.ok ? 'positive' : 'danger'} role="status">
          {msg.text}
        </Notice>
      )}
      <TextField
        label="Buscar por nome ou código"
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {list.status === 'loading' && <Skeleton lines={4} />}
      {list.status === 'error' && <ErrorState message={list.message} onRetry={reload} />}
      {list.status === 'ok' &&
        (list.data.length === 0 ? (
          <EmptyState>
            {query ? 'Nenhuma atlética encontrada.' : 'Nenhuma atlética cadastrada ainda.'}
          </EmptyState>
        ) : (
          <DataTable
            caption="Atléticas"
            rows={list.data}
            rowKey={(o) => o.id}
            columns={[
              { key: 'name', header: 'Atlética', lead: true, render: (o) => o.name },
              {
                key: 'code',
                header: 'Código',
                render: (o) => <span className="t-stat">{championshipCode(o.slug)}</span>,
              },
              {
                key: 'email',
                header: 'E-mail da atlética',
                render: (o) => (
                  <>
                    {o.email ?? '—'}
                    {o.email && !o.accountName && ' (sem conta ainda)'}{' '}
                    {!o.isGuest && (
                      <Button variant="quiet" onClick={() => void changeEmail(o)}>
                        Trocar
                      </Button>
                    )}
                  </>
                ),
              },
              { key: 'athletes', header: 'Atletas', numeric: true, render: (o) => o.athleteCount },
              {
                key: 'champs',
                header: 'Campeonatos',
                numeric: true,
                render: (o) => o.championshipCount,
              },
              {
                key: 'consent',
                header: 'Publicação',
                render: (o) => (o.publicationConsent ? 'Autorizada' : 'Sem declaração'),
              },
              { key: 'created', header: 'Criada em', render: (o) => formatDateTime(o.createdAt) },
            ]}
          />
        ))}
    </div>
  );
}
