import { Link } from 'react-router';

/** Não há logotipo: o nome composto em display (Barlow Condensed 700), sempre "Neronu". */
export function Wordmark({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="ui-wordmark">
      Neronu
    </Link>
  );
}
