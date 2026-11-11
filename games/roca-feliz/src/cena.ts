// Desenho da roça em perspectiva isométrica (canvas 2D, sem imagens): céu, morros, cerca, casa,
// celeiro, árvores, canteiros com plantas que crescem em 6 estágios, problemas, cachorro e efeitos.

import { COLS, FILAS, type Cultura } from './dados'

export const TW = 100
export const TH = 50

export interface Vista {
  solo: 'fechado' | 'arado' | 'plantado' | 'murcho'
  venda: boolean // é o próximo canteiro à venda
  cultura: Cultura | null
  estagio: number
  seca: boolean
  mato: number
  bicho: number
}

export interface Cena {
  vistas: Vista[]
  cachorro: boolean
  telhado: string
  dono: string
}

export interface Ponto {
  x: number
  y: number
}

export const iso = (c: number, r: number): Ponto => ({ x: ((c - r) * TW) / 2, y: ((c + r) * TH) / 2 })
export const centroCanteiro = (i: number): Ponto => iso(i % COLS, Math.floor(i / COLS))

/** Objetos clicáveis do cenário (coordenadas do mundo). */
export const CELEIRO = { c: 6.7, r: -1.7, w: 1.6, d: 1.5, h: 62 }
export const CASA = { c: -3.1, r: 0.2, w: 1.6, d: 1.6, h: 52 }
export const MURAL = { c: -1.6, r: -1.5 }

/* ---------- câmera ---------- */
export class Camera {
  esc = 1
  ox = 0
  oy = 0
  dpr = 1
  ajustar(larg: number, alt: number, topo: number, baixo: number, dpr: number): void {
    this.dpr = dpr
    const areaA = Math.max(100, alt - topo - baixo)
    const caber = (x0: number, x1: number, y0: number, y1: number): number => Math.min(larg / (x1 - x0), areaA / (y1 - y0))
    // a roça inteira se couber bem; senão, só os canteiros
    let caixa = [-470, 540, -250, 370]
    let e = caber(caixa[0], caixa[1], caixa[2], caixa[3])
    if (e < 0.72) {
      caixa = [-215, 315, -70, 245]
      e = caber(caixa[0], caixa[1], caixa[2], caixa[3])
    }
    this.esc = Math.min(e, 1.5)
    this.ox = larg / 2 - ((caixa[0] + caixa[1]) / 2) * this.esc
    this.oy = topo + areaA / 2 - ((caixa[2] + caixa[3]) / 2) * this.esc
  }
  paraTela(p: Ponto): Ponto {
    return { x: p.x * this.esc + this.ox, y: p.y * this.esc + this.oy }
  }
  paraMundo(x: number, y: number): Ponto {
    return { x: (x - this.ox) / this.esc, y: (y - this.oy) / this.esc }
  }
  aplicar(ctx: CanvasRenderingContext2D): void {
    const d = this.dpr
    ctx.setTransform(this.esc * d, 0, 0, this.esc * d, this.ox * d, this.oy * d)
  }
}

/** Qual canteiro está sob o ponto do mundo (-1 se nenhum). */
export function canteiroEm(p: Ponto, qtd: number): number {
  const a = p.x / (TW / 2)
  const b = p.y / (TH / 2)
  const c = Math.round((a + b) / 2)
  const r = Math.round((b - a) / 2)
  if (c < 0 || r < 0 || c >= COLS || r >= FILAS) return -1
  const i = r * COLS + c
  return i < qtd ? i : -1
}

export function objetoEm(p: Ponto): 'celeiro' | 'mural' | 'casa' | null {
  const dentro = (o: { c: number; r: number; w: number; d: number; h: number }): boolean => {
    const a = iso(o.c, o.r + o.d)
    const b = iso(o.c + o.w, o.r)
    const topo = iso(o.c, o.r).y - o.h - 45
    const fundo = iso(o.c + o.w, o.r + o.d).y
    return p.x > a.x && p.x < b.x && p.y > topo && p.y < fundo
  }
  if (dentro(CELEIRO)) return 'celeiro'
  if (dentro(CASA)) return 'casa'
  const m = iso(MURAL.c, MURAL.r)
  if (Math.abs(p.x - m.x) < 30 && p.y < m.y + 6 && p.y > m.y - 62) return 'mural'
  return null
}

/* ---------- utilidades de desenho ---------- */
const FONTE_EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'

