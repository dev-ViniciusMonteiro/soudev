import './estilo.css'
import bruto from './dados.json'
import { alternarSom, chiado, destravarSom, estaMudo, tom } from '../../comum/ui'

// The Last Aula — releitura web do jogo feito em Unity na aula de Design de Jogos Digitais (UniFAJ).
// As fases, as posições e as colisões vêm das cenas originais (scripts/converter.mjs). A física segue o
// Playercontroller.cs: força 12 para andar, atrito que faz o dragão deslizar, agachar para frear e
// uma vida só. Novidade: o dragão ataca (animação de ataque do próprio sprite) e derrota os inimigos.

/* ---------------- dados ---------------- */

interface Tile { chave: string; tam: number; forma?: 'caixa' | 'rampa'; caixa?: number[]; perfil?: number[] }
interface Camada { nome: string; tipo: 'decoracao' | 'solido' | 'morte'; ordem: number; tiles: number[][] }
interface Fundo { img: string; y: number; ordem: number; w: number; h: number; xs: number[]; periodo: number }
interface Plataforma { x: number; y: number; esc: number; tile: number; min: number[]; max: number[]; vel: number; caixa: { w: number; h: number; oy: number } }
interface Fase {
  id: string; titulo: string; proxima: string | null
  camadas: Camada[]; plataformas: Plataforma[]; placas: { tipo: string; x: number; y: number }[]; fundos: Fundo[]
  jogador: number[]; cristais: number[][]; inimigos: { x: number; y: number; min: number[]; max: number[] }[]
  saida: number[]; limites: { minX: number; maxX: number; minY: number }
}
interface Recorte { x: number; y: number; w: number; h: number }
interface Dados {
  atlas: Record<string, number[]>; tiles: Tile[]
  sprites: { dragao: Recorte & { anim: Record<string, number> }; inimigo: Recorte; cristal: Recorte; saida: Recorte; explosao: { tam: number } }
  fases: Fase[]
}
const D = bruto as unknown as Dados
const faseDe = (id: string) => D.fases.find((f) => f.id === id) as Fase

// Câmera de cada cena (CameraFollow.cs: followOffset e DiferencaY)
const CAMERA: Record<string, { ox: number; oy: number; dy: number }> = {
  Tutorial: { ox: 7.43, oy: 0.82, dy: 0.57 },
  Fase1: { ox: 6.53, oy: 0, dy: 0 },
  Fase2: { ox: 7.43, oy: 3.89, dy: 0 },
}

/* ---------------- física (valores do Unity) ---------------- */

const DT = 1 / 60
const GRAVIDADE = 9.81
const FORCA_ANDAR = 12 // speedForce
const ATRITO = 0.4 * GRAVIDADE // material padrão do Unity (atrito 0,4)
const VEL_MAX = 7.5 // no original não havia limite e o dragão disparava
const PULO = 6.2 // JumpForce 5 + um pouco de folga para os degraus
const CRISTAIS_PARA_PASSAR = 3
const EM_PE = { l: -0.55, r: 0.55, b: -1.218, t: 0.127 } // CapsuleCollider2D do Player
const AGACHADO = { l: -0.4, r: 0.4, b: -1.218, t: -0.3 }

/* ---------------- tela ---------------- */

const app = document.getElementById('app') as HTMLDivElement
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
app.append(canvas)
app.insertAdjacentHTML('beforeend', `
  <div class="la-topo">
    <button class="la-icone" id="som" title="Som">${estaMudo() ? '🔇' : '🔊'}</button>
    <button class="la-icone" id="pausa" title="Pausar (Esc)">⏸</button>
  </div>
  <div class="la-toque">
    <button class="la-tq esq" data-k="esq" aria-label="Esquerda">◀</button>
    <button class="la-tq dir" data-k="dir" aria-label="Direita">▶</button>
    <button class="la-tq baixo" data-k="baixo" aria-label="Agachar">▼</button>
    <button class="la-tq atacar" data-k="atacar" aria-label="Atacar">ATACAR</button>
    <button class="la-tq pular" data-k="pular" aria-label="Pular">PULAR</button>
  </div>
  <section class="la-tela la-menu" id="menu"></section>
  <section class="la-tela" id="aviso" hidden></section>
  <div class="la-girar">Gire o celular para jogar na horizontal 🔄</div>`)
const telaMenu = document.getElementById('menu') as HTMLElement
const telaAviso = document.getElementById('aviso') as HTMLElement

let W = 0, H = 0, S = 1 // tamanho do canvas e pixels por unidade do mundo
function ajustar() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = Math.round(app.clientWidth * dpr); H = Math.round(app.clientHeight * dpr)
  canvas.width = W; canvas.height = H
  S = H / 10 // câmera ortográfica de tamanho 5: 10 unidades de altura, como no Unity
}
window.addEventListener('resize', ajustar)
ajustar()

/* ---------------- imagens ---------------- */

