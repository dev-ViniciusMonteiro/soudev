import './estilo.css'

// Torre Gelada — releitura do Icy Tower: suba pulando de plataforma em plataforma. Quanto mais rápido
// você corre, mais longe pula (combo). Se cair para fora da tela, acabou. Canvas 2D, teclado e toque.

const W = 480, H = 720 // mundo lógico (retrato); a tela escala para caber
const GRAV = 0.6, MOVE = 0.9, FRICT = 0.85, MAXVX = 9.5
const JUMP_BASE = 12.6, JUMP_K = 0.9, JUMP_BONUS_MAX = 9
const GAP = 94 // distância vertical entre andares
const CW = 28, CH = 36 // tamanho do personagem

type Plat = { n: number; x: number; y: number; w: number }

const app = document.getElementById('app') as HTMLDivElement
const wrap = document.createElement('div'); wrap.className = 'it-wrap'
const canvas = document.createElement('canvas'); wrap.appendChild(canvas)
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
app.appendChild(wrap)

// controles em toque
wrap.insertAdjacentHTML('beforeend', `
  <div class="it-touch">
    <button class="it-btn e" aria-label="Esquerda">◀</button>
    <button class="it-btn d" aria-label="Direita">▶</button>
    <button class="it-btn j" aria-label="Pular">PULAR</button>
  </div>`)

// overlays
const telaInicio = document.createElement('div'); telaInicio.className = 'it-overlay'
telaInicio.innerHTML = `<h1>TORRE GELADA</h1><p>Suba pulando o mais alto que conseguir. Corra para ganhar impulso e pular mais longe. Se cair para fora da tela, o jogo acaba.</p>
  <button class="it-btn-main" id="jogar">Jogar</button>
  <p class="it-dica">Setas ou A/D para mover · Espaço, W ou ↑ para pular · no celular, use os botões</p>`
const telaFim = document.createElement('div'); telaFim.className = 'it-overlay'; telaFim.hidden = true
wrap.appendChild(telaInicio); wrap.appendChild(telaFim)

// ---------- escala responsiva ----------
let rs = 1
function ajustar() {
  const maxW = Math.min(app.clientWidth || window.innerWidth, 480)
  const maxH = (window.innerHeight || 720) * 0.92
  let dw = maxW, dh = dw * (H / W)
  if (dh > maxH) { dh = maxH; dw = dh * (W / H) }
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  rs = (dw / W) * dpr
  canvas.width = Math.round(W * rs); canvas.height = Math.round(H * rs)
  canvas.style.width = dw + 'px'; canvas.style.height = dh + 'px'
  wrap.style.width = dw + 'px'; wrap.style.height = dh + 'px'
}
window.addEventListener('resize', ajustar); ajustar()

// ---------- estado ----------
let estado: 'inicio' | 'jogando' | 'fim' = 'inicio'
let plats: Plat[] = []
let topN = 0
const char = { x: W / 2 - CW / 2, y: -CH, vx: 0, vy: 0, chao: true, dir: 1 }
let camY = 0
let bestFloor = 0
let pontos = 0
let combo = 0
let ultimoPouso = 0
let comboMostra = 0
let rise = 0
let tempo = 0
let recorde = 0
try { recorde = Number(localStorage.getItem('torre-gelada-recorde') || 0) } catch { /* sem storage */ }

const input = { esq: false, dir: false, pular: false }
let pularTrava = false

function reset() {
  plats = []
  topN = 0
  char.x = W / 2 - CW / 2; char.y = -CH; char.vx = 0; char.vy = 0; char.chao = true; char.dir = 1
  camY = char.y - H * 0.68
  bestFloor = 0; pontos = 0; combo = 0; ultimoPouso = 0; comboMostra = 0; rise = 0; tempo = 0
  // gera as primeiras plataformas
  let cx = W / 2
  for (let n = 1; n <= 12; n++) {
    const w = 90 + Math.random() * 60
    cx += (Math.random() * 2 - 1) * 180
    cx = Math.max(60, Math.min(W - 60, cx))
    plats.push({ n, x: Math.max(0, Math.min(W - w, cx - w / 2)), y: -n * GAP, w })
    topN = n
  }
}

