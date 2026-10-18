// Dados de demonstração de cada nicho, gerados em volta da data de hoje para o painel sempre ter movimento.

import { addDias, codigoPublico, hojeISO, localISO, round2, vencimentoDoMes } from './regras'
import { montarChave } from './fiscal'

function rng(semente) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NOMES = [
  'Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Eduarda Alves', 'Felipe Costa', 'Gabriela Martins', 'Henrique Dias',
  'Isabela Ferreira', 'João Pedro Santos', 'Karina Oliveira', 'Lucas Ribeiro', 'Mariana Gomes', 'Nicolas Barbosa', 'Olívia Cardoso',
  'Paulo Henrique', 'Rafaela Teixeira', 'Samuel Nunes', 'Tatiane Moreira', 'Vinícius Araújo', 'Yasmin Castro', 'Rodrigo Pires',
  'Letícia Campos', 'Marcos Vieira', 'Juliana Freitas', 'Thiago Correia', 'Beatriz Lopes', 'Caio Monteiro', 'Fernanda Rezende', 'Gustavo Prado',
]
const BAIRROS = ['Centro', 'Vila Nova', 'Jardim América', 'Santa Cruz', 'Boa Vista', 'São José', 'Parque das Flores', 'Vila Mariana']
const RUAS = ['Rua das Flores', 'Av. Brasil', 'Rua São Paulo', 'Rua XV de Novembro', 'Av. Independência', 'Rua Sete de Setembro']

function ean13(base12) {
  const d = String(base12).padStart(12, '0').slice(0, 12)
  const soma = [...d].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0)
  return d + ((10 - (soma % 10)) % 10)
}

class Gerador {
  constructor(slug) {
    let h = 0
    for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0
    this.r = rng(h)
    this.pares = []
    this.seq = {}
  }
  int(a, b) {
    return a + Math.floor(this.r() * (b - a + 1))
  }
  pick(arr) {
    return arr[Math.floor(this.r() * arr.length)]
  }
  chance(p) {
    return this.r() < p
  }
  id() {
    return `${Date.now().toString(36)}-${Math.floor(this.r() * 1e12).toString(36)}-${(this.pares.length + 1).toString(36)}`
  }
  add(t, r) {
    r.id ||= this.id()
    this.pares.push([t, r])
    return r
  }
  numero(t) {
    this.seq[t] = (this.seq[t] || 0) + 1
    return this.seq[t]
  }
  /** Data/hora local `dias` atrás (negativo = futuro). */
  quando(dias, h, m = 0) {
    const d = new Date()
    d.setDate(d.getDate() - dias)
    d.setHours(h, m, 0, 0)
    return d
  }
  tel() {
    return `(11) 9${this.int(6000, 9999)}-${this.int(1000, 9999)}`
  }
}

function clientes(g, qtd, extra = () => ({})) {
  return NOMES.slice(0, qtd).map((nome, i) =>
    g.add('clientes', {
      nome,
      telefone: g.tel(),
      email: i % 3 === 0 ? `${nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@exemplo.com` : '',
      bairro: g.pick(BAIRROS),
      endereco: `${g.pick(RUAS)}, ${g.int(10, 1500)}`,
      criado_em: g.quando(g.int(30, 300), 10).toISOString(),
      ...extra(i),
    }),
  )
}

function categorias(g, nomes) {
  return nomes.map((nome, i) => g.add('categorias', { nome, ordem: i + 1 }))
}

function produtos(g, cats, lista) {
  return lista.map(([cat, nome, preco, custo, extra = {}]) =>
    g.add('produtos', {
      nome,
      categoria_id: cats[cat]?.id ?? '',
      tipo: 'produto',
      preco,
      custo,
      unidade: 'un',
      ativo: true,
      publicado: true,
      ...extra,
    }),
  )
}

function despesas(g) {
  const hoje = new Date()
  for (let mes = -2; mes <= 1; mes++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + mes, 1)
    const ano = d.getFullYear()
    const m = d.getMonth() + 1
    const passado = mes < 0 || (mes === 0 && hoje.getDate() > 10)
    const fixo = [
      ['Aluguel do ponto', 2800, 5, 'aluguel'],
      ['Energia elétrica', g.int(380, 620), 12, 'contas'],
      ['Internet e telefone', 129.9, 15, 'contas'],
      ['Contador', 450, 20, 'outros'],
      ['Simples Nacional', g.int(300, 900), 20, 'impostos'],
    ]
    for (const [descricao, valor, dia, categoria] of fixo) {
      const vencimento = vencimentoDoMes(ano, m, dia)
      const pago = mes < 0 || (mes === 0 && vencimento < hojeISO() && (passado || g.chance(0.7)))
      g.add('lancamentos', { tipo: 'despesa', descricao, valor, vencimento, pago_em: pago ? vencimento : '', categoria, forma: pago ? 'pix' : '' })
    }
  }
}

function config(g, valores) {
  const base = {
    whatsapp: '11999990000',
    empresa_telefone: '(11) 3333-0000',
    endereco: 'Rua das Flores, 120 - Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    documento: '11.222.333/0001-81',
    ie: '110.042.490.114',
    im: '1.234.567-8',
    regime: 'simples',
    pix_chave: 'pix@exemplo.com.br',
    pix_nome: 'Loja Exemplo',
    emails_notificacao: '',
    abre: '09:00',
    fecha: '19:00',
    dias: '1,2,3,4,5,6',
    intervalo_agenda: 30,
    ...valores,
  }
  for (const [id, valor] of Object.entries(base)) g.add('config', { id, valor })
  g.add('usuarios', { email: 'dono@exemplo.com', nome: 'Dono da loja', papel: 'dono', ativo: true })
}

const FORMAS = ['dinheiro', 'pix', 'pix', 'debito', 'credito', 'credito']

/** Venda concluída com pagamento numa forma só. */
function venda(g, { quando, cliente, itens, origem = 'pdv', caixa, forma = g.pick(FORMAS), extra = {} }) {
  // Venda "de hoje" nunca fica no futuro.
  if (quando > new Date()) quando = new Date(Date.now() - g.int(5, 120) * 60000)
  const subtotal = round2(itens.reduce((s, i) => s + i.preco * i.qtd, 0))
  const taxa = extra.taxa_entrega || 0
  const total = round2(subtotal + taxa - (extra.desconto || 0))
  const pago = forma === 'dinheiro' ? Math.ceil(total / 10) * 10 : total
  return g.add('vendas', {
    numero: g.numero('vendas'),
    codigo_publico: codigoPublico(),
    cliente_id: cliente?.id ?? '',
    cliente_nome: cliente?.nome ?? '',
    telefone: cliente?.telefone ?? '',
    itens,
    subtotal,
    desconto: 0,
    taxa_entrega: 0,
    total,
    pagamentos: [{ forma, valor: pago }],
    troco: round2(pago - total),
    status: 'concluida',
    origem,
    caixa_id: caixa?.id ?? '',
    criado_em: quando.toISOString(),
    concluida_em: quando.toISOString(),
    operador: 'dono@exemplo.com',
    ...extra,
  })
}

