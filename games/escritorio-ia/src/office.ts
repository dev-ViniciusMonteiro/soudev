import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AgentStatus } from './types';

export type Pick = { kind: 'desk'; index: number } | { kind: 'shop' } | { kind: 'leader' };

export interface DeskView {
  name: string;
  roleTitle: string;
  icon: string;
  color: number;
  model: string;
  status: AgentStatus;
}

const STATUS_STYLE: Record<AgentStatus, { label: string; color: string }> = {
  aguardando: { label: 'Aguardando missão', color: '#94a3b8' },
  trabalhando: { label: 'Trabalhando…', color: '#38bdf8' },
  entregue: { label: 'Relatório entregue', color: '#a78bfa' },
  refazendo: { label: 'Refazendo…', color: '#fbbf24' },
  ok: { label: 'OK ✓ Contrato concluído', color: '#4ade80' },
  encerrado: { label: 'Contrato encerrado', color: '#f87171' },
  erro: { label: 'Erro', color: '#f87171' },
};

/** Posições das 6 mesas (2 fileiras de 3), da mesa do líder e da loja. */
const DESKS: [number, number][] = [
  [-5, -1],
  [0, -1],
  [5, -1],
  [-5, 4],
  [0, 4],
  [5, 4],
];
const LEADER_DESK: [number, number] = [0, -6.3];
const SHOP: [number, number] = [-10.2, -2.5]; // encostada na parede esquerda (o painel lateral cobre a direita)

const shortModel = (id: string): string => (id.length > 34 ? `${id.slice(0, 33)}…` : id);

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Placa flutuante (sempre virada para a câmera) com nome, função, modelo e status. */
class Label {
  readonly sprite: THREE.Sprite;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;

  constructor(width = 3.4) {
    this.canvas.width = 512;
    this.canvas.height = 236;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false }));
    this.sprite.scale.set(width, (width * 236) / 512, 1);
  }

  draw(lines: { text: string; size: number; color: string; weight?: string }[], accent: string, pill?: { text: string; color: string }): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 236);
    ctx.fillStyle = 'rgba(8,12,24,.86)';
    roundRect(ctx, 6, 6, 500, 224, 22);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.stroke();
    let y = 54;
    ctx.textAlign = 'center';
    for (const l of lines) {
      ctx.font = `${l.weight ?? '600'} ${l.size}px system-ui, sans-serif`;
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, 256, y, 480);
      y += l.size + 14;
    }
    if (pill) {
      ctx.font = '700 26px system-ui, sans-serif';
      const w = Math.min(470, ctx.measureText(pill.text).width + 40);
      ctx.fillStyle = pill.color;
      roundRect(ctx, 256 - w / 2, 172, w, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#06101f';
      ctx.fillText(pill.text, 256, 203, 450);
    }
    this.texture.needsUpdate = true;
  }
}

/** Personagem simples: corpo + cabeça + braços, na cor da função. */
function makePerson(color: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf1c7a3, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.95, 16), mat);
  body.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), skin);
  head.position.y = 1.68;
  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
  const armL = new THREE.Mesh(armGeo, mat);
  armL.position.set(-0.42, 1.05, 0.15);
  armL.rotation.x = -0.9;
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(body, head, armL, armR);
  g.userData = { body, head, armL, armR, mat };
  return g;
}

interface DeskSlot {
  group: THREE.Group;
  label: Label;
  screen: CanvasRenderingContext2D;
  screenTex: THREE.CanvasTexture;
  person: THREE.Group | null;
  view: DeskView | null;
  halo: THREE.Mesh;
  phase: number;
}