export function emoji(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, tam: number): void {
  ctx.font = `${tam}px ${FONTE_EMOJI}`
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ch, x, y)
}

function poligono(ctx: CanvasRenderingContext2D, pts: Ponto[], cor: string, borda?: string, lw = 1): void {
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.closePath()
  ctx.fillStyle = cor
  ctx.fill()
  if (borda) {
    ctx.strokeStyle = borda
    ctx.lineWidth = lw
    ctx.stroke()
  }
}

const sobe = (p: Ponto, h: number): Ponto => ({ x: p.x, y: p.y - h })
const meio = (a: Ponto, b: Ponto, f = 0.5): Ponto => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })

function losangoPts(cx: number, cy: number, f: number): Ponto[] {
  const hw = (TW / 2) * f
  const hh = (TH / 2) * f
  return [
    { x: cx, y: cy - hh },
    { x: cx + hw, y: cy },
    { x: cx, y: cy + hh },
    { x: cx - hw, y: cy },
  ]
}

/** Caixa isométrica com telhado de duas águas (casa, celeiro, casinha do cachorro). */
function construcao(ctx: CanvasRenderingContext2D, o: { c: number; r: number; w: number; d: number; h: number }, paredeE: string, paredeD: string, telhado: string, telhadoEscuro: string, alturaTelhado: number, detalhes?: (f: { esq: (u: number, v: number) => Ponto; dir: (u: number, v: number) => Ponto }) => void): void {
  const A = iso(o.c, o.r)
  const B = iso(o.c + o.w, o.r)
  const C = iso(o.c + o.w, o.r + o.d)
  const D = iso(o.c, o.r + o.d)
  // sombra
  ctx.save()
  ctx.globalAlpha = 0.18
  poligono(ctx, [{ x: A.x + 10, y: A.y + 6 }, { x: B.x + 16, y: B.y + 6 }, { x: C.x + 10, y: C.y + 8 }, { x: D.x, y: D.y + 6 }], '#000')
  ctx.restore()
  poligono(ctx, [D, C, sobe(C, o.h), sobe(D, o.h)], paredeE, '#0003')
  poligono(ctx, [C, B, sobe(B, o.h), sobe(C, o.h)], paredeD, '#0003')
  // pontos nas paredes: u ao longo da parede (0..1), v altura (0..1)
  const esq = (u: number, v: number): Ponto => sobe(meio(D, C, u), o.h * v)
  const dir = (u: number, v: number): Ponto => sobe(meio(C, B, u), o.h * v)
  detalhes?.({ esq, dir })
  // telhado: cumeeira ao longo de c, no meio de r
  const R1 = sobe(meio(A, D), o.h + alturaTelhado)
  const R2 = sobe(meio(B, C), o.h + alturaTelhado)
  const beiral = 6
  poligono(ctx, [sobe(A, o.h), sobe(B, o.h), R2, R1], telhadoEscuro)
  poligono(ctx, [sobe(B, o.h), sobe(C, o.h), R2], paredeD, '#0003')
  poligono(ctx, [{ x: D.x - beiral, y: D.y - o.h + 3 }, { x: C.x, y: C.y - o.h + beiral }, { x: R2.x + 2, y: R2.y }, { x: R1.x - beiral, y: R1.y - 2 }], telhado, '#0004', 1.5)
  // telhas
  ctx.strokeStyle = '#0002'
  ctx.lineWidth = 1.5
  for (let k = 1; k < 4; k++) {
    const a = meio({ x: D.x - beiral, y: D.y - o.h + 3 }, { x: R1.x - beiral, y: R1.y - 2 }, k / 4)
    const b = meio({ x: C.x, y: C.y - o.h + beiral }, R2, k / 4)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

function quadNaParede(ctx: CanvasRenderingContext2D, f: (u: number, v: number) => Ponto, u0: number, u1: number, v0: number, v1: number, cor: string, borda = '#0005'): void {
  poligono(ctx, [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)], cor, borda, 1.5)
}

function arvore(ctx: CanvasRenderingContext2D, c: number, r: number, t: number, tam = 1): void {
  const p = iso(c, r)
  ctx.save()
  ctx.globalAlpha = 0.2
  ctx.beginPath()
  ctx.ellipse(p.x + 6, p.y + 2, 34 * tam, 14 * tam, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#7c4a1e'
  ctx.fillRect(p.x - 6 * tam, p.y - 46 * tam, 12 * tam, 48 * tam)
  const balanco = Math.sin(t * 0.8 + c) * 1.5
  const copas: [number, number, number, string][] = [
    [-20, -60, 26, '#2f8f3a'],
    [20, -62, 26, '#2f8f3a'],
    [0, -86, 30, '#3aa845'],
    [-8, -64, 24, '#45b850'],
    [12, -78, 18, '#5cc765'],
  ]
  for (const [dx, dy, rr, cor] of copas) {
    ctx.beginPath()
    ctx.arc(p.x + dx * tam + balanco, p.y + dy * tam, rr * tam, 0, Math.PI * 2)
    ctx.fillStyle = cor
    ctx.fill()
  }
  // frutinhas
  ctx.fillStyle = '#ef4444'
  for (const [dx, dy] of [[-14, -70], [16, -84], [4, -56], [-24, -88]]) {
    ctx.beginPath()
    ctx.arc(p.x + dx * tam + balanco, p.y + dy * tam, 4 * tam, 0, Math.PI * 2)
    ctx.fill()
  }
}

function cerca(ctx: CanvasRenderingContext2D, de: [number, number], ate: [number, number]): void {
  const a = iso(de[0], de[1])
  const b = iso(ate[0], ate[1])
  const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 34))
  ctx.strokeStyle = '#8b5a2b'
  ctx.lineWidth = 4
  for (const h of [12, 24]) {
    ctx.beginPath()
    ctx.moveTo(a.x, a.y - h)
    ctx.lineTo(b.x, b.y - h)
    ctx.stroke()
  }
  for (let k = 0; k <= n; k++) {
    const p = meio(a, b, k / n)
    ctx.fillStyle = '#a0682f'
    ctx.fillRect(p.x - 3, p.y - 32, 6, 32)
    ctx.fillStyle = '#c38446'
    ctx.fillRect(p.x - 3, p.y - 34, 6, 4)
  }
}

