// Racha Conta: cálculo em centavos (inteiros), para a soma das partes sempre fechar com o total.

/** "1.234,56", "45,9", "45.90", "R$ 12" → centavos. Vazio ou inválido → 0. */
export function centavos(txt) {
  let s = String(txt ?? '').replace(/[^\d,.-]/g, '')
  if (!s) return 0
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
export const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const numero = (txt) => { const n = Number(String(txt ?? '').replace(',', '.').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0 }

/** Divide `total` centavos proporcionalmente aos pesos; os centavos que sobram vão para os maiores restos. */
export function distribuir(total, pesos) {
  const soma = pesos.reduce((s, p) => s + Math.max(0, p), 0)
  if (!soma || !total) return pesos.map(() => 0)
  const brutos = pesos.map((p) => (Math.max(0, p) / soma) * total)
  const partes = brutos.map((b) => Math.floor(b))
  let falta = total - partes.reduce((s, p) => s + p, 0)
  const ordem = brutos.map((b, i) => [b - Math.floor(b), i]).filter(([, i]) => pesos[i] > 0).sort((a, b) => b[0] - a[0])
  for (let k = 0; falta > 0 && ordem.length; k = (k + 1) % ordem.length, falta--) partes[ordem[k][1]]++
  return partes
}

let seq = 0
export const novoId = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function cenarioVazio(nome = 'Cenário 1', pessoas = []) {
  return {
    id: novoId(), nome, pessoas,
    modo: 'igual', // igual | porcentagem | itens
    valor: '', // consumo (modos igual e porcentagem)
    participam: null, // modo igual: ids que entram (null = todos)
    pct: {}, // modo porcentagem: id → número
    itens: [], // modo itens: { id, nome, valor, qtd, quem: ids|null }
    servico: { ativo: true, pct: '10', isentos: [] },
    couvert: { valor: '', quem: null },
    desconto: { tipo: 'R$', valor: '' },
    extra: '', // gorjeta ou outra taxa, dividida igual
    arredondar: 0, // 0, 50 ou 100 centavos (sempre para cima)
    pagou: { modo: 'nenhum', quem: null, valores: {} }, // nenhum | um | varios
  }
}

/** Calcula quanto cada pessoa paga. Devolve { linhas, totais, avisos }. */
export function calcular(c) {
  const ps = c.pessoas
  const n = ps.length
  const avisos = []
  const zeros = () => ps.map(() => 0)
  if (!n) return { linhas: [], totais: { consumo: 0, servico: 0, couvert: 0, desconto: 0, extra: 0, arredondamento: 0, total: 0 }, avisos: ['Cadastre as pessoas para dividir.'] }

  // 1. consumo de cada um
  let consumo = zeros()
  if (c.modo === 'igual') {
    const entram = ps.map((p) => (c.participam ? c.participam.includes(p.id) : true))
    if (!entram.some(Boolean)) avisos.push('Marque quem entra na divisão.')
    consumo = distribuir(centavos(c.valor), entram.map((e) => (e ? 1 : 0)))
  } else if (c.modo === 'porcentagem') {
    const pcts = ps.map((p) => Math.max(0, numero(c.pct[p.id])))
    const soma = Math.round(pcts.reduce((s, x) => s + x, 0) * 100) / 100
    if (Math.abs(soma - 100) > 0.001) avisos.push(`As porcentagens somam ${soma.toLocaleString('pt-BR')}%: precisam somar 100%.`)
    consumo = distribuir(Math.round((centavos(c.valor) * Math.min(soma, 100)) / 100), pcts)
  } else {
    for (const it of c.itens) {
      const valorItem = centavos(it.valor) * Math.max(1, Math.round(numero(it.qtd) || 1))
      const quem = ps.map((p) => (it.quem ? it.quem.includes(p.id) : true))
      if (valorItem && !quem.some(Boolean)) avisos.push(`Ninguém marcado em "${it.nome || 'item sem nome'}".`)
      distribuir(valorItem, quem.map((q) => (q ? 1 : 0))).forEach((v, i) => (consumo[i] += v))
    }
  }
  const consumoTotal = consumo.reduce((s, v) => s + v, 0)

  // 2. desconto (sobre o consumo, proporcional)
  const d = c.desconto.tipo === '%' ? Math.round((consumoTotal * Math.min(100, Math.max(0, numero(c.desconto.valor)))) / 100) : Math.min(consumoTotal, centavos(c.desconto.valor))
  const desconto = distribuir(d, consumo)

  // 3. taxa de serviço (10%) sobre o consumo de quem paga a taxa
  // calcula a taxa no total e reparte (por pessoa, os arredondamentos somariam um centavo a menos)
  const pctServ = c.servico.ativo ? Math.max(0, numero(c.servico.pct)) : 0
  const baseServ = consumo.map((v, i) => (c.servico.isentos.includes(ps[i].id) ? 0 : v))
  const servico = distribuir(Math.round((baseServ.reduce((s, v) => s + v, 0) * pctServ) / 100), baseServ)

  // 4. couvert por pessoa
  const valorCouvert = centavos(c.couvert.valor)
  const couvert = ps.map((p) => (valorCouvert && (c.couvert.quem ? c.couvert.quem.includes(p.id) : true) ? valorCouvert : 0))

  // 5. extra (gorjeta ou outra taxa), dividido igual entre todos
  const extra = distribuir(centavos(c.extra), ps.map(() => 1))

  // 6. soma e arredondamento para cima
  const linhas = ps.map((p, i) => {
    const bruto = consumo[i] - desconto[i] + servico[i] + couvert[i] + extra[i]
    const passo = Number(c.arredondar) || 0
    const total = passo && bruto > 0 ? Math.ceil(bruto / passo) * passo : bruto
    return { id: p.id, nome: p.nome, consumo: consumo[i], desconto: desconto[i], servico: servico[i], couvert: couvert[i], extra: extra[i], arredondamento: total - bruto, total }
  })
  const soma = (k) => linhas.reduce((s, l) => s + l[k], 0)
  const totais = { consumo: soma('consumo'), desconto: soma('desconto'), servico: soma('servico'), couvert: soma('couvert'), extra: soma('extra'), arredondamento: soma('arredondamento'), total: soma('total') }
  return { linhas, totais, avisos }
}

/** Quem deve para quem, com o menor número de transferências (guloso). */
export function acertos(c, linhas) {
  const pagou = c.pagou
  if (!pagou || pagou.modo === 'nenhum' || !linhas.length) return null
  const total = linhas.reduce((s, l) => s + l.total, 0)
  const pagos = linhas.map((l) => (pagou.modo === 'um' ? (l.id === pagou.quem ? total : 0) : centavos(pagou.valores[l.id])))
  const somaPagos = pagos.reduce((s, v) => s + v, 0)
  const saldos = linhas.map((l, i) => ({ nome: l.nome, saldo: pagos[i] - l.total }))
  const devedores = saldos.filter((s) => s.saldo < 0).map((s) => ({ ...s, saldo: -s.saldo })).sort((a, b) => b.saldo - a.saldo)
  const credores = saldos.filter((s) => s.saldo > 0).sort((a, b) => b.saldo - a.saldo)
  const transferencias = []
  let i = 0, j = 0
  while (i < devedores.length && j < credores.length) {
    const v = Math.min(devedores[i].saldo, credores[j].saldo)
    if (v > 0) transferencias.push({ de: devedores[i].nome, para: credores[j].nome, valor: v })
    devedores[i].saldo -= v; credores[j].saldo -= v
    if (!devedores[i].saldo) i++
    if (!credores[j].saldo) j++
  }
  return { transferencias, diferenca: somaPagos - total }
}

/** Texto para mandar no grupo. */
export function resumoTexto(c, r, ac) {
  const linhas = [`🧾 ${c.nome}`, '']
  for (const l of r.linhas) linhas.push(`• ${l.nome}: ${reais(l.total)}`)
  linhas.push('', `Total: ${reais(r.totais.total)}`)
  const det = []
  if (r.totais.servico) det.push(`serviço ${reais(r.totais.servico)}`)
  if (r.totais.couvert) det.push(`couvert ${reais(r.totais.couvert)}`)
  if (r.totais.desconto) det.push(`desconto ${reais(r.totais.desconto)}`)
  if (r.totais.extra) det.push(`extra ${reais(r.totais.extra)}`)
  if (r.totais.arredondamento) det.push(`arredondamento ${reais(r.totais.arredondamento)}`)
  if (det.length) linhas.push(`(${det.join(' · ')})`)
  if (ac?.transferencias.length) {
    linhas.push('', 'Acertos:')
    for (const t of ac.transferencias) linhas.push(`➡️ ${t.de} paga ${reais(t.valor)} para ${t.para}`)
  }
  linhas.push('', 'Feito no Racha Conta: soudev.vercel.app/apps/racha-conta')
  return linhas.join('\n')
}
