// API Tester: modelo de requisição, variáveis {{x}}, URL ⇄ params, cURL (gerar e importar) e Postman v2.1.

export const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
export const linhaVazia = () => ({ k: '', v: '', on: true })

export function novaReq(parcial = {}) {
  return {
    id: uid(),
    nome: 'Nova requisição',
    metodo: 'GET',
    url: '',
    params: [],
    headers: [],
    auth: { tipo: 'none', token: '', user: '', pass: '', key: 'X-API-Key', value: '', onde: 'header' },
    body: { tipo: 'none', raw: '', campos: [] },
    ...parcial,
  }
}

/* ------------------------------ URL ⇄ params ------------------------------ */
export function paramsDaUrl(url) {
  const i = url.indexOf('?')
  if (i < 0) return []
  const q = url.slice(i + 1).split('#')[0]
  if (!q) return []
  return q.split('&').map((par) => {
    const j = par.indexOf('=')
    const dec = (s) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, ' '))
      } catch {
        return s
      }
    }
    return { k: dec(j < 0 ? par : par.slice(0, j)), v: j < 0 ? '' : dec(par.slice(j + 1)), on: true }
  })
}
const encParam = (s) => encodeURIComponent(s).replace(/%7B%7B/g, '{{').replace(/%7D%7D/g, '}}')
export function urlComParams(url, params) {
  const base = url.split('?')[0]
  const ativos = params.filter((p) => p.on && p.k)
  if (!ativos.length) return base
  return `${base}?${ativos.map((p) => `${encParam(p.k)}${p.v !== '' ? `=${encParam(p.v)}` : ''}`).join('&')}`
}

/* ------------------------------ variáveis ------------------------------ */
export function substituir(texto, vars) {
  return String(texto ?? '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, k) => {
    if (k === '$timestamp') return String(Math.floor(Date.now() / 1000))
    if (k === '$guid' || k === '$uuid') return crypto.randomUUID()
    if (k === '$randomInt') return String(Math.floor(Math.random() * 1000))
    return k in vars ? vars[k] : m
  })
}
export const faltando = (texto, vars) => [...String(texto).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]).filter((k) => !k.startsWith('$') && !(k in vars))

