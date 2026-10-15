// Mapa (Vila Raiz, Rota 1, Rota 2 e Monte Gélido), desenho dos tiles e dos personagens.

import { ctx, text } from './engine';

export const T = 32; // tamanho do tile na tela (16px de arte em dobro)
export const MAP_W = 30;
export const MAP_H = 64;

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/* ---------- Construção do mapa ---------- */

export const grid: string[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('#'));
const rect = (x0: number, y0: number, x1: number, y1: number, ch: string): void => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch;
};
const put = (x: number, y: number, ch: string): void => {
  grid[y][x] = ch;
};

// Monte Gélido (neve)
rect(0, 0, 29, 17, '^');
rect(1, 1, 28, 16, '*');
rect(2, 3, 10, 8, ';');
rect(18, 5, 27, 11, ';');
rect(3, 11, 11, 15, ';');
rect(20, 13, 26, 15, ';');
[[12, 6], [17, 9], [13, 13], [6, 9], [24, 3]].forEach(([x, y]) => put(x, y, 'R'));
[[1, 1], [2, 1], [27, 1], [28, 1], [28, 2], [1, 2]].forEach(([x, y]) => put(x, y, '^'));
// Rota 2
rect(1, 18, 28, 32, '.');
rect(2, 19, 11, 24, ',');
rect(18, 20, 27, 25, ',');
rect(2, 28, 10, 32, ',');
rect(19, 29, 27, 32, ',');
rect(22, 27, 27, 28, '~');
[[13, 22], [17, 27], [12, 29], [7, 26]].forEach(([x, y]) => put(x, y, 'R'));
[[1, 26], [1, 27], [28, 18], [28, 19], [16, 19], [12, 25]].forEach(([x, y]) => put(x, y, '#'));
// Rota 1
rect(1, 34, 28, 48, '.');
rect(2, 36, 10, 41, ',');
rect(18, 42, 27, 47, ',');
rect(3, 45, 10, 47, ',');
rect(20, 35, 26, 38, '~');
[[12, 38], [17, 40], [11, 44], [1, 34], [28, 34], [28, 48]].forEach(([x, y]) => put(x, y, '#'));
[[16, 36], [17, 36], [6, 43], [25, 40]].forEach(([x, y]) => put(x, y, 'F'));
// Vila Raiz
rect(1, 50, 28, 62, '.');
rect(5, 56, 22, 56, '=');
put(5, 55, '=');
put(22, 55, '=');
[[9, 52], [10, 52], [18, 60], [19, 60], [11, 61], [25, 61], [26, 61], [2, 60]].forEach(([x, y]) => put(x, y, 'F'));
rect(9, 59, 12, 59, 'f');
rect(17, 53, 19, 53, 'f');
// Caminho principal norte-sul
for (let y = 1; y <= 62; y++) {
  grid[y][14] = y <= 17 ? '-' : '=';
  grid[y][15] = y <= 17 ? '-' : '=';
}
// Placas
put(13, 48, 'S');
put(13, 32, 'S');
put(13, 17, 'S');
put(12, 53, 'S');

export const SIGNS: Record<string, string> = {
  '13,48': 'ROTA 1 — ao norte: Rota 2. Ao sul: Vila Raiz.',
  '13,32': 'ROTA 2 — cuidado com os treinadores no caminho!',
  '13,17': 'MONTE GÉLIDO — só para treinadores experientes. A Líder Gélida espera no topo.',
  '12,53': 'VILA RAIZ — onde toda jornada começa.',
};

export interface Building {
  kind: 'centro' | 'loja' | 'casa';
  x: number;
  y: number;
  w: number;
  h: number;
  door: [number, number];
  label?: string;
}
export const BUILDINGS: Building[] = [
  { kind: 'centro', x: 3, y: 51, w: 5, h: 4, door: [5, 54], label: 'CURA' },
  { kind: 'loja', x: 20, y: 51, w: 5, h: 4, door: [22, 54], label: 'LOJA' },
  { kind: 'casa', x: 4, y: 57, w: 4, h: 3, door: [5, 59] },
  { kind: 'casa', x: 21, y: 57, w: 4, h: 3, door: [22, 59] },
];

