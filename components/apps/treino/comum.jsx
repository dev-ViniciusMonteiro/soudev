'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useColecao } from '@/lib/treino/banco'

/* ---------- Biblioteca de exercícios (base pública + os seus) ---------- */

const CDN = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'
let cacheBase = null

export function useBiblioteca() {
  const [base, setBase] = useState(cacheBase)
  const meus = useColecao('exercicios')
  useEffect(() => {
    if (cacheBase) return
    fetch('/apps/treino/exercicios.json')
      .then((r) => r.json())
      .then((d) => {
        cacheBase = d
        setBase(d)
      })
      .catch(() => setBase([]))
  }, [])
  return useMemo(() => {
    if (!base || !meus) return null
    const todos = [...meus.map((m) => ({ ...m, meu: true })), ...base]
    const porId = new Map(todos.map((e) => [e.id, e]))
    return { todos, porId, de: (id) => porId.get(id) }
  }, [base, meus])
}

const BibCtx = createContext(null)
export const BibProvider = BibCtx.Provider
export const useBib = () => useContext(BibCtx)

export const nomeEx = (ex) => (ex ? ex.pt || ex.n : 'Exercício removido')
export const fotoUrl = (ex, i = 0) => (ex && !ex.meu && ex.img > i ? `${CDN}${encodeURIComponent(ex.id).replace(/%2F/g, '/')}/${i}.jpg` : null)

/** Foto do exercício. Com duas imagens, alterna início e fim do movimento como uma animação. */
export function FotoExercicio({ ex, tamanho = 56, animar = false, className = '' }) {
  const [quadro, setQuadro] = useState(0)
  const [erro, setErro] = useState(false)
  const [midia, setMidia] = useState(null)
  useEffect(() => {
    if (!animar || !ex || ex.img < 2) return
    const t = setInterval(() => setQuadro((q) => 1 - q), 900)
    return () => clearInterval(t)
  }, [animar, ex])
  useEffect(() => {
    if (!ex?.meu || !(ex.blob instanceof Blob)) return
    const u = URL.createObjectURL(ex.blob)
    setMidia(u)
    return () => URL.revokeObjectURL(u)
  }, [ex])
  const estilo = { width: tamanho, height: tamanho }
  if (ex?.meu && midia) {
    return ex.blob.type.startsWith('video/') ? (
      <video className={`tr-foto ${className}`} style={estilo} src={midia} muted loop autoPlay={animar} playsInline />
    ) : (
      <img className={`tr-foto ${className}`} style={estilo} src={midia} alt="" />
    )
  }
  const url = fotoUrl(ex, quadro)
  if (!url || erro)
    return (
      <span className={`tr-foto tr-foto-vazia ${className}`} style={estilo} aria-hidden="true">
        {(nomeEx(ex)[0] || '?').toUpperCase()}
      </span>
    )
  return <img className={`tr-foto ${className}`} style={estilo} src={url} alt="" loading="lazy" onError={() => setErro(true)} />
}

/* ---------- Modal ---------- */