const carregar = (src: string) => new Promise<HTMLImageElement>((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src })
let atlas: HTMLImageElement | null = null
const fundos: Record<string, HTMLImageElement> = {}
const prontos = (async () => {
  atlas = await carregar('atlas.webp')
  const nomes = new Set(D.fases.flatMap((f) => f.fundos.map((b) => b.img)))
  await Promise.all([...nomes].map(async (n) => { fundos[n] = await carregar(`fundos/${n}.webp`) }))
})()
telaMenu.style.setProperty('--fundo', `url("${new URL('fundos/BG_volcano2_1024.webp', location.href).href}")`)

/** Desenha uma peça do atlas num retângulo do mundo (x, topo, largura, altura). */
function peca(chave: string, x: number, topo: number, w: number, h: number, espelhar = false) {
  const a = D.atlas[chave]
  if (!a || !atlas) return
  const sx = (x - cam.x) * S + W / 2, sy = (cam.y - topo) * S + H / 2
  if (espelhar) {
    ctx.save(); ctx.translate(sx + w * S, sy); ctx.scale(-1, 1)
    ctx.drawImage(atlas, a[0], a[1], a[2], a[3], 0, 0, w * S, h * S)
    ctx.restore()
  } else ctx.drawImage(atlas, a[0], a[1], a[2], a[3], sx, sy, w * S, h * S)
}

/* ---------------- som (sintetizado) ---------------- */

const sons = {
  pulo: () => tom(330, 0.14, 'square', 0.05, 0, 620),
  cristal: () => [988, 1319, 1760].forEach((f, i) => tom(f, 0.16, 'triangle', 0.09, i * 0.06)),
  ataque: () => chiado(0.16, 1800, 0.18, 'bandpass'),
  explosao: () => { chiado(0.45, 500, 0.45, 'lowpass'); tom(140, 0.3, 'sine', 0.3, 0, 45) },
  morte: () => [392, 330, 262, 196].forEach((f, i) => tom(f, 0.28, 'sawtooth', 0.07, i * 0.13)),
  fase: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tom(f, 0.3, 'triangle', 0.1, i * 0.1)),
  falta: () => tom(200, 0.22, 'square', 0.05, 0, 150),
}

/* ---------------- estado ---------------- */

type Estado = 'menu' | 'jogando' | 'pausa' | 'morrendo' | 'passando' | 'aviso'
let estado: Estado = 'menu'
let fase: Fase = faseDe('Fase1')
const solido = new Map<number, number>()
const morte = new Map<number, number>()
const desenho: { camada: Camada; mapa: Map<number, number> }[] = []
const chave = (x: number, y: number) => (x + 2000) * 8192 + (y + 2000)

const jog = { x: 0, y: 0, vx: 0, vy: 0, dir: 1, chao: false, agachado: false, ataque: -1, morto: 0, vitoria: 0, anim: 0, plataforma: -1 }
let cristaisPegos = 0
let cristais: { x: number; y: number; pego: boolean }[] = []
let inimigos: { x: number; y: number; min: number[]; max: number[]; dx: number; dy: number; vivo: boolean }[] = []
let plataformas: (Plataforma & { px: number; py: number; dx: number; dy: number })[] = []
let explosoes: { x: number; y: number; t: number }[] = []
let msg = { texto: '', t: 0 }
const cam = { x: 0, y: 0 }
let tempo = 0
let congelado = false // só para os testes tirarem print no meio de uma animação

function iniciarFase(id: string) {
  fase = faseDe(id)
  solido.clear(); morte.clear(); desenho.length = 0
  for (const c of fase.camadas) {
    const mapa = new Map<number, number>()
    for (const [x, y, t] of c.tiles) mapa.set(chave(x, y), t)
    if (c.tipo === 'solido') for (const [k, v] of mapa) solido.set(k, v)
    if (c.tipo === 'morte') for (const [k, v] of mapa) morte.set(k, v)
    desenho.push({ camada: c, mapa })
  }
  Object.assign(jog, { x: fase.jogador[0], y: fase.jogador[1], vx: 0, vy: 0, dir: 1, chao: false, agachado: false, ataque: -1, morto: 0, vitoria: 0, anim: 0, plataforma: -1 })
  cristaisPegos = 0 // no Unity o tutorial começava com 3 cristais por engano
  cristais = fase.cristais.map(([x, y]) => ({ x, y, pego: false }))
  inimigos = fase.inimigos.map((i) => ({ ...i, dx: 1, dy: 1, vivo: true }))
  plataformas = fase.plataformas.map((p) => ({ ...p, px: p.x, py: p.y, dx: 1, dy: 1 }))
  explosoes = []
  cam.x = jog.x; cam.y = jog.y
  msg = { texto: fase.titulo, t: 2.6 }
  estado = 'jogando'
  telaMenu.hidden = true; telaAviso.hidden = true
}

/* ---------------- entrada ---------------- */

