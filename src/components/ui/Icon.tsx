import type { LucideIcon } from 'lucide-react';

/**
 * Ícone Lucide (provisório, não é conjunto da marca): traço de 2px, um só tom, na cor do texto.
 * 20px na interface, 24px na súmula. Decorativo: o rótulo em texto vem ao lado.
 */
export function Icon({ icon: Glyph, size = 20 }: { icon: LucideIcon; size?: 20 | 24 }) {
  return <Glyph size={size} strokeWidth={2} aria-hidden="true" focusable="false" />;
}