const item = (p, qtd = 1) => ({ produto_id: p.id, nome: p.nome, qtd, preco: p.preco })

/** Caixas fechados nos dias anteriores e um aberto hoje. */
function caixas(g, dias) {
  const lista = []
  for (let d = dias; d >= 0; d--) {
    const aberto = d === 0
    lista[d] = g.add('caixas', {
      aberto_em: g.quando(d, 8, 30).toISOString(),
      fechado_em: aberto ? '' : g.quando(d, 22, 10).toISOString(),
      valor_inicial: 150,
      status: aberto ? 'aberto' : 'fechado',
      operador: 'dono@exemplo.com',
      criado_em: g.quando(d, 8, 30).toISOString(),
    })
  }
  return lista
}

/* ---------- Nichos ---------- */

function restaurante(g) {
  config(g, { empresa_nome: 'Burger da Vila', pix_nome: 'Burger da Vila', abre: '18:00', fecha: '23:30', dias: '0,2,3,4,5,6', taxa_entrega: 6, pedido_minimo: 25, tempo_entrega: '35 a 50 min', mesas: 12, taxa_servico: 10, loja_aberta: true })
  const cs = clientes(g, 22)
  const cat = categorias(g, ['Hambúrgueres', 'Combos', 'Porções', 'Bebidas', 'Sobremesas'])
  const add = 'Bacon:4; Cheddar extra:3; Ovo:2,5; Hambúrguer extra:9; Cebola caramelizada:3'
  const ps = produtos(g, cat, [
    [0, 'X-Burger Clássico', 24.9, 9.5, { descricao: 'Pão brioche, blend 150 g, queijo prato, alface, tomate e molho da casa.', adicionais: add }],
    [0, 'X-Bacon Crocante', 29.9, 12, { descricao: 'Blend 150 g, muito bacon, cheddar e maionese defumada.', adicionais: add }],
    [0, 'Smash Duplo', 32.9, 13, { descricao: 'Dois smash de 90 g, cheddar duplo e cebola na chapa.', adicionais: add }],
    [0, 'Chicken Crispy', 27.9, 10, { descricao: 'Frango empanado crocante, salada e maionese de alho.', adicionais: add }],
    [0, 'Veggie da Vila', 28.9, 11, { descricao: 'Hambúrguer de grão-de-bico, rúcula, tomate seco e queijo.', adicionais: add }],
    [1, 'Combo Clássico + Fritas + Refri', 38.9, 15, { descricao: 'X-Burger Clássico, fritas pequena e refrigerante lata.' }],
    [1, 'Combo Casal', 79.9, 31, { descricao: '2 hambúrgueres à escolha, fritas grande e 2 refrigerantes.' }],
    [2, 'Batata Frita', 18.9, 5, { descricao: 'Porção de 400 g.', adicionais: 'Cheddar e bacon:8; Molho especial:3' }],
    [2, 'Onion Rings', 22.9, 7, { descricao: 'Anéis de cebola empanados.' }],
    [2, 'Nuggets (10 un)', 19.9, 6],
    [3, 'Refrigerante Lata', 6.5, 2.8, { controla_estoque: true, estoque_minimo: 24 }],
    [3, 'Suco Natural 500 ml', 11.9, 3.5],
    [3, 'Água Mineral', 4.5, 1.2, { controla_estoque: true, estoque_minimo: 12 }],
    [3, 'Milk-shake Ovomaltine', 19.9, 6],
    [4, 'Brownie com Sorvete', 17.9, 5.5],
    [4, 'Petit Gâteau', 21.9, 6.5],
  ])
  for (const p of ps.filter((p) => p.controla_estoque)) g.add('estoque_mov', { produto_id: p.id, qtd: 120, motivo: 'compra', custo_unit: p.custo, criado_em: g.quando(20, 10).toISOString() })
  const cx = caixas(g, 29)
  for (let d = 29; d >= 0; d--) {
    const dia = g.quando(d, 12).getDay()
    if (dia === 1) continue
    const n = d === 0 ? 6 : g.int(9, 22) + (dia >= 5 || dia === 0 ? 8 : 0)
    for (let i = 0; i < n; i++) {
      const itens = [item(g.pick(ps.slice(0, 7)), g.int(1, 2))]
      if (g.chance(0.6)) itens.push(item(g.pick(ps.slice(7, 10))))
      if (g.chance(0.7)) itens.push(item(g.pick(ps.slice(10, 14)), g.int(1, 3)))
      const origem = g.pick(['cardapio', 'cardapio', 'pdv', 'mesa'])
      const cliente = origem === 'cardapio' ? g.pick(cs) : g.chance(0.3) ? g.pick(cs) : null
      const entrega = origem === 'cardapio' ? g.pick(['entrega', 'entrega', 'retirada']) : origem === 'mesa' ? 'local' : 'retirada'
      venda(g, {
        quando: g.quando(d, g.int(18, 22), g.int(0, 59)),
        cliente,
        itens,
        origem,
        caixa: cx[d],
        extra: {
          etapa: origem === 'cardapio' ? 'entregue' : '',
          entrega,
          taxa_entrega: entrega === 'entrega' ? 6 : 0,
          endereco: entrega === 'entrega' ? `${cliente?.endereco} - ${cliente?.bairro}` : '',
          mesa: origem === 'mesa' ? g.int(1, 12) : '',
        },
      })
    }
  }
  // Pedidos de agora, um em cada etapa do painel.
  const agora = new Date()
  const etapas = ['novo', 'novo', 'preparo', 'preparo', 'pronto', 'saiu']
  etapas.forEach((etapa, i) => {
    const c = cs[i + 3]
    const itens = [item(ps[i % 5], 1 + (i % 2)), item(ps[7]), item(ps[10], 2)]
    const subtotal = round2(itens.reduce((s, x) => s + x.preco * x.qtd, 0))
    const entrega = i === 2 || i === 4 ? 'retirada' : 'entrega'
    const taxa = entrega === 'entrega' ? 6 : 0
    g.add('vendas', {
      numero: g.numero('vendas'),
      codigo_publico: codigoPublico(),
      cliente_id: c.id,
      cliente_nome: c.nome,
      telefone: c.telefone,
      itens,
      subtotal,
      desconto: 0,
      taxa_entrega: taxa,
      total: round2(subtotal + taxa),
      pagamentos: [],
      status: 'aberta',
      etapa,
      origem: 'cardapio',
      entrega,
      endereco: entrega === 'entrega' ? `${c.endereco} - ${c.bairro}` : '',
      pagamento_previsto: g.pick(['Pix', 'Cartão na entrega', 'Dinheiro (troco para R$ 100)']),
      criado_em: new Date(agora.getTime() - (40 - i * 6) * 60000).toISOString(),
    })
  })
  // Duas mesas abertas.
  for (const [mesa, qtds] of [[3, [ps[1], ps[2], ps[7], ps[10], ps[10]]], [7, [ps[6], ps[13]]]]) {
    const itens = qtds.map((p) => item(p))
    g.add('vendas', {
      numero: g.numero('vendas'),
      itens,
      subtotal: round2(itens.reduce((s, x) => s + x.preco, 0)),
      total: round2(itens.reduce((s, x) => s + x.preco, 0)),
      pagamentos: [],
      status: 'aberta',
      origem: 'mesa',
      entrega: 'local',
      mesa,
      criado_em: new Date(agora.getTime() - 50 * 60000).toISOString(),
    })
  }
  g.add('lancamentos', { tipo: 'despesa', descricao: 'Açougue Boi Bom (carnes)', valor: 1860, vencimento: addDias(hojeISO(), 3), categoria: 'fornecedor' })
  despesas(g)
}

