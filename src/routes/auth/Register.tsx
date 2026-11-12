import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Card, Notice, PageHeader, TextField } from '../../components/ui';
import { api, errorMessage, HttpError } from '../../lib/api/client';
import { useSession } from '../../lib/session';

export function Register() {
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);
  const session = useSession();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.register({ name, email, password });
    } catch (err) {
      setError(errorMessage(err));
      return;
    }
    // Sem confirmação obrigatória, já entra; com ela, a API recusa e mostramos o aviso.
    try {
      await session.signIn(await api.login({ email, password }));
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof HttpError && err.code === 'email_not_verified') setSent(true);
      else setError(errorMessage(err));
    }
  };

  if (sent) {
    return (
      <div className="ui-stack">
        <PageHeader title="Confirme seu e-mail" />
        <Card className="ui-stack">
          <p>
            Enviamos um link para <strong>{email}</strong>. Abra-o para ativar a conta; ele vale por
            48 horas.
          </p>
          {resent && <Notice tone="positive">Link reenviado.</Notice>}
          <div>
            <Button
              variant="quiet"
              onClick={() => api.resendVerification(email).then(() => setResent(true))}
            >
              Reenviar o link
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="ui-stack">
      <PageHeader
        title="Criar conta"
        meta="Toda conta é de atleta: acompanhe seus campeonatos e estatísticas. Se você foi convidado(a) por uma atlética, use o e-mail do convite."
      />
      <Card>
        <form onSubmit={submit} className="ui-form">
          <TextField
            label="Nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            autoComplete="new-password"
            minLength={8}
            help="Mínimo de 8 caracteres."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" variant="primary" block>
            Criar conta
          </Button>
          <p className="t-small t-muted">
            Já tem conta? <Link to="/entrar">Entre</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
