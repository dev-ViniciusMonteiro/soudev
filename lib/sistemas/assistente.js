// Assistente do MEI na Mão: responde perguntas sobre o negócio em linguagem do dia a dia.
// Cada resposta sai em dois formatos: texto para a tela (R$ 12,50) e texto para falar (12 reais e 50 centavos).
//
// Períodos entendidos: hoje, ontem, anteontem, esta semana, semana passada, últimos N dias, este mês,
// mês passado, nome do mês (com ou sem ano), este ano, ano passado, desde o começo.

import { acharProduto, normalizar, numerosPorExtenso } from './voz'
import { acharCliente } from './comandos'
import { AJUDA as AJUDA_MEI, MEI, limiteDoAno, precisaNota, proximoDAS, reaisFalado, situacaoLimite, valorDAS } from './mei'
import { addDias, brl, hojeISO, num, round2, saldos } from './regras'

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
  if (padrao === 'sempre') return { ini: '2000-01-01', fim: h, nome: 'desde o começo' }
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

/* ---------- Produtos e estoque ---------- */

const ativos = (d) => d.produtos.filter((p) => p.ativo !== false)
const saldoDe = (d) => saldos(d.movs || [])

function listaProdutos(d, t) {
  const servicos = /\bservicos?\b/.test(t) && !/\bprodutos?\b/.test(t)
  const lista = ativos(d)
    .filter((p) => (servicos ? p.tipo === 'servico' : true))
    .sort((a, b) => a.nome.localeCompare(b.nome))
  if (!lista.length) return r(() => (servicos ? 'Você não tem serviços cadastrados.' : 'Você ainda não cadastrou produtos.'))
  const nServ = lista.filter((p) => p.tipo === 'servico').length
  return r(
    () => `Você tem ${plural(lista.length, servicos ? 'serviço' : 'item', servicos ? 'serviços' : 'itens')} à venda${!servicos && nServ ? `, sendo ${plural(nServ, 'serviço', 'serviços')}` : ''}: ${lista.slice(0, 8).map((p) => p.nome).join(', ')}${lista.length > 8 ? ' e outros' : ''}.`,
    lista.slice(0, 40).map((p) => [p.nome, `${brl(p.preco)}${p.tipo === 'servico' ? ' · serviço' : ''}`]),
  )
}

function quantosProdutos(d) {
  const lista = ativos(d)
  const s = lista.filter((p) => p.tipo === 'servico').length
  return r(() => `Você tem ${plural(lista.length - s, 'produto', 'produtos')} e ${plural(s, 'serviço', 'serviços')} cadastrados.`)
}

function precoDe(p) {
  return r((m) => `${p.nome} custa ${m(p.preco)}.`)
}

function caroBarato(d, caro) {
  const lista = [...ativos(d)].sort((a, b) => (caro ? b.preco - a.preco : a.preco - b.preco))
  if (!lista.length) return r(() => 'Você ainda não cadastrou produtos.')
  return r((m) => `O ${caro ? 'mais caro' : 'mais barato'} é ${lista[0].nome}, ${m(lista[0].preco)}.`, lista.slice(0, 5).map((p) => [p.nome, brl(p.preco)]))
}

function estoqueBaixo(d, soZerados = false) {
  const s = saldoDe(d)
  const controlados = ativos(d).filter((p) => p.controla_estoque)
  if (!controlados.length) return r(() => 'Nenhum produto está com controle de estoque ligado. Ligue em Meus produtos, no produto que você quer acompanhar.')
  const lista = controlados
    .map((p) => ({ p, saldo: s.get(p.id) || 0, min: Number(p.estoque_minimo) || 0 }))
    .filter((x) => (soZerados ? x.saldo <= 0 : x.saldo <= x.min))
    .sort((a, b) => a.saldo - a.min - (b.saldo - b.min))
  if (!lista.length) return r(() => (soZerados ? 'Nenhum produto zerado. Tudo com estoque.' : 'Nenhum produto abaixo do mínimo. Estoque em dia.'))
  return r(
    () => `${soZerados ? `${plural(lista.length, 'produto está', 'produtos estão')} sem estoque` : `${plural(lista.length, 'produto precisa', 'produtos precisam')} de reposição`}: ${lista.map((x) => `${x.p.nome} (${num(x.saldo, 3)})`).join(', ')}.`,
    lista.map((x) => [x.p.nome, `${num(x.saldo, 3)} em estoque · mínimo ${num(x.min)}`]),
  )
}

function estoqueDe(d, p) {
  if (!p.controla_estoque) return r(() => `${p.nome} está sem controle de estoque. Ligue em Meus produtos para acompanhar.`)
  const saldo = saldoDe(d).get(p.id) || 0
  const min = Number(p.estoque_minimo) || 0
  return r(() => `Você tem ${plural(saldo, 'unidade', 'unidades')} de ${p.nome}.${saldo <= min ? ` Está abaixo do mínimo de ${num(min)}: hora de repor.` : ''}`)
}