function mercadinho(g) {
  config(g, { empresa_nome: 'Mercadinho Bom Preço', pix_nome: 'Mercadinho Bom Preco', abre: '07:00', fecha: '21:00', dias: '0,1,2,3,4,5,6' })
  const cs = clientes(g, 24, (i) => ({ limite_fiado: i % 4 === 0 ? 300 : 0 }))
  const forn = ['Distribuidora Paulista', 'Atacadão Central', 'Laticínios Serra Azul', 'Hortifruti Vale Verde'].map((nome, i) =>
    g.add('fornecedores', { nome, cnpj: `12.345.67${i}/0001-${10 + i}`, contato: g.pick(NOMES), telefone: g.tel() }),
  )
  const cat = categorias(g, ['Mercearia', 'Bebidas', 'Laticínios', 'Limpeza', 'Higiene', 'Padaria', 'Hortifruti'])
  let ean = 789100000000
  const prod = (c, nome, preco, custo, min = 6, extra = {}) => [c, nome, preco, custo, { codigo_barras: ean13(ean++), controla_estoque: true, estoque_minimo: min, publicado: false, ...extra }]
  const ps = produtos(g, cat, [
    prod(0, 'Arroz Tipo 1 5 kg', 27.9, 21.5, 10),
    prod(0, 'Feijão Carioca 1 kg', 8.49, 6.1, 12),
    prod(0, 'Açúcar Refinado 1 kg', 4.99, 3.6, 10),
    prod(0, 'Café Torrado 500 g', 18.9, 13.8, 8),
    prod(0, 'Óleo de Soja 900 ml', 7.49, 5.6, 12),
    prod(0, 'Macarrão Espaguete 500 g', 4.29, 2.9, 12),
    prod(0, 'Molho de Tomate 340 g', 2.99, 1.9, 12),
    prod(1, 'Refrigerante Cola 2 L', 10.9, 7.4, 12),
    prod(1, 'Água Mineral 1,5 L', 3.49, 1.9, 24),
    prod(1, 'Cerveja Lata 350 ml', 3.99, 2.7, 48),
    prod(1, 'Suco de Caixinha 1 L', 6.99, 4.5, 8),
    prod(2, 'Leite Integral 1 L', 5.49, 4.2, 24),
    prod(2, 'Queijo Mussarela kg', 49.9, 36, 2, { unidade: 'kg' }),
    prod(2, 'Iogurte Morango 900 g', 9.9, 6.8, 6),
    prod(2, 'Manteiga 200 g', 12.9, 9.2, 6),
    prod(3, 'Detergente 500 ml', 2.79, 1.7, 12),
    prod(3, 'Sabão em Pó 1,6 kg', 21.9, 15.9, 6),
    prod(3, 'Água Sanitária 2 L', 6.49, 4.1, 8),
    prod(4, 'Papel Higiênico 12 rolos', 19.9, 14.2, 8),
    prod(4, 'Creme Dental 90 g', 4.99, 3.1, 10),
    prod(4, 'Sabonete 85 g', 2.49, 1.5, 12),
    prod(5, 'Pão Francês kg', 16.9, 8, 0, { unidade: 'kg', controla_estoque: false }),
    prod(5, 'Bolo de Fubá', 14.9, 6, 0, { controla_estoque: false }),
    prod(6, 'Banana Prata kg', 6.99, 4, 0, { unidade: 'kg', controla_estoque: false }),
    prod(6, 'Tomate kg', 8.99, 5.5, 0, { unidade: 'kg', controla_estoque: false }),
  ])
  for (const p of ps.filter((p) => p.controla_estoque)) {
    g.add('estoque_mov', { produto_id: p.id, qtd: g.int(20, 90), motivo: 'compra', custo_unit: p.custo, fornecedor_id: g.pick(forn).id, criado_em: g.quando(30, 9).toISOString() })
  }
  const cx = caixas(g, 29)
  for (let d = 29; d >= 0; d--) {
    const n = d === 0 ? 14 : g.int(25, 45)
    for (let i = 0; i < n; i++) {
      const itens = []
      const qtdItens = g.int(1, 6)
      for (let k = 0; k < qtdItens; k++) {
        const p = g.pick(ps)
        if (itens.some((x) => x.produto_id === p.id)) continue
        itens.push(item(p, p.unidade === 'kg' ? round2(g.int(3, 15) / 10) : g.int(1, 3)))
      }
      const fiado = g.chance(0.05)
      const cliente = fiado ? g.pick(cs.filter((c) => c.limite_fiado)) : g.chance(0.15) ? g.pick(cs) : null
      const v = venda(g, { quando: g.quando(d, g.int(7, 20), g.int(0, 59)), cliente, itens, caixa: cx[d], forma: fiado ? 'fiado' : g.pick(FORMAS) })
      for (const it of itens) {
        const p = ps.find((x) => x.id === it.produto_id)
        if (p.controla_estoque) g.add('estoque_mov', { produto_id: p.id, qtd: -it.qtd, motivo: 'venda', ref_id: v.id, criado_em: v.criado_em })
      }
      if (fiado) {
        const pago = d > 20 && g.chance(0.6)
        g.add('lancamentos', {
          tipo: 'receita',
          descricao: `Fiado venda #${v.numero} - ${cliente.nome}`,
          valor: v.total,
          vencimento: addDias(hojeISO(g.quando(d, 12)), 30),
          pago_em: pago ? hojeISO(g.quando(d - 10, 12)) : '',
          categoria: 'fiado',
          cliente_id: cliente.id,
          ref_id: v.id,
        })
      }
    }
  }
  g.add('lancamentos', { tipo: 'despesa', descricao: 'Distribuidora Paulista - NF 4521', valor: 3240.5, vencimento: addDias(hojeISO(), 5), categoria: 'fornecedor', fornecedor_id: forn[0].id })
  g.add('lancamentos', { tipo: 'despesa', descricao: 'Laticínios Serra Azul - NF 889', valor: 980, vencimento: addDias(hojeISO(), -2), categoria: 'fornecedor', fornecedor_id: forn[2].id })
  despesas(g)
}