export const START_POS = { x: 14, y: 57, dir: 'down' as Dir };
export const CENTRO_POS = { x: 5, y: 55, dir: 'down' as Dir };

/* ---------- Personagens ---------- */

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: Dir;
  colors: [string, string, string]; // cabelo, roupa, calça
  talk: string[];
  trainer?: { team: [number, number][]; prize: number; after: string; badge?: string };
}

export const NPCS: Npc[] = [
  { id: 'moca', name: 'Moça', x: 10, y: 54, dir: 'down', colors: ['#c0603a', '#e870a0', '#405080'], talk: ['Na grama alta aparecem MonKePos selvagens!', 'Enfraqueça um deles e jogue uma MonBola para capturar.'] },
  { id: 'velho', name: 'Senhor', x: 18, y: 59, dir: 'left', colors: ['#d8d8d8', '#6a7a50', '#504030'], talk: ['Só os seus MonKePos ficam guardados na sua conta.', 'Dinheiro e itens ficam nesta sala. Toda sala nova começa com o mesmo kit.'] },
  { id: 'guia', name: 'Guia', x: 16, y: 18, dir: 'down', colors: ['#302820', '#3a8a8a', '#303848'], talk: ['Lá em cima é o Monte Gélido.', 'Os MonKePos de gelo são fortes. Leve Poções!'] },
  {
    id: 't1', name: 'Jovem Leo', x: 12, y: 42, dir: 'left', colors: ['#402818', '#3870d0', '#c0a060'],
    talk: ['Ei! Treinadores que se olham têm que batalhar!'],
    trainer: { team: [[12, 3], [16, 3]], prize: 16, after: 'Puxa, você é bom! Vou treinar mais na grama.' },
  },
  {
    id: 't2', name: 'Campista Bia', x: 17, y: 23, dir: 'left', colors: ['#e8c050', '#50a050', '#705030'],
    talk: ['Acampei aqui só para achar alguém para batalhar!'],
    trainer: { team: [[13, 8], [16, 8]], prize: 20, after: 'Minha barraca é mais forte que meus MonKePos...' },
  },
  {
    id: 't3', name: 'Garoto Davi', x: 9, y: 26, dir: 'right', colors: ['#202020', '#d05030', '#304060'],
    talk: ['Meus MonKePos de metal são duros na queda!'],
    trainer: { team: [[20, 8], [25, 9]], prize: 16, after: 'Metal também amassa, pelo jeito.' },
  },
  {
    id: 't4', name: 'Alpinista Rui', x: 11, y: 10, dir: 'right', colors: ['#805030', '#c04040', '#404040'],
    talk: ['Subir montanha fortalece! Mostre o que sabe!'],
    trainer: { team: [[17, 15], [23, 16], [20, 16]], prize: 32, after: 'O topo é logo ali. A Líder é muito forte.' },
  },
  {
    id: 'lider', name: 'Líder Gélida', x: 15, y: 2, dir: 'down', colors: ['#a0d8f0', '#3060a0', '#e0f0ff'],
    talk: ['Chegou ao topo do Monte Gélido.', 'Sou a Líder Gélida. Vamos ver se seu time aguenta o frio!'],
    trainer: { team: [[18, 22], [24, 23], [21, 24]], prize: 100, after: 'Você derreteu meu gelo! Leve a Insígnia do Gelo.', badge: 'Insígnia do Gelo' },
  },
];

/* ---------- Áreas de encontro (grama alta) ---------- */

