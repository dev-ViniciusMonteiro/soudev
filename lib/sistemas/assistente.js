// Assistente do MEI na Mão: responde perguntas sobre o negócio em linguagem do dia a dia.
// Cada resposta sai em dois formatos: texto para a tela (R$ 12,50) e texto para falar (12 reais e 50 centavos).
//
// Períodos entendidos: hoje, ontem, anteontem, esta semana, semana passada, últimos N dias, este mês,
// mês passado, nome do mês (com ou sem ano), este ano, ano passado, desde o começo.

import { acharProduto, normalizar, numerosPorExtenso } from './voz'
import { MEI, limiteDoAno, precisaNota, proximoDAS, reaisFalado, situacaoLimite, valorDAS } from './mei'
import { addDias, brl, hojeISO, num, round2 } from './regras'

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const FORMAS = { dinheiro: 'dinheiro', pix: 'Pix', debito: 'cartão de débito', credito: 'cartão de crédito', fiado: 'fiado' }
const CATEGORIAS = { fornecedor: 'mercadoria', aluguel: 'aluguel', contas: 'luz, água e internet', impostos: 'DAS e taxas', marketing: 'divulgação', salarios: 'salários', outros: 'outros' }

const pad = (n) => String(n).padStart(2, '0')
const fimDoMes = (a, m) => `${a}-${pad(m)}-${pad(new Date(a, m, 0).getDate())}`
const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Descobre o período citado na frase. Sem período, usa o padrão (normalmente "este mês"). */
export function periodoDe(texto, hoje = new Date(), padrao = 'mes') {
  // "dia da semana" não é período.
  const t = numerosPorExtenso(texto).replace(/\bdias? da semana\b/g, ' ')
  const h = hojeISO(hoje)
  const a = hoje.getFullYear()
  const m = hoje.getMonth() + 1
  if (/\banteontem\b/.test(t)) return { ini: addDias(h, -2), fim: addDias(h, -2), nome: 'anteontem' }
  if (/\bontem\b/.test(t)) return { ini: addDias(h, -1), fim: addDias(h, -1), nome: 'ontem' }
  if (/\bhoje\b/.test(t)) return { ini: h, fim: h, nome: 'hoje' }
  const ultimos = t.match(/\bultimos? (\d+) dias?\b/)
  if (ultimos) return { ini: addDias(h, -(Number(ultimos[1]) - 1)), fim: h, nome: `nos últimos ${ultimos[1]} dias` }
  const dow = (hoje.getDay() + 6) % 7 // segunda = 0
  if (/\bsemana passada\b|\bultima semana\b/.test(t)) return { ini: addDias(h, -dow - 7), fim: addDias(h, -dow - 1), nome: 'na semana passada' }
  if (/\b(essa|esta|nessa|nesta) semana\b|\bsemana\b/.test(t)) return { ini: addDias(h, -dow), fim: h, nome: 'nesta semana' }
  if (/\bmes passado\b|\bultimo mes\b/.test(t)) {
    const d = new Date(a, m - 2, 1)
    return { ini: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, fim: fimDoMes(d.getFullYear(), d.getMonth() + 1), nome: 'no mês passado' }
  }
  const mes = MESES.findIndex((n) => new RegExp(`\\b${n}\\b`).test(t))
  if (mes >= 0) {
    const anoTxt = t.match(new RegExp(`\\b${MESES[mes]}\\b(?: de)? (\\d{4})`))
    const ano = anoTxt ? Number(anoTxt[1]) : mes + 1 > m ? a - 1 : a
    const nome = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][mes]
    return { ini: `${ano}-${pad(mes + 1)}-01`, fim: fimDoMes(ano, mes + 1), nome: `em ${nome}${ano !== a ? ` de ${ano}` : ''}` }
  }
  if (/\bano passado\b/.test(t)) return { ini: `${a - 1}-01-01`, fim: `${a - 1}-12-31`, nome: `em ${a - 1}` }
  if (/\b(esse|este|neste|nesse) ano\b|\bno ano\b|\bano\b/.test(t)) return { ini: `${a}-01-01`, fim: h, nome: 'neste ano' }
  if (/\b(sempre|tudo|total|comeco|inicio|historia)\b/.test(t)) return { ini: '2000-01-01', fim: h, nome: 'desde o começo' }
  if (/\b(esse|este|neste|nesse) mes\b|\bmes\b/.test(t)) return { ini: `${a}-${pad(m)}-01`, fim: h, nome: 'neste mês' }
  if (padrao === 'hoje') return { ini: h, fim: h, nome: 'hoje' }
  if (padrao === 'ano') return { ini: `${a}-01-01`, fim: h, nome: 'neste ano' }
  return { ini: `${a}-${pad(m)}-01`, fim: h, nome: 'neste mês' }
}

