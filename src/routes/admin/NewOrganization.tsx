import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Notice, PageHeader, TextField } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { PublicationConsentCheck } from '../org/PublicationConsent';

/**
 * Cadastro de atlética (admin da plataforma). O responsável entra como administrador; se ainda
 * não tem conta, recebe um convite por e-mail e entra ao se cadastrar com esse e-mail.
 */
export function NewOrganization() {
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
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
        adminEmail: adminEmail.trim(),
        publicationConsent: consent,
      });
      navigate('/admin/atleticas', {
        state: {
          created: `${org.name} cadastrada. ${adminEmail.trim()} é o responsável (quem ainda não tem conta recebe um convite por e-mail).`,
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
        meta="A atlética, clube ou liga. O responsável administra cadastros, regras, campeonatos e membros."
      />
      <Card>
        <form onSubmit={submit} className="ui-form">
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Atlética de Engenharia"
            required
          />
          <TextField
            label="E-mail do responsável"
            type="email"
            help="Vira administrador(a) da atlética. Sem conta, recebe um convite por e-mail."
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
          <PublicationConsentCheck checked={consent} onChange={setConsent} />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" variant="primary" block disabled={busy}>
            Cadastrar atlética
          </Button>
        </form>
      </Card>
    </div>
  );
}
