// Cena 3D (Three.js): corredor neon, blocos com seta, bombas, paredes, orbes, sabres com rastro, o seu corpo
// em linhas e os efeitos (bloco cortado ao meio, faíscas). Tudo desenhado em código, com brilho (bloom).

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLUNAS, type Direcao, LINHAS, type Mao, type Nota, type Obstaculo } from './fases';

export const ESCALA = 0.36; // metros por largura de ombro
export const ALTURA = 1.35; // altura do meio dos ombros no mundo
export const COR: Record<Mao, string> = { esq: '#ff2d55', dir: '#2ea8ff' };
const TAM_BLOCO = 0.34;

export interface Ponto2 {
  u: number;
  v: number;
}

const OSSOS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
];

interface Efeito {
  obj: THREE.Object3D;
  vel: THREE.Vector3;
  giro: THREE.Vector3;
  vida: number;
  total: number;
  materiais: THREE.Material[];
}

interface Rastro {
  pares: THREE.Vector3[][]; // [base, ponta] mais recentes primeiro
  malha: THREE.Mesh;
}

export class Cena {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.05, 120);
  private composer: EffectComposer | null = null;
  private grade: THREE.GridHelper;
  private aneis: THREE.Mesh[] = [];
  private efeitos: Efeito[] = [];
  private sabres: Record<Mao, THREE.Group>;
  private rastros: Record<Mao, Rastro>;
  private corpo: THREE.LineSegments;
  private cabeca: THREE.Mesh;
  private geoBloco = new RoundedBoxGeometry(TAM_BLOCO, TAM_BLOCO, TAM_BLOCO, 3, 0.05);
  private matsBloco = {
    esq: new THREE.MeshStandardMaterial({ color: COR.esq, emissive: COR.esq, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 }),
    dir: new THREE.MeshStandardMaterial({ color: COR.dir, emissive: COR.dir, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 }),
  };
  private matSeta = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  private geoSeta: THREE.ShapeGeometry;
  private geoPonto = new THREE.CircleGeometry(0.055, 24);
  private faiscas: THREE.Points;
  private faiscasVel: Float32Array;
  private faiscasVida: Float32Array;
  private proximaFaisca = 0;

  constructor(alvo: HTMLElement, brilho: boolean) {
    this.renderer = new THREE.WebGLRenderer({ antialias: !brilho, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, brilho ? 1.5 : 1.25));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    alvo.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color('#05060d');
    this.scene.fog = new THREE.Fog('#05060d', 12, 34);
    this.camera.position.set(0, 1.62, 2.7);
    this.camera.lookAt(0, 1.25, -6);

    this.scene.add(new THREE.HemisphereLight('#8fb6ff', '#1a0a20', 0.7));
    const luz = new THREE.DirectionalLight('#ffffff', 1.4);
    luz.position.set(1, 4, 3);
    this.scene.add(luz);

    // Chão com grade que corre na direção de quem joga.
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(14, 80), new THREE.MeshStandardMaterial({ color: '#07070f', roughness: 0.6, metalness: 0.4 }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.set(0, 0, -30);
    this.scene.add(chao);
    this.grade = new THREE.GridHelper(14, 14, '#2b2f6b', '#161a3d');
    this.grade.scale.z = 6;
    this.grade.position.set(0, 0.002, -30);
    this.scene.add(this.grade);

    // Trilhos de neon nas laterais e arcos que passam no ritmo.
    for (const [x, cor] of [
      [-2.6, COR.esq],
      [2.6, COR.dir],
    ] as const) {
      const trilho = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 80), new THREE.MeshBasicMaterial({ color: cor }));
      trilho.position.set(x, 0.03, -30);
      this.scene.add(trilho);
    }
    const geoAnel = new THREE.TorusGeometry(3.4, 0.035, 8, 64, Math.PI);
    for (let i = 0; i < 8; i++) {
      const anel = new THREE.Mesh(geoAnel, new THREE.MeshBasicMaterial({ color: i % 2 ? '#7c4dff' : '#00e5ff', transparent: true, opacity: 0.6 }));
      anel.position.set(0, 0, -4 - i * 5);
      this.aneis.push(anel);
      this.scene.add(anel);
    }

    // Seta: triângulo branco na face da frente do bloco (aponta para cima; gira conforme a direção).
    const seta = new THREE.Shape();
    seta.moveTo(-0.11, -0.03);
    seta.lineTo(0.11, -0.03);
    seta.lineTo(0, 0.09);
    seta.closePath();
    this.geoSeta = new THREE.ShapeGeometry(seta);

    this.sabres = { esq: this.criarSabre(COR.esq), dir: this.criarSabre(COR.dir) };
    this.rastros = { esq: this.criarRastro(COR.esq), dir: this.criarRastro(COR.dir) };

    // Seu corpo, em linhas finas no plano de corte.
    this.corpo = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(OSSOS.length * 6), 3)), new THREE.LineBasicMaterial({ color: '#7df9ff', transparent: true, opacity: 0.45 }));
    this.corpo.frustumCulled = false;
    this.cabeca = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.13, 32), new THREE.MeshBasicMaterial({ color: '#7df9ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    this.scene.add(this.corpo, this.cabeca);

    // Faíscas: um conjunto fixo de pontos reaproveitado.
    const N = 400;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-999), 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    this.faiscas = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.faiscas.frustumCulled = false;
    this.faiscasVel = new Float32Array(N * 3);
    this.faiscasVida = new Float32Array(N);
    this.scene.add(this.faiscas);

    if (brilho) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.45, 0.18));
      this.composer.addPass(new OutputPass());
    }
    addEventListener('resize', () => this.redimensionar());
    this.redimensionar();
  }

  private redimensionar(): void {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    // Tela estreita (celular em pé): abre o campo de visão para as 4 colunas caberem.
    this.camera.fov = w / h < 1 ? 82 : 62;
    this.camera.updateProjectionMatrix();
  }

  /** Corpo (larguras de ombro) para o mundo, no plano de corte (z = 0). */
  mundo(p: Ponto2, z = 0): THREE.Vector3 {
    return new THREE.Vector3(p.u * ESCALA, p.v * ESCALA + ALTURA, z);
  }

  /* ---------- Objetos que vêm na sua direção ---------- */

  novoBloco(n: Nota): THREE.Object3D {
    const g = new THREE.Group();
    if (n.tipo === 'bomba') {
      const bomba = new THREE.Mesh(new THREE.IcosahedronGeometry(TAM_BLOCO * 0.48, 1), new THREE.MeshStandardMaterial({ color: '#151018', roughness: 0.3, metalness: 0.8, emissive: '#3a0010', emissiveIntensity: 0.6 }));
      const espinhos = new THREE.Mesh(new THREE.OctahedronGeometry(TAM_BLOCO * 0.62, 0), new THREE.MeshBasicMaterial({ color: '#ff1744', wireframe: true }));
      g.add(bomba, espinhos);
    } else {
      const bloco = new THREE.Mesh(this.geoBloco, this.matsBloco[n.tipo]);
      const borda = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TAM_BLOCO * 1.01, TAM_BLOCO * 1.01, TAM_BLOCO * 1.01)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 }));
      const marca = n.dir === 'qualquer' ? new THREE.Mesh(this.geoPonto, this.matSeta) : new THREE.Mesh(this.geoSeta, this.matSeta);
      marca.position.z = TAM_BLOCO / 2 + 0.002;
      marca.rotation.z = ({ cima: 0, baixo: Math.PI, esq: Math.PI / 2, dir: -Math.PI / 2, qualquer: 0 } as Record<Direcao, number>)[n.dir];
      g.add(bloco, borda, marca);
    }
    g.position.copy(this.mundo({ u: COLUNAS[n.coluna], v: LINHAS[n.linha] }, -40));
    this.scene.add(g);
    return g;
  }

  novoObstaculo(o: Obstaculo, cabecaV: number): THREE.Object3D {
    const g = new THREE.Group();
    if (o.tipo === 'orbe') {
      const orbe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), new THREE.MeshStandardMaterial({ color: '#ffd54a', emissive: '#ffb300', emissiveIntensity: 1.4 }));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: '#fff3b0' }));
      g.add(orbe, halo);
      g.position.copy(this.mundo({ u: COLUNAS[o.coluna], v: LINHAS[o.linha] }, -40));
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: '#ff1744', emissive: '#ff1744', emissiveIntensity: 0.5, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
      const cabeca = cabecaV * ESCALA + ALTURA;
      // abaixar: barra na altura do rosto; esq/dir: parede ocupando metade do corredor até acima da cabeça.
      const [w, h, x, y] = o.tipo === 'abaixar' ? [5.2, 0.9, 0, cabeca + 0.25] : [2.6, cabeca + 0.6, o.tipo === 'esq' ? -1.3 - 0.05 : 1.3 + 0.05, (cabeca + 0.6) / 2];
      const caixa = new THREE.BoxGeometry(w, h, 0.25);
      g.add(new THREE.Mesh(caixa, mat), new THREE.LineSegments(new THREE.EdgesGeometry(caixa), new THREE.LineBasicMaterial({ color: '#ff8a9e' })));
      g.position.set(x, y, -40);
    }
    this.scene.add(g);
    return g;
  }

  remover(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  /** Bloco cortado: duas metades se afastam perpendicularmente ao golpe, com faíscas. */
  cortar(obj: THREE.Object3D, du: number, dv: number, cor: string): void {
    this.scene.remove(obj);
    const d = new THREE.Vector2(du, dv);
    if (d.lengthSq() < 1e-6) d.set(0, -1);
    d.normalize();
    const normal = new THREE.Vector3(-d.y, d.x, 0);
    const angulo = Math.atan2(d.y, d.x);
    const mat = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.8, transparent: true, roughness: 0.4 });
    for (const lado of [-1, 1]) {
      const metade = new THREE.Mesh(new THREE.BoxGeometry(TAM_BLOCO, TAM_BLOCO / 2, TAM_BLOCO), mat);
      metade.position.copy(obj.position).addScaledVector(normal, (lado * TAM_BLOCO) / 4);
      metade.rotation.z = angulo;
      this.scene.add(metade);
      this.efeitos.push({
        obj: metade,
        vel: normal.clone().multiplyScalar(lado * 1.8).add(new THREE.Vector3(0, 0.6, 2.2)),
        giro: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, lado * 4),
        vida: 0.7,
        total: 0.7,
        materiais: [mat],
      });
    }
    this.faiscar(obj.position, cor, 40, 4);
  }

  explodir(pos: THREE.Vector3, cor: string): void {
    this.faiscar(pos, cor, 90, 6);
  }

  private faiscar(pos: THREE.Vector3, cor: string, n: number, forca: number): void {
    const c = new THREE.Color(cor);
    const p = this.faiscas.geometry.getAttribute('position') as THREE.BufferAttribute;
    const cl = this.faiscas.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let k = 0; k < n; k++) {
      const i = this.proximaFaisca;
      this.proximaFaisca = (i + 1) % this.faiscasVida.length;
      p.setXYZ(i, pos.x, pos.y, pos.z);
      cl.setXYZ(i, c.r, c.g, c.b);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(forca * (0.3 + Math.random()));
      this.faiscasVel.set([dir.x, dir.y, dir.z], i * 3);
      this.faiscasVida[i] = 0.5 + Math.random() * 0.4;
    }
    p.needsUpdate = true;
    cl.needsUpdate = true;
  }

  /* ---------- Sabres e corpo ---------- */

  private criarSabre(cor: string): THREE.Group {
    const g = new THREE.Group();
    const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 12), new THREE.MeshStandardMaterial({ color: '#c9ced8', metalness: 0.9, roughness: 0.25 }));
    cabo.position.y = 0.1;
    const lamina = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const brilho = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1, 12), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    lamina.name = 'lamina';
    brilho.name = 'brilho';
    g.add(cabo, lamina, brilho);
    g.visible = false;
    this.scene.add(g);
    return g;
  }

  private criarRastro(cor: string): Rastro {
    const N = 10;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const alfa = new Float32Array(N * 2 * 4);
    const c = new THREE.Color(cor);
    for (let i = 0; i < N * 2; i++) alfa.set([c.r, c.g, c.b, 0.5 * (1 - Math.floor(i / 2) / N)], i * 4);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(alfa, 4));
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(idx);
    const malha = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    malha.frustumCulled = false;
    this.scene.add(malha);
    return { pares: [], malha };
  }

  /** Coloca o sabre entre base e ponta (no corpo). null = mão fora da câmera. */
  sabre(mao: Mao, base: Ponto2 | null, ponta: Ponto2 | null): void {
    const g = this.sabres[mao];
    const r = this.rastros[mao];
    if (!base || !ponta) {
      g.visible = false;
      r.pares = [];
      r.malha.visible = false;
      return;
    }
    const a = this.mundo(base, 0.05);
    const b = this.mundo(ponta, 0.05);
    const dir = b.clone().sub(a);
    const comp = dir.length();
    g.visible = true;
    g.position.copy(a);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    for (const nome of ['lamina', 'brilho']) {
      const m = g.getObjectByName(nome)!;
      m.scale.y = Math.max(0.01, comp - 0.18);
      m.position.y = 0.18 + (comp - 0.18) / 2;
    }
    r.pares.unshift([a.clone().lerp(b, 0.25), b.clone()]);
    if (r.pares.length > 10) r.pares.length = 10;
    const pos = r.malha.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 10; i++) {
      const [pa, pb] = r.pares[Math.min(i, r.pares.length - 1)];
      pos.setXYZ(i * 2, pa.x, pa.y, pa.z);
      pos.setXYZ(i * 2 + 1, pb.x, pb.y, pb.z);
    }
    pos.needsUpdate = true;
    r.malha.visible = r.pares.length > 1;
  }

  /** Desenha o corpo (pontos já no espaço do corpo; null = ponto escondido). */
  desenharCorpo(pontos: (Ponto2 | null)[] | null, cabeca: Ponto2 | null): void {
    const pos = this.corpo.geometry.getAttribute('position') as THREE.BufferAttribute;
    OSSOS.forEach(([a, b], k) => {
      const pa = pontos?.[a];
      const pb = pontos?.[b];
      const va = pa && pb ? this.mundo(pa, -0.05) : new THREE.Vector3(0, -99, 0);
      const vb = pa && pb ? this.mundo(pb, -0.05) : new THREE.Vector3(0, -99, 0);
      pos.setXYZ(k * 2, va.x, va.y, va.z);
      pos.setXYZ(k * 2 + 1, vb.x, vb.y, vb.z);
    });
    pos.needsUpdate = true;
    this.cabeca.visible = Boolean(cabeca);
    if (cabeca) this.cabeca.position.copy(this.mundo(cabeca, -0.05));
  }

  /* ---------- Quadro ---------- */

  desenhar(dt: number, distancia: number, pulso: number): void {
    // Grade e arcos andam com a música; os arcos acendem na batida.
    this.grade.position.z = -30 + (distancia % 6); // célula da grade = 6 m em z
    for (const anel of this.aneis) {
      anel.position.z += dt * 6;
      if (anel.position.z > 3) anel.position.z -= 40;
      (anel.material as THREE.MeshBasicMaterial).opacity = 0.25 + pulso * 0.6;
      anel.scale.setScalar(1 + pulso * 0.03);
    }
    // Pedaços cortados.
    this.efeitos = this.efeitos.filter((e) => {
      e.vida -= dt;
      e.vel.y -= 6 * dt;
      e.obj.position.addScaledVector(e.vel, dt);
      e.obj.rotation.x += e.giro.x * dt;
      e.obj.rotation.y += e.giro.y * dt;
      e.obj.rotation.z += e.giro.z * dt;
      for (const m of e.materiais) (m as THREE.MeshStandardMaterial).opacity = Math.max(0, e.vida / e.total);
      if (e.vida <= 0) this.scene.remove(e.obj);
      return e.vida > 0;
    });
    // Faíscas.
    const p = this.faiscas.geometry.getAttribute('position') as THREE.BufferAttribute;
    let mexeu = false;
    for (let i = 0; i < this.faiscasVida.length; i++) {
      if (this.faiscasVida[i] <= 0) continue;
      this.faiscasVida[i] -= dt;
      this.faiscasVel[i * 3 + 1] -= 5 * dt;
      p.setXYZ(i, p.getX(i) + this.faiscasVel[i * 3] * dt, p.getY(i) + this.faiscasVel[i * 3 + 1] * dt, p.getZ(i) + this.faiscasVel[i * 3 + 2] * dt);
      if (this.faiscasVida[i] <= 0) p.setXYZ(i, 0, -999, 0);
      mexeu = true;
    }
    if (mexeu) p.needsUpdate = true;
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
