// Conversa com o OpenRouter direto do navegador, com a chave da própria pessoa (nada passa pelo site).
// Mesma lógica do jogo Escritório IA (games/escritorio-ia/src/llm.ts): erros temporários esperam e tentam de novo.

const API = 'https://openrouter.ai/api/v1'
const CHAVE = 'doc.chave'
const VERIFICADOR = 'doc.pkce'

export class ErroIA extends Error {
  constructor(mensagem, fatal = false) {
    super(mensagem)
    this.fatal = fatal // true = não adianta tentar de novo (chave inválida, sem crédito)
  }
}

/* ---------- Chave ---------- */

export function lerChave() {
  try {
    return localStorage.getItem(CHAVE) ?? ''
  } catch {
    return ''
  }
}

export function salvarChave(chave) {
  try {
    if (chave) localStorage.setItem(CHAVE, chave.trim())
    else localStorage.removeItem(CHAVE)
  } catch {
    /* sem armazenamento: a chave vale só enquanto a página estiver aberta */
  }
}

/** Confere a chave no OpenRouter e devolve o saldo/limite, se houver. */
export async function conferirChave(chave) {
  const res = await fetch(`${API}/key`, { headers: { Authorization: `Bearer ${chave}` } })
  if (res.status === 401) throw new ErroIA('Chave inválida ou revogada.', true)
  if (!res.ok) throw new ErroIA(`O OpenRouter respondeu ${res.status}.`)
  const { data } = await res.json()
  return { rotulo: data?.label ?? '', usado: Number(data?.usage) || 0, limite: data?.limit ?? null, gratis: Boolean(data?.is_free_tier) }
}

const base64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Login do OpenRouter (OAuth PKCE): vai para o OpenRouter e volta para esta página com ?code=. */
export async function entrarComOpenRouter() {
  const verificador = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  const desafio = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))))
  localStorage.setItem(VERIFICADOR, verificador)
  const volta = `${location.origin}${location.pathname}`
  location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(volta)}&code_challenge=${desafio}&code_challenge_method=S256`
}

/** Na volta do login, troca o código pela chave. null = a página não veio do login. */
export async function concluirLogin() {
  const codigo = new URLSearchParams(location.search).get('code')
  if (!codigo) return null
  history.replaceState(null, '', location.pathname)
  try {
    const verificador = localStorage.getItem(VERIFICADOR) ?? undefined
    const res = await fetch(`${API}/auth/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codigo, code_verifier: verificador, code_challenge_method: verificador ? 'S256' : undefined }),
    })
    const dados = await res.json()
    if (!res.ok || !dados.key) return 'erro'
    salvarChave(dados.key)
    localStorage.removeItem(VERIFICADOR)
    return 'ok'
  } catch {
    return 'erro'
  }
}

/* ---------- Modelos ---------- */

export async function listarModelos() {
  const res = await fetch(`${API}/models`)
  if (!res.ok) throw new ErroIA('Não foi possível carregar a lista de modelos.')
  const { data } = await res.json()
  return data
    .map((m) => {
      const entrada = Math.max(0, Number(m.pricing?.prompt) || 0)
      const saida = Math.max(0, Number(m.pricing?.completion) || 0)
      return { id: m.id, nome: m.name, contexto: m.context_length ?? 0, entrada, saida, gratis: m.id.endsWith(':free') || (entrada === 0 && saida === 0) }
    })
    .filter((m) => !m.id.startsWith('openrouter/auto'))
    .sort((a, b) => Number(b.gratis) - Number(a.gratis) || a.nome.localeCompare(b.nome))
}

// A lista de gratuitos muda com frequência: descarta modelos especializados e prefere o maior modelo geral.
const NAO_GERAL = /safety|guard|code|coder|embed|vision|omni|audio|tts|speech|ocr|-xs-|nano|mini|\b[0-3](?:\.\d+)?b\b/i
const bilhoes = (id) => Math.max(0, ...[...id.matchAll(/(\d+(?:\.\d+)?)b(?![a-z])/gi)].map((m) => Number(m[1])))