const tecla = { esq: false, dir: false, baixo: false, pular: false, atacar: false }
let pularAntes = false, atacarAntes = false
const MAPA_TECLAS: Record<string, keyof typeof tecla> = {
  ArrowLeft: 'esq', KeyA: 'esq', ArrowRight: 'dir', KeyD: 'dir', ArrowDown: 'baixo', KeyS: 'baixo',
  Space: 'pular', ArrowUp: 'pular', KeyW: 'pular', KeyJ: 'atacar', KeyK: 'atacar', KeyX: 'atacar',
}
window.addEventListener('keydown', (e) => {
  const k = MAPA_TECLAS[e.code]
  if (k) { tecla[k] = true; e.preventDefault() }
  if (e.code === 'Escape' || e.code === 'KeyP') alternarPausa()
})
window.addEventListener('keyup', (e) => { const k = MAPA_TECLAS[e.code]; if (k) tecla[k] = false })
window.addEventListener('blur', () => { for (const k of Object.keys(tecla) as (keyof typeof tecla)[]) tecla[k] = false })
for (const b of document.querySelectorAll<HTMLButtonElement>('.la-tq')) {
  const k = b.dataset.k as keyof typeof tecla
  const on = (e: Event) => { e.preventDefault(); destravarSom(); tecla[k] = true; b.classList.add('ativo') }
  const off = (e: Event) => { e.preventDefault(); tecla[k] = false; b.classList.remove('ativo') }
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off)
  b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off)
}
;(document.getElementById('som') as HTMLButtonElement).onclick = (e) => { (e.currentTarget as HTMLElement).textContent = alternarSom() ? '🔇' : '🔊' }
;(document.getElementById('pausa') as HTMLButtonElement).onclick = () => alternarPausa()

/* ---------------- colisão ---------------- */

type Caixa = { l: number; r: number; b: number; t: number }
const caixaJog = (x = jog.x, y = jog.y, ag = jog.agachado): Caixa => { const c = ag ? AGACHADO : EM_PE; return { l: x + c.l, r: x + c.r, b: y + c.b, t: y + c.t } }
const cruza = (a: Caixa, b: Caixa) => a.l < b.r && a.r > b.l && a.b < b.t && a.t > b.b

/** Caixas sólidas que tocam a região (blocos do tilemap e plataformas móveis). */
function solidosEm(c: Caixa): (Caixa & { plat?: number })[] {
  const lista: (Caixa & { plat?: number })[] = []
  for (let x = Math.floor(c.l); x <= Math.floor(c.r); x++) for (let y = Math.floor(c.b); y <= Math.floor(c.t); y++) {
    const t = solido.get(chave(x, y))
    if (t === undefined) continue
    const info = D.tiles[t]
    if (info.forma === 'rampa' && Math.min(...(info.perfil as number[])) < 0.97) continue
    const k = info.forma === 'caixa' ? (info.caixa as number[]) : [-0.5, -0.5, 0.5, 0.5]
    lista.push({ l: x + 0.5 + k[0], b: y + 0.5 + k[1], r: x + 0.5 + k[2], t: y + 0.5 + k[3] })
  }
  plataformas.forEach((p, i) => {
    const cy = p.py + p.caixa.oy
    lista.push({ l: p.px - p.caixa.w / 2, r: p.px + p.caixa.w / 2, b: cy - p.caixa.h / 2, t: cy + p.caixa.h / 2, plat: i })
  })
  return lista.filter((s) => cruza(c, s))
}

/** Altura da rampa sob o ponto x, procurando perto da altura y. */
function rampaEm(x: number, y: number): number | null {
  let melhor: number | null = null
  for (let cy = Math.floor(y) + 1; cy >= Math.floor(y) - 1; cy--) {
    const t = solido.get(chave(Math.floor(x), cy))
    if (t === undefined) continue
    const info = D.tiles[t]
    if (info.forma !== 'rampa') continue
    const p = info.perfil as number[]
    const f = (x - Math.floor(x)) * p.length - 0.5
    const i = Math.max(0, Math.min(p.length - 1, Math.floor(f)))
    const j = Math.min(p.length - 1, i + 1)
    const h = p[i] + (p[j] - p[i]) * Math.max(0, Math.min(1, f - i))
    const sup = cy + h
    if (melhor === null || sup > melhor) melhor = sup
  }
  return melhor
}

/* ---------------- passo da física ---------------- */

