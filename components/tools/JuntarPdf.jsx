'use client'

import { useState } from 'react'
import { FileDrop, FileList, Notice } from '../ui'
import { downloadBlob, formatBytes } from '@/lib/client'

export default function JuntarPdf() {
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const merge = async () => {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const output = await PDFDocument.create()
      for (const [index, file] of files.entries()) {
        setStatus(`Adicionando ${index + 1} de ${files.length}: ${file.name}`)
        try {
          const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
          const pages = await output.copyPages(source, source.getPageIndices())
          pages.forEach((page) => output.addPage(page))
        } catch {
          throw new Error(`Não foi possível ler "${file.name}". Ele pode estar corrompido ou protegido por senha.`)
        }
      }
      const bytes = await output.save()
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'pdf-unido.pdf')
      setStatus(`Pronto! ${output.getPageCount()} páginas, ${formatBytes(bytes.length)}. O download começou.`)
    } catch (err) {
      setStatus('')
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-stack">
      <FileDrop
        accept="application/pdf,.pdf"
        multiple
        onFiles={(added) => setFiles((current) => [...current, ...added])}
        label="Adicionar PDFs"
        hint="Use as setas para definir a ordem final."
      />
      <FileList files={files} setFiles={setFiles} />
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={files.length < 2 || busy} onClick={merge}>
          {busy ? 'Juntando…' : `Juntar ${files.length || ''} PDFs`}
        </button>
        {files.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setFiles([])}>
            Limpar lista
          </button>
        )}
      </div>
      {files.length === 1 && <Notice>Adicione pelo menos mais um PDF.</Notice>}
      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>
    </div>
  )
}
