'use client'

import { useEffect, useState } from 'react'
import { Field, FileDrop, FileList, Notice, Tabs } from '../ui'
import { baseName, canvasToBlob, downloadBlob, loadImage, openPdf, renderPdfPage } from '@/lib/client'

const A4 = [595.28, 841.89]

async function imageBytes(file) {
  const type = file.type
  if (type === 'image/jpeg' || type === 'image/png') return { bytes: await file.arrayBuffer(), type }
  const { image, url } = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)
  URL.revokeObjectURL(url)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  return { bytes: await blob.arrayBuffer(), type: 'image/jpeg' }
}

function ImagesToPdf() {
  const [files, setFiles] = useState([])
  const [size, setSize] = useState('a4')
  const [margin, setMargin] = useState('20')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const convert = async () => {
    setBusy(true)
    setError('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const pdf = await PDFDocument.create()
      for (const [index, file] of files.entries()) {
        setStatus(`Processando imagem ${index + 1} de ${files.length}…`)
        const { bytes, type } = await imageBytes(file)
        const image = type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
        if (size === 'imagem') {
          const width = image.width * 0.75
          const height = image.height * 0.75
          pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height })
        } else {
          const landscape = image.width > image.height
          const [pageW, pageH] = landscape ? [A4[1], A4[0]] : A4
          const m = Number(margin)
          const scale = Math.min((pageW - m * 2) / image.width, (pageH - m * 2) / image.height)
          const width = image.width * scale
          const height = image.height * scale
          pdf.addPage([pageW, pageH]).drawImage(image, { x: (pageW - width) / 2, y: (pageH - height) / 2, width, height })
        }
      }
      const bytes = await pdf.save()
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), files.length === 1 ? `${baseName(files[0].name)}.pdf` : 'imagens.pdf')
      setStatus('Pronto! O download do PDF começou.')
    } catch (err) {
      console.error(err)
      setStatus('')
      setError('Não foi possível converter uma das imagens. Tente JPG ou PNG.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-stack">
      <FileDrop accept="image/jpeg,image/png,image/webp" multiple onFiles={(added) => setFiles((current) => [...current, ...added])} label="Adicionar imagens" hint="JPG, PNG ou WebP. Cada imagem vira uma página." />
      <FileList files={files} setFiles={setFiles} />
      <div className="grid-2">
        <Field label="Tamanho da página">
          <select value={size} onChange={(event) => setSize(event.target.value)}>
            <option value="a4">A4 (ajusta a imagem)</option>
            <option value="imagem">Mesmo tamanho da imagem</option>
          </select>
        </Field>
        {size === 'a4' && (
          <Field label="Margem">
            <select value={margin} onChange={(event) => setMargin(event.target.value)}>
              <option value="0">Sem margem</option>
              <option value="20">Pequena</option>
              <option value="40">Grande</option>
            </select>
          </Field>
        )}
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!files.length || busy} onClick={convert}>
          {busy ? 'Convertendo…' : 'Gerar PDF'}
        </button>
      </div>
      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>
    </div>
  )
}

function PdfToImages() {
  const [pages, setPages] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => () => pages.forEach((page) => URL.revokeObjectURL(page.url)), [pages])

  const convert = async ([file]) => {
    setBusy(true)
    setError('')
    setPages([])
    try {
      const pdf = await openPdf(file)
      const result = []
      for (let n = 1; n <= pdf.numPages; n++) {
        setStatus(`Renderizando página ${n} de ${pdf.numPages}…`)
        const { canvas } = await renderPdfPage(pdf, n, 2)
        const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
        result.push({ url: URL.createObjectURL(blob), blob, name: `${baseName(file.name)}-pagina-${n}.jpg` })
      }
      setPages(result)
      setStatus(`${result.length} imagem(ns) gerada(s).`)
    } catch (err) {
      console.error(err)
      setStatus('')
      setError('Não foi possível ler este PDF.')
    } finally {
      setBusy(false)
    }
  }

  const downloadAll = async () => {
    for (const page of pages) {
      downloadBlob(page.blob, page.name)
      await new Promise((resolve) => setTimeout(resolve, 350))
    }
  }

  return (
    <div className="tool-stack">
      <FileDrop accept="application/pdf,.pdf" onFiles={convert} label={busy ? 'Convertendo…' : 'Escolher PDF'} />
      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>
      {pages.length > 1 && (
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={downloadAll}>Baixar todas</button>
        </div>
      )}
      <div className="thumb-grid">
        {pages.map((page) => (
          <a key={page.name} href={page.url} download={page.name} className="thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.url} alt={page.name} />
            <span>Baixar {page.name.match(/pagina-\d+/)?.[0].replace('-', ' ')}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default function JpgPdf() {
  const [mode, setMode] = useState('img')
  return (
    <div className="tool-stack">
      <Tabs tabs={[['img', 'Imagens → PDF'], ['pdf', 'PDF → JPG']]} value={mode} onChange={setMode} />
      {mode === 'img' ? <ImagesToPdf /> : <PdfToImages />}
    </div>
  )
}
