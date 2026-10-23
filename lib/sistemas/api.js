// Conversa com o servidor dos dados: a nuvem do soudev (contas com e-mail e senha, uma por equipe) ou o Apps Script
// de uma planilha do Google. Os dois falam igual: POST com texto JSON (o Apps Script não lê cabeçalhos), então o
// token da sessão segue no corpo, no campo "authorization".

/** Servidor da nuvem (Cloudflare). Em desenvolvimento, o local do wrangler (npm run dev no backend-soudev). */
export const NUVEM = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : 'https://backend-soudev.backend-soudev.workers.dev')

export class ErroPlanilha extends Error {
  constructor(codigo, mensagem) {
    super(mensagem)
    this.codigo = codigo
  }
}

export async function chamarPlanilha(url, corpo, { timeout = 30000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    })
  } catch (e) {
    const onde = url.startsWith(NUVEM) ? 'o servidor' : 'a planilha'
    throw new ErroPlanilha('rede', e.name === 'AbortError' ? `${onde[0].toUpperCase()}${onde.slice(1)} demorou demais para responder.` : `Sem conexão com ${onde}. Confira a internet.`)
  } finally {
    clearTimeout(t)
  }
  let dados
  try {
    dados = await res.json()
  } catch {
    throw new ErroPlanilha('formato', 'A planilha respondeu algo inesperado. Confira se o link é o do App da Web (termina em /exec) e se o acesso está como "Qualquer pessoa".')
  }
  if (!dados.ok) {
    const erro = new ErroPlanilha(dados.codigo || 'erro', dados.erro || 'Erro na planilha')
    erro.dados = dados // ex.: horário ocupado vem com a agenda atualizada
    throw erro
  }
  return dados
}

/* ---------- Conexão salva no navegador ---------- */

const CHAVE = 'sx.conexao'

export const URL_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/([A-Za-z0-9_-]{20,})\/exec\/?$/
const NUVEM_RE = /\/sistemas\/e\/([A-Za-z0-9]{8,32})$/

/** Identificador do servidor: o ID do Apps Script ou "nuvem-<equipe>". Vira o nome do banco local e o "?s=" das páginas públicas. */
export function idDaUrl(url) {
  const u = String(url || '').trim()
  if (u.startsWith(NUVEM)) {
    const m = u.match(NUVEM_RE)
    return m ? `nuvem-${m[1]}` : null
  }
  return u.match(URL_RE)?.[1] ?? null
}

export const urlDoId = (id) => (String(id).startsWith('nuvem-') ? `${NUVEM}/sistemas/e/${String(id).slice(6)}` : `https://script.google.com/macros/s/${id}/exec`)

export function lerConexao() {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE))
    return c?.url && c?.token ? c : null
  } catch {
    return null
  }
}

export function salvarConexao(conexao) {
  try {
    if (conexao) localStorage.setItem(CHAVE, JSON.stringify(conexao))
    else localStorage.removeItem(CHAVE)
  } catch {
    /* modo privado: a conexão vale só enquanto a aba estiver aberta */
  }
}

export const pedirCodigo = (url, email) => chamarPlanilha(url, { acao: 'codigo', email })

export const entrar = (url, email, codigo) => chamarPlanilha(url, { acao: 'entrar', email, codigo })

/* ---------- Conta na nuvem (e-mail e senha) ---------- */

const CHAVE_CONTA = 'sx.conta'

export function lerConta() {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_CONTA))
    return c?.email && c?.token ? c : null
  } catch {
    return null
  }
}

export function salvarConta(c) {
  try {
    if (c) localStorage.setItem(CHAVE_CONTA, JSON.stringify(c))
    else localStorage.removeItem(CHAVE_CONTA)
  } catch {
    /* modo privado */
  }
}

/** Chama /sistemas/conta. Sessão expirada: esquece a conta salva (a tela volta para o login). */
export async function chamarConta(acao, dados = {}) {
  const conta = lerConta()
  try {
    return await chamarPlanilha(`${NUVEM}/sistemas/conta`, { acao, token: conta?.token, ...dados })
  } catch (e) {
    if (e.codigo === 'sessao') salvarConta(null)
    throw e
  }
}
