// Desenho em canvas 2D: arena com holofotes e torcida, ringue com cordas e os dois lutadores em vista lateral.
// Cada lutador é montado em coordenadas próprias (olhando para a direita) e espelhado quando olha para a esquerda.

import type { Lutador } from './luta';
import { IMPACTO } from './luta';
import type { TipoSoco } from './deteccao';

export interface Visual {
  l: Lutador;
  x: number; // centro do lutador (px)
  chao: number; // linha do chão (px)
  escala: number;
  lado: 1 | -1; // 1 = olha para a direita
  cor: string;
  t: number; // tempo da luta (s)
  aviso: number; // 0..1: a máquina preparando um golpe (luva brilha)
  venceu: boolean;
}

export interface Balao {
  texto: string;
  x: number;
  y: number;
  cor: string;
  vida: number;
  tam: number;
}

const PELE = '#c68642';
const PELE_SOMBRA = '#a86b32';

/* ---------- Arena ---------- */

let torcida: { x: number; y: number; r: number; cor: string }[] = [];
let torcidaPara = '';

export function desenharArena(c: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const fundo = c.createLinearGradient(0, 0, 0, h);
  fundo.addColorStop(0, '#07070f');
  fundo.addColorStop(1, '#1a1030');
  c.fillStyle = fundo;
  c.fillRect(0, 0, w, h);

  // Torcida: cabeças em fileiras, com flash de câmera aqui e ali.
  if (torcidaPara !== `${w}x${h}`) {
    torcidaPara = `${w}x${h}`;
    torcida = [];
    for (let fila = 0; fila < 6; fila++) {
      const y = h * (0.2 + fila * 0.065);
      const r = h * (0.016 + fila * 0.003);
      for (let x = -r; x < w + r; x += r * 2.3) torcida.push({ x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r * 0.6, r, cor: `hsl(${250 + Math.random() * 40}, 20%, ${10 + fila * 3 + Math.random() * 6}%)` });
    }
  }
  for (const p of torcida) {
    c.fillStyle = p.cor;
    c.beginPath();
    c.arc(p.x, p.y + Math.sin(t * 3 + p.x) * p.r * 0.15, p.r, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 3; i++) {
    if (Math.random() < 0.08) {
      const p = torcida[Math.floor(Math.random() * torcida.length)];
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.beginPath();
      c.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
      c.fill();
    }
  }

  // Holofotes.
  for (const [x0, cor] of [
    [0.3, 'rgba(255, 240, 200, 0.07)'],
    [0.7, 'rgba(200, 220, 255, 0.07)'],
  ] as const) {
    c.fillStyle = cor;
    c.beginPath();
    c.moveTo(w * x0 - w * 0.03, 0);
    c.lineTo(w * x0 + w * 0.03, 0);
    c.lineTo(w * 0.5 + w * 0.3, h * 0.85);
    c.lineTo(w * 0.5 - w * 0.3, h * 0.85);
    c.fill();
  }

  // Lona (trapézio em perspectiva) e a saia do ringue.
  const topo = h * 0.6;
  const base = h * 0.9;
  c.fillStyle = '#1e40af';
  c.beginPath();
  c.moveTo(w * 0.14, topo);
  c.lineTo(w * 0.86, topo);
  c.lineTo(w * 0.98, base);
  c.lineTo(w * 0.02, base);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.07)';
  c.font = `900 ${h * 0.09}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('NOCAUTE', w / 2, (topo + base) / 2 + h * 0.01);
  c.fillStyle = '#111827';
  c.fillRect(w * 0.02, base, w * 0.96, h * 0.1);

  // Postes e cordas (vermelha, branca e azul).
  const postes = [w * 0.14, w * 0.86];
  c.fillStyle = '#9ca3af';
  for (const x of postes) c.fillRect(x - h * 0.008, topo - h * 0.28, h * 0.016, h * 0.28);
  ['#dc2626', '#f9fafb', '#2563eb'].forEach((cor, i) => {
    c.strokeStyle = cor;
    c.lineWidth = h * 0.008;
    const y = topo - h * (0.24 - i * 0.07);
    c.beginPath();
    c.moveTo(postes[0], y);
    c.quadraticCurveTo(w / 2, y + h * 0.012, postes[1], y);
    c.stroke();
  });
}

/* ---------- Lutador ---------- */

const ease = (k: number): number => 1 - Math.pow(1 - k, 3);

/** Onde está a luva da mão "frente" ou "trás" agora, em coordenadas do lutador (olhando para a direita). */
function luva(v: Visual, frente: boolean): { x: number; y: number } {
  const { l, t } = v;
  const guarda = l.postura.guarda;
  const respira = Math.sin(t * 4 + (frente ? 0 : 1)) * 3;
  const repouso = frente ? { x: guarda ? 36 : 44, y: guarda ? -232 : -200 + respira } : { x: guarda ? 22 : 26, y: guarda ? -226 : -192 + respira };
  const s = l.soco;
  const mao = s ? (s.mao === 'esq') === (v.lado === 1) : false; // a mão do soco é a da frente?
  if (s && mao === frente) {
    const k = t - s.t0;
    const ida = Math.min(1, k / IMPACTO);
    const volta = k > IMPACTO ? Math.min(1, (k - IMPACTO) / 0.2) : 0;
    const p = ease(ida) * (1 - volta);
    const alvo = alvoDoSoco(s.tipo, s.alvo === 'cabeca');
    // Gancho faz arco por cima; uppercut sobe de baixo.
    const meio = s.tipo === 'gancho' ? { x: 70, y: -275 } : s.tipo === 'uppercut' ? { x: 55, y: -150 } : null;
    if (meio) {
      const q = 1 - p;
      return { x: q * q * repouso.x + 2 * q * p * meio.x + p * p * alvo.x, y: q * q * repouso.y + 2 * q * p * meio.y + p * p * alvo.y };
    }
    return { x: repouso.x + (alvo.x - repouso.x) * p, y: repouso.y + (alvo.y - repouso.y) * p };
  }
  // Máquina preparando: a luva recua e brilha.
  const prep = l.preparando;
  if (prep && ((prep.mao === 'esq') === (v.lado === 1)) === frente) return { x: repouso.x - 22 * v.aviso, y: repouso.y + 6 * v.aviso };
  return repouso;
}

function alvoDoSoco(tipo: TipoSoco, cabeca: boolean): { x: number; y: number } {
  const alcance = tipo === 'jab' || tipo === 'direto' ? 150 : 135;
  return { x: alcance, y: cabeca ? (tipo === 'uppercut' ? -245 : -238) : -170 };
}

export function desenharLutador(c: CanvasRenderingContext2D, v: Visual): void {
  const { l, t, escala, cor } = v;
  c.save();
  c.translate(v.x, v.chao);
  c.scale(v.lado * escala, escala);

  // Caído: deita para trás.
  const caido = l.caidoEm !== null ? Math.min(1, (t - l.caidoEm) / 0.5) : 0;
  if (caido) {
    c.rotate(-caido * 1.45);
    c.translate(0, caido * 20);
  }

  const atingido = Math.max(0, 1 - (t - l.atingidoEm) / 0.35);
  // Esquiva na direção da tela: em coordenadas do lutador (espelhado quando olha para a esquerda) vira esquiva * lado.
  const inclina = l.postura.esquiva * v.lado * 28;
  const abaixa = l.postura.abaixado ? 40 : 0;
  const balanco = Math.sin(t * 5) * 3;
  const corpoX = inclina - atingido * 14;

  // Pernas e calção.
  c.strokeStyle = PELE_SOMBRA;
  c.lineWidth = 20;
  c.lineCap = 'round';
  for (const [px, pe] of [
    [-14, -30 + balanco],
    [16, 26 - balanco],
  ]) {
    c.beginPath();
    c.moveTo(px * 0.6 + corpoX * 0.3, -105 + abaixa * 0.6);
    c.lineTo(pe, -10);
    c.stroke();
    c.fillStyle = '#111';
    c.beginPath();
    c.ellipse(pe + 6, -6, 15, 8, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = cor;
  c.beginPath();
  c.roundRect(-28 + corpoX * 0.4, -130 + abaixa * 0.7, 58, 42, 8);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fillRect(-28 + corpoX * 0.4, -130 + abaixa * 0.7, 58, 6);

  // Tronco.
  c.save();
  c.translate(corpoX, abaixa);
  c.fillStyle = PELE;
  c.beginPath();
  c.roundRect(-26, -215, 54, 92, 22);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(2, -190);
  c.lineTo(2, -140);
  c.stroke();

  // Braço de trás (atrás do corpo).
  const lt = luva(v, false);
  desenharBraco(c, { x: -8, y: -205 }, { x: lt.x - corpoX, y: lt.y - abaixa }, cor, false, 0);

  // Cabeça (com protetor), que dá um tranco para trás quando leva soco.
  const cx = 6 - atingido * 10;
  c.fillStyle = PELE;
  c.beginPath();
  c.arc(cx, -246, 25, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = cor;
  c.beginPath();
  c.arc(cx, -250, 27, Math.PI * 1.05, Math.PI * 1.95);
  c.lineTo(cx + 22, -238);
  c.lineTo(cx - 22, -238);
  c.closePath();
  c.globalAlpha = 0.9;
  c.fill();
  c.globalAlpha = 1;
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(cx + 14, -247, 3, 0, Math.PI * 2);
  c.fill();
  // Boca: sorriso para quem venceu, careta quando apanha.
  c.strokeStyle = '#5a2a12';
  c.lineWidth = 2.5;
  c.beginPath();
  if (v.venceu) c.arc(cx + 12, -236, 6, 0.2, Math.PI - 0.2);
  else if (atingido > 0.3 || caido) c.arc(cx + 12, -230, 5, Math.PI + 0.3, -0.3);
  else {
    c.moveTo(cx + 8, -234);
    c.lineTo(cx + 18, -234);
  }
  c.stroke();
  if (atingido > 0) {
    c.strokeStyle = `rgba(255,255,255,${atingido})`;
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + i * 0.5;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 32, -246 + Math.sin(a) * 32);
      c.lineTo(cx + Math.cos(a) * 44, -246 + Math.sin(a) * 44);
      c.stroke();
    }
  }

  // Braço da frente (na frente do corpo).
  const lf = luva(v, true);
  desenharBraco(c, { x: 14, y: -202 }, { x: lf.x - corpoX, y: lf.y - abaixa }, cor, true, v.aviso);
  c.restore();

  // Vencedor: braços para cima (por cima de tudo).
  if (v.venceu) {
    c.fillStyle = '#ffd23f';
    c.font = 'bold 28px system-ui';
    c.fillText('🏆', -14, -300 + Math.sin(t * 6) * 6);
  }
  c.restore();
}

function desenharBraco(c: CanvasRenderingContext2D, ombro: { x: number; y: number }, mao: { x: number; y: number }, cor: string, frente: boolean, aviso: number): void {
  // Cotovelo: um ponto abaixo do meio do caminho (braço dobrado naturalmente).
  const mx = (ombro.x + mao.x) / 2;
  const my = (ombro.y + mao.y) / 2;
  const dist = Math.hypot(mao.x - ombro.x, mao.y - ombro.y);
  const dobra = Math.max(0, 70 - dist) * 0.6 + 6;
  c.strokeStyle = frente ? PELE : PELE_SOMBRA;
  c.lineWidth = 15;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(ombro.x, ombro.y);
  c.lineTo(mx - dobra * 0.3, my + dobra);
  c.lineTo(mao.x, mao.y);
  c.stroke();
  if (aviso > 0) {
    c.fillStyle = `rgba(255, 220, 60, ${0.25 + aviso * 0.5})`;
    c.beginPath();
    c.arc(mao.x, mao.y, 26 + aviso * 14, 0, Math.PI * 2);
    c.fill();
  }
  const g = c.createRadialGradient(mao.x - 6, mao.y - 6, 3, mao.x, mao.y, 22);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, cor);
  g.addColorStop(1, '#00000080');
  c.fillStyle = g;
  c.beginPath();
  c.arc(mao.x, mao.y, frente ? 19 : 17, 0, Math.PI * 2);
  c.fill();
}

/* ---------- Balões de quadrinho ---------- */

export function desenharBaloes(c: CanvasRenderingContext2D, baloes: Balao[], dt: number, u: number): Balao[] {
  for (const b of baloes) {
    b.vida -= dt;
    const k = Math.min(1, (0.9 - b.vida) * 6 + 0.4);
    c.save();
    c.globalAlpha = Math.min(1, b.vida * 2.5);
    c.translate(b.x, b.y - (0.9 - b.vida) * u * 6);
    c.scale(k, k);
    // Estrela de quadrinho.
    c.fillStyle = b.cor;
    c.beginPath();
    for (let i = 0; i < 20; i++) {
      const r = (i % 2 ? 0.55 : 1) * b.tam * u * 1.6;
      const a = (i / 20) * Math.PI * 2;
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7);
      else c.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.7);
    }
    c.closePath();
    c.fill();
    c.font = `900 ${b.tam * u}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = u * 0.6;
    c.strokeStyle = '#111';
    c.strokeText(b.texto, 0, 0);
    c.fillStyle = '#fff';
    c.fillText(b.texto, 0, 0);
    c.restore();
  }
  return baloes.filter((b) => b.vida > 0);
}
