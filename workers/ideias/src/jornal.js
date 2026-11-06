// Meu Jornal: a pessoa cria o próprio jornalzinho (cara de jornal de papel), escreve matérias,
// define o peso de cada uma (manchete, destaque, normal, curta) e a ordem; a capa pública fica em soudev/j/<slug>.
// Login: link do jornal (slug) + senha. Sessão por token (Authorization: Bearer). Tabelas jn_* no D1.
// Fotos: comprimidas no navegador e guardadas no D1 (a conta não tem R2).

import { CORS, erro, hashIp, hashSenha, json, txt, verificaSenha, b64url } from './catalogo.js'

const LIMITE_MATERIAS = 80
const LIMITE_IMAGENS = 100
const MAX_IMAGEM = 450 * 1024
const TIPOS_IMG = ['image/webp', 'image/jpeg', 'image/png']
const PESOS = ['manchete', 'destaque', 'normal', 'curta']
const RESERVADOS = new Set(['admin', 'api', 'login', 'entrar', 'cadastro', 'novo', 'nova', 'editor', 'painel', 'soudev', 'jornal', 'www', 'teste'])
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/

const agora = () => Date.now()
const ehId = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v)
const um = (v, opcoes, padrao) => (opcoes.includes(v) ? v : padrao)
// texto longo: mantém quebras de linha, tira caracteres de controle
const textoLongo = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)

/* ------------------------------ config ------------------------------ */
export function limparConfig(c) {
  c = c && typeof c === 'object' ? c : {}
  return {
    lema: txt(c.lema, 120),
    cidade: txt(c.cidade, 60),
    preco: txt(c.preco, 20),
    editor: txt(c.editor, 80),
    papel: um(c.papel, ['amarelado', 'branco'], 'amarelado'),
    letreiro: um(c.letreiro, ['gotico', 'classico'], 'gotico'),
    fotosPB: c.fotosPB !== false,
  }
}
function lerConfig(s) {
  try { return limparConfig(JSON.parse(s || '{}')) } catch { return limparConfig({}) }
}

/* ------------------------------ dados ------------------------------ */
function tokenDa(request) {
  const h = request.headers.get('Authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}
async function primeiro(env, sql, ...args) {
  const { results } = await env.DB.prepare(sql).bind(...args).all()
  return results?.[0] || null
}
const jornalDaSessao = (env, request) => {
  const t = tokenDa(request)
  return t ? primeiro(env, 'SELECT j.* FROM jn_sessoes s JOIN jn_jornais j ON j.id = s.jornal_id WHERE s.token = ?', t) : null
}
const porSlug = (env, slug) => primeiro(env, 'SELECT * FROM jn_jornais WHERE slug = ?', String(slug).toLowerCase())

function jornalPublico(j) {
  return { slug: j.slug, nome: j.nome, config: lerConfig(j.config), criado_em: j.criado_em, atualizado_em: j.atualizado_em }
}
function materiaPublica(m) {
  return {
    id: m.id, titulo: m.titulo, linha_fina: m.linha_fina, secao: m.secao, autor: m.autor, texto: m.texto,
    foto: m.foto, legenda: m.legenda, peso: m.peso, estado: m.estado, ordem: m.ordem,
    criado_em: m.criado_em, atualizado_em: m.atualizado_em, publicado_em: m.publicado_em,
  }
}
async function materiasDo(env, jornalId, soPublicadas) {
  const sql = `SELECT * FROM jn_materias WHERE jornal_id = ?${soPublicadas ? " AND estado = 'publicada'" : ''} ORDER BY ordem ASC, criado_em DESC`
  const { results } = await env.DB.prepare(sql).bind(jornalId).all()
  return (results || []).map(materiaPublica)
}
async function novaSessao(env, jornalId) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(24)))
  await env.DB.prepare('INSERT INTO jn_sessoes (token, jornal_id, criado_em) VALUES (?,?,?)').bind(token, jornalId, agora()).run()
  return token
}
function lerMateria(b) {
  return {
    titulo: txt(b.titulo, 160),
    linha_fina: txt(b.linha_fina, 280),
    secao: txt(b.secao, 30),
    autor: txt(b.autor, 60),
    texto: textoLongo(b.texto, 20000),
    foto: ehId(b.foto) ? b.foto : null,
    legenda: txt(b.legenda, 200),
    peso: um(b.peso, PESOS, 'normal'),
    estado: um(b.estado, ['publicada', 'rascunho'], 'rascunho'),
  }
}
const tocar = (env, id) => env.DB.prepare('UPDATE jn_jornais SET atualizado_em=? WHERE id=?').bind(agora(), id).run()

