import './estilo.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CHAO, LIMITE, caminho, enxerga, montarMundo, nascerJogador, nascerPolicia, pontoLivreAleatorio, raioNasCaixas, resolverCirculo } from './mundo'
import { RedeEtp, criarPerfil, meuPerfil, pedirSala, trocarApelido } from './rede-etp'
import { type EstadoEtp, type InfoSalaEtp, type ModoEtp, type MsgServidorEtp, type PoseEtp, type TimeEtp, GRANADAS_POR_RODADA, VAGAS_ETP } from './protocolo-etp'

// Escape The Police — releitura web do jogo de tiro em primeira pessoa feito em Unity (2021).
// O mapa, a pistola, os sons e os valores (pente de 9 balas, 5 de vida, policiais que enxergam longe)
// vêm do build original. Corrigido: o tiro do jogador não feria os policiais, o jogador só morria
// com a vida exatamente em 0, os policiais se acertavam entre si e não havia fim claro.

/* ---------------- configuração ---------------- */

const VIDA_JOGADOR = 5
const VIDA_POLICIAL = 5
const PENTE = 9
const ANDAR = 5.5, CORRER = 9 // FpsControllerLPFP: walkingSpeed 5, runningSpeed 9
const ALTURA_OLHO = 1.7, RAIO_JOGADOR = 0.45
const ONDAS = [2, 4, 6] // a cena original tinha 2 policiais (maxEnemiesAtLevel)
const GRANADAS_INICIO = 2

const ehToque = matchMedia('(pointer: coarse)').matches
const SOMBRAS = !ehToque

/* ---------------- tela e renderizador ---------------- */

const app = document.getElementById('app') as HTMLDivElement
const renderizador = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 1.5, powerPreference: 'high-performance' })
renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, ehToque ? 1.25 : 1.5))
renderizador.outputColorSpace = THREE.SRGBColorSpace
renderizador.shadowMap.enabled = SOMBRAS
renderizador.shadowMap.type = THREE.PCFShadowMap
renderizador.autoClear = false
app.append(renderizador.domElement)

const cena = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 600)
cena.add(camera)
// a arma é desenhada numa cena própria, por cima, para não atravessar as paredes
const cenaArma = new THREE.Scene()
const cameraArma = new THREE.PerspectiveCamera(55, 1, 0.01, 10)
cenaArma.add(cameraArma)

cena.add(new THREE.HemisphereLight(0xdfe9ff, 0x5a4a3a, 1.6))
const sol = new THREE.DirectionalLight(0xfff1dc, 2.2)
sol.position.set(40, 80, 30)
if (SOMBRAS) {
  sol.castShadow = true
  sol.shadow.mapSize.set(2048, 2048)
  const s = sol.shadow.camera as THREE.OrthographicCamera
  s.left = -70; s.right = 70; s.top = 70; s.bottom = -70; s.near = 1; s.far = 220
  sol.shadow.bias = -0.0008
}
cena.add(sol, sol.target)
cenaArma.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2))
const luzArma = new THREE.DirectionalLight(0xffffff, 1.4); luzArma.position.set(1, 2, 1); cenaArma.add(luzArma)

function ajustar() {
  const w = app.clientWidth, h = app.clientHeight
  renderizador.setSize(w, h)
  camera.aspect = w / h; camera.updateProjectionMatrix()
  cameraArma.aspect = w / h; cameraArma.updateProjectionMatrix()
}
window.addEventListener('resize', ajustar)
ajustar()

/* ---------------- HUD ---------------- */

app.insertAdjacentHTML('beforeend', `
  <div class="hud" id="hud" hidden>
    <div class="mira"><i></i><i></i><i></i><i></i></div>
    <div class="acerto" id="acerto"></div>
    <div class="dano" id="dano"></div>
    <div class="topo-esq">
      <div class="onda" id="onda"></div>
      <div class="policiais" id="policiais"></div>
    </div>
    <canvas class="radar" id="radar" width="160" height="160"></canvas>
    <div class="base-esq"><div class="vida"><span>VIDA</span><div class="barra"><div id="vida"></div></div></div></div>
    <div class="base-dir"><div class="municao" id="municao"></div><div class="granadas" id="granadas"></div></div>
    <div class="aviso" id="aviso"></div>
  </div>
  <div class="toque" id="toque" hidden>
    <div class="analogico" id="analogico"><div id="pino"></div></div>
    <button class="tq atirar" data-k="atirar">ATIRAR</button>
    <button class="tq pular" data-k="pular">PULAR</button>
    <button class="tq recarregar" data-k="recarregar">R</button>
    <button class="tq granada" data-k="granada">💣</button>
    <button class="tq correr" data-k="correr">🏃</button>
  </div>
  <div class="topo-dir"><button class="icone" id="som" title="Som">🔊</button><button class="icone" id="pausar" title="Pausar (Esc)">⏸</button></div>
  <section class="tela" id="tela"></section>`)
const $ = (id: string) => document.getElementById(id) as HTMLElement
const hud = $('hud'), telaEl = $('tela'), toqueEl = $('toque')
const radar = $('radar') as HTMLCanvasElement
const rctx = radar.getContext('2d') as CanvasRenderingContext2D

/* ---------------- som ---------------- */

let audio: AudioContext | null = null
const buffers: Record<string, AudioBuffer> = {}
let mudo = false
try { mudo = localStorage.getItem('etp-mudo') === '1' } catch { /* sem storage */ }
$('som').textContent = mudo ? '🔇' : '🔊'
function destravarSom() {
  if (!audio) {
    audio = new AudioContext()
    for (const n of ['tiro', 'recarga', 'recargaVazia', 'impacto', 'impacto2', 'explosao', 'sacar', 'baque']) {
      fetch(`sons/${n}.ogg`).then((r) => r.arrayBuffer()).then((b) => (audio as AudioContext).decodeAudioData(b)).then((b) => { buffers[n] = b }).catch(() => { /* navegador sem ogg: usa o sintetizado */ })
    }
  }
  void audio.resume()
}
function bipe(freq: number, dur: number, tipo: OscillatorType, vol: number, ate?: number) {
  if (!audio || mudo) return
  const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain()
  o.type = tipo; o.frequency.setValueAtTime(freq, t); if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur)
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.02)
}
function tocar(nome: string, vol = 0.6, pos?: THREE.Vector3) {
  if (!audio || mudo) return
  let v = vol
  if (pos) v *= Math.max(0.05, 1 - pos.distanceTo(camera.position) / 90)
  const b = buffers[nome]
  if (!b) { // reserva sintetizada
    if (nome === 'tiro') bipe(220, 0.12, 'sawtooth', 0.12 * v, 60)
    else if (nome === 'explosao') bipe(90, 0.6, 'sawtooth', 0.3 * v, 30)
    else bipe(500, 0.08, 'square', 0.05 * v)
    return
  }
  const s = audio.createBufferSource(), g = audio.createGain()
  s.buffer = b; s.playbackRate.value = 0.94 + Math.random() * 0.12; g.gain.value = v
  s.connect(g).connect(audio.destination); s.start()
}
$('som').onclick = () => { mudo = !mudo; $('som').textContent = mudo ? '🔇' : '🔊'; try { localStorage.setItem('etp-mudo', mudo ? '1' : '0') } catch { /* ignora */ } }

/* ---------------- estado ---------------- */

type Estado = 'carregando' | 'menu' | 'jogando' | 'pausa' | 'fim'
let estado: Estado = 'carregando'
const jog = { pos: nascerJogador.clone(), vy: 0, noChao: true, yaw: 0, pitch: 0, vida: VIDA_JOGADOR, municao: PENTE, recarregando: 0, cadencia: 0, granadas: GRANADAS_INICIO, recuo: 0, passo: 0, ultimoDano: -10, tremor: 0 }
let onda = 0, abatidos = 0, aNascer = 0, proximoNascer = 0, tempoJogo = 0, intervalo = 0
const tecla = { frente: false, tras: false, esq: false, dir: false, correr: false, pular: false, atirar: false, recarregar: false, granada: false }

/* ---------------- arma (pistola do Low Poly FPS Pack) ---------------- */

const arma = new THREE.Group()
cameraArma.add(arma)
const clarao = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaClarao(), color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
clarao.scale.set(0.16, 0.16, 1); clarao.visible = false
const luzTiro = new THREE.PointLight(0xffc070, 0, 14) // fica sempre na cena: ligar não recompila os materiais
camera.add(luzTiro); luzTiro.position.set(0.2, -0.1, -0.6)

function texturaClarao() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,220,140,.9)'); r.addColorStop(1, 'rgba(255,140,40,0)')
  g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

/* ---------------- policiais ---------------- */

