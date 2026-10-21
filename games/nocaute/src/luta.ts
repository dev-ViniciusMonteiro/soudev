// Regras da luta: soco sai, chega depois de IMPACTO e é conferido contra a defesa de quem recebe naquela hora.
// Guarda segura soco na cabeça (o uppercut passa um pouco), esquiva e abaixar fazem o soco na cabeça passar direto,
// soco no corpo passa pela guarda mas tira fôlego. Vida zero = queda; levanta com os braços para cima antes do 10.
// 3 quedas ou contagem até 10 = nocaute. 3 rounds de 60 s; sem nocaute, ganha quem tirou mais vida.

import type { Alvo, Entrada, Mao, Postura, Soco, TipoSoco } from './deteccao';

export const IMPACTO = 0.18; // segundos do soco sair até chegar
const VOLTA = 0.38; // braço de volta à guarda
export const ROUNDS = 3;
export const TEMPO_ROUND = 60;
const INTERVALO = 8;
const DANO: Record<TipoSoco, number> = { jab: 5, direto: 8, gancho: 10, uppercut: 12 };
const CUSTO = 7; // fôlego por soco

export type Nivel = 'facil' | 'medio' | 'dificil';
export type Resultado = 'acerto' | 'bloqueio' | 'esquiva';

export interface SocoEmCurso extends Soco {
  t0: number;
  resolvido: boolean;
  resultado: Resultado | null;
}

export interface Lutador {
  nome: string;
  vida: number;
  folego: number;
  quedas: number;
  pontos: number; // vida tirada do adversário
  acertos: number;
  socos: number;
  postura: Postura;
  soco: SocoEmCurso | null;
  preparando: { mao: Mao; tipo: TipoSoco; alvo: Alvo; ate: number } | null; // só a máquina avisa o golpe
  atingidoEm: number;
  caidoEm: number | null;
}

export type Fase = 'apresentacao' | 'luta' | 'queda' | 'intervalo' | 'fim';

export interface Eventos {
  soco(quem: 0 | 1, s: SocoEmCurso): void;
  resultado(quem: 0 | 1, s: SocoEmCurso, dano: number): void; // quem bateu
  queda(quem: 0 | 1): void;
  contagem(n: number): void;
  levantou(quem: 0 | 1): void;
  sino(): void;
  fim(vencedor: 0 | 1 | null, motivo: 'nocaute' | 'pontos' | 'empate'): void;
}

const novoLutador = (nome: string): Lutador => ({
  nome,
  vida: 100,
  folego: 100,
  quedas: 0,
  pontos: 0,
  acertos: 0,
  socos: 0,
  postura: { guarda: false, esquiva: 0, abaixado: false, bracosAlto: false },
  soco: null,
  preparando: null,
  atingidoEm: -9,
  caidoEm: null,
});

/* ---------- Máquina ---------- */

const PERFIL: Record<Nivel, { aviso: number; pausa: [number, number]; reage: number; guarda: number; combo: number; forca: number }> = {
  facil: { aviso: 0.6, pausa: [1.4, 2.4], reage: 0.2, guarda: 0.25, combo: 0, forca: 0.6 },
  medio: { aviso: 0.45, pausa: [0.9, 1.7], reage: 0.4, guarda: 0.35, combo: 0.25, forca: 0.8 },
  dificil: { aviso: 0.36, pausa: [0.7, 1.3], reage: 0.5, guarda: 0.4, combo: 0.35, forca: 1 },
};

export class Maquina {
  private proxima = 1.5;
  private guardaAte = 0;
  private esquivaAte = 0;
  private esquivaLado: -1 | 1 = 1;
  private ultimoSocoVisto = -9;
  private comboPendente: { em: number; tipo: TipoSoco; alvo: Alvo } | null = null;

  constructor(
    readonly nivel: Nivel,
    private rnd: () => number = Math.random,
  ) {}

