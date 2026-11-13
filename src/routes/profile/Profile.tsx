import { Link } from 'react-router';
import { Group, MetaGrid, PageHeader, ThemeToggle } from '../../components/ui';
import { useSession } from '../../lib/session';
import { AthleteArea } from '../athlete/AthleteArea';

/**
 * Perfil (menu): a conta, os perfis que ela acumula (atleta sempre; atlética e admin da
 * plataforma quando houver), a página pública e os dados de atleta.
 * Desktop: dados de atleta na coluna principal, conta e aparência na lateral. Celular: empilha,
 * com a lateral primeiro (ordem do DOM = ordem de leitura e de Tab).
 */
export function Profile() {
  const { me, isSystemAdmin, organizations } = useSession();
  if (!me) return null;
  const profiles = [
    'Atleta',
    ...organizations.map((o) => `Atlética: ${o.name}`),
    isSystemAdmin && 'Admin da plataforma',
  ].filter(Boolean);
  const publicPages = me.athletes.filter((a) => a.organization.publicationConsent);

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader eyebrow="Perfil" title={me.user.name} />

      <div className="lyt-grid pf-grid">
        <aside className="pf-aside ui-stack ui-stack--section" aria-label="Conta e preferências">
          <section className="ui-stack" aria-labelledby="profile-account">
            <h2 id="profile-account">Conta</h2>
            <Group as="div">
              <MetaGrid
                columns={1}
                items={[
                  { label: 'Perfis', value: profiles.join(' · ') },
                  {
                    label: 'E-mail',
                    value: (
                      <>
                        {me.user.email} ·{' '}
                        {me.user.emailVerified ? (
                          'confirmado'
                        ) : (
                          <Link to="/verificar-email">confirmar e-mail</Link>
                        )}
                      </>
                    ),
                  },
                  publicPages.length > 0 && {
                    label: 'Página pública',
                    value: publicPages.map((a, i) => (
                      <span key={a.id}>
                        {i > 0 && ' · '}
                        <Link to={`/atletas/${a.id}`}>
                          {a.organization.isPersonal ? 'Suas equipes' : a.organization.name}
                        </Link>
                      </span>
                    )),
                  },
                ]}
              />
            </Group>
          </section>

          <section className="ui-stack" aria-labelledby="profile-theme">
            <h2 id="profile-theme">Aparência</h2>
            <Group as="div" flush>
              <ThemeToggle block />
            </Group>
          </section>
        </aside>

        <div className="pf-main">
          <AthleteArea />
        </div>
      </div>
    </div>
  );
}
