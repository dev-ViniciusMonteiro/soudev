// Desenho em canvas 2D, no estilo neon geométrico: fundo que troca de cor por seção e pulsa na batida,
// chão/teto do corredor, objetos e o ícone de cada modo. Usado pelo jogo e pelo editor.

import { type Fase, type Jogador, type Objeto, tamanho } from './fisica';

export interface Icone {
  cor1: string;
  cor2: string;
  rosto: number; // 0..3
}

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  cor: string;
  tam: number;
}

export interface Camera {
  x: number; // mundo no canto esquerdo
  y: number; // mundo na linha do chão da tela
  esc: number; // pixels por bloco
}

const COR_MODO: Record<string, string> = { cubo: '#4ade80', nave: '#f472b6', bola: '#f87171', ovni: '#fb923c', onda: '#22d3ee', robo: '#e5e7eb', aranha: '#a78bfa' };
const COR_ORBE: Record<string, string> = { orbeAmarela: '#facc15', orbeRosa: '#f472b6', orbeAzul: '#38bdf8', orbeVerde: '#4ade80', orbePreta: '#111827' };
const COR_PAD: Record<string, string> = { padAmarelo: '#facc15', padRosa: '#f472b6', padAzul: '#38bdf8' };

const mistura = (a: string, b: string, k: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/** Cor do fundo e do chão naquele x (transição suave de 10 blocos entre as seções). */
export function coresEm(fase: Fase, x: number): { fundo: string; chao: string } {
  const cs = fase.cores;
  let i = 0;
  while (i + 1 < cs.length && cs[i + 1].x <= x) i++;
  const prox = cs[i + 1];
  if (prox && prox.x - x < 10) {
    const k = 1 - (prox.x - x) / 10;
    return { fundo: mistura(cs[i].fundo, prox.fundo, k), chao: mistura(cs[i].chao, prox.chao, k) };
  }
  return { fundo: cs[i]?.fundo ?? '#1e1b4b', chao: cs[i]?.chao ?? '#3730a3' };
}

export class Desenho {
  readonly c: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  cam: Camera = { x: 0, y: 0, esc: 40 };

  constructor(readonly canvas: HTMLCanvasElement) {
    this.c = canvas.getContext('2d')!;
    this.ajustar();
    addEventListener('resize', () => this.ajustar());
  }

  ajustar(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = Math.round(innerWidth * dpr);
    this.h = Math.round(innerHeight * dpr);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    // ~11 blocos de altura, mas pelo menos ~16 de largura (celular em pé).
    this.cam.esc = Math.min(this.h / 11, this.w / 16);
  }

  /** Linha do chão na tela. */
  get chaoTela(): number {
    return this.h * 0.8;
  }

  sx(x: number): number {
    return (x - this.cam.x) * this.cam.esc;
  }

  sy(y: number): number {
    return this.chaoTela - (y - this.cam.y) * this.cam.esc;
  }

  /** Câmera segue o jogador: ele fica a 30% da tela; na vertical, centraliza o corredor ou acompanha o pulo. */
  seguir(j: Jogador, dt: number): void {
    const e = this.cam.esc;
    this.cam.x = j.x - (this.w * 0.3) / e;
    const alvo = Number.isFinite(j.teto) ? (j.piso + j.teto) / 2 - (this.chaoTela - this.h * 0.45) / e : Math.max(0, j.y - 4);
    this.cam.y += (alvo - this.cam.y) * Math.min(1, dt * 4);
  }

  fundo(fase: Fase, pulso: number, tempo: number): void {
    const { c, w, h } = this;
    const cor = coresEm(fase, this.cam.x + w / this.cam.esc / 2);
    c.fillStyle = cor.fundo;
    c.fillRect(0, 0, w, h);
    // Quadrados grandes ao fundo (parallax lento) e o clarão da batida.
    const e = this.cam.esc;
    const lado = e * 4;
    const desloc = (this.cam.x * e * 0.15) % lado;
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 2;
    for (let x = -desloc - lado; x < w + lado; x += lado) {
      for (let y = ((this.cam.y * e * 0.1) % lado) - lado; y < h; y += lado) c.strokeRect(x + 6, y + 6, lado - 12, lado - 12);
    }
    if (pulso > 0) {
      c.fillStyle = `rgba(255,255,255,${pulso * 0.06})`;
      c.fillRect(0, 0, w, h);
    }
    void tempo;
  }

  /** Chão (sempre) e o teto/piso do corredor quando existe. */
  limites(fase: Fase, j: Jogador | null): void {
    const { c, w, h } = this;
    const cor = coresEm(fase, this.cam.x + w / this.cam.esc / 2);
    const faixa = (yMundo: number, paraBaixo: boolean): void => {
      const y = this.sy(yMundo);
      c.fillStyle = cor.chao;
      if (paraBaixo) c.fillRect(0, y, w, h - y);
      else c.fillRect(0, 0, w, y);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.fillRect(0, y - 1.5, w, 3);
      c.shadowColor = '#fff';
    };
    faixa(j?.piso ?? 0, true);
    if (j && Number.isFinite(j.teto)) faixa(j.teto, false);
  }

  objetos(fase: Fase, t: number, pegas: Set<number>, jaTinha: Set<number>, usados: Set<number>): void {
    const e = this.cam.esc;
    const x0 = this.cam.x - 2;
    const x1 = this.cam.x + this.w / e + 2;
    for (const o of fase.objetos) {
      if (o.x < x0 || o.x > x1) continue;
      this.objeto(o, t, pegas, jaTinha, usados);
    }
  }

  objeto(o: Objeto, t: number, pegas = new Set<number>(), jaTinha = new Set<number>(), usados = new Set<number>()): void {
    const { c } = this;
    const e = this.cam.esc;
    const x = this.sx(o.x);
    const y = this.sy(o.y + 1); // canto de cima do bloco na tela
    switch (o.t) {
      case 'bloco':
      case 'meio': {
        const meio = o.t === 'meio';
        const yy = meio ? y : y;
        const hh = meio ? e / 2 : e;
        c.fillStyle = 'rgba(0,0,0,0.55)';
        c.fillRect(x, yy, e, hh);
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = Math.max(1.5, e * 0.05);
        c.strokeRect(x + 1, yy + 1, e - 2, hh - 2);
        c.strokeStyle = 'rgba(255,255,255,0.25)';
        c.strokeRect(x + e * 0.22, yy + hh * 0.22, e * 0.56, hh * 0.56);
        break;
      }
      case 'espinho':
      case 'espinhoMini': {
        const mini = o.t === 'espinhoMini';
        c.save();
        c.translate(x + e / 2, y + e / 2);
        c.rotate(((o.r ?? 0) * Math.PI) / 180);
        const alt = mini ? e * 0.45 : e;
        c.beginPath();
        c.moveTo(-e / 2, e / 2);
        c.lineTo(0, e / 2 - alt);
        c.lineTo(e / 2, e / 2);
        c.closePath();
        c.fillStyle = '#05050a';
        c.fill();
        c.strokeStyle = '#fff';
        c.lineWidth = Math.max(1.5, e * 0.05);
        c.stroke();
        c.restore();
        break;
      }
      case 'serra': {
        c.save();
        c.translate(x + e / 2, y + e / 2);
        c.rotate(t * 8);
        c.beginPath();
        for (let i = 0; i < 16; i++) {
          const r = (i % 2 ? 0.38 : 0.55) * e;
          const a = (i / 16) * Math.PI * 2;
          if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath();
        c.fillStyle = '#05050a';
        c.fill();
        c.strokeStyle = '#fff';
        c.lineWidth = 2;
        c.stroke();
        c.restore();
        break;
      }
      case 'orbeAmarela':
      case 'orbeRosa':
      case 'orbeAzul':
      case 'orbeVerde':
      case 'orbePreta': {
        const cor = COR_ORBE[o.t];
        const usado = usados.has(o.id ?? -1);
        const pulsa = 1 + Math.sin(t * 6) * 0.06;
        c.save();
        c.globalAlpha = usado ? 0.35 : 1;
        c.beginPath();
        c.arc(x + e / 2, y + e / 2, e * 0.42 * pulsa, 0, Math.PI * 2);
        c.fillStyle = cor;
        c.shadowColor = cor;
        c.shadowBlur = e * 0.5;
        c.fill();
        c.shadowBlur = 0;
        c.lineWidth = e * 0.08;
        c.strokeStyle = o.t === 'orbePreta' ? '#ef4444' : '#fff';
        c.stroke();
        c.restore();
        break;
      }
      case 'padAmarelo':
      case 'padRosa':
      case 'padAzul': {
        const cor = COR_PAD[o.t];
        const base = this.sy(o.y);
        c.beginPath();
        c.ellipse(x + e / 2, base, e * 0.42, e * 0.18, 0, Math.PI, 0);
        c.fillStyle = cor;
        c.shadowColor = cor;
        c.shadowBlur = e * 0.4;
        c.fill();
        c.shadowBlur = 0;
        break;
      }
      case 'portalModo':
      case 'portalGravidade':
      case 'portalVelocidade':
      case 'portalTamanho': {
        let cor = '#fff';
        let rotulo = '';
        if (o.t === 'portalModo') {
          cor = COR_MODO[o.modo ?? 'cubo'];
          rotulo = { cubo: '■', nave: '▲', bola: '●', ovni: '◓', onda: '➤', robo: '🤖', aranha: '🕷' }[o.modo ?? 'cubo'] ?? '';
        } else if (o.t === 'portalGravidade') {
          cor = o.grav === -1 ? '#facc15' : '#38bdf8';
          rotulo = o.grav === -1 ? '⇅' : '⇵';
        } else if (o.t === 'portalVelocidade') {
          cor = { '0.5': '#fb923c', '1': '#38bdf8', '2': '#4ade80', '3': '#f472b6', '4': '#ef4444' }[String(o.vel)] ?? '#fff';
          rotulo = o.vel === 0.5 ? '<' : '>'.repeat(o.vel ?? 1);
        } else {
          cor = o.mini ? '#f472b6' : '#4ade80';
          rotulo = o.mini ? 'mini' : 'normal';
        }
        const topo = this.sy(o.y + 3);
        const alt = e * 3;
        // Feixe de altura inteira: o portal vale em qualquer altura, não só dentro do oval.
        const feixe = c.createLinearGradient(x, 0, x + e, 0);
        feixe.addColorStop(0, 'transparent');
        feixe.addColorStop(0.5, cor);
        feixe.addColorStop(1, 'transparent');
        c.save();
        c.globalAlpha = usados.has(o.id ?? -1) ? 0.06 : 0.22;
        c.fillStyle = feixe;
        c.fillRect(x, 0, e, this.h);
        c.restore();
        c.save();
        c.globalAlpha = usados.has(o.id ?? -1) ? 0.5 : 0.95;
        c.lineWidth = e * 0.16;
        c.strokeStyle = cor;
        c.shadowColor = cor;
        c.shadowBlur = e * 0.5;
        c.beginPath();
        c.ellipse(x + e / 2, topo + alt / 2, e * 0.42, alt / 2, 0, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;
        c.fillStyle = cor;
        c.font = `900 ${e * 0.45}px system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(rotulo, x + e / 2, topo - e * 0.4);
        c.restore();
        break;
      }
      case 'moeda': {
        if (pegas.has(o.id ?? -1)) break;
        c.save();
        c.globalAlpha = jaTinha.has(o.id ?? -1) ? 0.4 : 1;
        const sx = Math.abs(Math.cos(t * 3));
        c.translate(x + e / 2, y + e / 2);
        c.scale(Math.max(0.15, sx), 1);
        c.beginPath();
        c.arc(0, 0, e * 0.4, 0, Math.PI * 2);
        c.fillStyle = '#facc15';
        c.shadowColor = '#facc15';
        c.shadowBlur = e * 0.5;
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#a16207';
        c.font = `900 ${e * 0.45}px system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('★', 0, e * 0.02);
        c.restore();
        break;
      }
      case 'checkpoint': {
        c.fillStyle = '#4ade80';
        c.beginPath();
        c.moveTo(x + e / 2, y);
        c.lineTo(x + e, y + e / 2);
        c.lineTo(x + e / 2, y + e);
        c.lineTo(x, y + e / 2);
        c.fill();
        break;
      }
    }
  }

  jogador(j: Jogador, icone: Icone, t: number): void {
    const { c } = this;
    const e = this.cam.esc;
    const s = tamanho(j) * e;
    const cx = this.sx(j.x) + s / 2;
    const cy = this.sy(j.y) - s / 2;
    c.save();
    c.translate(cx, cy);
    // Ângulo positivo no canvas = horário: o cubo gira para a frente; nave e onda apontam o bico para onde vão.
    c.rotate((j.rot * Math.PI) / 180);
    if (j.grav === -1 && j.modo !== 'cubo' && j.modo !== 'bola') c.scale(1, -1);
    const quadrado = (lado: number): void => {
      c.fillStyle = icone.cor1;
      c.fillRect(-lado / 2, -lado / 2, lado, lado);
      c.strokeStyle = '#000';
      c.lineWidth = lado * 0.08;
      c.strokeRect(-lado / 2, -lado / 2, lado, lado);
      c.fillStyle = icone.cor2;
      c.fillRect(-lado * 0.3, -lado * 0.3, lado * 0.6, lado * 0.6);
      // Rosto: olhos e boca (4 estilos).
      c.fillStyle = '#000';
      const r = icone.rosto;
      const olho = lado * (r === 2 ? 0.14 : 0.1);
      c.fillRect(-lado * 0.2, -lado * 0.15, olho, r === 3 ? olho * 0.5 : olho);
      c.fillRect(lado * 0.1, -lado * 0.15, olho, r === 3 ? olho * 0.5 : olho);
      if (r !== 1) c.fillRect(-lado * 0.15, lado * 0.1, lado * 0.3, lado * 0.06);
    };
    switch (j.modo) {
      case 'cubo':
        quadrado(s);
        break;
      case 'nave':
        // Casco triangular com o cubo pequeno em cima.
        c.fillStyle = icone.cor2;
        c.beginPath();
        c.moveTo(s * 0.75, 0);
        c.lineTo(-s * 0.6, s * 0.35);
        c.lineTo(-s * 0.45, 0);
        c.lineTo(-s * 0.6, -s * 0.1);
        c.closePath();
        c.fill();
        c.strokeStyle = '#000';
        c.lineWidth = s * 0.06;
        c.stroke();
        c.save();
        c.translate(-s * 0.05, -s * 0.22);
        quadrado(s * 0.45);
        c.restore();
        break;
      case 'bola':
        c.beginPath();
        c.arc(0, 0, s / 2, 0, Math.PI * 2);
        c.fillStyle = icone.cor1;
        c.fill();
        c.lineWidth = s * 0.08;
        c.strokeStyle = '#000';
        c.stroke();
        c.fillStyle = icone.cor2;
        c.fillRect(-s * 0.4, -s * 0.08, s * 0.8, s * 0.16);
        c.fillRect(-s * 0.08, -s * 0.4, s * 0.16, s * 0.8);
        break;
      case 'ovni':
        c.fillStyle = icone.cor2;
        c.beginPath();
        c.ellipse(0, s * 0.15, s * 0.6, s * 0.22, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#000';
        c.lineWidth = s * 0.06;
        c.stroke();
        c.save();
        c.translate(0, -s * 0.12);
        quadrado(s * 0.45);
        c.restore();
        break;
      case 'onda':
        c.fillStyle = icone.cor1;
        c.beginPath();
        c.moveTo(s * 0.7, 0);
        c.lineTo(-s * 0.5, s * 0.45);
        c.lineTo(-s * 0.25, 0);
        c.lineTo(-s * 0.5, -s * 0.45);
        c.closePath();
        c.fill();
        c.strokeStyle = icone.cor2;
        c.lineWidth = s * 0.1;
        c.stroke();
        break;
      case 'robo': {
        const passo = j.noChao ? Math.sin(t * 18) * s * 0.12 : 0;
        c.fillStyle = icone.cor2;
        c.fillRect(-s * 0.28 + passo, s * 0.15, s * 0.16, s * 0.35);
        c.fillRect(s * 0.12 - passo, s * 0.15, s * 0.16, s * 0.35);
        c.save();
        c.translate(0, -s * 0.12);
        quadrado(s * 0.65);
        c.restore();
        break;
      }
      case 'aranha': {
        c.strokeStyle = icone.cor2;
        c.lineWidth = s * 0.08;
        for (const lado of [-1, 1]) {
          for (let k = 0; k < 2; k++) {
            c.beginPath();
            c.moveTo(lado * s * 0.15, s * 0.1);
            c.lineTo(lado * s * (0.4 + k * 0.1), s * 0.05);
            c.lineTo(lado * s * (0.45 + k * 0.1), s * 0.5);
            c.stroke();
          }
        }
        c.save();
        c.translate(0, -s * 0.1);
        quadrado(s * 0.6);
        c.restore();
        break;
      }
    }
    c.restore();
  }

  particulas(lista: Particula[], dt: number): Particula[] {
    const { c } = this;
    const e = this.cam.esc;
    for (const p of lista) {
      p.vida -= dt;
      p.vy -= 20 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      c.globalAlpha = Math.max(0, Math.min(1, p.vida * 2));
      c.fillStyle = p.cor;
      c.fillRect(this.sx(p.x) - (p.tam * e) / 2, this.sy(p.y) - (p.tam * e) / 2, p.tam * e, p.tam * e);
    }
    c.globalAlpha = 1;
    return lista.filter((p) => p.vida > 0);
  }

  /** Rastro da onda (linha que segue o caminho) ou faíscas dos outros modos. */
  rastro(pontos: { x: number; y: number }[], cor: string): void {
    if (pontos.length < 2) return;
    const { c } = this;
    c.save();
    c.strokeStyle = cor;
    c.lineWidth = this.cam.esc * 0.18;
    c.lineJoin = 'round';
    c.globalAlpha = 0.7;
    c.shadowColor = cor;
    c.shadowBlur = this.cam.esc * 0.4;
    c.beginPath();
    pontos.forEach((p, i) => (i ? c.lineTo(this.sx(p.x), this.sy(p.y)) : c.moveTo(this.sx(p.x), this.sy(p.y))));
    c.stroke();
    c.restore();
  }

  progresso(fracao: number, recorde: number, pratica: boolean): void {
    const { c, w } = this;
    const larg = w * 0.4;
    const x = (w - larg) / 2;
    const y = this.h * 0.03;
    const alt = this.h * 0.018;
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(x, y, larg, alt);
    c.fillStyle = pratica ? '#4ade80' : '#facc15';
    c.fillRect(x, y, larg * Math.min(1, fracao), alt);
    if (recorde > 0) {
      c.fillStyle = '#fff';
      c.fillRect(x + larg * recorde - 1, y - 3, 2, alt + 6);
    }
    c.fillStyle = '#fff';
    c.font = `800 ${alt * 1.6}px system-ui, sans-serif`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(`${Math.floor(fracao * 100)}%`, x + larg + 10, y + alt / 2);
  }

  /** Texto escrito no mundo (ex.: "Tentativa 12" no começo da fase). */
  textoNoMundo(texto: string, x: number, y: number, tam: number): void {
    const { c } = this;
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.font = `900 ${tam * this.cam.esc}px system-ui, sans-serif`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(texto, this.sx(x), this.sy(y));
  }
}

export { COR_MODO };
