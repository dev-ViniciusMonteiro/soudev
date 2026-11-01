// Webhook Inspector (seção 4dev): URL temporária que guarda as requisições recebidas por 24 h.
//   POST   /wh/novo                  cria a URL (devolve id + chave secreta)
//   ANY    /wh/r/<id>[/qualquer/caminho]  recebe (é a URL do webhook)
//   GET    /wh/<id>/reqs?desde=ts    lista (header X-Chave)
//   PUT    /wh/<id>/config           resposta configurável (status, content-type, corpo)
//   DELETE /wh/<id>/reqs | /wh/<id>  limpa / apaga

const enc = new TextEncoder()
const HORAS = 24
const MAX_REQS = 100
const MAX_CORPO = 64 * 1024

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age': '86400',
}
const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } })
const erro = (status, msg) => json({ erro: msg }, status)

function aleatorio(n) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789'
  const b = crypto.getRandomValues(new Uint8Array(n))
  return [...b].map((x) => abc[x % abc.length]).join('')
}
async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`wh|${ip}|${salt}`))
  return btoa(String.fromCharCode(...new Uint8Array(buf))).slice(0, 22)
}
function iguais(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

async function limparVencidos(env) {
  const agora = Date.now()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wh_reqs WHERE bin_id IN (SELECT id FROM wh_bins WHERE expira_em < ?)').bind(agora),
    env.DB.prepare('DELETE FROM wh_bins WHERE expira_em < ?').bind(agora),
  ])
}

async function binValido(env, id) {
  const { results } = await env.DB.prepare('SELECT * FROM wh_bins WHERE id = ?').bind(id).all()
  const b = results?.[0]
  return b && b.expira_em > Date.now() ? b : null
}

function publicoBin(b) {
  return { id: b.id, criado_em: b.criado_em, expira_em: b.expira_em, resposta: { status: b.status, tipo: b.ctype, corpo: b.corpo } }
}

async function receber(request, env, ctx, id, caminho) {
  const bin = await binValido(env, id)
  if (!bin) return new Response('URL de webhook inexistente ou expirada.', { status: 404, headers: CORS })
  const agora = Date.now()
  const recentes = (await env.DB.prepare('SELECT COUNT(*) AS n FROM wh_reqs WHERE bin_id = ? AND criado_em > ?').bind(id, agora - 60000).all()).results?.[0]?.n ?? 0
  if (recentes >= 120) return new Response('Muitas requisições. Espere um minuto.', { status: 429, headers: CORS })

  const url = new URL(request.url)
  const buf = new Uint8Array(await request.arrayBuffer())
  const tamanho = buf.length
  const parte = buf.slice(0, MAX_CORPO)
  let corpo = new TextDecoder('utf-8', { fatal: false }).decode(parte)
  const tipo = request.headers.get('content-type') || ''
  let binario = 0
  if (tamanho && !/text|json|xml|form|javascript|graphql|csv|yaml/i.test(tipo) && (corpo.match(/�/g) || []).length > 4) {
    binario = 1
    let s = ''
    for (const b of parte) s += String.fromCharCode(b)
    corpo = btoa(s)
  }
  const headers = [...request.headers.entries()].filter(([k]) => !/^(cf-|cdn-loop|x-forwarded-proto)/i.test(k))
  await env.DB.prepare(
    'INSERT INTO wh_reqs (id, bin_id, metodo, caminho, query, headers, corpo, binario, tamanho, truncado, ip, pais, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
  ).bind(
    crypto.randomUUID(), id, request.method, caminho || '/', url.search.slice(1), JSON.stringify(headers), corpo, binario, tamanho,
    tamanho > MAX_CORPO ? 1 : 0, request.headers.get('CF-Connecting-IP') || '', request.cf?.country || '', agora,
  ).run()
  // mantém só as últimas MAX_REQS
  ctx?.waitUntil?.(
    env.DB.prepare('DELETE FROM wh_reqs WHERE bin_id = ? AND id NOT IN (SELECT id FROM wh_reqs WHERE bin_id = ? ORDER BY criado_em DESC LIMIT ?)').bind(id, id, MAX_REQS).run(),
  )
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const status = Math.min(599, Math.max(200, bin.status || 200))
  const semCorpo = request.method === 'HEAD' || status === 204 || status === 304
  return new Response(semCorpo ? null : bin.corpo ?? '', { status, headers: { 'Content-Type': bin.ctype || 'application/json', ...CORS } })
}

