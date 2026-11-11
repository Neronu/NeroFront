import {
  IDEMPOTENCY_HEADER,
  type ApiError,
  type Athlete,
  type CloseMatchResponse,
  type CreateAthleteRequest,
  type CreateMatchRequest,
  type CreateTeamRequest,
  type Match,
  type MatchRoster,
  type MatchStateResponse,
  type PostEventRequest,
  type PostEventResponse,
  type PutRosterRequest,
  type Team,
  type TeamDetail,
} from '@neronu/api-contract';
import type * as C from '@neronu/api-contract';
import { API_URL } from '../env';
import { store } from '../storage';

const TOKEN_STORAGE = 'neronu:token';

/** Token de acesso (JWT), guardado no aparelho. */
export const authToken = {
  get: () => store.get<string>(TOKEN_STORAGE) ?? '',
  set: (token: string) => store.set(TOKEN_STORAGE, token),
  clear: () => store.remove(TOKEN_STORAGE),
};

/** Chamado quando a API recusa o token (expirado ou inválido). */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/** Resposta de erro da API (4xx/5xx). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Falha de rede: a requisição pode ou não ter chegado. */
export class NetworkError extends Error {}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken.get() ? { Authorization: `Bearer ${authToken.get()}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new NetworkError(err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    if (res.status === 401 && authToken.get() && !path.startsWith('/auth/')) onUnauthorized?.();
    throw new HttpError(
      res.status,
      err?.code ?? 'http_error',
      err?.message ?? `HTTP ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Baixa um arquivo autenticado e abre numa nova aba (o PDF da súmula exige login). */
export async function openAuthenticated(path: string): Promise<void> {
  const win = window.open('', '_blank');
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${authToken.get()}` },
  });
  if (!res.ok) {
    win?.close();
    throw new HttpError(res.status, 'http_error', `HTTP ${res.status}`);
  }
  const url = URL.createObjectURL(await res.blob());
  if (win) win.location.href = url;
  else window.location.href = url;
}

const q = (params: Record<string, string>) => `?${new URLSearchParams(params).toString()}`;

export const api = {
  // E5
  register: (body: C.RegisterRequest) => request<C.User>('POST', '/auth/register', body),
  login: (body: C.LoginRequest) => request<C.AuthResponse>('POST', '/auth/login', body),
  verifyEmail: (token: string) => request<C.AuthResponse>('POST', '/auth/verify-email', { token }),
  resendVerification: (email: string) =>
    request<void>('POST', '/auth/resend-verification', { email }),
  me: () => request<C.MeResponse>('GET', '/me'),
  createOrganization: (body: C.CreateOrganizationRequest) =>
    request<C.Organization>('POST', '/organizations', body),
  members: (orgId: string) => request<C.Member[]>('GET', `/organizations/${orgId}/members`),
  addMember: (orgId: string, body: C.AddMemberRequest) =>
    request<C.Member>('POST', `/organizations/${orgId}/members`, body),
  // E6
  orgRules: (orgId: string, sportKey = 'basketball') =>
    request<C.SportRulesResponse>('GET', `/organizations/${orgId}/sports/${sportKey}/rules`),
  putOrgRules: (orgId: string, rules: C.PutRulesRequest, sportKey = 'basketball') =>
    request<C.SportRulesResponse>('PUT', `/organizations/${orgId}/sports/${sportKey}/rules`, rules),
  orgAthletes: (orgId: string) =>
    request<C.OrganizationAthlete[]>('GET', `/organizations/${orgId}/athletes`),
  updateAthlete: (id: string, body: C.UpdateAthleteRequest) =>
    request<C.Athlete>('PATCH', `/athletes/${id}`, body),
  putTeamPlayer: (teamId: string, body: C.TeamPlayerRequest) =>
    request<TeamDetail>('PUT', `/teams/${teamId}/players`, body),
  removeTeamPlayer: (teamId: string, athleteId: string) =>
    request<void>('DELETE', `/teams/${teamId}/players/${athleteId}`),
  // E7
  championships: (orgId: string) =>
    request<C.Championship[]>('GET', `/championships${q({ organizationId: orgId })}`),
  createChampionship: (body: C.CreateChampionshipRequest) =>
    request<C.Championship>('POST', '/championships', body),
  championship: (id: string) => request<C.ChampionshipDetail>('GET', `/championships/${id}`),
  updateChampionship: (id: string, body: C.UpdateChampionshipRequest) =>
    request<C.Championship>('PATCH', `/championships/${id}`, body),
  championshipRules: (id: string) =>
    request<C.SportRulesResponse>('GET', `/championships/${id}/rules`),
  createInvite: (id: string) =>
    request<C.ChampionshipInviteInfo>('POST', `/championships/${id}/invites`),
  invites: (id: string) =>
    request<C.ChampionshipInviteInfo[]>('GET', `/championships/${id}/invites`),
  invite: (token: string) => request<C.InvitePreview>('GET', `/invites/${token}`),
  acceptInvite: (token: string, organizationId: string) =>
    request<C.ChampionshipDetail>('POST', `/invites/${token}/accept`, { organizationId }),
  registrations: (id: string) =>
    request<C.Registration[]>('GET', `/championships/${id}/registrations`),
  registerTeam: (id: string, teamId: string) =>
    request<C.Registration>('POST', `/championships/${id}/registrations`, { teamId }),
  registration: (id: string) => request<C.Registration>('GET', `/registrations/${id}`),
  decideRegistration: (id: string, status: 'approved' | 'rejected') =>
    request<C.Registration>('PATCH', `/registrations/${id}`, { status }),
  putRegistrationRoster: (id: string, body: C.PutRegistrationRosterRequest) =>
    request<C.Registration>('PUT', `/registrations/${id}/roster`, body),
  createGuestTeam: (id: string, body: C.CreateGuestTeamRequest) =>
    request<C.Registration>('POST', `/championships/${id}/guest-teams`, body),
  // E8
  generateSchedule: (id: string, body: C.GenerateScheduleRequest) =>
    request<C.ChampionshipMatch[]>('POST', `/championships/${id}/schedule`, body),
  championshipMatches: (id: string) =>
    request<C.ChampionshipMatch[]>('GET', `/championships/${id}/matches`),
  standings: (id: string) => request<C.StandingsResponse>('GET', `/championships/${id}/standings`),
  bracket: (id: string) => request<C.BracketResponse>('GET', `/championships/${id}/bracket`),
  leaderboards: (id: string) =>
    request<C.LeaderboardsResponse>('GET', `/championships/${id}/leaderboards`),
  candidates: (id: string) => request<C.MatchCandidates>('GET', `/matches/${id}/candidates`),
  updateMatch: (id: string, body: C.UpdateMatchRequest) =>
    request<Match>('PATCH', `/matches/${id}`, body),

  teams: (orgId: string) => request<Team[]>('GET', `/teams${q({ organizationId: orgId })}`),
  team: (id: string) => request<TeamDetail>('GET', `/teams/${id}`),
  createTeam: (body: CreateTeamRequest) => request<Team>('POST', '/teams', body),
  createAthlete: (body: CreateAthleteRequest) => request<Athlete>('POST', '/athletes', body),
  matches: (orgId: string) => request<Match[]>('GET', `/matches${q({ organizationId: orgId })}`),
  createMatch: (body: CreateMatchRequest) => request<Match>('POST', '/matches', body),
  putRoster: (id: string, body: PutRosterRequest) =>
    request<MatchRoster>('PUT', `/matches/${id}/roster`, body),
  state: (id: string) => request<MatchStateResponse>('GET', `/matches/${id}/state`),
  postEvent: (id: string, event: PostEventRequest) =>
    request<PostEventResponse>('POST', `/matches/${id}/events`, event, {
      [IDEMPOTENCY_HEADER]: event.id,
    }),
  close: (id: string) => request<CloseMatchResponse>('POST', `/matches/${id}/close`),
  openSheet: (id: string, revision?: number) =>
    openAuthenticated(`/matches/${id}/sheet${revision ? `?revision=${revision}` : ''}`),
};

export function errorMessage(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  if (err instanceof NetworkError) return 'Sem conexão com a API.';
  return err instanceof Error ? err.message : String(err);
}
