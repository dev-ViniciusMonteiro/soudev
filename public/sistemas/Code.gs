// Sistemas de gestão (vinicius.dev/sistemas): servidor no Google Apps Script + planilha.
// ARQUIVO GERADO por "npm run build:sistemas-script" a partir de lib/sistemas. Não edite o Code.gs direto.
//
// Como instalar:
//  1. Crie uma planilha nova no Google Planilhas. Menu Extensões > Apps Script.
//  2. Apague o conteúdo do Code.gs, cole este arquivo inteiro e salve.
//  3. Escolha a função "configurar" no topo e clique em Executar. Autorize o acesso (planilha e e-mail).
//  4. Implantar > Nova implantação > Tipo "App da Web". Executar como: Eu. Quem pode acessar: Qualquer pessoa.
//  5. Copie o link que termina em /exec e cole em Configurações > Planilha, no sistema.
//
// Cada tabela vira uma aba; colunas novas aparecem sozinhas quando o sistema manda um campo novo.
// Quem pode entrar: o dono da planilha (a conta que rodou "configurar") e os e-mails da aba "usuarios".

/* ---------- Gerado a partir de lib/sistemas/schema.js ---------- */
const COLUNAS = {"clientes":["nome","telefone","email","documento","nascimento","endereco","bairro","objetivo","restricoes","limite_fiado","empresa","obs"],"categorias":["nome","ordem"],"produtos":["nome","tipo","categoria_id","preco","custo","codigo_barras","ncm","cfop","unidade","controla_estoque","estoque_minimo","duracao_min","comissao_pct","descricao","foto_url","visual","adicionais","publicado","ativo"],"estoque_mov":["produto_id","qtd","motivo","custo_unit","fornecedor_id","ref_id","obs"],"fornecedores":["nome","cnpj","contato","telefone","email","obs"],"vendas":["numero","codigo_publico","cliente_id","cliente_nome","itens","subtotal","desconto","taxa_entrega","acrescimo","total","pagamentos","fiscal","troco","status","etapa","origem","entrega","endereco","telefone","pagamento_previsto","mesa","caixa_id","profissional_id","ref_id","concluida_em","operador","obs"],"caixas":["aberto_em","fechado_em","valor_inicial","valor_contado","valor_esperado","resumo","status","operador"],"caixa_mov":["caixa_id","tipo","valor","motivo"],"lancamentos":["tipo","descricao","valor","vencimento","pago_em","categoria","cliente_id","fornecedor_id","forma","ref_id","obs"],"profissionais":["nome","telefone","funcao","comissao_pct","cor","publicado","ativo"],"agendamentos":["inicio","fim","profissional_id","servico_id","cliente_id","cliente_nome","telefone","pet_id","valor","status","origem","venda_id","obs"],"ordens":["numero","codigo_publico","cliente_id","equipamento","marca_modelo","serie","acessorios","defeito","laudo","checklist","itens","total","status","previsao","tecnico","garantia_dias","venda_id"],"planos":["nome","valor","meses","aulas_semana","descricao","ativo"],"matriculas":["cliente_id","plano_id","inicio","dia_vencimento","desconto","status","obs"],"presencas":["cliente_id"],"pets":["nome","cliente_id","especie","raca","porte","nascimento","peso","alergias","obs"],"vacinas":["pet_id","vacina","aplicada_em","proxima_em","obs"],"leads":["nome","empresa","telefone","email","interesse","valor","etapa","origem","responsavel","proximo_contato","motivo_perda","cliente_id","obs"],"atividades":["lead_id","tipo","descricao","data","feita"],"usuarios":["email","nome","papel","ativo"],"config":["valor"]}
const CONFIG_PUBLICA = ["empresa_nome","empresa_telefone","whatsapp","endereco","cidade","pix_chave","pix_nome","abre","fecha","dias","intervalo_agenda","loja_aberta","taxa_entrega","pedido_minimo","tempo_entrega"]

/* ---------- Gerado a partir de lib/sistemas/regras.js ---------- */
const pad = (n) => String(n).padStart(2, '0')

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