function agendaComVendas(g, { cs, servicos, extras, profs, diasPassados = 30, diasFuturos = 6, porDia = [4, 9], pets = null }) {
  const cfgAbre = 9
  for (let d = diasPassados; d >= -diasFuturos; d--) {
    const data = g.quando(d, 12)
    if (data.getDay() === 0) continue
    for (const prof of profs) {
      let hora = cfgAbre * 60 + g.int(0, 2) * 30
      const n = g.int(porDia[0], porDia[1])
      for (let i = 0; i < n && hora < 18 * 60; i++) {
        const s = g.pick(servicos)
        const dur = s.duracao_min || 30
        const inicio = g.quando(d, Math.floor(hora / 60), hora % 60)
        const fim = new Date(inicio.getTime() + dur * 60000)
        const c = g.pick(cs)
        const pet = pets ? g.pick(pets.filter((p) => p.cliente_id === c.id).concat(pets).slice(0, 1)) : null
        const passado = d > 0 || (d === 0 && fim < new Date())
        const status = passado ? (g.chance(0.08) ? 'faltou' : 'concluido') : d === 0 || d === -1 ? g.pick(['confirmado', 'agendado']) : 'agendado'
        const ag = g.add('agendamentos', {
          inicio: localISO(inicio),
          fim: localISO(fim),
          profissional_id: prof.id,
          servico_id: s.id,
          cliente_id: c.id,
          cliente_nome: c.nome,
          telefone: c.telefone,
          pet_id: pet?.id ?? '',
          valor: s.preco,
          status,
          origem: g.chance(0.4) ? 'online' : 'balcao',
          criado_em: g.quando(d + g.int(1, 6), 10).toISOString(),
        })
        if (status === 'concluido') {
          const itens = [item(s)]
          if (extras.length && g.chance(0.25)) itens.push(item(g.pick(extras)))
          const v = venda(g, { quando: fim, cliente: c, itens, origem: 'agenda', extra: { profissional_id: prof.id, ref_id: ag.id } })
          ag.venda_id = v.id
        }
        hora += dur + g.pick([0, 0, 30, 60])
      }
    }
  }
}

function barbearia(g) {
  config(g, { empresa_nome: 'Barbearia Navalha de Ouro', pix_nome: 'Navalha de Ouro', abre: '09:00', fecha: '20:00', intervalo_agenda: 30 })
  const cs = clientes(g, 30)
  const cat = categorias(g, ['Cabelo', 'Barba', 'Tratamentos', 'Produtos'])
  const profs = [
    ['Rafael "Rafa" Duarte', 'Barbeiro', 45, '#67e8f9'],
    ['Wesley Santos', 'Barbeiro', 40, '#a78bfa'],
    ['Camila Torres', 'Cabeleireira', 40, '#f472b6'],
  ].map(([nome, funcao, comissao_pct, cor]) => g.add('profissionais', { nome, funcao, comissao_pct, cor, telefone: g.tel(), ativo: true, publicado: true }))
  const serv = (c, nome, preco, duracao_min, comissao_pct = 0) => [c, nome, preco, 0, { tipo: 'servico', duracao_min, comissao_pct }]
  const ss = produtos(g, cat, [
    serv(0, 'Corte masculino', 45, 30),
    serv(0, 'Corte + barba', 70, 60),
    serv(1, 'Barba completa', 35, 30),
    serv(0, 'Corte infantil', 35, 30),
    serv(0, 'Sobrancelha', 15, 30),
    serv(2, 'Pigmentação', 50, 30),
    serv(2, 'Hidratação capilar', 40, 30),
    serv(2, 'Platinado', 160, 120, 35),
  ])
  const extras = produtos(g, cat, [
    [3, 'Pomada modeladora', 39.9, 18, { controla_estoque: true, estoque_minimo: 5, publicado: false }],
    [3, 'Óleo para barba', 34.9, 15, { controla_estoque: true, estoque_minimo: 5, publicado: false }],
    [3, 'Shampoo anticaspa', 29.9, 12, { controla_estoque: true, estoque_minimo: 5, publicado: false }],
  ])
  for (const p of extras) g.add('estoque_mov', { produto_id: p.id, qtd: 25, motivo: 'compra', custo_unit: p.custo, criado_em: g.quando(30, 9).toISOString() })
  caixas(g, 0)
  agendaComVendas(g, { cs, servicos: ss.slice(0, 7), extras, profs, porDia: [4, 8] })
  despesas(g)
}

