// Mundo 3D da fuga (Three.js), todo desenhado em código: a rua do morro com casas coloridas empilhadas, caixas d'água,
// tijolo aparente, lajes, fios e varais, pipas no céu do fim de tarde, o corredor, a viatura com giroflex e o helicóptero.
// Você corre para -z; o mundo é que anda para +z.

import * as THREE from 'three';

export const FAIXAS = [-1.7, 0, 1.7];
export type TipoObstaculo = 'pular' | 'abaixar' | 'bloco';

export interface Obstaculo {
  z: number;
  faixa: number | 'todas'; // índice em FAIXAS (0, 1, 2) ou a rua inteira
  tipo: TipoObstaculo;
  comprimento: number; // em z, para saber quando você está "dentro" dele
  mesh: THREE.Object3D;
  resolvido: boolean;
}

export interface Moeda {
  z: number;
  faixa: number;
  y: number;
  mesh: THREE.Object3D;
  pega: boolean;
}

const RUA = 3.6; // meia largura da rua
const TRECHO = 10; // comprimento de cada pedaço de casas
const ALCANCE = 130; // até onde o mundo é montado à frente
const CORES_CASA = ['#e85d4a', '#f2a541', '#3fa7d6', '#59cd90', '#ee6c9e', '#f7d046', '#b48ef0', '#ff8c42', '#f4f1de', '#79c7c5'];

/* ---------- Texturas em canvas ---------- */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function textura(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Fachada de um andar (repetida na casa): reboco pintado ou tijolo aparente, com janela. */
function fachada(cor: string | null): THREE.CanvasTexture {
  const [c, x] = canvas(128, 128);
  if (cor) {
    x.fillStyle = cor;
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 6, 2 + Math.random() * 6);
    }
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.fillRect(0, 118, 128, 10); // marca da laje
  } else {
    // Tijolo aparente: a cara de casa ainda em obra.
    x.fillStyle = '#9a4a2b';
    x.fillRect(0, 0, 128, 128);
    for (let y = 0, l = 0; y < 128; y += 10, l++) {
      for (let k = (l % 2) * -12; k < 128; k += 24) {
        x.fillStyle = ['#b85c38', '#c96a3f', '#a8502f'][Math.floor(Math.random() * 3)];
        x.fillRect(k + 1, y + 1, 22, 8);
      }
    }
  }
  // Janela (às vezes acesa, porque é fim de tarde) ou porta de aço.
  const acesa = Math.random() < 0.45;
  x.fillStyle = '#1d2433';
  x.fillRect(38, 34, 52, 46);
  x.fillStyle = acesa ? '#ffd27a' : '#2f3b52';
  x.fillRect(42, 38, 21, 38);
  x.fillRect(65, 38, 21, 38);
  x.fillStyle = 'rgba(255,255,255,0.25)';
  x.fillRect(38, 80, 52, 4);
  return textura(c);
}

function concreto(): THREE.CanvasTexture {
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#6d6a66';
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const v = 90 + Math.random() * 60;
    x.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // Remendos e rachaduras.
  for (let i = 0; i < 4; i++) {
    x.fillStyle = `rgba(40,38,36,${0.2 + Math.random() * 0.2})`;
    x.fillRect(Math.random() * 220, Math.random() * 220, 20 + Math.random() * 40, 14 + Math.random() * 30);
  }
  x.strokeStyle = 'rgba(30,28,26,0.7)';
  x.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    x.beginPath();
    let px = Math.random() * 256;
    let py = Math.random() * 256;
    x.moveTo(px, py);
    for (let k = 0; k < 6; k++) x.lineTo((px += (Math.random() - 0.5) * 40), (py += Math.random() * 30));
    x.stroke();
  }
  // Faixas das pistas, apagadas.
  x.fillStyle = 'rgba(240,230,200,0.35)';
  for (const fx of [256 * (2.55 / 7.2), 256 * (4.65 / 7.2)]) for (let y = 0; y < 256; y += 64) x.fillRect(fx - 2, y, 4, 34);
  return textura(c);
}

