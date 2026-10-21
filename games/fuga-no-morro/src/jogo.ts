// Regras da fuga: gera as fileiras de obstáculos (sempre com uma saída), move o corredor (pista, pulo, abaixar),
// confere batidas e moedas, sobe o nível de procurado com o tempo e controla a distância da viatura.
// Bateu uma vez: tropeça e a viatura encosta. Bateu de novo enquanto ela está perto: te pegaram.

import { FAIXAS, type Moeda, type Obstaculo, type TipoObstaculo } from './mundo';
import type { Comando } from './controle';

export interface MundoJogo {
  obstaculos: Obstaculo[];
  moedas: Moeda[];
  novoObstaculo(tipo: TipoObstaculo, faixa: number | 'todas', z: number): void;
  novaMoeda(faixa: number, z: number, y?: number): void;
  pegarMoeda(m: Moeda): void;
  avancar(dz: number, distancia: number, t: number): void;
}

export interface Eventos {
  moeda(): void;
  pulo(): void;
  abaixou(): void;
  tropeco(texto: string): void;
  estrela(n: number): void;
  preso(): void;
}

// Pulo "flutuante" (~0,85 s no ar, ~1,8 m): dá folga para o atraso da câmera entre você pular e o jogo ver.
const GRAVIDADE = 20;
const IMPULSO = 8.5;
const ALTURA_LIVRE = 0.55; // acima disso passa por cima da barreira (as pernas encolhem no pulo)
const PERIGO = 7; // segundos com a viatura colada depois de um tropeço
const ESTRELA_A_CADA = 30; // segundos para subir uma estrela
const LONGE = 11; // viatura fora da tela

export class Jogo {
  tempo = 0;
  distancia = 0;
  moedas = 0;
  estrelas = 1;
  x = 0;
  y = 0;
  private vy = 0;
  abaixado = false;
  perigo = 0;
  tropeco = 0;
  viatura = 2; // metros entre você e a viatura (começa colada: "Corre!")
  preso = false;
  private lentidao = 0;
  private proximaFileira = -40;
  private faixaLivreAnterior = 1;
  private rnd: () => number;

  constructor(
    private mundo: MundoJogo,
    private ev: Eventos,
    rnd: () => number = Math.random,
  ) {
    this.rnd = rnd;
  }

  get velocidade(): number {
    const base = 9 + (this.estrelas - 1) * 1.7 + Math.min(3, this.tempo * 0.012);
    return base * (this.lentidao > 0 ? 0.7 : 1);
  }

  get pontos(): number {
    return Math.floor(this.distancia) + this.moedas * 10;
  }

  /* ---------- Gerador de fileiras ---------- */

  private sortear<T>(lista: T[]): T {
    return lista[Math.floor(this.rnd() * lista.length)];
  }

  /** Monta uma fileira de obstáculos em z, sempre com pelo menos um jeito de passar. */
  private fileira(z: number): void {
    const r = this.rnd();
    const n = this.estrelas;
    const faixas = [0, 1, 2];
    let livre: number[];
    if (r < 0.28) {
      // Um bloco numa pista.
      const f = this.sortear(faixas);
      this.mundo.novoObstaculo('bloco', f, z);
      livre = faixas.filter((x) => x !== f);
    } else if (r < 0.48 && n >= 2) {
      // Dois blocos: só uma pista livre (perto da última saída, para dar tempo de chegar).
      const saida = Math.max(0, Math.min(2, this.faixaLivreAnterior + this.sortear([-1, 0, 1])));
      for (const f of faixas) if (f !== saida) this.mundo.novoObstaculo('bloco', f, z);
      livre = [saida];
    } else if (r < 0.66) {
      // Barreiras para pular em uma, duas ou nas três pistas.
      const qtd = n >= 3 ? this.sortear([1, 2, 3]) : this.sortear([1, 2]);
      const escolhidas = [...faixas].sort(() => this.rnd() - 0.5).slice(0, qtd);
      for (const f of escolhidas) this.mundo.novoObstaculo('pular', f, z);
      livre = qtd === 3 ? faixas : faixas.filter((x) => !escolhidas.includes(x));
    } else if (r < 0.82) {
      // Varal baixo atravessando a rua: tem que abaixar.
      this.mundo.novoObstaculo('abaixar', 'todas', z);
      livre = faixas;
    } else {
      // Bloco numa pista e varal nas outras (a partir de 3 estrelas) ou só bloco.
      const f = this.sortear(faixas);
      this.mundo.novoObstaculo('bloco', f, z);
      if (n >= 3) for (const g of faixas) if (g !== f) this.mundo.novoObstaculo(this.rnd() < 0.5 ? 'pular' : 'abaixar', g, z);
      livre = faixas.filter((x) => x !== f);
    }
    this.faixaLivreAnterior = this.sortear(livre);
    // Fila de moedas numa pista livre, depois da fileira.
    if (this.rnd() < 0.7) {
      const f = this.faixaLivreAnterior;
      const qtd = 4 + Math.floor(this.rnd() * 4);
      for (let k = 0; k < qtd; k++) this.mundo.novaMoeda(f, z - 3 - k * 1.6);
    }
  }

