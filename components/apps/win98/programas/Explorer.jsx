'use client'

// Windows Explorer: Meu computador, pastas do disco C:, Painel de controle e Lixeira, com a "visualização como
// página da Web" do 98 (painel à esquerda), barra de botões, endereço, ícones grandes/lista/detalhes e barra de status.

import { useEffect, useRef, useState } from 'react'
import Icone, { iconeDoArquivo } from '../icones'
import { MenuBarra, MenuSuspenso } from '../Menu'
import { dataCurta, horaCurta, useJanela, useSistema } from '../sistema'
import { caminhoReal, juntar, listar, pai, partes, tamanhoBytes, tamanhoKB, tipoDeArquivo } from '@/lib/win98/arquivos'

const VIRTUAIS = {
  'meu-computador': { titulo: 'Meu computador', icone: 'computador', descricao: 'Exibe o conteúdo do computador. Selecione um item para ver sua descrição.' },
  painel: { titulo: 'Painel de controle', icone: 'painel', descricao: 'Use as configurações do Painel de controle para personalizar o computador.' },
  lixeira: { titulo: 'Lixeira', icone: 'lixeira', descricao: 'Contém os arquivos e pastas que você excluiu.' },
}

const ZONA = { 'meu-computador': 'Meu computador', painel: 'Meu computador', lixeira: 'Meu computador' }

/** Título da janela para um local. */
export function tituloDoLocal(local) {
  if (VIRTUAIS[local]) return VIRTUAIS[local].titulo
  const ps = partes(local)
  return ps.length ? ps.at(-1) : '(C:)'
}

export function iconeDoLocal(local) {
  if (VIRTUAIS[local]) return VIRTUAIS[local].icone
  if (partes(local).length === 0) return 'disco'
  if (/meus documentos$/i.test(local)) return 'documentos'
  return 'pastaAberta'
}

const Seta = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" shapeRendering="crispEdges">
    {dir === 'cima' ? (
      <>
        <path d="M3 8h6V4h1v4h7v9H3z" fill="#ffd700" stroke="#808000" />
        <path d="M10 1l5 5h-3v6H8V6H5z" fill="#00a000" stroke="#000" />
      </>
    ) : (
      <path d={dir === 'esq' ? 'M2 10l7-7v4h9v6H9v4z' : 'M18 10l-7-7v4H2v6h9v4z'} fill={dir === 'esq' ? '#00a000' : '#00a000'} stroke="#000" />
    )}
  </svg>
)

const Glifo = ({ d, cor = '#000' }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" shapeRendering="crispEdges">
    <path d={d} fill={cor} stroke="#000" />
  </svg>
)

