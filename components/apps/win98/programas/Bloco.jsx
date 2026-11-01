'use client'

// Bloco de notas: abrir/salvar no disco C:, "Sem título", pergunta antes de perder alterações,
// Hora/data (F5), Quebra automática de linha, Localizar (F3) e Selecionar tudo.

import { useEffect, useRef, useState } from 'react'
import { MenuBarra } from '../Menu'
import { useAntesDeFechar, useJanela, useSistema } from '../sistema'
import { gravarArquivo, lerArquivo, nomeDe } from '@/lib/win98/arquivos'

const TIPOS = [
  { rotulo: 'Documentos de texto (*.txt)', ext: ['txt'] },
  { rotulo: 'Todos os arquivos (*.*)', ext: null },
]

const semExt = (nome) => nome.replace(/\.txt$/i, '')

export default function Bloco({ caminho: caminhoInicial }) {
  const sis = useSistema()
  const jan = useJanela()
  const area = useRef(null)
  const [caminho, setCaminho] = useState(caminhoInicial || null)
  const [texto, setTexto] = useState(() => (caminhoInicial ? (lerArquivo(sis.disco, caminhoInicial) ?? '') : ''))
  const [salvo, setSalvo] = useState(texto)
  const [quebra, setQuebra] = useState(true)
  const [busca, setBusca] = useState('')
  const alterado = texto !== salvo
  const nomeDoc = caminho ? semExt(nomeDe(caminho)) : 'Sem título'

  useEffect(() => {
    jan.definirTitulo(`${nomeDoc} - Bloco de notas`)
  }, [nomeDoc, jan])

  useEffect(() => {
    area.current?.focus()
  }, [])

  const salvarEm = (c) => {
    try {
      sis.mudarDisco((d) => gravarArquivo(d, c, texto))
      setCaminho(c)
      setSalvo(texto)
      sis.adicionarRecente(c)
      return true
    } catch (e) {
      sis.msg({ titulo: 'Bloco de notas', texto: e.message, icone: 'erro' })
      return false
    }
  }

  const salvarComo = async () => {
    const c = await sis.dialogoArquivo({ modo: 'salvar', titulo: 'Salvar como', nome: caminho ? nomeDe(caminho) : '*.txt', tipos: TIPOS })
    return c ? salvarEm(c) : false
  }

  const salvar = () => (caminho ? salvarEm(caminho) : salvarComo())

  /** No Windows 98: "O texto do arquivo Sem título foi alterado. Deseja salvar as alterações?" */
  const confirmarDescarte = async () => {
    if (!alterado) return true
    const r = await sis.msg({ titulo: 'Bloco de notas', texto: `O texto do arquivo ${nomeDoc} foi alterado.\n\nDeseja salvar as alterações?`, icone: 'aviso', botoes: ['&Sim', '&Não', 'Cancelar'] })
    if (r === '&Sim') return await salvar()
    return r === '&Não'
  }

  useAntesDeFechar(confirmarDescarte)

  const novo = async () => {
    if (!(await confirmarDescarte())) return
    setCaminho(null)
    setTexto('')
    setSalvo('')
  }

  const abrir = async () => {
    if (!(await confirmarDescarte())) return
    const c = await sis.dialogoArquivo({ modo: 'abrir', titulo: 'Abrir', tipos: TIPOS })
    if (!c) return
    const t = lerArquivo(sis.disco, c) ?? ''
    if (t.startsWith('data:')) {
      sis.msg({ titulo: 'Bloco de notas', texto: 'Este arquivo não é um documento de texto.', icone: 'aviso' })
      return
    }
    setCaminho(c)
    setTexto(t)
    setSalvo(t)
    sis.adicionarRecente(c)
  }

  const inserir = (s) => {
    const el = area.current
    const ini = el.selectionStart
    const fim = el.selectionEnd
    const novoTexto = texto.slice(0, ini) + s + texto.slice(fim)
    setTexto(novoTexto)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = ini + s.length
    })
  }

  // Hora e data como o Bloco de notas: "14:05 25/6/1998".
  const horaData = () => {
    const d = new Date()
    inserir(`${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' })}`)
  }

  const localizar = async (proxima = false) => {
    let termo = busca
    if (!proxima || !termo) {
      termo = await sis.pedirTexto({ titulo: 'Localizar', rotulo: '&Localizar:', valor: busca, botao: '&Localizar próxima' })
      if (!termo) return
      setBusca(termo)
    }
    const el = area.current
    const de = el.selectionEnd
    const i = texto.toLowerCase().indexOf(termo.toLowerCase(), de)
    if (i < 0) {
      sis.msg({ titulo: 'Bloco de notas', texto: `Não foi possível encontrar "${termo}"`, icone: 'info' })
      return
    }
    el.focus()
    el.setSelectionRange(i, i + termo.length)
  }

  const comando = (c) => () => {
    area.current?.focus()
    document.execCommand(c)
  }

  const menus = [
    {
      rotulo: '&Arquivo',
      itens: [
        { rotulo: '&Novo', acao: novo },
        { rotulo: '&Abrir...', acao: abrir },
        { rotulo: '&Salvar', acao: salvar },
        { rotulo: 'Salvar &como...', acao: salvarComo },
        { sep: true },
        { rotulo: 'Con&figurar página...', desabilitado: true },
        { rotulo: '&Imprimir', desabilitado: true },
        { sep: true },
        { rotulo: 'Sai&r', acao: () => jan.fechar() },
      ],
    },
    {
      rotulo: '&Editar',
      itens: [
        { rotulo: '&Desfazer', atalho: 'Ctrl+Z', acao: comando('undo') },
        { sep: true },
        { rotulo: 'Recor&tar', atalho: 'Ctrl+X', acao: comando('cut') },
        { rotulo: '&Copiar', atalho: 'Ctrl+C', acao: comando('copy') },
        { rotulo: 'C&olar', atalho: 'Ctrl+V', acao: () => navigator.clipboard?.readText().then(inserir).catch(() => {}) },
        { rotulo: '&Excluir', atalho: 'Del', acao: () => inserir('') },
        { sep: true },
        { rotulo: 'Selecionar &tudo', acao: () => area.current?.select() },
        { rotulo: 'Hora/&data', atalho: 'F5', acao: horaData },
        { sep: true },
        { rotulo: '&Quebra automática de linha', marcado: quebra, acao: () => setQuebra((q) => !q) },
        { rotulo: 'Definir &fonte...', desabilitado: true },
      ],
    },
    {
      rotulo: '&Pesquisar',
      itens: [
        { rotulo: '&Localizar...', acao: () => localizar(false) },
        { rotulo: 'Localizar &próxima', atalho: 'F3', acao: () => localizar(true) },
      ],
    },
    { rotulo: 'Aj&uda', itens: [{ rotulo: '&Tópicos da Ajuda', acao: () => sis.abrir('ajuda') }, { sep: true }, { rotulo: '&Sobre o Bloco de notas', acao: () => sis.abrir('sobre', { programa: 'Bloco de notas', icone: 'bloco' }) }] },
  ]

  return (
    <div className="w98-bloco" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <MenuBarra menus={menus} />
      <textarea
        ref={area}
        value={texto}
        spellCheck={false}
        wrap={quebra ? 'soft' : 'off'}
        aria-label="Texto do documento"
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'F5') {
            e.preventDefault()
            horaData()
          } else if (e.key === 'F3') {
            e.preventDefault()
            localizar(true)
          } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault()
            salvar()
          }
        }}
      />
    </div>
  )
}
