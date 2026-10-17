'use client'

// Frente de caixa: busca/código de barras, carrinho, cliente, desconto e pagamento.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Combo, Modal, Vazio, useConfig, useMapa, useSistema, useTabela } from '../base'
import { Pagamento, htmlCupom, htmlProposta, imprimir } from '../comuns'
import { caixaAberto, concluirVenda } from '@/lib/sistemas/acoes'
import { brl, contaVenda, linkWhats, num, parseValor, resumoItens, round2, saldos } from '@/lib/sistemas/regras'
import { AbrirCaixa } from './Caixa'
import { NotaFiscal, SeloFiscal } from '../Fiscal'

export default function Pdv() {
  const { banco, usuario, ativos, ir } = useSistema()
  const cfg = useConfig()
  const produtos = useTabela('produtos')
  const categorias = useTabela('categorias')
  const movs = useTabela('estoque_mov')
  const caixas = useTabela('caixas')
  const clientes = useMapa('clientes')
  const [busca, setBusca] = useState('')
  const [cat, setCat] = useState('')
  const [carrinho, setCarrinho] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [desconto, setDesconto] = useState('')
  const [pagando, setPagando] = useState(false)
  const [feita, setFeita] = useState(null)
  const [camera, setCamera] = useState(false)
  const [aviso, setAviso] = useState('')
  const [nota, setNota] = useState(null)
  const buscaRef = useRef(null)

  const precisaCaixa = ativos.includes('caixa')
  const caixa = useMemo(() => caixaAberto(banco), [banco, caixas])
  const sald = useMemo(() => saldos(movs), [movs])
  const ativosProd = useMemo(() => produtos.filter((p) => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome)), [produtos])
  const visiveis = useMemo(() => {
    // "3*7891…" é quantidade vezes código: filtra só pelo código.
    const q = busca
      .trim()
      .toLowerCase()
      .replace(/^\d+(?:[.,]\d+)?\*/, '')
    return ativosProd.filter((p) => (!cat || p.categoria_id === cat) && (!q || p.nome.toLowerCase().includes(q) || String(p.codigo_barras || '').includes(q))).slice(0, 80)
  }, [ativosProd, busca, cat])

  const cliente = clientes.get(clienteId)
  const venda = { itens: carrinho, desconto: parseValor(desconto) }
  const { subtotal, total } = contaVenda(venda)

  const adicionar = (p, qtd = 1) => {
    setAviso('')
    setCarrinho((c) => {
      const i = c.findIndex((x) => x.produto_id === p.id)
      if (i >= 0) return c.map((x, k) => (k === i ? { ...x, qtd: round2(x.qtd + qtd) } : x))
      return [...c, { produto_id: p.id, nome: p.nome, qtd, preco: Number(p.preco) || 0 }]
    })
  }

  // Leitor de código de barras USB digita o código e aperta Enter.
  const enter = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = busca.trim()
    if (!q) return
    // "3*789..." multiplica a quantidade.
    const m = q.match(/^(\d+(?:[.,]\d+)?)\*(.+)$/)
    const qtd = m ? parseValor(m[1]) : 1
    const termo = (m ? m[2] : q).trim()
    const exato = ativosProd.find((p) => p.codigo_barras && String(p.codigo_barras) === termo)
    const alvo = exato || (visiveis.length === 1 ? visiveis[0] : null)
    if (alvo) {
      adicionar(alvo, qtd)
      setBusca('')
    } else setAviso(visiveis.length ? 'Mais de um produto encontrado: clique no certo.' : 'Produto não encontrado.')
  }

  useEffect(() => {
    const atalho = (e) => {
      if (pagando || feita) return
      if (e.key === 'F2' && carrinho.length) {
        e.preventDefault()
        setPagando(true)
      }
      if (e.key === 'F4') {
        e.preventDefault()
        buscaRef.current?.focus()
      }
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [carrinho.length, pagando, feita])

  const finalizar = (pagamentos, troco) => {
    const v = concluirVenda(banco, {
      venda: { ...venda, cliente_id: clienteId, cliente_nome: cliente?.nome ?? '', telefone: cliente?.telefone ?? '', origem: 'pdv', taxa_entrega: 0 },
      pagamentos,
      troco,
      operador: usuario,
    })
    setPagando(false)
    setFeita(v)
    setCarrinho([])
    setClienteId('')
    setDesconto('')
  }

  const orcamento = () => {
    const v = banco.salvar('vendas', { ...venda, subtotal, total, cliente_id: clienteId, cliente_nome: cliente?.nome ?? '', telefone: cliente?.telefone ?? '', status: 'orcamento', origem: 'pdv', pagamentos: [], operador: usuario })
    imprimir(htmlProposta(v, cfg), { titulo: `Orçamento ${v.numero || ''}` })
    setCarrinho([])
  }

  if (precisaCaixa && !caixa) {
    return (
      <div className="sx-modulo">
        <div className="sx-cartao sx-centro">
          <h2>Abra o caixa para começar a vender</h2>
          <p className="muted">Informe o troco que está na gaveta. No fim do dia você fecha e confere.</p>
          <AbrirCaixa />
        </div>
      </div>
    )
  }

  return (
    <div className="sx-pdv">
      <section className="sx-pdv-produtos">
        <div className="sx-pdv-busca">
          <input
            ref={buscaRef}
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={enter}
            placeholder="Nome ou código de barras (F4). Ex.: 3*7891000… soma 3 unidades"
            aria-label="Buscar produto"
          />
          {'BarcodeDetector' in globalThis && (
            <button type="button" className="btn btn-ghost" onClick={() => setCamera(true)} title="Ler código pela câmera">
              📷
            </button>
          )}
        </div>
        {aviso && <p className="notice warn">{aviso}</p>}
        <div className="chips sx-chips">
          <button type="button" className={!cat ? 'chip active' : 'chip'} onClick={() => setCat('')}>
            Todos
          </button>
          {categorias.map((c) => (
            <button key={c.id} type="button" className={cat === c.id ? 'chip active' : 'chip'} onClick={() => setCat(c.id)}>
              {c.nome}
            </button>
          ))}
        </div>
        <div className="sx-pdv-grade">
          {visiveis.map((p) => {
            const est = p.controla_estoque ? sald.get(p.id) || 0 : null
            return (
              <button key={p.id} type="button" className="sx-produto" onClick={() => adicionar(p)}>
                <strong>{p.nome}</strong>
                <span>{brl(p.preco)}</span>
                {est !== null && <small className={est <= (Number(p.estoque_minimo) || 0) ? 'sx-baixo' : ''}>{num(est, 3)} em estoque</small>}
              </button>
            )
          })}
          {visiveis.length === 0 && <Vazio>Nenhum produto. Cadastre em Produtos.</Vazio>}
        </div>
      </section>

      {carrinho.length > 0 && (
        <button type="button" className="sx-pdv-ir" onClick={() => document.getElementById('sx-carrinho')?.scrollIntoView({ behavior: 'smooth' })}>
          <span>Ver venda · {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}</span>
          <strong>{brl(total)}</strong>
        </button>
      )}

      <section className="sx-pdv-carrinho" id="sx-carrinho" aria-label="Carrinho">
        <h2>Venda atual</h2>
        <Combo tabela="clientes" value={clienteId} onChange={setClienteId} placeholder="Cliente (opcional)" />
        <ul className="sx-carrinho">
          {carrinho.length === 0 && <li className="muted sx-carrinho-vazio">Toque nos produtos ou bipe o código.</li>}
          {carrinho.map((i, k) => (
            <li key={i.produto_id}>
              <div>
                <strong>{i.nome}</strong>
                <small>
                  {num(i.qtd, 3)} × {brl(i.preco)}
                </small>
              </div>
              <div className="sx-qtd">
                <button type="button" className="icon-btn" aria-label="Menos" onClick={() => setCarrinho((c) => c.map((x, j) => (j === k ? { ...x, qtd: Math.max(0, round2(x.qtd - 1)) } : x)).filter((x) => x.qtd > 0))}>
                  −
                </button>
                <button type="button" className="icon-btn" aria-label="Mais" onClick={() => setCarrinho((c) => c.map((x, j) => (j === k ? { ...x, qtd: round2(x.qtd + 1) } : x)))}>
                  +
                </button>
              </div>
              <strong className="sx-carrinho-total">{brl(i.preco * i.qtd)}</strong>
            </li>
          ))}
        </ul>
        <div className="sx-pdv-contas">
          <div className="sx-linha-valor">
            <span>Subtotal</span>
            <span>{brl(subtotal)}</span>
          </div>
          <label className="sx-linha-valor">
            <span>Desconto</span>
            <span className="sx-moeda pequeno">
              <span>R$</span>
              <input inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" />
            </span>
          </label>
          <div className="sx-linha-valor sx-total">
            <span>Total</span>
            <strong>{brl(total)}</strong>
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-lg sx-largo" disabled={!carrinho.length} onClick={() => setPagando(true)}>
          Receber {brl(total)} (F2)
        </button>
        <div className="sx-acoes">
          <button type="button" className="btn btn-ghost" disabled={!carrinho.length} onClick={orcamento}>
            Salvar orçamento
          </button>
          <button type="button" className="btn btn-ghost" disabled={!carrinho.length} onClick={() => setCarrinho([])}>
            Limpar
          </button>
          {precisaCaixa && (
            <button type="button" className="btn btn-ghost" onClick={() => ir('caixa')}>
              Caixa
            </button>
          )}
        </div>
      </section>

      {pagando && <Pagamento total={total} cliente={cliente} onFechar={() => setPagando(false)} onConfirmar={finalizar} />}
      {camera && (
        <LeitorCamera
          onLer={(codigo) => {
            setCamera(false)
            const p = ativosProd.find((x) => String(x.codigo_barras) === codigo)
            if (p) adicionar(p)
            else setAviso(`Código ${codigo} não cadastrado.`)
          }}
          onFechar={() => setCamera(false)}
        />
      )}
      {feita && (
        <Modal titulo={`Venda ${feita.numero ? `#${feita.numero} ` : ''}concluída`} onFechar={() => setFeita(null)}>
          <div className="sx-sucesso">
            <strong>{brl(feita.total)}</strong>
            {feita.troco > 0 && <p className="sx-troco">Troco: {brl(feita.troco)}</p>}
            {feita.fiscal && <SeloFiscal fiscal={feita.fiscal} />}
          </div>
          <div className="sx-acoes">
            <button type="button" className="btn btn-primary" autoFocus onClick={() => setFeita(null)}>
              Nova venda (Enter)
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => imprimir(htmlCupom(feita, cfg), { cupom: true, titulo: 'Cupom' })}>
              Imprimir cupom
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setNota(feita)}>
              {feita.fiscal ? 'Ver nota fiscal' : 'Emitir nota fiscal (simulação)'}
            </button>
            {feita.telefone && (
              <a className="btn btn-ghost" target="_blank" rel="noopener noreferrer" href={linkWhats(feita.telefone, `${cfg.empresa_nome || ''}: obrigado pela compra! ${resumoItens(feita.itens)}. Total ${brl(feita.total)}.`)}>
                Enviar no WhatsApp
              </a>
            )}
          </div>
        </Modal>
      )}
      {nota && (
        <NotaFiscal
          venda={nota}
          onFechar={() => {
            setNota(null)
            setFeita((f) => (f ? banco.get('vendas', f.id) || f : f))
          }}
        />
      )}
    </div>
  )
}

/** Lê código de barras pela câmera com a API nativa do navegador (Chrome/Android). */
function LeitorCamera({ onLer, onFechar }) {
  const video = useRef(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    let stream
    let parar = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        video.current.srcObject = stream
        await video.current.play()
        const detector = new globalThis.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'qr_code'] })
        const loop = async () => {
          if (parar) return
          try {
            const [c] = await detector.detect(video.current)
            if (c?.rawValue) return onLer(c.rawValue)
          } catch {
            /* quadro ruim: tenta o próximo */
          }
          setTimeout(loop, 200)
        }
        loop()
      } catch (e) {
        setErro(`Câmera indisponível: ${e.message}`)
      }
    })()
    return () => {
      parar = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onLer])
  return (
    <Modal titulo="Aponte para o código de barras" onFechar={onFechar}>
      {erro ? <p className="notice error">{erro}</p> : <video ref={video} className="sx-video" playsInline muted />}
    </Modal>
  )
}
