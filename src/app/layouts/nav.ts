import {
  Building2,
  Home,
  Settings,
  Shield,
  SlidersHorizontal,
  Trophy,
  UserRound,
  UserSearch,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Ativo só na rota exata (para "/"). */
  end?: boolean;
}

export interface NavGroup {
  /** Título do grupo; o primeiro grupo não tem. */
  label?: string;
  items: NavItem[];
}

/** Comum a toda conta logada: todo usuário é atleta. */
export const COMMON_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/campeonatos', label: 'Campeonatos', icon: Trophy },
  { to: '/equipes', label: 'Equipes', icon: Shield },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
];

/** Só para membro de atlética (a selecionada no painel). */
export const ATHLETIC_NAV: NavItem[] = [
  { to: '/atletas', label: 'Atletas', icon: Users },
  { to: '/regras', label: 'Módulos de esporte', icon: SlidersHorizontal },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

/** Admin da plataforma: cadastro de atléticas e consultas (só leitura). */
export const ADMIN_NAV: NavItem[] = [
  { to: '/admin/atleticas', label: 'Atléticas', icon: Building2 },
  { to: '/admin/usuarios', label: 'Usuários', icon: UserSearch },
  { to: '/admin/campeonatos', label: 'Todos os campeonatos', icon: Trophy },
];

/**
 * Menu por perfil, acumulável: os 4 itens comuns para todos; o grupo da atlética para quem é
 * membro de uma (com o nome dela); "Administração" para o admin da plataforma.
 */
export function navFor(athletic: string | null, isSystemAdmin: boolean): NavGroup[] {
  const groups: NavGroup[] = [{ items: COMMON_NAV }];
  if (athletic) groups.push({ label: athletic, items: ATHLETIC_NAV });
  if (isSystemAdmin) groups.push({ label: 'Administração', items: ADMIN_NAV });
  return groups;
}
