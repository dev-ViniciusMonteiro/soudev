'use client'

// Peças de venda usadas por vários módulos: pagamento, QR Code Pix, editor de itens e impressão.

import { useEffect, useMemo, useState } from 'react'
import { Combo, Modal, useConfig, useSistema, useTabela } from './base'
import { fiadoEmAberto } from '@/lib/sistemas/acoes'
import { FORMAS_PAGAMENTO } from '@/lib/sistemas/schema'
import { brl, dataBR, num, parseValor, round2, totalItens } from '@/lib/sistemas/regras'
import { gerarPixPayload } from '@/lib/pix'

const formaNome = (id) => FORMAS_PAGAMENTO.find(([f]) => f === id)?.[1] ?? id

export function QrPix({ valor, txid, tamanho = 180 }) {
  const cfg = useConfig()
  const [img, setImg] = useState('')
  const payload = useMemo(
    () => (cfg.pix_chave ? gerarPixPayload({ chave: cfg.pix_chave, nome: cfg.pix_nome || cfg.empresa_nome, cidade: cfg.cidade, valor: Number(valor) || 0, txid }) : ''),
    [cfg.pix_chave, cfg.pix_nome, cfg.empresa_nome, cfg.cidade, valor, txid],
  )
  useEffect(() => {
    if (!payload) return
    let vivo = true
    import('qrcode').then(({ default: QR }) => QR.toDataURL(payload, { width: tamanho * 2, margin: 1 }).then((url) => vivo && setImg(url)))
    return () => {
      vivo = false
    }
  }, [payload, tamanho])
  if (!cfg.pix_chave) return <p className="muted small">Cadastre a chave Pix em Configurações para mostrar o QR Code.</p>
  return (
    <div className="sx-pix">
      {img && <img src={img} alt="QR Code Pix" width={tamanho} height={tamanho} />}
      <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(payload)}>
        Copiar Pix copia e cola
      </button>
    </div>
  )
}

/**
 * Recebe o pagamento de um total, em uma ou várias formas. Dinheiro calcula troco;
 * fiado exige cliente e respeita o limite cadastrado.
 */