export function modeloPadrao(modelos) {
  const gratis = modelos.filter((m) => m.gratis)
  const gerais = gratis.filter((m) => !NAO_GERAL.test(m.id))
  const base = gerais.length ? gerais : gratis
  return [...base].sort((a, b) => bilhoes(b.id) - bilhoes(a.id) || b.contexto - a.contexto)[0]?.id ?? modelos[0]?.id ?? ''
}

/** Reservas só para modelo gratuito (nunca troca um pago por outro sem a pessoa escolher), de outros fornecedores. */
function reservas(modelos, principal) {
  if (!modelos.find((m) => m.id === principal)?.gratis) return []
  const fornecedor = (id) => id.split('/')[0]
  const out = []
  for (const m of modelos.filter((x) => x.gratis && x.id !== principal && !NAO_GERAL.test(x.id)).sort((a, b) => bilhoes(b.id) - bilhoes(a.id))) {
    if (out.length >= 2) break
    if (fornecedor(m.id) === fornecedor(principal) || out.some((p) => fornecedor(p) === fornecedor(m.id))) continue
    out.push(m.id)
  }
  return out
}

/* ---------- Chamada ---------- */

const esperar = (ms, sinal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    sinal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Cancelado', 'AbortError'))
    })
  })

const TEMPORARIOS = new Set([408, 429, 500, 502, 503, 504, 524, 529])
const ESPERAS = [5, 10, 20, 40, 60] // segundos

/**
 * Uma conversa com o modelo. O OpenRouter às vezes devolve o erro do provedor dentro de uma resposta 200,
 * então o erro é lido do corpo e do status. onEspera(segundos, motivo) avisa quando vai tentar de novo.
 */
export async function conversar({ chave, modelo, mensagens, modelos = [], sinal, onEspera }) {
  const extras = reservas(modelos, modelo)
  const corpo = { model: modelo, messages: mensagens, temperature: 0.3 }
  if (extras.length) corpo.models = [modelo, ...extras]
  let ultima = ''

  for (let tentativa = 0; tentativa <= ESPERAS.length; tentativa++) {
    let res = null
    let dados = null
    try {
      res = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        signal: sinal,
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.origin, 'X-Title': 'Documentador' },
        body: JSON.stringify(corpo),
      })
      dados = await res.json().catch(() => null)
    } catch (e) {
      if (sinal?.aborted) throw e
      // Falha de rede: tratada como temporária.
    }

    const erro = dados?.error ?? dados?.choices?.[0]?.error
    if (res?.ok && !erro) {
      const texto = dados?.choices?.[0]?.message?.content ?? ''
      if (texto.trim()) return { texto, entrada: dados?.usage?.prompt_tokens ?? 0, saida: dados?.usage?.completion_tokens ?? 0, modelo: dados?.model ?? modelo }
      ultima = 'O modelo respondeu vazio.'
    } else {
      const codigo = Number(erro?.code ?? res?.status ?? 0)
      ultima = String(erro?.message ?? (res ? `Erro ${res.status}` : 'Falha de conexão com o OpenRouter'))
      if (codigo === 401) throw new ErroIA('Chave do OpenRouter inválida ou revogada. Conecte de novo em "Conexão".', true)
      if (codigo === 402) throw new ErroIA('Sem créditos no OpenRouter para este modelo. Escolha um modelo gratuito ou adicione créditos.', true)
      const temporario = !res || TEMPORARIOS.has(codigo) || /overload|temporar|unavailable|timeout|rate.?limit/i.test(ultima)
      if (!temporario) throw new ErroIA(`${ultima} (modelo ${modelo})`, codigo === 404)
    }

    if (tentativa === ESPERAS.length) break
    const retry = Number(res?.headers.get('retry-after'))
    const segundos = Number.isFinite(retry) && retry > 0 ? Math.min(retry, 90) : ESPERAS[tentativa]
    onEspera?.(segundos, /overload/i.test(ultima) ? 'provedor do modelo sobrecarregado' : Number(erro?.code ?? res?.status) === 429 ? 'limite de pedidos do modelo' : ultima)
    await esperar(segundos * 1000, sinal)
  }
  throw new ErroIA(`O modelo ${modelo} continuou indisponível depois de várias tentativas (${ultima}). Troque o modelo ou tente de novo mais tarde.`)
}
