import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Match } from '../lib/api/contract';
import { formatDateTime } from '../lib/dates';
import { Badge, Button, Icon, LiveBadge } from './ui';

const STATUS: Record<Match['status'], ReactNode> = {
  scheduled: <Badge>Preparação</Badge>,
  in_progress: <LiveBadge />,
  closed: <Badge tone="closed">Súmula fechada</Badge>,
};

/** Tela da partida conforme a situação: preparação, mesa ou conferência da súmula. */
export function matchLink(m: Pick<Match, 'id' | 'status'>): string {
  if (m.status === 'scheduled') return `/partidas/${m.id}/preparar`;
  if (m.status === 'closed') return `/partidas/${m.id}/conferencia`;
  return `/partidas/${m.id}/mesa`;
}

const title = (m: Match) => `${m.homeTeam.name} × ${m.awayTeam.name}`;

/**
 * Lista de partidas avulsas: confronto, data e local, situação. Com `onDelete`, cada linha ganha
 * o ícone de lixo à direita (não em partida ao vivo, que a API recusa).
 */
export function MatchList({
  items,
  label,
  onDelete,
}: {
  items: Match[];
  label: string;
  onDelete?: (m: Match) => void;
}) {
  return (
    <ul className="ui-list" aria-label={label}>
      {items.map((m) => (
        <li key={m.id}>
          <span className="ui-list__main">
            <Link className="ui-list__title" to={matchLink(m)}>
              {title(m)}
            </Link>
            <span className="ui-list__meta">
              {[m.scheduledAt ? formatDateTime(m.scheduledAt) : 'Sem data', m.venue]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          {STATUS[m.status]}
          {onDelete && m.status !== 'in_progress' && (
            <Button
              variant="quiet"
              className="match-list__delete"
              aria-label={`Excluir partida ${title(m)}`}
              onClick={() => onDelete(m)}
            >
              <Icon icon={Trash2} />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
