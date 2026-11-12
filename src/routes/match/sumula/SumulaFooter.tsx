import { ListPlus, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../../../components/ui';

/**
 * Rodapé (bottomnav-h): "Desfazer" à esquerda, o último lançamento em texto no meio
 * e a ação do momento em brand à direita.
 */
export function SumulaFooter({
  last,
  lastPending,
  canUndo,
  onUndo,
  onMore,
  action,
  sync,
}: {
  last: string | null;
  lastPending: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onMore: () => void;
  action: ReactNode;
  /** Estado do envio (Sincronizado, Sem conexão…). */
  sync: ReactNode;
}) {
  return (
    <footer className="sm-footer">
      <button type="button" className="sm-btn sm-btn--wide" disabled={!canUndo} onClick={onUndo}>
        <Icon icon={Undo2} size={24} />
        Desfazer
      </button>
      <p className="sm-footer__last" aria-live="polite">
        <span className="sm-footer__label t-small">
          <span className="t-label t-muted">Último lançamento</span>
          {sync}
        </span>
        {last ? (
          <>
            <span className="sm-footer__text">
              {last}
              {lastPending && <span className="t-muted"> · na fila</span>}
            </span>
          </>
        ) : (
          <span className="t-muted">Nenhum lançamento ainda.</span>
        )}
      </p>
      <button type="button" className="sm-btn sm-btn--wide" onClick={onMore}>
        <Icon icon={ListPlus} size={24} />
        Mais lançamentos
      </button>
      {action}
    </footer>
  );
}
