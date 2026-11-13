/**
 * Contrato da API usado pelo front.
 *
 * Reexporta `@neronu/api-contract` (1.0.0) e espelha o que o Marco 3 (E9–E12) mudou ou acrescentou
 * em `neroBack/packages/api-contract/src/index.ts`. Declarações locais têm precedência sobre o
 * `export *`. Quando a 2.0.0 for publicada: atualizar a dependência, apagar os espelhos abaixo e
 * deixar só o `export *`.
 */
import type * as C from '@neronu/api-contract';

export * from '@neronu/api-contract';

// ─── Tipos alterados ─────────────────────────────────────────────────────────

export type ApiErrorCode =
  | C.ApiErrorCode
  | 'match_not_closed'
  | 'bracket_already_played'
  | 'transfer_used'
  | 'not_guest_team'
  | 'merge_conflict'
  | 'match_live'
  | 'conflict'
  | 'duplicate_athlete'
  | 'duplicate_number'
  | 'rate_limited'
  | 'format_mismatch';

export interface Organization extends C.Organization {
  /** A entidade declarou ter autorização dos atletas para publicar os dados (E9). */
  publicationConsent: boolean;
  /** Entidade pessoal do atleta (equipes criadas por ele). Não é uma atlética. */
  isPersonal: boolean;
}

export interface Registration extends Omit<C.Registration, 'organization'> {
  organization: Organization;
}

/** Formato da disputa, escolhido na criação: a tabela é gerada nele. */
export type ChampionshipFormat = 'knockout' | 'round_robin' | 'groups_knockout';

export interface Championship extends C.Championship {
  /** Nulo em campeonatos criados antes do campo existir. */
  format: ChampionshipFormat | null;
}

export type CreateChampionshipRequest = C.CreateChampionshipRequest & {
  format: ChampionshipFormat;
};

export interface ChampionshipDetail extends Omit<
  C.ChampionshipDetail,
  'participants' | 'myOrganizations'
> {
  format: ChampionshipFormat | null;
  participants: Organization[];
  myOrganizations: Organization[];
}

/**
 * Três perfis (atleta, atlética, admin da plataforma), sem papéis: `organizations` são as
 * atléticas cujo e-mail é o da conta.
 */
export interface MeResponse extends Omit<C.MeResponse, 'memberships'> {
  organizations: Organization[];
  /** Cadastros de atleta ligados à conta pelo e-mail confirmado (E10). */
  athletes: { id: string; name: string; organization: Organization }[];
  /** Admin da plataforma: cria atléticas e consulta todo o sistema (só leitura). */
  isSystemAdmin: boolean;
  /** Entidade pessoal (equipes do atleta); null antes da primeira equipe. */
  personalOrganization: Organization | null;
}

/** Só o admin da plataforma cria atléticas; quem entra com `email` gerencia a atlética. */
export interface CreateOrganizationRequest {
  name: string;
  /** E-mail da atlética. */
  email: string;
  slug?: string;
  publicationConsent?: boolean;
}

/** Admin da plataforma troca o e-mail da atlética. */
export interface UpdateOrganizationAccountRequest {
  email: string;
}

export type CreateGuestTeamRequest = C.CreateGuestTeamRequest & {
  publicationConsent?: boolean;
};

export type UpdateAthleteRequest = C.UpdateAthleteRequest & {
  /** `false` oculta o atleta nas páginas públicas (a pedido dele). */
  publicProfile?: boolean;
};

export interface Athlete extends C.Athlete {
  /** Aparece nas páginas públicas (se a entidade também declarou a autorização). */
  publicProfile: boolean;
  /** Ligado a uma conta com o mesmo e-mail confirmado. */
  linked: boolean;
}

export interface OrganizationAthlete extends C.OrganizationAthlete, Athlete {}

export interface StoredEvent extends C.StoredEvent {
  /** Revisão da súmula em que o evento entrou (1 = mesa; maior = retificação). */
  revision: number;
}

export interface PostEventResponse extends Omit<C.PostEventResponse, 'event'> {
  event: StoredEvent;
}

export interface MatchSheetInfo extends C.MatchSheetInfo {
  homeScore: number;
  awayScore: number;
  /** Quem fechou (revisão 1) ou retificou. */
  createdBy: { name: string } | null;
}

export interface MatchStateResponse extends Omit<C.MatchStateResponse, 'events' | 'sheets'> {
  /** Em ordem de jogo (após retificação, difere da ordem de `seq`). */
  events: StoredEvent[];
  sheets: MatchSheetInfo[];
}

export interface CloseMatchResponse extends Omit<C.CloseMatchResponse, 'sheet'> {
  sheet: MatchSheetInfo;
}

export interface LeaderboardRow extends Omit<C.LeaderboardRow, 'athleteId'> {
  /**
   * Nulo para atleta oculto, visto por quem não está envolvido no campeonato; `name` vem então
   * como "Atleta nº 12". Use `position` + `registrationId` como chave de lista.
   */
  athleteId: string | null;
}

export interface LeaderboardsResponse {
  boards: { key: string; label: string; stat: string; rows: LeaderboardRow[] }[];
}

export interface MyChampionship extends Championship {
  /** Alguma partida em andamento agora. */
  live: boolean;
}

// ─── E11: retificação ────────────────────────────────────────────────────────

