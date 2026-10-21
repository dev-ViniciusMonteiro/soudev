// Regras da partida: transforma os pontos da câmera em posições do corpo, confere cortes e desvios,
// conta pontos, combo e energia, e pausa sozinho quando perde você de vista.

import { Cena, COR, type Ponto2 } from './cena';
import { COLUNAS, LINHAS, NIVEIS, VETOR, type Mao, type Modo, type Nivel, type Nota, type Obstaculo, gerarDesvio, gerarSabres } from './fases';
import type { Musica } from './musica';
import { P, type Ponto, type Rastreador } from './rastreio';

/** Medidas da pessoa na calibração (em pixels da câmera, já espelhados). */
export interface Calibracao {
  escala: number; // largura dos ombros
  cx: number; // meio dos ombros
  cy: number;
  nariz: number; // altura do nariz em pé
}

export interface Placar {
  pontos: number;
  combo: number;
  maiorCombo: number;
  mult: number;
  energia: number;
  acertos: number;
  total: number;
  progresso: number;
}

export interface Hud {
  placar(p: Placar): void;
  popup(texto: string, cor: string): void;
  pausa(motivo: 'camera' | 'voce' | null): void;
  fim(p: Placar, falhou: boolean): void;
}

const VISIVEL = 0.45;
const SABRE = 1.75; // comprimento do sabre em larguras de ombro (≈ 60 cm)
const MEIO_BLOCO = 0.6; // metade do bloco + folga, em larguras de ombro
const JANELA_ANTES = 0.2; // segundos antes da batida em que o corte já vale
const JANELA_DEPOIS = 0.14;
const VEL_MIN = 2.6; // larguras de ombro por segundo (≈ 1 m/s)

interface Objeto<T> {
  dado: T;
  obj: THREE_Objeto | null;
  feito: boolean;
}
type THREE_Objeto = ReturnType<Cena['novoBloco']>;

interface Mao2 {
  base: Ponto2;
  ponta: Ponto2;
  t: number;
}

