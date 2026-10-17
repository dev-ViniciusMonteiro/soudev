// Ações que mexem em várias tabelas de uma vez (é aqui que os módulos se ligam):
// uma venda concluída baixa o estoque, entra no caixa aberto e, se for fiado, vira conta a receber.

import { addDias, contaVenda, hojeISO, novoId, round2 } from './regras'

export const caixaAberto = (banco) => banco.lista('caixas').find((c) => c.status === 'aberto') ?? null

/**
 * Conclui uma venda (nova ou já existente, como mesa, pedido ou orçamento).
 * venda: campos da venda (itens, cliente, origem...). pagamentos: [{ forma, valor }].
 */
export function concluirVenda(banco, { venda, pagamentos, troco = 0, operador = '' }) {
  const id = venda.id || novoId()
  const { subtotal, total } = contaVenda(venda)
  const caixa = caixaAberto(banco)
  const pares = [
    [
      'vendas',
      {
        ...venda,
        id,
        subtotal,
        total,
        pagamentos,
        troco: round2(troco),
        status: 'concluida',
        etapa: venda.etapa === undefined || venda.etapa === '' ? '' : 'entregue',
        concluida_em: new Date().toISOString(),
        caixa_id: caixa?.id ?? '',
        operador: venda.operador || operador,
      },
    ],
  ]
  for (const item of venda.itens || []) {
    const p = banco.get('produtos', item.produto_id)
    if (p?.controla_estoque) pares.push(['estoque_mov', { produto_id: p.id, qtd: -Number(item.qtd), motivo: venda.origem === 'os' ? 'os' : 'venda', ref_id: id }])
  }
  const fiado = round2(pagamentos.filter((p) => p.forma === 'fiado').reduce((s, p) => s + Number(p.valor), 0))
  if (fiado > 0) {
    pares.push([
      'lancamentos',
      {
        tipo: 'receita',
        descricao: `Fiado - ${venda.cliente_nome || 'cliente'}`,
        valor: fiado,
        vencimento: addDias(hojeISO(), 30),
        categoria: 'fiado',
        cliente_id: venda.cliente_id || '',
        ref_id: id,
      },
    ])
  }
  return banco.salvarVarios(pares)[0]
}

/** Cancela uma venda concluída: devolve o estoque e apaga o fiado que ela gerou. */
export function cancelarVenda(banco, venda, motivo = '') {
  const pares = [['vendas', { id: venda.id, status: 'cancelada', obs: [venda.obs, motivo && `Cancelada: ${motivo}`].filter(Boolean).join(' · ') }]]
  for (const m of banco.lista('estoque_mov').filter((m) => m.ref_id === venda.id)) pares.push(['estoque_mov', { id: m.id, excluido: true }])
  for (const l of banco.lista('lancamentos').filter((l) => l.ref_id === venda.id && !l.pago_em)) pares.push(['lancamentos', { id: l.id, excluido: true }])
  banco.salvarVarios(pares)
}

/** Fiado em aberto de um cliente (para o limite de crédito). */
export function fiadoEmAberto(banco, clienteId) {
  return round2(
    banco
      .lista('lancamentos')
      .filter((l) => l.tipo === 'receita' && l.categoria === 'fiado' && l.cliente_id === clienteId && !l.pago_em)
      .reduce((s, l) => s + Number(l.valor), 0),
  )
}
