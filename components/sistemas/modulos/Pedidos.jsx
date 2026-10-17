'use client'

// Painel de pedidos do cardápio online (e da cozinha): colunas por etapa, aviso sonoro de pedido novo.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Selo, Topo, Vazio, bip, useConfig, useSistema, useTabela } from '../base'
import { Pagamento, htmlCupom, imprimir } from '../comuns'
import { concluirVenda } from '@/lib/sistemas/acoes'
import { idDaUrl } from '@/lib/sistemas/api'
import { ETAPAS_PEDIDO } from '@/lib/sistemas/schema'
import { brl, hojeISO, horaBR, linkWhats, num } from '@/lib/sistemas/regras'

const colunas = ETAPAS_PEDIDO.filter(([e]) => e !== 'entregue')
const proxima = { novo: 'preparo', preparo: 'pronto', pronto: 'saiu', saiu: 'entregue' }
const botao = { novo: 'Aceitar e preparar', preparo: 'Marcar pronto', pronto: 'Saiu para entrega', saiu: 'Entregue e pago' }
// Mensagem do WhatsApp conforme a etapa atual do pedido.
const mensagem = {
  novo: (v, loja) => `Olá, ${v.cliente_nome}! Recebemos seu pedido #${v.numero} na ${loja}. Total ${brl(v.total)}. Já já começamos a preparar!`,
  preparo: (v, loja) => `Olá, ${v.cliente_nome}! Seu pedido #${v.numero} na ${loja} foi aceito e já está sendo preparado.`,
  pronto: (v, loja) => (v.entrega === 'entrega' ? `Seu pedido #${v.numero} da ${loja} está pronto e logo sai para entrega.` : `Seu pedido #${v.numero} da ${loja} está pronto para retirada!`),
  saiu: (v, loja) => `Seu pedido #${v.numero} da ${loja} saiu para entrega! Total ${brl(v.total)}${v.pagamento_previsto ? ` (${v.pagamento_previsto})` : ''}.`,
}

export function linkPublico(conexao, nicho, pagina) {
  const fonte = conexao ? idDaUrl(conexao.url) : `demo-${nicho.slug}`
  return `/loja/${pagina}?s=${encodeURIComponent(fonte)}`
}