export function Modal({ titulo, onFechar, children, largo = false, rodape = null }) {
  const caixa = useRef(null)
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar?.()
    window.addEventListener('keydown', esc)
    caixa.current?.focus()
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return (
    <div className="tr-modal-fundo" onPointerDown={(e) => e.target === e.currentTarget && onFechar?.()}>
      <div className={`tr-modal ${largo ? 'tr-modal-largo' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1} ref={caixa}>
        <header className="tr-modal-topo">
          <h2>{titulo}</h2>
          {onFechar && (
            <button type="button" className="tr-icone" onClick={onFechar} aria-label="Fechar">
              ✕
            </button>
          )}
        </header>
        <div className="tr-modal-corpo">{children}</div>
        {rodape && <footer className="tr-modal-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}

/* ---------- Aviso com desfazer ---------- */

const AvisoCtx = createContext(() => {})
export const useAviso = () => useContext(AvisoCtx)

export function AvisoProvider({ children }) {
  const [aviso, setAviso] = useState(null)
  const timer = useRef(null)
  const mostrar = (texto, desfazer = null, ms = 5000) => {
    clearTimeout(timer.current)
    setAviso({ texto, desfazer, id: Date.now() })
    timer.current = setTimeout(() => setAviso(null), ms)
  }
  return (
    <AvisoCtx.Provider value={mostrar}>
      {children}
      {aviso && (
        <div className="tr-aviso" role="status" key={aviso.id}>
          <span>{aviso.texto}</span>
          {aviso.desfazer && (
            <button
              type="button"
              onClick={() => {
                aviso.desfazer()
                setAviso(null)
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      )}
    </AvisoCtx.Provider>
  )
}

/* ---------- Linha que desliza: esquerda apaga, direita copia ---------- */

export function Deslizavel({ onApagar, onCopiar, children }) {
  const [dx, setDx] = useState(0)
  const inicio = useRef(null)
  const LIMITE = 90
  const fim = () => {
    if (dx < -LIMITE) onApagar?.()
    else if (dx > LIMITE) onCopiar?.()
    inicio.current = null
    setDx(0)
  }
  return (
    <div className="tr-desliza">
      <div className="tr-desliza-fundo" aria-hidden="true">
        <span className="tr-desliza-copiar">{onCopiar ? '⧉ Copiar' : ''}</span>
        <span className="tr-desliza-apagar">Apagar 🗑</span>
      </div>
      <div
        className="tr-desliza-frente"
        style={{ transform: `translateX(${dx}px)`, transition: inicio.current === null ? 'transform .2s' : 'none' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          inicio.current = { x: e.clientX, y: e.clientY, ativo: false }
        }}
        onPointerMove={(e) => {
          const i = inicio.current
          if (!i) return
          const mx = e.clientX - i.x
          if (!i.ativo && Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(e.clientY - i.y)) {
            i.ativo = true
            e.currentTarget.setPointerCapture(e.pointerId)
          }
          if (i.ativo) setDx(Math.max(onCopiar ? -140 : -140, Math.min(onCopiar ? 140 : 0, mx)))
        }}
        onPointerUp={fim}
        onPointerCancel={fim}
        onClickCapture={(e) => {
          if (Math.abs(dx) > 5) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ---------- Gráfico de linha (com ponto e dica ao passar o mouse) ---------- */

export function GraficoLinha({ pontos, unidade = '', meta = null, altura = 180, rotulo = 'Valor' }) {
  const [foco, setFoco] = useState(null)
  const caixa = useRef(null)
  if (!pontos?.length) return <p className="tr-vazio">Ainda sem dados para o gráfico.</p>
  const L = 600
  const A = altura
  const m = { e: 44, d: 12, t: 12, b: 26 }
  const vals = pontos.map((p) => p.valor).concat(meta ? [meta] : [])
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (min === max) {
    min -= 1
    max += 1
  }
  const folga = (max - min) * 0.1
  min -= folga
  max += folga
  const t0 = new Date(`${pontos[0].data}T12:00`).getTime()
  const t1 = new Date(`${pontos[pontos.length - 1].data}T12:00`).getTime()
  const x = (d) => (t1 === t0 ? (L + m.e - m.d) / 2 : m.e + ((new Date(`${d}T12:00`).getTime() - t0) / (t1 - t0)) * (L - m.e - m.d))
  const y = (v) => m.t + (1 - (v - min) / (max - min)) * (A - m.t - m.b)
  const caminho = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(p.data).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const ticks = [0, 0.5, 1].map((f) => min + folga + f * (max - min - 2 * folga))
  const fmtData = (d) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const mover = (e) => {
    const r = caixa.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * L
    let melhor = 0
    pontos.forEach((p, i) => {
      if (Math.abs(x(p.data) - px) < Math.abs(x(pontos[melhor].data) - px)) melhor = i
    })
    setFoco(melhor)
  }
  const pf = foco !== null ? pontos[foco] : null
  return (
    <div className="tr-grafico">
      <svg ref={caixa} viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`${rotulo}: de ${pontos[0].valor}${unidade} a ${pontos[pontos.length - 1].valor}${unidade}`} onPointerMove={mover} onPointerLeave={() => setFoco(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.e} x2={L - m.d} y1={y(t)} y2={y(t)} className="tr-grade" />
            <text x={m.e - 6} y={y(t) + 4} textAnchor="end" className="tr-eixo">
              {Math.round(t * 10) / 10}
            </text>
          </g>
        ))}
        <text x={m.e} y={A - 6} className="tr-eixo">
          {fmtData(pontos[0].data)}
        </text>
        <text x={L - m.d} y={A - 6} textAnchor="end" className="tr-eixo">
          {fmtData(pontos[pontos.length - 1].data)}
        </text>
        {meta ? (
          <g>
            <line x1={m.e} x2={L - m.d} y1={y(meta)} y2={y(meta)} className="tr-meta" />
            <text x={L - m.d} y={y(meta) - 5} textAnchor="end" className="tr-eixo">
              meta {meta}
              {unidade}
            </text>
          </g>
        ) : null}
        <path d={caminho} className="tr-linha" />
        {pontos.length <= 40 && pontos.map((p) => <circle key={p.data} cx={x(p.data)} cy={y(p.valor)} r="4" className="tr-ponto" />)}
        {pf && (
          <g>
            <line x1={x(pf.data)} x2={x(pf.data)} y1={m.t} y2={A - m.b} className="tr-cruz" />
            <circle cx={x(pf.data)} cy={y(pf.valor)} r="6" className="tr-ponto tr-ponto-foco" />
          </g>
        )}
      </svg>
      {pf && (
        <div className="tr-dica" style={{ left: `${(x(pf.data) / L) * 100}%` }}>
          <strong>
            {pf.valor}
            {unidade}
          </strong>
          <span>{fmtData(pf.data)}</span>
        </div>
      )}
    </div>
  )
}

/* ---------- Formatos ---------- */

export const fmtData = (iso, opts = { weekday: 'short', day: '2-digit', month: 'short' }) => new Date(`${iso.slice(0, 10)}T12:00`).toLocaleDateString('pt-BR', opts)
export const fmtDuracao = (seg) => {
  const s = Math.max(0, Math.round(seg))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
}
export const fmtKg = (n) => `${Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
export const fmtNum = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
