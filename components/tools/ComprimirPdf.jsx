'use client'

import { useState } from 'react'
import { Field, FileDrop, Notice, Stats } from '../ui'
import { baseName, canvasToBlob, downloadBlob, formatBytes, openPdf, renderPdfPage } from '@/lib/client'

const LEVELS = {
  leve: { label: 'Leve (melhor qualidade)', scale: 1.6, quality: 0.75 },
  media: { label: 'Recomendada', scale: 1.3, quality: 0.6 },
  forte: { label: 'Forte (menor arquivo)', scale: 1, quality: 0.42 },
}

export default function ComprimirPdf() {
  const [level, setLevel] = useState('media')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const compress = async ([file]) => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const { scale, quality } = LEVELS[level]
      const pdf = await openPdf(file)
      const { PDFDocument } = await import('pdf-lib')
      const output = await PDFDocument.create()
      for (let n = 1; n <= pdf.numPages; n++) {
        setStatus(`Comprimindo página ${n} de ${pdf.numPages}…`)
        const { canvas, width, height } = await renderPdfPage(pdf, n, scale)
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
        const image = await output.embedJpg(await blob.arrayBuffer())
        output.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height })
        canvas.width = 0
        canvas.height = 0
      }
      const bytes = await output.save()
      setResult({ before: file.size, after: bytes.length, blob: new Blob([bytes], { type: 'application/pdf' }), name: `${baseName(file.name)}-comprimido.pdf` })
      setStatus('')
    } catch (err) {
      console.error(err)
      setStatus('')
      setError('Não foi possível comprimir este PDF. Verifique se ele não está protegido por senha.')
    } finally {
      setBusy(false)
    }
  }

  const saved = result ? 1 - result.after / result.before : 0

  return (
    <div className="tool-stack">
      <Field label="Nível de compressão">
        <select value={level} onChange={(event) => setLevel(event.target.value)} disabled={busy}>
          {Object.entries(LEVELS).map(([id, item]) => (
            <option key={id} value={id}>{item.label}</option>
          ))}
        </select>
      </Field>
      <FileDrop accept="application/pdf,.pdf" onFiles={compress} label={busy ? 'Comprimindo…' : 'Escolher PDF'} />
      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>
      {result && (
        <>
          <Stats
            items={[
              ['Antes', formatBytes(result.before)],
              ['Depois', formatBytes(result.after)],
              ['Redução', saved > 0 ? `${Math.round(saved * 100)}%` : 'nenhuma', true],
            ]}
          />
          {saved > 0.02 ? (
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={() => downloadBlob(result.blob, result.name)}>
                Baixar PDF comprimido
              </button>
            </div>
          ) : (
            <Notice kind="warn">Este PDF já está otimizado. Tente o nível “Forte” ou mantenha o arquivo original.</Notice>
          )}
        </>
      )}
    </div>
  )
}
