// Lê o boxe pela câmera (MediaPipe Pose): socos, guarda, esquiva e braços para cima (levantar depois de cair).
// Tudo medido em larguras de ombro a partir da calibração, então vale perto ou longe da câmera.
//
// Soco = a mão se afasta do corpo de repente (pela tela ou vindo para a câmera, pela profundidade z).
// Tipo: de baixo para cima = uppercut; de lado com o cotovelo dobrado = gancho; o resto = jab (mão esquerda) ou direto (direita).

import type { Ponto } from '../../comum/camera';

export type Mao = 'esq' | 'dir';
export type TipoSoco = 'jab' | 'direto' | 'gancho' | 'uppercut';
export type Alvo = 'cabeca' | 'corpo';

export interface Soco {
  mao: Mao;
  tipo: TipoSoco;
  alvo: Alvo;
  forca: number; // 0..1
}

export interface Postura {
  guarda: boolean;
  esquiva: -1 | 0 | 1; // inclinado para a esquerda / direita da tela
  abaixado: boolean;
  bracosAlto: boolean;
}

export interface Entrada {
  postura: Postura;
  socos: Soco[];
}

export interface Calibracao {
  nx: number; // nariz parado (pixels)
  ny: number;
  oy: number; // altura do meio dos ombros
  sw: number; // largura dos ombros (pixels)
}

const I = { nariz: 0, ombroE: 11, ombroD: 12, cotE: 13, cotD: 14, pulE: 15, pulD: 16 } as const;
const VIS = 0.5;
const INTERVALO = 300; // ms mínimos entre dois socos da mesma mão
const JANELA = 90; // ms usados para medir a velocidade da mão

interface Amostra {
  t: number;
  x: number;
  y: number;
  z: number;
  dist: number; // distância pulso–ombro
}

const anguloCotovelo = (o: Ponto, c: Ponto, p: Ponto, w: number, h: number): number => {
  const ax = (o.x - c.x) * w;
  const ay = (o.y - c.y) * h;
  const bx = (p.x - c.x) * w;
  const by = (p.y - c.y) * h;
  const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
};

export class LeitorBoxe {
  private hist: Record<Mao, Amostra[]> = { esq: [], dir: [] };
  private ultimo: Record<Mao, number> = { esq: 0, dir: 0 };

  constructor(public calib: Calibracao) {}

  static medir(pts: Ponto[], w: number, h: number): Calibracao {
    const e = pts[I.ombroE];
    const d = pts[I.ombroD];
    return { nx: pts[I.nariz].x * w, ny: pts[I.nariz].y * h, oy: ((e.y + d.y) / 2) * h, sw: Math.hypot((e.x - d.x) * w, (e.y - d.y) * h) };
  }

