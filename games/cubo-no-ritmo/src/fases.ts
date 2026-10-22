// Fases do Cubo no Ritmo, montadas por um gerador com padrões de cada modo (espaçados para dar para passar)
// encaixados na batida da música. A semente é fixa: a fase é sempre a mesma (recorde vale para todo mundo).
// Um robô que joga sozinho confere nos testes que toda fase tem como terminar.

import { type Fase, type Modo, type Objeto, VELOCIDADES } from './fisica';

export interface Secao {
  modo: Modo;
  vel: 0.5 | 1 | 2 | 3 | 4;
  blocos: number; // comprimento da seção
  densidade: number; // 0 (calmo) a 1 (apertado)
  mini?: boolean;
  fundo: string;
  chao: string;
  moeda?: boolean; // esconde uma moeda nesta seção
}

interface Especificacao {
  nome: string;
  dificuldade: string;
  bpm: number;
  musica: number;
  semente: number;
  secoes: Secao[];
}

function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Corredor (chão e altura) de cada modo que voa. */
const CORREDOR: Partial<Record<Modo, [number, number]>> = { nave: [0, 10], ovni: [0, 10], bola: [0, 7], onda: [0, 9], aranha: [0, 6] };

export function montar(esp: Especificacao): Fase {
  const rnd = aleatorio(esp.semente);
  const objs: Objeto[] = [];
  const cores: Fase['cores'] = [];
  const add = (o: Objeto): void => void objs.push(o);
  const esp1 = (x: number, y = 0, r = 0): void => add({ t: 'espinho', x, y, r });
  const bloco = (x: number, y: number, w = 1, h = 1): void => {
    for (let i = 0; i < w; i++) for (let k = 0; k < h; k++) add({ t: 'bloco', x: x + i, y: y + k });
  };
  const escolher = <T,>(l: T[]): T => l[Math.floor(rnd() * l.length)];

  let x = 0;
  let moedasPostas = 0;
  let anterior: Secao | null = null;
  for (const s of esp.secoes) {
    const v = VELOCIDADES[String(s.vel)];
    const k = v / VELOCIDADES['1']; // espaço maior em velocidade maior
    const beat = (v * 60) / esp.bpm; // blocos por batida
    const naBatida = (p: number): number => Math.ceil(p / (beat / 2)) * (beat / 2);
    cores.push({ x, fundo: s.fundo, chao: s.chao });

    // Portais de entrada da seção.
    if (!anterior || anterior.modo !== s.modo) {
      const corr = CORREDOR[s.modo];
      add({ t: 'portalModo', x: x + 1, y: 0, modo: s.modo, base: corr?.[0], altura: corr?.[1] });
    }
    if (!anterior || anterior.vel !== s.vel) add({ t: 'portalVelocidade', x: x + 2, y: 0, vel: s.vel });
    if ((anterior?.mini ?? false) !== Boolean(s.mini)) add({ t: 'portalTamanho', x: x + 3, y: 0, mini: Boolean(s.mini) });
    const fim = x + s.blocos;
    let p = x + 6 * k;
    const moedaEm = s.moeda ? x + s.blocos * (0.35 + rnd() * 0.3) : Infinity;
    let ladoBola: 'chao' | 'teto' = 'chao';

    while (p < fim - 10 * k) {
      p = naBatida(p);
      const d = s.densidade;
      const querMoeda = p >= moedaEm && moedasPostas < 3;
      let largura = 0;
      switch (s.modo) {
        case 'cubo': {
          const opcoes = ['espinho', 'espinho', 'duplo', 'degrau', 'pad', 'orbe', 'meio'];
          if (d > 0.5) opcoes.push('triplo', 'duplo', 'escada');
          const pad = querMoeda ? 'pad' : escolher(opcoes);
          if (pad === 'espinho') {
            esp1(p + 2);
            largura = 6.5;
          } else if (pad === 'duplo') {
            esp1(p + 2);
            esp1(p + 3);
            largura = 7.5;
          } else if (pad === 'triplo') {
            esp1(p + 2);
            esp1(p + 3);
            esp1(p + 4);
            largura = 8.5;
          } else if (pad === 'degrau') {
            // Plataforma de 1 bloco com espinho no chão depois dela.
            bloco(p + 2, 0, 4, 1);
            esp1(p + 7);
            largura = 11;
          } else if (pad === 'escada') {
            bloco(p + 2, 0, 3, 1);
            bloco(p + 6, 0, 3, 2);
            esp1(p + 10);
            largura = 14;
          } else if (pad === 'pad') {
            // Pad amarelo lança por cima de um fosso de espinhos (com a moeda no alto do salto).
            add({ t: 'padAmarelo', x: p + 2, y: 0 });
            for (let i = 4; i <= 7; i++) esp1(p + i);
            if (querMoeda) {
              add({ t: 'moeda', x: p + 5, y: 3.2 });
              moedasPostas++;
            }
            largura = 11;
          } else if (pad === 'orbe') {
            // Pula e clica na orbe no ar para atravessar uma fileira longa de espinhos.
            for (let i = 3; i <= 8; i++) esp1(p + i);
            add({ t: 'orbeAmarela', x: p + 4.5, y: 1.6 });
            largura = 12.5;
          } else {
            // Lajes (meio bloco) em degraus.
            add({ t: 'meio', x: p + 2, y: 0 });
            add({ t: 'meio', x: p + 3, y: 0 });
            esp1(p + 4);
            esp1(p + 5);
            add({ t: 'meio', x: p + 6, y: 0 });
            largura = 9;
          }
          break;
        }
        case 'robo': {
          const tipo = escolher(['muro', 'fosso', 'muro']);
          if (tipo === 'muro') {
            // Muro de 3 só em velocidade normal: mais rápido, não dá tempo de ganhar tanta altura.
            const h = d > 0.5 && k < 1.2 ? 3 : 2;
            bloco(p + 3, 0, 1, h);
            esp1(p + 6);
            if (querMoeda) {
              add({ t: 'moeda', x: p + 3, y: h + 0.3 }); // logo acima do muro, no caminho do pulo
              moedasPostas++;
            }
            largura = 11 * k;
          } else {
            for (let i = 2; i <= 5; i++) esp1(p + i);
            largura = 11 * k;
          }
          break;
        }
        case 'nave':
        case 'ovni': {
          // Pilares de baixo e de cima com uma passagem (mais larga no ovni).
          const vao = s.modo === 'ovni' ? 4.5 - d : 4 - d;
          const centro = 2.5 + vao / 2 + rnd() * (10 - 5 - vao);
          const baixo = Math.max(0, Math.floor(centro - vao / 2));
          const cima = Math.min(10, Math.ceil(centro + vao / 2));
          if (baixo > 0) {
            bloco(p + 3, 0, 1, baixo - 1);
            esp1(p + 3, baixo - 1);
          }
          if (cima < 10) {
            bloco(p + 3, cima + 1, 1, 10 - cima - 1);
            esp1(p + 3, cima, 180);
          }
          if (querMoeda) {
            add({ t: 'moeda', x: p + 3, y: Math.floor(centro) });
            moedasPostas++;
          }
          largura = (7.5 - d * 1.5) * k;
          break;
        }
        case 'bola': {
          // Espinhos alternando chão e teto: para passar, a bola tem que estar do outro lado.
          ladoBola = ladoBola === 'chao' ? 'teto' : 'chao';
          if (ladoBola === 'teto') esp1(p + 4, 0);
          else esp1(p + 4, 6, 180);
          if (d > 0.5) {
            if (ladoBola === 'teto') esp1(p + 5, 0);
            else esp1(p + 5, 6, 180);
          }
          if (querMoeda) {
            // No lado seguro, onde a bola tem que estar ao passar pelo espinho.
            add({ t: 'moeda', x: p + 4, y: ladoBola === 'teto' ? 5.5 : 0.5 });
            moedasPostas++;
          }
          largura = (8 - d) * k;
          break;
        }
        case 'onda': {
          // Portões: coluna de baixo e de cima com um vão de 3 blocos (2,5 no apertado).
          const vao = 3 - d * 0.5;
          const base = 1 + Math.floor(rnd() * (9 - vao - 1));
          bloco(p + 3, 0, 1, base);
          bloco(p + 3, Math.ceil(base + vao), 1, 9 - Math.ceil(base + vao));
          if (querMoeda) {
            add({ t: 'moeda', x: p + 3, y: base });
            moedasPostas++;
          }
          largura = (8 - d * 1.5) * k;
          break;
        }
        case 'aranha': {
          // Espinhos alternados no chão e no teto: um toque troca de lado.
          ladoBola = ladoBola === 'chao' ? 'teto' : 'chao';
          if (ladoBola === 'teto') {
            esp1(p + 3, 0);
            esp1(p + 4, 0);
          } else {
            esp1(p + 3, 5, 180);
            esp1(p + 4, 5, 180);
          }
          if (querMoeda) {
            add({ t: 'moeda', x: p + 3.5, y: ladoBola === 'teto' ? 4.5 : 0.5 });
            moedasPostas++;
          }
          largura = 7 * k;
          break;
        }
      }
      p += largura * (k > 1 && s.modo === 'cubo' ? k : 1);
    }
    x = fim;
    anterior = s;
  }
  return { nome: esp.nome, dificuldade: esp.dificuldade, bpm: esp.bpm, musica: esp.musica, comprimento: x + 4, objetos: objs, cores };
}

