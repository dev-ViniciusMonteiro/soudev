// Boneco low-poly feito em código, com animações simples (parado, andar, correr, no ar) e emotes.
// Etapa 1: serve de base para tudo funcionar online. Na etapa 2 o corpo vira um GLB preparado no Blender,
// mantendo esta mesma interface (aplicarSkin, atualizar, emote), então o resto do jogo não muda.

import * as THREE from 'three';
import { Anim, type Emote } from './protocolo';

export const PELES = ['#f6d3b3', '#e8b48f', '#c98e64', '#a26a43', '#7a4b2c', '#4f2f1c'];
export const CORES = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f5f5f4', '#27272a', '#78716c', '#1e3a8a'];
export const CABELOS = ['curto', 'arrepiado', 'comprido', 'careca'] as const;
export const CHAPEUS = ['nenhum', 'bone', 'gorro', 'cartola', 'coroa'] as const;

export interface Aparencia {
  pele: number;
  cabelo: (typeof CABELOS)[number];
  corCabelo: string;
  camisa: string;
  calca: string;
  sapato: string;
  chapeu: (typeof CHAPEUS)[number];
  oculos: boolean;
}

export const APARENCIA_PADRAO: Aparencia = { pele: 1, cabelo: 'curto', corCabelo: '#3f2a1d', camisa: '#3b82f6', calca: '#27272a', sapato: '#f5f5f4', chapeu: 'nenhum', oculos: false };

const COR = /^#[0-9a-f]{6}$/i;

/** "pele:1|cabelo:curto|camisa:#3b82f6|..." ⇄ objeto. Valores estranhos caem no padrão. */
export function lerSkin(texto: string): Aparencia {
  const a: Aparencia = { ...APARENCIA_PADRAO };
  for (const par of texto.split('|')) {
    const [k, v = ''] = par.split(':');
    if (k === 'pele' && Number(v) >= 0 && Number(v) < PELES.length) a.pele = Number(v);
    else if (k === 'cabelo' && (CABELOS as readonly string[]).includes(v)) a.cabelo = v as Aparencia['cabelo'];
    else if (k === 'chapeu' && (CHAPEUS as readonly string[]).includes(v)) a.chapeu = v as Aparencia['chapeu'];
    else if (k === 'oculos') a.oculos = v === '1';
    else if ((k === 'corCabelo' || k === 'camisa' || k === 'calca' || k === 'sapato') && COR.test(v)) a[k] = v;
  }
  return a;
}

export const escreverSkin = (a: Aparencia): string => `pele:${a.pele}|cabelo:${a.cabelo}|corCabelo:${a.corCabelo}|camisa:${a.camisa}|calca:${a.calca}|sapato:${a.sapato}|chapeu:${a.chapeu}|oculos:${a.oculos ? 1 : 0}`;

const mat = (cor: string): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.75, flatShading: true });

function caixa(l: number, a: number, p: number, m: THREE.Material, y = 0): THREE.Mesh {
  const g = new THREE.BoxGeometry(l, a, p);
  g.translate(0, y, 0);
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}

/** Placa com o nome, sempre virada para a câmera. */
function placaNome(nome: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.font = '600 34px system-ui, sans-serif';
  const larg = Math.min(248, g.measureText(nome).width + 28);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.beginPath();
  g.roundRect((256 - larg) / 2, 8, larg, 48, 24);
  g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(nome, 128, 33);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(1.6, 0.4, 1);
  s.position.y = 2.35;
  s.renderOrder = 10;
  return s;
}

export class Boneco {
  readonly grupo = new THREE.Group();
  private corpo = new THREE.Group(); // balança/pula sem mexer na posição do jogador
  private pernaE = new THREE.Group();
  private pernaD = new THREE.Group();
  private bracoE = new THREE.Group();
  private bracoD = new THREE.Group();
  private cabeca = new THREE.Group();
  private extras = new THREE.Group(); // cabelo, chapéu e óculos
  private mats = { pele: mat('#fff'), camisa: mat('#fff'), calca: mat('#fff'), sapato: mat('#fff'), cabelo: mat('#fff') };
  private fase = 0;
  private emoteAtual: { e: Emote; t: number } | null = null;
  private placa: THREE.Sprite | null = null;

