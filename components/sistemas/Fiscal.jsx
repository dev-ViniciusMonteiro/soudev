'use client'

// Nota fiscal simulada: janela de emissão com as etapas de uma API fiscal, DANFE com QR Code e cancelamento.

import { useEffect, useMemo, useState } from 'react'
import { Modal, Selo, useConfig, useMapa, useSistema } from './base'
import { imprimir } from './comuns'
import { cancelarSimulado, emitirSimulado, formatarChave, qrConteudo, tipoNota, validar } from '@/lib/sistemas/fiscal'
import { FORMAS_PAGAMENTO } from '@/lib/sistemas/schema'
import { brl, dataBR, num } from '@/lib/sistemas/regras'
import { formatCnpj, formatCpf, onlyDigits } from '@/lib/br'
import { track } from '@/lib/analytics'

const ETAPAS = {
  nfce: ['Validando os dados da venda', 'Gerando o XML no layout 4.00', 'Assinando com o certificado A1', 'Enviando à SEFAZ', 'Autorizada'],
  nfe: ['Validando os dados da venda', 'Gerando o XML da NF-e (modelo 55)', 'Assinando com o certificado A1', 'Enviando à SEFAZ', 'Autorizada'],
  nfse: ['Validando os dados do serviço', 'Gerando a DPS (padrão nacional)', 'Assinando com o certificado A1', 'Enviando ao Ambiente de Dados Nacional', 'Autorizada'],
}
const NOME = { nfce: 'NFC-e', nfe: 'NF-e', nfse: 'NFS-e' }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const formaNome = (f) => FORMAS_PAGAMENTO.find(([id]) => id === f)?.[1] ?? f
const AVISO = 'EMITIDA EM AMBIENTE DE SIMULAÇÃO - SEM VALOR FISCAL'

export function SeloFiscal({ fiscal }) {
  if (!fiscal) return null
  return (
    <Selo tom={fiscal.status === 'autorizada' ? 'info' : 'erro'}>
      {NOME[fiscal.tipo]} {fiscal.status === 'autorizada' ? `nº ${fiscal.numero}` : 'cancelada'}
    </Selo>
  )
}

