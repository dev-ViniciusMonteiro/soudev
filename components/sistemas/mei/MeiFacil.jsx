'use client'

// MEI na Mão: telas grandes e poucos passos para quem não tem costume com sistema.
// Venda por toque, câmera (reconhece o produto), código/QR ou voz; gastos; produtos com foto; Central MEI.
// Em todas as telas, a barra de comando (Comando.jsx) entende perguntas e pedidos por voz ou escritos.

import { useCallback, useMemo, useState } from 'react'
import { Modal, useConfig, useSistema, useTabela } from '../base'
import { QrPix, htmlCupom, imprimir } from '../comuns'
import { NotaFiscal, SeloFiscal } from '../Fiscal'
import { Ensinar, LerCodigo, Reconhecer } from './Camera'
import { BarraComando, competenciaDAS, imprimirRelatorioMensal, pendente, registrarGasto } from './Comando'
import { concluirVenda, fiadoEmAberto } from '@/lib/sistemas/acoes'
import { AJUDA, MEI, limiteDoAno, precisaNota, proximoDAS, reaisFalado, receitasDoMes, situacaoLimite, valorDAS } from '@/lib/sistemas/mei'
import { falar, falaDisponivel } from '@/lib/sistemas/voz'
import { qrDoProduto } from '@/lib/sistemas/visao'
import { addDias, brl, dataBR, hojeISO, num, parseValor, round2, saldos } from '@/lib/sistemas/regras'

export { registrarGasto }

const diaDe = (iso) => hojeISO(new Date(iso))

function useResumo() {
  const vendas = useTabela('vendas')
  const lancamentos = useTabela('lancamentos')
  return useMemo(() => {
    const hoje = hojeISO()
    const mes = hoje.slice(0, 7)
    const ano = hoje.slice(0, 4)
    const r = { hoje: 0, mes: 0, ano: 0, gastosMes: 0 }
    for (const v of vendas) {
      if (v.status !== 'concluida') continue
      const d = diaDe(v.concluida_em || v.criado_em)
      const t = Number(v.total) || 0
      if (d === hoje) r.hoje += t
      if (d.startsWith(mes)) r.mes += t
      if (d.startsWith(ano)) r.ano += t
    }
    for (const l of lancamentos) if (l.tipo === 'despesa' && String(l.pago_em).startsWith(mes)) r.gastosMes += Number(l.valor) || 0
    return r
  }, [vendas, lancamentos])
}

function useSaldos() {
  const movs = useTabela('estoque_mov')
  return useMemo(() => saldos(movs), [movs])
}

/* ---------- Início ---------- */

export function Inicio() {
  const { ir } = useSistema()
  const cfg = useConfig()
  const r = useResumo()
  const lancamentos = useTabela('lancamentos')
  const produtos = useTabela('produtos')
  const saldo = useSaldos()
  const das = valorDAS(cfg.mei_atividade)
  const prox = proximoDAS()
  const limite = limiteDoAno(cfg.mei_abertura)
  const pct = Math.min(100, (r.ano / limite.valor) * 100)
  const pagos = lancamentos.some((l) => l.ref_id === `das:${competenciaDAS()}`)
  const baixos = produtos.filter((p) => p.ativo !== false && p.controla_estoque && (saldo.get(p.id) || 0) <= (Number(p.estoque_minimo) || 0))

  return (
    <div className="mf">
      <h1 className="mf-titulo">O que você quer fazer?</h1>
      <div className="mf-acoes">
        <button type="button" className="mf-acao principal" onClick={() => ir('venda-facil')}>
          <span>🛍️</span>Vender
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('gastos')}>
          <span>💸</span>Anotar gasto
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('mei')}>
          <span>🧾</span>Central MEI
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('produtos-facil')}>
          <span>📸</span>Meus produtos
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('tabela:clientes')}>
          <span>👥</span>Clientes
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('vendas')}>
          <span>📜</span>Vendas e notas
        </button>
      </div>

      <BarraComando mostrarAtalhos exemplos="Ex.: “qual o produto mais vendido?”, “quem me deve?”, “vendi duas coxinhas”, “gastei 50 reais de luz”" />

      <div className="mf-numeros">
        <div>
          <span>Vendi hoje</span>
          <strong>{brl(r.hoje)}</strong>
        </div>
        <div>
          <span>Vendi no mês</span>
          <strong>{brl(r.mes)}</strong>
        </div>
        <div>
          <span>Gastei no mês</span>
          <strong>{brl(r.gastosMes)}</strong>
        </div>
        <div className={r.mes - r.gastosMes >= 0 ? 'bom' : 'ruim'}>
          <span>Sobrou no mês</span>
          <strong>{brl(r.mes - r.gastosMes)}</strong>
        </div>
      </div>

      <div className="mf-avisos">
        {baixos.length > 0 && (
          <button type="button" className="mf-aviso urgente" onClick={() => ir('produtos-facil')}>
            <span>📦</span>
            <div>
              <strong>
                {baixos.length === 1 ? '1 produto precisa' : `${baixos.length} produtos precisam`} de reposição: {baixos.map((p) => `${p.nome} (${num(saldo.get(p.id) || 0)})`).join(', ')}
              </strong>
              <small>Diga “chegaram 24 refrigerantes” para dar entrada.</small>
            </div>
          </button>
        )}
        <button type="button" className={`mf-aviso ${pagos ? 'ok' : prox.dias <= 5 ? 'urgente' : ''}`} onClick={() => ir('mei')}>
          <span>🧾</span>
          <div>
            <strong>{pagos ? 'DAS deste mês pago ✓' : `DAS de ${brl(das.total)} vence em ${prox.dias === 0 ? 'hoje' : `${prox.dias} dias`}`}</strong>
            <small>Vencimento {dataBR(hojeISO(prox.vencimento))}</small>
          </div>
        </button>
        <button type="button" className="mf-aviso" onClick={() => ir('mei')}>
          <span>📈</span>
          <div>
            <strong>
              Limite do MEI: {num(pct, 0)}% usado ({brl(r.ano)} de {brl(limite.valor)})
            </strong>
            <span className="mf-barra">
              <span style={{ width: `${pct}%` }} className={pct > 80 ? 'alto' : ''} />
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}