function passo() {
  tempo += DT
  // plataformas móveis da caverna (MovementPhase.cs: speed por FixedUpdate, 50 por segundo)
  const antes = plataformas.map((p) => [p.px, p.py])
  for (const p of plataformas) {
    p.px += p.vel * 50 * DT * p.dx; p.py += p.vel * 50 * DT * p.dy
    if (p.py > p.max[1]) { p.dy = -1; p.py = p.max[1] } else if (p.py < p.min[1]) { p.dy = 1; p.py = p.min[1] }
    if (p.px < p.min[0]) { p.dx = 1; p.px = p.min[0] } else if (p.px > p.max[0]) { p.dx = -1; p.px = p.max[0] }
  }
  if (jog.plataforma >= 0 && !jog.morto) { const p = plataformas[jog.plataforma]; jog.x += p.px - antes[jog.plataforma][0]; jog.y += p.py - antes[jog.plataforma][1] }
  for (const i of inimigos) {
    if (!i.vivo) continue
    i.x += 0.02 * 50 * DT * i.dx; i.y += 0.02 * 50 * DT * i.dy
    if (i.y > i.max[1]) { i.dy = -1; i.y = i.max[1] } else if (i.y < i.min[1]) { i.dy = 1; i.y = i.min[1] }
    if (i.x < i.min[0]) { i.dx = 1; i.x = i.min[0] } else if (i.x > i.max[0]) { i.dx = -1; i.x = i.max[0] }
  }
  for (const e of explosoes) e.t += DT
  explosoes = explosoes.filter((e) => e.t < 0.6)
  if (msg.t > 0) msg.t -= DT

  if (estado === 'morrendo') { jog.morto += DT; if (jog.morto > 1.3) mostrarMorte(); return }
  if (estado === 'passando') { jog.vitoria += DT; if (jog.vitoria > 1.4) passarDeFase(); return }

  // agachar (S): abre as asas e freia; só levanta se houver espaço
  const querAgachar = tecla.baixo
  if (querAgachar !== jog.agachado) {
    if (querAgachar || !solidosEm(caixaJog(jog.x, jog.y, false)).some((s) => s.plat === undefined)) jog.agachado = querAgachar
  }
  const h = (tecla.dir ? 1 : 0) - (tecla.esq ? 1 : 0)
  if (h) jog.dir = h
  if (h && !jog.agachado) jog.vx += FORCA_ANDAR * h * DT
  if (jog.chao) { // atrito com o chão: é ele que faz o dragão deslizar até parar
    const a = ATRITO * DT
    jog.vx = Math.abs(jog.vx) <= a ? 0 : jog.vx - Math.sign(jog.vx) * a
    if (jog.agachado) jog.vx = 0
  }
  jog.vx = Math.max(-VEL_MAX, Math.min(VEL_MAX, jog.vx))

  // pular (só no chão e de pé)
  if (tecla.pular && !pularAntes && jog.chao && !jog.agachado) { jog.vy = PULO; jog.chao = false; jog.plataforma = -1; sons.pulo() }
  pularAntes = tecla.pular

  // atacar
  if (tecla.atacar && !atacarAntes && jog.ataque < 0) { jog.ataque = 0; sons.ataque() }
  atacarAntes = tecla.atacar
  if (jog.ataque >= 0) { jog.ataque += DT; if (jog.ataque > 0.3) jog.ataque = -1 }

  jog.vy = Math.max(-20, jog.vy - GRAVIDADE * DT)
  const estavaNoChao = jog.chao

  // eixo x: só empurra de volta se o choque foi pelo lado (posição anterior fora da caixa)
  const antesX = caixaJog()
  jog.x += jog.vx * DT
  for (const s of solidosEm(caixaJog())) {
    const c = caixaJog()
    if (!cruza(c, s)) continue
    // degrau baixo ou fim de rampa: sobe, como a cápsula arredondada do Unity
    const sobe = s.t - c.b
    if (estavaNoChao && sobe > 0 && sobe <= 0.6) {
      const acima = { ...c, b: s.t + 0.01, t: c.t + sobe }
      if (!solidosEm(acima).some((o) => o !== s)) { jog.y += sobe; continue }
    }
    if (antesX.r <= s.l + 0.02) { jog.x -= c.r - s.l; jog.vx = 0 }
    else if (antesX.l >= s.r - 0.02) { jog.x += s.r - c.l; jog.vx = 0 }
  }
  // eixo y: pousa se antes estava acima; bate a cabeça se antes estava abaixo
  const antesY = caixaJog()
  jog.y += jog.vy * DT
  jog.chao = false; jog.plataforma = -1
  for (const s of solidosEm(caixaJog())) {
    const c = caixaJog()
    if (!cruza(c, s)) continue
    if (jog.vy <= 0 && antesY.b >= s.t - 0.05 - (s.plat !== undefined ? 0.1 : 0)) { jog.y += s.t - c.b; jog.vy = 0; jog.chao = true; if (s.plat !== undefined) jog.plataforma = s.plat }
    else if (jog.vy > 0 && antesY.t <= s.b + 0.05) { jog.y -= c.t - s.b; jog.vy = 0 }
  }
  // preso dentro de um bloco (ex.: plataforma móvel passou por ele): sai por cima se for pouco
  for (const s of solidosEm(caixaJog())) { const c = caixaJog(); if (cruza(c, s) && s.t - c.b < 0.5) { jog.y += s.t - c.b; jog.vy = Math.max(0, jog.vy); jog.chao = true } }
  // rampas: o pé acompanha a superfície
  const pe = jog.y + EM_PE.b
  const sup = rampaEm(jog.x, pe)
  if (sup !== null && jog.vy <= 0.5) {
    const folga = estavaNoChao ? 0.35 : 0.05
    if (pe < sup + folga && pe > sup - 0.6) { jog.y += sup - pe; jog.vy = 0; jog.chao = true }
  }

  const c = caixaJog()
  // ataque acerta os inimigos à frente
  if (jog.ataque > 0.05 && jog.ataque < 0.26) {
    const golpe: Caixa = jog.dir > 0 ? { l: jog.x, r: jog.x + 1.5, b: c.b, t: c.t + 0.3 } : { l: jog.x - 1.5, r: jog.x, b: c.b, t: c.t + 0.3 }
    for (const i of inimigos) if (i.vivo && cruza(golpe, { l: i.x - 0.5, r: i.x + 0.5, b: i.y - 0.5, t: i.y + 0.5 })) {
      i.vivo = false; explosoes.push({ x: i.x, y: i.y, t: 0 }); sons.explosao()
    }
  }
  // inimigo encostou: morre (no original qualquer dano mata)
  for (const i of inimigos) if (i.vivo && cruza(c, { l: i.x - 0.42, r: i.x + 0.42, b: i.y - 0.45, t: i.y + 0.45 })) return morrer()
  // espinhos (Deathground)
  for (let x = Math.floor(c.l); x <= Math.floor(c.r); x++) for (let y = Math.floor(c.b); y <= Math.floor(c.t); y++) {
    const t = morte.get(chave(x, y))
    if (t === undefined) continue
    const k = D.tiles[t].caixa ?? [-0.5, -0.5, 0.5, 0.5]
    if (cruza(c, { l: x + 0.5 + k[0] + 0.12, b: y + 0.5 + k[1] + 0.12, r: x + 0.5 + k[2] - 0.12, t: y + 0.5 + k[3] - 0.12 })) return morrer()
  }
  // caiu da floresta
  if (c.t < fase.limites.minY - 3) return morrer()
  // cristais
  for (const k of cristais) if (!k.pego && cruza(c, { l: k.x - 0.3, r: k.x + 0.3, b: k.y - 0.55, t: k.y + 0.55 })) {
    k.pego = true; cristaisPegos++; sons.cristal()
    if (cristaisPegos === CRISTAIS_PARA_PASSAR) msg = { texto: 'Você tem os 3 cristais! Vá até o cristal azul', t: 2.6 }
  }
  // saída da fase (FinalFase): só passa com 3 cristais
  const [sx, sy] = fase.saida
  if (cruza(c, { l: sx - 1, r: sx + 1.1, b: sy - 1.6, t: sy + 3 })) {
    if (cristaisPegos >= CRISTAIS_PARA_PASSAR) { estado = 'passando'; jog.vitoria = 0; jog.vx = 0; jog.vy = 0; sons.fase() }
    else if (msg.t <= 0.3) { const f = CRISTAIS_PARA_PASSAR - cristaisPegos; msg = { texto: `Faltam ${f} ${f === 1 ? 'cristal' : 'cristais'}! Volte e procure.`, t: 2.2 }; sons.falta() }
  }
}

