import { isVoidEvent } from '@neronu/sport-core';
import type { PlayerFoulKind } from '@neronu/sport-basketball';
import type { TableEvent } from './table';

export const FOUL_LABEL: Record<PlayerFoulKind, string> = {
  personal: 'Falta',
  technical: 'Falta técnica',
  unsportsmanlike: 'Falta antidesportiva',
  disqualifying: 'Falta desqualificante',
};

export interface Who {
  number: number;
  name: string;
  side: 'home' | 'away';
}

/** Texto curto de um evento para a lista da mesa. */
export function describeEvent(
  e: TableEvent,
  who: (athleteId: string) => Who | undefined,
  teamName: (side: 'home' | 'away') => string,
  periodName: (period: number) => string,
): string {
  if (isVoidEvent(e)) return 'Anulação';
  switch (e.type) {
    case 'period_start':
      return `Início do ${periodName(e.payload.period)}`;
    case 'period_end':
      return `Fim do ${periodName(e.payload.period)}`;
    case 'score': {
      const w = who(e.payload.athleteId);
      return `+${e.payload.points} · #${w?.number ?? '?'} ${w?.name ?? ''} (${w ? teamName(w.side) : ''})`;
    }
    case 'foul': {
      const w = who(e.payload.athleteId);
      return `${FOUL_LABEL[e.payload.kind]} · #${w?.number ?? '?'} ${w?.name ?? ''} (${w ? teamName(w.side) : ''})`;
    }
    case 'coach_foul':
      return `${e.payload.kind === 'technical' ? 'Técnica do técnico' : 'Técnica do banco'} · ${teamName(e.payload.side)}`;
    case 'timeout':
      return `Tempo técnico · ${teamName(e.payload.side)}`;
  }
}