function parseValor(texto) {
  if (typeof texto === 'number') return texto
  let s = String(texto ?? '').replace(/[^\d,.-]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function lerAdicionais(texto) {
  return String(texto ?? '')
    .split(/[;\n]/)
    .map((parte) => {
      const i = parte.lastIndexOf(':')
      if (i < 0) return null
      const nome = parte.slice(0, i).trim()
      const preco = parseValor(parte.slice(i + 1))
      return nome ? { nome, preco } : null
    })
    .filter(Boolean)
}

function precificar(carrinho, produtos) {
  const porId = new Map(produtos.map((p) => [p.id, p]))
  const itens = []
  for (const linha of carrinho) {
    const p = porId.get(linha.produto_id)
    if (!p || p.excluido || p.ativo === false || p.publicado === false) throw new Error('Um item do pedido não está mais disponível. Atualize o cardápio.')
    const qtd = Math.max(1, Math.min(99, Math.round(Number(linha.qtd) || 1)))
    const possiveis = lerAdicionais(p.adicionais)
    const adicionais = (linha.adicionais || []).map((nome) => possiveis.find((a) => a.nome === nome)).filter(Boolean)
    const unit = round2(Number(p.preco) + adicionais.reduce((s, a) => s + a.preco, 0))
    itens.push({
      produto_id: p.id,
      nome: p.nome + (adicionais.length ? ` (+ ${adicionais.map((a) => a.nome).join(', ')})` : ''),
      qtd,
      preco: unit,
      obs: String(linha.obs ?? '').slice(0, 140),
    })
  }
  return itens
}

const totalItens = (itens) => round2((itens || []).reduce((s, i) => s + Number(i.preco) * Number(i.qtd), 0))

const minutos = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

const hojeISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function horariosLivres({ data, duracao, profissionalId, agendamentos, config, agora = new Date() }) {
  const dia = new Date(`${data}T12:00`).getDay()
  const dias = String(config.dias ?? '1,2,3,4,5,6').split(',').map((d) => Number(d.trim()))
  if (!dias.includes(dia)) return []
  const abre = minutos(config.abre || '09:00')
  const fecha = minutos(config.fecha || '19:00')
  const passo = Math.max(10, Number(config.intervalo_agenda) || 30)
  const dur = Math.max(10, Number(duracao) || passo)
  const ocupados = agendamentos
    .filter((a) => !a.excluido && a.profissional_id === profissionalId && !['cancelado', 'faltou'].includes(a.status) && String(a.inicio).startsWith(data))
    .map((a) => [minutos(String(a.inicio).slice(11, 16)), minutos(String(a.fim || a.inicio).slice(11, 16))])
  const livres = []
  const hoje = hojeISO(agora) === data
  const agoraMin = agora.getHours() * 60 + agora.getMinutes()
  for (let t = abre; t + dur <= fecha; t += passo) {
    if (hoje && t <= agoraMin + 15) continue
    if (ocupados.some(([i, f]) => t < f && t + dur > i)) continue
    livres.push(hhmm(t))
  }
  return livres
}

/* ---------- Servidor ---------- */

const BASE = ['id', 'criado_em', 'atualizado_em', '_rev', 'excluido']
const NUMERADAS = ['vendas', 'ordens']
const SO_GESTOR = ['usuarios', 'config']
const MAX_CORPO = 600000
const MAX_LOTE = 300
const MAX_DESCIDA = 1500
const TOKEN_DIAS = 30
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/
const CAMPO_RE = /^[a-z_][a-z0-9_]{0,40}$/

class ErroApi extends Error {
  constructor(codigo, mensagem) {
    super(mensagem)
    this.codigo = codigo
  }
}

const props = () => PropertiesService.getScriptProperties()
const cache = () => CacheService.getScriptCache()
const planilha = () => SpreadsheetApp.getActiveSpreadsheet()
const agora = () => Date.now()

function segredo() {
  const s = props().getProperty('SEGREDO')
  if (!s) throw new ErroApi('config', 'Servidor não configurado: rode a função configurar() no editor do Apps Script.')
  return s
}

const b64 = (s) => Utilities.base64EncodeWebSafe(s).replace(/=+$/, '')
function unb64(s) {
  const p = s + '='.repeat((4 - (s.length % 4)) % 4)
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(p)).getDataAsString()
}
const hmac = (s) => b64(Utilities.computeHmacSha256Signature(s, segredo()))

function iguais(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/** Limite simples por chave, contado no cache do script. */
function limite(chave, max, segundos) {
  const c = cache()
  chave = `lim:${chave}`
  const n = Number(c.get(chave) || 0) + 1
  c.put(chave, String(n), segundos)
  if (n > max) throw new ErroApi('limite', 'Muitas tentativas seguidas. Aguarde alguns minutos.')
}

function comTrava(fn) {
  const trava = LockService.getScriptLock()
  trava.waitLock(25000)
  try {
    return fn()
  } finally {
    trava.releaseLock()
  }
}

/* ---------- Abas ---------- */

function aba(nome) {
  const ss = planilha()
  let s = ss.getSheetByName(nome)
  if (!s) {
    s = ss.insertSheet(nome)
    const cab = BASE.concat((COLUNAS[nome] || []).filter((c) => BASE.indexOf(c) < 0))
    if (s.getMaxColumns() < cab.length) s.insertColumnsAfter(s.getMaxColumns(), cab.length - s.getMaxColumns())
    s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).setNumberFormat('@')
    s.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold')
    s.setFrozenRows(1)
  }
  return s
}

/** Lê a aba inteira: cabeçalho, linhas (texto) e índice id -> posição. */
function ler(nome) {
  const s = aba(nome)
  const valores = s.getDataRange().getValues()
  const cab = (valores.shift() || []).map(String)
  const linhas = valores.map((l) => l.map((v) => (v instanceof Date ? v.toISOString() : String(v))))
  const indice = {}
  const col = cab.indexOf('id')
  linhas.forEach((l, i) => {
    if (l[col]) indice[l[col]] = i
  })
  return { s, cab, linhas, indice }
}

function paraTexto(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function objeto(cab, linha) {
  const o = {}
  cab.forEach((c, i) => {
    if (c && linha[i] !== '' && linha[i] !== undefined) o[c] = linha[i]
  })
  return o
}

function proximoNumero(nome, t) {
  const chave = `NUM_${nome}`
  let n = Number(props().getProperty(chave) || 0)
  if (!n) {
    const col = t.cab.indexOf('numero')
    if (col >= 0) t.linhas.forEach((l) => (n = Math.max(n, Number(l[col]) || 0)))
  }
  n++
  props().setProperty(chave, String(n))
  return n
}

function codigoCurto() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid())
  let s = ''
  for (let i = 0; i < 6; i++) s += letras[(bytes[i] + 256) % letras.length]
  return s
}

