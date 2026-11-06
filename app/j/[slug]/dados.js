import { cache } from 'react'

const API = (process.env.NEXT_PUBLIC_IDEIAS_API || '').replace(/\/$/, '')

// Busca o jornal no worker (uma vez por requisição, compartilhada entre página e metadata).
export const carregarJornal = cache(async (slug) => {
  if (!API || !/^[a-z0-9-]{3,30}$/.test(slug)) return null
  const r = await fetch(`${API}/jn/jornal/${slug}`, { cache: 'no-store' })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`Jornal indisponível (${r.status})`)
  return r.json()
})
