// Conversa com o Apps Script da planilha. Tudo vai por POST com texto JSON (o Apps Script não lê cabeçalhos),
// então o token da sessão segue no corpo, no campo "authorization".

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
    throw new ErroPlanilha('rede', e.name === 'AbortError' ? 'A planilha demorou demais para responder.' : 'Sem conexão com a planilha.')
  } finally {
    clearTimeout(t)
  }
  let dados
  try {
    dados = await res.json()
  } catch {
    throw new ErroPlanilha('formato', 'A planilha respondeu algo inesperado. Confira se o link é o do App da Web (termina em /exec) e se o acesso está como "Qualquer pessoa".')
  }
  if (!dados.ok) throw new ErroPlanilha(dados.codigo || 'erro', dados.erro || 'Erro na planilha')
  return dados
}

/* ---------- Conexão salva no navegador ---------- */

const CHAVE = 'sx.conexao'

export const URL_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/([A-Za-z0-9_-]{20,})\/exec\/?$/

export function idDaUrl(url) {
  return String(url || '').trim().match(URL_RE)?.[1] ?? null
}

export const urlDoId = (id) => `https://script.google.com/macros/s/${id}/exec`

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