function valorEstoque(d) {
  const s = saldoDe(d)
  const lista = ativos(d).filter((p) => p.controla_estoque)
  if (!lista.length) return r(() => 'Nenhum produto está com controle de estoque ligado.')
  const venda = round2(lista.reduce((t, p) => t + Math.max(0, s.get(p.id) || 0) * Number(p.preco || 0), 0))
  const custo = round2(lista.reduce((t, p) => t + Math.max(0, s.get(p.id) || 0) * Number(p.custo || 0), 0))
  return r((m) => `Seu estoque vale ${m(venda)} a preço de venda${custo ? ` e custou ${m(custo)}` : ''}.`, lista.map((p) => [p.nome, `${num(s.get(p.id) || 0, 3)} un · ${brl(Math.max(0, s.get(p.id) || 0) * Number(p.preco || 0))}`]))
}

function semFoto(d) {
  const lista = ativos(d).filter((p) => !(Array.isArray(p.visual) && p.visual.length))
  if (!lista.length) return r(() => 'A câmera já conhece todos os seus produtos.')
  return r(() => `A câmera ainda não conhece ${plural(lista.length, 'produto', 'produtos')}: ${lista.slice(0, 6).map((p) => p.nome).join(', ')}. Ensine em Meus produtos.`, lista.map((p) => [p.nome, 'sem fotos']))
}

function parados(d, dias = 30) {
  const desde = addDias(hojeISO(), -(dias - 1))
  const vendidos = new Set(porProduto(vendasDe(d, { ini: desde, fim: hojeISO() })).map((x) => x.id))
  const lista = ativos(d).filter((p) => !vendidos.has(p.id))
  if (!lista.length) return r(() => `Todos os produtos venderam nos últimos ${dias} dias.`)
  return r(() => `${plural(lista.length, 'produto não vendeu', 'produtos não venderam')} nos últimos ${dias} dias: ${lista.slice(0, 6).map((p) => p.nome).join(', ')}.`, lista.map((p) => [p.nome, brl(p.preco)]))
}

function produtosNovos(d, p) {
  const lista = ativos(d).filter((x) => dentro(hojeISO(new Date(x.criado_em)), p))
  if (!lista.length) return r(() => `Nenhum produto cadastrado ${p.nome}.`)
  return r(() => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você cadastrou ${plural(lista.length, 'produto', 'produtos')}: ${lista.map((x) => x.nome).join(', ')}.`)
}

function margens(d) {
  const lista = ativos(d)
    .filter((p) => Number(p.custo) > 0 && Number(p.preco) > 0)
    .map((p) => ({ p, margem: (Number(p.preco) - Number(p.custo)) / Number(p.preco) }))
    .sort((a, b) => b.margem - a.margem)
  if (!lista.length) return r(() => 'Para calcular o lucro de cada produto, cadastre quanto ele te custa (campo custo, em Produtos e serviços).')
  return r(() => `O produto que mais dá lucro por unidade é ${lista[0].p.nome}: ${Math.round(lista[0].margem * 100)}% do preço fica com você.`, lista.slice(0, 8).map((x) => [x.p.nome, `${Math.round(x.margem * 100)}% de margem`]))
}

/* ---------- Clientes ---------- */

function listaClientes(d) {
  const lista = [...d.clientes].sort((a, b) => a.nome.localeCompare(b.nome))
  if (!lista.length) return r(() => 'Você ainda não tem clientes cadastrados.')
  return r(() => `Você tem ${plural(lista.length, 'cliente', 'clientes')}: ${lista.slice(0, 6).map((c) => c.nome).join(', ')}${lista.length > 6 ? ' e outros' : ''}.`, lista.slice(0, 40).map((c) => [c.nome, c.telefone || 'sem telefone']))
}

function quantosClientes(d) {
  const mes = hojeISO().slice(0, 7)
  const novos = d.clientes.filter((c) => String(c.criado_em).startsWith(mes)).length
  return r(() => `Você tem ${plural(d.clientes.length, 'cliente cadastrado', 'clientes cadastrados')}${novos ? `, ${plural(novos, 'novo', 'novos')} neste mês` : ''}.`)
}

function clientesNovos(d, p) {
  const lista = d.clientes.filter((c) => dentro(hojeISO(new Date(c.criado_em)), p))
  if (!lista.length) return r(() => `Nenhum cliente novo ${p.nome}.`)
  return r(() => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} ${lista.length === 1 ? 'chegou' : 'chegaram'} ${plural(lista.length, 'cliente novo', 'clientes novos')}: ${lista.slice(0, 6).map((c) => c.nome).join(', ')}.`, lista.map((c) => [c.nome, c.telefone || '']))
}

function ultimaCompra(d) {
  const m = new Map()
  for (const v of d.vendas) {
    if (v.status !== 'concluida' || !v.cliente_id) continue
    const dia = diaDaVenda(v)
    if (!m.has(v.cliente_id) || dia > m.get(v.cliente_id)) m.set(v.cliente_id, dia)
  }
  return m
}

