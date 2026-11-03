// GERADO por backend-soudev (npm run protocolo). Não edite aqui: mude em backend-soudev/src/etp-protocolo.ts.

// Contrato das mensagens do Escape The Police online (soudev/games/escape-the-police) com a SalaEtp.
// Este arquivo é a fonte: `npm run protocolo` copia para o jogo (src/protocolo-etp.ts). Só tipos e constantes.

export type ModoEtp = '1x1' | '2x2';
export const MODOS_ETP: ModoEtp[] = ['1x1', '2x2'];
export const VAGAS_ETP: Record<ModoEtp, number> = { '1x1': 2, '2x2': 4 };

/** A = time azul, B = time vermelho. */
export type TimeEtp = 'A' | 'B';

export const VIDA_ETP = 5; // como no jogo original: 5 de vida; tiro no corpo tira 1, na cabeça 2
export const RODADAS_PARA_VENCER = 4; // melhor de 7
export const SEGUNDOS_RODADA = 120;
export const SEGUNDOS_CONTAGEM = 3;
export const SEGUNDOS_FIM_RODADA = 4;
export const SEGUNDOS_FIM_PARTIDA = 10;
export const GRANADAS_POR_RODADA = 1;
export const CADENCIA_MS = 200; // pistola semiautomática
export const ALTURA_OLHO = 1.7;

/** [x, y (pés), z, giro, inclinação da mira] */
export type PoseEtp = [number, number, number, number, number];

export type FaseEtp = 'espera' | 'contagem' | 'rodada' | 'fimRodada' | 'fim';

export interface JogadorEtp {
  id: string;
  nome: string;
  time: TimeEtp;
  vivo: boolean;
  vida: number;
  abates: number;
  mortes: number;
  online: boolean;
}

export interface EstadoEtp {
  fase: FaseEtp;
  /** Milissegundos que faltam para a fase acabar (0 = sem prazo). */
  resta: number;
  rodada: number;
  placar: Record<TimeEtp, number>;
  /** Quem levou a última rodada (null = empate) e, no fim, quem levou a partida. */
  ganhouRodada?: TimeEtp | null;
  vencedor?: TimeEtp | null;
  jogadores: JogadorEtp[];
}

export interface InfoSalaEtp {
  codigo: string;
  modo: ModoEtp;
  publica: boolean;
}

/* ---------- Jogo → servidor ---------- */

export type MsgClienteEtp =
  | { k: 'pose'; p: PoseEtp }
  /** Tiro na direção d; se o jogo viu acerto, diz em quem e se foi na cabeça. O servidor confere. */
  | { k: 'tiro'; d: [number, number, number]; alvo?: string; cabeca?: boolean }
  | { k: 'granada'; o: [number, number, number]; v: [number, number, number] }
  | { k: 'explosao'; p: [number, number, number] };

/* ---------- Servidor → jogo ---------- */

export type MsgServidorEtp =
  | { k: 'bemvindo'; eu: string; sala: InfoSalaEtp; estado: EstadoEtp; poses: Record<string, PoseEtp> }
  | { k: 'estado'; e: EstadoEtp }
  | { k: 'pose'; id: string; p: PoseEtp }
  | { k: 'nascer'; l: Record<string, [number, number, number]> } // x, z, giro
  | { k: 'tiro'; de: string; o: [number, number, number]; p: [number, number, number] }
  | { k: 'dano'; de: string; para: string; vida: number; cabeca: boolean }
  | { k: 'abate'; de: string; para: string; cabeca: boolean }
  | { k: 'granada'; de: string; o: [number, number, number]; v: [number, number, number] }
  | { k: 'explosao'; de: string; p: [number, number, number] }
  | { k: 'erro'; motivo: 'cheia' | 'fechada' | 'invalida' | 'duplicado' };

/** POST /etp/jogar { modo } → sala pública com vaga (ou nova). POST /etp/salas { modo } → sala privada nova. */
export interface RespostaSalaEtp {
  codigo: string;
  modo: ModoEtp;
}