export type Zone = 'rota1' | 'rota2' | 'monte';
export const ENCOUNTERS: Record<Zone, { sp: number; min: number; max: number; peso: number }[]> = {
  rota1: [
    { sp: 12, min: 2, max: 5, peso: 40 },
    { sp: 16, min: 2, max: 5, peso: 30 },
    { sp: 10, min: 3, max: 5, peso: 30 },
  ],
  rota2: [
    { sp: 13, min: 6, max: 10, peso: 25 },
    { sp: 15, min: 7, max: 11, peso: 15 },
    { sp: 20, min: 7, max: 10, peso: 20 },
    { sp: 25, min: 8, max: 12, peso: 10 },
    { sp: 10, min: 7, max: 10, peso: 20 },
    { sp: 16, min: 7, max: 10, peso: 10 },
  ],
  monte: [
    { sp: 17, min: 13, max: 18, peso: 35 },
    { sp: 23, min: 14, max: 19, peso: 30 },
    { sp: 20, min: 15, max: 20, peso: 20 },
    { sp: 10, min: 15, max: 18, peso: 15 },
  ],
};

export function zoneAt(x: number, y: number): Zone | null {
  const ch = grid[y]?.[x];
  if (ch === ';') return 'monte';
  if (ch === ',') return y >= 34 ? 'rota1' : 'rota2';
  return null;
}

const SOLID = new Set(['#', '^', '~', 'R', 'f', 'S']);
export function solidTile(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  if (SOLID.has(grid[y][x])) return true;
  return BUILDINGS.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
}
export const buildingDoorAt = (x: number, y: number): Building | undefined => BUILDINGS.find((b) => b.door[0] === x && b.door[1] === y);

/* ---------- Desenho dos tiles (pixel art feita em código) ---------- */

const hash = (x: number, y: number): number => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

type C2D = CanvasRenderingContext2D;
const px = (c: C2D, color: string, x: number, y: number, w = 2, h = 2): void => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};

function ground(c: C2D, x: number, y: number, snow: boolean): void {
  const ox = x * T;
  const oy = y * T;
  px(c, snow ? '#eef4f8' : '#7cc45c', ox, oy, T, T);
  for (let i = 0; i < 6; i++) {
    const r = hash(x * 7 + i, y * 13 + i);
    const r2 = hash(x * 3 + i * 5, y * 11 + i);
    px(c, snow ? '#dce8f0' : r > 0.5 ? '#6cb44e' : '#94d474', ox + Math.floor(r * 15) * 2, oy + Math.floor(r2 * 15) * 2, 2, 2);
  }
}

