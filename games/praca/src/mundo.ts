// O mundo: a praça no meio, cercada por uma rua; avenidas levam até uma rua maior por fora, com prédios dos
// dois lados e parques entre elas. Peças KayKit City Builder Bits (CC0); chafariz, árvores e placas em código.
// Cada peça sólida registra uma caixa de colisão no chão (x/z) para bonecos e carros não atravessarem.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LIMITE_MUNDO } from './protocolo';

/** As peças vêm em escala de maquete (rua = 2 unidades): ×4 deixa um banco com ~1,6 m. */
const ESCALA = 4;
/** Rua interna (em volta da praça) e rua externa: distância do centro até o meio da pista.
 *  Múltiplos de 8 (tamanho de cada pedaço de rua) para as avenidas casarem com os cruzamentos. */
export const RUA_INTERNA = 32;
export const RUA_EXTERNA = 72;

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
  ceu: THREE.HemisphereLight;
  agua: THREE.MeshStandardMaterial;
  colisao: Caixa[];
  /** Modelos dos carros dirigíveis, já na escala certa (o jogo clona). */
  modelosCarro: Map<string, THREE.Object3D>;
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

/** Placa grande do Sprint Review SuperApp (momentânea, para o evento). */
function placaSprint(): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 448;
  const x = c.getContext('2d')!;
  const fundo = x.createLinearGradient(0, 0, 1024, 448);
  fundo.addColorStop(0, '#2e1065');
  fundo.addColorStop(1, '#7c2d12');
  x.fillStyle = fundo;
  x.fillRect(0, 0, 1024, 448);
  x.strokeStyle = '#fb923c';
  x.lineWidth = 14;
  x.strokeRect(14, 14, 996, 420);
  x.textAlign = 'center';
  x.fillStyle = '#fde68a';
  x.font = '900 120px system-ui, sans-serif';
  x.fillText('SPRINT REVIEW', 512, 190);
  x.fillStyle = '#fb923c';
  x.font = '800 96px system-ui, sans-serif';
  x.fillText('🎃 SuperApp 🦇', 512, 320);
  x.fillStyle = '#e9d5ff';
  x.font = '600 38px system-ui, sans-serif';
  x.fillText('portal laranja ao lado do chafariz', 512, 400);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.8), new THREE.MeshBasicMaterial({ map: tex }));
  tela.position.y = 6.2;
  // O mesmo painel atrás: dá para ler dos dois lados (de dentro e de fora da praça).
  const verso = tela.clone();
  verso.rotation.y = Math.PI;
  verso.position.z = -0.44;
  const moldura = new THREE.Mesh(new THREE.BoxGeometry(11.5, 5.3, 0.4), new THREE.MeshStandardMaterial({ color: '#1c1917', flatShading: true }));
  moldura.position.set(0, 6.2, -0.22);
  moldura.castShadow = true;
  const poste = new THREE.MeshStandardMaterial({ color: '#292524', flatShading: true });
  for (const px of [-4, 4]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 0.4), poste);
    p.position.set(px, 1.9, -0.25);
    p.castShadow = true;
    g.add(p);
  }
  g.add(moldura, tela, verso);
  return g;
}

