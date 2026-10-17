'use client'

// Estoque calculado pelos movimentos (entrada, venda, ajuste, perda). Nada de número solto no cadastro.

import { useMemo, useState } from 'react'
import { Chips, Combo, Kpis, Modal, Selo, Topo, Vazio, useMapa, useSistema, useTabela } from '../base'
import { tabelas } from '@/lib/sistemas/schema'
import { addDias, brl, dataBR, hojeISO, num, parseValor, round2, saldos } from '@/lib/sistemas/regras'

const motivoNome = (m) => tabelas.estoque_mov.campos.find((c) => c.id === 'motivo').opcoes.find(([id]) => id === m)?.[1] ?? m

export default function Estoque() {
  const produtos = useTabela('produtos')
  const movs = useTabela('estoque_mov')
  const porId = useMapa('produtos')
  const [filtro, setFiltro] = useState('todos')
  const [acao, setAcao] = useState(null)
  const [busca, setBusca] = useState('')
  const sald = useMemo(() => saldos(movs), [movs])
  const controlados = produtos.filter((p) => p.controla_estoque && p.ativo !== false)
  const baixo = (p) => (sald.get(p.id) || 0) <= (Number(p.estoque_minimo) || 0)
  const q = busca.trim().toLowerCase()
  const lista = controlados
    .filter((p) => (filtro === 'baixo' ? baixo(p) : true) && (!q || p.nome.toLowerCase().includes(q) || String(p.codigo_barras || '').includes(q)))
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const valorCusto = controlados.reduce((s, p) => s + Math.max(0, sald.get(p.id) || 0) * (Number(p.custo) || 0), 0)
  const valorVenda = controlados.reduce((s, p) => s + Math.max(0, sald.get(p.id) || 0) * (Number(p.preco) || 0), 0)

  return (
    <div className="sx-modulo">
      <Topo titulo="Estoque" sub={`${controlados.length} produtos com estoque controlado`}>
        <input className="sx-busca" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={() => setAcao({ tipo: 'compra' })}>
          Entrada de mercadoria
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setAcao({ tipo: 'ajuste' })}>
          Ajuste / inventário
        </button>
      </Topo>
      <Kpis
        itens={[
          ['Estoque a preço de custo', brl(valorCusto)],
          ['Estoque a preço de venda', brl(valorVenda), `margem bruta ${brl(valorVenda - valorCusto)}`],
          ['Abaixo do mínimo', controlados.filter(baixo).length, 'produtos para repor', controlados.some(baixo) ? 'erro' : 'ok'],
        ]}
      />
      <Chips
        valor={filtro}
        onChange={setFiltro}
        opcoes={[
          ['todos', 'Todos', controlados.length],
          ['baixo', 'Abaixo do mínimo', controlados.filter(baixo).length],
        ]}
      />
      {lista.length === 0 ? (
        <Vazio>Nenhum produto. Marque “Controlar estoque” no cadastro do produto.</Vazio>
      ) : (
        <div className="table-wrap">
          <table className="table sx-tabela-clique">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Saldo</th>
                <th>Mínimo</th>
                <th>Custo</th>
                <th>Preço</th>
                <th>Margem</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const s = sald.get(p.id) || 0
                const margem = Number(p.preco) ? ((Number(p.preco) - Number(p.custo || 0)) / Number(p.preco)) * 100 : 0
                return (
                  <tr key={p.id} onClick={() => setAcao({ tipo: 'compra', produto_id: p.id })}>
                    <td className="sx-quebra">
                      {p.nome}
                      {p.codigo_barras && <small className="muted"> · {p.codigo_barras}</small>}
                    </td>
                    <td>
                      <Selo tom={baixo(p) ? 'erro' : 'ok'}>
                        {num(s, 3)} {p.unidade || 'un'}
                      </Selo>
                    </td>
                    <td>{num(p.estoque_minimo)}</td>
                    <td>{brl(p.custo)}</td>
                    <td>{brl(p.preco)}</td>
                    <td>{num(margem, 1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <section className="sx-cartao">
        <h2>Últimos movimentos</h2>
        <ul className="sx-lista-simples">
          {movs.slice(0, 25).map((m) => (
            <li key={m.id}>
              <small className="muted">{dataBR(m.criado_em, true)}</small> {porId.get(m.produto_id)?.nome}: <Selo tom={Number(m.qtd) >= 0 ? 'ok' : 'neutro'}>{Number(m.qtd) > 0 ? `+${num(m.qtd, 3)}` : num(m.qtd, 3)}</Selo> {motivoNome(m.motivo)}
            </li>
          ))}
        </ul>
      </section>
      {acao && <Movimento inicial={acao} saldo={sald} onFechar={() => setAcao(null)} />}
    </div>
  )
}

function Movimento({ inicial, saldo, onFechar }) {
  const { banco } = useSistema()
  const [produtoId, setProdutoId] = useState(inicial.produto_id || '')
  const [qtd, setQtd] = useState('')
  const [custo, setCusto] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [lancar, setLancar] = useState(true)
  const [vencimento, setVencimento] = useState(() => addDias(hojeISO(), 28))
  const [motivo, setMotivo] = useState('ajuste')
  const p = banco.get('produtos', produtoId)
  const compra = inicial.tipo === 'compra'
  const atual = saldo.get(produtoId) || 0

  const salvar = (e) => {
    e.preventDefault()
    if (!p) return
    const n = parseValor(qtd)
    if (compra) {
      if (!(n > 0)) return
      const c = custo === '' ? Number(p.custo) || 0 : parseValor(custo)
      const pares = [['estoque_mov', { produto_id: p.id, qtd: n, motivo: 'compra', custo_unit: c, fornecedor_id: fornecedor }]]
      if (c && c !== Number(p.custo)) pares.push(['produtos', { id: p.id, custo: c }])
      if (lancar && c > 0) pares.push(['lancamentos', { tipo: 'despesa', descricao: `Compra: ${num(n, 3)}x ${p.nome}`, valor: round2(n * c), vencimento, categoria: 'fornecedor', fornecedor_id: fornecedor }])
      banco.salvarVarios(pares)
    } else {
      // No ajuste a pessoa informa o que contou; o movimento é a diferença.
      const dif = round2(n - atual)
      if (dif) banco.salvar('estoque_mov', { produto_id: p.id, qtd: dif, motivo })
    }
    onFechar()
  }

  return (
    <Modal titulo={compra ? 'Entrada de mercadoria' : 'Ajuste de estoque'} onFechar={onFechar}>
      <form className="sx-form" onSubmit={salvar}>
        <div className="field">
          <span className="field-label">Produto</span>
          <Combo tabela="produtos" value={produtoId} onChange={setProdutoId} filtro={(x) => x.controla_estoque} autoFocus={!produtoId} />
          {p && (
            <small className="field-hint">
              Saldo atual: {num(atual, 3)} {p.unidade || 'un'}
            </small>
          )}
        </div>
        <div className="sx-form-grid">
          <label className="field">
            <span className="field-label">{compra ? 'Quantidade que entrou' : 'Quantidade contada na prateleira'}</span>
            <input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus={Boolean(produtoId)} />
          </label>
          {compra ? (
            <label className="field">
              <span className="field-label">Custo unitário</span>
              <span className="sx-moeda">
                <span>R$</span>
                <input inputMode="decimal" value={custo} placeholder={p ? Number(p.custo || 0).toFixed(2).replace('.', ',') : ''} onChange={(e) => setCusto(e.target.value)} />
              </span>
            </label>
          ) : (
            <label className="field">
              <span className="field-label">Motivo</span>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option value="ajuste">Ajuste de inventário</option>
                <option value="perda">Perda / vencido</option>
              </select>
            </label>
          )}
        </div>
        {compra && (
          <>
            <div className="field">
              <span className="field-label">Fornecedor</span>
              <Combo tabela="fornecedores" value={fornecedor} onChange={setFornecedor} />
            </div>
            <label className="check">
              <input type="checkbox" checked={lancar} onChange={(e) => setLancar(e.target.checked)} />
              Lançar no contas a pagar com vencimento em
              <input type="date" className="sx-data-inline" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </label>
          </>
        )}
        <div className="sx-acoes">
          <button type="submit" className="btn btn-primary" disabled={!p}>
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  )
}
