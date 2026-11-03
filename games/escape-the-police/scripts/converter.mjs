// Converte o build original do Escape The Police (Unity 2021.1) para o jogo web.
// Não roda no build: só quando quiser regerar os dados. Passos:
//   1. Exporte o build com o AssetRipper (https://github.com/AssetRipper/AssetRipper), opção "Export Primary Content".
//   2. node games/escape-the-police/scripts/converter.mjs <pasta exportada>
// Gera public/modelos/*.glb, public/texturas/*, public/sons/* e src/mapa.json.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ORIGEM = path.join(process.argv[2] || '', 'Assets')
if (!process.argv[2] || !fs.existsSync(ORIGEM)) throw new Error('Informe a pasta exportada pelo AssetRipper')
const JOGO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUB = path.join(JOGO, 'public')
for (const d of ['modelos', 'texturas', 'sons']) fs.mkdirSync(path.join(PUB, d), { recursive: true })

/* ---------- leitura do .glb da cena ---------- */
function lerGlb(arq) {
  const b = fs.readFileSync(arq)
  const len = b.readUInt32LE(12)
  return JSON.parse(b.slice(20, 20 + len).toString())
}
const cena = lerGlb(path.join(ORIGEM, 'SceneHierarchyObject', 'level 1.glb'))

// matrizes 4x4 (coluna maior, como no glTF)
const mult = (a, b) => { const r = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let l = 0; l < 4; l++) for (let k = 0; k < 4; k++) r[c * 4 + l] += a[k * 4 + l] * b[c * 4 + k]; return r }
function trs(n) {
  if (n.matrix) return n.matrix
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1]
  const [sx, sy, sz] = n.scale || [1, 1, 1]
  const [tx, ty, tz] = n.translation || [0, 0, 0]
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ]
}
const mundo = new Map()
const pai = new Map()
cena.nodes.forEach((n, i) => (n.children || []).forEach((c) => pai.set(c, i)))
function matrizMundo(i) {
  if (mundo.has(i)) return mundo.get(i)
  const m = pai.has(i) ? mult(matrizMundo(pai.get(i)), trs(cena.nodes[i])) : trs(cena.nodes[i])
  mundo.set(i, m)
  return m
}
const r2 = (v) => Math.round(v * 100) / 100
const r4 = (v) => Math.round(v * 10000) / 10000
const posicao = (m) => [r2(m[12]), r2(m[13]), r2(m[14])]
const escala = (m) => [Math.hypot(m[0], m[1], m[2]), Math.hypot(m[4], m[5], m[6]), Math.hypot(m[8], m[9], m[10])]
function quaternio(m) {
  const [sx, sy, sz] = escala(m)
  const a = [m[0] / sx, m[1] / sx, m[2] / sx, m[4] / sy, m[5] / sy, m[6] / sy, m[8] / sz, m[9] / sz, m[10] / sz]
  const tr = a[0] + a[4] + a[8]
  let x, y, z, w
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); w = 0.25 / s; x = (a[5] - a[7]) * s; y = (a[6] - a[2]) * s; z = (a[1] - a[3]) * s }
  else if (a[0] > a[4] && a[0] > a[8]) { const s = 2 * Math.sqrt(1 + a[0] - a[4] - a[8]); w = (a[5] - a[7]) / s; x = 0.25 * s; y = (a[3] + a[1]) / s; z = (a[6] + a[2]) / s }
  else if (a[4] > a[8]) { const s = 2 * Math.sqrt(1 + a[4] - a[0] - a[8]); w = (a[6] - a[2]) / s; x = (a[3] + a[1]) / s; y = 0.25 * s; z = (a[7] + a[5]) / s }
  else { const s = 2 * Math.sqrt(1 + a[8] - a[0] - a[4]); w = (a[1] - a[3]) / s; x = (a[6] + a[2]) / s; y = (a[7] + a[5]) / s; z = 0.25 * s }
  return [x, y, z, w].map(r4)
}
const indice = (nome) => cena.nodes.findIndex((n) => n.name === nome)

// chão, muros e obstáculos são cubos de 1 unidade escalados
const caixas = []
for (const [nome, tipo] of [['Floor', 'chao'], ['Wall1', 'muro'], ['Wall2', 'muro'], ['Wall3', 'muro'], ['Wall4', 'muro'], ...[1, 2, 3, 4, 5, 6].map((i) => [`Obstacle${i}`, 'obstaculo'])]) {
  const m = matrizMundo(indice(nome))
  // caixa no mundo: os 8 cantos do cubo unitário transformados (Wall3 e Wall4 estão giradas 90°)
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (const cx of [-0.5, 0.5]) for (const cy of [-0.5, 0.5]) for (const cz of [-0.5, 0.5]) {
    const p = [0, 1, 2].map((k) => m[k] * cx + m[4 + k] * cy + m[8 + k] * cz + m[12 + k])
    p.forEach((v, k) => { min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v) })
  }
  caixas.push({ nome, tipo, centro: min.map((v, k) => r2((v + max[k]) / 2)), tamanho: min.map((v, k) => r2(max[k] - v)) })
}
// objetos do RPG Poly Pack (o caminho de terra filho do chão herdava a escala 250x e foi deixado de fora)
const objetos = []
const modelos = new Set()
cena.nodes.forEach((n, i) => {
  if (!/^rpgpp_lt_/.test(n.name || '') || n.mesh === undefined || /terrain_path/.test(n.name)) return
  const modelo = n.name.replace(/ \(\d+\)$/, '')
  // building_03 e building_03 (1) estão no mesmo lugar no original: fica um só
  const m = matrizMundo(i)
  const pos = posicao(m)
  if (objetos.some((o) => o.modelo === modelo && o.pos.every((v, k) => v === pos[k]))) return
  modelos.add(modelo)
  objetos.push({ modelo, pos, rot: quaternio(m), esc: escala(m).map(r4) })
})
const ponto = (nome) => posicao(matrizMundo(indice(nome)))

