// Salas compartilhadas por link (sem cadastro): votação (Decida por Nós), lista de presentes e divisão de tarefas.
// Quem cria recebe uma chave de administrador; quem tem o link participa pelas ações permitidas de cada tipo.
//   POST   /gp/novo            { tipo, dados } -> { id, chave }
//   GET    /gp/<id>?eu=<pid>   visão pública (ou de admin com header X-Chave)
//   POST   /gp/<id>/acao       { acao, ... } ações de participante (validadas por tipo)
//   PUT    /gp/<id>            { dados } admin edita a configuração
//   DELETE /gp/<id>            admin apaga

const enc = new TextEncoder()
const TIPOS = ['votacao', 'presentes', 'tarefas']
const MAX_JSON = 80 * 1024
const DIAS_VIDA = 365

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Chave',
  'Access-Control-Max-Age': '86400',
}
const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } })
const erro = (status, msg) => json({ erro: msg }, status)

const txt = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max)
const txtLongo = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)
const ehId = (v) => typeof v === 'string' && /^[\w-]{4,40}$/.test(v)
const novoId = () => crypto.randomUUID().slice(0, 8)
const inteiro = (v, min, max, padrao) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao
}
const dinheiro = (v) => Math.max(0, Math.min(1e7, Math.round((Number(v) || 0) * 100) / 100))
const url = (v) => {
  const s = txt(v, 500)
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : ''
}
function aleatorio(n) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789'
  return [...crypto.getRandomValues(new Uint8Array(n))].map((x) => abc[x % abc.length]).join('')
}
function iguais(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`gp|${ip}|${salt}`))
  return btoa(String.fromCharCode(...new Uint8Array(buf))).slice(0, 22)
}

/* ------------------------------ configuração por tipo ------------------------------ */
// limparConfig: só a parte que o dono define. Os dados dos participantes (votos, reservas, feitos) são preservados.
const LIMPAR = {
  votacao(c, antigo = {}) {
    const opcoes = (Array.isArray(c.opcoes) ? c.opcoes : []).slice(0, 30).map((o) => ({ id: ehId(o?.id) ? o.id : novoId(), texto: txt(o?.texto, 120), por: txt(o?.por, 40) })).filter((o) => o.texto)
    const validas = new Set(opcoes.map((o) => o.id))
    const votos = {}
    for (const [pid, v] of Object.entries(antigo.votos || {})) {
      const escolhas = (v.escolhas || []).filter((e) => validas.has(e))
      if (escolhas.length) votos[pid] = { ...v, escolhas }
    }
    return {
      pergunta: txt(c.pergunta, 160),
      descricao: txtLongo(c.descricao, 500),
      opcoes,
      multipla: !!c.multipla,
      anonima: !!c.anonima,
      sugestoes: !!c.sugestoes,
      fechada: !!c.fechada,
      prazo: /^\d{4}-\d{2}-\d{2}$/.test(c.prazo || '') ? c.prazo : '',
      votos,
    }
  },
  presentes(c, antigo = {}) {
    const itens = (Array.isArray(c.itens) ? c.itens : []).slice(0, 120).map((i) => ({
      id: ehId(i?.id) ? i.id : novoId(),
      nome: txt(i?.nome, 100),
      descricao: txt(i?.descricao, 240),
      preco: dinheiro(i?.preco),
      link: url(i?.link),
      qtd: inteiro(i?.qtd, 1, 50, 1),
      categoria: txt(i?.categoria, 40),
    })).filter((i) => i.nome)
    const validos = new Set(itens.map((i) => i.id))
    const reservas = Object.fromEntries(Object.entries(antigo.reservas || {}).filter(([k]) => validos.has(k)))
    return {
      titulo: txt(c.titulo, 100),
      ocasiao: txt(c.ocasiao, 40),
      data: /^\d{4}-\d{2}-\d{2}$/.test(c.data || '') ? c.data : '',
      mensagem: txtLongo(c.mensagem, 600),
      endereco: txt(c.endereco, 200),
      pix: txt(c.pix, 120),
      surpresa: !!c.surpresa,
      itens,
      reservas,
    }
  },
  tarefas(c, antigo = {}) {
    const membros = (Array.isArray(c.membros) ? c.membros : []).slice(0, 20).map((m) => ({ id: ehId(m?.id) ? m.id : novoId(), nome: txt(m?.nome, 30), emoji: txt(m?.emoji, 8) })).filter((m) => m.nome)
    const ids = new Set(membros.map((m) => m.id))
    const tarefas = (Array.isArray(c.tarefas) ? c.tarefas : []).slice(0, 150).map((t) => ({
      id: ehId(t?.id) ? t.id : novoId(),
      titulo: txt(t?.titulo, 100),
      responsavel: ids.has(t?.responsavel) ? t.responsavel : '',
      frequencia: ['diaria', 'semanal', 'mensal', 'unica'].includes(t?.frequencia) ? t.frequencia : 'semanal',
      dia: inteiro(t?.dia, 0, 6, 6),
      pontos: inteiro(t?.pontos, 1, 20, 2),
      comodo: txt(t?.comodo, 30),
      prazo: /^\d{4}-\d{2}-\d{2}$/.test(t?.prazo || '') ? t.prazo : '',
    })).filter((t) => t.titulo)
    const validas = new Set(tarefas.map((t) => t.id))
    const feitos = {}
    const limite = Date.now() - 120 * 86400000
    for (const [tid, per] of Object.entries(antigo.feitos || {})) {
      if (!validas.has(tid)) continue
      const p = Object.fromEntries(Object.entries(per).filter(([, f]) => (f.em || 0) > limite))
      if (Object.keys(p).length) feitos[tid] = p
    }
    return { nome: txt(c.nome, 60), membros, tarefas, feitos }
  },
}