function ceu(): THREE.CanvasTexture {
  const [c, x] = canvas(16, 512);
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#2a1846');
  g.addColorStop(0.45, '#8a3d6b');
  g.addColorStop(0.75, '#f0814f');
  g.addColorStop(1, '#ffc46b');
  x.fillStyle = g;
  x.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** O morro ao fundo: silhueta cheia de casinhas coloridas com luzes acesas. */
function morro(): THREE.CanvasTexture {
  const [c, x] = canvas(2048, 512);
  const altura = (px: number): number => 512 - (210 + Math.sin(px / 260) * 90 + Math.sin(px / 97) * 30 + Math.sin(px / 41) * 10);
  x.beginPath();
  x.moveTo(0, 512);
  for (let px = 0; px <= 2048; px += 8) x.lineTo(px, altura(px));
  x.lineTo(2048, 512);
  x.closePath();
  x.fillStyle = '#4a2f3c';
  x.fill();
  x.save();
  x.clip();
  for (let i = 0; i < 2600; i++) {
    const px = Math.random() * 2048;
    const topo = altura(px);
    const py = topo + Math.random() * (512 - topo);
    const w = 6 + Math.random() * 10;
    const h = 5 + Math.random() * 7;
    x.fillStyle = CORES_CASA[Math.floor(Math.random() * CORES_CASA.length)];
    x.globalAlpha = 0.55 + Math.random() * 0.35;
    x.fillRect(px, py, w, h);
    if (Math.random() < 0.35) {
      x.fillStyle = '#ffe08a';
      x.globalAlpha = 0.9;
      x.fillRect(px + w / 3, py + h / 3, 2, 2);
    }
  }
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function listras(): THREE.CanvasTexture {
  const [c, x] = canvas(128, 32);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? '#ffffff' : '#e63946';
    x.beginPath();
    x.moveTo(i * 20 - 10, 32);
    x.lineTo(i * 20 + 6, 0);
    x.lineTo(i * 20 + 26, 0);
    x.lineTo(i * 20 + 10, 32);
    x.fill();
  }
  return textura(c);
}

function letreiroPolicia(): THREE.CanvasTexture {
  const [c, x] = canvas(256, 64);
  x.fillStyle = '#f4f4f4';
  x.fillRect(0, 0, 256, 64);
  x.fillStyle = '#1b3a8a';
  x.fillRect(0, 22, 256, 22);
  x.fillStyle = '#ffffff';
  x.font = 'bold 18px sans-serif';
  x.textAlign = 'center';
  x.fillText('POLÍCIA', 128, 39);
  return textura(c);
}

function pipa(cor: string): THREE.CanvasTexture {
  const [c, x] = canvas(64, 96);
  x.fillStyle = cor;
  x.beginPath();
  x.moveTo(32, 2);
  x.lineTo(62, 34);
  x.lineTo(32, 70);
  x.lineTo(2, 34);
  x.closePath();
  x.fill();
  x.strokeStyle = 'rgba(0,0,0,0.4)';
  x.beginPath();
  x.moveTo(32, 2);
  x.lineTo(32, 70);
  x.moveTo(2, 34);
  x.lineTo(62, 34);
  x.stroke();
  x.strokeStyle = cor;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(32, 70);
  x.quadraticCurveTo(20, 82, 34, 94); // rabiola
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- Mundo ---------- */

interface Corredor {
  grupo: THREE.Group;
  corpo: THREE.Group;
  pernaE: THREE.Group;
  pernaD: THREE.Group;
  bracoE: THREE.Group;
  bracoD: THREE.Group;
}

export class Mundo {
  private renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(66, 1, 0.1, 400);
  private trechos: { z: number; grupo: THREE.Group }[] = [];
  private chao: THREE.Mesh;
  private texChao: THREE.CanvasTexture;
  private fachadas: THREE.CanvasTexture[];
  private pipas: THREE.Sprite[] = [];
  private corredor: Corredor;
  private sombra: THREE.Mesh;
  private viatura: THREE.Group;
  private giroflex: THREE.PointLight[];
  private lampadas: THREE.MeshBasicMaterial[];
  private heli: THREE.Group;
  private rotor: THREE.Object3D;
  private holofote: THREE.SpotLight;
  private cone: THREE.Mesh;
  private matListras = new THREE.MeshLambertMaterial({ map: listras() });
  private matMoeda = new THREE.MeshStandardMaterial({ color: '#ffcc33', emissive: '#c98a00', emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.3 });
  private geoMoeda = new THREE.CylinderGeometry(0.28, 0.28, 0.07, 20);
  obstaculos: Obstaculo[] = [];
  moedas: Moeda[] = [];
  private fimDoMundo = 0; // z do trecho mais distante já montado

  constructor(alvo: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    alvo.appendChild(this.renderer.domElement);
    this.scene.background = ceu();
    this.scene.fog = new THREE.Fog('#c9755f', 35, 125);
    this.scene.add(new THREE.HemisphereLight('#ffd9b0', '#4a2f3c', 1.1));
    const sol = new THREE.DirectionalLight('#ffb37a', 1.3);
    sol.position.set(-6, 10, -4);
    this.scene.add(sol);

    // Morro ao fundo (sem névoa, sempre à frente).
    const fundo = new THREE.Mesh(new THREE.PlaneGeometry(420, 105), new THREE.MeshBasicMaterial({ map: morro(), transparent: true, fog: false }));
    fundo.position.set(0, 30, -230);
    this.scene.add(fundo);

    // Rua de concreto e calçadas.
    this.texChao = concreto();
    this.texChao.repeat.set(1, 30);
    this.chao = new THREE.Mesh(new THREE.PlaneGeometry(RUA * 2, 240), new THREE.MeshLambertMaterial({ map: this.texChao }));
    this.chao.rotation.x = -Math.PI / 2;
    this.chao.position.z = -100;
    this.scene.add(this.chao);
    const calcada = new THREE.MeshLambertMaterial({ color: '#8f8a83' });
    for (const lado of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1, 0.18, 240), calcada);
      c.position.set(lado * (RUA + 0.5), 0.09, -100);
      this.scene.add(c);
    }

    this.fachadas = [...CORES_CASA.map((c) => fachada(c)), fachada(null), fachada(null), fachada(null)];

    // Pipas no céu (sprites que balançam).
    ['#e63946', '#ffd23f', '#3fa7d6', '#59cd90', '#ee6c9e', '#ff8c42'].forEach((cor, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pipa(cor), fog: false }));
      s.scale.set(1.6, 2.4, 1);
      s.position.set((i - 2.5) * 9 + Math.random() * 4, 16 + Math.random() * 10, -50 - Math.random() * 60);
      this.pipas.push(s);
      this.scene.add(s);
    });

    this.corredor = this.criarCorredor();
    this.sombra = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35 }));
    this.sombra.rotation.x = -Math.PI / 2;
    this.sombra.position.y = 0.02;
    this.scene.add(this.sombra);

    [this.viatura, this.giroflex, this.lampadas] = this.criarViatura();
    [this.heli, this.rotor, this.holofote, this.cone] = this.criarHelicoptero();

    addEventListener('resize', () => this.redimensionar());
    this.redimensionar();
    this.reiniciar();
  }

  private redimensionar(): void {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    const retrato = w / h < 1;
    this.camera.fov = retrato ? 82 : 66;
    this.camera.position.set(0, retrato ? 4.4 : 3.5, retrato ? 7.6 : 6.6);
    this.camera.lookAt(0, 1.1, -9);
    this.camera.updateProjectionMatrix();
  }

  /** Limpa obstáculos e moedas e monta o caminho de novo. */
  reiniciar(): void {
    for (const o of this.obstaculos) this.scene.remove(o.mesh);
    for (const m of this.moedas) this.scene.remove(m.mesh);
    for (const t of this.trechos) this.scene.remove(t.grupo);
    this.obstaculos = [];
    this.moedas = [];
    this.trechos = [];
    this.fimDoMundo = 12;
    while (this.fimDoMundo > -ALCANCE) this.novoTrecho();
  }

  /* ---------- Casas ---------- */

  private novoTrecho(): void {
    const z = this.fimDoMundo - TRECHO / 2;
    this.fimDoMundo -= TRECHO;
    const g = new THREE.Group();
    g.position.z = z;
    for (const lado of [-1, 1]) {
      let ocupado = -TRECHO / 2;
      while (ocupado < TRECHO / 2 - 0.5) {
        const largura = Math.min(TRECHO / 2 - ocupado, 2.6 + Math.random() * 3);
        const andares = 1 + Math.floor(Math.random() * 3.4);
        const fundo = 3 + Math.random() * 2.5;
        const recuo = Math.random() * 0.6;
        const alt = andares * 2.6;
        const tex = this.fachadas[Math.floor(Math.random() * this.fachadas.length)].clone();
        tex.repeat.set(Math.max(1, Math.round(largura / 2.6)), andares);
        tex.needsUpdate = true;
        const casa = new THREE.Mesh(new THREE.BoxGeometry(fundo, alt, largura), new THREE.MeshLambertMaterial({ map: tex }));
        const cx = lado * (RUA + 1 + recuo + fundo / 2);
        const cz = ocupado + largura / 2;
        casa.position.set(cx, alt / 2, cz);
        g.add(casa);
        // Em cima da laje: caixa d'água azul, ferragem esperando o próximo andar ou antena.
        const topo = alt;
        const sorte = Math.random();
        if (sorte < 0.55) {
          const caixa = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.75, 14), new THREE.MeshLambertMaterial({ color: '#2f6fd6' }));
          caixa.position.set(cx + (Math.random() - 0.5) * fundo * 0.5, topo + 0.38, cz + (Math.random() - 0.5) * largura * 0.4);
          const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 14), new THREE.MeshLambertMaterial({ color: '#2459b8' }));
          tampa.position.copy(caixa.position).setY(topo + 0.8);
          g.add(caixa, tampa);
        } else if (sorte < 0.8) {
          const ferro = new THREE.MeshLambertMaterial({ color: '#5b4a3e' });
          for (const [fx, fz] of [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ]) {
            const v = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), ferro);
            v.position.set(cx + (fx * fundo) / 2.4, topo + 0.55, cz + (fz * largura) / 2.4);
            g.add(v);
          }
        } else {
          const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), new THREE.MeshLambertMaterial({ color: '#333' }));
          antena.position.set(cx, topo + 0.8, cz);
          g.add(antena);
        }
        ocupado += largura;
      }
    }
    // Poste com fios atravessando a rua e, às vezes, um varal lá no alto.
    if (Math.random() < 0.7) {
      const lado = Math.random() < 0.5 ? -1 : 1;
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 8), new THREE.MeshLambertMaterial({ color: '#7d7a75' }));
      poste.position.set(lado * (RUA + 0.6), 3.75, 0);
      g.add(poste);
      const fio = new THREE.LineBasicMaterial({ color: '#1a1a1a' });
      for (let k = 0; k < 3; k++) {
        const a = new THREE.Vector3(lado * (RUA + 0.6), 7 - k * 0.25, 0);
        const b = new THREE.Vector3(-lado * (RUA + 1.2), 5.8 - k * 0.3, (Math.random() - 0.5) * 6);
        const meio = a.clone().lerp(b, 0.5).setY(Math.min(a.y, b.y) - 0.7);
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(a, meio, b).getPoints(12)), fio));
      }
    }
    if (Math.random() < 0.3) g.add(this.varal(RUA + 1, 5.2, 0, false));
    this.scene.add(g);
    this.trechos.push({ z, grupo: g });
  }

  /** Varal de roupa: decoração lá no alto ou obstáculo baixo (para abaixar). */
  private varal(meiaLargura: number, altura: number, z: number, comPostes: boolean): THREE.Group {
    const g = new THREE.Group();
    g.position.z = z;
    const corda = new THREE.Mesh(new THREE.BoxGeometry(meiaLargura * 2, 0.03, 0.03), new THREE.MeshLambertMaterial({ color: '#eeeeee' }));
    corda.position.y = altura;
    g.add(corda);
    if (comPostes) {
      for (const lado of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, altura + 0.3, 6), new THREE.MeshLambertMaterial({ color: '#6b4f3a' }));
        p.position.set(lado * meiaLargura, (altura + 0.3) / 2, 0);
        g.add(p);
      }
    }
    // Roupas penduradas: camisetas, toalhas e bermudas coloridas.
    for (let x = -meiaLargura + 0.3; x < meiaLargura - 0.2; x += 0.42 + Math.random() * 0.25) {
      const alt = comPostes ? 0.45 + Math.random() * 0.2 : 0.4 + Math.random() * 0.4;
      const roupa = new THREE.Mesh(new THREE.BoxGeometry(0.36, alt, 0.02), new THREE.MeshLambertMaterial({ color: CORES_CASA[Math.floor(Math.random() * CORES_CASA.length)] }));
      roupa.position.set(x, altura - alt / 2, 0);
      roupa.rotation.z = (Math.random() - 0.5) * 0.15;
      g.add(roupa);
    }
    return g;
  }

  /* ---------- Obstáculos e moedas ---------- */

  novoObstaculo(tipo: TipoObstaculo, faixa: number | 'todas', z: number): void {
    const g = new THREE.Group();
    let comprimento = 0.6;
    const x = faixa === 'todas' ? 0 : FAIXAS[faixa];
    if (tipo === 'abaixar') {
      // Varal baixo: só passa abaixado.
      const meia = faixa === 'todas' ? RUA : 0.85;
      g.add(this.varal(meia, 1.75, 0, true));
      comprimento = 0.4;
    } else if (tipo === 'pular') {
      const qual = Math.random();
      if (qual < 0.4) {
        // Barreira de obra listrada.
        const tabua = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.1), this.matListras);
        tabua.position.y = 0.75;
        g.add(tabua);
        for (const lx of [-0.6, 0.6]) {
          const pe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.5), new THREE.MeshLambertMaterial({ color: '#dddddd' }));
          pe.position.set(lx, 0.45, 0);
          g.add(pe);
        }
      } else if (qual < 0.75) {
        // Pilha de tijolos.
        const mat = new THREE.MeshLambertMaterial({ color: '#b85c38' });
        for (let k = 0; k < 9; k++) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.6), mat);
          t.position.set(-0.45 + (k % 3) * 0.45, 0.1 + Math.floor(k / 3) * 0.21, 0);
          g.add(t);
        }
        comprimento = 0.7;
      } else {
        // Moto estacionada atravessada.
        const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.35), new THREE.MeshLambertMaterial({ color: '#c1121f' }));
        corpo.position.y = 0.6;
        const banco = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), new THREE.MeshLambertMaterial({ color: '#111' }));
        banco.position.set(-0.15, 0.88, 0);
        g.add(corpo, banco);
        for (const rx of [-0.6, 0.6]) {
          const roda = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 8, 16), new THREE.MeshLambertMaterial({ color: '#151515' }));
          roda.position.set(rx, 0.3, 0);
          g.add(roda);
        }
        comprimento = 0.5;
      }
    } else {
      const qual = Math.random();
      if (qual < 0.4) {
        // Kombi (branca e azul).
        const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.6), new THREE.MeshLambertMaterial({ color: '#f1f1f1' }));
        corpo.position.y = 1.05;
        const saia = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.55, 3.62), new THREE.MeshLambertMaterial({ color: '#2b6cb0' }));
        saia.position.y = 0.55;
        const vidro = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.05), new THREE.MeshLambertMaterial({ color: '#2a3550' }));
        vidro.position.set(0, 1.45, 1.81);
        g.add(corpo, saia, vidro);
        for (const [rx, rz] of [
          [-0.75, -1.2],
          [0.75, -1.2],
          [-0.75, 1.2],
          [0.75, 1.2],
        ]) {
          const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), new THREE.MeshLambertMaterial({ color: '#111' }));
          roda.rotation.z = Math.PI / 2;
          roda.position.set(rx, 0.3, rz);
          g.add(roda);
        }
        comprimento = 3.6;
      } else if (qual < 0.7) {
        // Barraca de frutas com guarda-sol.
        const mesa = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1), new THREE.MeshLambertMaterial({ color: '#8b5a2b' }));
        mesa.position.y = 0.45;
        g.add(mesa);
        for (let k = 0; k < 6; k++) {
          const fruta = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: ['#f4a261', '#e63946', '#ffd23f', '#59cd90'][k % 4] }));
          fruta.position.set(-0.5 + (k % 3) * 0.5, 1.02, -0.2 + Math.floor(k / 3) * 0.4);
          g.add(fruta);
        }
        const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), new THREE.MeshLambertMaterial({ color: '#ddd' }));
        haste.position.y = 1.1;
        const sol = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 8, 1, true), new THREE.MeshLambertMaterial({ color: '#e63946', side: THREE.DoubleSide }));
        sol.position.y = 2.3;
        g.add(haste, sol);
        comprimento = 1;
      } else {
        // Caixas d'água e engradados empilhados.
        const caixa = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.6, 1.2, 14), new THREE.MeshLambertMaterial({ color: '#2f6fd6' }));
        caixa.position.set(0, 0.6, 0);
        const engradado = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), new THREE.MeshLambertMaterial({ color: '#f2a541' }));
        engradado.position.set(0.1, 1.5, 0);
        g.add(caixa, engradado);
        comprimento = 1.4;
      }
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.obstaculos.push({ z, faixa, tipo, comprimento, mesh: g, resolvido: false });
  }

  novaMoeda(faixa: number, z: number, y = 0.9): void {
    const m = new THREE.Mesh(this.geoMoeda, this.matMoeda);
    m.rotation.x = Math.PI / 2;
    m.position.set(FAIXAS[faixa], y, z);
    this.scene.add(m);
    this.moedas.push({ z, faixa, y, mesh: m, pega: false });
  }

  pegarMoeda(m: Moeda): void {
    m.pega = true;
    this.scene.remove(m.mesh);
  }

  /** O mundo anda dz metros na sua direção; tira o que ficou para trás e monta mais à frente. */
  avancar(dz: number, distancia: number, t: number): void {
    this.texChao.offset.y = distancia / 8;
    for (const tr of this.trechos) {
      tr.z += dz;
      tr.grupo.position.z = tr.z;
    }
    this.fimDoMundo += dz;
    while (this.trechos.length && this.trechos[0].z > 18) this.scene.remove(this.trechos.shift()!.grupo);
    while (this.fimDoMundo > -ALCANCE) this.novoTrecho();
    for (const o of this.obstaculos) {
      o.z += dz;
      o.mesh.position.z = o.z;
    }
    this.obstaculos = this.obstaculos.filter((o) => (o.z - o.comprimento / 2 > 12 ? (this.scene.remove(o.mesh), false) : true));
    for (const m of this.moedas) {
      m.z += dz;
      m.mesh.position.z = m.z;
      m.mesh.rotation.z = t * 4;
    }
    this.moedas = this.moedas.filter((m) => (m.z > 12 || m.pega ? (this.scene.remove(m.mesh), false) : true));
    this.pipas.forEach((p, i) => {
      p.position.x += Math.sin(t * 0.8 + i) * 0.01;
      p.position.y += Math.cos(t * 1.1 + i * 2) * 0.008;
      (p.material as THREE.SpriteMaterial).rotation = Math.sin(t * 1.5 + i) * 0.25;
    });
  }

  /** Ponto mais distante já usado por obstáculos (para o gerador saber onde continuar). */
  get horizonte(): number {
    return -ALCANCE + 10;
  }

  /* ---------- Corredor ---------- */

  private criarCorredor(): Corredor {
    const pele = new THREE.MeshLambertMaterial({ color: '#8d5524' });
    const camisa = new THREE.MeshLambertMaterial({ color: '#ffd23f' });
    const bermuda = new THREE.MeshLambertMaterial({ color: '#2b6cb0' });
    const grupo = new THREE.Group();
    const corpo = new THREE.Group();
    grupo.add(corpo);
    const membro = (mat: THREE.Material, w: number, h: number, x: number, y: number): THREE.Group => {
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h / 2;
      g.add(m);
      corpo.add(g);
      return g;
    };
    const pernaE = membro(bermuda, 0.2, 0.85, -0.13, 0.88);
    const pernaD = membro(bermuda, 0.2, 0.85, 0.13, 0.88);
    for (const p of [pernaE, pernaD]) {
      const canela = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), pele);
      canela.position.y = -0.72;
      const chinelo = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.3), new THREE.MeshLambertMaterial({ color: '#2ecc71' }));
      chinelo.position.set(0, -0.86, -0.05);
      p.add(canela, chinelo);
    }
    const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.3), camisa);
    tronco.position.y = 1.2;
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.31), new THREE.MeshLambertMaterial({ color: '#2ecc71' }));
    faixa.position.y = 1.32;
    corpo.add(tronco, faixa);
    const bracoE = membro(pele, 0.13, 0.62, -0.36, 1.48);
    const bracoD = membro(pele, 0.13, 0.62, 0.36, 1.48);
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), pele);
    cabeca.position.y = 1.72;
    // Boné virado para trás.
    const bone = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#e63946' }));
    bone.position.y = 1.76;
    const aba = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.2), new THREE.MeshLambertMaterial({ color: '#e63946' }));
    aba.position.set(0, 1.78, 0.25);
    corpo.add(cabeca, bone, aba);
    this.scene.add(grupo);
    return { grupo, corpo, pernaE, pernaD, bracoE, bracoD };
  }

  /** Posição e animação do corredor: x na pista, y do pulo, abaixado (deslizando) e tropeçando. */
  corredorEm(x: number, y: number, abaixado: boolean, t: number, passada: number, tropeco: number): void {
    const c = this.corredor;
    c.grupo.position.set(x, y, 0);
    const no_ar = y > 0.05;
    const balanco = no_ar ? 0 : Math.sin(t * passada);
    c.pernaE.rotation.x = no_ar ? 0.9 : balanco * 0.9; // positivo = joelho para a frente (o corredor olha para -z)
    c.pernaD.rotation.x = no_ar ? 0.4 : -balanco * 0.9;
    c.bracoE.rotation.x = no_ar ? -2.4 : -balanco * 0.8;
    c.bracoD.rotation.x = no_ar ? -2.4 : balanco * 0.8;
    // Abaixado: desliza deitado para trás, como passando por baixo.
    c.corpo.rotation.x += ((abaixado ? 1.1 : 0) - c.corpo.rotation.x) * 0.3;
    c.corpo.position.y += ((abaixado ? -0.55 : Math.abs(balanco) * 0.06) - c.corpo.position.y) * 0.3;
    c.corpo.rotation.z = tropeco > 0 ? Math.sin(t * 30) * 0.25 * tropeco : 0;
    this.sombra.position.x = x;
    this.sombra.scale.setScalar(Math.max(0.4, 1 - y * 0.3));
  }

  /* ---------- Viatura e helicóptero ---------- */

  private criarViatura(): [THREE.Group, THREE.PointLight[], THREE.MeshBasicMaterial[]] {
    const g = new THREE.Group();
    const branco = new THREE.MeshLambertMaterial({ color: '#f4f4f4' });
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.3), branco);
    corpo.position.y = 0.65;
    const lateral = new THREE.MeshLambertMaterial({ map: letreiroPolicia() });
    const faixaE = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.6), lateral);
    faixaE.rotation.y = -Math.PI / 2;
    faixaE.position.set(-0.96, 0.7, 0);
    const faixaD = faixaE.clone();
    faixaD.rotation.y = Math.PI / 2;
    faixaD.position.x = 0.96;
    const cabine = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1), new THREE.MeshLambertMaterial({ color: '#2a3550' }));
    cabine.position.set(0, 1.3, 0.2);
    const capo = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.05, 1.2), new THREE.MeshLambertMaterial({ color: '#1b3a8a' }));
    capo.position.set(0, 1.03, -1.5);
    g.add(corpo, faixaE, faixaD, cabine, capo);
    for (const [rx, rz] of [
      [-0.85, -1.4],
      [0.85, -1.4],
      [-0.85, 1.4],
      [0.85, 1.4],
    ]) {
      const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), new THREE.MeshLambertMaterial({ color: '#111' }));
      roda.rotation.z = Math.PI / 2;
      roda.position.set(rx, 0.34, rz);
      g.add(roda);
    }
    for (const fx of [-0.6, 0.6]) {
      const farol = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.05), new THREE.MeshBasicMaterial({ color: '#fff6c8' }));
      farol.position.set(fx, 0.75, -2.16);
      g.add(farol);
    }
    // Giroflex: vermelho e azul piscando, com luz de verdade que pinta a rua quando chega perto.
    const lampadas = ['#ff1e2d', '#1e6bff'].map((c) => new THREE.MeshBasicMaterial({ color: c }));
    const luzes: THREE.PointLight[] = [];
    lampadas.forEach((mat, i) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), mat);
      l.position.set(i ? 0.38 : -0.38, 1.7, 0.2);
      g.add(l);
      const luz = new THREE.PointLight(i ? '#1e6bff' : '#ff1e2d', 0, 14, 1.6);
      luz.position.set(i ? 0.6 : -0.6, 2.2, -0.5);
      g.add(luz);
      luzes.push(luz);
    });
    g.position.set(0, 0, 14);
    this.scene.add(g);
    return [g, luzes, lampadas];
  }

  /** distancia: metros entre você e a viatura (perto de 0 = te pegou). */
  viaturaEm(x: number, distancia: number, t: number, ligada: boolean): void {
    const v = this.viatura;
    v.position.z = 2.3 + distancia;
    v.position.x += (x - v.position.x) * 0.05;
    v.visible = v.position.z < 16;
    const fase = Math.floor(t * 6) % 2;
    const perto = Math.max(0, 1 - distancia / 10);
    this.lampadas[0].color.set(ligada && fase === 0 ? '#ff1e2d' : '#4a0a0e');
    this.lampadas[1].color.set(ligada && fase === 1 ? '#1e6bff' : '#0a1a4a');
    this.giroflex[0].intensity = ligada && fase === 0 ? 30 * (0.3 + perto) : 0;
    this.giroflex[1].intensity = ligada && fase === 1 ? 30 * (0.3 + perto) : 0;
  }

  private criarHelicoptero(): [THREE.Group, THREE.Object3D, THREE.SpotLight, THREE.Mesh] {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: '#1d2b53' });
    const corpo = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
    corpo.scale.set(0.9, 0.8, 1.6);
    const cauda = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 3, 8), mat);
    cauda.rotation.x = Math.PI / 2;
    cauda.position.z = 2.4;
    const vidro = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshLambertMaterial({ color: '#9ec9ff', emissive: '#203050' }));
    vidro.position.set(0, 0.1, -1);
    const rotor = new THREE.Group();
    for (const ang of [0, Math.PI / 2]) {
      const pa = new THREE.Mesh(new THREE.BoxGeometry(6, 0.04, 0.25), new THREE.MeshLambertMaterial({ color: '#111' }));
      pa.rotation.y = ang;
      rotor.add(pa);
    }
    rotor.position.y = 0.95;
    g.add(corpo, cauda, vidro, rotor);
    for (const sx of [-0.7, 0.7]) {
      const esqui = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.2), new THREE.MeshLambertMaterial({ color: '#333' }));
      esqui.position.set(sx, -0.95, 0);
      g.add(esqui);
    }
    // Holofote apontado para você, com um cone de luz falso para aparecer no ar.
    const holofote = new THREE.SpotLight('#fff8dc', 0, 40, 0.28, 0.6, 1);
    holofote.position.set(0, -0.8, 0);
    g.add(holofote);
    this.scene.add(holofote.target);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff8dc', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.scene.add(cone);
    g.visible = false;
    cone.visible = false;
    this.scene.add(g);
    return [g, rotor, holofote, cone];
  }

  /** Helicóptero acompanhando lá no alto (a partir de 4 estrelas). */
  helicopteroEm(visivel: boolean, alvoX: number, t: number): void {
    this.heli.visible = visivel;
    this.cone.visible = visivel;
    this.holofote.intensity = visivel ? 400 : 0;
    if (!visivel) return;
    const hx = alvoX + Math.sin(t * 0.4) * 4;
    this.heli.position.set(hx, 13 + Math.sin(t * 0.9) * 0.4, -16);
    this.heli.rotation.z = Math.sin(t * 0.4) * 0.12;
    this.rotor.rotation.y = t * 25;
    // O holofote varre ao redor de você.
    const ax = alvoX + Math.sin(t * 1.3) * 1.2;
    const az = Math.cos(t * 0.9) * 1.5;
    this.holofote.target.position.set(ax, 0, az);
    const de = new THREE.Vector3(hx, 12.2, -16);
    const para = new THREE.Vector3(ax, 0, az);
    this.cone.position.copy(de).lerp(para, 0.5);
    this.cone.lookAt(para);
    this.cone.rotateX(-Math.PI / 2);
    this.cone.scale.set(1, de.distanceTo(para) / 14, 1);
  }

  desenhar(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
