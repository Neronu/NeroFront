import type { MatchEvent, RuleSet, SportModule } from '@neronu/sport-core';
import { basketball, STARTERS as BASKETBALL_STARTERS } from '@neronu/sport-basketball';
import {
  basketball3x3,
  ROSTER_MIN as BASKETBALL_3X3_ROSTER_MIN,
  STARTERS as BASKETBALL_3X3_STARTERS,
} from '@neronu/sport-basketball-3x3';

export type AnySport = SportModule<RuleSet, unknown, MatchEvent>;

export interface SportOption {
  key: string;
  name: string;
  module: AnySport;
  /** Titulares por equipe. */
  starters: number;
  /** Mínimo de relacionados por equipe. */
  rosterMin: number;
}

/**
 * Esportes que o front sabe exibir, um por módulo `@neronu/sport-*`. Um esporte novo entra aqui
 * (e em `SPORTS` no neroBack) e ganha um adaptador de mesa em `lib/match/sport-table.ts`; as
 * regras padrão vêm do módulo e da atlética.
 */
export const SPORTS: readonly SportOption[] = [
  {
    key: basketball.key,
    name: basketball.name,
    module: basketball as unknown as AnySport,
    starters: BASKETBALL_STARTERS,
    rosterMin: BASKETBALL_STARTERS,
  },
  {
    key: basketball3x3.key,
    name: basketball3x3.name,
    module: basketball3x3 as unknown as AnySport,
    starters: BASKETBALL_3X3_STARTERS,
    rosterMin: BASKETBALL_3X3_ROSTER_MIN,
  },
];

export const DEFAULT_SPORT = SPORTS[0]!;

/** Esporte pela chave; chave desconhecida (front desatualizado) é erro, não um palpite. */
export function sportOf(key: string): SportOption {
  const sport = SPORTS.find((s) => s.key === key);
  if (!sport) throw new Error(`Esporte não suportado nesta versão do app: ${key}.`);
  return sport;
}
