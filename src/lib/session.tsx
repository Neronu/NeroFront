import type { AuthResponse, MeResponse, MemberRole, Organization } from './api/contract';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, authToken, NetworkError, setUnauthorizedHandler } from './api/client';
import { store } from './storage';

const ME_CACHE = 'neronu:me';
const ORG_KEY = 'neronu:org';

export interface Session {
  /** `loading` só na primeira carga com token salvo. */
  status: 'loading' | 'anonymous' | 'authenticated';
  me: MeResponse | null;
  /** Entidade em uso no painel. */
  org: Organization | null;
  role: MemberRole | null;
  /** Admin da plataforma (cria atléticas, consulta tudo). Todo usuário é também atleta. */
  isSystemAdmin: boolean;
  /** Entidade pessoal (equipes do atleta); null antes da primeira equipe. */
  personalOrg: Organization | null;
  signIn(auth: AuthResponse): Promise<void>;
  signOut(): void;
  refresh(): Promise<void>;
  selectOrg(id: string): void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(() =>
    authToken.get() ? store.get<MeResponse>(ME_CACHE) : null,
  );
  const [status, setStatus] = useState<Session['status']>(() =>
    !authToken.get() ? 'anonymous' : me ? 'authenticated' : 'loading',
  );
  const [orgId, setOrgId] = useState<string | null>(() => store.get<string>(ORG_KEY));

  const signOut = useCallback(() => {
    authToken.clear();
    store.remove(ME_CACHE);
    setMe(null);
    setStatus('anonymous');
  }, []);

  const apply = useCallback((fresh: MeResponse) => {
    store.set(ME_CACHE, fresh);
    setMe(fresh);
    setStatus('authenticated');
  }, []);

  const fail = useCallback(
    (err: unknown) => {
      // Sem rede, segue com o cache (a mesa precisa abrir no ginásio).
      if (err instanceof NetworkError && store.get(ME_CACHE)) setStatus('authenticated');
      else if (!(err instanceof NetworkError)) signOut();
      else setStatus('anonymous');
    },
    [signOut],
  );

  const refresh = useCallback(() => api.me().then(apply, fail), [apply, fail]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (authToken.get()) api.me().then(apply, fail);
    return () => setUnauthorizedHandler(null);
  }, [apply, fail, signOut]);

  const signIn = useCallback(
    async (auth: AuthResponse) => {
      authToken.set(auth.token);
      await refresh();
    },
    [refresh],
  );

  const selectOrg = useCallback((id: string) => {
    store.set(ORG_KEY, id);
    setOrgId(id);
  }, []);

  const value = useMemo<Session>(() => {
    const memberships = me?.memberships ?? [];
    const current = memberships.find((m) => m.organization.id === orgId) ?? memberships[0] ?? null;
    return {
      status,
      me,
      org: current?.organization ?? null,
      role: current?.role ?? null,
      // `?? false`: /me em cache de antes do campo existir.
      isSystemAdmin: me?.isSystemAdmin ?? false,
      personalOrg: me?.personalOrganization ?? null,
      signIn,
      signOut,
      refresh,
      selectOrg,
    };
  }, [me, orgId, status, signIn, signOut, refresh, selectOrg]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession fora do SessionProvider');
  return s;
}

/** Entidade atual; só use dentro de rotas que exigem uma (RequireOrg). */
export function useOrg(): { org: Organization; role: MemberRole; isAdmin: boolean } {
  const { org, role } = useSession();
  if (!org || !role) throw new Error('useOrg sem entidade');
  return { org, role, isAdmin: role === 'admin' };
}