function clientesSumidos(d, dias = 30) {
  const ult = ultimaCompra(d)
  const limite = addDias(hojeISO(), -dias)
  const lista = d.clientes
    .filter((c) => ult.has(c.id) && ult.get(c.id) < limite)
    .map((c) => ({ c, dia: ult.get(c.id) }))
    .sort((a, b) => a.dia.localeCompare(b.dia))
  if (!lista.length) return r(() => `Nenhum cliente sumido: todos que já compraram voltaram nos últimos ${dias} dias.`)
  return r(() => `${plural(lista.length, 'cliente não compra', 'clientes não compram')} há mais de ${dias} dias: ${lista.slice(0, 5).map((x) => x.c.nome).join(', ')}. Que tal mandar uma mensagem?`, lista.map((x) => [x.c.nome, `última compra ${dataCurta(x.dia)}`]))
}

function telefoneDe(c) {
  return r(() => (c.telefone ? `O telefone de ${c.nome} é ${c.telefone}.` : `${c.nome} está sem telefone cadastrado.`))
}

function oQueCompra(d, c) {
  const vs = d.vendas.filter((v) => v.status === 'concluida' && v.cliente_id === c.id)
  if (!vs.length) return r(() => `${c.nome} ainda não comprou nada registrado.`)
  const lista = porProduto(vs).sort((a, b) => b.qtd - a.qtd)
  return r(() => `${c.nome} costuma levar ${lista.slice(0, 3).map((x) => x.nome).join(', ')}.`, lista.slice(0, 6).map((x) => [x.nome, `${num(x.qtd, 3)} un · ${brl(x.valor)}`]))
}

function ultimaCompraDe(d, c) {
  const dia = ultimaCompra(d).get(c.id)
  if (!dia) return r(() => `${c.nome} ainda não comprou nada registrado.`)
  const dias = Math.round((new Date(`${hojeISO()}T12:00`) - new Date(`${dia}T12:00`)) / 86400000)
  return r(() => `A última compra de ${c.nome} foi em ${dataCurta(dia)}${dias ? `, há ${plural(dias, 'dia', 'dias')}` : ', hoje'}.`)
}

function devedores(d) {
  const m = new Map()
  for (const l of d.lancamentos) {
    if (l.tipo !== 'receita' || l.pago_em || !l.cliente_id) continue
    m.set(l.cliente_id, round2((m.get(l.cliente_id) || 0) + Number(l.valor)))
  }
  const lista = [...m].map(([id, v]) => [d.clientes.find((c) => c.id === id)?.nome || 'Cliente', v]).sort((a, b) => b[1] - a[1])
  if (!lista.length) return r(() => 'Ninguém está devendo para você.')
  const total = lista.reduce((s, [, v]) => s + v, 0)
  return r((m2) => `${plural(lista.length, 'cliente deve', 'clientes devem')} para você, ${m2(round2(total))} no total. Quem deve mais: ${lista[0][0]}, ${m2(lista[0][1])}.`, lista.map(([n, v]) => [n, brl(v)]))
}

function aniversariantes(d) {
  const mes = hojeISO().slice(5, 7)
  const lista = d.clientes.filter((c) => String(c.nascimento || '').slice(5, 7) === mes).sort((a, b) => String(a.nascimento).slice(8).localeCompare(String(b.nascimento).slice(8)))
  if (!lista.length) return r(() => 'Nenhum cliente faz aniversário este mês (ou a data de nascimento não está cadastrada).')
  return r(() => `Fazem aniversário este mês: ${lista.map((c) => `${c.nome} (dia ${String(c.nascimento).slice(8, 10)})`).join(', ')}.`)
}

/* ---------- Vendas e gastos (extras) ---------- */

function canceladas(d, p) {
  const vs = d.vendas.filter((v) => v.status === 'cancelada' && dentro(hojeISO(new Date(v.criado_em)), p))
  return r((m) => (vs.length ? `${p.nome[0].toUpperCase()}${p.nome.slice(1)} foram ${plural(vs.length, 'venda cancelada', 'vendas canceladas')}, ${m(soma(vs, (v) => v.total))}.` : `Nenhuma venda cancelada ${p.nome}.`))
}

function mediaItens(d, p) {
  const vs = vendasDe(d, p)
  if (!vs.length) return r(() => `Nenhuma venda ${p.nome}.`)
  const itens = vs.reduce((s, v) => s + (v.itens || []).reduce((a, i) => a + Number(i.qtd), 0), 0)
  return r(() => `Cada cliente leva, em média, ${num(itens / vs.length, 1)} itens por compra ${p.nome}.`)
}

function servicosProdutos(d, p) {
  let prod = 0
  let serv = 0
  for (const v of vendasDe(d, p)) {
    for (const i of v.itens || []) {
      const valor = Number(i.preco) * Number(i.qtd)
      if (d.produtos.find((x) => x.id === i.produto_id)?.tipo === 'servico') serv += valor
      else prod += valor
    }
  }
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você vendeu ${m(round2(prod))} em produtos e ${m(round2(serv))} em serviços.`)
}

function mediaPorDia(d, p) {
  const vs = vendasDe(d, p)
  const dias = Math.max(1, Math.round((new Date(`${p.fim}T12:00`) - new Date(`${p.ini > '2000-01-02' ? p.ini : vs.reduce((m, v) => (diaDaVenda(v) < m ? diaDaVenda(v) : m), p.fim)}T12:00`)) / 86400000) + 1)
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} você vendeu, em média, ${m(round2(soma(vs, (v) => v.total) / dias))} por dia.`)
}