function assistencia(g) {
  config(g, { empresa_nome: 'TecFix Assistência Técnica', pix_nome: 'TecFix', abre: '09:00', fecha: '18:00' })
  const cs = clientes(g, 22)
  const cat = categorias(g, ['Telas', 'Baterias', 'Conectores', 'Acessórios', 'Mão de obra'])
  const pecas = produtos(g, cat, [
    [0, 'Tela iPhone 11', 389, 210, { controla_estoque: true, estoque_minimo: 2, publicado: false }],
    [0, 'Tela Galaxy A54', 459, 260, { controla_estoque: true, estoque_minimo: 2, publicado: false }],
    [0, 'Tela Moto G84', 299, 150, { controla_estoque: true, estoque_minimo: 2, publicado: false }],
    [1, 'Bateria iPhone 12', 219, 95, { controla_estoque: true, estoque_minimo: 3, publicado: false }],
    [1, 'Bateria Galaxy A32', 149, 60, { controla_estoque: true, estoque_minimo: 3, publicado: false }],
    [2, 'Conector de carga USB-C', 89, 25, { controla_estoque: true, estoque_minimo: 5, publicado: false }],
    [3, 'Película 3D', 39.9, 6, { controla_estoque: true, estoque_minimo: 10, publicado: false }],
    [3, 'Capinha anti-impacto', 49.9, 12, { controla_estoque: true, estoque_minimo: 10, publicado: false }],
  ])
  const servicos = produtos(g, cat, [
    [4, 'Mão de obra: troca de tela', 80, 0, { tipo: 'servico', publicado: false }],
    [4, 'Mão de obra: troca de bateria', 60, 0, { tipo: 'servico', publicado: false }],
    [4, 'Formatação e backup', 120, 0, { tipo: 'servico', publicado: false }],
    [4, 'Limpeza interna (oxidação)', 150, 0, { tipo: 'servico', publicado: false }],
    [4, 'Diagnóstico', 50, 0, { tipo: 'servico', publicado: false }],
  ])
  for (const p of pecas) g.add('estoque_mov', { produto_id: p.id, qtd: g.int(4, 15), motivo: 'compra', custo_unit: p.custo, criado_em: g.quando(40, 9).toISOString() })
  const aparelhos = [
    ['Celular', 'iPhone 11', 'Tela quebrada, touch falhando', 0, 0],
    ['Celular', 'Galaxy A54', 'Tela trincada após queda', 1, 0],
    ['Celular', 'iPhone 12', 'Bateria descarregando muito rápido', 3, 1],
    ['Celular', 'Moto G84', 'Não carrega, precisa mexer no cabo', 5, null],
    ['Notebook', 'Dell Inspiron 15', 'Muito lento, quer formatar sem perder fotos', null, 2],
    ['Celular', 'Galaxy A32', 'Bateria estufada', 4, 1],
    ['Celular', 'iPhone 11', 'Caiu na água, não liga', null, 3],
    ['Tablet', 'iPad 9ª geração', 'Não liga', null, 4],
    ['Celular', 'Moto G84', 'Tela com manchas', 2, 0],
  ]
  const status = ['aberta', 'orcamento', 'aprovada', 'execucao', 'pronta', 'entregue', 'entregue', 'entregue', 'entregue', 'aberta', 'pronta', 'entregue', 'execucao', 'entregue', 'cancelada', 'entregue', 'entregue', 'orcamento']
  status.forEach((st, i) => {
    const [equipamento, marca_modelo, defeito, peca, serv] = aparelhos[i % aparelhos.length]
    const c = cs[i % cs.length]
    const d = st === 'entregue' ? g.int(3, 40) : g.int(0, 6)
    const itens = []
    if (peca !== null) itens.push(item(pecas[peca]))
    if (serv !== null) itens.push(item(servicos[serv]))
    const total = round2(itens.reduce((s, x) => s + x.preco * x.qtd, 0))
    const os = g.add('ordens', {
      numero: g.numero('ordens'),
      codigo_publico: codigoPublico(),
      cliente_id: c.id,
      equipamento,
      marca_modelo,
      serie: equipamento === 'Celular' ? `35${g.int(1000000, 9999999)}${g.int(1000000, 9999999)}` : `SN${g.int(100000, 999999)}`,
      acessorios: g.pick(['Nenhum', 'Capinha', 'Carregador', 'Capinha e chip']),
      defeito,
      laudo: ['aberta'].includes(st) ? '' : `Verificado: ${defeito.toLowerCase()}. ${itens.length ? 'Necessária troca/serviço listado abaixo.' : ''}`,
      checklist: { liga: g.chance(0.7), tela: g.chance(0.4), camera: true, som: true, wifi: g.chance(0.8), carrega: g.chance(0.6) },
      itens,
      total,
      status: st,
      previsao: addDias(hojeISO(), st === 'entregue' ? -d : g.int(1, 5)),
      tecnico: g.pick(['Marcos', 'Aline']),
      garantia_dias: 90,
      criado_em: g.quando(d + 2, g.int(9, 17), g.int(0, 59)).toISOString(),
    })
    if (st === 'entregue') {
      const v = venda(g, { quando: g.quando(d, g.int(10, 18)), cliente: c, itens, origem: 'os', extra: { ref_id: os.id } })
      os.venda_id = v.id
      for (const it of itens) {
        if (pecas.some((p) => p.id === it.produto_id)) g.add('estoque_mov', { produto_id: it.produto_id, qtd: -it.qtd, motivo: 'os', ref_id: os.id, criado_em: v.criado_em })
      }
    }
  })
  caixas(g, 0)
  for (let d = 25; d >= 0; d -= 1) {
    if (g.chance(0.5)) venda(g, { quando: g.quando(d, g.int(9, 17)), cliente: null, itens: [item(g.pick(pecas.slice(6)), g.int(1, 2))] })
  }
  despesas(g)
}

function academia(g) {
  config(g, { empresa_nome: 'Studio Movimento Fitness', pix_nome: 'Studio Movimento', abre: '06:00', fecha: '22:00', multa_atraso: 2 })
  const cs = clientes(g, 30, (i) => ({ objetivo: ['emagrecer', 'hipertrofia', 'saude', 'performance'][i % 4] }))
  const planos = [
    ['Mensal livre', 109.9, 1, 0],
    ['Trimestral livre', 94.9, 3, 0],
    ['Anual livre', 79.9, 12, 0],
    ['Pilates 2x por semana', 220, 1, 2],
    ['Funcional 3x por semana', 149.9, 1, 3],
  ].map(([nome, valor, meses, aulas_semana]) => g.add('planos', { nome, valor, meses, aulas_semana, ativo: true }))
  const cat = categorias(g, ['Bebidas', 'Suplementos', 'Acessórios'])
  const loja = produtos(g, cat, [
    [0, 'Água 500 ml', 3.5, 1.1, { controla_estoque: true, estoque_minimo: 24, publicado: false }],
    [0, 'Isotônico', 7.5, 3.6, { controla_estoque: true, estoque_minimo: 12, publicado: false }],
    [1, 'Dose de whey', 9, 3.5, { publicado: false }],
    [1, 'Barra de proteína', 8.9, 4.2, { controla_estoque: true, estoque_minimo: 10, publicado: false }],
    [2, 'Toalha de treino', 29.9, 12, { publicado: false }],
  ])
  for (const p of loja.filter((x) => x.controla_estoque)) g.add('estoque_mov', { produto_id: p.id, qtd: 80, motivo: 'compra', custo_unit: p.custo, criado_em: g.quando(30, 9).toISOString() })
  const cxs = caixas(g, 29)
  for (let d = 29; d >= 0; d--) {
    for (let i = 0; i < g.int(2, 7); i++) {
      const p = g.pick(loja)
      const v = venda(g, { quando: g.quando(d, g.int(6, 21), g.int(0, 59)), cliente: g.chance(0.5) ? g.pick(cs) : null, itens: [item(p, g.int(1, 2))], caixa: cxs[d] })
      if (p.controla_estoque) g.add('estoque_mov', { produto_id: p.id, qtd: -v.itens[0].qtd, motivo: 'venda', ref_id: v.id, criado_em: v.criado_em })
    }
  }
  const hoje = new Date()
  cs.forEach((c, i) => {
    const plano = planos[i % planos.length]
    const status = i === 7 ? 'trancada' : i === 19 ? 'cancelada' : 'ativa'
    const inicio = addDias(hojeISO(), -g.int(70, 400))
    const dia = g.pick([5, 10, 15, 20])
    const desconto = i % 9 === 0 ? 10 : 0
    const m = g.add('matriculas', { cliente_id: c.id, plano_id: plano.id, inicio, dia_vencimento: dia, desconto, status })
    if (status !== 'ativa') return
    const devedor = i % 6 === 2
    for (let k = -2; k <= 0; k++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1)
      const vencimento = vencimentoDoMes(d.getFullYear(), d.getMonth() + 1, dia)
      const venceu = vencimento < hojeISO()
      const pago = !devedor && (venceu ? g.chance(0.95) : g.chance(0.4))
      g.add('lancamentos', {
        tipo: 'receita',
        descricao: `Mensalidade ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} - ${c.nome}`,
        valor: round2(plano.valor - desconto),
        vencimento,
        pago_em: pago ? addDias(vencimento, -g.int(0, 3)) : '',
        forma: pago ? g.pick(['pix', 'credito', 'dinheiro']) : '',
        categoria: 'mensalidade',
        cliente_id: c.id,
        ref_id: `${m.id}:${vencimento.slice(0, 7)}`,
      })
    }
  })
  for (let d = 20; d >= 0; d--) {
    const dia = g.quando(d, 12).getDay()
    if (dia === 0) continue
    const presentes = cs.filter((_, i) => i !== 19 && (i % 5 !== 4 || d > 12) && g.chance(0.55))
    for (const c of presentes) g.add('presencas', { cliente_id: c.id, criado_em: g.quando(d, g.int(6, 21), g.int(0, 59)).toISOString() })
  }
  despesas(g)
}