/* ---------- As fases ---------- */

const ROXO = ['#3b1d6e', '#5b2a9e'];
const AZUL = ['#0f3a6b', '#1d5fa8'];
const VERDE = ['#0f4d3a', '#1d8a5e'];
const ROSA = ['#6b1d4a', '#a82a6f'];
const LARANJA = ['#6b3a0f', '#c2621d'];
const VERMELHO = ['#5c0f14', '#a3202a'];
const CIANO = ['#0b4a52', '#14899a'];

const sec = (modo: Modo, vel: Secao['vel'], blocos: number, densidade: number, cor: string[], extra: Partial<Secao> = {}): Secao => ({ modo, vel, blocos, densidade, fundo: cor[0], chao: cor[1], ...extra });

export const ESPECIFICACOES: Especificacao[] = [
  {
    nome: 'Primeiro Pulso',
    dificuldade: 'Fácil',
    bpm: 120,
    musica: 0,
    semente: 101,
    secoes: [
      sec('cubo', 1, 150, 0.2, AZUL, { moeda: true }),
      sec('nave', 1, 110, 0.15, ROXO, { moeda: true }),
      sec('cubo', 1, 160, 0.35, VERDE),
      sec('nave', 1, 80, 0.25, ROSA),
      sec('cubo', 1, 140, 0.35, AZUL, { moeda: true }),
    ],
  },
  {
    nome: 'Gravidade Zero',
    dificuldade: 'Normal',
    bpm: 128,
    musica: 1,
    semente: 202,
    secoes: [
      sec('cubo', 1, 120, 0.4, CIANO),
      sec('bola', 1, 110, 0.3, ROXO, { moeda: true }),
      sec('ovni', 1, 110, 0.3, ROSA),
      sec('cubo', 2, 140, 0.4, LARANJA, { moeda: true }),
      sec('bola', 2, 110, 0.4, AZUL),
      sec('ovni', 2, 110, 0.4, VERDE, { moeda: true }),
      sec('cubo', 2, 100, 0.5, CIANO),
    ],
  },
  {
    nome: 'Onda Elétrica',
    dificuldade: 'Difícil',
    bpm: 140,
    musica: 2,
    semente: 303,
    secoes: [
      sec('cubo', 1, 100, 0.5, AZUL),
      sec('onda', 1, 130, 0.3, CIANO, { moeda: true }),
      sec('nave', 2, 120, 0.4, ROXO),
      sec('onda', 2, 140, 0.4, VERMELHO, { moeda: true }),
      sec('cubo', 2, 120, 0.6, LARANJA, { mini: true }),
      sec('onda', 3, 150, 0.35, ROSA, { moeda: true }),
      sec('cubo', 2, 90, 0.5, AZUL),
    ],
  },
  {
    nome: 'Fábrica de Robôs',
    dificuldade: 'Insano',
    bpm: 150,
    musica: 3,
    semente: 404,
    secoes: [
      sec('robo', 1, 130, 0.4, LARANJA),
      sec('aranha', 1, 120, 0.4, VERMELHO, { moeda: true }),
      sec('cubo', 2, 120, 0.7, ROXO),
      sec('robo', 2, 130, 0.6, CIANO, { moeda: true }),
      sec('aranha', 2, 130, 0.6, ROSA),
      sec('onda', 3, 140, 0.45, AZUL, { moeda: true }),
      sec('nave', 3, 120, 0.5, VERDE),
      sec('cubo', 3, 110, 0.7, VERMELHO),
    ],
  },
];

export const FASES: Fase[] = ESPECIFICACOES.map(montar);
