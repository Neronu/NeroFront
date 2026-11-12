import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, ErrorState, PageHeader, Skeleton } from '../../components/ui';
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
    <div className="ui-stack">
      <PageHeader title="Confirmação de e-mail" />
      {error ? (
        <>
          <ErrorState title="Erro ao confirmar" message={error} />
          <div>
            <Button to="/entrar" variant="secondary">
              Ir para o login
            </Button>
          </div>
        </>
      ) : (
        <Skeleton lines={2} />
      )}
    </div>
  );
}
