// Cliente do Vinicut: fala com o worker (/vc/*). Sessão por token no localStorage.

const BASE = (process.env.NEXT_PUBLIC_IDEIAS_API || '').replace(/\/$/, '') + '/vc'
const CHAVE = 'vinicut-token'

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

export async function vc(caminho, { metodo = 'GET', corpo } = {}) {
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
  if (!r.ok) throw new Error(dados.erro || 'Algo deu errado.')
  return dados
}

export const temBackend = () => Boolean(process.env.NEXT_PUBLIC_IDEIAS_API)
