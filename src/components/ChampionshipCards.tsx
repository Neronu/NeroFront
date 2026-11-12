import { Link } from 'react-router';
import type { MyChampionship } from '../lib/api/contract';
import { championshipCode, shortDate, sportName } from '../lib/format';
import { CHAMPIONSHIP_STATUS } from '../routes/championship/ChampionshipPage';
import { Badge, Card, LiveBadge } from './ui';

/** Selo do cartão: ao vivo, data de início futura ou a situação do campeonato. */
function ChampionshipBadge({ c }: { c: MyChampionship }) {
  if (c.live) return <LiveBadge />;
  if (c.status === 'registration' && c.startsAt && new Date(c.startsAt) > new Date())
    return <Badge>Começa em {shortDate(c.startsAt)}</Badge>;
  const s = CHAMPIONSHIP_STATUS[c.status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Cartões de "Meus campeonatos" (Home e Campeonatos). */
export function ChampionshipCards({ items, label }: { items: MyChampionship[]; label: string }) {
  return (
    <ul className="my-champs" aria-label={label}>
      {items.map((c) => (
        <li key={c.id}>
          <Card as="article" className="my-champ">
            <h3 className="my-champ__name">
              <Link to={`/campeonatos/${c.id}`}>{c.name}</Link>
            </h3>
            <p className="t-small t-muted">
              {sportName(c.sportKey)} · {c.organizer.name}
            </p>
            <div className="my-champ__foot">
              <span className="t-stat t-muted">{championshipCode(c.slug)}</span>
              <ChampionshipBadge c={c} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
