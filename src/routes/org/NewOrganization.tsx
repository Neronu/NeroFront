import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useSession } from '../../lib/session';

export function NewOrganization() {
  const session = useSession();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const org = await api.createOrganization({ name });
      await session.refresh();
      session.selectOrg(org.id);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="card narrow">
      <h1>Nova entidade</h1>
      <p className="muted small">
        A atlética, clube ou liga que você representa. Você será administrador(a) e poderá convidar
        outros membros.
      </p>
      <form onSubmit={submit} className="stack">
        <label>
          Nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Atlética de Engenharia"
            required
          />
        </label>
        {error && <p className="status-error">{error}</p>}
        <button type="submit" className="primary">
          Criar entidade
        </button>
      </form>
    </section>
  );
}