/* ------------------------------ montar a requisição ------------------------------ */
export function montar(req, vars = {}) {
  const S = (t) => substituir(t, vars)
  let url = S(req.url.trim())
  if (url && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `${/^(localhost|127\.|\[::1\])/.test(url) ? 'http' : 'https'}://${url}`
  const headers = []
  for (const h of req.headers) if (h.on && h.k.trim()) headers.push([S(h.k.trim()), S(h.v)])
  const a = req.auth
  if (a.tipo === 'bearer' && a.token) headers.push(['Authorization', `Bearer ${S(a.token)}`])
  if (a.tipo === 'basic') headers.push(['Authorization', `Basic ${btoa(unescape(encodeURIComponent(`${S(a.user)}:${S(a.pass)}`)))}`])
  if (a.tipo === 'apikey' && a.key) {
    if (a.onde === 'query') url += `${url.includes('?') ? '&' : '?'}${encodeURIComponent(S(a.key))}=${encodeURIComponent(S(a.value))}`
    else headers.push([S(a.key), S(a.value)])
  }
  const tem = (n) => headers.some(([k]) => k.toLowerCase() === n)
  let body
  let bodyTexto = ''
  const semCorpo = req.metodo === 'GET' || req.metodo === 'HEAD'
  if (!semCorpo) {
    const b = req.body
    if (b.tipo === 'json') {
      body = bodyTexto = S(b.raw)
      if (!tem('content-type')) headers.push(['Content-Type', 'application/json'])
    } else if (b.tipo === 'text') {
      body = bodyTexto = S(b.raw)
      if (!tem('content-type')) headers.push(['Content-Type', 'text/plain'])
    } else if (b.tipo === 'urlencoded') {
      const p = new URLSearchParams()
      for (const c of b.campos) if (c.on && c.k) p.append(S(c.k), S(c.v))
      body = bodyTexto = p.toString()
      if (!tem('content-type')) headers.push(['Content-Type', 'application/x-www-form-urlencoded'])
    } else if (b.tipo === 'form') {
      const f = new FormData()
      for (const c of b.campos) if (c.on && c.k) f.append(S(c.k), S(c.v))
      body = f
      bodyTexto = b.campos.filter((c) => c.on && c.k).map((c) => `${c.k}=${c.v}`).join('&')
    }
  }
  return { url, metodo: req.metodo, headers, body, bodyTexto, formulario: req.body.tipo === 'form' && !semCorpo ? req.body.campos.filter((c) => c.on && c.k).map((c) => [S(c.k), S(c.v)]) : null }
}

/* ------------------------------ código ------------------------------ */
const sh = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`
export function paraCurl(m) {
  const l = [`curl -X ${m.metodo} ${sh(m.url)}`]
  for (const [k, v] of m.headers) l.push(`-H ${sh(`${k}: ${v}`)}`)
  if (m.formulario) for (const [k, v] of m.formulario) l.push(`-F ${sh(`${k}=${v}`)}`)
  else if (m.bodyTexto) l.push(`--data-raw ${sh(m.bodyTexto)}`)
  return l.join(' \\\n  ')
}
export function paraFetch(m) {
  const opts = [`  method: '${m.metodo}'`]
  if (m.headers.length) opts.push(`  headers: {\n${m.headers.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n  }`)
  if (m.formulario) {
    return `const form = new FormData()\n${m.formulario.map(([k, v]) => `form.append(${JSON.stringify(k)}, ${JSON.stringify(v)})`).join('\n')}\n\nconst res = await fetch(${JSON.stringify(m.url)}, {\n${opts.join(',\n')},\n  body: form\n})\nconsole.log(res.status, await res.text())`
  }
  if (m.bodyTexto) {
    let corpo = JSON.stringify(m.bodyTexto)
    try {
      const j = JSON.parse(m.bodyTexto)
      corpo = `JSON.stringify(${JSON.stringify(j, null, 2).replace(/\n/g, '\n  ')})`
    } catch {}
    opts.push(`  body: ${corpo}`)
  }
  return `const res = await fetch(${JSON.stringify(m.url)}, {\n${opts.join(',\n')}\n})\nconst dados = await res.json()\nconsole.log(res.status, dados)`
}
export function paraPython(m) {
  const l = ['import requests', '']
  l.push(`resp = requests.request(\n    ${JSON.stringify(m.metodo)},\n    ${JSON.stringify(m.url)},`)
  if (m.headers.length) l.push(`    headers={${m.headers.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ')}},`)
  if (m.formulario) l.push(`    files={${m.formulario.map(([k, v]) => `${JSON.stringify(k)}: (None, ${JSON.stringify(v)})`).join(', ')}},`)
  else if (m.bodyTexto) l.push(`    data=${JSON.stringify(m.bodyTexto)}.encode(),`)
  l.push(')', 'print(resp.status_code, resp.text)')
  return l.join('\n')
}

/* ------------------------------ importar ------------------------------ */
function separarShell(s) {
  const out = []
  let cur = ''
  let q = null
  let tem = false
  const t = s.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === q) q = null
      else if (c === '\\' && q === '"' && i + 1 < t.length) cur += t[++i]
      else cur += c
    } else if (c === "'" || c === '"') {
      q = c
      tem = true
    } else if (/\s/.test(c)) {
      if (cur || tem) out.push(cur)
      cur = ''
      tem = false
    } else if (c === '\\' && i + 1 < t.length) cur += t[++i]
    else cur += c
  }
  if (cur || tem) out.push(cur)
  return out
}
export function deCurl(texto) {
  const a = separarShell(texto.trim())
  if (a[0] !== 'curl') throw new Error('O comando precisa começar com curl.')
  const req = novaReq({ nome: 'Importado do cURL' })
  let metodo = null
  const dados = []
  const form = []
  for (let i = 1; i < a.length; i++) {
    const x = a[i]
    const prox = () => a[++i] ?? ''
    if (x === '-X' || x === '--request') metodo = prox().toUpperCase()
    else if (x === '-H' || x === '--header') {
      const h = prox()
      const j = h.indexOf(':')
      if (j > 0) req.headers.push({ k: h.slice(0, j).trim(), v: h.slice(j + 1).trim(), on: true })
    } else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode'].includes(x)) dados.push(prox())
    else if (x === '-F' || x === '--form') {
      const f = prox()
      const j = f.indexOf('=')
      form.push({ k: f.slice(0, j), v: f.slice(j + 1), on: true })
    } else if (x === '-u' || x === '--user') {
      const [u, ...p] = prox().split(':')
      req.auth = { ...req.auth, tipo: 'basic', user: u, pass: p.join(':') }
    } else if (x === '-A' || x === '--user-agent') req.headers.push({ k: 'User-Agent', v: prox(), on: true })
    else if (x === '-b' || x === '--cookie') req.headers.push({ k: 'Cookie', v: prox(), on: true })
    else if (x === '--url') req.url = prox()
    else if (x === '-G' || x === '--get') metodo = 'GET'
    else if (/^-/.test(x)) {
      if (['-o', '--output', '-e', '--referer', '-m', '--max-time', '--connect-timeout', '-w', '--write-out', '--proxy', '-x'].includes(x)) i++
    } else if (!req.url) req.url = x
  }
  // Authorization: Bearer vira a aba de autenticação
  const ai = req.headers.findIndex((h) => h.k.toLowerCase() === 'authorization' && /^bearer /i.test(h.v))
  if (ai >= 0) {
    req.auth = { ...req.auth, tipo: 'bearer', token: req.headers[ai].v.replace(/^bearer /i, '') }
    req.headers.splice(ai, 1)
  }
  if (form.length) req.body = { tipo: 'form', raw: '', campos: form }
  else if (dados.length) {
    const raw = dados.join('&')
    const ct = req.headers.find((h) => h.k.toLowerCase() === 'content-type')?.v || ''
    let json = /json/i.test(ct)
    try {
      JSON.parse(raw)
      json = true
    } catch {}
    if (json) req.body = { tipo: 'json', raw: (() => { try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw } })(), campos: [] }
    else if (/^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(raw) && !/text\/plain/.test(ct)) req.body = { tipo: 'urlencoded', raw: '', campos: paramsDaUrl(`?${raw}`) }
    else req.body = { tipo: 'text', raw, campos: [] }
    req.headers = req.headers.filter((h) => !(h.k.toLowerCase() === 'content-type' && /json|x-www-form-urlencoded/i.test(h.v)))
  }
  req.metodo = metodo || (dados.length || form.length ? 'POST' : 'GET')
  req.params = paramsDaUrl(req.url)
  try {
    const u = new URL(req.url)
    req.nome = `${req.metodo} ${u.pathname}`
  } catch {}
  return req
}

