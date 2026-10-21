// Controle da fuga: o corpo pela câmera (passo para o lado troca de pista, pular ou levantar os dois braços pula,
// agachar abaixa) ou teclado/toque. Tudo é medido em larguras de ombro a partir da calibração,
// então funciona perto ou longe da câmera.

import type { Ponto } from '../../comum/camera';

export type Faixa = -1 | 0 | 1;

export interface Comando {
  faixa: Faixa;
  pulo: boolean; // verdadeiro só no quadro em que o pulo começou
  abaixado: boolean;
}

export interface Calibracao {
  cx: number; // meio dos ombros (pixels)
  cy: number;
  sw: number; // largura dos ombros (pixels)
}

const OMBRO_E = 11;
const OMBRO_D = 12;
const NARIZ = 0;
const PULSO_E = 15;
const PULSO_D = 16;

/** Lê o corpo e decide pista, pulo e abaixado. */
export class ControleCorpo {
  private faixa: Faixa = 0;
  private ultimoPulo = 0;
  private bracosAntes = false;
  private historico: { t: number; y: number }[] = [];
  /** Para a tela de calibração e o painel: quanto o corpo está deslocado (em larguras de ombro). */
  medidas = { dx: 0, sobe: 0, desce: 0 };

  constructor(public calib: Calibracao) {}

  ler(pts: Ponto[] | undefined, w: number, h: number, agora: number): Comando | null {
    if (!pts || pts[OMBRO_E].vis < 0.5 || pts[OMBRO_D].vis < 0.5) return null;
    const p = (i: number) => ({ x: pts[i].x * w, y: pts[i].y * h, vis: pts[i].vis });
    const e = p(OMBRO_E);
    const d = p(OMBRO_D);
    const cx = (e.x + d.x) / 2;
    const cy = (e.y + d.y) / 2;
    const { sw } = this.calib;
    const dx = (cx - this.calib.cx) / sw;
    const sobe = (this.calib.cy - cy) / sw;
    this.medidas = { dx, sobe, desce: -sobe };

    // Pista com folga (histerese): sai do meio passando de 0,55 e volta abaixo de 0,3.
    if (dx < -0.55) this.faixa = -1;
    else if (dx > 0.55) this.faixa = 1;
    else if (Math.abs(dx) < 0.3) this.faixa = 0;

    // Pulo: ombros subindo rápido (pulo de verdade) ou os dois pulsos acima do nariz (pulo de braço).
    this.historico.push({ t: agora, y: sobe });
    while (this.historico.length && agora - this.historico[0].t > 160) this.historico.shift();
    const velocidade = this.historico.length > 1 ? ((sobe - this.historico[0].y) / (agora - this.historico[0].t)) * 1000 : 0;
    const nariz = p(NARIZ);
    const pe = p(PULSO_E);
    const pd = p(PULSO_D);
    const bracos = pe.vis > 0.5 && pd.vis > 0.5 && pe.y < nariz.y - sw * 0.2 && pd.y < nariz.y - sw * 0.2;
    let pulo = false;
    if (agora - this.ultimoPulo > 550 && ((sobe > 0.22 && velocidade > 1.4) || (bracos && !this.bracosAntes))) {
      pulo = true;
      this.ultimoPulo = agora;
    }
    this.bracosAntes = bracos;

    // Abaixado: ombros meia largura abaixo do normal (agachar ou dobrar o corpo).
    const abaixado = sobe < -0.5;
    return { faixa: this.faixa, pulo, abaixado };
  }
}

/** Teclado (setas/WASD/espaço) e toque (deslizar o dedo), para jogar sem câmera ou testar. */
export class ControleTeclado {
  private faixa: Faixa = 0;
  private pulou = false;
  private abaixadoAte = 0;
  private toque: { x: number; y: number } | null = null;

  constructor() {
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.faixa = Math.max(-1, this.faixa - 1) as Faixa;
      else if (k === 'arrowright' || k === 'd') this.faixa = Math.min(1, this.faixa + 1) as Faixa;
      else if (k === 'arrowup' || k === 'w' || k === ' ') this.pulou = true;
      else if (k === 'arrowdown' || k === 's') this.abaixadoAte = performance.now() + 750;
      else return;
      e.preventDefault();
    });
    addEventListener('pointerdown', (e) => (this.toque = { x: e.clientX, y: e.clientY }));
    addEventListener('pointerup', (e) => {
      if (!this.toque) return;
      const dx = e.clientX - this.toque.x;
      const dy = e.clientY - this.toque.y;
      this.toque = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) this.faixa = Math.max(-1, Math.min(1, this.faixa + (dx > 0 ? 1 : -1))) as Faixa;
      else if (dy < 0) this.pulou = true;
      else this.abaixadoAte = performance.now() + 750;
    });
  }

  ler(agora: number): Comando {
    const c = { faixa: this.faixa, pulo: this.pulou, abaixado: agora < this.abaixadoAte };
    this.pulou = false;
    return c;
  }

  zerar(): void {
    this.faixa = 0;
    this.pulou = false;
    this.abaixadoAte = 0;
  }
}
