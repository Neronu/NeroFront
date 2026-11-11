import { Outlet } from 'react-router';
import { SessionProvider } from '../lib/session';

export function Root() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}