/** O mesmo período, imediatamente antes (para comparar). */
function periodoAnterior(p) {
  const dias = Math.round((new Date(`${p.fim}T12:00`) - new Date(`${p.ini}T12:00`)) / 86400000) + 1
  // Período que começa no dia 1 compara com os mesmos dias do mês anterior (1 a 16 com 1 a 16).
  if (p.ini.endsWith('-01') && dias <= 31) {
    const d = new Date(`${p.ini}T12:00`)
    d.setMonth(d.getMonth() - 1)
    const ini = hojeISO(d)
    const ultimo = fimDoMes(d.getFullYear(), d.getMonth() + 1)
    const fim = addDias(ini, dias - 1) > ultimo ? ultimo : addDias(ini, dias - 1)
    return { ini, fim, nome: dias >= 28 ? 'no mês anterior' : 'nos mesmos dias do mês anterior' }
  }
  return { ini: addDias(p.ini, -dias), fim: addDias(p.ini, -1), nome: 'no período anterior' }
}

const dentro = (iso, p) => iso >= p.ini && iso <= p.fim
const diaDaVenda = (v) => hojeISO(new Date(v.concluida_em || v.criado_em))

function vendasDe(d, p) {
  return d.vendas.filter((v) => v.status === 'concluida' && dentro(diaDaVenda(v), p))
}

function gastosDe(d, p) {
  return d.lancamentos.filter((l) => l.tipo === 'despesa' && l.pago_em && dentro(l.pago_em, p))
}

const soma = (lista, f) => round2(lista.reduce((s, x) => s + (Number(f(x)) || 0), 0))

function porProduto(vendas) {
  const m = new Map()
  for (const v of vendas) {
    for (const i of v.itens || []) {
      const k = i.produto_id || i.nome
      const x = m.get(k) || { id: i.produto_id, nome: i.nome.replace(/ \(\+.*\)$/, ''), qtd: 0, valor: 0 }
      x.qtd += Number(i.qtd) || 0
      x.valor = round2(x.valor + Number(i.preco) * Number(i.qtd))
      m.set(k, x)
    }
  }
  return [...m.values()]
}

const plural = (n, um, varios) => `${num(n, 3)} ${Number(n) === 1 ? um : varios}`

/* ---------- Respostas ---------- */

// Cada resposta: { texto: (formatoDinheiro) => string, lista?: [[rótulo, valorEmTexto]] }
const r = (texto, lista) => ({ texto, lista })

function resumoVendas(d, p) {
  const vs = vendasDe(d, p)
  const total = soma(vs, (v) => v.total)
  if (!vs.length) return r(() => `Nenhuma venda registrada ${p.nome}.`)
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você vendeu ${m(total)} em ${plural(vs.length, 'venda', 'vendas')}.`)
}

function lucro(d, p) {
  const vendas = soma(vendasDe(d, p), (v) => v.total)
  const gastos = soma(gastosDe(d, p), (l) => l.valor)
  const sobra = round2(vendas - gastos)
  const margem = vendas ? Math.round((sobra / vendas) * 100) : 0
  return r(
    (m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} entrou ${m(vendas)} e saiu ${m(gastos)}. ${sobra >= 0 ? `Sobrou ${m(sobra)}` : `Faltou ${m(-sobra)}`}${vendas ? `, ${margem}% do que vendeu` : ''}.`,
    [
      ['Vendas', brl(vendas)],
      ['Gastos', brl(gastos)],
      [sobra >= 0 ? 'Sobrou' : 'Faltou', brl(Math.abs(sobra))],
    ],
  )
}