function drawTile(c: C2D, ch: string, x: number, y: number): void {
  const ox = x * T;
  const oy = y * T;
  const snowZone = y <= 17;
  switch (ch) {
    case '.':
      ground(c, x, y, false);
      break;
    case '*':
      ground(c, x, y, true);
      break;
    case '=':
    case '-': {
      const snow = ch === '-';
      px(c, snow ? '#d4e0ea' : '#e2cc94', ox, oy, T, T);
      for (let i = 0; i < 5; i++) px(c, snow ? '#c4d2de' : '#d0b67a', ox + Math.floor(hash(x + i, y) * 15) * 2, oy + Math.floor(hash(y + i, x) * 15) * 2, 4, 2);
      break;
    }
    case ',':
    case ';': {
      const snow = ch === ';';
      ground(c, x, y, snow);
      const dark = snow ? '#b4d6e6' : '#2e8a3a';
      const mid = snow ? '#8fbfd6' : '#46a848';
      const light = snow ? '#ffffff' : '#78d070';
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const bx = ox + col * 16;
          const by = oy + row * 16;
          px(c, dark, bx + 2, by + 6, 12, 10);
          px(c, mid, bx + 2, by + 4, 2, 8);
          px(c, mid, bx + 6, by + 2, 2, 10);
          px(c, mid, bx + 10, by + 4, 2, 8);
          px(c, light, bx + 6, by + 2, 2, 2);
          px(c, light, bx + 2, by + 4, 2, 2);
          px(c, light, bx + 10, by + 4, 2, 2);
        }
      }
      break;
    }
    case '#':
    case '^': {
      const snow = ch === '^';
      ground(c, x, y, snow || snowZone);
      if (snow) {
        px(c, '#6a4a30', ox + 14, oy + 24, 4, 8);
        const layers: [number, number, number][] = [[4, 18, 24], [7, 11, 18], [10, 4, 12]];
        for (const [ix, iy, w] of layers) {
          px(c, '#1e5a4a', ox + ix, oy + iy, w, 8);
          px(c, '#f4fbff', ox + ix + 2, oy + iy, w - 4, 2);
        }
      } else {
        px(c, '#5a3a22', ox + 13, oy + 22, 6, 10);
        px(c, '#1f6a32', ox + 2, oy + 4, 28, 20);
        px(c, '#1f6a32', ox + 6, oy + 1, 20, 26);
        px(c, '#2f8a44', ox + 6, oy + 4, 18, 14);
        px(c, '#4aa858', ox + 8, oy + 6, 8, 6);
        px(c, '#16502a', ox + 4, oy + 20, 24, 4);
      }
      break;
    }
    case '~': {
      px(c, '#3a82d8', ox, oy, T, T);
      px(c, '#2a6ab8', ox, oy + 28, T, 4);
      break;
    }
    case 'F': {
      ground(c, x, y, false);
      const colors = ['#f05a5a', '#f8d040', '#f0f0f0'];
      for (let i = 0; i < 3; i++) {
        const fx = ox + 4 + Math.floor(hash(x + i, y) * 10) * 2;
        const fy = oy + 4 + Math.floor(hash(y + i, x + 3) * 10) * 2;
        px(c, colors[(i + x) % 3], fx, fy, 4, 4);
        px(c, '#f8f070', fx + 1, fy + 1, 2, 2);
      }
      break;
    }
    case 'f': {
      ground(c, x, y, false);
      px(c, '#b08050', ox, oy + 10, T, 4);
      px(c, '#b08050', ox, oy + 20, T, 4);
      px(c, '#906038', ox + 4, oy + 6, 4, 22);
      px(c, '#906038', ox + 24, oy + 6, 4, 22);
      break;
    }
    case 'R': {
      ground(c, x, y, snowZone);
      px(c, '#6a6a72', ox + 4, oy + 8, 24, 20);
      px(c, '#8a8a94', ox + 6, oy + 6, 18, 16);
      px(c, '#b0b0ba', ox + 8, oy + 8, 8, 6);
      px(c, '#505058', ox + 4, oy + 26, 24, 2);
      if (snowZone) px(c, '#f4fbff', ox + 8, oy + 6, 14, 4);
      break;
    }
    case 'S': {
      ground(c, x, y, snowZone);
      px(c, '#7a5030', ox + 14, oy + 18, 4, 12);
      px(c, '#c08a50', ox + 4, oy + 6, 24, 14);
      px(c, '#8a5a30', ox + 4, oy + 18, 24, 2);
      px(c, '#704020', ox + 8, oy + 10, 16, 2);
      px(c, '#704020', ox + 8, oy + 14, 12, 2);
      break;
    }
  }
}

function drawBuilding(c: C2D, b: Building): void {
  const ox = b.x * T;
  const oy = b.y * T;
  const w = b.w * T;
  const h = b.h * T;
  const roof = b.kind === 'centro' ? '#e05050' : b.kind === 'loja' ? '#4a7ad8' : '#b0603a';
  const roofDark = b.kind === 'centro' ? '#a83838' : b.kind === 'loja' ? '#30569c' : '#7a3e24';
  const roofH = Math.floor(h * 0.45);
  // Paredes
  px(c, '#f2e8d4', ox, oy + roofH, w, h - roofH);
  px(c, '#d4c4a4', ox, oy + h - 6, w, 6);
  // Telhado
  px(c, roofDark, ox - 4, oy + roofH - 6, w + 8, 8);
  px(c, roof, ox - 2, oy, w + 4, roofH - 4);
  for (let i = 0; i < w; i += 8) px(c, roofDark, ox + i, oy + 4, 2, roofH - 10);
  // Janelas
  const wy = oy + roofH + 8;
  for (let i = 0; i < b.w; i++) {
    if (b.x + i === b.door[0]) continue;
    px(c, '#5a88c0', ox + i * T + 8, wy, 16, 12);
    px(c, '#a8d0f0', ox + i * T + 10, wy + 2, 6, 4);
  }
  // Porta
  const dx = b.door[0] * T;
  px(c, '#6a4428', dx + 6, oy + h - 26, 20, 26);
  px(c, '#8a5a34', dx + 8, oy + h - 24, 16, 24);
  px(c, '#f8d040', dx + 20, oy + h - 14, 2, 2);
  // Placa
  if (b.label) {
    px(c, '#ffffff', ox + w / 2 - 28, oy + 8, 56, 16);
    c.font = `bold 12px "Trebuchet MS", sans-serif`;
    c.textAlign = 'center';
    c.fillStyle = roofDark;
    c.fillText(b.label, ox + w / 2, oy + 20);
  }
}