function listaGastos(d, p) {
  const gs = gastosDe(d, p).sort((a, b) => String(b.pago_em).localeCompare(String(a.pago_em)))
  if (!gs.length) return r(() => `Nenhum gasto anotado ${p.nome}.`)
  return r((m) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} foram ${plural(gs.length, 'gasto', 'gastos')}, ${m(soma(gs, (l) => l.valor))} no total.`, gs.slice(0, 30).map((l) => [`${dataCurta(l.pago_em)} ${l.descricao}`, brl(l.valor)]))
}

function mediaGastos(d) {
  const meses = new Map()
  for (const l of d.lancamentos) if (l.tipo === 'despesa' && l.pago_em) meses.set(l.pago_em.slice(0, 7), (meses.get(l.pago_em.slice(0, 7)) || 0) + Number(l.valor))
  if (!meses.size) return r(() => 'Nenhum gasto anotado ainda.')
  const media = [...meses.values()].reduce((s, v) => s + v, 0) / meses.size
  return r((m) => `Você gasta, em média, ${m(round2(media))} por mês (média de ${plural(meses.size, 'mês', 'meses')}).`)
}

function dasPagos(d) {
  const ano = String(new Date().getFullYear())
  const pagos = d.lancamentos.filter((l) => String(l.ref_id || '').startsWith('das:') && String(l.pago_em).startsWith(ano))
  return r((m) => (pagos.length ? `Neste ano você pagou ${plural(pagos.length, 'DAS', 'DAS')}, ${m(soma(pagos, (l) => l.valor))} no total.` : 'Nenhum DAS marcado como pago neste ano. Quando pagar, toque em Já paguei na Central MEI.'))
}

function receitasMes(d, p) {
  const r2 = { cs: 0, cc: 0, ss: 0, sc: 0 }
  for (const v of vendasDe(d, p)) {
    const nota = v.fiscal?.status === 'autorizada'
    for (const i of v.itens || []) {
      const valor = Number(i.preco) * Number(i.qtd)
      const serv = d.produtos.find((x) => x.id === i.produto_id)?.tipo === 'servico'
      r2[`${serv ? 's' : 'c'}${nota ? 'c' : 's'}`] += valor
    }
  }
  return r(
    (m) => `Para o relatório mensal ${p.nome}: comércio ${m(round2(r2.cs + r2.cc))} e serviços ${m(round2(r2.ss + r2.sc))}, total ${m(round2(r2.cs + r2.cc + r2.ss + r2.sc))}.`,
    [
      ['Comércio sem nota', brl(r2.cs)],
      ['Comércio com nota', brl(r2.cc)],
      ['Serviços sem nota', brl(r2.ss)],
      ['Serviços com nota', brl(r2.sc)],
    ],
  )
}

function explicar(t) {
  const tema = /\bdasn\b|\bdeclaracao\b/.test(t) ? 'dasn' : /\bdas\b|\bboleto\b/.test(t) ? 'das' : /\blimite\b|\bfaturar\b/.test(t) ? 'limite' : /\b(reforma|cbs|ibs)\b/.test(t) ? 'reforma' : /\brelatorio\b/.test(t) ? 'relatorio' : /\bnota\b|\bnfs?e\b/.test(t) ? 'nota' : null
  const a = AJUDA_MEI.find((x) => x.id === tema)
  if (a) return r(() => a.texto)
  if (/\bmei\b/.test(t)) return r(() => 'MEI é o Microempreendedor Individual: quem trabalha por conta própria, fatura até 81 mil reais por ano e paga um valor fixo por mês, o DAS, que já inclui o INSS. Tem CNPJ, pode emitir nota e ter até um empregado.')
  return null
}

/* ---------- Catálogo do que dá para pedir ---------- */

const AJUDA = r(() => 'Você pode perguntar sobre vendas, produtos, estoque, clientes, gastos, lucro, DAS, limite e nota. E pode mandar fazer: vender, anotar gasto, cadastrar produto ou cliente, mudar preço, dar entrada no estoque, emitir nota e imprimir o relatório. Toque em Tudo o que posso pedir para ver a lista completa.')

// tipo 'pergunta' executa direto ao tocar; 'acao' vai para o campo de texto para a pessoa ajustar antes.
export const CATALOGO = [
  {
    grupo: 'Vendas e dinheiro',
    icone: '💰',
    itens: [
      ['Quanto vendi hoje?', 'pergunta'],
      ['Quanto vendi ontem?', 'pergunta'],
      ['Quanto vendi na semana passada?', 'pergunta'],
      ['Quanto faturei em setembro?', 'pergunta'],
      ['Quantas vendas fiz hoje?', 'pergunta'],
      ['Qual o ticket médio?', 'pergunta'],
      ['Quanto vendi por dia em média?', 'pergunta'],
      ['Quanto vendi de serviços?', 'pergunta'],
      ['Vendi mais que no mês passado?', 'pergunta'],
      ['Qual o melhor dia do mês?', 'pergunta'],
      ['Qual o pior dia?', 'pergunta'],
      ['Que dia da semana vende mais?', 'pergunta'],
      ['Que horas eu vendo mais?', 'pergunta'],
      ['Quanto entrou no Pix este mês?', 'pergunta'],
      ['Qual forma de pagamento mais usada?', 'pergunta'],
      ['Qual foi a última venda?', 'pergunta'],
      ['Quantas vendas foram canceladas?', 'pergunta'],
      ['Quantos itens cada cliente leva em média?', 'pergunta'],
      ['Resumo da semana', 'pergunta'],
    ],
  },
  {
    grupo: 'Produtos e estoque',
    icone: '📦',
    itens: [
      ['Quais são meus produtos?', 'pergunta'],
      ['Quais serviços eu ofereço?', 'pergunta'],
      ['Quantos produtos eu tenho?', 'pergunta'],
      ['Quanto custa a coxinha?', 'pergunta'],
      ['Qual o produto mais caro?', 'pergunta'],
      ['Qual o produto mais barato?', 'pergunta'],
      ['Qual o produto mais vendido do mês?', 'pergunta'],
      ['Qual produto mais faturou?', 'pergunta'],
      ['O que vendeu menos?', 'pergunta'],
      ['O que não vende há 30 dias?', 'pergunta'],
      ['Quantas coxinhas vendi este mês?', 'pergunta'],
      ['Quais produtos estão com pouco estoque?', 'pergunta'],
      ['O que está sem estoque?', 'pergunta'],
      ['Quantos refrigerantes tenho no estoque?', 'pergunta'],
      ['Quanto vale meu estoque?', 'pergunta'],
      ['Qual produto dá mais lucro?', 'pergunta'],
      ['Quais produtos a câmera não conhece?', 'pergunta'],
      ['Cadastrar produto pão de queijo por 5 reais', 'acao'],
      ['Mudar o preço da coxinha para 8 reais', 'acao'],
      ['Chegaram 24 refrigerantes', 'acao'],
    ],
  },
  {
    grupo: 'Clientes',
    icone: '👥',
    itens: [
      ['Quais são meus clientes?', 'pergunta'],
      ['Quantos clientes eu tenho?', 'pergunta'],
      ['Quem são os clientes que mais compram?', 'pergunta'],
      ['Quem é meu melhor cliente este mês?', 'pergunta'],
      ['Quais clientes sumiram?', 'pergunta'],
      ['Clientes novos este mês', 'pergunta'],
      ['Quem está me devendo?', 'pergunta'],
      ['Quem faz aniversário este mês?', 'pergunta'],
      ['Qual o telefone da Ana?', 'pergunta'],
      ['O que o Escritório Silva costuma comprar?', 'pergunta'],
      ['Quando a Ana comprou pela última vez?', 'pergunta'],
      ['Cadastrar cliente Maria Souza telefone 11 99999 8888', 'acao'],
    ],
  },
  {
    grupo: 'Gastos e lucro',
    icone: '💸',
    itens: [
      ['Quanto gastei este mês?', 'pergunta'],
      ['Quais foram meus gastos?', 'pergunta'],
      ['Qual meu maior gasto?', 'pergunta'],
      ['Quanto gastei com luz?', 'pergunta'],
      ['Quanto gastei com mercadoria no mês passado?', 'pergunta'],
      ['Quanto eu gasto por mês em média?', 'pergunta'],
      ['Quanto sobrou este mês?', 'pergunta'],
      ['Quanto lucrei nos últimos 15 dias?', 'pergunta'],
      ['Gastei 50 reais de luz', 'acao'],
      ['Apagar o último gasto', 'acao'],
    ],
  },
  {
    grupo: 'MEI, DAS e nota',
    icone: '🧾',
    itens: [
      ['Quanto falta para o limite do MEI?', 'pergunta'],
      ['Como vai fechar o ano?', 'pergunta'],
      ['Quando vence o DAS?', 'pergunta'],
      ['Já paguei o DAS?', 'pergunta'],
      ['Quanto paguei de DAS este ano?', 'pergunta'],
      ['Preciso emitir nota para empresa?', 'pergunta'],
      ['Preciso emitir nota para pessoa física?', 'pergunta'],
      ['Quantas vendas tiveram nota?', 'pergunta'],
      ['Relatório mensal de setembro', 'pergunta'],
      ['O que é o DAS?', 'pergunta'],
      ['O que é a declaração anual?', 'pergunta'],
      ['O que muda com a reforma tributária?', 'pergunta'],
      ['Paguei o DAS', 'acao'],
      ['Imprimir relatório do mês passado', 'acao'],
      ['Emitir nota da última venda', 'acao'],
    ],
  },
  {
    grupo: 'Na hora de vender',
    icone: '🛍️',
    itens: [
      ['Vendi duas coxinhas e um café', 'acao'],
      ['Mais um refrigerante', 'acao'],
      ['Tira o café', 'acao'],
      ['Muda a coxinha para 3', 'acao'],
      ['Desconto de 10%', 'acao'],
      ['Desconto de 5 reais', 'acao'],
      ['Cliente Ana', 'acao'],
      ['Quanto deu?', 'acao'],
      ['Pagou no Pix', 'acao'],
      ['Pagou com 50 em dinheiro', 'acao'],
      ['Fiado', 'acao'],
      ['Finalizar', 'acao'],
      ['Com nota, CPF 529.982.247-25', 'acao'],
      ['Sem nota', 'acao'],
      ['Nova venda', 'acao'],
      ['Cancelar a venda', 'acao'],
    ],
  },
  {
    grupo: 'Ir para uma tela',
    icone: '🧭',
    itens: [
      ['Abrir vender', 'acao'],
      ['Abrir gastos', 'acao'],
      ['Ir para meus produtos', 'acao'],
      ['Abrir clientes', 'acao'],
      ['Abrir a Central MEI', 'acao'],
      ['Abrir o histórico de vendas', 'acao'],
      ['Voltar para o início', 'acao'],
    ],
  },
]

/** Perguntas prontas mostradas como atalhos na tela inicial. */
export const PERGUNTAS_PRONTAS = [
  'Quanto vendi hoje?',
  'Quanto sobrou este mês?',
  'Qual o produto mais vendido do mês?',
  'Qual meu maior gasto?',
  'Quais produtos estão com pouco estoque?',
  'Quem são os clientes que mais compram?',
  'Quanto falta para o limite do MEI?',
  'Quando vence o DAS?',
]

/** É uma pergunta? (aí o assistente tenta responder antes de tratar como ação) */
export const ehPergunta = (texto) => /^(quanto|quantos|quantas|qual|quais|quem|quando|onde|como|o que|que |por que|ja paguei|preciso|tenho que|devo|tem |existe|me (diz|fala|mostra|conta)|mostra|lista|ver |resumo|relatorio mensal|clientes novos)/.test(numerosPorExtenso(texto)) || /\?\s*$/.test(String(texto))

/**
 * Responde uma pergunta. dados = { vendas, lancamentos, produtos, clientes, movs, cfg }.
 * Devolve { tela, fala, lista } ou null se a frase não é uma pergunta conhecida.
 */
export function perguntar(texto, dados, hoje = new Date()) {
  const t = numerosPorExtenso(texto)
  const d = { movs: [], ...dados }
  const res = escolher(t, d, hoje)
  if (!res) return null
  return { tela: res.texto(brl), fala: res.texto(reaisFalado), lista: res.lista }
}

function escolher(t, d, hoje) {
  const p = (padrao) => periodoDe(t, hoje, padrao)
  const tem = (re) => re.test(t)
  const produto = () => acharProduto(t.replace(/\b(quanto|quantos?|quantas?|custa|preco|valor|estoque|tenho|tem|sobr\w*|rest\w*|vendi|vendeu|vendas?|hoje|ontem|semana|mes|ano|passad[ao]|esse|este|nesse|neste|no|na|meu|minha)\b/g, ' '), d.produtos)
  const cliente = () => acharCliente(t, d.clientes)

  if (tem(/\b(o que (voce|vc) (sabe|faz|entende)|ajuda|comandos|o que (eu )?(posso|consigo) (perguntar|falar|dizer|pedir))\b/)) return AJUDA

  // Explicações ("o que é o DAS?")
  if (tem(/\bo que (e|significa|quer dizer|muda)\b|\bcomo funciona\b|\bme explica\b/)) {
    const e = explicar(t)
    if (e) return e
  }

  if (tem(/\bquanto (ja )?paguei de das\b|\bdas (que )?(ja )?paguei\b/)) return dasPagos(d)
  if (tem(/\b(das|boleto|guia do mei)\b/)) return das(d, t)
  if (tem(/\b(limite|teto|desenquadr|quanto (ainda )?(posso|consigo) (vender|faturar)|falta (para|pro) (o )?limite)/)) return limite(d)
  if (tem(/\b(previsao|projecao|vou fechar|vai fechar|fechar o ano|no ritmo)\b/)) return previsao(d)
  if (tem(/\b(relatorio mensal|receita bruta|relatorio do mes|relatorio de)\b/)) return receitasMes(d, p('mes'))
  if (tem(/\b(preciso|tenho que|devo|obrigad|obrigatori)\w*\b.*\bnota\b|\bnota\b.*\b(obrigatori|preciso|quando)\w*/)) return regraNota(t)
  if (tem(/\b(quantas|quais) (vendas|notas)\b.*\bnota|\bcom nota\b|\bsem nota\b|\bnotas emitidas\b/)) return notasEmitidas(d, p('mes'))
  if (tem(/\bultima venda\b/)) return ultimaVenda(d)
  if (tem(/\bcancelad\w*\b/)) return canceladas(d, p('mes'))

  // Estoque (antes de "produtos", porque "produtos com pouco estoque" também fala de produtos)
  if (tem(/\b(sem estoque|acabou|acabaram|zerad\w*|esgotad\w*|em falta)\b/)) return estoqueBaixo(d, true)
  if (tem(/\b(estoque baixo|pouco estoque|baixo estoque|acabando|vai acabar|vao acabar|precis\w* (de )?repor|repor|reposicao|preciso comprar|tenho que comprar|lista de compras|faltando)\b/)) return estoqueBaixo(d)
  if (tem(/\bvalor (do|em|de) estoque\b|\bquanto (tenho|vale|tem) (em|o|no|meu)? ?estoque\b|\bquanto vale (o )?(meu )?estoque\b/)) return valorEstoque(d)
  if (tem(/\bestoque\b|\b(sobr|rest)\w*\b|\bquant[oa]s?\b.*\b(tenho|tem)\b(?!.*\bvend)/)) {
    const prod = produto()
    if (prod) return estoqueDe(d, prod)
  }
  if (tem(/\b(sem foto|camera (ainda )?(nao )?(conhece|reconhece)|nao ensinei)\b/)) return semFoto(d)

  // Gastos
  if (tem(/\b(maior|mais caro|mais pesad|pesou)\w* gasto|\bgastei mais\b|\bonde (eu )?(mais )?gast|\bcom o que (eu )?(mais )?gast|\bgasto maior\b|\bmaior despesa\b|\bcategoria\b/)) return maiorGasto(d, p('mes'))
  if (tem(/\b(gasto|gastos|despesas?) (por|em) media\b|\bmedia de gastos\b|\bgasto por mes\b|\bgasto em media\b/)) return mediaGastos(d)
  if (tem(/\b(quais|lista|listar|mostra|mostrar|ver)\b.*\b(gastos|despesas)\b|\bmeus gastos\b/)) return listaGastos(d, p('mes'))
  const cat = [
    ['contas', /\b(luz|energia|agua|internet|telefone|contas?|gas)\b/],
    ['aluguel', /\baluguel\b/],
    ['fornecedor', /\b(mercadoria|ingrediente|estoque|fornecedor|material|insumo)s?\b/],
    ['marketing', /\b(divulgacao|anuncio|propaganda|marketing)\b/],
    ['impostos', /\b(imposto|taxa)s?\b/],
  ].find(([, re]) => re.test(t))
  if (cat && tem(/\b(quanto|gastei|gasto|gastos|paguei)\b/)) return gastoCategoria(d, p('mes'), cat[0])
  if (tem(/\b(quanto|qual|quais)\b.*\b(gastei|gasto|gastos|despesas?|paguei|saiu)\b|\btotal de gastos\b/)) return totalGastos(d, p('mes'))

  // Lucro e resumo
  if (tem(/\b(da mais lucro|mais lucrativ\w*|lucro por produto|margem)\b/)) return margens(d)
  if (tem(/\b(lucro|lucrei|sobrou|sobra|ganhei|saldo|resultado|rendeu)\b/) && !tem(/\bproduto\b|\bmais\b.*\b(rendeu|lucr)/)) return lucro(d, p('mes'))
  if (tem(/\b(resumo|balanco|como (estou|esta|vai|foi|anda)|como (estao|vao) as vendas)\b/)) return resumoGeral(d, p('mes'))

  // Comparações
  if (tem(/\b(compar|cresc|caiu|cai|aument|diminu|melhor que|pior que|mais que|menos que|em relacao|versus)\w*/) && !tem(/\b(produto|cliente)\b/)) {
    const atual = t.replace(/\bmes passado\b/g, 'mes').replace(/\bsemana passada\b/g, 'semana').replace(/\bano passado\b/g, 'ano').replace(/\bontem\b/g, 'hoje')
    return comparar(d, periodoDe(atual, hoje, 'mes'))
  }

  if (tem(/\b(nao vend\w* ha|sem vender ha|nao sai ha|parad\w* ha)\b/)) return parados(d, Number(t.match(/\b(\d+) dias\b/)?.[1]) || 30)

  // Clientes
  if (tem(/\bquant[oa]s clientes\b/)) return quantosClientes(d)
  if (tem(/\bclientes? nov[oa]s?\b|\bnovos clientes\b/)) return clientesNovos(d, p('mes'))
  if (tem(/\b(me deve|me devem|devendo|devem|quem deve|fiado|pendura|a receber|tenho para receber)\b/)) return devedores(d)
  if (tem(/\baniversari\w*\b/)) return aniversariantes(d)
  if (tem(/\b(sumid\w*|sumiram|nao (volt|vem|aparec|compr)\w*|parou de comprar|pararam de comprar|faz tempo que nao)\b/) && tem(/\bclientes?\b|\bquem\b/)) {
    const dias = Number(t.match(/\b(\d+) dias\b/)?.[1]) || 30
    return clientesSumidos(d, dias)
  }
  if (tem(/\b(melhor|maior|principal|melhores|maiores|principais) clientes?\b|\bclientes? (que )?(mais )?compr\w*|\bquem (mais )?compr|\bclientes? fie/)) return melhoresClientes(d, p(/\b(mes|semana|hoje|ontem|ano|dias|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(t) ? 'mes' : 'sempre'))
  if (tem(/\b(quais|quem sao|lista|listar|mostra|mostrar|ver|todos)\b.*\bclientes\b|\bmeus clientes\b/)) return listaClientes(d)
  const c = cliente()
  if (c) {
    if (tem(/\b(telefone|contato|numero|whats|whatsapp|zap|celular|fone)\b/)) return telefoneDe(c)
    if (tem(/\b(quando|ultima vez|ultima compra|faz quanto tempo)\b/)) return ultimaCompraDe(d, c)
    if (tem(/\b(o que|costuma|prefere|gosta|leva)\b/)) return oQueCompra(d, c)
    if (tem(/\b(compr|gast|quanto|quantas|veio)\w*/)) return clienteEspecifico(d, p('mes'), c)
  }

  // Produtos
  if (tem(/\bquant[oa]s (produtos|servicos|itens) (eu )?(tenho|tem|cadastr\w*|vendo|ofereco)\b/)) return quantosProdutos(d)
  if (tem(/\b(quanto custa|quanto ta|quanto esta|qual o preco|qual e o preco|preco d[aoe]|valor d[aoe])\b/)) {
    const prod = produto()
    if (prod) return precoDe(prod)
  }
  if (tem(/\b(nao vend\w* ha|sem vender ha|nao sai ha|parad\w* ha)\b/)) return parados(d, Number(t.match(/\b(\d+) dias\b/)?.[1]) || 30)
  if (tem(/\b(menos vendid|vend\w* menos|sai menos|saiu menos|encalh|parad|nao vend|ninguem compr|nao sai)\w*/)) return rankingProdutos(d, p('mes'), { ordem: 'menos' })
  if (tem(/\b(mais fatur|faturou mais|rendeu mais|mais rend|mais dinheiro|deu mais dinheiro|traz mais)\w*/)) return rankingProdutos(d, p('mes'), { por: 'valor' })
  if (tem(/\b(mais vendid|vend\w* mais|sai mais|saiu mais|mais sai|campeao|top|ranking|preferid|carro chefe)\w*/) && !tem(/\b(dia|dias|hora|horas|horario|cliente|clientes|forma|pagamento|semana)\b/)) return rankingProdutos(d, p('mes'))
  if (tem(/\bmais caro\b/)) return caroBarato(d, true)
  if (tem(/\bmais barato\b/)) return caroBarato(d, false)
  if (tem(/\b(produtos? novos|cadastrei)\b/)) return produtosNovos(d, p('mes'))
  if (tem(/\b(quais|qual|lista|listar|mostra|mostrar|ver|todos|me (diz|fala))\b.*\b(produtos|servicos|cardapio|itens)\b|\bmeus (produtos|servicos)\b|\bo que (eu )?(vendo|ofereco)\b/)) return listaProdutos(d, t)

  // Dias e horários
  if (tem(/\bdia da semana\b|\bque dia (da semana )?(vende|vendo|movimenta)/)) return diaDaSemana(d, p('mes'))
  if (tem(/\b(pior|mais fraco|menor) dia\b|\bdia (mais )?fraco\b/)) return melhorDia(d, p('mes'), true)
  if (tem(/\b(melhor|maior) dia\b|\bdia (mais )?forte\b|\bdia que (eu )?mais vend/)) return melhorDia(d, p('mes'))
  if (tem(/\b(horario|hora|horas)\b/) && tem(/\b(pico|mais|movimento|melhor|forte|vend)\w*/)) return horarioPico(d, p('mes'))

  // Pagamentos
  const forma = tem(/\bpix\b/) ? 'pix' : tem(/\bdinheiro\b/) ? 'dinheiro' : tem(/\bcredito\b/) ? 'credito' : tem(/\bdebito\b/) ? 'debito' : null
  if (tem(/\b(forma|formas|meio|meios) de pagamento\b|\bcomo (me )?(pagam|pagaram)\b|\bmais usad/)) return formasPagamento(d, p('mes'))
  if (forma && tem(/\b(quanto|entrou|recebi|vendi|veio)\b/)) return formasPagamento(d, p('mes'), forma)

  // Números de venda
  if (tem(/\b(media de itens|itens por (venda|compra)|itens cada cliente|quantos itens)\b/)) return mediaItens(d, p('mes'))
  if (tem(/\b(por dia|media diaria|media por dia)\b/) && tem(/\bvend\w*|fatur\w*/)) return mediaPorDia(d, p('mes'))
  if (tem(/\bticket\b|\bvalor medio\b|\bmedia (por|de cada) venda\b|\bem media\b|\bgasta em media\b/)) return ticketMedio(d, p('mes'))
  if (tem(/\bquant[ao]s (vendas|pedidos|atendimentos)\b|\bquantas vezes vendi\b|\bnumero de vendas\b/)) return quantidadeVendas(d, p('mes'))
  if (tem(/\bservicos?\b/) && tem(/\b(quanto|vendi|fatur\w*)\b/)) return servicosProdutos(d, p('mes'))

  // Produto específico: "quantas coxinhas vendi", "quanto vendi de brigadeiro"
  const prod = tem(/\b(quant|vend|saiu|sairam|sai)\w*/) ? acharProduto(t.replace(/\b(vendi|vendeu|vendas?|quantos?|quantas?|hoje|ontem|semana|mes|ano|passad[ao]|esse|este|nesse|neste)\b/g, ' '), d.produtos) : null
  if (prod) return produtoEspecifico(d, p('mes'), prod)

  // Total de vendas (o mais genérico por último)
  if (tem(/\b(quanto|qual)\b.*\b(vendi|vendeu|vendas|fatur\w*|entrou|recebi|ganhei|deu|fiz)\b|\bfaturamento\b|\bminhas vendas\b/)) return resumoVendas(d, p('mes'))
  return null
}
