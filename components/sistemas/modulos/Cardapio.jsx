'use client'

// Divulgação do cardápio online: link, QR Code, regras de entrega e o que aparece para o cliente.

import { useEffect, useMemo, useState } from 'react'
import { Kpis, Selo, Topo, useConfig, useMapa, useSistema, useTabela } from '../base'
import { brl, parseValor } from '@/lib/sistemas/regras'
import { linkPublico } from './Pedidos'

export default function Cardapio() {
  const { banco, conexao, nicho, ir } = useSistema()
  const cfg = useConfig()
  const produtos = useTabela('produtos')
  const categorias = useMapa('categorias')
  const vendas = useTabela('vendas')
  const [qr, setQr] = useState('')
  const caminho = linkPublico(conexao, nicho, 'cardapio')
  const [url, setUrl] = useState(caminho)

  useEffect(() => {
    const completo = `${window.location.origin}${caminho}`
    setUrl(completo)
    import('qrcode').then(({ default: QR }) => QR.toDataURL(completo, { width: 360, margin: 1 }).then(setQr))
  }, [caminho])

  const doCardapio = vendas.filter((v) => v.origem === 'cardapio' && v.status !== 'cancelada')
  const ultimos30 = doCardapio.filter((v) => Date.now() - new Date(v.criado_em).getTime() < 30 * 86400000)
  const lista = useMemo(() => [...produtos].sort((a, b) => (categorias.get(a.categoria_id)?.ordem ?? 99) - (categorias.get(b.categoria_id)?.ordem ?? 99) || a.nome.localeCompare(b.nome)), [produtos, categorias])

  return (
    <div className="sx-modulo">
      <Topo titulo="Cardápio online" sub="O cliente abre pelo link ou QR Code, monta o pedido e ele cai no painel de pedidos.">
        <a className="btn btn-primary" href={caminho} target="_blank" rel="noopener noreferrer">
          Ver como cliente ↗
        </a>
        <button type="button" className="btn btn-ghost" onClick={() => ir('pedidos')}>
          Painel de pedidos
        </button>
      </Topo>
      <Kpis
        itens={[
          ['Situação', cfg.loja_aberta ? 'Aberto' : 'Fechado', cfg.loja_aberta ? 'recebendo pedidos' : 'pedidos bloqueados', cfg.loja_aberta ? 'ok' : 'erro'],
          ['Pedidos online (30 dias)', ultimos30.length, brl(ultimos30.reduce((s, v) => s + Number(v.total), 0))],
          ['Itens no cardápio', produtos.filter((p) => p.ativo !== false && p.publicado !== false).length, `de ${produtos.length} cadastrados`],
        ]}
      />
      <div className="sx-grade-2">
        <section className="sx-cartao sx-centro">
          <h2>Link e QR Code</h2>
          {qr && <img src={qr} alt="QR Code do cardápio" width={180} height={180} className="sx-qr" />}
          <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Link do cardápio" />
          <div className="sx-acoes">
            <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(url)}>
              Copiar link
            </button>
            {qr && (
              <a className="btn btn-ghost" href={qr} download="qrcode-cardapio.png">
                Baixar QR Code
              </a>
            )}
          </div>
          {!conexao && <p className="muted small">Na demonstração, o cardápio só funciona neste navegador. Conectado a uma planilha, o link funciona para qualquer pessoa.</p>}
        </section>
        <section className="sx-cartao">
          <h2>Regras do pedido</h2>
          <Regra rotulo="Recebendo pedidos">
            <label className="sx-switch">
              <input type="checkbox" checked={Boolean(cfg.loja_aberta)} onChange={(e) => banco.setConfig({ loja_aberta: e.target.checked })} />
              <span>{cfg.loja_aberta ? 'Sim' : 'Não'}</span>
            </label>
          </Regra>
          <Regra rotulo="Taxa de entrega">
            <ValorConfig chave="taxa_entrega" valor={cfg.taxa_entrega} />
          </Regra>
          <Regra rotulo="Pedido mínimo">
            <ValorConfig chave="pedido_minimo" valor={cfg.pedido_minimo} />
          </Regra>
          <Regra rotulo="Tempo de entrega">
            <input defaultValue={cfg.tempo_entrega} onBlur={(e) => banco.setConfig({ tempo_entrega: e.target.value })} />
          </Regra>
          <Regra rotulo="WhatsApp da loja">
            <input defaultValue={cfg.whatsapp} onBlur={(e) => banco.setConfig({ whatsapp: e.target.value })} />
          </Regra>
          <p className="muted small">Horário, Pix e endereço ficam em Configurações.</p>
        </section>
      </div>
      <section className="sx-cartao">
        <h2>O que aparece no cardápio</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>No cardápio</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="sx-quebra">
                    {p.nome}
                    {p.adicionais && <small className="muted"> · com adicionais</small>}
                  </td>
                  <td>{categorias.get(p.categoria_id)?.nome}</td>
                  <td>
                    <span className="sx-moeda pequeno">
                      <span>R$</span>
                      <input inputMode="decimal" defaultValue={Number(p.preco).toFixed(2).replace('.', ',')} onBlur={(e) => parseValor(e.target.value) !== Number(p.preco) && banco.salvar('produtos', { id: p.id, preco: parseValor(e.target.value) })} aria-label={`Preço de ${p.nome}`} />
                    </span>
                  </td>
                  <td>
                    <button type="button" className="sx-link" onClick={() => banco.salvar('produtos', { id: p.id, publicado: p.publicado === false })}>
                      <Selo tom={p.publicado === false || p.ativo === false ? 'neutro' : 'ok'}>{p.publicado === false || p.ativo === false ? 'Escondido' : 'Visível'}</Selo>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Regra({ rotulo, children }) {
  return (
    <div className="sx-regra">
      <span>{rotulo}</span>
      <div>{children}</div>
    </div>
  )
}

function ValorConfig({ chave, valor }) {
  const { banco } = useSistema()
  return (
    <span className="sx-moeda pequeno">
      <span>R$</span>
      <input inputMode="decimal" defaultValue={Number(valor || 0).toFixed(2).replace('.', ',')} onBlur={(e) => banco.setConfig({ [chave]: parseValor(e.target.value) })} />
    </span>
  )
}