  ler(pts: Ponto[] | undefined, w: number, h: number, agora: number): Entrada | null {
    if (!pts || pts[I.ombroE].vis < VIS || pts[I.ombroD].vis < VIS) return null;
    const { sw } = this.calib;
    const px = (p: Ponto) => ({ x: (p.x * w) / sw, y: (p.y * h) / sw, z: (p.z * w) / sw }); // em larguras de ombro
    const nariz = px(pts[I.nariz]);
    const oy = ((pts[I.ombroE].y + pts[I.ombroD].y) / 2) * (h / sw);

    // Postura.
    const pe = pts[I.pulE];
    const pd = pts[I.pulD];
    const maoE = px(pe);
    const maoD = px(pd);
    const pertoDoRosto = (m: { x: number; y: number }) => Math.hypot(m.x - nariz.x, m.y - nariz.y) < 0.85 && m.y < oy + 0.15;
    const guarda = pe.vis > VIS && pd.vis > VIS && pertoDoRosto(maoE) && pertoDoRosto(maoD);
    const dx = (pts[I.nariz].x * w - this.calib.nx) / sw;
    const dy = (pts[I.nariz].y * h - this.calib.ny) / sw;
    const esquiva: -1 | 0 | 1 = dx < -0.45 ? -1 : dx > 0.45 ? 1 : 0;
    const abaixado = dy > 0.5;
    const bracosAlto = pe.vis > VIS && pd.vis > VIS && maoE.y < nariz.y - 0.3 && maoD.y < nariz.y - 0.3;

    // Socos: uma mão de cada vez.
    const socos: Soco[] = [];
    for (const mao of ['esq', 'dir'] as Mao[]) {
      const [io, ic, ip] = mao === 'esq' ? [I.ombroE, I.cotE, I.pulE] : [I.ombroD, I.cotD, I.pulD];
      if (pts[ip].vis < VIS) {
        this.hist[mao] = [];
        continue;
      }
      const p = px(pts[ip]);
      const o = px(pts[io]);
      const h0 = this.hist[mao];
      const amostra = { t: agora, x: p.x, y: p.y, z: p.z, dist: Math.hypot(p.x - o.x, p.y - o.y) };
      // Salto impossível (troca de pessoa no detector): recomeça a medida em vez de ver um soco fantasma.
      if (h0.length && Math.hypot(amostra.x - h0[0].x, amostra.y - h0[0].y) > 2.5) h0.length = 0;
      h0.unshift(amostra);
      while (h0.length > 1 && agora - h0[h0.length - 1].t > 400) h0.pop();
      const antes = h0.find((a) => agora - a.t >= JANELA);
      // Soco sai da guarda (como no boxe de verdade): a guarda não impede o próprio soco.
      if (!antes || agora - this.ultimo[mao] < INTERVALO) continue;
      const dt = (agora - antes.t) / 1000;
      const vx = (amostra.x - antes.x) / dt;
      const vy = (amostra.y - antes.y) / dt; // positivo = para baixo
      const vz = (amostra.z - antes.z) / dt; // negativo = vindo para a câmera
      const afasta = (amostra.dist - antes.dist) / dt; // positivo = estica o braço
      const rapidez = Math.hypot(vx, vy);
      const frente = -vz;
      const cotovelo = anguloCotovelo(pts[io], pts[ic], pts[ip], w, h);
      let tipo: TipoSoco | null = null;
      if (vy < -4.2 && Math.abs(vy) > Math.abs(vx) * 1.2 && amostra.y < antes.y) tipo = 'uppercut';
      else if (Math.abs(vx) > 4.5 && Math.abs(vx) > Math.abs(vy) && cotovelo < 125 && afasta > -1) tipo = 'gancho';
      else if ((frente > 4.5 && afasta > -0.5) || (rapidez > 5 && afasta > 2.2)) tipo = mao === 'esq' ? 'jab' : 'direto';
      if (!tipo) continue;
      this.ultimo[mao] = agora;
      socos.push({ mao, tipo, alvo: amostra.y < oy - 0.05 ? 'cabeca' : 'corpo', forca: Math.min(1, Math.max(rapidez, frente) / 10) });
    }
    return { postura: { guarda, esquiva, abaixado, bracosAlto }, socos };
  }
}

/** Teclado (para testar sem câmera): J jab, K direto, L gancho, I uppercut (Shift = no corpo),
 *  espaço guarda, A/D esquiva, S abaixa, R braços para cima. */
export class TecladoBoxe {
  private apertadas = new Set<string>();
  private fila: Soco[] = [];

  constructor() {
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (e.repeat) return;
      this.apertadas.add(k);
      const alvo: Alvo = e.shiftKey ? 'corpo' : 'cabeca';
      const mapa: Record<string, [TipoSoco, Mao]> = { j: ['jab', 'esq'], k: ['direto', 'dir'], l: ['gancho', 'dir'], i: ['uppercut', 'esq'] };
      if (mapa[k]) this.fila.push({ tipo: mapa[k][0], mao: mapa[k][1], alvo, forca: 0.8 });
      if (k === ' ') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.apertadas.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.apertadas.clear());
  }

  ler(): Entrada {
    const a = this.apertadas;
    const socos = this.fila;
    this.fila = [];
    return {
      postura: { guarda: a.has(' '), esquiva: a.has('a') ? -1 : a.has('d') ? 1 : 0, abaixado: a.has('s'), bracosAlto: a.has('r') },
      socos,
    };
  }
}
