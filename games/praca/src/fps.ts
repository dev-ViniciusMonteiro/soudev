// Mata-mata em primeira pessoa (estilo CS) dentro do domo.
// Controles: mouse mira (clique trava o mouse; Esc solta), WASD anda, Shift anda devagar, Espaço pula,
// clique atira (segurar nas automáticas), botão direito dá zoom na AWP, R recarrega, 1/2/3 troca de arma,
// B abre a compra (na fase de compra), Tab mostra o placar. No celular: joystick, arrastar para mirar e botões.
// O jogo detecta o acerto (parede ou inimigo na mira) e o servidor confere antes de aplicar o dano.

import * as THREE from 'three';
import { caixasArena } from './arena';
import type { Boneco } from './boneco';
import type { Controles } from './controles';
import { resolverColisao } from './mundo';
import { ALTURA_OLHO, ARMAS_MM, type Arma, DOMO, type EstadoMM, type JogadorMM, LIMITE_ARENA, MAPA_ARENA, PRECO_CAPACETE, PRECO_COLETE, type SlotArma, type Time } from './protocolo';
import type { Rede } from './rede';

type El = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]> & { cls?: string }, ...filhos: (Node | string | null | false)[]) => HTMLElementTagNameMap[K];

export interface RemotoFPS {
  id: string;
  nome: string;
  boneco: Boneco;
  skin: string;
}

interface Contexto {
  el: El;
  app: HTMLElement;
  canvas: HTMLCanvasElement;
  cena: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controles: Controles;
  rede: () => Rede | null;
  euId: () => string;
  /** Visual das minhas armas (comprado na loja). */
  minhaArma: () => string;
  remotos: () => RemotoFPS[];
  meuBoneco: () => Boneco;
  aviso: (texto: string) => void;
}

const armaPorId = (id: string): Arma => ARMAS_MM.find((a) => a.id === id)!;
/** replaceChildren não aceita null: tira os itens vazios. */
const nos = (...l: (Node | null | false)[]): Node[] => l.filter((x): x is Node => Boolean(x));
const COR_TIME: Record<Time, string> = { TR: '#f97316', CT: '#3b82f6' };
const NOME_TIME: Record<Time, string> = { TR: 'Terroristas', CT: 'Contra-terroristas' };
const ICONE_ARMA: Record<string, string> = { faca: '🔪', glock: '🔫', usp: '🔫', deagle: '🔫', mp5: '🔫', ak47: '🔫', m4: '🔫', awp: '🎯' };

/** Materiais do visual das armas (loja): padrão, camuflada, neon, ouro, dragão. */
function materialArma(skin: string): THREE.MeshStandardMaterial[] {
  switch (skin) {
    case 'camuflada':
      return [new THREE.MeshStandardMaterial({ color: '#4d5d2f', flatShading: true }), new THREE.MeshStandardMaterial({ color: '#7c6a3a', flatShading: true })];
    case 'neon':
      return [new THREE.MeshStandardMaterial({ color: '#0f172a', emissive: '#ec4899', emissiveIntensity: 0.9 }), new THREE.MeshStandardMaterial({ color: '#0f172a', emissive: '#22d3ee', emissiveIntensity: 1.1 })];
    case 'ouro':
      return [new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.9, roughness: 0.25 }), new THREE.MeshStandardMaterial({ color: '#a16207', metalness: 0.8, roughness: 0.3 })];
    case 'dragao':
      return [new THREE.MeshStandardMaterial({ color: '#7f1d1d', emissive: '#ea580c', emissiveIntensity: 0.5, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#f97316', emissiveIntensity: 0.7 })];
    default:
      return [new THREE.MeshStandardMaterial({ color: '#27272a', flatShading: true }), new THREE.MeshStandardMaterial({ color: '#52525b', flatShading: true })];
  }
}

/** Modelo simples de cada arma (caixas), apontando para -z. */
export function modeloArma(id: string, skin: string): THREE.Group {
  const g = new THREE.Group();
  const [m1, m2] = materialArma(skin);
  const cx = (l: number, a: number, p: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), m);
    b.position.set(x, y, z);
    g.add(b);
  };
  if (id === 'faca') {
    cx(0.03, 0.08, 0.12, m2, 0, 0, 0.06);
    cx(0.012, 0.05, 0.22, new THREE.MeshStandardMaterial({ color: '#e5e7eb', metalness: 0.9, roughness: 0.2 }), 0, 0.01, -0.12);
  } else if (id === 'glock' || id === 'usp' || id === 'deagle') {
    const longa = id === 'deagle' ? 0.26 : 0.2;
    cx(0.05, 0.06, longa, m1, 0, 0.03, -longa / 2);
    cx(0.045, 0.12, 0.06, m2, 0, -0.05, -0.02);
  } else {
    const comp = id === 'awp' ? 0.95 : id === 'mp5' ? 0.5 : 0.7;
    cx(0.06, 0.08, comp, m1, 0, 0, -comp / 2); // corpo
    cx(0.03, 0.03, comp * 0.45, m2, 0, 0.01, -comp - comp * 0.2); // cano
    cx(0.05, 0.14, 0.06, m2, 0, -0.1, -0.15); // cabo
    cx(0.05, 0.12, 0.05, m1, 0, -0.1, -comp * 0.45); // pente
    cx(0.06, 0.08, 0.22, m2, 0, -0.01, 0.1); // coronha
    if (id === 'awp') {
      const luneta = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 10), m2);
      luneta.rotation.x = Math.PI / 2;
      luneta.position.set(0, 0.08, -0.4);
      g.add(luneta);
    }
  }
  return g;
}

