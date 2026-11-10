import { Outlet } from 'react-router';

export function Layout() {
  return (
    <div className="shell">
      <header>
        <img src="/favicon.svg" alt="" width={28} height={28} />
        Neronu
      </header>
      <Outlet />
    </div>
  );
}
