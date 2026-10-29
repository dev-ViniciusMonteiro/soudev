/**
 * soudev-ideias — Cloudflare Worker
 *
 * Recebe as ideias enviadas pelo balão do site (POST /ideias, público) e guarda no D1.
 * Serve um painel admin seguro em /admin (login por usuário + senha, com hash e cookie assinado).
 *
 * Segurança:
 *  - A senha nunca fica no código. Guardamos só o HASH (PBKDF2-SHA256) no secret ADMIN_PASS_HASH.
 *  - Sessão por cookie httpOnly + Secure + SameSite=Strict, assinado com HMAC (secret SESSAO_SECRET).
 *  - Comparações de hash/HMAC em tempo constante (evita timing attack).
 *  - Endpoint público com rate-limit por IP (hash, nunca o IP cru), honeypot e limite de tamanho.
 */

const enc = new TextEncoder()

/* ----------------------------- utils de bytes ----------------------------- */

function b64ToBytes(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function bytesToB64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/* ------------------------------- senha ------------------------------------ */
// Formato do hash: pbkdf2$<iteracoes>$<saltB64>$<hashB64>  (gerado pelo scripts/hash-senha.mjs)

async function verificarSenha(senha, armazenado) {
  const partes = String(armazenado || '').split('$')
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false
  const iteracoes = parseInt(partes[1], 10)
  const salt = b64ToBytes(partes[2])
  const esperado = b64ToBytes(partes[3])
  if (!iteracoes || !esperado.length) return false
  const key = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iteracoes },
    key,
    esperado.length * 8,
  )
  return timingSafeEqual(new Uint8Array(bits), esperado)
}

/* ------------------------------- sessão ----------------------------------- */

async function hmac(secret, dados) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dados))
  return new Uint8Array(sig)
}

async function criarSessao(env) {
  const horas = parseInt(env.SESSAO_HORAS || '12', 10) || 12
  const payload = JSON.stringify({ u: env.ADMIN_USER, exp: Date.now() + horas * 3600 * 1000 })
  const p64 = bytesToB64url(enc.encode(payload))
  const sig = bytesToB64url(await hmac(env.SESSAO_SECRET, p64))
  return `${p64}.${sig}`
}

async function validarSessao(env, token) {
  if (!token || token.indexOf('.') < 0) return false
  const [p64, sig] = token.split('.')
  const esperada = bytesToB64url(await hmac(env.SESSAO_SECRET, p64))
  if (!timingSafeEqual(enc.encode(sig), enc.encode(esperada))) return false
  try {
    const dados = JSON.parse(new TextDecoder().decode(b64ToBytes(p64)))
    return dados.exp > Date.now()
  } catch {
    return false
  }
}

function lerCookie(request, nome) {
  const raw = request.headers.get('Cookie') || ''
  for (const parte of raw.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nome) return v.join('=')
  }
  return null
}

/* ------------------------------- helpers ---------------------------------- */

