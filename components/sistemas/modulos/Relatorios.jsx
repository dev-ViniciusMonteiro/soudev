'use client'

// Relatórios por período: faturamento por dia, formas de pagamento, origem, produtos (com margem),
// comissões por profissional e conversão do funil.

import { useMemo, useState } from 'react'
import { Barras, BarrasH, Chips, Kpis, Topo, Vazio, useMapa, useSistema, useTabela } from '../base'
import { FORMAS_PAGAMENTO, tabelas } from '@/lib/sistemas/schema'
import { addDias, brl, csv, dataBR, hojeISO, num, round2 } from '@/lib/sistemas/regras'
import { downloadBlob } from '@/lib/client'

const origens = Object.fromEntries(tabelas.vendas.campos.find((c) => c.id === 'origem').opcoes)
const leadOrigens = Object.fromEntries(tabelas.leads.campos.find((c) => c.id === 'origem').opcoes)

function periodo(id) {
  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)
  if (id === 'hoje') return [hoje, hoje]
  if (id === '7') return [addDias(hoje, -6), hoje]
  if (id === '30') return [addDias(hoje, -29), hoje]
  if (id === 'mes') return [`${mes}-01`, hoje]
  const fimAnt = addDias(`${mes}-01`, -1)
  return [`${fimAnt.slice(0, 7)}-01`, fimAnt]
}