/** Raio contra caixa alinhada (devolve a distância ou Infinity). */
function raioCaixa(o: THREE.Vector3, d: THREE.Vector3, min: THREE.Vector3, max: THREE.Vector3): number {
  let t0 = 0;
  let t1 = Infinity;
  for (const k of ['x', 'y', 'z'] as const) {
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < min[k] || o[k] > max[k]) return Infinity;
      continue;
    }
    let a = (min[k] - o[k]) / d[k];
    let b = (max[k] - o[k]) / d[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

function raioEsfera(o: THREE.Vector3, d: THREE.Vector3, c: THREE.Vector3, r: number): number {
  const oc = o.clone().sub(c);
  const b = oc.dot(d);
  const cc = oc.lengthSq() - r * r;
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
}

/** Som de tiro sintetizado (ruído curto filtrado); mais baixo de longe. */
let audio: AudioContext | null = null;
function somTiro(volume: number, grave = false): void {
  try {
    audio ??= new AudioContext();
    const a = audio;
    const n = a.createBuffer(1, a.sampleRate * 0.15, a.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const s = a.createBufferSource();
    s.buffer = n;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = grave ? 900 : 2200;
    const g = a.createGain();
    g.gain.value = Math.min(0.5, volume);
    s.connect(f).connect(g).connect(a.destination);
    s.start();
  } catch {
    /* sem áudio */
  }
}

export class FPS {
  estado: EstadoMM | null = null;
  private pos = new THREE.Vector3();
  private vy = 0;
  private caixas = caixasArena();
  private vista = new THREE.Group(); // arma na frente da câmera
  private modeloAtual = '';
  private atirando = false;
  private soltouGatilho = true;
  private zoom = false;
  private ultimoTiro = 0;
  private recarregandoAte = 0;
  private coice = 0;
  private faseAntes = '';
  private rodadaAntes = 0;
  private tracos: { linha: THREE.Line; ate: number }[] = [];
  private armasRemotas = new Map<string, { id: string; g: THREE.Group }>();
  private marcasTime = new Map<string, THREE.Mesh>();
  private assistindo = 0; // índice de quem estou assistindo depois de morrer
  private hud: HTMLElement;
  private mira: HTMLElement;
  private compra: HTMLElement;
  private placarEl: HTMLElement;
  private feed: HTMLElement;
  private faixa: HTMLElement;
  private botoesToque: HTMLElement;
  private flash: HTMLElement;
  espectador = false; // assistindo pela arquibancada (quem não está jogando)
  private anguloEspectador = 0;

  constructor(private c: Contexto) {
    const { el } = c;
    this.hud = el('div', { cls: 'fps-hud', hidden: true });
    this.mira = el('div', { cls: 'fps-mira', hidden: true });
    this.compra = el('div', { cls: 'fps-compra', hidden: true });
    this.placarEl = el('div', { cls: 'fps-placar', hidden: true });
    this.feed = el('div', { cls: 'fps-feed' });
    this.faixa = el('div', { cls: 'fps-faixa', hidden: true });
    this.flash = el('div', { cls: 'fps-dano', hidden: true });
    this.botoesToque = el(
      'div',
      { cls: 'fps-toque', hidden: true },
      el('button', { cls: 'fps-b atirar', textContent: '🔫', onpointerdown: (e: PointerEvent) => ((this.atirando = true), e.preventDefault()), onpointerup: () => ((this.atirando = false), (this.soltouGatilho = true)) }),
      el('button', { cls: 'fps-b', textContent: '↻', onclick: () => this.recarregar() }),
      el('button', { cls: 'fps-b', textContent: '⇄', onclick: () => this.trocar() }),
      el('button', { cls: 'fps-b', textContent: '🛒', onclick: () => this.alternarCompra() }),
    );
    c.app.append(this.flash, this.mira, this.hud, this.faixa, this.feed, this.compra, this.placarEl, this.botoesToque);
    c.camera.add(this.vista);
    c.cena.add(c.camera);
    this.vista.position.set(0.22, -0.2, -0.45);
    this.vista.visible = false;

    addEventListener('keydown', (e) => {
      if (!this.ativo || e.target instanceof HTMLInputElement) return;
      if (e.code === 'KeyR') this.recarregar();
      else if (e.code === 'Digit1') this.empunhar('primaria');
      else if (e.code === 'Digit2') this.empunhar('secundaria');
      else if (e.code === 'Digit3') this.empunhar('faca');
      else if (e.code === 'KeyB') this.alternarCompra();
      else if (e.code === 'Tab') {
        this.placarEl.hidden = false;
        this.desenharPlacar();
      } else return;
      e.preventDefault();
    });
    addEventListener('keyup', (e) => {
      if (e.code === 'Tab') this.placarEl.hidden = true;
    });
    c.canvas.addEventListener('mousedown', (e) => {
      if (!this.ativo) return;
      if (document.pointerLockElement !== c.canvas) {
        void c.canvas.requestPointerLock();
        // Em desenvolvimento (testes no navegador sem tela), o clique também atira.
        if (!import.meta.env.DEV) return;
      }
      if (e.button === 0) this.atirando = true;
      if (e.button === 2 && this.minha?.arma === 'primaria' && this.minha.primaria === 'awp') this.zoom = !this.zoom;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.atirando = false;
        this.soltouGatilho = true;
      }
    });
    addEventListener('mousemove', (e) => {
      if (!this.ativo || document.pointerLockElement !== c.canvas) return;
      const sens = this.zoom ? 0.0006 : 0.0022;
      c.controles.yaw -= e.movementX * sens;
      c.controles.pitch = Math.max(-1.45, Math.min(1.45, c.controles.pitch + e.movementY * sens));
    });
    c.canvas.addEventListener('contextmenu', (e) => this.ativo && e.preventDefault());
  }

  /** Estou jogando esta partida? */
  get ativo(): boolean {
    return Boolean(this.estado?.jogadores[this.c.euId()]);
  }

  private get minha(): JogadorMM | undefined {
    return this.estado?.jogadores[this.c.euId()];
  }

  /** Quem deve ficar escondido (morto) no mata-mata. */
  oculto(id: string): boolean {
    const j = this.estado?.jogadores[id];
    return Boolean(j && !j.vivo);
  }

  receberEstado(e: EstadoMM | null): void {
    const antes = this.estado;
    this.estado = e;
    const eu = this.c.euId();
    if (!e) {
      this.sairDoModo(antes);
      return;
    }
    const j = e.jogadores[eu];
    // Começo de rodada (ou da partida): vai para o lugar de nascer, olhando para o meio do mapa.
    const novaRodada = e.fase === 'compra' && (this.faseAntes !== 'compra' || this.rodadaAntes !== e.rodada);
    if (j && (novaRodada || !antes)) {
      this.pos.set(DOMO[0] + j.spawn[0], 0, DOMO[1] + j.spawn[1]);
      this.vy = 0;
      this.c.controles.yaw = j.time === 'TR' ? 0 : Math.PI;
      this.c.controles.pitch = 0;
      this.recarregandoAte = 0;
      if (!antes) this.entrarNoModo(j);
      if (e.rodada > 1) this.mostrarFaixa(`Rodada ${e.rodada} · compre suas armas (B)`, 2500);
    }
    if (e.fase === 'fimRodada' && this.faseAntes === 'rodada' && e.vencedorRodada) {
      const ganhou = j ? j.time === e.vencedorRodada : null;
      this.mostrarFaixa(`${NOME_TIME[e.vencedorRodada]} venceram a rodada${ganhou === null ? '' : ganhou ? ' 🎉' : ''}`, 3500, COR_TIME[e.vencedorRodada]);
    }
    this.faseAntes = e.fase;
    this.rodadaAntes = e.rodada;
    if (!j && !antes) this.c.aviso('🔫 Começou um mata-mata no domo. Clique em 👀 Assistir para ver da arquibancada.');
    this.atualizarArmasRemotas();
    this.desenharHud();
    if (!this.compra.hidden) this.desenharCompra();
    if (!this.placarEl.hidden) this.desenharPlacar();
  }

  private entrarNoModo(j: JogadorMM): void {
    this.c.meuBoneco().grupo.visible = false;
    this.vista.visible = true;
    this.mira.hidden = false;
    this.hud.hidden = false;
    this.botoesToque.hidden = !this.c.controles.toque;
    this.c.controles.ativo = true;
    this.c.camera.near = 0.03;
    this.c.camera.updateProjectionMatrix();
    this.mostrarFaixa(`Você é ${j.time === 'TR' ? 'TR 🟠' : 'CT 🔵'} · clique na tela para mirar · B compra armas`, 4500, COR_TIME[j.time]);
  }

  private sairDoModo(antes: EstadoMM | null): void {
    if (document.pointerLockElement === this.c.canvas) void document.exitPointerLock();
    this.vista.visible = false;
    for (const x of [this.mira, this.hud, this.compra, this.placarEl, this.faixa, this.botoesToque]) x.hidden = true;
    this.feed.replaceChildren();
    for (const { g } of this.armasRemotas.values()) g.removeFromParent();
    this.armasRemotas.clear();
    for (const m of this.marcasTime.values()) m.removeFromParent();
    this.marcasTime.clear();
    this.zoom = false;
    this.espectador = false;
    this.c.camera.fov = 60;
    this.c.camera.near = 0.1;
    this.c.camera.updateProjectionMatrix();
    this.c.meuBoneco().grupo.visible = true;
    // Quem jogou volta para a praça.
    if (antes?.jogadores[this.c.euId()]) this.voltarPraca = true;
  }

  /** Só para testes em desenvolvimento: coloca o jogador num ponto da arena (relativo ao domo). */
  teleportarTeste(x: number, z: number, yaw: number): void {
    this.pos.set(DOMO[0] + x, 0, DOMO[1] + z);
    this.c.controles.yaw = yaw;
    this.c.controles.pitch = 0;
  }

  /** Lido pelo jogo: depois de um mata-mata, devolve o boneco para a praça. */
  voltarPraca = false;

  /* ---------- Ações ---------- */

  private recarregar(): void {
    const j = this.minha;
    if (!j?.vivo || j.arma === 'faca') return;
    const a = this.armaAtual(j);
    const m = j.municao[a.id];
    if (!m || m[0] >= a.pente || m[1] <= 0 || this.recarregandoAte > performance.now()) return;
    this.recarregandoAte = performance.now() + a.recargaMs;
    this.c.rede()?.mandarMM({ k: 'recarregar' });
    setTimeout(() => {
      // Previsão local até o servidor confirmar no próximo estado.
      const jj = this.minha;
      const mm = jj?.municao[a.id];
      if (mm) {
        const falta = Math.min(a.pente - mm[0], mm[1]);
        mm[0] += falta;
        mm[1] -= falta;
      }
      this.desenharHud();
    }, a.recargaMs);
    this.desenharHud();
  }

  private empunhar(slot: SlotArma): void {
    const j = this.minha;
    if (!j?.vivo || (slot === 'primaria' && !j.primaria) || j.arma === slot) return;
    j.arma = slot;
    this.zoom = false;
    this.recarregandoAte = 0;
    this.c.rede()?.mandarMM({ k: 'empunhar', slot });
    this.desenharHud();
  }

  private trocar(): void {
    const j = this.minha;
    if (!j) return;
    const ordem: SlotArma[] = ['primaria', 'secundaria', 'faca'];
    for (let i = 1; i <= 3; i++) {
      const s = ordem[(ordem.indexOf(j.arma) + i) % 3];
      if (s !== 'primaria' || j.primaria) {
        this.empunhar(s);
        return;
      }
    }
  }

  private armaAtual(j: JogadorMM): Arma {
    return armaPorId(j.arma === 'faca' ? 'faca' : j.arma === 'primaria' ? j.primaria! : j.secundaria);
  }

  private alternarCompra(): void {
    if (!this.ativo) return;
    this.compra.hidden = !this.compra.hidden;
    if (!this.compra.hidden) {
      if (document.pointerLockElement === this.c.canvas) void document.exitPointerLock();
      this.desenharCompra();
    }
  }

  private podeComprar(): boolean {
    const e = this.estado;
    return Boolean(e && this.minha?.vivo && (e.fase === 'compra' || (e.fase === 'rodada' && e.restanteMs > 80000)));
  }

  private desenharCompra(): void {
    const { el } = this.c;
    const j = this.minha;
    if (!j) return;
    const pode = this.podeComprar();
    const item = (id: string, nome: string, preco: number, ok: boolean) =>
      el('button', {
        cls: 'fps-item',
        disabled: !pode || !ok || j.dinheiro < preco,
        onclick: () => {
          this.c.rede()?.mandarMM({ k: 'comprar', item: id });
        },
        innerHTML: `<span>${nome}</span><small>$${preco}</small>`,
      });
    const grupo = (titulo: string, ...filhos: HTMLElement[]) => el('div', { cls: 'fps-grupo' }, el('strong', { textContent: titulo }), ...filhos);
    const armas = (slot: string) => ARMAS_MM.filter((a) => a.slot === slot && (!a.time || a.time === j.time)).map((a) => item(a.id, a.nome, a.preco, slot === 'primaria' ? j.primaria !== a.id : j.secundaria !== a.id));
    this.compra.replaceChildren(
      ...nos(
      el('div', { cls: 'fps-compra-topo' }, el('h3', { textContent: '🛒 Comprar' }), el('span', { textContent: `$${j.dinheiro}` }), el('button', { cls: 'btn', textContent: '✕ (B)', onclick: () => (this.compra.hidden = true) })),
      pode ? null : el('p', { cls: 'nota', textContent: 'A compra fecha 20 s depois do começo da rodada (ou quando você morre).' }),
      el('div', { cls: 'fps-grupos' }, grupo('Pistolas', ...armas('secundaria')), grupo('Principais', ...armas('primaria')), grupo('Equipamento', item('colete', 'Colete', PRECO_COLETE, j.armadura < 100), item('capacete', 'Colete + capacete', PRECO_CAPACETE, !j.capacete))),
      ),
    );
  }

  private desenharPlacar(): void {
    const e = this.estado;
    if (!e) return;
    const { el } = this.c;
    const nomes = new Map(this.c.remotos().map((r) => [r.id, r.nome]));
    const coluna = (time: Time) =>
      el(
        'div',
        { cls: 'fps-coluna' },
        el('strong', { textContent: `${NOME_TIME[time]} · ${e.placar[time]}` }),
        ...Object.entries(e.jogadores)
          .filter(([, j]) => j.time === time)
          .sort((a, b) => b[1].abates - a[1].abates)
          .map(([id, j]) => el('div', { cls: `fps-linha${j.vivo ? '' : ' morto'}${id === this.c.euId() ? ' eu' : ''}` }, el('span', { textContent: `${j.vivo ? '' : '💀 '}${id === this.c.euId() ? 'Você' : nomes.get(id) ?? '?'}` }), el('span', { textContent: `${j.abates} / ${j.mortes}` }), el('span', { textContent: `$${j.dinheiro}` }))),
      );
    this.placarEl.replaceChildren(el('div', { cls: 'fps-colunas' }, coluna('TR'), coluna('CT')));
    this.placarEl.style.setProperty('--tr', COR_TIME.TR);
  }

  private mostrarFaixa(texto: string, ms: number, cor = '#fff'): void {
    this.faixa.textContent = texto;
    this.faixa.style.borderColor = cor;
    this.faixa.hidden = false;
    clearTimeout((this.faixa as unknown as { t?: number }).t);
    (this.faixa as unknown as { t?: number }).t = window.setTimeout(() => (this.faixa.hidden = true), ms);
  }

  private desenharHud(): void {
    const e = this.estado;
    const j = this.minha;
    if (!e || !j) return;
    const { el } = this.c;
    const a = this.armaAtual(j);
    const m = j.municao[a.id];
    const seg = Math.ceil(e.restanteMs / 1000);
    const relogio = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    const recarregando = this.recarregandoAte > performance.now();
    this.hud.replaceChildren(
      ...nos(
      el('div', { cls: 'fps-topo' }, el('span', { cls: 'tr', textContent: `TR ${e.placar.TR}` }), el('span', { textContent: e.fase === 'compra' ? `🛒 ${relogio}` : relogio }), el('span', { cls: 'ct', textContent: `${e.placar.CT} CT` })),
      el('div', { cls: 'fps-vida' }, el('span', { textContent: `❤️ ${j.hp}` }), el('span', { textContent: `🛡 ${j.armadura}${j.capacete ? '⛑' : ''}` }), el('span', { cls: 'dinheiro', textContent: `$${j.dinheiro}` })),
      el('div', { cls: 'fps-arma' }, el('strong', { textContent: `${ICONE_ARMA[a.id] ?? ''} ${a.nome}` }), a.slot === 'faca' ? null : el('span', { textContent: recarregando ? 'recarregando…' : `${m?.[0] ?? 0} / ${m?.[1] ?? 0}` })),
      e.fase === 'compra' ? el('div', { cls: 'fps-aviso-compra', textContent: 'Fase de compra: aperte B (ou 🛒) para escolher suas armas' }) : null,
      !j.vivo ? el('div', { cls: 'fps-morto', textContent: '💀 Você morreu · assistindo seu time até a próxima rodada' }) : null,
      ),
    );
    this.hud.style.setProperty('--time', COR_TIME[j.time]);
  }

  /* ---------- Eventos do servidor ---------- */

  tiroDeOutro(de: string, o: [number, number, number], p: [number, number, number], arma: string): void {
    if (de === this.c.euId()) return;
    const ini = new THREE.Vector3(DOMO[0] + o[0], o[1] - 0.15, DOMO[1] + o[2]);
    const fim = new THREE.Vector3(DOMO[0] + p[0], p[1], DOMO[1] + p[2]);
    this.traco(ini, fim, '#fde68a');
    const dist = ini.distanceTo(this.c.camera.position);
    somTiro(0.35 / (1 + dist / 12), arma === 'awp');
  }

  dano(para: string, hp: number, cabeca: boolean, de: string): void {
    if (para === this.c.euId()) {
      this.flash.hidden = false;
      setTimeout(() => (this.flash.hidden = true), 180);
      const j = this.minha;
      if (j) j.hp = hp;
      this.desenharHud();
    } else if (de === this.c.euId()) {
      // Marcador de acerto na mira.
      this.mira.classList.add(cabeca ? 'acerto-cabeca' : 'acerto');
      setTimeout(() => this.mira.classList.remove('acerto', 'acerto-cabeca'), 140);
    }
  }

  abate(de: string, para: string, arma: string, cabeca: boolean): void {
    const nomes = new Map(this.c.remotos().map((r) => [r.id, r.nome]));
    const nome = (id: string) => (id === this.c.euId() ? 'Você' : nomes.get(id) ?? '?');
    const timeDe = this.estado?.jogadores[de]?.time ?? 'TR';
    const timePara = this.estado?.jogadores[para]?.time ?? 'CT';
    const linha = this.c.el(
      'div',
      { cls: 'fps-abate' },
      this.c.el('span', { textContent: nome(de) }),
      this.c.el('em', { textContent: ` ${armaPorId(arma)?.nome ?? arma}${cabeca ? ' 🎯' : ''} ` }),
      this.c.el('span', { textContent: nome(para) }),
    );
    (linha.children[0] as HTMLElement).style.color = COR_TIME[timeDe];
    (linha.children[2] as HTMLElement).style.color = COR_TIME[timePara];
    this.feed.prepend(linha);
    while (this.feed.children.length > 5) this.feed.lastChild?.remove();
    setTimeout(() => linha.remove(), 7000);
    const j = this.estado?.jogadores[para];
    if (j) j.vivo = false;
    if (para === this.c.euId()) {
      this.mostrarFaixa(`💀 ${nome(de)} te pegou${cabeca ? ' na cabeça' : ''}`, 3000, '#ef4444');
      this.vista.visible = false;
      this.compra.hidden = true;
    }
    this.desenharHud();
  }

  /* ---------- Armas e times dos outros ---------- */

  private atualizarArmasRemotas(): void {
    const e = this.estado;
    for (const r of this.c.remotos()) {
      const j = e?.jogadores[r.id];
      const atual = this.armasRemotas.get(r.id);
      const id = j ? (j.arma === 'faca' ? 'faca' : j.arma === 'primaria' ? j.primaria ?? j.secundaria : j.secundaria) : '';
      if (atual && atual.id !== id) {
        atual.g.removeFromParent();
        this.armasRemotas.delete(r.id);
      }
      if (j && !this.armasRemotas.has(r.id)) {
        const skin = /arma:([a-z]+)/.exec(r.skin)?.[1] ?? 'padrao';
        const g = modeloArma(id, skin);
        g.scale.setScalar(1.3);
        g.rotation.y = Math.PI; // o modelo aponta para -z; o boneco olha para +z
        g.position.set(0.28, 1.15, 0.35);
        r.boneco.grupo.add(g);
        this.armasRemotas.set(r.id, { id, g });
      }
      // Faixa do time no braço (laranja TR, azul CT).
      if (j && !this.marcasTime.has(r.id)) {
        const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.32), new THREE.MeshBasicMaterial({ color: COR_TIME[j.time] }));
        faixa.position.y = 1.36;
        r.boneco.grupo.add(faixa);
        this.marcasTime.set(r.id, faixa);
      }
    }
  }

  /* ---------- Quadro ---------- */

  /** Um quadro em primeira pessoa. Devolve a pose para mandar ao servidor. */
  quadro(dt: number): [number, number, number, number, number] | null {
    const e = this.estado;
    const j = this.minha;
    if (!e || !j) return null;
    const cam = this.c.camera;
    const ctl = this.c.controles;
    ctl.ler();

    // Morto: acompanha um colega vivo.
    if (!j.vivo) {
      const colegas = this.c.remotos().filter((r) => e.jogadores[r.id]?.time === j.time && e.jogadores[r.id]?.vivo);
      const alvo = colegas[this.assistindo % Math.max(1, colegas.length)];
      if (alvo) {
        const g = alvo.boneco.grupo;
        cam.position.lerp(new THREE.Vector3(g.position.x - Math.sin(g.rotation.y) * 4, 3, g.position.z - Math.cos(g.rotation.y) * 4), 1 - Math.exp(-dt * 6));
        cam.lookAt(g.position.x, 1.4, g.position.z);
      }
      if (this.atirando && this.soltouGatilho) {
        this.assistindo++;
        this.soltouGatilho = false;
      }
      return null;
    }

    // Andar: WASD relativo para onde olha; Shift anda devagar; congelado na fase de compra.
    const congelado = e.fase === 'compra';
    const a = this.armaAtual(j);
    const velMax = (ctl.correr ? 2.5 : a.id === 'faca' ? 5.6 : a.id === 'awp' ? 4.3 : 5) * (this.zoom ? 0.5 : 1);
    const fx = -Math.sin(ctl.yaw);
    const fz = -Math.cos(ctl.yaw);
    const mx = congelado ? 0 : -fz * ctl.mover.x + fx * ctl.mover.y;
    const mz = congelado ? 0 : fx * ctl.mover.x + fz * ctl.mover.y;
    const quanto = Math.min(1, Math.hypot(mx, mz));
    if (quanto > 0.05) {
      const n = Math.hypot(mx, mz);
      this.pos.x += (mx / n) * velMax * quanto * dt;
      this.pos.z += (mz / n) * velMax * quanto * dt;
    }
    if (this.pos.y <= 0 && ctl.pegarPulo() && !congelado) this.vy = 7.5;
    this.vy -= 24 * dt;
    this.pos.y = Math.max(0, this.pos.y + this.vy * dt);
    if (this.pos.y === 0) this.vy = Math.max(0, this.vy);
    resolverColisao(this.pos, 0.35, this.caixas);
    this.pos.x = Math.max(DOMO[0] - LIMITE_ARENA + 0.5, Math.min(DOMO[0] + LIMITE_ARENA - 0.5, this.pos.x));
    this.pos.z = Math.max(DOMO[1] - LIMITE_ARENA + 0.5, Math.min(DOMO[1] + LIMITE_ARENA - 0.5, this.pos.z));

    // Câmera nos olhos (o coice sobe a mira e volta).
    this.coice = Math.max(0, this.coice - dt * 2.5);
    cam.position.set(this.pos.x, this.pos.y + ALTURA_OLHO, this.pos.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = ctl.yaw;
    cam.rotation.x = -(ctl.pitch - this.coice);
    const fovAlvo = this.zoom ? 18 : 75;
    if (Math.abs(cam.fov - fovAlvo) > 0.5) {
      cam.fov += (fovAlvo - cam.fov) * Math.min(1, dt * 14);
      cam.updateProjectionMatrix();
    }
    this.vista.visible = !this.zoom;
    this.mira.classList.toggle('luneta', this.zoom);

    // Arma na mão (troca o modelo quando muda) com balanço ao andar.
    const skin = this.c.minhaArma();
    const chave = `${a.id}:${skin}`;
    if (chave !== this.modeloAtual) {
      this.vista.clear();
      this.vista.add(modeloArma(a.id, skin));
      this.modeloAtual = chave;
    }
    const t = performance.now() / 1000;
    this.vista.position.set(0.22 + Math.sin(t * 9) * 0.008 * quanto, -0.2 + Math.abs(Math.cos(t * 9)) * 0.01 * quanto - this.coice * 0.15, -0.45 + this.coice * 0.25);

    // Tiro.
    if (this.atirando && !congelado && this.compra.hidden) this.tentarAtirar(a, j, quanto);
    if (!this.atirando) this.soltouGatilho = true;

    // Traços de bala somem rápido.
    const agora = performance.now();
    this.tracos = this.tracos.filter((x) => {
      if (agora < x.ate) return true;
      x.linha.removeFromParent();
      x.linha.geometry.dispose();
      return false;
    });
    if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) this.desenharHud();

    // Pose para os outros: virado para onde olha.
    return [this.pos.x, this.pos.y, this.pos.z, ctl.yaw + Math.PI, quanto > 0.05 ? (ctl.correr ? 1 : 2) : this.pos.y > 0.05 ? 3 : 0];
  }

  private tentarAtirar(a: Arma, j: JogadorMM, movendo: number): void {
    const agora = performance.now();
    if (agora - this.ultimoTiro < a.cadenciaMs || this.recarregandoAte > agora) return;
    if (!a.auto && !this.soltouGatilho) return;
    const m = j.municao[a.id];
    if (a.slot !== 'faca' && (!m || m[0] <= 0)) {
      if (m && m[1] > 0) this.recarregar();
      return;
    }
    this.soltouGatilho = false;
    this.ultimoTiro = agora;
    if (m && a.slot !== 'faca') m[0]--;

    // Direção: para onde a câmera olha + dispersão (andando ou no ar erra mais; AWP sem luneta erra muito).
    const cam = this.c.camera;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    let disp = a.dispersao * (1 + movendo * 2.5) * (this.pos.y > 0.05 ? 4 : 1);
    if (a.mira && !this.zoom) disp = 0.09;
    dir.x += (Math.random() - 0.5) * disp * 2;
    dir.y += (Math.random() - 0.5) * disp * 2;
    dir.z += (Math.random() - 0.5) * disp * 2;
    dir.normalize();
    const o = cam.position.clone();

    // O que a bala acerta primeiro: parede/caixote ou inimigo (cabeça ou corpo).
    let tParede = a.alcance;
    for (const [x, z, w, d, h] of MAPA_ARENA) {
      const tt = raioCaixa(o, dir, new THREE.Vector3(DOMO[0] + x - w / 2, 0, DOMO[1] + z - d / 2), new THREE.Vector3(DOMO[0] + x + w / 2, h, DOMO[1] + z + d / 2));
      if (tt < tParede) tParede = tt;
    }
    let alvo: string | undefined;
    let cabeca = false;
    let tAlvo = tParede;
    const e = this.estado!;
    for (const r of this.c.remotos()) {
      const jr = e.jogadores[r.id];
      if (!jr?.vivo || jr.time === j.time) continue;
      const g = r.boneco.grupo.position;
      const tc = raioEsfera(o, dir, new THREE.Vector3(g.x, g.y + 1.65, g.z), 0.22);
      const tb = raioCaixa(o, dir, new THREE.Vector3(g.x - 0.33, g.y, g.z - 0.33), new THREE.Vector3(g.x + 0.33, g.y + 1.45, g.z + 0.33));
      if (tc < tAlvo) {
        tAlvo = tc;
        alvo = r.id;
        cabeca = true;
      }
      if (tb < tAlvo) {
        tAlvo = tb;
        alvo = r.id;
        cabeca = false;
      }
    }
    this.c.rede()?.mandarMM({ k: 'tiro', d: [dir.x, dir.y, dir.z], alvo, cabeca: alvo ? cabeca : undefined });

    // Efeitos: coice, traço, som.
    this.coice = Math.min(0.25, this.coice + (a.mira ? 0.08 : a.auto ? 0.018 : 0.03));
    if (a.slot !== 'faca') {
      const ini = new THREE.Vector3(0.22, -0.16, -0.9).applyMatrix4(cam.matrixWorld);
      this.traco(ini, o.clone().add(dir.multiplyScalar(Math.min(tAlvo, a.alcance))), '#fef08a');
      somTiro(0.35, a.id === 'awp');
    }
    if (a.mira) this.zoom = false;
    this.desenharHud();
  }

  private traco(de: THREE.Vector3, ate: THREE.Vector3, cor: string): void {
    const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints([de, ate]), new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: 0.85 }));
    this.c.cena.add(linha);
    this.tracos.push({ linha, ate: performance.now() + 70 });
  }

  /** Quem não está jogando: câmera da arquibancada girando devagar em volta do domo (arrastar gira). */
  quadroEspectador(dt: number): void {
    this.anguloEspectador += dt * 0.08;
    const a = this.c.controles.yaw + this.anguloEspectador;
    const cam = this.c.camera;
    cam.position.set(DOMO[0] + Math.sin(a) * 58, 30, DOMO[1] + Math.cos(a) * 58);
    cam.lookAt(DOMO[0], 0, DOMO[1]);
    if (this.estado && Math.floor(performance.now() / 500) % 2 === 0) this.desenharPlacarEspectador();
  }

  private desenharPlacarEspectador(): void {
    const e = this.estado;
    if (!e) return;
    const seg = Math.ceil(e.restanteMs / 1000);
    this.faixa.hidden = false;
    this.faixa.style.borderColor = '#22d3ee';
    this.faixa.textContent = `👀 Mata-mata · TR ${e.placar.TR} x ${e.placar.CT} CT · rodada ${e.rodada} · ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  }
}
