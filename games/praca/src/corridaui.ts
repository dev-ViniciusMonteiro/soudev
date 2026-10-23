// Corrida no jogo: carrinho com os controles de dirigir (frente/trás acelera e freia, lados viram, Shift turbo),
// largada parada na contagem, grama freia, câmera atrás, HUD com volta, posição e tempo, e minimapa.
// Quem não está correndo assiste: a câmera acompanha o líder de cima.

import * as THREE from 'three';
import type { Boneco } from './boneco';
import type { Controles } from './controles';
import { desenharMinimapa, distanciaDaPista } from './pista';
import { CIRCUITO, type EstadoCorrida, LARGURA_PISTA, VOLTAS } from './protocolo';

type El = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]> & { cls?: string }, ...filhos: (Node | string | null | false)[]) => HTMLElementTagNameMap[K];

interface Contexto {
  el: El;
  app: HTMLElement;
  cena: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controles: Controles;
  euId: () => string;
  modelos: () => Map<string, THREE.Object3D>;
  remotos: () => { id: string; nome: string; boneco: Boneco }[];
  meuBoneco: () => Boneco;
  aviso: (t: string) => void;
}

const MODELOS = ['car_taxi', 'car_police', 'car_sedan', 'car_hatchback'];
const CORES = ['#facc15', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];
const ALTURA_CARRO = 0.073 + 0.061 * 4;
const VEL_MAX = 24;
const VEL_TURBO = 30;
const VEL_GRAMA = 9;

const tempo = (ms: number): string => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;

export class CorridaUI {
  estado: EstadoCorrida | null = null;
  private carros = new Map<string, THREE.Object3D>(); // carrinho de cada corredor
  private pos = new THREE.Vector3();
  private rot = Math.PI / 2;
  private vel = 0;
  private hud: HTMLElement;
  private contagem: HTMLElement;
  private mapa: HTMLCanvasElement;
  private recebidoEm = 0;
  espectador = false;
  voltarPraca = false;

  constructor(private c: Contexto) {
    this.hud = c.el('div', { cls: 'corrida-hud', hidden: true });
    this.contagem = c.el('div', { cls: 'corrida-contagem', hidden: true });
    this.mapa = c.el('canvas', { cls: 'corrida-mapa', width: 180, height: 180, hidden: true });
    c.app.append(this.hud, this.contagem, this.mapa);
  }

  get ativo(): boolean {
    return Boolean(this.estado?.corredores[this.c.euId()]);
  }

  /** O corpo de quem está correndo fica escondido (está dentro do carrinho). */
  correndo(id: string): boolean {
    return Boolean(this.estado?.corredores[id]);
  }

  receberEstado(e: EstadoCorrida | null): void {
    const antes = this.estado;
    this.estado = e;
    this.recebidoEm = performance.now();
    const eu = this.c.euId();
    if (!e) {
      for (const g of this.carros.values()) g.removeFromParent();
      this.carros.clear();
      this.hud.hidden = this.contagem.hidden = this.mapa.hidden = true;
      this.espectador = false;
      this.c.meuBoneco().grupo.visible = true;
      if (antes?.corredores[eu]) this.voltarPraca = true;
      return;
    }
    // Um carrinho por corredor (cores e modelos alternados).
    Object.keys(e.corredores).forEach((id, i) => {
      if (this.carros.has(id)) return;
      const g = this.c.modelos().get(MODELOS[i % MODELOS.length])!.clone();
      g.scale.setScalar(4);
      const [gx, gz, gr] = e.corredores[id].grid;
      g.position.set(CIRCUITO[0] + gx, ALTURA_CARRO, CIRCUITO[1] + gz);
      g.rotation.y = gr;
      this.c.cena.add(g);
      this.carros.set(id, g);
    });
    const meu = e.corredores[eu];
    if (meu && !antes) {
      // Largada: vai para o lugar no grid.
      const [gx, gz, gr] = meu.grid;
      this.pos.set(CIRCUITO[0] + gx, 0, CIRCUITO[1] + gz);
      this.rot = gr;
      this.vel = 0;
      this.c.controles.yaw = gr + Math.PI;
      this.c.meuBoneco().grupo.visible = false;
      this.c.aviso(`🏁 Corrida! ${VOLTAS} voltas. W acelera, S freia, A/D vira, Shift turbo. Fora da pista o carrinho perde velocidade.`);
    }
    if (!meu && !antes) this.c.aviso('🏁 Começou uma corrida no circuito do lado oeste. Clique em 👀 Assistir.');
    if (meu?.terminou !== null && meu?.terminou !== undefined && antes?.corredores[eu]?.terminou === null) this.c.aviso(`🏁 Você cruzou a chegada em ${meu.posicao}º! ${tempo(meu.terminou)}`);
    this.mapa.hidden = false;
    this.hud.hidden = false;
  }