function morrer() {
  if (estado !== 'jogando') return
  estado = 'morrendo'; jog.morto = 0.0001; jog.vx = 0; jog.vy = 0; jog.ataque = -1
  sons.morte()
}

/* ---------------- telas ---------------- */

function botoes(...lista: [string, () => void, string?][]) {
  const caixa = document.createElement('div'); caixa.className = 'la-botoes'
  for (const [texto, acao, classe] of lista) {
    const b = document.createElement('button'); b.className = 'la-btn ' + (classe || ''); b.textContent = texto
    b.onclick = () => { destravarSom(); acao() }
    caixa.append(b)
  }
  return caixa
}
function tela(alvo: HTMLElement, titulo: string, textos: string[], ...acoes: [string, () => void, string?][]) {
  const h = document.createElement(alvo === telaMenu ? 'h1' : 'h2'); h.textContent = titulo
  const ps = textos.map((t, i) => { const p = document.createElement('p'); p.textContent = t; if (i > 0 && alvo === telaMenu) p.className = 'la-pequeno'; return p })
  const b = botoes(...acoes)
  alvo.replaceChildren(h, ...ps, b)
  alvo.hidden = false
  ;(b.firstElementChild as HTMLButtonElement | null)?.focus()
}

function mostrarMenu() {
  estado = 'menu'; telaAviso.hidden = true
  tela(telaMenu, 'The Last Aula', [
    'Um dragão foge do reino da magia em Acablan atrás das pedras cristalinas que lhe dão o poder de voar. Sem elas ele só dá grandes pulos, e as terras de Zurard estão cheias de armadilhas e de robôs NEMO-MK2. Pegue 3 cristais em cada fase para seguir. Uma vida só: se morrer, volta ao começo.',
    'A e D andam · Espaço pula · S agacha e freia · J ataca',
    'Jogo de Gustavo Carlini, Vinicius Faccini e Vinicius Monteiro na aula de Design de Jogos Digitais (UniFAJ).',
  ], ['Jogar', () => iniciarFase('Fase1')], ['Tutorial', () => iniciarFase('Tutorial'), 'claro'])
}

