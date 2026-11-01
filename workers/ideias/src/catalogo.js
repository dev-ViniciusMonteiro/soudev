// Catálogo digital — o lojista cadastra produtos e monta a página da loja (blocos arrastáveis);
// o cliente abre o link público (soudev/c/<slug>) e pede pelo WhatsApp.
// Login: link da loja (slug) + senha. Sessão por token (Authorization: Bearer). Tabelas ct_* no D1.
// Imagens: R2 (binding FOTOS) se existir; senão o próprio D1 (já chegam comprimidas do navegador).

const enc = new TextEncoder()

export const LIMITE_PRODUTOS = 20
const LIMITE_IMAGENS = 60
const MAX_IMAGEM = 450 * 1024
const TIPOS_IMG = ['image/webp', 'image/jpeg', 'image/png']
const RESERVADOS = new Set(['admin', 'api', 'login', 'entrar', 'cadastro', 'novo', 'nova', 'editor', 'painel', 'soudev', 'catalogo', 'loja', 'www', 'teste'])

/* ------------------------------ utils ------------------------------ */
function b64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function deB64(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
function iguais(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]
  return d === 0
}
const ITER = 100000
async function hashSenha(senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256))
  return `pbkdf2$${ITER}$${b64url(salt)}$${b64url(bits)}`
}
async function verificaSenha(senha, guardado) {
  const p = String(guardado || '').split('$')
  if (p.length !== 4 || p[0] !== 'pbkdf2') return false
  const salt = deB64(p[2])
  const esperado = deB64(p[3])
  const key = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: parseInt(p[1], 10) }, key, esperado.length * 8))
  return iguais(bits, esperado)
}
async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`ct|${ip}|${salt}`))
  return b64url(new Uint8Array(buf)).slice(0, 22)
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}
const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } })
const erro = (status, msg) => json({ erro: msg }, status)

const txt = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)
const agora = () => Date.now()
const centavos = (v) => {
  const n = Math.round(Number(v) || 0)
  return Math.max(0, Math.min(n, 100_000_000))
}
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 15)
const ehId = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v)
const ehCor = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const um = (v, opcoes, padrao) => (opcoes.includes(v) ? v : padrao)

/* --------------------------- config da página --------------------------- */
// O front manda o JSON inteiro; aqui só passa o que é conhecido, com tamanho limitado.
const TIPOS_BLOCO = ['cabecalho', 'capa', 'aviso', 'busca', 'categorias', 'destaques', 'produtos', 'texto', 'imagem', 'contato', 'rodape']

function limparBloco(b) {
  if (!b || typeof b !== 'object' || !TIPOS_BLOCO.includes(b.tipo)) return null
  const o = b.opcoes && typeof b.opcoes === 'object' ? b.opcoes : {}
  const op = {}
  switch (b.tipo) {
    case 'cabecalho':
      op.alinhamento = um(o.alinhamento, ['esquerda', 'centro'], 'centro')
      op.tamanhoLogo = um(o.tamanhoLogo, ['p', 'm', 'g'], 'm')
      op.mostrarNome = o.mostrarNome !== false
      op.mostrarDescricao = o.mostrarDescricao !== false
      break
    case 'capa':
      op.titulo = txt(o.titulo, 80)
      op.subtitulo = txt(o.subtitulo, 160)
      op.altura = um(o.altura, ['baixa', 'media', 'alta'], 'media')
      op.botao = txt(o.botao, 30)
      break
    case 'aviso':
      op.texto = txt(o.texto, 160)
      op.estilo = um(o.estilo, ['cor', 'suave', 'faixa'], 'cor')
      break
    case 'busca':
      op.placeholder = txt(o.placeholder, 60)
      break
    case 'categorias':
      op.estilo = um(o.estilo, ['pilulas', 'abas'], 'pilulas')
      break
    case 'destaques':
      op.titulo = txt(o.titulo, 60)
      op.layout = um(o.layout, ['carrossel', 'grade'], 'carrossel')
      break
    case 'produtos':
      op.titulo = txt(o.titulo, 60)
      op.layout = um(o.layout, ['grade', 'lista', 'carrossel', 'grande'], 'grade')
      op.colunas = um(Number(o.colunas), [2, 3, 4], 2)
      op.categoria = txt(o.categoria, 40)
      op.mostrarDescricao = o.mostrarDescricao === true
      break
    case 'texto':
      op.titulo = txt(o.titulo, 80)
      op.texto = txt(o.texto, 1500)
      op.alinhamento = um(o.alinhamento, ['esquerda', 'centro'], 'esquerda')
      break
    case 'imagem':
      op.imagem = ehId(o.imagem) ? o.imagem : null
      op.legenda = txt(o.legenda, 120)
      op.formato = um(o.formato, ['largo', 'quadrado', 'original'], 'largo')
      break
    case 'contato':
      op.titulo = txt(o.titulo, 60)
      op.mostrarMapa = o.mostrarMapa === true
      break
    case 'rodape':
      op.texto = txt(o.texto, 160)
      break
  }
  return { id: txt(b.id, 40) || crypto.randomUUID(), tipo: b.tipo, visivel: b.visivel !== false, opcoes: op }
}