async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${ip}|${salt}`))
  return bytesToB64url(new Uint8Array(buf)).slice(0, 22)
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function html(corpo, status = 200) {
  return new Response(corpo, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
function json(dados, status = 200, extra = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  })
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

/* -------------------------------- rotas ----------------------------------- */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const { pathname } = url
    const metodo = request.method

    try {
      // CORS preflight do endpoint público
      if (metodo === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

      if (pathname === '/ideias' && metodo === 'POST') return await enviarIdeia(request, env)

      if (pathname === '/comentarios' && metodo === 'GET') return await listarComentarios(request, env)
      if (pathname === '/comentarios' && metodo === 'POST') return await enviarComentario(request, env)

      if (pathname === '/admin' || pathname === '/admin/') return await adminHome(request, env)
      if (pathname === '/admin/comentarios') return await adminComentarios(request, env)
      if (pathname === '/admin/export.csv') return await adminExportCsv(request, env)
      if (pathname === '/admin/login' && metodo === 'POST') return await adminLogin(request, env)
      if (pathname === '/admin/logout' && metodo === 'POST') return adminLogout(env)
      if (pathname === '/admin/acao' && metodo === 'POST') return await adminAcao(request, env)

      if (pathname === '/') return json({ ok: true, servico: 'soudev-ideias' })

      return new Response('Não encontrado', { status: 404 })
    } catch (erro) {
      const msg = String((erro && erro.stack) || (erro && erro.message) || erro)
      console.log(JSON.stringify({ nivel: 'erro', rota: pathname, msg }))
      return json({ error: 'Erro interno' }, 500)
    }
  },
}

/* ---------------------------- endpoint público ---------------------------- */

async function enviarIdeia(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Requisição inválida.' }, 400, CORS)
  }

  // Honeypot: campo invisível que humano não preenche. Se vier preenchido, é bot.
  if (String(body?.website || '').trim()) return json({ ok: true }, 200, CORS)

  const mensagem = String(body?.mensagem ?? '').trim().slice(0, 2000)
  const nome = String(body?.nome ?? '').trim().slice(0, 120) || null
  const pagina = String(body?.pagina ?? '').trim().slice(0, 300) || null
  if (mensagem.length < 2) return json({ error: 'Escreva sua ideia.' }, 400, CORS)

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0'
  const ipHash = await hashIp(ip, env.SESSAO_SECRET || 'sal')
  const agora = Date.now()

  // Rate-limit: no máx. 6 ideias por IP a cada 10 minutos.
  const janela = agora - 10 * 60 * 1000
  const { results } = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM ideias WHERE ip_hash = ? AND criado_em > ?',
  ).bind(ipHash, janela).all()
  if (results?.[0]?.n >= 6) return json({ error: 'Você enviou muitas ideias. Tente de novo mais tarde.' }, 429, CORS)

  await env.DB.prepare(
    'INSERT INTO ideias (id, mensagem, nome, pagina, ip_hash, user_agent, status, criado_em) VALUES (?,?,?,?,?,?,?,?)',
  ).bind(
    crypto.randomUUID(),
    mensagem,
    nome,
    pagina,
    ipHash,
    (request.headers.get('User-Agent') || '').slice(0, 300),
    'nova',
    agora,
  ).run()

  return json({ ok: true }, 200, CORS)
}

/* --------------------------- comentários (público) ------------------------ */

async function listarComentarios(request, env) {
  const url = new URL(request.url)
  const pagina = (url.searchParams.get('pagina') || '').slice(0, 50)
  let sql = "SELECT id, nome, mensagem, criado_em FROM comentarios WHERE status = 'publicado'"
  const bind = []
  if (pagina) {
    sql += ' AND pagina = ?'
    bind.push(pagina)
  }
  sql += ' ORDER BY criado_em DESC LIMIT 200'
  const { results } = await env.DB.prepare(sql).bind(...bind).all()
  return json({ comentarios: results || [] }, 200, CORS)
}

async function enviarComentario(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Requisição inválida.' }, 400, CORS)
  }
  if (String(body?.website || '').trim()) return json({ ok: true }, 200, CORS) // honeypot

  const mensagem = String(body?.mensagem ?? '').trim().slice(0, 1000)
  const nome = String(body?.nome ?? '').trim().slice(0, 60) || null
  const pagina = String(body?.pagina ?? '').trim().slice(0, 50) || null
  if (mensagem.length < 2) return json({ error: 'Escreva um comentário.' }, 400, CORS)

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0'
  const ipHash = await hashIp(ip, env.SESSAO_SECRET || 'sal')
  const agora = Date.now()

  // Rate-limit: no máx. 4 comentários por IP a cada 10 minutos.
  const { results } = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM comentarios WHERE ip_hash = ? AND criado_em > ?',
  ).bind(ipHash, agora - 10 * 60 * 1000).all()
  if (results?.[0]?.n >= 4) return json({ error: 'Você comentou demais agora há pouco. Tente mais tarde.' }, 429, CORS)

  const id = crypto.randomUUID()
  await env.DB.prepare(
    "INSERT INTO comentarios (id, nome, mensagem, pagina, ip_hash, status, criado_em) VALUES (?,?,?,?,?,'publicado',?)",
  ).bind(id, nome, mensagem, pagina, ipHash, agora).run()

  return json({ ok: true, comentario: { id, nome, mensagem, criado_em: agora } }, 200, CORS)
}

/* -------------------------------- admin ----------------------------------- */

async function estaLogado(request, env) {
  return validarSessao(env, lerCookie(request, 'sid'))
}

function cookieSessao(valor, env, apagar = false) {
  const horas = parseInt(env.SESSAO_HORAS || '12', 10) || 12
  const maxAge = apagar ? 0 : horas * 3600
  return `sid=${apagar ? '' : valor}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=${maxAge}`
}

async function adminLogin(request, env) {
  const form = await request.formData()
  const user = String(form.get('user') || '')
  const senha = String(form.get('senha') || '')

  const userOk = timingSafeEqual(enc.encode(user), enc.encode(env.ADMIN_USER || ''))
  const senhaOk = await verificarSenha(senha, env.ADMIN_PASS_HASH)
  if (!userOk || !senhaOk) {
    return html(paginaLogin('Usuário ou senha incorretos.'), 401)
  }
  const token = await criarSessao(env)
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin', 'Set-Cookie': cookieSessao(token, env) },
  })
}

function adminLogout(env) {
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin', 'Set-Cookie': cookieSessao('', env, true) },
  })
}

async function adminAcao(request, env) {
  if (!(await estaLogado(request, env))) return new Response('Não autorizado', { status: 401 })
  const form = await request.formData()
  const id = String(form.get('id') || '')
  const acao = String(form.get('acao') || '')
  const filtro = String(form.get('filtro') || '')

  if (acao === 'lida' || acao === 'nova' || acao === 'arquivada') {
    await env.DB.prepare('UPDATE ideias SET status = ? WHERE id = ?').bind(acao, id).run()
  } else if (acao === 'excluir') {
    await env.DB.prepare('DELETE FROM ideias WHERE id = ?').bind(id).run()
  }
  const q = filtro ? `?status=${encodeURIComponent(filtro)}` : ''
  return new Response(null, { status: 303, headers: { Location: `/admin${q}` } })
}

async function adminExportCsv(request, env) {
  if (!(await estaLogado(request, env))) return new Response('Não autorizado', { status: 401 })
  const { results } = await env.DB.prepare(
    'SELECT criado_em, status, nome, pagina, mensagem FROM ideias ORDER BY criado_em DESC LIMIT 5000',
  ).all()

  const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const linhas = [['data', 'status', 'nome', 'pagina', 'mensagem'].map(campo).join(',')]
  for (const i of results || []) {
    linhas.push([
      new Date(i.criado_em).toISOString(),
      i.status,
      i.nome || '',
      i.pagina || '',
      i.mensagem,
    ].map(campo).join(','))
  }
  const csv = '﻿' + linhas.join('\r\n') // BOM para abrir certo no Excel
  const hoje = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ideias-${hoje}.csv"`,
    },
  })
}