// Coleção do Postman v2.0/v2.1 → nossas pastas (achata subpastas no nome)
export function dePostman(json) {
  const c = typeof json === 'string' ? JSON.parse(json) : json
  if (!c?.item) throw new Error('Não parece uma coleção do Postman (falta "item").')
  const reqs = []
  const andar = (itens, pre) => {
    for (const it of itens) {
      if (it.item) {
        andar(it.item, `${pre}${it.name} / `)
        continue
      }
      const r = it.request || {}
      const url = typeof r.url === 'string' ? r.url : r.url?.raw || ''
      const nova = novaReq({
        nome: `${pre}${it.name || url}`,
        metodo: (r.method || 'GET').toUpperCase(),
        url,
        headers: (r.header || []).map((h) => ({ k: h.key, v: h.value, on: !h.disabled })),
      })
      nova.params = paramsDaUrl(url)
      const b = r.body
      if (b?.mode === 'raw') nova.body = { tipo: /json/i.test(b.options?.raw?.language || '') || /^\s*[[{]/.test(b.raw || '') ? 'json' : 'text', raw: b.raw || '', campos: [] }
      if (b?.mode === 'urlencoded') nova.body = { tipo: 'urlencoded', raw: '', campos: (b.urlencoded || []).map((x) => ({ k: x.key, v: x.value, on: !x.disabled })) }
      if (b?.mode === 'formdata') nova.body = { tipo: 'form', raw: '', campos: (b.formdata || []).filter((x) => x.type !== 'file').map((x) => ({ k: x.key, v: x.value, on: !x.disabled })) }
      const a = r.auth
      const val = (arr, k) => (arr || []).find((x) => x.key === k)?.value || ''
      if (a?.type === 'bearer') nova.auth = { ...nova.auth, tipo: 'bearer', token: val(a.bearer, 'token') }
      if (a?.type === 'basic') nova.auth = { ...nova.auth, tipo: 'basic', user: val(a.basic, 'username'), pass: val(a.basic, 'password') }
      if (a?.type === 'apikey') nova.auth = { ...nova.auth, tipo: 'apikey', key: val(a.apikey, 'key'), value: val(a.apikey, 'value'), onde: val(a.apikey, 'in') === 'query' ? 'query' : 'header' }
      reqs.push(nova)
    }
  }
  andar(c.item, '')
  const vars = (c.variable || []).map((v) => ({ k: v.key, v: String(v.value ?? ''), on: true }))
  return { nome: c.info?.name || 'Coleção importada', reqs, vars }
}

export function paraPostman(col) {
  return {
    info: { name: col.nome, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: col.reqs.map((r) => ({
      name: r.nome,
      request: {
        method: r.metodo,
        url: { raw: r.url },
        header: r.headers.filter((h) => h.k).map((h) => ({ key: h.k, value: h.v, disabled: !h.on })),
        ...(r.body.tipo === 'json' || r.body.tipo === 'text' ? { body: { mode: 'raw', raw: r.body.raw, options: { raw: { language: r.body.tipo === 'json' ? 'json' : 'text' } } } } : {}),
        ...(r.body.tipo === 'urlencoded' ? { body: { mode: 'urlencoded', urlencoded: r.body.campos.filter((c) => c.k).map((c) => ({ key: c.k, value: c.v, disabled: !c.on })) } } : {}),
        ...(r.body.tipo === 'form' ? { body: { mode: 'formdata', formdata: r.body.campos.filter((c) => c.k).map((c) => ({ key: c.k, value: c.v, type: 'text', disabled: !c.on })) } } : {}),
        ...(r.auth.tipo === 'bearer' ? { auth: { type: 'bearer', bearer: [{ key: 'token', value: r.auth.token, type: 'string' }] } } : {}),
        ...(r.auth.tipo === 'basic' ? { auth: { type: 'basic', basic: [{ key: 'username', value: r.auth.user }, { key: 'password', value: r.auth.pass }] } } : {}),
        ...(r.auth.tipo === 'apikey' ? { auth: { type: 'apikey', apikey: [{ key: 'key', value: r.auth.key }, { key: 'value', value: r.auth.value }, { key: 'in', value: r.auth.onde }] } } : {}),
      },
    })),
  }
}

export const tamanho = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`)

export const STATUS = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 413: 'Payload Too Large',
  415: 'Unsupported Media Type', 422: 'Unprocessable Entity', 429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
}