function petshop(g) {
  config(g, { empresa_nome: 'PetLove Banho e Tosa', pix_nome: 'PetLove', abre: '08:00', fecha: '18:00', intervalo_agenda: 30 })
  const cs = clientes(g, 18)
  const racas = [
    ['Thor', 'cao', 'Golden Retriever', 'g'], ['Mel', 'cao', 'Shih Tzu', 'p'], ['Luna', 'gato', 'Siamês', 'p'], ['Bob', 'cao', 'Vira-lata', 'm'],
    ['Pipoca', 'cao', 'Poodle', 'p'], ['Nina', 'cao', 'Lhasa Apso', 'p'], ['Simba', 'gato', 'Persa', 'p'], ['Max', 'cao', 'Labrador', 'g'],
    ['Belinha', 'cao', 'Yorkshire', 'p'], ['Fred', 'cao', 'Bulldog Francês', 'm'], ['Amora', 'cao', 'Spitz Alemão', 'p'], ['Toby', 'cao', 'Beagle', 'm'],
    ['Lola', 'cao', 'Maltês', 'p'], ['Zeus', 'cao', 'Pastor Alemão', 'g'], ['Mia', 'gato', 'SRD', 'p'], ['Paçoca', 'cao', 'Dachshund', 'p'],
    ['Bidu', 'cao', 'Schnauzer', 'm'], ['Kiara', 'cao', 'Border Collie', 'm'], ['Tom', 'gato', 'Maine Coon', 'm'], ['Bolt', 'cao', 'Pinscher', 'p'],
  ]
  const pets = racas.map(([nome, especie, raca, porte], i) =>
    g.add('pets', {
      nome, especie, raca, porte,
      cliente_id: cs[i % cs.length].id,
      nascimento: addDias(hojeISO(), -g.int(300, 3600)),
      peso: porte === 'p' ? g.int(3, 9) : porte === 'm' ? g.int(10, 22) : g.int(25, 40),
      alergias: i % 5 === 0 ? 'Pele sensível: usar shampoo hipoalergênico' : '',
    }),
  )
  const profs = [
    ['Jéssica Moura', 'Banhista e tosadora', 30, '#fbbf24'],
    ['Diego Farias', 'Tosador', 35, '#4ade80'],
  ].map(([nome, funcao, comissao_pct, cor]) => g.add('profissionais', { nome, funcao, comissao_pct, cor, telefone: g.tel(), ativo: true, publicado: true }))
  const cat = categorias(g, ['Banho e tosa', 'Rações', 'Petiscos', 'Acessórios', 'Higiene'])
  const ss = produtos(g, cat, [
    [0, 'Banho porte pequeno', 55, 0, { tipo: 'servico', duracao_min: 60 }],
    [0, 'Banho porte médio', 70, 0, { tipo: 'servico', duracao_min: 60 }],
    [0, 'Banho porte grande', 95, 0, { tipo: 'servico', duracao_min: 90 }],
    [0, 'Banho e tosa higiênica', 80, 0, { tipo: 'servico', duracao_min: 90 }],
    [0, 'Tosa completa', 110, 0, { tipo: 'servico', duracao_min: 120 }],
    [0, 'Hidratação de pelos', 35, 0, { tipo: 'servico', duracao_min: 30 }],
    [0, 'Corte de unhas', 20, 0, { tipo: 'servico', duracao_min: 30 }],
  ])
  const extras = produtos(g, cat, [
    [1, 'Ração Premium Cães Adultos 15 kg', 219.9, 160, { controla_estoque: true, estoque_minimo: 4, publicado: false }],
    [1, 'Ração Gatos Castrados 10 kg', 189.9, 135, { controla_estoque: true, estoque_minimo: 3, publicado: false }],
    [2, 'Bifinho de carne 65 g', 9.9, 4.5, { controla_estoque: true, estoque_minimo: 15, publicado: false }],
    [3, 'Coleira ajustável', 34.9, 14, { controla_estoque: true, estoque_minimo: 5, publicado: false }],
    [4, 'Shampoo neutro pet 500 ml', 29.9, 12, { controla_estoque: true, estoque_minimo: 5, publicado: false }],
  ])
  for (const p of extras) g.add('estoque_mov', { produto_id: p.id, qtd: g.int(8, 30), motivo: 'compra', custo_unit: p.custo, criado_em: g.quando(30, 9).toISOString() })
  caixas(g, 0)
  agendaComVendas(g, { cs, servicos: ss, extras, profs, porDia: [3, 6], pets })
  const vacinas = [['V10 (polivalente)', 365], ['Antirrábica', 365], ['Gripe canina', 365], ['Vermífugo', 90], ['Antipulgas', 30]]
  pets.forEach((p, i) => {
    for (const [vacina, dias] of vacinas.slice(0, p.especie === 'gato' ? 2 : 5)) {
      if (g.chance(0.3)) continue
      const aplicada = addDias(hojeISO(), -g.int(Math.max(1, dias - 40), dias + 20))
      g.add('vacinas', { pet_id: p.id, vacina: p.especie === 'gato' && vacina.startsWith('V10') ? 'V4 felina' : vacina, aplicada_em: aplicada, proxima_em: addDias(aplicada, dias) })
    }
    if (i % 4 === 0) g.add('vacinas', { pet_id: p.id, vacina: 'Vermífugo', aplicada_em: addDias(hojeISO(), -85), proxima_em: addDias(hojeISO(), 5) })
  })
  for (let d = 29; d >= 0; d--) {
    for (let i = 0; i < g.int(1, 5); i++) venda(g, { quando: g.quando(d, g.int(9, 17), g.int(0, 59)), cliente: g.chance(0.6) ? g.pick(cs) : null, itens: [item(g.pick(extras), g.int(1, 2))] })
  }
  despesas(g)
}

