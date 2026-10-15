// Dados do MonKePo usados pelo jogo e pelo Apps Script.
// Mecânicas da 3ª geração; criaturas com artes livres do projeto Tuxemon (CC BY-SA 4.0).

/* ---------- Tipos (tabela da 3ª geração: 17 tipos, sem Fada) ---------- */

export const TYPES = [
  'Normal', 'Fogo', 'Água', 'Elétrico', 'Planta', 'Gelo', 'Lutador', 'Venenoso', 'Terra',
  'Voador', 'Psíquico', 'Inseto', 'Pedra', 'Fantasma', 'Dragão', 'Sombrio', 'Metal',
] as const;
export type TypeName = (typeof TYPES)[number];

/** Na 3ª geração a categoria (físico/especial) vem do tipo do golpe. */
export const PHYSICAL_TYPES: readonly TypeName[] = ['Normal', 'Lutador', 'Voador', 'Venenoso', 'Terra', 'Pedra', 'Inseto', 'Fantasma', 'Metal'];

export const TYPE_COLORS: Record<TypeName, string> = {
  Normal: '#a8a878', Fogo: '#f08030', Água: '#6890f0', Elétrico: '#f8d030', Planta: '#78c850', Gelo: '#98d8d8',
  Lutador: '#c03028', Venenoso: '#a040a0', Terra: '#e0c068', Voador: '#a890f0', Psíquico: '#f85888', Inseto: '#a8b820',
  Pedra: '#b8a038', Fantasma: '#705898', Dragão: '#7038f8', Sombrio: '#705848', Metal: '#b8b8d0',
};

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

export type Status = 'queimado' | 'envenenado' | 'paralisado' | 'dormindo' | 'congelado';
export type StageStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';

export type Effect =
  | { tipo: 'status'; status: Status; chance: number }
  | { tipo: 'stat'; alvo: 'self' | 'alvo'; stat: StageStat; delta: number; chance: number }
  | { tipo: 'drena'; fracao: number }
  | { tipo: 'recua'; chance: number }
  | { tipo: 'critico' }
  | { tipo: 'fixo'; dano: number };

export interface Move {
  id: number; // nunca reaproveitar: os saves guardam o número
  nome: string;
  tipo: TypeName;
  poder: number; // 0 = golpe de status
  precisao: number; // 0 = nunca erra
  pp: number;
  prioridade?: number;
  efeitos?: Effect[];
}

const st = (status: Status, chance: number): Effect => ({ tipo: 'status', status, chance });
const alvo = (stat: StageStat, delta: number, chance = 100): Effect => ({ tipo: 'stat', alvo: 'alvo', stat, delta, chance });
const self = (stat: StageStat, delta: number, chance = 100): Effect => ({ tipo: 'stat', alvo: 'self', stat, delta, chance });

