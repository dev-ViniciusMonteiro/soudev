'use client'

// Página do convite: lê os dados codificados no próprio link (?c=... ou #c=...) e mostra o convite.
// Sem servidor nem banco: tudo vem do link. Botões de confirmar presença (WhatsApp) e como chegar.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { conviteDataUrl, decodeConvite } from '@/lib/convites'

const soDigitos = (s) => String(s || '').replace(/\D/g, '')

export default function ConvitePage() {
  const [convite, setConvite] = useState(undefined) // undefined = carregando, null = inválido

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('c')
      const h = window.location.hash.startsWith('#c=') ? window.location.hash.slice(3) : ''
      const dados = decodeConvite(q || h)
      setConvite(dados || null)
    } catch { setConvite(null) }
  }, [])

  if (convite === undefined) return <main className="container" style={{ padding: '60px 0', textAlign: 'center' }}><p className="muted">Abrindo o convite…</p></main>

  if (!convite) {
    return (
      <main className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1>Convite não encontrado</h1>
        <p className="muted" style={{ margin: '12px 0 20px' }}>O link parece incompleto ou foi copiado pela metade. Peça para quem enviou mandar o link completo.</p>
        <Link href="/ferramentas/gerador-de-convite" className="btn btn-primary">Criar o meu convite grátis</Link>
      </main>
    )
  }

  const tel = soDigitos(convite.rsvp)
  const whats = tel.length >= 10 ? `https://wa.me/55${tel}?text=${encodeURIComponent('Olá! Confirmo minha presença. 🎉')}` : null
  const mapa = convite.endereco || convite.local ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([convite.local, convite.endereco].filter(Boolean).join(' '))}` : null

  return (
    <main className="cv-page-view">
      <style>{`
        .cv-page-view{min-height:100%;display:flex;flex-direction:column;align-items:center;gap:18px;padding:24px 16px 48px}
        .cv-page-view .cv-card{width:100%;max-width:480px;border-radius:16px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.25)}
        .cv-page-view .cv-card img{width:100%;display:block}
        .cv-page-view .cv-acoes{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:480px;width:100%}
        .cv-page-view .cv-rodape{color:var(--muted);font-size:13px;text-align:center;margin-top:8px}
      `}</style>
      <div className="cv-card">
        <img src={conviteDataUrl(convite)} alt={`Convite: ${convite.titulo || ''}`} />
      </div>
      <div className="cv-acoes">
        {whats && <a className="btn btn-primary" href={whats} target="_blank" rel="noopener">✅ Confirmar presença</a>}
        {mapa && <a className="btn btn-ghost" href={mapa} target="_blank" rel="noopener">📍 Como chegar</a>}
      </div>
      <p className="cv-rodape">
        Feito com o <Link href="/ferramentas/gerador-de-convite">gerador de convites grátis</Link>.
      </p>
    </main>
  )
}