/* ------------------------------ ações de participante ------------------------------ */
const ACOES = {
  votacao: {
    votar(d, a) {
      if (d.fechada) throw new Error('A votação já foi encerrada.')
      if (d.prazo && new Date(`${d.prazo}T23:59:59-03:00`) < new Date()) throw new Error('O prazo da votação acabou.')
      if (!ehId(a.participante)) throw new Error('Participante inválido.')
      const validas = new Set(d.opcoes.map((o) => o.id))
      let escolhas = [...new Set((a.escolhas || []).filter((e) => validas.has(e)))]
      if (!d.multipla) escolhas = escolhas.slice(0, 1)
      if (!escolhas.length) {
        delete d.votos[a.participante]
        return d
      }
      if (Object.keys(d.votos).length >= 2000 && !d.votos[a.participante]) throw new Error('Limite de votos atingido.')
      d.votos[a.participante] = { nome: txt(a.nome, 40), escolhas, em: Date.now() }
      return d
    },
    sugerir(d, a) {
      if (!d.sugestoes) throw new Error('Esta votação não aceita sugestões.')
      if (d.fechada) throw new Error('A votação já foi encerrada.')
      const texto = txt(a.texto, 120)
      if (!texto) throw new Error('Escreva a sugestão.')
      if (d.opcoes.length >= 30) throw new Error('Já tem opções demais.')
      if (d.opcoes.some((o) => o.texto.toLowerCase() === texto.toLowerCase())) throw new Error('Essa opção já existe.')
      d.opcoes.push({ id: novoId(), texto, por: txt(a.nome, 40) })
      return d
    },
  },
  presentes: {
    reservar(d, a) {
      if (!ehId(a.participante)) throw new Error('Participante inválido.')
      const item = d.itens.find((i) => i.id === a.itemId)
      if (!item) throw new Error('Presente não encontrado.')
      const lista = d.reservas[item.id] || []
      const outros = lista.filter((r) => r.participante !== a.participante)
      const ja = outros.reduce((s, r) => s + r.qtd, 0)
      const qtd = inteiro(a.qtd, 1, item.qtd, 1)
      if (ja + qtd > item.qtd) throw new Error(ja >= item.qtd ? 'Alguém acabou de reservar este presente.' : `Só restam ${item.qtd - ja}.`)
      const nome = txt(a.nome, 40)
      if (!nome) throw new Error('Diga o seu nome.')
      d.reservas[item.id] = [...outros, { participante: a.participante, nome, qtd, em: Date.now() }]
      return d
    },
    cancelar(d, a) {
      const lista = d.reservas[a.itemId] || []
      d.reservas[a.itemId] = lista.filter((r) => r.participante !== a.participante)
      if (!d.reservas[a.itemId].length) delete d.reservas[a.itemId]
      return d
    },
  },
  tarefas: {
    concluir(d, a) {
      const t = d.tarefas.find((x) => x.id === a.tarefaId)
      if (!t) throw new Error('Tarefa não encontrada.')
      const periodo = txt(a.periodo, 12)
      if (!/^(\d{4}-\d{2}(-\d{2})?|\d{4}-S\d{2}|u)$/.test(periodo)) throw new Error('Período inválido.')
      const membro = d.membros.find((m) => m.id === a.membroId)
      if (!membro) throw new Error('Escolha quem fez.')
      d.feitos[t.id] = { ...(d.feitos[t.id] || {}), [periodo]: { membro: membro.id, em: Date.now(), pontos: t.pontos } }
      return d
    },
    desfazer(d, a) {
      const per = d.feitos[a.tarefaId]
      if (per) {
        delete per[txt(a.periodo, 12)]
        if (!Object.keys(per).length) delete d.feitos[a.tarefaId]
      }
      return d
    },
    // a casa é de todos: qualquer pessoa com o link edita membros e tarefas
    editar(d, a) {
      return LIMPAR.tarefas({ nome: a.nome ?? d.nome, membros: a.membros ?? d.membros, tarefas: a.tarefas ?? d.tarefas }, d)
    },
  },
}