async function adminComentarios(request, env) {
  if (!(await estaLogado(request, env))) return html(paginaLogin())

  if (request.method === 'POST') {
    const form = await request.formData()
    const id = String(form.get('id') || '')
    const acao = String(form.get('acao') || '')
    if (acao === 'excluir') {
      await env.DB.prepare('DELETE FROM comentarios WHERE id = ?').bind(id).run()
    } else if (acao === 'ocultar') {
      await env.DB.prepare("UPDATE comentarios SET status = 'oculto' WHERE id = ?").bind(id).run()
    } else if (acao === 'publicar') {
      await env.DB.prepare("UPDATE comentarios SET status = 'publicado' WHERE id = ?").bind(id).run()
    }
    return new Response(null, { status: 303, headers: { Location: '/admin/comentarios' } })
  }

  const { results } = await env.DB.prepare(
    'SELECT id, nome, mensagem, pagina, status, criado_em FROM comentarios ORDER BY criado_em DESC LIMIT 500',
  ).all()
  return html(paginaComentarios(results || []))
}

async function adminHome(request, env) {
  if (!(await estaLogado(request, env))) return html(paginaLogin())

  const url = new URL(request.url)
  const filtro = url.searchParams.get('status') || ''
  let sql = 'SELECT id, mensagem, nome, pagina, status, criado_em FROM ideias'
  const bind = []
  if (['nova', 'lida', 'arquivada'].includes(filtro)) {
    sql += ' WHERE status = ?'
    bind.push(filtro)
  }
  sql += ' ORDER BY criado_em DESC LIMIT 500'
  const { results } = await env.DB.prepare(sql).bind(...bind).all()

  const cont = await env.DB.prepare(
    "SELECT status, COUNT(*) AS n FROM ideias GROUP BY status",
  ).all()
  const totais = { nova: 0, lida: 0, arquivada: 0 }
  for (const r of cont.results || []) totais[r.status] = r.n

  return html(paginaPainel(results || [], filtro, totais, env))
}

