'use client'

import { useRef, useState } from 'react'
import { FileDrop, Notice, Tabs } from '../ui'
import { baseName, downloadBlob, openPdf } from '@/lib/client'

async function pdfToDocx(file, onProgress) {
  const pdf = await openPdf(file)
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const children = []
  let totalChars = 0

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress(`Lendo página ${pageNumber} de ${pdf.numPages}…`)
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const lines = []
    let line = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      line += item.str
      if (item.hasEOL) {
        lines.push(line)
        line = ''
      }
    }
    if (line) lines.push(line)
    if (!lines.length) lines.push('')

    lines.forEach((text, index) => {
      totalChars += text.trim().length
      children.push(
        new Paragraph({
          pageBreakBefore: pageNumber > 1 && index === 0,
          children: [new TextRun(text)],
        }),
      )
    })
  }

  const doc = new Document({ sections: [{ children }] })
  return { blob: await Packer.toBlob(doc), totalChars, pages: pdf.numPages }
}

const PREVIEW_STYLE = `<style>
  body { font-family: Calibri, Arial, sans-serif; color: #111; max-width: 780px; margin: 32px auto; padding: 0 24px; line-height: 1.5; }
  img { max-width: 100%; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 4px 8px; }
  @page { margin: 18mm; }
</style>`

export default function PdfWord() {
  const [mode, setMode] = useState('pdf')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [html, setHtml] = useState('')
  const [docName, setDocName] = useState('')
  const frameRef = useRef(null)

  const reset = (next) => {
    setMode(next)
    setStatus('')
    setError('')
    setHtml('')
  }

  const convertPdf = async ([file]) => {
    setBusy(true)
    setError('')
    try {
      const result = await pdfToDocx(file, setStatus)
      downloadBlob(result.blob, `${baseName(file.name)}.docx`)
      setStatus(
        result.totalChars
          ? `Pronto! ${result.pages} página(s) convertidas. O download começou.`
          : 'Arquivo gerado, mas nenhum texto foi encontrado. O PDF parece ser escaneado (imagem).',
      )
    } catch (err) {
      console.error(err)
      setStatus('')
      setError('Não foi possível ler este PDF. Verifique se ele não está protegido por senha.')
    } finally {
      setBusy(false)
    }
  }

  const convertWord = async ([file]) => {
    setBusy(true)
    setError('')
    setStatus('Lendo o documento…')
    try {
      const mod = await import('mammoth/mammoth.browser.js')
      const mammoth = mod.default ?? mod
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
      setDocName(baseName(file.name))
      setHtml(`<!doctype html><html><head><meta charset="utf-8"><title>${baseName(file.name)}</title>${PREVIEW_STYLE}</head><body>${result.value}</body></html>`)
      setStatus('Confira a prévia e clique em "Salvar como PDF".')
    } catch (err) {
      console.error(err)
      setStatus('')
      setError('Não foi possível ler este arquivo. Use um documento .docx (Word 2007 ou mais recente).')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-stack">
      <Tabs tabs={[['pdf', 'PDF → Word'], ['word', 'Word → PDF']]} value={mode} onChange={reset} />

      {mode === 'pdf' ? (
        <FileDrop accept="application/pdf,.pdf" onFiles={convertPdf} label={busy ? 'Convertendo…' : 'Escolher PDF'} hint="O texto do PDF vira um documento .docx editável." />
      ) : (
        <FileDrop
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onFiles={convertWord}
          label={busy ? 'Lendo…' : 'Escolher .docx'}
          hint="Arquivos .docx. Documentos .doc antigos precisam ser salvos como .docx antes."
        />
      )}

      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>

      {mode === 'word' && html && (
        <div className="tool-stack">
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => frameRef.current?.contentWindow?.print()}>
              Salvar como PDF
            </button>
            <span className="muted">Na janela que abrir, escolha “Salvar como PDF” para gerar {docName}.pdf</span>
          </div>
          <iframe ref={frameRef} className="doc-preview" title="Prévia do documento" srcDoc={html} />
        </div>
      )}
    </div>
  )
}