function rankingProdutos(d, p, { por = 'qtd', ordem = 'mais' } = {}) {
  const lista = porProduto(vendasDe(d, p))
  if (ordem === 'menos') {
    // Inclui produtos ativos que nem venderam.
    for (const prod of d.produtos) if (prod.ativo !== false && !lista.some((x) => x.id === prod.id)) lista.push({ id: prod.id, nome: prod.nome, qtd: 0, valor: 0 })
  }
  if (!lista.length) return r(() => `Nenhum produto vendido ${p.nome}.`)
  lista.sort((a, b) => (ordem === 'mais' ? b[por] - a[por] : a[por] - b[por]))
  const top = lista[0]
  const rotulo = por === 'qtd' ? 'mais vendido' : 'que mais faturou'
  const lista5 = lista.slice(0, 5).map((x) => [x.nome, por === 'qtd' ? `${num(x.qtd, 3)} un · ${brl(x.valor)}` : `${brl(x.valor)} · ${num(x.qtd, 3)} un`])
  if (ordem === 'menos') {
    const parados = lista.filter((x) => x.qtd === 0)
    return r(
      () => (parados.length ? `${parados.length === 1 ? 'Um produto não vendeu' : `${parados.length} produtos não venderam`} nada ${p.nome}: ${parados.slice(0, 4).map((x) => x.nome).join(', ')}.` : `O que menos vendeu ${p.nome} foi ${top.nome}, com ${plural(top.qtd, 'unidade', 'unidades')}.`),
      lista5,
    )
  }
  return r((m) => `O ${rotulo} ${p.nome} foi ${top.nome}: ${plural(top.qtd, 'unidade', 'unidades')}, ${m(top.valor)}.`, lista5)
}

function produtoEspecifico(d, p, prod) {
  const x = porProduto(vendasDe(d, p)).find((i) => i.id === prod.id)
  if (!x) return r(() => `Você não vendeu ${prod.nome} ${p.nome}.`)
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você vendeu ${plural(x.qtd, 'unidade', 'unidades')} de ${prod.nome}, somando ${m(x.valor)}.`)
}

function melhorDia(d, p, pior = false) {
  const dias = new Map()
  for (const v of vendasDe(d, p)) dias.set(diaDaVenda(v), round2((dias.get(diaDaVenda(v)) || 0) + Number(v.total)))
  if (!dias.size) return r(() => `Nenhuma venda ${p.nome}.`)
  const lista = [...dias].sort((a, b) => (pior ? a[1] - b[1] : b[1] - a[1]))
  const [dia, valor] = lista[0]
  const semana = SEMANA[new Date(`${dia}T12:00`).getDay()]
  return r((m) => `${pior ? 'O dia mais fraco' : 'O melhor dia'} ${p.nome} foi ${semana}, ${dataCurta(dia)}, com ${m(valor)}.`, lista.slice(0, 5).map(([x, v]) => [`${SEMANA[new Date(`${x}T12:00`).getDay()]} ${dataCurta(x)}`, brl(v)]))
}

function diaDaSemana(d, p) {
  const tot = Array(7).fill(0)
  const conta = Array(7).fill(0)
  const dias = new Set()
  for (const v of vendasDe(d, p)) {
    const dia = diaDaVenda(v)
    const w = new Date(`${dia}T12:00`).getDay()
    tot[w] += Number(v.total)
    if (!dias.has(dia)) {
      dias.add(dia)
      conta[w]++
    }
  }
  const medias = tot.map((t, w) => [w, conta[w] ? t / conta[w] : 0]).filter(([, m]) => m > 0)
  if (!medias.length) return r(() => `Nenhuma venda ${p.nome}.`)
  medias.sort((a, b) => b[1] - a[1])
  const [w, media] = medias[0]
  return r((m) => `Na média, ${SEMANA[w]} é o dia que mais vende ${p.nome}: ${m(round2(media))} por dia.`, medias.map(([x, v]) => [SEMANA[x], `${brl(v)} em média`]))
}

function horarioPico(d, p) {
  const horas = Array(24).fill(0)
  const qtd = Array(24).fill(0)
  for (const v of vendasDe(d, p)) {
    const h = new Date(v.concluida_em || v.criado_em).getHours()
    horas[h] += Number(v.total)
    qtd[h]++
  }
  const lista = horas.map((v, h) => [h, v, qtd[h]]).filter(([, v]) => v > 0)
  if (!lista.length) return r(() => `Nenhuma venda ${p.nome}.`)
  lista.sort((a, b) => b[1] - a[1])
  const [h, valor, n] = lista[0]
  return r((m) => `O horário que mais vende ${p.nome} é das ${h} às ${h + 1} horas: ${plural(n, 'venda', 'vendas')}, ${m(valor)}.`, lista.slice(0, 5).map(([x, v, c]) => [`${pad(x)}h às ${pad(x + 1)}h`, `${brl(v)} · ${c} vendas`]))
}

function formasPagamento(d, p, forma) {
  const tot = {}
  for (const v of vendasDe(d, p)) {
    for (const pg of v.pagamentos || []) tot[pg.forma] = round2((tot[pg.forma] || 0) + Number(pg.valor))
    if (Number(v.troco)) tot.dinheiro = round2((tot.dinheiro || 0) - Number(v.troco))
  }
  const lista = Object.entries(tot).sort((a, b) => b[1] - a[1])
  if (!lista.length) return r(() => `Nenhuma venda ${p.nome}.`)
  if (forma) return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} entrou ${m(tot[forma] || 0)} ${forma === 'dinheiro' ? 'em dinheiro' : `no ${FORMAS[forma]}`}.`)
  const total = lista.reduce((s, [, v]) => s + v, 0)
  const [f, v] = lista[0]
  return r((m) => `A forma de pagamento mais usada ${p.nome} foi ${FORMAS[f] ?? f}: ${m(v)}, ${Math.round((v / total) * 100)}% do total.`, lista.map(([x, y]) => [FORMAS[x] ?? x, brl(y)]))
}

