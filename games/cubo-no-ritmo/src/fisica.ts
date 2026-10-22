// Física do Cubo no Ritmo: passos fixos de 1/240 s (determinístico: a mesma entrada dá sempre o mesmo resultado).
// Unidade = 1 bloco. y cresce para cima; gravidade 1 = puxa para baixo, -1 = puxa para cima.
// Modos: cubo, nave, bola, ovni, onda, robô e aranha, trocados por portais.

export const PASSO = 1 / 240;

export type Modo = 'cubo' | 'nave' | 'bola' | 'ovni' | 'onda' | 'robo' | 'aranha';
export type Tipo =
  | 'bloco'
  | 'meio' // meio bloco (laje)
  | 'espinho'
  | 'espinhoMini'
  | 'serra'
  | 'orbeAmarela'
  | 'orbeRosa'
  | 'orbeAzul'
  | 'orbeVerde'
  | 'orbePreta'
  | 'padAmarelo'
  | 'padRosa'
  | 'padAzul'
  | 'portalModo'
  | 'portalGravidade'
  | 'portalVelocidade'
  | 'portalTamanho'
  | 'moeda'
  | 'checkpoint';

export interface Objeto {
  t: Tipo;
  x: number;
  y: number;
  r?: number; // rotação em graus (espinho: 0 = para cima, 180 = para baixo, 90/270 = de lado)
  modo?: Modo; // portalModo
  grav?: 1 | -1; // portalGravidade
  vel?: number; // portalVelocidade: 0.5, 1, 2, 3 ou 4
  mini?: boolean; // portalTamanho
  base?: number; // portalModo: chão do corredor (modos que voam)
  altura?: number; // portalModo: altura do corredor
  id?: number;
}

export interface Fase {
  nome: string;
  dificuldade: string;
  bpm: number;
  musica: number; // índice da trilha
  comprimento: number; // x do fim
  objetos: Objeto[];
  cores: { x: number; fundo: string; chao: string }[]; // trocas de cor ao longo da fase
}

/** Blocos por segundo em cada velocidade (como os portais de 0,5× a 4×). */
export const VELOCIDADES: Record<string, number> = { '0.5': 8.4, '1': 10.4, '2': 12.96, '3': 15.6, '4': 19.2 };
const MODOS_VOO: Modo[] = ['nave', 'bola', 'ovni', 'onda', 'aranha'];

const G = 92; // gravidade do cubo (blocos/s²)
const PULO = 19.8; // pulo do cubo: ~2,1 blocos de altura, ~0,43 s no ar
const VMAX = 26;

export interface Jogador {
  x: number;
  y: number; // base do quadrado do jogador
  vy: number;
  modo: Modo;
  grav: 1 | -1;
  mini: boolean;
  vel: number; // blocos/s
  noChao: boolean;
  piso: number; // chão atual (corredor ou 0)
  teto: number; // teto atual (Infinity sem corredor)
  segurouAntes: boolean;
  bufferClique: number; // segundos desde o último clique (para orbes)
  roboImpulso: number; // tempo de impulso restante do robô
  usados: Set<number>; // orbes e pads já usados
  moedas: Set<number>;
  morto: boolean;
  venceu: boolean;
  rot: number; // rotação visual (graus)
  t: number;
  ultimoCheckpoint: number | null;
}

export interface Evento {
  tipo: 'pulo' | 'orbe' | 'pad' | 'portal' | 'moeda' | 'morte' | 'fim' | 'checkpoint';
  obj?: Objeto;
}

export function novoJogador(): Jogador {
  return {
    x: 0,
    y: 0,
    vy: 0,
    modo: 'cubo',
    grav: 1,
    mini: false,
    vel: VELOCIDADES['1'],
    noChao: true,
    piso: 0,
    teto: Infinity,
    segurouAntes: false,
    bufferClique: 9,
    roboImpulso: 0,
    usados: new Set(),
    moedas: new Set(),
    morto: false,
    venceu: false,
    rot: 0,
    t: 0,
    ultimoCheckpoint: null,
  };
}

export const tamanho = (j: Jogador): number => (j.mini ? 0.6 : 1) * (j.modo === 'onda' ? 0.6 : 1);

