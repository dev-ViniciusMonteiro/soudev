// Portais dos jogos na praça: um anel brilhante no chão com o nome do jogo e quantos estão na fila.
// Também desenha a zona do rei da colina e as marcas da partida (quem está pegando, quem já foi achado).

import * as THREE from 'three';
import { type IdJogo, JOGOS, RAIO_PORTAL, ZONA_REI } from './protocolo';

const COR: Record<IdJogo, string> = { 'pega-pega': '#ef4444', 'rei-da-colina': '#facc15', 'esconde-esconde': '#8b5cf6', 'sprint-retro': '#f97316', 'mata-mata': '#dc2626' };
const ICONE: Record<IdJogo, string> = { 'pega-pega': '🏃', 'rei-da-colina': '👑', 'esconde-esconde': '🙈', 'sprint-retro': '🎃', 'mata-mata': '🔫' };

function placa(texto: string, subtexto: string, cor: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(4, 1.25, 1);
  desenharPlaca(s, texto, subtexto, cor);
  return s;
}

function desenharPlaca(s: THREE.Sprite, texto: string, subtexto: string, cor: string): void {
  const mapa = s.material.map as THREE.CanvasTexture;
  const c = mapa.image as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(10,12,24,0.75)';
  g.beginPath();
  g.roundRect(8, 8, 496, 144, 28);
  g.fill();
  g.strokeStyle = cor;
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = '800 54px system-ui, sans-serif';
  g.fillText(texto, 256, 72);
  g.font = '600 36px system-ui, sans-serif';
  g.fillStyle = cor;
  g.fillText(subtexto, 256, 124);
  mapa.needsUpdate = true;
}

interface Portal {
  jogo: IdJogo;
  anel: THREE.Mesh;
  luz: THREE.Mesh;
  placa: THREE.Sprite;
  texto: string;
}

export class Portais {
  readonly grupo = new THREE.Group();
  private portais: Portal[] = [];
  private zona: THREE.Mesh;

  constructor() {
    for (const jogo of Object.keys(JOGOS) as IdJogo[]) {
      const [x, z] = JOGOS[jogo].portal;
      const cor = COR[jogo];
      const anel = new THREE.Mesh(new THREE.RingGeometry(RAIO_PORTAL - 0.25, RAIO_PORTAL, 48), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      anel.rotation.x = -Math.PI / 2;
      anel.position.set(x, 0.03, z);
      const luz = new THREE.Mesh(new THREE.CylinderGeometry(RAIO_PORTAL, RAIO_PORTAL, 2.2, 32, 1, true), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
      luz.position.set(x, 1.1, z);
      const p = placa(`${ICONE[jogo]} ${JOGOS[jogo].nome}`, jogo === 'sprint-retro' ? 'a sala toda participa' : `fila 0/${JOGOS[jogo].min}`, cor);
      p.position.set(x, 3.4, z);
      this.grupo.add(anel, luz, p);
      this.portais.push({ jogo, anel, luz, placa: p, texto: '' });
    }
    // Zona do rei da colina: só aparece durante a partida.
    this.zona = new THREE.Mesh(new THREE.RingGeometry(ZONA_REI.de, ZONA_REI.ate, 64), new THREE.MeshBasicMaterial({ color: COR['rei-da-colina'], transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    this.zona.rotation.x = -Math.PI / 2;
    this.zona.position.y = 0.04;
    this.zona.visible = false;
    this.grupo.add(this.zona);
  }

  /** Atualiza o contador da fila de cada portal (e esconde os portais durante a partida). */
  filas(f: Partial<Record<IdJogo, string[]>>, emPartida: IdJogo | null): void {
    for (const p of this.portais) {
      const n = f[p.jogo]?.length ?? 0;
      const texto = emPartida ? 'em partida' : p.jogo === 'sprint-retro' ? 'a sala toda participa' : `fila ${n}/${JOGOS[p.jogo].min}${n >= JOGOS[p.jogo].min ? ' ✓' : ''}`;
      if (texto !== p.texto) {
        p.texto = texto;
        desenharPlaca(p.placa, `${ICONE[p.jogo]} ${JOGOS[p.jogo].nome}`, texto, COR[p.jogo]);
      }
      const ativo = !emPartida;
      p.anel.visible = ativo;
      p.luz.visible = ativo;
    }
    this.zona.visible = emPartida === 'rei-da-colina';
  }

  animar(t: number, camera: THREE.Vector3): void {
    for (const p of this.portais) {
      (p.luz.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(t * 2 + p.anel.position.x) * 0.05;
      p.placa.position.y = 3.4 + Math.sin(t * 1.5 + p.anel.position.z) * 0.1;
      // Placa colada na câmera tapa a tela: some aos poucos quando está a menos de 7 m.
      p.placa.material.opacity = Math.min(1, Math.max(0, (p.placa.position.distanceTo(camera) - 3) / 4));
    }
    (this.zona.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t * 3) * 0.1;
  }
}

/** Marca em cima da cabeça (🔥 pegando, ✓ achado), presa ao boneco. */
export function marca(texto: string, cor: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = cor;
  g.beginPath();
  g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fill();
  g.font = '72px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(texto, 64, 70);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(0.7, 0.7, 1);
  s.position.y = 2.85;
  s.renderOrder = 11;
  return s;
}

export { COR as COR_JOGO, ICONE as ICONE_JOGO };