function crm(g) {
  config(g, { empresa_nome: 'Agência Pulso Digital', pix_nome: 'Pulso Digital', abre: '09:00', fecha: '18:00', dias: '1,2,3,4,5' })
  const cat = categorias(g, ['Projetos', 'Mensais'])
  const ss = produtos(g, cat, [
    [0, 'Site institucional', 2800, 900, { tipo: 'servico', publicado: false }],
    [0, 'Loja virtual', 6500, 2200, { tipo: 'servico', publicado: false }],
    [0, 'Identidade visual', 1900, 500, { tipo: 'servico', publicado: false }],
    [1, 'Gestão de redes sociais (mês)', 1400, 450, { tipo: 'servico', publicado: false }],
    [1, 'Tráfego pago (mês)', 1100, 300, { tipo: 'servico', publicado: false }],
  ])
  const empresas = ['Clínica Sorriso', 'Padaria Trigo Bom', 'Ótica Visão', 'Auto Peças Ramos', 'Escola Pequeno Saber', 'Doceria Maria', 'Imobiliária Lar', 'Studio Yoga Paz', 'Pizzaria Forno a Lenha', 'Advocacia Prado', 'Pet Center Amigo', 'Construtora Alicerce', 'Floricultura Jardim', 'Hamburgueria 61', 'Loja Moda Bella', 'Contabilidade Exata', 'Academia Força', 'Café do Largo']
  const etapas = ['novo', 'novo', 'novo', 'qualificado', 'qualificado', 'qualificado', 'proposta', 'proposta', 'proposta', 'negociacao', 'negociacao', 'ganho', 'ganho', 'ganho', 'ganho', 'perdido', 'perdido', 'novo']
  const clientesGanhos = []
  empresas.forEach((empresa, i) => {
    const s = ss[i % ss.length]
    const etapa = etapas[i]
    const nome = NOMES[i + 5]
    const lead = g.add('leads', {
      nome,
      empresa,
      telefone: g.tel(),
      email: `contato@${empresa.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.com.br`,
      interesse: s.nome,
      valor: s.preco,
      etapa,
      origem: g.pick(['instagram', 'google', 'indicacao', 'indicacao', 'whatsapp', 'site']),
      responsavel: g.pick(['Vinícius', 'Larissa']),
      proximo_contato: ['ganho', 'perdido'].includes(etapa) ? '' : addDias(hojeISO(), g.int(-4, 7)),
      motivo_perda: etapa === 'perdido' ? g.pick(['Preço', 'Fechou com concorrente', 'Sem retorno']) : '',
      criado_em: g.quando(g.int(3, 60), 10).toISOString(),
    })
    g.add('atividades', { lead_id: lead.id, tipo: 'whatsapp', descricao: 'Primeiro contato e envio da apresentação', data: addDias(hojeISO(), -g.int(5, 30)), feita: true })
    if (!['ganho', 'perdido'].includes(etapa)) {
      g.add('atividades', { lead_id: lead.id, tipo: g.pick(['ligacao', 'reuniao', 'email']), descricao: g.pick(['Retornar sobre a proposta', 'Reunião de briefing', 'Enviar portfólio', 'Ligar para negociar prazo']), data: lead.proximo_contato, feita: false })
    }
    if (etapa === 'ganho') {
      const c = g.add('clientes', { nome, empresa, telefone: lead.telefone, email: lead.email, bairro: g.pick(BAIRROS) })
      lead.cliente_id = c.id
      clientesGanhos.push([c, s])
    }
    if (etapa === 'proposta' || etapa === 'negociacao') {
      g.add('vendas', {
        numero: g.numero('vendas'),
        cliente_nome: `${nome} (${empresa})`,
        telefone: lead.telefone,
        itens: [item(s)],
        subtotal: s.preco,
        desconto: 0,
        total: s.preco,
        pagamentos: [],
        status: 'orcamento',
        origem: 'proposta',
        ref_id: lead.id,
        criado_em: g.quando(g.int(1, 10), 15).toISOString(),
      })
    }
  })
  for (const [c, s] of clientesGanhos) {
    // Venda a prazo: o dinheiro entra pelas parcelas do contas a receber.
    const v = venda(g, { quando: g.quando(g.int(5, 40), 14), cliente: c, itens: [item(s)], origem: 'proposta', forma: 'fiado' })
    const parcelas = s.preco > 2000 ? 2 : 1
    for (let p = 0; p < parcelas; p++) {
      const vencimento = addDias(hojeISO(), -20 + p * 30)
      g.add('lancamentos', {
        tipo: 'receita',
        descricao: `${s.nome} - ${c.nome} (${p + 1}/${parcelas})`,
        valor: round2(s.preco / parcelas),
        vencimento,
        pago_em: vencimento < hojeISO() ? vencimento : '',
        categoria: 'servico',
        cliente_id: c.id,
        ref_id: v.id,
      })
    }
  }
  despesas(g)
}

