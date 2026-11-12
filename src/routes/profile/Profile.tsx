import { Link } from 'react-router';
import { Card, PageHeader, ThemeToggle } from '../../components/ui';
import { useSession } from '../../lib/session';
import { AthleteArea } from '../athlete/AthleteArea';

const ROLE = { admin: 'administrador(a)', scorer: 'mesário(a)' } as const;

/**
 * Perfil (menu): a conta, os perfis que ela acumula (atleta sempre; atlética e admin da
 * plataforma quando houver), a página pública e os dados de atleta.
 */
export function Profile() {
  const { me, isSystemAdmin } = useSession();
  if (!me) return null;
  const profiles = [
    'Atleta',
    ...me.memberships.map((m) => `${ROLE[m.role]} da ${m.organization.name}`),
    isSystemAdmin && 'Admin da plataforma',
  ].filter(Boolean);
  const publicPages = me.athletes.filter((a) => a.organization.publicationConsent);

  return (
    <div className="ui-stack ui-stack--section">
      <PageHeader eyebrow="Perfil" title={me.user.name} meta={me.user.email} />

      <section className="ui-stack" aria-labelledby="profile-account">
        <h2 id="profile-account">Conta</h2>
        <Card className="ui-stack">
          <dl className="ui-stack">
            <div>
              <dt className="t-label">Perfis</dt>
              <dd>{profiles.join(' · ')}</dd>
            </div>
            <div>
              <dt className="t-label">E-mail</dt>
              <dd>
                {me.user.email} ·{' '}
                {me.user.emailVerified ? (
                  'confirmado'
                ) : (
                  <Link to="/verificar-email">confirmar e-mail</Link>
                )}
              </dd>
            </div>
            {publicPages.length > 0 && (
              <div>
                <dt className="t-label">Página pública</dt>
                <dd>
                  {publicPages.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && ' · '}
                      <Link to={`/atletas/${a.id}`}>
                        {a.organization.isPersonal ? 'Suas equipes' : a.organization.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </section>

      <AthleteArea />

      <section className="ui-stack" aria-labelledby="profile-theme">
        <h2 id="profile-theme">Aparência</h2>
        <Card>
          <ThemeToggle />
        </Card>
      </section>
    </div>
  );
}
