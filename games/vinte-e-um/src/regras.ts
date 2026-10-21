// Regras do 21 (blackjack): baralho, valor da mão e estratégia básica (para a dica e para os jogadores do computador).
// Mesa: 6 baralhos, banca para em todo 17 (S17), blackjack paga 3 para 2, dobra em quaisquer duas cartas,
// dobra depois de dividir, divide até 4 mãos, ases divididos recebem uma carta só.

export type Naipe = 'E' | 'C' | 'O' | 'P'; // espadas, copas, ouros, paus
export type Valor = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Carta {
  id: number;
  valor: Valor | '?'; // '?' = carta virada que o convidado ainda não pode ver
  naipe: Naipe | '?';
  aberta: boolean;
}

export const NAIPES: Naipe[] = ['E', 'C', 'O', 'P'];
export const VALORES: Valor[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SIMBOLO: Record<Naipe, string> = { E: '♠', C: '♥', O: '♦', P: '♣' };
export const vermelho = (n: Naipe | '?'): boolean => n === 'C' || n === 'O';

export const BARALHOS = 6;
export const CORTE = 0.75; // reembaralha quando 75% do sapato já saiu

export const pontos = (v: Valor | '?'): number => (v === 'A' ? 11 : v === 'J' || v === 'Q' || v === 'K' ? 10 : v === '?' ? 0 : Number(v));

/** Total da mão contando o ás como 1 ou 11. "macia" = tem um ás valendo 11. */
export function total(cartas: Carta[]): { valor: number; macia: boolean } {
  let soma = 0;
  let ases = 0;
  for (const c of cartas) {
    if (!c.aberta) continue;
    soma += pontos(c.valor);
    if (c.valor === 'A') ases++;
  }
  while (soma > 21 && ases > 0) {
    soma -= 10;
    ases--;
  }
  return { valor: soma, macia: ases > 0 };
}

export const ehBlackjack = (cartas: Carta[]): boolean => cartas.length === 2 && cartas.every((c) => c.aberta) && total(cartas).valor === 21;

export function textoTotal(cartas: Carta[]): string {
  if (!cartas.some((c) => c.aberta)) return '';
  if (ehBlackjack(cartas)) return '21 · Blackjack';
  const t = total(cartas);
  if (t.valor > 21) return `${t.valor} · estourou`;
  return t.macia && t.valor < 21 ? `${t.valor - 10} ou ${t.valor}` : String(t.valor);
}

/** Sapato com 6 baralhos embaralhado (Fisher-Yates com números do crypto). */
export function novoSapato(primeiroId = 0): Carta[] {
  const cartas: Carta[] = [];
  let id = primeiroId;
  for (let b = 0; b < BARALHOS; b++) for (const naipe of NAIPES) for (const valor of VALORES) cartas.push({ id: id++, valor, naipe, aberta: true });
  const aleatorio = new Uint32Array(cartas.length);
  crypto.getRandomValues(aleatorio);
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = aleatorio[i] % (i + 1);
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }
  return cartas;
}

/* ---------- Estratégia básica (6 baralhos, S17, dobra depois de dividir) ---------- */

export type Jogada = 'pedir' | 'parar' | 'dobrar' | 'dividir';

export const NOME_JOGADA: Record<Jogada, string> = { pedir: 'Pedir carta', parar: 'Parar', dobrar: 'Dobrar', dividir: 'Dividir' };

/** A melhor jogada pela estratégia básica. cartaBanca: a carta aberta da banca. */
export function estrategia(cartas: Carta[], cartaBanca: Carta, podeDobrar: boolean, podeDividir: boolean): Jogada {
  const b = pontos(cartaBanca.valor) === 11 ? 11 : pontos(cartaBanca.valor); // 2..11 (11 = ás)
  const entre = (a: number, z: number): boolean => b >= a && b <= z;
  const dobraOu = (senao: Jogada): Jogada => (podeDobrar ? 'dobrar' : senao);

  if (podeDividir && cartas.length === 2) {
    const p = pontos(cartas[0].valor);
    if (p === 11 || p === 8) return 'dividir';
    if (p === 9 && (entre(2, 6) || b === 8 || b === 9)) return 'dividir';
    if (p === 7 && entre(2, 7)) return 'dividir';
    if (p === 6 && entre(2, 6)) return 'dividir';
    if (p === 4 && entre(5, 6)) return 'dividir';
    if ((p === 2 || p === 3) && entre(2, 7)) return 'dividir';
  }

  const { valor, macia } = total(cartas);
  if (macia) {
    if (valor >= 19) return 'parar';
    if (valor === 18) return entre(3, 6) ? dobraOu('parar') : b === 2 || b === 7 || b === 8 ? 'parar' : 'pedir';
    if (valor === 17) return entre(3, 6) ? dobraOu('pedir') : 'pedir';
    if (valor === 15 || valor === 16) return entre(4, 6) ? dobraOu('pedir') : 'pedir';
    if (valor === 13 || valor === 14) return entre(5, 6) ? dobraOu('pedir') : 'pedir';
    return 'pedir';
  }
  if (valor >= 17) return 'parar';
  if (valor >= 13) return entre(2, 6) ? 'parar' : 'pedir';
  if (valor === 12) return entre(4, 6) ? 'parar' : 'pedir';
  if (valor === 11) return b <= 10 ? dobraOu('pedir') : 'pedir';
  if (valor === 10) return entre(2, 9) ? dobraOu('pedir') : 'pedir';
  if (valor === 9) return entre(3, 6) ? dobraOu('pedir') : 'pedir';
  return 'pedir';
}