/* ------------------------------- páginas HTML ----------------------------- */

const BASE_CSS = `
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1115;color:#e7e9ee}
  a{color:#8ab4ff}
  .wrap{max-width:860px;margin:0 auto;padding:24px 16px}
  .card{background:#171a21;border:1px solid #242934;border-radius:14px;padding:20px}
  h1{font-size:20px;margin:0 0 4px}
  .muted{color:#9aa3b2}
  input,button{font:inherit}
  input{width:100%;padding:11px 12px;border-radius:9px;border:1px solid #2b313d;background:#0f1115;color:#e7e9ee;margin-top:6px}
  button{cursor:pointer;border:0;border-radius:9px;padding:9px 14px;background:#3a63ff;color:#fff;font-weight:600}
  button.ghost{background:#242934;color:#cdd3de}
  button.danger{background:#5a2330;color:#ffb4bf}
  label{display:block;margin-top:14px;font-weight:600}
`

function paginaLogin(erro = '') {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin · Ideias</title>
<meta name="robots" content="noindex"><style>${BASE_CSS}.wrap{max-width:380px;margin-top:10vh}</style></head>
<body><div class="wrap"><div class="card">
<h1>Painel de ideias</h1><p class="muted">Acesso restrito.</p>
${erro ? `<p style="color:#ffb4bf">${esc(erro)}</p>` : ''}
<form method="post" action="/admin/login" autocomplete="off">
<label>Usuário<input name="user" required autofocus></label>
<label>Senha<input name="senha" type="password" required></label>
<button style="margin-top:18px;width:100%">Entrar</button>
</form></div></div></body></html>`
}

function paginaPainel(ideias, filtro, totais, env) {
  const chip = (valor, rotulo, n) =>
    `<a href="/admin${valor ? `?status=${valor}` : ''}" style="text-decoration:none">
      <span style="display:inline-block;padding:6px 11px;border-radius:999px;margin:0 6px 6px 0;
      background:${filtro === valor ? '#3a63ff' : '#242934'};color:${filtro === valor ? '#fff' : '#cdd3de'}">
      ${rotulo} <b>${n}</b></span></a>`

  const linhas = ideias.map((i) => {
    const data = new Date(i.criado_em).toLocaleString('pt-BR')
    const cor = i.status === 'nova' ? '#3a63ff' : i.status === 'arquivada' ? '#5a6273' : '#2e7d57'
    return `<div class="card" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <span class="muted">${esc(i.nome || 'Anônimo')} · ${esc(data)}${i.pagina ? ` · <span title="página de origem">${esc(i.pagina)}</span>` : ''}</span>
        <span style="color:${cor};font-weight:600">${esc(i.status)}</span>
      </div>
      <p style="white-space:pre-wrap;margin:10px 0 12px">${esc(i.mensagem)}</p>
      <form method="post" action="/admin/acao" style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="hidden" name="id" value="${esc(i.id)}">
        <input type="hidden" name="filtro" value="${esc(filtro)}">
        ${i.status !== 'lida' ? `<button class="ghost" name="acao" value="lida">Marcar lida</button>` : `<button class="ghost" name="acao" value="nova">Marcar nova</button>`}
        ${i.status !== 'arquivada' ? `<button class="ghost" name="acao" value="arquivada">Arquivar</button>` : ''}
        <button class="danger" name="acao" value="excluir" onclick="return confirm('Excluir esta ideia?')">Excluir</button>
      </form>
    </div>`
  }).join('')

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Ideias · Admin</title>
<meta name="robots" content="noindex"><style>${BASE_CSS}</style></head>
<body><div class="wrap">
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
  <h1>Ideias da comunidade${totais.nova ? ` <span style="background:#3a63ff;color:#fff;border-radius:999px;padding:2px 10px;font-size:14px;vertical-align:middle">${totais.nova} nova${totais.nova > 1 ? 's' : ''}</span>` : ''}</h1>
  <div style="display:flex;gap:8px">
    <a href="https://backend-soudev.backend-soudev.workers.dev/admin-sx" style="text-decoration:none"><button type="button" class="ghost">Empresas ↗</button></a>
    <a href="/admin/comentarios" style="text-decoration:none"><button type="button" class="ghost">Comentários</button></a>
    <a href="/admin/export.csv" style="text-decoration:none"><button type="button" class="ghost">Exportar CSV</button></a>
    <form method="post" action="/admin/logout"><button class="ghost">Sair</button></form>
  </div>
</div>
<div style="margin:14px 0">
  ${chip('', 'Todas', (totais.nova + totais.lida + totais.arquivada))}
  ${chip('nova', 'Novas', totais.nova)}
  ${chip('lida', 'Lidas', totais.lida)}
  ${chip('arquivada', 'Arquivadas', totais.arquivada)}
</div>
${ideias.length ? linhas : '<div class="card" style="margin-top:12px"><p class="muted">Nenhuma ideia por aqui ainda.</p></div>'}
</div></body></html>`
}

