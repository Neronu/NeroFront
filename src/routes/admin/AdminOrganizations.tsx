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
import { api } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { championshipCode } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { useSearchParam } from './useSearchParam';

/** Atléticas do sistema (admin da plataforma): busca, responsáveis e cadastro de nova. */
export function AdminOrganizations() {
  const { input, setInput, query } = useSearchParam();
  const [list, reload] = useAsync(() => api.adminOrganizations(query), query);
  const created = (useLocation().state as { created?: string } | null)?.created;

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
                key: 'admins',
                header: 'Responsáveis',
                render: (o) =>
                  o.admins.length === 0
                    ? 'Nenhum'
                    : o.admins
                        .map((a) => `${a.name ?? a.email}${a.pending ? ' (convite pendente)' : ''}`)
                        .join(', '),
              },
              { key: 'members', header: 'Membros', numeric: true, render: (o) => o.memberCount },
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
