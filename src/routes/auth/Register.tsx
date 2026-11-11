import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, errorMessage, HttpError } from '../../lib/api/client';
import { useSession } from '../../lib/session';

export function Register() {
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
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
      <section className="card narrow stack">
        <h1>Confirme seu e-mail</h1>
        <p>
          Enviamos um link para <strong>{email}</strong>. Abra-o para ativar a conta; ele vale por
          48 horas.
        </p>
        <button className="link" onClick={() => api.resendVerification(email)}>
          Reenviar o link
        </button>
      </section>
    );
  }

  return (
    <section className="card narrow">
      <h1>Criar conta</h1>
      <form onSubmit={submit} className="stack">
        <label>
          Nome
          <input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <p className="muted small">Mínimo de 8 caracteres.</p>
        {error && <p className="status-error">{error}</p>}
        <button type="submit" className="primary">
          Criar conta
        </button>
        <p className="muted small">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </section>
  );
}
