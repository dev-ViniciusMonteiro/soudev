import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import mapa from './mapa.json'

// Mapa do Escape The Police montado a partir da cena original (scripts/converter.mjs):
// chão, muros e obstáculos são caixas; prédios, rochas e plantas são os modelos do RPG Poly Pack.
// Também cuida das colisões (caixas alinhadas aos eixos), da linha de visão e do caminho dos policiais.

export const CHAO = -5
export const LIMITE = 123 // metade da arena, por dentro dos muros

export interface Caixa { min: THREE.Vector3; max: THREE.Vector3 }
export const caixas: Caixa[] = []

type Mapa = {
  caixas: { nome: string; tipo: string; centro: number[]; tamanho: number[] }[]
  objetos: { modelo: string; pos: number[]; rot: number[]; esc: number[] }[]
  jogador: number[]; policia: number[]
}
const M = mapa as Mapa
export const nascerJogador = new THREE.Vector3(M.jogador[0], CHAO, M.jogador[2])
export const nascerPolicia = new THREE.Vector3(M.policia[0], CHAO, M.policia[2])

const texturas = new THREE.TextureLoader()
function textura(arq: string, rx = 1, ry = 1, pixel = false) {
  const t = texturas.load(arq)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false }
  t.anisotropy = 4
  return t
}

// O que bloqueia o caminho: prédios, rochas, tronco e o tronco das árvores. Plantas e arbustos não.
const SOLIDO: Record<string, number> = { rpgpp_lt_building_01: 1, rpgpp_lt_building_03: 1, rpgpp_lt_building_04: 1, rpgpp_lt_building_05: 1, rpgpp_lt_rock_03: 1, rpgpp_lt_log_wood_01: 1, rpgpp_lt_tree_02: 0.22 }

export async function montarMundo(cena: THREE.Scene, sombras: boolean, aoProgresso: (p: number) => void) {
  // céu (skybox original)
  const ceu = new THREE.CubeTextureLoader().setPath('texturas/').load(['ceu-right.jpg', 'ceu-left.jpg', 'ceu-top.jpg', 'ceu-bottom.jpg', 'ceu-front.jpg', 'ceu-back.jpg'])
  ceu.colorSpace = THREE.SRGBColorSpace
  cena.background = ceu
  cena.fog = new THREE.Fog(0x9fb3c8, 90, 330)

  // chão com a textura FloorCells repetida 20 x 13 (como no material do Unity)
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), new THREE.MeshLambertMaterial({ map: textura('texturas/chao.jpg', 20, 13) }))
  chao.rotation.x = -Math.PI / 2
  chao.position.y = CHAO
  chao.receiveShadow = sombras
  chao.matrixAutoUpdate = false; chao.updateMatrix()
  cena.add(chao)

  // muros e obstáculos com WallBricks (10 x 2)
  const tijolo = textura('texturas/parede.jpg', 10, 2)
  const matMuro = new THREE.MeshLambertMaterial({ map: tijolo })
  for (const c of M.caixas) {
    const [cx, cy, cz] = c.centro, [sx, sy, sz] = c.tamanho
    if (c.tipo === 'chao') continue
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), matMuro)
    m.position.set(cx, cy, cz)
    m.castShadow = sombras; m.receiveShadow = sombras
    m.matrixAutoUpdate = false; m.updateMatrix()
    cena.add(m)
    caixas.push({ min: new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2), max: new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2) })
  }

  // modelos (cada um baixado uma vez e repetido)
  const paleta = textura('texturas/rpgpp.png', 1, 1, true)
  paleta.wrapS = paleta.wrapT = THREE.ClampToEdgeWrapping
  const matProp = new THREE.MeshLambertMaterial({ map: paleta })
  const loader = new GLTFLoader()
  const nomes = [...new Set(M.objetos.map((o) => o.modelo))]
  const geometrias: Record<string, THREE.BufferGeometry> = {}
  let feitos = 0
  await Promise.all(nomes.map(async (n) => {
    const g = await loader.loadAsync(`modelos/${n}.glb`)
    const partes: THREE.BufferGeometry[] = []
    g.scene.updateMatrixWorld(true)
    g.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { const geo = (o as THREE.Mesh).geometry.clone(); geo.applyMatrix4(o.matrixWorld); partes.push(geo) } })
    geometrias[n] = partes[0]
    aoProgresso(++feitos / nomes.length)
  }))
  for (const o of M.objetos) {
    const geo = geometrias[o.modelo]
    if (!geo) continue
    const m = new THREE.Mesh(geo, matProp)
    m.position.set(o.pos[0], o.pos[1], o.pos[2])
    m.quaternion.set(o.rot[0], o.rot[1], o.rot[2], o.rot[3])
    m.scale.set(o.esc[0], o.esc[1], o.esc[2])
    m.castShadow = sombras; m.receiveShadow = sombras
    m.matrixAutoUpdate = false; m.updateMatrix()
    cena.add(m)
    const fator = SOLIDO[o.modelo]
    if (fator) {
      const b = new THREE.Box3().setFromObject(m)
      if (fator < 1) { // árvore: só o tronco segura
        const c = b.getCenter(new THREE.Vector3()), t = b.getSize(new THREE.Vector3())
        b.min.x = c.x - (t.x * fator) / 2; b.max.x = c.x + (t.x * fator) / 2
        b.min.z = c.z - (t.z * fator) / 2; b.max.z = c.z + (t.z * fator) / 2
      }
      caixas.push({ min: b.min.clone(), max: b.max.clone() })
    }
  }
  montarGrade()
}

