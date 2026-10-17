'use client'

// MEI na Mão: telas grandes e poucos passos para quem não tem costume com sistema.
// Venda por toque, câmera (reconhece o produto), código/QR ou voz; gastos; produtos com foto; Central MEI.

import { useCallback, useMemo, useState } from 'react'
import { Modal, useConfig, useSistema, useTabela } from '../base'
import { QrPix, htmlCupom, imprimir } from '../comuns'
import { NotaFiscal, SeloFiscal } from '../Fiscal'
import { Ensinar, LerCodigo, Reconhecer } from './Camera'
import { concluirVenda } from '@/lib/sistemas/acoes'
import { AJUDA, MEI, limiteDoAno, precisaNota, proximoDAS, reaisFalado, receitasDoMes, situacaoLimite, valorDAS } from '@/lib/sistemas/mei'
import { falar, falaDisponivel, interpretar, ouvir, vozDisponivel } from '@/lib/sistemas/voz'
import { qrDoProduto } from '@/lib/sistemas/visao'
import { addDias, brl, dataBR, hojeISO, num, parseValor, round2 } from '@/lib/sistemas/regras'

// Itens ditos na tela inicial ("vendi 2 coxinhas") seguem para a tela de venda.
let carrinhoPendente = null

const diaDe = (iso) => hojeISO(new Date(iso))

function useResumo() {
  const vendas = useTabela('vendas')
  const lancamentos = useTabela('lancamentos')
  return useMemo(() => {
    const hoje = hojeISO()
    const mes = hoje.slice(0, 7)
    const ano = hoje.slice(0, 4)
    const semana = addDias(hoje, -6)
    const r = { hoje: 0, semana: 0, mes: 0, ano: 0, gastosHoje: 0, gastosSemana: 0, gastosMes: 0, gastosAno: 0, qtdHoje: 0 }
    for (const v of vendas) {
      if (v.status !== 'concluida') continue
      const d = diaDe(v.concluida_em || v.criado_em)
      const t = Number(v.total) || 0
      if (d === hoje) {
        r.hoje += t
        r.qtdHoje++
      }
      if (d >= semana) r.semana += t
      if (d.startsWith(mes)) r.mes += t
      if (d.startsWith(ano)) r.ano += t
    }
    for (const l of lancamentos) {
      if (l.tipo !== 'despesa' || !l.pago_em) continue
      const d = l.pago_em
      const t = Number(l.valor) || 0
      if (d === hoje) r.gastosHoje += t
      if (d >= semana) r.gastosSemana += t
      if (d.startsWith(mes)) r.gastosMes += t
      if (d.startsWith(ano)) r.gastosAno += t
    }
    return r
  }, [vendas, lancamentos])
}

function respostaConsulta(cmd, r) {
  const nomes = { hoje: 'hoje', semana: 'nos últimos 7 dias', mes: 'este mês', ano: 'este ano' }
  const chave = { hoje: 'Hoje', semana: 'Semana', mes: 'Mes', ano: 'Ano' }[cmd.periodo]
  const vendas = r[cmd.periodo]
  const gastos = r[`gastos${chave}`]
  if (cmd.oque === 'gastos') return `Você gastou ${reaisFalado(gastos)} ${nomes[cmd.periodo]}.`
  if (cmd.oque === 'lucro') return `${nomes[cmd.periodo][0].toUpperCase()}${nomes[cmd.periodo].slice(1)} você vendeu ${reaisFalado(vendas)} e gastou ${reaisFalado(gastos)}. Sobrou ${reaisFalado(vendas - gastos)}.`
  return `Você vendeu ${reaisFalado(vendas)} ${nomes[cmd.periodo]}.`
}

/* ---------- Botão de voz ---------- */

