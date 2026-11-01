// JWT: decodificar, explicar claims, checar estrutura e verificar/gerar assinatura (WebCrypto).

const enc = new TextEncoder()

export function b64urlParaBytes(s) {
  let t = String(s).replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  const bin = atob(t)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
export function bytesParaB64url(bytes) {
  let s = ''
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const textoParaB64url = (t) => bytesParaB64url(enc.encode(t))

export const CLAIMS = {
  iss: 'Emissor (issuer): quem criou o token',
  sub: 'Assunto (subject): normalmente o ID do usuário',
  aud: 'Audiência: para qual serviço o token vale',
  exp: 'Expira em (expiration)',
  nbf: 'Não vale antes de (not before)',
  iat: 'Emitido em (issued at)',
  jti: 'ID único do token (evita reuso)',
  name: 'Nome',
  email: 'E-mail',
  email_verified: 'E-mail verificado',
  scope: 'Escopos / permissões',
  scp: 'Escopos / permissões',
  roles: 'Papéis',
  azp: 'Cliente autorizado (authorized party)',
  sid: 'ID da sessão',
  nonce: 'Nonce (protege contra replay no OIDC)',
  auth_time: 'Hora do login',
  preferred_username: 'Nome de usuário',
  tid: 'ID do tenant (Azure AD)',
  role: 'Papel (Supabase/Postgres)',
}
export const HEADERS = {
  alg: 'Algoritmo da assinatura',
  typ: 'Tipo do token',
  kid: 'ID da chave usada para assinar',
  cty: 'Tipo do conteúdo',
  jku: 'URL do conjunto de chaves (JWKS)',
  x5t: 'Impressão digital do certificado',
}
export const DATAS = ['exp', 'nbf', 'iat', 'auth_time', 'updated_at']

export function decodificar(token) {
  const t = String(token || '').trim().replace(/^Bearer\s+/i, '')
  if (!t) return { vazio: true }
  const partes = t.split('.')
  const problemas = []
  if (partes.length === 5) return { erro: 'Isto parece um JWE (token criptografado, 5 partes). O conteúdo só pode ser lido com a chave privada.' }
  if (partes.length !== 3) return { erro: `Um JWT tem 3 partes separadas por ponto; este tem ${partes.length}.` }
  const ler = (p, nome) => {
    if (!/^[A-Za-z0-9_-]*$/.test(p)) problemas.push(`O ${nome} tem caracteres fora do base64url (+, / ou = indicam base64 comum).`)
    try {
      return JSON.parse(new TextDecoder().decode(b64urlParaBytes(p)))
    } catch {
      return undefined
    }
  }
  const header = ler(partes[0], 'header')
  const payload = ler(partes[1], 'payload')
  if (header === undefined) return { erro: 'O header não é um JSON válido em base64url.' }
  if (payload === undefined) return { erro: 'O payload não é um JSON válido em base64url.' }
  if (!header.alg) problemas.push('O header não tem "alg".')
  if (String(header.alg).toLowerCase() === 'none') problemas.push('alg "none": o token não tem assinatura. Nunca aceite isso no servidor.')
  if (header.alg !== 'none' && !partes[2]) problemas.push('A assinatura está vazia.')
  if (payload && typeof payload === 'object') {
    for (const k of DATAS) if (k in payload && typeof payload[k] !== 'number') problemas.push(`"${k}" deveria ser um número (segundos desde 1970).`)
    if (typeof payload.exp === 'number' && payload.exp > 1e12) problemas.push('"exp" parece estar em milissegundos; o padrão é segundos.')
    if (!('exp' in payload)) problemas.push('Sem "exp": o token não expira nunca.')
    const sensiveis = Object.keys(payload).filter((k) => /senha|password|passwd|secret|cpf|cartao|card/i.test(k))
    if (sensiveis.length) problemas.push(`O payload não é criptografado e tem campos sensíveis: ${sensiveis.join(', ')}.`)
  }
  return { header, payload, assinatura: partes[2], partes, problemas }
}

export function tempoRelativo(segundos, agora = Date.now() / 1000) {
  const d = Math.round(segundos - agora)
  const abs = Math.abs(d)
  const un = abs < 60 ? [abs, 's'] : abs < 3600 ? [Math.round(abs / 60), 'min'] : abs < 86400 ? [Math.round(abs / 3600), 'h'] : [Math.round(abs / 86400), 'dias']
  return d >= 0 ? `daqui a ${un[0]} ${un[1]}` : `há ${un[0]} ${un[1]}`
}

/* ------------------------------ assinatura ------------------------------ */
const ALGS = {
  HS256: { tipo: 'hmac', hash: 'SHA-256' },
  HS384: { tipo: 'hmac', hash: 'SHA-384' },
  HS512: { tipo: 'hmac', hash: 'SHA-512' },
  RS256: { tipo: 'rsa', nome: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  RS384: { tipo: 'rsa', nome: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
  RS512: { tipo: 'rsa', nome: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
  PS256: { tipo: 'rsa', nome: 'RSA-PSS', hash: 'SHA-256', salt: 32 },
  PS384: { tipo: 'rsa', nome: 'RSA-PSS', hash: 'SHA-384', salt: 48 },
  ES256: { tipo: 'ec', curva: 'P-256', hash: 'SHA-256' },
  ES384: { tipo: 'ec', curva: 'P-384', hash: 'SHA-384' },
}
export const algSuportado = (alg) => Boolean(ALGS[alg])
export const precisaSegredo = (alg) => ALGS[alg]?.tipo === 'hmac'

function pemParaBytes(pem) {
  const corpo = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return b64urlParaBytes(corpo.replace(/\+/g, '-').replace(/\//g, '_'))
}

async function chavePublica(alg, texto) {
  const a = ALGS[alg]
  const params = a.tipo === 'ec' ? { name: 'ECDSA', namedCurve: a.curva } : { name: a.nome, hash: a.hash }
  const t = texto.trim()
  if (t.startsWith('{')) {
    const jwk = JSON.parse(t)
    const k = jwk.keys ? jwk.keys[0] : jwk
    return crypto.subtle.importKey('jwk', k, params, false, ['verify'])
  }
  if (/BEGIN RSA PUBLIC KEY/.test(t)) throw new Error('Chave em formato PKCS#1. Converta para "BEGIN PUBLIC KEY" (SPKI) ou cole o JWK.')
  if (/BEGIN CERTIFICATE/.test(t)) throw new Error('Cole a chave pública (BEGIN PUBLIC KEY) ou o JWK, não o certificado.')
  return crypto.subtle.importKey('spki', pemParaBytes(t), params, false, ['verify'])
}

export async function verificar(token, chave, segredoEmBase64 = false) {
  const d = decodificar(token)
  if (d.erro || d.vazio) throw new Error(d.erro || 'Cole um token.')
  const alg = d.header.alg
  const a = ALGS[alg]
  if (!a) throw new Error(`Algoritmo ${alg} não suportado aqui.`)
  const dados = enc.encode(`${d.partes[0]}.${d.partes[1]}`)
  const sig = b64urlParaBytes(d.partes[2])
  if (a.tipo === 'hmac') {
    const bytes = segredoEmBase64 ? b64urlParaBytes(chave.replace(/\+/g, '-').replace(/\//g, '_')) : enc.encode(chave)
    const k = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: a.hash }, false, ['verify'])
    return crypto.subtle.verify('HMAC', k, sig, dados)
  }
  const k = await chavePublica(alg, chave)
  if (a.tipo === 'ec') return crypto.subtle.verify({ name: 'ECDSA', hash: a.hash }, k, sig, dados)
  if (a.nome === 'RSA-PSS') return crypto.subtle.verify({ name: 'RSA-PSS', saltLength: a.salt }, k, sig, dados)
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, sig, dados)
}

export async function gerarHs(header, payload, segredo) {
  const alg = header.alg || 'HS256'
  const a = ALGS[alg]
  if (!a || a.tipo !== 'hmac') throw new Error('Para gerar aqui use HS256, HS384 ou HS512.')
  const h = textoParaB64url(JSON.stringify({ ...header, alg }))
  const p = textoParaB64url(JSON.stringify(payload))
  const k = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: a.hash }, false, ['sign'])
  const s = await crypto.subtle.sign('HMAC', k, enc.encode(`${h}.${p}`))
  return `${h}.${p}.${bytesParaB64url(s)}`
}
