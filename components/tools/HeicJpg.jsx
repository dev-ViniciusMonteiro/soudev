'use client'

import { useEffect, useState } from 'react'
import { Field, FileDrop, Notice } from '../ui'
import { baseName, downloadBlob, formatBytes, loadHeic2any } from '@/lib/client'

export default function HeicJpg() {
  const [quality, setQuality] = useState('0.92')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => () => results.forEach((item) => URL.revokeObjectURL(item.url)), [results])

  const convert = async (files) => {
    setBusy(true)
    setError('')
    const done = []
    const failed = []
    try {
      setStatus('Carregando o conversor…')
      const heic2any = await loadHeic2any()
      for (const [index, file] of files.entries()) {
        setStatus(`Convertendo ${index + 1} de ${files.length}: ${file.name}`)
        try {
          const output = await heic2any({ blob: file, toType: 'image/jpeg', quality: Number(quality) })
          const blob = Array.isArray(output) ? output[0] : output
          done.push({ blob, url: URL.createObjectURL(blob), name: `${baseName(file.name)}.jpg`, before: file.size })
        } catch {
          failed.push(file.name)
        }
      }
      setResults((current) => [...current, ...done])
      setStatus(done.length ? `${done.length} foto(s) convertida(s).` : '')
      if (failed.length) setError(`Não foi possível converter: ${failed.join(', ')}. Confira se são arquivos HEIC/HEIF.`)
    } catch {
      setStatus('')
      setError('Não foi possível carregar o conversor. Verifique sua conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const downloadAll = async () => {
    for (const item of results) {
      downloadBlob(item.blob, item.name)
      await new Promise((resolve) => setTimeout(resolve, 350))
    }
  }

  return (
    <div className="tool-stack">
      <Field label="Qualidade do JPG">
        <select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={busy}>
          <option value="0.92">Alta (recomendada)</option>
          <option value="0.8">Média (arquivo menor)</option>
          <option value="0.6">Baixa (bem leve)</option>
        </select>
      </Field>
      <FileDrop accept=".heic,.heif,image/heic,image/heif" multiple onFiles={convert} label={busy ? 'Convertendo…' : 'Escolher fotos HEIC'} hint="Você pode selecionar várias fotos de uma vez." />
      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>
      {results.length > 1 && (
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={downloadAll}>Baixar todas ({results.length})</button>
          <button type="button" className="btn btn-ghost" onClick={() => setResults([])}>Limpar</button>
        </div>
      )}
      <div className="thumb-grid">
        {results.map((item) => (
          <a key={item.url} href={item.url} download={item.name} className="thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.name} />
            <span>{item.name}</span>
            <span className="muted">{formatBytes(item.before)} → {formatBytes(item.blob.size)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