  /** Decide o que a máquina faz agora (eu = a máquina, outro = você). */
  decidir(t: number, eu: Lutador, outro: Lutador): Entrada {
    const p = PERFIL[this.nivel];
    const socos: Soco[] = [];
    // Reage ao seu soco: guarda ou esquiva, conforme o nível.
    if (outro.soco && outro.soco.t0 !== this.ultimoSocoVisto) {
      this.ultimoSocoVisto = outro.soco.t0;
      if (!eu.preparando && this.rnd() < p.reage) {
        if (outro.soco.alvo === 'cabeca' && this.rnd() < 0.4) {
          this.esquivaAte = t + 0.5;
          this.esquivaLado = this.rnd() < 0.5 ? -1 : 1;
        } else this.guardaAte = t + 0.6;
      }
    }
    // Golpe avisado: depois do aviso, o soco sai.
    if (eu.preparando && t >= eu.preparando.ate) {
      socos.push({ mao: eu.preparando.mao, tipo: eu.preparando.tipo, alvo: eu.preparando.alvo, forca: p.forca });
      eu.preparando = null;
      this.proxima = t + p.pausa[0] + this.rnd() * (p.pausa[1] - p.pausa[0]);
      if (this.rnd() < p.combo) this.comboPendente = { em: t + 0.3, tipo: this.rnd() < 0.5 ? 'direto' : 'gancho', alvo: this.rnd() < 0.7 ? 'cabeca' : 'corpo' };
    } else if (this.comboPendente && t >= this.comboPendente.em) {
      socos.push({ mao: 'dir', tipo: this.comboPendente.tipo, alvo: this.comboPendente.alvo, forca: p.forca });
      this.comboPendente = null;
    } else if (!eu.preparando && t >= this.proxima && t > this.guardaAte && !eu.soco) {
      // Hora de atacar (ou de fechar a guarda um pouco).
      if (this.rnd() < p.guarda * 0.5) {
        this.guardaAte = t + 0.8 + this.rnd();
        this.proxima = this.guardaAte + 0.2;
      } else {
        const tipos: TipoSoco[] = ['jab', 'jab', 'direto', 'gancho', 'uppercut'];
        const tipo = tipos[Math.floor(this.rnd() * tipos.length)];
        // Se você vive de guarda alta, a máquina vai mais no corpo.
        const alvo: Alvo = this.rnd() < (outro.postura.guarda ? 0.6 : 0.25) ? 'corpo' : 'cabeca';
        eu.preparando = { mao: tipo === 'jab' || tipo === 'uppercut' ? 'esq' : 'dir', tipo, alvo, ate: t + p.aviso };
      }
    }
    return {
      postura: { guarda: t < this.guardaAte, esquiva: t < this.esquivaAte ? this.esquivaLado : 0, abaixado: false, bracosAlto: false },
      socos,
    };
  }

  /** A máquina caída levanta numa contagem aleatória (cada vez mais tarde). */
  contagemParaLevantar(quedas: number): number {
    return Math.min(9, 3 + quedas * 2 + Math.floor(this.rnd() * 3));
  }
}

/* ---------- Luta ---------- */

export class Luta {
  lutadores: [Lutador, Lutador];
  fase: Fase = 'apresentacao';
  round = 1;
  relogio = TEMPO_ROUND;
  t = 0;
  private faseDesde = 0;
  private caido: 0 | 1 | null = null;
  private ultimaContagem = 0;
  private levantaNa = 10;
  vencedor: 0 | 1 | null = null;
  motivo: 'nocaute' | 'pontos' | 'empate' | null = null;

  constructor(
    nomes: [string, string],
    private ev: Eventos,
    readonly maquina: Maquina | null = null,
  ) {
    this.lutadores = [novoLutador(nomes[0]), novoLutador(nomes[1])];
  }

  private mudar(f: Fase): void {
    this.fase = f;
    this.faseDesde = this.t;
  }

  passo(dt: number, entradas: [Entrada | null, Entrada | null]): void {
    this.t += dt;
    const t = this.t;
    const [a, b] = this.lutadores;
    if (this.maquina && this.fase === 'luta') entradas[1] = this.maquina.decidir(t, b, a);

    if (this.fase === 'apresentacao') {
      if (t - this.faseDesde > 2.5) {
        this.ev.sino();
        this.mudar('luta');
      }
      return;
    }
    if (this.fase === 'fim') return;

    // Fôlego volta aos poucos (mais devagar se estiver apanhando).
    for (const l of this.lutadores) l.folego = Math.min(100, l.folego + dt * (t - l.atingidoEm < 1 ? 6 : 14));

    if (this.fase === 'intervalo') {
      if (t - this.faseDesde > INTERVALO) {
        this.round++;
        this.relogio = TEMPO_ROUND;
        this.ev.sino();
        this.mudar('luta');
      }
      return;
    }

    if (this.fase === 'queda') {
      this.passoQueda(entradas);
      return;
    }

    // Luta.
    this.relogio -= dt;
    for (const q of [0, 1] as const) {
      const eu = this.lutadores[q];
      const e = entradas[q];
      if (e) eu.postura = e.postura;
      // Soco novo: só se o braço já voltou e não acabou de levar um golpe.
      if (e?.socos.length && (!eu.soco || t - eu.soco.t0 > VOLTA * 0.7) && t - eu.atingidoEm > 0.25) {
        const s = e.socos[0];
        eu.soco = { ...s, t0: t, resolvido: false, resultado: null };
        eu.socos++;
        eu.folego = Math.max(0, eu.folego - CUSTO);
        this.ev.soco(q, eu.soco);
      }
      if (eu.soco && !eu.soco.resolvido && t - eu.soco.t0 >= IMPACTO) this.resolver(q);
      if (eu.soco && t - eu.soco.t0 > VOLTA) eu.soco = null;
      if (this.fase !== 'luta') return;
    }

    if (this.relogio <= 0) {
      this.ev.sino();
      if (this.round >= ROUNDS) this.decidirPorPontos();
      else {
        for (const l of this.lutadores) {
          l.vida = Math.min(100, l.vida + 20);
          l.folego = 100;
          l.soco = null;
          l.preparando = null;
        }
        this.mudar('intervalo');
      }
    }
  }