function gerarAcima() {
  // mantém plataformas acima do topo da câmera
  while (-topN * GAP > camY - H * 0.5) {
    const n = topN + 1
    const prev = plats[plats.length - 1]
    const w = 84 + Math.random() * 62
    let cx = (prev.x + prev.w / 2) + (Math.random() * 2 - 1) * 210
    cx = Math.max(55, Math.min(W - 55, cx))
    plats.push({ n, x: Math.max(0, Math.min(W - w, cx - w / 2)), y: -n * GAP, w })
    topN = n
  }
}

// ---------- som ----------
let actx: AudioContext | null = null
function blip(freq: number, dur: number) {
  try {
    actx = actx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const o = actx.createOscillator(), g = actx.createGain()
    o.connect(g); g.connect(actx.destination)
    o.frequency.value = freq; o.type = 'square'; g.gain.value = 0.04
    o.start(); o.stop(actx.currentTime + dur)
  } catch { /* ignora */ }
}

// ---------- passo de física (1 quadro) ----------
function step() {
  tempo++
  // horizontal
  const dir = (input.dir ? 1 : 0) - (input.esq ? 1 : 0)
  char.vx += dir * MOVE
  char.vx *= FRICT
  char.vx = Math.max(-MAXVX, Math.min(MAXVX, char.vx))
  if (Math.abs(char.vx) > 0.4) char.dir = char.vx > 0 ? 1 : -1
  char.x += char.vx
  if (char.x < 0) { char.x = 0; char.vx = -char.vx * 0.4 }
  if (char.x > W - CW) { char.x = W - CW; char.vx = -char.vx * 0.4 }

  // pulo
  if (input.pular && char.chao && !pularTrava) {
    char.vy = -(JUMP_BASE + Math.min(Math.abs(char.vx) * JUMP_K, JUMP_BONUS_MAX))
    char.chao = false; pularTrava = true
    blip(520, 0.08)
  }
  if (!input.pular) pularTrava = false

  // gravidade
  const feetPrev = char.y + CH
  char.vy += GRAV
  char.y += char.vy
  const feet = char.y + CH

  // pouso em plataformas (só caindo)
  char.chao = false
  if (char.vy >= 0) {
    // chão (andar 0) em y=0, largura toda
    if (feetPrev <= 0 && feet >= 0) { pousar(0, 0) }
    for (const p of plats) {
      if (feetPrev <= p.y && feet >= p.y && char.x + CW > p.x && char.x < p.x + p.w) {
        pousar(p.n, p.y); break
      }
    }
  }

  // câmera: segue para cima e sobe sozinha (dificuldade)
  const alvo = char.y - H * 0.68
  if (alvo < camY) camY += (alvo - camY) * 0.16
  rise = Math.min(2.5, 0.25 + tempo * 0.0008 + bestFloor * 0.012)
  if (tempo > 120) camY -= rise

  gerarAcima()

  // morte: caiu para fora da tela
  if (char.y - camY > H + 50) fim()

  if (comboMostra > 0) comboMostra--
}

function pousar(n: number, y: number) {
  char.y = y - CH; char.vy = 0; char.chao = true
  if (n > bestFloor) {
    const ganho = n - bestFloor
    pontos += ganho * 10
    const agora = tempo
    if (agora - ultimoPouso < 48 && ganho > 0) { combo++; pontos += combo * 5; comboMostra = 90 }
    else combo = 0
    ultimoPouso = agora
    bestFloor = n
    if (ganho >= 2) blip(380, 0.06)
  }
}

