// Regras de negócio sem React: formatação, preço de pedido, horários livres, estoque, caixa e mensalidades.
// O mesmo cálculo serve para a demonstração local e é repetido no Apps Script para conferir pedidos públicos.

export const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const num = (n, casas = 0) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas })
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** Lê "12,50", "12.5" ou "R$ 1.234,56". */
export function parseValor(texto) {
  if (typeof texto === 'number') return texto
  let s = String(texto ?? '').replace(/[^\d,.-]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export const pad = (n) => String(n).padStart(2, '0')
export const hojeISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** Data e hora locais no formato do input datetime-local (sem fuso). */
export const localISO = (d = new Date()) => `${hojeISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
export const minutos = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
export const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

export function dataBR(valor, comHora = false) {
  if (!valor) return ''
  const d = typeof valor === 'number' ? new Date(valor) : new Date(String(valor).length === 10 ? `${valor}T12:00` : valor)
  if (Number.isNaN(d.getTime())) return String(valor)
  const data = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  return comHora ? `${data} ${pad(d.getHours())}:${pad(d.getMinutes())}` : data
}

export const horaBR = (valor) => {
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const addDias = (iso, dias) => {
  const d = new Date(`${iso}T12:00`)
  d.setDate(d.getDate() + dias)
  return hojeISO(d)
}

export const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000)

export const soDigitos = (s) => String(s ?? '').replace(/\D/g, '')

/** Link do WhatsApp com DDI 55 quando o número veio só com DDD. */
export function linkWhats(telefone, texto) {
  let n = soDigitos(telefone)
  if (n.length >= 10 && n.length <= 11) n = `55${n}`
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

export const novoId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Código curto para o cliente acompanhar o pedido ou a OS (sem letras parecidas). */
export function codigoPublico() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += letras[Math.floor(Math.random() * letras.length)]
  return s
}

/* ---------- Pedido do cardápio ---------- */

/** "Bacon:4; Ovo:2,5" -> [{ nome: 'Bacon', preco: 4 }, ...] */
export function lerAdicionais(texto) {
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

/**
 * Monta os itens de um pedido a partir do carrinho, sempre com o preço do cadastro
 * (nunca confia no preço que veio do navegador do cliente).
 */
export function precificar(carrinho, produtos) {
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

export const totalItens = (itens) => round2((itens || []).reduce((s, i) => s + Number(i.preco) * Number(i.qtd), 0))

export const resumoItens = (itens) => (itens || []).map((i) => `${num(i.qtd, 3)}x ${i.nome}`).join(', ')

/* ---------- Agenda ---------- */

/**
 * O agendamento segura o horário do profissional? Cancelado, recusado e falta liberam.
 * Bloqueio sem profissional fecha o horário de todos.
 */
export function ocupaHorario(a, profissionalId) {
  // Na planilha "excluido" chega como texto ("0" ou "1").
  if (a.excluido === true || a.excluido === '1' || a.status === 'cancelado' || a.status === 'faltou' || a.status === 'recusado') return false
  return a.profissional_id === profissionalId || (a.status === 'bloqueio' && !a.profissional_id)
}

/** Horários livres de um profissional num dia, a partir do expediente e dos agendamentos. */
export function horariosLivres({ data, duracao, profissionalId, agendamentos, config, agora = new Date() }) {
  const dia = new Date(`${data}T12:00`).getDay()
  const dias = String(config.dias ?? '1,2,3,4,5,6').split(',').map((d) => Number(d.trim()))
  if (!dias.includes(dia)) return []
  const abre = minutos(config.abre || '09:00')
  const fecha = minutos(config.fecha || '19:00')
  const passo = Math.max(10, Number(config.intervalo_agenda) || 30)
  const dur = Math.max(10, Number(duracao) || passo)
  const ocupados = agendamentos
    .filter((a) => ocupaHorario(a, profissionalId) && String(a.inicio).startsWith(data))
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

/* ---------- Estoque ---------- */

export function saldos(movimentos) {
  const mapa = new Map()
  for (const m of movimentos) {
    if (m.excluido) continue
    mapa.set(m.produto_id, (mapa.get(m.produto_id) || 0) + (Number(m.qtd) || 0))
  }
  return mapa
}

/* ---------- Caixa ---------- */

/** Totais de um caixa por forma de pagamento e o dinheiro que deveria estar na gaveta. */
export function resumoCaixa(caixa, vendas, movimentos) {
  const formas = {}
  let qtd = 0
  for (const v of vendas) {
    if (v.excluido || v.caixa_id !== caixa.id || v.status !== 'concluida') continue
    qtd++
    for (const p of v.pagamentos || []) formas[p.forma] = round2((formas[p.forma] || 0) + Number(p.valor))
  }
  const troco = vendas.filter((v) => !v.excluido && v.caixa_id === caixa.id && v.status === 'concluida').reduce((s, v) => s + (Number(v.troco) || 0), 0)
  const movs = movimentos.filter((m) => !m.excluido && m.caixa_id === caixa.id)
  const sangrias = movs.filter((m) => m.tipo === 'sangria').reduce((s, m) => s + Number(m.valor), 0)
  const suprimentos = movs.filter((m) => m.tipo === 'suprimento').reduce((s, m) => s + Number(m.valor), 0)
  const esperado = round2(Number(caixa.valor_inicial || 0) + (formas.dinheiro || 0) - troco + suprimentos - sangrias)
  const total = round2(Object.values(formas).reduce((s, v) => s + v, 0) - troco)
  return { formas, qtd, sangrias, suprimentos, troco, esperado, total }
}

/* ---------- Mensalidades ---------- */

export const mesRef = (iso) => iso.slice(0, 7)

export function vencimentoDoMes(ano, mes, dia) {
  const ultimo = new Date(ano, mes, 0).getDate()
  return `${ano}-${pad(mes)}-${pad(Math.min(Math.max(1, Number(dia) || 10), ultimo))}`
}

/* ---------- Venda ---------- */

/** Total da venda e o que ainda falta pagar. */
export function contaVenda({ itens, desconto = 0, taxa_entrega = 0, acrescimo = 0 }) {
  const subtotal = totalItens(itens)
  const total = round2(Math.max(0, subtotal - Number(desconto || 0) + Number(taxa_entrega || 0) + Number(acrescimo || 0)))
  return { subtotal, total }
}

export function pagamentosResumo(pagamentos, formas) {
  return (pagamentos || []).map((p) => `${formas.find(([id]) => id === p.forma)?.[1] ?? p.forma} ${brl(p.valor)}`).join(' + ')
}

export function csv(linhas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\n')
}
