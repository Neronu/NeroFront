/** Formatação de números e datas das páginas de campeonato. */

const SPORT_NAME: Record<string, string> = { basketball: 'Basquete' };

export function sportName(key: string): string {
  return SPORT_NAME[key] ?? key;
}

/** Saldo com sinal e sinal de menos tipográfico: +37, −21, 0. Sem cor. */
export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

/** Aproveitamento em %, sem casas decimais; "–" sem jogos. */
export function winPct(won: number, played: number): string {
  if (played === 0) return '–';
  return `${Math.round((won / played) * 100)}%`;
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