interface Policial {
  grupo: THREE.Group; pos: THREE.Vector3; vida: number; vivo: boolean; morto: number
  rumo: number; caminho: THREE.Vector3[]; recalcular: number; viu: number; ultimoVisto: THREE.Vector3 | null
  recarga: number; barra: THREE.Mesh; barraFundo: THREE.Mesh; andar: number; sirene: THREE.Mesh
}
const policiais: Policial[] = []
const matFarda = new THREE.MeshLambertMaterial({ color: 0x1c3a7a })
const matPele = new THREE.MeshLambertMaterial({ color: 0xd9a37a })
const matQuepe = new THREE.MeshLambertMaterial({ color: 0x111827 })
const matDistintivo = new THREE.MeshLambertMaterial({ color: 0xf2c94c, emissive: 0x403000 })
const matCinto = new THREE.MeshLambertMaterial({ color: 0x0b0f19 })
const geoCorpo = new THREE.CapsuleGeometry(0.42, 0.7, 4, 10)
const geoCabeca = new THREE.SphereGeometry(0.3, 14, 10)
const geoQuepe = new THREE.CylinderGeometry(0.31, 0.33, 0.18, 14)
const geoAba = new THREE.BoxGeometry(0.42, 0.04, 0.22)
const geoDistintivo = new THREE.BoxGeometry(0.14, 0.16, 0.04)
const geoCinto = new THREE.CylinderGeometry(0.44, 0.44, 0.1, 14)
const geoBarra = new THREE.PlaneGeometry(1, 0.1)
const matBarra = new THREE.MeshBasicMaterial({ color: 0xff3b3b, depthTest: false })
const matBarraFundo = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthTest: false })
const geoSirene = new THREE.BoxGeometry(0.16, 0.08, 0.08)

/** Boneco (policial no solo; jogador com a farda do time no online). */
function criarBoneco(farda: THREE.Material, comSirene: boolean) {
  const g = new THREE.Group()
  const corpo = new THREE.Mesh(geoCorpo, farda); corpo.position.y = 0.8
  const cinto = new THREE.Mesh(geoCinto, matCinto); cinto.position.y = 0.66
  const cabeca = new THREE.Mesh(geoCabeca, matPele); cabeca.position.y = 1.76
  const quepe = new THREE.Mesh(geoQuepe, matQuepe); quepe.position.y = 2.0
  const aba = new THREE.Mesh(geoAba, matQuepe); aba.position.set(0, 1.93, 0.25)
  const dist = new THREE.Mesh(geoDistintivo, matDistintivo); dist.position.set(0.17, 1.15, 0.39)
  const sirene = new THREE.Mesh(geoSirene, new THREE.MeshBasicMaterial({ color: 0xff2020 })); sirene.position.set(0, 2.13, 0); sirene.visible = comSirene
  for (const m of [corpo, cabeca, quepe]) m.castShadow = SOMBRAS
  const barraFundo = new THREE.Mesh(geoBarra, matBarraFundo); barraFundo.position.y = 2.45; barraFundo.renderOrder = 10
  const barra = new THREE.Mesh(geoBarra, matBarra); barra.position.y = 2.45; barra.renderOrder = 11
  barra.visible = barraFundo.visible = false
  g.add(corpo, cinto, cabeca, quepe, aba, dist, sirene, barraFundo, barra)
  cena.add(g)
  return { grupo: g, barra, barraFundo, sirene }
}

function criarPolicial(pos: THREE.Vector3) {
  const { grupo: g, barra, barraFundo, sirene } = criarBoneco(matFarda, true)
  g.position.copy(pos)
  policiais.push({ grupo: g, pos: g.position, vida: VIDA_POLICIAL, vivo: true, morto: 0, rumo: Math.random() * Math.PI * 2, caminho: [], recalcular: 0, viu: 0, ultimoVisto: null, recarga: 1.5 + Math.random(), barra, barraFundo, andar: Math.random() * 10, sirene })
}

/* ---------------- projéteis e efeitos ---------------- */

interface Bala { malha: THREE.Mesh; vel: THREE.Vector3; vida: number }
const balas: Bala[] = []
const geoBala = new THREE.SphereGeometry(0.14, 8, 6)
const matBala = new THREE.MeshBasicMaterial({ color: 0xffa02a })
const matRastro = new THREE.LineBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.8 })
interface Efeito { obj: THREE.Object3D; vida: number; total: number; tipo: 'rastro' | 'faisca' | 'explosao' }
const efeitos: Efeito[] = []
const texFaisca = texturaClarao()
interface Granada { malha: THREE.Mesh; vel: THREE.Vector3; tempo: number; remota?: boolean }
const granadas: Granada[] = []
const geoGranada = new THREE.SphereGeometry(0.13, 10, 8)
const matGranada = new THREE.MeshLambertMaterial({ color: 0x3f5a2a })

function faisca(p: THREE.Vector3, cor = 0xffd27a, tam = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFaisca, color: cor, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  s.position.copy(p); s.scale.setScalar(tam)
  cena.add(s); efeitos.push({ obj: s, vida: 0.18, total: 0.18, tipo: 'faisca' })
}

/* ---------------- entrada ---------------- */

const TECLAS: Record<string, keyof typeof tecla> = { KeyW: 'frente', ArrowUp: 'frente', KeyS: 'tras', ArrowDown: 'tras', KeyA: 'esq', ArrowLeft: 'esq', KeyD: 'dir', ArrowRight: 'dir', ShiftLeft: 'correr', ShiftRight: 'correr', Space: 'pular', KeyR: 'recarregar', KeyG: 'granada' }
window.addEventListener('keydown', (e) => { const k = TECLAS[e.code]; if (k) { tecla[k] = true; e.preventDefault() } if (e.code === 'KeyP') alternarPausa() })
window.addEventListener('keyup', (e) => { const k = TECLAS[e.code]; if (k) tecla[k] = false })
window.addEventListener('blur', () => { for (const k of Object.keys(tecla) as (keyof typeof tecla)[]) tecla[k] = false })
const canvas = renderizador.domElement
canvas.addEventListener('mousedown', (e) => {
  if (estado !== 'jogando') return
  if (document.pointerLockElement !== canvas) { travarMouse(); return }
  if (e.button === 0) tecla.atirar = true
})
window.addEventListener('mouseup', (e) => { if (e.button === 0) tecla.atirar = false })
const SENS = 0.0022
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || estado !== 'jogando') return
  // ignora saltos gigantes que alguns navegadores mandam ao travar o mouse
  if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return
  jog.yaw -= e.movementX * SENS
  jog.pitch = Math.max(-1.45, Math.min(1.45, jog.pitch - e.movementY * SENS))
})
function travarMouse() { if (!ehToque) canvas.requestPointerLock?.() }
document.addEventListener('pointerlockchange', () => {
  // Esc solta o mouse: pausa
  if (document.pointerLockElement !== canvas && estado === 'jogando' && !ehToque) alternarPausa()
})
$('pausar').onclick = () => alternarPausa()

// toque: analógico à esquerda, arrastar à direita para olhar, botões
if (ehToque) {
  const anal = $('analogico'), pino = $('pino')
  let idAnal = -1, ax0 = 0, ay0 = 0, idOlhar = -1, ox = 0, oy = 0
  const mover = { x: 0, y: 0 }
  ;(window as unknown as { __mover: typeof mover }).__mover = mover
  anal.addEventListener('pointerdown', (e) => { idAnal = e.pointerId; ax0 = e.clientX; ay0 = e.clientY; anal.setPointerCapture(e.pointerId); destravarSom() })
  anal.addEventListener('pointermove', (e) => {
    if (e.pointerId !== idAnal) return
    let dx = e.clientX - ax0, dy = e.clientY - ay0
    const d = Math.hypot(dx, dy), max = 50
    if (d > max) { dx *= max / d; dy *= max / d }
    pino.style.transform = `translate(${dx}px, ${dy}px)`
    mover.x = dx / max; mover.y = dy / max
  })
  const soltar = (e: PointerEvent) => { if (e.pointerId !== idAnal) return; idAnal = -1; mover.x = mover.y = 0; pino.style.transform = '' }
  anal.addEventListener('pointerup', soltar); anal.addEventListener('pointercancel', soltar)
  canvas.addEventListener('pointerdown', (e) => { if (e.clientX > innerWidth * 0.35) { idOlhar = e.pointerId; ox = e.clientX; oy = e.clientY } })
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== idOlhar || estado !== 'jogando') return
    jog.yaw -= (e.clientX - ox) * 0.006; jog.pitch = Math.max(-1.4, Math.min(1.4, jog.pitch - (e.clientY - oy) * 0.006))
    ox = e.clientX; oy = e.clientY
  })
  canvas.addEventListener('pointerup', (e) => { if (e.pointerId === idOlhar) idOlhar = -1 })
  for (const b of toqueEl.querySelectorAll<HTMLButtonElement>('.tq')) {
    const k = b.dataset.k as keyof typeof tecla
    const on = (e: Event) => { e.preventDefault(); destravarSom(); if (k === 'correr') { tecla.correr = !tecla.correr; b.classList.toggle('ativo', tecla.correr) } else { tecla[k] = true; b.classList.add('ativo') } }
    const off = (e: Event) => { e.preventDefault(); if (k !== 'correr') { tecla[k] = false; b.classList.remove('ativo') } }
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off)
  }
}
const moverToque = () => (window as unknown as { __mover?: { x: number; y: number } }).__mover

