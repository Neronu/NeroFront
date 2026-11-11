import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useSession } from '../lib/session';

export function Layout() {
  const session = useSession();
  const navigate = useNavigate();
  const memberships = session.me?.memberships ?? [];
  return (
    <div className="shell">
      <header>
        <NavLink to="/" className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          Neronu
        </NavLink>
        {session.status === 'authenticated' && (
          <nav className="row">
            {memberships.length > 0 && (
              <select
                aria-label="Entidade"
                className="org-switch"
                value={session.org?.id ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__new') navigate('/entidades/nova');
                  else {
                    session.selectOrg(e.target.value);
                    navigate('/');
                  }
                }}
              >
                {memberships.map((m) => (
                  <option key={m.organization.id} value={m.organization.id}>
                    {m.organization.name}
                  </option>
                ))}
                <option value="__new">+ Nova entidade</option>
              </select>
            )}
            <button className="link" onClick={session.signOut} title={session.me?.user.email}>
              Sair
            </button>
          </nav>
        )}
        {session.status === 'anonymous' && <Link to="/entrar">Entrar</Link>}
      </header>
      <Outlet />
    </div>
  );
}