function fim() {
  estado = 'fim'
  if (pontos > recorde) { recorde = pontos; try { localStorage.setItem('torre-gelada-recorde', String(recorde)) } catch { /* ignora */ } }
  blip(160, 0.25)
  telaFim.innerHTML = `<h2>Você caiu!</h2>
    <p class="stats">Andar <b>${bestFloor}</b> · <b>${pontos}</b> pontos</p>
    <p class="stats">Recorde: ${recorde} pontos</p>
    <button class="it-btn-main" id="denovo">Jogar de novo</button>`
  telaFim.hidden = false
  ;(document.getElementById('denovo') as HTMLButtonElement).onclick = iniciar
}

function iniciar() {
  reset(); estado = 'jogando'; telaInicio.hidden = true; telaFim.hidden = true
}

// ---------- desenho ----------
function render() {
  ctx.setTransform(rs, 0, 0, rs, 0, 0)
  // fundo em degradê + estrelas simples (parallax pela câmera)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0b1024'); g.addColorStop(1, '#131a33')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97) % W
    const sy = ((i * 61) - camY * 0.3) % H
    ctx.fillRect(sx, (sy + H) % H, 2, 2)
  }

  const toY = (wy: number) => wy - camY

  // chão (andar 0)
  const gy = toY(0)
  if (gy < H + 40) {
    ctx.fillStyle = '#2b3a67'; ctx.fillRect(0, gy, W, H)
    ctx.fillStyle = '#4a63a8'; ctx.fillRect(0, gy, W, 8)
  }

  // plataformas
  for (const p of plats) {
    const y = toY(p.y)
    if (y < -20 || y > H + 20) continue
    ctx.fillStyle = '#7cc5ff'
    roundRect(p.x, y - 7, p.w, 14, 7); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(p.x + 4, y - 5, p.w - 8, 3)
    // número do andar
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(String(p.n), p.x + 2, y - 10)
  }

  // personagem
  const cx = char.x, cy = toY(char.y)
  ctx.save()
  ctx.translate(cx + CW / 2, cy + CH / 2)
  const squash = char.chao ? 1 : Math.max(0.8, 1 - Math.abs(char.vy) * 0.01)
  ctx.scale(char.dir, 1 / squash * (char.chao ? 1 : 1))
  ctx.fillStyle = '#ffd45e'
  roundRect(-CW / 2, -CH / 2, CW, CH, 7); ctx.fill()
  ctx.fillStyle = '#4a3200'
  ctx.fillRect(2, -CH / 2 + 9, 5, 6) // olho
  ctx.fillStyle = '#e8730c'; ctx.fillRect(-CW / 2, CH / 2 - 7, CW, 7) // pé
  ctx.restore()

  // HUD
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left'
  ctx.fillText(`Andar ${bestFloor}`, 12, 30)
  ctx.font = 'bold 16px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#b9c6d6'
  ctx.fillText(`${pontos} pts`, 12, 52)
  if (comboMostra > 0 && combo > 1) {
    ctx.fillStyle = '#ffd45e'; ctx.font = 'bold 28px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`COMBO x${combo}!`, W / 2, 80)
  }
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ---------- laço ----------
let acc = 0, last = performance.now()
function frame(t: number) {
  acc += t - last; last = t
  if (acc > 200) acc = 200
  while (acc >= 1000 / 60) { if (estado === 'jogando') step(); acc -= 1000 / 60 }
  render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// ---------- entradas ----------
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.esq = true
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.dir = true
  else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { input.pular = true; if (estado !== 'jogando') iniciar() }
})
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.esq = false
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.dir = false
  else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') input.pular = false
})

function bind(sel: string, campo: 'esq' | 'dir' | 'pular') {
  const el = wrap.querySelector(sel) as HTMLElement
  const on = (e: Event) => { e.preventDefault(); input[campo] = true }
  const off = (e: Event) => { e.preventDefault(); input[campo] = false }
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off)
  el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off)
}
bind('.it-btn.e', 'esq'); bind('.it-btn.d', 'dir'); bind('.it-btn.j', 'pular')

;(document.getElementById('jogar') as HTMLButtonElement).onclick = iniciar