/* ---------- plantas ---------- */
const VAGAS: [number, number][] = [
  [-0.2, -0.2],
  [0.2, -0.2],
  [-0.2, 0.2],
  [0.2, 0.2],
]

function folha(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, ang: number, cor: string): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2)
  ctx.fillStyle = cor
  ctx.fill()
}

function planta(ctx: CanvasRenderingContext2D, x: number, y: number, v: Vista, t: number, idx: number): void {
  const cu = v.cultura
  if (!cu) return
  const est = v.estagio
  const vagas = VAGAS.map(([du, dv]) => ({ x: x + ((du - dv) * TW) / 2, y: y + ((du + dv) * TH) / 2 })).sort((a, b) => a.y - b.y)
  const murcha = v.seca ? 0.6 : 1
  vagas.forEach((p, k) => {
    const bal = Math.sin(t * 2 + idx + k) * (est >= 3 ? 1.2 : 0.5)
    if (est === 0) {
      ctx.fillStyle = '#5b3716'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, 7, 3.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f5e1b8'
      ctx.beginPath()
      ctx.arc(p.x - 2, p.y - 1, 1.6, 0, Math.PI * 2)
      ctx.arc(p.x + 2.5, p.y, 1.6, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    const alt = [0, 8, 15, 22, 26, 26][est] * murcha
    ctx.strokeStyle = '#3f7d20'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + bal, p.y - alt)
    ctx.stroke()
    const cor = v.seca ? '#a3a33a' : cu.folha
    if (est === 1) {
      folha(ctx, p.x - 4 + bal, p.y - alt, 5, 2.6, -0.5, cor)
      folha(ctx, p.x + 4 + bal, p.y - alt, 5, 2.6, 0.5, cor)
      return
    }
    const r = [0, 0, 7, 10, 11, 11][est]
    folha(ctx, p.x - r * 0.7 + bal, p.y - alt * 0.55, r, r * 0.45, -0.6, cor)
    folha(ctx, p.x + r * 0.7 + bal, p.y - alt * 0.6, r, r * 0.45, 0.6, cor)
    folha(ctx, p.x + bal, p.y - alt, r * 0.8, r * 0.6, 0, cor)
    if (est >= 3) folha(ctx, p.x + bal, p.y - alt * 0.85, r * 0.9, r * 0.4, 0, '#ffffff22')
    if (est === 4) {
      ctx.fillStyle = cu.cor
      ctx.globalAlpha = 0.85
      for (const [dx, dy] of [[-6, -0.7], [5, -0.9], [0, -1.15]] as [number, number][]) {
        ctx.beginPath()
        ctx.arc(p.x + dx + bal, p.y + alt * dy, 3.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    if (est === 5) {
      const pulo = Math.abs(Math.sin(t * 3 + idx * 0.7 + k)) * 2
      emoji(ctx, cu.emoji, p.x + bal, p.y - alt - 4 - pulo, 20)
    }
  })
  if (est === 5 && Math.sin(t * 2.3 + idx * 1.7) > 0.85) emoji(ctx, '✨', x + 22, y - 40, 14)
}

function mato(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, t: number): void {
  const pos: [number, number][] = [
    [-26, 4],
    [24, 5],
    [-2, 13],
  ]
  for (let k = 0; k < n; k++) {
    const [dx, dy] = pos[k]
    const bx = x + dx
    const by = y + dy
    ctx.strokeStyle = '#2d5a1b'
    ctx.lineWidth = 2.2
    for (let f = -2; f <= 2; f++) {
      const bal = Math.sin(t * 2.5 + k + f) * 1.5
      ctx.beginPath()
      ctx.moveTo(bx + f * 2, by)
      ctx.quadraticCurveTo(bx + f * 4, by - 8, bx + f * 6 + bal, by - 14 + Math.abs(f) * 2)
      ctx.stroke()
    }
  }
}

function bichos(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, t: number): void {
  const pos: [number, number][] = [
    [-14, -14],
    [16, -20],
    [2, -6],
  ]
  for (let k = 0; k < n; k++) {
    const [dx, dy] = pos[k]
    emoji(ctx, '🐛', x + dx + Math.sin(t * 3 + k * 2) * 4, y + dy + Math.cos(t * 4 + k) * 1.5, 16)
  }
}

function balao(ctx: CanvasRenderingContext2D, x: number, y: number, ch: string, t: number): void {
  const yy = y + Math.sin(t * 3) * 2
  ctx.fillStyle = '#ffffffee'
  ctx.strokeStyle = '#0003'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, yy, 13, 0, Math.PI * 2)
  ctx.moveTo(x - 4, yy + 11)
  ctx.lineTo(x, yy + 19)
  ctx.lineTo(x + 4, yy + 11)
  ctx.fill()
  ctx.stroke()
  emoji(ctx, ch, x, yy + 1, 15)
}

/* ---------- canteiro ---------- */
function solo(ctx: CanvasRenderingContext2D, x: number, y: number, v: Vista, destaque: boolean): void {
  const f = 0.92
  const topo = losangoPts(x, y, f)
  const esp = 7
  if (v.solo === 'fechado') {
    ctx.setLineDash([5, 5])
    poligono(ctx, topo, v.venda ? '#8fd46a' : '#79c255', v.venda ? '#ffffffaa' : '#00000022', 2)
    ctx.setLineDash([])
    if (destaque) poligono(ctx, topo, '#ffffff33', '#fff', 2)
    return
  }
  const seca = v.solo === 'plantado' && v.seca
  const corTopo = seca ? '#c39a64' : v.solo === 'plantado' ? '#7a4a24' : '#8f5a2c'
  // laterais (espessura)
  poligono(ctx, [topo[3], topo[2], { x: topo[2].x, y: topo[2].y + esp }, { x: topo[3].x, y: topo[3].y + esp }], '#5a3415')
  poligono(ctx, [topo[2], topo[1], { x: topo[1].x, y: topo[1].y + esp }, { x: topo[2].x, y: topo[2].y + esp }], '#6b4019')
  poligono(ctx, topo, corTopo, '#00000030', 1.5)
  // sulcos
  ctx.strokeStyle = seca ? '#a07a48' : '#00000033'
  ctx.lineWidth = 3
  for (let k = 1; k <= 3; k++) {
    const a = meio(topo[0], topo[3], k / 4)
    const b = meio(topo[1], topo[2], k / 4)
    ctx.beginPath()
    ctx.moveTo(a.x + 3, a.y)
    ctx.lineTo(b.x - 3, b.y)
    ctx.stroke()
  }
  if (seca) {
    // rachaduras
    ctx.strokeStyle = '#8a6438'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x - 20, y - 2)
    ctx.lineTo(x - 10, y + 3)
    ctx.lineTo(x - 2, y - 1)
    ctx.moveTo(x + 8, y + 8)
    ctx.lineTo(x + 18, y + 4)
    ctx.stroke()
  }
  if (destaque) poligono(ctx, topo, '#ffffff22', '#fff', 2.5)
}

function murcho(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = '#8a6a3a'
  ctx.lineWidth = 2
  for (const [du, dv] of VAGAS) {
    const p = { x: x + ((du - dv) * TW) / 2, y: y + ((du + dv) * TH) / 2 }
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + 2, p.y - 12)
    ctx.lineTo(p.x + 8, p.y - 8)
    ctx.moveTo(p.x + 1, p.y - 7)
    ctx.lineTo(p.x - 5, p.y - 10)
    ctx.stroke()
  }
}

function placaVenda(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#8b5a2b'
  ctx.fillRect(x - 2, y - 30, 4, 30)
  ctx.fillStyle = '#f5deb3'
  ctx.strokeStyle = '#8b5a2b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x - 26, y - 48, 52, 22, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#7c2d12'
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('À VENDA', x, y - 37)
}

/* ---------- cena completa ---------- */
interface Item {
  prof: number
  fn: () => void
}

const TUFOS = Array.from({ length: 70 }, (_, k) => {
  const a = Math.sin(k * 12.9898) * 43758.5453
  const b = Math.sin(k * 78.233) * 12345.678
  return { c: -3.4 + (a - Math.floor(a)) * 11.8, r: -2 + (b - Math.floor(b)) * 7.8 }
})

const NUVENS = [
  { x: -300, y: -330, s: 1 },
  { x: 120, y: -380, s: 0.8 },
  { x: 480, y: -320, s: 1.2 },
  { x: 820, y: -360, s: 0.9 },
]

export interface Efeitos {
  textos: { texto: string; x: number; y: number; cor: string; vida: number }[]
  voos: { emoji: string; de: Ponto; para: Ponto; t: number; dur: number }[]
}

export function desenhar(ctx: CanvasRenderingContext2D, cam: Camera, larg: number, alt: number, cena: Cena, t: number, hover: number, objHover: string | null, ef: Efeitos, dt: number): void {
  ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0)
  // céu e grama em tela cheia
  const horizonte = cam.paraTela({ x: 0, y: -250 }).y
  const g = ctx.createLinearGradient(0, horizonte - 400 * cam.esc, 0, horizonte)
  g.addColorStop(0, '#5ec2f5')
  g.addColorStop(1, '#c9f0ff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, larg, Math.max(0, horizonte))
  ctx.fillStyle = '#6fbf4a'
  ctx.fillRect(0, Math.max(0, horizonte), larg, alt)
  cam.aplicar(ctx)

  // sol, nuvens e morros
  const sol = { x: 640, y: -420 }
  ctx.fillStyle = '#fff6b0'
  ctx.beginPath()
  ctx.arc(sol.x, sol.y, 46, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffe14d'
  ctx.beginPath()
  ctx.arc(sol.x, sol.y, 36, 0, Math.PI * 2)
  ctx.fill()
  for (const n of NUVENS) {
    const x = ((n.x + t * 8 * n.s + 900) % 1800) - 900
    ctx.fillStyle = '#ffffffdd'
    for (const [dx, dy, r] of [[0, 0, 26], [28, -8, 32], [58, 0, 24], [30, 8, 24]]) {
      ctx.beginPath()
      ctx.arc(x + dx * n.s, n.y + dy * n.s, r * n.s, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  for (const [x, rx, ry, cor] of [[-700, 420, 120, '#5aa83c'], [-150, 380, 90, '#62b443'], [500, 460, 130, '#57a33a'], [1100, 420, 110, '#62b443']] as [number, number, number, string][]) {
    ctx.fillStyle = cor
    ctx.beginPath()
    ctx.ellipse(x, -250, rx, ry, 0, Math.PI, 0)
    ctx.fill()
  }
  ctx.fillStyle = '#6fbf4a'
  ctx.fillRect(-3000, -251, 6000, 3000)

  // área da roça (grama mais clara) e caminho
  const campo = [iso(-3.6, -2.2), iso(8.6, -2.2), iso(8.6, 6.2), iso(-3.6, 6.2)]
  poligono(ctx, campo, '#82cc58', '#5ea23d', 3)
  ctx.strokeStyle = '#4f9433'
  ctx.lineWidth = 1.5
  for (const f of TUFOS) {
    const p = iso(f.c, f.r)
    ctx.beginPath()
    ctx.moveTo(p.x - 4, p.y)
    ctx.lineTo(p.x - 2, p.y - 6)
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x, p.y - 8)
    ctx.moveTo(p.x + 4, p.y)
    ctx.lineTo(p.x + 2, p.y - 6)
    ctx.stroke()
  }
  // caminho de terra da casa até a frente
  ctx.fillStyle = '#d9b77c'
  poligono(ctx, [iso(-1.2, 0.5), iso(-0.7, 0.5), iso(-0.7, 6.2), iso(-1.2, 6.2)], '#d9b77c')
  poligono(ctx, [iso(-1.2, 4), iso(8.6, 4), iso(8.6, 4.5), iso(-1.2, 4.5)], '#d9b77c')

  // cerca do fundo
  cerca(ctx, [-3.6, -2.2], [8.6, -2.2])
  cerca(ctx, [-3.6, -2.2], [-3.6, 6.2])

  // canteiros (no chão)
  cena.vistas.forEach((v, i) => {
    const p = centroCanteiro(i)
    solo(ctx, p.x, p.y, v, hover === i)
  })

  // objetos em pé, do fundo para a frente
  const itens: Item[] = []
  cena.vistas.forEach((v, i) => {
    const c = i % COLS
    const r = Math.floor(i / COLS)
    const p = centroCanteiro(i)
    itens.push({
      prof: c + r,
      fn: () => {
        if (v.solo === 'fechado') {
          if (v.venda) placaVenda(ctx, p.x, p.y + 8)
          return
        }
        if (v.solo === 'murcho') murcho(ctx, p.x, p.y)
        if (v.solo === 'plantado') {
          mato(ctx, p.x, p.y, v.mato, t)
          planta(ctx, p.x, p.y, v, t, i)
          bichos(ctx, p.x, p.y, v.bicho, t)
          if (v.seca) balao(ctx, p.x - 20, p.y - 52, '💧', t + i)
        }
      },
    })
  })
  const destaqueObj = (nome: string, fn: () => void): (() => void) => () => {
    if (objHover === nome) {
      ctx.save()
      ctx.shadowColor = '#fff'
      ctx.shadowBlur = 18
      fn()
      ctx.restore()
    } else fn()
  }
  itens.push({
    prof: CASA.c + CASA.w + CASA.r + CASA.d - 0.5,
    fn: destaqueObj('casa', () =>
      construcao(ctx, CASA, '#f8e7c4', '#ead2a4', cena.telhado, '#00000055', 40, ({ esq, dir }) => {
        quadNaParede(ctx, esq, 0.38, 0.62, 0, 0.62, '#8b5a2b')
        quadNaParede(ctx, esq, 0.08, 0.28, 0.4, 0.75, '#9bd5f5')
        quadNaParede(ctx, esq, 0.72, 0.92, 0.4, 0.75, '#9bd5f5')
        quadNaParede(ctx, dir, 0.3, 0.7, 0.4, 0.75, '#9bd5f5')
      }),
    ),
  })
  itens.push({
    prof: CELEIRO.c + CELEIRO.w + CELEIRO.r + CELEIRO.d - 0.5,
    fn: destaqueObj('celeiro', () => {
      construcao(ctx, CELEIRO, '#c0392b', '#a93226', '#7f1d1d', '#00000066', 46, ({ esq }) => {
        quadNaParede(ctx, esq, 0.3, 0.7, 0, 0.7, '#f5f5f4')
        quadNaParede(ctx, esq, 0.34, 0.66, 0.04, 0.64, '#7c2d12', '#fff')
        const a = esq(0.34, 0.04)
        const b = esq(0.66, 0.64)
        const c2 = esq(0.66, 0.04)
        const d = esq(0.34, 0.64)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.moveTo(c2.x, c2.y)
        ctx.lineTo(d.x, d.y)
        ctx.stroke()
      })
      const p = iso(CELEIRO.c + CELEIRO.w / 2, CELEIRO.r + CELEIRO.d / 2)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('CELEIRO', p.x, p.y - CELEIRO.h - 58)
    }),
  })
  const pm = iso(MURAL.c, MURAL.r)
  itens.push({
    prof: MURAL.c + MURAL.r,
    fn: destaqueObj('mural', () => {
      ctx.fillStyle = '#7c4a1e'
      ctx.fillRect(pm.x - 22, pm.y - 30, 5, 30)
      ctx.fillRect(pm.x + 17, pm.y - 30, 5, 30)
      ctx.fillStyle = '#a0682f'
      ctx.beginPath()
      ctx.roundRect(pm.x - 28, pm.y - 62, 56, 36, 4)
      ctx.fill()
      ctx.fillStyle = '#fef3c7'
      ctx.fillRect(pm.x - 22, pm.y - 57, 20, 14)
      ctx.fillStyle = '#bfdbfe'
      ctx.fillRect(pm.x + 2, pm.y - 54, 20, 16)
      ctx.fillStyle = '#fbcfe8'
      ctx.fillRect(pm.x - 16, pm.y - 44, 18, 13)
    }),
  })
  itens.push({ prof: -3.3, fn: () => arvore(ctx, -1.2, -2.1, t) })
  itens.push({ prof: 6, fn: () => arvore(ctx, 8.1, -2.1, t, 0.85) })
  itens.push({ prof: 12.1, fn: () => arvore(ctx, 8.0, 4.1, t, 1.1) })
  itens.push({ prof: 2.6, fn: () => arvore(ctx, -3.0, 5.6, t, 0.9) })
  if (cena.cachorro) {
    const casinha = { c: -2.9, r: 3.2, w: 0.7, d: 0.7, h: 22 }
    itens.push({
      prof: casinha.c + casinha.r + 1.4,
      fn: () =>
        construcao(ctx, casinha, '#d97706', '#b45309', '#1d4ed8', '#00000055', 16, ({ esq }) => {
          const a = esq(0.5, 0)
          ctx.fillStyle = '#1f1306'
          ctx.beginPath()
          ctx.ellipse(a.x, a.y - 6, 6, 9, 0, Math.PI, 0)
          ctx.lineTo(a.x + 6, a.y)
          ctx.lineTo(a.x - 6, a.y)
          ctx.fill()
        }),
    })
    // o cachorro passeia entre a casinha e os canteiros
    const fase = (Math.sin(t * 0.35) + 1) / 2
    const cc = -1.9 + fase * 1.2
    const rr = 3.6 + Math.sin(t * 0.9) * 0.4
    const p = iso(cc, rr)
    const virado = Math.cos(t * 0.35) < 0
    itens.push({
      prof: cc + rr,
      fn: () => {
        ctx.save()
        ctx.translate(p.x, p.y - 12 - Math.abs(Math.sin(t * 6)) * 2)
        if (!virado) ctx.scale(-1, 1)
        emoji(ctx, '🐕', 0, 0, 30)
        ctx.restore()
      },
    })
  }
  itens.sort((a, b) => a.prof - b.prof).forEach((it) => it.fn())

  // placa com o nome do dono
  const pd = iso(-1.0, 6.4)
  ctx.fillStyle = '#8b5a2b'
  ctx.fillRect(pd.x - 3, pd.y - 30, 6, 30)
  ctx.fillStyle = '#fde68a'
  ctx.strokeStyle = '#8b5a2b'
  ctx.lineWidth = 3
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif'
  const larguraPlaca = ctx.measureText(cena.dono).width + 24
  ctx.beginPath()
  ctx.roundRect(pd.x - larguraPlaca / 2, pd.y - 58, larguraPlaca, 28, 6)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#7c2d12'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(cena.dono, pd.x, pd.y - 44)

  // voos (colheita indo para o celeiro) e textos que sobem
  ef.voos = ef.voos.filter((v) => (v.t += dt) < v.dur)
  for (const v of ef.voos) {
    const f = v.t / v.dur
    const x = v.de.x + (v.para.x - v.de.x) * f
    const y = v.de.y + (v.para.y - v.de.y) * f - Math.sin(f * Math.PI) * 90
    ctx.globalAlpha = f > 0.85 ? (1 - f) / 0.15 : 1
    emoji(ctx, v.emoji, x, y, 22)
    ctx.globalAlpha = 1
  }
  ef.textos = ef.textos.filter((x) => (x.vida -= dt) > 0)
  for (const x of ef.textos) {
    x.y -= dt * 34
    ctx.globalAlpha = Math.min(1, x.vida * 1.5)
    ctx.font = '900 18px "Trebuchet MS", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 4
    ctx.strokeStyle = '#000a'
    ctx.strokeText(x.texto, x.x, x.y)
    ctx.fillStyle = x.cor
    ctx.fillText(x.texto, x.x, x.y)
    ctx.globalAlpha = 1
  }
}
