// Prédios dos jogos espalhados pela cidade (lista em PREDIOS, no protocolo). Dá para entrar: paredes com uma porta
// virada para a avenida, chão, teto (some quando você está lá dentro), placa na fachada e um ícone grande
// flutuando em cima, que dá para ver de longe. Dentro, a decoração de cada jogo; no Cassino, as mesas e máquinas.

import * as THREE from 'three';
import type { Caixa } from './mundo';
import { MESAS, PREDIOS, type Predio, ROLETA, SLOTS, SIMBOLOS_SLOT, dentroDoPredio } from './protocolo';

const ALTURA = 4.5;
const PORTA = 2; // meia-largura do vão da porta
const ESPESSURA = 0.2; // meia-espessura da parede

const COR_PAREDE: Record<string, string> = { cassino: '#fef3c7', arena: '#9ca3af', autodromo: '#e5e7eb', casa: '#4c1d95', ginasio: '#fde68a', castelo: '#a8a29e', retro: '#f5f5f4' };
const COR_CHAO: Record<string, string> = { cassino: '#7f1d1d', arena: '#57534e', autodromo: '#374151', casa: '#1e1b4b', ginasio: '#d97706', castelo: '#78716c', retro: '#cbd5e1' };

const mat = (cor: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: cor, flatShading: true, ...extra });

function caixa(g: THREE.Object3D, l: number, a: number, p: number, m: THREE.Material, x: number, y: number, z: number, sombra = true): THREE.Mesh {
  const b = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), m);
  b.position.set(x, y, z);
  b.castShadow = sombra;
  b.receiveShadow = true;
  g.add(b);
  return b;
}

/** Textura com texto (placas e telas). */
function textura(larg: number, alt: number, desenhar: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = larg;
  c.height = alt;
  desenhar(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Ícone redondo que flutua em cima do prédio (aparece de longe, sem neblina). */
export function iconeFlutuante(icone: string, cor: string, tam = 3.2): THREE.Sprite {
  const tex = textura(256, 256, (g) => {
    g.fillStyle = cor;
    g.beginPath();
    g.arc(128, 128, 118, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#fff';
    g.stroke();
    g.font = '150px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(icone, 128, 140);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, transparent: true }));
  s.scale.set(tam, tam, 1);
  return s;
}

/** Mesa de cartas redonda com feltro verde, cadeiras em volta e placa em cima. */
function mesaCartas(titulo: string, lugares: number, raio = 1.5): THREE.Group {
  const g = new THREE.Group();
  const madeira = mat('#78350f');
  const tampo = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, 0.12, 24), madeira);
  tampo.position.y = 0.95;
  const feltro = new THREE.Mesh(new THREE.CylinderGeometry(raio - 0.15, raio - 0.15, 0.02, 24), new THREE.MeshStandardMaterial({ color: '#166534', roughness: 1 }));
  feltro.position.y = 1.02;
  const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 0.95, 8), madeira);
  pe.position.y = 0.47;
  for (const m of [tampo, feltro, pe]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  const estofado = mat('#7f1d1d');
  for (let i = 0; i < lugares; i++) {
    const a = (i / lugares) * Math.PI * 2;
    caixa(g, 0.5, 0.5, 0.5, estofado, Math.sin(a) * (raio + 0.6), 0.25, Math.cos(a) * (raio + 0.6));
  }
  const placa = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textura(256, 96, (x) => {
        x.fillStyle = 'rgba(20,83,45,0.9)';
        x.fillRect(0, 0, 256, 96);
        x.fillStyle = '#fde68a';
        x.font = '900 46px system-ui, sans-serif';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(titulo, 128, 52);
      }),
    }),
  );
  placa.scale.set(2.4, 0.9, 1);
  placa.position.y = 2.7;
  g.add(placa);
  return g;
}

