import { Link, useParams } from 'react-router';
import { RulesForm } from '../../components/RulesForm';
import { api } from '../../lib/api/client';
import { useAsync } from '../../lib/useAsync';

export function ChampionshipRules() {
  const { id = '' } = useParams();
  const [data] = useAsync(
    async () => ({ ch: await api.championship(id), rules: await api.championshipRules(id) }),
    id,
  );
  if (data.status === 'loading') return <p className="muted">Carregando…</p>;
  if (data.status === 'error') return <p className="status-error">{data.message}</p>;
  const { ch, rules } = data.data;
  return (
    <section className="card stack">
      <div className="row between">
        <h1>Regras · {ch.name}</h1>
        <Link to={`/campeonatos/${id}`}>‹ Campeonato</Link>
      </div>
      <p className="muted small">
        Copiadas da organizadora na criação. Jogos ainda não iniciados acompanham as mudanças.
      </p>
      <RulesForm
        data={rules}
        readOnly={!ch.canManage}
        onSave={async (changes) => {
          await api.updateChampionship(id, { rules: changes });
          return api.championshipRules(id);
        }}
      />
    </section>
  );
}