  /** Um quadro de quem corre. Devolve a pose para o servidor. */
  quadro(dt: number, colisao: { x: number; z: number; mx: number; mz: number }[]): [number, number, number, number, number] | null {
    const e = this.estado;
    const eu = this.c.euId();
    const meu = e?.corredores[eu];
    if (!e || !meu) return null;
    const ctl = this.c.controles;
    ctl.ler();
    ctl.pegarPulo();
    const parado = e.fase === 'largada' || meu.terminou !== null;
    // Física do carrinho: acelera, freia, ré, atrito; na grama a velocidade máxima cai muito.
    const naGrama = distanciaDaPista(this.pos.x, this.pos.z) > LARGURA_PISTA / 2 + 1.2;
    const max = naGrama ? VEL_GRAMA : ctl.correr ? VEL_TURBO : VEL_MAX;
    const frente = parado ? 0 : ctl.mover.y;
    if (frente > 0.05) this.vel += (this.vel < 0 ? 30 : 14) * frente * dt;
    else if (frente < -0.05) this.vel += (this.vel > 0 ? -30 : -10) * -frente * dt;
    else this.vel -= Math.sign(this.vel) * Math.min(Math.abs(this.vel), 6 * dt);
    if (this.vel > max) this.vel = Math.max(max, this.vel - 30 * dt);
    this.vel = Math.max(-8, this.vel);
    if (parado && meu.terminou !== null) this.vel *= Math.exp(-dt * 2);
    this.rot -= (parado ? 0 : ctl.mover.x) * 2.1 * dt * Math.min(1, Math.abs(this.vel) / 5) * Math.sign(this.vel || 1);
    this.pos.x += Math.sin(this.rot) * this.vel * dt;
    this.pos.z += Math.cos(this.rot) * this.vel * dt;
    // Só as bordas do mundo seguram (os carrinhos atravessam uns aos outros).
    for (const cx of colisao) {
      const dx = this.pos.x - Math.max(cx.x - cx.mx, Math.min(this.pos.x, cx.x + cx.mx));
      const dz = this.pos.z - Math.max(cx.z - cx.mz, Math.min(this.pos.z, cx.z + cx.mz));
      if (dx * dx + dz * dz < 1.4 * 1.4) this.vel *= 0.5;
    }
    const meuCarro = this.carros.get(eu);
    if (meuCarro) {
      meuCarro.position.set(this.pos.x, ALTURA_CARRO, this.pos.z);
      meuCarro.rotation.y = this.rot;
      this.girarRodas(meuCarro, this.vel * dt);
    }
    // Câmera atrás do carrinho.
    const cam = this.c.camera;
    ctl.yaw += (this.rot + Math.PI - ctl.yaw) * Math.min(1, dt * 4);
    cam.position.lerp(new THREE.Vector3(this.pos.x - Math.sin(this.rot) * 10, 4.8, this.pos.z - Math.cos(this.rot) * 10), 1 - Math.exp(-dt * 8));
    cam.lookAt(this.pos.x + Math.sin(this.rot) * 4, 1.2, this.pos.z + Math.cos(this.rot) * 4);
    this.desenharHud(naGrama);
    return [this.pos.x, 0, this.pos.z, this.rot, 4];
  }

