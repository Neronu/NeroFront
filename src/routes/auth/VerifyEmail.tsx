import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, errorMessage } from '../../lib/api/client';
import { useSession } from '../../lib/session';

/** Destino do link do e-mail: confirma, entra e segue para o painel. */
export function VerifyEmail() {
  const [params] = useSearchParams();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get('token') ?? '';
    api
      .verifyEmail(token)
      .then(signIn)
      .then(() => navigate('/', { replace: true }))
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [params, signIn, navigate]);

  return (
    <section className="card narrow stack">
      <h1>Confirmação de e-mail</h1>
      {error ? (
        <>
          <p className="status-error">{error}</p>
          <Link to="/entrar">Ir para o login</Link>
        </>
      ) : (
        <p className="muted">Confirmando…</p>
      )}
    </section>
  );
}
