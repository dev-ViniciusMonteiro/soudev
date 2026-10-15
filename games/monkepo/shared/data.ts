// Dados do MonKePo usados pelo jogo e pelo Apps Script (mecânicas da 3ª geração, criaturas próprias).

/* ---------- Tipos (tabela da 3ª geração: 17 tipos, sem Fada) ---------- */

export const TYPES = [
  'Normal', 'Fogo', 'Água', 'Elétrico', 'Planta', 'Gelo', 'Lutador', 'Venenoso', 'Terra',
  'Voador', 'Psíquico', 'Inseto', 'Pedra', 'Fantasma', 'Dragão', 'Sombrio', 'Metal',
] as const;
export type TypeName = (typeof TYPES)[number];

/** Na 3ª geração a categoria (físico/especial) vem do tipo do golpe. */
export const PHYSICAL_TYPES: readonly TypeName[] = ['Normal', 'Lutador', 'Voador', 'Venenoso', 'Terra', 'Pedra', 'Inseto', 'Fantasma', 'Metal'];

const CHART: Partial<Record<TypeName, Partial<Record<TypeName, number>>>> = {
  Normal: { Pedra: 0.5, Fantasma: 0, Metal: 0.5 },
  Fogo: { Fogo: 0.5, Água: 0.5, Planta: 2, Gelo: 2, Inseto: 2, Pedra: 0.5, Dragão: 0.5, Metal: 2 },
  Água: { Fogo: 2, Água: 0.5, Planta: 0.5, Terra: 2, Pedra: 2, Dragão: 0.5 },
  Elétrico: { Água: 2, Elétrico: 0.5, Planta: 0.5, Terra: 0, Voador: 2, Dragão: 0.5 },
  Planta: { Fogo: 0.5, Água: 2, Planta: 0.5, Venenoso: 0.5, Terra: 2, Voador: 0.5, Inseto: 0.5, Pedra: 2, Dragão: 0.5, Metal: 0.5 },
  Gelo: { Fogo: 0.5, Água: 0.5, Planta: 2, Gelo: 0.5, Terra: 2, Voador: 2, Dragão: 2, Metal: 0.5 },
  Lutador: { Normal: 2, Gelo: 2, Venenoso: 0.5, Voador: 0.5, Psíquico: 0.5, Inseto: 0.5, Pedra: 2, Fantasma: 0, Sombrio: 2, Metal: 2 },
  Venenoso: { Planta: 2, Venenoso: 0.5, Terra: 0.5, Pedra: 0.5, Fantasma: 0.5, Metal: 0 },
  Terra: { Fogo: 2, Elétrico: 2, Planta: 0.5, Venenoso: 2, Voador: 0, Inseto: 0.5, Pedra: 2, Metal: 2 },
  Voador: { Elétrico: 0.5, Planta: 2, Lutador: 2, Inseto: 2, Pedra: 0.5, Metal: 0.5 },
  Psíquico: { Lutador: 2, Venenoso: 2, Psíquico: 0.5, Sombrio: 0, Metal: 0.5 },
  Inseto: { Fogo: 0.5, Planta: 2, Lutador: 0.5, Venenoso: 0.5, Voador: 0.5, Psíquico: 2, Fantasma: 0.5, Sombrio: 2, Metal: 0.5 },
  Pedra: { Fogo: 2, Gelo: 2, Lutador: 0.5, Terra: 0.5, Voador: 2, Inseto: 2, Metal: 0.5 },
  Fantasma: { Normal: 0, Psíquico: 2, Fantasma: 2, Sombrio: 0.5, Metal: 0.5 },
  Dragão: { Dragão: 2, Metal: 0.5 },
  Sombrio: { Lutador: 0.5, Psíquico: 2, Fantasma: 2, Sombrio: 0.5, Metal: 0.5 },
  Metal: { Fogo: 0.5, Água: 0.5, Elétrico: 0.5, Gelo: 2, Pedra: 2, Metal: 0.5 },
};

export function typeEffectiveness(attack: TypeName, defense: readonly TypeName[]): number {
  return defense.reduce((m, d) => m * (CHART[attack]?.[d] ?? 1), 1);
}

/* ---------- Naturezas (índice = personalidade % 25, igual à 3ª geração) ---------- */

export const NATURE_NAMES = [
  'Destemida', 'Solitária', 'Corajosa', 'Firme', 'Levada',
  'Ousada', 'Dócil', 'Relaxada', 'Travessa', 'Descontraída',
  'Tímida', 'Apressada', 'Séria', 'Alegre', 'Ingênua',
  'Modesta', 'Suave', 'Quieta', 'Acanhada', 'Imprudente',
  'Calma', 'Gentil', 'Atrevida', 'Cuidadosa', 'Peculiar',
] as const;

// Ordem dos atributos nos vetores: [PS, Ataque, Defesa, At. Esp., Def. Esp., Velocidade].
export const STAT_NAMES = ['PS', 'Ataque', 'Defesa', 'At. Esp.', 'Def. Esp.', 'Velocidade'] as const;
const NATURE_STAT_ORDER = [1, 2, 5, 3, 4]; // Ataque, Defesa, Velocidade, At. Esp., Def. Esp.

