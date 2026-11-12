import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button, Card, Notice, PageHeader, TextField } from '../../components/ui';
import { api, errorMessage, HttpError } from '../../lib/api/client';
import { useSession } from '../../lib/session';

export function Login() {
  const session = useSession();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (session.status === 'authenticated') return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
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
    <div className="ui-stack">
      <PageHeader title="Entrar" />
      <Card>
        <form onSubmit={submit} className="ui-form">
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <Notice tone="danger">{error}</Notice>}
          {info && <Notice tone="positive">{info}</Notice>}
          {unverified && (
            <div>
              <Button
                variant="quiet"
                onClick={() =>
                  api.resendVerification(email).then(() => {
                    setError('');
                    setInfo('Enviamos um novo link para o seu e-mail.');
                  })
                }
              >
                Reenviar o link de confirmação
              </Button>
            </div>
          )}
          <Button type="submit" variant="primary" block disabled={busy}>
            Entrar
          </Button>
          <p className="t-small t-muted">
            Não tem conta? <Link to={`/cadastro?next=${encodeURIComponent(next)}`}>Crie uma</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
