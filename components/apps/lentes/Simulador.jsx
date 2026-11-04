'use client'

// Simulador de visão através da lente. Para cada pixel: distância do objeto (mapa da cena) + zona da lente
// naquele ponto (adição e astigmatismo indesejado) + acomodação da idade → erro de foco em dioptrias →
// borrão = pupila × erro. A cena é ampliada para o texto caber na tela, e o borrão é ampliado na mesma proporção.
//
// Desempenho: a cena tem poucas distâncias (rua, parede, monitor, mesa, celular). Para cada pixel da janela e
// cada distância, o borrão é calculado uma vez (ao mudar receita, tipo, pupila ou tamanho); arrastar a cena
// (mexer a cabeça) só consulta essas tabelas.

import { useEffect, useRef, useState } from 'react'
import { DIST, cenaMesa } from './cenas'
import { acomodacaoUtil, borraoGraus, equivalente, erroComLente, erroSemOculos, zonaDaLente } from './optica'

const NIVEIS = [0, 1, 2, 3.5, 5.5, 8, 11, 15, 20] // raio do borrão (px) de cada versão pré-desfocada
const CENA_W = 1000, CENA_H = 640
const DISTS = Object.values(DIST) // cada pixel da cena guarda o índice da sua distância
const ND = DISTS.length

let cacheCena = null // a cena e os níveis de desfoque são caros: feitos uma vez por página
function prepararCena() {
  if (cacheCena) return cacheCena
  const { cor, dist } = cenaMesa(CENA_W, CENA_H)
  const classe = new Uint8Array(dist.length)
  for (let i = 0; i < dist.length; i++) { let k = 0; while (k < ND - 1 && DISTS[k] !== dist[i]) k++; classe[i] = k }
  const niveis = NIVEIS.map((r) => {
    const c = document.createElement('canvas'); c.width = CENA_W; c.height = CENA_H
    const g = c.getContext('2d', { willReadFrequently: true })
    if (r > 0) g.filter = `blur(${(r * 0.55).toFixed(2)}px)` // desvio padrão ≈ metade do raio do disco de borrão
    g.drawImage(cor, 0, 0)
    return g.getImageData(0, 0, CENA_W, CENA_H).data
  })
  cacheCena = { classe, niveis }
  return cacheCena
}

/** Nível de desfoque (índice inferior) e peso (0–255) para um raio em px. */
function nivelDe(r) {
  let k = 0
  while (k < NIVEIS.length - 2 && NIVEIS[k + 1] < r) k++
  const t = Math.min(1, Math.max(0, (r - NIVEIS[k]) / (NIVEIS[k + 1] - NIVEIS[k])))
  return [k, Math.round(t * 255)]
}