  /* ---------- Quadro ---------- */

  passo(dt: number, cmd: Comando): void {
    if (this.preso) {
      this.viatura = Math.max(0.3, this.viatura - dt * 6);
      return;
    }
    this.tempo += dt;
    const estrelas = Math.min(5, 1 + Math.floor(this.tempo / ESTRELA_A_CADA));
    if (estrelas > this.estrelas) {
      this.estrelas = estrelas;
      this.ev.estrela(estrelas);
    }
    this.lentidao = Math.max(0, this.lentidao - dt);
    this.tropeco = Math.max(0, this.tropeco - dt);

    // Pista: desliza até o centro da pista pedida.
    const alvo = FAIXAS[cmd.faixa + 1];
    const passoX = 11 * dt;
    this.x += Math.max(-passoX, Math.min(passoX, alvo - this.x));

    // Pulo e abaixar (abaixar no ar faz descer mais rápido).
    const noChao = this.y <= 0 && this.vy <= 0;
    if (cmd.pulo && noChao && !cmd.abaixado) {
      this.vy = IMPULSO;
      this.ev.pulo();
    }
    if (cmd.abaixado && !noChao) this.vy = Math.min(this.vy, -14);
    this.vy -= GRAVIDADE * dt;
    this.y = Math.max(0, this.y + this.vy * dt);
    if (this.y === 0 && this.vy < 0) this.vy = 0;
    const abaixado = cmd.abaixado && this.y === 0;
    if (abaixado && !this.abaixado) this.ev.abaixou();
    this.abaixado = abaixado;

    // O mundo anda.
    const dz = this.velocidade * dt;
    this.distancia += dz;
    this.proximaFileira += dz;
    this.mundo.avancar(dz, this.distancia, this.tempo);
    while (this.proximaFileira > -115) {
      this.fileira(this.proximaFileira);
      // Distância entre fileiras: ~1 a 1,5 s de corrida (fica mais apertado com mais estrelas).
      const v = this.velocidade;
      this.proximaFileira -= Math.max(11, v * (1.25 - this.estrelas * 0.07) + this.rnd() * v * 0.45);
    }

    this.colisoes();

    // Viatura: colada no começo e depois de um tropeço; some quando você abre distância.
    this.perigo = Math.max(0, this.perigo - dt);
    const alvoViatura = this.perigo > PERIGO - 2 ? 1.6 : this.perigo > 0 ? 4.5 : LONGE;
    this.viatura += (alvoViatura - this.viatura) * Math.min(1, dt * (alvoViatura < this.viatura ? 4 : 0.6));
  }

  private colisoes(): void {
    const minhaFaixa = (f: number | 'todas'): boolean => f === 'todas' || Math.abs(this.x - FAIXAS[f]) < 0.8;
    for (const o of this.mundo.obstaculos) {
      if (o.resolvido) continue;
      const dentro = Math.abs(o.z) < o.comprimento / 2 + 0.35;
      if (!dentro) {
        if (o.z - o.comprimento / 2 > 0.4) o.resolvido = true; // já passou
        continue;
      }
      if (!minhaFaixa(o.faixa)) continue;
      const bateu = o.tipo === 'bloco' || (o.tipo === 'pular' && this.y < ALTURA_LIVRE) || (o.tipo === 'abaixar' && !this.abaixado);
      if (!bateu) continue;
      o.resolvido = true;
      o.mesh.visible = false; // passou por cima/derrubou
      this.bater(o.tipo === 'bloco' ? 'Bateu!' : o.tipo === 'pular' ? 'Tropeçou!' : 'Enroscou no varal!');
      if (this.preso) return;
    }
    for (const m of this.mundo.moedas) {
      if (m.pega || Math.abs(m.z) > 0.6 || Math.abs(this.x - FAIXAS[m.faixa]) > 0.7 || Math.abs(this.y + 0.9 - m.y) > 1.1) continue;
      this.mundo.pegarMoeda(m);
      this.moedas++;
      this.ev.moeda();
    }
  }

  private bater(texto: string): void {
    if (this.perigo > 0) {
      this.preso = true;
      this.ev.preso();
      return;
    }
    this.perigo = PERIGO;
    this.tropeco = 0.6;
    this.lentidao = 1;
    this.ev.tropeco(texto);
  }
}