export const MOVES: Move[] = [
  { id: 1, nome: 'Investida', tipo: 'Normal', poder: 35, precisao: 95, pp: 35 },
  { id: 2, nome: 'Arranhão', tipo: 'Normal', poder: 40, precisao: 100, pp: 35 },
  { id: 3, nome: 'Rosnado', tipo: 'Normal', poder: 0, precisao: 100, pp: 40, efeitos: [alvo('atk', -1)] },
  { id: 4, nome: 'Olhar Feroz', tipo: 'Normal', poder: 0, precisao: 100, pp: 30, efeitos: [alvo('def', -1)] },
  { id: 5, nome: 'Ataque Rápido', tipo: 'Normal', poder: 40, precisao: 100, pp: 30, prioridade: 1 },
  { id: 6, nome: 'Absorver', tipo: 'Planta', poder: 20, precisao: 100, pp: 20, efeitos: [{ tipo: 'drena', fracao: 0.5 }] },
  { id: 7, nome: 'Folha Cortante', tipo: 'Planta', poder: 55, precisao: 95, pp: 25, efeitos: [{ tipo: 'critico' }] },
  { id: 8, nome: 'Brasa', tipo: 'Fogo', poder: 40, precisao: 100, pp: 25, efeitos: [st('queimado', 10)] },
  { id: 9, nome: 'Roda de Fogo', tipo: 'Fogo', poder: 60, precisao: 100, pp: 25, efeitos: [st('queimado', 10)] },
  { id: 10, nome: "Jato d'Água", tipo: 'Água', poder: 40, precisao: 100, pp: 25 },
  { id: 11, nome: 'Bolhas', tipo: 'Água', poder: 20, precisao: 100, pp: 30, efeitos: [alvo('spe', -1, 10)] },
  { id: 12, nome: 'Areia nos Olhos', tipo: 'Terra', poder: 0, precisao: 100, pp: 15, efeitos: [alvo('acc', -1)] },
  { id: 13, nome: 'Rajada', tipo: 'Voador', poder: 40, precisao: 100, pp: 35 },
  { id: 14, nome: 'Bicada', tipo: 'Voador', poder: 35, precisao: 100, pp: 35 },
  { id: 15, nome: 'Mordida', tipo: 'Sombrio', poder: 60, precisao: 100, pp: 25, efeitos: [{ tipo: 'recua', chance: 30 }] },
  { id: 16, nome: 'Choque', tipo: 'Elétrico', poder: 40, precisao: 100, pp: 30, efeitos: [st('paralisado', 10)] },
  { id: 17, nome: 'Golpe de Karatê', tipo: 'Lutador', poder: 50, precisao: 100, pp: 25, efeitos: [{ tipo: 'critico' }] },
  { id: 18, nome: 'Tiro de Lama', tipo: 'Terra', poder: 55, precisao: 95, pp: 15, efeitos: [alvo('spe', -1)] },
  { id: 19, nome: 'Megadreno', tipo: 'Planta', poder: 40, precisao: 100, pp: 10, efeitos: [{ tipo: 'drena', fracao: 0.5 }] },
  { id: 20, nome: 'Pó do Sono', tipo: 'Planta', poder: 0, precisao: 75, pp: 15, efeitos: [st('dormindo', 100)] },
  { id: 21, nome: 'Lança-chamas', tipo: 'Fogo', poder: 95, precisao: 100, pp: 15, efeitos: [st('queimado', 10)] },
  { id: 22, nome: "Pulso d'Água", tipo: 'Água', poder: 60, precisao: 100, pp: 20 },
  { id: 23, nome: 'Hidrobomba', tipo: 'Água', poder: 120, precisao: 80, pp: 5 },
  { id: 24, nome: 'Ataque de Asa', tipo: 'Voador', poder: 60, precisao: 100, pp: 35 },
  { id: 25, nome: 'Pó de Neve', tipo: 'Gelo', poder: 40, precisao: 100, pp: 25, efeitos: [st('congelado', 10)] },
  { id: 26, nome: 'Raio de Gelo', tipo: 'Gelo', poder: 95, precisao: 100, pp: 10, efeitos: [st('congelado', 10)] },
  { id: 27, nome: 'Garra de Metal', tipo: 'Metal', poder: 50, precisao: 95, pp: 35, efeitos: [self('atk', 1, 10)] },
  { id: 28, nome: 'Cauda de Ferro', tipo: 'Metal', poder: 100, precisao: 75, pp: 15, efeitos: [alvo('def', -1, 30)] },
  { id: 29, nome: 'Ferrão Venenoso', tipo: 'Venenoso', poder: 15, precisao: 100, pp: 35, efeitos: [st('envenenado', 30)] },
  { id: 30, nome: 'Ácido', tipo: 'Venenoso', poder: 40, precisao: 100, pp: 30, efeitos: [alvo('def', -1, 10)] },
  { id: 31, nome: 'Cabeçada', tipo: 'Normal', poder: 70, precisao: 100, pp: 15, efeitos: [{ tipo: 'recua', chance: 30 }] },
  { id: 32, nome: 'Pancada Corporal', tipo: 'Normal', poder: 85, precisao: 100, pp: 15, efeitos: [st('paralisado', 30)] },
  { id: 33, nome: 'Endurecer', tipo: 'Normal', poder: 0, precisao: 0, pp: 30, efeitos: [self('def', 1)] },
  { id: 34, nome: 'Dança das Espadas', tipo: 'Normal', poder: 0, precisao: 0, pp: 30, efeitos: [self('atk', 2)] },
  { id: 35, nome: 'Chute Rasteiro', tipo: 'Lutador', poder: 50, precisao: 90, pp: 20 },
  { id: 36, nome: 'Golpe Cruzado', tipo: 'Lutador', poder: 100, precisao: 80, pp: 5, efeitos: [{ tipo: 'critico' }] },
  { id: 37, nome: 'Finta', tipo: 'Sombrio', poder: 60, precisao: 0, pp: 20 },
  { id: 38, nome: 'Bola Sombria', tipo: 'Fantasma', poder: 80, precisao: 100, pp: 15, efeitos: [alvo('spd', -1, 20)] },
  { id: 39, nome: 'Confusão', tipo: 'Psíquico', poder: 50, precisao: 100, pp: 25 },
  { id: 40, nome: 'Terremoto', tipo: 'Terra', poder: 100, precisao: 100, pp: 10 },
  { id: 41, nome: 'Avalanche de Pedras', tipo: 'Pedra', poder: 75, precisao: 90, pp: 10, efeitos: [{ tipo: 'recua', chance: 30 }] },
  { id: 42, nome: 'Fúria do Dragão', tipo: 'Dragão', poder: 1, precisao: 100, pp: 10, efeitos: [{ tipo: 'fixo', dano: 40 }] },
  { id: 43, nome: 'Agilidade', tipo: 'Psíquico', poder: 0, precisao: 0, pp: 30, efeitos: [self('spe', 2)] },
  { id: 44, nome: 'Relâmpago', tipo: 'Elétrico', poder: 95, precisao: 100, pp: 15, efeitos: [st('paralisado', 10)] },
  { id: 45, nome: 'Lâmina de Folha', tipo: 'Planta', poder: 90, precisao: 100, pp: 15, efeitos: [{ tipo: 'critico' }] },
  { id: 46, nome: 'Pó Venenoso', tipo: 'Venenoso', poder: 0, precisao: 75, pp: 35, efeitos: [st('envenenado', 100)] },
  { id: 47, nome: 'Onda Elétrica', tipo: 'Elétrico', poder: 0, precisao: 100, pp: 20, efeitos: [st('paralisado', 100)] },
];