/**
 * Grava registros numa aba (precisa estar dentro de comTrava). Vale a versão com "atualizado_em" maior.
 * Devolve o que foi gravado, com o estado anterior, para os avisos por e-mail.
 */
function gravar(nome, registros, rev) {
  const t = ler(nome)
  // Colunas novas entram no fim do cabeçalho.
  const novas = []
  for (const r of registros) {
    for (const k of Object.keys(r)) if (CAMPO_RE.test(k) && t.cab.indexOf(k) < 0 && novas.indexOf(k) < 0) novas.push(k)
  }
  if (novas.length) {
    const max = t.s.getMaxColumns()
    const precisa = t.cab.length + novas.length
    if (precisa > max) t.s.insertColumnsAfter(max, precisa - max)
    t.s.getRange(1, t.cab.length + 1, t.s.getMaxRows(), novas.length).setNumberFormat('@')
    t.s.getRange(1, t.cab.length + 1, 1, novas.length).setValues([novas]).setFontWeight('bold')
    t.cab = t.cab.concat(novas)
    t.linhas.forEach((l) => {
      while (l.length < t.cab.length) l.push('')
    })
  }
  const col = {}
  t.cab.forEach((c, i) => (col[c] = i))
  const alteradas = {}
  const inicioNovas = t.linhas.length
  const feitos = []
  for (const r of registros) {
    const pos = t.indice[r.id]
    const antes = pos === undefined ? null : objeto(t.cab, t.linhas[pos])
    if (antes && Number(antes.atualizado_em || 0) > Number(r.atualizado_em || 0)) {
      feitos.push({ registro: antes, anterior: antes, recusado: true })
      continue
    }
    const linha = antes ? t.linhas[pos].slice() : t.cab.map(() => '')
    for (const k of Object.keys(r)) {
      if (col[k] === undefined || k === '_rev') continue
      // Número e código são do servidor: não deixa uma versão antiga apagar.
      if ((k === 'numero' || k === 'codigo_publico') && antes && antes[k] && !r[k]) continue
      linha[col[k]] = paraTexto(r[k])
    }
    let mexeu = false
    if (NUMERADAS.indexOf(nome) >= 0) {
      if (col.numero !== undefined && !linha[col.numero]) {
        linha[col.numero] = String(proximoNumero(nome, t))
        mexeu = true
      }
      if (col.codigo_publico !== undefined && !linha[col.codigo_publico]) {
        linha[col.codigo_publico] = codigoCurto()
        mexeu = true
      }
    }
    linha[col._rev] = String(rev)
    if (!linha[col.criado_em]) linha[col.criado_em] = new Date().toISOString()
    if (!linha[col.atualizado_em]) linha[col.atualizado_em] = String(agora())
    if (pos === undefined) {
      t.indice[r.id] = t.linhas.length
      t.linhas.push(linha)
    } else {
      t.linhas[pos] = linha
      if (pos < inicioNovas) alteradas[pos] = true
    }
    feitos.push({ registro: objeto(t.cab, linha), anterior: antes, servidorMexeu: mexeu })
  }
  const largura = t.cab.length
  const posicoes = Object.keys(alteradas).map(Number)
  if (posicoes.length > 25) {
    t.s.getRange(2, 1, inicioNovas, largura).setNumberFormat('@').setValues(t.linhas.slice(0, inicioNovas))
  } else {
    for (const p of posicoes) t.s.getRange(p + 2, 1, 1, largura).setNumberFormat('@').setValues([t.linhas[p]])
  }
  const acrescentar = t.linhas.slice(inicioNovas)
  if (acrescentar.length) {
    const inicio = inicioNovas + 2
    const faltam = inicio + acrescentar.length - 1 - t.s.getMaxRows()
    if (faltam > 0) t.s.insertRowsAfter(t.s.getMaxRows(), faltam)
    t.s.getRange(inicio, 1, acrescentar.length, largura).setNumberFormat('@').setValues(acrescentar)
  }
  props().setProperty(`REV_${nome}`, String(rev))
  if (['config', 'produtos', 'categorias', 'profissionais'].indexOf(nome) >= 0) cache().remove('loja')
  return feitos
}

function novaRev() {
  const rev = Number(props().getProperty('REV') || 0) + 1
  props().setProperty('REV', String(rev))
  return rev
}

/* ---------- Usuários e sessão ---------- */

