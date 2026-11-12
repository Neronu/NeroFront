import { ApiStatus } from '../../components/ApiStatus';
import { Card, PageHeader, ThemeToggle } from '../../components/ui';
import { Members } from './Members';
import { PublicationSettings } from './PublicationConsent';

/** Configurações da atlética: membros, publicação, aparência e estado do sistema. */
export function Settings() {
  return (
    <div className="ui-stack ui-stack--section lyt-reading">
      <PageHeader title="Configurações" />
      <Members />
      <PublicationSettings />
      <section className="ui-stack" aria-labelledby="settings-theme">
        <h2 id="settings-theme">Aparência</h2>
        <Card>
          <ThemeToggle />
        </Card>
      </section>
      <section className="ui-stack" aria-labelledby="settings-system">
        <h2 id="settings-system">Sistema</h2>
        <Card>
          <ApiStatus />
        </Card>
      </section>
    </div>
  );
}