// O que cada pessoa vê. Admin vê tudo (menos quem reservou no modo surpresa).
function visao(tipo, d, eu, admin) {
  if (tipo === 'votacao') {
    const votos = Object.entries(d.votos)
    const contagem = Object.fromEntries(d.opcoes.map((o) => [o.id, 0]))
    for (const [, v] of votos) for (const e of v.escolhas) contagem[e] = (contagem[e] || 0) + 1
    const { votos: _v, ...resto } = d
    return {
      ...resto,
      total: votos.length,
      contagem,
      meuVoto: eu && d.votos[eu] ? d.votos[eu] : null,
      votantes: d.anonima ? [] : votos.map(([, v]) => ({ nome: v.nome || 'Sem nome', escolhas: v.escolhas, em: v.em })).sort((a, b) => b.em - a.em).slice(0, 300),
    }
  }
  if (tipo === 'presentes') {
    const { reservas, ...resto } = d
    return {
      ...resto,
      itens: d.itens.map((i) => {
        const r = reservas[i.id] || []
        const minha = eu ? r.find((x) => x.participante === eu) : null
        return {
          ...i,
          reservados: r.reduce((s, x) => s + x.qtd, 0),
          minha: minha ? { qtd: minha.qtd, nome: minha.nome } : null,
          quem: admin && !d.surpresa ? r.map((x) => `${x.nome}${x.qtd > 1 ? ` (${x.qtd})` : ''}`) : [],
        }
      }),
    }
  }
  return d
}

async function carregar(env, id) {
  const { results } = await env.DB.prepare('SELECT * FROM gp_salas WHERE id = ?').bind(id).all()
  const s = results?.[0]
  if (!s || s.atualizado_em < Date.now() - DIAS_VIDA * 86400000) return null
  return { ...s, dados: JSON.parse(s.dados) }
}

// Lê, aplica e grava só se ninguém gravou no meio (versão); tenta de novo se houve concorrência.
async function alterar(env, id, fn) {
  for (let t = 0; t < 5; t++) {
    const s = await carregar(env, id)
    if (!s) throw Object.assign(new Error('Este link não existe mais.'), { status: 404 })
    const novo = fn(structuredClone(s.dados), s)
    const texto = JSON.stringify(novo)
    if (texto.length > MAX_JSON) throw new Error('Ficou grande demais.')
    const r = await env.DB.prepare('UPDATE gp_salas SET dados = ?, versao = versao + 1, atualizado_em = ? WHERE id = ? AND versao = ?')
      .bind(texto, Date.now(), id, s.versao).run()
    if (r.meta?.changes) return { ...s, dados: novo, versao: s.versao + 1 }
  }
  throw new Error('Muita gente mexendo ao mesmo tempo. Tente de novo.')
}