function ticketMedio(d, p) {
  const vs = vendasDe(d, p)
  if (!vs.length) return r(() => `Nenhuma venda ${p.nome}.`)
  const media = soma(vs, (v) => v.total) / vs.length
  return r((m) => `Cada venda ${p.nome} foi, em média, de ${m(round2(media))} (${plural(vs.length, 'venda', 'vendas')}).`)
}

function quantidadeVendas(d, p) {
  const vs = vendasDe(d, p)
  const itens = vs.reduce((s, v) => s + (v.itens || []).reduce((a, i) => a + Number(i.qtd), 0), 0)
  return r(() => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} foram ${plural(vs.length, 'venda', 'vendas')}, com ${plural(itens, 'item', 'itens')} vendidos.`)
}

function comparar(d, p) {
  const ant = periodoAnterior(p)
  const atual = soma(vendasDe(d, p), (v) => v.total)
  const antes = soma(vendasDe(d, ant), (v) => v.total)
  if (!antes) return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você vendeu ${m(atual)}. Não há vendas ${ant.nome} para comparar.`)
  const pct = Math.round(((atual - antes) / antes) * 100)
  return r(
    (m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você vendeu ${m(atual)}, contra ${m(antes)} ${ant.nome}. ${pct > 0 ? `Cresceu ${pct}%` : pct < 0 ? `Caiu ${-pct}%` : 'Ficou igual'}.`,
    [
      [p.nome, brl(atual)],
      [ant.nome, brl(antes)],
    ],
  )
}

function ultimaVenda(d) {
  const vs = d.vendas.filter((v) => v.status === 'concluida').sort((a, b) => String(b.concluida_em || b.criado_em).localeCompare(String(a.concluida_em || a.criado_em)))
  if (!vs.length) return r(() => 'Ainda não há vendas.')
  const v = vs[0]
  const quando = new Date(v.concluida_em || v.criado_em)
  return r((m) => `A última venda foi ${hojeISO(quando) === hojeISO() ? 'hoje' : `em ${dataCurta(hojeISO(quando))}`} às ${pad(quando.getHours())}h${pad(quando.getMinutes())}: ${m(v.total)}, ${(v.itens || []).map((i) => `${num(i.qtd, 3)} ${i.nome}`).join(', ')}.`)
}

function melhoresClientes(d, p) {
  const m = new Map()
  for (const v of vendasDe(d, p)) {
    if (!v.cliente_id && !v.cliente_nome) continue
    const k = v.cliente_id || v.cliente_nome
    const x = m.get(k) || { nome: d.clientes.find((c) => c.id === v.cliente_id)?.nome || v.cliente_nome, valor: 0, qtd: 0 }
    x.valor = round2(x.valor + Number(v.total))
    x.qtd++
    m.set(k, x)
  }
  const lista = [...m.values()].sort((a, b) => b.valor - a.valor)
  if (!lista.length) return r(() => `Nenhuma venda com cliente identificado ${p.nome}. Escolha o cliente na venda para acompanhar.`)
  return r((fm) => `O cliente que mais comprou ${p.nome} foi ${lista[0].nome}: ${fm(lista[0].valor)} em ${plural(lista[0].qtd, 'compra', 'compras')}.`, lista.slice(0, 5).map((x) => [x.nome, `${brl(x.valor)} · ${x.qtd}x`]))
}

function clienteEspecifico(d, p, c) {
  const vs = vendasDe(d, p).filter((v) => v.cliente_id === c.id)
  if (!vs.length) return r(() => `${c.nome} não comprou ${p.nome}.`)
  return r((m) => `${c.nome} comprou ${plural(vs.length, 'vez', 'vezes')} ${p.nome}, somando ${m(soma(vs, (v) => v.total))}.`)
}

function totalGastos(d, p) {
  const gs = gastosDe(d, p)
  if (!gs.length) return r(() => `Nenhum gasto anotado ${p.nome}.`)
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você gastou ${m(soma(gs, (l) => l.valor))} em ${plural(gs.length, 'gasto', 'gastos')}.`)
}