/** Multiplicador da natureza para cada atributo (1,1 sobe, 0,9 desce). */
export function natureMultipliers(nature: number): number[] {
  const mult = [1, 1, 1, 1, 1, 1];
  const up = Math.floor(nature / 5);
  const down = nature % 5;
  if (up !== down) {
    mult[NATURE_STAT_ORDER[up]] = 1.1;
    mult[NATURE_STAT_ORDER[down]] = 0.9;
  }
  return mult;
}

/* ---------- Curvas de experiência (as seis da 3ª geração) ---------- */

export type Growth = 'erratica' | 'rapida' | 'media-rapida' | 'media-lenta' | 'lenta' | 'flutuante';

export function expForLevel(growth: Growth, n: number): number {
  if (n <= 1) return 0;
  const c = n ** 3;
  switch (growth) {
    case 'erratica':
      if (n <= 50) return Math.floor((c * (100 - n)) / 50);
      if (n <= 68) return Math.floor((c * (150 - n)) / 100);
      if (n <= 98) return Math.floor((c * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((c * (160 - n)) / 100);
    case 'rapida':
      return Math.floor((4 * c) / 5);
    case 'media-rapida':
      return c;
    case 'media-lenta':
      return Math.floor((6 * c) / 5 - 15 * n * n + 100 * n - 140);
    case 'lenta':
      return Math.floor((5 * c) / 4);
    case 'flutuante':
      if (n <= 15) return Math.floor((c * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n <= 36) return Math.floor((c * (n + 14)) / 50);
      return Math.floor((c * (Math.floor(n / 2) + 32)) / 50);
  }
}

/* ---------- Golpes ---------- */

export interface Move {
  id: number;
  nome: string;
  tipo: TypeName;
  poder: number; // 0 = golpe de status
  precisao: number; // 0 = nunca erra
  pp: number;
  prioridade?: number;
  efeito?: string;
}

export const MOVES: Move[] = [
  { id: 1, nome: 'Investida', tipo: 'Normal', poder: 35, precisao: 95, pp: 35 },
  { id: 2, nome: 'Arranhão', tipo: 'Normal', poder: 40, precisao: 100, pp: 35 },
  { id: 3, nome: 'Rosnado', tipo: 'Normal', poder: 0, precisao: 100, pp: 40, efeito: 'ataque-alvo-1' },
  { id: 4, nome: 'Olhar Feroz', tipo: 'Normal', poder: 0, precisao: 100, pp: 30, efeito: 'defesa-alvo-1' },
  { id: 5, nome: 'Ataque Rápido', tipo: 'Normal', poder: 40, precisao: 100, pp: 30, prioridade: 1 },
  { id: 6, nome: 'Absorver', tipo: 'Planta', poder: 20, precisao: 100, pp: 20, efeito: 'drena-50' },
  { id: 7, nome: 'Folha Cortante', tipo: 'Planta', poder: 55, precisao: 95, pp: 25, efeito: 'critico-alto' },
  { id: 8, nome: 'Brasa', tipo: 'Fogo', poder: 40, precisao: 100, pp: 25, efeito: 'queima-10' },
  { id: 9, nome: 'Roda de Fogo', tipo: 'Fogo', poder: 60, precisao: 100, pp: 25, efeito: 'queima-10' },
  { id: 10, nome: 'Jato d\'Água', tipo: 'Água', poder: 40, precisao: 100, pp: 25 },
  { id: 11, nome: 'Bolhas', tipo: 'Água', poder: 20, precisao: 100, pp: 30, efeito: 'velocidade-alvo-1-10' },
  { id: 12, nome: 'Areia nos Olhos', tipo: 'Terra', poder: 0, precisao: 100, pp: 15, efeito: 'precisao-alvo-1' },
  { id: 13, nome: 'Rajada', tipo: 'Voador', poder: 40, precisao: 100, pp: 35 },
  { id: 14, nome: 'Bicada', tipo: 'Voador', poder: 35, precisao: 100, pp: 35 },
  { id: 15, nome: 'Mordida', tipo: 'Sombrio', poder: 60, precisao: 100, pp: 25, efeito: 'recua-30' },
  { id: 16, nome: 'Choque', tipo: 'Elétrico', poder: 40, precisao: 100, pp: 30, efeito: 'paralisa-10' },
  { id: 17, nome: 'Golpe de Karatê', tipo: 'Lutador', poder: 50, precisao: 100, pp: 25, efeito: 'critico-alto' },
  { id: 18, nome: 'Tiro de Lama', tipo: 'Terra', poder: 55, precisao: 95, pp: 15, efeito: 'velocidade-alvo-1' },
];

/* ---------- Criaturas (MonKePos) ---------- */

export interface Species {
  id: number;
  nome: string;
  tipos: TypeName[];
  base: [number, number, number, number, number, number]; // PS, Atq, Def, AtE, DfE, Vel
  crescimento: Growth;
  captura: number; // taxa de captura 3..255
  expBase: number;
  femea: number; // chance de fêmea em 1/256; -1 = sem gênero
  evolui?: { para: number; nivel: number };
  golpes: [number, number][]; // [nível, golpe]
}

export const SPECIES: Species[] = [
  { id: 1, nome: 'Folhito', tipos: ['Planta'], base: [45, 49, 49, 65, 65, 45], crescimento: 'media-lenta', captura: 45, expBase: 64, femea: 31, evolui: { para: 2, nivel: 16 }, golpes: [[1, 1], [1, 3], [6, 6], [13, 7]] },
  { id: 2, nome: 'Folhudo', tipos: ['Planta'], base: [60, 62, 63, 80, 80, 60], crescimento: 'media-lenta', captura: 45, expBase: 141, femea: 31, evolui: { para: 3, nivel: 36 }, golpes: [[1, 1], [1, 6], [13, 7], [22, 18]] },
  { id: 3, nome: 'Florestor', tipos: ['Planta', 'Terra'], base: [80, 92, 88, 100, 95, 75], crescimento: 'media-lenta', captura: 45, expBase: 208, femea: 31, golpes: [[1, 7], [1, 18]] },
  { id: 4, nome: 'Brasito', tipos: ['Fogo'], base: [44, 58, 42, 62, 48, 66], crescimento: 'media-lenta', captura: 45, expBase: 65, femea: 31, evolui: { para: 5, nivel: 16 }, golpes: [[1, 2], [1, 3], [7, 8], [16, 9]] },
  { id: 5, nome: 'Brasão', tipos: ['Fogo', 'Lutador'], base: [60, 80, 58, 78, 58, 76], crescimento: 'media-lenta', captura: 45, expBase: 142, femea: 31, evolui: { para: 6, nivel: 36 }, golpes: [[1, 2], [1, 8], [16, 9], [20, 17]] },
  { id: 6, nome: 'Vulcanor', tipos: ['Fogo', 'Lutador'], base: [78, 112, 72, 100, 72, 96], crescimento: 'media-lenta', captura: 45, expBase: 209, femea: 31, golpes: [[1, 9], [1, 17]] },
  { id: 7, nome: 'Gotim', tipos: ['Água'], base: [50, 60, 50, 52, 50, 48], crescimento: 'media-lenta', captura: 45, expBase: 65, femea: 31, evolui: { para: 8, nivel: 16 }, golpes: [[1, 1], [1, 3], [6, 10], [12, 12]] },
  { id: 8, nome: 'Marolão', tipos: ['Água', 'Terra'], base: [70, 85, 70, 62, 70, 50], crescimento: 'media-lenta', captura: 45, expBase: 143, femea: 31, evolui: { para: 9, nivel: 36 }, golpes: [[1, 1], [1, 10], [16, 18], [20, 11]] },
  { id: 9, nome: 'Tsunamor', tipos: ['Água', 'Terra'], base: [100, 110, 90, 85, 90, 60], crescimento: 'media-lenta', captura: 45, expBase: 210, femea: 31, golpes: [[1, 10], [1, 18]] },
  { id: 10, nome: 'Ratiz', tipos: ['Normal'], base: [38, 30, 41, 30, 41, 60], crescimento: 'media-rapida', captura: 255, expBase: 48, femea: 127, evolui: { para: 11, nivel: 20 }, golpes: [[1, 1], [1, 4], [5, 5], [13, 15]] },
  { id: 11, nome: 'Ratazão', tipos: ['Normal'], base: [78, 70, 61, 50, 61, 100], crescimento: 'media-rapida', captura: 90, expBase: 128, femea: 127, golpes: [[1, 5], [1, 15]] },
  { id: 12, nome: 'Piupiu', tipos: ['Normal', 'Voador'], base: [40, 55, 30, 30, 30, 85], crescimento: 'media-lenta', captura: 200, expBase: 59, femea: 127, evolui: { para: 13, nivel: 22 }, golpes: [[1, 14], [1, 3], [8, 5], [15, 13]] },
  { id: 13, nome: 'Gaviano', tipos: ['Normal', 'Voador'], base: [60, 85, 60, 50, 50, 125], crescimento: 'media-lenta', captura: 45, expBase: 162, femea: 127, golpes: [[1, 13], [1, 5]] },
];

export const STARTERS = [1, 4, 7];
export const getSpecies = (id: number): Species | undefined => SPECIES.find((s) => s.id === id);
export const getMove = (id: number): Move | undefined => MOVES.find((m) => m.id === id);

/** A espécie `to` é uma evolução (direta ou não) de `from`? */
export function evolvesInto(from: number, to: number): boolean {
  let s = getSpecies(from);
  for (let i = 0; s?.evolui && i < 5; i++) {
    if (s.evolui.para === to) return true;
    s = getSpecies(s.evolui.para);
  }
  return false;
}
