// Lado do cliente final (cardápio, agendamento online, acompanhamento de pedido/OS).
// "fonte" é o ID do Apps Script da loja, ou "demo-<nicho>" para a demonstração gravada neste navegador.

import { abrirBanco } from './db'
import { chamarPlanilha, urlDoId } from './api'
import { CONFIGS, ETAPAS_PEDIDO, STATUS_OS } from './schema'
import { addDias, horariosLivres, hojeISO, lerAdicionais, localISO, minutos, hhmm, precificar, round2, soDigitos, totalItens } from './regras'
import { semear } from './seed'

const CAMPOS_PRODUTO = ['id', 'nome', 'tipo', 'categoria_id', 'preco', 'descricao', 'foto_url', 'adicionais', 'duracao_min']

function filtrarLoja({ config, produtos, categorias, profissionais }) {
  const cfg = {}
  for (const c of CONFIGS) if (c.publica) cfg[c.id] = config[c.id]
  return {
    config: cfg,
    produtos: produtos
      .filter((p) => p.ativo !== false && p.publicado !== false)
      .map((p) => Object.fromEntries(CAMPOS_PRODUTO.map((k) => [k, p[k]]))),
    categorias: categorias.map((c) => ({ id: c.id, nome: c.nome, ordem: Number(c.ordem) || 0 })).sort((a, b) => a.ordem - b.ordem),
    profissionais: profissionais.filter((p) => p.ativo !== false && p.publicado !== false).map((p) => ({ id: p.id, nome: p.nome, funcao: p.funcao })),
  }
}

/** Mesma validação do Apps Script, para a demonstração local se comportar igual. */
function clientePorTelefone(banco, { nome, telefone, email, endereco, bairro }) {
  const tel = soDigitos(telefone)
  const existente = banco.lista('clientes').find((c) => soDigitos(c.telefone) === tel)
  if (existente) return existente
  return banco.salvar('clientes', { nome, telefone, email: email || '', endereco: endereco || '', bairro: bairro || '', obs: 'Cadastrado pelo site' })
}

/** Igual ao Apps Script: dias que o agendamento online mostra e o que já está ocupado neles. */
export const DIAS_AGENDA = 31

const paraOcupado = (a) => ({ inicio: a.inicio, fim: a.fim, profissional_id: a.profissional_id, status: a.status === 'bloqueio' ? 'bloqueio' : 'ocupado' })

function agendaLocal(banco) {
  const desde = hojeISO()
  const ate = addDias(desde, DIAS_AGENDA)
  return {
    desde,
    ate,
    ocupados: banco
      .lista('agendamentos')
      .filter((a) => {
        const d = String(a.inicio).slice(0, 10)
        return d >= desde && d <= ate && !['cancelado', 'faltou', 'recusado'].includes(a.status)
      })
      .map(paraOcupado),
  }
}

function validarContato(c) {
  if (!String(c?.nome ?? '').trim()) throw new Error('Informe seu nome.')
  if (soDigitos(c?.telefone).length < 10) throw new Error('Informe um telefone com DDD.')
}