function maiorGasto(d, p) {
  const gs = gastosDe(d, p)
  if (!gs.length) return r(() => `Nenhum gasto anotado ${p.nome}.`)
  const cat = new Map()
  for (const l of gs) cat.set(l.categoria || 'outros', round2((cat.get(l.categoria || 'outros') || 0) + Number(l.valor)))
  const cats = [...cat].sort((a, b) => b[1] - a[1])
  const maior = [...gs].sort((a, b) => Number(b.valor) - Number(a.valor))[0]
  return r(
    (m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} o que mais pesou foi ${CATEGORIAS[cats[0][0]] ?? cats[0][0]}: ${m(cats[0][1])}. O maior gasto sozinho foi ${maior.descricao}, ${m(maior.valor)}, em ${dataCurta(maior.pago_em)}.`,
    cats.map(([c, v]) => [CATEGORIAS[c] ?? c, brl(v)]),
  )
}

function gastoCategoria(d, p, cat) {
  const v = soma(gastosDe(d, p).filter((l) => l.categoria === cat), (l) => l.valor)
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você gastou ${m(v)} com ${CATEGORIAS[cat]}.`)
}

function limite(d) {
  const ano = `${new Date().getFullYear()}-01-01`
  const faturado = soma(vendasDe(d, { ini: ano, fim: hojeISO() }), (v) => v.total)
  const lim = limiteDoAno(d.cfg.mei_abertura)
  const resta = round2(lim.valor - faturado)
  const mesesRestantes = 12 - new Date().getMonth()
  const s = situacaoLimite(faturado, lim.valor)
  return r(
    (m) =>
      resta > 0
        ? `Neste ano você já faturou ${m(faturado)} de ${m(lim.valor)}. Ainda pode faturar ${m(resta)}, cerca de ${m(round2(resta / mesesRestantes))} por mês até dezembro. ${s.texto}`
        : `Você já passou do limite: faturou ${m(faturado)} de ${m(lim.valor)}. ${s.texto}`,
  )
}

function previsao(d) {
  const hoje = new Date()
  const ini = `${hoje.getFullYear()}-01-01`
  const faturado = soma(vendasDe(d, { ini, fim: hojeISO() }), (v) => v.total)
  // Média dos últimos 90 dias (ou do que houver), projetada até dezembro.
  const vs90 = vendasDe(d, { ini: addDias(hojeISO(), -89), fim: hojeISO() })
  const primeira = vs90.reduce((min, v) => (diaDaVenda(v) < min ? diaDaVenda(v) : min), hojeISO())
  const diasBase = Math.max(1, Math.round((hoje - new Date(`${primeira}T12:00`)) / 86400000) + 1)
  const porDia = soma(vs90, (v) => v.total) / diasBase
  const restam = Math.round((new Date(hoje.getFullYear(), 11, 31) - hoje) / 86400000)
  const fecha = round2(faturado + porDia * restam)
  const lim = limiteDoAno(d.cfg.mei_abertura)
  return r((m) => `No ritmo atual, de ${m(round2(porDia * 30))} por mês, o ano deve fechar em cerca de ${m(fecha)}. ${fecha > lim.valor ? 'Isso passa do limite do MEI: converse com um contador.' : `Fica dentro do limite de ${m(lim.valor)}.`}`)
}

