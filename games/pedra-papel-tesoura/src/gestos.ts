// Reconhece pedra, papel e tesoura pelos 21 pontos da mão (MediaPipe Hands).
// Um dedo está esticado quando a ponta fica bem mais longe do pulso que a articulação do meio:
// vale com a mão virada para qualquer lado. O polegar fica de fora (é o que mais engana).

import type { Ponto } from '../../comum/camera';

export type Gesto = 'pedra' | 'papel' | 'tesoura';
export const EMOJI: Record<Gesto, string> = { pedra: '✊', papel: '✋', tesoura: '✌️' };
export const NOME: Record<Gesto, string> = { pedra: 'Pedra', papel: 'Papel', tesoura: 'Tesoura' };
export const GANHA_DE: Record<Gesto, Gesto> = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };
export const PERDE_PARA: Record<Gesto, Gesto> = { pedra: 'papel', papel: 'tesoura', tesoura: 'pedra' };

const DEDOS: [number, number][] = [
  [6, 8], // indicador: articulação do meio, ponta
  [10, 12], // médio
  [14, 16], // anelar
  [18, 20], // mínimo
];

/** Quais dedos estão esticados (indicador, médio, anelar, mínimo). aspecto = largura/altura do vídeo. */
export function dedosEsticados(m: Ponto[], aspecto: number): boolean[] {
  const d = (a: Ponto, b: Ponto): number => Math.hypot((a.x - b.x) * aspecto, a.y - b.y);
  const pulso = m[0];
  return DEDOS.map(([meio, ponta]) => d(pulso, m[ponta]) > d(pulso, m[meio]) * 1.12);
}

export function reconhecer(m: Ponto[], aspecto: number): Gesto | null {
  const [ind, med, anel, min] = dedosEsticados(m, aspecto);
  const n = [ind, med, anel, min].filter(Boolean).length;
  if (n === 0) return 'pedra';
  if (ind && med && !anel && !min) return 'tesoura';
  if (n >= 3 && med && anel) return 'papel';
  return null;
}

export function resultado(a: Gesto, b: Gesto): 1 | 0 | -1 {
  if (a === b) return 0;
  return GANHA_DE[a] === b ? 1 : -1;
}

/**
 * Máquina "esperta": aprende os seus hábitos. Conta o que você costuma jogar depois de cada jogada
 * (cadeia de Markov) e depois de ganhar ou perder; joga o que vence a sua jogada mais provável.
 * Um pouco de sorte no meio para não ficar previsível.
 */
export class Adversario {
  private depoisDe: Record<string, Record<Gesto, number>> = {};
  private historico: { voce: Gesto; maquina: Gesto }[] = [];

  constructor(readonly esperta: boolean) {}

  escolher(): Gesto {
    const todos: Gesto[] = ['pedra', 'papel', 'tesoura'];
    const sorte = todos[Math.floor(Math.random() * 3)];
    const ultima = this.historico[this.historico.length - 1];
    if (!this.esperta || !ultima || Math.random() < 0.2) return sorte;
    const chave = `${ultima.voce}:${resultado(ultima.voce, ultima.maquina)}`;
    const cont = this.depoisDe[chave];
    if (!cont) return sorte;
    const provavel = todos.reduce((a, b) => (cont[b] > cont[a] ? b : a));
    return cont[provavel] ? PERDE_PARA[provavel] : sorte;
  }

  registrar(voce: Gesto, maquina: Gesto): void {
    const ultima = this.historico[this.historico.length - 1];
    if (ultima) {
      const chave = `${ultima.voce}:${resultado(ultima.voce, ultima.maquina)}`;
      this.depoisDe[chave] ??= { pedra: 0, papel: 0, tesoura: 0 };
      this.depoisDe[chave][voce]++;
    }
    this.historico.push({ voce, maquina });
  }
}