/* ---------------- telas ---------------- */

function tela(titulo: string, textos: string[], ...botoes: [string, () => void, string?][]) {
  const h = document.createElement('h1'); h.textContent = titulo
  const ps = textos.map((t, i) => { const p = document.createElement('p'); p.textContent = t; if (i > 0) p.className = 'pequeno'; return p })
  const caixa = document.createElement('div'); caixa.className = 'botoes'
  for (const [t, f, c] of botoes) { const b = document.createElement('button'); b.className = 'btn ' + (c || ''); b.textContent = t; b.onclick = () => { destravarSom(); f() }; caixa.append(b) }
  telaEl.replaceChildren(h, ...ps, caixa)
  telaEl.hidden = false
  ;(caixa.firstElementChild as HTMLButtonElement | null)?.focus()
}
const CONTROLES = ehToque ? 'Analógico anda · arraste à direita para mirar · ATIRAR, R recarrega, 💣 granada, 🏃 correr' : 'WASD anda · mouse mira · clique atira · Shift corre · Espaço pula · R recarrega · G granada · Esc pausa'
let recorde = 0
try { recorde = Number(localStorage.getItem('etp-recorde') || 0) } catch { /* ignora */ }
function menu() {
  estado = 'menu'; hud.hidden = true; toqueEl.hidden = true
  tela('Escape The Police', [
    'A polícia cercou a cidade murada. Sobreviva a 3 ondas de policiais: eles patrulham o mapa, enxergam você de longe e atiram. Use os muros e os prédios para se proteger, recarregue a pistola e jogue granadas. Ou chame os amigos para o online: 1x1 ou 2x2.',
    CONTROLES,
    recorde ? `Seu melhor tempo: ${formatar(recorde)}` : 'Jogo original em Unity (2021), refeito para o navegador.',
  ], ['Contra a polícia', iniciar], ['Online 1x1', () => void telaOnline('1x1')], ['Online 2x2', () => void telaOnline('2x2')])
}
const formatar = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function alternarPausa() {
  if (modo === 'online') {
    if (estado === 'jogando') {
      estado = 'pausa'
      if (document.pointerLockElement) document.exitPointerLock()
      tela('Menu', ['A partida continua enquanto este menu está aberto.', CONTROLES], ['Continuar', () => { telaEl.hidden = true; estado = 'jogando'; travarMouse() }], ['Sair da partida', () => sairOnline(), 'claro'])
    } else if (estado === 'pausa') { telaEl.hidden = true; estado = 'jogando'; travarMouse() }
    return
  }
  if (estado === 'jogando') {
    estado = 'pausa'
    if (document.pointerLockElement) document.exitPointerLock()
    tela('Pausado', [`Onda ${onda + 1} de ${ONDAS.length} · ${abatidos} policiais abatidos`, CONTROLES], ['Continuar', () => { telaEl.hidden = true; estado = 'jogando'; travarMouse() }], ['Recomeçar', iniciar, 'claro'], ['Menu', menu, 'claro'])
  } else if (estado === 'pausa') { telaEl.hidden = true; estado = 'jogando'; travarMouse() }
}

/* ---------------- partida ---------------- */

function limparPartida() {
  for (const p of policiais) cena.remove(p.grupo)
  policiais.length = 0
  for (const b of balas) cena.remove(b.malha)
  balas.length = 0
  for (const g of granadas) cena.remove(g.malha)
  granadas.length = 0
  for (const e of efeitos) cena.remove(e.obj)
  efeitos.length = 0
}

function iniciar() {
  limparPartida()
  Object.assign(jog, { vy: 0, noChao: true, yaw: Math.PI, pitch: 0, vida: VIDA_JOGADOR, municao: PENTE, recarregando: 0, cadencia: 0, granadas: GRANADAS_INICIO, recuo: 0, passo: 0, ultimoDano: -10, tremor: 0 })
  jog.pos.copy(nascerJogador)
  onda = 0; abatidos = 0; tempoJogo = 0
  comecarOnda(0)
  estado = 'jogando'; telaEl.hidden = true; hud.hidden = false; toqueEl.hidden = !ehToque
  tocar('sacar', 0.5)
  travarMouse()
}

const NASCEDOUROS = () => [nascerPolicia, new THREE.Vector3(-nascerPolicia.x - 40, CHAO, nascerPolicia.z), new THREE.Vector3(100, CHAO, -20)]
function comecarOnda(i: number) {
  onda = i; aNascer = ONDAS[i]; proximoNascer = 1.5; intervalo = 0
  if (i > 0) { jog.vida = Math.min(VIDA_JOGADOR, jog.vida + 2); jog.granadas++ }
  aviso(`Onda ${i + 1} de ${ONDAS.length}: ${ONDAS[i]} policiais`, 3)
}

let avisoT = 0
function aviso(t: string, dur = 2.5) { $('aviso').textContent = t; $('aviso').classList.add('on'); avisoT = dur }

function morrerJogador() {
  estado = 'fim'
  if (document.pointerLockElement) document.exitPointerLock()
  tocar('baque', 0.8)
  setTimeout(() => tela('Você foi preso!', [`Onda ${onda + 1} de ${ONDAS.length} · ${abatidos} policiais abatidos · ${formatar(tempoJogo)}`], ['Tentar de novo', iniciar], ['Menu', menu, 'claro']), 900)
}
function vencer() {
  estado = 'fim'
  if (document.pointerLockElement) document.exitPointerLock()
  const novo = !recorde || tempoJogo < recorde
  if (novo) { recorde = tempoJogo; try { localStorage.setItem('etp-recorde', String(tempoJogo)) } catch { /* ignora */ } }
  tela('Você escapou da polícia!', [`${abatidos} policiais abatidos em ${formatar(tempoJogo)}${novo ? ' · novo recorde!' : ''}`], ['Jogar de novo', iniciar], ['Menu', menu, 'claro'])
}

/* ---------------- passo do jogo ---------------- */

const frente = new THREE.Vector3(), lado = new THREE.Vector3(), olhoJog = new THREE.Vector3(), tmp = new THREE.Vector3()
const raio = new THREE.Ray()

function atualizarJogador(dt: number) {
  // online: só se mexe e atira durante a rodada, vivo
  if (modo === 'online' && !(vivoOn && estOn?.fase === 'rodada')) return
  // movimento
  frente.set(-Math.sin(jog.yaw), 0, -Math.cos(jog.yaw))
  lado.set(-frente.z, 0, frente.x)
  let mx = (tecla.dir ? 1 : 0) - (tecla.esq ? 1 : 0), mz = (tecla.frente ? 1 : 0) - (tecla.tras ? 1 : 0)
  const t = moverToque()
  if (t && (t.x || t.y)) { mx = t.x; mz = -t.y }
  const len = Math.hypot(mx, mz)
  if (len > 1) { mx /= len; mz /= len }
  const vel = tecla.correr && mz > 0 && jog.recarregando <= 0 ? CORRER : ANDAR
  jog.pos.addScaledVector(frente, mz * vel * dt).addScaledVector(lado, mx * vel * dt)
  if (len > 0.1 && jog.noChao) jog.passo += dt * vel * 1.6
  // pulo e gravidade
  if (tecla.pular && jog.noChao) { jog.vy = 6.2; jog.noChao = false }
  jog.vy -= 18 * dt
  jog.pos.y += jog.vy * dt
  const chao = resolverCirculo(jog.pos, RAIO_JOGADOR, 1.8)
  if (jog.pos.y <= chao) { jog.pos.y = chao; jog.vy = 0; jog.noChao = true } else jog.noChao = false

  // arma
  jog.cadencia -= dt; jog.recuo = Math.max(0, jog.recuo - dt * 6)
  if (jog.recarregando > 0) { jog.recarregando -= dt; if (jog.recarregando <= 0) jog.municao = PENTE }
  if ((tecla.recarregar || (jog.municao === 0 && tecla.atirar)) && jog.recarregando <= 0 && jog.municao < PENTE) {
    jog.recarregando = jog.municao === 0 ? 1.6 : 1.3
    tocar(jog.municao === 0 ? 'recargaVazia' : 'recarga', 0.6)
  }
  if (tecla.atirar && jog.cadencia <= 0 && jog.recarregando <= 0 && jog.municao > 0) atirar()
  if (tecla.granada && jog.granadas > 0 && !granadaTravada) { lancarGranada(); granadaTravada = true }
  if (!tecla.granada) granadaTravada = false
}
let granadaTravada = false