function das(d, t) {
  const v = valorDAS(d.cfg.mei_atividade)
  const prox = proximoDAS()
  const comp = `${prox.competencia.getFullYear()}-${pad(prox.competencia.getMonth() + 1)}`
  const pago = d.lancamentos.some((l) => l.ref_id === `das:${comp}`)
  if (/\b(paguei|pago|paga|pagou|pagar)\b/.test(t) && !/\bquanto\b/.test(t)) {
    return r((m) => (pago ? `Sim, o DAS de ${comp.slice(5)}/${comp.slice(0, 4)} já está marcado como pago.` : `Ainda não. O DAS de ${comp.slice(5)}/${comp.slice(0, 4)}, de ${m(v.total)}, vence em ${prox.dias === 0 ? 'hoje' : `${prox.dias} dias`}. Depois de pagar, toque em Já paguei na Central MEI.`))
  }
  return r((m) => `O seu DAS é de ${m(v.total)} por mês e vence todo dia ${MEI.vencimentoDAS}. O próximo vence ${prox.dias === 0 ? 'hoje' : `em ${prox.dias} dias`}${pago ? ' e já está pago' : ''}.`)
}

function regraNota(t) {
  const empresa = /\b(empresa|cnpj|pessoa juridica)\b/.test(t)
  const servico = /\bservico/.test(t)
  const regra = precisaNota({ documento: empresa ? '00000000000000' : '', servico })
  if (empresa || /\b(pessoa fisica|cpf|consumidor)\b/.test(t)) return r(() => regra.texto)
  return r(() => 'Para empresa (CNPJ) a nota é sempre obrigatória. Para pessoa física, quando o cliente pedir. Serviço usa NFS-e pelo Emissor Nacional, e produto usa NF-e.')
}

function notasEmitidas(d, p) {
  const vs = vendasDe(d, p)
  const com = vs.filter((v) => v.fiscal?.status === 'autorizada')
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} foram ${plural(com.length, 'venda', 'vendas')} com nota (${m(soma(com, (v) => v.total))}) e ${plural(vs.length - com.length, 'venda', 'vendas')} sem nota.`)
}

function resumoGeral(d, p) {
  const vs = vendasDe(d, p)
  const vendas = soma(vs, (v) => v.total)
  const gastos = soma(gastosDe(d, p), (l) => l.valor)
  const top = porProduto(vs).sort((a, b) => b.qtd - a.qtd)[0]
  return r(
    (m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)}: ${plural(vs.length, 'venda', 'vendas')}, ${m(vendas)} de vendas e ${m(gastos)} de gastos, sobrando ${m(round2(vendas - gastos))}.${top ? ` O campeão foi ${top.nome}.` : ''}`,
    [
      ['Vendas', `${brl(vendas)} · ${vs.length}`],
      ['Ticket médio', brl(vs.length ? vendas / vs.length : 0)],
      ['Gastos', brl(gastos)],
      ['Sobrou', brl(vendas - gastos)],
      ...(top ? [['Mais vendido', `${top.nome} (${num(top.qtd, 3)})`]] : []),
    ],
  )
}

const AJUDA = r(() => 'Pode me perguntar, por exemplo: quanto vendi hoje, qual o produto mais vendido do mês, qual meu maior gasto, quanto sobrou na semana passada, qual o melhor dia, que horas vendo mais, quanto entrou no pix, quem é meu melhor cliente, quanto falta para o limite do MEI, quando vence o DAS, e se preciso emitir nota. Também posso anotar vendas e gastos.')