export async function criarMundo(): Promise<Mundo> {
  const cena = new THREE.Scene();
  cena.background = new THREE.Color('#9fd3f5');
  cena.fog = new THREE.Fog('#9fd3f5', 80, 220);
  const colisao: Caixa[] = [];

  // Luz: céu + sol com sombra (a sombra acompanha o jogador).
  const ceu = new THREE.HemisphereLight('#dff3ff', '#6b8f4e', 1.1);
  cena.add(ceu);
  const sol = new THREE.DirectionalLight('#fff4dc', 2.2);
  sol.position.set(30, 50, 20);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 140 });
  sol.shadow.bias = -0.0005;
  cena.add(sol, sol.target);

  // Chão: grama, calçada da praça e o círculo do centro (zona do rei da colina e ponto de encontro do Sprint Review).
  const plano = (larg: number, cor: string, y: number): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, larg), new THREE.MeshStandardMaterial({ color: cor, roughness: 1 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.receiveShadow = true;
    cena.add(m);
    return m;
  };
  plano(500, '#7cb35a', -0.02);
  plano(56, '#d6cfc2', 0.0);
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

  const nomesCarros = ['car_hatchback', 'car_sedan', 'car_taxi', 'car_police'];
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
    'watertower',
    ...nomesCarros,
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
  // Ruas achatadas: a peça tem 0,1 de espessura de maquete (40 cm na escala ×4) e enterraria pés e rodas.
  const rua = (nome: 'road_straight' | 'road_junction', x: number, z: number, rot = 0): void => {
    por(nome, x, z, rot).scale.y = 1;
  };

  // Ruas (cada pedaço = 8 m): um quadrado em volta da praça, outro maior por fora e avenidas ligando os dois.
  for (const R of [RUA_INTERNA, RUA_EXTERNA]) {
    const n = R / 8 - 1;
    for (let i = -n; i <= n; i++) {
      const p = i * 8;
      const cruza = i === 0; // onde chega a avenida
      rua(cruza ? 'road_junction' : 'road_straight', p, -R, 0);
      rua(cruza ? 'road_junction' : 'road_straight', p, R, 0);
      rua(cruza ? 'road_junction' : 'road_straight', -R, p, Math.PI / 2);
      rua(cruza ? 'road_junction' : 'road_straight', R, p, Math.PI / 2);
    }
    for (const [x, z] of [
      [-R, -R],
      [R, -R],
      [-R, R],
      [R, R],
    ])
      rua('road_junction', x, z);
  }
  for (let d = RUA_INTERNA + 8; d < RUA_EXTERNA; d += 8) {
    rua('road_straight', 0, d, Math.PI / 2);
    rua('road_straight', 0, -d, Math.PI / 2);
    rua('road_straight', d, 0, 0);
    rua('road_straight', -d, 0, 0);
  }

  // Prédios em fila, de frente para a rua; "lado" = normal da fachada (para onde olha).
  const predios = 'ABCDEFGH'.split('');
  const larguras: Record<string, number> = { A: 1.2, B: 1.6, C: 1.2, D: 1.6, E: 2, F: 2, G: 2, H: 2 };
  const prof = 1.3 * ESCALA;
  let k = 0;
  const filaDePredios = (distancia: number, de: number, ate: number, olhaParaDentro: boolean): void => {
    for (const [nx, nz, dx, dz] of [
      [0, -1, 1, 0],
      [0, 1, -1, 0],
      [1, 0, 0, 1],
      [-1, 0, 0, -1],
    ] as const) {
      const sinal = olhaParaDentro ? -1 : 1;
      const rot = Math.atan2(sinal * nx, sinal * nz);
      let t = de;
      while (t < ate) {
        const letra = predios[k++ % predios.length];
        const larg = larguras[letra] * ESCALA;
        // Deixa a boca da avenida livre.
        if (t < 6 && t + larg > -6) {
          t = 6;
          continue;
        }
        const meio = t + larg / 2;
        por(`building_${letra}_withoutBase`, nx * distancia + dx * meio, nz * distancia + dz * meio, rot, [larg / 2, prof / 2]);
        t += larg + 0.5;
      }
    }
  };
  // Em volta da praça (fachada para a praça), dos dois lados da rua externa.
  filaDePredios(RUA_INTERNA + 4 + prof / 2 + 1, -RUA_INTERNA - 4, RUA_INTERNA + 4, true);
  filaDePredios(RUA_EXTERNA - 4 - prof / 2 - 1, -RUA_EXTERNA + 9, RUA_EXTERNA - 9, false);
  filaDePredios(RUA_EXTERNA + 4 + prof / 2 + 1, -RUA_EXTERNA - 4, RUA_EXTERNA + 4, true);

  // Bancos em volta do círculo, virados para o chafariz.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    por('bench', Math.sin(a) * 10, Math.cos(a) * 10, a + Math.PI, [0.65, 0.65]); // girado na diagonal: caixa quadrada
  }

  // Postes na borda da calçada da praça e ao longo das avenidas.
  for (let i = -2; i <= 2; i++) {
    const p = i * 9;
    por('streetlight', p, -21.5, 0, [0.15, 0.15]);
    por('streetlight', p, 21.5, Math.PI, [0.15, 0.15]);
    por('streetlight', -21.5, p, Math.PI / 2, [0.15, 0.15]);
    por('streetlight', 21.5, p, -Math.PI / 2, [0.15, 0.15]);
  }
  for (let d = 40; d <= 64; d += 12)
    for (const s of [-1, 1]) {
      por('streetlight', 5, s * d, -Math.PI / 2, [0.15, 0.15]);
      por('streetlight', -5, s * d, Math.PI / 2, [0.15, 0.15]);
      por('streetlight', s * d, 5, Math.PI, [0.15, 0.15]);
      por('streetlight', s * d, -5, 0, [0.15, 0.15]);
    }

  // Árvores (em código) na praça e nos parques entre as ruas.
  const tronco = new THREE.MeshStandardMaterial({ color: '#7c5a3a', flatShading: true });
  const folha = new THREE.MeshStandardMaterial({ color: '#3f8f3a', flatShading: true });
  const folhaClara = new THREE.MeshStandardMaterial({ color: '#65a30d', flatShading: true });
  const arvore = (x: number, z: number, alt: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, alt * 0.45, 6), tronco);
    t.position.y = alt * 0.22;
    const f = Math.abs(x * 3 + z) % 2 < 1 ? folha : folhaClara;
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(alt * 0.32, 0), f);
    c1.position.y = alt * 0.62;
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(alt * 0.24, 0), f);
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
    [17, -17],
    [-17, 17],
    [17, 17],
    [-6, -18],
    [6, 18],
    [-18, 6],
    [18, -6],
  ])
    arvore(x, z, 5 + (Math.abs(x * z) % 3));
  // Parques: um bosque em cada quarteirão entre as duas ruas.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = sx * (45 + (i % 3) * 6 + ((i * 7) % 3));
        const z = sz * (45 + Math.floor(i / 3) * 6 + ((i * 5) % 3));
        arvore(x, z, 5 + (i % 3));
      }
      por('bench', sx * 52, sz * 44, sz > 0 ? Math.PI : 0, [0.8, 0.35]);
      por('bush', sx * 44, sz * 56, 0);
      por('bush', sx * 58, sz * 50, 1);
    }
  for (const [x, z] of [
    [-14, -19],
    [14, -19],
    [-14, 19],
    [14, 19],
    [-19, -14],
    [19, 14],
  ])
    por('bush', x, z, x);

  // Detalhes urbanos.
  por('firehydrant', 22.5, -23, 0, [0.3, 0.3]);
  por('dumpster', -24, 22.8, 0, [1.1, 0.7]);
  por('trash_A', 11, 9.5, 0);
  por('watertower', 55, -55, 0, [1, 1]);

  // Placa do Sprint Review na diagonal da praça, de frente para o chafariz.
  const placa = placaSprint();
  placa.position.set(-17, 0, -17);
  placa.rotation.y = Math.PI / 4;
  cena.add(placa);
  colisao.push({ x: -17 - 2.8, z: -17 + 2.8, mx: 0.4, mz: 0.4 }, { x: -17 + 2.8, z: -17 - 2.8, mx: 0.4, mz: 0.4 });

  // Paredes invisíveis na frente dos prédios de fora (fim do mundo).
  const F = RUA_EXTERNA + 5;
  colisao.push({ x: 0, z: -F - 1, mx: F + 2, mz: 1 }, { x: 0, z: F + 1, mx: F + 2, mz: 1 }, { x: -F - 1, z: 0, mx: 1, mz: F + 2 }, { x: F + 1, z: 0, mx: 1, mz: F + 2 });
  const L = LIMITE_MUNDO;
  colisao.push({ x: 0, z: -L - 1, mx: L + 2, mz: 1 }, { x: 0, z: L + 1, mx: L + 2, mz: 1 }, { x: -L - 1, z: 0, mx: 1, mz: L + 2 }, { x: L + 1, z: 0, mx: 1, mz: L + 2 });

  const modelosCarro = new Map(nomesCarros.map((n) => [n, pecas.get(n)!]));
  return { cena, sol, ceu, agua, colisao, modelosCarro };
}

/** Empurra um círculo (o boneco ou o carro) para fora das caixas de colisão. Devolve se bateu. */
export function resolverColisao(pos: THREE.Vector3, raio: number, caixas: Caixa[]): boolean {
  let bateu = false;
  for (const c of caixas) {
    const px = Math.max(c.x - c.mx, Math.min(pos.x, c.x + c.mx));
    const pz = Math.max(c.z - c.mz, Math.min(pos.z, c.z + c.mz));
    const dx = pos.x - px;
    const dz = pos.z - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= raio * raio) continue;
    bateu = true;
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
  return bateu;
}
