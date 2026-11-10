import { Link } from 'react-router';

export function NotFound() {
  return (
    <section className="card">
      <p>Página não encontrada.</p>
      <Link to="/">Voltar ao início</Link>
    </section>
  );
}
