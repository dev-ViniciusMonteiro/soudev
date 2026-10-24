// Conversa com a API do Vinicut (backend-soudev, /vinicut/...). A sessão é a mesma da conta do site
// (sistemas): e-mail e senha, token guardado em "sx.conta".

import { NUVEM, chamarConta, lerConta, salvarConta } from '@/lib/sistemas/api'

export class ErroVinicut extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

export async function api(caminho, { metodo = 'GET', dados, corpo, cabecalhos = {} } = {}) {
  const conta = lerConta()
  const h = { ...cabecalhos }
  if (conta?.token) h.Authorization = `Bearer ${conta.token}`
  if (dados !== undefined) h['Content-Type'] = 'application/json'
  let r
  try {
    r = await fetch(`${NUVEM}/vinicut${caminho}`, { method: metodo, headers: h, body: dados !== undefined ? JSON.stringify(dados) : corpo })
  } catch {
    throw new ErroVinicut(0, 'Sem conexão. Confira a internet e tente de novo.')
  }
  const d = await r.json().catch(() => ({}))
  if (r.status === 401) salvarConta(null)
  if (!r.ok) throw new ErroVinicut(r.status, d.erro || 'Algo deu errado. Tente de novo.')
  return d
}

export const entrar = (email, senha) => chamarConta('entrar', { email, senha })
export const cadastrar = (email, senha) => chamarConta('cadastrar', { email, senha })
export async function sair() {
  await chamarConta('sair').catch(() => {})
  salvarConta(null)
}
export { lerConta, salvarConta }

/** Reduz a foto no navegador (até 1280 px, WebP) antes de subir: mais rápido e cabe no limite de 1,5 MB. */
export async function enviarFoto(arquivo, legenda = '') {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  let blob = await new Promise((ok) => canvas.toBlob(ok, 'image/webp', 0.85))
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85))
  return api('/fotos', { metodo: 'POST', corpo: blob, cabecalhos: { 'Content-Type': blob.type, 'X-Legenda': encodeURIComponent(legenda) } })
}
