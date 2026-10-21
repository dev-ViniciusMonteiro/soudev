// Palco em realidade aumentada: a imagem da câmera espelhada ocupa a tela inteira (cortada como "cover")
// e os pontos detectados são convertidos com a mesma conta, então o que é desenhado cai em cima de você.

import type { Ponto } from './camera';

export class Palco {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  private dw = 0;
  private dh = 0;
  private ox = 0;
  private oy = 0;
  readonly dpr = Math.min(devicePixelRatio || 1, 2);

  constructor(alvo: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'palco-canvas';
    this.ctx = this.canvas.getContext('2d')!;
    alvo.appendChild(this.canvas);
    addEventListener('resize', () => this.ajustar());
    this.ajustar();
  }

  ajustar(): void {
    this.w = Math.round(innerWidth * this.dpr);
    this.h = Math.round(innerHeight * this.dpr);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  /** Unidade de tamanho que acompanha a tela (1% do menor lado), para desenhar igual em qualquer aparelho. */
  get u(): number {
    return Math.min(this.w, this.h) / 100;
  }

  /** Desenha a câmera espelhada cobrindo a tela; "escurecer" deixa o jogo mais visível por cima. */
  desenharVideo(video: HTMLVideoElement, escurecer = 0.25): void {
    const { ctx, w, h } = this;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const s = Math.max(w / vw, h / vh);
    this.dw = vw * s;
    this.dh = vh * s;
    this.ox = (w - this.dw) / 2;
    this.oy = (h - this.dh) / 2;
    ctx.save();
    ctx.translate(this.ox + this.dw, this.oy);
    ctx.scale(-1, 1);
    if (video.readyState >= 2) ctx.drawImage(video, 0, 0, this.dw, this.dh);
    ctx.restore();
    if (escurecer > 0) {
      ctx.fillStyle = `rgba(5, 6, 16, ${escurecer})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /** Ponto da câmera (0..1, espelhado) para pixels do canvas. */
  tela(p: Pick<Ponto, 'x' | 'y'>): { x: number; y: number } {
    return { x: this.ox + p.x * this.dw, y: this.oy + p.y * this.dh };
  }

  /** Quanto 1 unidade normalizada da largura da câmera vale em pixels do canvas. */
  get escalaVideo(): number {
    return this.dw;
  }
}