// Caixas sólidas (muros, obstáculos e os modelos que bloqueiam), usadas pelo jogo e pelo servidor do online
// (backend-soudev/src/etp-mapa.ts) para colisão e linha de tiro. Os limites dos modelos vêm do min/max do POSITION.
const SOLIDO = { rpgpp_lt_building_01: 1, rpgpp_lt_building_03: 1, rpgpp_lt_building_04: 1, rpgpp_lt_building_05: 1, rpgpp_lt_rock_03: 1, rpgpp_lt_log_wood_01: 1, rpgpp_lt_tree_02: 0.22 }
function limitesModelo(nome) {
  const g = lerGlb(path.join(ORIGEM, 'Mesh', `${nome}.glb`))
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  g.nodes.forEach((n, i) => {
    if (n.mesh === undefined) return
    const pais = new Map(); g.nodes.forEach((p, k) => (p.children || []).forEach((c) => pais.set(c, k)))
    let m = trs(n); for (let k = pais.get(i); k !== undefined; k = pais.get(k)) m = mult(trs(g.nodes[k]), m)
    for (const prim of g.meshes[n.mesh].primitives) {
      const a = g.accessors[prim.attributes.POSITION]
      for (const cx of [a.min[0], a.max[0]]) for (const cy of [a.min[1], a.max[1]]) for (const cz of [a.min[2], a.max[2]]) {
        const p = [0, 1, 2].map((k) => m[k] * cx + m[4 + k] * cy + m[8 + k] * cz + m[12 + k])
        p.forEach((v, k) => { min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v) })
      }
    }
  })
  return [min, max]
}
const solidos = caixas.filter((c) => c.tipo !== 'chao').map((c) => [...c.centro.map((v, k) => r2(v - c.tamanho[k] / 2)), ...c.centro.map((v, k) => r2(v + c.tamanho[k] / 2))])
for (const o of objetos) {
  const fator = SOLIDO[o.modelo]
  if (!fator) continue
  const [lmin, lmax] = limitesModelo(o.modelo)
  const [qx, qy, qz, qw] = o.rot
  const m = trs({ translation: o.pos, rotation: [qx, qy, qz, qw], scale: o.esc })
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (const cx of [lmin[0], lmax[0]]) for (const cy of [lmin[1], lmax[1]]) for (const cz of [lmin[2], lmax[2]]) {
    const p = [0, 1, 2].map((k) => m[k] * cx + m[4 + k] * cy + m[8 + k] * cz + m[12 + k])
    p.forEach((v, k) => { min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v) })
  }
  if (fator < 1) for (const k of [0, 2]) { const c = (min[k] + max[k]) / 2, t = ((max[k] - min[k]) * fator) / 2; min[k] = c - t; max[k] = c + t } // árvore: só o tronco
  solidos.push([...min.map(r2), ...max.map(r2)])
}

const mapa = {
  caixas, objetos, solidos,
  jogador: ponto('PlayerSpawner'),
  policia: ponto('EnemySpawner'),
}
fs.writeFileSync(path.join(JOGO, 'src', 'mapa.json'), JSON.stringify(mapa))

/* ---------- modelos ---------- */
for (const m of [...modelos, 'handgun_01']) fs.copyFileSync(path.join(ORIGEM, 'Mesh', `${m}.glb`), path.join(PUB, 'modelos', `${m}.glb`))

/* ---------- texturas ---------- */
const TEX = path.join(ORIGEM, 'Resources', 'textures')
await sharp(path.join(TEX, 'FloorCells.png')).resize(512, 512).jpeg({ quality: 80 }).toFile(path.join(PUB, 'texturas', 'chao.jpg'))
await sharp(path.join(TEX, 'WallBricks.png')).resize(512, 512).jpeg({ quality: 80 }).toFile(path.join(PUB, 'texturas', 'parede.jpg'))
for (const face of ['right', 'left', 'top', 'bottom', 'front', 'back']) {
  const arq = path.join(TEX, 'skyboxes', 'custom', `${face}.png`)
  if (fs.existsSync(arq)) await sharp(arq).resize(512, 512).jpeg({ quality: 78 }).toFile(path.join(PUB, 'texturas', `ceu-${face}.jpg`))
}
fs.copyFileSync(path.join(ORIGEM, 'Texture2D', 'rpgpp_lt_tex_a.png'), path.join(PUB, 'texturas', 'rpgpp.png'))
fs.copyFileSync(path.join(ORIGEM, 'Texture2D', 'Low Poly FPS Pack Texture.png'), path.join(PUB, 'texturas', 'arma.png'))

/* ---------- sons (Low Poly FPS Pack) ---------- */
const SONS = { tiro: 'shoot', recarga: 'handgun_01-04_reload_ammo_left', recargaVazia: 'handgun_01-04_reload_out_of_ammo', impacto: 'impact-1', impacto2: 'impact-2', explosao: 'explosion-1', sacar: 'take_out_weapon', baque: 'thud' }
for (const [nome, arq] of Object.entries(SONS)) fs.copyFileSync(path.join(ORIGEM, 'AudioClip', `${arq}.ogg`), path.join(PUB, 'sons', `${nome}.ogg`))

console.log('caixas', caixas.length, 'objetos', objetos.length, 'modelos', [...modelos].join(', '))
console.log('jogador', mapa.jogador, 'polícia', mapa.policia)
for (const c of caixas) console.log(' ', c.nome, c.centro, c.tamanho)
