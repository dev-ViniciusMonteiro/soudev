// Cliente do Catálogo digital: fala com o worker soudev-ideias (/ct/*). Sessão por token no localStorage.

export const API = (process.env.NEXT_PUBLIC_IDEIAS_API || '').replace(/\/$/, '')
const BASE = `${API}/ct`
const CHAVE = 'catalogo-token'

export const temBackend = () => Boolean(API)
export const imgUrl = (id) => (id ? `${BASE}/img/${id}` : '')

export function getToken() {
  try {
    return localStorage.getItem(CHAVE) || ''
  } catch {
    return ''
  }
}
export function setToken(t) {
  try {
    if (t) localStorage.setItem(CHAVE, t)
    else localStorage.removeItem(CHAVE)
  } catch {}
}

export async function ct(caminho, { metodo = 'GET', corpo } = {}) {
  const token = getToken()
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error(dados.erro || 'Algo deu errado. Tente de novo.')
    e.status = r.status
    throw e
  }
  return dados
}

// Reduz a imagem no navegador (WebP) antes de enviar: produto 900px, logo 400px, capa 1600px.
export async function comprimir(arquivo, max = 900) {
  const bmp = await createImageBitmap(arquivo)
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * escala))
  const h = Math.max(1, Math.round(bmp.height * escala))
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  cv.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const gerar = (tipo, q) => new Promise((ok) => cv.toBlob(ok, tipo, q))
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    let b = await gerar('image/webp', q)
    if (!b || b.type !== 'image/webp') b = await gerar('image/jpeg', q) // navegador sem WebP
    if (b && b.size <= 420 * 1024) return b
  }
  throw new Error('Não consegui deixar essa imagem leve o suficiente. Tente outra.')
}

export async function enviarImagem(arquivo, max) {
  if (!arquivo || !arquivo.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  const blob = await comprimir(arquivo, max)
  const r = await fetch(`${BASE}/imagens`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, Authorization: `Bearer ${getToken()}` },
    body: blob,
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.erro || 'Não foi possível enviar a imagem.')
  return d.id
}
