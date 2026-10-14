'use client'

import { useEffect } from 'react'

// Bloco de anúncio do Google AdSense. Só aparece quando as variáveis de ambiente estão configuradas na Vercel.
const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT

export default function AdSlot() {
  useEffect(() => {
    if (!client || !slot) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Bloqueadores de anúncio podem impedir o carregamento; a página segue funcionando.
    }
  }, [])

  if (!client || !slot) return null
  return (
    <ins
      className="adsbygoogle ad-slot"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
