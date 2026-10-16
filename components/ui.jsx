'use client'

import { useEffect, useRef, useState } from 'react'
import { clip, track } from '@/lib/analytics'
import { formatBytes } from '@/lib/client'

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  )
}

export function NumberInput(props) {
  return <input type="text" inputMode="decimal" autoComplete="off" {...props} />
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          className={value === id ? 'tab active' : 'tab'}
          data-ga="tab"
          onClick={() => {
            if (id !== value) track('tool_tab', { tab_id: id })
            onChange(id)
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function CopyButton({ text, label = 'Copiar', className = 'btn btn-ghost' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      track('copy_result', { action_label: clip(label) })
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button type="button" className={className} onClick={copy} disabled={!text} data-ga="copy">
      {copied ? 'Copiado!' : label}
    </button>
  )
}

export function FileDrop({ accept, multiple = false, onFiles, label, hint }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handle = (fileList, method) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    track('file_upload', {
      method,
      file_count: files.length,
      file_types: clip([...new Set(files.map((file) => file.type || 'desconhecido'))].join(',')),
      total_size_kb: Math.round(files.reduce((sum, file) => sum + file.size, 0) / 1024),
    })
    onFiles(multiple ? files : [files[0]])
  }

  return (
    <div
      className={dragging ? 'dropzone dragging' : 'dropzone'}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        handle(event.dataTransfer.files, 'arrastar')
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          handle(event.target.files, 'escolher')
          event.target.value = ''
        }}
      />
      <button type="button" className="btn btn-primary" data-ga="upload" onClick={() => inputRef.current?.click()}>
        {label || (multiple ? 'Escolher arquivos' : 'Escolher arquivo')}
      </button>
      <p>ou arraste e solte aqui</p>
      {hint && <small>{hint}</small>}
    </div>
  )
}

export function FileList({ files, setFiles }) {
  const move = (index, delta) => {
    const next = [...files]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setFiles(next)
  }
  if (!files.length) return null
  return (
    <ol className="file-list">
      {files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
          <span className="file-name">{file.name}</span>
          <span className="muted">{formatBytes(file.size)}</span>
          <span className="file-actions">
            <button type="button" className="icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover para cima">↑</button>
            <button type="button" className="icon-btn" onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label="Mover para baixo">↓</button>
            <button type="button" className="icon-btn" onClick={() => setFiles(files.filter((_, i) => i !== index))} aria-label="Remover">×</button>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([label, value, highlight]) => (
        <div key={label} className={highlight ? 'stat highlight' : 'stat'}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

export function Rows({ title, rows, total, negative = false }) {
  return (
    <div className="rows">
      {title && <h2 className="tool-subtitle">{title}</h2>}
      {rows.map((row) => (
        <div key={row.label} className="row">
          <span>{row.label}</span>
          <strong>{negative ? '− ' : ''}{row.value}</strong>
        </div>
      ))}
      {total && (
        <div className="row total">
          <span>{total.label}</span>
          <strong>{total.value}</strong>
        </div>
      )}
    </div>
  )
}

export function Notice({ kind = 'info', children }) {
  const message = typeof children === 'string' ? children : ''
  const visible = Boolean(children)
  useEffect(() => {
    if (kind === 'error' && visible) track('tool_error', { error_message: clip(message) || 'erro' })
  }, [kind, message, visible])
  if (!children) return null
  return <p className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>
}