export default function Relatorios() {
  const { ativos } = useSistema()
  const vendas = useTabela('vendas')
  const produtos = useMapa('produtos')
  const profissionais = useTabela('profissionais')
  const leads = useTabela('leads')
  const [p, setP] = useState('30')
  const [ini, fim] = periodo(p)

  const r = useMemo(() => {
    const doPeriodo = vendas.filter((v) => {
      if (v.status !== 'concluida') return false
      const d = hojeISO(new Date(v.concluida_em || v.criado_em))
      return d >= ini && d <= fim
    })
    const total = doPeriodo.reduce((s, v) => s + Number(v.total), 0)
    const porDia = new Map()
    for (let d = ini; d <= fim; d = addDias(d, 1)) porDia.set(d, { valor: 0, qtd: 0 })
    const formas = {}
    const porOrigem = {}
    const porProduto = new Map()
    const comissoes = new Map()
    for (const v of doPeriodo) {
      const d = hojeISO(new Date(v.concluida_em || v.criado_em))
      const dia = porDia.get(d)
      if (dia) {
        dia.valor += Number(v.total)
        dia.qtd++
      }
      for (const pg of v.pagamentos || []) formas[pg.forma] = (formas[pg.forma] || 0) + Number(pg.valor)
      if (Number(v.troco)) formas.dinheiro = (formas.dinheiro || 0) - Number(v.troco)
      porOrigem[v.origem || 'pdv'] = (porOrigem[v.origem || 'pdv'] || 0) + Number(v.total)
      for (const i of v.itens || []) {
        const prod = produtos.get(i.produto_id)
        const chave = prod?.id || i.nome
        const atual = porProduto.get(chave) || { nome: prod?.nome || i.nome, qtd: 0, receita: 0, custo: 0 }
        atual.qtd += Number(i.qtd)
        atual.receita += Number(i.preco) * Number(i.qtd)
        atual.custo += (Number(prod?.custo) || 0) * Number(i.qtd)
        porProduto.set(chave, atual)
        if (v.profissional_id && prod?.tipo === 'servico') {
          const prof = profissionais.find((x) => x.id === v.profissional_id)
          const pct = Number(prod.comissao_pct) || Number(prof?.comissao_pct) || 0
          const c = comissoes.get(v.profissional_id) || { nome: prof?.nome || '—', atendimentos: 0, servicos: 0, comissao: 0 }
          c.atendimentos += Number(i.qtd)
          c.servicos += Number(i.preco) * Number(i.qtd)
          c.comissao += (Number(i.preco) * Number(i.qtd) * pct) / 100
          comissoes.set(v.profissional_id, c)
        }
      }
    }
    return {
      doPeriodo,
      total,
      dias: [...porDia].map(([d, x]) => ({ rotulo: dataBR(d), curto: dataBR(d).slice(0, 5), valor: round2(x.valor), extra: `${x.qtd} vendas` })),
      formas: Object.entries(formas)
        .map(([f, v]) => ({ rotulo: FORMAS_PAGAMENTO.find(([id]) => id === f)?.[1] ?? f, valor: round2(v) }))
        .sort((a, b) => b.valor - a.valor),
      origens: Object.entries(porOrigem)
        .map(([o, v]) => ({ rotulo: origens[o] ?? o, valor: round2(v) }))
        .sort((a, b) => b.valor - a.valor),
      produtos: [...porProduto.values()].sort((a, b) => b.receita - a.receita),
      comissoes: [...comissoes.values()].sort((a, b) => b.servicos - a.servicos),
    }
  }, [vendas, produtos, profissionais, ini, fim])

  const funil = useMemo(() => {
    const m = new Map()
    for (const l of leads) {
      const o = l.origem || 'outro'
      const x = m.get(o) || { total: 0, ganhos: 0, valor: 0 }
      x.total++
      if (l.etapa === 'ganho') {
        x.ganhos++
        x.valor += Number(l.valor || 0)
      }
      m.set(o, x)
    }
    return [...m].map(([o, x]) => ({ rotulo: leadOrigens[o] ?? o, valor: x.total ? (x.ganhos / x.total) * 100 : 0, extra: `${x.ganhos} de ${x.total} · ${brl(x.valor)}` })).sort((a, b) => b.valor - a.valor)
  }, [leads])

  const lucro = r.produtos.reduce((s, x) => s + x.receita - x.custo, 0)
  const exportar = () => {
    const linhas = [['Produto', 'Quantidade', 'Receita', 'Custo', 'Lucro bruto']]
    for (const x of r.produtos) linhas.push([x.nome, x.qtd, round2(x.receita), round2(x.custo), round2(x.receita - x.custo)])
    downloadBlob(new Blob([csv(linhas)], { type: 'text/csv;charset=utf-8' }), `produtos-${ini}-a-${fim}.csv`)
  }

  return (
    <div className="sx-modulo">
      <Topo titulo="Relatórios" sub={`${dataBR(ini)} a ${dataBR(fim)}`}>
        <button type="button" className="btn btn-ghost" onClick={exportar}>
          Exportar produtos (CSV)
        </button>
      </Topo>
      <Chips
        valor={p}
        onChange={setP}
        opcoes={[
          ['hoje', 'Hoje'],
          ['7', '7 dias'],
          ['30', '30 dias'],
          ['mes', 'Este mês'],
          ['ant', 'Mês passado'],
        ]}
      />
      <Kpis
        itens={[
          ['Faturamento', brl(r.total), `${r.doPeriodo.length} vendas`],
          ['Ticket médio', brl(r.doPeriodo.length ? r.total / r.doPeriodo.length : 0)],
          ['Lucro bruto estimado', brl(lucro), r.total ? `margem de ${num((lucro / r.total) * 100, 1)}%` : '', lucro >= 0 ? 'ok' : 'erro'],
        ]}
      />
      {r.dias.length > 1 && (
        <section className="sx-cartao">
          <h2>Faturamento por dia</h2>
          <Barras dados={r.dias} rotulo="Faturamento" />
        </section>
      )}
      <div className="sx-grade-2">
        <section className="sx-cartao">
          <h2>Por forma de pagamento</h2>
          {r.formas.length ? <BarrasH dados={r.formas} /> : <Vazio>Sem vendas no período.</Vazio>}
        </section>
        <section className="sx-cartao">
          <h2>Por origem</h2>
          {r.origens.length ? <BarrasH dados={r.origens} /> : <Vazio>Sem vendas no período.</Vazio>}
        </section>
      </div>
      {r.comissoes.length > 0 && (
        <section className="sx-cartao">
          <h2>Comissões por profissional</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Atendimentos</th>
                  <th>Serviços</th>
                  <th>Comissão a pagar</th>
                </tr>
              </thead>
              <tbody>
                {r.comissoes.map((c) => (
                  <tr key={c.nome}>
                    <td>{c.nome}</td>
                    <td>{num(c.atendimentos)}</td>
                    <td>{brl(c.servicos)}</td>
                    <td>
                      <strong>{brl(c.comissao)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="sx-cartao">
        <h2>Produtos e serviços mais vendidos</h2>
        {r.produtos.length === 0 ? (
          <Vazio>Sem vendas no período.</Vazio>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd</th>
                  <th>Receita</th>
                  <th>Lucro bruto</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody>
                {r.produtos.slice(0, 20).map((x) => (
                  <tr key={x.nome}>
                    <td className="sx-quebra">{x.nome}</td>
                    <td>{num(x.qtd, 3)}</td>
                    <td>{brl(x.receita)}</td>
                    <td>{x.custo ? brl(x.receita - x.custo) : <span className="muted">sem custo</span>}</td>
                    <td>{x.custo && x.receita ? `${num(((x.receita - x.custo) / x.receita) * 100, 1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {ativos.includes('funil') && funil.length > 0 && (
        <section className="sx-cartao">
          <h2>Conversão do funil por origem (todo o período)</h2>
          <BarrasH dados={funil} formato={(v) => `${num(v, 0)}%`} />
        </section>
      )}
    </div>
  )
}
