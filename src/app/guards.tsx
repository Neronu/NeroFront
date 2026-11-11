import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../lib/session';

/** Exige login; guarda o destino para voltar depois de entrar. */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return <p className="muted">Carregando…</p>;
  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/entrar?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** Exige uma entidade; sem nenhuma, leva à criação. */
export function RequireOrg() {
  const { org } = useSession();
  if (!org) return <Navigate to="/entidades/nova" replace />;
  return <Outlet />;
}
