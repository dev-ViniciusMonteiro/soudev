// Vinicut — rede social simples estilo Orkut (só texto), servida pelo mesmo worker.
// Login só com usuário + senha (sem e-mail). Sessão por token (guardado no navegador e
// enviado no header Authorization). Sem fotos. Tudo no D1 (tabelas vc_*).

const enc = new TextEncoder()

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
  const iteracoes = parseInt(p[1], 10)
  const salt = deB64(p[2])
  const esperado = deB64(p[3])
  const key = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iteracoes }, key, esperado.length * 8))
  return iguais(bits, esperado)
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}
const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } })
const erro = (status, msg) => json({ erro: msg }, status)

const txt = (v, max) => String(v ?? '').trim().slice(0, max)
const agora = () => Date.now()

function tokenDa(request) {
  const h = request.headers.get('Authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}
async function usuarioDaSessao(env, request) {
  const token = tokenDa(request)
  if (!token) return null
  const { results } = await env.DB.prepare(
    'SELECT u.* FROM vc_sessoes s JOIN vc_usuarios u ON u.id = s.usuario_id WHERE s.token = ?',
  ).bind(token).all()
  return results?.[0] || null
}
function publico(u) {
  if (!u) return null
  return {
    id: u.id, usuario: u.usuario, nome: u.nome, status: u.status || '',
    quem_sou: u.quem_sou || '', idade: u.idade || '', cidade: u.cidade || '',
    relacionamento: u.relacionamento || '', criado_em: u.criado_em, visto_em: u.visto_em,
  }
}
async function contadores(env, id) {
  const r = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM vc_recados WHERE para_id = ?').bind(id),
    env.DB.prepare('SELECT COUNT(*) AS n FROM vc_depoimentos WHERE para_id = ?').bind(id),
    env.DB.prepare('SELECT COUNT(*) AS n FROM vc_amizades WHERE a_id = ?').bind(id),
    env.DB.prepare('SELECT COUNT(*) AS n FROM vc_membros WHERE usuario_id = ?').bind(id),
  ])
  return {
    recados: r[0].results?.[0]?.n ?? 0,
    depoimentos: r[1].results?.[0]?.n ?? 0,
    amigos: r[2].results?.[0]?.n ?? 0,
    comunidades: r[3].results?.[0]?.n ?? 0,
  }
}
async function porUsuario(env, usuario) {
  const { results } = await env.DB.prepare('SELECT * FROM vc_usuarios WHERE usuario = ?').bind(String(usuario).toLowerCase()).all()
  return results?.[0] || null
}