export async function rotasWebhook(request, env, ctx) {
  const url = new URL(request.url)
  const p = url.pathname
  if (p !== '/wh' && !p.startsWith('/wh/')) return null
  const m = request.method

  try {
    // URL que recebe: qualquer método, inclusive OPTIONS (é registrado)
    let mt = p.match(/^\/wh\/r\/([a-z0-9]{12})(\/.*)?$/)
    if (mt) return await receber(request, env, ctx, mt[1], mt[2])

    if (m === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    if (p === '/wh/novo' && m === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0'
      const ipHash = await hashIp(ip, env.SESSAO_SECRET || 'sal')
      const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM wh_bins WHERE ip_hash = ? AND criado_em > ?').bind(ipHash, Date.now() - 3600_000).all()).results?.[0]?.n ?? 0
      if (n >= 10) return erro(429, 'Você criou muitas URLs na última hora. Use a que já tem ou espere um pouco.')
      ctx?.waitUntil?.(limparVencidos(env))
      const id = aleatorio(12)
      const chave = aleatorio(32)
      const agora = Date.now()
      await env.DB.prepare('INSERT INTO wh_bins (id, chave, ip_hash, status, ctype, corpo, criado_em, expira_em) VALUES (?,?,?,?,?,?,?,?)')
        .bind(id, chave, ipHash, 200, 'application/json', '{"ok":true}', agora, agora + HORAS * 3600_000).run()
      return json({ id, chave, criado_em: agora, expira_em: agora + HORAS * 3600_000 })
    }

    mt = p.match(/^\/wh\/([a-z0-9]{12})(?:\/(reqs|config))?$/)
    if (mt) {
      const bin = await binValido(env, mt[1])
      if (!bin) return erro(404, 'Essa URL expirou ou não existe. Gere uma nova.')
      if (!iguais(request.headers.get('X-Chave') || '', bin.chave)) return erro(403, 'Chave inválida.')
      const sub = mt[2]
      if (sub === 'reqs' && m === 'GET') {
        const desde = Number(url.searchParams.get('desde')) || 0
        const { results } = await env.DB.prepare('SELECT * FROM wh_reqs WHERE bin_id = ? AND criado_em > ? ORDER BY criado_em DESC LIMIT ?').bind(bin.id, desde, MAX_REQS).all()
        return json({
          bin: publicoBin(bin),
          reqs: (results || []).map((r) => ({ ...r, headers: JSON.parse(r.headers || '[]'), binario: !!r.binario, truncado: !!r.truncado })),
        })
      }
      if (sub === 'reqs' && m === 'DELETE') {
        await env.DB.prepare('DELETE FROM wh_reqs WHERE bin_id = ?').bind(bin.id).run()
        return json({ ok: true })
      }
      if (sub === 'config' && m === 'PUT') {
        const b = await request.json().catch(() => ({}))
        const status = Math.min(599, Math.max(200, parseInt(b.status, 10) || 200))
        const ctype = String(b.tipo || 'application/json').slice(0, 100)
        const corpo = String(b.corpo ?? '').slice(0, 10000)
        await env.DB.prepare('UPDATE wh_bins SET status=?, ctype=?, corpo=? WHERE id=?').bind(status, ctype, corpo, bin.id).run()
        return json({ ok: true, resposta: { status, tipo: ctype, corpo } })
      }
      if (!sub && m === 'DELETE') {
        await env.DB.batch([env.DB.prepare('DELETE FROM wh_reqs WHERE bin_id = ?').bind(bin.id), env.DB.prepare('DELETE FROM wh_bins WHERE id = ?').bind(bin.id)])
        return json({ ok: true })
      }
    }
    return erro(404, 'Rota do webhook não encontrada.')
  } catch (e) {
    console.log(JSON.stringify({ nivel: 'erro', rota: p, msg: String((e && e.stack) || e) }))
    return erro(500, 'Erro interno.')
  }
}