function papelDe(email) {
  email = String(email || '').toLowerCase()
  if (!email) return null
  if (email === String(props().getProperty('DONO') || '').toLowerCase()) return 'dono'
  const c = cache().get(`papel:${email}`)
  if (c) return c === '-' ? null : c
  const t = ler('usuarios')
  const ce = t.cab.indexOf('email')
  let papel = null
  for (const l of t.linhas) {
    const o = objeto(t.cab, l)
    if (String(l[ce]).toLowerCase() === email && o.excluido !== '1' && o.ativo !== '0' && o.ativo !== 'false') papel = o.papel || 'operador'
  }
  cache().put(`papel:${email}`, papel || '-', 300)
  return papel
}

function token(email) {
  const versao = props().getProperty('VERSAO_SESSAO') || '1'
  const corpo = b64(`${email}|${agora() + TOKEN_DIAS * 86400000}|${versao}`)
  return `${corpo}.${hmac(corpo)}`
}

function sessao(corpo) {
  const auth = String(corpo.authorization || '')
  if (auth.indexOf('Bearer ') !== 0) throw new ErroApi('sessao', 'Entre de novo com seu e-mail.')
  const [dados, assinatura] = auth.slice(7).split('.')
  if (!dados || !assinatura || !iguais(assinatura, hmac(dados))) throw new ErroApi('sessao', 'Sessão inválida. Entre de novo.')
  const [email, exp, versao] = unb64(dados).split('|')
  if (!(Number(exp) > agora())) throw new ErroApi('sessao', 'Sessão expirada. Entre de novo.')
  if (versao !== (props().getProperty('VERSAO_SESSAO') || '1')) throw new ErroApi('sessao', 'Sessão encerrada. Entre de novo.')
  const papel = papelDe(email)
  if (!papel) throw new ErroApi('sessao', 'Seu acesso a esta planilha foi removido.')
  const renovar = Number(exp) - agora() < 7 * 86400000
  return { email, papel, novoToken: renovar ? token(email) : undefined }
}

function pedirCodigo(corpo) {
  const email = String(corpo.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) throw new ErroApi('invalido', 'E-mail inválido.')
  limite(`cod:${email}`, 4, 900)
  limite('cod', 40, 600)
  if (!papelDe(email)) throw new ErroApi('acesso', 'Este e-mail não tem acesso a esta planilha. O dono precisa cadastrar você em Usuários.')
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid())
  const codigo = String(((bytes[0] & 0xff) * 65536 + (bytes[1] & 0xff) * 256 + (bytes[2] & 0xff)) % 1000000).padStart(6, '0')
  cache().put(`login:${email}`, JSON.stringify({ h: hmac(codigo), n: 0 }), 600)
  const nome = configuracao().empresa_nome || 'Sistema de gestão'
  MailApp.sendEmail({
    to: email,
    subject: `${codigo} é seu código de acesso - ${nome}`,
    htmlBody: `<p>Seu código para entrar no sistema <b>${esc(nome)}</b>:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${codigo}</p><p>Vale por 10 minutos. Se não foi você, ignore este e-mail.</p>`,
    name: nome,
  })
  return { ok: true }
}

function entrar(corpo) {
  const email = String(corpo.email || '').trim().toLowerCase()
  const codigo = String(corpo.codigo || '').replace(/\D/g, '')
  const salvo = cache().get(`login:${email}`)
  if (!salvo) throw new ErroApi('login', 'Código expirado. Peça outro.')
  const s = JSON.parse(salvo)
  if (s.n >= 5) {
    cache().remove(`login:${email}`)
    throw new ErroApi('login', 'Muitas tentativas erradas. Peça outro código.')
  }
  if (!iguais(hmac(codigo), s.h)) {
    s.n++
    cache().put(`login:${email}`, JSON.stringify(s), 600)
    throw new ErroApi('login', 'Código incorreto.')
  }
  cache().remove(`login:${email}`)
  const papel = papelDe(email)
  if (!papel) throw new ErroApi('acesso', 'Sem acesso a esta planilha.')
  return { ok: true, email, papel, token: token(email), empresa: configuracao().empresa_nome || '' }
}

/* ---------- Sincronização ---------- */

function sincronizar(corpo) {
  const quem = sessao(corpo)
  const mudancas = Array.isArray(corpo.mudancas) ? corpo.mudancas : []
  if (mudancas.length > MAX_LOTE) throw new ErroApi('invalido', 'Lote grande demais.')
  limite(`sync:${quem.email}`, 40, 60)
  const porTabela = {}
  for (const m of mudancas) {
    const nome = String(m && m.tabela)
    const r = m && m.registro
    if (!COLUNAS[nome] || !r || !ID_RE.test(String(r.id || ''))) continue
    if (SO_GESTOR.indexOf(nome) >= 0 && quem.papel === 'operador') continue
    if (nome === 'usuarios' && r.papel === 'dono' && quem.papel !== 'dono') r.papel = 'gerente'
    ;(porTabela[nome] = porTabela[nome] || []).push(r)
  }
  const ecoar = []
  const avisos = []
  if (Object.keys(porTabela).length) {
    comTrava(() => {
      const rev = novaRev()
      for (const nome of Object.keys(porTabela)) {
        for (const f of gravar(nome, porTabela[nome], rev)) {
          if (f.recusado || f.servidorMexeu) ecoar.push({ tabela: nome, registro: f.registro })
          if (nome === 'vendas' && f.registro.status === 'concluida' && (!f.anterior || f.anterior.status !== 'concluida')) avisos.push(f.registro)
          if (nome === 'usuarios') cache().remove(`papel:${String(f.registro.email || '').toLowerCase()}`)
        }
      }
    })
  }
  for (const v of avisos) avisarVenda(v, 'venda')
  const enviados = {}
  for (const m of mudancas) if (m && m.registro) enviados[`${m.tabela}:${m.registro.id}`] = true
  const descida = baixar(Number(corpo.desde) || 0, enviados)
  return { ok: true, mudancas: ecoar.concat(descida.mudancas), cursor: descida.cursor, mais: descida.mais, papel: quem.papel, token: quem.novoToken }
}