/* ---------- Criaturas (MonKePos) ---------- */

export interface Species {
  id: number; // nunca reaproveitar: os saves guardam o número
  nome: string;
  sprite: string; // arquivo em public/monstros
  tipos: TypeName[];
  base: [number, number, number, number, number, number]; // PS, Atq, Def, AtE, DfE, Vel
  ev: [number, number, number, number, number, number]; // EVs que dá ao ser derrotado
  crescimento: Growth;
  captura: number; // taxa de captura 3..255
  expBase: number;
  femea: number; // chance de fêmea em 1/256; -1 = sem gênero
  evolui?: { para: number; nivel: number };
  golpes: [number, number][]; // [nível, golpe]
  arte: string; // autores da arte (Tuxemon, CC BY-SA 4.0)
}

export const SPECIES: Species[] = [
  { id: 1, nome: 'Lambert', sprite: 'lambert', tipos: ['Planta'], base: [45, 49, 49, 65, 65, 45], ev: [0, 0, 0, 1, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 64, femea: 31, evolui: { para: 2, nivel: 16 }, golpes: [[1, 1], [1, 3], [3, 6], [6, 7], [11, 20], [15, 19]], arte: 'Sanglorian' },
  { id: 2, nome: 'Legko', sprite: 'legko', tipos: ['Planta'], base: [60, 62, 63, 80, 80, 60], ev: [0, 0, 0, 1, 1, 0], crescimento: 'media-lenta', captura: 45, expBase: 141, femea: 31, evolui: { para: 3, nivel: 36 }, golpes: [[1, 1], [1, 6], [16, 7], [21, 19], [27, 33], [32, 45]], arte: 'Sanglorian' },
  { id: 3, nome: 'Moloch', sprite: 'moloch', tipos: ['Planta', 'Lutador'], base: [80, 100, 90, 85, 85, 80], ev: [0, 2, 0, 1, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 208, femea: 31, golpes: [[1, 7], [1, 19], [36, 17], [40, 45], [46, 36], [52, 34]], arte: 'Sanglorian' },
  { id: 4, nome: 'Agnite', sprite: 'agnite', tipos: ['Fogo'], base: [39, 52, 43, 60, 50, 65], ev: [0, 0, 0, 0, 0, 1], crescimento: 'media-lenta', captura: 45, expBase: 65, femea: 31, evolui: { para: 5, nivel: 16 }, golpes: [[1, 2], [1, 3], [7, 8], [13, 4]], arte: 'Leo, Sanglorian e extyrannomon' },
  { id: 5, nome: 'Agnidon', sprite: 'agnidon', tipos: ['Fogo'], base: [58, 64, 58, 80, 65, 80], ev: [0, 0, 0, 1, 0, 1], crescimento: 'media-lenta', captura: 45, expBase: 142, femea: 31, evolui: { para: 6, nivel: 36 }, golpes: [[1, 2], [1, 8], [16, 9], [22, 15], [29, 37], [33, 34]], arte: 'Leo' },
  { id: 6, nome: 'Agnigon', sprite: 'agnigon', tipos: ['Fogo', 'Sombrio'], base: [78, 84, 78, 109, 85, 100], ev: [0, 0, 0, 3, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 209, femea: 31, golpes: [[1, 9], [1, 15], [36, 21], [44, 38], [52, 42]], arte: 'Leo' },
  { id: 7, nome: 'Dollfin', sprite: 'dollfin', tipos: ['Água'], base: [50, 60, 50, 55, 50, 50], ev: [0, 1, 0, 0, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 65, femea: 31, evolui: { para: 8, nivel: 16 }, golpes: [[1, 1], [1, 3], [6, 10], [11, 11], [15, 12]], arte: 'Cavalcadeur' },
  { id: 8, nome: 'Sharpfin', sprite: 'sharpfin', tipos: ['Água', 'Lutador'], base: [65, 82, 62, 65, 62, 74], ev: [0, 2, 0, 0, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 143, femea: 31, evolui: { para: 9, nivel: 36 }, golpes: [[1, 1], [1, 10], [16, 17], [22, 22], [28, 31], [33, 35]], arte: 'Projeto Tuxemon' },
  { id: 9, nome: 'Bigfin', sprite: 'bigfin', tipos: ['Água'], base: [100, 100, 90, 85, 90, 65], ev: [2, 1, 0, 0, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 210, femea: 31, golpes: [[1, 22], [1, 31], [36, 32], [42, 26], [50, 23]], arte: 'Cavalcadeur e rsg167' },
  { id: 10, nome: 'Noctula', sprite: 'noctula', tipos: ['Voador', 'Sombrio'], base: [40, 45, 35, 30, 40, 60], ev: [0, 0, 0, 0, 0, 1], crescimento: 'media-rapida', captura: 190, expBase: 54, femea: 127, evolui: { para: 11, nivel: 22 }, golpes: [[1, 14], [1, 3], [5, 5], [9, 15], [15, 24], [19, 37]], arte: 'Catch Challenger' },
  { id: 11, nome: 'Noctalo', sprite: 'noctalo', tipos: ['Voador', 'Sombrio'], base: [75, 80, 70, 65, 75, 95], ev: [0, 0, 0, 0, 0, 2], crescimento: 'media-rapida', captura: 90, expBase: 159, femea: 127, golpes: [[1, 24], [1, 15], [22, 37], [30, 38], [38, 43]], arte: 'Catch Challenger' },
  { id: 12, nome: 'Capiti', sprite: 'capiti', tipos: ['Normal'], base: [38, 56, 35, 25, 35, 72], ev: [0, 0, 0, 0, 0, 1], crescimento: 'media-rapida', captura: 255, expBase: 51, femea: 127, golpes: [[1, 1], [1, 4], [4, 5], [9, 15], [15, 31], [25, 32], [33, 34]], arte: 'Catch Challenger' },
  { id: 13, nome: 'Selket', sprite: 'selket', tipos: ['Terra', 'Venenoso'], base: [50, 65, 70, 30, 40, 40], ev: [0, 0, 1, 0, 0, 0], crescimento: 'media-rapida', captura: 120, expBase: 66, femea: 127, evolui: { para: 14, nivel: 24 }, golpes: [[1, 2], [1, 33], [6, 29], [11, 12], [16, 18], [21, 30]], arte: 'Catch Challenger' },
  { id: 14, nome: 'Selmatek', sprite: 'selmatek', tipos: ['Terra', 'Venenoso'], base: [70, 95, 105, 50, 65, 60], ev: [0, 0, 2, 0, 0, 0], crescimento: 'media-rapida', captura: 60, expBase: 165, femea: 127, golpes: [[1, 29], [1, 18], [24, 41], [30, 46], [38, 40]], arte: 'Catch Challenger' },
  { id: 15, nome: 'Propellercat', sprite: 'propellercat', tipos: ['Normal', 'Voador'], base: [55, 60, 50, 50, 50, 90], ev: [0, 0, 0, 0, 0, 2], crescimento: 'rapida', captura: 75, expBase: 110, femea: 127, golpes: [[1, 13], [1, 5], [8, 3], [13, 24], [20, 31], [28, 43]], arte: 'tamashihoshi' },
  { id: 16, nome: 'Zunna', sprite: 'zunna', tipos: ['Normal'], base: [70, 65, 55, 45, 55, 55], ev: [1, 0, 0, 0, 0, 0], crescimento: 'rapida', captura: 200, expBase: 62, femea: 127, golpes: [[1, 1], [1, 4], [5, 33], [10, 31], [18, 32], [26, 34]], arte: 'Spalding004 e Sanglorian' },
  { id: 17, nome: 'Tweesher', sprite: 'tweesher', tipos: ['Gelo'], base: [45, 50, 45, 58, 50, 57], ev: [0, 0, 0, 1, 0, 0], crescimento: 'media-lenta', captura: 120, expBase: 63, femea: 127, evolui: { para: 18, nivel: 24 }, golpes: [[1, 14], [1, 3], [6, 25], [12, 13], [18, 11]], arte: 'Leo e DevilDman' },
  { id: 18, nome: 'Heronquak', sprite: 'heronquak', tipos: ['Gelo', 'Voador'], base: [65, 70, 60, 80, 65, 75], ev: [0, 0, 0, 2, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 147, femea: 127, evolui: { para: 19, nivel: 36 }, golpes: [[1, 25], [1, 13], [24, 24], [30, 26]], arte: 'Leo e DevilDman' },
  { id: 19, nome: 'Eaglace', sprite: 'eaglace', tipos: ['Gelo', 'Voador'], base: [85, 90, 80, 105, 85, 95], ev: [0, 0, 0, 3, 0, 0], crescimento: 'media-lenta', captura: 45, expBase: 214, femea: 127, golpes: [[1, 26], [1, 24], [36, 43], [44, 23]], arte: 'Leo e DevilDman' },
  { id: 20, nome: 'Wrougon', sprite: 'wrougon', tipos: ['Metal'], base: [50, 70, 90, 35, 45, 30], ev: [0, 0, 1, 0, 0, 0], crescimento: 'lenta', captura: 120, expBase: 68, femea: -1, evolui: { para: 21, nivel: 32 }, golpes: [[1, 2], [1, 33], [7, 27], [13, 4], [20, 31]], arte: 'Spalding004 e Chickenshowman' },
  { id: 21, nome: 'Allagon', sprite: 'allagon', tipos: ['Metal'], base: [65, 90, 115, 50, 60, 40], ev: [0, 0, 2, 0, 0, 0], crescimento: 'lenta', captura: 45, expBase: 152, femea: -1, evolui: { para: 22, nivel: 50 }, golpes: [[1, 27], [1, 33], [32, 28], [38, 41]], arte: 'Spalding004 e Chickenshowman' },
  { id: 22, nome: 'Ferricran', sprite: 'ferricran', tipos: ['Metal'], base: [80, 120, 140, 60, 75, 45], ev: [0, 0, 3, 0, 0, 0], crescimento: 'lenta', captura: 45, expBase: 218, femea: -1, golpes: [[1, 28], [1, 41], [50, 40]], arte: 'Spalding004 e Chickenshowman' },
  { id: 23, nome: 'Chillimp', sprite: 'chillimp', tipos: ['Gelo', 'Lutador'], base: [55, 72, 45, 40, 45, 60], ev: [0, 1, 0, 0, 0, 0], crescimento: 'media-rapida', captura: 90, expBase: 72, femea: 127, evolui: { para: 24, nivel: 28 }, golpes: [[1, 2], [1, 3], [7, 25], [12, 35], [18, 5], [24, 26]], arte: 'Chickenshowman' },
  { id: 24, nome: 'Snowrilla', sprite: 'snowrilla', tipos: ['Gelo', 'Lutador'], base: [90, 110, 80, 55, 70, 70], ev: [0, 2, 0, 0, 0, 0], crescimento: 'media-rapida', captura: 45, expBase: 170, femea: 127, golpes: [[1, 25], [1, 35], [28, 36], [34, 26], [40, 32]], arte: 'Chickenshowman' },
  { id: 25, nome: 'Pigabyte', sprite: 'pigabyte', tipos: ['Metal', 'Normal'], base: [60, 60, 80, 50, 80, 40], ev: [0, 0, 1, 0, 1, 0], crescimento: 'media-rapida', captura: 60, expBase: 120, femea: -1, golpes: [[1, 1], [1, 33], [8, 4], [14, 27], [22, 31], [30, 32]], arte: 'josepharaoh99' },
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

/* ---------- Itens (ficam na sala, não vão para a planilha) ---------- */

export interface Item {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
  bola?: number; // bônus de captura
  cura?: number; // PS recuperados
  curaStatus?: boolean;
}

export const ITEMS: Item[] = [
  { id: 'monbola', nome: 'MonBola', preco: 200, descricao: 'Captura MonKePos selvagens.', bola: 1 },
  { id: 'superbola', nome: 'Super Bola', preco: 600, descricao: 'Captura melhor que a MonBola.', bola: 1.5 },
  { id: 'ultrabola', nome: 'Ultra Bola', preco: 1200, descricao: 'Captura muito melhor.', bola: 2 },
  { id: 'pocao', nome: 'Poção', preco: 300, descricao: 'Recupera 20 PS.', cura: 20 },
  { id: 'superpocao', nome: 'Superpoção', preco: 700, descricao: 'Recupera 50 PS.', cura: 50 },
  { id: 'curatotal', nome: 'Cura Total', preco: 600, descricao: 'Cura qualquer problema de status.', curaStatus: true },
];
export const getItem = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);

/** Kit de quem entra numa sala nova. */
export const STARTER_KIT = { dinheiro: 3000, mochila: { monbola: 5, pocao: 3 } as Record<string, number> };