/* ------------------------------ imagens ------------------------------ */
async function apagarImagens(env, ids) {
  if (ids.length) await env.DB.batch(ids.map((id) => env.DB.prepare('DELETE FROM jn_imagens WHERE id = ?').bind(id)))
}
// apaga fotos que nenhuma matéria usa (com folga de 1h para uploads ainda não salvos)
async function limparOrfas(env, jornalId) {
  const { results: usadas } = await env.DB.prepare('SELECT foto FROM jn_materias WHERE jornal_id = ? AND foto IS NOT NULL').bind(jornalId).all()
  const set = new Set((usadas || []).map((u) => u.foto))
  const { results: imgs } = await env.DB.prepare('SELECT id FROM jn_imagens WHERE jornal_id = ? AND criado_em < ?').bind(jornalId, agora() - 3600_000).all()
  await apagarImagens(env, (imgs || []).map((i) => i.id).filter((id) => !set.has(id)))
}
async function servirImagem(env, id) {
  const img = await primeiro(env, 'SELECT tipo, dados FROM jn_imagens WHERE id = ?', id)
  if (!img?.dados) return new Response('Imagem não encontrada', { status: 404, headers: CORS })
  return new Response(new Uint8Array(img.dados), { headers: { 'Content-Type': img.tipo, 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS } })
}