export function limparConfig(c) {
  c = c && typeof c === 'object' ? c : {}
  const t = c.tema && typeof c.tema === 'object' ? c.tema : {}
  const blocos = Array.isArray(c.blocos) ? c.blocos.slice(0, 30).map(limparBloco).filter(Boolean) : []
  return {
    modelo: txt(c.modelo, 30),
    tema: {
      cor: ehCor(t.cor) ? t.cor : '#ff5a36',
      fundo: um(t.fundo, ['claro', 'creme', 'escuro', 'preto'], 'claro'),
      fonte: um(t.fonte, ['moderna', 'elegante', 'divertida', 'tech'], 'moderna'),
      cantos: um(t.cantos, ['reto', 'suave', 'redondo'], 'suave'),
      cartao: um(t.cartao, ['sombra', 'borda', 'plano'], 'sombra'),
    },
    logo: ehId(c.logo) ? c.logo : null,
    capa: ehId(c.capa) ? c.capa : null,
    descricao: txt(c.descricao, 300),
    endereco: txt(c.endereco, 200),
    horario: txt(c.horario, 200),
    instagram: txt(c.instagram, 60).replace(/^@/, ''),
    entrega: txt(c.entrega, 200),
    pedidoMinimo: centavos(c.pedidoMinimo),
    blocos,
  }
}

function lerConfig(s) {
  try {
    return limparConfig(JSON.parse(s || '{}'))
  } catch {
    return limparConfig({})
  }
}

/* ------------------------------ dados ------------------------------ */
function tokenDa(request) {
  const h = request.headers.get('Authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}
async function lojaDaSessao(env, request) {
  const token = tokenDa(request)
  if (!token) return null
  const { results } = await env.DB.prepare('SELECT l.* FROM ct_sessoes s JOIN ct_lojas l ON l.id = s.loja_id WHERE s.token = ?').bind(token).all()
  return results?.[0] || null
}
async function porSlug(env, slug) {
  const { results } = await env.DB.prepare('SELECT * FROM ct_lojas WHERE slug = ?').bind(String(slug).toLowerCase()).all()
  return results?.[0] || null
}
function lojaPublica(l) {
  return { slug: l.slug, nome: l.nome, whatsapp: l.whatsapp, config: lerConfig(l.config), atualizado_em: l.atualizado_em }
}
function produtoPublico(p) {
  return {
    id: p.id, nome: p.nome, descricao: p.descricao, categoria: p.categoria, preco: p.preco, preco_de: p.preco_de,
    imagem: p.imagem, destaque: !!p.destaque, estado: p.estado, ordem: p.ordem,
  }
}
async function produtosDa(env, lojaId, soVisiveis) {
  const sql = `SELECT * FROM ct_produtos WHERE loja_id = ?${soVisiveis ? " AND estado != 'oculto'" : ''} ORDER BY ordem ASC, criado_em ASC`
  const { results } = await env.DB.prepare(sql).bind(lojaId).all()
  return (results || []).map(produtoPublico)
}
async function novaSessao(env, lojaId) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(24)))
  await env.DB.prepare('INSERT INTO ct_sessoes (token, loja_id, criado_em) VALUES (?,?,?)').bind(token, lojaId, agora()).run()
  return token
}
function lerProduto(b) {
  return {
    nome: txt(b.nome, 80),
    descricao: txt(b.descricao, 600),
    categoria: txt(b.categoria, 40),
    preco: centavos(b.preco),
    preco_de: centavos(b.preco_de),
    imagem: ehId(b.imagem) ? b.imagem : null,
    destaque: b.destaque ? 1 : 0,
    estado: um(b.estado, ['ativo', 'esgotado', 'oculto'], 'ativo'),
  }
}

