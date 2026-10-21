// Gera a sequência da fase a partir da batida. Mesma semente = mesma fase (o recorde vale para todo mundo).
// Corpo: u para a direita e v para cima, em "larguras de ombro" (o tamanho da pessoa na câmera não importa).

export type Nivel = 'facil' | 'normal' | 'dificil';
export type Modo = 'sabres' | 'desvio';
export type Direcao = 'cima' | 'baixo' | 'esq' | 'dir' | 'qualquer';
export type Mao = 'esq' | 'dir';

export interface Nota {
  id: number;
  t: number; // segundo em que chega na linha de corte
  coluna: number; // 0..3
  linha: number; // 0..2
  tipo: Mao | 'bomba';
  dir: Direcao;
}

export interface Obstaculo {
  id: number;
  t: number;
  tipo: 'abaixar' | 'esq' | 'dir' | 'orbe';
  coluna: number;
  linha: number;
}

export interface Config {
  bpm: number;
  velocidade: number; // metros por segundo dos blocos
  duracao: number; // segundos de música
}

export const NIVEIS: Record<Nivel, Config & { nome: string }> = {
  facil: { nome: 'Fácil', bpm: 100, velocidade: 8, duracao: 96 },
  normal: { nome: 'Normal', bpm: 118, velocidade: 10, duracao: 106 },
  dificil: { nome: 'Difícil', bpm: 132, velocidade: 12.5, duracao: 116 },
};

/** Posição das colunas e linhas no corpo (larguras de ombro a partir do meio dos ombros). */
export const COLUNAS = [-1.85, -0.62, 0.62, 1.85];
export const LINHAS = [-0.95, 0.35, 1.6];

export const VETOR: Record<Direcao, [number, number]> = { cima: [0, 1], baixo: [0, -1], esq: [-1, 0], dir: [1, 0], qualquer: [0, 0] };

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

const SEMENTE: Record<Nivel, number> = { facil: 11, normal: 23, dificil: 37 };

export function gerarSabres(nivel: Nivel): Nota[] {
  const cfg = NIVEIS[nivel];
  const rnd = aleatorio(SEMENTE[nivel]);
  const b = 60 / cfg.bpm;
  const totalBatidas = Math.floor(cfg.duracao / b);
  const passo = nivel === 'facil' ? 2 : 1;
  const intervaloMao = { facil: 1.1, normal: 0.42, dificil: 0.28 }[nivel];
  const chanceQualquer = { facil: 0.35, normal: 0.12, dificil: 0.05 }[nivel];
  const chanceLado = { facil: 0, normal: 0.1, dificil: 0.22 }[nivel];
  const chanceDupla = { facil: 0.08, normal: 0.22, dificil: 0.32 }[nivel];
  const chanceBomba = { facil: 0, normal: 0.07, dificil: 0.1 }[nivel];
  const ultima: Record<Mao, { t: number; dir: Direcao }> = { esq: { t: -9, dir: 'cima' }, dir: { t: -9, dir: 'cima' } };
  const notas: Nota[] = [];
  let id = 0;
  let maoAnterior: Mao = 'dir';

  // Próxima direção que flui do último golpe daquela mão (desce, sobe, desce…).
  const direcao = (mao: Mao): Direcao => {
    const u = ultima[mao].dir;
    if (rnd() < chanceQualquer) return 'qualquer';
    if (u === 'esq') return 'dir';
    if (u === 'dir') return 'esq';
    if (rnd() < chanceLado) return mao === 'esq' ? 'esq' : 'dir';
    return u === 'baixo' ? 'cima' : 'baixo';
  };
  const posicao = (mao: Mao, dir: Direcao): [number, number] => {
    const coluna = mao === 'esq' ? (rnd() < 0.7 ? 0 : 1) : rnd() < 0.7 ? 3 : 2;
    const linha = dir === 'baixo' ? (rnd() < 0.6 ? 2 : 1) : dir === 'cima' ? (rnd() < 0.6 ? 0 : 1) : 1;
    return [coluna, linha];
  };
  const colocar = (mao: Mao, t: number): void => {
    if (t - ultima[mao].t < intervaloMao) return;
    const dir = direcao(mao);
    const [coluna, linha] = posicao(mao, dir);
    notas.push({ id: id++, t, coluna, linha, tipo: mao, dir });
    ultima[mao] = { t, dir: dir === 'qualquer' ? (ultima[mao].dir === 'baixo' ? 'cima' : 'baixo') : dir };
  };

  // Começa depois de 2 compassos e para 1 compasso antes do fim.
  for (let batida = 8; batida < totalBatidas - 4; batida += passo) {
    const extras = nivel === 'dificil' && rnd() < 0.35 ? [0, 0.5] : [0];
    for (const meia of extras) {
      const t = (batida + meia) * b;
      if (rnd() < chanceDupla) {
        colocar('esq', t);
        colocar('dir', t);
      } else {
        const mao: Mao = rnd() < 0.68 ? (maoAnterior === 'esq' ? 'dir' : 'esq') : maoAnterior;
        colocar(mao, t);
        maoAnterior = mao;
      }
      if (rnd() < chanceBomba) {
        const ocupadas = notas.filter((n) => Math.abs(n.t - t) < 0.5).map((n) => n.coluna);
        const livres = [0, 1, 2, 3].filter((c) => !ocupadas.includes(c));
        if (livres.length) notas.push({ id: id++, t: t + b / 2, coluna: livres[Math.floor(rnd() * livres.length)], linha: Math.floor(rnd() * 3), tipo: 'bomba', dir: 'qualquer' });
      }
    }
  }
  return notas.sort((x, y) => x.t - y.t);
}

export function gerarDesvio(nivel: Nivel): Obstaculo[] {
  const cfg = NIVEIS[nivel];
  const rnd = aleatorio(SEMENTE[nivel] + 100);
  const b = 60 / cfg.bpm;
  const totalBatidas = Math.floor(cfg.duracao / b);
  const passo = { facil: 4, normal: 3, dificil: 2 }[nivel];
  const obst: Obstaculo[] = [];
  let id = 0;
  let anterior: Obstaculo['tipo'] | null = null;
  for (let batida = 8; batida < totalBatidas - 4; batida += passo) {
    const t = batida * b;
    // Não repete o mesmo desvio mais de duas vezes seguidas e alterna lados com mais frequência.
    const opcoes: Obstaculo['tipo'][] = ['abaixar', 'esq', 'dir'];
    let tipo = opcoes[Math.floor(rnd() * 3)];
    if (tipo === anterior && rnd() < 0.6) tipo = opcoes[(opcoes.indexOf(tipo) + 1 + Math.floor(rnd() * 2)) % 3];
    obst.push({ id: id++, t, tipo, coluna: 0, linha: 0 });
    anterior = tipo;
    // Orbes para pegar com a mão entre um obstáculo e outro.
    if (rnd() < (nivel === 'facil' ? 0.5 : 0.7)) {
      const lado = tipo === 'esq' ? 3 : tipo === 'dir' ? 0 : Math.floor(rnd() * 4);
      obst.push({ id: id++, t: t + (passo / 2) * b, tipo: 'orbe', coluna: lado, linha: 1 + Math.floor(rnd() * 2) });
    }
  }
  return obst.sort((x, y) => x.t - y.t);
}
