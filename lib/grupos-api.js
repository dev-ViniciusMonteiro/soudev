// Cliente das salas compartilhadas por link (worker soudev-ideias, rotas /gp/*).

const API = (process.env.NEXT_PUBLIC_IDEIAS_API || '').replace(/\/$/, '')
export const temApi = () => Boolean(API)

async function chamar(caminho, { metodo = 'GET', corpo, chave } = {}) {
  const r = await fetch(`${API}/gp${caminho}`, {
    method: metodo,
    headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(chave ? { 'X-Chave': chave } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(d.erro || 'Não foi possível conectar. Tente de novo.'), { status: r.status })
  return d
}

export const criarSala = (tipo, dados) => chamar('/novo', { metodo: 'POST', corpo: { tipo, dados } })
export const lerSala = (id, { eu, chave } = {}) => chamar(`/${id}${eu ? `?eu=${encodeURIComponent(eu)}` : ''}`, { chave })
export const agir = (id, acao) => chamar(`/${id}/acao`, { metodo: 'POST', corpo: acao })
export const editarSala = (id, chave, dados, eu) => chamar(`/${id}${eu ? `?eu=${encodeURIComponent(eu)}` : ''}`, { metodo: 'PUT', corpo: { dados }, chave })
export const apagarSala = (id, chave) => chamar(`/${id}`, { metodo: 'DELETE', chave })

// Identidade anônima deste navegador (para lembrar o voto/a reserva sem cadastro).
export function meuId() {
  try {
    let id = localStorage.getItem('gp-participante')
    if (!id) {
      id = `p-${crypto.randomUUID().slice(0, 12)}`
      localStorage.setItem('gp-participante', id)
    }
    return id
  } catch {
    return `p-${Math.random().toString(36).slice(2, 14)}`
  }
}
export function meuNome(novo) {
  try {
    if (novo !== undefined) localStorage.setItem('gp-nome', novo)
    return localStorage.getItem('gp-nome') || ''
  } catch {
    return novo || ''
  }
}

// Salas que este navegador criou (guarda a chave de administrador).
export function minhasSalas(tipo) {
  try {
    return JSON.parse(localStorage.getItem(`gp-minhas-${tipo}`) || '[]')
  } catch {
    return []
  }
}
export function guardarSala(tipo, sala) {
  try {
    const l = minhasSalas(tipo).filter((s) => s.id !== sala.id)
    localStorage.setItem(`gp-minhas-${tipo}`, JSON.stringify([sala, ...l].slice(0, 30)))
  } catch {}
}
export function esquecerSala(tipo, id) {
  try {
    localStorage.setItem(`gp-minhas-${tipo}`, JSON.stringify(minhasSalas(tipo).filter((s) => s.id !== id)))
  } catch {}
}
export const chaveDe = (tipo, id) => minhasSalas(tipo).find((s) => s.id === id)?.chave || ''
