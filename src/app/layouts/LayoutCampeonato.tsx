import { ChevronLeft } from 'lucide-react';
import { Outlet } from 'react-router';
import { Button, Icon, ThemeToggle, Wordmark } from '../../components/ui';
import { useSession } from '../../lib/session';

/**
 * Página pública do campeonato, do atleta e da equipe: sem barra lateral, conteúdo até content-max.
 * Cada página monta o próprio cabeçalho em texto sobre bg.
 */
export function LayoutCampeonato() {
  const { status } = useSession();
  return (
    <div className="lyt-campeonato">
      <header className="lyt-topbar">
        <Wordmark />
        <div className="lyt-topbar__end">
          {status === 'authenticated' ? (
            <Button to="/" variant="quiet">
              <Icon icon={ChevronLeft} />
              Painel
            </Button>
          ) : (
            <>
              <ThemeToggle compact />
              <Button to="/entrar" variant="quiet">
                Entrar
              </Button>
            </>
          )}
        </div>
      </header>
      <main className="lyt-content">
        <Outlet />
      </main>
    </div>
  );
}