/** Grade de objetos por coluna (x inteiro): busca rápida dos vizinhos a cada passo. */
export class Indice {
  private colunas = new Map<number, Objeto[]>();
  constructor(readonly fase: Fase) {
    fase.objetos.forEach((o, i) => {
      o.id = i;
      const larg = o.t.startsWith('portal') ? 1 : 1;
      for (let c = Math.floor(o.x) - 1; c <= Math.floor(o.x + larg) + 1; c++) {
        if (!this.colunas.has(c)) this.colunas.set(c, []);
        this.colunas.get(c)!.push(o);
      }
    });
  }
  perto(x: number): Objeto[] {
    const out = new Set<Objeto>();
    for (let c = Math.floor(x) - 1; c <= Math.floor(x) + 2; c++) for (const o of this.colunas.get(c) ?? []) out.add(o);
    return [...out];
  }
}

/* ---------- Hitboxes ---------- */

interface Caixa {
  l: number;
  r: number;
  b: number;
  t: number;
}

const caixaJogador = (j: Jogador): Caixa => {
  const s = tamanho(j);
  return { l: j.x, r: j.x + s, b: j.y, t: j.y + s };
};

const encolher = (c: Caixa, m: number): Caixa => ({ l: c.l + m, r: c.r - m, b: c.b + m, t: c.t - m });
const cruza = (a: Caixa, b: Caixa): boolean => a.l < b.r && a.r > b.l && a.b < b.t && a.t > b.b;

/** Área perigosa de um espinho (bem menor que o desenho, como nos jogos do gênero). */
function caixaEspinho(o: Objeto): Caixa {
  const mini = o.t === 'espinhoMini';
  const h = mini ? 0.25 : 0.45;
  const r = ((o.r ?? 0) % 360 + 360) % 360;
  if (r === 180) return { l: o.x + 0.38, r: o.x + 0.62, b: o.y + 1 - h, t: o.y + 1 };
  if (r === 90) return { l: o.x + 1 - h, r: o.x + 1, b: o.y + 0.38, t: o.y + 0.62 };
  if (r === 270) return { l: o.x, r: o.x + h, b: o.y + 0.38, t: o.y + 0.62 };
  return { l: o.x + 0.38, r: o.x + 0.62, b: o.y, t: o.y + h };
}

const caixaBloco = (o: Objeto): Caixa => (o.t === 'meio' ? { l: o.x, r: o.x + 1, b: o.y + 0.5, t: o.y + 1 } : { l: o.x, r: o.x + 1, b: o.y, t: o.y + 1 });

/* ---------- Passo ---------- */

/**
 * Avança 1/240 s. "segurando" = botão/tela apertados agora. Devolve os eventos do passo.
 * O clique (borda de subida) é guardado por 0,1 s para orbes: dá para clicar um tiquinho antes.
 */