function mei(g) {
  config(g, { empresa_nome: 'Doces da Ana', pix_nome: 'Ana Doces', regime: 'mei', mei_atividade: 'ambos', mei_abertura: '2024-03-11', abre: '08:00', fecha: '18:00' })
  const cs = clientes(g, 12, (i) => ({ nascimento: i % 4 === 0 ? `19${80 + i}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(5 + i).padStart(2, '0')}` : '' }))
  const empresa = g.add('clientes', { nome: 'Escritório Silva Contábil', documento: '11.444.777/0001-61', telefone: g.tel(), email: 'contato@silvacontabil.com.br', bairro: 'Centro', obs: 'Compra coffee break toda semana (pede nota)' })
  let ean = 789555000000
  const ps = [
    ['Brigadeiro gourmet', 3.5, { controla_estoque: true, estoque_minimo: 30, custo: 1.2 }],
    ['Bolo de pote', 12, { controla_estoque: true, estoque_minimo: 8, custo: 4.5 }],
    ['Brownie', 8],
    ['Coxinha', 7, { custo: 2.6 }],
    ['Pão de mel', 6],
    ['Café', 4],
    ['Refrigerante lata', 6, { codigo_barras: ean13(ean++), ncm: '22021000', controla_estoque: true, estoque_minimo: 12, custo: 3.2 }],
    ['Água sem gás', 3.5, { codigo_barras: ean13(ean++), ncm: '22011000', controla_estoque: true, estoque_minimo: 12, custo: 1.4 }],
    ['Bolo de aniversário (kg)', 85],
  ].map(([nome, preco, extra = {}]) => g.add('produtos', { nome, preco, tipo: 'produto', unidade: 'un', ativo: true, publicado: true, cfop: '5102', ...extra }))
  const servicos = [
    ['Decoração de mesa de festa', 250],
    ['Aula de confeitaria', 150],
  ].map(([nome, preco]) => g.add('produtos', { nome, preco, tipo: 'servico', ativo: true, publicado: true }))
  let numeroNfe = 0
  let numeroNfse = 0
  for (let d = 50; d >= 0; d--) {
    const dia = g.quando(d, 12).getDay()
    if (dia === 0) continue
    for (let i = 0; i < g.int(3, 10); i++) {
      const itens = [item(g.pick(ps.slice(0, 6)), g.int(1, 4))]
      if (g.chance(0.4)) itens.push(item(g.pick(ps.slice(5, 8)), g.int(1, 2)))
      const vv = venda(g, { quando: g.quando(d, g.int(8, 17), g.int(0, 59)), cliente: g.chance(0.3) ? g.pick(cs) : null, itens, forma: g.pick(['dinheiro', 'pix', 'pix', 'pix', 'debito', 'credito']) })
      for (const it of itens) if (ps.find((x) => x.id === it.produto_id)?.controla_estoque) g.add('estoque_mov', { produto_id: it.produto_id, qtd: -it.qtd, motivo: 'venda', ref_id: vv.id, criado_em: vv.criado_em })
    }
    // Coffee break da empresa toda segunda: venda para CNPJ, com NF-e.
    if (dia === 1) {
      const v = venda(g, { quando: g.quando(d, 9, 30), cliente: empresa, itens: [item(ps[3], 20), item(ps[0], 30), item(ps[5], 15)], forma: 'pix' })
      numeroNfe++
      v.fiscal = { tipo: 'nfe', ambiente: 'simulacao', status: 'autorizada', numero: numeroNfe, serie: 1, chave: montarChave({ uf: 'SP', data: new Date(v.criado_em), cnpj: '11222333000181', modelo: 55, serie: 1, numero: numeroNfe }), protocolo: `3526${g.int(1000000000, 9999999999)}`, emitida_em: v.criado_em, cpf: '11444777000161', tributos: { federal: round2(v.total * 0.04), estadual: round2(v.total * 0.18), municipal: 0 }, avisos: [] }
    }
    if (g.chance(0.12)) {
      const s = g.pick(servicos)
      const c = g.pick(cs)
      const v = venda(g, { quando: g.quando(d, g.int(9, 16)), cliente: c, itens: [item(s)], forma: 'pix' })
      if (g.chance(0.5)) {
        numeroNfse++
        v.fiscal = { tipo: 'nfse', ambiente: 'simulacao', status: 'autorizada', numero: numeroNfse, serie: 1, chave: '', codigo_verificacao: `${g.int(1000, 9999)}ABCD`, protocolo: `3526${g.int(1000000000, 9999999999)}`, emitida_em: v.criado_em, cpf: '', tributos: { federal: round2(v.total * 0.04), estadual: 0, municipal: round2(v.total * 0.05) }, avisos: [] }
      }
    }
  }
  // Dois clientes devendo (fiado), para "quem me deve?".
  for (const [c, valor, dias] of [[cs[2], 45, 6], [cs[5], 28.5, 12]]) {
    g.add('lancamentos', { tipo: 'receita', descricao: `Fiado - ${c.nome}`, valor, vencimento: addDias(hojeISO(), 30 - dias), categoria: 'fiado', cliente_id: c.id, criado_em: g.quando(dias, 15).toISOString() })
  }
  // Gastos pagos: mercadoria toda semana, contas e DAS todo mês.
  for (let d = 50; d >= 0; d -= 7) g.add('lancamentos', { tipo: 'despesa', descricao: 'Ingredientes e embalagens', valor: g.int(180, 420), vencimento: addDias(hojeISO(), -d), pago_em: addDias(hojeISO(), -d), categoria: 'fornecedor', forma: 'pix' })
  const hoje = new Date()
  for (let k = 2; k >= 0; k--) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - k, 1)
    const mesTxt = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
    const pagoEm = (dia) => `${mesTxt}-${String(Math.min(dia, k === 0 ? hoje.getDate() : 28)).padStart(2, '0')}`
    g.add('lancamentos', { tipo: 'despesa', descricao: 'Luz', valor: g.int(80, 130), vencimento: pagoEm(10), pago_em: pagoEm(10), categoria: 'contas', forma: 'pix' })
    g.add('lancamentos', { tipo: 'despesa', descricao: 'Internet', valor: 99.9, vencimento: pagoEm(15), pago_em: pagoEm(15), categoria: 'contas', forma: 'pix' })
    // O DAS de um mês (competência) vence no dia 20 do mês seguinte.
    const comp = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)
    const compTxt = `${comp.getFullYear()}-${String(comp.getMonth() + 1).padStart(2, '0')}`
    if (k > 0 || hoje.getDate() >= 18) {
      g.add('lancamentos', { tipo: 'despesa', descricao: `DAS ${compTxt.slice(5)}/${compTxt.slice(0, 4)}`, valor: 87.05, vencimento: pagoEm(20), pago_em: pagoEm(18), categoria: 'impostos', forma: 'pix', ref_id: `das:${compTxt}` })
    }
  }
}

const geradores = {
  'mei-na-mao': mei,
  'restaurante-delivery': restaurante,
  'mercadinho-pdv': mercadinho,
  'barbearia-salao': barbearia,
  'assistencia-tecnica': assistencia,
  'academia-studio': academia,
  petshop,
  'crm-vendas': crm,
}

/** Compra de reposição no começo do período, para nenhum saldo ficar negativo (alguns ficam abaixo do mínimo). */
function reporEstoque(g) {
  const saldo = new Map()
  for (const [t, r] of g.pares) if (t === 'estoque_mov') saldo.set(r.produto_id, (saldo.get(r.produto_id) || 0) + Number(r.qtd))
  for (const [t, p] of g.pares) {
    if (t !== 'produtos' || !p.controla_estoque) continue
    const alvo = g.chance(0.15) ? g.int(0, Number(p.estoque_minimo) || 2) : g.int((Number(p.estoque_minimo) || 2) + 2, (Number(p.estoque_minimo) || 2) * 4 + 10)
    const falta = Math.ceil(alvo - (saldo.get(p.id) || 0))
    if (falta > 0) g.add('estoque_mov', { produto_id: p.id, qtd: falta, motivo: 'compra', custo_unit: p.custo, criado_em: g.quando(31, 9).toISOString() })
  }
}

/** Preenche o banco de demonstração. Os registros já vêm com criado_em no passado. */
export function semear(banco, slug) {
  const g = new Gerador(slug)
  geradores[slug]?.(g)
  reporEstoque(g)
  for (let i = 0; i < g.pares.length; i += 500) banco.salvarVarios(g.pares.slice(i, i + 500))
}
