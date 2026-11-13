import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Group, Notice, PageHeader, TextField } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { PublicationConsentCheck } from '../org/PublicationConsent';

/**
 * Cadastro de atlética (admin da plataforma). A atlética é um e-mail: quem entra com ele gerencia
 * a atlética. Sem conta, a pessoa recebe um e-mail para se cadastrar com esse endereço.
 */
export function NewOrganization() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const org = await api.createOrganization({
        name,
        email: email.trim(),
        publicationConsent: consent,
      });
      navigate('/admin/atleticas', {
        state: {
          created: `${org.name} cadastrada com o e-mail ${email.trim()}. Sem conta, a pessoa recebe um e-mail para se cadastrar.`,
        },
      });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="ui-stack lyt-reading">
      <PageHeader
        eyebrow="Administração"
        title="Nova atlética"
        meta="A atlética, clube ou liga. Quem entra com o e-mail da atlética gerencia cadastros, regras, campeonatos e partidas."
      />
      <Group>
        <form onSubmit={submit} className="ui-form">
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Atlética de Engenharia"
            required
          />
          <TextField
            label="E-mail da atlética"
            type="email"
            help="Um único e-mail por atlética. Sem conta, recebe um e-mail para se cadastrar."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PublicationConsentCheck checked={consent} onChange={setConsent} />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" variant="primary" block disabled={busy}>
            Cadastrar atlética
          </Button>
        </form>
      </Group>
    </div>
  );
}