  constructor(nome: string | null, skin: string) {
    const { pele, camisa, calca, sapato } = this.mats;
    // Pernas e braços giram no quadril/ombro: a malha fica pendurada abaixo do ponto de giro.
    for (const [perna, x] of [
      [this.pernaE, -0.13],
      [this.pernaD, 0.13],
    ] as const) {
      perna.position.set(x, 0.85, 0);
      perna.add(caixa(0.2, 0.7, 0.22, calca, -0.35), caixa(0.22, 0.15, 0.3, sapato, -0.78));
      perna.children[1].position.z = 0.04;
      this.corpo.add(perna);
    }
    const tronco = caixa(0.52, 0.62, 0.28, camisa, 1.16);
    for (const [braco, x] of [
      [this.bracoE, -0.33],
      [this.bracoD, 0.33],
    ] as const) {
      braco.position.set(x, 1.42, 0);
      braco.add(caixa(0.15, 0.42, 0.17, camisa, -0.2), caixa(0.13, 0.2, 0.15, pele, -0.5));
      this.corpo.add(braco);
    }
    this.cabeca.position.y = 1.5;
    const rosto = caixa(0.4, 0.4, 0.38, pele, 0.22);
    const olhoMat = mat('#1c1917');
    const olhoE = caixa(0.06, 0.08, 0.02, olhoMat, 0.26);
    olhoE.position.set(-0.09, 0, 0.2);
    const olhoD = olhoE.clone();
    olhoD.position.x = 0.09;
    this.cabeca.add(rosto, olhoE, olhoD, this.extras);
    this.corpo.add(tronco, this.cabeca);
    this.grupo.add(this.corpo);
    if (nome) {
      this.placa = placaNome(nome);
      this.grupo.add(this.placa);
    }
    this.aplicarSkin(skin);
  }

