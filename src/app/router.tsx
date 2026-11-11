import { createBrowserRouter } from 'react-router';
import { Login } from '../routes/auth/Login';
import { Register } from '../routes/auth/Register';
import { VerifyEmail } from '../routes/auth/VerifyEmail';
import { ChampionshipPage } from '../routes/championship/ChampionshipPage';
import { ChampionshipRules } from '../routes/championship/ChampionshipRules';
import { InviteAccept } from '../routes/championship/InviteAccept';
import { NewChampionship } from '../routes/championship/NewChampionship';
import { RegistrationRoster } from '../routes/championship/RegistrationRoster';
import { Home } from '../routes/Home';
import { NewMatch } from '../routes/match/NewMatch';
import { Prepare } from '../routes/match/Prepare';
import { Review } from '../routes/match/Review';
import { TablePage } from '../routes/match/TablePage';
import { NotFound } from '../routes/NotFound';
import { Athletes } from '../routes/org/Athletes';
import { Members } from '../routes/org/Members';
import { NewOrganization } from '../routes/org/NewOrganization';
import { OrgRules } from '../routes/org/OrgRules';
import { TeamDetailPage } from '../routes/teams/TeamDetailPage';
import { Teams } from '../routes/teams/Teams';
import { RequireAuth, RequireOrg } from './guards';
import { Layout } from './Layout';
import { Root } from './Root';

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          // A mesa ocupa a tela inteira, sem o cabeçalho do app.
          { path: '/partidas/:id/mesa', element: <TablePage /> },
        ],
      },
      {
        element: <Layout />,
        children: [
          { path: 'entrar', element: <Login /> },
          { path: 'cadastro', element: <Register /> },
          { path: 'verificar-email', element: <VerifyEmail /> },
          {
            element: <RequireAuth />,
            children: [
              { path: 'entidades/nova', element: <NewOrganization /> },
              { path: 'convites/:token', element: <InviteAccept /> },
              { path: 'partidas/:id/preparar', element: <Prepare /> },
              { path: 'partidas/:id/conferencia', element: <Review /> },
              { path: 'campeonatos/:id', element: <ChampionshipPage /> },
              { path: 'campeonatos/:id/regras', element: <ChampionshipRules /> },
              { path: 'inscricoes/:id', element: <RegistrationRoster /> },
              {
                element: <RequireOrg />,
                children: [
                  { index: true, element: <Home /> },
                  { path: 'equipes', element: <Teams /> },
                  { path: 'equipes/:id', element: <TeamDetailPage /> },
                  { path: 'atletas', element: <Athletes /> },
                  { path: 'regras', element: <OrgRules /> },
                  { path: 'membros', element: <Members /> },
                  { path: 'partidas/nova', element: <NewMatch /> },
                  { path: 'campeonatos/novo', element: <NewChampionship /> },
                ],
              },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
