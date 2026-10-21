// A mesa: estado da rodada e as regras de quem pode fazer o quê. Roda só em quem hospeda (ou no jogo local);
// os convidados recebem o estado público (sem a carta virada da banca nem a ordem do sapato).

import { CORTE, type Carta, type Jogada, BARALHOS, ehBlackjack, estrategia, novoSapato, pontos, total } from './regras';

export type Tipo = 'vazio' | 'pessoa' | 'bot';
export type Resultado = 'blackjack' | 'ganhou' | 'empate' | 'perdeu' | 'estourou';
export type Fase = 'apostas' | 'jogadas' | 'banca' | 'fim';

export interface Mao {
  cartas: Carta[];
  aposta: number;
  dobrada: boolean;
  feita: boolean;
  dividida: boolean; // veio de uma divisão (21 com duas cartas não é blackjack)
  resultado: Resultado | null;
  premio: number; // quanto voltou para o saldo (aposta + ganho)
}

export interface Assento {
  tipo: Tipo;
  nome: string;
  saldo: number;
  aposta: number; // aposta da próxima rodada
  pronto: boolean;
  maos: Mao[];
  atual: number;
  dono: string; // '' = este aparelho; senão, o id do convidado na sala
  saindo: boolean; // saiu da sala no meio da rodada: o computador termina a mão por ele
}

export interface Estado {
  fase: Fase;
  assentos: Assento[];
  banca: Carta[];
  vez: number; // assento da vez; -1 = ninguém
  aviso: string;
  restantes: number;
  totalSapato: number;
  rodada: number;
}

export const SALDO_INICIAL = 1000;
export const APOSTA_MIN = 10;
export const APOSTA_MAX = 1000;
const PAUSA_BANCA = 800;
const PAUSA_BOT = 900;

const maoNova = (aposta: number, cartas: Carta[] = [], dividida = false): Mao => ({ cartas, aposta, dobrada: false, feita: false, dividida, resultado: null, premio: 0 });

/** O que o jogador do assento i pode fazer agora (vale também no aparelho de quem entrou na sala). */
export function opcoesDe(e: Estado, i: number): Jogada[] {
  if (e.fase !== 'jogadas' || e.vez !== i) return [];
  const a = e.assentos[i];
  const m = a.maos[a.atual];
  if (!m || m.feita) return [];
  const out: Jogada[] = ['pedir', 'parar'];
  if (m.cartas.length === 2 && a.saldo >= m.aposta) out.push('dobrar');
  if (m.cartas.length === 2 && pontos(m.cartas[0].valor) === pontos(m.cartas[1].valor) && a.maos.length < 4 && a.saldo >= m.aposta) out.push('dividir');
  return out;
}

export const assentoVazio = (): Assento => ({ tipo: 'vazio', nome: '', saldo: SALDO_INICIAL, aposta: 25, pronto: false, maos: [], atual: 0, dono: '', saindo: false });