function mostrarMorte() {
  estado = 'aviso'
  const tutorial = fase.id === 'Tutorial'
  tela(telaAviso, 'O dragão caiu!', [tutorial ? 'Tudo bem, é só o treino. Tente de novo.' : 'O dragão tem uma vida só: qualquer dano o derrota e a jornada recomeça da Fase 1.'],
    ['Recomeçar', () => iniciarFase(tutorial ? 'Tutorial' : 'Fase1')], ['Menu', mostrarMenu, 'claro'])
}

function passarDeFase() {
  estado = 'aviso'
  if (fase.id === 'Tutorial') {
    tela(telaAviso, 'Tutorial completo!', ['Agora é pra valer: atravesse a floresta de Zurard e depois a caverna.'], ['Jogar a Fase 1', () => iniciarFase('Fase1')], ['Menu', mostrarMenu, 'claro'])
  } else if (fase.proxima) {
    iniciarFase(fase.proxima)
  } else {
    tela(telaAviso, 'Você recuperou os cristais!', ['Com as pedras cristalinas o dragão volta a voar e deixa as terras de Zurard. Obrigado por jogar o The Last Aula!'],
      ['Jogar de novo', () => iniciarFase('Fase1')], ['Menu', mostrarMenu, 'claro'])
  }
}

function alternarPausa() {
  if (estado === 'jogando') {
    estado = 'pausa'
    tela(telaAviso, 'Pausado', [`${fase.titulo} · cristais: ${cristaisPegos}/${CRISTAIS_PARA_PASSAR}`],
      ['Continuar', () => alternarPausa()], ['Recomeçar fase', () => iniciarFase(fase.id === 'Tutorial' ? 'Tutorial' : 'Fase1'), 'claro'], ['Menu', mostrarMenu, 'claro'])
  } else if (estado === 'pausa') { estado = 'jogando'; telaAviso.hidden = true }
}

/* ---------------- câmera (CameraFollow.cs) ---------------- */

function moverCamera(dt: number) {
  const c = CAMERA[fase.id]
  const meiaL = W / S / 2
  const limX = meiaL - c.ox, limY = 5 - c.oy
  let tx = cam.x, ty = cam.y
  if (Math.abs(cam.x - jog.x) >= limX) tx = jog.x
  if (Math.abs(cam.y - jog.y) + c.dy >= limY) ty = jog.y
  const vel = Math.max(3, Math.hypot(jog.vx, jog.vy))
  const dx = tx - cam.x, dy = ty - cam.y, d = Math.hypot(dx, dy)
  if (d <= vel * dt) { cam.x = tx; cam.y = ty } else { cam.x += (dx / d) * vel * dt; cam.y += (dy / d) * vel * dt }
}

/* ---------------- desenho ---------------- */

const tela0 = () => ({ l: cam.x - W / S / 2, r: cam.x + W / S / 2, b: cam.y - 5, t: cam.y + 5 })

function desenharFundo(f: Fundo) {
  const img = fundos[f.img]
  if (!img) return
  const v = tela0()
  const xs = f.periodo > 0 ? (() => {
    const lista: number[] = []
    const inicio = f.xs[0] + Math.floor((v.l - f.w - f.xs[0]) / f.periodo) * f.periodo
    for (let x = inicio; x < v.r + f.w; x += f.periodo) lista.push(x)
    return lista
  })() : f.xs
  for (const x of xs) {
    if (x + f.w / 2 < v.l || x - f.w / 2 > v.r) continue
    // 0,1 de sobra de cada lado: as montanhas do original deixam frestas finas entre uma imagem e outra
    const sx = Math.floor((x - f.w / 2 - 0.1 - cam.x) * S + W / 2), sy = Math.floor((cam.y - (f.y + f.h / 2)) * S + H / 2)
    ctx.drawImage(img, sx, sy, Math.ceil((f.w + 0.2) * S), Math.ceil(f.h * S) + 1)
  }
}