  private resolver(q: 0 | 1): void {
    const atk = this.lutadores[q];
    const def = this.lutadores[q === 0 ? 1 : 0];
    const s = atk.soco!;
    s.resolvido = true;
    const fraco = atk.folego < 12 ? 0.5 : 1;
    let dano = DANO[s.tipo] * (0.6 + 0.4 * s.forca) * fraco;
    const p = def.postura;
    if (s.alvo === 'cabeca' && (p.esquiva !== 0 || p.abaixado)) {
      s.resultado = 'esquiva';
      atk.folego = Math.max(0, atk.folego - 4); // errar cansa
      dano = 0;
    } else if (s.alvo === 'cabeca' && p.guarda) {
      s.resultado = 'bloqueio';
      dano = s.tipo === 'uppercut' ? dano * 0.4 : 1;
    } else {
      s.resultado = 'acerto';
      if (s.alvo === 'corpo') {
        dano *= 0.8;
        def.folego = Math.max(0, def.folego - 10);
      }
      def.atingidoEm = this.t;
      def.preparando = null; // levou golpe: perde o soco que estava preparando
      atk.acertos++;
    }
    dano = Math.round(dano * 10) / 10;
    def.vida = Math.max(0, def.vida - dano);
    atk.pontos += dano;
    this.ev.resultado(q, s, dano);
    if (def.vida <= 0) this.cair(q === 0 ? 1 : 0);
  }

  private cair(q: 0 | 1): void {
    const l = this.lutadores[q];
    l.quedas++;
    l.caidoEm = this.t;
    l.soco = null;
    l.preparando = null;
    this.caido = q;
    this.ultimaContagem = 0;
    this.levantaNa = this.maquina && q === 1 ? this.maquina.contagemParaLevantar(l.quedas) : 10;
    this.ev.queda(q);
    if (l.quedas >= 3) {
      this.terminar(q === 0 ? 1 : 0, 'nocaute');
      return;
    }
    this.mudar('queda');
  }

  /** Contagem do juiz; quem caiu levanta com os braços para cima (a máquina, na hora dela). */
  private passoQueda(entradas: [Entrada | null, Entrada | null]): void {
    const q = this.caido!;
    const n = Math.floor(this.t - this.faseDesde);
    if (n > this.ultimaContagem && n <= 10) {
      this.ultimaContagem = n;
      this.ev.contagem(n);
    }
    const eMaquina = this.maquina && q === 1;
    const levantou = n >= 2 && (eMaquina ? n >= this.levantaNa : Boolean(entradas[q]?.postura.bracosAlto));
    if (levantou && n < 10) {
      const l = this.lutadores[q];
      l.vida = Math.max(20, 45 - l.quedas * 10);
      l.caidoEm = null;
      this.caido = null;
      this.ev.levantou(q);
      this.mudar('luta');
    } else if (n >= 10) this.terminar(q === 0 ? 1 : 0, 'nocaute');
  }

  private decidirPorPontos(): void {
    const [a, b] = this.lutadores;
    const dif = a.pontos - b.pontos;
    if (Math.abs(dif) < 1) this.terminar(null, 'empate');
    else this.terminar(dif > 0 ? 0 : 1, 'pontos');
  }

  private terminar(v: 0 | 1 | null, motivo: 'nocaute' | 'pontos' | 'empate'): void {
    this.vencedor = v;
    this.motivo = motivo;
    this.mudar('fim');
    this.ev.fim(v, motivo);
  }

  /** Quanto falta para o soco preparado da máquina sair (0..1), para desenhar o aviso. */
  avisoDe(q: 0 | 1): number {
    const p = this.lutadores[q].preparando;
    if (!p || !this.maquina) return 0;
    const total = PERFIL[this.maquina.nivel].aviso;
    return Math.max(0, Math.min(1, 1 - (p.ate - this.t) / total));
  }
}