/* ------------------------------ imagens ------------------------------ */
async function apagarImagens(env, ids) {
  if (!ids.length) return
  if (env.FOTOS) await Promise.all(ids.map((id) => env.FOTOS.delete(`catalogo/${id}`).catch(() => {})))
  await env.DB.batch(ids.map((id) => env.DB.prepare('DELETE FROM ct_imagens WHERE id = ?').bind(id)))
}

// Apaga imagens da loja que nada mais usa (com folga de 1h para uploads ainda não salvos).
async function limparOrfas(env, loja) {
  const cfg = lerConfig(loja.config)
  const usadas = new Set([cfg.logo, cfg.capa, ...cfg.blocos.map((b) => b.opcoes?.imagem)].filter(Boolean))
  const { results: prods } = await env.DB.prepare('SELECT imagem FROM ct_produtos WHERE loja_id = ? AND imagem IS NOT NULL').bind(loja.id).all()
  for (const p of prods || []) usadas.add(p.imagem)
  const { results: imgs } = await env.DB.prepare('SELECT id FROM ct_imagens WHERE loja_id = ? AND criado_em < ?').bind(loja.id, agora() - 3600_000).all()
  await apagarImagens(env, (imgs || []).map((i) => i.id).filter((id) => !usadas.has(id)))
}

async function servirImagem(env, id) {
  const { results } = await env.DB.prepare('SELECT tipo, dados FROM ct_imagens WHERE id = ?').bind(id).all()
  const img = results?.[0]
  if (!img) return new Response('Imagem não encontrada', { status: 404, headers: CORS })
  let corpo = img.dados
  if (!corpo && env.FOTOS) {
    const obj = await env.FOTOS.get(`catalogo/${id}`)
    if (!obj) return new Response('Imagem não encontrada', { status: 404, headers: CORS })
    corpo = obj.body
  } else if (corpo) {
    corpo = new Uint8Array(corpo)
  }
  return new Response(corpo, {
    headers: { 'Content-Type': img.tipo, 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS },
  })
}