function desenharCamada(mapa: Map<number, number>) {
  if (!atlas) return
  const v = tela0()
  for (let x = Math.floor(v.l) - 1; x <= Math.ceil(v.r); x++) for (let y = Math.floor(v.b) - 1; y <= Math.ceil(v.t); y++) {
    const t = mapa.get(chave(x, y))
    if (t === undefined) continue
    const info = D.tiles[t]
    const a = D.atlas[info.chave]
    const meio = info.tam / 2
    // bordas arredondadas para inteiros: sem frestas entre os blocos
    const x0 = Math.round((x + 0.5 - meio - cam.x) * S + W / 2), x1 = Math.round((x + 0.5 + meio - cam.x) * S + W / 2)
    const y0 = Math.round((cam.y - (y + 0.5 + meio)) * S + H / 2), y1 = Math.round((cam.y - (y + 0.5 - meio)) * S + H / 2)
    ctx.drawImage(atlas, a[0] + 0.5, a[1] + 0.5, a[2] - 1, a[3] - 1, x0, y0, x1 - x0, y1 - y0)
  }
}

function desenharPlaca(p: { tipo: string; x: number; y: number }) {
  const w = 7.54 * S * 0.7, h = 4.93 * S * 0.7
  const sx = (p.x - cam.x) * S + W / 2 - w / 2, sy = (cam.y - p.y) * S + H / 2 - h / 2
  if (sx > W || sx + w < 0) return
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(sx, sy, w, h)
  const g = ctx.createLinearGradient(sx, sy, sx + w, sy + h); g.addColorStop(0, '#1f7a43'); g.addColorStop(1, '#2f9157')
  ctx.fillStyle = g; ctx.fillRect(sx + w * 0.04, sy + h * 0.06, w * 0.92, h * 0.88)
  ctx.fillStyle = '#f4f1e6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const linhas = p.tipo === 'ad' ? ['A  ◀  andar  ▶  D'] : p.tipo === 'SpaceS' ? ['S: agachar e frear', 'Espaço: pular', 'J: atacar'] : ['Tutorial', 'pegue os 3 cristais']
  let tam = h * (linhas.length > 2 ? 0.15 : 0.19)
  ctx.font = `bold ${tam}px Georgia, serif`
  const maior = Math.max(...linhas.map((l) => ctx.measureText(l).width))
  if (maior > w * 0.84) { tam *= (w * 0.84) / maior; ctx.font = `bold ${tam}px Georgia, serif` }
  linhas.forEach((l, i) => ctx.fillText(l, sx + w / 2, sy + h / 2 + (i - (linhas.length - 1) / 2) * tam * 1.35))
}

function quadroDragao(): string {
  const A = D.sprites.dragao.anim
  if (jog.morto) return `die${Math.min(A.die, 1 + Math.floor(jog.morto * 10))}`
  if (estado === 'passando') return `win${1 + (Math.floor(jog.vitoria * 6) % A.win)}`
  if (jog.ataque >= 0) {
    const f = 1 + Math.min(2, Math.floor(jog.ataque * 11))
    return jog.agachado ? `crouch_ATK${f}` : !jog.chao ? `jumpATK${f}` : `attack${f}`
  }
  if (jog.agachado) return 'crouch2'
  if (!jog.chao) return jog.vy > 0 ? 'jump1' : 'jump2'
  if (Math.abs(jog.vx) > 0.3) return `walk${1 + (Math.floor(jog.anim * 12 * Math.min(1.6, Math.max(0.6, Math.abs(jog.vx) / 4))) % A.walk)}`
  return `idle${1 + (Math.floor(jog.anim * 8) % A.idle)}`
}

function desenhar() {
  ctx.fillStyle = 'rgb(49, 77, 121)' // cor de fundo da câmera no Unity
  ctx.fillRect(0, 0, W, H)
  if (!atlas) return
  ctx.imageSmoothingEnabled = true
  // fundos e camadas atrás do personagem, pela ordem de desenho do Unity
  const tras: [number, () => void][] = [
    ...fase.fundos.map((f): [number, () => void] => [f.ordem - 0.5, () => desenharFundo(f)]),
    ...desenho.filter((d) => d.camada.ordem < 0).map((d): [number, () => void] => [d.camada.ordem, () => desenharCamada(d.mapa)]),
  ]
  tras.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f())
  fase.placas.forEach(desenharPlaca)
  for (const d of desenho) if (d.camada.ordem >= 0 && d.camada.tipo !== 'decoracao') desenharCamada(d.mapa)

  // plataformas móveis
  for (const p of plataformas) peca(D.tiles[p.tile].chave, p.px - p.esc / 2, p.py + 0.5, p.esc, 1)
  // saída
  const sd = D.sprites.saida, [sx, sy] = fase.saida
  const brilho = 1 + Math.sin(tempo * 3) * 0.04
  ctx.globalAlpha = cristaisPegos >= CRISTAIS_PARA_PASSAR ? 1 : 0.55
  peca('s:saida', sx + sd.x * brilho, sy + sd.y * brilho, sd.w * brilho, sd.h * brilho)
  ctx.globalAlpha = 1
  // cristais
  const cr = D.sprites.cristal
  for (const k of cristais) if (!k.pego) peca('s:cristal', k.x + cr.x, k.y + cr.y + Math.sin(tempo * 2.5 + k.x) * 0.08, cr.w, cr.h)
  // inimigos
  const ini = D.sprites.inimigo
  for (const i of inimigos) if (i.vivo) peca('s:inimigo', i.x + ini.x, i.y + ini.y, ini.w, ini.h)
  // dragão
  const dr = D.sprites.dragao
  const q = quadroDragao()
  const filtro = jog.morto ? 'sepia(1) saturate(6) hue-rotate(-30deg) brightness(.85)' : estado === 'passando' ? 'hue-rotate(190deg) brightness(1.15)' : 'none'
  ctx.filter = filtro
  if (jog.dir > 0) peca(`d:${q}`, jog.x + dr.x, jog.y + dr.y, dr.w, dr.h)
  else peca(`d:${q}`, jog.x - dr.x - dr.w, jog.y + dr.y, dr.w, dr.h, true)
  ctx.filter = 'none'
  // explosões
  const ex = D.sprites.explosao.tam
  for (const e of explosoes) peca(`e:explosao${Math.min(6, 1 + Math.floor(e.t * 10))}`, e.x - ex / 2, e.y + ex / 2, ex, ex)
  // camadas da frente
  for (const d of desenho) if (d.camada.ordem >= 0 && d.camada.tipo === 'decoracao') desenharCamada(d.mapa)

  hud()
}

