// Tema de Halloween da sala (Sprint Retro): noite roxa, abóboras acesas em volta do chafariz e nos bancos,
// morcegos voando, água verde no chafariz. Liga e desliga sem recarregar o mundo.

import * as THREE from 'three';
import type { Mundo } from './mundo';

function abobora(): THREE.Group {
  const g = new THREE.Group();
  const laranja = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.6, flatShading: true, emissive: '#7c2d12', emissiveIntensity: 0.6 });
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), laranja);
  corpo.scale.y = 0.75;
  corpo.position.y = 0.34;
  const talo = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 6), new THREE.MeshStandardMaterial({ color: '#365314', flatShading: true }));
  talo.position.y = 0.72;
  // Rosto aceso (olhos e boca amarelos que brilham).
  const luz = new THREE.MeshBasicMaterial({ color: '#fde047' });
  const olho = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 3), luz);
  olho.rotation.x = Math.PI / 2;
  olho.position.set(-0.14, 0.42, 0.42);
  const olho2 = olho.clone();
  olho2.position.x = 0.14;
  const boca = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.02), luz);
  boca.position.set(0, 0.25, 0.43);
  corpo.castShadow = true;
  g.add(corpo, talo, olho, olho2, boca);
  return g;
}

function morcego(): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const x = c.getContext('2d')!;
  x.font = '56px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('🦇', 64, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(1.6, 0.8, 1);
  return s;
}

export class Halloween {
  private grupo = new THREE.Group();
  private morcegos: { s: THREE.Sprite; r: number; v: number; h: number; f: number }[] = [];
  ligado = false;

  constructor(private mundo: Mundo) {
    // Abóboras em roda, de frente para fora do chafariz, e algumas nos cantos da praça.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = abobora();
      p.position.set(Math.sin(a) * 3.3, 0, Math.cos(a) * 3.3);
      p.rotation.y = a;
      this.grupo.add(p);
    }
    for (const [x, z] of [
      [-20, -12],
      [20, -12],
      [-20, 12],
      [20, 12],
      [-13, 3.5],
      [-11.5, 8],
    ]) {
      const p = abobora();
      p.scale.setScalar(1.6);
      p.position.set(x, 0, z);
      p.rotation.y = Math.atan2(-x, -z);
      this.grupo.add(p);
    }
    // Poucas luzes (pesam no celular): uma laranja no chafariz e uma roxa por cima.
    const laranja = new THREE.PointLight('#fb923c', 30, 18, 1.6);
    laranja.position.set(0, 2.5, 0);
    const roxa = new THREE.PointLight('#a855f7', 40, 40, 1.4);
    roxa.position.set(0, 9, 0);
    this.grupo.add(laranja, roxa);
    for (let i = 0; i < 9; i++) {
      const s = morcego();
      this.grupo.add(s);
      this.morcegos.push({ s, r: 6 + (i % 4) * 4, v: (i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.2), h: 6 + (i % 5), f: i * 0.7 });
    }
    this.grupo.visible = false;
    mundo.cena.add(this.grupo);
  }

  ligar(v: boolean): void {
    if (v === this.ligado) return;
    this.ligado = v;
    this.grupo.visible = v;
    const m = this.mundo;
    m.cena.background = new THREE.Color(v ? '#1e0b3a' : '#9fd3f5');
    m.cena.fog = v ? new THREE.Fog('#2e1065', 25, 110) : new THREE.Fog('#9fd3f5', 80, 220);
    m.ceu.color.set(v ? '#7c3aed' : '#dff3ff');
    m.ceu.groundColor.set(v ? '#1c1917' : '#6b8f4e');
    m.ceu.intensity = v ? 0.55 : 1.1;
    m.sol.color.set(v ? '#fdba74' : '#fff4dc');
    m.sol.intensity = v ? 0.6 : 2.2;
    m.agua.color.set(v ? '#4ade80' : '#38bdf8');
    m.agua.emissive.set(v ? '#166534' : '#000000');
  }

  animar(t: number): void {
    if (!this.ligado) return;
    for (const b of this.morcegos) {
      const a = t * b.v + b.f;
      b.s.position.set(Math.sin(a) * b.r, b.h + Math.sin(t * 3 + b.f) * 0.6, Math.cos(a) * b.r);
    }
  }
}
