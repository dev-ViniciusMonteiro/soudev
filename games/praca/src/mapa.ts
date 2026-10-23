// Mapa: minimapa no canto (clique para abrir), mapa grande com M e rota até um lugar.
// Clicou num jogo (no mapa ou na lista), aparece o caminho marcado no chão com setas andando até a porta do
// prédio, um feixe de luz no destino e o ícone dele fica maior. A rota desvia de paredes, prédios e árvores
// (A* numa grade de 1 m sobre as caixas de colisão) e é refeita enquanto você anda.

import * as THREE from 'three';
import type { Caixa } from './mundo';
import { RUA_EXTERNA, RUA_INTERNA, POS_LOJA } from './mundo';
import type { Predios } from './predios';
import { JOGOS, PREDIOS } from './protocolo';

type El = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]> & { cls?: string }, ...filhos: (Node | string | null | false)[]) => HTMLElementTagNameMap[K];

interface Contexto {
  el: El;
  app: HTMLElement;
  cena: THREE.Scene;
  colisao: () => Caixa[];
  predios: Predios;
  /** Minha posição e para onde olho (rotação do boneco). */
  eu: () => { x: number; z: number; rot: number };
  outros: () => { x: number; z: number }[];
  aviso: (t: string) => void;
}

interface Destino {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  x: number;
  z: number;
}

/** Lugares que dá para marcar: os prédios (destino = portal do jogo, ou o meio do prédio) e a loja. */
const DESTINOS: Destino[] = [
  ...PREDIOS.map((p) => {
    const [x, z] = p.jogo ? JOGOS[p.jogo].portal : [p.x, p.z];
    return { id: p.id, nome: p.jogo ? `${p.nome} · ${JOGOS[p.jogo].nome}` : p.nome, icone: p.icone, cor: p.cor, x, z };
  }),
  { id: 'loja', nome: 'Loja', icone: '🛒', cor: '#7c3aed', x: POS_LOJA[0], z: POS_LOJA[1] + 2 },
];

const EXTENSAO = 82; // o mapa mostra de -82 a 82 (a cidade)
const PX_M = 4; // pixels por metro no desenho base
const LADO = EXTENSAO * 2 * PX_M;
const N = EXTENSAO * 2 + 1; // grade da rota (1 m)
const RAIO_MINI = 38; // metros mostrados do centro até a borda no minimapa

/* ---------- Rota: A* na grade ---------- */

function montarGrade(caixas: Caixa[]): Uint8Array {
  const g = new Uint8Array(N * N);
  const r = 0.45;
  for (const c of caixas) {
    const i0 = Math.max(0, Math.ceil(c.x - c.mx - r + EXTENSAO));
    const i1 = Math.min(N - 1, Math.floor(c.x + c.mx + r + EXTENSAO));
    const j0 = Math.max(0, Math.ceil(c.z - c.mz - r + EXTENSAO));
    const j1 = Math.min(N - 1, Math.floor(c.z + c.mz + r + EXTENSAO));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) g[j * N + i] = 1;
  }
  return g;
}

const celula = (x: number, z: number): [number, number] => [Math.max(0, Math.min(N - 1, Math.round(x + EXTENSAO))), Math.max(0, Math.min(N - 1, Math.round(z + EXTENSAO)))];

/** Célula livre mais perto (busca em anéis). */
function livreMaisPerto(g: Uint8Array, i: number, j: number): number {
  for (let r = 0; r < 12; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = i + di;
        const b = j + dj;
        if (a >= 0 && b >= 0 && a < N && b < N && !g[b * N + a]) return b * N + a;
      }
  return j * N + i;
}