/** Perguntas prontas para tocar (para quem não quer ou não pode falar). */
export const PERGUNTAS_PRONTAS = [
  'Quanto vendi hoje?',
  'Quanto sobrou este mês?',
  'Qual o produto mais vendido do mês?',
  'Qual produto mais faturou?',
  'O que vendeu menos?',
  'Qual meu maior gasto?',
  'Qual o melhor dia do mês?',
  'Que dia da semana vende mais?',
  'Que horas eu vendo mais?',
  'Quanto entrou no Pix este mês?',
  'Qual forma de pagamento mais usada?',
  'Qual o ticket médio?',
  'Vendi mais que no mês passado?',
  'Quem é meu melhor cliente?',
  'Qual foi a última venda?',
  'Quanto falta para o limite do MEI?',
  'Como vai fechar o ano?',
  'Quando vence o DAS?',
  'Já paguei o DAS?',
  'Preciso emitir nota para empresa?',
  'Quantas vendas tiveram nota?',
  'Resumo da semana',
]

/**
 * Responde uma pergunta. dados = { vendas, lancamentos, produtos, clientes, cfg }.
 * Devolve { tela, fala, lista } ou null se a frase não é uma pergunta conhecida.
 */
export function perguntar(texto, dados, hoje = new Date()) {
  const t = numerosPorExtenso(texto)
  const res = escolher(t, dados, hoje)
  if (!res) return null
  return { tela: res.texto(brl), fala: res.texto(reaisFalado), lista: res.lista }
}

