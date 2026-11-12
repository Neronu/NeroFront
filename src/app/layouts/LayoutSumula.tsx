import { Outlet } from 'react-router';

/** Mesa durante o jogo: tela cheia, sem barra lateral e sem navegação global. */
export function LayoutSumula() {
  return (
    <div className="lyt-sumula">
      <Outlet />
    </div>
  );
}
