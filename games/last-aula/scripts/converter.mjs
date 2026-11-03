// Converte o projeto Unity original do The Last Aula (fases, sprites e colisões) para o jogo web.
// Não roda no build: só quando quiser regerar os dados a partir do projeto Unity.
//
//   git clone https://github.com/dev-ViniciusMonteiro/ThaLastAula---DesenvolvimentoDeJogosDigitaisUnity.git <pasta>
//   node games/last-aula/scripts/converter.mjs <pasta>
//
// Gera games/last-aula/public/atlas.webp, public/fundos/*.webp e src/dados.json.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const RAIZ = process.argv[2]
if (!RAIZ) throw new Error('Informe a pasta do projeto Unity')
const ASSETS = path.join(RAIZ, 'Assets')
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const JOGO = path.join(AQUI, '..')
const PX = 96 // pixels por unidade do mundo no atlas

/* ---------------- leitura do YAML do Unity ---------------- */

const lerTexto = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
function andar(dir, lista = []) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n)
    if (fs.statSync(p).isDirectory()) andar(p, lista)
    else lista.push(p)
  }
  return lista
}
const arquivos = andar(ASSETS)
const guidArq = {}
for (const f of arquivos.filter((f) => f.endsWith('.meta'))) {
  const m = lerTexto(f).match(/^guid: (\w+)/m)
  if (m) guidArq[m[1]] = path.relative(ASSETS, f.slice(0, -5)).replace(/\\/g, '/')
}
const nomeScript = (guid) => (guidArq[guid] || guid).split('/').pop().replace('.cs', '')

const texturas = {}
function textura(guid) {
  if (guid in texturas) return texturas[guid]
  const rel = guidArq[guid]
  if (!rel) return (texturas[guid] = null)
  const meta = lerTexto(path.join(ASSETS, rel + '.meta'))
  const ppu = Number((meta.match(/spritePixelsToUnits: ([\d.]+)/) || [])[1] || 100)
  const modo = Number((meta.match(/spriteMode: (\d)/) || [])[1] || 1)
  const ids = {}
  const bloco = meta.match(/fileIDToRecycleName:\n((?:    .+\n)+)/)
  if (bloco) for (const l of bloco[1].split('\n')) { const m = l.match(/(\d+): (.+)/); if (m) ids[m[1]] = m[2].trim() }
  const recortes = {}
  for (const s of meta.split(/\n    - serializedVersion: 2\n/).slice(1)) {
    const nome = (s.match(/      name: (.+)/) || [])[1]
    const r = s.match(/      rect:\n        serializedVersion: 2\n        x: ([\d.-]+)\n        y: ([\d.-]+)\n        width: ([\d.-]+)\n        height: ([\d.-]+)/)
    if (nome && r) recortes[nome.trim()] = [+r[1], +r[2], +r[3], +r[4]]
    const iid = (s.match(/      internalID: (-?\d+)/) || [])[1]
    if (nome && iid && !ids[iid]) ids[iid] = nome.trim()
  }
  return (texturas[guid] = { arquivo: rel, ppu, modo, ids, recortes })
}
/** Sprite do Unity -> { arquivo, ppu, nome, rect (em pixels, origem embaixo) } */
function sprite(ref) {
  if (!ref?.guid) return null
  const t = textura(ref.guid)
  if (!t) return null
  if (t.modo !== 2) return { arquivo: t.arquivo, ppu: t.ppu, nome: path.basename(t.arquivo, '.png'), rect: null }
  const nome = t.ids[ref.fileID]
  if (!nome || !t.recortes[nome]) throw new Error(`Sprite ${ref.fileID} não encontrado em ${t.arquivo}`)
  return { arquivo: t.arquivo, ppu: t.ppu, nome, rect: t.recortes[nome] }
}
const ref = (txt) => { const m = txt && txt.match(/fileID: (-?\d+)(?:, guid: (\w+))?/); return m ? { fileID: m[1], guid: m[2] } : null }
const vec = (txt) => { const o = {}; for (const m of (txt || '').matchAll(/(\w): ([\d.eE+-]+)/g)) o[m[1]] = +m[2]; return o }
const campo = (corpo, nome) => (corpo.match(new RegExp(`^  ${nome}: (.*)$`, 'm')) || [])[1]

