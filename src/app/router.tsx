import { createBrowserRouter } from 'react-router';
import { Home } from '../routes/Home';
import { NotFound } from '../routes/NotFound';
import { Layout } from './Layout';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
