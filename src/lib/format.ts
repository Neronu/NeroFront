/** Formatação de números e datas das páginas de campeonato. */

import type { ChampionshipFormat } from './api/contract';
import { SPORTS } from './sports';

export function sportName(key: string): string {
  return SPORTS.find((s) => s.key === key)?.name ?? key;
}

/** Formatos da disputa, na ordem em que aparecem para a atlética. */
export const CHAMPIONSHIP_FORMATS: readonly ChampionshipFormat[] = [
  'knockout',
  'round_robin',
  'groups_knockout',
];

const FORMAT_NAME: Record<ChampionshipFormat, string> = {
  knockout: 'Mata-mata',
  round_robin: 'Pontos corridos',
  groups_knockout: 'Misto (grupos + mata-mata)',
};

export function championshipFormatName(format: ChampionshipFormat): string {
  return FORMAT_NAME[format];
}

/** Saldo com sinal e sinal de menos tipográfico: +37, −21, 0. Sem cor. */
export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

/** Chave do dia no fuso do aparelho (AAAA-MM-DD); null sem data. */
export function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "sábado, 14 de novembro" a partir de uma dayKey. */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "20 nov" (dia e mês curto, sem ponto), para selos como "Começa em 20 nov". */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${d.getDate()} ${month}`;
}

/** Código do campeonato como é mostrado e digitado: o slug em maiúsculas. */
export function championshipCode(slug: string): string {
  return slug.toUpperCase();
}

/**
 * Relógio de jogo: "10:00", "01:05" e, no último minuto, segundos com décimo ("59.9", "4.2"),
 * como no placar FIBA. Arredonda os segundos para cima para não mostrar 00:00 antes da hora.
 */
/** Relógio crescente (prorrogação do 3x3): sempre mm:ss, sem décimos; passa de 60 min sem limite. */
export function formatElapsed(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe < 60_000) {
    const tenths = Math.floor(safe / 100);
    return `${Math.floor(tenths / 10)}.${tenths % 10}`;
  }
  const total = Math.ceil(safe / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
