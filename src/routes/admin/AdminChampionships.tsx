import { Link } from 'react-router';
import {
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  TextField,
} from '../../components/ui';
import { api } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';
import { championshipCode, sportName } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { CHAMPIONSHIP_STATUS } from '../championship/ChampionshipPage';
import { useSearchParam } from './useSearchParam';

/** Campeonatos de todas as atléticas (admin da plataforma), só leitura. */
export function AdminChampionships() {
  const { input, setInput, query } = useSearchParam();
  const [list, reload] = useAsync(() => api.adminChampionships(query), query);

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader eyebrow="Administração" title="Todos os campeonatos" />
      <TextField
        label="Buscar por nome, código ou organizadora"
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {list.status === 'loading' && <Skeleton lines={4} />}
      {list.status === 'error' && <ErrorState message={list.message} onRetry={reload} />}
      {list.status === 'ok' &&
        (list.data.length === 0 ? (
          <EmptyState>
            {query ? 'Nenhum campeonato encontrado.' : 'Nenhum campeonato criado ainda.'}
          </EmptyState>
        ) : (
          <DataTable
            caption="Campeonatos"
            rows={list.data}
            rowKey={(c) => c.id}
            columns={[
              {
                key: 'name',
                header: 'Campeonato',
                lead: true,
                render: (c) => <Link to={`/campeonatos/${c.id}`}>{c.name}</Link>,
              },
              {
                key: 'code',
                header: 'Código',
                render: (c) => <span className="t-stat">{championshipCode(c.slug)}</span>,
              },
              { key: 'org', header: 'Organizadora', render: (c) => c.organizer.name },
              { key: 'sport', header: 'Esporte', render: (c) => sportName(c.sportKey) },
              {
                key: 'status',
                header: 'Situação',
                render: (c) => (
                  <Badge tone={CHAMPIONSHIP_STATUS[c.status].tone}>
                    {CHAMPIONSHIP_STATUS[c.status].label}
                  </Badge>
                ),
              },
              {
                key: 'regs',
                header: 'Inscrições',
                numeric: true,
                render: (c) => c.registrationCount,
              },
              { key: 'created', header: 'Criado em', render: (c) => formatDateTime(c.createdAt) },
            ]}
          />
        ))}
    </div>
  );
}