function lerCena(rel) {
  const texto = lerTexto(path.join(ASSETS, rel))
  const partes = texto.split(/^--- !u!(\d+) &(\d+)( stripped)?$/m)
  const ds = []
  for (let i = 1; i < partes.length; i += 4) ds.push({ cls: partes[i], id: partes[i + 1], stripped: !!partes[i + 2], corpo: partes[i + 3] })
  const gos = {}
  for (const d of ds) if (d.cls === '1' && !d.stripped) gos[d.id] = { id: d.id, nome: (campo(d.corpo, 'm_Name') || '').trim(), comps: [] }
  for (const d of ds) { const g = ref(campo(d.corpo, 'm_GameObject')); if (g && gos[g.fileID]) gos[g.fileID].comps.push(d) }
  const tr = {}
  for (const d of ds) if (d.cls === '4' && !d.stripped) tr[d.id] = { pos: vec(campo(d.corpo, 'm_LocalPosition')), esc: vec(campo(d.corpo, 'm_LocalScale')), pai: ref(campo(d.corpo, 'm_Father'))?.fileID }
  const mundo = (tid) => {
    const cadeia = []
    for (let t = tr[tid]; t; t = tr[t.pai]) cadeia.push(t)
    let x = 0, y = 0, ex = 1, ey = 1
    for (const c of cadeia.reverse()) { x += c.pos.x * ex; y += c.pos.y * ey; ex *= c.esc.x ?? 1; ey *= c.esc.y ?? 1 }
    return { x, y, ex, ey }
  }
  const tilemaps = [], objetos = [], prefabs = []
  for (const go of Object.values(gos)) {
    const t = go.comps.find((c) => c.cls === '4')
    const pos = t ? mundo(t.id) : { x: 0, y: 0, ex: 1, ey: 1 }
    const scripts = go.comps.filter((c) => c.cls === '114').map((c) => ({ nome: nomeScript(ref(campo(c.corpo, 'm_Script'))?.guid), corpo: c.corpo }))
    const tm = go.comps.find((c) => c.cls === '1839735485')
    if (tm) {
      const arr = tm.corpo.match(/^  m_TileSpriteArray:\n((?:  - .*\n    m_Data: .*\n)+)/m)
      const sps = arr ? [...arr[1].matchAll(/m_Data: (\{.*\})/g)].map((m) => sprite(ref(m[1]))) : []
      const tiles = [...tm.corpo.matchAll(/  - first: \{x: (-?\d+), y: (-?\d+), z: -?\d+\}\n    second:\n(?:      .*\n)*?      m_TileSpriteIndex: (\d+)/g)].map((m) => [+m[1], +m[2], sps[+m[3]]])
      const col = go.comps.find((c) => c.cls === '19719996')
      const rend = go.comps.find((c) => c.cls === '483693784')
      tilemaps.push({ nome: go.nome, colisor: !!col, gatilho: col ? campo(col.corpo, 'm_IsTrigger') === '1' : false, morte: scripts.some((s) => s.nome === 'DeathTriguer'), ordem: rend ? +campo(rend.corpo, 'm_SortingOrder') : 0, tiles })
      continue
    }
    const sr = go.comps.find((c) => c.cls === '212')
    const box = go.comps.find((c) => c.cls === '61')
    objetos.push({
      nome: go.nome, pos, scripts,
      sprite: sr ? sprite(ref(campo(sr.corpo, 'm_Sprite'))) : null,
      ordem: sr ? +campo(sr.corpo, 'm_SortingOrder') : 0,
      caixa: box ? { tam: vec(campo(box.corpo, 'm_Size')), off: vec(campo(box.corpo, 'm_Offset')) } : null,
    })
  }
  for (const d of ds.filter((d) => d.cls === '1001')) {
    const mods = {}
    for (const m of d.corpo.matchAll(/    - target: \{fileID: (-?\d+), guid: \w+, type: 3\}\n      propertyPath: (.+)\n      value: (.*)\n/g)) mods[m[2]] = m[3]
    prefabs.push({ prefab: (guidArq[ref(campo(d.corpo, 'm_SourcePrefab'))?.guid] || '').split('/').pop().replace('.prefab', ''), id: d.id, mods, pos: { x: +(mods['m_LocalPosition.x'] || 0), y: +(mods['m_LocalPosition.y'] || 0) } })
  }
  // scripts adicionados a instâncias de prefab (ex.: FaseBonux na saída da Fase 1)
  const extras = {}
  for (const d of ds.filter((d) => d.cls === '114')) {
    const g = ref(campo(d.corpo, 'm_GameObject'))?.fileID
    const go = ds.find((x) => x.id === g && x.stripped)
    if (go) { const pi = ref(campo(go.corpo, 'm_PrefabInstance'))?.fileID; (extras[pi] ||= []).push(nomeScript(ref(campo(d.corpo, 'm_Script'))?.guid)) }
  }
  for (const p of prefabs) p.scripts = extras[p.id] || []
  return { tilemaps, objetos, prefabs }
}