/** Segmento contra quadrado (Liang–Barsky). */
function cruza(a: Ponto2, b: Ponto2, cu: number, cv: number, h: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const testes: [number, number][] = [
    [-du, a.u - (cu - h)],
    [du, cu + h - a.u],
    [-dv, a.v - (cv - h)],
    [dv, cv + h - a.v],
  ];
  for (const [p, q] of testes) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

const lerp = (a: Ponto2, b: Ponto2, k: number): Ponto2 => ({ u: a.u + (b.u - a.u) * k, v: a.v + (b.v - a.v) * k });

export class Jogo {
  private notas: Objeto<Nota>[] = [];
  private obst: Objeto<Obstaculo>[] = [];
  private placar: Placar = { pontos: 0, combo: 0, maiorCombo: 0, mult: 1, energia: 0.5, acertos: 0, total: 0, progresso: 0 };
  private maos: Record<Mao, Mao2[]> = { esq: [], dir: [] };
  private escala: number;
  private pausadoPor: 'camera' | 'voce' | null = null;
  private vistoDesde = 0;
  private acabou = false;
  private ultimoQuadro = performance.now();
  private cabecaV: number;
  private velocidade: number;

  constructor(
    readonly modo: Modo,
    readonly nivel: Nivel,
    private cena: Cena,
    private musica: Musica,
    private rastreador: Rastreador,
    private calib: Calibracao,
    private semFalhar: boolean,
    private hud: Hud,
  ) {
    this.escala = calib.escala;
    this.cabecaV = (calib.cy - calib.nariz) / calib.escala;
    this.velocidade = NIVEIS[nivel].velocidade;
    if (modo === 'sabres') this.notas = gerarSabres(nivel).map((dado) => ({ dado, obj: null, feito: false }));
    else this.obst = gerarDesvio(nivel).map((dado) => ({ dado, obj: null, feito: false }));
    this.placar.total = modo === 'sabres' ? this.notas.filter((n) => n.dado.tipo !== 'bomba').length : this.obst.length;
    this.hud.placar(this.placar);
  }

  /* ---------- Corpo ---------- */

  /** Converte um ponto da câmera para o corpo. Sabres: relativo aos ombros de agora; desvio: à posição da calibração. */
  private noCorpo(p: Ponto, centro: { x: number; y: number }): Ponto2 {
    return { u: (p.x - centro.x) / this.escala, v: (centro.y - p.y) / this.escala };
  }

  private centro(pts: Ponto[]): { x: number; y: number } {
    const a = pts[P.ombroEsq];
    const b = pts[P.ombroDir];
    if (this.modo === 'desvio' || a.vis < VISIVEL || b.vis < VISIVEL) return { x: this.calib.cx, y: this.calib.cy };
    // A escala acompanha devagar quem chega mais perto ou se afasta (ignorando quando a pessoa vira de lado).
    const largura = Math.hypot(a.x - b.x, a.y - b.y);
    if (largura > this.escala * 0.75 && largura < this.escala * 1.35) this.escala += (largura - this.escala) * 0.01;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /* ---------- Quadro ---------- */

  quadro(agora: number, novoQuadroCamera: boolean): { distancia: number; pulso: number; dt: number } {
    const dt = Math.min(0.05, (agora - this.ultimoQuadro) / 1000);
    this.ultimoQuadro = agora;
    const t = this.musica.tempo();
    const pts = this.rastreador.pontos;

    this.verificarPausa(agora);

    if (pts) {
      const c = this.centro(pts);
      const corpo = pts.map((p) => (p.vis >= VISIVEL ? this.noCorpo(p, c) : null));
      const nariz = corpo[P.nariz];
      this.cena.desenharCorpo(corpo, this.modo === 'desvio' ? nariz : null);
      for (const mao of ['esq', 'dir'] as Mao[]) {
        const cot = pts[mao === 'esq' ? P.cotoveloEsq : P.cotoveloDir];
        const pul = pts[mao === 'esq' ? P.pulsoEsq : P.pulsoDir];
        if (this.modo !== 'sabres' || cot.vis < VISIVEL || pul.vis < VISIVEL) {
          this.cena.sabre(mao, null, null);
          if (this.modo !== 'sabres' && pul.vis >= VISIVEL && novoQuadroCamera) this.guardarMao(mao, this.noCorpo(pul, c), this.noCorpo(pul, c), agora);
          continue;
        }
        // O sabre continua o antebraço: do cotovelo para o pulso e além.
        const a = this.noCorpo(cot, c);
        const b = this.noCorpo(pul, c);
        const du = b.u - a.u;
        const dv = b.v - a.v;
        const n = Math.hypot(du, dv) || 1;
        const ponta = { u: b.u + (du / n) * SABRE, v: b.v + (dv / n) * SABRE };
        this.cena.sabre(mao, b, ponta);
        if (novoQuadroCamera) this.guardarMao(mao, b, ponta, agora);
      }
    } else {
      this.cena.desenharCorpo(null, null);
      this.cena.sabre('esq', null, null);
      this.cena.sabre('dir', null, null);
    }

    if (!this.pausadoPor) {
      if (this.modo === 'sabres') this.atualizarNotas(t, novoQuadroCamera);
      else this.atualizarObstaculos(t, pts);
    }

    const dur = NIVEIS[this.nivel].duracao;
    this.placar.progresso = Math.max(0, Math.min(1, t / dur));
    if (!this.acabou && t > dur + 1.2) this.terminar(false);
    const batida = 60 / NIVEIS[this.nivel].bpm;
    const fase = t > 0 ? (t % batida) / batida : 1;
    return { distancia: Math.max(0, t) * this.velocidade, pulso: Math.pow(1 - fase, 3), dt };
  }

  private guardarMao(mao: Mao, base: Ponto2, ponta: Ponto2, t: number): void {
    const h = this.maos[mao];
    h.unshift({ base, ponta, t });
    if (h.length > 6) h.length = 6;
  }

  /** Velocidade da ponta do sabre (larguras de ombro por segundo) nos últimos ~70 ms. */
  private velocidadeMao(mao: Mao): Ponto2 {
    const h = this.maos[mao];
    if (h.length < 2) return { u: 0, v: 0 };
    const atual = h[0];
    const antes = h.find((x) => atual.t - x.t >= 60) ?? h[h.length - 1];
    const dt = Math.max(16, atual.t - antes.t) / 1000;
    return { u: (atual.ponta.u - antes.ponta.u) / dt, v: (atual.ponta.v - antes.ponta.v) / dt };
  }

  /** O sabre passou pelo quadrado entre o quadro anterior e este? (vários passos: golpes rápidos não escapam) */
  private varreu(mao: Mao, cu: number, cv: number, h: number): boolean {
    const [atual, anterior] = this.maos[mao];
    if (!atual) return false;
    if (!anterior) return cruza(atual.base, atual.ponta, cu, cv, h);
    for (let k = 0; k <= 6; k++) {
      const s = k / 6;
      if (cruza(lerp(anterior.base, atual.base, s), lerp(anterior.ponta, atual.ponta, s), cu, cv, h)) return true;
    }
    return false;
  }

  /* ---------- Modo sabres ---------- */

  private atualizarNotas(t: number, novoQuadro: boolean): void {
    const alcance = 40 / this.velocidade; // segundos que o bloco leva para atravessar o corredor
    for (const n of this.notas) {
      const d = n.dado;
      if (!n.obj && !n.feito && d.t - t < alcance) n.obj = this.cena.novoBloco(d);
      if (!n.obj) continue;
      n.obj.position.z = -(d.t - t) * this.velocidade;
      if (d.tipo === 'bomba') n.obj.rotation.y += 0.03;
      if (n.feito) continue;

      const naJanela = t > d.t - JANELA_ANTES && t < d.t + JANELA_DEPOIS;
      if (naJanela && novoQuadro) this.tentarCorte(n, t);
      if (!n.feito && t >= d.t + JANELA_DEPOIS) {
        n.feito = true;
        if (d.tipo !== 'bomba') this.errou('Passou!');
      }
      if (n.obj && n.obj.position.z > 3) {
        this.cena.remover(n.obj);
        n.obj = null;
      }
    }
  }

  private tentarCorte(n: Objeto<Nota>, t: number): void {
    const d = n.dado;
    const cu = COLUNAS[d.coluna];
    const cv = LINHAS[d.linha];
    for (const mao of ['esq', 'dir'] as Mao[]) {
      if (!this.varreu(mao, cu, cv, MEIO_BLOCO)) continue;
      const vel = this.velocidadeMao(mao);
      const rapidez = Math.hypot(vel.u, vel.v);
      if (d.tipo === 'bomba') {
        if (rapidez < 1) continue; // encostar parado não explode
        n.feito = true;
        this.cena.explodir(n.obj!.position.clone(), '#ff1744');
        this.cena.remover(n.obj!);
        n.obj = null;
        this.musica.explosao();
        this.perder(0.15, 'Bomba!');
        return;
      }
      if (rapidez < VEL_MIN) continue; // encostou devagar: ainda dá tempo de cortar
      if (mao !== d.tipo) {
        n.feito = true;
        this.cena.cortar(n.obj!, vel.u, vel.v, '#888');
        n.obj = null;
        this.errou(mao === 'esq' ? 'Mão errada (azul é a direita)' : 'Mão errada (vermelho é a esquerda)');
        return;
      }
      const [eu, ev] = VETOR[d.dir];
      const tolerancia = this.nivel === 'facil' ? 0 : 0.3; // cosseno mínimo entre o golpe e a seta
      if (d.dir !== 'qualquer' && (vel.u * eu + vel.v * ev) / rapidez < tolerancia) {
        n.feito = true;
        this.cena.cortar(n.obj!, vel.u, vel.v, '#888');
        n.obj = null;
        this.errou('Direção errada');
        return;
      }
      // Acertou: bônus por estar na batida e pela força do golpe.
      n.feito = true;
      const precisao = Math.max(0, 1 - Math.abs(t - d.t) / 0.15);
      const forca = Math.min(1, (rapidez - VEL_MIN) / 8);
      this.cena.cortar(n.obj!, vel.u, vel.v, COR[mao]);
      n.obj = null;
      this.musica.corte(forca);
      this.acertou(100 + Math.round(precisao * 15 + forca * 15), precisao > 0.75 ? 'Perfeito!' : '');
      return;
    }
  }

  /* ---------- Modo desvio ---------- */

  private atualizarObstaculos(t: number, pts: Ponto[] | null): void {
    const alcance = 40 / this.velocidade;
    const nariz = pts && pts[P.nariz].vis >= VISIVEL ? this.noCorpo(pts[P.nariz], { x: this.calib.cx, y: this.calib.cy }) : null;
    for (const o of this.obst) {
      const d = o.dado;
      if (!o.obj && !o.feito && d.t - t < alcance) o.obj = this.cena.novoObstaculo(d, this.cabecaV);
      if (!o.obj) continue;
      o.obj.position.z = -(d.t - t) * this.velocidade;
      if (d.tipo === 'orbe') o.obj.rotation.y += 0.05;
      if (!o.feito) {
        if (d.tipo === 'orbe') this.pegarOrbe(o, t);
        else if (t >= d.t) {
          o.feito = true;
          const bateu =
            !nariz ||
            (d.tipo === 'abaixar' && nariz.v > this.cabecaV - 0.7) ||
            (d.tipo === 'esq' && nariz.u < 0.35) ||
            (d.tipo === 'dir' && nariz.u > -0.35);
          if (bateu) {
            this.cena.explodir(this.cena.mundo(nariz ?? { u: 0, v: this.cabecaV }, 0.1), '#ff1744');
            this.musica.explosao();
            this.perder(0.2, d.tipo === 'abaixar' ? 'Abaixe mais!' : 'Bateu na parede!');
          } else {
            this.musica.corte(0.3);
            this.acertou(100, d.tipo === 'abaixar' ? 'Abaixou!' : 'Desviou!');
          }
        }
      }
      if (o.obj.position.z > 4) {
        this.cena.remover(o.obj);
        o.obj = null;
      }
    }
  }

  private pegarOrbe(o: Objeto<Obstaculo>, t: number): void {
    const d = o.dado;
    if (t < d.t - 0.18) return;
    const cu = COLUNAS[d.coluna];
    const cv = LINHAS[d.linha];
    for (const mao of ['esq', 'dir'] as Mao[]) {
      if (!this.varreu(mao, cu, cv, 0.75)) continue;
      o.feito = true;
      this.cena.explodir(o.obj!.position.clone(), '#ffd54a');
      this.cena.remover(o.obj!);
      o.obj = null;
      this.musica.orbe();
      this.placar.pontos += 50 * this.placar.mult;
      this.hud.popup('+50', '#ffd54a');
      this.hud.placar(this.placar);
      return;
    }
    if (t > d.t + 0.12) o.feito = true; // orbe perdido não tira ponto
  }

  /* ---------- Placar ---------- */

  private acertou(base: number, texto: string): void {
    const p = this.placar;
    p.combo++;
    p.maiorCombo = Math.max(p.maiorCombo, p.combo);
    p.mult = p.combo >= 14 ? 8 : p.combo >= 6 ? 4 : p.combo >= 2 ? 2 : 1;
    p.pontos += base * p.mult;
    p.acertos++;
    p.energia = Math.min(1, p.energia + 0.025);
    if (texto) this.hud.popup(texto, '#7df9ff');
    this.hud.placar(p);
  }

  private errou(texto: string): void {
    this.musica.erro();
    this.perder(0.1, texto);
  }

  private perder(quanto: number, texto: string): void {
    const p = this.placar;
    p.combo = 0;
    p.mult = 1;
    p.energia = Math.max(0, p.energia - quanto);
    this.hud.popup(texto, '#ff5c7a');
    this.hud.placar(p);
    if (p.energia <= 0 && !this.semFalhar) this.terminar(true);
  }

  private terminar(falhou: boolean): void {
    if (this.acabou) return;
    this.acabou = true;
    this.hud.fim(this.placar, falhou);
  }

  /* ---------- Pausa ---------- */

  private verificarPausa(agora: number): void {
    if (this.acabou || this.pausadoPor === 'voce') return;
    const perdido = agora - this.rastreador.vistoEm > 1200;
    if (perdido && !this.pausadoPor && this.musica.tempo() > -1) {
      this.pausadoPor = 'camera';
      this.vistoDesde = 0;
      void this.musica.pausar();
      this.hud.pausa('camera');
    } else if (this.pausadoPor === 'camera' && !perdido) {
      // Volta só depois de 1 s vendo a pessoa de novo, para não ficar pausando e voltando.
      this.vistoDesde ||= agora;
      if (agora - this.vistoDesde > 1000) {
        this.pausadoPor = null;
        void this.musica.continuar();
        this.hud.pausa(null);
      }
    } else if (perdido) this.vistoDesde = 0;
  }

  alternarPausa(): void {
    if (this.acabou) return;
    if (this.pausadoPor === 'voce') {
      this.pausadoPor = null;
      void this.musica.continuar();
      this.hud.pausa(null);
    } else {
      this.pausadoPor = 'voce';
      void this.musica.pausar();
      this.hud.pausa('voce');
    }
  }

  /** Pausa sem alternar (ao trocar de aba): se já estava pausado, continua pausado. */
  pausar(): void {
    if (!this.acabou && !this.pausadoPor) this.alternarPausa();
  }

  get terminado(): boolean {
    return this.acabou;
  }
}
