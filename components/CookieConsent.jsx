'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OPEN_CONSENT_EVENT, readConsent, saveConsent } from '@/lib/analytics'

// Aviso de cookies (LGPD). Fica fixo no rodapé da tela: não empurra o conteúdo nem causa CLS.
export default function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [choice, setChoice] = useState({ analytics: true, ads: true })

  useEffect(() => {
    if (!readConsent()) setOpen(true)
    const reopen = () => {
      const saved = readConsent()
      if (saved) setChoice({ analytics: saved.analytics, ads: saved.ads })
      setCustom(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  const decide = (value) => {
    saveConsent(value)
    setOpen(false)
    setCustom(false)
  }

  if (!open) return null

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <div className="cookie-inner">
        <div className="cookie-copy">
          <strong id="cookie-title">Cookies e privacidade</strong>
          <p id="cookie-text" className="muted small">
            Usamos cookies do Google Analytics para saber quais ferramentas são mais usadas e do Google AdSense para mostrar os anúncios
            que mantêm o site grátis. As ferramentas funcionam do mesmo jeito se você recusar.{' '}
            <Link href="/privacidade">Política de privacidade</Link>
          </p>
        </div>

        {custom && (
          <div className="cookie-options">
            <label className="cookie-option">
              <input type="checkbox" checked disabled />
              <span>
                <strong>Necessários</strong>
                <small className="muted">Guardam esta escolha. Sempre ativos.</small>
              </span>
            </label>
            <label className="cookie-option">
              <input type="checkbox" checked={choice.analytics} onChange={(event) => setChoice({ ...choice, analytics: event.target.checked })} />
              <span>
                <strong>Estatísticas</strong>
                <small className="muted">Google Analytics: páginas visitadas e uso das ferramentas, sem o que você digita.</small>
              </span>
            </label>
            <label className="cookie-option">
              <input type="checkbox" checked={choice.ads} onChange={(event) => setChoice({ ...choice, ads: event.target.checked })} />
              <span>
                <strong>Anúncios personalizados</strong>
                <small className="muted">Google AdSense. Recusando, os anúncios continuam, mas sem usar seu perfil.</small>
              </span>
            </label>
          </div>
        )}

        <div className="cookie-actions">
          {custom ? (
            <button type="button" className="btn btn-primary" onClick={() => decide(choice)}>Salvar escolhas</button>
          ) : (
            <>
              <button type="button" className="btn btn-primary" onClick={() => decide({ analytics: true, ads: true })}>Aceitar</button>
              <button type="button" className="btn btn-ghost" onClick={() => decide({ analytics: false, ads: false })}>Recusar</button>
              <button type="button" className="link-btn" onClick={() => setCustom(true)}>Personalizar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function CookiePreferencesButton({ className = 'link-btn' }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Preferências de cookies
    </button>
  )
}