  aplicarSkin(skin: string): void {
    const a = lerSkin(skin);
    this.mats.pele.color.set(PELES[a.pele]);
    this.mats.camisa.color.set(a.camisa);
    this.mats.calca.color.set(a.calca);
    this.mats.sapato.color.set(a.sapato);
    this.mats.cabelo.color.set(a.corCabelo);
    this.extras.clear();
    const cab = this.mats.cabelo;
    if (a.cabelo === 'curto') this.extras.add(caixa(0.42, 0.1, 0.4, cab, 0.45));
    else if (a.cabelo === 'arrepiado') for (let i = 0; i < 5; i++) {
      const p = caixa(0.1, 0.16, 0.1, cab, 0.48);
      p.position.set(-0.16 + i * 0.08, 0, (i % 2) * 0.06 - 0.03);
      this.extras.add(p);
    }
    else if (a.cabelo === 'comprido') {
      this.extras.add(caixa(0.42, 0.1, 0.4, cab, 0.45));
      const tras = caixa(0.42, 0.45, 0.08, cab, 0.2);
      tras.position.z = -0.21;
      this.extras.add(tras);
    }
    if (a.chapeu === 'bone') {
      this.extras.add(caixa(0.43, 0.12, 0.41, mat(a.camisa), 0.48));
      const aba = caixa(0.36, 0.03, 0.2, mat(a.camisa), 0.43);
      aba.position.z = 0.27;
      this.extras.add(aba);
    } else if (a.chapeu === 'gorro') this.extras.add(caixa(0.44, 0.18, 0.42, mat('#dc2626'), 0.5));
    else if (a.chapeu === 'cartola') this.extras.add(caixa(0.5, 0.03, 0.48, mat('#18181b'), 0.43), caixa(0.32, 0.36, 0.3, mat('#18181b'), 0.62));
    else if (a.chapeu === 'coroa') {
      const ouro = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.8, roughness: 0.3, flatShading: true });
      this.extras.add(caixa(0.42, 0.1, 0.4, ouro, 0.47));
      for (const [x, z] of [[-0.17, 0.16], [0.17, 0.16], [-0.17, -0.16], [0.17, -0.16], [0, 0.16]]) {
        const ponta = caixa(0.06, 0.1, 0.06, ouro, 0.56);
        ponta.position.set(x, 0, z);
        this.extras.add(ponta);
      }
    }
    if (a.oculos) {
      const o = caixa(0.36, 0.08, 0.03, mat('#09090b'), 0.27);
      o.position.z = 0.205;
      this.extras.add(o);
    }
  }

  emote(e: Emote): void {
    this.emoteAtual = { e, t: 0 };
  }

  /** Anima conforme o estado; vel = metros por segundo no chão (ritmo da passada). */
  atualizar(dt: number, anim: Anim, vel: number): void {
    // Andar cancela o emote (como nos jogos do gênero).
    if (this.emoteAtual && (anim !== Anim.Parado || (this.emoteAtual.t += dt) > 3)) this.emoteAtual = null;
    this.fase += dt * (anim === Anim.Correndo ? 11 : 7.5) * (vel > 0.1 ? Math.min(1.4, 0.5 + vel / 6) : 1);
    const s = Math.sin(this.fase);
    const alvo = { pE: 0, pD: 0, bE: 0, bD: 0, bEz: 0, bDz: 0, y: 0, inc: 0, cab: 0 };

    if (this.emoteAtual) {
      const t = this.emoteAtual.t;
      if (this.emoteAtual.e === 'acenar') {
        alvo.bDz = 2.6;
        alvo.bD = Math.sin(t * 12) * 0.35;
      } else if (this.emoteAtual.e === 'dancar') {
        alvo.y = Math.abs(Math.sin(t * 8)) * 0.12;
        alvo.bEz = -1.2 - Math.sin(t * 8) * 0.8;
        alvo.bDz = 1.2 + Math.sin(t * 8) * 0.8;
        alvo.pE = Math.sin(t * 8) * 0.4;
        alvo.pD = -Math.sin(t * 8) * 0.4;
        alvo.cab = Math.sin(t * 4) * 0.25;
      } else if (this.emoteAtual.e === 'comemorar') {
        alvo.y = Math.abs(Math.sin(t * 7)) * 0.35;
        alvo.bEz = -2.8;
        alvo.bDz = 2.8;
      } else {
        alvo.bD = -1.5;
        alvo.bDz = 0.2;
      }
    } else if (anim === Anim.NoAr) {
      alvo.pE = -0.6;
      alvo.pD = 0.3;
      alvo.bEz = -0.9;
      alvo.bDz = 0.9;
    } else if (anim === Anim.Andando || anim === Anim.Correndo) {
      const amp = anim === Anim.Correndo ? 0.9 : 0.6;
      alvo.pE = s * amp;
      alvo.pD = -s * amp;
      alvo.bE = -s * amp;
      alvo.bD = s * amp;
      alvo.y = Math.abs(Math.cos(this.fase)) * (anim === Anim.Correndo ? 0.08 : 0.04);
      alvo.inc = anim === Anim.Correndo ? 0.18 : 0.05;
    } else {
      // Parado: respiração.
      alvo.y = Math.sin(this.fase * 0.3) * 0.01;
      alvo.bEz = -0.06;
      alvo.bDz = 0.06;
    }

    const k = 1 - Math.exp(-dt * 14);
    const ir = (atual: number, para: number): number => atual + (para - atual) * k;
    this.pernaE.rotation.x = ir(this.pernaE.rotation.x, alvo.pE);
    this.pernaD.rotation.x = ir(this.pernaD.rotation.x, alvo.pD);
    this.bracoE.rotation.x = ir(this.bracoE.rotation.x, alvo.bE);
    this.bracoD.rotation.x = ir(this.bracoD.rotation.x, alvo.bD);
    this.bracoE.rotation.z = ir(this.bracoE.rotation.z, alvo.bEz);
    this.bracoD.rotation.z = ir(this.bracoD.rotation.z, alvo.bDz);
    this.corpo.position.y = ir(this.corpo.position.y, alvo.y);
    this.corpo.rotation.x = ir(this.corpo.rotation.x, alvo.inc);
    this.cabeca.rotation.y = ir(this.cabeca.rotation.y, alvo.cab);
  }

  remover(): void {
    this.grupo.removeFromParent();
    this.grupo.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
      if (o instanceof THREE.Sprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
  }
}