function local(banco) {
  return {
    async loja() {
      return filtrarLoja({
        config: banco.config(),
        produtos: banco.lista('produtos'),
        categorias: banco.lista('categorias'),
        profissionais: banco.lista('profissionais'),
      })
    },

    async agenda() {
      return agendaLocal(banco)
    },

    async pedir(dados) {
      const cfg = banco.config()
      if (!cfg.loja_aberta) throw new Error('A loja não está recebendo pedidos agora.')
      validarContato(dados.cliente)
      const itens = precificar(dados.itens, banco.lista('produtos'))
      if (!itens.length) throw new Error('O carrinho está vazio.')
      const subtotal = totalItens(itens)
      if (cfg.pedido_minimo && subtotal < Number(cfg.pedido_minimo)) throw new Error(`O pedido mínimo é de R$ ${Number(cfg.pedido_minimo).toFixed(2)}.`)
      const entrega = dados.entrega === 'entrega' ? 'entrega' : 'retirada'
      if (entrega === 'entrega' && !String(dados.cliente.endereco ?? '').trim()) throw new Error('Informe o endereço de entrega.')
      const taxa = entrega === 'entrega' ? Number(cfg.taxa_entrega) || 0 : 0
      const c = clientePorTelefone(banco, dados.cliente)
      const v = banco.salvar('vendas', {
        cliente_id: c.id,
        cliente_nome: dados.cliente.nome,
        telefone: dados.cliente.telefone,
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
        endereco: entrega === 'entrega' ? [dados.cliente.endereco, dados.cliente.bairro].filter(Boolean).join(' - ') : '',
        pagamento_previsto: String(dados.pagamento ?? '').slice(0, 80),
        obs: String(dados.obs ?? '').slice(0, 300),
      })
      return { numero: v.numero, codigo: v.codigo_publico, total: v.total }
    },

    async agendar(dados) {
      validarContato(dados.cliente)
      const servico = banco.get('produtos', dados.servico_id)
      const prof = banco.get('profissionais', dados.profissional_id)
      if (!servico || !prof) throw new Error('Serviço ou profissional indisponível.')
      const data = String(dados.inicio).slice(0, 10)
      const hora = String(dados.inicio).slice(11, 16)
      const livres = horariosLivres({ data, duracao: servico.duracao_min, profissionalId: prof.id, agendamentos: banco.lista('agendamentos'), config: banco.config() })
      if (!livres.includes(hora)) {
        const erro = new Error('Esse horário acabou de ser ocupado. Escolha outro.')
        erro.dados = { agenda: agendaLocal(banco) }
        throw erro
      }
      const c = clientePorTelefone(banco, dados.cliente)
      const fim = `${data}T${hhmm(minutos(hora) + (Number(servico.duracao_min) || 30))}`
      const ag = banco.salvar('agendamentos', {
        inicio: `${data}T${hora}`,
        fim,
        profissional_id: prof.id,
        servico_id: servico.id,
        cliente_id: c.id,
        cliente_nome: dados.cliente.nome,
        telefone: dados.cliente.telefone,
        valor: servico.preco,
        status: 'pendente',
        origem: 'online',
        obs: String(dados.obs ?? '').slice(0, 300),
      })
      return { ok: true, id: ag.id, codigo: ag.codigo_publico, status: 'pendente', agenda: agendaLocal(banco) }
    },

    async acompanhar(codigo) {
      const cod = String(codigo).trim().toUpperCase()
      const v = banco.lista('vendas').find((x) => x.codigo_publico === cod)
      if (v) return resumoPedido(v)
      const os = banco.lista('ordens').find((x) => x.codigo_publico === cod)
      if (os) return resumoOS(os)
      const ag = banco.lista('agendamentos').find((x) => x.codigo_publico === cod && x.status !== 'bloqueio')
      if (ag) return { tipo: 'agendamento', status: ag.status, inicio: ag.inicio, servico: banco.get('produtos', ag.servico_id)?.nome ?? '', profissional: banco.get('profissionais', ag.profissional_id)?.nome ?? '', total: ag.valor, criado_em: ag.criado_em }
      throw new Error('Código não encontrado.')
    },
  }
}

export const resumoPedido = (v) => ({
  tipo: 'pedido',
  numero: v.numero,
  status: v.status,
  etapa: v.etapa,
  etapaNome: ETAPAS_PEDIDO.find(([id]) => id === v.etapa)?.[1] ?? '',
  itens: (v.itens || []).map((i) => ({ nome: i.nome, qtd: i.qtd })),
  total: v.total,
  entrega: v.entrega,
  criado_em: v.criado_em,
})

export const resumoOS = (o) => ({
  tipo: 'os',
  numero: o.numero,
  status: o.status,
  statusNome: STATUS_OS.find(([id]) => id === o.status)?.[1] ?? '',
  equipamento: [o.equipamento, o.marca_modelo].filter(Boolean).join(' '),
  previsao: o.previsao,
  total: o.total,
  laudo: ['orcamento', 'aprovada', 'execucao', 'pronta', 'entregue'].includes(o.status) ? o.laudo : '',
  criado_em: o.criado_em,
})

function remoto(id) {
  const url = urlDoId(id)
  const chamar = (acao, dados = {}) => chamarPlanilha(url, { acao, ...dados })
  return {
    loja: async () => {
      const { loja } = await chamar('publico_loja')
      // A planilha guarda tudo como texto: volta para número e sim/não.
      const config = {}
      for (const c of CONFIGS) {
        if (!c.publica) continue
        const v = loja.config[c.id]
        if (v === undefined) config[c.id] = c.padrao ?? ''
        else if (c.tipo === 'sim') config[c.id] = v === '1' || v === 'true'
        else if (['numero', 'dinheiro', 'pct'].includes(c.tipo)) config[c.id] = Number(v) || 0
        else config[c.id] = v
      }
      return { ...loja, config }
    },
    agenda: async () => {
      try {
        return (await chamar('publico_agenda')).agenda
      } catch (e) {
        // Planilha com o Code.gs antigo (sem "publico_agenda"): a tela busca dia a dia.
        if (e.codigo === 'invalido') return null
        throw e
      }
    },
    ocupados: async (data, profissionalId) => (await chamar('publico_ocupados', { data, profissional_id: profissionalId })).ocupados,
    pedir: (dados) => chamar('publico_pedido', { pedido: dados }),
    agendar: (dados) => chamar('publico_agendar', { agendamento: dados }),
    acompanhar: async (codigo) => (await chamar('publico_acompanhar', { codigo })).resultado,
  }
}

export async function abrirLoja(fonte) {
  const demo = String(fonte || '').match(/^demo-([a-z-]+)$/)
  if (demo) {
    const banco = await abrirBanco(fonte)
    if (banco.vazio()) semear(banco, demo[1])
    return { demo: true, ...local(banco) }
  }
  if (!/^[A-Za-z0-9_-]{20,}$/.test(String(fonte || ''))) throw new Error('Link incompleto: falta o código da loja.')
  return { demo: false, ...remoto(fonte) }
}

export { lerAdicionais, horariosLivres, localISO }