/** O que mudou depois do cursor "desde", em ordem de revisão. */
function baixar(desde, enviados) {
  const atual = Number(props().getProperty('REV') || 0)
  const lista = []
  for (const nome of Object.keys(COLUNAS)) {
    if (Number(props().getProperty(`REV_${nome}`) || 0) <= desde) continue
    const t = ler(nome)
    const cr = t.cab.indexOf('_rev')
    for (const l of t.linhas) {
      const rev = Number(l[cr]) || 0
      if (rev > desde) lista.push({ rev, tabela: nome, registro: objeto(t.cab, l) })
    }
  }
  lista.sort((a, b) => a.rev - b.rev)
  let fim = lista.length
  let mais = false
  if (lista.length > MAX_DESCIDA) {
    fim = MAX_DESCIDA
    while (fim < lista.length && lista[fim].rev === lista[fim - 1].rev) fim++
    mais = fim < lista.length
  }
  const parte = lista.slice(0, fim)
  const cursor = mais ? parte[parte.length - 1].rev : Math.max(atual, desde)
  return {
    mudancas: parte.filter((x) => !enviados[`${x.tabela}:${x.registro.id}`]).map((x) => ({ tabela: x.tabela, registro: x.registro })),
    cursor,
    mais,
  }
}

/* ---------- E-mails ---------- */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const reais = (n) => `R$ ${(Number(n) || 0).toFixed(2).replace('.', ',')}`

function configuracao() {
  const t = ler('config')
  const o = {}
  const ci = t.cab.indexOf('id')
  const cv = t.cab.indexOf('valor')
  const cx = t.cab.indexOf('excluido')
  for (const l of t.linhas) if (l[cx] !== '1') o[l[ci]] = l[cv]
  return o
}

function destinatarios(cfg) {
  const lista = String(cfg.emails_notificacao || '').split(/[,;\s]+/).filter((e) => EMAIL_RE.test(e))
  return lista.length ? lista : [props().getProperty('DONO')].filter(Boolean)
}

function tabelaItens(v) {
  let itens = []
  try {
    itens = JSON.parse(v.itens || '[]')
  } catch (e) {}
  let pag = []
  try {
    pag = JSON.parse(v.pagamentos || '[]')
  } catch (e) {}
  const linhas = itens.map((i) => `<tr><td>${esc(i.qtd)}x ${esc(i.nome)}${i.obs ? `<br><small>${esc(i.obs)}</small>` : ''}</td><td align="right">${reais(i.preco * i.qtd)}</td></tr>`).join('')
  return `<table cellpadding="6" style="border-collapse:collapse;min-width:320px">${linhas}
    ${Number(v.desconto) ? `<tr><td>Desconto</td><td align="right">- ${reais(v.desconto)}</td></tr>` : ''}
    ${Number(v.acrescimo) ? `<tr><td>Taxa de serviço</td><td align="right">${reais(v.acrescimo)}</td></tr>` : ''}
    ${Number(v.taxa_entrega) ? `<tr><td>Entrega</td><td align="right">${reais(v.taxa_entrega)}</td></tr>` : ''}
    <tr style="border-top:2px solid #333"><td><b>Total</b></td><td align="right"><b>${reais(v.total)}</b></td></tr>
    ${pag.map((p) => `<tr><td><small>${esc(p.forma)}</small></td><td align="right"><small>${reais(p.valor)}</small></td></tr>`).join('')}
  </table>`
}

function enviar(para, assunto, html, nome) {
  if (MailApp.getRemainingDailyQuota() < 2) return
  try {
    MailApp.sendEmail({ to: para, subject: assunto, htmlBody: html, name: nome })
  } catch (e) {
    console.warn('E-mail não enviado: ' + e)
  }
}

