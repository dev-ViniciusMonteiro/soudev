'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { imgUrl, API } from '@/lib/catalogo/api'
import { classeFontes } from '@/lib/catalogo/fontes'
import { corDoTexto, linkWhatsapp, mascaraTelefone, mensagemPedido, reais } from '@/lib/catalogo/formato'
import { BLOCOS } from '@/lib/catalogo/modelos'

const iniciais = (nome) =>
  String(nome || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

const desconto = (p) => (p.preco_de > p.preco && p.preco > 0 ? Math.round((1 - p.preco / p.preco_de) * 100) : 0)

function Foto({ id, alt, className }) {
  if (!id)
    return (
      <div className={`${className} ct-foto-vazia`} aria-hidden="true">
        <span>🛍️</span>
      </div>
    )
  return <img src={imgUrl(id)} alt={alt} className={className} loading="lazy" decoding="async" />
}

function Preco({ p, grande }) {
  const off = desconto(p)
  return (
    <div className={`ct-preco${grande ? ' ct-preco-g' : ''}`}>
      {p.preco > 0 ? <strong>{reais(p.preco)}</strong> : <strong>Consulte</strong>}
      {off > 0 && <s>{reais(p.preco_de)}</s>}
    </div>
  )
}

function CartaoProduto({ p, layout, mostrarDescricao, qtd, onAbrir, onMais }) {
  const esgotado = p.estado === 'esgotado'
  const off = desconto(p)
  return (
    <article className={`ct-card ct-card-${layout}`} data-esgotado={esgotado || undefined}>
      <button type="button" className="ct-card-abrir" onClick={() => onAbrir(p)} aria-label={`Ver ${p.nome}`}>
        <div className="ct-card-foto">
          <Foto id={p.imagem} alt={p.nome} className="ct-img" />
          {esgotado ? <span className="ct-selo ct-selo-esg">Esgotado</span> : off > 0 ? <span className="ct-selo">-{off}%</span> : null}
        </div>
        <div className="ct-card-info">
          <h3>{p.nome}</h3>
          {(mostrarDescricao || layout === 'lista' || layout === 'grande') && p.descricao && <p className="ct-card-desc">{p.descricao}</p>}
          <Preco p={p} />
        </div>
      </button>
      {!esgotado && (
        <button type="button" className="ct-mais" onClick={() => onMais(p)} aria-label={`Adicionar ${p.nome} ao pedido`}>
          {qtd > 0 ? <span>{qtd}</span> : '+'}
        </button>
      )}
    </article>
  )
}

function ListaProdutos({ itens, layout, colunas, mostrarDescricao, carrinho, onAbrir, onMais }) {
  return (
    <div className={`ct-lista ct-lista-${layout}`} style={{ '--ct-colunas': colunas || 2 }}>
      {itens.map((p) => (
        <CartaoProduto key={p.id} p={p} layout={layout} mostrarDescricao={mostrarDescricao} qtd={carrinho[p.id] || 0} onAbrir={onAbrir} onMais={onMais} />
      ))}
    </div>
  )
}

export default function Vitrine({ loja, produtos, edicao, urlPublica }) {
  const cfg = loja.config || {}
  const tema = cfg.tema || {}
  const cor = tema.cor || '#ff5a36'
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [aberto, setAberto] = useState(null) // produto no modal
  const [qtdModal, setQtdModal] = useState(1)
  const [sacola, setSacola] = useState(false)
  const [carrinho, setCarrinho] = useState({})
  const [nomeCliente, setNomeCliente] = useState('')
  const [obs, setObs] = useState('')
  const [receber, setReceber] = useState('')
  const [aviso, setAviso] = useState('')
  const chaveCarrinho = `ct-carrinho-${loja.slug}`
  const contou = useRef(false)
  const timerAviso = useRef(0)

  // carrinho guardado no aparelho do cliente; a visita conta uma vez
  useEffect(() => {
    if (edicao) return
    try {
      const c = JSON.parse(localStorage.getItem(chaveCarrinho) || '{}')
      if (c && typeof c === 'object') setCarrinho(c)
      setNomeCliente(localStorage.getItem('ct-cliente-nome') || '')
    } catch {}
    if (!contou.current && API) {
      contou.current = true
      fetch(`${API}/ct/loja/${loja.slug}/visita`, { method: 'POST' }).catch(() => {})
    }
  }, [chaveCarrinho, edicao, loja.slug])
  useEffect(() => {
    if (edicao) return
    try {
      localStorage.setItem(chaveCarrinho, JSON.stringify(carrinho))
    } catch {}
  }, [carrinho, chaveCarrinho, edicao])

  const visiveis = useMemo(() => produtos.filter((p) => p.estado !== 'oculto'), [produtos])
  const categorias = useMemo(() => [...new Set(visiveis.map((p) => p.categoria).filter(Boolean))], [visiveis])
  const termo = busca.trim().toLowerCase()
  const filtrando = Boolean(termo || categoria)
  const passa = (p) =>
    (!categoria || p.categoria === categoria) &&
    (!termo || `${p.nome} ${p.descricao} ${p.categoria}`.toLowerCase().includes(termo))

  const itensCarrinho = visiveis
    .filter((p) => carrinho[p.id] > 0 && p.estado === 'ativo')
    .map((p) => ({ ...p, qtd: carrinho[p.id] }))
  const totalItens = itensCarrinho.reduce((s, i) => s + i.qtd, 0)
  const total = itensCarrinho.reduce((s, i) => s + i.qtd * i.preco, 0)
  const faltaMinimo = cfg.pedidoMinimo > 0 && total < cfg.pedidoMinimo ? cfg.pedidoMinimo - total : 0

  const somar = (p, n = 1) => {
    setCarrinho((c) => {
      const q = Math.max(0, Math.min(99, (c[p.id] || 0) + n))
      const novo = { ...c, [p.id]: q }
      if (!q) delete novo[p.id]
      return novo
    })
    if (n > 0) {
      setAviso(`${p.nome} no pedido`)
      clearTimeout(timerAviso.current)
      timerAviso.current = setTimeout(() => setAviso(''), 1600)
    }
  }
  const abrir = (p) => {
    setAberto(p)
    setQtdModal(1)
  }

  const contarPedido = () => {
    if (!edicao && API) fetch(`${API}/ct/loja/${loja.slug}/pedido`, { method: 'POST', keepalive: true }).catch(() => {})
  }
  const msgCarrinho = () => {
    try {
      localStorage.setItem('ct-cliente-nome', nomeCliente)
    } catch {}
    return mensagemPedido({ loja, itens: itensCarrinho, nome: nomeCliente.trim(), obs: obs.trim(), entrega: receber, url: urlPublica })
  }
  const msgUm = (p, q) => mensagemPedido({ loja, itens: [{ ...p, qtd: q }], url: urlPublica })
  const temZap = String(loja.whatsapp || '').length >= 10

  const irParaProdutos = () => {
    const raiz = document.querySelector('.ct-v')
    raiz?.querySelector('[data-bloco="produtos"], [data-bloco="destaques"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const blocos = (cfg.blocos || []).filter((b) => edicao || b.visivel)
  const primeiroProdutos = blocos.find((b) => b.tipo === 'produtos' && b.visivel)?.id

  function conteudo(b) {
    const o = b.opcoes || {}
    switch (b.tipo) {
      case 'cabecalho':
        return (
          <header className="ct-cab" data-alinhamento={o.alinhamento}>
            {cfg.logo ? (
              <img src={imgUrl(cfg.logo)} alt={`Logo ${loja.nome}`} className="ct-logo" data-tam={o.tamanhoLogo} />
            ) : (
              <div className="ct-logo ct-logo-ini" data-tam={o.tamanhoLogo} aria-hidden="true">
                {iniciais(loja.nome)}
              </div>
            )}
            <div className="ct-cab-txt">
              {o.mostrarNome !== false && <h1>{loja.nome}</h1>}
              {o.mostrarDescricao !== false && cfg.descricao && <p>{cfg.descricao}</p>}
            </div>
          </header>
        )
      case 'capa':
        return (
          <div className="ct-capa" data-altura={o.altura} style={cfg.capa ? { backgroundImage: `url(${imgUrl(cfg.capa)})` } : undefined} data-sem-imagem={!cfg.capa || undefined}>
            <div className="ct-capa-txt">
              <h2>{o.titulo || loja.nome}</h2>
              {(o.subtitulo || cfg.descricao) && <p>{o.subtitulo || cfg.descricao}</p>}
              {o.botao && (
                <button type="button" className="ct-btn" onClick={irParaProdutos}>
                  {o.botao}
                </button>
              )}
            </div>
          </div>
        )
      case 'aviso':
        return o.texto ? (
          <div className="ct-aviso" data-estilo={o.estilo}>
            {o.estilo === 'faixa' ? (
              <div className="ct-faixa">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i}>{o.texto} ✦ </span>
                ))}
              </div>
            ) : (
              o.texto
            )}
          </div>
        ) : null
      case 'busca':
        return (
          <div className="ct-busca">
            <span aria-hidden="true">🔎</span>
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={o.placeholder || 'Buscar produto…'} aria-label="Buscar produto" />
            {busca && (
              <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca">
                ✕
              </button>
            )}
          </div>
        )
      case 'categorias':
        if (!categorias.length) return edicao ? <p className="ct-vazio-ed">Dê categorias aos produtos para aparecer o filtro.</p> : null
        return (
          <nav className="ct-cats" data-estilo={o.estilo} aria-label="Categorias">
            {['', ...categorias].map((c) => (
              <button key={c || '_todas'} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
                {c || 'Tudo'}
              </button>
            ))}
          </nav>
        )
      case 'destaques': {
        const lista = visiveis.filter((p) => p.destaque)
        if (filtrando || !lista.length) return edicao && !lista.length ? <p className="ct-vazio-ed">Marque produtos como ⭐ destaque para aparecerem aqui.</p> : null
        return (
          <section className="ct-sec">
            {o.titulo && <h2 className="ct-titulo">{o.titulo}</h2>}
            <ListaProdutos itens={lista} layout={o.layout === 'grade' ? 'grade' : 'carrossel'} colunas={2} carrinho={carrinho} onAbrir={abrir} onMais={somar} />
          </section>
        )
      }
      case 'produtos': {
        const base = visiveis.filter((p) => !o.categoria || p.categoria === o.categoria)
        const lista = base.filter(passa)
        if (!lista.length) {
          if (b.id === primeiroProdutos && filtrando)
            return (
              <div className="ct-nada">
                <p>Nada encontrado {termo ? `para “${busca.trim()}”` : 'nessa categoria'}.</p>
                <button type="button" className="ct-btn ct-btn-sec" onClick={() => { setBusca(''); setCategoria('') }}>
                  Ver tudo
                </button>
              </div>
            )
          return edicao && !base.length ? <p className="ct-vazio-ed">{produtos.length ? 'Nenhum produto nessa categoria.' : 'Cadastre produtos na aba Produtos.'}</p> : null
        }
        return (
          <section className="ct-sec">
            {o.titulo && <h2 className="ct-titulo">{o.titulo}</h2>}
            <ListaProdutos itens={lista} layout={o.layout} colunas={o.colunas} mostrarDescricao={o.mostrarDescricao} carrinho={carrinho} onAbrir={abrir} onMais={somar} />
          </section>
        )
      }
      case 'texto':
        if (!o.titulo && !o.texto) return null
        return (
          <section className="ct-sec ct-texto" data-alinhamento={o.alinhamento}>
            {o.titulo && <h2 className="ct-titulo">{o.titulo}</h2>}
            {o.texto && <p>{o.texto}</p>}
          </section>
        )
      case 'imagem':
        if (!o.imagem) return edicao ? <p className="ct-vazio-ed">Escolha uma imagem nas opções do bloco.</p> : null
        return (
          <figure className="ct-figura" data-formato={o.formato}>
            <img src={imgUrl(o.imagem)} alt={o.legenda || ''} loading="lazy" />
            {o.legenda && <figcaption>{o.legenda}</figcaption>}
          </figure>
        )
      case 'contato': {
        const itens = []
        if (temZap)
          itens.push(
            <a key="z" className="ct-ct ct-ct-zap" href={linkWhatsapp(loja.whatsapp, `Olá! Vim pelo catálogo ${loja.nome}.`)} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">💬</span>
              <div><b>WhatsApp</b><small>{mascaraTelefone(loja.whatsapp)}</small></div>
            </a>,
          )
        if (cfg.instagram)
          itens.push(
            <a key="i" className="ct-ct" href={`https://instagram.com/${cfg.instagram}`} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">📸</span>
              <div><b>Instagram</b><small>@{cfg.instagram}</small></div>
            </a>,
          )
        if (cfg.endereco)
          itens.push(
            <a key="e" className="ct-ct" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.endereco)}`} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">📍</span>
              <div><b>Endereço</b><small>{cfg.endereco}</small></div>
            </a>,
          )
        if (cfg.horario)
          itens.push(
            <div key="h" className="ct-ct">
              <span aria-hidden="true">🕒</span>
              <div><b>Horário</b><small>{cfg.horario}</small></div>
            </div>,
          )
        if (cfg.entrega)
          itens.push(
            <div key="d" className="ct-ct">
              <span aria-hidden="true">🛵</span>
              <div><b>Entrega</b><small>{cfg.entrega}</small></div>
            </div>,
          )
        if (!itens.length) return edicao ? <p className="ct-vazio-ed">Preencha WhatsApp, Instagram, endereço e horário na aba Loja.</p> : null
        return (
          <section className="ct-sec">
            {o.titulo && <h2 className="ct-titulo">{o.titulo}</h2>}
            <div className="ct-contatos">{itens}</div>
          </section>
        )
      }
      case 'rodape':
        return (
          <footer className="ct-rodape">
            {o.texto && <p>{o.texto}</p>}
            <p>
              © {new Date().getFullYear()} {loja.nome} ·{' '}
              <a href="/catalogo" target="_blank" rel="noopener">
                Crie seu catálogo grátis
              </a>
            </p>
          </footer>
        )
      default:
        return null
    }
  }

  const raizClasse = `ct-v ${classeFontes}`
  const estilo = { '--ct-cor': cor, '--ct-cor-txt': corDoTexto(cor) }

  return (
    <div
      className={raizClasse}
      style={estilo}
      data-fundo={tema.fundo || 'claro'}
      data-fonte={tema.fonte || 'moderna'}
      data-cantos={tema.cantos || 'suave'}
      data-cartao={tema.cartao || 'sombra'}
      data-edicao={edicao ? '' : undefined}
      onClickCapture={edicao ? (e) => e.target.closest('a') && e.preventDefault() : undefined}
    >
      <div className="ct-pagina">
        {blocos.map((b, i) => {
          const c = conteudo(b)
          if (!edicao) return c ? <div key={b.id} data-bloco={b.tipo}>{c}</div> : null
          const sel = edicao.selecionado === b.id
          return (
            <div
              key={b.id}
              ref={edicao.ord.ref(b.id)}
              {...edicao.ord.item(b.id)}
              data-bloco={b.tipo}
              data-bid={b.id}
              className="ct-ed-bloco"
              data-sel={sel || undefined}
              data-oculto={!b.visivel || undefined}
              onClickCapture={(e) => {
                // primeiro clique só seleciona o bloco; com ele selecionado, os cliques internos funcionam
                if (sel || e.target.closest('.ct-ed-barra')) return
                e.preventDefault()
                e.stopPropagation()
                edicao.onSelecionar(b.id)
              }}
            >
              <div className="ct-ed-barra" onClick={(e) => e.stopPropagation()}>
                <button className="ct-ed-alca" {...edicao.ord.alca(b.id)}>
                  <span aria-hidden="true">⠿</span> {BLOCOS[b.tipo]?.nome}
                  {!b.visivel && ' (oculto)'}
                </button>
                <button type="button" onClick={() => edicao.onAcao(b.id, 'subir')} disabled={i === 0} aria-label="Subir bloco" title="Subir">↑</button>
                <button type="button" onClick={() => edicao.onAcao(b.id, 'descer')} disabled={i === blocos.length - 1} aria-label="Descer bloco" title="Descer">↓</button>
                <button type="button" onClick={() => edicao.onAcao(b.id, 'visivel')} aria-label={b.visivel ? 'Ocultar bloco' : 'Mostrar bloco'} title={b.visivel ? 'Ocultar' : 'Mostrar'}>{b.visivel ? '👁' : '🚫'}</button>
                <button type="button" onClick={() => edicao.onAcao(b.id, 'remover')} aria-label="Remover bloco" title="Remover">✕</button>
              </div>
              {c || <p className="ct-vazio-ed">{BLOCOS[b.tipo]?.nome}: nada para mostrar ainda.</p>}
            </div>
          )
        })}
        {!blocos.length && <p className="ct-vazio-ed">Página vazia. Adicione blocos ou escolha um modelo.</p>}
      </div>

      {aviso && <div className="ct-toast" role="status">✓ {aviso}</div>}

      {totalItens > 0 && (
        <button type="button" className="ct-barra-pedido" onClick={() => setSacola(true)}>
          <span className="ct-barra-qtd">{totalItens}</span>
          <span>Ver pedido</span>
          <strong>{reais(total)}</strong>
        </button>
      )}

      {aberto && (
        <div className="ct-modal" role="dialog" aria-modal="true" aria-label={aberto.nome} onClick={() => setAberto(null)}>
          <div className="ct-modal-caixa" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ct-fechar" onClick={() => setAberto(null)} aria-label="Fechar">✕</button>
            <Foto id={aberto.imagem} alt={aberto.nome} className="ct-modal-foto" />
            <div className="ct-modal-corpo">
              {aberto.categoria && <span className="ct-modal-cat">{aberto.categoria}</span>}
              <h2>{aberto.nome}</h2>
              <Preco p={aberto} grande />
              {aberto.descricao && <p className="ct-modal-desc">{aberto.descricao}</p>}
              {aberto.estado === 'esgotado' ? (
                <p className="ct-esgotado-aviso">Esgotado no momento.</p>
              ) : (
                <>
                  <div className="ct-qtd">
                    <button type="button" onClick={() => setQtdModal((q) => Math.max(1, q - 1))} aria-label="Menos">−</button>
                    <span>{qtdModal}</span>
                    <button type="button" onClick={() => setQtdModal((q) => Math.min(99, q + 1))} aria-label="Mais">+</button>
                  </div>
                  <button type="button" className="ct-btn ct-btn-bloco" onClick={() => { somar(aberto, qtdModal); setAberto(null) }}>
                    Adicionar ao pedido{aberto.preco ? ` · ${reais(aberto.preco * qtdModal)}` : ''}
                  </button>
                  {temZap && (
                    <a className="ct-btn ct-btn-zap ct-btn-bloco" href={linkWhatsapp(loja.whatsapp, msgUm(aberto, qtdModal))} target="_blank" rel="noopener noreferrer" onClick={contarPedido}>
                      Pedir só este pelo WhatsApp
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {sacola && (
        <div className="ct-modal ct-modal-lado" role="dialog" aria-modal="true" aria-label="Seu pedido" onClick={() => setSacola(false)}>
          <div className="ct-modal-caixa ct-sacola" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ct-fechar" onClick={() => setSacola(false)} aria-label="Fechar">✕</button>
            <h2>Seu pedido</h2>
            {!itensCarrinho.length ? (
              <p className="ct-muted">Seu pedido está vazio.</p>
            ) : (
              <>
                <ul className="ct-itens">
                  {itensCarrinho.map((i) => (
                    <li key={i.id}>
                      <Foto id={i.imagem} alt="" className="ct-item-foto" />
                      <div className="ct-item-info">
                        <b>{i.nome}</b>
                        <small>{i.preco ? reais(i.preco * i.qtd) : 'Consulte'}</small>
                      </div>
                      <div className="ct-qtd ct-qtd-p">
                        <button type="button" onClick={() => somar(i, -1)} aria-label={`Tirar um ${i.nome}`}>−</button>
                        <span>{i.qtd}</span>
                        <button type="button" onClick={() => somar(i, 1)} aria-label={`Mais um ${i.nome}`}>+</button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="ct-total">
                  <span>Total</span>
                  <strong>{reais(total)}</strong>
                </div>
                {faltaMinimo > 0 && <p className="ct-alerta">Pedido mínimo de {reais(cfg.pedidoMinimo)}. Faltam {reais(faltaMinimo)}.</p>}
                <label className="ct-campo">
                  <span>Seu nome</span>
                  <input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Como podemos te chamar?" maxLength={60} autoComplete="name" />
                </label>
                <div className="ct-receber" role="radiogroup" aria-label="Como receber">
                  {['Retirar no local', 'Entrega'].map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={receber === r} onClick={() => setReceber(receber === r ? '' : r)}>
                      {r === 'Entrega' ? '🛵' : '🏪'} {r}
                    </button>
                  ))}
                </div>
                <label className="ct-campo">
                  <span>Observação</span>
                  <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder={receber === 'Entrega' ? 'Endereço de entrega, sabor, tamanho…' : 'Sabor, tamanho, horário…'} rows={2} maxLength={400} />
                </label>
                {temZap ? (
                  <a
                    className="ct-btn ct-btn-zap ct-btn-bloco"
                    href={faltaMinimo ? undefined : linkWhatsapp(loja.whatsapp, msgCarrinho())}
                    aria-disabled={faltaMinimo > 0 || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => (faltaMinimo ? e.preventDefault() : contarPedido())}
                  >
                    Enviar pedido pelo WhatsApp
                  </a>
                ) : (
                  <p className="ct-alerta">A loja ainda não informou o WhatsApp.</p>
                )}
                <button type="button" className="ct-link" onClick={() => setCarrinho({})}>
                  Esvaziar pedido
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
