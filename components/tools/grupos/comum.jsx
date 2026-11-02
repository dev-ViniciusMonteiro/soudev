'use client'

import { useEffect, useRef, useState } from 'react'
import './grupos.css'

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Estado salvo no navegador, com valor inicial de exemplo. */
export function useLocal(chave, inicial) {
  const [v, setV] = useState(null)
  const pronto = useRef(false)
  useEffect(() => {
    let d = null
    try {
      d = JSON.parse(localStorage.getItem(chave) || 'null')
    } catch {}
    setV(d ?? (typeof inicial === 'function' ? inicial() : inicial))
    pronto.current = true
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pronto.current || v === null) return
    try {
      localStorage.setItem(chave, JSON.stringify(v))
    } catch {}
  }, [chave, v])
  return [v, setV]
}

async function copiarTexto(t) {
  try {
    await navigator.clipboard.writeText(t)
  } catch {
    const a = document.createElement('textarea')
    a.value = t
    document.body.appendChild(a)
    a.select()
    document.execCommand('copy')
    a.remove()
  }
}

export function BotaoCopiar({ texto, rotulo = 'Copiar', className = 'btn btn-ghost btn-sm' }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await copiarTexto(texto)
        setOk(true)
        setTimeout(() => setOk(false), 1500)
      }}
    >
      {ok ? '✓ Copiado' : rotulo}
    </button>
  )
}

/** Caixa de compartilhar: link, copiar, WhatsApp e QR Code. */
export function Compartilhar({ link, mensagem, titulo = 'Compartilhe', dica }) {
  const [qr, setQr] = useState('')
  const [verQr, setVerQr] = useState(false)
  useEffect(() => {
    if (!verQr || !link) return
    import('qrcode').then(({ default: QR }) => QR.toDataURL(link, { width: 480, margin: 1 }).then(setQr))
  }, [verQr, link])
  if (!link) return null
  return (
    <div className="gp-compartilhar">
      <b>{titulo}</b>
      {dica && <p className="muted small">{dica}</p>}
      <div className="gp-link">
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link para compartilhar" />
        <BotaoCopiar texto={link} rotulo="Copiar link" className="btn btn-primary btn-sm" />
      </div>
      <div className="gp-acoes">
        <a className="btn btn-sm gp-zap" href={`https://wa.me/?text=${encodeURIComponent(`${mensagem ? `${mensagem} ` : ''}${link}`)}`} target="_blank" rel="noopener noreferrer">Enviar no WhatsApp</a>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVerQr((v) => !v)}>{verQr ? 'Esconder QR Code' : 'QR Code'}</button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.share({ text: mensagem, url: link }).catch(() => {})}>Mais…</button>
        )}
      </div>
      {verQr && qr && <img className="gp-qr" src={qr} alt="QR Code do link" />}
    </div>
  )
}

export function Aviso({ tom = 'info', children }) {
  return <div className="gp-aviso" data-tom={tom}>{children}</div>
}

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <p className="muted tool-loading">
      <span className="spinner" aria-hidden="true" /> {texto}
    </p>
  )
}

/** Atualiza a cada N segundos enquanto a aba está visível. */
export function useIntervalo(fn, ms, ativo = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!ativo) return
    const t = setInterval(() => {
      if (!document.hidden) ref.current()
    }, ms)
    return () => clearInterval(t)
  }, [ms, ativo])
}
