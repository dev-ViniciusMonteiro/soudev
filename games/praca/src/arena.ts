// Arena do mata-mata: um domo transparente do lado da cidade com um mapa inspirado na Dust2 dentro
// (as mesmas caixas que o servidor usa para conferir os tiros). Arquibancada do lado de fora para quem assiste.

import * as THREE from 'three';
import type { Caixa } from './mundo';
import { DOMO, LIMITE_ARENA, MAPA_ARENA, RAIO_DOMO, SPAWNS } from './protocolo';

/** Caixas de colisão da arena em coordenadas do mundo. */
export const caixasArena = (): Caixa[] => MAPA_ARENA.map(([x, z, w, d]) => ({ x: DOMO[0] + x, z: DOMO[1] + z, mx: w / 2, mz: d / 2 }));

/** Textura de "areia" com riscos, feita em canvas (sem arquivos). */
function texturaAreia(base: string, risco: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = risco;
    g.globalAlpha = 0.08 + ((i * 37) % 10) / 60;
    g.fillRect((i * 53) % 128, (i * 97) % 128, 2 + (i % 4), 1 + (i % 2));
  }
  // Linhas de tijolo.
  g.globalAlpha = 0.18;
  g.fillStyle = risco;
  for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function letreiro(texto: string, cor: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = cor;
  g.font = '900 200px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(texto, 128, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

export function criarArena(cena: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  g.position.set(DOMO[0], 0, DOMO[1]);

  // Chão de areia.
  const chaoTex = texturaAreia('#d9bf8c', '#8a6a3c');
  chaoTex.repeat.set(18, 18);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(LIMITE_ARENA * 2 + 2, LIMITE_ARENA * 2 + 2), new THREE.MeshStandardMaterial({ map: chaoTex, roughness: 1 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = 0.02;
  chao.receiveShadow = true;
  g.add(chao);

  // Paredes (arenito) e caixotes (madeira), das mesmas caixas do servidor.
  const paredeTex = texturaAreia('#c9a46c', '#6b4f2a');
  const madeira = new THREE.MeshStandardMaterial({ color: '#9a6a2f', roughness: 0.9, flatShading: true });
  const borda = new THREE.MeshStandardMaterial({ color: '#5b3a17', roughness: 0.9 });
  for (const [x, z, w, d, h] of MAPA_ARENA) {
    if (h < 2) {
      const caixote = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), madeira);
      caixote.position.set(x, h / 2, z);
      caixote.castShadow = caixote.receiveShadow = true;
      // Ripas escuras nas bordas do caixote.
      const ripa = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.1, d + 0.04), borda);
      ripa.position.set(x, h - 0.05, z);
      g.add(caixote, ripa);
    } else {
      const tex = paredeTex.clone();
      tex.repeat.set(Math.max(w, d) / 4, h / 4);
      tex.needsUpdate = true;
      const parede = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
      parede.position.set(x, h / 2, z);
      parede.castShadow = parede.receiveShadow = true;
      g.add(parede);
    }
  }

  // Letreiros dos bombs e marcas no chão das bases.
  const a = letreiro('A', '#b91c1c');
  a.position.set(27.9, 2.6, -18);
  a.rotation.y = -Math.PI / 2;
  const b = letreiro('B', '#b91c1c');
  b.position.set(-27.9, 2.6, -18);
  b.rotation.y = Math.PI / 2;
  g.add(a, b);
  for (const [time, cor] of [
    ['TR', '#f97316'],
    ['CT', '#3b82f6'],
  ] as const) {
    const [sx, sz] = SPAWNS[time][0];
    const marca = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.25 }));
    marca.rotation.x = -Math.PI / 2;
    marca.position.set(sx, 0.04, sz - (time === 'TR' ? 2 : -3));
    g.add(marca);
  }

  // Domo de segurança: cúpula transparente com malha brilhante e anel na base.
  const domo = new THREE.Mesh(new THREE.SphereGeometry(RAIO_DOMO, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  const malha = new THREE.Mesh(new THREE.SphereGeometry(RAIO_DOMO, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#67e8f9', wireframe: true, transparent: true, opacity: 0.25 }));
  const anel = new THREE.Mesh(new THREE.TorusGeometry(RAIO_DOMO, 0.4, 8, 64), new THREE.MeshBasicMaterial({ color: '#22d3ee' }));
  anel.rotation.x = Math.PI / 2;
  g.add(domo, malha, anel);

  // Arquibancada do lado de fora (decoração; quem assiste usa a câmera da arquibancada).
  const concreto = new THREE.MeshStandardMaterial({ color: '#9ca3af', flatShading: true });
  for (let i = 0; i < 4; i++) {
    const degrau = new THREE.Mesh(new THREE.BoxGeometry(40, 0.8, 2), concreto);
    degrau.position.set(0, 0.4 + i * 0.8, RAIO_DOMO + 4 + i * 2);
    degrau.castShadow = degrau.receiveShadow = true;
    g.add(degrau);
  }
  // Chão em volta do domo.
  const base = new THREE.Mesh(new THREE.CircleGeometry(RAIO_DOMO + 14, 48), new THREE.MeshStandardMaterial({ color: '#a8a29e', roughness: 1 }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.005;
  base.receiveShadow = true;
  g.add(base);

  cena.add(g);
  return g;
}
