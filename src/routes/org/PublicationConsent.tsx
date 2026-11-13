import { useState } from 'react';
import { Button, Group, Notice } from '../../components/ui';
import { api, errorMessage } from '../../lib/api/client';
import { useOrg, useSession } from '../../lib/session';

export const CONSENT_TEXT =
  'Declaro que a entidade tem autorização dos atletas para publicar nome, número, equipe e estatísticas nas páginas públicas.';

/** Caixa da declaração de autorização (E9), usada no cadastro da entidade e da equipe convidada. */
export function PublicationConsentCheck({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <div className="ui-stack">
      <label className="ui-checkline ui-checkline--top">
        <input
          type="checkbox"
          className="ui-check"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {CONSENT_TEXT}
      </label>
      <p className="t-small t-muted">
        Sem a declaração, os atletas aparecem só pelo número nas páginas públicas. Dá para declarar
        depois, em Configurações.
      </p>
    </div>
  );
}

/** Seção "Publicação" das configurações: estado da declaração e como mudar (só admin). */
export function PublicationSettings() {
  const { org } = useOrg();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = async (granted: boolean) => {
    if (!granted && !confirm('Retirar a declaração? As páginas públicas dos atletas saem do ar.'))
      return;
    setBusy(true);
    setError('');
    try {
      await api.setPublicationConsent(org.id, granted);
      await session.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ui-stack" aria-labelledby="settings-publication">
      <h2 id="settings-publication">Publicação</h2>
      <Group className="ui-stack">
        {org.publicationConsent ? (
          <Notice tone="positive">
            A entidade declarou ter autorização dos atletas. As páginas públicas mostram nome,
            número, equipe e estatísticas; e-mail e RGA nunca aparecem.
          </Notice>
        ) : (
          <Notice>
            Sem declaração de autorização: nas páginas públicas os atletas aparecem só pelo número e
            não têm página própria.
          </Notice>
        )}
        <p className="t-small t-muted">
          Um atleta que pedir para não aparecer pode ter o perfil ocultado na lista de Atletas.
        </p>
        {error && <Notice tone="danger">{error}</Notice>}
        <div>
          {org.publicationConsent ? (
            <Button variant="secondary" disabled={busy} onClick={() => void set(false)}>
              Retirar declaração
            </Button>
          ) : (
            <Button variant="primary" disabled={busy} onClick={() => void set(true)}>
              Declarar autorização
            </Button>
          )}
        </div>
        {!org.publicationConsent && <p className="t-small">{CONSENT_TEXT}</p>}
      </Group>
    </section>
  );
}
