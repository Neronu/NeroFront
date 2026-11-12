import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Button, ThemeToggle, Wordmark } from '../../components/ui';
import { useSession } from '../../lib/session';

/**
 * Visitante e telas de entrada: barra superior com o nome e "Entrar"; conteúdo estreito.
 * O login é opcional: o nome leva de volta à busca pelo código do campeonato.
 */
export function LayoutHome({ children }: { children?: ReactNode }) {
  const { status } = useSession();
  const { pathname } = useLocation();
  return (
    <div className="lyt-home">
      <header className="lyt-topbar">
        <Wordmark />
        <div className="lyt-topbar__end">
          <ThemeToggle compact />
          {status === 'authenticated' ? (
            <Button to="/" variant="quiet">
              Painel
            </Button>
          ) : (
            pathname !== '/entrar' && (
              <Button to="/entrar" variant="quiet">
                Entrar
              </Button>
            )
          )}
        </div>
      </header>
      <main className="lyt-content">{children ?? <Outlet />}</main>
    </div>
  );
}