export function BotaoVoz({ onComando, exemplos }) {
  const { banco } = useSistema()
  const [ouvindo, setOuvindo] = useState(false)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const disponivel = vozDisponivel()
  const comecar = () => {
    setErro('')
    setTexto('')
    setOuvindo(true)
    ouvir({
      onParcial: setTexto,
      onFinal: (t) => {
        setTexto(t)
        onComando(interpretar(t, banco.lista('produtos').filter((p) => p.ativo !== false)), t)
      },
      onErro: setErro,
      onFim: () => setOuvindo(false),
    })
  }
  return (
    <div className="mf-voz">
      <button type="button" className={ouvindo ? 'mf-mic ouvindo' : 'mf-mic'} onClick={comecar} disabled={!disponivel || ouvindo} aria-label="Falar um comando">
        🎤
      </button>
      <div>
        <strong>{ouvindo ? 'Pode falar…' : disponivel ? 'Toque e fale' : 'Voz indisponível neste navegador'}</strong>
        <span className="muted">{texto ? `“${texto}”` : exemplos}</span>
        {erro && <span className="mf-erro">{erro}</span>}
      </div>
    </div>
  )
}

/* ---------- Início ---------- */

export function Inicio() {
  const { banco, ir } = useSistema()
  const cfg = useConfig()
  const r = useResumo()
  const [resposta, setResposta] = useState('')
  const das = valorDAS(cfg.mei_atividade)
  const prox = proximoDAS()
  const limite = limiteDoAno(cfg.mei_abertura)
  const pct = Math.min(100, (r.ano / limite.valor) * 100)
  const pagos = useTabela('lancamentos').some((l) => l.ref_id === `das:${prox.competencia.getFullYear()}-${String(prox.competencia.getMonth() + 1).padStart(2, '0')}`)

  const responder = (t) => {
    setResposta(t)
    falar(t)
  }

  const comando = (cmd) => {
    if (cmd.acao === 'consulta') return responder(respostaConsulta(cmd, r))
    if (cmd.acao === 'gasto') {
      if (!cmd.valor) return responder('Não entendi o valor. Diga, por exemplo: gastei 50 reais de luz.')
      registrarGasto(banco, cmd)
      return responder(`Pronto, anotei um gasto de ${reaisFalado(cmd.valor)}: ${cmd.descricao}.`)
    }
    if (cmd.acao === 'vender') {
      carrinhoPendente = cmd.itens
      return ir('venda-facil')
    }
    if (cmd.acao === 'nota') return ir('vendas')
    responder('Não entendi. Tente: vendi duas coxinhas, gastei 30 reais de gás ou quanto vendi hoje.')
  }

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
        <button type="button" className="mf-acao" onClick={() => responder(respostaConsulta({ periodo: 'mes', oque: 'lucro' }, r))}>
          <span>📊</span>Quanto ganhei
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('vendas')}>
          <span>🧾</span>Nota fiscal
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('produtos-facil')}>
          <span>📸</span>Meus produtos
        </button>
        <button type="button" className="mf-acao" onClick={() => ir('mei')}>
          <span>❓</span>Central MEI
        </button>
      </div>

      <BotaoVoz onComando={comando} exemplos="Ex.: “vendi duas coxinhas e um café”, “gastei 50 reais de luz”, “quanto vendi hoje?”" />
      {resposta && (
        <p className="mf-resposta" role="status">
          {resposta}
        </p>
      )}

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

export function registrarGasto(banco, { valor, descricao, categoria, ref_id = '' }) {
  const hoje = hojeISO()
  return banco.salvar('lancamentos', { tipo: 'despesa', descricao: descricao || 'Gasto', valor: round2(valor), vencimento: hoje, pago_em: hoje, forma: 'dinheiro', categoria: categoria || 'outros', ref_id })
}

/* ---------- Vender ---------- */

const FORMAS = [
  ['dinheiro', '💵', 'Dinheiro'],
  ['pix', '⚡', 'Pix'],
  ['debito', '💳', 'Débito'],
  ['credito', '💳', 'Crédito'],
]

