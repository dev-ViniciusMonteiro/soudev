'use client'

import { useEffect, useState } from 'react'
import { Field, FileDrop, Notice } from '../ui'
import { baseName, canvasToBlob, downloadBlob, loadBackgroundRemoval, loadImage } from '@/lib/client'

export default function RemoverFundo() {
  const [original, setOriginal] = useState(null)
  const [output, setOutput] = useState(null)
  const [background, setBackground] = useState('transparente')
  const [color, setColor] = useState('#ffffff')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => () => original && URL.revokeObjectURL(original.url), [original])
  useEffect(() => () => output && URL.revokeObjectURL(output.url), [output])

  const handleFile = async ([file]) => {
    setBusy(true)
    setError('')
    setOutput(null)
    setOriginal({ url: URL.createObjectURL(file), name: baseName(file.name) })
    try {
      setStatus('Carregando o modelo de IA (só demora na primeira vez)…')
      const { removeBackground } = await loadBackgroundRemoval()
      const blob = await removeBackground(file, {
        output: { format: 'image/png' },
        progress: (key, current, total) => {
          if (key.startsWith('fetch') && total) setStatus(`Baixando modelo de IA: ${Math.round((current / total) * 100)}%`)
          else if (key.startsWith('compute')) setStatus('Removendo o fundo…')
        },
      })
      setOutput({ url: URL.createObjectURL(blob), blob })
      setStatus('')
    } catch (err) {
      console.error(err)
      setStatus('')
      setError('Não foi possível processar a imagem. Tente outra foto ou um navegador atualizado (Chrome, Edge ou Firefox).')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    const name = `${original.name}-sem-fundo.png`
    if (background === 'transparente') return downloadBlob(output.blob, name)
    const { image, url } = await loadImage(output.blob)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    context.fillStyle = background === 'branco' ? '#ffffff' : color
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)
    URL.revokeObjectURL(url)
    downloadBlob(await canvasToBlob(canvas, 'image/jpeg', 0.95), name.replace('.png', '.jpg'))
  }

  const previewBg = background === 'transparente' ? undefined : background === 'branco' ? '#ffffff' : color

  return (
    <div className="tool-stack">
      <FileDrop accept="image/jpeg,image/png,image/webp" onFiles={handleFile} label={busy ? 'Processando…' : 'Escolher imagem'} hint="JPG, PNG ou WebP. Funciona melhor com pessoas, produtos e objetos em destaque." />
      <Notice>{status}</Notice>
      <Notice kind="error">{error}</Notice>
      {original && (
        <div className="compare">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={original.url} alt="Imagem original" />
            <figcaption>Original</figcaption>
          </figure>
          <figure className="checker" style={previewBg ? { background: previewBg } : undefined}>
            {output ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={output.url} alt="Imagem sem fundo" />
            ) : (
              <div className="placeholder">{busy ? <span className="spinner" aria-hidden="true" /> : null}</div>
            )}
            <figcaption>Sem fundo</figcaption>
          </figure>
        </div>
      )}
      {output && (
        <div className="grid-2">
          <Field label="Fundo do arquivo final">
            <select value={background} onChange={(event) => setBackground(event.target.value)}>
              <option value="transparente">Transparente (PNG)</option>
              <option value="branco">Branco (JPG)</option>
              <option value="cor">Cor personalizada (JPG)</option>
            </select>
          </Field>
          {background === 'cor' && (
            <Field label="Cor">
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            </Field>
          )}
          <div className="actions span-2">
            <button type="button" className="btn btn-primary" onClick={download}>Baixar imagem</button>
          </div>
        </div>
      )}
    </div>
  )
}
