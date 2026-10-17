'use client'

// Financeiro: contas a pagar e a receber, fluxo de caixa do mês (vendas + recebimentos − despesas).

import { useMemo, useState } from 'react'
import { BarrasH, Chips, Formulario, Kpis, Modal, Selo, Topo, Vazio, useMapa, useTabela } from '../base'
import { tabelas } from '@/lib/sistemas/schema'
import { brl, dataBR, hojeISO, round2 } from '@/lib/sistemas/regras'
import { Receber } from './Mensalidades'

const categoriaNome = (c) => tabelas.lancamentos.campos.find((x) => x.id === 'categoria').opcoes.find(([id]) => id === c)?.[1] ?? 'Sem categoria'
const noMes = (iso, mes) => Boolean(iso) && hojeISO(new Date(String(iso).length === 10 ? `${iso}T12:00` : iso)).startsWith(mes)

export default function Financeiro() {
  const lancamentos = useTabela('lancamentos')
  const vendas = useTabela('vendas')
  const clientes = useMapa('clientes')
  const fornecedores = useMapa('fornecedores')
  const [mes, setMes] = useState(() => hojeISO().slice(0, 7))
  const [aba, setAba] = useState('pagar')
  const [editar, setEditar] = useState(null)
  const [receber, setReceber] = useState(null)
  const hoje = hojeISO()

  const n = useMemo(() => {
    const vendasMes = vendas
      .filter((v) => v.status === 'concluida' && noMes(v.concluida_em || v.criado_em, mes))
      .reduce((s, v) => s + (v.pagamentos || []).filter((p) => p.forma !== 'fiado').reduce((a, p) => a + Number(p.valor), 0) - Number(v.troco || 0), 0)
    const recebidos = lancamentos.filter((l) => l.tipo === 'receita' && noMes(l.pago_em, mes)).reduce((s, l) => s + Number(l.valor), 0)
    const pagos = lancamentos.filter((l) => l.tipo === 'despesa' && noMes(l.pago_em, mes))
    const despesas = pagos.reduce((s, l) => s + Number(l.valor), 0)
    const porCategoria = new Map()
    for (const l of pagos) porCategoria.set(l.categoria, (porCategoria.get(l.categoria) || 0) + Number(l.valor))
    return {
      vendasMes: round2(vendasMes),
      recebidos: round2(recebidos),
      despesas: round2(despesas),
      categorias: [...porCategoria].map(([c, v]) => ({ rotulo: categoriaNome(c), valor: round2(v) })).sort((a, b) => b.valor - a.valor),
    }
  }, [vendas, lancamentos, mes])

  const aPagar = lancamentos.filter((l) => l.tipo === 'despesa' && !l.pago_em)
  const aReceber = lancamentos.filter((l) => l.tipo === 'receita' && !l.pago_em)
  const lista = (aba === 'pagar' ? aPagar : aba === 'receber' ? aReceber : lancamentos.filter((l) => noMes(l.vencimento, mes))).sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)))
  const soma = (l) => l.reduce((s, x) => s + Number(x.valor), 0)
  const resultado = round2(n.vendasMes + n.recebidos - n.despesas)

  return (
    <div className="sx-modulo">
      <Topo titulo="Financeiro" sub="Vendas do caixa + contas recebidas − contas pagas">
        <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Mês" />
        <button type="button" className="btn btn-primary" onClick={() => setEditar({ tipo: 'despesa' })}>
          Nova conta a pagar
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setEditar({ tipo: 'receita' })}>
          Nova conta a receber
        </button>
      </Topo>
      <Kpis
        itens={[
          ['Entradas de vendas', brl(n.vendasMes), 'dinheiro, Pix e cartão'],
          ['Contas recebidas', brl(n.recebidos), 'fiado, mensalidades, serviços'],
          ['Despesas pagas', brl(n.despesas)],
          ['Resultado do mês', brl(resultado), resultado >= 0 ? 'positivo' : 'negativo', resultado >= 0 ? 'ok' : 'erro'],
          ['A pagar em aberto', brl(soma(aPagar)), `${aPagar.filter((l) => l.vencimento < hoje).length} vencidas`, aPagar.some((l) => l.vencimento < hoje) ? 'erro' : null],
          ['A receber em aberto', brl(soma(aReceber)), `${aReceber.filter((l) => l.vencimento < hoje).length} vencidas`, aReceber.some((l) => l.vencimento < hoje) ? 'aviso' : null],
        ]}
      />
      {n.categorias.length > 0 && (
        <section className="sx-cartao">
          <h2>Despesas pagas por categoria</h2>
          <BarrasH dados={n.categorias} />
        </section>
      )}
      <Chips
        valor={aba}
        onChange={setAba}
        opcoes={[
          ['pagar', 'A pagar', aPagar.length],
          ['receber', 'A receber', aReceber.length],
          ['mes', 'Vencimentos do mês'],
        ]}
      />
      {lista.length === 0 ? (
        <Vazio>Nenhum lançamento.</Vazio>
      ) : (
        <div className="table-wrap">
          <table className="table sx-tabela-clique">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Quem</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id} onClick={() => setEditar(l)}>
                  <td className="sx-quebra">
                    {l.descricao} <small className="muted">· {categoriaNome(l.categoria)}</small>
                  </td>
                  <td>{clientes.get(l.cliente_id)?.nome || fornecedores.get(l.fornecedor_id)?.nome || ''}</td>
                  <td>{dataBR(l.vencimento)}</td>
                  <td>
                    <span className={l.tipo === 'despesa' ? 'sx-negativo' : 'sx-positivo'}>
                      {l.tipo === 'despesa' ? '−' : '+'} {brl(l.valor)}
                    </span>
                  </td>
                  <td>{l.pago_em ? <Selo tom="ok">Pago {dataBR(l.pago_em).slice(0, 5)}</Selo> : l.vencimento < hoje ? <Selo tom="erro">Vencido</Selo> : <Selo>Em aberto</Selo>}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {!l.pago_em && (
                      <button type="button" className="btn btn-ghost" onClick={() => setReceber(l)}>
                        {l.tipo === 'despesa' ? 'Pagar' : 'Receber'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editar && (
        <Modal titulo={editar.id ? 'Editar lançamento' : editar.tipo === 'despesa' ? 'Nova conta a pagar' : 'Nova conta a receber'} onFechar={() => setEditar(null)} largo>
          <Formulario tabela="lancamentos" registro={editar.id ? editar : null} padrao={editar.id ? {} : { tipo: editar.tipo, vencimento: hoje }} onSalvo={() => setEditar(null)} onCancelar={() => setEditar(null)} />
        </Modal>
      )}
      {receber && <Receber lancamento={receber} titulo={receber.tipo === 'despesa' ? 'Registrar pagamento' : 'Registrar recebimento'} onFechar={() => setReceber(null)} />}
    </div>
  )
}
