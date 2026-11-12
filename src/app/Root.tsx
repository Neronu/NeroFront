import { Outlet } from 'react-router';
import { SessionProvider } from '../lib/session';
import { ThemeProvider } from '../lib/theme';

export function Root() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <Outlet />
      </SessionProvider>
    </ThemeProvider>
  );
}
