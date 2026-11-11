// Dados fixos da Roça Feliz: culturas, níveis, terrenos, itens da loja e os vizinhos.

export interface Cultura {
  id: string
  nome: string
  emoji: string
  nivel: number // nível mínimo para comprar a semente
  semente: number // preço da semente
  minutos: number // tempo para amadurecer (primeira colheita)
  rende: number // unidades por colheita
  preco: number // preço de venda de cada unidade no celeiro
  xp: number // experiência ao colher
  colheitas: number // quantas vezes dá fruto antes de murchar
  cor: string // cor do fruto (flores e frutos verdes)
  folha: string // cor das folhas
}

export const CULTURAS: Cultura[] = [
  { id: 'cenoura', nome: 'Cenoura', emoji: '🥕', nivel: 1, semente: 10, minutos: 1, rende: 6, preco: 3, xp: 2, colheitas: 1, cor: '#f97316', folha: '#4ade80' },
  { id: 'milho', nome: 'Milho', emoji: '🌽', nivel: 1, semente: 18, minutos: 3, rende: 6, preco: 6, xp: 4, colheitas: 1, cor: '#facc15', folha: '#65a30d' },
  { id: 'batata', nome: 'Batata', emoji: '🥔', nivel: 2, semente: 30, minutos: 6, rende: 8, preco: 7, xp: 6, colheitas: 1, cor: '#d6a461', folha: '#4d7c0f' },
  { id: 'tomate', nome: 'Tomate', emoji: '🍅', nivel: 3, semente: 45, minutos: 10, rende: 8, preco: 9, xp: 9, colheitas: 2, cor: '#ef4444', folha: '#16a34a' },
  { id: 'morango', nome: 'Morango', emoji: '🍓', nivel: 4, semente: 70, minutos: 15, rende: 10, preco: 12, xp: 12, colheitas: 2, cor: '#e11d48', folha: '#22c55e' },
  { id: 'berinjela', nome: 'Berinjela', emoji: '🍆', nivel: 5, semente: 100, minutos: 25, rende: 10, preco: 17, xp: 16, colheitas: 1, cor: '#7c3aed', folha: '#15803d' },
  { id: 'abobora', nome: 'Abóbora', emoji: '🎃', nivel: 6, semente: 140, minutos: 40, rende: 6, preco: 40, xp: 22, colheitas: 1, cor: '#ea580c', folha: '#3f6212' },
  { id: 'melancia', nome: 'Melancia', emoji: '🍉', nivel: 7, semente: 190, minutos: 60, rende: 6, preco: 55, xp: 30, colheitas: 1, cor: '#16a34a', folha: '#166534' },
  { id: 'girassol', nome: 'Girassol', emoji: '🌻', nivel: 8, semente: 250, minutos: 90, rende: 12, preco: 34, xp: 38, colheitas: 1, cor: '#fbbf24', folha: '#15803d' },
  { id: 'uva', nome: 'Uva', emoji: '🍇', nivel: 9, semente: 330, minutos: 120, rende: 12, preco: 45, xp: 50, colheitas: 2, cor: '#9333ea', folha: '#16a34a' },
  { id: 'abacaxi', nome: 'Abacaxi', emoji: '🍍', nivel: 10, semente: 430, minutos: 180, rende: 8, preco: 85, xp: 65, colheitas: 1, cor: '#eab308', folha: '#0f766e' },
  { id: 'pimenta', nome: 'Pimenta', emoji: '🌶️', nivel: 11, semente: 520, minutos: 240, rende: 14, preco: 60, xp: 80, colheitas: 2, cor: '#dc2626', folha: '#15803d' },
]

export const cultura = (id: string | undefined): Cultura | undefined => CULTURAS.find((c) => c.id === id)

/** Experiência total para chegar ao nível n. */
export function xpDoNivel(n: number): number {
  let t = 0
  for (let k = 1; k < n; k++) t += Math.round(25 * Math.pow(k, 1.45))
  return t
}

/* ---------- Terreno: 6 colunas x 4 fileiras ---------- */
export const COLS = 6
export const FILAS = 4
export const TOTAL_CANTEIROS = COLS * FILAS
export const CANTEIROS_INICIAIS = 6

/** Preço e nível para abrir o canteiro i (os 6 primeiros já vêm abertos). */
export function precoTerreno(i: number): { moedas: number; nivel: number } {
  const k = i - CANTEIROS_INICIAIS
  return { moedas: Math.round((150 * Math.pow(1.32, k)) / 10) * 10, nivel: 2 + Math.floor(k * 0.75) }
}

/* ---------- Loja: itens ---------- */
export const ADUBO = { preco: 25, nivel: 1, ganho: 0.3 } // adianta 30% do crescimento
export const CACHORRO = { preco: 600, nivel: 4, nome: 'Totó' }

/* ---------- Vizinhos (fazendas que crescem sozinhas, no relógio) ---------- */
export interface Vizinho {
  id: string
  nome: string
  avatar: string
  nivel: number
  cachorro: string | null
  casa: string // cor do telhado
  frase: string
}

export const VIZINHOS: Vizinho[] = [
  { id: 'cida', nome: 'Tia Cida', avatar: '👵', nivel: 12, cachorro: 'Pipoca', casa: '#ec4899', frase: 'Quem mexer no meu morango vai se ver com a Pipoca!' },
  { id: 'ze', nome: 'Zé do Milho', avatar: '👨‍🌾', nivel: 7, cachorro: null, casa: '#eab308', frase: 'Passa lá em casa pra tomar um café!' },
  { id: 'bia', nome: 'Bia', avatar: '👧', nivel: 4, cachorro: null, casa: '#3b82f6', frase: 'Me ajuda a tirar o mato? Tô atolada de lição!' },
  { id: 'tonho', nome: 'Seu Tonho', avatar: '👴', nivel: 16, cachorro: 'Trovão', casa: '#65a30d', frase: 'Na minha roça ninguém pisa sem o Trovão saber.' },
  { id: 'juju', nome: 'Juju', avatar: '👩', nivel: 9, cachorro: null, casa: '#a855f7', frase: 'Aceito recados e uvas, nessa ordem :)' },
]

export const vizinho = (id: string | null | undefined): Vizinho | undefined => VIZINHOS.find((v) => v.id === id)
