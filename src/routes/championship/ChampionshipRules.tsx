import { ChevronLeft } from 'lucide-react';
import { useParams } from 'react-router';
import { RulesForm } from '../../components/RulesForm';
import { Button, ErrorState, Icon, PageHeader, Skeleton } from '../../components/ui';
import { api } from '../../lib/api/client';
import { useAsync } from '../../lib/useAsync';

export function ChampionshipRules() {
  const { id = '' } = useParams();
  const [data, reload] = useAsync(
    async () => ({ ch: await api.championship(id), rules: await api.championshipRules(id) }),
    id,
  );
  if (data.status === 'loading') return <Skeleton lines={6} />;
  if (data.status === 'error') return <ErrorState message={data.message} onRetry={reload} />;
  const { ch, rules } = data.data;
  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      <div>
        <Button to={`/campeonatos/${id}`} variant="quiet">
          <Icon icon={ChevronLeft} />
          {ch.name}
        </Button>
      </div>
      <PageHeader
        eyebrow="Regras do campeonato"
        title={ch.name}
        meta="Copiadas da organizadora na criação. Jogos ainda não iniciados acompanham as mudanças."
      />
      <RulesForm
        data={rules}
        readOnly={!ch.canManage}
        onSave={async (changes) => {
          await api.updateChampionship(id, { rules: changes });
          return api.championshipRules(id);
        }}
      />
    </div>
  );
}