function atirar() {
  jog.municao--; jog.cadencia = 0.2; jog.recuo = 1
  tocar('tiro', 0.55)
  clarao.visible = true; clarao.material.rotation = Math.random() * 6; luzTiro.intensity = 6
  setTimeout(() => { clarao.visible = false; luzTiro.intensity = 0 }, 55)
  camera.getWorldPosition(olhoJog)
  camera.getWorldDirection(tmp)
  raio.set(olhoJog, tmp)
  // parede mais perto
  const dParede = raioNasCaixas(olhoJog, tmp, 300)
  // online: adversário mais perto no raio (cabeça e tronco); o servidor confere e aplica o dano
  if (modo === 'online') {
    const time = meuTime()
    let alvoId: string | undefined, dOn = Infinity, cabecaOn = false
    const c = new THREE.Vector3()
    for (const r of remotos.values()) {
      if (!r.vivo || r.time === time) continue
      for (const [y, rr, ehCabeca] of [[1.78, 0.32, true], [1.15, 0.47, false], [0.55, 0.45, false]] as [number, number, boolean][]) {
        c.set(r.grupo.position.x, r.alvo.y + y, r.grupo.position.z)
        if (raio.distanceSqToPoint(c) > rr * rr) continue
        const dist = olhoJog.distanceTo(c)
        if (dist < dOn) { dOn = dist; alvoId = r.id; cabecaOn = ehCabeca }
      }
    }
    const acertou = alvoId !== undefined && dOn < dParede
    const d = [tmp.x, tmp.y, tmp.z].map((v) => Math.round(v * 1000) / 1000) as [number, number, number]
    rede?.mandar(acertou ? { k: 'tiro', d, alvo: alvoId, cabeca: cabecaOn } : { k: 'tiro', d })
    const pontoOn = olhoJog.clone().addScaledVector(tmp, Math.min(dParede, acertou ? dOn : 300, 300))
    const inicioOn = new THREE.Vector3(0.18, -0.16, -0.7).applyMatrix4(camera.matrixWorld)
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([inicioOn, pontoOn]), matRastro)
    cena.add(l); efeitos.push({ obj: l, vida: 0.06, total: 0.06, tipo: 'rastro' })
    if (acertou) faisca(pontoOn, cabecaOn ? 0xff4040 : 0xff8060, 0.45)
    else if (dParede < 300) { faisca(pontoOn, 0xffd27a, 0.35); tocar(Math.random() < 0.5 ? 'impacto' : 'impacto2', 0.3, pontoOn) }
    return
  }
  // policial mais perto no raio (corpo como esfera alongada: cabeça e tronco)
  let alvo: Policial | null = null, dAlvo = Infinity, cabeca = false
  const centro = new THREE.Vector3()
  for (const p of policiais) {
    if (!p.vivo) continue
    for (const [y, r, ehCabeca] of [[1.78, 0.32, true], [1.15, 0.47, false], [0.55, 0.45, false]] as [number, number, boolean][]) {
      centro.set(p.pos.x, p.pos.y + y, p.pos.z)
      const d = raio.distanceSqToPoint(centro)
      if (d > r * r) continue
      const dist = olhoJog.distanceTo(centro)
      if (dist < dAlvo) { dAlvo = dist; alvo = p; cabeca = ehCabeca }
    }
  }
  const fim = Math.min(dParede, dAlvo, 300)
  const ponto = olhoJog.clone().addScaledVector(tmp, fim)
  // rastro saindo da arma
  const inicio = new THREE.Vector3(0.18, -0.16, -0.7).applyMatrix4(camera.matrixWorld)
  const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints([inicio, ponto]), matRastro)
  cena.add(linha); efeitos.push({ obj: linha, vida: 0.06, total: 0.06, tipo: 'rastro' })
  if (alvo && dAlvo < dParede) {
    ferirPolicial(alvo, cabeca ? 2 : 1)
    faisca(ponto, cabeca ? 0xff4040 : 0xff8060, 0.45)
    const a = $('acerto'); a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); if (cabeca) a.classList.add('cabeca'); else a.classList.remove('cabeca')
  } else if (dParede < 300) { faisca(ponto, 0xffd27a, 0.35); tocar(Math.random() < 0.5 ? 'impacto' : 'impacto2', 0.3, ponto) }
  // o barulho do tiro chama os policiais por perto
  for (const p of policiais) if (p.vivo && p.pos.distanceTo(jog.pos) < 45) { p.ultimoVisto = jog.pos.clone(); p.recalcular = 0 }
}

function ferirPolicial(p: Policial, dano: number) {
  if (!p.vivo) return
  p.vida -= dano
  p.ultimoVisto = jog.pos.clone(); p.recalcular = 0
  p.barra.visible = p.barraFundo.visible = true
  p.barra.scale.x = Math.max(0, p.vida / VIDA_POLICIAL)
  if (p.vida <= 0) {
    p.vivo = false; abatidos++
    p.barra.visible = p.barraFundo.visible = false
    tocar('baque', 0.5, p.pos)
  }
}

function lancarGranada() {
  jog.granadas--
  camera.getWorldPosition(olhoJog); camera.getWorldDirection(tmp)
  const m = new THREE.Mesh(geoGranada, matGranada)
  m.position.copy(olhoJog).addScaledVector(tmp, 0.6)
  m.castShadow = SOMBRAS
  cena.add(m)
  const vel = tmp.clone().multiplyScalar(17).add(new THREE.Vector3(0, 5, 0))
  granadas.push({ malha: m, vel, tempo: 2.2 })
  const r2 = (v: number) => Math.round(v * 100) / 100
  if (modo === 'online') rede?.mandar({ k: 'granada', o: [r2(m.position.x), r2(m.position.y), r2(m.position.z)], v: [r2(vel.x), r2(vel.y), r2(vel.z)] })
}

/** Só o efeito (som, clarão e tremor), sem dano: usado no online, onde o dano vem do servidor. */
function explodirVisual(p: THREE.Vector3) {
  tocar('explosao', 0.9, p)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFaisca, color: 0xff8a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  s.position.copy(p).setY(p.y + 1); s.scale.setScalar(2)
  cena.add(s); efeitos.push({ obj: s, vida: 0.6, total: 0.6, tipo: 'explosao' })
  jog.tremor = Math.max(jog.tremor, Math.max(0, 1 - jog.pos.distanceTo(p) / 40))
}

function explodir(p: THREE.Vector3) {
  tocar('explosao', 0.9, p)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFaisca, color: 0xff8a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  s.position.copy(p).setY(p.y + 1); s.scale.setScalar(2)
  cena.add(s); efeitos.push({ obj: s, vida: 0.6, total: 0.6, tipo: 'explosao' })
  const RAIO = 9
  for (const pol of policiais) {
    if (!pol.vivo) continue
    const d = pol.pos.distanceTo(p)
    if (d < RAIO && enxerga(p.clone().setY(p.y + 0.5), pol.pos.clone().setY(pol.pos.y + 1))) ferirPolicial(pol, Math.ceil(7 * (1 - d / RAIO)))
  }
  const dj = jog.pos.distanceTo(p)
  if (dj < RAIO * 0.7) ferirJogador(Math.ceil(3 * (1 - dj / (RAIO * 0.7))), p)
  jog.tremor = Math.max(jog.tremor, Math.max(0, 1 - dj / 40))
}

let invencivel = false // só para os testes automáticos
function ferirJogador(dano: number, de: THREE.Vector3) {
  if (estado !== 'jogando' || dano <= 0 || invencivel) return
  jog.vida = Math.max(0, jog.vida - dano) // no original só morria com a vida exatamente em 0
  jog.ultimoDano = tempoJogo
  jog.tremor = Math.max(jog.tremor, 0.35)
  const d = $('dano')
  // de que lado veio o tiro
  const ang = Math.atan2(de.x - jog.pos.x, de.z - jog.pos.z) - Math.atan2(-Math.sin(jog.yaw), -Math.cos(jog.yaw))
  d.style.setProperty('--ang', `${-ang}rad`)
  d.classList.remove('on'); void d.offsetWidth; d.classList.add('on')
  tocar('impacto', 0.6)
  if (jog.vida <= 0) morrerJogador()
}