function avisarVenda(v, tipo) {
  const cfg = configuracao()
  const nome = cfg.empresa_nome || 'Sistema de gestão'
  const titulo = tipo === 'pedido' ? `Novo pedido #${v.numero} - ${reais(v.total)}` : `Venda #${v.numero} - ${reais(v.total)}`
  const corpo = `<h2 style="margin:0 0 8px">${esc(titulo)}</h2>
    <p>${esc(v.cliente_nome || 'Cliente não identificado')}${v.telefone ? ` · ${esc(v.telefone)}` : ''}</p>
    ${v.endereco ? `<p>Entrega: ${esc(v.endereco)}</p>` : ''}
    ${v.pagamento_previsto ? `<p>Pagamento: ${esc(v.pagamento_previsto)}</p>` : ''}
    ${v.obs ? `<p>Obs.: ${esc(v.obs)}</p>` : ''}
    ${tabelaItens(v)}`
  enviar(destinatarios(cfg).join(','), titulo, corpo, nome)
  if (tipo === 'venda' && (cfg.email_cliente === '1' || cfg.email_cliente === 'true') && v.cliente_id) {
    const c = ler('clientes')
    const pos = c.indice[v.cliente_id]
    const email = pos === undefined ? '' : objeto(c.cab, c.linhas[pos]).email
    if (email && EMAIL_RE.test(email)) enviar(email, `Seu comprovante - ${nome}`, `<p>Obrigado pela preferência!</p>${tabelaItens(v)}<p><small>Documento sem valor fiscal.</small></p>`, nome)
  }
}

/** Opcional: crie um acionador diário (Acionadores > Adicionar > resumoDoDia, por tempo, todo dia às 22h). */
function resumoDoDia() {
  const cfg = configuracao()
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
  const t = ler('vendas')
  let total = 0
  let qtd = 0
  for (const l of t.linhas) {
    const v = objeto(t.cab, l)
    if (v.excluido === '1' || v.status !== 'concluida') continue
    const quando = Utilities.formatDate(new Date(v.concluida_em || v.criado_em), Session.getScriptTimeZone(), 'yyyy-MM-dd')
    if (quando === hoje) {
      total += Number(v.total) || 0
      qtd++
    }
  }
  enviar(destinatarios(cfg).join(','), `Resumo de hoje: ${qtd} vendas, ${reais(total)}`, `<p>${qtd} vendas concluídas hoje, total de <b>${reais(total)}</b>.</p>`, cfg.empresa_nome || 'Sistema de gestão')
}

/* ---------- Rotas públicas (cardápio, agendamento, acompanhamento) ---------- */

function registrosAtivos(nome) {
  const t = ler(nome)
  return t.linhas.map((l) => objeto(t.cab, l)).filter((o) => o.excluido !== '1')
}

const num = (v) => Number(String(v == null ? '' : v).replace(',', '.')) || 0
const sim = (v, padrao) => (v === undefined || v === '' ? padrao : v === '1' || v === 'true')

function lojaPublica() {
  const salvo = cache().get('loja')
  if (salvo) return JSON.parse(salvo)
  const cfg = configuracao()
  const config = {}
  for (const k of CONFIG_PUBLICA) if (cfg[k] !== undefined) config[k] = cfg[k]
  const loja = {
    config,
    produtos: registrosAtivos('produtos')
      .filter((p) => sim(p.ativo, true) && sim(p.publicado, true))
      .map((p) => ({ id: p.id, nome: p.nome, tipo: p.tipo, categoria_id: p.categoria_id, preco: num(p.preco), descricao: p.descricao || '', foto_url: p.foto_url || '', adicionais: p.adicionais || '', duracao_min: num(p.duracao_min) })),
    categorias: registrosAtivos('categorias').map((c) => ({ id: c.id, nome: c.nome, ordem: num(c.ordem) })).sort((a, b) => a.ordem - b.ordem),
    profissionais: registrosAtivos('profissionais').filter((p) => sim(p.ativo, true) && sim(p.publicado, true)).map((p) => ({ id: p.id, nome: p.nome, funcao: p.funcao || '' })),
  }
  const texto = JSON.stringify(loja)
  if (texto.length < 90000) cache().put('loja', texto, 120)
  return loja
}

function contato(c) {
  const nome = String((c && c.nome) || '').trim().slice(0, 80)
  const telefone = String((c && c.telefone) || '').trim().slice(0, 20)
  if (!nome) throw new ErroApi('invalido', 'Informe seu nome.')
  if (telefone.replace(/\D/g, '').length < 10) throw new ErroApi('invalido', 'Informe um telefone com DDD.')
  const email = String((c && c.email) || '').trim().slice(0, 120)
  return {
    nome,
    telefone,
    email: EMAIL_RE.test(email) ? email : '',
    endereco: String((c && c.endereco) || '').trim().slice(0, 160),
    bairro: String((c && c.bairro) || '').trim().slice(0, 60),
  }
}

/** Acha o cliente pelo telefone ou cria um novo (dentro da trava). */
function clientePorTelefone(dados, rev) {
  const t = ler('clientes')
  const ct = t.cab.indexOf('telefone')
  const cx = t.cab.indexOf('excluido')
  const tel = dados.telefone.replace(/\D/g, '')
  const linha = t.linhas.find((l) => l[cx] !== '1' && String(l[ct]).replace(/\D/g, '') === tel)
  if (linha) return objeto(t.cab, linha)
  const novo = { id: Utilities.getUuid(), nome: dados.nome, telefone: dados.telefone, email: dados.email, endereco: dados.endereco, bairro: dados.bairro, obs: 'Cadastrado pelo site', atualizado_em: agora(), excluido: false }
  gravar('clientes', [novo], rev)
  return novo
}

function produtosParaPreco() {
  return registrosAtivos('produtos').map((p) => ({ id: p.id, nome: p.nome, preco: num(p.preco), adicionais: p.adicionais || '', ativo: sim(p.ativo, true), publicado: sim(p.publicado, true), duracao_min: num(p.duracao_min) }))
}

