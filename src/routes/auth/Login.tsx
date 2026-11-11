import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { api, errorMessage, HttpError } from '../../lib/api/client';
import { useSession } from '../../lib/session';

export function Login() {
  const session = useSession();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (session.status === 'authenticated') return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await session.signIn(await api.login({ email, password }));
      navigate(next, { replace: true });
    } catch (err) {
      setUnverified(err instanceof HttpError && err.code === 'email_not_verified');
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card narrow">
      <h1>Entrar</h1>
      <form onSubmit={submit} className="stack">
        <label>
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="status-error">{error}</p>}
        {unverified && (
          <button
            type="button"
            className="link"
            onClick={() =>
              api.resendVerification(email).then(() => setError('Enviamos um novo link.'))
            }
          >
            Reenviar o link de confirmação
          </button>
        )}
        <button type="submit" className="primary" disabled={busy}>
          Entrar
        </button>
        <p className="muted small">
          Não tem conta? <Link to={`/cadastro?next=${encodeURIComponent(next)}`}>Cadastre-se</Link>
        </p>
      </form>
    </section>
  );
}
