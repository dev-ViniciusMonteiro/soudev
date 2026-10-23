// Peças da loja feitas em código (low-poly): chapéus novos, acessórios nas costas, roupas e pets.
// Cada função devolve um grupo pronto para pendurar no boneco; as animações ficam no Boneco.

import * as THREE from 'three';

const mat = (cor: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7, flatShading: true, ...extra });
const ouro = (): THREE.MeshStandardMaterial => mat('#facc15', { metalness: 0.85, roughness: 0.25, emissive: '#78350f', emissiveIntensity: 0.25 });

function caixa(l: number, a: number, p: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** Chapéus da loja (coordenadas da cabeça: topo em y≈0.42). */
export function chapeuLoja(tipo: string): THREE.Group | null {
  const g = new THREE.Group();
  if (tipo === 'coroa-ouro' || tipo === 'coroa-diamante') {
    const diamante = tipo === 'coroa-diamante';
    const m = diamante ? mat('#67e8f9', { metalness: 0.3, roughness: 0.05, emissive: '#0e7490', emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }) : ouro();
    g.add(caixa(0.46, 0.12, 0.44, m, 0, 0.48));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.05, diamante ? 0.22 : 0.16, 4), m);
      ponta.position.set(Math.sin(a) * 0.2, 0.62, Math.cos(a) * 0.19);
      ponta.castShadow = true;
      g.add(ponta);
    }
    const pedra = caixa(0.07, 0.07, 0.03, mat(diamante ? '#f0abfc' : '#dc2626', { emissive: diamante ? '#a21caf' : '#7f1d1d', emissiveIntensity: 0.6 }), 0, 0.48, 0.225);
    g.add(pedra);
    return g;
  }
  if (tipo === 'chifres') {
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), mat('#b91c1c'));
      c.position.set(s * 0.14, 0.55, 0.04);
      c.rotation.z = -s * 0.35;
      c.castShadow = true;
      g.add(c);
    }
    return g;
  }
  if (tipo === 'aureola') {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 20), mat('#fde047', { emissive: '#facc15', emissiveIntensity: 1 }));
    anel.rotation.x = Math.PI / 2;
    anel.position.y = 0.7;
    anel.name = 'aureola';
    g.add(anel);
    return g;
  }
  if (tipo === 'tiara') {
    g.add(caixa(0.44, 0.04, 0.05, ouro(), 0, 0.46, 0.12), caixa(0.07, 0.07, 0.03, mat('#ec4899', { emissive: '#9d174d', emissiveIntensity: 0.6 }), 0, 0.51, 0.15));
    return g;
  }
  return null;
}

/** Acessórios nas costas (coordenadas do corpo: tronco entre y 0.85 e 1.47, costas em z≈-0.14). */
export function acessorio(tipo: string, cor: string): THREE.Group | null {
  const g = new THREE.Group();
  g.name = tipo;
  if (tipo === 'mochila') {
    g.add(caixa(0.4, 0.45, 0.18, mat('#b45309'), 0, 1.15, -0.24), caixa(0.3, 0.15, 0.06, mat('#92400e'), 0, 1.02, -0.35));
    return g;
  }
  if (tipo === 'capa') {
    // Pendurada nos ombros: o pivô fica em cima para balançar com a corrida.
    const capa = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.9, 0.03), mat('#b91c1c'));
    capa.geometry.translate(0, -0.45, 0);
    capa.position.set(0, 1.45, -0.17);
    capa.name = 'capa';
    capa.castShadow = true;
    g.add(capa);
    return g;
  }
  if (tipo === 'guitarra') {
    const corpoG = new THREE.Group();
    corpoG.add(caixa(0.32, 0.38, 0.08, mat('#dc2626'), 0, 0, 0), caixa(0.08, 0.55, 0.05, mat('#3f2a1d'), 0, 0.45, 0), caixa(0.12, 0.1, 0.05, mat('#18181b'), 0, 0.76, 0));
    corpoG.position.set(0, 1.1, -0.22);
    corpoG.rotation.z = 0.6;
    g.add(corpoG);
    return g;
  }
  if (tipo === 'asas') {
    for (const s of [-1, 1]) {
      const asa = new THREE.Group();
      asa.name = s < 0 ? 'asaE' : 'asaD';
      const pena = mat('#f8fafc', { emissive: '#cbd5e1', emissiveIntensity: 0.2 });
      for (let i = 0; i < 3; i++) asa.add(caixa(0.5 - i * 0.1, 0.12, 0.03, pena, s * (0.25 - i * 0.03), 0.12 - i * 0.12, 0));
      asa.position.set(s * 0.12, 1.3, -0.17);
      asa.rotation.y = s * 0.5;
      g.add(asa);
    }
    return g;
  }
  void cor;
  return null;
}