/* ---------------- colisão ---------------- */

/** Empurra um círculo (pés em y, altura h) para fora das caixas. Devolve a altura do chão sob ele. */
export function resolverCirculo(p: THREE.Vector3, raio: number, altura: number): number {
  let chao = CHAO
  for (const c of caixas) {
    if (p.y + altura <= c.min.y || p.y >= c.max.y + 0.01) {
      // está em cima? (pés acima do topo): conta como chão se estiver dentro na horizontal
      if (p.y >= c.max.y - 0.01 && p.x > c.min.x - raio * 0.5 && p.x < c.max.x + raio * 0.5 && p.z > c.min.z - raio * 0.5 && p.z < c.max.z + raio * 0.5) chao = Math.max(chao, c.max.y)
      continue
    }
    // degrau baixo: sobe em cima
    if (c.max.y - p.y <= 0.45 && p.x > c.min.x - raio && p.x < c.max.x + raio && p.z > c.min.z - raio && p.z < c.max.z + raio) { chao = Math.max(chao, c.max.y); continue }
    const qx = Math.max(c.min.x, Math.min(p.x, c.max.x)), qz = Math.max(c.min.z, Math.min(p.z, c.max.z))
    let dx = p.x - qx, dz = p.z - qz
    const d2 = dx * dx + dz * dz
    if (d2 >= raio * raio) continue
    if (d2 > 1e-8) { const d = Math.sqrt(d2), em = raio - d; p.x += (dx / d) * em; p.z += (dz / d) * em; continue }
    // centro dentro da caixa: sai pelo lado mais perto
    const opcoes = [[c.min.x - raio - p.x, 0], [c.max.x + raio - p.x, 0], [0, c.min.z - raio - p.z], [0, c.max.z + raio - p.z]]
    opcoes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))
    dx = opcoes[0][0]; dz = opcoes[0][1]; p.x += dx; p.z += dz
  }
  p.x = Math.max(-LIMITE + raio, Math.min(LIMITE - raio, p.x))
  p.z = Math.max(-LIMITE + raio, Math.min(LIMITE - raio, p.z))
  return chao
}

const _inv = new THREE.Vector3()
/** Distância até a primeira caixa no raio (ou Infinity). */
export function raioNasCaixas(origem: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number {
  _inv.set(1 / dir.x, 1 / dir.y, 1 / dir.z)
  let melhor = Infinity
  // chão
  if (dir.y < 0) { const t = (CHAO - origem.y) / dir.y; if (t >= 0 && t < melhor) melhor = t }
  for (const c of caixas) {
    let t1 = (c.min.x - origem.x) * _inv.x, t2 = (c.max.x - origem.x) * _inv.x
    let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2)
    t1 = (c.min.y - origem.y) * _inv.y; t2 = (c.max.y - origem.y) * _inv.y
    tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2))
    t1 = (c.min.z - origem.z) * _inv.z; t2 = (c.max.z - origem.z) * _inv.z
    tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2))
    if (tmax >= Math.max(0, tmin) && tmin < melhor) melhor = Math.max(0, tmin)
  }
  return melhor <= maxDist ? melhor : Infinity
}

const _d = new THREE.Vector3()
export function enxerga(a: THREE.Vector3, b: THREE.Vector3): boolean {
  _d.subVectors(b, a)
  const dist = _d.length()
  _d.divideScalar(dist)
  return raioNasCaixas(a, _d, dist) === Infinity
}

/* ---------------- caminho dos policiais (A* numa grade de 2 m) ---------------- */