export class Mesa {
  estado: Estado;
  private sapato: Carta[] = [];
  private proximoId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private aoMudar: (e: Estado) => void) {
    this.estado = { fase: 'apostas', assentos: [assentoVazio(), assentoVazio(), assentoVazio()], banca: [], vez: -1, aviso: '', restantes: 0, totalSapato: BARALHOS * 52, rodada: 0 };
    this.embaralhar();
  }

  private embaralhar(): void {
    this.sapato = novoSapato(this.proximoId);
    this.proximoId += this.sapato.length;
    this.estado.restantes = this.sapato.length;
  }

  private tirar(aberta = true): Carta {
    const c = this.sapato.pop() ?? (this.embaralhar(), this.sapato.pop()!);
    this.estado.restantes = this.sapato.length;
    return { ...c, aberta };
  }

  private mudou(): void {
    this.aoMudar(this.estado);
    this.agendarBots();
  }

  /** Cópia para os convidados: a carta virada da banca vai sem valor. */
  publico(): Estado {
    return { ...this.estado, banca: this.estado.banca.map((c) => (c.aberta ? c : { ...c, valor: '?', naipe: '?' })) };
  }

  /* ---------- Lugares ---------- */

  ocupar(i: number, tipo: Tipo, nome: string, dono = '', saldo?: number): void {
    const a = this.estado.assentos[i];
    Object.assign(a, { tipo, nome: nome.slice(0, 16) || `Jogador ${i + 1}`, dono, saindo: false, pronto: tipo === 'bot', saldo: saldo ?? a.saldo });
    if (tipo === 'vazio') Object.assign(a, assentoVazio());
    if (tipo === 'bot') this.prepararBots();
    this.mudou();
  }

  /** Quem sai no meio da rodada: o computador termina a mão e o lugar fica livre na próxima. */
  liberar(i: number): void {
    const a = this.estado.assentos[i];
    if (this.estado.fase === 'apostas' || this.estado.fase === 'fim' || !a.maos.length) {
      Object.assign(a, assentoVazio());
    } else {
      a.saindo = true;
      a.dono = '';
    }
    this.mudou();
  }

  /* ---------- Apostas ---------- */

  apostar(i: number, valor: number): void {
    const a = this.estado.assentos[i];
    if (this.estado.fase !== 'apostas' && this.estado.fase !== 'fim') return;
    a.aposta = Math.max(0, Math.min(Math.round(valor), APOSTA_MAX, a.saldo));
    a.pronto = false;
    this.mudou();
  }

  marcarPronto(i: number, pronto: boolean): void {
    const a = this.estado.assentos[i];
    if (pronto && a.aposta < APOSTA_MIN) return;
    a.pronto = pronto;
    this.mudou();
  }

  recarregar(i: number): void {
    const a = this.estado.assentos[i];
    if (a.saldo >= APOSTA_MIN) return;
    a.saldo = SALDO_INICIAL;
    a.aposta = 25;
    this.mudou();
  }

  ativos(): number[] {
    return this.estado.assentos.map((a, i) => (a.tipo !== 'vazio' && a.aposta >= APOSTA_MIN && a.aposta <= a.saldo ? i : -1)).filter((i) => i >= 0);
  }

  podeDistribuir(): boolean {
    const { assentos } = this.estado;
    const comGente = assentos.filter((a) => a.tipo !== 'vazio');
    return (this.estado.fase === 'apostas' || this.estado.fase === 'fim') && this.ativos().length > 0 && comGente.every((a) => a.pronto || a.saldo < APOSTA_MIN);
  }

  /* ---------- Rodada ---------- */

  distribuir(): void {
    if (!this.podeDistribuir()) return;
    const e = this.estado;
    e.aviso = '';
    if (this.sapato.length < e.totalSapato * (1 - CORTE)) {
      this.embaralhar();
      e.aviso = 'Sapato reembaralhado.';
    }
    for (const a of e.assentos) {
      if (a.saindo) Object.assign(a, assentoVazio());
      a.maos = [];
      a.atual = 0;
    }
    const jogam = this.ativos();
    for (const i of jogam) {
      const a = e.assentos[i];
      a.saldo -= a.aposta;
      a.maos = [maoNova(a.aposta)];
    }
    e.banca = [];
    e.rodada++;
    e.fase = 'jogadas';
    // Ordem real: uma carta para cada um, a aberta da banca, a segunda de cada um e a virada da banca.
    for (const i of jogam) e.assentos[i].maos[0].cartas.push(this.tirar());
    e.banca.push(this.tirar());
    for (const i of jogam) e.assentos[i].maos[0].cartas.push(this.tirar());
    e.banca.push(this.tirar(false));

    for (const i of jogam) {
      const m = e.assentos[i].maos[0];
      if (ehBlackjack(m.cartas)) m.feita = true;
    }
    // A banca confere se tem blackjack quando mostra ás ou carta de 10.
    if (pontos(e.banca[0].valor) >= 10 && ehBlackjack(e.banca.map((c) => ({ ...c, aberta: true })))) {
      e.banca[1] = { ...e.banca[1], aberta: true };
      e.aviso = 'A banca tem Blackjack.';
      this.liquidar();
      return;
    }
    e.vez = -1;
    this.proximaVez(0);
  }

  /** Passa para a próxima mão em aberto, a partir do assento "de". Sem ninguém, a banca joga. */
  private proximaVez(de: number): void {
    const e = this.estado;
    for (let i = de; i < e.assentos.length; i++) {
      const a = e.assentos[i];
      const k = a.maos.findIndex((m) => !m.feita);
      if (k >= 0) {
        a.atual = k;
        e.vez = i;
        this.mudou();
        return;
      }
    }
    e.vez = -1;
    e.fase = 'banca';
    this.mudou();
    this.agendar(() => this.passoBanca(), PAUSA_BANCA);
  }

  opcoes(i: number): Jogada[] {
    return opcoesDe(this.estado, i);
  }

  jogar(i: number, jogada: Jogada): void {
    if (!this.opcoes(i).includes(jogada)) return;
    const a = this.estado.assentos[i];
    const m = a.maos[a.atual];
    if (jogada === 'pedir') {
      m.cartas.push(this.tirar());
      if (total(m.cartas).valor >= 21) m.feita = true;
    } else if (jogada === 'parar') {
      m.feita = true;
    } else if (jogada === 'dobrar') {
      a.saldo -= m.aposta;
      m.aposta *= 2;
      m.dobrada = true;
      m.cartas.push(this.tirar());
      m.feita = true;
    } else if (jogada === 'dividir') {
      a.saldo -= m.aposta;
      const ases = m.cartas[0].valor === 'A';
      const segunda = maoNova(m.aposta, [m.cartas.pop()!], true);
      m.dividida = true;
      m.cartas.push(this.tirar());
      segunda.cartas.push(this.tirar());
      a.maos.splice(a.atual + 1, 0, segunda);
      // Ases divididos: uma carta para cada e acabou. Nas outras, 21 já fecha a mão.
      for (const x of [m, segunda]) if (ases || total(x.cartas).valor === 21) x.feita = true;
    }
    if (a.maos.every((x) => x.feita)) this.proximaVez(i + 1);
    else {
      a.atual = a.maos.findIndex((x) => !x.feita);
      this.mudou();
    }
  }

  private passoBanca(): void {
    const e = this.estado;
    if (e.fase !== 'banca') return;
    if (!e.banca[1].aberta) {
      e.banca[1] = { ...e.banca[1], aberta: true };
      this.mudou();
      this.agendar(() => this.passoBanca(), PAUSA_BANCA);
      return;
    }
    // Só compra se alguém ainda pode ganhar dela (mão de pé que não seja blackjack).
    const disputa = e.assentos.some((a) => a.maos.some((m) => total(m.cartas).valor <= 21 && !(ehBlackjack(m.cartas) && !m.dividida)));
    if (disputa && total(e.banca).valor < 17) {
      e.banca.push(this.tirar());
      this.mudou();
      this.agendar(() => this.passoBanca(), PAUSA_BANCA);
      return;
    }
    this.liquidar();
  }

  private liquidar(): void {
    const e = this.estado;
    const banca = total(e.banca).valor;
    const bancaBJ = ehBlackjack(e.banca);
    for (const a of e.assentos) {
      for (const m of a.maos) {
        const t = total(m.cartas).valor;
        const bj = ehBlackjack(m.cartas) && !m.dividida;
        if (t > 21) [m.resultado, m.premio] = ['estourou', 0];
        else if (bj && !bancaBJ) [m.resultado, m.premio] = ['blackjack', m.aposta * 2.5];
        else if (bancaBJ) [m.resultado, m.premio] = bj ? ['empate', m.aposta] : ['perdeu', 0];
        else if (banca > 21 || t > banca) [m.resultado, m.premio] = ['ganhou', m.aposta * 2];
        else if (t === banca) [m.resultado, m.premio] = ['empate', m.aposta];
        else [m.resultado, m.premio] = ['perdeu', 0];
        a.saldo += m.premio;
      }
      // A próxima rodada começa com a mesma aposta (se ainda couber no saldo).
      a.pronto = false;
      if (a.aposta > a.saldo) a.aposta = Math.max(0, Math.min(a.saldo, 25));
    }
    this.prepararBots();
    e.fase = 'fim';
    e.vez = -1;
    this.mudou();
  }

  /* ---------- Computador nos lugares "bot" ---------- */

  private agendar(fn: () => void, ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
    }, ms);
  }

  private agendarBots(): void {
    const e = this.estado;
    if (e.fase !== 'jogadas' || e.vez < 0 || this.timer) return;
    const a = e.assentos[e.vez];
    if (a.tipo !== 'bot' && !a.saindo) return;
    const vez = e.vez;
    this.agendar(() => {
      if (this.estado.vez !== vez) return;
      const m = a.maos[a.atual];
      const ops = this.opcoes(vez);
      const j = a.saindo ? 'parar' : estrategia(m.cartas, e.banca[0], ops.includes('dobrar'), ops.includes('dividir'));
      this.jogar(vez, ops.includes(j) ? j : 'parar');
    }, PAUSA_BOT);
  }

  /** Bots apostam sozinhos; quem ficou sem saldo recomeça com o saldo inicial. */
  prepararBots(): void {
    for (const a of this.estado.assentos) {
      if (a.tipo !== 'bot') continue;
      if (a.saldo < APOSTA_MIN) a.saldo = SALDO_INICIAL;
      a.aposta = Math.min(a.saldo, [25, 25, 50, 100][Math.floor(Math.random() * 4)]);
      a.pronto = true;
    }
  }

  parar(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
