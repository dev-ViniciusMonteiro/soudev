// Poses do muro, descritas pelos ângulos dos braços na tela (0° = direita, 90° = para baixo, 180° = esquerda, 270° = para cima).
// "esq" é o braço que aparece à esquerda da tela (o esquerdo da pessoa, porque a imagem é espelhada).
// Comparar ângulos (e não posições) faz a pose valer para qualquer altura e distância da câmera.

export interface Pose {
  nome: string;
  esq: [number, number]; // [braço, antebraço]
  dir: [number, number];
  inclinacao?: number; // ângulo da linha dos ombros (negativo = inclinado para a esquerda da tela)
}

export const POSES: Pose[] = [
  { nome: 'T', esq: [180, 180], dir: [0, 0] },
  { nome: 'Y', esq: [225, 225], dir: [315, 315] },
  { nome: 'Braços para cima', esq: [262, 266], dir: [278, 274] },
  { nome: 'Goleiro', esq: [180, 270], dir: [0, 270] },
  { nome: 'Mãos na cintura', esq: [140, 40], dir: [40, 140] },
  { nome: 'Mãos na cabeça', esq: [215, 320], dir: [325, 220] },
  { nome: 'Relógio', esq: [270, 270], dir: [0, 0] },
  { nome: 'Arqueiro', esq: [180, 180], dir: [0, 180] },
  { nome: 'Super-herói', esq: [140, 40], dir: [280, 276] },
  { nome: 'Dab', esq: [215, 215], dir: [195, 235] },
  { nome: 'Árvore inclinada', esq: [250, 250], dir: [290, 290], inclinacao: -16 },
  { nome: 'Ponte para a direita', esq: [300, 300], dir: [330, 330], inclinacao: 16 },
  { nome: 'Cabide', esq: [180, 90], dir: [0, 90] },
  { nome: 'Asas caídas', esq: [180, 135], dir: [0, 45] },
];

/** Diferença entre dois ângulos em graus (0..180). */
export function difAngulo(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

export const anguloDe = (ax: number, ay: number, bx: number, by: number): number => ((Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 360) % 360;