/* ---------- Vender ---------- */

const FORMAS = [
  ['dinheiro', '💵', 'Dinheiro'],
  ['pix', '⚡', 'Pix'],
  ['debito', '💳', 'Débito'],
  ['credito', '💳', 'Crédito'],
  ['fiado', '📒', 'Fiado'],
]
const NOME_FORMA = Object.fromEntries(FORMAS.map(([id, , r]) => [id, r]))

export function VendaFacil() {
  const { banco, usuario } = useSistema()
  const cfg = useConfig()
  const produtos = useTabela('produtos')
  const clientes = useTabela('clientes')
  const saldo = useSaldos()
  const ativos = useMemo(() => produtos.filter((p) => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome)), [produtos])
  const [etapa, setEtapa] = useState('itens')
  const [modo, setModo] = useState('tocar')
  const [carrinho, setCarrinho] = useState(() => {
    const inicial = (pendente.carrinho || []).map(({ produto, qtd }) => ({ produto_id: produto.id, nome: produto.nome, preco: Number(produto.preco) || 0, qtd }))
    pendente.carrinho = null
    return inicial
  })
  const [cliente, setCliente] = useState(null)
  const [desconto, setDesconto] = useState({ valor: 0, porcento: false })
  const [forma, setForma] = useState('')
  const [recebido, setRecebido] = useState('')
  const [venda, setVenda] = useState(null)
  const [nota, setNota] = useState(null)
  const [documento, setDocumento] = useState('')
  const [codigoNovo, setCodigoNovo] = useState('')
  const [janela, setJanela] = useState(null)
  const [erro, setErro] = useState('')

  const subtotal = round2(carrinho.reduce((s, i) => s + i.preco * i.qtd, 0))
  const valorDesconto = round2(Math.min(subtotal, desconto.porcento ? (subtotal * desconto.valor) / 100 : desconto.valor))
  const total = round2(subtotal - valorDesconto)
  const qtd = carrinho.reduce((s, i) => s + i.qtd, 0)
  const servico = carrinho.length > 0 && carrinho.every((i) => produtos.find((p) => p.id === i.produto_id)?.tipo === 'servico')

  const adicionar = useCallback((p, n = 1) => {
    setCarrinho((c) => {
      const i = c.findIndex((x) => x.produto_id === p.id)
      if (i >= 0) return c.map((x, k) => (k === i ? { ...x, qtd: x.qtd + n } : x))
      return [...c, { produto_id: p.id, nome: p.nome, preco: Number(p.preco) || 0, qtd: n }]
    })
  }, [])

  const mudarQtd = (id, qtdNova) => setCarrinho((c) => c.map((x) => (x.produto_id === id ? { ...x, qtd: qtdNova } : x)).filter((x) => x.qtd > 0))

  const avisoEstoque = (p, n) => {
    if (!p.controla_estoque) return ''
    const resta = (saldo.get(p.id) || 0) - (carrinho.find((i) => i.produto_id === p.id)?.qtd || 0) - n
    return resta < 0 ? ` Atenção: o estoque de ${p.nome} não dá (ficaria ${num(resta)}).` : resta <= (Number(p.estoque_minimo) || 0) ? ` Restam só ${num(resta)} de ${p.nome}.` : ''
  }

  const escolherForma = (f) => {
    setErro('')
    if (f === 'fiado' && !cliente) {
      setJanela('cliente')
      setErro('Para vender fiado, escolha o cliente.')
    }
    setForma(f)
  }

  const concluir = () => {
    if (forma === 'fiado' && !cliente) {
      setErro('Para vender fiado, escolha o cliente.')
      return { tela: 'Para vender fiado, escolha o cliente.', fala: 'Para vender fiado, diga o nome do cliente.' }
    }
    const pago = forma === 'dinheiro' ? Math.max(parseValor(recebido) || total, total) : total
    const v = concluirVenda(banco, {
      venda: {
        itens: carrinho,
        origem: 'pdv',
        desconto: valorDesconto,
        taxa_entrega: 0,
        cliente_id: cliente?.id || '',
        cliente_nome: cliente?.nome || '',
        telefone: cliente?.telefone || '',
      },
      pagamentos: [{ forma, valor: pago }],
      troco: pago - total,
      operador: usuario,
    })
    setVenda(v)
    setDocumento(cliente?.documento ? String(cliente.documento).replace(/\D/g, '') : '')
    setEtapa('nota')
    const troco = pago - total
    return {
      tela: `Venda de ${brl(total)} registrada${forma === 'fiado' ? `, no fiado de ${cliente.nome}` : ''}.${troco > 0 ? ` Troco: ${brl(troco)}.` : ''} Precisa de nota?`,
      fala: `Venda de ${reaisFalado(total)} registrada${forma === 'fiado' ? `, no fiado de ${cliente.nome}` : ''}.${troco > 0 ? ` Troco: ${reaisFalado(troco)}.` : ''}`,
    }
  }

  const novaVenda = () => {
    setCarrinho([])
    setCliente(null)
    setDesconto({ valor: 0, porcento: false })
    setForma('')
    setRecebido('')
    setVenda(null)
    setDocumento('')
    setErro('')
    setEtapa('itens')
  }

  const resp = (tela, fala = tela) => ({ tela, fala })

  // Ações por voz/escrita que só fazem sentido na venda.
  const onLocal = (cmd) => {
    switch (cmd.acao) {
      case 'vender': {
        if (etapa === 'nota') novaVenda()
        cmd.itens.forEach(({ produto, qtd: n }) => adicionar(produto, n))
        if (etapa === 'pagamento') setEtapa('itens')
        const avisos = cmd.itens.map(({ produto, qtd: n }) => avisoEstoque(produto, n)).join('')
        if (cmd.forma) {
          escolherForma(cmd.forma)
          setEtapa('pagamento')
        }
        return resp(`Adicionei ${cmd.itens.map((i) => `${num(i.qtd, 3)} ${i.produto.nome}`).join(' e ')}.${avisos}`)
      }
      case 'remover': {
        const item = carrinho.find((i) => i.produto_id === cmd.produto.id)
        if (!item) return resp(`${cmd.produto.nome} não está na venda.`)
        mudarQtd(item.produto_id, cmd.qtd ? Math.max(0, item.qtd - cmd.qtd) : 0)
        return resp(cmd.qtd && cmd.qtd < item.qtd ? `Tirei ${cmd.qtd} ${cmd.produto.nome}.` : `Tirei ${cmd.produto.nome} da venda.`)
      }
      case 'quantidade': {
        if (!carrinho.some((i) => i.produto_id === cmd.produto.id)) adicionar(cmd.produto, cmd.qtd)
        else mudarQtd(cmd.produto.id, cmd.qtd)
        return resp(`${cmd.produto.nome}: agora são ${cmd.qtd}.`)
      }
      case 'desconto': {
        setDesconto({ valor: cmd.valor, porcento: cmd.porcento })
        const v = round2(Math.min(subtotal, cmd.porcento ? (subtotal * cmd.valor) / 100 : cmd.valor))
        return resp(`Desconto de ${cmd.porcento ? `${num(cmd.valor)}%` : brl(cmd.valor)} aplicado. Total: ${brl(subtotal - v)}.`, `Desconto aplicado. Total: ${reaisFalado(subtotal - v)}.`)
      }
      case 'cliente':
        setCliente(cmd.cliente)
        setErro('')
        if (cmd.forma) {
          setForma(cmd.forma)
          if (carrinho.length) setEtapa('pagamento')
          return resp(`Venda para ${cmd.cliente.nome}, no ${NOME_FORMA[cmd.forma].toLowerCase()}. Diga “finalizar” para concluir.`)
        }
        return resp(`Venda para ${cmd.cliente.nome}.`)
      case 'total':
        return carrinho.length ? resp(`Total: ${brl(total)} (${num(qtd)} itens${valorDesconto ? `, com ${brl(valorDesconto)} de desconto` : ''}).`, `O total é ${reaisFalado(total)}.`) : resp('A venda está vazia.')
      case 'limpar':
        novaVenda()
        return resp('Venda cancelada. Pode começar outra.')
      case 'nova_venda':
        novaVenda()
        return resp('Nova venda. O que o cliente vai levar?')
      case 'pagar': {
        if (!carrinho.length && !venda) return resp('Primeiro diga o que está vendendo.')
        escolherForma(cmd.forma)
        if (cmd.recebido) setRecebido(String(cmd.recebido).replace('.', ','))
        setEtapa('pagamento')
        if (cmd.forma === 'fiado' && !cliente) return resp('Fiado precisa do cliente. Diga “cliente” e o nome, ou escolha na lista.')
        const troco = cmd.recebido ? round2(cmd.recebido - total) : 0
        return resp(`${NOME_FORMA[cmd.forma]}${troco > 0 ? `: troco de ${brl(troco)}` : ''}. Diga “finalizar” ou toque em Recebi.`, `${NOME_FORMA[cmd.forma]}.${troco > 0 ? ` Troco de ${reaisFalado(troco)}.` : ''} Diga finalizar para concluir.`)
      }
      case 'finalizar':
        if (etapa === 'itens') {
          if (!carrinho.length) return resp('A venda está vazia.')
          setEtapa('pagamento')
          return resp(`Total de ${brl(total)}. Como o cliente pagou?`, `Total de ${reaisFalado(total)}. Como o cliente pagou?`)
        }
        if (etapa === 'pagamento') {
          if (!forma) return resp('Diga como o cliente pagou: dinheiro, Pix, cartão ou fiado.')
          return concluir()
        }
        return undefined
      case 'nota':
        if (etapa !== 'nota' || !venda) return undefined
        if (cmd.documento) setDocumento(cmd.documento)
        setNota(banco.get('vendas', venda.id) || venda)
        return resp('Abrindo a nota. Toque em Emitir para confirmar.')
      case 'sem_nota':
        if (etapa !== 'nota') return undefined
        novaVenda()
        return resp('Sem nota. Nova venda.')
      default:
        return undefined
    }
  }

  const passos = [
    ['itens', '1. O que vendeu'],
    ['pagamento', '2. Como pagou'],
    ['nota', '3. Nota fiscal'],
  ]
  const contexto = etapa === 'itens' ? 'venda' : etapa

  return (
    <div className="mf">
      <ol className="mf-passos">
        {passos.map(([id, rotulo]) => (
          <li key={id} className={etapa === id ? 'atual' : passos.findIndex(([x]) => x === etapa) > passos.findIndex(([x]) => x === id) ? 'feito' : ''}>
            {rotulo}
          </li>
        ))}
      </ol>

      <BarraComando
        contexto={contexto}
        onLocal={onLocal}
        exemplos={
          etapa === 'itens'
            ? 'Ex.: “duas coxinhas e um café”, “tira o café”, “desconto de 10%”, “cliente Ana”, “finalizar”'
            : etapa === 'pagamento'
              ? 'Ex.: “pagou no Pix”, “pagou com 50 em dinheiro”, “fiado”, “finalizar”'
              : 'Ex.: “com nota, CPF …”, “sem nota”, “nova venda”'
        }
      />

      {etapa === 'itens' && (
        <>
          <div className="mf-modos mf-modos-3" role="tablist">
            {[
              ['tocar', '👆', 'Tocar'],
              ['camera', '📷', 'Câmera'],
              ['codigo', '▦', 'Código / QR'],
            ].map(([id, ic, rotulo]) => (
              <button key={id} type="button" role="tab" aria-selected={modo === id} className={modo === id ? 'ativo' : ''} onClick={() => setModo(id)}>
                <span>{ic}</span>
                {rotulo}
              </button>
            ))}
          </div>

          {modo === 'tocar' && (
            <div className="mf-produtos">
              {ativos.map((p) => {
                const s = p.controla_estoque ? saldo.get(p.id) || 0 : null
                return (
                  <button key={p.id} type="button" className="mf-produto" onClick={() => adicionar(p)}>
                    {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="mf-letra">{p.nome[0]}</span>}
                    <strong>{p.nome}</strong>
                    <span>{brl(p.preco)}</span>
                    {s !== null && <small className={s <= (Number(p.estoque_minimo) || 0) ? 'mf-pouco' : ''}>{s <= 0 ? 'sem estoque' : `${num(s)} em estoque`}</small>}
                  </button>
                )
              })}
              {!ativos.length && <p className="muted">Cadastre seus produtos em Meus produtos, ou diga: “cadastrar produto coxinha por 7 reais”.</p>}
            </div>
          )}
          {modo === 'camera' && <Reconhecer produtos={ativos} onProduto={(p) => adicionar(p)} />}
          {modo === 'codigo' && <LerCodigo produtos={ativos} onProduto={(p) => adicionar(p)} onDesconhecido={setCodigoNovo} />}
          {codigoNovo && modo === 'codigo' && (
            <p className="notice warn">
              O código {codigoNovo} não está em nenhum produto. Cadastre em <b>Meus produtos</b> e coloque esse número em “Código de barras”.
            </p>
          )}
        </>
      )}

      {etapa !== 'nota' && (
        <>
          <div className="mf-venda-extras">
            <button type="button" className={cliente ? 'mf-extra ativo' : 'mf-extra'} onClick={() => setJanela('cliente')}>
              👤 {cliente ? cliente.nome : 'Cliente (opcional)'}
            </button>
            <button type="button" className={valorDesconto ? 'mf-extra ativo' : 'mf-extra'} onClick={() => setJanela('desconto')} disabled={!carrinho.length}>
              🏷️ {valorDesconto ? `Desconto ${brl(valorDesconto)}` : 'Desconto'}
            </button>
          </div>
          <ul className="mf-carrinho" aria-label="Itens da venda">
            {carrinho.map((i) => (
              <li key={i.produto_id}>
                <strong>{i.nome}</strong>
                <div className="mf-qtd">
                  <button type="button" aria-label="Menos" onClick={() => mudarQtd(i.produto_id, i.qtd - 1)}>
                    −
                  </button>
                  <span>{num(i.qtd)}</span>
                  <button type="button" aria-label="Mais" onClick={() => mudarQtd(i.produto_id, i.qtd + 1)}>
                    +
                  </button>
                </div>
                <span>{brl(i.preco * i.qtd)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {etapa === 'itens' && (
        <button type="button" className="mf-continuar" disabled={!carrinho.length} onClick={() => setEtapa('pagamento')}>
          {carrinho.length ? `Continuar · ${num(qtd)} ${qtd === 1 ? 'item' : 'itens'} · ${brl(total)}` : 'Escolha o que está vendendo'}
        </button>
      )}

      {etapa === 'pagamento' && (
        <>
          <p className="mf-total">
            <span>Total{valorDesconto ? ` (desconto ${brl(valorDesconto)})` : ''}</span>
            <strong>{brl(total)}</strong>
          </p>
          <h2 className="mf-pergunta">Como o cliente pagou?</h2>
          <div className="mf-acoes mf-formas">
            {FORMAS.map(([id, ic, rotulo]) => (
              <button key={id} type="button" className={forma === id ? 'mf-acao selecionada' : 'mf-acao'} onClick={() => escolherForma(id)}>
                <span>{ic}</span>
                {rotulo}
              </button>
            ))}
          </div>
          {forma === 'dinheiro' && (
            <div className="mf-dinheiro">
              <label>
                Quanto recebeu?
                <input inputMode="decimal" value={recebido} onChange={(e) => setRecebido(e.target.value)} placeholder={total.toFixed(2).replace('.', ',')} />
              </label>
              <div className="mf-notas">
                {[total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, 100]
                  .filter((v, i, a) => v >= total && a.indexOf(v) === i)
                  .map((v) => (
                    <button key={v} type="button" onClick={() => setRecebido(String(v).replace('.', ','))}>
                      {brl(v)}
                    </button>
                  ))}
              </div>
              {parseValor(recebido) > total && (
                <p className="mf-troco">
                  Troco: <strong>{brl(parseValor(recebido) - total)}</strong>
                </p>
              )}
            </div>
          )}
          {forma === 'pix' && <QrPix valor={total} tamanho={220} />}
          {forma === 'fiado' && cliente && (
            <p className="mf-explica">
              {cliente.nome} fica devendo {brl(total)} (vence em 30 dias). Já devia {brl(fiadoEmAberto(banco, cliente.id))}.
            </p>
          )}
          {erro && <p className="notice warn">{erro}</p>}
          <div className="mf-rodape">
            <button type="button" className="mf-voltar" onClick={() => setEtapa('itens')}>
              ← Voltar
            </button>
            <button type="button" className="mf-continuar" disabled={!forma || (forma === 'dinheiro' && recebido !== '' && parseValor(recebido) < total)} onClick={() => falar(concluir().fala)}>
              ✓ {forma === 'fiado' ? 'Anotar no fiado' : 'Recebi'} {brl(total)}
            </button>
          </div>
        </>
      )}

      {etapa === 'nota' && venda && (
        <>
          <div className="mf-pronto">
            <span aria-hidden="true">✓</span>
            <strong>Venda registrada!</strong>
            <p>
              {brl(venda.total)}
              {Number(venda.troco) > 0 && ` · troco ${brl(venda.troco)}`}
              {venda.cliente_nome && ` · ${venda.cliente_nome}`}
            </p>
            {venda.fiscal && <SeloFiscal fiscal={venda.fiscal} />}
          </div>
          {!venda.fiscal && (
            <>
              <h2 className="mf-pergunta">Precisa de nota fiscal?</h2>
              <p className="mf-explica">{precisaNota({ documento, servico }).texto}</p>
              <label className="mf-doc">
                CPF ou CNPJ do cliente (se ele pediu nota ou se é empresa)
                <input inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Opcional" />
              </label>
              <div className="mf-rodape">
                <button type="button" className="mf-voltar" onClick={novaVenda}>
                  Sem nota · nova venda
                </button>
                <button type="button" className="mf-continuar" onClick={() => setNota(banco.get('vendas', venda.id) || venda)}>
                  Emitir nota (simulação)
                </button>
              </div>
            </>
          )}
          <div className="mf-rodape">
            <button type="button" className="mf-voltar" onClick={() => imprimir(htmlCupom(venda, cfg), { cupom: true, titulo: 'Recibo' })}>
              🖨️ Imprimir recibo
            </button>
            {venda.fiscal && (
              <button type="button" className="mf-continuar" onClick={novaVenda}>
                Nova venda
              </button>
            )}
          </div>
        </>
      )}

      {janela === 'cliente' && (
        <EscolherCliente
          clientes={clientes}
          onFechar={() => setJanela(null)}
          onEscolher={(c) => {
            setCliente(c)
            setErro('')
            setJanela(null)
          }}
        />
      )}
      {janela === 'desconto' && (
        <Desconto
          subtotal={subtotal}
          inicial={desconto}
          onFechar={() => setJanela(null)}
          onAplicar={(d) => {
            setDesconto(d)
            setJanela(null)
          }}
        />
      )}
      {nota && (
        <NotaFiscal
          venda={nota}
          documentoInicial={documento}
          onFechar={() => {
            setNota(null)
            setVenda((v) => banco.get('vendas', v.id) || v)
          }}
        />
      )}
    </div>
  )
}

function EscolherCliente({ clientes, onEscolher, onFechar }) {
  const { banco } = useSistema()
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const q = busca.trim().toLowerCase()
  const lista = clientes.filter((c) => !q || c.nome.toLowerCase().includes(q) || String(c.telefone).replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')).slice(0, 30)
  return (
    <Modal titulo="Quem está comprando?" onFechar={onFechar}>
      {!novo ? (
        <>
          <input className="mf-campo" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou telefone" aria-label="Buscar cliente" />
          <div className="mf-opcoes">
            <button type="button" onClick={() => onEscolher(null)}>
              Sem cliente
            </button>
            {lista.map((c) => (
              <button key={c.id} type="button" onClick={() => onEscolher(c)}>
                {c.nome}
              </button>
            ))}
          </div>
          <button type="button" className="mf-voltar" onClick={() => (setNovo(true), setNome(busca))}>
            ＋ Cliente novo
          </button>
        </>
      ) : (
        <div className="mf-form">
          <input className="mf-campo" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" aria-label="Nome" />
          <input className="mf-campo" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="WhatsApp (opcional)" aria-label="Telefone" />
          <button type="button" className="mf-continuar" disabled={!nome.trim()} onClick={() => onEscolher(banco.salvar('clientes', { nome: nome.trim(), telefone }))}>
            ✓ Cadastrar e usar
          </button>
        </div>
      )}
    </Modal>
  )
}

function Desconto({ subtotal, inicial, onAplicar, onFechar }) {
  const [valor, setValor] = useState(inicial.valor ? String(inicial.valor).replace('.', ',') : '')
  const [porcento, setPorcento] = useState(inicial.porcento)
  const v = parseValor(valor)
  const calc = round2(Math.min(subtotal, porcento ? (subtotal * v) / 100 : v))
  return (
    <Modal titulo="Desconto" onFechar={onFechar}>
      <div className="mf-escolha">
        <button type="button" className={!porcento ? 'ativo' : ''} onClick={() => setPorcento(false)}>
          R$ (valor)
        </button>
        <button type="button" className={porcento ? 'ativo' : ''} onClick={() => setPorcento(true)}>
          % (porcentagem)
        </button>
      </div>
      <div className="mf-valor">
        <span>{porcento ? '%' : 'R$'}</span>
        <input inputMode="decimal" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" aria-label="Valor do desconto" />
      </div>
      <p className="mf-explica">
        Subtotal {brl(subtotal)} − desconto {brl(calc)} = <b>{brl(subtotal - calc)}</b>
      </p>
      <div className="mf-rodape">
        <button type="button" className="mf-voltar" onClick={() => onAplicar({ valor: 0, porcento: false })}>
          Sem desconto
        </button>
        <button type="button" className="mf-continuar" onClick={() => onAplicar({ valor: v, porcento })}>
          ✓ Aplicar
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Gastos ---------- */

const CATEGORIAS = [
  ['fornecedor', '🛒', 'Mercadoria'],
  ['aluguel', '🏠', 'Aluguel'],
  ['contas', '💡', 'Luz, água, internet'],
  ['impostos', '🧾', 'DAS e taxas'],
  ['marketing', '📣', 'Divulgação'],
  ['outros', '➕', 'Outros'],
]

export function Gastos() {
  const { banco } = useSistema()
  const lancamentos = useTabela('lancamentos')
  const [categoria, setCategoria] = useState(null)
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const mes = hojeISO().slice(0, 7)
  const doMes = lancamentos.filter((l) => l.tipo === 'despesa' && String(l.pago_em).startsWith(mes)).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
  const total = doMes.reduce((s, l) => s + Number(l.valor), 0)

  const salvar = () => {
    const v = parseValor(valor)
    if (!(v > 0)) return
    const cat = CATEGORIAS.find(([id]) => id === categoria)
    registrarGasto(banco, { valor: v, descricao: descricao || cat?.[2], categoria })
    falar(`Anotado: ${reaisFalado(v)} em ${(descricao || cat?.[2] || 'gastos').toLowerCase()}.`)
    setCategoria(null)
    setValor('')
    setDescricao('')
  }

  return (
    <div className="mf">
      <BarraComando exemplos="Ex.: “gastei 80 reais de mercadoria”, “paguei 120 de luz”, “qual meu maior gasto?”, “apagar o último gasto”" />
      <p className="mf-total">
        <span>Gastos deste mês</span>
        <strong>{brl(total)}</strong>
      </p>
      {!categoria ? (
        <>
          <h2 className="mf-pergunta">Com o que você gastou?</h2>
          <div className="mf-acoes">
            {CATEGORIAS.map(([id, ic, rotulo]) => (
              <button key={id} type="button" className="mf-acao" onClick={() => setCategoria(id)}>
                <span>{ic}</span>
                {rotulo}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mf-form">
          <h2 className="mf-pergunta">
            {CATEGORIAS.find(([id]) => id === categoria)?.[1]} {CATEGORIAS.find(([id]) => id === categoria)?.[2]}: quanto foi?
          </h2>
          <div className="mf-valor">
            <span>R$</span>
            <input inputMode="decimal" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" aria-label="Valor do gasto" />
          </div>
          <input className="mf-campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" aria-label="Descrição" />
          <div className="mf-rodape">
            <button type="button" className="mf-voltar" onClick={() => setCategoria(null)}>
              ← Voltar
            </button>
            <button type="button" className="mf-continuar" disabled={!(parseValor(valor) > 0)} onClick={salvar}>
              ✓ Anotar gasto
            </button>
          </div>
        </div>
      )}
      <ul className="mf-lista">
        {doMes.slice(0, 30).map((l) => (
          <li key={l.id}>
            <span>{CATEGORIAS.find(([id]) => id === l.categoria)?.[1] ?? '➕'}</span>
            <div>
              <strong>{l.descricao}</strong>
              <small>{dataBR(l.pago_em)}</small>
            </div>
            <b>{brl(l.valor)}</b>
            <button type="button" aria-label="Apagar gasto" onClick={() => confirm('Apagar este gasto?') && banco.excluir('lancamentos', l.id)}>
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Meus produtos ---------- */

export function ProdutosFacil() {
  const { banco } = useSistema()
  const cfg = useConfig()
  const produtos = useTabela('produtos')
  const saldo = useSaldos()
  const [editar, setEditar] = useState(null)
  const lista = [...produtos].sort((a, b) => a.nome.localeCompare(b.nome))

  const etiquetas = async () => {
    const { default: QR } = await import('qrcode')
    const cards = []
    for (const p of lista.filter((x) => x.ativo !== false)) {
      const img = await QR.toDataURL(qrDoProduto(p), { width: 220, margin: 1 })
      cards.push(`<div class="et"><img src="${img}"><b>${p.nome.replace(/</g, '&lt;')}</b><span>${brl(p.preco)}</span></div>`)
    }
    imprimir(
      `<style>.grade-et{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.et{border:1px dashed #999;padding:8px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;page-break-inside:avoid}.et img{width:110px;height:110px}.et b{font-size:12px}.et span{font-size:14px;font-weight:bold}</style>
       <h1>Etiquetas com QR Code · ${(cfg.empresa_nome || '').replace(/</g, '&lt;')}</h1><p class="muted">Recorte e cole nos produtos. No MEI na Mão, vá em Vender → Código / QR e aponte a câmera.</p><div class="grade-et">${cards.join('')}</div>`,
      { titulo: 'Etiquetas QR' },
    )
  }

  return (
    <div className="mf">
      <BarraComando exemplos="Ex.: “cadastrar produto pão de queijo por 5 reais”, “mudar o preço da coxinha para 8”, “chegaram 24 refrigerantes”, “o que está acabando?”" />
      <div className="mf-rodape topo">
        <button type="button" className="mf-continuar" onClick={() => setEditar({ tipo: 'produto', ativo: true, publicado: true })}>
          ＋ Novo produto
        </button>
        <button type="button" className="mf-voltar" onClick={etiquetas} disabled={!lista.length}>
          🖨️ Etiquetas com QR
        </button>
      </div>
      <div className="mf-produtos">
        {lista.map((p) => (
          <button key={p.id} type="button" className={p.ativo === false ? 'mf-produto inativo' : 'mf-produto'} onClick={() => setEditar(p)}>
            {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="mf-letra">{p.nome[0]}</span>}
            <strong>{p.nome}</strong>
            <span>{brl(p.preco)}</span>
            {p.controla_estoque && (
              <small className={(saldo.get(p.id) || 0) <= (Number(p.estoque_minimo) || 0) ? 'mf-pouco' : ''}>
                📦 {num(saldo.get(p.id) || 0)} em estoque
              </small>
            )}
            <small>{Array.isArray(p.visual) && p.visual.length ? `📷 câmera conhece (${p.visual.length} fotos)` : '📷 ensinar a câmera'}</small>
          </button>
        ))}
      </div>
      {editar && <EditarProduto inicial={editar} onFechar={() => setEditar(null)} />}
    </div>
  )
}

function EditarProduto({ inicial, onFechar }) {
  const { banco } = useSistema()
  const saldo = useSaldos()
  const saldoAtual = inicial.id ? saldo.get(inicial.id) || 0 : 0
  const [p, setP] = useState(() => ({ ...inicial, preco: inicial.preco !== undefined ? String(inicial.preco).replace('.', ',') : '' }))
  const [estoque, setEstoque] = useState(() => String(saldoAtual))
  const [tela, setTela] = useState('dados')
  const [erro, setErro] = useState('')
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }))

  const salvar = (extra = {}) => {
    if (!String(p.nome || '').trim()) return setErro('Dê um nome ao produto.')
    if (!(parseValor(p.preco) > 0)) return setErro('Informe o preço.')
    const salvo = banco.salvar('produtos', { ...p, ...extra, nome: p.nome.trim(), preco: parseValor(p.preco), estoque_minimo: p.estoque_minimo === '' ? '' : parseValor(p.estoque_minimo) })
    // Estoque contado agora: grava só a diferença como ajuste (o histórico fica nos movimentos).
    const contado = parseValor(estoque)
    if (salvo.controla_estoque && estoque !== '' && Math.abs(contado - (saldo.get(salvo.id) || 0)) > 0.0001) {
      banco.salvar('estoque_mov', { produto_id: salvo.id, qtd: round2(contado - (saldo.get(salvo.id) || 0)), motivo: 'ajuste' })
    }
    setP({ ...salvo, preco: String(salvo.preco).replace('.', ',') })
    return salvo
  }

  return (
    <Modal titulo={inicial.id ? p.nome || 'Produto' : 'Novo produto'} onFechar={onFechar} largo>
      {tela === 'dados' && (
        <div className="mf-form">
          <label className="mf-doc">
            Nome
            <input value={p.nome || ''} onChange={(e) => set('nome', e.target.value)} autoFocus={!inicial.id} placeholder="Ex.: Brigadeiro" />
          </label>
          <label className="mf-doc">
            Preço
            <div className="mf-valor">
              <span>R$</span>
              <input inputMode="decimal" value={p.preco} onChange={(e) => set('preco', e.target.value)} placeholder="0,00" />
            </div>
          </label>
          <div className="mf-escolha">
            {[
              ['produto', '📦 Produto'],
              ['servico', '🛠️ Serviço'],
            ].map(([id, r]) => (
              <button key={id} type="button" className={p.tipo === id ? 'ativo' : ''} onClick={() => set('tipo', id)}>
                {r}
              </button>
            ))}
          </div>
          <div className="mf-estoque">
            <label className="sx-switch">
              <input type="checkbox" checked={Boolean(p.controla_estoque)} onChange={(e) => set('controla_estoque', e.target.checked)} />
              <span>📦 Controlar estoque deste produto</span>
            </label>
            {p.controla_estoque && (
              <div className="mf-linha">
                <label className="mf-doc">
                  Quantos tem agora
                  <input inputMode="decimal" value={estoque} onChange={(e) => setEstoque(e.target.value)} />
                </label>
                <label className="mf-doc">
                  Avisar quando tiver menos de
                  <input inputMode="decimal" value={p.estoque_minimo ?? ''} onChange={(e) => set('estoque_minimo', e.target.value)} placeholder="Ex.: 10" />
                </label>
              </div>
            )}
          </div>
          <label className="mf-doc">
            Código de barras (se tiver)
            <div className="mf-linha">
              <input inputMode="numeric" value={p.codigo_barras || ''} onChange={(e) => set('codigo_barras', e.target.value)} placeholder="Opcional" />
              <button type="button" className="mf-voltar" onClick={() => setTela('ler')}>
                ▦ Ler com a câmera
              </button>
            </div>
          </label>
          <div className="mf-ensinar">
            {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="mf-letra">{(p.nome || '?')[0]}</span>}
            <div>
              <strong>{Array.isArray(p.visual) && p.visual.length ? `A câmera já conhece (${p.visual.length} fotos)` : 'Ensine a câmera a reconhecer'}</strong>
              <small>3 fotos rápidas do produto. Depois, na venda, é só mostrar para a câmera.</small>
            </div>
            <button
              type="button"
              className="mf-voltar"
              onClick={() => {
                if (salvar()) setTela('ensinar')
              }}
            >
              📸 Ensinar a câmera
            </button>
          </div>
          {erro && <p className="notice error">{erro}</p>}
          <div className="mf-rodape">
            {inicial.id && (
              <button
                type="button"
                className="mf-voltar"
                onClick={() => {
                  if (confirm('Tirar este produto da lista de venda?')) {
                    banco.salvar('produtos', { id: inicial.id, ativo: false })
                    onFechar()
                  }
                }}
              >
                Desativar
              </button>
            )}
            <button
              type="button"
              className="mf-continuar"
              onClick={() => {
                if (salvar()) onFechar()
              }}
            >
              ✓ Salvar
            </button>
          </div>
        </div>
      )}
      {tela === 'ler' && (
        <>
          <LerCodigo
            produtos={[]}
            onProduto={() => {}}
            onDesconhecido={(codigo) => {
              set('codigo_barras', codigo)
              setTela('dados')
            }}
          />
          <button type="button" className="mf-voltar" onClick={() => setTela('dados')}>
            ← Voltar
          </button>
        </>
      )}
      {tela === 'ensinar' && (
        <>
          <Ensinar
            produto={p}
            onPronto={({ vetores, foto }) => {
              const visual = [...(Array.isArray(p.visual) ? p.visual : []), ...vetores].slice(-6)
              banco.salvar('produtos', { id: p.id, visual, foto_url: p.foto_url || foto })
              setP((s) => ({ ...s, visual, foto_url: s.foto_url || foto }))
              falar('Pronto! A câmera aprendeu este produto.')
              setTela('dados')
            }}
          />
          <button type="button" className="mf-voltar" onClick={() => setTela('dados')}>
            ← Voltar
          </button>
        </>
      )}
    </Modal>
  )
}

/* ---------- Central MEI ---------- */

export function CentralMei() {
  const { banco } = useSistema()
  const cfg = useConfig()
  const vendas = useTabela('vendas')
  const lancamentos = useTabela('lancamentos')
  const produtosLista = useTabela('produtos')
  const produtos = useMemo(() => new Map(produtosLista.map((p) => [p.id, p])), [produtosLista])
  const r = useResumo()
  const hoje = new Date()
  const [mes, setMes] = useState(() => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [empresa, setEmpresa] = useState(null)
  const [servicoQ, setServicoQ] = useState(null)
  const das = valorDAS(cfg.mei_atividade)
  const prox = proximoDAS(hoje)
  const competencia = `${prox.competencia.getFullYear()}-${String(prox.competencia.getMonth() + 1).padStart(2, '0')}`
  const pago = lancamentos.some((l) => l.ref_id === `das:${competencia}`)
  const limite = limiteDoAno(cfg.mei_abertura)
  const pct = (r.ano / limite.valor) * 100
  const situacao = situacaoLimite(r.ano, limite.valor)
  const mesesPassados = hoje.getMonth() + 1
  const projecao = (r.ano / mesesPassados) * 12
  const rec = receitasDoMes(vendas, produtos, mes)
  const anoAnterior = hoje.getFullYear() - 1
  const recAno = useMemo(() => {
    const t = { comercio: 0, servico: 0, total: 0 }
    for (let m = 1; m <= 12; m++) {
      const x = receitasDoMes(vendas, produtos, `${anoAnterior}-${String(m).padStart(2, '0')}`)
      t.comercio += x.comercio
      t.servico += x.servico
      t.total += x.total
    }
    return t
  }, [vendas, produtos, anoAnterior])

  const imprimirRelatorio = () => imprimirRelatorioMensal(cfg, vendas, produtos, mes)

  const notaResposta = empresa === null ? null : precisaNota({ documento: empresa ? '00000000000000' : '', servico: Boolean(servicoQ) })

  return (
    <div className="mf">
      <h1 className="mf-titulo">Central MEI</h1>
      <BarraComando exemplos="Ex.: “quanto falta para o limite?”, “paguei o DAS”, “imprimir relatório do mês passado”, “o que é a declaração anual?”" />
      <p className="muted small">
        Valores de {MEI.atualizado}. Confira sempre no{' '}
        <a href={MEI.links.portal} target="_blank" rel="noopener noreferrer">
          Portal do Empreendedor
        </a>{' '}
        ou com um contador.
      </p>

      <section className="mf-cartao">
        <h2>🧾 DAS (boleto mensal)</h2>
        <p className="mf-grande">{brl(das.total)}</p>
        <p>
          INSS {brl(das.inss)}
          {das.icms ? ` + ICMS ${brl(das.icms)}` : ''}
          {das.iss ? ` + ISS ${brl(das.iss)}` : ''} · vence dia {MEI.vencimentoDAS}
        </p>
        <p className={pago ? 'mf-ok' : prox.dias <= 5 ? 'mf-alerta' : ''}>
          {pago ? `DAS de ${competencia.slice(5)}/${competencia.slice(0, 4)} pago ✓` : `Competência ${competencia.slice(5)}/${competencia.slice(0, 4)}: vence em ${dataBR(hojeISO(prox.vencimento))} (${prox.dias} dias)`}
        </p>
        <div className="mf-rodape">
          <a className="mf-voltar" href={MEI.links.das} target="_blank" rel="noopener noreferrer">
            Gerar o boleto no site oficial ↗
          </a>
          {!pago && (
            <button type="button" className="mf-continuar" onClick={() => registrarGasto(banco, { valor: das.total, descricao: `DAS ${competencia.slice(5)}/${competencia.slice(0, 4)}`, categoria: 'impostos', ref_id: `das:${competencia}` })}>
              ✓ Já paguei
            </button>
          )}
        </div>
      </section>

      <section className="mf-cartao">
        <h2>📈 Limite do ano</h2>
        <p className="mf-grande">
          {brl(r.ano)} <small>de {brl(limite.valor)}</small>
        </p>
        <span className="mf-barra grande">
          <span style={{ width: `${Math.min(100, pct)}%` }} className={pct > 80 ? 'alto' : ''} />
        </span>
        <p>
          {num(pct, 1)}% usado{limite.proporcional ? ` (limite proporcional: abriu o MEI este ano, ${limite.meses} meses)` : ''}. No ritmo atual, o ano fecha em cerca de <b>{brl(projecao)}</b>.
        </p>
        <p className={situacao.tom === 'ok' ? 'mf-ok' : 'mf-alerta'}>{situacao.texto}</p>
      </section>

      <section className="mf-cartao">
        <h2>📄 Relatório mensal das receitas</h2>
        <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} className="mf-campo" aria-label="Mês do relatório" />
        <table className="table">
          <tbody>
            <tr>
              <td>Comércio sem nota</td>
              <td>{brl(rec.comercioSemNota)}</td>
            </tr>
            <tr>
              <td>Comércio com nota</td>
              <td>{brl(rec.comercioComNota)}</td>
            </tr>
            <tr>
              <td>Serviços sem nota</td>
              <td>{brl(rec.servicoSemNota)}</td>
            </tr>
            <tr>
              <td>Serviços com nota</td>
              <td>{brl(rec.servicoComNota)}</td>
            </tr>
            <tr>
              <th>Total do mês ({rec.qtd} vendas)</th>
              <th>{brl(rec.total)}</th>
            </tr>
          </tbody>
        </table>
        <button type="button" className="mf-continuar" onClick={imprimirRelatorio}>
          🖨️ Imprimir relatório para assinar
        </button>
      </section>

      <section className="mf-cartao">
        <h2>📅 Declaração anual (DASN-SIMEI) de {anoAnterior}</h2>
        <p>Prazo: até {MEI.prazoDASN}. Os números para preencher:</p>
        {recAno.total === 0 && <p className="mf-alerta">Não há vendas de {anoAnterior} registradas no sistema. Se você usava outro controle, some os valores de lá.</p>}
        <table className="table">
          <tbody>
            <tr>
              <td>Receita com comércio e indústria</td>
              <td>{brl(recAno.comercio)}</td>
            </tr>
            <tr>
              <td>Receita com serviços</td>
              <td>{brl(recAno.servico)}</td>
            </tr>
            <tr>
              <th>Receita bruta total</th>
              <th>{brl(recAno.total)}</th>
            </tr>
          </tbody>
        </table>
        <a className="mf-voltar" href={MEI.links.dasn} target="_blank" rel="noopener noreferrer">
          Fazer a declaração no site oficial ↗
        </a>
      </section>

      <section className="mf-cartao">
        <h2>🤔 Preciso emitir nota?</h2>
        <p className="mf-pergunta pequena">Vendeu para uma empresa (com CNPJ)?</p>
        <div className="mf-escolha">
          <button type="button" className={empresa === true ? 'ativo' : ''} onClick={() => setEmpresa(true)}>
            Sim, empresa
          </button>
          <button type="button" className={empresa === false ? 'ativo' : ''} onClick={() => setEmpresa(false)}>
            Não, pessoa física
          </button>
        </div>
        <p className="mf-pergunta pequena">Foi um serviço?</p>
        <div className="mf-escolha">
          <button type="button" className={servicoQ === true ? 'ativo' : ''} onClick={() => setServicoQ(true)}>
            Serviço
          </button>
          <button type="button" className={servicoQ === false ? 'ativo' : ''} onClick={() => setServicoQ(false)}>
            Produto
          </button>
        </div>
        {notaResposta && servicoQ !== null && (
          <p className={notaResposta.obrigatoria ? 'mf-alerta' : 'mf-ok'}>
            <b>{notaResposta.obrigatoria ? 'Sim, precisa. ' : 'Só se o cliente pedir. '}</b>
            {notaResposta.texto}
          </p>
        )}
      </section>

      <section className="mf-cartao">
        <h2>📚 Entenda as regras</h2>
        <div className="mf-ajuda">
          {AJUDA.map((a) => (
            <details key={a.id}>
              <summary>
                {a.titulo}
                {falaDisponivel() && (
                  <button
                    type="button"
                    className="mf-ouvir"
                    onClick={(e) => {
                      e.preventDefault()
                      falar(`${a.titulo}. ${a.texto}`)
                    }}
                  >
                    🔊 Ouvir
                  </button>
                )}
              </summary>
              <p>{a.texto}</p>
            </details>
          ))}
        </div>
        <p className="muted small">
          Links oficiais:{' '}
          <a href={MEI.links.portal} target="_blank" rel="noopener noreferrer">
            Portal do Empreendedor
          </a>{' '}
          ·{' '}
          <a href={MEI.links.nfse} target="_blank" rel="noopener noreferrer">
            Emissor Nacional de NFS-e
          </a>
        </p>
      </section>
    </div>
  )
}

