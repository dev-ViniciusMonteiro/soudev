'use client'

import { useEffect, useRef, useState } from 'react'
import { Field, FileDrop, Notice, Tabs } from '../ui'
import { baseName, canvasToBlob, downloadBlob, openPdf, renderPdfPage } from '@/lib/client'

const PAD_W = 1000
const PAD_H = 360
const CORES = { azul: '#1d3a8a', preto: '#111111' }

// Recorta o espaço vazio em volta da assinatura e devolve PNG + proporção.
function trimCanvas(source) {
  const ctx = source.getContext('2d')
  const { data, width, height } = ctx.getImageData(0, 0, source.width, source.height)
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) return null
  const pad = 8
  left = Math.max(0, left - pad)
  top = Math.max(0, top - pad)
  const w = Math.min(width, right + pad) - left
  const h = Math.min(height, bottom + pad) - top
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d').drawImage(source, left, top, w, h, 0, 0, w, h)
  return { url: out.toDataURL('image/png'), ratio: h / w }
}

function SignaturePad({ color, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * PAD_W, y: ((event.clientY - rect.top) / rect.height) * PAD_H }
  }

  const start = (event) => {
    event.preventDefault()
    canvasRef.current.setPointerCapture(event.pointerId)
    drawing.current = true
    last.current = point(event)
  }

  const move = (event) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const p = point(event)
    ctx.strokeStyle = color
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(trimCanvas(canvasRef.current))
  }

  const clear = () => {
    canvasRef.current.getContext('2d').clearRect(0, 0, PAD_W, PAD_H)
    onChange(null)
  }

  return (
    <div className="tool-stack">
      <canvas
        ref={canvasRef}
        width={PAD_W}
        height={PAD_H}
        className="sign-pad"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Quadro para desenhar a assinatura"
      />
      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={clear}>Limpar assinatura</button>
        <span className="muted small">Desenhe com o mouse ou com o dedo.</span>
      </div>
    </div>
  )
}

function TypedSignature({ color, onChange }) {
  const [name, setName] = useState('')
  useEffect(() => {
    if (!name.trim()) return onChange(null)
    const canvas = document.createElement('canvas')
    canvas.width = PAD_W
    canvas.height = PAD_H
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = color
    ctx.font = 'italic 110px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 20, PAD_H / 2, PAD_W - 40)
    onChange(trimCanvas(canvas))
  }, [name, color, onChange])

  return (
    <Field label="Seu nome">
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite seu nome" />
    </Field>
  )
}

export default function AssinarPdf() {
  const [mode, setMode] = useState('desenhar')
  const [color, setColor] = useState('azul')
  const [signature, setSignature] = useState(null)
  const [file, setFile] = useState(null)
  const [pages, setPages] = useState([])
  const [placements, setPlacements] = useState([])
  const [size, setSize] = useState(30)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = async ([selected]) => {
    setBusy(true)
    setError('')
    setPages([])
    setPlacements([])
    try {
      const pdf = await openPdf(selected)
      const rendered = []
      for (let n = 1; n <= pdf.numPages; n++) {
        setStatus(`Carregando página ${n} de ${pdf.numPages}…`)
        const first = await pdf.getPage(n)
        const scale = Math.min(1.6, 900 / first.getViewport({ scale: 1 }).width)
        const { canvas } = await renderPdfPage(pdf, n, scale)
        const blob = await canvasToBlob(canvas, 'image/jpeg', 0.85)
        rendered.push({ n, url: URL.createObjectURL(blob) })
      }
      setFile(selected)
      setPages(rendered)
      setStatus('')
    } catch (err) {
      console.error(err)
      setStatus('')
      setError('Não foi possível abrir este PDF. Verifique se ele não está protegido por senha.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => () => pages.forEach((page) => URL.revokeObjectURL(page.url)), [pages])

  const place = (pageIndex, event) => {
    if (!signature) return setError('Primeiro desenhe ou digite sua assinatura.')
    setError('')
    const rect = event.currentTarget.getBoundingClientRect()
    setPlacements((current) => [
      ...current,
      { id: `${Date.now()}-${current.length}`, page: pageIndex, x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height },
    ])
  }

  const exportPdf = async () => {
    setBusy(true)
    setError('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      const image = await doc.embedPng(signature.url)
      for (const p of placements) {
        const page = doc.getPage(p.page)
        const { width: W, height: H } = page.getSize()
        const w = (size / 100) * W
        const h = w * signature.ratio
        page.drawImage(image, { x: p.x * W - w / 2, y: H - p.y * H - h / 2, width: w, height: h })
      }
      const bytes = await doc.save()
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName(file.name)}-assinado.pdf`)
      setStatus('Pronto! O download do PDF assinado começou.')
    } catch (err) {
      console.error(err)
      setError('Não foi possível gerar o PDF assinado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-stack">
      <div className="tool-split">
        <div className="tool-form">
          <h2 className="tool-subtitle">1. Sua assinatura</h2>
          <Tabs tabs={[['desenhar', 'Desenhar'], ['digitar', 'Digitar']]} value={mode} onChange={(next) => { setMode(next); setSignature(null) }} />
          {mode === 'desenhar' ? <SignaturePad color={CORES[color]} onChange={setSignature} /> : <TypedSignature color={CORES[color]} onChange={setSignature} />}
          <Field label="Cor da tinta">
            <select value={color} onChange={(event) => setColor(event.target.value)}>
              <option value="azul">Azul</option>
              <option value="preto">Preto</option>
            </select>
          </Field>
        </div>
        <div className="tool-form">
          <h2 className="tool-subtitle">2. Documento</h2>
          <FileDrop accept="application/pdf,.pdf" onFiles={load} label={busy && !pages.length ? 'Abrindo…' : 'Escolher PDF'} />
          {signature && (
            <div className="sign-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature.url} alt="Prévia da assinatura" />
            </div>
          )}
        </div>
      </div>

      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>

      {pages.length > 0 && (
        <>
          <h2 className="tool-subtitle">3. Clique na página onde a assinatura deve ficar</h2>
          <div className="grid-2">
            <Field label={`Tamanho da assinatura: ${size}% da largura da página`}>
              <input type="range" min="10" max="60" value={size} onChange={(event) => setSize(Number(event.target.value))} />
            </Field>
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={exportPdf} disabled={busy || !placements.length || !signature}>
                {busy ? 'Gerando…' : `Baixar PDF assinado${placements.length ? ` (${placements.length})` : ''}`}
              </button>
              {placements.length > 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => setPlacements([])}>Remover todas</button>
              )}
            </div>
          </div>
          <div className="sign-pages">
            {pages.map((page, index) => (
              <div key={page.url} className="sign-page" onClick={(event) => place(index, event)} role="presentation">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.url} alt={`Página ${page.n}`} draggable={false} />
                <span className="sign-page-label">Página {page.n}</span>
                {signature &&
                  placements
                    .filter((p) => p.page === index)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="sign-placed"
                        style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${size}%` }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setPlacements((current) => current.filter((item) => item.id !== p.id))
                        }}
                        title="Clique para remover"
                        aria-label="Remover assinatura"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={signature.url} alt="" />
                      </button>
                    ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
