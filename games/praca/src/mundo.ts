// A praça: chão, ruas em volta, prédios, bancos, postes, carros e árvores (peças KayKit City Builder Bits, CC0).
// Cada peça sólida registra uma caixa de colisão no chão (x/z) para os bonecos não atravessarem.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LIMITE_MUNDO } from './protocolo';

/** As peças vêm em escala de maquete (rua = 2 unidades): ×4 deixa um banco com ~1,6 m. */
const ESCALA = 4;

/** Caixa de colisão no chão (centro e meia-largura em x/z). */
export interface Caixa {
  x: number;
  z: number;
  mx: number;
  mz: number;
}

export interface Mundo {
  cena: THREE.Scene;
  sol: THREE.DirectionalLight;
  colisao: Caixa[];
}

const base = import.meta.env.BASE_URL;

async function carregarPecas(nomes: string[]): Promise<Map<string, THREE.Object3D>> {
  const loader = new GLTFLoader();
  const mapa = new Map<string, THREE.Object3D>();
  await Promise.all(
    nomes.map(async (n) => {
      const g = await loader.loadAsync(`${base}cidade/${n}.gltf`);
      g.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      mapa.set(n, g.scene);
    }),
  );
  return mapa;
}

export async function criarMundo(): Promise<Mundo> {
  const cena = new THREE.Scene();
  cena.background = new THREE.Color('#9fd3f5');
  cena.fog = new THREE.Fog('#9fd3f5', 60, 150);
  const colisao: Caixa[] = [];

  // Luz: céu + sol com sombra cobrindo a praça.
  cena.add(new THREE.HemisphereLight('#dff3ff', '#6b8f4e', 1.1));
  const sol = new THREE.DirectionalLight('#fff4dc', 2.2);
  sol.position.set(30, 50, 20);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 140 });
  sol.shadow.bias = -0.0005;
  cena.add(sol, sol.target);

  // Chão: grama, calçada da praça e o círculo do centro (a futura zona do "rei da colina").
  const plano = (larg: number, cor: string, y: number): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, larg), new THREE.MeshStandardMaterial({ color: cor, roughness: 1 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.receiveShadow = true;
    cena.add(m);
    return m;
  };
  plano(400, '#7cb35a', -0.02);
  plano(46, '#d6cfc2', 0.0);
  const circulo = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshStandardMaterial({ color: '#c2b8a8', roughness: 1 }));
  circulo.rotation.x = -Math.PI / 2;
  circulo.position.y = 0.01;
  circulo.receiveShadow = true;
  cena.add(circulo);

  // Chafariz no meio.
  const pedra = new THREE.MeshStandardMaterial({ color: '#a8a29e', roughness: 0.9, flatShading: true });
  const agua = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
  const bacia = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.6, 16), pedra);
  bacia.position.y = 0.3;
  const espelho = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.05, 16), agua);
  espelho.position.y = 0.58;
  const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8), pedra);
  coluna.position.y = 1.2;
  const topo = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.5, 0.3, 12), pedra);
  topo.position.y = 2.1;
  for (const m of [bacia, espelho, coluna, topo]) {
    m.castShadow = true;
    m.receiveShadow = true;
    cena.add(m);
  }
  colisao.push({ x: 0, z: 0, mx: 2.7, mz: 2.7 });

  const pecas = await carregarPecas([
    'road_straight',
    'road_junction',
    ...'ABCDEFGH'.split('').map((l) => `building_${l}_withoutBase`),
    'bench',
    'bush',
    'streetlight',
    'firehydrant',
    'dumpster',
    'trash_A',
    'car_hatchback',
    'car_sedan',
    'car_taxi',
    'car_police',
    'watertower',
  ]);

  const por = (nome: string, x: number, z: number, rot = 0, solido?: [number, number]): THREE.Object3D => {
    const o = pecas.get(nome)!.clone();
    o.scale.setScalar(ESCALA);
    o.position.set(x, 0, z);
    o.rotation.y = rot;
    cena.add(o);
    if (solido) {
      // Meia-largura/profundidade da peça já girada.
      const [a, b] = solido;
      const deitado = Math.abs(Math.sin(rot)) > 0.5;
      colisao.push({ x, z, mx: deitado ? b : a, mz: deitado ? a : b });
    }
    return o;
  };

  // Ruas: um quadrado em volta da praça (cada pedaço = 8 m).
  const R = 28;
  for (let i = -3; i <= 3; i++) {
    const p = i * 8;
    por('road_straight', p, -R, 0);
    por('road_straight', p, R, 0);
    por('road_straight', -R, p, Math.PI / 2);
    por('road_straight', R, p, Math.PI / 2);
  }
  for (const [x, z] of [
    [-R, -R],
    [R, -R],
    [-R, R],
    [R, R],
  ])
    por('road_junction', x, z);

  // Prédios do lado de fora das ruas, de frente para a praça; fecham o mundo.
  const predios = 'ABCDEFGH'.split('');
  const larguras: Record<string, number> = { A: 1.2, B: 1.6, C: 1.2, D: 1.6, E: 2, F: 2, G: 2, H: 2 };
  const lados: [number, number, number, number][] = [
    // [x0, z0, direção x, direção z] ao longo do lado; rotação de frente para o centro
    [0, -1, 1, 0],
    [0, 1, -1, 0],
    [1, 0, 0, 1],
    [-1, 0, 0, -1],
  ];
  let k = 0;
  for (const [nx, nz, dx, dz] of lados) {
    const rot = Math.atan2(-nx, -nz);
    let t = -R - 4;
    while (t < R + 4) {
      const letra = predios[k++ % predios.length];
      const larg = larguras[letra] * ESCALA;
      const meio = t + larg / 2;
      const prof = 1.3 * ESCALA;
      const d = R + 4 + prof / 2 + 1;
      por(`building_${letra}_withoutBase`, nx * d + dx * meio, nz * d + dz * meio, rot, [larg / 2, prof / 2]);
      t += larg + 0.5;
    }
  }

  // Bancos em volta do círculo, virados para o chafariz.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.sin(a) * 10;
    const z = Math.cos(a) * 10;
    por('bench', x, z, a + Math.PI, [0.65, 0.65]); // girado na diagonal: caixa quadrada
  }

  // Postes, arbustos e árvores na borda da calçada.
  for (let i = -2; i <= 2; i++) {
    const p = i * 9;
    por('streetlight', p, -21.5, 0, [0.15, 0.15]);
    por('streetlight', p, 21.5, Math.PI, [0.15, 0.15]);
    por('streetlight', -21.5, p, Math.PI / 2, [0.15, 0.15]);
    por('streetlight', 21.5, p, -Math.PI / 2, [0.15, 0.15]);
  }
  const tronco = new THREE.MeshStandardMaterial({ color: '#7c5a3a', flatShading: true });
  const folha = new THREE.MeshStandardMaterial({ color: '#3f8f3a', flatShading: true });
  const arvore = (x: number, z: number, alt: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, alt * 0.45, 6), tronco);
    t.position.y = alt * 0.22;
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(alt * 0.32, 0), folha);
    c1.position.y = alt * 0.62;
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(alt * 0.24, 0), folha);
    c2.position.set(alt * 0.12, alt * 0.85, -alt * 0.05);
    for (const m of [t, c1, c2]) {
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    g.position.set(x, 0, z);
    g.rotation.y = x * 7.3 + z;
    cena.add(g);
    colisao.push({ x, z, mx: 0.3, mz: 0.3 });
  };
  for (const [x, z] of [
    [-17, -17],
    [17, -17],
    [-17, 17],
    [17, 17],
    [-6, -18],
    [6, 18],
    [-18, 6],
    [18, -6],
  ])
    arvore(x, z, 5 + (Math.abs(x * z) % 3));
  for (const [x, z] of [
    [-14, -19],
    [14, -19],
    [-14, 19],
    [14, 19],
    [-19, -14],
    [19, 14],
  ])
    por('bush', x, z, x);

  // Carros estacionados e detalhes urbanos.
  por('car_taxi', -12, -R + 2.2, Math.PI / 2, [1.9, 0.9]);
  por('car_sedan', 9, R - 2.2, -Math.PI / 2, [1.9, 0.9]);
  por('car_hatchback', R - 2.2, -10, 0, [0.9, 1.7]);
  por('car_police', -R + 2.2, 13, Math.PI, [0.9, 1.9]);
  por('firehydrant', 22.5, -23, 0, [0.3, 0.3]);
  por('dumpster', -24, 22.8, 0, [1.1, 0.7]);
  por('trash_A', 11, 9.5, 0);
  por('watertower', 0, -45, 0);

  // Paredes invisíveis: na frente dos prédios (ninguém dá a volta por trás pelas esquinas) e no limite do mundo.
  const F = R + 5;
  colisao.push({ x: 0, z: -F - 1, mx: F + 2, mz: 1 }, { x: 0, z: F + 1, mx: F + 2, mz: 1 }, { x: -F - 1, z: 0, mx: 1, mz: F + 2 }, { x: F + 1, z: 0, mx: 1, mz: F + 2 });
  const L = LIMITE_MUNDO;
  colisao.push({ x: 0, z: -L - 1, mx: L + 2, mz: 1 }, { x: 0, z: L + 1, mx: L + 2, mz: 1 }, { x: -L - 1, z: 0, mx: 1, mz: L + 2 }, { x: L + 1, z: 0, mx: 1, mz: L + 2 });

  return { cena, sol, colisao };
}

/** Empurra um círculo (o boneco) para fora das caixas de colisão. */
export function resolverColisao(pos: THREE.Vector3, raio: number, caixas: Caixa[]): void {
  for (const c of caixas) {
    const px = Math.max(c.x - c.mx, Math.min(pos.x, c.x + c.mx));
    const pz = Math.max(c.z - c.mz, Math.min(pos.z, c.z + c.mz));
    const dx = pos.x - px;
    const dz = pos.z - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= raio * raio) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      pos.x = px + (dx / d) * raio;
      pos.z = pz + (dz / d) * raio;
    } else {
      // Centro dentro da caixa: sai pelo lado mais perto.
      const saidas = [
        [c.x - c.mx - raio - pos.x, 0],
        [c.x + c.mx + raio - pos.x, 0],
        [0, c.z - c.mz - raio - pos.z],
        [0, c.z + c.mz + raio - pos.z],
      ].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0];
      pos.x += saidas[0];
      pos.z += saidas[1];
    }
  }
}