export function passo(j: Jogador, segurando: boolean, idx: Indice, eventos: Evento[] = []): Evento[] {
  if (j.morto || j.venceu) return eventos;
  const dt = PASSO;
  const clicou = segurando && !j.segurouAntes;
  j.segurouAntes = segurando;
  j.bufferClique = clicou ? 0 : j.bufferClique + dt;
  j.t += dt;
  const s = tamanho(j);
  const g = j.grav;
  const fatorMini = j.mini ? 0.8 : 1;

  // Pulos que dependem do chão (o "chão" é o lado para onde a gravidade puxa).
  const pular = (v: number): void => {
    j.vy = v * g;
    j.noChao = false;
    eventos.push({ tipo: 'pulo' });
  };

  switch (j.modo) {
    case 'cubo':
      if (j.noChao && segurando) pular(PULO * fatorMini);
      j.vy -= G * g * dt;
      break;
    case 'robo':
      if (j.noChao && clicou) {
        pular(11 * fatorMini);
        j.roboImpulso = 0.24;
      }
      // Segurando, o robô continua subindo por um tempinho: pulo maior.
      if (segurando && j.roboImpulso > 0) {
        j.vy = 11 * fatorMini * g;
        j.roboImpulso -= dt;
      } else {
        j.roboImpulso = 0;
        j.vy -= G * g * dt;
      }
      break;
    case 'nave': {
      const a = segurando ? 52 : -44;
      j.vy += a * g * dt;
      const lim = j.mini ? 12 : 10;
      j.vy = Math.max(-lim, Math.min(lim, j.vy));
      break;
    }
    case 'bola':
      if (j.noChao && clicou) {
        j.grav = (j.grav * -1) as 1 | -1;
        j.vy = 2 * j.grav * -1; // empurrãozinho para descolar do chão
        j.noChao = false;
        eventos.push({ tipo: 'pulo' });
      }
      j.vy -= G * 0.85 * j.grav * dt;
      break;
    case 'ovni':
      if (clicou) {
        j.vy = 12.5 * fatorMini * g;
        eventos.push({ tipo: 'pulo' });
      }
      j.vy -= 58 * g * dt;
      break;
    case 'onda':
      j.vy = (segurando ? 1 : -1) * g * j.vel * (j.mini ? 2 : 1);
      break;
    case 'aranha':
      if (j.noChao && clicou) teleporteAranha(j, idx, eventos);
      j.vy -= G * j.grav * dt;
      break;
  }
  j.vy = Math.max(-VMAX, Math.min(VMAX, j.vy));

  const antes = caixaJogador(j);
  j.x += j.vel * dt;
  j.y += j.vy * dt;
  j.noChao = false;

  // Chão e teto do corredor (ou o chão da fase).
  // Encostar no chão/teto não mata: com a gravidade para aquele lado, é onde se pousa; do outro lado, só desliza.
  if (j.y <= j.piso) {
    j.y = j.piso;
    j.vy = Math.max(0, j.vy);
    if (j.grav === 1) j.noChao = true;
  }
  if (j.y + s >= j.teto) {
    j.y = j.teto - s;
    j.vy = Math.min(0, j.vy);
    if (j.grav === -1) j.noChao = true;
  }
  if (j.y < -6 || j.y > 60) return morrer(j, eventos);

  // Objetos por perto.
  const eu = caixaJogador(j);
  for (const o of idx.perto(j.x)) {
    switch (o.t) {
      case 'bloco':
      case 'meio': {
        const c = caixaBloco(o);
        if (!cruza(encolher(eu, 0.02), c)) break;
        if (j.modo === 'onda') return morrer(j, eventos);
        // Veio de cima/baixo (no passo anterior não cruzava na vertical): pousa. De lado: morre.
        const vindoDeCima = antes.b >= c.t - 0.3 && j.vy * 1 <= 0.001;
        const vindoDeBaixo = antes.t <= c.b + 0.3 && j.vy >= -0.001;
        const podePousarEmCima = g === 1 || MODOS_VOO.includes(j.modo);
        const podePousarEmBaixo = g === -1 || MODOS_VOO.includes(j.modo);
        if (vindoDeCima && podePousarEmCima) {
          j.y = c.t;
          j.vy = 0;
          if (g === 1) j.noChao = true;
        } else if (vindoDeBaixo && podePousarEmBaixo) {
          j.y = c.b - s;
          j.vy = 0;
          if (g === -1) j.noChao = true;
        } else return morrer(j, eventos);
        break;
      }
      case 'espinho':
      case 'espinhoMini':
        if (cruza(encolher(eu, 0.08 * s), caixaEspinho(o))) return morrer(j, eventos);
        break;
      case 'serra': {
        const cx = o.x + 0.5;
        const cy = o.y + 0.5;
        const px = Math.max(eu.l, Math.min(cx, eu.r));
        const py = Math.max(eu.b, Math.min(cy, eu.t));
        if (Math.hypot(px - cx, py - cy) < 0.42) return morrer(j, eventos);
        break;
      }
      case 'orbeAmarela':
      case 'orbeRosa':
      case 'orbeAzul':
      case 'orbeVerde':
      case 'orbePreta': {
        if (j.usados.has(o.id!) || j.bufferClique > 0.1 || !segurando) break;
        const cx = o.x + 0.5;
        const cy = o.y + 0.5;
        if (Math.abs(cx - (eu.l + eu.r) / 2) > 0.5 + s / 2 || Math.abs(cy - (eu.b + eu.t) / 2) > 0.5 + s / 2) break;
        j.usados.add(o.id!);
        j.bufferClique = 9;
        usarOrbe(j, o);
        eventos.push({ tipo: 'orbe', obj: o });
        break;
      }
      case 'padAmarelo':
      case 'padRosa':
      case 'padAzul': {
        if (j.usados.has(o.id!)) break;
        const c = { l: o.x + 0.1, r: o.x + 0.9, b: o.y, t: o.y + 0.25 };
        if (!cruza(eu, c)) break;
        j.usados.add(o.id!);
        if (o.t === 'padAzul') {
          j.grav = (j.grav * -1) as 1 | -1;
          j.vy = 12 * j.grav * -1;
        } else j.vy = (o.t === 'padAmarelo' ? 27 : 18) * fatorMini * j.grav;
        j.noChao = false;
        eventos.push({ tipo: 'pad', obj: o });
        break;
      }
      case 'portalModo':
      case 'portalGravidade':
      case 'portalVelocidade':
      case 'portalTamanho': {
        if (j.usados.has(o.id!)) break;
        if (eu.r < o.x + 0.3 || eu.l > o.x + 1) break;
        if (eu.t < o.y || eu.b > o.y + 3) break;
        j.usados.add(o.id!);
        aplicarPortal(j, o);
        eventos.push({ tipo: 'portal', obj: o });
        break;
      }
      case 'moeda':
        if (!j.moedas.has(o.id!) && cruza(eu, { l: o.x, r: o.x + 1, b: o.y, t: o.y + 1 })) {
          j.moedas.add(o.id!);
          eventos.push({ tipo: 'moeda', obj: o });
        }
        break;
      case 'checkpoint':
        break;
    }
  }

  // Rotação visual.
  if (j.modo === 'cubo') {
    if (!j.noChao) j.rot += 400 * g * dt * (j.mini ? 1.3 : 1);
    else j.rot = Math.round(j.rot / 90) * 90;
  } else if (j.modo === 'bola') j.rot += j.vel * 40 * g * dt;
  else if (j.modo === 'nave' || j.modo === 'onda') j.rot = -Math.atan2(j.vy, j.vel) * (180 / Math.PI);
  else j.rot = 0;

  if (j.x >= idx.fase.comprimento) {
    j.venceu = true;
    eventos.push({ tipo: 'fim' });
  }
  return eventos;
}