const _alvo = new THREE.Vector3()
function atualizarPoliciais(dt: number) {
  // nascimento escalonado (no original todos nasciam juntos, no mesmo ponto)
  if (aNascer > 0) {
    proximoNascer -= dt
    if (proximoNascer <= 0) {
      const pontos = NASCEDOUROS()
      const base = pontos[(ONDAS[onda] - aNascer) % (onda === 0 ? 1 : pontos.length)]
      criarPolicial(base.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)))
      aNascer--; proximoNascer = 1.4
    }
  }
  camera.getWorldPosition(olhoJog)
  for (const p of policiais) {
    if (!p.vivo) {
      // cai de lado e some depois de 2 s (como o Die() do original)
      p.morto += dt
      p.grupo.rotation.z = Math.min(Math.PI / 2, p.morto * 5)
      p.grupo.position.y = CHAO + Math.min(0.45, p.morto * 1.5)
      if (p.morto > 2.2) p.grupo.visible = false
      continue
    }
    p.sirene.visible = Math.floor(tempoJogo * 4 + p.andar) % 2 === 0
    const olho = _alvo.set(p.pos.x, p.pos.y + 1.6, p.pos.z)
    const dist = p.pos.distanceTo(jog.pos)
    const ve = dist < 75 && enxerga(olho, olhoJog) // ReactiveTarget: raio de detecção 75 (agora sem enxergar através das paredes)
    if (ve) { p.viu = Math.min(1, p.viu + dt * 2.5); p.ultimoVisto = jog.pos.clone() } else p.viu = Math.max(0, p.viu - dt)

    let destino: THREE.Vector3 | null = null
    let velocidade = 3.2
    if (ve && p.viu > 0.4) {
      // vê o jogador: gira para ele, chega mais perto se estiver longe e atira
      velocidade = dist > 22 ? 6.5 : dist > 10 ? 2.5 : 0
      destino = dist > 10 ? jog.pos : null
      p.rumo = Math.atan2(jog.pos.x - p.pos.x, jog.pos.z - p.pos.z)
      p.recarga -= dt
      if (p.recarga <= 0 && dist < 60) { atirarPolicial(p); p.recarga = 1.3 + Math.random() * 1.1 + onda * -0.15 }
      p.caminho = []
    } else if (p.ultimoVisto) {
      velocidade = 6.5 // persegue até o último lugar onde viu
      p.recalcular -= dt
      if (p.recalcular <= 0 || !p.caminho.length) { p.caminho = caminho(p.pos, p.ultimoVisto); p.recalcular = 1.2 }
      if (p.pos.distanceTo(p.ultimoVisto) < 2.5) { p.ultimoVisto = null; p.caminho = [] }
    } else {
      // patrulha: anda pelo mapa até pontos sorteados
      p.recalcular -= dt
      if (!p.caminho.length || p.recalcular <= -20) { p.caminho = caminho(p.pos, pontoLivreAleatorio()); p.recalcular = 0 }
    }
    if (!destino && p.caminho.length) {
      destino = p.caminho[0]
      if (Math.hypot(destino.x - p.pos.x, destino.z - p.pos.z) < 1.2) { p.caminho.shift(); destino = p.caminho[0] || null }
    }
    if (destino && velocidade > 0) {
      const dx = destino.x - p.pos.x, dz = destino.z - p.pos.z, d = Math.hypot(dx, dz)
      if (d > 0.01) {
        p.pos.x += (dx / d) * velocidade * dt; p.pos.z += (dz / d) * velocidade * dt
        if (!ve) p.rumo = Math.atan2(dx, dz)
        p.andar += dt * velocidade
      }
    }
    // separa os policiais entre si
    for (const q of policiais) if (q !== p && q.vivo) { const dx = p.pos.x - q.pos.x, dz = p.pos.z - q.pos.z, d = Math.hypot(dx, dz); if (d < 1.2 && d > 0.001) { p.pos.x += (dx / d) * (1.2 - d) * 0.5; p.pos.z += (dz / d) * (1.2 - d) * 0.5 } }
    resolverCirculo(p.pos, 0.5, 2)
    p.pos.y = CHAO + Math.abs(Math.sin(p.andar * 2.2)) * 0.06
    // gira suave
    let da = p.rumo - p.grupo.rotation.y
    da = Math.atan2(Math.sin(da), Math.cos(da))
    p.grupo.rotation.y += da * Math.min(1, dt * 8)
    // barra de vida olhando para a câmera
    if (p.barra.visible) { p.barra.quaternion.copy(camera.quaternion); p.barraFundo.quaternion.copy(camera.quaternion); p.barra.quaternion.premultiply(tmpQ.copy(p.grupo.quaternion).invert()); p.barraFundo.quaternion.copy(p.barra.quaternion) }
  }
  // fim da onda
  if (aNascer === 0 && policiais.length && policiais.every((p) => !p.vivo)) {
    intervalo += dt
    if (intervalo > 2.4) {
      for (const p of policiais) cena.remove(p.grupo)
      policiais.length = 0
      if (onda + 1 < ONDAS.length) comecarOnda(onda + 1)
      else vencer()
    }
  }
}
const tmpQ = new THREE.Quaternion()

function atirarPolicial(p: Policial) {
  const origem = new THREE.Vector3(p.pos.x, p.pos.y + 1.35, p.pos.z)
  origem.x += Math.sin(p.rumo) * 0.7; origem.z += Math.cos(p.rumo) * 0.7
  const alvo = jog.pos.clone().setY(jog.pos.y + 1.2)
  const dir = alvo.sub(origem).normalize()
  // imprecisão: mais erro de longe
  const erro = 0.035 + p.pos.distanceTo(jog.pos) * 0.0006
  dir.x += (Math.random() - 0.5) * erro * 2; dir.y += (Math.random() - 0.5) * erro; dir.z += (Math.random() - 0.5) * erro * 2
  dir.normalize()
  const m = new THREE.Mesh(geoBala, matBala)
  m.position.copy(origem)
  cena.add(m)
  balas.push({ malha: m, vel: dir.multiplyScalar(42), vida: 3 })
  tocar('tiro', 0.35, p.pos)
  faisca(origem, 0xffb050, 0.6)
}

const _dir = new THREE.Vector3(), _p = new THREE.Vector3()
function atualizarProjeteis(dt: number) {
  for (let i = balas.length - 1; i >= 0; i--) {
    const b = balas[i]
    const passo = b.vel.length() * dt
    _dir.copy(b.vel).normalize()
    const parede = raioNasCaixas(b.malha.position, _dir, passo)
    // acertou o jogador? (segmento contra o cilindro do jogador)
    _p.copy(b.malha.position)
    let acertou = false
    for (let k = 0; k <= 4; k++) {
      const q = _p.clone().addScaledVector(_dir, (passo * k) / 4)
      if (parede !== Infinity && (passo * k) / 4 > parede) break
      if (Math.hypot(q.x - jog.pos.x, q.z - jog.pos.z) < 0.55 && q.y > jog.pos.y && q.y < jog.pos.y + 1.9) { acertou = true; break }
    }
    b.vida -= dt
    if (acertou) { ferirJogador(1, b.malha.position); cena.remove(b.malha); balas.splice(i, 1); continue }
    if (parede !== Infinity || b.vida <= 0) { faisca(b.malha.position.clone().addScaledVector(_dir, Math.min(parede, passo)), 0xffb050, 0.3); cena.remove(b.malha); balas.splice(i, 1); continue }
    b.malha.position.addScaledVector(b.vel, dt)
  }
  for (let i = granadas.length - 1; i >= 0; i--) {
    const g = granadas[i]
    g.vel.y -= 18 * dt
    const ant = g.malha.position.clone()
    g.malha.position.addScaledVector(g.vel, dt)
    // quica no chão e nas paredes
    if (g.malha.position.y < CHAO + 0.13) { g.malha.position.y = CHAO + 0.13; g.vel.y *= -0.35; g.vel.x *= 0.7; g.vel.z *= 0.7 }
    const d = g.vel.clone(); const len = d.length() * dt
    if (len > 0 && raioNasCaixas(ant, d.normalize(), len) !== Infinity) { g.malha.position.copy(ant); g.vel.x *= -0.4; g.vel.z *= -0.4 }
    g.tempo -= dt
    if (g.tempo <= 0) {
      const p = g.malha.position.clone()
      if (modo === 'solo') explodir(p)
      else {
        explodirVisual(p)
        if (!g.remota) rede?.mandar({ k: 'explosao', p: [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, Math.round(p.z * 100) / 100] })
      }
      cena.remove(g.malha); granadas.splice(i, 1)
    }
  }
  for (let i = efeitos.length - 1; i >= 0; i--) {
    const e = efeitos[i]
    e.vida -= dt
    const f = Math.max(0, e.vida / e.total)
    if (e.tipo === 'explosao') { e.obj.scale.setScalar(2 + (1 - f) * 12); ((e.obj as THREE.Sprite).material as THREE.SpriteMaterial).opacity = f }
    else if (e.tipo === 'faisca') ((e.obj as THREE.Sprite).material as THREE.SpriteMaterial).opacity = f
    else ((e.obj as THREE.Line).material as THREE.LineBasicMaterial).opacity = 0.8 * f
    if (e.vida <= 0) {
      cena.remove(e.obj)
      if (e.tipo === 'rastro') (e.obj as THREE.Line).geometry.dispose()
      else ((e.obj as THREE.Sprite).material as THREE.SpriteMaterial).dispose()
      efeitos.splice(i, 1)
    }
  }
}

/* ---------------- online: 1x1 e 2x2 (backend-soudev, como a Praça) ---------------- */

let modo: 'solo' | 'online' = 'solo'
let rede: RedeEtp | null = null
let eu = ''
let salaOn: InfoSalaEtp | null = null
let estOn: EstadoEtp | null = null
let estOnEm = 0
let vivoOn = true
let ultimaPose = 0
const NOME_TIME: Record<TimeEtp, string> = { A: 'Azul', B: 'Vermelho' }
const matTime: Record<TimeEtp, THREE.Material> = { A: new THREE.MeshLambertMaterial({ color: 0x1d4ed8 }), B: new THREE.MeshLambertMaterial({ color: 0xb91c1c }) }
interface Remoto { id: string; nome: string; time: TimeEtp; grupo: THREE.Group; alvo: THREE.Vector3; yaw: number; vivo: boolean; vida: number; morto: number; barra: THREE.Mesh; barraFundo: THREE.Mesh; nomeTag: THREE.Sprite; andar: number }
const remotos = new Map<string, Remoto>()
const ERROS_SALA: Record<string, string> = { cheia: 'A sala está cheia.', fechada: 'A partida já começou nessa sala.', invalida: 'Sala não encontrada.', duplicado: 'Você abriu o jogo em outra aba.' }

