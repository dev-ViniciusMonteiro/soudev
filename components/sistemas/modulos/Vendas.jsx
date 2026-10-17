'use client'

// Histórico de vendas, pedidos e orçamentos: detalhe, reimpressão, cancelamento e conversão de orçamento.

import { useMemo, useState } from 'react'
import { Chips, Modal, Selo, Topo, Vazio, useConfig, useSistema, useTabela } from '../base'
import { Pagamento, htmlCupom, htmlProposta, imprimir } from '../comuns'
import { cancelarVenda, concluirVenda } from '@/lib/sistemas/acoes'
import { FORMAS_PAGAMENTO, tabelas } from '@/lib/sistemas/schema'
import { brl, csv, dataBR, linkWhats, num, pagamentosResumo, resumoItens } from '@/lib/sistemas/regras'
import { downloadBlob } from '@/lib/client'

const origemNome = (o) => tabelas.vendas.campos.find((c) => c.id === 'origem').opcoes.find(([id]) => id === o)?.[1] ?? o
const tom = { concluida: 'ok', aberta: 'aviso', orcamento: 'info', cancelada: 'erro' }
const statusNome = { concluida: 'Concluída', aberta: 'Aberta', orcamento: 'Orçamento', cancelada: 'Cancelada' }

export default function Vendas() {
  const vendas = useTabela('vendas')
  const [filtro, setFiltro] = useState('concluida')
  const [busca, setBusca] = useState('')
  const [ver, setVer] = useState(null)
  const q = busca.trim().toLowerCase()
  const lista = useMemo(
    () => vendas.filter((v) => (filtro === 'todas' || v.status === filtro) && (!q || String(v.numero).includes(q) || String(v.cliente_nome || '').toLowerCase().includes(q) || resumoItens(v.itens).toLowerCase().includes(q))),
    [vendas, filtro, q],
  )
  const exportar = () => {
    const linhas = [['Número', 'Data', 'Cliente', 'Origem', 'Situação', 'Itens', 'Subtotal', 'Desconto', 'Total', 'Pagamentos']]
    for (const v of lista) linhas.push([v.numero, dataBR(v.concluida_em || v.criado_em, true), v.cliente_nome, origemNome(v.origem), statusNome[v.status], resumoItens(v.itens), v.subtotal, v.desconto, v.total, pagamentosResumo(v.pagamentos, FORMAS_PAGAMENTO)])
    downloadBlob(new Blob([csv(linhas)], { type: 'text/csv;charset=utf-8' }), 'vendas.csv')
  }

  return (
    <div className="sx-modulo">
      <Topo titulo="Histórico de vendas" sub={`${lista.length} registros · ${brl(lista.reduce((s, v) => s + Number(v.total || 0), 0))}`}>
        <input className="sx-busca" placeholder="Nº, cliente ou produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="button" className="btn btn-ghost" onClick={exportar}>
          Exportar CSV
        </button>
      </Topo>
      <Chips
        valor={filtro}
        onChange={setFiltro}
        opcoes={[
          ['concluida', 'Concluídas', vendas.filter((v) => v.status === 'concluida').length],
          ['aberta', 'Em aberto', vendas.filter((v) => v.status === 'aberta').length],
          ['orcamento', 'Orçamentos', vendas.filter((v) => v.status === 'orcamento').length],
          ['cancelada', 'Canceladas', vendas.filter((v) => v.status === 'cancelada').length],
          ['todas', 'Todas'],
        ]}
      />
      {lista.length === 0 ? (
        <Vazio>Nenhuma venda aqui.</Vazio>
      ) : (
        <div className="table-wrap">
          <table className="table sx-tabela-clique">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Origem</th>
                <th>Total</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.slice(0, 300).map((v) => (
                <tr key={v.id} onClick={() => setVer(v)}>
                  <td>#{v.numero || '—'}</td>
                  <td>{dataBR(v.concluida_em || v.criado_em, true)}</td>
                  <td>{v.cliente_nome || <span className="muted">—</span>}</td>
                  <td className="sx-corta-celula">{resumoItens(v.itens)}</td>
                  <td>{origemNome(v.origem)}</td>
                  <td>{brl(v.total)}</td>
                  <td>
                    <Selo tom={tom[v.status]}>{statusNome[v.status]}</Selo>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista.length > 300 && <p className="muted small">Mostrando as 300 mais recentes. Use a busca ou exporte o CSV.</p>}
      {ver && <DetalheVenda venda={ver} onFechar={() => setVer(null)} />}
    </div>
  )
}

function DetalheVenda({ venda, onFechar }) {
  const { banco, usuario } = useSistema()
  const cfg = useConfig()
  const [pagar, setPagar] = useState(false)
  const v = banco.get('vendas', venda.id) || venda
  return (
    <Modal
      titulo={`${statusNome[v.status]} #${v.numero || '—'}`}
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => imprimir(v.status === 'orcamento' ? htmlProposta(v, cfg) : htmlCupom(v, cfg), { cupom: v.status !== 'orcamento', titulo: `Venda ${v.numero}` })}>
            Imprimir
          </button>
          {v.status === 'orcamento' && (
            <button type="button" className="btn btn-primary" onClick={() => setPagar(true)}>
              Converter em venda
            </button>
          )}
          {v.telefone && (
            <a className="btn btn-ghost" target="_blank" rel="noopener noreferrer" href={linkWhats(v.telefone, `${cfg.empresa_nome || ''} - ${statusNome[v.status]} #${v.numero}: ${resumoItens(v.itens)}. Total ${brl(v.total)}.`)}>
              WhatsApp
            </a>
          )}
          {['concluida', 'orcamento'].includes(v.status) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const motivo = prompt('Motivo do cancelamento')
                if (motivo === null) return
                cancelarVenda(banco, v, motivo)
                onFechar()
              }}
            >
              Cancelar
            </button>
          )}
        </>
      }
    >
      <p className="muted">
        {dataBR(v.concluida_em || v.criado_em, true)} · {origemNome(v.origem)}
        {v.operador ? ` · ${v.operador}` : ''}
      </p>
      {v.cliente_nome && (
        <p>
          <strong>{v.cliente_nome}</strong> {v.telefone}
        </p>
      )}
      <ul className="sx-lista-valores">
        {(v.itens || []).map((i, k) => (
          <li key={k}>
            <span>
              {num(i.qtd, 3)}x {i.nome}
            </span>
            <strong>{brl(i.preco * i.qtd)}</strong>
          </li>
        ))}
        {Number(v.desconto) > 0 && (
          <li>
            <span>Desconto</span>
            <strong>− {brl(v.desconto)}</strong>
          </li>
        )}
        {Number(v.acrescimo) > 0 && (
          <li>
            <span>Taxa de serviço</span>
            <strong>{brl(v.acrescimo)}</strong>
          </li>
        )}
        {Number(v.taxa_entrega) > 0 && (
          <li>
            <span>Entrega</span>
            <strong>{brl(v.taxa_entrega)}</strong>
          </li>
        )}
        <li className="sx-total">
          <span>Total</span>
          <strong>{brl(v.total)}</strong>
        </li>
      </ul>
      {(v.pagamentos || []).length > 0 && <p className="small">Pago: {pagamentosResumo(v.pagamentos, FORMAS_PAGAMENTO)}{Number(v.troco) ? ` · troco ${brl(v.troco)}` : ''}</p>}
      {v.obs && <p className="small muted">{v.obs}</p>}
      {pagar && (
        <Pagamento
          total={v.total}
          cliente={banco.get('clientes', v.cliente_id)}
          onFechar={() => setPagar(false)}
          onConfirmar={(pagamentos, troco) => {
            concluirVenda(banco, { venda: v, pagamentos, troco, operador: usuario })
            onFechar()
          }}
        />
      )}
    </Modal>
  )
}