/** Mesa da roleta: tampo verde com a roda numa ponta (a roda gira). */
function mesaRoleta(): { g: THREE.Group; roda: THREE.Object3D } {
  const g = new THREE.Group();
  caixa(g, 3.4, 0.9, 1.9, mat('#78350f'), 0, 0.45, 0);
  const pano = textura(512, 256, (x) => {
    x.fillStyle = '#166534';
    x.fillRect(0, 0, 512, 256);
    // Grade dos números (3 linhas x 12 colunas).
    for (let n = 1; n <= 36; n++) {
      const col = Math.floor((n - 1) / 3);
      const lin = 2 - ((n - 1) % 3);
      x.fillStyle = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n) ? '#b91c1c' : '#111827';
      x.fillRect(40 + col * 38, 30 + lin * 52, 36, 50);
      x.fillStyle = '#fff';
      x.font = 'bold 20px sans-serif';
      x.textAlign = 'center';
      x.fillText(String(n), 58 + col * 38, 62 + lin * 52);
    }
    x.fillStyle = '#15803d';
    x.fillRect(4, 30, 34, 154);
    x.fillStyle = '#fff';
    x.fillText('0', 21, 112);
  });
  const tampo = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.8), new THREE.MeshStandardMaterial({ map: pano, roughness: 1 }));
  tampo.rotation.x = -Math.PI / 2;
  tampo.position.y = 0.91;
  g.add(tampo);
  // Roda: 37 casas coloridas desenhadas numa textura redonda.
  const ordem = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const texRoda = textura(512, 512, (x) => {
    x.translate(256, 256);
    ordem.forEach((n, i) => {
      const a0 = (i / 37) * Math.PI * 2;
      const a1 = ((i + 1) / 37) * Math.PI * 2;
      x.fillStyle = n === 0 ? '#15803d' : [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n) ? '#b91c1c' : '#111827';
      x.beginPath();
      x.moveTo(0, 0);
      x.arc(0, 0, 250, a0, a1);
      x.fill();
    });
    x.fillStyle = '#a16207';
    x.beginPath();
    x.arc(0, 0, 120, 0, Math.PI * 2);
    x.fill();
  });
  const roda = new THREE.Group();
  const prato = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 37), [mat('#78350f'), new THREE.MeshStandardMaterial({ map: texRoda }), mat('#78350f')]);
  const eixo = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), mat('#facc15', { metalness: 0.8, roughness: 0.3 }));
  eixo.position.y = 0.18;
  roda.add(prato, eixo);
  roda.position.set(1.1, 1.0, 0);
  g.add(roda);
  const borda = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 6, 37), mat('#451a03'));
  borda.rotation.x = Math.PI / 2;
  borda.position.set(1.1, 1.0, 0);
  g.add(borda);
  return { g, roda };
}

/** Caça-níquel: gabinete colorido, tela com os rolos, luz em cima e alavanca. Olha para -x. */
function maquinaSlot(cor: string, i: number): THREE.Group {
  const g = new THREE.Group();
  caixa(g, 0.8, 1.9, 1, mat(cor, { metalness: 0.3, roughness: 0.5 }), 0, 0.95, 0);
  caixa(g, 0.82, 0.25, 1.02, new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#facc15', emissiveIntensity: 0.9 }), 0, 2.0, 0, false);
  const tela = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.45),
    new THREE.MeshBasicMaterial({
      map: textura(256, 144, (x) => {
        x.fillStyle = '#fff7ed';
        x.fillRect(0, 0, 256, 144);
        x.font = '62px system-ui, sans-serif';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        for (let k = 0; k < 3; k++) x.fillText(SIMBOLOS_SLOT[(i + k * 2) % SIMBOLOS_SLOT.length], 44 + k * 84, 78);
      }),
    }),
  );
  tela.rotation.y = -Math.PI / 2;
  tela.position.set(-0.51, 1.35, 0);
  g.add(tela);
  caixa(g, 0.3, 0.08, 0.9, mat('#1f2937'), -0.45, 0.95, 0); // apoio
  const alavanca = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), mat('#d4d4d8', { metalness: 0.8 }));
  alavanca.position.set(0, 1.5, 0.58);
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat('#dc2626'));
  bola.position.set(0, 1.82, 0.58);
  g.add(alavanca, bola);
  return g;
}

