import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Skeleton } from '../components/ui';
import { useSession } from '../lib/session';
import { VisitorHome } from '../routes/VisitorHome';
import { LayoutHome } from './layouts/LayoutHome';
import { LayoutPainel } from './layouts/LayoutPainel';

const Home = lazy(() => import('../routes/Home').then((m) => ({ default: m.Home })));

const loading = (
  <div className="lyt-content">
    <Skeleton lines={4} />
  </div>
);

/**
 * Exige login (painel e ações); guarda o destino para voltar depois de entrar.
 * A página inicial e as páginas de campeonato não exigem: ficam fora deste guarda.
 */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return loading;
  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/entrar?next=${next}`} replace />;
  }
  return <Outlet />;
}

/**
 * Exige uma atlética. Quem não é membro de nenhuma (só atleta) volta ao início: atléticas são
 * cadastradas pelo admin da plataforma.
 */
export function RequireOrg() {
  const { org } = useSession();
  if (!org) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Exige admin da plataforma; os demais voltam ao início. */
export function RequireSystemAdmin() {
  const { isSystemAdmin } = useSession();
  if (!isSystemAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * Página inicial (seção 9). Sem login: só o código do campeonato, em LayoutHome.
 * Com login (atleta ou atlética): código e "Meus campeonatos", no painel.
 */
export function HomeEntry() {
  const { status } = useSession();
  if (status === 'loading') return loading;
  if (status === 'anonymous')
    return (
      <LayoutHome>
        <VisitorHome />
      </LayoutHome>
    );
  return (
    <LayoutPainel>
      <Suspense fallback={<Skeleton lines={4} />}>
        <Home />
      </Suspense>
    </LayoutPainel>
  );
}
