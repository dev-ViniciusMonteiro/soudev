'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ct, enviarImagem, getToken, imgUrl, setToken, temBackend } from '@/lib/catalogo/api'
import { classeFontes } from '@/lib/catalogo/fontes'
import { deCentavos, mascaraTelefone, paraCentavos, reais, slugDe } from '@/lib/catalogo/formato'
import { BLOCOS, CORES, FONTES, FUNDOS, MODELOS, PRODUTOS_EXEMPLO, configDoModelo, novoBloco } from '@/lib/catalogo/modelos'
import { moverItem, useOrdenavel } from './useOrdenavel'
import Vitrine from './Vitrine'

const LIMITE = 20

/* ------------------------------ pecinhas ------------------------------ */
function Campo({ rotulo, dica, children }) {
  return (
    <label className="ce-campo">
      <span className="ce-rotulo">{rotulo}</span>
      {children}
      {dica && <small className="ce-dica">{dica}</small>}
    </label>
  )
}
function Seg({ valor, opcoes, onChange, rotulo }) {
  return (
    <div className="ce-campo">
      {rotulo && <span className="ce-rotulo">{rotulo}</span>}
      <div className="ce-seg" role="radiogroup" aria-label={rotulo}>
        {opcoes.map(([v, nome]) => (
          <button key={String(v)} type="button" role="radio" aria-checked={valor === v} onClick={() => onChange(v)}>
            {nome}
          </button>
        ))}
      </div>
    </div>
  )
}
function Chave({ rotulo, valor, onChange }) {
  return (
    <label className="ce-chave">
      <input type="checkbox" checked={!!valor} onChange={(e) => onChange(e.target.checked)} />
      <span className="ce-chave-trilho" aria-hidden="true" />
      <span>{rotulo}</span>
    </label>
  )
}
function EnviarImagem({ id, onChange, max, rotulo, redondo, onErro }) {
  const [enviando, setEnviando] = useState(false)
  const input = useRef(null)
  const escolher = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setEnviando(true)
    try {
      onChange(await enviarImagem(f, max))
    } catch (er) {
      onErro?.(er.message)
    } finally {
      setEnviando(false)
    }
  }
  return (
    <div className="ce-campo">
      {rotulo && <span className="ce-rotulo">{rotulo}</span>}
      <div className="ce-img">
        <button type="button" className={`ce-img-prev${redondo ? ' ce-redondo' : ''}`} onClick={() => input.current?.click()} disabled={enviando}>
          {enviando ? <span className="ce-girando" aria-label="Enviando" /> : id ? <img src={imgUrl(id)} alt="" /> : <span>＋ Foto</span>}
        </button>
        <div className="ce-img-acoes">
          <button type="button" className="ce-btn ce-btn-sec" onClick={() => input.current?.click()} disabled={enviando}>
            {id ? 'Trocar' : 'Escolher imagem'}
          </button>
          {id && (
            <button type="button" className="ce-link" onClick={() => onChange(null)}>
              Remover
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={escolher} />
      </div>
    </div>
  )
}

function MiniModelo({ m }) {
  // esquema visual do modelo (blocos como barrinhas na cor do tema)
  const fundo = { claro: '#fff', creme: '#f6efe4', escuro: '#171a21', preto: '#000' }[m.tema.fundo]
  const linha = m.tema.fundo === 'escuro' || m.tema.fundo === 'preto' ? '#ffffff22' : '#00000014'
  return (
    <div className="ce-mini" style={{ background: fundo }} aria-hidden="true">
      {m.blocos().slice(0, 6).map((b) => (
        <div key={b.id} className={`ce-mini-b ce-mini-${b.tipo}`} style={{ '--c': m.tema.cor, '--l': linha }} data-layout={b.opcoes.layout} />
      ))}
    </div>
  )
}

/* ------------------------------ opções de cada bloco ------------------------------ */
function OpcoesBloco({ b, set, categorias, cfg, setCfg, onErro, irPara }) {
  const o = b.opcoes
  const op = (k) => (v) => set({ ...o, [k]: v })
  const inp = (k, max, ph) => <input value={o[k] || ''} maxLength={max} placeholder={ph} onChange={(e) => op(k)(e.target.value)} />
  switch (b.tipo) {
    case 'cabecalho':
      return (
        <>
          <Seg rotulo="Posição do logo" valor={o.alinhamento} onChange={op('alinhamento')} opcoes={[['esquerda', 'Esquerda'], ['centro', 'Centro']]} />
          <Seg rotulo="Tamanho do logo" valor={o.tamanhoLogo} onChange={op('tamanhoLogo')} opcoes={[['p', 'P'], ['m', 'M'], ['g', 'G']]} />
          <Chave rotulo="Mostrar o nome" valor={o.mostrarNome} onChange={op('mostrarNome')} />
          <Chave rotulo="Mostrar a descrição" valor={o.mostrarDescricao} onChange={op('mostrarDescricao')} />
          <EnviarImagem rotulo="Logo" id={cfg.logo} max={400} redondo onErro={onErro} onChange={(id) => setCfg({ logo: id })} />
          <button type="button" className="ce-link" onClick={() => irPara('loja')}>Nome e descrição ficam na aba Loja →</button>
        </>
      )
    case 'capa':
      return (
        <>
          <EnviarImagem rotulo="Imagem da capa" id={cfg.capa} max={1600} onErro={onErro} onChange={(id) => setCfg({ capa: id })} />
          <Campo rotulo="Título" dica="Vazio = nome da loja">{inp('titulo', 80, 'Ex.: Doces que abraçam')}</Campo>
          <Campo rotulo="Subtítulo">{inp('subtitulo', 160, 'Ex.: Encomendas pelo WhatsApp')}</Campo>
          <Campo rotulo="Texto do botão" dica="Vazio = sem botão">{inp('botao', 30, 'Ver produtos')}</Campo>
          <Seg rotulo="Altura" valor={o.altura} onChange={op('altura')} opcoes={[['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']]} />
        </>
      )
    case 'aviso':
      return (
        <>
          <Campo rotulo="Texto do aviso">{inp('texto', 160, 'Ex.: Frete grátis acima de R$ 100')}</Campo>
          <Seg rotulo="Estilo" valor={o.estilo} onChange={op('estilo')} opcoes={[['cor', 'Na cor'], ['suave', 'Suave'], ['faixa', 'Letreiro']]} />
        </>
      )
    case 'busca':
      return <Campo rotulo="Texto dentro do campo">{inp('placeholder', 60, 'Buscar produto…')}</Campo>
    case 'categorias':
      return <Seg rotulo="Estilo" valor={o.estilo} onChange={op('estilo')} opcoes={[['pilulas', 'Pílulas'], ['abas', 'Abas']]} />
    case 'destaques':
      return (
        <>
          <Campo rotulo="Título">{inp('titulo', 60, 'Mais pedidos')}</Campo>
          <Seg rotulo="Como mostrar" valor={o.layout} onChange={op('layout')} opcoes={[['carrossel', 'Carrossel'], ['grade', 'Grade']]} />
          <p className="ce-dica">Marque ⭐ Destaque no produto para ele aparecer aqui.</p>
        </>
      )
    case 'produtos':
      return (
        <>
          <Campo rotulo="Título">{inp('titulo', 60, 'Produtos')}</Campo>
          <Seg rotulo="Como mostrar" valor={o.layout} onChange={op('layout')} opcoes={[['grade', 'Grade'], ['lista', 'Lista'], ['carrossel', 'Carrossel'], ['grande', 'Grande']]} />
          {o.layout === 'grade' && <Seg rotulo="Colunas (no computador)" valor={o.colunas} onChange={op('colunas')} opcoes={[[2, '2'], [3, '3'], [4, '4']]} />}
          <Campo rotulo="Mostrar só a categoria" dica="Use vários blocos de produtos para separar por categoria.">
            <select value={o.categoria || ''} onChange={(e) => op('categoria')(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Campo>
          <Chave rotulo="Mostrar descrição no cartão" valor={o.mostrarDescricao} onChange={op('mostrarDescricao')} />
        </>
      )
    case 'texto':
      return (
        <>
          <Campo rotulo="Título">{inp('titulo', 80, 'Sobre nós')}</Campo>
          <Campo rotulo="Texto">
            <textarea rows={5} maxLength={1500} value={o.texto || ''} onChange={(e) => op('texto')(e.target.value)} />
          </Campo>
          <Seg rotulo="Alinhamento" valor={o.alinhamento} onChange={op('alinhamento')} opcoes={[['esquerda', 'Esquerda'], ['centro', 'Centro']]} />
        </>
      )
    case 'imagem':
      return (
        <>
          <EnviarImagem rotulo="Imagem" id={o.imagem} max={1400} onErro={onErro} onChange={op('imagem')} />
          <Campo rotulo="Legenda">{inp('legenda', 120, '')}</Campo>
          <Seg rotulo="Formato" valor={o.formato} onChange={op('formato')} opcoes={[['largo', 'Largo'], ['quadrado', 'Quadrado'], ['original', 'Original']]} />
        </>
      )
    case 'contato':
      return (
        <>
          <Campo rotulo="Título">{inp('titulo', 60, 'Fale com a gente')}</Campo>
          <button type="button" className="ce-link" onClick={() => irPara('loja')}>WhatsApp, endereço e horário ficam na aba Loja →</button>
        </>
      )
    case 'rodape':
      return <Campo rotulo="Texto extra" dica="Ex.: CNPJ, formas de pagamento">{inp('texto', 160, 'Aceitamos Pix e cartão')}</Campo>
    default:
      return null
  }
}

/* ------------------------------ formulário de produto ------------------------------ */
function FormProduto({ inicial, categorias, onSalvar, onApagar, onFechar, onErro }) {
  const [p, setP] = useState(() => ({
    nome: '', descricao: '', categoria: '', imagem: null, destaque: false, estado: 'ativo', ...inicial,
    precoTxt: deCentavos(inicial?.preco), precoDeTxt: deCentavos(inicial?.preco_de),
  }))
  const [salvando, setSalvando] = useState(false)
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }))
  const salvar = async (e) => {
    e.preventDefault()
    if (!p.nome.trim()) return onErro('Dê um nome ao produto.')
    setSalvando(true)
    try {
      await onSalvar({
        nome: p.nome, descricao: p.descricao, categoria: p.categoria.trim(), imagem: p.imagem, destaque: p.destaque, estado: p.estado,
        preco: paraCentavos(p.precoTxt), preco_de: paraCentavos(p.precoDeTxt),
      })
    } catch (er) {
      onErro(er.message)
      setSalvando(false)
    }
  }
  return (
    <form className="ce-gaveta" onSubmit={salvar}>
      <div className="ce-gaveta-topo">
        <button type="button" className="ce-voltar" onClick={onFechar} aria-label="Voltar">←</button>
        <h3>{inicial?.id ? 'Editar produto' : 'Novo produto'}</h3>
      </div>
      <div className="ce-gaveta-corpo">
        <EnviarImagem rotulo="Foto" id={p.imagem} max={900} onErro={onErro} onChange={set('imagem')} />
        <Campo rotulo="Nome">
          <input value={p.nome} onChange={(e) => set('nome')(e.target.value)} maxLength={80} placeholder="Ex.: Bolo de pote de ninho" autoFocus />
        </Campo>
        <div className="ce-linha2">
          <Campo rotulo="Preço (R$)">
            <input value={p.precoTxt} onChange={(e) => set('precoTxt')(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </Campo>
          <Campo rotulo="Preço antigo" dica="Opcional (promoção)">
            <input value={p.precoDeTxt} onChange={(e) => set('precoDeTxt')(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </Campo>
        </div>
        <Campo rotulo="Categoria" dica="Ex.: Bolos, Camisetas, Promoção">
          <input value={p.categoria} onChange={(e) => set('categoria')(e.target.value)} maxLength={40} list="ce-cats" />
          <datalist id="ce-cats">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Campo>
        <Campo rotulo="Descrição">
          <textarea value={p.descricao} onChange={(e) => set('descricao')(e.target.value)} maxLength={600} rows={3} placeholder="Tamanho, sabores, material, prazo…" />
        </Campo>
        <Chave rotulo="⭐ Destaque (aparece no bloco Destaques)" valor={p.destaque} onChange={set('destaque')} />
        <Seg rotulo="Situação" valor={p.estado} onChange={set('estado')} opcoes={[['ativo', 'À venda'], ['esgotado', 'Esgotado'], ['oculto', 'Escondido']]} />
      </div>
      <div className="ce-gaveta-pe">
        {inicial?.id && (
          <button type="button" className="ce-btn ce-btn-perigo" onClick={onApagar}>
            Apagar
          </button>
        )}
        <button type="submit" className="ce-btn" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar produto'}
        </button>
      </div>
    </form>
  )
}

/* ------------------------------ compartilhar ------------------------------ */
function Compartilhar({ url, nome, onFechar }) {
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    import('qrcode').then(({ default: QR }) => QR.toDataURL(url, { width: 640, margin: 2 }).then(setQr))
  }, [url])
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const t = document.createElement('textarea')
      t.value = url
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }
  const texto = `Confira o catálogo da ${nome} e faça seu pedido pelo WhatsApp: ${url}`
  return (
    <div className="ce-modal" role="dialog" aria-modal="true" aria-label="Compartilhar catálogo" onClick={onFechar}>
      <div className="ce-modal-caixa" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ce-x" onClick={onFechar} aria-label="Fechar">✕</button>
        <h3>Compartilhe seu catálogo</h3>
        <p className="ce-muted">Mande no WhatsApp, cole na bio do Instagram ou imprima o QR Code no balcão.</p>
        <div className="ce-url">
          <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Link do catálogo" />
          <button type="button" className="ce-btn" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
        </div>
        <div className="ce-compartilhar">
          <a className="ce-btn ce-btn-zap" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
            Enviar no WhatsApp
          </a>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button type="button" className="ce-btn ce-btn-sec" onClick={() => navigator.share({ title: nome, text: texto, url }).catch(() => {})}>
              Mais opções…
            </button>
          )}
        </div>
        {qr && (
          <div className="ce-qr">
            <img src={qr} alt={`QR Code do catálogo ${nome}`} />
            <a className="ce-btn ce-btn-sec" href={qr} download={`qrcode-${nome}.png`}>Baixar QR Code</a>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ editor ------------------------------ */
function Editor({ inicial, onSair }) {
  const [loja, setLoja] = useState(inicial.loja)
  const [produtos, setProdutos] = useState(inicial.produtos)
  const [aba, setAba] = useState('pagina')
  const [sel, setSel] = useState(null)
  const [aberto, setAberto] = useState(null) // bloco expandido na lista
  const [addAberto, setAddAberto] = useState(false)
  const [produtoEd, setProdutoEd] = useState(null)
  const [dispositivo, setDispositivo] = useState('celular')
  const [vista, setVista] = useState('editar') // no celular: editar | previa
  const [salvo, setSalvo] = useState('salvo')
  const [toast, setToast] = useState(null)
  const [compartilhar, setCompartilhar] = useState(false)
  const timer = useRef(0)
  const pendente = useRef(null)

  const cfg = loja.config
  const blocos = cfg.blocos
  const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${loja.slug}` : `/c/${loja.slug}`
  const categorias = useMemo(() => [...new Set(produtos.map((p) => p.categoria).filter(Boolean))], [produtos])

  const avisar = useCallback((texto, tipo = 'ok') => {
    setToast({ texto, tipo, t: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.tipo === 'erro' ? 4500 : 2200)
    return () => clearTimeout(t)
  }, [toast])

  // salva sozinho ~1s depois da última mudança na página/dados da loja
  const enviar = useCallback(async () => {
    const dados = pendente.current
    if (!dados) return
    pendente.current = null
    setSalvo('salvando')
    try {
      await ct('/loja', { metodo: 'PATCH', corpo: dados })
      setSalvo(pendente.current ? 'salvando' : 'salvo')
    } catch (e) {
      setSalvo('erro')
      avisar(e.message, 'erro')
      if (e.status === 401) onSair()
    }
  }, [avisar, onSair])
  const agendar = useCallback(
    (l) => {
      pendente.current = { nome: l.nome, whatsapp: l.whatsapp, config: l.config }
      setSalvo('pendente')
      clearTimeout(timer.current)
      timer.current = setTimeout(enviar, 900)
    },
    [enviar],
  )
  useEffect(() => {
    const antes = (e) => {
      if (pendente.current) {
        enviar()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', antes)
    return () => window.removeEventListener('beforeunload', antes)
  }, [enviar])

  const mudarLoja = (fn) =>
    setLoja((l) => {
      const n = fn(l)
      agendar(n)
      return n
    })
  const setCfg = (parcial) => mudarLoja((l) => ({ ...l, config: { ...l.config, ...parcial } }))
  const setTema = (parcial) => setCfg({ tema: { ...cfg.tema, ...parcial } })
  const setBlocos = (fn) => mudarLoja((l) => ({ ...l, config: { ...l.config, blocos: typeof fn === 'function' ? fn(l.config.blocos) : fn } }))
  // durante o arraste só mexe no estado; salva ao soltar
  const setBlocosArraste = (lista) => setLoja((l) => ({ ...l, config: { ...l.config, blocos: lista } }))
  const fimArraste = useCallback((lista) => setLoja((l) => {
    const n = { ...l, config: { ...l.config, blocos: lista } }
    agendar(n)
    return n
  }), [agendar])

  const ordLista = useOrdenavel(blocos, setBlocosArraste, { onFim: fimArraste })
  const ordPrevia = useOrdenavel(blocos, setBlocosArraste, { onFim: fimArraste })

  const setProdutosArraste = (lista) => setProdutos(lista)
  const fimProdutos = useCallback(async (lista) => {
    try {
      await ct('/produtos/ordem', { metodo: 'POST', corpo: { ids: lista.map((p) => p.id) } })
    } catch (e) {
      avisar(e.message, 'erro')
    }
  }, [avisar])
  const ordProdutos = useOrdenavel(produtos, setProdutosArraste, { onFim: fimProdutos })

  const rolarPrevia = (id) =>
    requestAnimationFrame(() => document.querySelector(`.ce-tela [data-bid="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))

  const selecionar = (id, origem) => {
    setSel(id)
    setAberto(id)
    if (origem === 'previa') {
      setAba('pagina')
      requestAnimationFrame(() => document.querySelector(`.ce-blocos [data-lid="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    } else rolarPrevia(id)
  }

  const acaoBloco = (id, acao) => {
    if (acao === 'remover') {
      const b = blocos.find((x) => x.id === id)
      if (!confirm(`Remover o bloco “${BLOCOS[b?.tipo]?.nome}”?`)) return
      setBlocos((l) => l.filter((x) => x.id !== id))
      if (sel === id) setSel(null)
      return
    }
    setBlocos((l) => {
      const i = l.findIndex((x) => x.id === id)
      if (acao === 'subir') return moverItem(l, i, -1)
      if (acao === 'descer') return moverItem(l, i, 1)
      if (acao === 'visivel') return l.map((x) => (x.id === id ? { ...x, visivel: !x.visivel } : x))
      return l
    })
  }

  const adicionarBloco = (tipo) => {
    const b = novoBloco(tipo)
    setBlocos((l) => {
      const i = l.findIndex((x) => x.id === sel)
      const nova = [...l]
      nova.splice(i >= 0 ? i + 1 : l.findIndex((x) => x.tipo === 'rodape') >= 0 ? l.findIndex((x) => x.tipo === 'rodape') : l.length, 0, b)
      return nova
    })
    setAddAberto(false)
    setSel(b.id)
    setAberto(b.id)
    rolarPrevia(b.id)
  }

  const aplicarModelo = (m) => {
    if (!confirm(`Usar o modelo “${m.nome}”? O visual e a ordem dos blocos mudam. Seus produtos, logo e dados continuam.`)) return
    const novo = configDoModelo(m.id)
    setCfg({ modelo: novo.modelo, tema: novo.tema, blocos: novo.blocos })
    setSel(null)
    avisar(`Modelo ${m.nome} aplicado`)
  }

  const salvarProduto = async (dados) => {
    if (produtoEd?.id) {
      await ct(`/produtos/${produtoEd.id}`, { metodo: 'PATCH', corpo: dados })
      setProdutos((l) => l.map((p) => (p.id === produtoEd.id ? { ...p, ...dados } : p)))
      avisar('Produto salvo')
    } else {
      const r = await ct('/produtos', { metodo: 'POST', corpo: dados })
      setProdutos((l) => [...l, r.produto])
      avisar('Produto cadastrado')
    }
    setProdutoEd(null)
  }
  const apagarProduto = async () => {
    if (!confirm(`Apagar “${produtoEd.nome}”?`)) return
    try {
      await ct(`/produtos/${produtoEd.id}`, { metodo: 'DELETE' })
      setProdutos((l) => l.filter((p) => p.id !== produtoEd.id))
      setProdutoEd(null)
      avisar('Produto apagado')
    } catch (e) {
      avisar(e.message, 'erro')
    }
  }

  const irPara = (a) => setAba(a)
  const erro = (m) => avisar(m, 'erro')
  const statusTxt = { salvo: 'Tudo salvo', pendente: 'Alterações…', salvando: 'Salvando…', erro: 'Erro ao salvar' }[salvo]

  return (
    <div className={`ce ${classeFontes}`} data-vista={vista}>
      <header className="ce-topo">
        <a href="/" className="ce-home" title="Voltar ao site" aria-label="Voltar ao site">←</a>
        <div className="ce-marca">
          <span className="ce-marca-logo" aria-hidden="true">◆</span>
          <div>
            <b>{loja.nome}</b>
            <small data-status={salvo}>{statusTxt}</small>
          </div>
        </div>
        <div className="ce-topo-acoes">
          <a className="ce-btn ce-btn-sec ce-esconde-p" href={`/c/${loja.slug}`} target="_blank" rel="noopener">Abrir página ↗</a>
          <button type="button" className="ce-btn" onClick={() => setCompartilhar(true)}>Compartilhar</button>
        </div>
      </header>

      <div className="ce-corpo">
        <aside className="ce-lado">
          <nav className="ce-abas" role="tablist">
            {[
              ['pagina', '🧩', 'Página'],
              ['produtos', '🛍️', 'Produtos'],
              ['visual', '🎨', 'Visual'],
              ['loja', '🏪', 'Loja'],
              ['conta', '⚙️', 'Conta'],
            ].map(([id, ic, nome]) => (
              <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}>
                <span aria-hidden="true">{ic}</span>
                {nome}
              </button>
            ))}
          </nav>

          <div className="ce-painel">
            {aba === 'pagina' && (
              <>
                <section className="ce-sec">
                  <h4>Modelos prontos</h4>
                  <div className="ce-modelos">
                    {MODELOS.map((m) => (
                      <button key={m.id} type="button" className="ce-modelo" aria-pressed={cfg.modelo === m.id} onClick={() => aplicarModelo(m)} title={m.desc}>
                        <MiniModelo m={m} />
                        <span>{m.nome}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="ce-sec">
                  <div className="ce-sec-topo">
                    <h4>Blocos da página</h4>
                    <small className="ce-muted">Arraste ⠿ para mudar a ordem</small>
                  </div>
                  <ul className="ce-blocos">
                    {blocos.map((b, i) => (
                      <li key={b.id} ref={ordLista.ref(b.id)} {...ordLista.item(b.id)} data-lid={b.id} data-sel={sel === b.id || undefined} data-oculto={!b.visivel || undefined}>
                        <div className="ce-bloco-linha">
                          <button className="ce-alca" {...ordLista.alca(b.id)}>⠿</button>
                          <button type="button" className="ce-bloco-nome" onClick={() => (aberto === b.id ? setAberto(null) : selecionar(b.id))} aria-expanded={aberto === b.id}>
                            <span aria-hidden="true">{BLOCOS[b.tipo].icone}</span>
                            <span>
                              {BLOCOS[b.tipo].nome}
                              <small>{b.opcoes.titulo || b.opcoes.texto?.slice(0, 28) || BLOCOS[b.tipo].dica}</small>
                            </span>
                          </button>
                          <button type="button" className="ce-ic" onClick={() => acaoBloco(b.id, 'visivel')} aria-label={b.visivel ? 'Ocultar' : 'Mostrar'} title={b.visivel ? 'Ocultar' : 'Mostrar'}>
                            {b.visivel ? '👁' : '🚫'}
                          </button>
                          <span className="ce-setas">
                            <button type="button" className="ce-ic" onClick={() => acaoBloco(b.id, 'subir')} disabled={!i} aria-label="Subir">↑</button>
                            <button type="button" className="ce-ic" onClick={() => acaoBloco(b.id, 'descer')} disabled={i === blocos.length - 1} aria-label="Descer">↓</button>
                          </span>
                        </div>
                        {aberto === b.id && (
                          <div className="ce-bloco-opcoes">
                            <OpcoesBloco
                              b={b}
                              cfg={cfg}
                              setCfg={setCfg}
                              categorias={categorias}
                              onErro={erro}
                              irPara={irPara}
                              set={(opcoes) => setBlocos((l) => l.map((x) => (x.id === b.id ? { ...x, opcoes } : x)))}
                            />
                            <button type="button" className="ce-link ce-perigo" onClick={() => acaoBloco(b.id, 'remover')}>Remover bloco</button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {addAberto ? (
                    <div className="ce-add">
                      <div className="ce-sec-topo">
                        <h4>Adicionar bloco</h4>
                        <button type="button" className="ce-link" onClick={() => setAddAberto(false)}>Fechar</button>
                      </div>
                      <div className="ce-add-grade">
                        {Object.entries(BLOCOS).map(([tipo, d]) => (
                          <button key={tipo} type="button" onClick={() => adicionarBloco(tipo)}>
                            <span aria-hidden="true">{d.icone}</span>
                            <b>{d.nome}</b>
                            <small>{d.dica}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="ce-btn ce-btn-tracejado" onClick={() => setAddAberto(true)}>＋ Adicionar bloco</button>
                  )}
                </section>
              </>
            )}

            {aba === 'produtos' && (
              <section className="ce-sec">
                <div className="ce-sec-topo">
                  <h4>Produtos</h4>
                  <small className="ce-muted">{produtos.length} de {LIMITE} grátis</small>
                </div>
                <div className="ce-barra-limite"><span style={{ width: `${(produtos.length / LIMITE) * 100}%` }} /></div>
                <button type="button" className="ce-btn ce-btn-bloco" disabled={produtos.length >= LIMITE} onClick={() => setProdutoEd({})}>
                  ＋ Novo produto
                </button>
                {produtos.length >= LIMITE && <p className="ce-dica">Você chegou aos {LIMITE} produtos do plano grátis. Apague um para cadastrar outro.</p>}
                {!produtos.length && <p className="ce-vazio">Nenhum produto ainda. Cadastre o primeiro com foto, nome e preço.</p>}
                <ul className="ce-produtos">
                  {produtos.map((p) => (
                    <li key={p.id} ref={ordProdutos.ref(p.id)} {...ordProdutos.item(p.id)}>
                      <button className="ce-alca" {...ordProdutos.alca(p.id)}>⠿</button>
                      <button type="button" className="ce-produto" onClick={() => setProdutoEd(p)}>
                        {p.imagem ? <img src={imgUrl(p.imagem)} alt="" /> : <span className="ce-produto-sem">🛍️</span>}
                        <span className="ce-produto-txt">
                          <b>{p.nome}</b>
                          <small>
                            {p.preco ? reais(p.preco) : 'Sem preço'}
                            {p.categoria && ` · ${p.categoria}`}
                          </small>
                        </span>
                        <span className="ce-selos">
                          {p.destaque && <i title="Destaque">⭐</i>}
                          {p.estado === 'esgotado' && <i className="ce-selo">Esgotado</i>}
                          {p.estado === 'oculto' && <i className="ce-selo">Escondido</i>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {aba === 'visual' && (
              <section className="ce-sec">
                <div className="ce-campo">
                  <span className="ce-rotulo">Cor principal</span>
                  <div className="ce-cores">
                    {CORES.map((c) => (
                      <button key={c} type="button" style={{ background: c }} aria-pressed={cfg.tema.cor === c} aria-label={`Cor ${c}`} onClick={() => setTema({ cor: c })} />
                    ))}
                    <label className="ce-cor-livre" title="Outra cor">
                      <input type="color" value={cfg.tema.cor} onChange={(e) => setTema({ cor: e.target.value })} aria-label="Escolher outra cor" />
                      <span>🎨</span>
                    </label>
                  </div>
                </div>
                <div className="ce-campo">
                  <span className="ce-rotulo">Fundo</span>
                  <div className="ce-fundos">
                    {FUNDOS.map((f) => (
                      <button key={f.id} type="button" data-f={f.id} aria-pressed={cfg.tema.fundo === f.id} onClick={() => setTema({ fundo: f.id })}>
                        <span />
                        {f.nome}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ce-campo">
                  <span className="ce-rotulo">Fonte</span>
                  <div className="ce-fontes">
                    {FONTES.map((f) => (
                      <button key={f.id} type="button" data-fonte={f.id} aria-pressed={cfg.tema.fonte === f.id} onClick={() => setTema({ fonte: f.id })}>
                        <b>Aa</b>
                        <small>{f.nome}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <Seg rotulo="Cantos" valor={cfg.tema.cantos} onChange={(v) => setTema({ cantos: v })} opcoes={[['reto', 'Retos'], ['suave', 'Suaves'], ['redondo', 'Redondos']]} />
                <Seg rotulo="Cartões dos produtos" valor={cfg.tema.cartao} onChange={(v) => setTema({ cartao: v })} opcoes={[['sombra', 'Sombra'], ['borda', 'Borda'], ['plano', 'Plano']]} />
              </section>
            )}

            {aba === 'loja' && (
              <section className="ce-sec">
                <Campo rotulo="Nome da loja">
                  <input value={loja.nome} maxLength={60} onChange={(e) => mudarLoja((l) => ({ ...l, nome: e.target.value }))} />
                </Campo>
                <Campo rotulo="WhatsApp que recebe os pedidos" dica="Com DDD. Ex.: (11) 98888-7777">
                  <input value={mascaraTelefone(loja.whatsapp)} inputMode="tel" placeholder="(11) 98888-7777" onChange={(e) => mudarLoja((l) => ({ ...l, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 13) }))} />
                </Campo>
                {String(loja.whatsapp).length < 10 && <p className="ce-alerta">Sem WhatsApp o cliente não consegue enviar o pedido.</p>}
                <Campo rotulo="Descrição curta">
                  <textarea rows={2} maxLength={300} value={cfg.descricao} onChange={(e) => setCfg({ descricao: e.target.value })} placeholder="Ex.: Bolos caseiros por encomenda em Campinas" />
                </Campo>
                <div className="ce-linha2">
                  <EnviarImagem rotulo="Logo" id={cfg.logo} max={400} redondo onErro={erro} onChange={(id) => setCfg({ logo: id })} />
                  <EnviarImagem rotulo="Capa" id={cfg.capa} max={1600} onErro={erro} onChange={(id) => setCfg({ capa: id })} />
                </div>
                <Campo rotulo="Instagram">
                  <input value={cfg.instagram} maxLength={60} placeholder="@sualoja" onChange={(e) => setCfg({ instagram: e.target.value.replace(/^@/, '').trim() })} />
                </Campo>
                <Campo rotulo="Endereço" dica="Vira um link para o mapa">
                  <input value={cfg.endereco} maxLength={200} onChange={(e) => setCfg({ endereco: e.target.value })} />
                </Campo>
                <Campo rotulo="Horário de atendimento">
                  <input value={cfg.horario} maxLength={200} placeholder="Seg a sáb, 9h às 18h" onChange={(e) => setCfg({ horario: e.target.value })} />
                </Campo>
                <Campo rotulo="Entrega">
                  <input value={cfg.entrega} maxLength={200} placeholder="Entregamos no centro · taxa R$ 5" onChange={(e) => setCfg({ entrega: e.target.value })} />
                </Campo>
                <Campo rotulo="Pedido mínimo (R$)" dica="Deixe vazio para não ter">
                  <input defaultValue={deCentavos(cfg.pedidoMinimo)} inputMode="decimal" placeholder="0,00" onBlur={(e) => setCfg({ pedidoMinimo: paraCentavos(e.target.value) })} />
                </Campo>
              </section>
            )}

            {aba === 'conta' && <Conta loja={loja} produtos={produtos} url={url} onSair={onSair} avisar={avisar} />}
          </div>

          {produtoEd && (
            <FormProduto
              key={produtoEd.id || 'novo'}
              inicial={produtoEd}
              categorias={categorias}
              onSalvar={salvarProduto}
              onApagar={apagarProduto}
              onFechar={() => setProdutoEd(null)}
              onErro={erro}
            />
          )}
        </aside>

        <main className="ce-previa">
          <div className="ce-previa-topo">
            <div className="ce-seg ce-seg-p" role="radiogroup" aria-label="Tamanho da prévia">
              <button type="button" role="radio" aria-checked={dispositivo === 'celular'} onClick={() => setDispositivo('celular')}>📱 Celular</button>
              <button type="button" role="radio" aria-checked={dispositivo === 'pc'} onClick={() => setDispositivo('pc')}>🖥️ Computador</button>
            </div>
            <small className="ce-muted ce-esconde-p">Clique num bloco para editar · arraste ⠿ para mover</small>
          </div>
          <div className="ce-aparelho" data-modo={dispositivo}>
            <div className="ce-tela">
              <Vitrine
                loja={loja}
                produtos={produtos}
                urlPublica={url}
                edicao={{ selecionado: sel, onSelecionar: (id) => selecionar(id, 'previa'), ord: ordPrevia, onAcao: acaoBloco }}
              />
            </div>
          </div>
        </main>
      </div>

      <nav className="ce-alterna" aria-label="Alternar entre editar e ver a prévia">
        <button type="button" aria-pressed={vista === 'editar'} onClick={() => setVista('editar')}>✏️ Editar</button>
        <button type="button" aria-pressed={vista === 'previa'} onClick={() => setVista('previa')}>👀 Prévia</button>
      </nav>

      {compartilhar && <Compartilhar url={url} nome={loja.nome} onFechar={() => setCompartilhar(false)} />}
      {toast && (
        <div key={toast.t} className="ce-toast" data-tipo={toast.tipo} role="status">
          {toast.texto}
        </div>
      )}
    </div>
  )
}

function Conta({ loja, produtos, url, onSair, avisar }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const trocar = async (e) => {
    e.preventDefault()
    try {
      await ct('/senha', { metodo: 'POST', corpo: { atual, nova } })
      setAtual('')
      setNova('')
      avisar('Senha trocada')
    } catch (er) {
      avisar(er.message, 'erro')
    }
  }
  const excluir = async () => {
    const senha = prompt('Isso apaga a loja, os produtos e as imagens para sempre. Digite sua senha para confirmar:')
    if (!senha) return
    try {
      await ct('/conta', { metodo: 'DELETE', corpo: { senha } })
      onSair(true)
    } catch (er) {
      avisar(er.message, 'erro')
    }
  }
  return (
    <section className="ce-sec">
      <div className="ce-numeros">
        <div><b>{loja.visitas ?? 0}</b><small>visitas</small></div>
        <div><b>{loja.pedidos ?? 0}</b><small>pedidos enviados</small></div>
        <div><b>{produtos.length}/{LIMITE}</b><small>produtos</small></div>
      </div>
      <Campo rotulo="Seu link">
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
      </Campo>
      <p className="ce-dica">Para entrar de novo use o link da loja (<b>{loja.slug}</b>) e a sua senha.</p>
      <form onSubmit={trocar} className="ce-form-senha">
        <h4>Trocar senha</h4>
        <Campo rotulo="Senha atual"><input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" /></Campo>
        <Campo rotulo="Nova senha"><input type="password" value={nova} onChange={(e) => setNova(e.target.value)} minLength={6} autoComplete="new-password" /></Campo>
        <button type="submit" className="ce-btn ce-btn-sec" disabled={!atual || nova.length < 6}>Trocar senha</button>
      </form>
      <div className="ce-conta-acoes">
        <button type="button" className="ce-btn ce-btn-sec" onClick={() => onSair()}>Sair</button>
        <button type="button" className="ce-link ce-perigo" onClick={excluir}>Excluir minha loja</button>
      </div>
    </section>
  )
}

/* ------------------------------ entrada (landing + cadastro + login) ------------------------------ */
function Entrada({ onEntrou }) {
  const [modo, setModo] = useState('criar')
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [whats, setWhats] = useState('')
  const [senha, setSenha] = useState('')
  const [modelo, setModelo] = useState('vitrine')
  const [exemplos, setExemplos] = useState(true)
  const [disp, setDisp] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loginSlug, setLoginSlug] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const linkFinal = slugManual ? slug : slugDe(nome)

  useEffect(() => {
    if (linkFinal.length < 3) return setDisp(null)
    const t = setTimeout(() => {
      ct(`/disponivel/${encodeURIComponent(linkFinal)}`).then(setDisp).catch(() => setDisp(null))
    }, 350)
    return () => clearTimeout(t)
  }, [linkFinal])

  const criar = async (e) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const config = configDoModelo(modelo)
      const r = await ct('/cadastro', { metodo: 'POST', corpo: { slug: linkFinal, nome: nome.trim(), whatsapp: whats, senha, config } })
      setToken(r.token)
      if (exemplos) for (const p of PRODUTOS_EXEMPLO) await ct('/produtos', { metodo: 'POST', corpo: p }).catch(() => {})
      onEntrou()
    } catch (er) {
      setErro(er.message)
      setEnviando(false)
    }
  }
  const entrar = async (e) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const r = await ct('/login', { metodo: 'POST', corpo: { slug: loginSlug.trim().toLowerCase(), senha: loginSenha } })
      setToken(r.token)
      onEntrou()
    } catch (er) {
      setErro(er.message)
      setEnviando(false)
    }
  }

  return (
    <div className={`cl ${classeFontes}`}>
      <a href="/" className="cl-home" aria-label="Voltar ao site">← soudev</a>
      <section className="cl-hero">
        <div className="cl-hero-txt">
          <span className="cl-selo">100% grátis · até {LIMITE} produtos</span>
          <h1>Seu catálogo no WhatsApp, pronto em 5 minutos.</h1>
          <p>Cadastre produtos com foto e preço, monte a página arrastando os blocos e compartilhe o link. O cliente escolhe, monta o pedido e envia direto no seu WhatsApp.</p>
          <ul className="cl-pontos">
            <li>🧩 Arraste e solte: logo, capa, destaques, vitrine, contato</li>
            <li>🎨 6 modelos prontos ou monte do zero</li>
            <li>💬 Pedido chega pronto no WhatsApp, com itens e total</li>
            <li>📱 Link e QR Code para Instagram, status e balcão</li>
          </ul>
          <a href="#criar" className="ce-btn ce-btn-g cl-cta">Criar meu catálogo grátis</a>
        </div>
        <div className="cl-celular" aria-hidden="true">
          <div className="cl-celular-tela">
            <div className="cl-demo-cab"><span>DA</span><b>Doces da Ana</b></div>
            <div className="cl-demo-capa">Doces que abraçam</div>
            <div className="cl-demo-grade">
              {['Brigadeiro', 'Bolo de pote', 'Brownie', 'Cookie'].map((n, i) => (
                <div key={n} className="cl-demo-card"><i style={{ background: ['#ffd1dc', '#ffe6b3', '#d9c2a6', '#f3d9b1'][i] }} /><b>{n}</b><small>R$ {[3.5, 12, 9, 6][i].toFixed(2).replace('.', ',')}</small></div>
              ))}
            </div>
            <div className="cl-demo-zap">💬 Enviar pedido · R$ 24,50</div>
          </div>
        </div>
      </section>

      <section className="cl-form-area" id="criar">
        <div className="cl-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={modo === 'criar'} onClick={() => { setModo('criar'); setErro('') }}>Criar meu catálogo</button>
          <button type="button" role="tab" aria-selected={modo === 'entrar'} onClick={() => { setModo('entrar'); setErro('') }}>Já tenho</button>
        </div>
        {modo === 'criar' ? (
          <form className="cl-form" onSubmit={criar}>
            <Campo rotulo="Nome da loja">
              <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Ex.: Doces da Ana" required />
            </Campo>
            <Campo rotulo="Seu link" dica={disp ? (disp.disponivel ? '✓ Disponível' : `✗ ${disp.motivo || 'Já está em uso'}`) : 'Letras, números e hífen'}>
              <div className="cl-link">
                <span>/c/</span>
                <input value={linkFinal} onChange={(e) => { setSlugManual(true); setSlug(slugDe(e.target.value) + (e.target.value.endsWith('-') ? '-' : '')) }} maxLength={30} placeholder="doces-da-ana" required data-ok={disp ? String(disp.disponivel) : undefined} />
              </div>
            </Campo>
            <Campo rotulo="WhatsApp que recebe os pedidos">
              <input value={mascaraTelefone(whats)} onChange={(e) => setWhats(e.target.value.replace(/\D/g, '').slice(0, 13))} inputMode="tel" placeholder="(11) 98888-7777" required />
            </Campo>
            <Campo rotulo="Crie uma senha" dica="Mínimo 6 caracteres. Você entra com o link + senha.">
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} autoComplete="new-password" required />
            </Campo>
            <div className="ce-campo">
              <span className="ce-rotulo">Comece com um modelo (dá para trocar e mexer em tudo depois)</span>
              <div className="ce-modelos cl-modelos">
                {MODELOS.map((m) => (
                  <button key={m.id} type="button" className="ce-modelo" aria-pressed={modelo === m.id} onClick={() => setModelo(m.id)}>
                    <MiniModelo m={m} />
                    <span>{m.nome}</span>
                    <small>{m.desc}</small>
                  </button>
                ))}
              </div>
            </div>
            <Chave rotulo="Já colocar 3 produtos de exemplo" valor={exemplos} onChange={setExemplos} />
            {erro && <p className="ce-alerta" role="alert">{erro}</p>}
            <button type="submit" className="ce-btn ce-btn-bloco ce-btn-g" disabled={enviando || disp?.disponivel === false}>
              {enviando ? 'Criando…' : 'Criar catálogo grátis'}
            </button>
          </form>
        ) : (
          <form className="cl-form" onSubmit={entrar}>
            <Campo rotulo="Link da loja" dica="O que vem depois de /c/ (pode colar o link inteiro)">
              <input value={loginSlug} onChange={(e) => setLoginSlug(e.target.value)} placeholder="doces-da-ana" autoComplete="username" required />
            </Campo>
            <Campo rotulo="Senha">
              <input type="password" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} autoComplete="current-password" required />
            </Campo>
            {erro && <p className="ce-alerta" role="alert">{erro}</p>}
            <button type="submit" className="ce-btn ce-btn-bloco ce-btn-g" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          </form>
        )}
      </section>

      <section className="cl-faq">
        <h2>Perguntas rápidas</h2>
        <details><summary>É grátis mesmo?</summary><p>Sim. Até {LIMITE} produtos, sem mensalidade, sem taxa por pedido e sem anúncio na sua página.</p></details>
        <details><summary>Como o pedido chega?</summary><p>O cliente monta o carrinho e toca em “Enviar pedido pelo WhatsApp”. Abre uma conversa com você já com a lista de itens, quantidades, total, nome e observação.</p></details>
        <details><summary>Preciso de e-mail?</summary><p>Não. Você entra só com o link da loja e a senha. Guarde bem a senha.</p></details>
        <details><summary>Dá para mudar o visual depois?</summary><p>Tudo: modelo, cores, fonte, ordem dos blocos (arrastando), logo, capa e textos. A página atualiza na hora para quem abrir o link.</p></details>
      </section>
    </div>
  )
}

/* ------------------------------ raiz ------------------------------ */
export default function Catalogo() {
  const [dados, setDados] = useState(undefined) // undefined = carregando, null = deslogado

  const carregar = useCallback(async () => {
    if (!getToken()) return setDados(null)
    try {
      setDados(await ct('/eu'))
    } catch (e) {
      if (e.status === 401) setToken('')
      setDados(null)
    }
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  const sair = useCallback(async (jaApagou) => {
    if (!jaApagou) await ct('/sair', { metodo: 'POST' }).catch(() => {})
    setToken('')
    setDados(null)
  }, [])

  if (!temBackend())
    return (
      <div className="cl">
        <p className="ce-alerta" style={{ margin: 40 }}>O catálogo precisa da variável <code>NEXT_PUBLIC_IDEIAS_API</code> configurada.</p>
      </div>
    )
  if (dados === undefined)
    return (
      <div className="cl cl-carregando">
        <span className="ce-girando" aria-label="Carregando" />
      </div>
    )
  if (!dados) return <Entrada onEntrou={carregar} />
  return <Editor inicial={dados} onSair={sair} />
}
