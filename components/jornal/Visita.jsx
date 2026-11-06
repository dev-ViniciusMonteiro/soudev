'use client'

import { useEffect } from 'react'
import { API } from '@/lib/catalogo/api'

// Conta uma visita por sessão do navegador (sem guardar nada de quem lê).
export default function Visita({ slug }) {
  useEffect(() => {
    try {
      const k = `jn-visita-${slug}`
      if (sessionStorage.getItem(k)) return
      sessionStorage.setItem(k, '1')
    } catch {}
    if (API) fetch(`${API}/jn/jornal/${slug}/visita`, { method: 'POST' }).catch(() => {})
  }, [slug])
  return null
}
