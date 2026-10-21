// Cena 3D da mesa (Three.js), toda desenhada em código: feltro com texto, borda acolchoada, sapato,
// cartas com face e verso em canvas e fichas. Recebe o estado da mesa e anima o que mudou
// (carta nova sai do sapato, carta virada gira, cartas recolhidas vão para o descarte).

import * as THREE from 'three';
import type { Estado } from './mesa';
import { type Carta, SIMBOLO, vermelho } from './regras';

const ZC = -2.4; // centro do arco da mesa (lado da banca)
const RAIO = 4.6;
const ANGULOS = [-0.62, 0, 0.62]; // assentos da esquerda para a direita
const R_CARTAS = 2.75;
const R_FICHAS = 3.75;
const CARTA = { w: 0.6, h: 0.86, e: 0.012 };
const SAPATO = new THREE.Vector3(2.85, 0.32, ZC + 0.75);
const DESCARTE = new THREE.Vector3(-2.85, 0.1, ZC + 0.75);
const DURACAO = 0.45;
const INTERVALO = 0.17;

/* ---------- Texturas desenhadas em canvas ---------- */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function textura(c: HTMLCanvasElement, aniso = 4): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

function retArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

const NOMES_FIGURA: Record<string, string> = { J: 'VALETE', Q: 'DAMA', K: 'REI' };

function texturaFace(c: Carta): THREE.CanvasTexture {
  const [cv, ctx] = canvas(300, 430);
  retArredondado(ctx, 0, 0, 300, 430, 22);
  ctx.fillStyle = '#fbfaf6';
  ctx.fill();
  ctx.strokeStyle = '#d8d3c6';
  ctx.lineWidth = 4;
  ctx.stroke();
  const cor = vermelho(c.naipe) ? '#c3262e' : '#1b1b1f';
  const s = c.naipe === '?' ? '' : SIMBOLO[c.naipe];
  ctx.fillStyle = cor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Cantos (o de baixo de ponta-cabeça, como numa carta de verdade).
  for (const giro of [0, Math.PI]) {
    ctx.save();
    ctx.translate(150, 215);
    ctx.rotate(giro);
    ctx.translate(-150, -215);
    ctx.font = 'bold 62px Georgia, serif';
    ctx.fillText(c.valor, 42, 48);
    ctx.font = '48px Georgia, serif';
    ctx.fillText(s, 42, 100);
    ctx.restore();
  }
  if (c.valor === 'J' || c.valor === 'Q' || c.valor === 'K') {
    retArredondado(ctx, 70, 95, 160, 240, 12);
    ctx.strokeStyle = cor;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.font = 'bold 120px Georgia, serif';
    ctx.fillText(c.valor, 150, 195);
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText(`${NOMES_FIGURA[c.valor]} ${s}`, 150, 295);
  } else {
    ctx.font = c.valor === 'A' ? '170px Georgia, serif' : '130px Georgia, serif';
    ctx.fillText(s, 150, 222);
  }
  return textura(cv, 8);
}

function texturaVerso(): THREE.CanvasTexture {
  const [cv, ctx] = canvas(300, 430);
  retArredondado(ctx, 0, 0, 300, 430, 22);
  ctx.fillStyle = '#fbfaf6';
  ctx.fill();
  retArredondado(ctx, 16, 16, 268, 398, 14);
  ctx.fillStyle = '#7a1b26';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,140,0.55)';
  ctx.lineWidth = 2;
  for (let i = -430; i < 430; i += 18) {
    ctx.beginPath();
    ctx.moveTo(16 + i, 16);
    ctx.lineTo(16 + i + 398, 414);
    ctx.moveTo(16 + i + 398, 16);
    ctx.lineTo(16 + i, 414);
    ctx.stroke();
  }
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillStyle = '#f3d28a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.beginPath();
  ctx.arc(150, 215, 58, 0, Math.PI * 2);
  ctx.fillStyle = '#7a1b26';
  ctx.fill();
  ctx.strokeStyle = '#f3d28a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#f3d28a';
  ctx.fillText('21', 150, 218);
  return textura(cv, 8);
}

