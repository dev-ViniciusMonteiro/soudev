'use client'

import { useState } from 'react'
import { Field, FileDrop, Notice, NumberInput, Tabs } from '../ui'
import { baseName, downloadBlob, formatBytes } from '@/lib/client'

// "1-3, 5, 8-10" -> [0, 1, 2, 4, 7, 8, 9] (índices de página, sem repetir, na ordem digitada)
export function parseIntervalos(text, total) {
  const pages = []
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/)
    if (!match) throw new Error(`“${part}” não é um intervalo válido. Use algo como 1-3, 5.`)
    const start = Number(match[1])
    const end = match[2] ? Number(match[2]) : start
    if (start < 1 || end > total || start > end) throw new Error(`O intervalo “${part}” está fora das ${total} páginas do arquivo.`)
    for (let p = start; p <= end; p++) if (!pages.includes(p - 1)) pages.push(p - 1)
  }
  if (!pages.length) throw new Error('Informe pelo menos uma página.')
  return pages
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 350))

export default function DividirPdf() {
  const [file, setFile] = useState(null)
  const [total, setTotal] = useState(0)
  const [mode, setMode] = useState('extrair')
  const [intervalo, setIntervalo] = useState('1')
  const [cada, setCada] = useState('2')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = async ([selected]) => {
    setError('')
    setStatus('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const pdf = await PDFDocument.load(await selected.arrayBuffer(), { ignoreEncryption: true })
      setFile(selected)
      setTotal(pdf.getPageCount())
      setIntervalo(`1-${Math.min(2, pdf.getPageCount())}`)
    } catch {
      setFile(null)
      setError('Não foi possível ler este PDF. Verifique se ele não está protegido por senha.')
    }
  }

  const split = async () => {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      const name = baseName(file.name)

      let groups
      if (mode === 'extrair') groups = [parseIntervalos(intervalo, total)]
      else if (mode === 'todas') groups = Array.from({ length: total }, (_, i) => [i])
      else {
        const n = Math.trunc(Number(cada))
        if (!(n >= 1)) throw new Error('Informe de quantas em quantas páginas dividir.')
        groups = []
        for (let i = 0; i < total; i += n) groups.push(Array.from({ length: Math.min(n, total - i) }, (_, k) => i + k))
      }

      for (const [index, pages] of groups.entries()) {
        setStatus(`Gerando arquivo ${index + 1} de ${groups.length}…`)
        const output = await PDFDocument.create()
        const copied = await output.copyPages(source, pages)
        copied.forEach((page) => output.addPage(page))
        const bytes = await output.save()
        const label = pages.length === 1 ? `pagina-${pages[0] + 1}` : groups.length === 1 ? 'paginas' : `paginas-${pages[0] + 1}-${pages.at(-1) + 1}`
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${name}-${label}.pdf`)
        if (groups.length > 1) await pause()
      }
      setStatus(groups.length === 1 ? 'Pronto! O download começou.' : `Pronto! ${groups.length} arquivos baixados.`)
    } catch (err) {
      setStatus('')
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-stack">
      <FileDrop accept="application/pdf,.pdf" onFiles={load} label="Escolher PDF" />
      {file && (
        <>
          <p className="muted">
            <strong>{file.name}</strong>: {total} {total === 1 ? 'página' : 'páginas'}, {formatBytes(file.size)}
          </p>
          <Tabs tabs={[['extrair', 'Extrair páginas'], ['todas', 'Separar todas'], ['cada', 'A cada N páginas']]} value={mode} onChange={setMode} />
          {mode === 'extrair' && (
            <Field label="Páginas para extrair" hint="Exemplo: 1-3, 5, 8-10. As páginas vão para um único PDF.">
              <input value={intervalo} onChange={(event) => setIntervalo(event.target.value)} />
            </Field>
          )}
          {mode === 'todas' && <Notice>Cada uma das {total} páginas vira um PDF separado.</Notice>}
          {mode === 'cada' && (
            <Field label="Dividir a cada quantas páginas">
              <NumberInput value={cada} onChange={(event) => setCada(event.target.value)} inputMode="numeric" />
            </Field>
          )}
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={split} disabled={busy}>
              {busy ? 'Dividindo…' : 'Dividir PDF'}
            </button>
          </div>
        </>
      )}
      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>
    </div>
  )
}
