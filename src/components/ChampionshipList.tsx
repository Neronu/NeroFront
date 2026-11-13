import { Link } from 'react-router';
import type { MyChampionship } from '../lib/api/contract';
import { championshipCode, shortDate, sportName } from '../lib/format';
import { CHAMPIONSHIP_STATUS } from '../routes/championship/ChampionshipPage';
import { Badge, LiveBadge } from './ui';

/** Selo da linha: ao vivo, data de início futura ou a situação do campeonato. */
function ChampionshipBadge({ c }: { c: MyChampionship }) {
  if (c.live) return <LiveBadge />;
  if (c.status === 'registration' && c.startsAt && new Date(c.startsAt) > new Date())
    return <Badge>Começa em {shortDate(c.startsAt)}</Badge>;
  const s = CHAMPIONSHIP_STATUS[c.status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Lista contínua de "Meus campeonatos" (Home e Campeonatos), linhas separadas por line. */
export function ChampionshipList({ items, label }: { items: MyChampionship[]; label: string }) {
  return (
    <ul className="my-champs" aria-label={label}>
      {items.map((c) => (
        <li key={c.id}>
          <article className="my-champ">
            <div className="my-champ__main">
              <h3 className="my-champ__name">
                <Link to={`/campeonatos/${c.id}`}>{c.name}</Link>
              </h3>
              <p className="t-small t-muted">
                {sportName(c.sportKey)} · {c.organizer.name}
              </p>
            </div>
            <div className="my-champ__foot">
              <span className="t-stat t-muted">{championshipCode(c.slug)}</span>
              <ChampionshipBadge c={c} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
