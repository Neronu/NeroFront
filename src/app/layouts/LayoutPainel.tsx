import type { ReactNode } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Button, Icon, Overlay, SelectField, Wordmark } from '../../components/ui';
import { useSession } from '../../lib/session';
import { navFor } from './nav';

/**
 * Painel da atlética (seção 10): barra lateral fixa de sidebar-w a partir de bp-lg;
 * abaixo disso, gaveta aberta pelo botão de 3 barras na barra superior.
 */
export function LayoutPainel({ children }: { children?: ReactNode }) {
  const session = useSession();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  // Fecha a gaveta ao navegar (ajuste de estado durante a renderização, sem efeito).
  const [path, setPath] = useState(location.pathname);
  if (path !== location.pathname) {
    setPath(location.pathname);
    setDrawer(false);
  }

  return (
    <div className="lyt-painel">
      <aside className="lyt-painel__sidebar" aria-label="Menu principal">
        <PainelNav />
      </aside>
      <div>
        <header className="lyt-topbar">
          <Button
            variant="quiet"
            className="lyt-painel__menu-button"
            aria-label="Abrir menu"
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <Icon icon={Menu} />
          </Button>
          <span className="lyt-painel__topbar-wordmark">
            <Wordmark />
          </span>
          <div className="lyt-topbar__end">
            {session.org && <span className="lyt-topbar__context">{session.org.name}</span>}
          </div>
        </header>
        <main className="lyt-content">{children ?? <Outlet />}</main>
      </div>
      <Overlay
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Neronu"
        titleClassName="ui-wordmark"
        kind="drawer"
      >
        <PainelNav inDrawer />
      </Overlay>
    </div>
  );
}

function PainelNav({ inDrawer }: { inDrawer?: boolean }) {
  const session = useSession();
  const navigate = useNavigate();
  const organizations = session.organizations;
  return (
    <nav className="lyt-nav" aria-label="Seções do painel">
      {!inDrawer && (
        <div className="lyt-nav__brand">
          <Wordmark />
        </div>
      )}
      {navFor(session.org?.name ?? null, session.isSystemAdmin).map((group) => (
        <div key={group.label ?? 'main'} className="lyt-nav__group">
          {group.label && <span className="t-label lyt-nav__group-label">{group.label}</span>}
          <ul className="lyt-nav__list" aria-label={group.label}>
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className="lyt-nav__link">
                  <Icon icon={item.icon} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="lyt-nav__footer">
        {organizations.length > 0 && (
          <SelectField
            label="Atlética"
            value={session.org?.id ?? ''}
            onChange={(e) => {
              session.selectOrg(e.target.value);
              navigate('/');
            }}
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectField>
        )}
        {session.me && <span className="lyt-nav__user">{session.me.user.email}</span>}
        <Button variant="quiet" onClick={session.signOut}>
          <Icon icon={LogOut} />
          Sair
        </Button>
      </div>
    </nav>
  );
}
