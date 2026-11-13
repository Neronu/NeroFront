import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { useAsync } from '../../lib/useAsync';
import { useSearchParam } from './useSearchParam';

/** Usuários do sistema (admin da plataforma), só leitura. Todo usuário é atleta. */
export function AdminUsers() {
  const { input, setInput, query } = useSearchParam();
  const [list, reload] = useAsync(() => api.adminUsers(query), query);

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader eyebrow="Administração" title="Usuários" />
      <TextField
        label="Buscar por nome ou e-mail"
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {list.status === 'loading' && <Skeleton lines={4} />}
      {list.status === 'error' && <ErrorState message={list.message} onRetry={reload} />}
      {list.status === 'ok' &&
        (list.data.length === 0 ? (
          <EmptyState>{query ? 'Nenhum usuário encontrado.' : 'Nenhum usuário ainda.'}</EmptyState>
        ) : (
          <DataTable
            caption="Usuários"
            rows={list.data}
            rowKey={(u) => u.id}
            columns={[
              { key: 'name', header: 'Nome', lead: true, render: (u) => u.name },
              { key: 'email', header: 'E-mail', render: (u) => u.email },
              {
                key: 'verified',
                header: 'E-mail confirmado',
                render: (u) => (u.emailVerified ? 'Sim' : 'Não'),
              },
              {
                key: 'profiles',
                header: 'Perfis',
                render: (u) =>
                  [
                    'Atleta',
                    ...u.organizations.map((o) => `Atlética: ${o.name}`),
                    u.isSystemAdmin && 'Admin da plataforma',
                  ]
                    .filter(Boolean)
                    .join(' · '),
              },
              {
                key: 'athletes',
                header: 'Cadastros de atleta',
                numeric: true,
                render: (u) => u.athleteCount,
              },
              { key: 'created', header: 'Criado em', render: (u) => formatDateTime(u.createdAt) },
            ]}
          />
        ))}
    </div>
  );
}