const CEL = 2
const N = Math.ceil((LIMITE * 2) / CEL)
const bloqueado = new Uint8Array(N * N)
const celDe = (v: number) => Math.max(0, Math.min(N - 1, Math.floor((v + LIMITE) / CEL)))
const centroDe = (i: number) => -LIMITE + i * CEL + CEL / 2

function montarGrade() {
  const folga = 1.1
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = centroDe(i), z = centroDe(j)
    if (Math.abs(x) > LIMITE - 1.5 || Math.abs(z) > LIMITE - 1.5) { bloqueado[i * N + j] = 1; continue }
    for (const c of caixas) {
      if (c.max.y < CHAO + 0.6) continue
      if (x > c.min.x - folga && x < c.max.x + folga && z > c.min.z - folga && z < c.max.z + folga) { bloqueado[i * N + j] = 1; break }
    }
  }
}

export function pontoLivreAleatorio(): THREE.Vector3 {
  for (;;) {
    const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N)
    if (!bloqueado[i * N + j]) return new THREE.Vector3(centroDe(i), CHAO, centroDe(j))
  }
}

function livreMaisPerto(i: number, j: number): [number, number] {
  if (!bloqueado[i * N + j]) return [i, j]
  for (let r = 1; r < 8; r++) for (let a = -r; a <= r; a++) for (const [ii, jj] of [[i + a, j - r], [i + a, j + r], [i - r, j + a], [i + r, j + a]]) {
    if (ii >= 0 && jj >= 0 && ii < N && jj < N && !bloqueado[ii * N + jj]) return [ii, jj]
  }
  return [i, j]
}

const custo = new Float32Array(N * N)
const veioDe = new Int32Array(N * N)
const fechado = new Uint8Array(N * N)
/** Caminho de a até b (lista de pontos), já simplificado pela linha de visão. */
export function caminho(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
  const [ai, aj] = livreMaisPerto(celDe(a.x), celDe(a.z))
  const [bi, bj] = livreMaisPerto(celDe(b.x), celDe(b.z))
  const ini = ai * N + aj, fim = bi * N + bj
  custo.fill(Infinity); fechado.fill(0); veioDe.fill(-1)
  custo[ini] = 0
  const fila: [number, number][] = [[0, ini]] // heap binário simples
  const h = (k: number) => { const di = Math.abs(Math.floor(k / N) - bi), dj = Math.abs((k % N) - bj); return Math.max(di, dj) + 0.414 * Math.min(di, dj) }
  const push = (f: number, k: number) => { fila.push([f, k]); let i = fila.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (fila[p][0] <= fila[i][0]) break; [fila[p], fila[i]] = [fila[i], fila[p]]; i = p } }
  const pop = () => { const top = fila[0], ult = fila.pop() as [number, number]; if (fila.length) { fila[0] = ult; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < fila.length && fila[l][0] < fila[m][0]) m = l; if (r < fila.length && fila[r][0] < fila[m][0]) m = r; if (m === i) break; [fila[m], fila[i]] = [fila[i], fila[m]]; i = m } } return top }
  let passos = 0
  while (fila.length && passos++ < 20000) {
    const [, k] = pop()
    if (fechado[k]) continue
    fechado[k] = 1
    if (k === fim) break
    const ki = Math.floor(k / N), kj = k % N
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue
      const ni = ki + di, nj = kj + dj
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue
      const nk = ni * N + nj
      if (bloqueado[nk] || fechado[nk]) continue
      if (di && dj && (bloqueado[ki * N + nj] || bloqueado[ni * N + kj])) continue // não corta quina
      const c = custo[k] + (di && dj ? 1.414 : 1)
      if (c < custo[nk]) { custo[nk] = c; veioDe[nk] = k; push(c + h(nk), nk) }
    }
  }
  if (veioDe[fim] < 0 && fim !== ini) return [b.clone()]
  const pts: THREE.Vector3[] = []
  for (let k = fim; k !== ini && k >= 0; k = veioDe[k]) pts.push(new THREE.Vector3(centroDe(Math.floor(k / N)), CHAO, centroDe(k % N)))
  pts.reverse()
  pts[pts.length - 1] = b.clone().setY(CHAO)
  // corta pontos intermediários quando dá para ir em linha reta
  const olho = (v: THREE.Vector3) => v.clone().setY(CHAO + 1)
  const simples: THREE.Vector3[] = []
  let atual = a.clone()
  let i = 0
  while (i < pts.length) {
    let j = pts.length - 1
    while (j > i && !enxerga(olho(atual), olho(pts[j]))) j--
    simples.push(pts[j]); atual = pts[j]; i = j + 1
  }
  return simples
}
