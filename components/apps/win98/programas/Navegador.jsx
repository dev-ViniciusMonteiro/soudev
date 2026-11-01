'use client'

// Internet Explorer: navega pelas páginas do próprio soudev (dentro de um iframe) com Voltar, Avançar, Parar,
// Atualizar e Página inicial. Sites de fora não abrem em iframe, então aparece a página de erro do IE.

import { useEffect, useRef, useState } from 'react'
import Icone from '../icones'
import { MenuBarra } from '../Menu'
import { useJanela, useSistema } from '../sistema'

const INICIAL = '/'

/** Converte o que foi digitado num endereço do próprio site, ou null se for de fora. */
export function enderecoInterno(texto, origem) {
  const t = String(texto || '').trim()
  if (!t) return INICIAL
  if (t.startsWith('/')) return t
  let url
  try {
    url = new URL(/^[a-z]+:\/\//i.test(t) ? t : `http://${t}`)
  } catch {
    return null
  }
  const doSite = url.origin === origem || /(^|\.)soudev\.com\.br$/i.test(url.hostname)
  return doSite ? url.pathname + url.search + url.hash : null
}

const Botao = ({ rotulo, d, cor, onClick, disabled }) => (
  <button type="button" className="w98-ferramenta" onClick={onClick} disabled={disabled} data-acao={rotulo}>
    <svg width="20" height="20" viewBox="0 0 20 20" shapeRendering="crispEdges">
      <path d={d} fill={cor} stroke="#000" />
    </svg>
    {rotulo}
  </button>
)

export default function Navegador({ url }) {
  const sis = useSistema()
  const jan = useJanela()
  const quadro = useRef(null)
  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const primeiro = enderecoInterno(url || INICIAL, origem)
  const [hist, setHist] = useState({ lista: [primeiro ? { tipo: 'site', caminho: primeiro } : { tipo: 'erro', url }], i: 0 })
  const atual = hist.lista[hist.i]
  const [endereco, setEndereco] = useState('')
  const [carregando, setCarregando] = useState(atual.tipo === 'site')
  const [tituloPagina, setTituloPagina] = useState('')
  const navegandoPeloHistorico = useRef(false)

  useEffect(() => {
    setEndereco(atual.tipo === 'site' ? origem + atual.caminho : atual.url)
    if (atual.tipo === 'erro') {
      setTituloPagina('Não é possível exibir a página')
      setCarregando(false)
    }
  }, [atual, origem])

  useEffect(() => {
    jan.definirTitulo(`${tituloPagina || 'Página em branco'} - Internet Explorer`)
  }, [tituloPagina, jan])

  const navegar = (texto) => {
    const interno = enderecoInterno(texto, origem)
    const item = interno ? { tipo: 'site', caminho: interno } : { tipo: 'erro', url: /^[a-z]+:\/\//i.test(texto) ? texto : `http://${texto}/` }
    setHist((h) => ({ lista: [...h.lista.slice(0, h.i + 1), item], i: h.i + 1 }))
    if (interno) setCarregando(true)
  }

  // Ao terminar de carregar, lê o endereço e o título da página (mesma origem) e registra cliques em links.
  const carregou = () => {
    setCarregando(false)
    try {
      const w = quadro.current.contentWindow
      const caminho = w.location.pathname + w.location.search + w.location.hash
      setTituloPagina(w.document.title || caminho)
      setEndereco(origem + caminho)
      if (navegandoPeloHistorico.current) {
        navegandoPeloHistorico.current = false
        return
      }
      if (caminho !== atual.caminho) setHist((h) => ({ lista: [...h.lista.slice(0, h.i + 1), { tipo: 'site', caminho }], i: h.i + 1 }))
    } catch {
      setTituloPagina('soudev')
    }
  }

  const irPara = (i) => {
    navegandoPeloHistorico.current = true
    setHist((h) => ({ ...h, i }))
    if (hist.lista[i]?.tipo === 'site') setCarregando(true)
  }

  const parar = () => {
    try {
      quadro.current?.contentWindow?.stop()
    } catch {
      /* nada a parar */
    }
    setCarregando(false)
  }

  const atualizar = () => {
    if (atual.tipo !== 'site') return
    setCarregando(true)
    try {
      quadro.current.contentWindow.location.reload()
    } catch {
      /* ignora */
    }
  }

  const menus = [
    {
      rotulo: '&Arquivo',
      itens: [
        { rotulo: '&Nova janela', atalho: 'Ctrl+N', acao: () => sis.abrir('ie') },
        { rotulo: '&Abrir...', atalho: 'Ctrl+O', acao: async () => { const t = await sis.pedirTexto({ titulo: 'Abrir', texto: 'Digite o endereço Internet de um documento ou pasta, e o Internet Explorer o abrirá para você.', rotulo: '&Abrir:', valor: '' }); if (t) navegar(t) } },
        { sep: true },
        { rotulo: '&Fechar', acao: () => jan.fechar() },
      ],
    },
    { rotulo: '&Editar', itens: [{ rotulo: 'Selecionar &tudo', atalho: 'Ctrl+A', desabilitado: true }] },
    { rotulo: '&Exibir', itens: [{ rotulo: '&Atualizar', atalho: 'F5', acao: atualizar }, { rotulo: '&Parar', atalho: 'Esc', acao: parar }] },
    { rotulo: '&Favoritos', itens: [{ rotulo: 'soudev', icone: 'internet', acao: () => navegar('/') }, { rotulo: 'Ferramentas', icone: 'internet', acao: () => navegar('/ferramentas') }, { rotulo: 'Jogos', icone: 'internet', acao: () => navegar('/jogos') }, { rotulo: 'Apps', icone: 'internet', acao: () => navegar('/apps') }] },
    { rotulo: 'Aj&uda', itens: [{ rotulo: '&Sobre o Internet Explorer', acao: () => sis.abrir('sobre', { programa: 'Internet Explorer', icone: 'internet' }) }] },
  ]

  return (
    <div className="w98-ie" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <MenuBarra menus={menus} />
        <span className={`w98-ie-girar ${carregando ? 'carregando' : ''}`} style={{ height: 22, width: 30 }} aria-hidden="true">
          <Icone nome="internet" tamanho={16} />
        </span>
      </div>
      <div className="w98-barra-ferramentas">
        <span className="w98-separador-barra alca" />
        <Botao rotulo="Voltar" d="M2 10l7-7v4h9v6H9v4z" cor="#00a000" disabled={hist.i === 0} onClick={() => irPara(hist.i - 1)} />
        <Botao rotulo="Avançar" d="M18 10l-7-7v4H2v6h9v4z" cor="#00a000" disabled={hist.i >= hist.lista.length - 1} onClick={() => irPara(hist.i + 1)} />
        <Botao rotulo="Parar" d="M6 2h8l4 4v8l-4 4H6l-4-4V6z" cor="#e00000" onClick={parar} />
        <Botao rotulo="Atualizar" d="M10 3a7 7 0 1 0 7 7h-3a4 4 0 1 1-4-4v3l5-4.5L10 0z" cor="#00a000" onClick={atualizar} />
        <Botao rotulo="Página inicial" d="M10 2l8 7h-2v9h-4v-5H8v5H4V9H2z" cor="#ffd700" onClick={() => navegar(INICIAL)} />
      </div>
      <form
        className="w98-endereco"
        onSubmit={(e) => {
          e.preventDefault()
          navegar(endereco)
        }}
      >
        <span className="w98-separador-barra alca" />
        <span>
          En<u>d</u>ereço
        </span>
        <span className="w98-campo">
          <Icone nome="internet" tamanho={16} />
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} aria-label="Endereço" data-testid="w98-ie-endereco" />
        </span>
        <button type="submit" className="w98-ferramenta pequena">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 6h7V3l3 3-3 3V6" fill="#00a000" stroke="#000" />
          </svg>
          Ir
        </button>
      </form>
      <div className="w98-ie-quadro">
        {atual.tipo === 'site' ? (
          <iframe ref={quadro} key={hist.i + atual.caminho} src={atual.caminho} title="Página" onLoad={carregou} data-testid="w98-ie-quadro" />
        ) : (
          <div className="w98-ie-erro" data-testid="w98-ie-erro">
            <h1>
              <Icone nome="info" />
              Não é possível exibir a página
            </h1>
            <p>A página que você procura não está disponível. O site pode estar com problemas técnicos ou talvez seja preciso ajustar as configurações do navegador.</p>
            <hr />
            <p>Tente o seguinte:</p>
            <ul>
              <li>
                Clique no botão <a onClick={() => irPara(hist.i)}>Atualizar</a> ou tente novamente mais tarde.
              </li>
              <li>Se você digitou o endereço da página na barra de endereços, verifique se está escrito corretamente.</li>
              <li>
                Esta recriação só abre páginas do <a onClick={() => navegar(INICIAL)}>soudev</a>: outros sites não permitem ser exibidos dentro de outra página.
              </li>
            </ul>
            <hr />
            <p style={{ color: '#808080' }}>Não é possível localizar o servidor ou erro de DNS · {atual.url}</p>
          </div>
        )}
      </div>
      <div className="w98-status">
        <div>
          {carregando ? (
            <>
              <Icone nome="internet" tamanho={16} /> Abrindo página {endereco}...
            </>
          ) : (
            <>
              <Icone nome="internet" tamanho={16} /> Concluído
            </>
          )}
        </div>
        <div style={{ width: 120 }}>
          <Icone nome="internet" tamanho={16} />
          Internet
        </div>
      </div>
    </div>
  )
}