export default function Explorer({ local: localInicial = 'meu-computador' }) {
  const sis = useSistema()
  const jan = useJanela()
  const [hist, setHist] = useState({ lista: [localInicial], i: 0 })
  const local = hist.lista[hist.i]
  const [sel, setSel] = useState([])
  const [renomeando, setRenomeando] = useState(null)
  const [menu, setMenu] = useState(null)
  const [endereco, setEndereco] = useState('')
  const [largura, setLargura] = useState(600)
  const corpo = useRef(null)
  const exibicao = sis.config.exibicao || 'icones'
  const virtual = VIRTUAIS[local]
  const pasta = !virtual

  useEffect(() => {
    jan.definirTitulo(tituloDoLocal(local))
    jan.definirIcone(iconeDoLocal(local))
    setEndereco(virtual ? virtual.titulo : local)
    setSel([])
  }, [local]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = corpo.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ir = (novo) => {
    const destino = VIRTUAIS[novo] ? novo : caminhoReal(sis.disco, novo)
    if (!destino) {
      sis.msg({ titulo: tituloDoLocal(local), texto: `Não é possível encontrar '${novo}'. Verifique a ortografia e tente novamente.`, icone: 'erro' })
      setEndereco(virtual ? virtual.titulo : local)
      return
    }
    if (destino === local) return
    setHist((h) => ({ lista: [...h.lista.slice(0, h.i + 1), destino], i: h.i + 1 }))
  }

  const acima = () => {
    if (virtual) {
      if (local !== 'meu-computador') ir('meu-computador')
      return
    }
    if (partes(local).length === 0) ir('meu-computador')
    else ir(pai(local))
  }

  // ---------- itens do local ----------
  let itens = []
  if (local === 'meu-computador') {
    itens = [
      { nome: 'Disquete de 3½ (A:)', icone: 'disquete', tipo: 'Disquete de 3½ polegadas', abrir: () => sis.msg({ titulo: 'Disquete de 3½ (A:)', texto: 'A:\\ não está acessível.\n\nO dispositivo não está pronto.', icone: 'erro', botoes: ['&Repetir', 'Cancelar'] }) },
      { nome: '(C:)', icone: 'disco', tipo: 'Disco local', abrir: () => ir('C:\\'), info: 'Capacidade: 2,00 GB\nEspaço livre: 1,99 GB' },
      { nome: '(D:)', icone: 'cdrom', tipo: 'Disco compacto', abrir: () => sis.msg({ titulo: '(D:)', texto: 'D:\\ não está acessível.\n\nO dispositivo não está pronto.', icone: 'erro', botoes: ['&Repetir', 'Cancelar'] }) },
      { nome: 'Painel de controle', icone: 'painel', tipo: 'Pasta do sistema', abrir: () => ir('painel') },
      { nome: 'Impressoras', icone: 'pasta', tipo: 'Pasta do sistema', abrir: () => sis.msg({ titulo: 'Impressoras', texto: 'Nenhuma impressora está instalada.\n\nNão dá para imprimir de dentro do navegador nesta recriação.', icone: 'info' }) },
    ]
  } else if (local === 'painel') {
    const indisponivel = (n) => () => sis.msg({ titulo: n, texto: `${n} não está disponível nesta recriação.`, icone: 'info' })
    itens = [
      { nome: 'Data/hora', icone: 'relogio', tipo: 'Altera a data, a hora e o fuso horário', abrir: () => sis.abrir('datahora') },
      { nome: 'Sistema', icone: 'computador', tipo: 'Mostra informações do sistema', abrir: () => sis.abrir('sistema') },
      { nome: 'Vídeo', icone: 'video', tipo: 'Altera a aparência da área de trabalho', abrir: () => sis.abrir('video') },
      { nome: 'Adicionar ou remover programas', icone: 'aplicativo', tipo: 'Instala e remove programas', abrir: indisponivel('Adicionar ou remover programas') },
      { nome: 'Mouse', icone: 'aplicativo', tipo: 'Altera as configurações do mouse', abrir: indisponivel('Mouse') },
      { nome: 'Sons', icone: 'alto', tipo: 'Altera os sons do sistema', abrir: indisponivel('Sons') },
    ]
  } else if (local === 'lixeira') {
    itens = sis.disco.lixeira.map((x) => ({ nome: x.nome, id: x.id, icone: iconeDoArquivo(x.nome, x.no.tipo), tipo: tipoDeArquivo(x.nome, x.no.tipo), origem: x.origem, excluido: x.excluido, bytes: x.no.tipo === 'arquivo' ? tamanhoBytes(x.no) : 0 }))
  } else {
    itens = (listar(sis.disco, local) || []).map((i) => ({ ...i, icone: iconeDoArquivo(i.nome, i.tipo), tipoTexto: tipoDeArquivo(i.nome, i.tipo), caminho: juntar(local, i.nome) }))
  }

  const abrirItem = (it) => {
    if (it.abrir) return it.abrir()
    if (local === 'lixeira') return sis.abrir('propriedadesLixeira', { item: it })
    if (it.tipo === 'pasta') return ir(it.caminho)
    sis.abrirArquivo(it.caminho)
  }

  const selecionados = itens.filter((i) => sel.includes(i.nome))
  const caminhosSel = pasta ? selecionados.map((i) => i.caminho) : []

  const excluirSel = async () => {
    if (local === 'lixeira') {
      if (!selecionados.length) return
      const r = await sis.msg({ titulo: 'Confirmar exclusão de arquivo', texto: selecionados.length === 1 ? `Tem certeza de que deseja excluir '${selecionados[0].nome}'?` : `Tem certeza de que deseja excluir estes ${selecionados.length} itens?`, icone: 'aviso', botoes: ['&Sim', '&Não'] })
      if (r !== '&Sim') return
      sis.mudarDisco((d) => ({ ...d, lixeira: d.lixeira.filter((x) => !selecionados.some((s) => s.id === x.id)) }))
      setSel([])
      return
    }
    if (!caminhosSel.length) return
    if (await sis.excluirComConfirmacao(caminhosSel)) setSel([])
  }

  const restaurarSel = () => {
    for (const s of selecionados) sis.restaurarDaLixeira(s.id)
    setSel([])
  }

  const novo = (tipo) => {
    const nome = sis.novoItem(local, tipo)
    if (nome) {
      setSel([nome])
      setRenomeando(nome)
    }
  }

  const propriedades = () => {
    if (local === 'meu-computador' && (!selecionados.length || selecionados[0].nome === '(C:)')) return sis.abrir(selecionados.length ? 'propriedades' : 'sistema', { caminho: 'C:\\' })
    if (pasta) sis.abrir('propriedades', { caminho: caminhosSel[0] || local })
  }

  const exibir = (e) => sis.mudarConfig((c) => ({ ...c, exibicao: e }))
  const proximaExibicao = () => exibir(exibicao === 'icones' ? 'lista' : exibicao === 'lista' ? 'detalhes' : 'icones')

  const teclas = (e) => {
    if (renomeando) return
    if (e.key === 'Delete') excluirSel()
    else if (e.key === 'F2' && pasta && sel.length === 1) setRenomeando(sel[0])
    else if (e.key === 'Enter' && selecionados[0]) abrirItem(selecionados[0])
    else if (e.key === 'Backspace') acima()
    else if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      setSel(itens.map((i) => i.nome))
    }
  }

  const menus = [
    {
      rotulo: '&Arquivo',
      itens: [
        ...(pasta ? [{ rotulo: '&Novo', sub: [{ rotulo: '&Pasta', icone: 'pasta', acao: () => novo('pasta') }, { sep: true }, { rotulo: '&Documento de texto', icone: 'texto', acao: () => novo('texto') }, { rotulo: '&Imagem de bitmap', icone: 'imagem', acao: () => novo('imagem') }] }, { sep: true }] : []),
        ...(local === 'lixeira' ? [{ rotulo: '&Restaurar', desabilitado: !sel.length, acao: restaurarSel }, { rotulo: 'Esvaziar &Lixeira', desabilitado: !itens.length, acao: () => sis.esvaziarLixeira() }, { sep: true }] : []),
        { rotulo: '&Excluir', desabilitado: !sel.length || (virtual && local !== 'lixeira'), acao: excluirSel },
        { rotulo: '&Renomear', desabilitado: !pasta || sel.length !== 1, acao: () => setRenomeando(sel[0]) },
        { rotulo: 'P&ropriedades', acao: propriedades, desabilitado: local === 'painel' || local === 'lixeira' },
        { sep: true },
        { rotulo: '&Fechar', acao: () => jan.fechar() },
      ],
    },
    {
      rotulo: '&Editar',
      itens: [
        { rotulo: '&Desfazer', atalho: 'Ctrl+Z', desabilitado: true },
        { sep: true },
        { rotulo: 'Recor&tar', atalho: 'Ctrl+X', desabilitado: true },
        { rotulo: '&Copiar', atalho: 'Ctrl+C', desabilitado: true },
        { rotulo: 'C&olar', atalho: 'Ctrl+V', desabilitado: true },
        { sep: true },
        { rotulo: 'Selecionar &tudo', atalho: 'Ctrl+A', acao: () => setSel(itens.map((i) => i.nome)) },
        { rotulo: '&Inverter seleção', acao: () => setSel(itens.filter((i) => !sel.includes(i.nome)).map((i) => i.nome)) },
      ],
    },
    {
      rotulo: '&Exibir',
      itens: [
        { rotulo: 'Ícones &grandes', marcado: exibicao === 'icones' ? 'ponto' : false, acao: () => exibir('icones') },
        { rotulo: '&Lista', marcado: exibicao === 'lista' ? 'ponto' : false, acao: () => exibir('lista') },
        { rotulo: '&Detalhes', marcado: exibicao === 'detalhes' ? 'ponto' : false, acao: () => exibir('detalhes') },
        { sep: true },
        { rotulo: 'A&tualizar', atalho: 'F5', acao: () => setSel([]) },
      ],
    },
    {
      rotulo: '&Ir',
      itens: [
        { rotulo: '&Voltar', atalho: 'Alt+Seta à esquerda', desabilitado: hist.i === 0, acao: () => setHist((h) => ({ ...h, i: h.i - 1 })) },
        { rotulo: '&Avançar', atalho: 'Alt+Seta à direita', desabilitado: hist.i >= hist.lista.length - 1, acao: () => setHist((h) => ({ ...h, i: h.i + 1 })) },
        { rotulo: '&Um nível acima', acao: acima, desabilitado: local === 'meu-computador' },
        { sep: true },
        { rotulo: '&Meu computador', acao: () => ir('meu-computador') },
        { rotulo: 'Meus &documentos', acao: () => ir('C:\\Meus documentos') },
        { rotulo: '&Internet Explorer', acao: () => sis.abrir('ie') },
      ],
    },
    { rotulo: 'Aj&uda', itens: [{ rotulo: '&Tópicos da Ajuda', acao: () => sis.abrir('ajuda') }, { sep: true }, { rotulo: '&Sobre o Windows', acao: () => sis.abrir('sobre') }] },
  ]

  const menuItem = (e, it) => {
    e.preventDefault()
    e.stopPropagation()
    if (!sel.includes(it.nome)) setSel([it.nome])
    const lista = local === 'lixeira'
      ? [{ rotulo: '&Restaurar', acao: () => (sis.restaurarDaLixeira(it.id), setSel([])) }, { sep: true }, { rotulo: '&Excluir', acao: excluirSel }]
      : [
          { rotulo: '&Abrir', acao: () => abrirItem(it) },
          ...(pasta ? [{ sep: true }, { rotulo: '&Excluir', acao: excluirSel }, { rotulo: '&Renomear', acao: () => setRenomeando(it.nome) }] : []),
          { sep: true },
          { rotulo: 'P&ropriedades', acao: () => (pasta ? sis.abrir('propriedades', { caminho: it.caminho }) : propriedades()), desabilitado: local === 'painel' },
        ]
    setMenu({ x: e.clientX, y: e.clientY, itens: lista })
  }

  const menuVazio = (e) => {
    e.preventDefault()
    setSel([])
    setMenu({
      x: e.clientX,
      y: e.clientY,
      itens: [
        { rotulo: '&Exibir', sub: menus[2].itens.slice(0, 3) },
        { rotulo: 'A&tualizar', acao: () => setSel([]) },
        ...(pasta ? [{ sep: true }, { rotulo: '&Novo', sub: menus[0].itens[0].sub }] : []),
        ...(local === 'lixeira' ? [{ sep: true }, { rotulo: 'Esvaziar &Lixeira', desabilitado: !itens.length, acao: () => sis.esvaziarLixeira() }] : []),
        { sep: true },
        { rotulo: 'P&ropriedades', acao: propriedades, desabilitado: local === 'painel' || local === 'lixeira' },
      ],
    })
  }

  const clicarItem = (e, it) => {
    e.stopPropagation()
    if (e.ctrlKey) setSel((s) => (s.includes(it.nome) ? s.filter((x) => x !== it.nome) : [...s, it.nome]))
    else if (e.shiftKey && sel.length) {
      const a = itens.findIndex((i) => i.nome === sel[0])
      const b = itens.findIndex((i) => i.nome === it.nome)
      setSel(itens.slice(Math.min(a, b), Math.max(a, b) + 1).map((i) => i.nome))
    } else setSel([it.nome])
    if (e.pointerType === 'touch') abrirItem(it)
  }

  const terminarRenomear = (it) => async (valor) => {
    setRenomeando(null)
    if (valor === null || valor === it.nome) return
    const novoNome = await sis.renomearItem(it.caminho, valor)
    if (novoNome) setSel([novoNome])
  }

  const rotuloItem = (it) => (renomeando === it.nome && pasta ? <Renomear it={it} aoTerminar={terminarRenomear(it)} /> : <span className="w98-rotulo">{it.nome}</span>)

  const descricao = selecionados.length === 1 ? selecionados[0] : null
  const totalBytes = (selecionados.length ? selecionados : itens).reduce((t, i) => t + (i.tamanho ?? i.bytes ?? 0), 0)
  const mostrarWeb = largura > 460

  return (
    <div className="w98-explorer" onKeyDown={teclas}>
      <MenuBarra menus={menus} />
      <div className="w98-barra-ferramentas">
        <span className="w98-separador-barra alca" />
        <button type="button" className="w98-ferramenta" disabled={hist.i === 0} onClick={() => setHist((h) => ({ ...h, i: h.i - 1 }))}>
          <Seta dir="esq" />
          Voltar
        </button>
        <button type="button" className="w98-ferramenta" disabled={hist.i >= hist.lista.length - 1} onClick={() => setHist((h) => ({ ...h, i: h.i + 1 }))}>
          <Seta dir="dir" />
          Avançar
        </button>
        <button type="button" className="w98-ferramenta" disabled={local === 'meu-computador'} onClick={acima} data-acao="acima">
          <Seta dir="cima" />
          Acima
        </button>
        <span className="w98-separador-barra" />
        <button type="button" className="w98-ferramenta" disabled>
          <Glifo d="M5 3l5 8m5-8l-5 8M7 13a2 2 0 1 0 0 4a2 2 0 1 0 0-4m6 0a2 2 0 1 0 0 4a2 2 0 1 0 0-4" />
          Recortar
        </button>
        <button type="button" className="w98-ferramenta" disabled>
          <Glifo d="M3 2h8v11H3zM8 6h8v12H8z" cor="#fff" />
          Copiar
        </button>
        <button type="button" className="w98-ferramenta" disabled>
          <Glifo d="M4 3h10v14H4zM7 2h4v3H7z" cor="#c08040" />
          Colar
        </button>
        <span className="w98-separador-barra" />
        <button type="button" className="w98-ferramenta" disabled={!sel.length || (virtual && local !== 'lixeira')} onClick={excluirSel} data-acao="excluir">
          <Glifo d="M4 4l12 12M16 4L4 16" cor="#f00" />
          Excluir
        </button>
        <button type="button" className="w98-ferramenta" onClick={propriedades} disabled={local === 'painel' || local === 'lixeira'}>
          <Glifo d="M3 3h14v14H3zM6 7h8M6 10h8M6 13h5" cor="#fff" />
          Propriedades
        </button>
        <span className="w98-separador-barra" />
        <button type="button" className="w98-ferramenta" onClick={proximaExibicao} data-acao="exibicao">
          <Glifo d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" cor="#ffd700" />
          Modos de exibição
        </button>
      </div>
      <form
        className="w98-endereco"
        onSubmit={(e) => {
          e.preventDefault()
          const t = endereco.trim()
          const v = Object.entries(VIRTUAIS).find(([, x]) => x.titulo.toLowerCase() === t.toLowerCase())
          if (/^(https?:\/\/|www\.)/i.test(t)) sis.abrir('ie', { url: t })
          else ir(v ? v[0] : t)
        }}
      >
        <span className="w98-separador-barra alca" />
        <span>Endereço</span>
        <span className="w98-campo">
          <Icone nome={iconeDoLocal(local)} tamanho={16} />
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} aria-label="Endereço" data-testid="w98-endereco" />
        </span>
      </form>
      <div className="w98-explorer-corpo" ref={corpo}>
        {mostrarWeb && (
          <div className="w98-web">
            <Icone nome={iconeDoLocal(local)} tamanho={32} />
            <h2>{tituloDoLocal(local)}</h2>
            <div className="w98-web-linha" />
            {descricao ? (
              <>
                <p>
                  <b>{descricao.nome}</b>
                </p>
                <p>{descricao.tipoTexto || descricao.tipo}</p>
                {descricao.info && <p style={{ whiteSpace: 'pre-line' }}>{descricao.info}</p>}
                {descricao.modificado && <p>Modificado em: {dataCurta(descricao.modificado)} {horaCurta(descricao.modificado)}</p>}
                {descricao.tipo === 'arquivo' && <p>Tamanho: {tamanhoKB(descricao.tamanho)}</p>}
                {descricao.origem && <p>Local original: {descricao.origem}</p>}
              </>
            ) : selecionados.length > 1 ? (
              <p>{selecionados.length} itens selecionados.</p>
            ) : (
              <p>{virtual ? virtual.descricao : 'Selecione um item para ver sua descrição.'}</p>
            )}
            {local === 'lixeira' && itens.length > 0 && (
              <p>
                <a onClick={() => sis.esvaziarLixeira()}>Esvaziar Lixeira</a>
                {sel.length > 0 && (
                  <>
                    <br />
                    <a onClick={restaurarSel}>Restaurar</a>
                  </>
                )}
              </p>
            )}
          </div>
        )}
        <div
          className={`w98-itens w98-modo-${exibicao}`}
          tabIndex={0}
          data-testid="w98-itens"
          onPointerDown={() => setSel([])}
          onContextMenu={menuVazio}
        >
          {exibicao === 'detalhes' ? (
            <table className="w98-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  {local === 'lixeira' ? (
                    <>
                      <th>Local original</th>
                      <th>Data de exclusão</th>
                    </>
                  ) : (
                    <th>Tamanho</th>
                  )}
                  <th>Tipo</th>
                  {pasta && <th>Modificado</th>}
                </tr>
              </thead>
              <tbody>
                {itens.map((it) => (
                  <tr
                    key={it.nome + (it.id || '')}
                    className={sel.includes(it.nome) ? 'sel' : ''}
                    data-item={it.nome}
                    onPointerDown={(e) => clicarItem(e, it)}
                    onDoubleClick={() => abrirItem(it)}
                    onContextMenu={(e) => menuItem(e, it)}
                  >
                    <td>
                      <Icone nome={it.icone} tamanho={16} />
                      {renomeando === it.nome && pasta ? <Renomear it={it} aoTerminar={terminarRenomear(it)} /> : <span>{it.nome}</span>}
                    </td>
                    {local === 'lixeira' ? (
                      <>
                        <td>{it.origem}</td>
                        <td>
                          {dataCurta(it.excluido)} {horaCurta(it.excluido)}
                        </td>
                      </>
                    ) : (
                      <td className="n">{it.tipo === 'arquivo' ? tamanhoKB(it.tamanho) : ''}</td>
                    )}
                    <td>{it.tipoTexto || it.tipo}</td>
                    {pasta && <td>{it.modificado ? `${dataCurta(it.modificado)} ${horaCurta(it.modificado)}` : ''}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            itens.map((it) => (
              <div
                key={it.nome + (it.id || '')}
                className={`w98-item ${sel.includes(it.nome) ? 'sel' : ''}`}
                data-item={it.nome}
                title={it.tipoTexto || it.tipo}
                onPointerDown={(e) => clicarItem(e, it)}
                onDoubleClick={() => abrirItem(it)}
                onContextMenu={(e) => menuItem(e, it)}
              >
                <Icone nome={it.icone} tamanho={exibicao === 'lista' ? 16 : 32} />
                {rotuloItem(it)}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="w98-status">
        <div data-testid="w98-status">{sel.length ? `${sel.length} objeto(s) selecionado(s)` : `${itens.length} objeto(s)`}</div>
        {pasta && <div style={{ width: 90 }}>{tamanhoKB(totalBytes)}</div>}
        <div style={{ width: 130 }}>
          <Icone nome="computador" tamanho={16} />
          {ZONA[local] || 'Meu computador'}
        </div>
      </div>
      {menu && <MenuSuspenso itens={menu.itens} x={menu.x} y={menu.y} aoFechar={() => setMenu(null)} />}
      <FecharMenuFora aberto={!!menu} fechar={() => setMenu(null)} />
    </div>
  )
}

/** Caixa de renomear no lugar do rótulo (seleciona o nome sem a extensão, como no Windows). */
export function Renomear({ it, aoTerminar }) {
  return (
    <input
      className="w98-renomear"
      autoFocus
      defaultValue={it.nome}
      onFocus={(e) => {
        const v = e.target.value
        const ponto = it.tipo === 'arquivo' ? v.lastIndexOf('.') : -1
        e.target.setSelectionRange(0, ponto > 0 ? ponto : v.length)
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          e.currentTarget.dataset.cancelar = '1'
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => aoTerminar(e.target.dataset.cancelar ? null : e.target.value)}
    />
  )
}

function FecharMenuFora({ aberto, fechar }) {
  useEffect(() => {
    if (!aberto) return
    const f = () => fechar()
    window.addEventListener('pointerdown', f)
    return () => window.removeEventListener('pointerdown', f)
  }, [aberto, fechar])
  return null
}

/** Propriedades de um item da Lixeira. */
export function PropriedadesLixeira({ item }) {
  const jan = useJanela()
  return (
    <div className="w98-dialogo" style={{ width: 320 }}>
      <div className="w98-linha" style={{ gap: 16 }}>
        <Icone nome={item.icone} />
        <b>{item.nome}</b>
      </div>
      <div>Local original: {item.origem}</div>
      <div>Excluído em: {dataCurta(item.excluido)} {horaCurta(item.excluido)}</div>
      <div>Tipo: {item.tipo}</div>
      <div>Tamanho: {tamanhoKB(item.bytes)}</div>
      <div className="w98-botoes-direita">
        <button type="button" className="w98-botao padrao" onClick={() => jan.fecharJa()}>
          <span>OK</span>
        </button>
      </div>
    </div>
  )
}