const meuTime = (): TimeEtp | null => estOn?.jogadores.find((j) => j.id === eu)?.time ?? null
const nomeDe = (id: string) => (id === eu ? 'você' : estOn?.jogadores.find((j) => j.id === id)?.nome ?? '?')

function etiqueta(nome: string, cor: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 56
  const g = c.getContext('2d') as CanvasRenderingContext2D
  g.font = 'bold 30px Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(nome.slice(0, 16), 128, 28)
  g.fillStyle = cor; g.fillText(nome.slice(0, 16), 128, 28)
  // tamanho fixo na tela (não encolhe com a distância), para ler o nome de longe
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true, sizeAttenuation: false }))
  s.scale.set(0.16, 0.035, 1); s.position.y = 2.7; s.renderOrder = 12
  return s
}

function sincronizarRemotos() {
  if (!estOn) return
  const meu = meuTime()
  for (const j of estOn.jogadores) {
    if (j.id === eu) { vivoOn = j.vivo; continue }
    let r = remotos.get(j.id)
    if (r && r.time !== j.time) { cena.remove(r.grupo); remotos.delete(j.id); r = undefined }
    if (!r) {
      const b = criarBoneco(matTime[j.time], false)
      const tag = etiqueta(j.nome, j.time === meu ? '#86efac' : j.time === 'A' ? '#93c5fd' : '#fca5a5')
      b.grupo.add(tag)
      r = { id: j.id, nome: j.nome, time: j.time, grupo: b.grupo, alvo: new THREE.Vector3(0, CHAO, 0), yaw: 0, vivo: j.vivo, vida: j.vida, morto: 0, barra: b.barra, barraFundo: b.barraFundo, nomeTag: tag, andar: 0 }
      remotos.set(j.id, r)
    }
    if (j.vivo && !r.vivo) { r.grupo.rotation.z = 0; r.morto = 0 }
    if (!j.vivo && r.vivo) r.morto = 0
    r.vivo = j.vivo; r.vida = j.vida
    r.grupo.visible = j.online || !j.vivo
  }
  for (const [id, r] of remotos) if (!estOn.jogadores.some((j) => j.id === id)) { cena.remove(r.grupo); remotos.delete(id) }
}

function receberOnline(m: MsgServidorEtp) {
  if (m.k === 'bemvindo') {
    eu = m.eu; salaOn = m.sala; estOn = m.estado; estOnEm = performance.now(); modo = 'online'
    limparPartida()
    sincronizarRemotos()
    for (const [id, p] of Object.entries(m.poses)) { const r = remotos.get(id); if (r) { r.alvo.set(p[0], p[1], p[2]); r.grupo.position.copy(r.alvo); r.yaw = p[3] } }
    mudouFase(true)
  } else if (m.k === 'estado') {
    const antes = estOn?.fase
    estOn = m.e; estOnEm = performance.now()
    sincronizarRemotos()
    if (antes !== estOn.fase) mudouFase(false)
    else if (estOn.fase === 'espera') telaSala()
  } else if (m.k === 'pose') {
    const r = remotos.get(m.id)
    if (r) { r.alvo.set(m.p[0], m.p[1], m.p[2]); r.yaw = m.p[3] }
  } else if (m.k === 'nascer') {
    for (const [id, [x, z, giro]] of Object.entries(m.l)) {
      if (id === eu) {
        jog.pos.set(x, CHAO, z); jog.yaw = giro; jog.pitch = 0; jog.vy = 0
        Object.assign(jog, { vida: 5, municao: PENTE, recarregando: 0, granadas: GRANADAS_POR_RODADA, tremor: 0 })
        vivoOn = true
      } else {
        const r = remotos.get(id)
        if (r) { r.alvo.set(x, CHAO, z); r.grupo.position.copy(r.alvo); r.yaw = giro; r.vivo = true; r.vida = 5; r.grupo.rotation.z = 0; r.barra.visible = r.barraFundo.visible = false }
      }
    }
    for (const g of granadas) cena.remove(g.malha)
    granadas.length = 0
  } else if (m.k === 'tiro') {
    if (m.de === eu) return
    const o = new THREE.Vector3(...m.o), p = new THREE.Vector3(...m.p)
    const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints([o, p]), matRastro)
    cena.add(linha); efeitos.push({ obj: linha, vida: 0.08, total: 0.08, tipo: 'rastro' })
    tocar('tiro', 0.5, o); faisca(p, 0xffd27a, 0.35)
  } else if (m.k === 'dano') {
    if (m.para === eu) {
      jog.vida = m.vida
      const de = remotos.get(m.de)?.grupo.position ?? jog.pos
      indicarDano(de)
    }
    if (m.de === eu && m.para !== eu) { const a = $('acerto'); a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); a.classList.toggle('cabeca', m.cabeca) }
    const r = remotos.get(m.para)
    if (r) { r.vida = m.vida; r.barra.visible = r.barraFundo.visible = m.vida > 0; r.barra.scale.x = Math.max(0, m.vida / 5) }
  } else if (m.k === 'abate') {
    if (m.para === eu) { vivoOn = false; tocar('baque', 0.8); aviso(`Você foi abatido por ${nomeDe(m.de)}${m.cabeca ? ' (na cabeça)' : ''}`, 3) }
    else {
      const r = remotos.get(m.para)
      if (r) { r.vivo = false; r.morto = 0; tocar('baque', 0.5, r.grupo.position) }
      aviso(`${nomeDe(m.de)} abateu ${nomeDe(m.para)}${m.cabeca ? ' na cabeça' : ''}`, 2.2)
    }
  } else if (m.k === 'granada') {
    if (m.de === eu) return
    const g = new THREE.Mesh(geoGranada, matGranada)
    g.position.set(...m.o); cena.add(g)
    granadas.push({ malha: g, vel: new THREE.Vector3(...m.v), tempo: 2.2, remota: true })
  } else if (m.k === 'erro') {
    rede?.sair(); rede = null
    tela('Não deu para entrar', [ERROS_SALA[m.motivo] ?? 'A sala recusou a conexão.'], ['Voltar', () => sairOnline()])
  }
}

function mudouFase(chegou: boolean) {
  if (!estOn || !salaOn) return
  const f = estOn.fase
  if (f === 'espera') {
    estado = 'menu'
    if (document.pointerLockElement) document.exitPointerLock()
    hud.hidden = true; toqueEl.hidden = true
    telaSala()
    return
  }
  if (f === 'fim') { telaFimOnline(); return }
  if (estado !== 'jogando') {
    telaEl.hidden = true; hud.hidden = false; toqueEl.hidden = !ehToque
    estado = 'jogando'
    if (!chegou || f !== 'rodada') travarMouse()
  }
  if (f === 'contagem') aviso(`Rodada ${estOn.rodada} · prepare-se!`, 3)
  else if (f === 'rodada') aviso('Valendo!', 1.2)
  else if (f === 'fimRodada') aviso(estOn.ganhouRodada ? `Time ${NOME_TIME[estOn.ganhouRodada]} venceu a rodada` : 'Rodada empatada', 3.5)
}

function telaSala() {
  if (!estOn || !salaOn) return
  const vagas = VAGAS_ETP[salaOn.modo]
  const doTime = (t: TimeEtp) => estOn!.jogadores.filter((j) => j.time === t).map((j) => j.nome + (j.id === eu ? ' (você)' : '')).join(', ') || '—'
  tela(`Sala ${salaOn.codigo}`, [
    `${salaOn.modo} · esperando jogadores: ${estOn.jogadores.length} de ${vagas}`,
    `🔵 Azul: ${doTime('A')}`,
    `🔴 Vermelho: ${doTime('B')}`,
    salaOn.publica ? 'Partida rápida: começa assim que a sala encher.' : 'Sala privada: mande o link ou o código para os amigos.',
  ], ['Copiar link', copiarLink], ['Sair', () => sairOnline(), 'claro'])
}

function copiarLink() {
  if (!salaOn) return
  const link = new URL(`index.html?sala=${salaOn.codigo}`, location.href).href
  navigator.clipboard?.writeText(link).then(() => aviso('Link copiado!', 2), () => aviso(link, 6))
  aviso('Link copiado!', 2)
}

function telaFimOnline() {
  if (!estOn) return
  estado = 'fim'
  $('aviso').classList.remove('on'); avisoT = 0
  if (document.pointerLockElement) document.exitPointerLock()
  const meu = meuTime()
  const eu_ = estOn.jogadores.find((j) => j.id === eu)
  const titulo = !estOn.vencedor ? 'Fim de partida' : estOn.vencedor === meu ? 'Vitória!' : 'Derrota'
  tela(titulo, [
    `🔵 Azul ${estOn.placar.A} × ${estOn.placar.B} Vermelho 🔴`,
    eu_ ? `Você: ${eu_.abates} ${eu_.abates === 1 ? 'abate' : 'abates'} e ${eu_.mortes} ${eu_.mortes === 1 ? 'morte' : 'mortes'}` : '',
    'Se todos continuarem na sala, a revanche começa em 10 segundos.',
  ], ['Sair', () => sairOnline(), 'claro'])
}