function publicoPedido(corpo) {
  const p = corpo.pedido || {}
  const c = contato(p.cliente)
  limite(`ped:${c.telefone.replace(/\D/g, '')}`, 6, 900)
  limite('ped', 60, 60)
  const cfg = configuracao()
  if (!sim(cfg.loja_aberta, true)) throw new ErroApi('fechado', 'A loja não está recebendo pedidos agora.')
  let itens
  try {
    itens = precificar((p.itens || []).slice(0, 60), produtosParaPreco())
  } catch (e) {
    throw new ErroApi('invalido', e.message)
  }
  if (!itens.length) throw new ErroApi('invalido', 'O carrinho está vazio.')
  const subtotal = totalItens(itens)
  if (num(cfg.pedido_minimo) && subtotal < num(cfg.pedido_minimo)) throw new ErroApi('invalido', `O pedido mínimo é de ${reais(cfg.pedido_minimo)}.`)
  const entrega = p.entrega === 'entrega' ? 'entrega' : 'retirada'
  if (entrega === 'entrega' && !c.endereco) throw new ErroApi('invalido', 'Informe o endereço de entrega.')
  const taxa = entrega === 'entrega' ? num(cfg.taxa_entrega) : 0
  const venda = comTrava(() => {
    const rev = novaRev()
    const cliente = clientePorTelefone(c, rev)
    const v = {
      id: Utilities.getUuid(),
      cliente_id: cliente.id,
      cliente_nome: c.nome,
      telefone: c.telefone,
      itens,
      subtotal,
      desconto: 0,
      taxa_entrega: taxa,
      total: round2(subtotal + taxa),
      pagamentos: [],
      status: 'aberta',
      etapa: 'novo',
      origem: 'cardapio',
      entrega,
      endereco: entrega === 'entrega' ? [c.endereco, c.bairro].filter(Boolean).join(' - ') : '',
      pagamento_previsto: String(p.pagamento || '').slice(0, 80),
      obs: String(p.obs || '').slice(0, 300),
      atualizado_em: agora(),
      excluido: false,
    }
    return gravar('vendas', [v], rev)[0].registro
  })
  avisarVenda(venda, 'pedido')
  return { ok: true, numero: Number(venda.numero), codigo: venda.codigo_publico, total: Number(venda.total) }
}

function ocupadosDoDia(data, profissionalId) {
  return registrosAtivos('agendamentos')
    .filter((a) => a.profissional_id === profissionalId && String(a.inicio).indexOf(data) === 0 && a.status !== 'cancelado' && a.status !== 'faltou')
    .map((a) => ({ inicio: a.inicio, fim: a.fim, status: a.status, profissional_id: a.profissional_id }))
}

function publicoOcupados(corpo) {
  const data = String(corpo.data || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroApi('invalido', 'Data inválida.')
  limite('ocup', 120, 60)
  return { ok: true, ocupados: ocupadosDoDia(data, String(corpo.profissional_id || '')) }
}

function publicoAgendar(corpo) {
  const a = corpo.agendamento || {}
  const c = contato(a.cliente)
  limite(`ag:${c.telefone.replace(/\D/g, '')}`, 5, 900)
  limite('ag', 40, 60)
  const inicio = String(a.inicio || '')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(inicio)) throw new ErroApi('invalido', 'Horário inválido.')
  const servico = produtosParaPreco().find((p) => p.id === a.servico_id && p.ativo && p.publicado)
  const prof = registrosAtivos('profissionais').find((p) => p.id === a.profissional_id && sim(p.ativo, true) && sim(p.publicado, true))
  if (!servico || !prof) throw new ErroApi('invalido', 'Serviço ou profissional indisponível.')
  const cfg = configuracao()
  const data = inicio.slice(0, 10)
  const hora = inicio.slice(11, 16)
  const registro = comTrava(() => {
    const livres = horariosLivres({ data, duracao: servico.duracao_min, profissionalId: prof.id, agendamentos: ocupadosDoDia(data, prof.id), config: cfg })
    if (livres.indexOf(hora) < 0) throw new ErroApi('ocupado', 'Esse horário acabou de ser ocupado. Escolha outro.')
    const rev = novaRev()
    const cliente = clientePorTelefone(c, rev)
    const ag = {
      id: Utilities.getUuid(),
      inicio,
      fim: `${data}T${hhmm(minutos(hora) + (servico.duracao_min || 30))}`,
      profissional_id: prof.id,
      servico_id: servico.id,
      cliente_id: cliente.id,
      cliente_nome: c.nome,
      telefone: c.telefone,
      valor: servico.preco,
      status: 'agendado',
      origem: 'online',
      obs: String(a.obs || '').slice(0, 300),
      atualizado_em: agora(),
      excluido: false,
    }
    return gravar('agendamentos', [ag], rev)[0].registro
  })
  const nome = cfg.empresa_nome || 'Sistema de gestão'
  const quando = `${data.split('-').reverse().join('/')} às ${hora}`
  enviar(destinatarios(cfg).join(','), `Novo agendamento: ${c.nome} - ${quando}`, `<p><b>${esc(c.nome)}</b> (${esc(c.telefone)}) agendou <b>${esc(servico.nome)}</b> com ${esc(prof.nome)} em ${quando}.</p>`, nome)
  if (c.email) enviar(c.email, `Agendamento confirmado - ${nome}`, `<p>Olá, ${esc(c.nome)}! Seu horário de <b>${esc(servico.nome)}</b> com ${esc(prof.nome)} está marcado para <b>${quando}</b>.</p>`, nome)
  return { ok: true, id: registro.id }
}