export function VendaFacil() {
  const { banco, usuario } = useSistema()
  const cfg = useConfig()
  const produtos = useTabela('produtos')
  const ativos = useMemo(() => produtos.filter((p) => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome)), [produtos])
  const [etapa, setEtapa] = useState('itens')
  const [modo, setModo] = useState('tocar')
  const [carrinho, setCarrinho] = useState(() => {
    const inicial = (carrinhoPendente || []).map(({ produto, qtd }) => ({ produto_id: produto.id, nome: produto.nome, preco: Number(produto.preco) || 0, qtd }))
    carrinhoPendente = null
    return inicial
  })
  const [forma, setForma] = useState('')
  const [recebido, setRecebido] = useState('')
  const [venda, setVenda] = useState(null)
  const [nota, setNota] = useState(null)
  const [documento, setDocumento] = useState('')
  const [fala, setFala] = useState('')
  const [codigoNovo, setCodigoNovo] = useState('')
  const total = round2(carrinho.reduce((s, i) => s + i.preco * i.qtd, 0))
  const qtd = carrinho.reduce((s, i) => s + i.qtd, 0)
  const servico = carrinho.length > 0 && carrinho.every((i) => produtos.find((p) => p.id === i.produto_id)?.tipo === 'servico')

  const adicionar = useCallback((p, n = 1) => {
    setCarrinho((c) => {
      const i = c.findIndex((x) => x.produto_id === p.id)
      if (i >= 0) return c.map((x, k) => (k === i ? { ...x, qtd: x.qtd + n } : x))
      return [...c, { produto_id: p.id, nome: p.nome, preco: Number(p.preco) || 0, qtd: n }]
    })
  }, [])

  const responder = (t) => {
    setFala(t)
    falar(t)
  }

  const comando = (cmd) => {
    if (cmd.acao === 'vender') {
      cmd.itens.forEach(({ produto, qtd: n }) => adicionar(produto, n))
      responder(`Adicionei ${cmd.itens.map((i) => `${num(i.qtd)} ${i.produto.nome}`).join(' e ')}.`)
      if (cmd.forma) {
        setForma(cmd.forma)
        setEtapa('pagamento')
      }
      return
    }
    if (cmd.acao === 'pagar') {
      if (!carrinho.length) return responder('Primeiro diga o que está vendendo.')
      setForma(cmd.forma)
      return setEtapa('pagamento')
    }
    if (cmd.acao === 'limpar') {
      setCarrinho([])
      return responder('Limpei a venda.')
    }
    responder('Não achei esse produto. Diga o nome como está cadastrado, por exemplo: duas coxinhas.')
  }

  const concluir = () => {
    const pago = forma === 'dinheiro' ? Math.max(parseValor(recebido) || total, total) : total
    const v = concluirVenda(banco, {
      venda: { itens: carrinho, origem: 'pdv', desconto: 0, taxa_entrega: 0 },
      pagamentos: [{ forma, valor: pago }],
      troco: pago - total,
      operador: usuario,
    })
    setVenda(v)
    setEtapa('nota')
    falar(`Venda de ${reaisFalado(total)} registrada.${pago > total ? ` Troco: ${reaisFalado(pago - total)}.` : ''}`)
  }

  const novaVenda = () => {
    setCarrinho([])
    setForma('')
    setRecebido('')
    setVenda(null)
    setDocumento('')
    setEtapa('itens')
  }

  const passos = [
    ['itens', '1. O que vendeu'],
    ['pagamento', '2. Como pagou'],
    ['nota', '3. Nota fiscal'],
  ]

  return (
    <div className="mf">
      <ol className="mf-passos">
        {passos.map(([id, rotulo]) => (
          <li key={id} className={etapa === id ? 'atual' : passos.findIndex(([x]) => x === etapa) > passos.findIndex(([x]) => x === id) ? 'feito' : ''}>
            {rotulo}
          </li>
        ))}
      </ol>

      {etapa === 'itens' && (
        <>
          <div className="mf-modos" role="tablist">
            {[
              ['tocar', '👆', 'Tocar'],
              ['camera', '📷', 'Câmera'],
              ['codigo', '▦', 'Código / QR'],
              ['voz', '🎤', 'Falar'],
            ].map(([id, ic, rotulo]) => (
              <button key={id} type="button" role="tab" aria-selected={modo === id} className={modo === id ? 'ativo' : ''} onClick={() => setModo(id)}>
                <span>{ic}</span>
                {rotulo}
              </button>
            ))}
          </div>

          {modo === 'tocar' && (
            <div className="mf-produtos">
              {ativos.map((p) => (
                <button key={p.id} type="button" className="mf-produto" onClick={() => adicionar(p)}>
                  {p.foto_url ? <img src={p.foto_url} alt="" /> : <span className="mf-letra">{p.nome[0]}</span>}
                  <strong>{p.nome}</strong>
                  <span>{brl(p.preco)}</span>
                </button>
              ))}
              {!ativos.length && <p className="muted">Cadastre seus produtos em Meus produtos.</p>}
            </div>
          )}
          {modo === 'camera' && <Reconhecer produtos={ativos} onProduto={(p) => adicionar(p)} />}
          {modo === 'codigo' && <LerCodigo produtos={ativos} onProduto={(p) => adicionar(p)} onDesconhecido={setCodigoNovo} />}
          {modo === 'voz' && <BotaoVoz onComando={comando} exemplos="Ex.: “duas coxinhas e um café”, “pagou no pix”, “limpar”" />}
          {fala && <p className="mf-resposta">{fala}</p>}
          {codigoNovo && modo === 'codigo' && (
            <p className="notice warn">
              O código {codigoNovo} não está em nenhum produto. Cadastre em <b>Meus produtos</b> e coloque esse número em “Código de barras”.
            </p>
          )}

          <ul className="mf-carrinho" aria-label="Itens da venda">
            {carrinho.map((i, k) => (
              <li key={i.produto_id}>
                <strong>{i.nome}</strong>
                <div className="mf-qtd">
                  <button type="button" aria-label="Menos" onClick={() => setCarrinho((c) => c.map((x, j) => (j === k ? { ...x, qtd: x.qtd - 1 } : x)).filter((x) => x.qtd > 0))}>
                    −
                  </button>
                  <span>{num(i.qtd)}</span>
                  <button type="button" aria-label="Mais" onClick={() => setCarrinho((c) => c.map((x, j) => (j === k ? { ...x, qtd: x.qtd + 1 } : x)))}>
                    +
                  </button>
                </div>
                <span>{brl(i.preco * i.qtd)}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="mf-continuar" disabled={!carrinho.length} onClick={() => setEtapa('pagamento')}>
            {carrinho.length ? `Continuar · ${num(qtd)} ${qtd === 1 ? 'item' : 'itens'} · ${brl(total)}` : 'Escolha o que está vendendo'}
          </button>
        </>
      )}

      {etapa === 'pagamento' && (
        <>
          <p className="mf-total">
            <span>Total</span>
            <strong>{brl(total)}</strong>
          </p>
          <h2 className="mf-pergunta">Como o cliente pagou?</h2>
          <div className="mf-acoes">
            {FORMAS.map(([id, ic, rotulo]) => (
              <button key={id} type="button" className={forma === id ? 'mf-acao selecionada' : 'mf-acao'} onClick={() => setForma(id)}>
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
          <div className="mf-rodape">
            <button type="button" className="mf-voltar" onClick={() => setEtapa('itens')}>
              ← Voltar
            </button>
            <button type="button" className="mf-continuar" disabled={!forma || (forma === 'dinheiro' && recebido !== '' && parseValor(recebido) < total)} onClick={concluir}>
              ✓ Recebi {brl(total)}
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
          {venda.fiscal && (
            <div className="mf-rodape">
              <button type="button" className="mf-voltar" onClick={() => imprimir(htmlCupom(venda, cfg), { cupom: true, titulo: 'Recibo' })}>
                Imprimir recibo
              </button>
              <button type="button" className="mf-continuar" onClick={novaVenda}>
                Nova venda
              </button>
            </div>
          )}
        </>
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
  const [fala, setFala] = useState('')
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
          <BotaoVoz
            exemplos="Ex.: “gastei 80 reais de mercadoria”, “paguei 120 de luz”"
            onComando={(cmd) => {
              if (cmd.acao !== 'gasto' || !cmd.valor) {
                setFala('Não entendi. Diga, por exemplo: gastei 50 reais de luz.')
                return falar('Não entendi. Diga, por exemplo: gastei 50 reais de luz.')
              }
              registrarGasto(banco, cmd)
              const t = `Anotado: ${reaisFalado(cmd.valor)}, ${cmd.descricao}.`
              setFala(t)
              falar(t)
            }}
          />
          {fala && <p className="mf-resposta">{fala}</p>}
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
  const [p, setP] = useState(() => ({ ...inicial, preco: inicial.preco !== undefined ? String(inicial.preco).replace('.', ',') : '' }))
  const [tela, setTela] = useState('dados')
  const [erro, setErro] = useState('')
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }))

  const salvar = (extra = {}) => {
    if (!String(p.nome || '').trim()) return setErro('Dê um nome ao produto.')
    if (!(parseValor(p.preco) > 0)) return setErro('Informe o preço.')
    const salvo = banco.salvar('produtos', { ...p, ...extra, nome: p.nome.trim(), preco: parseValor(p.preco) })
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

  const imprimirRelatorio = () => {
    const [a, m] = mes.split('-')
    const linha = (rot, v) => `<tr><td>${rot}</td><td class="n">${brl(v)}</td></tr>`
    imprimir(
      `<h1>Relatório Mensal das Receitas Brutas</h1><p class="muted">Período de apuração: ${m}/${a}</p>
      <div class="grade"><div>CNPJ: <b>${(cfg.documento || '').replace(/</g, '&lt;') || '________________'}</b></div><div>Empreendedor: <b>${(cfg.empresa_nome || '').replace(/</g, '&lt;')}</b></div></div>
      <h2>Receita bruta mensal: revenda de mercadorias (comércio)</h2><table>${linha('I - Revenda de mercadorias com dispensa de emissão de documento fiscal', rec.comercioSemNota)}${linha('II - Revenda de mercadorias com documento fiscal emitido', rec.comercioComNota)}${linha('III - Total das receitas com revenda de mercadorias (I + II)', rec.comercio)}</table>
      <h2>Receita bruta mensal: venda de produtos industrializados (indústria)</h2><table>${linha('IV - Venda de produtos industrializados com dispensa de emissão de documento fiscal', 0)}${linha('V - Venda de produtos industrializados com documento fiscal emitido', 0)}${linha('VI - Total das receitas com venda de produtos industrializados (IV + V)', 0)}</table>
      <h2>Receita bruta mensal: prestação de serviços</h2><table>${linha('VII - Receita com prestação de serviços com dispensa de emissão de documento fiscal', rec.servicoSemNota)}${linha('VIII - Receita com prestação de serviços com documento fiscal emitido', rec.servicoComNota)}${linha('IX - Total das receitas com prestação de serviços (VII + VIII)', rec.servico)}</table>
      <table><tr><td class="total">X - Total geral das receitas brutas no mês (III + VI + IX)</td><td class="n total">${brl(rec.total)}</td></tr></table>
      <p class="muted">Anexe a este relatório os documentos fiscais de compras de mercadorias e insumos e as notas fiscais emitidas no período. Gerado pelo MEI na Mão a partir das vendas registradas; confira antes de assinar.</p>
      <div class="ass"><div>Local e data</div><div>Assinatura do empreendedor</div></div>`,
      { titulo: `Relatório mensal ${m}-${a}` },
    )
  }

  const notaResposta = empresa === null ? null : precisaNota({ documento: empresa ? '00000000000000' : '', servico: Boolean(servicoQ) })

  return (
    <div className="mf">
      <h1 className="mf-titulo">Central MEI</h1>
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