/* ---------------- imagens ---------------- */

const imagens = {}
async function imagem(rel) {
  if (!imagens[rel]) {
    const { data, info } = await sharp(path.join(ASSETS, rel)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    imagens[rel] = { data, w: info.width, h: info.height }
  }
  return imagens[rel]
}
/** Retângulo Unity (origem embaixo) -> retângulo de imagem (origem em cima). */
function rectImg(img, rect) {
  if (!rect) return [0, 0, img.w, img.h]
  return [Math.round(rect[0]), Math.round(img.h - rect[1] - rect[3]), Math.round(rect[2]), Math.round(rect[3])]
}
/** Caixa opaca (alfa > 100) dentro do recorte, em pixels relativos ao recorte. */
function caixaOpaca(img, [rx, ry, rw, rh]) {
  let x0 = rw, y0 = rh, x1 = -1, y1 = -1
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    if (img.data[((ry + y) * img.w + rx + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1]
}
/** Altura do topo opaco em 8 colunas (0 = base do tile, 1 = topo), para rampas. */
function perfil(img, [rx, ry, rw, rh]) {
  const r = []
  for (let i = 0; i < 8; i++) {
    const x = rx + Math.min(rw - 1, Math.round(((i + 0.5) / 8) * rw))
    let topo = rh
    for (let y = 0; y < rh; y++) if (img.data[((ry + y) * img.w + x) * 4 + 3] > 100) { topo = y; break }
    r.push(+(1 - topo / rh).toFixed(3))
  }
  return r
}

/* ---------------- atlas ---------------- */

const pecas = [] // { chave, buf, w, h }
const atlas = {} // chave -> [x, y, w, h]
async function addPeca(chave, rel, rectPx, escala) {
  if (atlas[chave] !== undefined || pecas.some((p) => p.chave === chave)) return
  const [x, y, w, h] = rectPx
  const W = Math.max(1, Math.round(w * escala)), H = Math.max(1, Math.round(h * escala))
  const buf = await sharp(path.join(ASSETS, rel)).extract({ left: x, top: y, width: w, height: h }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer()
  pecas.push({ chave, buf, w: W, h: H })
}
async function montarAtlas() {
  const LARG = 2048, PAD = 2
  pecas.sort((a, b) => b.h - a.h)
  let x = 0, y = 0, linha = 0
  const comp = []
  for (const p of pecas) {
    if (x + p.w + PAD > LARG) { x = 0; y += linha + PAD; linha = 0 }
    atlas[p.chave] = [x, y, p.w, p.h]
    comp.push({ input: p.buf, left: x, top: y })
    x += p.w + PAD; linha = Math.max(linha, p.h)
  }
  const altura = y + linha
  await sharp({ create: { width: LARG, height: altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(path.join(JOGO, 'public', 'atlas.webp'))
  return [LARG, altura]
}

/* ---------------- conversão ---------------- */

const r3 = (n) => Math.round(n * 1000) / 1000
const tiles = [] // índice -> { chave, forma, caixa | perfil }
const tileIdx = {}
async function tileDe(sp) {
  const chave = `t:${sp.arquivo}|${sp.nome}`
  if (chave in tileIdx) return tileIdx[chave]
  const img = await imagem(sp.arquivo)
  const r = rectImg(img, sp.rect)
  await addPeca(chave, sp.arquivo, r, PX / sp.ppu)
  const tam = r[2] / sp.ppu // tamanho em unidades (1 nos tiles de 128 px)
  const c = caixaOpaca(img, r)
  const info = { chave, tam: r3(tam) }
  if (/slope/i.test(sp.nome)) { info.forma = 'rampa'; info.perfil = perfil(img, r) }
  else if (c) { info.forma = 'caixa'; info.caixa = [r3(c[0] / r[2] - 0.5), r3(0.5 - c[3] / r[3]), r3(c[2] / r[2] - 0.5), r3(0.5 - c[1] / r[3])].map((v) => r3(v * tam)) }
  tileIdx[chave] = tiles.length
  tiles.push(info)
  return tileIdx[chave]
}

const DRAGAO = 'Dragon Warrior Files/Dragon Warrior PNG'
const ANIM = { idle: 6, walk: 6, jump: 2, crouch: 2, attack: 3, crouch_ATK: 3, jumpATK: 3, die: 10, win: 2, hurt: 2 }
async function dragao() {
  // recorte comum a todos os quadros (o desenho é pequeno dentro de 512x256)
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
  const quadros = []
  for (const [nome, n] of Object.entries(ANIM)) for (let i = 1; i <= n; i++) {
    const arq = `${DRAGAO}/${nome}_${nome === 'die' ? String(i).padStart(3, '0') : String(i).padStart(2, '0')}.png`
    const img = await imagem(arq)
    const c = caixaOpaca(img, [0, 0, img.w, img.h])
    quadros.push({ nome, i, arq, img })
    x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[2]); y1 = Math.max(y1, c[3])
  }
  const { w, h } = quadros[0].img
  for (const q of quadros) await addPeca(`d:${q.nome}${q.i}`, q.arq, [x0, y0, x1 - x0, y1 - y0], PX / 100)
  // deslocamento do recorte em relação ao centro do sprite (pivô 0,5), em unidades, y para cima
  return { x: r3((x0 - w / 2) / 100), y: r3((h / 2 - y0) / 100), w: r3((x1 - x0) / 100), h: r3((y1 - y0) / 100), anim: ANIM }
}

async function spriteInteiro(chave, rel, unidadesLarg) {
  const img = await imagem(rel)
  const c = caixaOpaca(img, [0, 0, img.w, img.h])
  const esc = unidadesLarg / img.w // unidades por pixel
  await addPeca(chave, rel, [c[0], c[1], c[2] - c[0], c[3] - c[1]], esc * PX)
  return { x: r3((c[0] - img.w / 2) * esc), y: r3((img.h / 2 - c[1]) * esc), w: r3((c[2] - c[0]) * esc), h: r3((c[3] - c[1]) * esc) }
}

const fundos = {}
async function fundo(rel) {
  const nome = path.basename(rel, '.png')
  if (!fundos[nome]) {
    fs.mkdirSync(path.join(JOGO, 'public', 'fundos'), { recursive: true })
    await sharp(path.join(ASSETS, rel)).resize(768).webp({ quality: 80 }).toFile(path.join(JOGO, 'public', 'fundos', nome + '.webp'))
    fundos[nome] = true
  }
  return nome
}

async function fase(nomeCena, titulo, proxima) {
  const c = lerCena(`Scenes/${nomeCena}.unity`)
  const camadas = []
  let minX = 1e9, maxX = -1e9, minY = 1e9
  for (const tm of c.tilemaps) {
    const lista = []
    for (const [x, y, sp] of tm.tiles) {
      if (!sp) continue
      lista.push([x, y, await tileDe(sp)])
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y)
    }
    if (!lista.length) continue
    const tipo = tm.morte ? 'morte' : tm.colisor && !tm.gatilho ? 'solido' : 'decoracao'
    camadas.push({ nome: tm.nome, tipo, ordem: tm.ordem, tiles: lista })
  }
  camadas.sort((a, b) => a.ordem - b.ordem)

  const p = (nome) => c.prefabs.filter((x) => x.prefab === nome)
  const jog = p('Player')[0]
  const cristais = p('Crystal').map((x) => [r3(x.pos.x), r3(x.pos.y)])
  const inimigos = p('Inimig').map((x) => ({ x: r3(x.pos.x), y: r3(x.pos.y), min: [+x.mods['minimo.x'], +x.mods['minimo.y']], max: [+x.mods['maximo.x'], +x.mods['maximo.y']] }))
  const saida = p('FinalFase')[0]
  const plataformas = []
  for (const o of c.objetos) {
    const mp = o.scripts.find((s) => s.nome === 'MovementPhase')
    if (!mp) continue
    const min = vec(campo(mp.corpo, 'minimo')), max = vec(campo(mp.corpo, 'maximo'))
    const largura = (o.caixa?.tam.x ?? 1) * o.pos.ex
    const chave = await tileDe(o.sprite)
    // duas plataformas idênticas no mesmo lugar no original: fica só uma
    if (plataformas.some((q) => q.x === r3(o.pos.x) && q.y === r3(o.pos.y) && q.esc === r3(o.pos.ex))) continue
    plataformas.push({ x: r3(o.pos.x), y: r3(o.pos.y), esc: r3(o.pos.ex), tile: chave, min: [min.x, min.y], max: [max.x, max.y], vel: +campo(mp.corpo, 'speed'), caixa: { w: r3(largura), h: r3(o.caixa?.tam.y ?? 0.27), oy: r3(o.caixa?.off.y ?? 0.36) } })
  }
  // fundos (montanhas e caverna): cada linha se repete pela fase toda
  const linhas = {}
  for (const o of c.objetos) {
    if (!o.sprite || !/^BG_/.test(o.nome)) continue
    const img = await fundo(o.sprite.arquivo)
    const k = `${img}|${r3(o.pos.y)}|${o.ordem}|${r3(o.pos.ex)}|${r3(o.pos.ey)}`
    const larg = 10.24 * o.pos.ex
    ;(linhas[k] ||= { img, y: r3(o.pos.y), ordem: o.ordem, w: r3(larg), h: r3(10.24 * o.pos.ey), xs: [] }).xs.push(r3(o.pos.x))
  }
  const fundosFase = Object.values(linhas).map((l) => {
    const xs = [...new Set(l.xs)].sort((a, b) => a - b)
    const passos = xs.slice(1).map((x, i) => x - xs[i]).sort((a, b) => a - b)
    // com 3 ou mais cópias a linha se repete pela fase toda; senão fica só onde estava
    return { img: l.img, y: l.y, ordem: l.ordem, w: l.w, h: l.h, xs, periodo: xs.length >= 3 ? r3(l.w * Math.max(1, Math.round(passos[Math.floor(passos.length / 2)] / l.w))) : 0 } // múltiplo exato da largura: sem frestas
  }).sort((a, b) => a.ordem - b.ordem)
  const placas = c.objetos.filter((o) => o.sprite && /^(ad|SpaceS|Tutorial)$/.test(o.nome)).map((o) => ({ tipo: o.nome, x: r3(o.pos.x), y: r3(o.pos.y) }))
  return {
    id: nomeCena, titulo, proxima,
    camadas, plataformas, placas, fundos: fundosFase,
    jogador: [r3(jog.pos.x), r3(jog.pos.y)],
    cristais, inimigos,
    saida: [r3(saida.pos.x), r3(saida.pos.y)],
    limites: { minX, maxX, minY },
  }
}

fs.mkdirSync(path.join(JOGO, 'public'), { recursive: true })
const fases = [
  await fase('Tutorial', 'Tutorial', 'Fase1'),
  await fase('Fase1', 'Fase 1: Floresta de Zurard', 'Fase2'),
  await fase('Fase2', 'Fase 2: Caverna dos Cristais', null),
]
const sprites = {
  dragao: await dragao(),
  inimigo: await spriteInteiro('s:inimigo', 'TooCubeForest/images/nemo_sprite.png', 1.28),
  cristal: await spriteInteiro('s:cristal', '2D Free Crystal Set/Sprites/512/сrystal 1.png', 2.7 * 0.2568),
  saida: await spriteInteiro('s:saida', '2D Free Crystal Set/Sprites/1024/сrystal 5.png', 10.05 * 0.2676465),
}
for (let i = 1; i <= 6; i++) await addPeca(`e:explosao${i}`, `Dragon Warrior Files/Effects/explosion_0${i}.png`, rectImg(await imagem(`Dragon Warrior Files/Effects/explosion_0${i}.png`), null), PX / 100 * 0.6)
sprites.explosao = { tam: r3((await imagem('Dragon Warrior Files/Effects/explosion_01.png')).w / 100 * 0.6) }
await fundo('TooCubeForest/backgrounds/BG_volcano2_1024.png')
const tamAtlas = await montarAtlas()
const dados = { px: PX, tamAtlas, atlas, tiles, sprites, fases }
fs.writeFileSync(path.join(JOGO, 'src', 'dados.json'), JSON.stringify(dados))
console.log('atlas', tamAtlas, 'peças', pecas.length, 'tiles', tiles.length, 'fundos', Object.keys(fundos))
for (const f of fases) console.log(f.id, f.camadas.map((c) => `${c.nome}:${c.tipo}:${c.tiles.length}`).join(' '), 'cristais', f.cristais.length, 'inimigos', f.inimigos.length, 'plataformas', f.plataformas.length, 'fundos', f.fundos.length, 'placas', f.placas.length, 'limites', JSON.stringify(f.limites))