/* ------------------------------ rotas ------------------------------ */
export async function rotasJornal(request, env, ctx) {
  const url = new URL(request.url)
  const p = url.pathname
  if (p !== '/jn' && !p.startsWith('/jn/')) return null
  const m = request.method
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  try {
    // ---------- públicas ----------
    let mt = p.match(/^\/jn\/img\/([0-9a-f-]{36})$/)
    if (mt && m === 'GET') return await servirImagem(env, mt[1])

    mt = p.match(/^\/jn\/jornal\/([a-z0-9-]{3,30})$/)
    if (mt && m === 'GET') {
      const j = await porSlug(env, mt[1])
      if (!j) return erro(404, 'Jornal não encontrado.')
      return json({ jornal: jornalPublico(j), materias: await materiasDo(env, j.id, true) })
    }
    mt = p.match(/^\/jn\/jornal\/([a-z0-9-]{3,30})\/visita$/)
    if (mt && m === 'POST') {
      await env.DB.prepare('UPDATE jn_jornais SET visitas = visitas + 1 WHERE slug = ?').bind(mt[1]).run()
      return json({ ok: true })
    }
    mt = p.match(/^\/jn\/disponivel\/(.{1,40})$/)
    if (mt && m === 'GET') {
      const slug = decodeURIComponent(mt[1]).toLowerCase()
      if (!SLUG.test(slug)) return json({ disponivel: false, motivo: 'Use 3 a 30 letras, números ou hífen.' })
      if (RESERVADOS.has(slug)) return json({ disponivel: false, motivo: 'Esse nome é reservado.' })
      return json({ disponivel: !(await porSlug(env, slug)) })
    }

    // ---------- conta ----------
    if (p === '/jn/cadastro' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      const slug = txt(b.slug, 30).toLowerCase()
      const senha = String(b.senha ?? '')
      const nome = txt(b.nome, 60)
      if (!SLUG.test(slug)) return erro(400, 'O link precisa ter de 3 a 30 letras, números ou hífen (sem espaço nem acento).')
      if (RESERVADOS.has(slug)) return erro(400, 'Esse link é reservado. Escolha outro.')
      if (senha.length < 6) return erro(400, 'A senha precisa ter ao menos 6 caracteres.')
      if (!nome) return erro(400, 'Dê um nome ao jornal.')
      if (await porSlug(env, slug)) return erro(409, 'Esse link já está em uso. Escolha outro.')
      const id = crypto.randomUUID()
      const t = agora()
      await env.DB.prepare('INSERT INTO jn_jornais (id, slug, senha_hash, nome, config, criado_em, atualizado_em) VALUES (?,?,?,?,?,?,?)')
        .bind(id, slug, await hashSenha(senha), nome, JSON.stringify(limparConfig(b.config)), t, t).run()
      return json({ token: await novaSessao(env, id), slug })
    }
    if (p === '/jn/login' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') || '0.0.0.0', env.SESSAO_SECRET || 'sal')
      const desde = agora() - 15 * 60 * 1000
      const n = (await primeiro(env, 'SELECT COUNT(*) AS n FROM jn_falhas WHERE ip_hash = ? AND criado_em > ?', ipHash, desde))?.n ?? 0
      if (n >= 10) return erro(429, 'Muitas tentativas. Espere 15 minutos e tente de novo.')
      const j = await porSlug(env, txt(String(b.slug ?? '').replace(/^.*\/j\//, '').replace(/[/?#].*$/, ''), 30))
      if (!j || !(await verificaSenha(String(b.senha ?? ''), j.senha_hash))) {
        await env.DB.prepare('INSERT INTO jn_falhas (ip_hash, criado_em) VALUES (?,?)').bind(ipHash, agora()).run()
        ctx?.waitUntil?.(env.DB.prepare('DELETE FROM jn_falhas WHERE criado_em < ?').bind(desde).run())
        return erro(401, 'Link do jornal ou senha incorretos.')
      }
      return json({ token: await novaSessao(env, j.id), slug: j.slug })
    }

    // ---------- daqui pra baixo: precisa estar logado ----------
    const jornal = await jornalDaSessao(env, request)
    if (!jornal) return erro(401, 'Entre no seu jornal de novo.')

    if (p === '/jn/sair' && m === 'POST') {
      await env.DB.prepare('DELETE FROM jn_sessoes WHERE token = ?').bind(tokenDa(request)).run()
      return json({ ok: true })
    }
    if (p === '/jn/eu' && m === 'GET') {
      return json({ jornal: { ...jornalPublico(jornal), visitas: jornal.visitas }, materias: await materiasDo(env, jornal.id, false), limite: LIMITE_MATERIAS })
    }
    if (p === '/jn/jornal' && m === 'PATCH') {
      const b = await request.json().catch(() => ({}))
      const nome = b.nome !== undefined ? txt(b.nome, 60) || jornal.nome : jornal.nome
      const config = b.config !== undefined ? JSON.stringify(limparConfig(b.config)) : jornal.config
      await env.DB.prepare('UPDATE jn_jornais SET nome=?, config=?, atualizado_em=? WHERE id=?').bind(nome, config, agora(), jornal.id).run()
      return json({ ok: true, jornal: jornalPublico({ ...jornal, nome, config }) })
    }
    if (p === '/jn/senha' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      if (!(await verificaSenha(String(b.atual ?? ''), jornal.senha_hash))) return erro(400, 'A senha atual está errada.')
      if (String(b.nova ?? '').length < 6) return erro(400, 'A nova senha precisa ter ao menos 6 caracteres.')
      await env.DB.batch([
        env.DB.prepare('UPDATE jn_jornais SET senha_hash=? WHERE id=?').bind(await hashSenha(String(b.nova)), jornal.id),
        env.DB.prepare('DELETE FROM jn_sessoes WHERE jornal_id=? AND token != ?').bind(jornal.id, tokenDa(request)),
      ])
      return json({ ok: true })
    }
    if (p === '/jn/conta' && m === 'DELETE') {
      const b = await request.json().catch(() => ({}))
      if (!(await verificaSenha(String(b.senha ?? ''), jornal.senha_hash))) return erro(400, 'Senha errada.')
      await env.DB.batch([
        env.DB.prepare('DELETE FROM jn_imagens WHERE jornal_id=?').bind(jornal.id),
        env.DB.prepare('DELETE FROM jn_materias WHERE jornal_id=?').bind(jornal.id),
        env.DB.prepare('DELETE FROM jn_sessoes WHERE jornal_id=?').bind(jornal.id),
        env.DB.prepare('DELETE FROM jn_jornais WHERE id=?').bind(jornal.id),
      ])
      return json({ ok: true })
    }

    // ---------- matérias ----------
    if (p === '/jn/materias' && m === 'POST') {
      const total = (await primeiro(env, 'SELECT COUNT(*) AS n FROM jn_materias WHERE jornal_id=?', jornal.id))?.n ?? 0
      if (total >= LIMITE_MATERIAS) return erro(403, `O jornal vai até ${LIMITE_MATERIAS} matérias. Apague as antigas para escrever novas.`)
      const d = lerMateria(await request.json().catch(() => ({})))
      if (!d.titulo) return erro(400, 'Dê um título à matéria.')
      const id = crypto.randomUUID()
      const t = agora()
      // matéria nova entra no topo (a mais recente costuma ser a mais importante)
      const ordem = ((await primeiro(env, 'SELECT MIN(ordem) AS o FROM jn_materias WHERE jornal_id=?', jornal.id))?.o ?? 1) - 1
      const pub = d.estado === 'publicada' ? t : null
      await env.DB.prepare('INSERT INTO jn_materias (id, jornal_id, titulo, linha_fina, secao, autor, texto, foto, legenda, peso, estado, ordem, criado_em, atualizado_em, publicado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, jornal.id, d.titulo, d.linha_fina, d.secao, d.autor, d.texto, d.foto, d.legenda, d.peso, d.estado, ordem, t, t, pub).run()
      await tocar(env, jornal.id)
      return json({ ok: true, materia: { id, ...d, ordem, criado_em: t, atualizado_em: t, publicado_em: pub } })
    }
    if (p === '/jn/materias/ordem' && m === 'POST') {
      const ids = ((await request.json().catch(() => ({}))).ids || []).filter(ehId).slice(0, LIMITE_MATERIAS + 5)
      if (ids.length) await env.DB.batch(ids.map((id, i) => env.DB.prepare('UPDATE jn_materias SET ordem=? WHERE id=? AND jornal_id=?').bind(i, id, jornal.id)))
      await tocar(env, jornal.id)
      return json({ ok: true })
    }
    mt = p.match(/^\/jn\/materias\/([0-9a-f-]{36})$/)
    if (mt && (m === 'PATCH' || m === 'DELETE')) {
      const atual = await primeiro(env, 'SELECT * FROM jn_materias WHERE id=? AND jornal_id=?', mt[1], jornal.id)
      if (!atual) return erro(404, 'Matéria não encontrada.')
      if (m === 'DELETE') {
        await env.DB.prepare('DELETE FROM jn_materias WHERE id=?').bind(atual.id).run()
      } else {
        const d = lerMateria({ ...materiaPublica(atual), ...(await request.json().catch(() => ({}))) })
        if (!d.titulo) return erro(400, 'Dê um título à matéria.')
        const t = agora()
        const pub = d.estado === 'publicada' ? atual.publicado_em || t : atual.publicado_em
        await env.DB.prepare('UPDATE jn_materias SET titulo=?, linha_fina=?, secao=?, autor=?, texto=?, foto=?, legenda=?, peso=?, estado=?, atualizado_em=?, publicado_em=? WHERE id=?')
          .bind(d.titulo, d.linha_fina, d.secao, d.autor, d.texto, d.foto, d.legenda, d.peso, d.estado, t, pub, atual.id).run()
      }
      await tocar(env, jornal.id)
      if (atual.foto) ctx?.waitUntil?.(limparOrfas(env, jornal.id))
      return json({ ok: true })
    }

    // ---------- foto (corpo cru, já comprimido no navegador) ----------
    if (p === '/jn/imagens' && m === 'POST') {
      const tipo = (request.headers.get('Content-Type') || '').split(';')[0].trim()
      if (!TIPOS_IMG.includes(tipo)) return erro(400, 'Envie uma imagem WebP, JPEG ou PNG.')
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (!bytes.length) return erro(400, 'Imagem vazia.')
      if (bytes.length > MAX_IMAGEM) return erro(413, 'Imagem grande demais (máx. 450 KB depois de comprimida).')
      const contar = async () => (await primeiro(env, 'SELECT COUNT(*) AS n FROM jn_imagens WHERE jornal_id=?', jornal.id))?.n ?? 0
      if ((await contar()) >= LIMITE_IMAGENS) {
        await limparOrfas(env, jornal.id)
        if ((await contar()) >= LIMITE_IMAGENS) return erro(403, 'Limite de fotos atingido. Apague matérias antigas.')
      }
      const id = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO jn_imagens (id, jornal_id, tipo, tamanho, dados, criado_em) VALUES (?,?,?,?,?,?)').bind(id, jornal.id, tipo, bytes.length, bytes, agora()).run()
      return json({ ok: true, id })
    }
    return erro(404, 'Rota do jornal não encontrada.')
  } catch (e) {
    console.log(JSON.stringify({ nivel: 'erro', rota: p, msg: String((e && e.stack) || e) }))
    return erro(500, 'Erro interno. Tente de novo.')
  }
}