function publicoAcompanhar(corpo) {
  const codigo = String(corpo.codigo || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{6}$/.test(codigo)) throw new ErroApi('invalido', 'Código inválido.')
  limite('acomp', 120, 60)
  const etapas = { novo: 'Novo', preparo: 'Em preparo', pronto: 'Pronto', saiu: 'Saiu p/ entrega', entregue: 'Entregue' }
  const status = { aberta: 'Aberta', orcamento: 'Orçamento enviado', aprovada: 'Aprovada', execucao: 'Em execução', pronta: 'Pronta', entregue: 'Entregue', cancelada: 'Cancelada' }
  const v = registrosAtivos('vendas').find((x) => x.codigo_publico === codigo)
  if (v) {
    let itens = []
    try {
      itens = JSON.parse(v.itens || '[]').map((i) => ({ nome: i.nome, qtd: i.qtd }))
    } catch (e) {}
    return { ok: true, resultado: { tipo: 'pedido', numero: num(v.numero), status: v.status, etapa: v.etapa, etapaNome: etapas[v.etapa] || '', itens, total: num(v.total), entrega: v.entrega, criado_em: v.criado_em } }
  }
  const o = registrosAtivos('ordens').find((x) => x.codigo_publico === codigo)
  if (o) {
    const mostraLaudo = ['orcamento', 'aprovada', 'execucao', 'pronta', 'entregue'].indexOf(o.status) >= 0
    return {
      ok: true,
      resultado: { tipo: 'os', numero: num(o.numero), status: o.status, statusNome: status[o.status] || '', equipamento: [o.equipamento, o.marca_modelo].filter(Boolean).join(' '), previsao: o.previsao || '', total: num(o.total), laudo: mostraLaudo ? o.laudo || '' : '', criado_em: o.criado_em },
    }
  }
  throw new ErroApi('nao_encontrado', 'Código não encontrado.')
}

/* ---------- Entradas do Apps Script ---------- */

function tratar(texto) {
  try {
    if (texto.length > MAX_CORPO) throw new ErroApi('invalido', 'Pedido grande demais.')
    let corpo
    try {
      corpo = JSON.parse(texto)
    } catch (e) {
      throw new ErroApi('invalido', 'JSON inválido.')
    }
    switch (corpo && corpo.acao) {
      case 'codigo':
        return pedirCodigo(corpo)
      case 'entrar':
        return entrar(corpo)
      case 'sincronizar':
        return sincronizar(corpo)
      case 'publico_loja':
        limite('loja', 300, 60)
        return { ok: true, loja: lojaPublica() }
      case 'publico_ocupados':
        return publicoOcupados(corpo)
      case 'publico_pedido':
        return publicoPedido(corpo)
      case 'publico_agendar':
        return publicoAgendar(corpo)
      case 'publico_acompanhar':
        return publicoAcompanhar(corpo)
      default:
        throw new ErroApi('invalido', 'Ação desconhecida.')
    }
  } catch (e) {
    if (e instanceof ErroApi) return { ok: false, codigo: e.codigo, erro: e.message }
    console.error(e && e.stack ? e.stack : e)
    return { ok: false, codigo: 'interno', erro: 'Erro na planilha. Tente de novo em instantes.' }
  }
}

function doPost(e) {
  const resposta = tratar((e && e.postData && e.postData.contents) || '')
  return ContentService.createTextOutput(JSON.stringify(resposta)).setMimeType(ContentService.MimeType.JSON)
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, sistema: 'gestao-soudev', versao: 1 })).setMimeType(ContentService.MimeType.JSON)
}

/** Rode uma vez no editor: cria as abas, a chave secreta e registra você como dono. */
function configurar() {
  const p = props()
  if (!p.getProperty('SEGREDO')) p.setProperty('SEGREDO', Utilities.getUuid() + Utilities.getUuid())
  const dono = Session.getEffectiveUser().getEmail()
  if (dono) p.setProperty('DONO', dono.toLowerCase())
  for (const nome of Object.keys(COLUNAS)) aba(nome)
  const padrao = planilha().getSheetByName('Página1') || planilha().getSheetByName('Sheet1')
  if (padrao && planilha().getSheets().length > 1 && padrao.getLastRow() === 0) planilha().deleteSheet(padrao)
  return `Pronto! Dono: ${dono}. Agora publique em Implantar > Nova implantação > App da Web.`
}

/** Desconecta todos os aparelhos (todos precisam entrar de novo com o código do e-mail). */
function sairDeTodos() {
  const p = props()
  p.setProperty('VERSAO_SESSAO', String(Number(p.getProperty('VERSAO_SESSAO') || 1) + 1))
}
