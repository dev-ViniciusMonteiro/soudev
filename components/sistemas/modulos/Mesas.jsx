'use client'

// Mesas e comandas: cada mesa aberta é uma venda "aberta" com origem mesa, fechada com taxa de serviço.

import { useMemo, useState } from 'react'
import { Modal, Topo, useConfig, useSistema, useTabela } from '../base'
import { ItensEditor, Pagamento, htmlCupom, imprimir } from '../comuns'
import { concluirVenda } from '@/lib/sistemas/acoes'
import { brl, contaVenda, novoId, num, round2, totalItens } from '@/lib/sistemas/regras'

export default function Mesas() {
  const { banco } = useSistema()
  const cfg = useConfig()
  const vendas = useTabela('vendas')
  const [mesa, setMesa] = useState(null)
  const qtd = Math.max(1, Math.min(200, Number(cfg.mesas) || 12))
  const abertas = useMemo(() => {
    const m = new Map()
    for (const v of vendas) if (v.origem === 'mesa' && v.status === 'aberta') m.set(Number(v.mesa), v)
    return m
  }, [vendas])

  const ocupadas = abertas.size
  const totalAberto = [...abertas.values()].reduce((s, v) => s + totalItens(v.itens), 0)

  return (
    <div className="sx-modulo">
      <Topo titulo="Mesas e comandas" sub={`${ocupadas} de ${qtd} mesas ocupadas · ${brl(totalAberto)} em consumo`}>
        <button type="button" className="btn btn-ghost" onClick={() => banco.setConfig({ mesas: qtd + 1 })}>
          + Mesa
        </button>
      </Topo>
      <div className="sx-mesas">
        {Array.from({ length: qtd }, (_, i) => i + 1).map((n) => {
          const v = abertas.get(n)
          const min = v ? Math.round((Date.now() - new Date(v.criado_em).getTime()) / 60000) : 0
          return (
            <button key={n} type="button" className={v ? 'sx-mesa ocupada' : 'sx-mesa'} onClick={() => setMesa(n)}>
              <span className="sx-mesa-n">{n}</span>
              {v ? (
                <>
                  <strong>{brl(totalItens(v.itens))}</strong>
                  <small>
                    {(v.itens || []).reduce((s, i) => s + Number(i.qtd), 0)} itens · {min} min
                  </small>
                </>
              ) : (
                <small>Livre</small>
              )}
            </button>
          )
        })}
      </div>
      {mesa && <Comanda numero={mesa} venda={abertas.get(mesa)} onFechar={() => setMesa(null)} />}
    </div>
  )
}

function Comanda({ numero, venda, onFechar }) {
  const { banco, usuario } = useSistema()
  const cfg = useConfig()
  // A comanda nasce no primeiro item, sempre com o mesmo id.
  const [id] = useState(() => venda?.id ?? novoId())
  const [itens, setItens] = useState(venda?.itens ?? [])
  const [servico, setServico] = useState(true)
  const [pessoas, setPessoas] = useState(1)
  const [pagando, setPagando] = useState(false)
  const subtotal = totalItens(itens)
  const acrescimo = servico ? round2((subtotal * (Number(cfg.taxa_servico) || 0)) / 100) : 0
  const { total } = contaVenda({ itens, acrescimo })

  const salvar = (novos) => {
    setItens(novos)
    if (!novos.length && !banco.get('vendas', id)) return
    banco.salvar('vendas', { id, origem: 'mesa', status: 'aberta', entrega: 'local', mesa: numero, itens: novos, subtotal: totalItens(novos), total: totalItens(novos), pagamentos: [], operador: usuario })
  }

  return (
    <Modal
      titulo={`Mesa ${numero}`}
      largo
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className="btn btn-primary" disabled={!itens.length} onClick={() => setPagando(true)}>
            Fechar conta {brl(total)}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!itens.length}
            onClick={() => imprimir(htmlCupom({ itens, mesa: numero, acrescimo, total, status: 'aberta', criado_em: venda?.criado_em || new Date().toISOString() }, cfg), { cupom: true, titulo: `Mesa ${numero}` })}
          >
            Imprimir conferência
          </button>
          {venda && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (!confirm('Liberar a mesa e apagar a comanda?')) return
                banco.salvar('vendas', { id: venda.id, status: 'cancelada' })
                onFechar()
              }}
            >
              Cancelar comanda
            </button>
          )}
        </>
      }
    >
      <ItensEditor itens={itens} onChange={salvar} precoEditavel={false} />
      <div className="sx-comanda-contas">
        <label className="sx-switch">
          <input type="checkbox" checked={servico} onChange={(e) => setServico(e.target.checked)} />
          <span>
            Taxa de serviço {num(cfg.taxa_servico)}%: {brl(acrescimo)}
          </span>
        </label>
        <label className="sx-linha">
          Dividir por
          <input className="sx-mini" type="number" min="1" max="50" value={pessoas} onChange={(e) => setPessoas(Math.max(1, Number(e.target.value) || 1))} />
          pessoas: <strong>{brl(total / pessoas)}</strong> cada
        </label>
      </div>
      {pagando && (
        <Pagamento
          total={total}
          titulo={`Fechar mesa ${numero}`}
          permitirFiado={false}
          onFechar={() => setPagando(false)}
          onConfirmar={(pagamentos, troco) => {
            const v = concluirVenda(banco, { venda: { ...(banco.get('vendas', id) || {}), id, origem: 'mesa', entrega: 'local', mesa: numero, itens, acrescimo }, pagamentos, troco, operador: usuario })
            imprimir(htmlCupom(v, cfg), { cupom: true, titulo: `Mesa ${numero}` })
            onFechar()
          }}
        />
      )}
    </Modal>
  )
}