export async function rotasGrupos(request, env) {
  const u = new URL(request.url)
  const p = u.pathname
  if (p !== '/gp' && !p.startsWith('/gp/')) return null
  const m = request.method
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    if (p === '/gp/novo' && m === 'POST') {
      const b = await request.json().catch(() => ({}))
      if (!TIPOS.includes(b.tipo)) return erro(400, 'Tipo inválido.')
      const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') || '0.0.0.0', env.SESSAO_SECRET || 'sal')
      const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM gp_salas WHERE ip_hash = ? AND criado_em > ?').bind(ipHash, Date.now() - 3600_000).all()).results?.[0]?.n ?? 0
      if (n >= 20) return erro(429, 'Você criou muitas listas na última hora. Espere um pouco.')
      const dados = LIMPAR[b.tipo](b.dados || {})
      if (b.tipo === 'votacao' && (!dados.pergunta || dados.opcoes.length < 2)) return erro(400, 'Escreva a pergunta e pelo menos duas opções.')
      if (b.tipo === 'presentes' && !dados.titulo) return erro(400, 'Dê um nome à lista.')
      if (b.tipo === 'tarefas' && !dados.nome) return erro(400, 'Dê um nome à casa ou ao grupo.')
      const texto = JSON.stringify(dados)
      if (texto.length > MAX_JSON) return erro(400, 'Ficou grande demais.')
      const id = aleatorio(10)
      const chave = aleatorio(24)
      const agora = Date.now()
      await env.DB.prepare('INSERT INTO gp_salas (id, tipo, dados, chave, versao, ip_hash, criado_em, atualizado_em) VALUES (?,?,?,?,0,?,?,?)')
        .bind(id, b.tipo, texto, chave, ipHash, agora, agora).run()
      return json({ id, chave })
    }

    let mt = p.match(/^\/gp\/([a-z0-9]{10})(\/acao)?$/)
    if (!mt) return erro(404, 'Rota não encontrada.')
    const id = mt[1]

    if (mt[2] && m === 'POST') {
      const a = await request.json().catch(() => ({}))
      const s0 = await carregar(env, id)
      if (!s0) return erro(404, 'Este link não existe mais.')
      const fn = ACOES[s0.tipo]?.[a.acao]
      if (!fn) return erro(400, 'Ação inválida.')
      const s = await alterar(env, id, (d) => fn(d, a))
      return json({ ok: true, tipo: s.tipo, dados: visao(s.tipo, s.dados, a.participante, false), versao: s.versao })
    }

    const s = await carregar(env, id)
    if (!s) return erro(404, 'Este link não existe mais (ou passou um ano sem uso).')
    const admin = iguais(request.headers.get('X-Chave') || '', s.chave)

    if (m === 'GET') return json({ tipo: s.tipo, dados: visao(s.tipo, s.dados, u.searchParams.get('eu') || '', admin), versao: s.versao, admin })

    if (!admin) return erro(403, 'Só quem criou pode fazer isso.')
    if (m === 'PUT') {
      const b = await request.json().catch(() => ({}))
      const n = await alterar(env, id, (d) => LIMPAR[s.tipo]({ ...d, ...(b.dados || {}) }, d))
      return json({ ok: true, tipo: n.tipo, dados: visao(n.tipo, n.dados, u.searchParams.get('eu') || '', true), versao: n.versao, admin: true })
    }
    if (m === 'DELETE') {
      await env.DB.prepare('DELETE FROM gp_salas WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }
    return erro(405, 'Método não permitido.')
  } catch (e) {
    if (e.status) return erro(e.status, e.message)
    if (e instanceof Error && !/D1|SQL|TypeError|ReferenceError/i.test(e.message + e.name)) return erro(400, e.message)
    console.log(JSON.stringify({ nivel: 'erro', rota: p, msg: String((e && e.stack) || e) }))
    return erro(500, 'Erro interno.')
  }
}