/** Decoração de dentro de cada prédio (coordenadas do mundo). */
function decorar(p: Predio, g: THREE.Group, colisao: Caixa[]): { roda?: THREE.Object3D } {
  const solido = (x: number, z: number, mx: number, mz: number) => colisao.push({ x, z, mx, mz });
  switch (p.id) {
    case 'cassino': {
      for (const [tipo, titulo, lugares, raio] of [
        ['21', '🃏 21', 5, 1.5],
        ['truco', '🂡 Truco', 4, 1.5],
        ['poker', '♠ Poker', 6, 1.8],
      ] as const) {
        const m = mesaCartas(titulo, lugares, raio);
        m.position.set(MESAS[tipo][0], 0, MESAS[tipo][1]);
        g.add(m);
        solido(MESAS[tipo][0], MESAS[tipo][1], raio, raio);
      }
      const { g: roleta, roda } = mesaRoleta();
      roleta.position.set(ROLETA[0], 0, ROLETA[1]);
      g.add(roleta);
      solido(ROLETA[0], ROLETA[1], 1.7, 1);
      const cores = ['#dc2626', '#7c3aed', '#0891b2', '#16a34a', '#ea580c'];
      SLOTS.forEach(([x, z], i) => {
        const m = maquinaSlot(cores[i % cores.length], i);
        m.position.set(x + 0.3, 0, z);
        g.add(m);
        solido(x + 0.3, z, 0.4, 0.5);
      });
      // Tapete vermelho da porta até o meio.
      const tapete = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4), new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 1 }));
      tapete.rotation.x = -Math.PI / 2;
      tapete.position.set(p.x - p.larg / 2 + 5, 0.03, p.z);
      g.add(tapete);
      return { roda };
    }
    case 'arena': {
      // Caixotes e um alvo na parede do fundo.
      const madeira = mat('#a16207');
      for (const [dx, dz] of [
        [-6, -4],
        [-6, 4],
        [-2, -4.5],
      ]) {
        caixa(g, 1.4, 1.4, 1.4, madeira, p.x + dx, 0.7, p.z + dz);
        solido(p.x + dx, p.z + dz, 0.7, 0.7);
      }
      const alvo = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 32),
        new THREE.MeshBasicMaterial({
          map: textura(256, 256, (x) => {
            for (let r = 5; r > 0; r--) {
              x.fillStyle = r % 2 ? '#dc2626' : '#fff';
              x.beginPath();
              x.arc(128, 128, r * 25, 0, Math.PI * 2);
              x.fill();
            }
          }),
        }),
      );
      alvo.rotation.y = Math.PI / 2;
      alvo.position.set(p.x - p.larg / 2 + 0.25, 2.2, p.z);
      g.add(alvo);
      return {};
    }
    case 'autodromo': {
      // Pilhas de pneus e bandeira quadriculada no chão.
      const pneu = mat('#111827');
      for (const [dx, dz] of [
        [-4.5, -8],
        [4.5, -8],
        [-4.5, 0],
      ])
        for (let k = 0; k < 3; k++) {
          const t = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.18, 6, 12), pneu);
          t.rotation.x = Math.PI / 2;
          t.position.set(p.x + dx, 0.2 + k * 0.36, p.z + dz);
          t.castShadow = true;
          g.add(t);
        }
      for (const [dx, dz] of [
        [-4.5, -8],
        [4.5, -8],
        [-4.5, 0],
      ])
        solido(p.x + dx, p.z + dz, 0.6, 0.6);
      const xadrez = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 2),
        new THREE.MeshStandardMaterial({
          map: textura(256, 64, (x) => {
            for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
              x.fillStyle = (i + j) % 2 ? '#111' : '#fff';
              x.fillRect(i * 16, j * 16, 16, 16);
            }
          }),
        }),
      );
      xadrez.rotation.x = -Math.PI / 2;
      xadrez.position.set(p.x, 0.03, p.z + 6);
      g.add(xadrez);
      return {};
    }
    case 'casa': {
      // Lápides e teias: a casa assombrada é escura por dentro.
      const pedra = mat('#6b7280');
      for (const [dx, dz] of [
        [-4, -6],
        [4, -6],
        [-4, 4],
        [4, 4],
      ]) {
        caixa(g, 0.9, 1.2, 0.25, pedra, p.x + dx, 0.6, p.z + dz);
        solido(p.x + dx, p.z + dz, 0.45, 0.15);
      }
      const luz = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#a855f7' }));
      luz.position.set(p.x, 3.6, p.z);
      g.add(luz);
      return {};
    }
    case 'ginasio': {
      // Linhas da quadra e duas tabelas.
      const linhas = new THREE.Mesh(
        new THREE.PlaneGeometry(p.larg - 2, p.prof - 2),
        new THREE.MeshBasicMaterial({
          transparent: true,
          map: textura(512, 320, (x) => {
            x.strokeStyle = '#fff';
            x.lineWidth = 6;
            x.strokeRect(10, 10, 492, 300);
            x.beginPath();
            x.moveTo(256, 10);
            x.lineTo(256, 310);
            x.stroke();
            x.beginPath();
            x.arc(256, 160, 50, 0, Math.PI * 2);
            x.stroke();
          }),
        }),
      );
      linhas.rotation.x = -Math.PI / 2;
      linhas.position.set(p.x, 0.03, p.z);
      g.add(linhas);
      for (const s of [-1, 1]) {
        caixa(g, 0.15, 3.2, 0.15, mat('#9ca3af'), p.x + s * (p.larg / 2 - 0.6), 1.6, p.z + 4);
        caixa(g, 0.1, 1, 1.6, mat('#fff'), p.x + s * (p.larg / 2 - 0.75), 3.1, p.z + 4);
        solido(p.x + s * (p.larg / 2 - 0.6), p.z + 4, 0.15, 0.15);
      }
      return {};
    }
    case 'castelo': {
      // Tapete vermelho até o trono.
      const tapete = new THREE.Mesh(new THREE.PlaneGeometry(p.larg - 3, 2), new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 1 }));
      tapete.rotation.x = -Math.PI / 2;
      tapete.position.set(p.x, 0.03, p.z);
      g.add(tapete);
      const ouro = mat('#facc15', { metalness: 0.7, roughness: 0.3 });
      const tx = p.x + p.larg / 2 - 1.5;
      caixa(g, 1, 0.6, 1.2, ouro, tx, 0.3, p.z);
      caixa(g, 0.25, 2, 1.2, ouro, tx + 0.45, 1.3, p.z);
      solido(tx, p.z, 0.6, 0.6);
      return {};
    }
    case 'retro': {
      // Sala de reunião: mesa comprida, quadro branco e post-its.
      caixa(g, 6, 0.1, 2, mat('#e7e5e4'), p.x, 0.85, p.z + 2);
      for (const dx of [-2.6, 2.6]) caixa(g, 0.1, 0.85, 1.8, mat('#57534e'), p.x + dx, 0.42, p.z + 2);
      solido(p.x, p.z + 2, 3, 1);
      const quadro = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 2.4),
        new THREE.MeshBasicMaterial({
          map: textura(600, 240, (x) => {
            x.fillStyle = '#fff';
            x.fillRect(0, 0, 600, 240);
            x.fillStyle = '#1e293b';
            x.font = '800 52px system-ui, sans-serif';
            x.textAlign = 'center';
            x.fillText('SPRINT RETRO', 300, 80);
            const cores = ['#fde047', '#86efac', '#f9a8d4', '#93c5fd'];
            for (let i = 0; i < 8; i++) {
              x.fillStyle = cores[i % 4];
              x.fillRect(40 + i * 68, 120 + (i % 2) * 40, 56, 56);
            }
          }),
        }),
      );
      quadro.position.set(p.x, 2.2, p.z + p.prof / 2 - 0.25);
      quadro.rotation.y = Math.PI;
      g.add(quadro);
      return {};
    }
  }
  return {};
}