  private girarRodas(g: THREE.Object3D, andou: number): void {
    g.traverse((o) => {
      if (o.name.includes('wheel')) o.rotation.x += andou / (0.072 * 4);
    });
  }

  /** Carrinhos dos outros seguem a pose (interpolada) do boneco; minimapa e câmera de quem assiste. */
  animar(dt: number): void {
    const e = this.estado;
    if (!e) return;
    const eu = this.c.euId();
    const pontos: { x: number; z: number; cor: string; eu: boolean }[] = [];
    const ids = Object.keys(e.corredores);
    for (const r of this.c.remotos()) {
      const g = this.carros.get(r.id);
      if (!g || !e.corredores[r.id]) continue;
      const b = r.boneco.grupo;
      const antes = g.position.clone();
      g.position.set(b.position.x, ALTURA_CARRO, b.position.z);
      g.rotation.y = b.rotation.y;
      this.girarRodas(g, antes.distanceTo(g.position));
    }
    for (const id of ids) {
      const g = this.carros.get(id);
      if (g) pontos.push({ x: g.position.x, z: g.position.z, cor: CORES[ids.indexOf(id) % CORES.length], eu: id === eu });
    }
    const ctx = this.mapa.getContext('2d');
    if (ctx) desenharMinimapa(ctx, 180, pontos);
    // Contagem da largada.
    if (e.fase === 'largada') {
      const s = Math.ceil((e.restanteMs - (performance.now() - this.recebidoEm)) / 1000);
      this.contagem.textContent = s > 0 ? String(s) : 'VAI!';
      this.contagem.hidden = false;
    } else if (performance.now() - this.recebidoEm < 1200 && e.decorridoMs < 1500) {
      this.contagem.textContent = 'VAI!';
      this.contagem.hidden = false;
    } else this.contagem.hidden = true;
    // Quem assiste: câmera alta seguindo o líder.
    if (this.espectador && !this.ativo) {
      const lider = ids.find((id) => e.corredores[id].posicao === 1);
      const g = lider ? this.carros.get(lider) : null;
      if (g) {
        const cam = this.c.camera;
        cam.position.lerp(new THREE.Vector3(g.position.x - Math.sin(g.rotation.y) * 16, 14, g.position.z - Math.cos(g.rotation.y) * 16), 1 - Math.exp(-dt * 3));
        cam.lookAt(g.position.x, 0, g.position.z);
      }
      this.desenharHud(false);
    }
  }

  private desenharHud(naGrama: boolean): void {
    const e = this.estado;
    if (!e) return;
    const { el } = this.c;
    const meu = e.corredores[this.c.euId()];
    const total = Object.keys(e.corredores).length;
    const decorrido = e.fase === 'correndo' ? e.decorridoMs + (performance.now() - this.recebidoEm) : 0;
    const ordem = Object.entries(e.corredores).sort((a, b) => a[1].posicao - b[1].posicao);
    const nomes = new Map(this.c.remotos().map((r) => [r.id, r.nome]));
    this.hud.replaceChildren(
      el(
        'div',
        { cls: 'corrida-topo' },
        meu ? el('span', { textContent: `Volta ${Math.min(VOLTAS, meu.volta + 1)}/${VOLTAS}` }) : el('span', { textContent: '👀 Assistindo' }),
        meu ? el('strong', { textContent: `${meu.posicao}º de ${total}` }) : el('span', { textContent: `${total} corredores` }),
        el('span', { textContent: meu?.terminou ? `🏁 ${tempo(meu.terminou)}` : tempo(decorrido) }),
      ),
      el('ol', { cls: 'corrida-lista' }, ...ordem.map(([id, c]) => el('li', { cls: id === this.c.euId() ? 'eu' : '', textContent: `${id === this.c.euId() ? 'Você' : nomes.get(id) ?? '?'} · ${c.terminou ? '🏁' : `volta ${Math.min(VOLTAS, c.volta + 1)}`}` }))),
    );
    if (naGrama && meu && !meu.terminou) this.hud.append(el('div', { cls: 'corrida-grama', textContent: '🌱 Fora da pista: volte para o asfalto' }));
  }
}