export default function Pedidos() {
  const { banco, usuario, conexao, nicho } = useSistema()
  const cfg = useConfig()
  const vendas = useTabela('vendas')
  const [receber, setReceber] = useState(null)
  const [ver, setVer] = useState(null)
  const [novos, setNovos] = useState(0)
  const vistos = useRef(null)

  const pedidos = useMemo(() => vendas.filter((v) => v.origem === 'cardapio' && v.status === 'aberta').sort((a, b) => a.criado_em.localeCompare(b.criado_em)), [vendas])
  const entreguesHoje = useMemo(
    () => vendas.filter((v) => v.origem === 'cardapio' && v.status === 'concluida' && hojeISO(new Date(v.concluida_em || v.criado_em)) === hojeISO()),
    [vendas],
  )

  // Bipa quando chega pedido novo (vindo do cardápio em outra aba ou da planilha).
  useEffect(() => {
    const ids = new Set(pedidos.filter((p) => p.etapa === 'novo').map((p) => p.id))
    if (vistos.current) {
      const chegaram = [...ids].filter((id) => !vistos.current.has(id)).length
      if (chegaram) {
        bip()
        setNovos((n) => n + chegaram)
      }
    }
    vistos.current = ids
  }, [pedidos])

  const avancar = (v) => {
    // Retirada no balcão pula a etapa de entrega.
    const etapa = v.etapa === 'pronto' && v.entrega !== 'entrega' ? 'entregue' : proxima[v.etapa] || 'preparo'
    if (etapa === 'entregue') return setReceber(v)
    banco.salvar('vendas', { id: v.id, etapa })
  }

  return (
    <div className="sx-modulo">
      <Topo titulo="Pedidos" sub={`${pedidos.length} em andamento · ${entreguesHoje.length} entregues hoje · ${cfg.loja_aberta ? 'cardápio recebendo pedidos' : 'cardápio fechado'}`}>
        <a className="btn btn-primary" href={linkPublico(conexao, nicho, 'cardapio')} target="_blank" rel="noopener noreferrer">
          Abrir cardápio do cliente ↗
        </a>
        <button type="button" className="btn btn-ghost" onClick={() => banco.setConfig({ loja_aberta: !cfg.loja_aberta })}>
          {cfg.loja_aberta ? 'Fechar loja' : 'Abrir loja'}
        </button>
      </Topo>
      {novos > 0 && (
        <button type="button" className="notice warn sx-largo sx-aviso-novo" onClick={() => setNovos(0)}>
          🔔 {novos} {novos === 1 ? 'pedido novo chegou' : 'pedidos novos chegaram'}. Toque para dispensar.
        </button>
      )}
      {!conexao && <p className="muted small">Dica: abra o cardápio do cliente em outra aba, faça um pedido e veja ele chegar aqui com aviso sonoro.</p>}

      <div className="sx-kanban">
        {colunas.map(([etapa, nome]) => {
          const lista = pedidos.filter((p) => (p.etapa || 'novo') === etapa)
          return (
            <section key={etapa} className={`sx-coluna-k etapa-${etapa}`}>
              <header>
                <h2>{nome}</h2>
                <span className="sx-chip-n">{lista.length}</span>
              </header>
              {lista.length === 0 && <Vazio>Nenhum pedido.</Vazio>}
              {lista.map((v) => {
                const min = Math.round((Date.now() - new Date(v.criado_em).getTime()) / 60000)
                return (
                  <article key={v.id} className="sx-card-k">
                    <button type="button" className="sx-card-k-topo" onClick={() => setVer(v)}>
                      <strong>#{v.numero || '—'}</strong>
                      <span>{v.cliente_nome}</span>
                      <Selo tom={min > 45 ? 'erro' : min > 25 ? 'aviso' : 'neutro'}>
                        {horaBR(v.criado_em)} · {min} min
                      </Selo>
                    </button>
                    <ul className="sx-card-itens">
                      {(v.itens || []).map((i, k) => (
                        <li key={k}>
                          <b>{num(i.qtd)}x</b> {i.nome}
                          {i.obs && <em> — {i.obs}</em>}
                        </li>
                      ))}
                    </ul>
                    {v.obs && <p className="sx-card-obs">Obs.: {v.obs}</p>}
                    <p className="small muted">
                      {v.entrega === 'entrega' ? `🛵 ${v.endereco}` : '🏃 Retirada no balcão'} · {v.pagamento_previsto || 'pagamento a combinar'}
                    </p>
                    <div className="sx-card-k-pe">
                      <strong>{brl(v.total)}</strong>
                      <button type="button" className="btn btn-primary" onClick={() => avancar(v)}>
                        {v.etapa === 'pronto' && v.entrega !== 'entrega' ? 'Retirado e pago' : botao[v.etapa || 'novo']}
                      </button>
                    </div>
                    <div className="sx-card-k-links">
                      {v.telefone && (
                        <a href={linkWhats(v.telefone, mensagem[v.etapa || 'novo'](v, cfg.empresa_nome || 'loja'))} target="_blank" rel="noopener noreferrer">
                          Avisar no WhatsApp
                        </a>
                      )}
                      <button type="button" className="sx-link" onClick={() => imprimir(htmlCupom(v, cfg), { cupom: true, titulo: `Pedido ${v.numero}` })}>
                        Imprimir
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>

      {ver && (
        <Modal titulo={`Pedido #${ver.numero || '—'}`} onFechar={() => setVer(null)}>
          <p>
            <strong>{ver.cliente_nome}</strong> · {ver.telefone}
          </p>
          <p className="muted">{ver.entrega === 'entrega' ? `Entrega: ${ver.endereco}` : 'Retirada'}</p>
          <ul className="sx-lista-valores">
            {(ver.itens || []).map((i, k) => (
              <li key={k}>
                <span>
                  {num(i.qtd)}x {i.nome}
                  {i.obs && <small className="muted"> ({i.obs})</small>}
                </span>
                <strong>{brl(i.preco * i.qtd)}</strong>
              </li>
            ))}
            {Number(ver.taxa_entrega) > 0 && (
              <li>
                <span>Entrega</span>
                <strong>{brl(ver.taxa_entrega)}</strong>
              </li>
            )}
            <li>
              <span>Total</span>
              <strong>{brl(ver.total)}</strong>
            </li>
          </ul>
          <p>Pagamento: {ver.pagamento_previsto || '—'}</p>
          <p className="muted small">Código de acompanhamento: {ver.codigo_publico}</p>
          <div className="sx-acoes">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (!confirm('Cancelar este pedido?')) return
                banco.salvar('vendas', { id: ver.id, status: 'cancelada' })
                setVer(null)
              }}
            >
              Cancelar pedido
            </button>
          </div>
        </Modal>
      )}

      {receber && (
        <Pagamento
          total={receber.total}
          titulo={`Receber pedido #${receber.numero || ''}`}
          cliente={banco.get('clientes', receber.cliente_id)}
          onFechar={() => setReceber(null)}
          onConfirmar={(pagamentos, troco) => {
            concluirVenda(banco, { venda: receber, pagamentos, troco, operador: usuario })
            setReceber(null)
          }}
        />
      )}
    </div>
  )
}