interface PredioCena {
  p: Predio;
  teto: THREE.Object3D;
  icone: THREE.Sprite;
}

export class Predios {
  readonly grupo = new THREE.Group();
  readonly lista: PredioCena[] = [];
  /** Roda da roleta do Cassino (gira enquanto a roleta gira). */
  roda: THREE.Object3D | null = null;
  velocidadeRoda = 0.2;
  private destaque: string | null = null;

  constructor(colisao: Caixa[]) {
    for (const p of PREDIOS) this.construir(p, colisao);
  }

  private construir(p: Predio, colisao: Caixa[]): void {
    const g = new THREE.Group();
    const x0 = p.x - p.larg / 2;
    const x1 = p.x + p.larg / 2;
    const z0 = p.z - p.prof / 2;
    const z1 = p.z + p.prof / 2;
    const parede = mat(COR_PAREDE[p.id] ?? '#e7e5e4');
    const faixa = mat(p.cor);
    // Paredes (a da porta em dois pedaços, com uma verga em cima do vão).
    const lados: { lado: Predio['porta']; horizontal: boolean; fixo: number; de: number; ate: number }[] = [
      { lado: 'norte', horizontal: true, fixo: z0, de: x0, ate: x1 },
      { lado: 'sul', horizontal: true, fixo: z1, de: x0, ate: x1 },
      { lado: 'oeste', horizontal: false, fixo: x0, de: z0, ate: z1 },
      { lado: 'leste', horizontal: false, fixo: x1, de: z0, ate: z1 },
    ];
    for (const l of lados) {
      const meio = (l.de + l.ate) / 2;
      const trechos: [number, number][] = l.lado === p.porta ? [[l.de, meio - PORTA], [meio + PORTA, l.ate]] : [[l.de, l.ate]];
      for (const [a, b] of trechos) {
        const c = (a + b) / 2;
        const m = (b - a) / 2 + ESPESSURA;
        const [cx, cz, mx, mz] = l.horizontal ? [c, l.fixo, m, ESPESSURA] : [l.fixo, c, ESPESSURA, m];
        caixa(g, mx * 2, ALTURA, mz * 2, parede, cx, ALTURA / 2, cz);
        caixa(g, mx * 2 + 0.02, 0.5, mz * 2 + 0.02, faixa, cx, ALTURA - 0.25, cz, false); // faixa colorida no alto
        colisao.push({ x: cx, z: cz, mx, mz });
      }
      if (l.lado === p.porta) {
        const [cx, cz, lx, lz] = l.horizontal ? [meio, l.fixo, PORTA * 2, ESPESSURA * 2] : [l.fixo, meio, ESPESSURA * 2, PORTA * 2];
        caixa(g, lx, 1.1, lz, faixa, cx, ALTURA - 0.55, cz);
      }
    }
    // Ameias no castelo.
    if (p.id === 'castelo')
      for (let x = x0; x <= x1; x += 1.6)
        for (const z of [z0, z1]) caixa(g, 0.8, 0.8, 0.5, parede, x, ALTURA + 0.4, z);
    // Chão de dentro.
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(p.larg, p.prof), new THREE.MeshStandardMaterial({ color: COR_CHAO[p.id] ?? '#d6d3d1', roughness: 1 }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.set(p.x, 0.015, p.z);
    chao.receiveShadow = true;
    g.add(chao);
    // Teto (não faz sombra: dentro fica claro).
    const teto = new THREE.Mesh(new THREE.BoxGeometry(p.larg + 0.6, 0.3, p.prof + 0.6), mat(p.id === 'castelo' ? '#78716c' : '#334155'));
    teto.position.set(p.x, ALTURA + 0.15, p.z);
    teto.receiveShadow = true;
    g.add(teto);
    // Placa na fachada, em cima da porta, virada para fora.
    const normal = { norte: [0, -1], sul: [0, 1], oeste: [-1, 0], leste: [1, 0] }[p.porta];
    const placa = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 1.3),
      new THREE.MeshBasicMaterial({
        map: textura(768, 168, (x) => {
          x.fillStyle = '#0f172a';
          x.fillRect(0, 0, 768, 168);
          x.strokeStyle = p.cor;
          x.lineWidth = 12;
          x.strokeRect(6, 6, 756, 156);
          x.fillStyle = '#fff';
          x.font = '900 84px system-ui, sans-serif';
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText(`${p.icone} ${p.nome.toUpperCase()}`, 384, 90, 730);
        }),
      }),
    );
    const meioPortaX = normal[0] ? (normal[0] < 0 ? x0 : x1) : p.x;
    const meioPortaZ = normal[1] ? (normal[1] < 0 ? z0 : z1) : p.z;
    placa.position.set(meioPortaX + normal[0] * (ESPESSURA + 0.05), ALTURA + 1, meioPortaZ + normal[1] * (ESPESSURA + 0.05));
    placa.rotation.y = Math.atan2(normal[0], normal[1]);
    g.add(placa);
    // Ícone flutuando em cima.
    const icone = iconeFlutuante(p.icone, p.cor);
    icone.position.set(p.x, ALTURA + 4, p.z);
    g.add(icone);
    const { roda } = decorar(p, g, colisao);
    if (roda) this.roda = roda;
    this.grupo.add(g);
    this.lista.push({ p, teto, icone });
  }

  /** Em que prédio está esse ponto (ou null). */
  dentro(x: number, z: number): Predio | null {
    return PREDIOS.find((p) => dentroDoPredio(p, x, z, 0)) ?? null;
  }

  /** Ícone do destino (rota no mapa) fica maior. */
  destacar(id: string | null): void {
    this.destaque = id;
  }

  /** A cada quadro: tira o teto de onde você está, balança os ícones e gira a roleta. */
  animar(t: number, dt: number, x: number, z: number): void {
    const aqui = this.dentro(x, z);
    for (const { p, teto, icone } of this.lista) {
      teto.visible = aqui !== p;
      icone.visible = aqui !== p;
      const grande = this.destaque === p.id;
      const tam = grande ? 4.6 + Math.sin(t * 4) * 0.4 : 3.2;
      icone.scale.set(tam, tam, 1);
      icone.position.y = ALTURA + 4 + Math.sin(t * 1.6 + p.x) * 0.3 + (grande ? 1 : 0);
    }
    if (this.roda) this.roda.rotation.y += this.velocidadeRoda * dt;
  }
}