function sairOnline() {
  rede?.sair(); rede = null
  renderizador.domElement.style.filter = ''
  for (const r of remotos.values()) cena.remove(r.grupo)
  remotos.clear()
  modo = 'solo'; estOn = null; salaOn = null; eu = ''
  limparPartida()
  menu()
}

async function entrarOnline(modoEtp: ModoEtp | null, tipo: 'rapida' | 'privada' | 'codigo', apelido: string, codigo?: string) {
  tela('Conectando…', ['Entrando na sala…'])
  try {
    let p = await meuPerfil()
    if (!p) p = await criarPerfil(apelido || 'Jogador')
    else if (apelido && apelido !== p.apelido) p = await trocarApelido(apelido)
    const cod = tipo === 'codigo' ? (codigo ?? '').toUpperCase() : await pedirSala(modoEtp ?? '1x1', tipo === 'rapida')
    rede = new RedeEtp(cod)
    rede.aoReceber = receberOnline
    rede.aoEstado = (e) => { if (e === 'caiu') tela('Conexão perdida', ['Não deu para reconectar à sala.'], ['Menu', () => sairOnline()]) }
  } catch (e) {
    tela('Não deu para entrar', [(e as Error).message || 'Sem conexão com o servidor.'], ['Voltar', menu])
  }
}

async function telaOnline(modoEtp: ModoEtp | null, codigoLink = '') {
  const perfil = await meuPerfil().catch(() => null)
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}) => { const e = document.createElement(tag); const { cls, ...r } = props; if (cls) e.className = cls; Object.assign(e, r); return e }
  const apelido = el('input', { cls: 'campo', placeholder: 'Seu apelido', maxLength: 20, value: perfil?.apelido ?? '' })
  const codigo = el('input', { cls: 'campo codigo', placeholder: 'Código', maxLength: 6, value: codigoLink })
  const nome = () => apelido.value.trim()
  const precisaNome = () => { if (nome()) return true; apelido.focus(); apelido.classList.add('erro'); return false }
  const botao = (t: string, f: () => void, c = '') => { const b = el('button', { cls: 'btn ' + c, textContent: t }); b.onclick = () => { destravarSom(); f() }; return b }
  const linhaBotoes = (...b: HTMLElement[]) => { const d = el('div', { cls: 'botoes' }); d.append(...b); return d }
  const entrarCodigo = () => { if (precisaNome() && /^[A-Z0-9]{6}$/i.test(codigo.value.trim())) void entrarOnline(modoEtp, 'codigo', nome(), codigo.value.trim()) }
  const filhos: HTMLElement[] = [
    el('h1', { textContent: modoEtp ? `Online ${modoEtp}` : 'Entrar na sala' }),
    el('p', { textContent: modoEtp === '2x2' ? 'Duas duplas, time azul contra time vermelho.' : modoEtp === '1x1' ? 'Você contra outra pessoa.' : `Sala ${codigoLink}` }),
    el('p', { cls: 'pequeno', textContent: 'Melhor de 7 rodadas. Quem é abatido espera a próxima rodada. 5 de vida, tiro na cabeça vale 2, uma granada por rodada.' }),
    apelido,
  ]
  if (modoEtp) filhos.push(linhaBotoes(botao('Partida rápida', () => precisaNome() && void entrarOnline(modoEtp, 'rapida', nome())), botao('Criar sala privada', () => precisaNome() && void entrarOnline(modoEtp, 'privada', nome()), 'claro')))
  filhos.push(linhaBotoes(codigo, botao('Entrar com código', entrarCodigo, modoEtp ? 'claro' : '')), linhaBotoes(botao('Voltar', menu, 'claro')))
  telaEl.replaceChildren(...filhos)
  telaEl.hidden = false
  ;(nome() ? (filhos.find((f) => f.classList.contains('botoes'))?.querySelector('button') as HTMLButtonElement | null) : apelido)?.focus()
}

function indicarDano(de: THREE.Vector3) {
  jog.tremor = Math.max(jog.tremor, 0.35)
  const d = $('dano')
  const ang = Math.atan2(de.x - jog.pos.x, de.z - jog.pos.z) - Math.atan2(-Math.sin(jog.yaw), -Math.cos(jog.yaw))
  d.style.setProperty('--ang', `${-ang}rad`)
  d.classList.remove('on'); void d.offsetWidth; d.classList.add('on')
  tocar('impacto', 0.6)
}

function atualizarRemotos(dt: number) {
  camera.getWorldPosition(olhoJog)
  for (const r of remotos.values()) {
    if (!r.vivo) {
      r.morto += dt
      r.grupo.rotation.z = Math.min(Math.PI / 2, r.morto * 5)
      r.grupo.position.y = CHAO + Math.min(0.45, r.morto * 1.5)
      r.nomeTag.visible = false
      continue
    }
    const antes = r.grupo.position.clone()
    r.grupo.position.lerp(r.alvo, Math.min(1, dt * 14))
    r.andar += antes.distanceTo(r.grupo.position)
    r.grupo.position.y = r.alvo.y + Math.abs(Math.sin(r.andar * 2.2)) * 0.06
    let da = r.yaw + Math.PI - r.grupo.rotation.y
    da = Math.atan2(Math.sin(da), Math.cos(da))
    r.grupo.rotation.y += da * Math.min(1, dt * 12)
    // nome: colega sempre; adversário só quando dá para ver
    r.nomeTag.visible = estado === 'jogando' && (r.time === meuTime() || r.grupo.position.distanceTo(jog.pos) < 60 && enxerga(olhoJog, _alvo.set(r.grupo.position.x, r.grupo.position.y + 1.6, r.grupo.position.z)))
    if (r.barra.visible) { r.barra.quaternion.copy(camera.quaternion).premultiply(tmpQ.copy(r.grupo.quaternion).invert()); r.barraFundo.quaternion.copy(r.barra.quaternion) }
  }
  // manda a própria pose 20 vezes por segundo
  const agora = performance.now()
  if (rede && vivoOn && estOn?.fase === 'rodada' && agora - ultimaPose > 50) {
    ultimaPose = agora
    const p: PoseEtp = [jog.pos.x, jog.pos.y, jog.pos.z, jog.yaw, jog.pitch].map((v) => Math.round(v * 100) / 100) as PoseEtp
    rede.mandar({ k: 'pose', p })
  }
}

/* ---------------- câmera, arma e HUD ---------------- */

function atualizarCamera(dt: number) {
  const balanco = jog.noChao ? Math.sin(jog.passo) * 0.045 : 0
  jog.tremor = Math.max(0, jog.tremor - dt * 1.8)
  const tr = jog.tremor * jog.tremor
  camera.position.set(jog.pos.x + (Math.random() - 0.5) * tr * 0.3, jog.pos.y + ALTURA_OLHO + balanco + (Math.random() - 0.5) * tr * 0.3, jog.pos.z)
  camera.rotation.set(jog.pitch + jog.recuo * 0.03, jog.yaw, 0, 'YXZ')
  // arma: balanço do passo, recuo e recarga
  const rec = jog.recarregando > 0 ? Math.sin(Math.min(1, 1 - jog.recarregando / 1.4) * Math.PI) : 0
  arma.position.set(0.17 + Math.cos(jog.passo * 0.5) * 0.008, -0.16 + Math.abs(Math.sin(jog.passo * 0.5)) * 0.01 - rec * 0.12, -0.46 + jog.recuo * 0.05)
  arma.rotation.set(jog.recuo * 0.25 - rec * 0.9, 0.06, rec * 0.5)
  if (SOMBRAS) { sol.position.set(jog.pos.x + 40, 80, jog.pos.z + 30); sol.target.position.set(jog.pos.x, CHAO, jog.pos.z) }
}