/** Mapa inteiro pré-desenhado (só a água é animada por cima). */
export const mapCanvas = document.createElement('canvas');
mapCanvas.width = MAP_W * T;
mapCanvas.height = MAP_H * T;
{
  const c = mapCanvas.getContext('2d')!;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) drawTile(c, grid[y][x], x, y);
  for (const b of BUILDINGS) drawBuilding(c, b);
}

export function drawWaterAnim(camX: number, camY: number, t: number): void {
  const x0 = Math.max(0, Math.floor(camX / T));
  const y0 = Math.max(0, Math.floor(camY / T));
  for (let y = y0; y < Math.min(MAP_H, y0 + 12); y++) {
    for (let x = x0; x < Math.min(MAP_W, x0 + 17); x++) {
      if (grid[y][x] !== '~') continue;
      const off = Math.floor(((t / 120 + x * 3 + y * 5) % 16)) * 2;
      ctx.fillStyle = '#7ab4f4';
      ctx.fillRect(x * T - camX + ((off + 4) % 28), y * T - camY + 8, 8, 2);
      ctx.fillRect(x * T - camX + ((off + 18) % 28), y * T - camY + 20, 8, 2);
    }
  }
}

/** Personagem 16x16 em dobro (cabelo, roupa e calça mudam de cor). */
export function drawCharacter(sx: number, sy: number, dir: Dir, frame: number, colors: [string, string, string], tag?: string): void {
  const [hair, shirt, pants] = colors;
  const skin = '#f4c8a0';
  const p = (color: string, x: number, y: number, w: number, h: number): void => {
    ctx.fillStyle = color;
    ctx.fillRect(sx + x, sy + y, w, h);
  };
  p('rgba(0,0,0,.18)', 6, 28, 20, 4); // sombra
  const step = frame % 2 === 1;
  // Pernas
  if (dir === 'left' || dir === 'right') {
    p(pants, 11, 22, 4, step ? 8 : 6);
    p(pants, 17, 22, 4, step ? 6 : 8);
  } else {
    p(pants, 10, 22, 5, step ? 8 : 6);
    p(pants, 17, 22, 5, step ? 6 : 8);
  }
  p('#303030', 10, 28, 5, 2);
  p('#303030', 17, 28, 5, 2);
  // Corpo
  p(shirt, 8, 13, 16, 10);
  p('rgba(0,0,0,.15)', 8, 21, 16, 2);
  // Braços
  if (dir === 'left' || dir === 'right') p(skin, dir === 'left' ? 18 : 10, 15 + (step ? 1 : 0), 4, 6);
  else {
    p(skin, 5, 14 + (step ? 1 : 0), 3, 7);
    p(skin, 24, 14 + (step ? 0 : 1), 3, 7);
  }
  // Cabeça
  p(skin, 9, 3, 14, 11);
  p(hair, 8, 1, 16, 5);
  if (dir === 'up') p(hair, 8, 1, 16, 12);
  else if (dir === 'down') {
    p(hair, 8, 5, 2, 5);
    p(hair, 22, 5, 2, 5);
    p('#202020', 12, 8, 2, 3);
    p('#202020', 18, 8, 2, 3);
  } else {
    const back = dir === 'left' ? 16 : 8;
    p(hair, back, 1, 8, 10);
    p('#202020', dir === 'left' ? 11 : 19, 8, 2, 3);
  }
  if (tag) text(tag, sx + 16, sy - 4, { size: 18, color: '#e03030', align: 'center', shadow: '#ffffff' });
}