export function Pagamento({ total, cliente, onConfirmar, onFechar, titulo = 'Receber pagamento', permitirFiado = true }) {
  const { banco, nicho } = useSistema()
  const formas = FORMAS_PAGAMENTO.filter(([f]) => f !== 'fiado' || permitirFiado)
  const [pagamentos, setPagamentos] = useState([])
  const [forma, setForma] = useState('dinheiro')
  const [valor, setValor] = useState(total.toFixed(2).replace('.', ','))
  const [erro, setErro] = useState('')
  const pago = round2(pagamentos.reduce((s, p) => s + p.valor, 0))
  const falta = round2(Math.max(0, total - pago))
  const dinheiro = pagamentos.filter((p) => p.forma === 'dinheiro').reduce((s, p) => s + p.valor, 0)
  const troco = round2(Math.max(0, pago - total))
  const pronto = pago >= total - 0.004 && troco <= dinheiro + 0.004

  useEffect(() => {
    setValor(falta.toFixed(2).replace('.', ','))
  }, [falta])

  const adicionar = (f = forma, v = parseValor(valor)) => {
    setErro('')
    if (!(v > 0)) return setErro('Informe um valor.')
    if (f !== 'dinheiro' && v > falta + 0.004) return setErro('Só o dinheiro pode passar do total (para dar troco).')
    if (f === 'fiado') {
      if (!cliente) return setErro('Para vender fiado, escolha o cliente.')
      const limite = Number(cliente.limite_fiado) || 0
      const aberto = fiadoEmAberto(banco, cliente.id)
      if (nicho.slug === 'mercadinho-pdv' && limite > 0 && aberto + v > limite) return setErro(`Passa do limite de fiado: ${brl(limite)} (em aberto: ${brl(aberto)}).`)
    }
    setPagamentos((l) => [...l, { forma: f, valor: round2(v) }])
  }

  useEffect(() => {
    const atalho = (e) => {
      if (e.key === 'F2' && pronto) {
        e.preventDefault()
        onConfirmar(pagamentos, troco)
      }
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [pronto, pagamentos, troco, onConfirmar])

  return (
    <Modal
      titulo={titulo}
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className="btn btn-primary btn-lg" disabled={!pronto} onClick={() => onConfirmar(pagamentos, troco)}>
            Confirmar (F2)
          </button>
          <button type="button" className="btn btn-ghost" onClick={onFechar}>
            Voltar
          </button>
        </>
      }
    >
      <div className="sx-pag-total">
        <span>Total</span>
        <strong>{brl(total)}</strong>
      </div>
      <div className="sx-pag-formas">
        {formas.map(([f, r]) => (
          <button key={f} type="button" className={forma === f ? 'chip active' : 'chip'} onClick={() => setForma(f)}>
            {r}
          </button>
        ))}
      </div>
      <div className="sx-linha">
        <div className="sx-moeda grande">
          <span>R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            autoFocus
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (falta > 0) adicionar()
                else if (pronto) onConfirmar(pagamentos, troco)
              }
            }}
          />
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => adicionar()} disabled={falta <= 0 && forma !== 'dinheiro'}>
          Adicionar
        </button>
      </div>
      {forma === 'dinheiro' && falta > 0 && (
        <div className="sx-notas">
          {[falta, 10, 20, 50, 100, 200]
            .filter((v, i) => i === 0 || v > falta)
            .slice(0, 5)
            .map((v) => (
              <button key={v} type="button" className="chip" onClick={() => adicionar('dinheiro', v)}>
                {brl(v)}
              </button>
            ))}
        </div>
      )}
      {forma === 'pix' && falta > 0 && <QrPix valor={parseValor(valor) || falta} />}
      {erro && <p className="notice error">{erro}</p>}
      {pagamentos.length > 0 && (
        <ul className="sx-pag-lista">
          {pagamentos.map((p, i) => (
            <li key={i}>
              <span>{formaNome(p.forma)}</span>
              <strong>{brl(p.valor)}</strong>
              <button type="button" className="icon-btn" aria-label="Remover" onClick={() => setPagamentos((l) => l.filter((_, j) => j !== i))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="sx-pag-resumo">
        <span>
          Falta <strong>{brl(falta)}</strong>
        </span>
        {troco > 0 && (
          <span className="sx-troco">
            Troco <strong>{brl(troco)}</strong>
          </span>
        )}
      </div>
    </Modal>
  )
}

/** Lista de itens editável (OS, proposta, comanda). */
export function ItensEditor({ itens, onChange, filtro, precoEditavel = true }) {
  const [produto, setProduto] = useState('')
  const produtos = useTabela('produtos')
  const add = (id) => {
    const p = produtos.find((x) => x.id === id)
    if (!p) return
    const existente = itens.findIndex((i) => i.produto_id === p.id && !i.obs)
    if (existente >= 0) onChange(itens.map((i, k) => (k === existente ? { ...i, qtd: i.qtd + 1 } : i)))
    else onChange([...itens, { produto_id: p.id, nome: p.nome, qtd: 1, preco: Number(p.preco) || 0 }])
    setProduto('')
  }
  const mudar = (k, campo, v) => onChange(itens.map((i, j) => (j === k ? { ...i, [campo]: v } : i)))
  return (
    <div className="sx-itens">
      <Combo tabela="produtos" value={produto} onChange={add} placeholder="Adicionar produto ou serviço…" filtro={(p) => p.ativo !== false && (!filtro || filtro(p))} rotulo={(p) => `${p.nome} · ${brl(p.preco)}`} />
      {itens.length > 0 && (
        <table className="table sx-itens-tabela">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd</th>
              <th>Preço</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {itens.map((i, k) => (
              <tr key={k}>
                <td className="sx-quebra">{i.nome}</td>
                <td>
                  <input className="sx-mini" inputMode="decimal" value={String(i.qtd).replace('.', ',')} onChange={(e) => mudar(k, 'qtd', parseValor(e.target.value) || 0)} />
                </td>
                <td>
                  {precoEditavel ? (
                    <input className="sx-mini largo" inputMode="decimal" defaultValue={Number(i.preco).toFixed(2).replace('.', ',')} onBlur={(e) => mudar(k, 'preco', parseValor(e.target.value))} />
                  ) : (
                    brl(i.preco)
                  )}
                </td>
                <td>{brl(i.preco * i.qtd)}</td>
                <td>
                  <button type="button" className="icon-btn" aria-label="Remover item" onClick={() => onChange(itens.filter((_, j) => j !== k))}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                <strong>Total</strong>
              </td>
              <td colSpan={2}>
                <strong>{brl(totalItens(itens))}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

/* ---------- Impressão ---------- */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Imprime HTML num iframe escondido (cupom 80 mm ou folha A4). */
export function imprimir(html, { cupom = false, titulo = 'Impressão' } = {}) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const css = cupom
    ? '@page{size:80mm auto;margin:3mm}body{font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;width:74mm;margin:0;color:#000}h1{font-size:15px;text-align:center;margin:0 0 4px}p{margin:2px 0}.c{text-align:center}table{width:100%;border-collapse:collapse}td{padding:1px 0;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}hr{border:0;border-top:1px dashed #000;margin:6px 0}.t{font-size:15px;font-weight:bold}'
    : '@page{size:A4;margin:14mm}body{font:13px/1.45 system-ui,Segoe UI,Roboto,sans-serif;color:#111;margin:0}h1{font-size:20px;margin:0}h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}table{width:100%;border-collapse:collapse}th,td{padding:5px 6px;border-bottom:1px solid #ddd;text-align:left}td.n,th.n{text-align:right}.topo{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #111;padding-bottom:8px}.muted{color:#555}.grade{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px}.ass{margin-top:48px;display:flex;gap:40px}.ass div{flex:1;border-top:1px solid #000;text-align:center;padding-top:4px}.total{font-size:16px;font-weight:bold}'
  frame.contentDocument.open()
  frame.contentDocument.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>${html}</body></html>`)
  frame.contentDocument.close()
  setTimeout(() => {
    frame.contentWindow.focus()
    frame.contentWindow.print()
    setTimeout(() => frame.remove(), 1500)
  }, 250)
}

export function htmlCupom(venda, cfg) {
  const linhas = (venda.itens || [])
    .map((i) => `<tr><td>${num(i.qtd, 3)}x ${esc(i.nome)}${i.obs ? `<br><small>${esc(i.obs)}</small>` : ''}</td><td>${brl(i.preco * i.qtd)}</td></tr>`)
    .join('')
  const extra = [
    Number(venda.desconto) ? `<tr><td>Desconto</td><td>- ${brl(venda.desconto)}</td></tr>` : '',
    Number(venda.acrescimo) ? `<tr><td>Taxa de serviço</td><td>${brl(venda.acrescimo)}</td></tr>` : '',
    Number(venda.taxa_entrega) ? `<tr><td>Entrega</td><td>${brl(venda.taxa_entrega)}</td></tr>` : '',
  ].join('')
  const pags = (venda.pagamentos || []).map((p) => `<tr><td>${esc(formaNome(p.forma))}</td><td>${brl(p.valor)}</td></tr>`).join('')
  return `<h1>${esc(cfg.empresa_nome || 'Minha loja')}</h1>
    <p class="c">${esc(cfg.endereco || '')}${cfg.documento ? `<br>${esc(cfg.documento)}` : ''}</p><hr>
    <p>${venda.status === 'orcamento' ? 'ORÇAMENTO' : venda.status === 'aberta' ? 'CONFERÊNCIA' : 'CUPOM NÃO FISCAL'} ${venda.numero ? `#${venda.numero}` : ''}</p>
    <p>${dataBR(venda.concluida_em || venda.criado_em, true)}${venda.mesa ? ` · Mesa ${venda.mesa}` : ''}</p>
    ${venda.cliente_nome ? `<p>Cliente: ${esc(venda.cliente_nome)}</p>` : ''}
    ${venda.endereco ? `<p>Entrega: ${esc(venda.endereco)}</p>` : ''}<hr>
    <table>${linhas}</table><hr><table>${extra}<tr class="t"><td>TOTAL</td><td>${brl(venda.total)}</td></tr>${pags}
    ${Number(venda.troco) ? `<tr><td>Troco</td><td>${brl(venda.troco)}</td></tr>` : ''}</table>
    ${venda.pagamento_previsto ? `<p>Pagamento: ${esc(venda.pagamento_previsto)}</p>` : ''}
    ${venda.obs ? `<p>Obs.: ${esc(venda.obs)}</p>` : ''}<hr><p class="c">Obrigado pela preferência!</p>`
}

export function htmlOS(os, cliente, cfg) {
  const itens = (os.itens || []).map((i) => `<tr><td>${esc(i.nome)}</td><td class="n">${num(i.qtd, 3)}</td><td class="n">${brl(i.preco)}</td><td class="n">${brl(i.preco * i.qtd)}</td></tr>`).join('')
  const check = Object.entries(os.checklist || {})
    .map(([k, v]) => `${esc(k)}: ${v ? 'OK' : 'não'}`)
    .join(' · ')
  return `<div class="topo"><div><h1>${esc(cfg.empresa_nome || 'Assistência técnica')}</h1><div class="muted">${esc(cfg.endereco || '')} ${esc(cfg.empresa_telefone || '')}</div></div>
    <div style="text-align:right"><h1>OS #${os.numero || '—'}</h1><div>Entrada: ${dataBR(os.criado_em, true)}</div><div>Acompanhe com o código <b>${esc(os.codigo_publico || '')}</b></div></div></div>
    <h2>Cliente</h2><div class="grade"><div>${esc(cliente?.nome || '')}</div><div>${esc(cliente?.telefone || '')}</div><div>${esc(cliente?.documento || '')}</div><div>${esc(cliente?.email || '')}</div></div>
    <h2>Equipamento</h2><div class="grade"><div><b>${esc(os.equipamento)}</b> ${esc(os.marca_modelo || '')}</div><div>Série/IMEI/placa: ${esc(os.serie || '')}</div><div>Acessórios: ${esc(os.acessorios || '')}</div><div>Previsão: ${dataBR(os.previsao)}</div></div>
    ${check ? `<p class="muted">Checklist de entrada: ${check}</p>` : ''}
    <h2>Defeito relatado</h2><p>${esc(os.defeito)}</p>
    ${os.laudo ? `<h2>Laudo técnico</h2><p>${esc(os.laudo)}</p>` : ''}
    ${itens ? `<h2>Peças e serviços</h2><table><tr><th>Item</th><th class="n">Qtd</th><th class="n">Preço</th><th class="n">Total</th></tr>${itens}<tr><td colspan="3" class="total">Total</td><td class="n total">${brl(os.total)}</td></tr></table>` : ''}
    <h2>Garantia</h2><p class="muted">Garantia de ${num(os.garantia_dias || 90)} dias para as peças e serviços listados, contada da entrega. Não cobre mau uso, quedas, contato com líquidos ou violação do lacre. Equipamentos não retirados em 90 dias após o aviso de pronto poderão ser descartados conforme a lei.</p>
    <div class="ass"><div>Assinatura do cliente</div><div>${esc(cfg.empresa_nome || 'Responsável técnico')}</div></div>`
}

export function htmlProposta(venda, cfg) {
  const itens = (venda.itens || []).map((i) => `<tr><td>${esc(i.nome)}</td><td class="n">${num(i.qtd, 3)}</td><td class="n">${brl(i.preco)}</td><td class="n">${brl(i.preco * i.qtd)}</td></tr>`).join('')
  return `<div class="topo"><div><h1>${esc(cfg.empresa_nome || 'Proposta comercial')}</h1><div class="muted">${esc(cfg.endereco || '')} ${esc(cfg.empresa_telefone || '')}</div></div>
    <div style="text-align:right"><h1>Proposta #${venda.numero || '—'}</h1><div>${dataBR(venda.criado_em)}</div><div>Válida por 15 dias</div></div></div>
    <h2>Para</h2><p>${esc(venda.cliente_nome || '')}</p>
    <h2>Itens</h2><table><tr><th>Descrição</th><th class="n">Qtd</th><th class="n">Valor</th><th class="n">Total</th></tr>${itens}
    ${Number(venda.desconto) ? `<tr><td colspan="3">Desconto</td><td class="n">- ${brl(venda.desconto)}</td></tr>` : ''}
    <tr><td colspan="3" class="total">Total</td><td class="n total">${brl(venda.total)}</td></tr></table>
    ${venda.obs ? `<h2>Condições</h2><p>${esc(venda.obs)}</p>` : ''}
    ${cfg.pix_chave ? `<p class="muted">Pagamento por Pix: ${esc(cfg.pix_chave)}</p>` : ''}
    <div class="ass"><div>De acordo (cliente)</div><div>${esc(cfg.empresa_nome || '')}</div></div>`
}