/** Roupas por cima do tronco e dos braços (o boneco já tem camiseta e calça das cores escolhidas). */
export function roupa(tipo: string, cor: string): THREE.Group | null {
  const g = new THREE.Group();
  if (tipo === 'jaqueta') {
    const m = mat(new THREE.Color(cor).multiplyScalar(0.55).getStyle());
    // Duas metades abertas na frente mostrando a camiseta.
    g.add(caixa(0.2, 0.64, 0.3, m, -0.17, 1.16, 0), caixa(0.2, 0.64, 0.3, m, 0.17, 1.16, 0), caixa(0.56, 0.64, 0.05, m, 0, 1.16, -0.14), caixa(0.5, 0.08, 0.32, m, 0, 1.47, 0));
    return g;
  }
  if (tipo === 'moletom') {
    const m = mat('#6b7280');
    g.add(caixa(0.55, 0.65, 0.31, m, 0, 1.16, 0), caixa(0.3, 0.14, 0.04, mat('#4b5563'), 0, 1.0, 0.16), caixa(0.44, 0.3, 0.12, m, 0, 1.6, -0.22));
    return g;
  }
  if (tipo === 'terno') {
    const preto = mat('#111827');
    g.add(caixa(0.55, 0.65, 0.31, preto, 0, 1.16, 0), caixa(0.14, 0.6, 0.02, mat('#f8fafc'), 0, 1.18, 0.16), caixa(0.07, 0.38, 0.025, mat('#b91c1c'), 0, 1.22, 0.175));
    return g;
  }
  if (tipo === 'esqueleto') {
    const preto = mat('#0a0a0a');
    const osso = mat('#f5f5f4', { emissive: '#d6d3d1', emissiveIntensity: 0.25 });
    g.add(caixa(0.55, 0.65, 0.31, preto, 0, 1.16, 0), caixa(0.05, 0.55, 0.02, osso, 0, 1.17, 0.16));
    for (let i = 0; i < 4; i++) g.add(caixa(0.36 - i * 0.03, 0.04, 0.02, osso, 0, 1.38 - i * 0.12, 0.165));
    return g;
  }
  return null;
}

/** Pet que anda junto (do lado do dono). */
export function pet(tipo: string): THREE.Group | null {
  if (tipo !== 'cachorro' && tipo !== 'gato') return null;
  const g = new THREE.Group();
  g.name = 'pet';
  const gato = tipo === 'gato';
  const pelo = mat(gato ? '#f97316' : '#a16207');
  const corpo = caixa(0.22, 0.2, 0.42, pelo, 0, 0.3, 0);
  const cabeca = caixa(0.2, 0.2, 0.2, pelo, 0, 0.45, 0.25);
  const focinho = caixa(0.1, 0.08, 0.08, mat(gato ? '#fed7aa' : '#713f12'), 0, 0.42, 0.37);
  const olhos = caixa(0.14, 0.03, 0.02, mat('#111827'), 0, 0.5, 0.355);
  for (const [x, z] of [
    [-0.08, 0.14],
    [0.08, 0.14],
    [-0.08, -0.14],
    [0.08, -0.14],
  ])
    g.add(caixa(0.06, 0.2, 0.06, pelo, x, 0.1, z));
  // Orelhas: pontudas no gato, caídas no cachorro.
  for (const s of [-1, 1]) {
    const orelha = gato ? new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 4), pelo) : caixa(0.05, 0.12, 0.08, mat('#713f12'));
    orelha.position.set(s * 0.07, gato ? 0.59 : 0.47, 0.24);
    if (!gato) orelha.position.x = s * 0.12;
    orelha.castShadow = true;
    g.add(orelha);
  }
  const rabo = caixa(0.04, 0.04, 0.22, pelo, 0, gato ? 0.45 : 0.38, -0.28);
  rabo.rotation.x = gato ? -0.9 : -0.5;
  rabo.name = 'rabo';
  g.add(corpo, cabeca, focinho, olhos, rabo);
  g.position.set(0.75, 0, -0.5);
  return g;
}
