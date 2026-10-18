'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clipesEm, comKeyframe, duracaoProjeto, fimDo, valorEm } from '@/lib/editor/modelo'
import { caixaDoClipe, desenharQuadro } from '@/lib/editor/render'

/** Grava a propriedade: se ela já tem keyframes, cria/atualiza o keyframe no tempo atual. */
export function definirAnimavel(c, prop, v, tl) {
  if (c.kf?.[prop]?.length) return comKeyframe(c, prop, tl, v)
  if (prop === 'opac') return { ...c, t: { ...c.t, opac: v / 100 } }
  if (prop === 'vol') return { ...c, vol: v / 100 }
  if (prop === 'desfoque') return { ...c, efeitos: { ...c.efeitos, desfoque: v } }
  return { ...c, t: { ...c.t, [prop]: v } }
}

const ZOOMS = [
  ['ajustar', 'Ajustar'],
  [0.25, '25%'],
  [0.5, '50%'],
  [0.75, '75%'],
  [1, '100%'],
  [1.5, '150%'],
  [2, '200%'],
]

export default function Previa({ projeto, midias, tempo, setTempo, tocando, setTocando, selecao, selecionar, mudarClipe }) {
  const canvas = useRef(null)
  const caixa = useRef(null)
  const els = useRef(new Map())
  const urls = useRef(new Map())
  const imgs = useRef(new Map())
  const estado = useRef({ projeto, tempo })
  const [zoom, setZoom] = useState('ajustar')
  const [ajuste, setAjuste] = useState(0.3)
  const arraste = useRef(null)
  const pan = useRef(null)
  estado.current = { projeto, tempo }

  const urlDe = (m) => {
    if (!urls.current.has(m.id)) urls.current.set(m.id, URL.createObjectURL(m.blob))
    return urls.current.get(m.id)
  }

  const fonteDe = useCallback((c) => {
    if (c.tipo === 'video') return els.current.get(c.id)
    if (c.tipo === 'imagem') return imgs.current.get(c.midia)
    return null
  }, [])

  const desenhar = useCallback(() => {
    const cv = canvas.current
    if (!cv) return
    const { projeto: p, tempo: t } = estado.current
    desenharQuadro(cv.getContext('2d'), p, t, fonteDe, { redesenhar: () => requestAnimationFrame(desenhar) })
  }, [fonteDe])

  // elementos de mídia (um <video>/<audio> por clipe, uma <img> por imagem)
  useEffect(() => {
    const vivos = new Set()
    for (const tr of projeto.trilhas)
      for (const c of tr.itens) {
        const m = midias.get(c.midia)
        if (!m) continue
        if (c.tipo === 'video' || c.tipo === 'audio') {
          vivos.add(c.id)
          let el = els.current.get(c.id)
          if (!el || el.dataset.midia !== m.id) {
            el?.pause()
            el = document.createElement(c.tipo === 'video' ? 'video' : 'audio')
            el.preload = 'auto'
            el.playsInline = true
            el.crossOrigin = 'anonymous'
            el.dataset.midia = m.id
            el.src = urlDe(m)
            el.addEventListener('seeked', () => !estado.current.tocando && desenhar())
            el.addEventListener('loadeddata', desenhar)
            els.current.set(c.id, el)
          }
        } else if (c.tipo === 'imagem' && !imgs.current.has(m.id)) {
          const img = new Image()
          img.onload = desenhar
          img.src = urlDe(m)
          imgs.current.set(m.id, img)
        }
      }
    for (const [id, el] of els.current)
      if (!vivos.has(id)) {
        el.pause()
        els.current.delete(id)
      }
  }, [projeto, midias, desenhar])

  useEffect(
    () => () => {
      els.current.forEach((el) => el.pause())
      urls.current.forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  // sincroniza áudio e vídeo com o relógio
  const sincronizar = useCallback((t, tocandoAgora) => {
    const p = estado.current.projeto
    for (const tr of p.trilhas)
      for (const c of tr.itens) {
        const el = els.current.get(c.id)
        if (!el) continue
        const ativo = t >= c.inicio && t < fimDo(c)
        const alvo = c.corte + (t - c.inicio) * (c.vel || 1)
        if (!ativo) {
          if (!el.paused) el.pause()
          continue
        }
        el.playbackRate = c.vel || 1
        el.preservesPitch = c.tom !== false
        el.muted = tr.mudo || c.mudo
        el.volume = Math.max(0, Math.min(1, valorEm(c, 'vol', t - c.inicio) / 100))
        if (tocandoAgora) {
          if (el.paused) {
            el.currentTime = alvo
            el.play().catch(() => {})
          } else if (Math.abs(el.currentTime - alvo) > 0.3) el.currentTime = alvo
        } else {
          if (!el.paused) el.pause()
          if (Math.abs(el.currentTime - alvo) > 0.01) el.currentTime = alvo
        }
      }
  }, [])

  // laço de reprodução
  useEffect(() => {
    estado.current.tocando = tocando
    if (!tocando) {
      sincronizar(estado.current.tempo, false)
      desenhar()
      return
    }
    const fim = duracaoProjeto(estado.current.projeto)
    const t0 = estado.current.tempo >= fim - 0.05 ? 0 : estado.current.tempo
    const inicio = performance.now()
    let raf
    const passo = () => {
      const t = t0 + (performance.now() - inicio) / 1000
      if (t >= fim) {
        setTempo(fim)
        setTocando(false)
        return
      }
      estado.current.tempo = t
      setTempo(t)
      sincronizar(t, true)
      desenhar()
      raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => {
      cancelAnimationFrame(raf)
      els.current.forEach((el) => el.pause())
    }
  }, [tocando, sincronizar, desenhar, setTempo, setTocando])

  // parado: redesenha a cada mudança
  useEffect(() => {
    if (tocando) return
    sincronizar(tempo, false)
    desenhar()
  }, [projeto, tempo, tocando, sincronizar, desenhar])

  useEffect(() => {
    const f = () => desenhar()
    document.fonts?.addEventListener?.('loadingdone', f)
    return () => document.fonts?.removeEventListener?.('loadingdone', f)
  }, [desenhar])

  // zoom "ajustar" acompanha o tamanho da área
  useLayoutEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = () => setAjuste(Math.max(0.05, Math.min((el.clientWidth - 24) / projeto.largura, (el.clientHeight - 24) / projeto.altura)))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [projeto.largura, projeto.altura])

  const esc = zoom === 'ajustar' ? ajuste : zoom
  const sel = selecao.length === 1 ? clipesEm(projeto, tempo).find(({ clipe }) => clipe.id === selecao[0]) : null
  const ctx2d = canvas.current?.getContext('2d')
  const box = sel && ctx2d && sel.clipe.tipo !== 'audio' ? caixaDoClipe(ctx2d, projeto, sel.clipe, tempo, fonteDe(sel.clipe)) : null

  const pontoProjeto = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * projeto.largura, y: ((e.clientY - r.top) / r.height) * projeto.altura }
  }
  const dentro = (b, pt) => {
    const a = (-b.rot * Math.PI) / 180
    const dx = pt.x - b.cx
    const dy = pt.y - b.cy
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    return Math.abs(lx) <= Math.abs(b.w) / 2 && Math.abs(ly) <= Math.abs(b.h) / 2
  }

  const iniciarArraste = (e, modo) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) return iniciarPan(e)
    const pt = pontoProjeto(e)
    let alvo = sel?.clipe
    if (modo === 'mover') {
      const ctx = canvas.current.getContext('2d')
      const visiveis = clipesEm(projeto, tempo).filter(({ trilha, clipe }) => !trilha.oculto && clipe.tipo !== 'audio')
      const topo = [...visiveis].reverse().find(({ clipe }) => dentro(caixaDoClipe(ctx, projeto, clipe, tempo, fonteDe(clipe)), pt))
      if (!topo) {
        selecionar([])
        return
      }
      alvo = topo.clipe
      if (!selecao.includes(alvo.id)) selecionar([alvo.id])
    }
    if (!alvo) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {}
    const tl = tempo - alvo.inicio
    const b = caixaDoClipe(canvas.current.getContext('2d'), projeto, alvo, tempo, fonteDe(alvo))
    arraste.current = { modo, id: alvo.id, pt, tl, b, x: valorEm(alvo, 'x', tl), y: valorEm(alvo, 'y', tl), escala: valorEm(alvo, 'escala', tl), rot: valorEm(alvo, 'rot', tl), sx: alvo.t.sx ?? 1, sy: alvo.t.sy ?? 1, primeiro: true }
  }

  const moverArraste = (e) => {
    if (pan.current) return moverPan(e)
    const a = arraste.current
    if (!a) return
    const pt = pontoProjeto(e)
    const registrar = a.primeiro
    a.primeiro = false
    mudarClipe(
      a.id,
      (c) => {
        if (a.modo === 'mover') {
          let nx = a.x + (pt.x - a.pt.x)
          let ny = a.y + (pt.y - a.pt.y)
          // ímã no centro e nas bordas do quadro
          if (!e.shiftKey) {
            const lim = 12 / esc
            if (Math.abs(nx) < lim) nx = 0
            if (Math.abs(ny) < lim) ny = 0
          }
          return definirAnimavel(definirAnimavel(c, 'x', Math.round(nx), a.tl), 'y', Math.round(ny), a.tl)
        }
        if (a.modo === 'girar') {
          const ang = (Math.atan2(pt.y - a.b.cy, pt.x - a.b.cx) * 180) / Math.PI + 90
          let r = Math.round(ang)
          if (!e.shiftKey) for (const s of [-180, -90, 0, 90, 180, 270]) if (Math.abs(r - s) < 5) r = s
          return definirAnimavel(c, 'rot', ((r + 540) % 360) - 180, a.tl)
        }
        const ang = (-a.b.rot * Math.PI) / 180
        const loc = (q) => ({ x: (q.x - a.b.cx) * Math.cos(ang) - (q.y - a.b.cy) * Math.sin(ang), y: (q.x - a.b.cx) * Math.sin(ang) + (q.y - a.b.cy) * Math.cos(ang) })
        const p0 = loc(a.pt)
        const p1 = loc(pt)
        if (a.modo === 'canto') {
          const f = Math.hypot(p1.x, p1.y) / (Math.hypot(p0.x, p0.y) || 1)
          return definirAnimavel(c, 'escala', Math.max(0.01, Math.round(a.escala * f * 1000) / 1000), a.tl)
        }
        if (a.modo === 'lado-x') return { ...c, t: { ...c.t, sx: Math.max(0.01, Math.round(a.sx * (Math.abs(p1.x) / (Math.abs(p0.x) || 1)) * 1000) / 1000) } }
        if (a.modo === 'lado-y') return { ...c, t: { ...c.t, sy: Math.max(0.01, Math.round(a.sy * (Math.abs(p1.y) / (Math.abs(p0.y) || 1)) * 1000) / 1000) } }
        return c
      },
      registrar,
    )
  }

  const fimArraste = () => {
    arraste.current = null
    pan.current = null
  }

  const iniciarPan = (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {}
    pan.current = { x: e.clientX, y: e.clientY, sl: caixa.current.scrollLeft, st: caixa.current.scrollTop }
  }
  const moverPan = (e) => {
    caixa.current.scrollLeft = pan.current.sl - (e.clientX - pan.current.x)
    caixa.current.scrollTop = pan.current.st - (e.clientY - pan.current.y)
  }

  const alca = (x, y, modo, cursor) => <rect key={modo + x + y} x={x - 9 / esc} y={y - 9 / esc} width={18 / esc} height={18 / esc} rx={4 / esc} className="ed-alca" style={{ cursor }} onPointerDown={(e) => (e.stopPropagation(), iniciarArraste(e, modo))} />

  return (
    <div className="ed-previa">
      <div
        className="ed-previa-area"
        ref={caixa}
        onWheel={(e) => {
          if (!e.ctrlKey) return
          e.preventDefault()
          const atual = zoom === 'ajustar' ? ajuste : zoom
          setZoom(Math.max(0.05, Math.min(4, Math.round(atual * (e.deltaY < 0 ? 1.1 : 0.9) * 100) / 100)))
        }}
      >
        <div className="ed-previa-palco" style={{ width: projeto.largura * esc, height: projeto.altura * esc }}>
          <canvas ref={canvas} width={projeto.largura} height={projeto.altura} style={{ width: projeto.largura * esc, height: projeto.altura * esc }} onPointerDown={(e) => iniciarArraste(e, 'mover')} onPointerMove={moverArraste} onPointerUp={fimArraste} onPointerCancel={fimArraste} onDoubleClick={() => setTocando((t) => !t)} aria-label="Prévia do vídeo" />
          {box && (
            <svg className="ed-alcas" viewBox={`0 0 ${projeto.largura} ${projeto.altura}`} onPointerMove={moverArraste} onPointerUp={fimArraste} onPointerCancel={fimArraste}>
              <g transform={`translate(${box.cx} ${box.cy}) rotate(${box.rot})`}>
                <rect x={-box.w / 2} y={-box.h / 2} width={box.w} height={box.h} className="ed-alca-caixa" onPointerDown={(e) => iniciarArraste(e, 'mover')} />
                <line x1="0" y1={-box.h / 2} x2="0" y2={-box.h / 2 - 50 / esc} className="ed-alca-linha" />
                <circle cx="0" cy={-box.h / 2 - 50 / esc} r={10 / esc} className="ed-alca" style={{ cursor: 'grab' }} onPointerDown={(e) => (e.stopPropagation(), iniciarArraste(e, 'girar'))} />
                {[
                  [-1, -1],
                  [1, -1],
                  [1, 1],
                  [-1, 1],
                ].map(([sx, sy]) => alca((sx * box.w) / 2, (sy * box.h) / 2, 'canto', sx * sy > 0 ? 'nwse-resize' : 'nesw-resize'))}
                {alca(box.w / 2, 0, 'lado-x', 'ew-resize')}
                {alca(-box.w / 2, 0, 'lado-x', 'ew-resize')}
                {alca(0, box.h / 2, 'lado-y', 'ns-resize')}
                {alca(0, -box.h / 2, 'lado-y', 'ns-resize')}
              </g>
            </svg>
          )}
        </div>
      </div>
      <div className="ed-previa-barra">
        <select value={zoom} onChange={(e) => setZoom(e.target.value === 'ajustar' ? 'ajustar' : Number(e.target.value))} aria-label="Zoom da prévia">
          {ZOOMS.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
          {zoom !== 'ajustar' && !ZOOMS.some(([v]) => v === zoom) && <option value={zoom}>{Math.round(zoom * 100)}%</option>}
        </select>
        <span className="ed-dica">
          {projeto.largura}×{projeto.altura} · Ctrl+roda: zoom · Alt+arrastar: mover a vista
        </span>
        <button type="button" className="ed-icone" onClick={() => caixa.current?.requestFullscreen?.()} title="Tela cheia">
          ⛶
        </button>
      </div>
    </div>
  )
}