function texturaFeltro(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const s = W / (RAIO * 2); // pixels por unidade
  const [cv, ctx] = canvas(W, H);
  const grad = ctx.createRadialGradient(W / 2, H, 100, W / 2, H * 0.6, W * 0.7);
  grad.addColorStop(0, '#1d7a4f');
  grad.addColorStop(1, '#0d4a2f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Espelha na vertical: no canvas "em cima" vira o lado da banca, que é o que quem joga vê como topo.
  ctx.translate(0, H);
  ctx.scale(1, -1);
  const textoNoArco = (texto: string, raio: number, tamanho: number, cor: string, abertura: number): void => {
    ctx.font = `bold ${tamanho}px Georgia, serif`;
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letras = [...texto];
    letras.forEach((l, i) => {
      const t = letras.length === 1 ? 0 : -abertura + (2 * abertura * i) / (letras.length - 1);
      ctx.save();
      ctx.translate(W / 2 + raio * s * Math.sin(t), raio * s * Math.cos(t));
      ctx.rotate(-t);
      ctx.fillText(l, 0, 0);
      ctx.restore();
    });
  };
  textoNoArco('BLACKJACK PAGA 3 PARA 2', 1.95, 64, '#f3d28a', 0.62);
  textoNoArco('A BANCA PARA EM TODOS OS 17', 1.5, 40, 'rgba(255,255,255,0.75)', 0.5);
  // Linha do seguro e círculos das apostas.
  ctx.strokeStyle = 'rgba(243,210,138,0.55)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(W / 2, 0, 2.3 * s, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
  for (const a of ANGULOS) {
    const x = W / 2 + R_FICHAS * s * Math.sin(a);
    const y = R_FICHAS * s * Math.cos(a);
    ctx.beginPath();
    ctx.arc(x, y, 0.42 * s, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  return textura(cv, 8);
}

/* ---------- Fichas ---------- */

const FICHAS: [number, string][] = [
  [500, '#6b3fa0'],
  [100, '#1f1f24'],
  [25, '#1f8a4c'],
  [10, '#2563c9'],
  [5, '#c42b2b'],
  [1, '#e8e3d6'],
];

export const CORES_FICHAS = Object.fromEntries(FICHAS);

function decompor(valor: number): string[] {
  const out: string[] = [];
  let resto = Math.round(valor);
  for (const [v, cor] of FICHAS) {
    while (resto >= v && out.length < 14) {
      out.push(cor);
      resto -= v;
    }
  }
  return out;
}

/* ---------- Animação ---------- */

interface Alvo {
  pos: THREE.Vector3;
  rotY: number;
  aberta: boolean;
}

interface Movimento {
  de: THREE.Vector3;
  para: THREE.Vector3;
  rotYDe: number;
  rotYPara: number;
  rotZDe: number;
  rotZPara: number;
  inicio: number;
  dur: number;
  arco: number;
  fim?: () => void;
}

interface CartaMesh {
  mesh: THREE.Mesh;
  chave: string;
  mov: Movimento | null;
  alvo: Alvo;
}

const suave = (t: number): number => 1 - Math.pow(1 - t, 3);

export class Cena {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private relogio = new THREE.Clock();
  private cartas = new Map<number, CartaMesh>();
  private fichas = new THREE.Group();
  private destaque: THREE.Mesh;
  private geoCarta = new THREE.BoxGeometry(CARTA.w, CARTA.e, CARTA.h);
  private matLado = new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 0.8 });
  private matVerso: THREE.MeshStandardMaterial;
  private faces = new Map<string, THREE.MeshStandardMaterial>();
  private proximaSaida = 0;
  private quadro: (() => void) | null = null;
  private olhar = new THREE.Vector3(0, 0, -0.35);

  constructor(private alvo: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    alvo.appendChild(this.renderer.domElement);
    this.matVerso = new THREE.MeshStandardMaterial({ map: texturaVerso(), roughness: 0.55 });

    this.scene.background = new THREE.Color('#0b0d12');
    this.scene.fog = new THREE.Fog('#0b0d12', 14, 26);
    this.montarSala();
    this.montarMesa();

    this.destaque = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48), new THREE.MeshBasicMaterial({ color: '#f3d28a', transparent: true, opacity: 0.9 }));
    this.destaque.rotation.x = -Math.PI / 2;
    this.destaque.visible = false;
    this.scene.add(this.destaque, this.fichas);

    addEventListener('resize', () => this.redimensionar());
    this.redimensionar();
    this.renderer.setAnimationLoop(() => this.desenhar());
  }

  private montarSala(): void {
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#20140c', 0.55));
    const luz = new THREE.SpotLight('#fff1d6', 160, 22, 0.75, 0.55, 1.6);
    luz.position.set(0, 9, 1.5);
    luz.target.position.set(0, 0, -0.6);
    luz.castShadow = true;
    luz.shadow.mapSize.set(1024, 1024);
    luz.shadow.bias = -0.0004;
    this.scene.add(luz, luz.target);
    const chao = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#3a1d14', roughness: 0.95 }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -1.1;
    chao.receiveShadow = true;
    this.scene.add(chao);
  }

  private montarMesa(): void {
    const forma = (raio: number, recuo: number): THREE.Shape => {
      const s = new THREE.Shape();
      s.moveTo(-raio, -recuo);
      s.lineTo(raio, -recuo);
      s.absarc(0, 0, raio, 0, Math.PI, false);
      s.lineTo(-raio, -recuo);
      return s;
    };
    // Feltro: o arco aponta para os jogadores (+z) depois de deitar a forma.
    const feltroGeo = new THREE.ExtrudeGeometry(forma(RAIO, 0), { depth: 0.12, bevelEnabled: false });
    const tex = texturaFeltro();
    tex.repeat.set(1 / (RAIO * 2), 1 / RAIO);
    tex.offset.set(0.5, 0);
    const feltro = new THREE.Mesh(feltroGeo, [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: '#0d4a2f' })]);
    feltro.rotation.x = Math.PI / 2;
    feltro.position.set(0, 0, ZC);
    feltro.receiveShadow = true;
    this.scene.add(feltro);

    const madeira = new THREE.MeshStandardMaterial({ color: '#5a2e17', roughness: 0.6 });
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(RAIO + 0.35, 0.35), { depth: 0.5, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }), madeira);
    base.rotation.x = Math.PI / 2;
    base.position.set(0, -0.01, ZC);
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
    const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 1.1, 24), madeira);
    pe.position.set(0, -0.6, ZC + 1.6);
    this.scene.add(pe);

    // Borda acolchoada de couro ao longo do arco.
    const pontos: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = Math.PI * (i / 64);
      pontos.push(new THREE.Vector3(Math.cos(t) * (RAIO + 0.12), 0.08, ZC + Math.sin(t) * (RAIO + 0.12)));
    }
    const borda = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pontos), 128, 0.2, 14, false), new THREE.MeshStandardMaterial({ color: '#2a1610', roughness: 0.45 }));
    borda.castShadow = true;
    this.scene.add(borda);

    // Sapato de cartas e bandeja de fichas da banca.
    const sapato = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 1.1), new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.4, metalness: 0.2 }));
    sapato.position.set(SAPATO.x, 0.21, SAPATO.z - 0.1);
    sapato.rotation.y = -0.35;
    sapato.castShadow = true;
    this.scene.add(sapato);
    const bandeja = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.55), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.5 }));
    bandeja.position.set(0, 0.04, ZC + 0.32);
    this.scene.add(bandeja);
    FICHAS.slice(0, 5).forEach(([, cor], i) => {
      for (let k = 0; k < 6; k++) {
        const f = this.ficha(cor);
        f.position.set(-1 + i * 0.5, 0.1 + k * 0.036, ZC + 0.32);
        this.scene.add(f);
      }
    });
  }

  private geoFicha = new THREE.CylinderGeometry(0.17, 0.17, 0.034, 28);
  private matsFicha = new Map<string, THREE.MeshStandardMaterial[]>();

  private ficha(cor: string): THREE.Mesh {
    if (!this.matsFicha.has(cor)) {
      const [cv, ctx] = canvas(128, 128);
      ctx.fillStyle = cor;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = cor === '#e8e3d6' ? '#777' : '#f4f1ea';
      ctx.lineWidth = 10;
      ctx.setLineDash([16, 14]);
      ctx.beginPath();
      ctx.arc(64, 64, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(64, 64, 34, 0, Math.PI * 2);
      ctx.stroke();
      const topo = new THREE.MeshStandardMaterial({ map: textura(cv), roughness: 0.4 });
      const lado = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.4 });
      this.matsFicha.set(cor, [lado, topo, topo]);
    }
    const m = new THREE.Mesh(this.geoFicha, this.matsFicha.get(cor)!);
    m.castShadow = true;
    return m;
  }

  private redimensionar(): void {
    const w = this.alvo.clientWidth || innerWidth;
    const h = this.alvo.clientHeight || innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // Tela em pé (celular): câmera mais alta e mais longe para a mesa inteira caber.
    const retrato = w / h < 1;
    this.camera.fov = retrato ? 62 : 42;
    this.camera.position.set(0, retrato ? 9.2 : 6.4, retrato ? 6.2 : 6.1);
    this.camera.lookAt(this.olhar);
    this.camera.updateProjectionMatrix();
  }

  /* ---------- Posições ---------- */

  private pontoAssento(i: number, raio: number): { x: number; z: number; a: number } {
    const a = ANGULOS[i];
    return { x: raio * Math.sin(a), z: ZC + raio * Math.cos(a), a };
  }

  /** Ponto da tela (em pixels) para rótulos HTML sobre a mesa. */
  naTela(onde: 'banca' | number): { x: number; y: number } {
    const p =
      onde === 'banca'
        ? new THREE.Vector3(0, 0.1, ZC + 1.55)
        : (() => {
            const s = this.pontoAssento(onde, RAIO + 0.55);
            return new THREE.Vector3(s.x, 0.1, s.z);
          })();
    p.project(this.camera);
    return { x: ((p.x + 1) / 2) * this.renderer.domElement.clientWidth, y: ((1 - p.y) / 2) * this.renderer.domElement.clientHeight };
  }

  aCadaQuadro(fn: () => void): void {
    this.quadro = fn;
  }

  /* ---------- Sincroniza com o estado da mesa ---------- */

  atualizar(e: Estado): void {
    const vistos = new Set<number>();
    const agora = this.relogio.getElapsedTime();
    const colocar = (c: Carta, alvo: Alvo): void => {
      vistos.add(c.id);
      const chave = c.aberta ? `${c.valor}${c.naipe}` : 'verso';
      let cm = this.cartas.get(c.id);
      if (!cm) {
        const mesh = new THREE.Mesh(this.geoCarta, [this.matLado, this.matLado, this.matFace(c), this.matVerso, this.matLado, this.matLado]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.copy(SAPATO);
        mesh.rotation.set(0, -0.35, Math.PI);
        this.scene.add(mesh);
        cm = { mesh, chave, mov: null, alvo };
        this.cartas.set(c.id, cm);
        const inicio = Math.max(agora, this.proximaSaida);
        this.proximaSaida = inicio + INTERVALO;
        this.mover(cm, alvo, inicio, 0.35);
        som?.('carta', inicio - agora);
        return;
      }
      if (cm.chave !== chave && c.aberta) {
        (cm.mesh.material as THREE.Material[])[2] = this.matFace(c);
      }
      const mudouLugar = !cm.alvo.pos.equals(alvo.pos) || cm.alvo.rotY !== alvo.rotY || cm.alvo.aberta !== alvo.aberta;
      cm.chave = chave;
      if (mudouLugar) this.mover(cm, alvo, Math.max(agora, cm.mov ? cm.mov.inicio + cm.mov.dur : agora), alvo.aberta !== cm.alvo.aberta ? 0.25 : 0.1);
    };

    // Banca: cartas lado a lado, centralizadas.
    e.banca.forEach((c, j) => {
      const x = (j - (e.banca.length - 1) / 2) * 0.66;
      colocar(c, { pos: new THREE.Vector3(x, 0.012 + j * 0.002, ZC + 1.05), rotY: 0, aberta: c.aberta });
    });

    // Jogadores: mãos lado a lado na frente de cada assento, cartas em leque na direção de quem joga.
    this.fichas.clear();
    let alvoDestaque: THREE.Vector3 | null = null;
    e.assentos.forEach((a, i) => {
      const n = a.maos.length;
      const s = this.pontoAssento(i, R_CARTAS);
      const tang = new THREE.Vector3(Math.cos(s.a), 0, -Math.sin(s.a));
      const radial = new THREE.Vector3(Math.sin(s.a), 0, Math.cos(s.a));
      a.maos.forEach((m, k) => {
        const desloc = (k - (n - 1) / 2) * (n > 2 ? 0.78 : 0.9);
        const base = new THREE.Vector3(s.x, 0.012, s.z).addScaledVector(tang, desloc);
        m.cartas.forEach((c, j) => {
          const dobra = m.dobrada && j === m.cartas.length - 1 && j === 2;
          const p = base.clone().addScaledVector(tang, j * 0.14).addScaledVector(radial, j * 0.2);
          p.y += j * 0.004;
          colocar(c, { pos: p, rotY: s.a + (dobra ? Math.PI / 2 : 0), aberta: c.aberta });
        });
        // Fichas da mão no círculo de aposta (deslocadas como as mãos).
        const f = this.pontoAssento(i, R_FICHAS);
        this.pilha(new THREE.Vector3(f.x, 0, f.z).addScaledVector(tang, desloc * 0.6), m.aposta);
        if (e.vez === i && k === a.atual && e.fase === 'jogadas') alvoDestaque = base.clone().addScaledVector(radial, 0.2);
      });
      if (!n && a.tipo !== 'vazio' && a.aposta > 0 && (e.fase === 'apostas' || e.fase === 'fim')) {
        const f = this.pontoAssento(i, R_FICHAS);
        this.pilha(new THREE.Vector3(f.x, 0, f.z), a.aposta);
      }
    });
    if (alvoDestaque) {
      this.destaque.visible = true;
      this.destaque.position.copy(alvoDestaque as THREE.Vector3).setY(0.006);
    } else this.destaque.visible = false;

    // Recolhe o que saiu da mesa para o descarte.
    let atraso = 0;
    for (const [id, cm] of this.cartas) {
      if (vistos.has(id)) continue;
      this.cartas.delete(id);
      const mov: Movimento = {
        de: cm.mesh.position.clone(),
        para: DESCARTE.clone().setY(0.02 + Math.random() * 0.03),
        rotYDe: cm.mesh.rotation.y,
        rotYPara: 0.3,
        rotZDe: cm.mesh.rotation.z,
        rotZPara: Math.PI,
        inicio: agora + atraso,
        dur: 0.4,
        arco: 0.3,
        fim: () => this.scene.remove(cm.mesh),
      };
      atraso += 0.03;
      this.animarSolto(cm.mesh, mov);
    }
  }

  private pilha(pos: THREE.Vector3, valor: number): void {
    decompor(valor).forEach((cor, k) => {
      const f = this.ficha(cor);
      f.position.set(pos.x, pos.y + 0.018 + k * 0.036, pos.z);
      f.rotation.y = k * 0.7;
      this.fichas.add(f);
    });
  }

  private matFace(c: Carta): THREE.MeshStandardMaterial {
    const chave = `${c.valor}${c.naipe}`;
    if (c.valor === '?') return this.matVerso;
    if (!this.faces.has(chave)) this.faces.set(chave, new THREE.MeshStandardMaterial({ map: texturaFace(c), roughness: 0.55 }));
    return this.faces.get(chave)!;
  }

  private mover(cm: CartaMesh, alvo: Alvo, inicio: number, arco: number): void {
    cm.mov = {
      de: cm.mesh.position.clone(),
      para: alvo.pos.clone(),
      rotYDe: cm.mesh.rotation.y,
      rotYPara: alvo.rotY,
      rotZDe: cm.mesh.rotation.z,
      rotZPara: alvo.aberta ? 0 : Math.PI,
      inicio,
      dur: DURACAO,
      arco,
    };
    cm.alvo = alvo;
  }

  private soltos: { mesh: THREE.Mesh; mov: Movimento }[] = [];
  private animarSolto(mesh: THREE.Mesh, mov: Movimento): void {
    this.soltos.push({ mesh, mov });
  }

  private aplicar(mesh: THREE.Mesh, m: Movimento, agora: number): boolean {
    const t = Math.min(1, Math.max(0, (agora - m.inicio) / m.dur));
    if (agora < m.inicio) return false;
    const k = suave(t);
    mesh.position.lerpVectors(m.de, m.para, k);
    mesh.position.y += Math.sin(Math.PI * t) * m.arco;
    mesh.rotation.y = m.rotYDe + (m.rotYPara - m.rotYDe) * k;
    mesh.rotation.z = m.rotZDe + (m.rotZPara - m.rotZDe) * k;
    return t >= 1;
  }

  /** true enquanto ainda há carta voando (a interface espera para liberar os botões). */
  ocupado(): boolean {
    const agora = this.relogio.getElapsedTime();
    return [...this.cartas.values()].some((c) => c.mov && agora < c.mov.inicio + c.mov.dur);
  }

  private desenhar(): void {
    const agora = this.relogio.getElapsedTime();
    for (const cm of this.cartas.values()) if (cm.mov && this.aplicar(cm.mesh, cm.mov, agora)) cm.mov = null;
    this.soltos = this.soltos.filter(({ mesh, mov }) => {
      const fim = this.aplicar(mesh, mov, agora);
      if (fim) mov.fim?.();
      return !fim;
    });
    if (this.destaque.visible) (this.destaque.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(agora * 4) * 0.35;
    // Leve balanço da câmera para a cena não ficar parada.
    this.camera.position.x = Math.sin(agora * 0.15) * 0.25;
    this.camera.lookAt(this.olhar);
    this.renderer.render(this.scene, this.camera);
    this.quadro?.();
  }
}

/** Ligado pelo main: toca o som de carta (com atraso em segundos, para acompanhar a animação). */
export let som: ((tipo: 'carta', atraso: number) => void) | null = null;
export const ligarSom = (fn: (tipo: 'carta', atraso: number) => void): void => {
  som = fn;
};