function hud() {
  const u = Math.max(1, H / 540)
  ctx.textBaseline = 'top'; ctx.textAlign = 'left'
  ctx.font = `bold ${16 * u}px "Trebuchet MS", sans-serif`
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(10 * u, 10 * u, 260 * u, 64 * u)
  ctx.fillStyle = '#ffd76a'; ctx.fillText(fase.titulo, 20 * u, 18 * u)
  // os 3 espaços de cristal (CanvasCristal)
  const a = D.atlas['s:cristal']
  for (let i = 0; i < CRISTAIS_PARA_PASSAR; i++) {
    ctx.globalAlpha = i < cristaisPegos ? 1 : 0.25
    if (atlas) ctx.drawImage(atlas, a[0], a[1], a[2], a[3], (20 + i * 26) * u, 40 * u, 16 * u, 28 * u)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#f4ecd8'; ctx.font = `bold ${15 * u}px "Trebuchet MS", sans-serif`
  ctx.fillText(`${cristaisPegos}/${CRISTAIS_PARA_PASSAR}`, 104 * u, 48 * u)
  if (msg.t > 0 && msg.texto) {
    ctx.globalAlpha = Math.min(1, msg.t * 2)
    ctx.font = `bold ${22 * u}px "Trebuchet MS", sans-serif`; ctx.textAlign = 'center'
    const larg = ctx.measureText(msg.texto).width + 40 * u
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - larg / 2, H * 0.16, larg, 44 * u)
    ctx.fillStyle = '#ffd76a'; ctx.fillText(msg.texto, W / 2, H * 0.16 + 10 * u)
    ctx.globalAlpha = 1
  }
}

/* ---------------- laço ---------------- */

let acc = 0, ultimo = performance.now()
function quadro(t: number) {
  const dt = Math.min(0.1, (t - ultimo) / 1000); ultimo = t
  if (!congelado && (estado === 'jogando' || estado === 'morrendo' || estado === 'passando')) {
    acc += dt
    while (acc >= DT) { passo(); acc -= DT }
    jog.anim += dt
    moverCamera(dt)
  } else acc = 0
  if (estado !== 'menu') desenhar()
  requestAnimationFrame(quadro)
}
requestAnimationFrame(quadro)

telaMenu.replaceChildren(Object.assign(document.createElement('h1'), { textContent: 'The Last Aula' }), Object.assign(document.createElement('p'), { textContent: 'Carregando…' }))
prontos.then(() => {
  const pedida = new URLSearchParams(location.search).get('fase')
  if (pedida && D.fases.some((f) => f.id === pedida)) iniciarFase(pedida)
  else mostrarMenu()
}, () => { telaMenu.querySelector('p')!.textContent = 'Não consegui carregar o jogo. Recarregue a página.' })

// para os testes automáticos
;(window as unknown as Record<string, unknown>).__lastAula = {
  estado: () => estado, fase: () => fase.id, cristais: () => cristaisPegos, jogador: () => ({ ...jog }),
  inimigosVivos: () => inimigos.filter((i) => i.vivo).length,
  irPara: (x: number, y: number, dir = 1) => { jog.x = x; jog.y = y; jog.vx = 0; jog.vy = 0; jog.dir = dir; cam.x = x; cam.y = y },
  congelar: (v: boolean) => { congelado = v },
  atacar: () => { if (jog.ataque < 0) { jog.ataque = 0; sons.ataque() } },
  iniciar: (id: string) => iniciarFase(id),
  dados: () => ({ cristais: fase.cristais, inimigos: fase.inimigos, saida: fase.saida }),
}