let hudT = 0
function atualizarHud(dt: number) {
  if (avisoT > 0) { avisoT -= dt; if (avisoT <= 0) $('aviso').classList.remove('on') }
  hudT -= dt
  if (hudT > 0) return
  hudT = 0.1 // o HUD não precisa mudar a cada quadro
  // online: abatido vê o jogo em cinza até a próxima rodada
  const cinza = modo === 'online' && !vivoOn ? 'grayscale(0.85) brightness(0.8)' : ''
  if (renderizador.domElement.style.filter !== cinza) renderizador.domElement.style.filter = cinza
  ;($('vida') as HTMLElement).style.width = `${(jog.vida / VIDA_JOGADOR) * 100}%`
  $('municao').textContent = jog.recarregando > 0 ? 'RECARREGANDO…' : `${jog.municao} / ∞`
  $('municao').classList.toggle('baixa', jog.municao <= 2 && jog.recarregando <= 0)
  $('granadas').textContent = `💣 × ${jog.granadas}`
  if (modo === 'online' && estOn) {
    const e = estOn
    const vivosT = (t: TimeEtp) => e.jogadores.filter((j) => j.time === t && j.vivo).length
    const resta = Math.max(0, e.resta - (performance.now() - estOnEm)) / 1000
    const meu = meuTime()
    $('onda').textContent = '🔵 ' + e.placar.A + ' × ' + e.placar.B + ' 🔴 · Rodada ' + e.rodada
    $('policiais').textContent = (meu ? 'Time ' + NOME_TIME[meu] + ' · ' : '') + 'vivos ' + vivosT('A') + ' × ' + vivosT('B') + ' · ' + formatar(resta) + (vivoOn ? '' : ' · abatido: aguarde a próxima rodada')
  } else {
    $('onda').textContent = 'Onda ' + (onda + 1) + '/' + ONDAS.length
    const vivos = policiais.filter((p) => p.vivo).length + aNascer
    $('policiais').textContent = '🚓 ' + vivos + ' ' + (vivos === 1 ? 'policial' : 'policiais') + ' · ' + formatar(tempoJogo)
  }
  // radar: 70 m em volta, girando com o jogador
  const R = 80, esc = R / 70
  rctx.clearRect(0, 0, 160, 160)
  rctx.fillStyle = 'rgba(8,14,26,.6)'; rctx.beginPath(); rctx.arc(R, R, R - 2, 0, Math.PI * 2); rctx.fill()
  rctx.strokeStyle = 'rgba(255,255,255,.25)'; rctx.stroke()
  rctx.fillStyle = '#4ade80'; rctx.beginPath(); rctx.moveTo(R, R - 7); rctx.lineTo(R - 5, R + 5); rctx.lineTo(R + 5, R + 5); rctx.fill()
  const s = Math.sin(jog.yaw), c = Math.cos(jog.yaw)
  // online: colegas sempre (verde); adversários só quando estão à vista (vermelho)
  if (modo === 'online') {
    const time = meuTime()
    camera.getWorldPosition(olhoJog)
    for (const r of remotos.values()) {
      if (!r.vivo) continue
      const p = r.grupo.position
      const amigo = r.time === time
      if (!amigo && !(p.distanceTo(jog.pos) < 75 && enxerga(olhoJog, _alvo.set(p.x, p.y + 1.6, p.z)))) continue
      const dx = p.x - jog.pos.x, dz = p.z - jog.pos.z
      let x = dx * c - dz * s, y = dx * s + dz * c
      const d = Math.hypot(x, y)
      if (d > 68) { x *= 68 / d; y *= 68 / d }
      rctx.fillStyle = amigo ? '#4ade80' : '#ff4d4d'
      rctx.beginPath(); rctx.arc(R + x * esc, R + y * esc, 4.5, 0, Math.PI * 2); rctx.fill()
    }
  }
  for (const p of policiais) {
    if (!p.vivo) continue
    const dx = p.pos.x - jog.pos.x, dz = p.pos.z - jog.pos.z
    let x = dx * c - dz * s, y = dx * s + dz * c
    const d = Math.hypot(x, y)
    if (d > 68) { x *= 68 / d; y *= 68 / d }
    rctx.fillStyle = p.viu > 0.4 ? '#ff4d4d' : '#60a5fa'
    rctx.beginPath(); rctx.arc(R + x * esc, R + y * esc, 4.5, 0, Math.PI * 2); rctx.fill()
  }
}

/* ---------------- laço ---------------- */

let ultimo = performance.now(), fpsQuadros = 0, fpsT = 0, fps = 0
const FIXO = 1 / 120
let acumulado = 0
function quadro(agora: number) {
  requestAnimationFrame(quadro)
  const dt = Math.min(0.05, (agora - ultimo) / 1000)
  ultimo = agora
  fpsQuadros++; fpsT += dt; if (fpsT >= 1) { fps = fpsQuadros / fpsT; fpsQuadros = 0; fpsT = 0 }
  if (estado === 'jogando') {
    tempoJogo += dt
    acumulado += dt
    // física em passo fixo: movimento igual em 30, 60 ou 144 Hz
    while (acumulado >= FIXO) { atualizarJogador(FIXO); if (modo === 'solo') atualizarPoliciais(FIXO); else atualizarRemotos(FIXO); atualizarProjeteis(FIXO); acumulado -= FIXO }
    atualizarHud(dt)
  } else {
    acumulado = 0
    // online, com o menu aberto ou entre partidas, os outros continuam se mexendo
    if (modo === 'online') { atualizarRemotos(dt); atualizarProjeteis(dt) }
  }
  if (estado !== 'carregando') {
    atualizarCamera(dt)
    renderizador.clear()
    renderizador.render(cena, camera)
    renderizador.clearDepth()
    renderizador.render(cenaArma, cameraArma)
  }
}

/* ---------------- carregar ---------------- */

tela('Escape The Police', ['Carregando o mapa…'])
const carregar = async () => {
  const p = telaEl.querySelector('p') as HTMLElement
  await montarMundo(cena, SOMBRAS, (f) => { p.textContent = `Carregando o mapa… ${Math.round(f * 100)}%` })
  const g = await new GLTFLoader().loadAsync('modelos/handgun_01.glb')
  const tex = new THREE.TextureLoader().load('texturas/arma.png')
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false
  const mat = new THREE.MeshLambertMaterial({ map: tex })
  g.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = mat })
  // centraliza a pistola: o modelo vem deslocado do ponto de origem
  const caixa = new THREE.Box3().setFromObject(g.scene)
  const centro = caixa.getCenter(new THREE.Vector3()), tam = caixa.getSize(new THREE.Vector3())
  g.scene.position.sub(centro)
  // o modelo vem deitado: estas rotações deixam o cabo para baixo e o cano para a frente (conferido em prints)
  const giro = new THREE.Group(); giro.rotation.set(Math.PI / 2, Math.PI, 0); giro.add(g.scene)
  const suporte = new THREE.Group(); suporte.rotation.y = 0.1; suporte.add(giro)
  suporte.scale.setScalar(0.22 / Math.max(tam.x, tam.y, tam.z))
  arma.add(suporte)
  clarao.position.set(0, 0.035, -0.13); arma.add(clarao)
  jog.yaw = Math.PI
  // compila os shaders antes de começar, para não engasgar no primeiro tiro
  renderizador.compile(cena, camera)
  const q = new URLSearchParams(location.search)
  if (q.get('jogar') === '1' || q.get('vitrine') === '1') iniciar()
  // vitrine (banner): começa olhando para onde a polícia chega
  if (q.get('vitrine') === '1') { invencivel = true; jog.pos.set(nascerPolicia.x - 14, CHAO, nascerPolicia.z - 16); jog.yaw = Math.atan2(-14, -16); jog.pitch = -0.04; proximoNascer = 0 }
  else if (/^[A-Z0-9]{6}$/i.test(q.get('sala') ?? '')) void telaOnline(null, (q.get('sala') as string).toUpperCase()) // link de convite
  else if (q.get('jogar') !== '1') menu()
}
carregar().catch((e) => { tela('Escape The Police', ['Não consegui carregar o jogo. Recarregue a página.', String(e)]) })
requestAnimationFrame(quadro)

// para os testes automáticos
;(window as unknown as Record<string, unknown>).__etp = {
  estado: () => estado, onda: () => onda, abatidos: () => abatidos, fps: () => fps,
  jogador: () => ({ x: jog.pos.x, y: jog.pos.y, z: jog.pos.z, vida: jog.vida, municao: jog.municao, granadas: jog.granadas }),
  policiais: () => policiais.filter((p) => p.vivo).map((p) => ({ x: p.pos.x, z: p.pos.z, vida: p.vida, viu: p.viu })),
  olharPara: (x: number, y: number, z: number) => { const d = new THREE.Vector3(x, y, z).sub(new THREE.Vector3(jog.pos.x, jog.pos.y + ALTURA_OLHO, jog.pos.z)); jog.yaw = Math.atan2(-d.x, -d.z); jog.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) },
  irPara: (x: number, z: number) => { jog.pos.set(x, CHAO, z) },
  atirar: () => { if (jog.municao > 0 && jog.recarregando <= 0) { camera.updateMatrixWorld(); atirar() } },
  invencivel: () => { invencivel = true },
  granada: () => { if (jog.granadas > 0) { camera.updateMatrixWorld(); lancarGranada() } },
  pausar: () => alternarPausa(),
  iniciar,
  online: {
    entrar: (m: ModoEtp | null, tipo: 'rapida' | 'privada' | 'codigo', apelido: string, codigo?: string) => entrarOnline(m, tipo, apelido, codigo),
    fase: () => estOn?.fase ?? null, sala: () => salaOn?.codigo ?? null, eu: () => eu, time: () => meuTime(), vivo: () => vivoOn,
    placar: () => estOn?.placar ?? null, vencedor: () => estOn?.vencedor ?? null,
    remotos: () => [...remotos.values()].map((r) => ({ id: r.id, nome: r.nome, time: r.time, vivo: r.vivo, vida: r.vida, x: r.grupo.position.x, z: r.grupo.position.z })),
    sair: () => sairOnline(),
  },
}
void LIMITE