/** Janela para emitir, ver, imprimir e cancelar a nota simulada de uma venda. */
export function NotaFiscal({ venda: inicial, onFechar, documentoInicial = '' }) {
  const { banco } = useSistema()
  const cfg = useConfig()
  const produtos = useMapa('produtos')
  const venda = banco.get('vendas', inicial.id) || inicial
  const [cpf, setCpf] = useState(documentoInicial)
  const tipo = venda.fiscal?.tipo ?? tipoNota(venda, produtos, cpf)
  const [passo, setPasso] = useState(venda.fiscal ? ETAPAS[tipo].length : -1)
  const [erro, setErro] = useState('')
  const [cancelar, setCancelar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const checagem = useMemo(() => validar({ venda: { ...venda, fiscal: null }, cfg, produtos, tipo, cpf: '' }), [venda, cfg, produtos, tipo])
  const emitindo = passo >= 0 && passo < ETAPAS[tipo].length

  useEffect(() => {
    if (!emitindo) return
    const t = setTimeout(() => {
      if (passo === ETAPAS[tipo].length - 2) {
        try {
          emitirSimulado(banco, venda, { cpf })
          track('sistema_nota_simulada', { tipo })
        } catch (e) {
          setErro(e.message)
          setPasso(-1)
          return
        }
      }
      setPasso((p) => p + 1)
    }, passo === 3 ? 900 : 450)
    return () => clearTimeout(t)
  }, [emitindo, passo, banco, venda, cpf, tipo])

  const f = venda.fiscal

  return (
    <Modal
      titulo={f ? `${NOME[f.tipo]} nº ${f.numero} · série ${f.serie}` : `Emitir ${NOME[tipo]}`}
      onFechar={onFechar}
      rodape={
        f ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => imprimirNota(venda, f, cfg, produtos)}>
              Imprimir {f.tipo === 'nfce' ? 'DANFE NFC-e' : f.tipo === 'nfe' ? 'DANFE' : 'DANFSe'}
            </button>
            {f.status === 'autorizada' && !cancelar && (
              <button type="button" className="btn btn-ghost" onClick={() => setCancelar(true)}>
                Cancelar nota
              </button>
            )}
          </>
        ) : (
          <button type="button" className="btn btn-primary" disabled={emitindo} onClick={() => (setErro(''), setPasso(0))}>
            {emitindo ? 'Emitindo…' : `Emitir ${NOME[tipo]} (simulação)`}
          </button>
        )
      }
    >
      <p className="notice warn">
        Simulação: nada é enviado à {tipo === 'nfce' ? 'SEFAZ' : 'prefeitura'} e a nota não tem valor fiscal. Num sistema sob medida, este botão chama uma API fiscal com o certificado digital do seu
        negócio.
      </p>

      {!f && passo < 0 && (
        <>
          <p>
            Venda #{venda.numero || '—'} · <strong>{brl(venda.total)}</strong> · {(venda.itens || []).length} itens
          </p>
          {tipo !== 'nfse' && (
            <label className="field">
              <span className="field-label">CPF ou CNPJ do cliente (opcional para consumidor; com CNPJ vira NF-e)</span>
              <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="CPF ou CNPJ" />
            </label>
          )}
          {checagem.avisos.length > 0 && (
            <ul className="sx-fiscal-avisos">
              {checagem.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </>
      )}

      {passo >= 0 && (
        <ol className="sx-fiscal-etapas">
          {ETAPAS[tipo].map((e, i) => (
            <li key={e} className={i < passo || (f && i === passo - 1) ? 'feito' : i === passo ? 'atual' : ''}>
              {e}
              {i === ETAPAS[tipo].length - 1 && f && <small> · protocolo {f.protocolo}</small>}
            </li>
          ))}
        </ol>
      )}

      {f && (
        <div className="sx-fiscal-resumo">
          <SeloFiscal fiscal={f} />
          {f.chave && (
            <p>
              <span className="muted small">Chave de acesso</span>
              <br />
              <code>{formatarChave(f.chave)}</code>
            </p>
          )}
          {f.codigo_verificacao && (
            <p>
              <span className="muted small">Código de verificação</span>
              <br />
              <code>{f.codigo_verificacao}</code>
            </p>
          )}
          <p className="small muted">
            Emitida em {dataBR(f.emitida_em, true)}
            {f.cpf ? ` · ${f.cpf.length === 14 ? `CNPJ ${formatCnpj(f.cpf)}` : `CPF ${formatCpf(f.cpf)}`}` : ' · consumidor não identificado'}
            {f.status === 'cancelada' && ` · cancelada em ${dataBR(f.cancelada_em, true)}: ${f.motivo_cancelamento}`}
          </p>
          {f.avisos?.length > 0 && (
            <details className="small">
              <summary>Avisos que uma API real faria ({f.avisos.length})</summary>
              <ul className="sx-fiscal-avisos">
                {f.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {cancelar && (
        <div className="sx-stack">
          <label className="field">
            <span className="field-label">Justificativa do cancelamento (mínimo 15 caracteres)</span>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus placeholder="Ex.: cliente desistiu da compra no caixa" />
          </label>
          <div className="sx-acoes">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                try {
                  cancelarSimulado(banco, venda, motivo)
                  setCancelar(false)
                  setErro('')
                } catch (e) {
                  setErro(e.message)
                }
              }}
            >
              Confirmar cancelamento
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCancelar(false)}>
              Voltar
            </button>
          </div>
        </div>
      )}
      {erro && <p className="notice error">{erro}</p>}
    </Modal>
  )
}

/* ---------- Impressão ---------- */

export async function imprimirNota(venda, fiscal, cfg, produtos) {
  const { default: QR } = await import('qrcode')
  const qr = await QR.toDataURL(qrConteudo(fiscal), { width: 260, margin: 1 })
  if (fiscal.tipo === 'nfse') imprimir(htmlDanfse(venda, fiscal, cfg, qr), { titulo: `NFS-e ${fiscal.numero}` })
  else if (fiscal.tipo === 'nfe') imprimir(htmlDanfeNfe(venda, fiscal, cfg, qr, produtos), { titulo: `NF-e ${fiscal.numero}` })
  else imprimir(htmlDanfeNfce(venda, fiscal, cfg, qr, produtos), { cupom: true, titulo: `NFC-e ${fiscal.numero}` })
}

const docEmitente = (cfg) => {
  const d = onlyDigits(cfg.documento)
  return d.length === 14 ? formatCnpj(d) : d.length === 11 ? formatCpf(d) : '11.222.333/0001-81 (exemplo)'
}

function htmlDanfeNfce(venda, f, cfg, qr, produtos) {
  const itens = (venda.itens || [])
    .map((i, k) => {
      const p = produtos.get(i.produto_id)
      const cod = p?.codigo_barras || String(k + 1).padStart(3, '0')
      return `<tr><td colspan="2">${cod} ${esc(i.nome)}</td></tr><tr><td>${num(i.qtd, 3)} ${esc(p?.unidade || 'UN').toUpperCase()} x ${brl(i.preco)}</td><td>${brl(i.preco * i.qtd)}</td></tr>`
    })
    .join('')
  const qtd = (venda.itens || []).reduce((s, i) => s + Number(i.qtd), 0)
  const pags = (venda.pagamentos || []).map((p) => `<tr><td>${esc(formaNome(p.forma))}</td><td>${brl(p.valor)}</td></tr>`).join('')
  return `${f.status === 'cancelada' ? '<p class="c t">*** NOTA CANCELADA ***</p>' : ''}
    <p class="c t">${AVISO}</p><hr>
    <h1>${esc(cfg.empresa_nome || 'Minha loja')}</h1>
    <p class="c">CNPJ ${docEmitente(cfg)}${cfg.ie ? ` · IE ${esc(cfg.ie)}` : ''}<br>${esc(cfg.endereco || '')}${cfg.cidade ? ` - ${esc(cfg.cidade)}/${esc(cfg.uf || 'SP')}` : ''}</p><hr>
    <p class="c">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p><hr>
    <table>${itens}</table><hr>
    <table><tr><td>Qtde. total de itens</td><td>${num(qtd, 3)}</td></tr>
    ${Number(venda.desconto) ? `<tr><td>Descontos</td><td>- ${brl(venda.desconto)}</td></tr>` : ''}
    ${Number(venda.acrescimo) ? `<tr><td>Acréscimos</td><td>${brl(venda.acrescimo)}</td></tr>` : ''}
    <tr class="t"><td>VALOR A PAGAR</td><td>${brl(venda.total)}</td></tr>
    <tr><td><b>FORMA DE PAGAMENTO</b></td><td><b>VALOR PAGO</b></td></tr>${pags}
    ${Number(venda.troco) ? `<tr><td>Troco</td><td>${brl(venda.troco)}</td></tr>` : ''}</table><hr>
    <p class="c">Consulte pela chave de acesso em<br>www.nfce.fazenda.${esc(String(cfg.uf || 'sp').toLowerCase())}.gov.br/consulta</p>
    <p class="c">${formatarChave(f.chave)}</p><hr>
    <p class="c">${f.cpf ? `CONSUMIDOR CPF ${formatCpf(f.cpf)}` : 'CONSUMIDOR NÃO IDENTIFICADO'}</p><hr>
    <p class="c">NFC-e nº ${String(f.numero).padStart(9, '0')} Série ${String(f.serie).padStart(3, '0')} ${dataBR(f.emitida_em, true)}<br>Protocolo de autorização: ${f.protocolo}<br>Data de autorização: ${dataBR(f.emitida_em, true)}</p>
    <p class="c"><img src="${qr}" width="140" height="140" alt="QR Code"></p>
    <p class="c">Tributos totais incidentes (Lei Federal 12.741/2012): Federal ${brl(f.tributos.federal)} Estadual ${brl(f.tributos.estadual)} (valores aproximados de exemplo)</p>
    <hr><p class="c t">${AVISO}</p>`
}

function htmlDanfeNfe(venda, f, cfg, qr, produtos) {
  const itens = (venda.itens || [])
    .map((i) => {
      const p = produtos.get(i.produto_id)
      return `<tr><td>${esc(p?.codigo_barras || '')}</td><td>${esc(i.nome)}</td><td>${esc(p?.ncm || '—')}</td><td>${esc(p?.cfop || '5102')}</td><td class="n">${num(i.qtd, 3)}</td><td class="n">${brl(i.preco)}</td><td class="n">${brl(i.preco * i.qtd)}</td></tr>`
    })
    .join('')
  return `<p style="text-align:center;font-weight:bold;border:2px solid #b00;color:#b00;padding:6px">${AVISO}${f.status === 'cancelada' ? ' · NOTA CANCELADA' : ''}</p>
    <div class="topo"><div><h1>DANFE · Documento Auxiliar da NF-e</h1><div class="muted">${esc(cfg.empresa_nome || '')} · CNPJ ${docEmitente(cfg)} · IE ${esc(cfg.ie || '—')}</div><div class="muted">${esc(cfg.endereco || '')}</div></div>
    <div style="text-align:right"><b>NF-e nº ${String(f.numero).padStart(9, '0')}</b><div>Série ${String(f.serie).padStart(3, '0')} · 1 - Saída</div><div>Emissão ${dataBR(f.emitida_em, true)}</div></div></div>
    <h2>Chave de acesso</h2><p style="font-family:monospace;font-size:15px">${formatarChave(f.chave)}</p><p class="muted">Protocolo de autorização ${f.protocolo} · ${dataBR(f.emitida_em, true)}</p>
    <h2>Destinatário</h2><div class="grade"><div>${esc(venda.cliente_nome || '')}</div><div>CNPJ ${formatCnpj(f.cpf)}</div></div>
    <h2>Produtos</h2><table><tr><th>Código</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th class="n">Qtd</th><th class="n">Valor un.</th><th class="n">Total</th></tr>${itens}
    <tr><td colspan="6" class="total">Valor total da nota</td><td class="n total">${brl(venda.total)}</td></tr></table>
    <h2>Dados adicionais</h2><p class="muted">Documento emitido por ME/EPP optante pelo Simples Nacional (MEI). Não gera direito a crédito fiscal de IPI. Tributos aproximados: federal ${brl(f.tributos.federal)}, estadual ${brl(f.tributos.estadual)} (exemplo).</p>
    <p style="text-align:center"><img src="${qr}" width="120" height="120" alt="QR Code"></p>`
}

function htmlDanfse(venda, f, cfg, qr) {
  const itens = (venda.itens || []).map((i) => `<tr><td>${esc(i.nome)}</td><td class="n">${num(i.qtd, 3)}</td><td class="n">${brl(i.preco)}</td><td class="n">${brl(i.preco * i.qtd)}</td></tr>`).join('')
  return `<p style="text-align:center;font-weight:bold;border:2px solid #b00;color:#b00;padding:6px">${AVISO}${f.status === 'cancelada' ? ' · NOTA CANCELADA' : ''}</p>
    <div class="topo"><div><h1>DANFSe · Nota Fiscal de Serviço Eletrônica</h1><div class="muted">Padrão nacional (simulação)</div></div>
    <div style="text-align:right"><b>NFS-e nº ${f.numero}</b><div>Emitida em ${dataBR(f.emitida_em, true)}</div><div>Código de verificação: <b>${esc(f.codigo_verificacao)}</b></div></div></div>
    <h2>Prestador</h2><div class="grade"><div>${esc(cfg.empresa_nome || '')}</div><div>CNPJ ${docEmitente(cfg)}</div><div>${esc(cfg.endereco || '')}</div><div>Inscrição municipal: ${esc(cfg.im || '—')}</div></div>
    <h2>Tomador</h2><div class="grade"><div>${esc(venda.cliente_nome || 'Não identificado')}</div><div>${esc(venda.telefone || '')}</div></div>
    <h2>Serviços</h2><table><tr><th>Descrição</th><th class="n">Qtd</th><th class="n">Valor</th><th class="n">Total</th></tr>${itens}
    <tr><td colspan="3" class="total">Valor do serviço</td><td class="n total">${brl(venda.total)}</td></tr></table>
    <h2>Tributos aproximados (exemplo)</h2><p class="muted">Federal ${brl(f.tributos.federal)} · Municipal (ISS) ${brl(f.tributos.municipal)}</p>
    <p class="muted">Protocolo ${f.protocolo}</p>
    <p style="text-align:center"><img src="${qr}" width="130" height="130" alt="QR Code"></p>`
}