export default function Simulador({ R, tipo, pupila, semOculos, material }) {
  const caixa = useRef(null)
  const tela = useRef(null)
  const estado = useRef({ ox: 0, oy: 0, vw: 0, vh: 0, esc: 1, tab: null, chave: '' })
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const el = caixa.current
    const medir = () => {
      const vw = Math.min(820, Math.round(el.clientWidth))
      if (!vw) return
      const vh = Math.round(vw * 0.62)
      const st = estado.current
      if (st.vw === vw) return
      st.vw = vw; st.vh = vh
      tela.current.width = vw; tela.current.height = vh
      const esc = vw / 900 // a cena é um pouco maior que a janela: dá para mexer a cabeça
      st.esc = esc
      st.ox = Math.max(0, (CENA_W * esc - vw) / 2); st.oy = Math.max(0, (CENA_H * esc - vh) / 2)
      st.chave = ''
      atualizar()
    }
    prepararCena()
    setPronto(true)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // recalcula as tabelas só quando algo que muda o borrão mudou
  useEffect(() => { atualizar() })

  function atualizar() {
    const st = estado.current
    if (!st.vw || !cacheCena) return
    const chave = JSON.stringify([tipo, pupila, semOculos, R.olhos.od, R.adicao, R.idade, material?.abbe, st.vw])
    if (chave !== st.chave) { montarTabelas(); st.chave = chave }
    desenhar()
  }

  function montarTabelas() {
    const st = estado.current
    const { vw, vh, esc } = st
    const n = vw * vh
    const nivel = new Uint8Array(n * ND), peso = new Uint8Array(n * ND)
    const dx = new Int16Array(n), dy = new Int16Array(n), fx = new Int8Array(n), fy = new Int8Array(n), escuro = new Uint8Array(n)
    const acom = acomodacaoUtil(R.idade)
    const olho = R.olhos.od
    const S = equivalente(olho)
    const pxGrau = vw / 21 // a cena mostra ~21° na horizontal (ampliada para leitura)
    const kBorrao = (borraoGraus(1, pupila) * pxGrau) / 2 / esc // raio (px da cena) por dioptria
    const P = Math.abs(S)
    const abbe = material?.abbe ?? 58
    const pxPorPrisma = (0.573 * pxGrau) / esc // 1 dioptria prismática ≈ 0,573°
    // borrão sem óculos depende só da distância: igual para todo pixel fora da lente
    const sem = DISTS.map((d) => nivelDe(erroSemOculos(d, S, olho.cil, acom) * kBorrao))
    const cx = vw / 2, cy = vh * 0.5, rx = vw * 0.47, ry = vh * 0.48
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
      const i = y * vw + x
      const lx = (x - cx) / rx, ly = (cy - y) / ry
      const naLente = !semOculos && lx ** 4 + ly ** 4 <= 1
      if (!naLente) {
        for (let d = 0; d < ND; d++) { nivel[i * ND + d] = sem[d][0]; peso[i * ND + d] = sem[d][1] }
        continue
      }
      const z = zonaDaLente(tipo, R.adicao, lx, ly)
      for (let d = 0; d < ND; d++) {
        const [k, t] = nivelDe((erroComLente(DISTS[d], z.add, acom) + z.astig / 2) * kBorrao)
        nivel[i * ND + d] = k; peso[i * ND + d] = t
      }
      // distorção lateral das progressivas: a imagem "escorrega" para os lados; salto de imagem no bifocal
      if (z.astig > 0) { dx[i] = Math.round((x < cx ? -1 : 1) * z.astig * 6 / esc); dy[i] = Math.round(z.astig * 3 / esc) }
      if (z.prisma) dy[i] -= Math.round((z.prisma * vh) / esc)
      if (z.linha) escuro[i] = 1
      // franja colorida: prisma de Prentice (cm × D) dividido pelo Abbe; abaixo de ~0,1 Δ o olho não percebe
      const raioCm = Math.hypot(lx * 2.6, ly * 1.9)
      const franja = Math.max(0, (raioCm * P) / abbe - 0.1) * pxPorPrisma
      if (franja > 0.6) {
        const ux = x - cx, uy = y - cy, dd = Math.hypot(ux, uy) || 1
        fx[i] = Math.max(-127, Math.min(127, Math.round((ux / dd) * franja)))
        fy[i] = Math.max(-127, Math.min(127, Math.round((uy / dd) * franja)))
      }
    }
    st.tab = { nivel, peso, dx, dy, fx, fy, escuro }
  }

  function desenhar() {
    const st = estado.current
    if (!st.tab || !cacheCena) return
    const { vw, vh, esc, ox, oy } = st
    const { classe, niveis } = cacheCena
    const { nivel, peso, dx, dy, fx, fy, escuro } = st.tab
    const g = tela.current.getContext('2d')
    const img = g.createImageData(vw, vh)
    const out = img.data
    const inv = 1 / esc
    for (let y = 0; y < vh; y++) {
      const sy0 = ((y + oy) * inv) | 0
      for (let x = 0; x < vw; x++) {
        const i = y * vw + x, o = i * 4
        const sx = (((x + ox) * inv) | 0) + dx[i], sy = sy0 + dy[i]
        if (sx < 0 || sy < 0 || sx >= CENA_W || sy >= CENA_H) { out[o] = out[o + 1] = out[o + 2] = 30; out[o + 3] = 255; continue }
        const c = classe[sy * CENA_W + sx]
        const k = nivel[i * ND + c], t = peso[i * ND + c] / 255
        const A = niveis[k], B = niveis[k + 1]
        const p = (sy * CENA_W + sx) * 4
        if (fx[i] || fy[i]) {
          const sxr = Math.min(CENA_W - 1, Math.max(0, sx + fx[i])), syr = Math.min(CENA_H - 1, Math.max(0, sy + fy[i]))
          const sxb = Math.min(CENA_W - 1, Math.max(0, sx - fx[i])), syb = Math.min(CENA_H - 1, Math.max(0, sy - fy[i]))
          const pr = (syr * CENA_W + sxr) * 4, pb = (syb * CENA_W + sxb) * 4
          out[o] = A[pr] + (B[pr] - A[pr]) * t
          out[o + 1] = A[p + 1] + (B[p + 1] - A[p + 1]) * t
          out[o + 2] = A[pb + 2] + (B[pb + 2] - A[pb + 2]) * t
        } else {
          out[o] = A[p] + (B[p] - A[p]) * t
          out[o + 1] = A[p + 1] + (B[p + 1] - A[p + 1]) * t
          out[o + 2] = A[p + 2] + (B[p + 2] - A[p + 2]) * t
        }
        out[o + 3] = 255
        if (escuro[i]) { out[o] *= 0.55; out[o + 1] *= 0.55; out[o + 2] *= 0.55 }
      }
    }
    g.putImageData(img, 0, 0)
    if (!semOculos) {
      // aro da armação
      g.save()
      g.strokeStyle = 'rgba(20,24,30,.85)'; g.lineWidth = Math.max(6, vw / 90)
      const cx = vw / 2, cy = vh * 0.5, rx = vw * 0.47, ry = vh * 0.48
      g.beginPath()
      for (let a = 0; a <= Math.PI * 2; a += 0.02) {
        const c = Math.cos(a), s = Math.sin(a)
        const px = cx + rx * Math.sign(c) * Math.abs(c) ** 0.5, py = cy - ry * Math.sign(s) * Math.abs(s) ** 0.5
        if (a === 0) g.moveTo(px, py); else g.lineTo(px, py)
      }
      g.closePath(); g.stroke(); g.restore()
    }
  }

  // arrastar = mexer a cabeça (a lente vai junto com o rosto, a cena fica parada)
  useEffect(() => {
    const c = tela.current
    let arrasto = null, pedido = 0
    const baixo = (e) => { arrasto = { x: e.clientX, y: e.clientY, ox: estado.current.ox, oy: estado.current.oy }; c.setPointerCapture(e.pointerId) }
    const mover = (e) => {
      if (!arrasto) return
      const st = estado.current
      const k = st.vw / c.clientWidth
      st.ox = Math.min(CENA_W * st.esc - st.vw, Math.max(0, arrasto.ox - (e.clientX - arrasto.x) * k))
      st.oy = Math.min(CENA_H * st.esc - st.vh, Math.max(0, arrasto.oy - (e.clientY - arrasto.y) * k))
      cancelAnimationFrame(pedido); pedido = requestAnimationFrame(desenhar)
    }
    const solto = () => { arrasto = null }
    c.addEventListener('pointerdown', baixo); c.addEventListener('pointermove', mover); c.addEventListener('pointerup', solto); c.addEventListener('pointercancel', solto)
    return () => { c.removeEventListener('pointerdown', baixo); c.removeEventListener('pointermove', mover); c.removeEventListener('pointerup', solto); c.removeEventListener('pointercancel', solto) }
  })

  return (
    <div className="ln-sim" ref={caixa}>
      <canvas ref={tela} className="ln-sim-tela" aria-label="Simulação da visão através da lente: rua ao longe, monitor e celular" />
      {!pronto && <p className="ln-sim-carregando">Preparando a cena…</p>}
    </div>
  )
}

/** Mapa pequeno das zonas da lente: verde = nítido para longe, azul = perto, vermelho = distorção. */
export function MapaZonas({ tipo, adicao }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, w = 150, h = 112
    c.width = w; c.height = h
    const g = c.getContext('2d'), img = g.createImageData(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lx = (x - w / 2) / (w * 0.47), ly = (h / 2 - y) / (h * 0.48), o = (y * w + x) * 4
      if (lx ** 4 + ly ** 4 > 1) { img.data[o + 3] = 0; continue }
      const z = zonaDaLente(tipo, adicao, lx, ly)
      const perto = adicao ? Math.min(1, z.add / adicao) : 0
      const dist = Math.min(1, z.astig / 0.75)
      img.data[o] = 40 + 200 * dist
      img.data[o + 1] = (190 - 120 * perto) * (1 - dist * 0.7)
      img.data[o + 2] = 90 + 150 * perto * (1 - dist)
      img.data[o + 3] = 255
      if (z.linha) { img.data[o] = img.data[o + 1] = img.data[o + 2] = 20 }
    }
    g.putImageData(img, 0, 0)
  }, [tipo, adicao])
  return <canvas ref={ref} className="ln-mapa" aria-label="Mapa das zonas da lente" />
}
