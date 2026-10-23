// Circuito da corrida (lado oeste da cidade), desenhado a partir do mesmo traçado que o servidor confere:
// asfalto, zebras vermelhas e brancas, linha de chegada quadriculada, pilhas de pneu nas curvas e arquibancada.

import * as THREE from 'three';
import { CIRCUITO, LARGURA_PISTA, pontosPista } from './protocolo';

const PONTOS = pontosPista(4);

/** Distância de um ponto do mundo até o centro da pista (para saber se saiu para a grama). */
export function distanciaDaPista(x: number, z: number): number {
  const lx = x - CIRCUITO[0];
  const lz = z - CIRCUITO[1];
  let melhor = Infinity;
  for (let i = 0; i < PONTOS.length; i++) {
    const a = PONTOS[i];
    const b = PONTOS[(i + 1) % PONTOS.length];
    // Distância ao segmento a-b.
    const abx = b[0] - a[0];
    const abz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((lx - a[0]) * abx + (lz - a[1]) * abz) / (abx * abx + abz * abz || 1)));
    const d = Math.hypot(lx - (a[0] + abx * t), lz - (a[1] + abz * t));
    if (d < melhor) melhor = d;
  }
  return melhor;
}

/** Faixa ao longo do traçado, de "de" a "ate" metros do centro (positivo = lado de fora). */
function faixa(de: number, ate: number, y: number, cor: (i: number) => THREE.Color): THREE.BufferGeometry {
  const n = PONTOS.length;
  const pos: number[] = [];
  const cores: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = PONTOS[i % n];
    const q = PONTOS[(i + 1) % n];
    const r = PONTOS[(i - 1 + n) % n];
    // Normal no ponto (média dos dois trechos).
    let nx = -(q[1] - r[1]);
    let nz = q[0] - r[0];
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    const c = cor(i);
    for (const d of [de, ate]) {
      pos.push(p[0] + nx * d, y, p[1] + nz * d);
      cores.push(c.r, c.g, c.b);
    }
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function criarPista(cena: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  g.position.set(CIRCUITO[0], 0, CIRCUITO[1]);
  const meia = LARGURA_PISTA / 2;
  const cinza = new THREE.Color('#3f3f46');
  const asfalto = new THREE.Mesh(faixa(-meia, meia, 0.03, () => cinza), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
  asfalto.receiveShadow = true;
  const vermelho = new THREE.Color('#dc2626');
  const branco = new THREE.Color('#f5f5f4');
  const zebra = (i: number) => (Math.floor(i / 2) % 2 ? vermelho : branco);
  const matZebra = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  const zebraFora = new THREE.Mesh(faixa(meia, meia + 1.2, 0.05, zebra), matZebra);
  const zebraDentro = new THREE.Mesh(faixa(-meia - 1.2, -meia, 0.05, zebra), matZebra);
  g.add(asfalto, zebraFora, zebraDentro);

  // Linha de chegada quadriculada (no primeiro ponto, atravessando a pista).
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 8; j++) {
    x.fillStyle = (i + j) % 2 ? '#111' : '#fff';
    x.fillRect(i * 32, j * 32, 32, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  const chegada = new THREE.Mesh(new THREE.PlaneGeometry(2, LARGURA_PISTA), new THREE.MeshBasicMaterial({ map: tex }));
  chegada.rotation.x = -Math.PI / 2;
  chegada.position.set(PONTOS[0][0], 0.07, PONTOS[0][1]);
  g.add(chegada);

  // Pórtico da largada.
  const portico = new THREE.MeshStandardMaterial({ color: '#1f2937', flatShading: true });
  for (const lado of [-1, 1]) {
    const poste = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), portico);
    poste.position.set(PONTOS[0][0], 3, PONTOS[0][1] + lado * (meia + 1.5));
    poste.castShadow = true;
    g.add(poste);
  }
  const pc = document.createElement('canvas');
  pc.width = 512;
  pc.height = 96;
  const px = pc.getContext('2d')!;
  px.fillStyle = '#b91c1c';
  px.fillRect(0, 0, 512, 96);
  px.fillStyle = '#fff';
  px.font = '900 64px system-ui, sans-serif';
  px.textAlign = 'center';
  px.textBaseline = 'middle';
  px.fillText('🏁 LARGADA', 256, 52);
  const ptex = new THREE.CanvasTexture(pc);
  ptex.colorSpace = THREE.SRGBColorSpace;
  const faixaTopo = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, LARGURA_PISTA + 3.5), [portico, portico, portico, portico, new THREE.MeshBasicMaterial({ map: ptex }), new THREE.MeshBasicMaterial({ map: ptex })]);
  faixaTopo.position.set(PONTOS[0][0], 6.2, PONTOS[0][1]);
  g.add(faixaTopo);

  // Pilhas de pneu do lado de fora das curvas (onde a direção muda mais).
  const pneu = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.9 });
  const n = PONTOS.length;
  for (let i = 0; i < n; i += 5) {
    const a = PONTOS[(i - 3 + n) % n];
    const p = PONTOS[i];
    const b = PONTOS[(i + 3) % n];
    const curva = (b[0] - p[0]) * (p[1] - a[1]) - (b[1] - p[1]) * (p[0] - a[0]);
    if (Math.abs(curva) < 40) continue;
    let nx = -(b[1] - a[1]);
    let nz = b[0] - a[0];
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    const lado = curva > 0 ? -1 : 1;
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.2, 6, 10), pneu);
      t.rotation.x = Math.PI / 2;
      t.position.set(p[0] + nx * lado * (meia + 3), 0.2 + k * 0.38, p[1] + nz * lado * (meia + 3));
      t.castShadow = true;
      g.add(t);
    }
  }

  // Arquibancada perto da largada.
  const concreto = new THREE.MeshStandardMaterial({ color: '#9ca3af', flatShading: true });
  for (let i = 0; i < 4; i++) {
    const degrau = new THREE.Mesh(new THREE.BoxGeometry(30, 0.7, 2), concreto);
    degrau.position.set(PONTOS[0][0] + 5, 0.35 + i * 0.7, PONTOS[0][1] - meia - 6 - i * 2);
    degrau.castShadow = degrau.receiveShadow = true;
    g.add(degrau);
  }

  cena.add(g);
  return g;
}

/** Desenha o minimapa (traçado + pontos dos corredores) num canvas 2D. */
export function desenharMinimapa(ctx: CanvasRenderingContext2D, tam: number, pontos: { x: number; z: number; cor: string; eu: boolean }[]): void {
  const escala = (tam - 16) / 150;
  const px = (x: number) => tam / 2 + (x - CIRCUITO[0]) * escala;
  const pz = (z: number) => tam / 2 + (z - CIRCUITO[1]) * escala;
  ctx.clearRect(0, 0, tam, tam);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(0, 0, tam, tam, 12);
  ctx.fill();
  ctx.strokeStyle = '#a1a1aa';
  ctx.lineWidth = Math.max(3, LARGURA_PISTA * escala);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  PONTOS.forEach((p, i) => (i ? ctx.lineTo(px(p[0] + CIRCUITO[0]), pz(p[1] + CIRCUITO[1])) : ctx.moveTo(px(p[0] + CIRCUITO[0]), pz(p[1] + CIRCUITO[1]))));
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillRect(px(PONTOS[0][0] + CIRCUITO[0]) - 1, pz(PONTOS[0][1] + CIRCUITO[1]) - 6, 3, 12);
  for (const p of pontos) {
    ctx.fillStyle = p.cor;
    ctx.beginPath();
    ctx.arc(px(p.x), pz(p.z), p.eu ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    if (p.eu) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
