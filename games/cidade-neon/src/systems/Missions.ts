import * as THREE from 'three';
import type { City } from '../world/City';

/**
 * Missões da Cidade Neon. Um ponto verde marca o início da próxima missão; ao
 * chegar nele ela começa com tempo limite:
 *  - Entrega: leve a encomenda até o destino amarelo.
 *  - Corrida: passe pelos pontos rosa em sequência.
 * Concluir no prazo paga em R$ (distância + tempo que sobrou).
 *
 * Também ficam aqui as Oficinas: consertam o carro e despistam a polícia.
 * Todos os pontos usam vagas da cidade (sempre na beira da rua).
 */

export type MissionKind = 'entrega' | 'corrida';
export type MissionPhase = 'start' | 'active';
export type MissionEvent =
  | { type: 'started'; kind: MissionKind; timeLimit: number; total: number }
  | { type: 'checkpoint'; index: number; total: number }
  | { type: 'completed'; kind: MissionKind; reward: number }
  | { type: 'failed'; kind: MissionKind };

export const MISSION_INFO: Record<MissionKind, { label: string; icon: string; color: string }> = {
  entrega: { label: 'Entrega', icon: '📦', color: '#ffc533' },
  corrida: { label: 'Corrida', icon: '🏁', color: '#ff4fd8' },
};
export const START_COLOR = '#3dff8a';
export const GARAGE_COLOR = '#4aa3ff';

type Point = { x: number; z: number };
const manhattan = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const hex = (css: string): number => parseInt(css.slice(1), 16);

const REACH = 6;
const RACE_REACH = 9; // pontos de corrida são mais generosos (passa-se em velocidade)
const RACE_CHECKPOINTS = 5;

/** Coluna de luz + anel pulsante no chão (pontos de missão e oficinas). */
export class Marker {
  private readonly group = new THREE.Group();
  private readonly beamMat: THREE.MeshBasicMaterial;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private readonly ring: THREE.Mesh;
  private pulse = Math.random() * 6;

  constructor(scene: THREE.Scene, radius: number, height: number, color: string) {
    const common = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
    this.beamMat = new THREE.MeshBasicMaterial({ ...common, color: hex(color), opacity: 0.26, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.75, height, 24, 1, true), this.beamMat);
    beam.position.y = height / 2;
    this.ringMat = new THREE.MeshBasicMaterial({ ...common, color: hex(color), opacity: 0.85 });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.7, radius, 48), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;
    this.group.add(beam, this.ring);
    scene.add(this.group);
  }

  update(x: number, z: number, color: string, frameDt: number): void {
    this.pulse = (this.pulse + frameDt * 2.2) % (Math.PI * 2);
    this.beamMat.color.setHex(hex(color));
    this.ringMat.color.setHex(hex(color));
    const s = 1 + Math.sin(this.pulse) * 0.08;
    this.ring.scale.set(s, s, s);
    this.group.position.set(x, 0, z);
  }
}