function escolher(t, d, hoje) {
  const p = (padrao) => periodoDe(t, hoje, padrao)
  const tem = (re) => re.test(t)

  if (tem(/\b(o que (voce|vc) (sabe|faz|entende)|ajuda|comandos|o que (eu )?posso (perguntar|falar|dizer))\b/)) return AJUDA
  if (tem(/\b(das|boleto|guia do mei)\b/)) return das(d, t)
  if (tem(/\b(limite|teto|desenquadr|quanto (ainda )?(posso|consigo) (vender|faturar)|falta (para|pro) (o )?limite)/)) return limite(d)
  if (tem(/\b(previsao|projecao|vou fechar|vai fechar|fechar o ano|no ritmo)\b/)) return previsao(d)
  if (tem(/\b(preciso|tenho que|devo|obrigad|obrigatori)\w*\b.*\bnota\b|\bnota\b.*\b(obrigatori|preciso|quando)\w*/)) return regraNota(t)
  if (tem(/\b(quantas|quais) (vendas|notas)\b.*\bnota|\bcom nota\b|\bsem nota\b|\bnotas emitidas\b/)) return notasEmitidas(d, p('mes'))
  if (tem(/\bultima venda\b/)) return ultimaVenda(d)

  // Gastos
  if (tem(/\b(maior|mais caro|mais pesad|pesou)\w* gasto|\bgastei mais\b|\bonde (eu )?(mais )?gast|\bcom o que (eu )?(mais )?gast|\bgasto maior\b|\bmaior despesa\b|\bcategoria\b/)) return maiorGasto(d, p('mes'))
  const cat = [
    ['contas', /\b(luz|energia|agua|internet|telefone|contas?)\b/],
    ['aluguel', /\baluguel\b/],
    ['fornecedor', /\b(mercadoria|ingrediente|estoque|fornecedor|material|insumo)s?\b/],
    ['marketing', /\b(divulgacao|anuncio|propaganda|marketing)\b/],
    ['impostos', /\b(imposto|taxa)s?\b/],
  ].find(([, re]) => re.test(t))
  if (cat && tem(/\b(quanto|gastei|gasto|gastos|paguei)\b/)) return gastoCategoria(d, p('mes'), cat[0])
  if (tem(/\b(quanto|qual|quais)\b.*\b(gastei|gasto|gastos|despesas?|paguei|saiu)\b|\btotal de gastos\b/)) return totalGastos(d, p('mes'))

  // Lucro e resumo
  if (tem(/\b(lucro|lucrei|sobrou|sobra|ganhei|margem|saldo|resultado|rendeu)\b/) && !tem(/\bproduto\b|\bmais\b.*\b(rendeu|lucr)/)) return lucro(d, p('mes'))
  if (tem(/\b(resumo|balanco|como (estou|esta|vai|foi|anda)|como (estao|vao) as vendas)\b/)) return resumoGeral(d, p('mes'))

  // Comparações
  if (tem(/\b(compar|cresc|caiu|cai|aument|diminu|melhor que|pior que|mais que|menos que|em relacao|versus)\w*/) && !tem(/\bproduto\b/)) {
    // "Vendi mais que no mês passado?" compara ESTE mês com o passado.
    const atual = t.replace(/\bmes passado\b/g, 'mes').replace(/\bsemana passada\b/g, 'semana').replace(/\bano passado\b/g, 'ano').replace(/\bontem\b/g, 'hoje')
    return comparar(d, periodoDe(atual, hoje, 'mes'))
  }

  // Produtos
  if (tem(/\b(menos vendid|vend\w* menos|sai menos|saiu menos|encalh|parad|nao vend|ninguem compr|nao sai)\w*/)) return rankingProdutos(d, p('mes'), { ordem: 'menos' })
  if (tem(/\b(mais fatur|faturou mais|rendeu mais|mais rend|mais dinheiro|deu mais dinheiro|mais lucr|traz mais)\w*/)) return rankingProdutos(d, p('mes'), { por: 'valor' })
  if (tem(/\b(mais vendid|vend\w* mais|sai mais|saiu mais|mais sai|campeao|top|ranking|preferid|carro chefe)\w*/) && !tem(/\b(dia|dias|hora|horas|horario|cliente|forma|pagamento|semana)\b/)) return rankingProdutos(d, p('mes'))

  // Dias e horários
  if (tem(/\bdia da semana\b|\bque dia (da semana )?(vende|vendo|movimenta)/)) return diaDaSemana(d, p('mes'))
  if (tem(/\b(pior|mais fraco|menor) dia\b|\bdia (mais )?fraco\b/)) return melhorDia(d, p('mes'), true)
  if (tem(/\b(melhor|maior) dia\b|\bdia (mais )?forte\b|\bdia que (eu )?mais vend/)) return melhorDia(d, p('mes'))
  if (tem(/\b(horario|hora|horas)\b/) && tem(/\b(pico|mais|movimento|melhor|forte|vend)\w*/)) return horarioPico(d, p('mes'))

  // Pagamentos
  const forma = tem(/\bpix\b/) ? 'pix' : tem(/\bdinheiro\b/) ? 'dinheiro' : tem(/\bcredito\b/) ? 'credito' : tem(/\bdebito\b/) ? 'debito' : tem(/\bfiado\b/) ? 'fiado' : null
  if (tem(/\b(forma|formas|meio|meios) de pagamento\b|\bcomo (me )?(pagam|pagaram)\b|\bmais usad/)) return formasPagamento(d, p('mes'))
  if (forma && tem(/\b(quanto|entrou|recebi|vendi|veio)\b/)) return formasPagamento(d, p('mes'), forma)

  // Clientes
  if (tem(/\b(melhor|maior|principal) cliente\b|\bclientes? (que )?(mais )?compr\w*|\bquem (mais )?compr|\bclientes? fie/)) return melhoresClientes(d, p('mes'))
  const cliente = d.clientes.find((c) => {
    const nome = normalizar(c.nome).split(' ')[0]
    return nome.length > 2 && new RegExp(`\\b${nome}\\b`).test(t)
  })
  if (cliente && tem(/\b(compr|gast|quanto|quantas|veio)\w*/)) return clienteEspecifico(d, p('mes'), cliente)

  // Números de venda
  if (tem(/\bticket\b|\bvalor medio\b|\bmedia (por|de cada) venda\b|\bem media\b|\bgasta em media\b/)) return ticketMedio(d, p('mes'))
  if (tem(/\bquant[ao]s (vendas|pedidos|atendimentos|clientes)\b|\bquantas vezes vendi\b|\bnumero de vendas\b/)) return quantidadeVendas(d, p('mes'))

  // Produto específico: "quantas coxinhas vendi", "quanto vendi de brigadeiro"
  const prod = tem(/\b(quant|vend|saiu|sairam|sai)\w*/) ? acharProduto(t.replace(/\b(vendi|vendeu|vendas?|quantos?|quantas?|hoje|ontem|semana|mes|ano|passad[ao]|esse|este|nesse|neste)\b/g, ' '), d.produtos) : null
  if (prod) return produtoEspecifico(d, p('mes'), prod)

  // Total de vendas (o mais genérico por último)
  if (tem(/\b(quanto|qual)\b.*\b(vendi|vendeu|vendas|fatur\w*|entrou|recebi|ganhei)\b|\bfaturamento\b|\bminhas vendas\b/)) return resumoVendas(d, p('mes'))
  return null
}