function morrer(j: Jogador, eventos: Evento[]): Evento[] {
  j.morto = true;
  eventos.push({ tipo: 'morte' });
  return eventos;
}

function usarOrbe(j: Jogador, o: Objeto): void {
  const m = j.mini ? 0.8 : 1;
  switch (o.t) {
    case 'orbeAmarela':
      j.vy = (j.modo === 'nave' || j.modo === 'onda' ? 10 : 19.8) * m * j.grav;
      break;
    case 'orbeRosa':
      j.vy = 14 * m * j.grav;
      break;
    case 'orbeAzul':
      j.grav = (j.grav * -1) as 1 | -1;
      j.vy = -8 * j.grav;
      break;
    case 'orbeVerde':
      j.grav = (j.grav * -1) as 1 | -1;
      j.vy = 19.8 * m * j.grav;
      break;
    case 'orbePreta':
      j.vy = -24 * j.grav;
      break;
  }
  j.noChao = false;
}

function aplicarPortal(j: Jogador, o: Objeto): void {
  if (o.t === 'portalModo' && o.modo) {
    j.modo = o.modo;
    // Modos que voam sempre têm corredor; cubo e robô só quando a fase pede (para andar no teto).
    if (MODOS_VOO.includes(o.modo) || o.altura) {
      j.piso = o.base ?? 0;
      j.teto = j.piso + (o.altura ?? 10);
      j.y = Math.max(j.piso, Math.min(j.teto - tamanho(j), j.y));
    } else {
      j.piso = 0;
      j.teto = Infinity;
    }
    if (o.modo === 'nave' || o.modo === 'ovni') j.vy *= 0.5;
  } else if (o.t === 'portalGravidade' && o.grav) {
    if (j.grav !== o.grav) j.vy *= 0.5;
    j.grav = o.grav;
  } else if (o.t === 'portalVelocidade' && o.vel) j.vel = VELOCIDADES[String(o.vel)] ?? j.vel;
  else if (o.t === 'portalTamanho') j.mini = Boolean(o.mini);
}

/** Aranha: some e aparece grudada na superfície do lado oposto. */
function teleporteAranha(j: Jogador, idx: Indice, eventos: Evento[]): void {
  const s = tamanho(j);
  const meio = j.x + s / 2;
  const subir = j.grav === 1;
  let alvo = subir ? j.teto : j.piso;
  for (const o of idx.perto(j.x)) {
    if (o.t !== 'bloco' && o.t !== 'meio') continue;
    const c = caixaBloco(o);
    if (meio < c.l || meio > c.r) continue;
    if (subir && c.b >= j.y + s && c.b < alvo) alvo = c.b;
    if (!subir && c.t <= j.y && c.t > alvo) alvo = c.t;
  }
  if (!Number.isFinite(alvo)) return;
  j.y = subir ? alvo - s : alvo;
  j.grav = (j.grav * -1) as 1 | -1;
  j.vy = 0;
  j.noChao = true;
  eventos.push({ tipo: 'pulo' });
}

/** Cópia para o modo prática (checkpoint) e para o robô que testa as fases. */
export function copiar(j: Jogador): Jogador {
  return { ...j, usados: new Set(j.usados), moedas: new Set(j.moedas) };
}