/* ------------------------------ rotas ------------------------------ */
export async function rotasCatalogo(request, env, ctx) {
  const url = new URL(request.url)
  const p = url.pathname
  if (p !== '/ct' && !p.startsWith('/ct/')) return null
  const m = request.method
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    // ---------- públicas ----------
    let mt = p.match(/^\/ct\/img\/([0-9a-f-]{36})$/)
    if (mt && m === 'GET') return await servirImagem(env, mt[1])

    mt = p.match(/^\/ct\/loja\/([a-z0-9-]{3,30})$/)
    if (mt && m === 'GET') {
      const loja = await porSlug(env, mt[1])
      if (!loja) return erro(404, 'Catálogo não encontrado.')
      return json({ loja: lojaPublica(loja), produtos: await produtosDa(env, loja.id, true) })
    }

    // estatística simples: visita e clique em pedir (sem guardar nada do cliente)
    mt = p.match(/^\/ct\/loja\/([a-z0-9-]{3,30})\/(visita|pedido)$/)
    if (mt && m === 'POST') {
      const col = mt[2] === 'visita' ? 'visitas' : 'pedidos'
      await env.DB.prepare(`UPDATE ct_lojas SET ${col} = ${col} + 1 WHERE slug = ?`).bind(mt[1]).run()
      return json({ ok: true })
    }

    mt = p.match(/^\/ct\/disponivel\/(.{1,40})$/)
    if (mt && m === 'GET') {
      const slug = decodeURIComponent(mt[1]).toLowerCase()
      if (!/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(slug)) return json({ disponivel: false, motivo: 'Use 3 a 30 letras, números ou hífen.' })
      if (RESERVADOS.has(slug)) return json({ disponivel: false, motivo: 'Esse nome é reservado.' })
      return json({ disponivel: !(await porSlug(env, slug)) })
    }

    // ---------- conta ----------
    if (p === '/ct/cadastro' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      const slug = txt(b.slug, 30).toLowerCase()
      const senha = String(b.senha ?? '')
      const nome = txt(b.nome, 60)
      if (!/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(slug)) return erro(400, 'O link precisa ter de 3 a 30 letras, números ou hífen (sem espaço nem acento).')
      if (RESERVADOS.has(slug)) return erro(400, 'Esse link é reservado. Escolha outro.')
      if (senha.length < 6) return erro(400, 'A senha precisa ter ao menos 6 caracteres.')
      if (!nome) return erro(400, 'Diga o nome da loja.')
      if (await porSlug(env, slug)) return erro(409, 'Esse link já está em uso. Escolha outro.')
      const id = crypto.randomUUID()
      const t = agora()
      const config = limparConfig(b.config)
      await env.DB.prepare('INSERT INTO ct_lojas (id, slug, senha_hash, nome, whatsapp, config, criado_em, atualizado_em) VALUES (?,?,?,?,?,?,?,?)')
        .bind(id, slug, await hashSenha(senha), nome, soDigitos(b.whatsapp), JSON.stringify(config), t, t).run()
      return json({ token: await novaSessao(env, id), slug })
    }

    if (p === '/ct/login' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') || '0.0.0.0', env.SESSAO_SECRET || 'sal')
      const desde = agora() - 15 * 60 * 1000
      const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ct_falhas WHERE ip_hash = ? AND criado_em > ?').bind(ipHash, desde).all()).results?.[0]?.n ?? 0
      if (n >= 10) return erro(429, 'Muitas tentativas. Espere 15 minutos e tente de novo.')
      const loja = await porSlug(env, txt(String(b.slug ?? '').replace(/^.*\/c\//, '').replace(/[/?#].*$/, ''), 30))
      if (!loja || !(await verificaSenha(String(b.senha ?? ''), loja.senha_hash))) {
        await env.DB.prepare('INSERT INTO ct_falhas (ip_hash, criado_em) VALUES (?,?)').bind(ipHash, agora()).run()
        ctx?.waitUntil?.(env.DB.prepare('DELETE FROM ct_falhas WHERE criado_em < ?').bind(desde).run())
        return erro(401, 'Link da loja ou senha incorretos.')
      }
      return json({ token: await novaSessao(env, loja.id), slug: loja.slug })
    }

    // ---------- daqui pra baixo: precisa estar logado ----------
    const loja = await lojaDaSessao(env, request)
    if (!loja) return erro(401, 'Entre na sua loja de novo.')

    if (p === '/ct/sair' && m === 'POST') {
      await env.DB.prepare('DELETE FROM ct_sessoes WHERE token = ?').bind(tokenDa(request)).run()
      return json({ ok: true })
    }

    if (p === '/ct/eu' && m === 'GET') {
      return json({
        loja: { ...lojaPublica(loja), visitas: loja.visitas, pedidos: loja.pedidos, criado_em: loja.criado_em },
        produtos: await produtosDa(env, loja.id, false),
        limite: LIMITE_PRODUTOS,
        armazenamento: env.FOTOS ? 'r2' : 'd1',
      })
    }

    if (p === '/ct/loja' && m === 'PATCH') {
      const b = await request.json().catch(() => ({}))
      const nome = b.nome !== undefined ? txt(b.nome, 60) || loja.nome : loja.nome
      const whatsapp = b.whatsapp !== undefined ? soDigitos(b.whatsapp) : loja.whatsapp
      const config = b.config !== undefined ? JSON.stringify(limparConfig(b.config)) : loja.config
      if (config.length > 40000) return erro(400, 'A página ficou grande demais. Remova alguns blocos.')
      await env.DB.prepare('UPDATE ct_lojas SET nome=?, whatsapp=?, config=?, atualizado_em=? WHERE id=?').bind(nome, whatsapp, config, agora(), loja.id).run()
      ctx?.waitUntil?.(limparOrfas(env, { ...loja, config }))
      return json({ ok: true, loja: lojaPublica({ ...loja, nome, whatsapp, config }) })
    }

    if (p === '/ct/senha' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      if (!(await verificaSenha(String(b.atual ?? ''), loja.senha_hash))) return erro(400, 'A senha atual está errada.')
      if (String(b.nova ?? '').length < 6) return erro(400, 'A nova senha precisa ter ao menos 6 caracteres.')
      await env.DB.batch([
        env.DB.prepare('UPDATE ct_lojas SET senha_hash=? WHERE id=?').bind(await hashSenha(String(b.nova)), loja.id),
        env.DB.prepare('DELETE FROM ct_sessoes WHERE loja_id=? AND token != ?').bind(loja.id, tokenDa(request)),
      ])
      return json({ ok: true })
    }

    if (p === '/ct/conta' && m === 'DELETE') {
      const b = await request.json().catch(() => ({}))
      if (!(await verificaSenha(String(b.senha ?? ''), loja.senha_hash))) return erro(400, 'Senha errada.')
      const { results: imgs } = await env.DB.prepare('SELECT id FROM ct_imagens WHERE loja_id=?').bind(loja.id).all()
      await apagarImagens(env, (imgs || []).map((i) => i.id))
      await env.DB.batch([
        env.DB.prepare('DELETE FROM ct_produtos WHERE loja_id=?').bind(loja.id),
        env.DB.prepare('DELETE FROM ct_sessoes WHERE loja_id=?').bind(loja.id),
        env.DB.prepare('DELETE FROM ct_lojas WHERE id=?').bind(loja.id),
      ])
      return json({ ok: true })
    }

    // ---------- produtos ----------
    if (p === '/ct/produtos' && m === 'POST') {
      const total = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ct_produtos WHERE loja_id=?').bind(loja.id).all()).results?.[0]?.n ?? 0
      if (total >= LIMITE_PRODUTOS) return erro(403, `O plano grátis vai até ${LIMITE_PRODUTOS} produtos. Apague um para cadastrar outro.`)
      const d = lerProduto(await request.json().catch(() => ({})))
      if (!d.nome) return erro(400, 'Dê um nome ao produto.')
      const id = crypto.randomUUID()
      const ordem = ((await env.DB.prepare('SELECT MAX(ordem) AS o FROM ct_produtos WHERE loja_id=?').bind(loja.id).all()).results?.[0]?.o ?? -1) + 1
      await env.DB.prepare('INSERT INTO ct_produtos (id, loja_id, nome, descricao, categoria, preco, preco_de, imagem, destaque, estado, ordem, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, loja.id, d.nome, d.descricao, d.categoria, d.preco, d.preco_de, d.imagem, d.destaque, d.estado, ordem, agora()).run()
      await env.DB.prepare('UPDATE ct_lojas SET atualizado_em=? WHERE id=?').bind(agora(), loja.id).run()
      return json({ ok: true, produto: { id, ...d, destaque: !!d.destaque, ordem } })
    }

    if (p === '/ct/produtos/ordem' && m === 'POST') {
      const ids = ((await request.json().catch(() => ({}))).ids || []).filter(ehId).slice(0, LIMITE_PRODUTOS + 5)
      if (ids.length) await env.DB.batch(ids.map((id, i) => env.DB.prepare('UPDATE ct_produtos SET ordem=? WHERE id=? AND loja_id=?').bind(i, id, loja.id)))
      return json({ ok: true })
    }

    mt = p.match(/^\/ct\/produtos\/([0-9a-f-]{36})$/)
    if (mt && (m === 'PATCH' || m === 'DELETE')) {
      const { results } = await env.DB.prepare('SELECT * FROM ct_produtos WHERE id=? AND loja_id=?').bind(mt[1], loja.id).all()
      const atual = results?.[0]
      if (!atual) return erro(404, 'Produto não encontrado.')
      if (m === 'DELETE') {
        await env.DB.prepare('DELETE FROM ct_produtos WHERE id=?').bind(atual.id).run()
      } else {
        const d = lerProduto({ ...produtoPublico(atual), ...(await request.json().catch(() => ({}))) })
        if (!d.nome) return erro(400, 'Dê um nome ao produto.')
        await env.DB.prepare('UPDATE ct_produtos SET nome=?, descricao=?, categoria=?, preco=?, preco_de=?, imagem=?, destaque=?, estado=? WHERE id=?')
          .bind(d.nome, d.descricao, d.categoria, d.preco, d.preco_de, d.imagem, d.destaque, d.estado, atual.id).run()
      }
      await env.DB.prepare('UPDATE ct_lojas SET atualizado_em=? WHERE id=?').bind(agora(), loja.id).run()
      if (atual.imagem) {
        // a imagem antiga sai na hora se nada mais usa
        const cfg = lerConfig(loja.config)
        const aindaUsada = [cfg.logo, cfg.capa, ...cfg.blocos.map((b) => b.opcoes?.imagem)].includes(atual.imagem) ||
          (await env.DB.prepare('SELECT 1 FROM ct_produtos WHERE imagem=? LIMIT 1').bind(atual.imagem).all()).results?.length
        if (!aindaUsada) ctx?.waitUntil?.(apagarImagens(env, [atual.imagem]))
      }
      return json({ ok: true })
    }

    // ---------- upload de imagem (corpo cru, já comprimido no navegador) ----------
    if (p === '/ct/imagens' && m === 'POST') {
      const tipo = (request.headers.get('Content-Type') || '').split(';')[0].trim()
      if (!TIPOS_IMG.includes(tipo)) return erro(400, 'Envie uma imagem WebP, JPEG ou PNG.')
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (!bytes.length) return erro(400, 'Imagem vazia.')
      if (bytes.length > MAX_IMAGEM) return erro(413, 'Imagem grande demais (máx. 450 KB depois de comprimida).')
      const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ct_imagens WHERE loja_id=?').bind(loja.id).all()).results?.[0]?.n ?? 0
      if (n >= LIMITE_IMAGENS) {
        await limparOrfas(env, loja)
        const n2 = (await env.DB.prepare('SELECT COUNT(*) AS n FROM ct_imagens WHERE loja_id=?').bind(loja.id).all()).results?.[0]?.n ?? 0
        if (n2 >= LIMITE_IMAGENS) return erro(403, 'Limite de imagens atingido. Apague produtos ou imagens que não usa.')
      }
      const id = crypto.randomUUID()
      if (env.FOTOS) {
        await env.FOTOS.put(`catalogo/${id}`, bytes, { httpMetadata: { contentType: tipo } })
        await env.DB.prepare('INSERT INTO ct_imagens (id, loja_id, tipo, tamanho, dados, criado_em) VALUES (?,?,?,?,NULL,?)').bind(id, loja.id, tipo, bytes.length, agora()).run()
      } else {
        await env.DB.prepare('INSERT INTO ct_imagens (id, loja_id, tipo, tamanho, dados, criado_em) VALUES (?,?,?,?,?,?)').bind(id, loja.id, tipo, bytes.length, bytes, agora()).run()
      }
      return json({ ok: true, id })
    }

    return erro(404, 'Rota do catálogo não encontrada.')
  } catch (e) {
    console.log(JSON.stringify({ nivel: 'erro', rota: p, msg: String((e && e.stack) || e) }))
    return erro(500, 'Erro interno. Tente de novo.')
  }
}