function paginaComentarios(comentarios) {
  const linhas = comentarios.map((c) => {
    const data = new Date(c.criado_em).toLocaleString('pt-BR')
    const oculto = c.status === 'oculto'
    return `<div class="card" style="margin-top:12px;opacity:${oculto ? '0.55' : '1'}">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <span class="muted">${esc(c.nome || 'Anônimo')} · ${esc(data)}${c.pagina ? ` · ${esc(c.pagina)}` : ''}</span>
        <span class="muted">${oculto ? 'oculto' : 'publicado'}</span>
      </div>
      <p style="white-space:pre-wrap;margin:10px 0 12px">${esc(c.mensagem)}</p>
      <form method="post" action="/admin/comentarios" style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="hidden" name="id" value="${esc(c.id)}">
        ${oculto
          ? `<button class="ghost" name="acao" value="publicar">Publicar</button>`
          : `<button class="ghost" name="acao" value="ocultar">Ocultar do site</button>`}
        <button class="danger" name="acao" value="excluir" onclick="return confirm('Excluir este comentário?')">Excluir</button>
      </form>
    </div>`
  }).join('')

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Comentários · Admin</title>
<meta name="robots" content="noindex"><style>${BASE_CSS}</style></head>
<body><div class="wrap">
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
  <h1>Comentários do site</h1>
  <a href="/admin" style="text-decoration:none"><button class="ghost">← Ideias</button></a>
</div>
<p class="muted">Aparecem publicamente no site. Use "Ocultar" para tirar do site sem apagar, ou "Excluir".</p>
${comentarios.length ? linhas : '<div class="card" style="margin-top:12px"><p class="muted">Nenhum comentário ainda.</p></div>'}
</div></body></html>`
}