/** Sorteia uma vaga a uma distância (em grade) entre minDist e ~2,2x minDist de `from`. */
function pickSpot(city: City, from: Point, minDist: number): Point {
  const spots = city.parkingSpots;
  if (!spots.length) return { x: city.center.x, z: city.center.z };
  let best = spots[0];
  let bestDist = -1;
  for (let i = 0; i < 40; i++) {
    const s = spots[Math.floor(Math.random() * spots.length)];
    const d = manhattan(s, from);
    if (d >= minDist && d < minDist * 2.2) return { x: s.x, z: s.z };
    if (d > bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return { x: best.x, z: best.z };
}

export class Missions {
  kind: MissionKind = 'entrega';
  phase: MissionPhase = 'start';
  readonly target: Point = { x: 0, z: 0 };
  timeLeft = 0;
  timeLimit = 0;
  index = 0;
  private checkpoints: Point[] = [];
  private route = 0;
  private played = 0;
  private readonly marker: Marker;

  constructor(
    scene: THREE.Scene,
    private readonly city: City,
  ) {
    this.marker = new Marker(scene, REACH, 60, START_COLOR);
  }

  get total(): number {
    return this.checkpoints.length;
  }

  get color(): string {
    return this.phase === 'start' ? START_COLOR : MISSION_INFO[this.kind].color;
  }

  /** Prepara o próximo ponto de início. A primeira missão é sempre uma entrega. */
  reset(from: Point): void {
    this.phase = 'start';
    this.timeLeft = 0;
    this.timeLimit = 0;
    this.index = 0;
    this.checkpoints = [];
    this.kind = this.played === 0 ? 'entrega' : Math.random() < 0.5 ? 'entrega' : 'corrida';
    Object.assign(this.target, pickSpot(this.city, from, 70));
  }

  distanceTo(x: number, z: number): number {
    return Math.hypot(this.target.x - x, this.target.z - z);
  }

  private begin(): MissionEvent {
    const start = { x: this.target.x, z: this.target.z };
    this.checkpoints = [];
    if (this.kind === 'entrega') {
      this.checkpoints.push(pickSpot(this.city, start, 260));
    } else {
      let prev = start;
      for (let i = 0; i < RACE_CHECKPOINTS; i++) {
        const next = pickSpot(this.city, prev, 110);
        this.checkpoints.push(next);
        prev = next;
      }
    }
    let route = 0;
    let prev = start;
    for (const c of this.checkpoints) {
      route += manhattan(prev, c);
      prev = c;
    }
    this.route = route;
    // Entrega: ~40 km/h de média + folga. Corrida: mais apertada (~50 km/h).
    this.timeLimit = Math.round(this.kind === 'entrega' ? 20 + route / 11 : 12 + route / 14);
    this.timeLeft = this.timeLimit;
    this.index = 0;
    this.phase = 'active';
    this.played++;
    Object.assign(this.target, this.checkpoints[0]);
    return { type: 'started', kind: this.kind, timeLimit: this.timeLimit, total: this.total };
  }

  update(dt: number, x: number, z: number): MissionEvent | null {
    if (this.phase === 'active') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        const kind = this.kind;
        this.reset({ x, z });
        return { type: 'failed', kind };
      }
    }

    const reach = this.phase === 'active' && this.kind === 'corrida' ? RACE_REACH : REACH;
    if (this.distanceTo(x, z) > reach) return null;
    if (this.phase === 'start') return this.begin();

    this.index++;
    if (this.index < this.total) {
      Object.assign(this.target, this.checkpoints[this.index]);
      return { type: 'checkpoint', index: this.index, total: this.total };
    }

    const kind = this.kind;
    const reward =
      kind === 'entrega'
        ? Math.round(this.route * 0.45 + this.timeLeft * 3)
        : Math.round(this.route * 0.6 + this.timeLeft * 6);
    this.reset({ x, z });
    return { type: 'completed', kind, reward };
  }

  render(frameDt: number): void {
    this.marker.update(this.target.x, this.target.z, this.color, frameDt);
  }
}

/** Oficinas espalhadas pela cidade: uma por quadrante. */
export class Garages {
  readonly spots: Point[] = [];
  private readonly markers: Marker[] = [];

  constructor(scene: THREE.Scene, city: City) {
    const q = city.half * 0.5;
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const want = { x: city.center.x + sx * q, z: city.center.z + sz * q };
      let best = city.parkingSpots[0] ?? want;
      let bestD = Infinity;
      for (const s of city.parkingSpots) {
        const d = Math.hypot(s.x - want.x, s.z - want.z);
        if (d < bestD) {
          best = s;
          bestD = d;
        }
      }
      this.spots.push({ x: best.x, z: best.z });
      this.markers.push(new Marker(scene, 5, 16, GARAGE_COLOR));
    }
  }

  /** Índice da oficina em que (x, z) está, ou -1. */
  at(x: number, z: number, radius = 6): number {
    return this.spots.findIndex((s) => Math.hypot(s.x - x, s.z - z) <= radius);
  }

  render(frameDt: number): void {
    this.spots.forEach((s, i) => this.markers[i].update(s.x, s.z, GARAGE_COLOR, frameDt));
  }
}

const MONEY_KEY = 'cidade-neon.dinheiro';

export function loadMoney(): number {
  try {
    const v = Number(localStorage.getItem(MONEY_KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function saveMoney(value: number): void {
  try {
    localStorage.setItem(MONEY_KEY, String(Math.max(0, Math.floor(value))));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): o dinheiro vale só nesta sessão.
  }
}
