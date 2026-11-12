import { useEffect, useState } from 'react';

/** Quadro desenhado em 1280 × 720 (seção 14). */
export const FRAME_W = 1280;
export const FRAME_H = 720;
/** bp-lg: abaixo disso (celular deitado) o quadro para de encolher e fica compacto. */
const BP_LG = 1024;

export interface FrameFit {
  /** Compacto: sem escala; placar e rodapé menores, linhas de 44px e colunas com rolagem. */
  compact: boolean;
  scale: number;
  /** Tamanho do quadro na tela, já escalado. */
  width: number;
  height: number;
}

export function fitFrame(vw: number, vh: number): FrameFit {
  if (vw >= BP_LG) {
    const scale = Math.min(vw / FRAME_W, vh / FRAME_H);
    return { compact: false, scale, width: FRAME_W * scale, height: FRAME_H * scale };
  }
  // Continua 16:9, do maior tamanho que cabe, sem escala.
  const width = Math.min(vw, (vh * 16) / 9);
  return { compact: true, scale: 1, width, height: (width * 9) / 16 };
}

/** Escala o quadro inteiro para caber na tela, centralizado; recalcula ao girar ou redimensionar. */
export function useFrameFit(): FrameFit {
  const [fit, setFit] = useState(() => fitFrame(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const onResize = () => setFit(fitFrame(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return fit;
}