export type RectifyChange =
  | { op: 'void'; targetId: string }
  | {
      op: 'add';
      /** null = antes do primeiro lance. */
      afterEventId: string | null;
      event: { id: string; type: string; payload: Record<string, unknown> };
    };

export interface RectifyMatchRequest {
  /** 5 a 500 caracteres. */
  reason: string;
  /** 1 a 50 mudanças. */
  changes: RectifyChange[];
}

export interface MatchSheetRevision extends MatchSheetInfo {
  changes: { added: StoredEvent[]; voided: string[] };
}

// ─── E9: páginas públicas ────────────────────────────────────────────────────

export interface ChampionshipHighlights {
  champion: C.MatchSide | null;
  topScorer: LeaderboardRow | null;
}

export interface StatColumn {
  key: string;
  short: string;
  label: string;
}

export interface AthleteChampionshipStats {
  championship: {
    name: string;
    slug: string;
    status: C.ChampionshipStatus;
    startsAt: string | null;
  };
  teamName: string;
  organizationName: string;
  number: number | null;
  games: number;
  totals: Record<string, number>;
}

export interface AthleteSportStats {
  sportKey: string;
  sportName: string;
  columns: StatColumn[];
  games: number;
  totals: Record<string, number>;
  byChampionship: AthleteChampionshipStats[];
}

export interface PublicAthlete {
  id: string;
  name: string;
  organization: { name: string; slug: string };
  current: AthleteChampionshipStats | null;
  sports: AthleteSportStats[];
}

// ─── E10: identidade do atleta ───────────────────────────────────────────────

export interface AthleteChampionship {
  championship: {
    id: string;
    name: string;
    slug: string;
    sportKey: string;
    status: C.ChampionshipStatus;
    startsAt: string | null;
    endsAt: string | null;
  };
  athleteId: string;
  team: { id: string; name: string };
  organization: Organization;
  number: number;
  registrationStatus: C.RegistrationStatus;
}

export interface MeAthleteChampionshipsResponse {
  current: AthleteChampionship[];
  past: AthleteChampionship[];
  future: AthleteChampionship[];
}

export interface MeStatsResponse {
  sports: AthleteSportStats[];
}

export interface TeamTransferInfo {
  token: string;
  /** Caminho no app para o aceite: `/transferencias/:token`. */
  path: string;
  createdAt: string;
  acceptedBy: Organization | null;
}

export interface TransferAthlete {
  athleteId: string;
  name: string;
  number: number | null;
  hasEmail: boolean;
  /** Atleta da entidade com o mesmo e-mail: a unificação é automática. */
  autoMergeInto: { athleteId: string; name: string } | null;
  /** Atletas sem e-mail com o mesmo nome, para a entidade escolher. */
  candidates: { athleteId: string; name: string }[];
}

export interface TransferPreview {
  team: { id: string; name: string };
  from: { name: string };
  acceptedBy: Organization | null;
  destinations: { organization: Organization; athletes: TransferAthlete[] }[];
}

export interface AcceptTransferRequest {
  organizationId: string;
  /** Atletas sem e-mail: unificar com um atleta do destino ou manter (null). */
  decisions?: { athleteId: string; mergeInto: string | null }[];
}

// ─── E12: piloto ─────────────────────────────────────────────────────────────

export interface ReadyResponse {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  storage: 'ok' | 'error';
  /**
   * `pending`: o banco não recebeu migrações desta versão da API (escritas podem falhar).
   * Opcional porque a API antes desse campo não o envia.
   */
  migrations?: 'ok' | 'pending' | 'error';
  sportModules: Record<string, string>;
}

// ─── Admin da plataforma ─────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  isSystemAdmin: boolean;
  /** Atléticas com o e-mail desta conta. */
  organizations: Organization[];
  athleteCount: number;
}

export interface AdminOrganization extends Organization {
  createdAt: string;
  athleteCount: number;
  championshipCount: number;
  /** E-mail da atlética (null nas convidadas). */
  email: string | null;
  /** Nome da conta com esse e-mail, se já existe. */
  accountName: string | null;
}

export interface AdminChampionship extends Championship {
  createdAt: string;
  registrationCount: number;
}

// ─── Equipes do atleta ───────────────────────────────────────────────────────

export interface CreateMyTeamRequest {
  name: string;
  shortName?: string;
  /** O dono também joga, com `number`. */
  playMyself?: boolean;
  number?: number;
}

export interface CreateTeamInviteRequest {
  email: string;
  name: string;
  number?: number;
}

export interface MyTeam {
  team: C.Team;
  organization: Organization;
  /** owner: equipe pessoal; admin: equipe de atlética que administra; player: joga nela. */
  role: 'owner' | 'admin' | 'player';
  number: number | null;
  playerCount: number;
}

export type TeamInviteStatus = 'pending' | 'accepted' | 'declined';

export interface TeamInvite {
  id: string;
  team: { id: string; name: string };
  organization: Organization;
  email: string;
  name: string;
  number: number | null;
  status: TeamInviteStatus;
  invitedBy: { name: string } | null;
  createdAt: string;
}

/** Link fixo de convite da equipe; quem abre entra logado. */
export interface TeamInviteLink {
  token: string;
  /** Caminho no app: `/equipes/convite/:token`. */
  path: string;
}

export interface TeamLinkPreview {
  team: { id: string; name: string };
  organization: Organization;
  /** Quem abriu já joga na equipe. */
  alreadyMember: boolean;
}

export interface JoinTeamRequest {
  number?: number;
}