function aEstrela(g: Uint8Array, ini: number, fim: number): number[] | null {
  const custo = new Float32Array(N * N).fill(Infinity);
  const veio = new Int32Array(N * N).fill(-1);
  const fechado = new Uint8Array(N * N);
  const fi = fim % N;
  const fj = Math.floor(fim / N);
  const h = (k: number) => {
    const dx = Math.abs((k % N) - fi);
    const dz = Math.abs(Math.floor(k / N) - fj);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  // Fila de prioridade (heap binário) de [f, k].
  const heap: [number, number][] = [];
  const subir = (n: [number, number]) => {
    heap.push(n);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const tirar = (): [number, number] => {
    const topo = heap[0];
    const ult = heap.pop()!;
    if (heap.length) {
      heap[0] = ult;
      let i = 0;
      for (;;) {
        const a = i * 2 + 1;
        const b = a + 1;
        let m = i;
        if (a < heap.length && heap[a][0] < heap[m][0]) m = a;
        if (b < heap.length && heap[b][0] < heap[m][0]) m = b;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return topo;
  };
  custo[ini] = 0;
  subir([h(ini), ini]);
  while (heap.length) {
    const [, k] = tirar();
    if (k === fim) break;
    if (fechado[k]) continue;
    fechado[k] = 1;
    const i = k % N;
    const j = Math.floor(k / N);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const v = b * N + a;
        if (g[v]) continue;
        if (di && dj && (g[j * N + a] || g[b * N + i])) continue; // não corta quina
        const c = custo[k] + (di && dj ? 1.414 : 1);
        if (c < custo[v]) {
          custo[v] = c;
          veio[v] = k;
          subir([c + h(v), v]);
        }
      }
  }
  if (veio[fim] < 0 && fim !== ini) return null;
  const caminho = [fim];
  while (caminho[0] !== ini) caminho.unshift(veio[caminho[0]]);
  return caminho;
}

/** Dá para ir em linha reta de a até b sem passar por célula ocupada? */
function linhaLivre(g: Uint8Array, ax: number, az: number, bx: number, bz: number): boolean {
  const d = Math.hypot(bx - ax, bz - az);
  const passos = Math.ceil(d / 0.4);
  for (let s = 1; s < passos; s++) {
    const [i, j] = celula(ax + ((bx - ax) * s) / passos, az + ((bz - az) * s) / passos);
    if (g[j * N + i]) return false;
  }
  return true;
}

/** Caminho em metros, com os pontos desnecessários tirados (puxa a corda). */
function calcularRota(g: Uint8Array, de: { x: number; z: number }, para: { x: number; z: number }): [number, number][] | null {
  const [si, sj] = celula(de.x, de.z);
  const [ti, tj] = celula(para.x, para.z);
  const ini = livreMaisPerto(g, si, sj);
  const fim = livreMaisPerto(g, ti, tj);
  const c = aEstrela(g, ini, fim);
  if (!c) return null;
  const pts: [number, number][] = c.map((k) => [(k % N) - EXTENSAO, Math.floor(k / N) - EXTENSAO]);
  pts[0] = [de.x, de.z];
  pts.push([para.x, para.z]);
  const enxuto: [number, number][] = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !linhaLivre(g, pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
    enxuto.push(pts[b]);
    a = b;
  }
  return enxuto;
}

/* ---------- Mapa ---------- */

export class Mapa {
  readonly mini: HTMLCanvasElement;
  private grande: HTMLElement;
  private telaGrande: HTMLCanvasElement;
  private base: HTMLCanvasElement | null = null;
  private grade: Uint8Array | null = null;
  destino: Destino | null = null;
  private rota: [number, number][] = [];
  private ultimaRota = -1;
  private ultimoDesenho = -1;
  private setas: THREE.InstancedMesh;
  private feixe: THREE.Mesh;
  private aberto = false;

  constructor(private c: Contexto) {
    const { el } = c;
    this.mini = el('canvas', { cls: 'minimapa', title: 'Mapa (M)', hidden: true });
    this.mini.width = this.mini.height = 300;
    this.mini.onclick = () => this.alternar(true);
    this.telaGrande = el('canvas', { cls: 'mapa-tela' });
    this.telaGrande.width = this.telaGrande.height = LADO;
    this.telaGrande.onclick = (e) => this.cliqueGrande(e);
    const lista = el(
      'div',
      { cls: 'mapa-lista' },
      el('strong', { textContent: 'Para onde?' }),
      ...DESTINOS.map((d) => {
        const b = el('button', { cls: 'mapa-item', onclick: () => this.marcar(d) }, el('span', { cls: 'mapa-icone', textContent: d.icone }), el('span', { textContent: d.nome }));
        b.style.setProperty('--cor', d.cor);
        return b;
      }),
      el('button', { cls: 'btn', textContent: '✕ Tirar rota', onclick: () => this.marcar(null) }),
      el('small', { cls: 'nota', textContent: 'Clique num lugar do mapa ou da lista: o caminho aparece no chão. M abre e fecha.' }),
    );
    this.grande = el(
      'div',
      { cls: 'mapa-grande', hidden: true, onclick: (e: MouseEvent) => e.target === this.grande && this.alternar(false) },
      el('div', { cls: 'mapa-caixa' }, el('div', { cls: 'mapa-topo' }, el('h3', { textContent: '🗺️ Mapa da cidade' }), el('button', { cls: 'btn', textContent: 'Fechar (M)', onclick: () => this.alternar(false) })), el('div', { cls: 'mapa-corpo' }, this.telaGrande, lista)),
    );
    c.app.append(this.mini, this.grande);

    // Setas no chão (triângulo deitado) e feixe de luz no destino.
    const forma = new THREE.Shape();
    forma.moveTo(0, 0.55);
    forma.lineTo(0.45, -0.25);
    forma.lineTo(0, -0.05);
    forma.lineTo(-0.45, -0.25);
    forma.closePath();
    const geo = new THREE.ShapeGeometry(forma);
    geo.rotateX(-Math.PI / 2); // deitada, apontando para -z
    this.setas = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.95, depthWrite: false }), 160);
    this.setas.count = 0;
    this.setas.frustumCulled = false;
    this.setas.renderOrder = 2;
    this.feixe = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 40, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.feixe.visible = false;
    c.cena.add(this.setas, this.feixe);
  }

  get estaAberto(): boolean {
    return this.aberto;
  }

  alternar(abrir = !this.aberto): void {
    this.aberto = abrir;
    this.grande.hidden = !abrir;
    if (abrir) this.desenharGrande();
  }

  marcar(d: Destino | null): void {
    this.destino = d;
    this.rota = [];
    this.ultimaRota = -1;
    this.c.predios.destacar(d?.id ?? null);
    this.feixe.visible = Boolean(d);
    if (d) {
      (this.feixe.material as THREE.MeshBasicMaterial).color.set(d.cor);
      (this.setas.material as THREE.MeshBasicMaterial).color.set(d.cor).lerp(new THREE.Color('#fff'), 0.15);
      this.feixe.position.set(d.x, 20, d.z);
      this.c.aviso(`${d.icone} Rota para ${d.nome}: siga as setas no chão.`);
      this.alternar(false);
    } else this.setas.count = 0;
    if (this.aberto) this.desenharGrande();
  }

  /** Desenho fixo da cidade (ruas, praça, prédios), feito uma vez. */
  private desenharBase(): HTMLCanvasElement {
    if (this.base) return this.base;
    const c = document.createElement('canvas');
    c.width = c.height = LADO;
    const g = c.getContext('2d')!;
    const px = (v: number) => (v + EXTENSAO) * PX_M;
    g.fillStyle = '#5f8f45';
    g.fillRect(0, 0, LADO, LADO);
    // Praça.
    g.fillStyle = '#d6cfc2';
    g.fillRect(px(-28), px(-28), 56 * PX_M, 56 * PX_M);
    // Ruas: dois quadrados e as avenidas.
    g.strokeStyle = '#4b5563';
    g.lineWidth = 8 * PX_M;
    for (const R of [RUA_INTERNA, RUA_EXTERNA]) g.strokeRect(px(-R), px(-R), R * 2 * PX_M, R * 2 * PX_M);
    g.beginPath();
    g.moveTo(px(0), px(-RUA_EXTERNA));
    g.lineTo(px(0), px(-RUA_INTERNA));
    g.moveTo(px(0), px(RUA_INTERNA));
    g.lineTo(px(0), px(RUA_EXTERNA));
    g.moveTo(px(-RUA_EXTERNA), px(0));
    g.lineTo(px(-RUA_INTERNA), px(0));
    g.moveTo(px(RUA_INTERNA), px(0));
    g.lineTo(px(RUA_EXTERNA), px(0));
    g.stroke();
    // O que é sólido (prédios da rua, árvores, bancos), menos as paredes invisíveis do fim do mundo.
    g.fillStyle = '#a8a29e';
    for (const b of this.c.colisao()) if (b.mx < 40 && b.mz < 40) g.fillRect(px(b.x - b.mx), px(b.z - b.mz), b.mx * 2 * PX_M, b.mz * 2 * PX_M);
    // Chafariz.
    g.fillStyle = '#38bdf8';
    g.beginPath();
    g.arc(px(0), px(0), 2.8 * PX_M, 0, Math.PI * 2);
    g.fill();
    // Prédios dos jogos: chão colorido, porta e ícone.
    for (const p of PREDIOS) {
      g.fillStyle = p.cor;
      g.globalAlpha = 0.85;
      g.fillRect(px(p.x - p.larg / 2), px(p.z - p.prof / 2), p.larg * PX_M, p.prof * PX_M);
      g.globalAlpha = 1;
      g.strokeStyle = '#111827';
      g.lineWidth = 4;
      g.strokeRect(px(p.x - p.larg / 2), px(p.z - p.prof / 2), p.larg * PX_M, p.prof * PX_M);
    }
    this.base = c;
    return c;
  }

  private iconesSobre(g: CanvasRenderingContext2D, px: (v: number) => number, pz: (v: number) => number, tam: number, nomes: boolean): void {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const d of DESTINOS) {
      const x = px(d.id === 'loja' ? POS_LOJA[0] : PREDIOS.find((p) => p.id === d.id)!.x);
      const z = pz(d.id === 'loja' ? POS_LOJA[1] : PREDIOS.find((p) => p.id === d.id)!.z);
      const marcado = this.destino?.id === d.id;
      g.fillStyle = marcado ? '#fff' : 'rgba(15,23,42,0.85)';
      g.beginPath();
      g.arc(x, z, tam * (marcado ? 0.85 : 0.7), 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = d.cor;
      g.lineWidth = tam * 0.14;
      g.stroke();
      g.font = `${tam * 0.85}px system-ui, sans-serif`;
      g.fillText(d.icone, x, z + tam * 0.05);
      if (nomes) {
        g.font = `800 ${tam * 0.5}px system-ui, sans-serif`;
        g.lineWidth = tam * 0.15;
        g.strokeStyle = '#0f172a';
        const nome = d.nome.split(' · ')[0];
        g.strokeText(nome, x, z + tam * 1.25);
        g.fillStyle = '#fff';
        g.fillText(nome, x, z + tam * 1.25);
      }
    }
  }

  private desenharRotaEJogadores(g: CanvasRenderingContext2D, px: (v: number) => number, pz: (v: number) => number, escala: number): void {
    if (this.rota.length > 1 && this.destino) {
      g.strokeStyle = this.destino.cor;
      g.lineWidth = Math.max(3, escala * 1.2);
      g.setLineDash([escala * 2, escala * 1.2]);
      g.beginPath();
      this.rota.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
      g.stroke();
      g.setLineDash([]);
    }
    g.fillStyle = '#e2e8f0';
    for (const o of this.c.outros()) {
      g.beginPath();
      g.arc(px(o.x), pz(o.z), Math.max(3, escala * 0.9), 0, Math.PI * 2);
      g.fill();
    }
    // Eu: seta para onde estou virado.
    const eu = this.c.eu();
    g.save();
    g.translate(px(eu.x), pz(eu.z));
    g.rotate(Math.atan2(Math.cos(eu.rot), Math.sin(eu.rot))); // o boneco olha para (sen, cos) em (x, z)
    const t = Math.max(7, escala * 2.2);
    g.fillStyle = '#facc15';
    g.strokeStyle = '#111827';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(t, 0);
    g.lineTo(-t * 0.7, t * 0.65);
    g.lineTo(-t * 0.35, 0);
    g.lineTo(-t * 0.7, -t * 0.65);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  private desenharGrande(): void {
    const g = this.telaGrande.getContext('2d')!;
    g.drawImage(this.desenharBase(), 0, 0);
    const px = (v: number) => (v + EXTENSAO) * PX_M;
    this.desenharRotaEJogadores(g, px, px, PX_M);
    this.iconesSobre(g, px, px, 12 * PX_M * 0.5, true);
  }

  private desenharMini(): void {
    const g = this.mini.getContext('2d')!;
    const L = this.mini.width;
    const eu = this.c.eu();
    const escala = L / (RAIO_MINI * 2); // px por metro
    g.save();
    g.clearRect(0, 0, L, L);
    g.beginPath();
    g.arc(L / 2, L / 2, L / 2 - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#3f6b2f';
    g.fillRect(0, 0, L, L);
    const k = escala / PX_M;
    g.drawImage(this.desenharBase(), (eu.x + EXTENSAO) * PX_M - (L / 2) / k, (eu.z + EXTENSAO) * PX_M - (L / 2) / k, L / k, L / k, 0, 0, L, L);
    const px = (v: number) => L / 2 + (v - eu.x) * escala;
    const pz = (v: number) => L / 2 + (v - eu.z) * escala;
    this.desenharRotaEJogadores(g, px, pz, escala);
    this.iconesSobre(g, px, pz, 22, false);
    // Destino fora do minimapa: ícone na borda, na direção dele.
    if (this.destino) {
      const dx = this.destino.x - eu.x;
      const dz = this.destino.z - eu.z;
      const d = Math.hypot(dx, dz);
      if (d > RAIO_MINI * 0.85) {
        const r = L / 2 - 20;
        g.fillStyle = this.destino.cor;
        g.beginPath();
        g.arc(L / 2 + (dx / d) * r, L / 2 + (dz / d) * r, 16, 0, Math.PI * 2);
        g.fill();
        g.font = '20px system-ui, sans-serif';
        g.fillText(this.destino.icone, L / 2 + (dx / d) * r, L / 2 + (dz / d) * r + 1);
      }
    }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(L / 2, L / 2, L / 2 - 2, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#fff';
    g.font = '800 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('N', L / 2, 22);
  }

  private cliqueGrande(e: MouseEvent): void {
    const r = this.telaGrande.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * LADO / PX_M - EXTENSAO;
    const z = ((e.clientY - r.top) / r.height) * LADO / PX_M - EXTENSAO;
    // O prédio clicado, ou o ícone mais perto (até 10 m).
    const predio = PREDIOS.find((p) => Math.abs(x - p.x) <= p.larg / 2 + 2 && Math.abs(z - p.z) <= p.prof / 2 + 2);
    const d =
      DESTINOS.find((d) => d.id === predio?.id) ??
      DESTINOS.map((d) => ({ d, dist: Math.hypot(d.id === 'loja' ? POS_LOJA[0] - x : d.x - x, d.id === 'loja' ? POS_LOJA[1] - z : d.z - z) }))
        .filter((o) => o.dist < 10)
        .sort((a, b) => a.dist - b.dist)[0]?.d;
    if (d) this.marcar(d);
  }

  /** A cada quadro: refaz a rota de tempos em tempos, mexe as setas e redesenha o minimapa. */
  tick(t: number, ativo: boolean): void {
    this.mini.hidden = !ativo;
    const eu = this.c.eu();
    const naCidade = Math.abs(eu.x) < EXTENSAO && Math.abs(eu.z) < EXTENSAO;
    if (this.destino && ativo && naCidade) {
      if (Math.hypot(eu.x - this.destino.x, eu.z - this.destino.z) < 2.5) {
        this.c.aviso(`${this.destino.icone} Você chegou: ${this.destino.nome}`);
        this.marcar(null);
      } else if (t - this.ultimaRota > 0.8) {
        this.ultimaRota = t;
        this.grade ??= montarGrade(this.c.colisao());
        this.rota = calcularRota(this.grade, eu, this.destino) ?? [];
      }
    }
    this.colocarSetas(t, ativo && naCidade);
    this.feixe.visible = Boolean(this.destino) && ativo;
    if (ativo && t - this.ultimoDesenho > 0.1) {
      this.ultimoDesenho = t;
      this.desenharMini();
      if (this.aberto) this.desenharGrande();
    }
  }

  /** Setas a cada 1,6 m ao longo da rota, andando para a frente. */
  private colocarSetas(t: number, visivel: boolean): void {
    if (!visivel || !this.destino || this.rota.length < 2) {
      this.setas.count = 0;
      return;
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1.5, 1, 1.5);
    const p = new THREE.Vector3();
    const cima = new THREE.Vector3(0, 1, 0);
    const passo = 1.6;
    let n = 0;
    let sobra = (t * 2.2) % passo; // deslocamento que faz as setas andarem
    for (let i = 0; i < this.rota.length - 1 && n < 160; i++) {
      const [ax, az] = this.rota[i];
      const [bx, bz] = this.rota[i + 1];
      const seg = Math.hypot(bx - ax, bz - az);
      q.setFromAxisAngle(cima, Math.atan2(-(bx - ax), -(bz - az)));
      for (let d = sobra; d < seg && n < 160; d += passo) {
        p.set(ax + ((bx - ax) * d) / seg, 0.07, az + ((bz - az) * d) / seg);
        this.setas.setMatrixAt(n++, m.compose(p, q, s));
      }
      sobra = ((sobra - seg) % passo + passo) % passo;
    }
    this.setas.count = n;
    this.setas.instanceMatrix.needsUpdate = true;
  }
}
