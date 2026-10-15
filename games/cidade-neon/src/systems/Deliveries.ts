import * as THREE from 'three';
import type { City } from '../world/City';

/**
 * Sistema de entregas (criado para a Cidade Neon): um ponto de coleta aparece
 * na cidade; ao chegar nele, surge o destino com tempo limite. Entregar no
 * prazo paga em R$ conforme a distância e o tempo que sobrou.
 *
 * Os pontos usam as vagas de estacionamento da cidade (sempre na beira da rua),
 * então todo destino é alcançável de carro.
 */

export type DeliveryPhase = 'pickup' | 'dropoff';
export type DeliveryEvent =
  | { type: 'picked'; timeLimit: number }
  | { type: 'delivered'; reward: number }
  | { type: 'failed' };

const REACH_RADIUS = 6; // metros do centro do marcador para contar como chegada
const MIN_PICKUP_DIST = 70;
const MIN_DROPOFF_DIST = 260;
const SECONDS_PER_METER = 1 / 11; // ~40 km/h de média pelo trajeto em grade
const BASE_TIME = 20;
const PAY_PER_METER = 0.45;
const PAY_PER_SECOND_LEFT = 3;

const COLORS: Record<DeliveryPhase, number> = { pickup: 0x3dff8a, dropoff: 0xffc533 };

const manhattan = (a: { x: number; z: number }, b: { x: number; z: number }): number =>
  Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

export class Deliveries {
  phase: DeliveryPhase = 'pickup';
  readonly target = { x: 0, z: 0 };
  timeLeft = 0;
  timeLimit = 0;
  private route = 0; // distância (em grade) entre coleta e destino
  private readonly marker = new THREE.Group();
  private readonly beamMat: THREE.MeshBasicMaterial;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private readonly ring: THREE.Mesh;
  private pulse = 0;

  constructor(
    scene: THREE.Scene,
    private readonly city: City,
  ) {
    this.beamMat = new THREE.MeshBasicMaterial({
      color: COLORS.pickup,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(REACH_RADIUS * 0.55, REACH_RADIUS * 0.75, 60, 24, 1, true), this.beamMat);
    beam.position.y = 30;

    this.ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.pickup,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(REACH_RADIUS - 0.7, REACH_RADIUS, 48), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;

    this.marker.add(beam, this.ring);
    scene.add(this.marker);
  }

  /** Escolhe uma vaga longe o bastante de `from` (ou a mais distante entre as sorteadas). */
  private pickSpot(from: { x: number; z: number }, minDist: number): { x: number; z: number } {
    const spots = this.city.parkingSpots;
    if (!spots.length) return { x: this.city.center.x, z: this.city.center.z };
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

  /** Nova coleta a partir da posição atual. */
  reset(from: { x: number; z: number }): void {
    this.phase = 'pickup';
    this.timeLeft = 0;
    this.timeLimit = 0;
    Object.assign(this.target, this.pickSpot(from, MIN_PICKUP_DIST));
  }

  distanceTo(x: number, z: number): number {
    return Math.hypot(this.target.x - x, this.target.z - z);
  }

  update(dt: number, x: number, z: number): DeliveryEvent | null {
    if (this.phase === 'dropoff') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.reset({ x, z });
        return { type: 'failed' };
      }
    }

    if (this.distanceTo(x, z) > REACH_RADIUS) return null;

    if (this.phase === 'pickup') {
      const from = { x: this.target.x, z: this.target.z };
      Object.assign(this.target, this.pickSpot(from, MIN_DROPOFF_DIST));
      this.route = manhattan(from, this.target);
      this.timeLimit = Math.round(BASE_TIME + this.route * SECONDS_PER_METER);
      this.timeLeft = this.timeLimit;
      this.phase = 'dropoff';
      return { type: 'picked', timeLimit: this.timeLimit };
    }

    const reward = Math.round(this.route * PAY_PER_METER + this.timeLeft * PAY_PER_SECOND_LEFT);
    this.reset({ x, z });
    return { type: 'delivered', reward };
  }

  render(frameDt: number): void {
    this.pulse = (this.pulse + frameDt * 2.2) % (Math.PI * 2);
    const color = COLORS[this.phase];
    this.beamMat.color.setHex(color);
    this.ringMat.color.setHex(color);
    const s = 1 + Math.sin(this.pulse) * 0.08;
    this.ring.scale.set(s, s, s);
    this.marker.position.set(this.target.x, 0, this.target.z);
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
