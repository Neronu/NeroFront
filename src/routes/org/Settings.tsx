import { ApiStatus } from '../../components/ApiStatus';
import { Group, MetaGrid, PageHeader, ThemeToggle } from '../../components/ui';
import { useOrg, useSession } from '../../lib/session';
import { PublicationSettings } from './PublicationConsent';

/**
 * Configurações da atlética: conta, publicação, aparência e estado do sistema. Não há membros
 * nem papéis: a conta com o e-mail da atlética é a atlética.
 */
export function Settings() {
  const { org } = useOrg();
  const { me } = useSession();
  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      <PageHeader title="Configurações" />
      <section className="ui-stack" aria-labelledby="settings-account">
        <h2 id="settings-account">Conta da atlética</h2>
        <Group as="div" className="ui-stack">
          <MetaGrid
            items={[
              { label: 'Atlética', value: org.name },
              { label: 'E-mail da atlética', value: me?.user.email },
            ]}
          />
          <p className="t-small t-muted">
            Só quem entra com este e-mail gerencia a atlética. Atletas são cadastrados em Atletas;
            os e-mails deles dão acesso à área do atleta, não à gestão. Para trocar o e-mail da
            atlética, fale com a administração do Neronu.
          </p>
        </Group>
      </section>
      <PublicationSettings />
      <section className="ui-stack" aria-labelledby="settings-theme">
        <h2 id="settings-theme">Aparência</h2>
        <Group>
          <ThemeToggle />
        </Group>
      </section>
      <section className="ui-stack" aria-labelledby="settings-system">
        <h2 id="settings-system">Sistema</h2>
        <Group>
          <ApiStatus />
        </Group>
      </section>
    </div>
  );
}