/* ------------------------------ rotas ------------------------------ */
export async function rotasVinicut(request, env) {
  const url = new URL(request.url)
  const p = url.pathname
  if (p !== '/vc' && !p.startsWith('/vc/')) return null
  const m = request.method
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    // ---- cadastro / login ----
    if (p === '/vc/cadastro' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      const usuario = txt(b.usuario, 20).toLowerCase()
      const senha = String(b.senha ?? '')
      const nome = txt(b.nome, 40)
      if (!/^[a-z0-9_.]{3,20}$/.test(usuario)) return erro(400, 'Usuário: 3 a 20 letras, números, ponto ou _ (sem espaço).')
      if (senha.length < 4) return erro(400, 'A senha precisa ter ao menos 4 caracteres.')
      if (!nome) return erro(400, 'Diga o seu nome.')
      if (await porUsuario(env, usuario)) return erro(409, 'Esse usuário já existe. Escolha outro.')
      const id = crypto.randomUUID()
      const t = agora()
      await env.DB.prepare('INSERT INTO vc_usuarios (id, usuario, senha_hash, nome, criado_em, visto_em) VALUES (?,?,?,?,?,?)')
        .bind(id, usuario, await hashSenha(senha), nome, t, t).run()
      const token = b64url(crypto.getRandomValues(new Uint8Array(24)))
      await env.DB.prepare('INSERT INTO vc_sessoes (token, usuario_id, criado_em) VALUES (?,?,?)').bind(token, id, t).run()
      const u = await porUsuario(env, usuario)
      return json({ token, perfil: publico(u) })
    }

    if (p === '/vc/login' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      const u = await porUsuario(env, txt(b.usuario, 20))
      if (!u || !(await verificaSenha(String(b.senha ?? ''), u.senha_hash))) return erro(401, 'Usuário ou senha incorretos.')
      const token = b64url(crypto.getRandomValues(new Uint8Array(24)))
      await env.DB.prepare('INSERT INTO vc_sessoes (token, usuario_id, criado_em) VALUES (?,?,?)').bind(token, u.id, agora()).run()
      await env.DB.prepare('UPDATE vc_usuarios SET visto_em = ? WHERE id = ?').bind(agora(), u.id).run()
      return json({ token, perfil: publico(u) })
    }

    // Daqui em diante, quase tudo público para GET; ações exigem sessão.
    const eu = await usuarioDaSessao(env, request)
    if (eu) env.DB.prepare('UPDATE vc_usuarios SET visto_em = ? WHERE id = ?').bind(agora(), eu.id).run().catch(() => {})

    if (p === '/vc/sair' && m === 'POST') {
      const token = tokenDa(request)
      if (token) await env.DB.prepare('DELETE FROM vc_sessoes WHERE token = ?').bind(token).run()
      return json({ ok: true })
    }

    if (p === '/vc/eu' && m === 'GET') {
      if (!eu) return json({ perfil: null })
      return json({ perfil: publico(eu), contadores: await contadores(env, eu.id) })
    }

    if (p === '/vc/perfil' && m === 'PATCH') {
      if (!eu) return erro(401, 'Entre para editar o perfil.')
      const b = await request.json().catch(() => ({}))
      await env.DB.prepare('UPDATE vc_usuarios SET nome=?, status=?, quem_sou=?, idade=?, cidade=?, relacionamento=? WHERE id=?')
        .bind(txt(b.nome, 40) || eu.nome, txt(b.status, 140), txt(b.quem_sou, 2000), txt(b.idade, 10), txt(b.cidade, 60), txt(b.relacionamento, 40), eu.id).run()
      return json({ perfil: publico(await porUsuario(env, eu.usuario)) })
    }

    // ---- pessoas (lista) ----
    if (p === '/vc/pessoas' && m === 'GET') {
      const q = txt(url.searchParams.get('q'), 40).toLowerCase()
      let sql = 'SELECT id, usuario, nome, status, cidade, visto_em FROM vc_usuarios'
      const bind = []
      if (q) { sql += ' WHERE usuario LIKE ? OR LOWER(nome) LIKE ?'; bind.push(`%${q}%`, `%${q}%`) }
      sql += ' ORDER BY visto_em DESC LIMIT 60'
      const { results } = await env.DB.prepare(sql).bind(...bind).all()
      return json({ pessoas: results || [] })
    }

    // ---- perfil público e suas listas ----
    let mt = p.match(/^\/vc\/u\/([a-z0-9_.]{3,20})(?:\/(recados|depoimentos|amigos|amizade))?$/)
    if (mt) {
      const alvo = await porUsuario(env, mt[1])
      if (!alvo) return erro(404, 'Perfil não encontrado.')
      const sub = mt[2]

      if (!sub && m === 'GET') {
        const souAmigo = eu ? !!(await env.DB.prepare('SELECT 1 FROM vc_amizades WHERE a_id=? AND b_id=?').bind(eu.id, alvo.id).all()).results?.length : false
        return json({ perfil: publico(alvo), contadores: await contadores(env, alvo.id), sou_amigo: souAmigo, sou_eu: eu?.id === alvo.id })
      }

      if (sub === 'recados') {
        if (m === 'GET') {
          const { results } = await env.DB.prepare('SELECT id, de_usuario, de_nome, texto, criado_em FROM vc_recados WHERE para_id=? ORDER BY criado_em DESC LIMIT 200').bind(alvo.id).all()
          return json({ recados: results || [] })
        }
        if (m === 'POST') {
          if (!eu) return erro(401, 'Entre para deixar um recado.')
          const texto = txt((await request.json().catch(() => ({}))).texto, 1000)
          if (texto.length < 1) return erro(400, 'Escreva o recado.')
          const id = crypto.randomUUID()
          await env.DB.prepare('INSERT INTO vc_recados (id, para_id, de_id, de_usuario, de_nome, texto, criado_em) VALUES (?,?,?,?,?,?,?)')
            .bind(id, alvo.id, eu.id, eu.usuario, eu.nome, texto, agora()).run()
          return json({ ok: true, id })
        }
      }

      if (sub === 'depoimentos') {
        if (m === 'GET') {
          const { results } = await env.DB.prepare('SELECT id, de_usuario, de_nome, texto, criado_em FROM vc_depoimentos WHERE para_id=? ORDER BY criado_em DESC LIMIT 200').bind(alvo.id).all()
          return json({ depoimentos: results || [] })
        }
        if (m === 'POST') {
          if (!eu) return erro(401, 'Entre para deixar um depoimento.')
          if (eu.id === alvo.id) return erro(400, 'Depoimento é algo que os outros escrevem sobre você.')
          const texto = txt((await request.json().catch(() => ({}))).texto, 1500)
          if (texto.length < 1) return erro(400, 'Escreva o depoimento.')
          const id = crypto.randomUUID()
          await env.DB.prepare('INSERT INTO vc_depoimentos (id, para_id, de_id, de_usuario, de_nome, texto, criado_em) VALUES (?,?,?,?,?,?,?)')
            .bind(id, alvo.id, eu.id, eu.usuario, eu.nome, texto, agora()).run()
          return json({ ok: true, id })
        }
      }

      if (sub === 'amigos' && m === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT u.id, u.usuario, u.nome, u.status FROM vc_amizades f JOIN vc_usuarios u ON u.id = f.b_id WHERE f.a_id = ? ORDER BY f.criado_em DESC',
        ).bind(alvo.id).all()
        return json({ amigos: results || [] })
      }

      if (sub === 'amizade' && (m === 'POST' || m === 'DELETE')) {
        if (!eu) return erro(401, 'Entre para adicionar amigos.')
        if (eu.id === alvo.id) return erro(400, 'Você não pode se adicionar.')
        if (m === 'POST') {
          const t = agora()
          await env.DB.batch([
            env.DB.prepare('INSERT OR IGNORE INTO vc_amizades (a_id, b_id, criado_em) VALUES (?,?,?)').bind(eu.id, alvo.id, t),
            env.DB.prepare('INSERT OR IGNORE INTO vc_amizades (a_id, b_id, criado_em) VALUES (?,?,?)').bind(alvo.id, eu.id, t),
          ])
          return json({ ok: true, sou_amigo: true })
        } else {
          await env.DB.batch([
            env.DB.prepare('DELETE FROM vc_amizades WHERE a_id=? AND b_id=?').bind(eu.id, alvo.id),
            env.DB.prepare('DELETE FROM vc_amizades WHERE a_id=? AND b_id=?').bind(alvo.id, eu.id),
          ])
          return json({ ok: true, sou_amigo: false })
        }
      }
    }

    // apagar recado/depoimento (autor ou dono do perfil)
    let md = p.match(/^\/vc\/(recados|depoimentos)\/([0-9a-f-]{36})$/)
    if (md && m === 'DELETE') {
      if (!eu) return erro(401, 'Entre.')
      const tab = md[1] === 'recados' ? 'vc_recados' : 'vc_depoimentos'
      await env.DB.prepare(`DELETE FROM ${tab} WHERE id=? AND (de_id=? OR para_id=?)`).bind(md[2], eu.id, eu.id).run()
      return json({ ok: true })
    }

    // ---- comunidades ----
    if (p === '/vc/comunidades' && m === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT c.id, c.nome, c.descricao, (SELECT COUNT(*) FROM vc_membros m WHERE m.comunidade_id=c.id) AS membros
           FROM vc_comunidades c ORDER BY c.criado_em DESC LIMIT 200`,
      ).all()
      return json({ comunidades: results || [] })
    }
    if (p === '/vc/comunidades' && m === 'POST') {
      if (!eu) return erro(401, 'Entre para criar uma comunidade.')
      const b = await request.json().catch(() => ({}))
      const nome = txt(b.nome, 80)
      if (nome.length < 2) return erro(400, 'Dê um nome à comunidade.')
      const id = crypto.randomUUID()
      const t = agora()
      await env.DB.prepare('INSERT INTO vc_comunidades (id, nome, descricao, dono_id, criado_em) VALUES (?,?,?,?,?)')
        .bind(id, nome, txt(b.descricao, 1000), eu.id, t).run()
      await env.DB.prepare('INSERT INTO vc_membros (comunidade_id, usuario_id, criado_em) VALUES (?,?,?)').bind(id, eu.id, t).run()
      return json({ ok: true, id })
    }

    let mc = p.match(/^\/vc\/c\/([0-9a-f-]{36})(?:\/(participar|topicos))?$/)
    if (mc) {
      const { results } = await env.DB.prepare('SELECT * FROM vc_comunidades WHERE id=?').bind(mc[1]).all()
      const com = results?.[0]
      if (!com) return erro(404, 'Comunidade não encontrada.')
      const sub = mc[2]

      if (!sub && m === 'GET') {
        const membros = (await env.DB.prepare('SELECT COUNT(*) AS n FROM vc_membros WHERE comunidade_id=?').bind(com.id).all()).results?.[0]?.n ?? 0
        const topicos = (await env.DB.prepare(
          'SELECT id, titulo, autor_usuario, autor_nome, criado_em FROM vc_topicos WHERE comunidade_id=? ORDER BY criado_em DESC LIMIT 200',
        ).bind(com.id).all()).results || []
        const souMembro = eu ? !!(await env.DB.prepare('SELECT 1 FROM vc_membros WHERE comunidade_id=? AND usuario_id=?').bind(com.id, eu.id).all()).results?.length : false
        return json({ comunidade: { id: com.id, nome: com.nome, descricao: com.descricao || '', criado_em: com.criado_em }, membros, topicos, sou_membro: souMembro })
      }
      if (sub === 'participar' && m === 'POST') {
        if (!eu) return erro(401, 'Entre para participar.')
        const tem = (await env.DB.prepare('SELECT 1 FROM vc_membros WHERE comunidade_id=? AND usuario_id=?').bind(com.id, eu.id).all()).results?.length
        if (tem) {
          await env.DB.prepare('DELETE FROM vc_membros WHERE comunidade_id=? AND usuario_id=?').bind(com.id, eu.id).run()
          return json({ ok: true, sou_membro: false })
        }
        await env.DB.prepare('INSERT OR IGNORE INTO vc_membros (comunidade_id, usuario_id, criado_em) VALUES (?,?,?)').bind(com.id, eu.id, agora()).run()
        return json({ ok: true, sou_membro: true })
      }
      if (sub === 'topicos' && m === 'POST') {
        if (!eu) return erro(401, 'Entre para abrir um tópico.')
        const titulo = txt((await request.json().catch(() => ({}))).titulo, 120)
        if (titulo.length < 2) return erro(400, 'Dê um título ao tópico.')
        const id = crypto.randomUUID()
        await env.DB.prepare('INSERT INTO vc_topicos (id, comunidade_id, autor_id, autor_usuario, autor_nome, titulo, criado_em) VALUES (?,?,?,?,?,?,?)')
          .bind(id, com.id, eu.id, eu.usuario, eu.nome, titulo, agora()).run()
        return json({ ok: true, id })
      }
    }

    let tp = p.match(/^\/vc\/t\/([0-9a-f-]{36})(?:\/(respostas))?$/)
    if (tp) {
      const { results } = await env.DB.prepare('SELECT * FROM vc_topicos WHERE id=?').bind(tp[1]).all()
      const top = results?.[0]
      if (!top) return erro(404, 'Tópico não encontrado.')
      if (!tp[2] && m === 'GET') {
        const respostas = (await env.DB.prepare('SELECT id, autor_usuario, autor_nome, texto, criado_em FROM vc_respostas WHERE topico_id=? ORDER BY criado_em ASC LIMIT 500').bind(top.id).all()).results || []
        return json({ topico: { id: top.id, comunidade_id: top.comunidade_id, titulo: top.titulo, autor_usuario: top.autor_usuario, autor_nome: top.autor_nome, criado_em: top.criado_em }, respostas })
      }
      if (tp[2] === 'respostas' && m === 'POST') {
        if (!eu) return erro(401, 'Entre para responder.')
        const texto = txt((await request.json().catch(() => ({}))).texto, 2000)
        if (texto.length < 1) return erro(400, 'Escreva a resposta.')
        const id = crypto.randomUUID()
        await env.DB.prepare('INSERT INTO vc_respostas (id, topico_id, autor_id, autor_usuario, autor_nome, texto, criado_em) VALUES (?,?,?,?,?,?,?)')
          .bind(id, top.id, eu.id, eu.usuario, eu.nome, texto, agora()).run()
        return json({ ok: true, id })
      }
    }

    return erro(404, 'Rota do Vinicut não encontrada.')
  } catch (e) {
    return erro(500, `Erro: ${String(e && e.message || e)}`)
  }
}
