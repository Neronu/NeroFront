import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Skeleton } from '../components/ui';
import { HomeEntry, RequireAuth, RequireOrg, RequireSystemAdmin } from './guards';
import { LayoutCampeonato } from './layouts/LayoutCampeonato';
import { LayoutHome } from './layouts/LayoutHome';
import { LayoutPainel } from './layouts/LayoutPainel';
import { LayoutSumula } from './layouts/LayoutSumula';
import { Root } from './Root';

/**
 * Cada tela vira um pedaço separado do JS, carregado ao navegar.
 * Layouts, sessão e tema ficam no pacote principal.
 */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return {
    lazy: async () => ({ Component: (await load())[name] as ComponentType }),
  };
}

const loading = (
  <div className="lyt-content">
    <Skeleton lines={4} />
  </div>
);

/** Toda tela parte de um dos quatro modelos: Home, Painel, Campeonato e Súmula. */
export const router = createBrowserRouter([
  {
    element: <Root />,
    hydrateFallbackElement: loading,
    children: [
      // Página inicial: busca por código sem login; com login, também "Meus campeonatos".
      { index: true, element: <HomeEntry /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <LayoutSumula />,
            children: [
              {
                path: '/partidas/:id/mesa',
                ...page(() => import('../routes/match/TablePage'), 'TablePage'),
              },
            ],
          },
          {
            element: <LayoutPainel />,
            children: [
              {
                path: 'partidas/:id/preparar',
                ...page(() => import('../routes/match/Prepare'), 'Prepare'),
              },
              {
                path: 'partidas/:id/conferencia',
                ...page(() => import('../routes/match/Review'), 'Review'),
              },
              // Menu comum a toda conta (todo usuário é atleta): Home, Campeonatos, Equipes, Perfil.
              {
                path: 'campeonatos',
                ...page(() => import('../routes/championship/MyChampionships'), 'MyChampionships'),
              },
              { path: 'equipes', ...page(() => import('../routes/teams/TeamsHub'), 'TeamsHub') },
              {
                path: 'equipes/:id',
                ...page(() => import('../routes/teams/TeamDetailPage'), 'TeamDetailPage'),
              },
              { path: 'perfil', ...page(() => import('../routes/profile/Profile'), 'Profile') },
              { path: 'atleta', element: <Navigate to="/perfil" replace /> },
              {
                path: 'inscricoes/:id',
                ...page(
                  () => import('../routes/championship/RegistrationRoster'),
                  'RegistrationRoster',
                ),
              },
              {
                // Admin da plataforma: cadastra atléticas e consulta todo o sistema.
                element: <RequireSystemAdmin />,
                children: [
                  {
                    path: 'admin/atleticas',
                    ...page(
                      () => import('../routes/admin/AdminOrganizations'),
                      'AdminOrganizations',
                    ),
                  },
                  {
                    path: 'admin/atleticas/nova',
                    ...page(() => import('../routes/admin/NewOrganization'), 'NewOrganization'),
                  },
                  {
                    path: 'admin/usuarios',
                    ...page(() => import('../routes/admin/AdminUsers'), 'AdminUsers'),
                  },
                  {
                    path: 'admin/campeonatos',
                    ...page(
                      () => import('../routes/admin/AdminChampionships'),
                      'AdminChampionships',
                    ),
                  },
                  { path: 'admin', element: <Navigate to="/admin/atleticas" replace /> },
                  // Endereço antigo de "Nova entidade".
                  {
                    path: 'entidades/nova',
                    element: <Navigate to="/admin/atleticas/nova" replace />,
                  },
                ],
              },
              {
                element: <RequireOrg />,
                children: [
                  { path: 'atletas', ...page(() => import('../routes/org/Athletes'), 'Athletes') },
                  { path: 'regras', ...page(() => import('../routes/org/OrgRules'), 'OrgRules') },
                  {
                    path: 'configuracoes',
                    ...page(() => import('../routes/org/Settings'), 'Settings'),
                  },
                  { path: 'membros', element: <Navigate to="/configuracoes" replace /> },
                  { path: 'partidas', ...page(() => import('../routes/match/Matches'), 'Matches') },
                  {
                    path: 'partidas/nova',
                    ...page(() => import('../routes/match/NewMatch'), 'NewMatch'),
                  },
                  {
                    path: 'campeonatos/novo',
                    ...page(
                      () => import('../routes/championship/NewChampionship'),
                      'NewChampionship',
                    ),
                  },
                ],
              },
            ],
          },
          {
            element: <LayoutHome />,
            children: [
              {
                path: 'convites/:token',
                ...page(() => import('../routes/championship/InviteAccept'), 'InviteAccept'),
              },
              {
                path: 'equipes/convite/:token',
                ...page(() => import('../routes/teams/TeamJoin'), 'TeamJoin'),
              },
              {
                path: 'transferencias/:token',
                ...page(() => import('../routes/transfer/TransferAccept'), 'TransferAccept'),
              },
            ],
          },
        ],
      },
      {
        // Páginas públicas (E9): chega-se pelo código do campeonato; ações pedem login.
        element: <LayoutCampeonato />,
        children: [
          {
            path: 'campeonatos/:id',
            ...page(() => import('../routes/championship/ChampionshipPage'), 'ChampionshipPage'),
          },
          {
            path: 'campeonatos/:id/regras',
            ...page(() => import('../routes/championship/ChampionshipRules'), 'ChampionshipRules'),
          },
          {
            path: 'c/:code',
            ...page(
              () => import('../routes/championship/ChampionshipByCode'),
              'ChampionshipByCode',
            ),
          },
          {
            path: 'atletas/:id',
            ...page(() => import('../routes/athlete/PublicAthletePage'), 'PublicAthletePage'),
          },
        ],
      },
      {
        element: <LayoutHome />,
        children: [
          { path: 'entrar', ...page(() => import('../routes/auth/Login'), 'Login') },
          { path: 'cadastro', ...page(() => import('../routes/auth/Register'), 'Register') },
          {
            path: 'verificar-email',
            ...page(() => import('../routes/auth/VerifyEmail'), 'VerifyEmail'),
          },
          { path: '*', ...page(() => import('../routes/NotFound'), 'NotFound') },
        ],
      },
    ],
  },
]);
