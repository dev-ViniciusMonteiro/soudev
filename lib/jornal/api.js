// Cliente do Meu Jornal: fala com o worker soudev-ideias (/jn/*). Sessão por token no localStorage.
import { API, comprimir } from '../catalogo/api'

const BASE = `${API}/jn`
const CHAVE = 'jornal-token'

export const temBackend = () => Boolean(API)
export const fotoUrl = (id) => (id ? `${BASE}/img/${id}` : '')

export function getToken() {
  try { return localStorage.getItem(CHAVE) || '' } catch { return '' }
}
export function setToken(t) {
  try { if (t) localStorage.setItem(CHAVE, t); else localStorage.removeItem(CHAVE) } catch {}
}

export async function jn(caminho, { metodo = 'GET', corpo } = {}) {
  const token = getToken()
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

export async function enviarFoto(arquivo) {
  if (!arquivo || !arquivo.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  const blob = await comprimir(arquivo, 1400)
  const r = await fetch(`${BASE}/imagens`, { method: 'POST', headers: { 'Content-Type': blob.type, Authorization: `Bearer ${getToken()}` }, body: blob })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.erro || 'Não foi possível enviar a foto.')
  return d.id
}