export class Office {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly desks: DeskSlot[] = [];
  private readonly pickables: THREE.Object3D[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly leader: THREE.Group;
  private readonly leaderLabel = new Label(3.6);
  private leaderReading = false;
  private leaderModel = '';
  private leaderT = 0;
  private time = 0;
  private screenTimer = 0;
  private downAt = { x: 0, y: 0 };

  constructor(
    private readonly container: HTMLElement,
    private readonly onPick: (pick: Pick) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x0b1020);
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(9, 19, 17);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(2.5, 0, 0.5);
    this.controls.enableDamping = true;
    this.controls.minDistance = 9;
    this.controls.maxDistance = 42;
    this.controls.maxPolarAngle = 1.35;

    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2238, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(8, 16, 10);
    this.scene.add(sun);

    this.buildRoom();
    DESKS.forEach(([x, z], i) => this.desks.push(this.buildDesk(x, z, i)));
    this.leader = this.buildLeader();
    this.buildShop();

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => (this.downAt = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) < 6) this.pick(e);
    });
    new ResizeObserver(() => this.resize()).observe(container);

    let last = performance.now();
    const loop = (t: number): void => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      this.update(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private woodTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < 8; i++) {
      const shade = 110 + ((i * 37) % 30);
      ctx.fillStyle = `rgb(${shade + 40},${shade}, ${shade - 40})`;
      ctx.fillRect(0, i * 32, 256, 32);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(0, i * 32, 256, 2);
      ctx.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 5);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private buildRoom(): void {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 20), new THREE.MeshStandardMaterial({ map: this.woodTexture(), roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(1, 0, -0.5);
    this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b3350, roughness: 0.9 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(28, 4.5, 0.3), wallMat);
    back.position.set(1, 2.25, -10.5);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 20), wallMat);
    left.position.set(-13, 2.25, -0.5);
    this.scene.add(back, left);

    // Janelas com a cidade à noite (faixas emissivas).
    const winMat = new THREE.MeshStandardMaterial({ color: 0x1b2a55, emissive: 0x3b6cff, emissiveIntensity: 0.35 });
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.2), winMat);
      w.position.set(-8 + i * 6.5, 2.5, -10.34);
      this.scene.add(w);
    }
    // Porta (por onde os contratados saem).
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), new THREE.MeshStandardMaterial({ color: 0x0e1424 }));
    door.position.set(-12.84, 1.6, 6);
    door.rotation.y = Math.PI / 2;
    this.scene.add(door);

    // Plantas.
    const potMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3c });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e5b });
    for (const [x, z] of [
      [-12, -9.5],
      [13.5, -9.5],
      [-12, 8.5],
    ]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 12), potMat);
      pot.position.set(x, 0.3, z);
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), leafMat);
      leaves.position.set(x, 1.2, z);
      this.scene.add(pot, leaves);
    }
  }

  private buildDesk(x: number, z: number, index: number): DeskSlot {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.4), new THREE.MeshStandardMaterial({ color: 0xd9c7a8, roughness: 0.6 }));
    top.position.y = 0.95;
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4f });
    for (const [lx, lz] of [
      [-1.3, -0.6],
      [1.3, -0.6],
      [-1.3, 0.6],
      [1.3, 0.6],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), legMat);
      leg.position.set(lx, 0.47, lz);
      group.add(leg);
    }
    // Monitor com tela animada (virada para quem senta, de costas para a frente da sala).
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256;
    screenCanvas.height = 160;
    const screenTex = new THREE.CanvasTexture(screenCanvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.08), new THREE.MeshStandardMaterial({ color: 0x111318 }));
    monitor.position.set(0, 1.55, 0.1);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ map: screenTex }));
    screen.position.set(0, 1.55, 0.145);
    screen.rotation.y = Math.PI;
    screen.position.z = 0.05;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), legMat);
    stand.position.set(0, 1.18, 0.1);
    // Cadeira atrás da mesa.
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: 0x23293a }));
    chair.position.set(0, 0.55, -1.05);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.12), chair.material);
    back.position.set(0, 1.0, -1.45);
    group.add(top, monitor, screen, stand, chair, back);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.15, 40),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0, 0.03, -1.05);
    halo.visible = false;
    group.add(halo);

    const label = new Label();
    label.sprite.position.set(0, 3.2, -0.4);
    group.add(label.sprite);

    group.traverse((o) => (o.userData.pick = { kind: 'desk', index } satisfies Pick));
    this.pickables.push(group);
    this.scene.add(group);

    const slot: DeskSlot = { group, label, screen: screenCanvas.getContext('2d')!, screenTex, person: null, view: null, halo, phase: index };
    this.drawDesk(slot);
    return slot;
  }

  private buildLeader(): THREE.Group {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(4, 0.14, 1.6), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.5 }));
    desk.position.set(LEADER_DESK[0], 0.95, LEADER_DESK[1]);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.9, 1.4), new THREE.MeshStandardMaterial({ color: 0x4a3322 }));
    base.position.set(LEADER_DESK[0], 0.45, LEADER_DESK[1]);
    this.scene.add(desk, base);
    const leader = makePerson(0xffd166);
    leader.position.set(LEADER_DESK[0], 0, LEADER_DESK[1] - 1.3);
    // Gravata do líder.
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0xc81e3a }));
    tie.position.set(0, 1.12, 0.36);
    leader.add(tie);
    this.scene.add(leader);
    this.leaderLabel.sprite.position.set(LEADER_DESK[0], 3.6, LEADER_DESK[1] - 0.4);
    this.scene.add(this.leaderLabel.sprite);
    for (const o of [desk, base, leader, this.leaderLabel.sprite]) o.traverse((x) => (x.userData.pick = { kind: 'leader' } satisfies Pick));
    this.pickables.push(desk, base, leader, this.leaderLabel.sprite);
    this.drawLeader();
    return leader;
  }

  private buildShop(): void {
    const g = new THREE.Group();
    g.position.set(SHOP[0], 0, SHOP[1]);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 5), new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.4 }));
    counter.position.y = 0.55;
    const topMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 5.2), topMat);
    top.position.y = 1.12;
    const clerk = makePerson(0x14b8a6);
    clerk.position.set(-1.2, 0, 0);
    clerk.rotation.y = Math.PI / 2;
    // Caixas de "robôs" à venda.
    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: [0x7c4dff, 0xff9100, 0x00e676][i] }));
      box.position.set(0, 1.42, -1.5 + i * 1.5);
      g.add(box);
    }
    const sign = new Label(3.6);
    sign.draw(
      [
        { text: '🛒 LOJA DE AGENTES', size: 40, color: '#ffffff', weight: '800' },
        { text: 'Contrate até 6 funcionários de IA', size: 26, color: '#cbd5e1' },
      ],
      '#2dd4bf',
      { text: 'Clique para contratar', color: '#2dd4bf' },
    );
    sign.sprite.position.set(0, 3.4, 0);
    g.add(counter, top, clerk, sign.sprite);
    g.traverse((o) => (o.userData.pick = { kind: 'shop' } satisfies Pick));
    this.pickables.push(g);
    this.scene.add(g);
  }

  private drawLeader(): void {
    this.leaderLabel.draw(
      [
        { text: '🧑‍💼 Líder da equipe', size: 36, color: '#ffffff', weight: '800' },
        { text: shortModel(this.leaderModel || 'escolha o modelo na aba Equipe'), size: 24, color: '#fde68a' },
      ],
      '#ffd166',
      { text: this.leaderReading ? 'Lendo os relatórios…' : 'Coordenando', color: this.leaderReading ? '#38bdf8' : '#ffd166' },
    );
  }

  private drawDesk(slot: DeskSlot): void {
    const v = slot.view;
    if (!v) {
      slot.label.draw(
        [
          { text: '🪑 Mesa livre', size: 38, color: '#e2e8f0', weight: '800' },
          { text: 'Contrate um agente na loja', size: 26, color: '#94a3b8' },
        ],
        '#475569',
        { text: 'Clique para contratar', color: '#64748b' },
      );
    } else {
      const st = STATUS_STYLE[v.status];
      slot.label.draw(
        [
          { text: `${v.icon} ${v.name}`, size: 38, color: '#ffffff', weight: '800' },
          { text: v.roleTitle, size: 24, color: '#cbd5e1' },
          { text: shortModel(v.model), size: 22, color: '#7ff3ff' },
        ],
        `#${v.color.toString(16).padStart(6, '0')}`,
        { text: st.label, color: st.color },
      );
    }
    this.drawScreen(slot);
  }

  /** Tela do monitor: linhas de "código" rolando enquanto o agente trabalha. */
  private drawScreen(slot: DeskSlot): void {
    const ctx = slot.screen;
    const v = slot.view;
    ctx.fillStyle = v ? '#0b1224' : '#05070d';
    ctx.fillRect(0, 0, 256, 160);
    if (v) {
      const st = STATUS_STYLE[v.status];
      const working = v.status === 'trabalhando' || v.status === 'refazendo';
      for (let i = 0; i < 9; i++) {
        const w = 40 + ((i * 53 + Math.floor(slot.phase * (working ? 7 : 0))) % 170);
        ctx.fillStyle = i % 3 === 0 ? st.color : 'rgba(148,163,184,.55)';
        ctx.fillRect(14 + (i % 2) * 12, 14 + i * 15, w, 6);
      }
      if (v.status === 'ok') {
        ctx.fillStyle = '#4ade80';
        ctx.font = '700 64px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('✓', 128, 110);
      }
    }
    slot.screenTex.needsUpdate = true;
  }

  setDesk(index: number, view: DeskView | null): void {
    const slot = this.desks[index];
    if (!slot) return;
    const prev = slot.view;
    slot.view = view;
    if (view && (!slot.person || prev?.color !== view.color)) {
      if (slot.person) slot.group.remove(slot.person);
      slot.person = makePerson(view.color);
      slot.person.position.set(0, 0, -1.05);
      slot.person.traverse((o) => (o.userData.pick = { kind: 'desk', index } satisfies Pick));
      slot.group.add(slot.person);
    }
    if (!view && slot.person) {
      slot.group.remove(slot.person);
      slot.person = null;
    }
    if (slot.person && view) {
      const mat = slot.person.userData.mat as THREE.MeshStandardMaterial;
      mat.color.setHex(view.status === 'encerrado' ? 0x6b7280 : view.color);
    }
    slot.halo.visible = view?.status === 'ok';
    this.drawDesk(slot);
  }

  setLeader(model: string, reading: boolean): void {
    if (model === this.leaderModel && reading === this.leaderReading) return;
    this.leaderModel = model;
    this.leaderReading = reading;
    this.drawLeader();
  }

  private update(dt: number): void {
    this.time += dt;
    this.screenTimer += dt;
    const refreshScreens = this.screenTimer > 0.25;
    if (refreshScreens) this.screenTimer = 0;

    for (const slot of this.desks) {
      const p = slot.person;
      const v = slot.view;
      if (!p || !v) continue;
      const { armL, armR, head } = p.userData as Record<string, THREE.Mesh>;
      const working = v.status === 'trabalhando' || v.status === 'refazendo';
      slot.phase += dt;
      // Digitando: braços alternando e cabeça balançando.
      armL.rotation.x = working ? -0.9 + Math.sin(this.time * 14 + slot.phase) * 0.18 : -0.9;
      armR.rotation.x = working ? -0.9 + Math.cos(this.time * 14 + slot.phase) * 0.18 : -0.9;
      head.position.y = 1.68 + (working ? Math.sin(this.time * 6) * 0.02 : 0);
      // Missão aprovada: pulinho de comemoração.
      p.position.y = v.status === 'ok' ? Math.abs(Math.sin(this.time * 4 + slot.phase)) * 0.25 : 0;
      if (slot.halo.visible) slot.halo.rotation.z += dt;
      if (refreshScreens && working) this.drawScreen(slot);
    }

    // Líder: andando entre as mesas enquanto lê os relatórios; senão volta à mesa.
    const home = new THREE.Vector3(LEADER_DESK[0], 0, LEADER_DESK[1] - 1.3);
    let target = home;
    if (this.leaderReading) {
      this.leaderT += dt * 0.35;
      const occupied = this.desks.filter((d) => d.view);
      const list = occupied.length ? occupied : this.desks;
      const d = list[Math.floor(this.leaderT) % list.length].group.position;
      target = new THREE.Vector3(d.x + 1.8, 0, d.z - 1);
    }
    const pos = this.leader.position;
    const to = target.clone().sub(pos);
    const dist = to.length();
    if (dist > 0.05) {
      const step = Math.min(dist, dt * 3.2);
      pos.add(to.normalize().multiplyScalar(step));
      this.leader.rotation.y = Math.atan2(to.x, to.z);
      pos.y = Math.abs(Math.sin(this.time * 9)) * 0.06;
    } else {
      this.leader.rotation.y = 0;
      pos.y = 0;
    }
  }

  private pick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
    const pick = hit?.object.userData.pick as Pick | undefined;
    if (pick) this.onPick(pick);
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
