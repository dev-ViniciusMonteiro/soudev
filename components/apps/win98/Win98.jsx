'use client'

// Windows 98 no navegador: inicialização (BIOS + tela de abertura), área de trabalho com ícones, barra de tarefas,
// menu Iniciar, janelas, Executar, Desligar (com "Agora você pode desligar o computador com segurança")
// e proteção de tela. Tudo fica salvo no aparelho (disco C: e configurações em localStorage).

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Icone, { iconeDoArquivo } from './icones'
import Janela from './Janela'
import { MenuSuspenso, useFecharFora } from './Menu'
import { JanelaCtx, SistemaCtx, useSistema } from './sistema'
import { carregarConfig, ESQUEMAS, salvarConfig } from './temas'
import { Ajuda, CaixaMensagem, DataHora, DialogoArquivo, Executar, PedirTexto, PropriedadesItem, PropriedadesSistema, Sobre } from './Dialogos'
import Bloco from './programas/Bloco'
import Calculadora from './programas/Calculadora'
import Minado, { Personalizado, Recordes } from './programas/Minado'
import Paint, { Atributos } from './programas/Paint'
import Explorer, { PropriedadesLixeira, Renomear, iconeDoLocal, tituloDoLocal } from './programas/Explorer'
import Navegador from './programas/Navegador'
import Dos from './programas/Dos'
import Video, { Protetor, estiloFundo } from './programas/Video'
import { janelas as reduzirJanelas, estadoInicial, camada } from '@/lib/win98/janelas'
import {
  MESA,
  achar,
  carregarDisco,
  caminhoReal,
  criarPasta,
  esvaziarLixeira,
  excluir,
  extensao,
  gravarArquivo,
  juntar,
  listar,
  nomeDe,
  nomeLivre,
  renomear,
  restaurar,
  salvarDisco,
} from '@/lib/win98/arquivos'

/* ---------- Programas ---------- */
const PROGRAMAS = {
  bloco: { C: Bloco, titulo: 'Sem título - Bloco de notas', icone: 'bloco', largura: 560, altura: 380 },
  calculadora: { C: Calculadora, titulo: 'Calculadora', icone: 'calculadora', ajustar: true, redimensionavel: false },
  minado: { C: Minado, titulo: 'Campo minado', icone: 'minado', ajustar: true, redimensionavel: false, unica: true },
  paint: { C: Paint, titulo: 'sem título - Paint', icone: 'paint', largura: 680, altura: 500 },
  explorer: { C: Explorer, titulo: 'Meu computador', icone: 'computador', largura: 640, altura: 430 },
  ie: { C: Navegador, titulo: 'Internet Explorer', icone: 'internet', largura: 820, altura: 580 },
  dos: { C: Dos, titulo: 'Prompt do MS-DOS', icone: 'dos', largura: 660, altura: 420 },
  ajuda: { C: Ajuda, titulo: 'Ajuda do Windows', icone: 'ajuda', largura: 600, altura: 400, unica: true },
  video: { C: Video, titulo: 'Propriedades de Vídeo', icone: 'video', dialogo: true, ajustar: true, unica: true, centralizar: true, ajuda: true },
  executar: { C: Executar, titulo: 'Executar', icone: 'executar', dialogo: true, ajustar: true, unica: true, posicao: 'executar', ajuda: true },
  sobre: { C: Sobre, titulo: 'Sobre o Windows', dialogo: true, ajustar: true, centralizar: true },
  msg: { C: CaixaMensagem, dialogo: true, ajustar: true, centralizar: true },
  texto: { C: PedirTexto, dialogo: true, ajustar: true, centralizar: true },
  arquivo: { C: DialogoArquivo, dialogo: true, ajustar: true, centralizar: true, ajuda: true },
  datahora: { C: DataHora, titulo: 'Propriedades de Data/hora', icone: 'relogio', dialogo: true, ajustar: true, unica: true, centralizar: true, ajuda: true },
  sistema: { C: PropriedadesSistema, titulo: 'Propriedades do Sistema', icone: 'computador', dialogo: true, ajustar: true, unica: true, centralizar: true, ajuda: true },
  propriedades: { C: PropriedadesItem, dialogo: true, ajustar: true, centralizar: true, ajuda: true },
  propriedadesLixeira: { C: PropriedadesLixeira, titulo: 'Propriedades', dialogo: true, ajustar: true, centralizar: true },
  recordes: { C: Recordes, titulo: 'Melhores tempos do Campo minado', dialogo: true, ajustar: true, unica: true, centralizar: true },
  minadoPersonalizado: { C: Personalizado, titulo: 'Campo personalizado', dialogo: true, ajustar: true, centralizar: true },
  paintAtributos: { C: Atributos, titulo: 'Atributos', dialogo: true, ajustar: true, centralizar: true, ajuda: true },
}

const EXECUTAVEIS = { notepad: 'bloco', edit: 'bloco', calc: 'calculadora', winmine: 'minado', mspaint: 'paint', pbrush: 'paint', command: 'dos', explorer: 'explorer', iexplore: 'ie', winver: 'sobre', control: 'painel', 'desk.cpl': 'video', 'timedate.cpl': 'datahora', 'sysdm.cpl': 'sistema', winhelp: 'ajuda' }

/* ---------- Ícones da área de trabalho ---------- */
const FIXOS = [
  { id: 'meu-computador', nome: 'Meu computador', icone: 'computador' },
  { id: 'meus-documentos', nome: 'Meus documentos', icone: 'documentos' },
  { id: 'ie', nome: 'Internet Explorer', icone: 'internet' },
  { id: 'rede', nome: 'Ambiente de rede', icone: 'rede' },
  { id: 'lixeira', nome: 'Lixeira', icone: 'lixeira' },
  { id: 'minado', nome: 'Campo minado', icone: 'minado' },
  { id: 'dos', nome: 'Prompt do MS-DOS', icone: 'dos' },
  { id: 'soudev', nome: 'Voltar ao soudev', icone: 'soudev' },
]

const CELULA = { w: 75, h: 70 }

function posicaoPadrao(i, altura) {
  const porColuna = Math.max(1, Math.floor((altura - 8) / CELULA.h))
  return { x: 4 + Math.floor(i / porColuna) * CELULA.w, y: 6 + (i % porColuna) * CELULA.h }
}

const BIOS = (nucleos) => [
  'soudev BIOS v1.98 (recriação para navegador)',
  'Copyright (C) 2026 soudev',
  '',
  `Processador: ${nucleos} ${nucleos === 1 ? 'núcleo' : 'núcleos'} a 266 MHz`,
  'Teste de memória: 65536K OK',
  '',
  'Detectando IDE primário mestre ... Disco local (C:) 2048 MB',
  'Detectando IDE primário escravo  ... CD-ROM (D:)',
  '',
  'Iniciando o Windows 98...',
]

export default function Win98() {
  const [fase, setFase] = useState('bios')
  const [disco, setDiscoEstado] = useState(carregarDisco)
  const [config, setConfigEstado] = useState(carregarConfig)
  const [estado, dispatch] = useReducer(reduzirJanelas, undefined, estadoInicial)
  const [area, setArea] = useState({ largura: 1024, altura: 740 })
  const [iniciar, setIniciar] = useState(false)
  const [menuMesa, setMenuMesa] = useState(null)
  const [desligar, setDesligar] = useState(false)
  const [protetor, setProtetor] = useState(null)
  const [linhasBios, setLinhasBios] = useState(0)
  const discoRef = useRef(disco)
  const configRef = useRef(config)
  const estadoRef = useRef(estado)
  const fechaveis = useRef({})
  const ultimaAtividade = useRef(Date.now())
  const demoAberto = useRef(false)
  estadoRef.current = estado

  /* ---------- tamanho da tela ---------- */
  useEffect(() => {
    const medir = () => setArea({ largura: window.innerWidth, altura: window.innerHeight - 28 })
    medir()
    window.addEventListener('resize', medir)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', medir)
      document.body.style.overflow = antes
    }
  }, [])

  /* ---------- inicialização ---------- */
  // ?rapido pula a inicialização; ?demo abre algumas janelas (usado na captura do banner).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.has('rapido') || q.has('demo')) setFase('mesa')
    if (q.has('demo') && !demoAberto.current) {
      demoAberto.current = true
      const l = window.innerWidth
      abrir('explorer', { local: 'meu-computador' })
      abrir('calculadora')
      abrir('minado')
      dispatch({ tipo: 'mover', id: 'j1', x: l * 0.12, y: 50 })
      dispatch({ tipo: 'mover', id: 'j2', x: l * 0.6, y: 300 })
      dispatch({ tipo: 'mover', id: 'j3', x: l * 0.45, y: 90 })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fase === 'bios') {
      setLinhasBios(0)
      const total = BIOS(1).length
      let n = 0
      const t = setInterval(() => {
        n++
        setLinhasBios(n)
        if (n >= total) {
          clearInterval(t)
          setTimeout(() => setFase((f) => (f === 'bios' ? 'abertura' : f)), 500)
        }
      }, 140)
      return () => clearInterval(t)
    }
    if (fase === 'abertura') {
      const t = setTimeout(() => setFase((f) => (f === 'abertura' ? 'mesa' : f)), 2600)
      return () => clearTimeout(t)
    }
    if (fase === 'aguarde') {
      const t = setTimeout(() => setFase('desligado'), 1600)
      return () => clearTimeout(t)
    }
  }, [fase])

  const pularFase = () => {
    if (fase === 'bios') setFase('abertura')
    else if (fase === 'abertura') setFase('mesa')
  }

  /* ---------- disco e configurações (síncronos: as operações podem lançar erro para quem chamou) ---------- */
  const mudarDisco = useCallback((v) => {
    const novo = typeof v === 'function' ? v(discoRef.current) : v
    discoRef.current = novo
    salvarDisco(novo)
    setDiscoEstado(novo)
  }, [])

  const mudarConfig = useCallback((v) => {
    const nova = typeof v === 'function' ? v(configRef.current) : v
    configRef.current = nova
    salvarConfig(nova)
    setConfigEstado(nova)
  }, [])

  /* ---------- janelas ---------- */
  const abrir = useCallback(
    (app, props = {}) => {
      const def = PROGRAMAS[app]
      if (!def) return
      let titulo = props.titulo || def.titulo || ''
      let icone = def.icone
      if (app === 'explorer') {
        const local = props.local || 'meu-computador'
        titulo = tituloDoLocal(local)
        icone = iconeDoLocal(local)
      }
      if (app === 'sobre') titulo = `Sobre o ${props.programa || 'Windows'}`
      if (app === 'propriedades') titulo = `Propriedades de ${nomeDe(props.caminho || 'C:\\')}`
      const pequena = window.innerWidth < 640
      dispatch({
        tipo: 'abrir',
        app,
        titulo,
        icone,
        largura: def.largura,
        altura: def.altura,
        props,
        unica: def.unica,
        redimensionavel: def.redimensionavel !== false && !def.dialogo,
        area: { largura: window.innerWidth, altura: window.innerHeight - 28 },
        max: pequena && !def.dialogo && !def.ajustar,
        extra: { ajustar: !!def.ajustar, dialogo: !!def.dialogo, centralizar: !!def.centralizar, posicao: def.posicao, ajuda: !!def.ajuda },
      })
      setIniciar(false)
    },
    [],
  )

  const abrirEsperar = useCallback((app, props = {}) => new Promise((resolve) => abrir(app, { ...props, responder: resolve })), [abrir])

  const fecharJanela = useCallback((id) => {
    const j = estadoRef.current.janelas.find((x) => x.id === id)
    j?.props?.responder?.(null) // quem esperava a resposta recebe "cancelado" (se já respondeu, não muda nada)
    delete fechaveis.current[id]
    dispatch({ tipo: 'fechar', id })
  }, [])

  const pedirFechar = useCallback(
    async (id) => {
      const fn = fechaveis.current[id]
      if (fn) {
        const ok = await fn()
        if (ok === false) return
      }
      fecharJanela(id)
    },
    [fecharJanela],
  )

  const msg = useCallback(({ titulo = 'Windows', texto, icone = 'info', botoes = ['OK'], padrao = 0 }) => abrirEsperar('msg', { titulo, texto, icone, botoes, padrao }), [abrirEsperar])
  const pedirTexto = useCallback((o) => abrirEsperar('texto', { ...o, titulo: o.titulo }), [abrirEsperar])
  const dialogoArquivo = useCallback((o) => abrirEsperar('arquivo', { ...o, titulo: o.titulo || (o.modo === 'salvar' ? 'Salvar como' : 'Abrir') }), [abrirEsperar])

  const adicionarRecente = useCallback((c) => mudarConfig((cf) => ({ ...cf, recentes: [c, ...(cf.recentes || []).filter((x) => x.toLowerCase() !== c.toLowerCase())].slice(0, 12) })), [mudarConfig])

  /** Abre um arquivo do disco no programa certo pela extensão. */
  const abrirArquivo = useCallback(
    (caminho) => {
      const no = achar(discoRef.current, caminho)
      if (!no) return msg({ titulo: 'Windows', texto: `Não é possível encontrar o arquivo '${caminho}'.`, icone: 'erro' })
      if (no.tipo === 'pasta') return abrir('explorer', { local: caminhoReal(discoRef.current, caminho) })
      const ext = extensao(caminho)
      const nome = nomeDe(caminho).toLowerCase().replace(/\.(exe|com)$/, '')
      if (['txt', 'ini', 'bat', 'sys', 'log'].includes(ext)) {
        adicionarRecente(caminho)
        return abrir('bloco', { caminho: caminhoReal(discoRef.current, caminho) })
      }
      if (['bmp', 'png'].includes(ext)) {
        adicionarRecente(caminho)
        return abrir('paint', { caminho: caminhoReal(discoRef.current, caminho) })
      }
      if (ext === 'exe' || ext === 'com') {
        const app = EXECUTAVEIS[nome]
        if (app === 'painel') return abrir('explorer', { local: 'painel' })
        if (app === 'explorer') return abrir('explorer', { local: 'C:\\' })
        if (app) return abrir(app)
        return msg({ titulo: nomeDe(caminho), texto: 'Este programa não pode ser executado nesta recriação.', icone: 'erro' })
      }
      return msg({ titulo: 'Abrir com', texto: `Não há nenhum programa associado a '${nomeDe(caminho)}'.`, icone: 'info' })
    },
    [abrir, msg, adicionarRecente],
  )

  /** Executar (Iniciar > Executar...): programas, pastas, arquivos e endereços da Internet. */
  const executarComando = useCallback(
    (texto) => {
      const t = texto.trim()
      const base = t.toLowerCase().replace(/\.(exe|com)$/, '')
      if (/^(https?:\/\/|www\.)/i.test(t)) return abrir('ie', { url: t })
      const app = EXECUTAVEIS[base]
      if (app === 'painel') return abrir('explorer', { local: 'painel' })
      if (app === 'explorer') return abrir('explorer', { local: 'C:\\' })
      if (app) return abrir(app)
      if (/^[a-z]:/i.test(t) || t.startsWith('\\')) {
        if (/^[ad]:/i.test(t)) return msg({ titulo: t, texto: `${t.slice(0, 2).toUpperCase()}\\ não está acessível.\n\nO dispositivo não está pronto.`, icone: 'erro', botoes: ['&Repetir', 'Cancelar'] })
        if (achar(discoRef.current, t)) return abrirArquivo(t)
      }
      return msg({ titulo: t, texto: `Não é possível encontrar o arquivo '${t}' (ou um de seus componentes). Verifique se o caminho e o nome do arquivo estão corretos e se todas as bibliotecas necessárias estão disponíveis.`, icone: 'erro' })
    },
    [abrir, abrirArquivo, msg],
  )

  /* ---------- operações de arquivo com as confirmações do Windows ---------- */
  const excluirComConfirmacao = useCallback(
    async (caminhos) => {
      if (!caminhos.length) return false
      const um = caminhos.length === 1
      const ehPasta = um && achar(discoRef.current, caminhos[0])?.tipo === 'pasta'
      const r = await msg({
        titulo: um ? (ehPasta ? 'Confirmar exclusão de pasta' : 'Confirmar exclusão de arquivo') : 'Confirmar exclusão de vários arquivos',
        texto: um ? `Tem certeza de que deseja enviar '${nomeDe(caminhos[0])}' para a Lixeira?` : `Tem certeza de que deseja enviar estes ${caminhos.length} itens para a Lixeira?`,
        icone: 'aviso',
        botoes: ['&Sim', '&Não'],
      })
      if (r !== '&Sim') return false
      for (const c of caminhos) {
        try {
          mudarDisco((d) => excluir(d, c))
        } catch (e) {
          await msg({ titulo: 'Erro ao excluir arquivo ou pasta', texto: e.message, icone: 'erro' })
          return false
        }
      }
      return true
    },
    [msg, mudarDisco],
  )

  const renomearItem = useCallback(
    async (caminho, novo) => {
      try {
        mudarDisco((d) => renomear(d, caminho, novo))
        return novo.trim()
      } catch (e) {
        await msg({ titulo: 'Erro ao renomear arquivo ou pasta', texto: e.message, icone: 'erro' })
        return null
      }
    },
    [msg, mudarDisco],
  )

  const novoItem = useCallback(
    (pasta, tipo) => {
      const d = discoRef.current
      try {
        if (tipo === 'pasta') {
          const n = nomeLivre(d, pasta, 'Nova pasta')
          mudarDisco(criarPasta(d, pasta, n))
          return n
        }
        const [base, ext] = tipo === 'imagem' ? ['Nova imagem de bitmap', '.bmp'] : ['Novo documento de texto', '.txt']
        const n = nomeLivre(d, pasta, base, ext)
        mudarDisco(gravarArquivo(d, juntar(pasta, n), ''))
        return n
      } catch (e) {
        msg({ titulo: 'Erro', texto: e.message, icone: 'erro' })
        return null
      }
    },
    [msg, mudarDisco],
  )

  const restaurarDaLixeira = useCallback((id) => mudarDisco((d) => restaurar(d, id)), [mudarDisco])

  const esvaziar = useCallback(async () => {
    const n = discoRef.current.lixeira.length
    if (!n) return
    const r = await msg({ titulo: 'Confirmar exclusão de vários arquivos', texto: n === 1 ? `Tem certeza de que deseja excluir '${discoRef.current.lixeira[0].nome}'?` : `Tem certeza de que deseja excluir estes ${n} itens?`, icone: 'aviso', botoes: ['&Sim', '&Não'] })
    if (r === '&Sim') mudarDisco((d) => esvaziarLixeira(d))
  }, [msg, mudarDisco])

  const visualizarProtetor = useCallback((tipo) => {
    ultimaAtividade.current = Date.now()
    setProtetor({ tipo, desde: Date.now() })
  }, [])

  const sis = useMemo(
    () => ({ disco, config, mudarDisco, mudarConfig, abrir, abrirEsperar, msg, pedirTexto, dialogoArquivo, abrirArquivo, executarComando, adicionarRecente, excluirComConfirmacao, renomearItem, novoItem, restaurarDaLixeira, esvaziarLixeira: esvaziar, visualizarProtetor }),
    [disco, config, mudarDisco, mudarConfig, abrir, abrirEsperar, msg, pedirTexto, dialogoArquivo, abrirArquivo, executarComando, adicionarRecente, excluirComConfirmacao, renomearItem, novoItem, restaurarDaLixeira, esvaziar, visualizarProtetor],
  )

  /* ---------- proteção de tela ---------- */
  useEffect(() => {
    const ativo = () => {
      ultimaAtividade.current = Date.now()
    }
    window.addEventListener('pointermove', ativo)
    window.addEventListener('keydown', ativo)
    window.addEventListener('pointerdown', ativo)
    const t = setInterval(() => {
      const c = configRef.current
      if (fase === 'mesa' && !protetor && c.protetor !== 'nenhum' && Date.now() - ultimaAtividade.current > c.minutosProtetor * 60000) setProtetor({ tipo: c.protetor, desde: Date.now() })
    }, 5000)
    return () => {
      clearInterval(t)
      window.removeEventListener('pointermove', ativo)
      window.removeEventListener('keydown', ativo)
      window.removeEventListener('pointerdown', ativo)
    }
  }, [fase, protetor])

  const sairDoProtetor = () => {
    if (protetor && Date.now() - protetor.desde > 600) setProtetor(null)
  }

  /* ---------- teclado global ---------- */
  useEffect(() => {
    const f = (e) => {
      if (fase !== 'mesa') return
      if (e.ctrlKey && e.key === 'Escape') {
        e.preventDefault()
        setIniciar((x) => !x)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [fase])

  const fecharTudo = () => {
    fechaveis.current = {}
    dispatch({ tipo: 'fecharTodas' })
    setIniciar(false)
    setMenuMesa(null)
  }

  const confirmarDesligar = (opcao) => {
    setDesligar(false)
    if (opcao === 'desligar') {
      fecharTudo()
      setFase('aguarde')
    } else if (opcao === 'reiniciar') {
      fecharTudo()
      setFase('bios')
    } else if (opcao === 'dos') {
      fecharTudo()
      setFase('dos')
    }
  }

  const logoff = async () => {
    const r = await msg({ titulo: 'Fazer logoff do Windows', texto: 'Tem certeza de que deseja fazer logoff?', icone: 'logoff', botoes: ['&Sim', '&Não'] })
    if (r === '&Sim') {
      fecharTudo()
      setFase('abertura')
    }
  }

  /* ---------- telas fora da área de trabalho ---------- */
  const vars = ESQUEMAS[config.esquema]?.vars || ESQUEMAS.padrao.vars
  const nucleos = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1

  let sobreposicao = null
  if (fase === 'bios')
    sobreposicao = (
      <div className="w98-bios" onClick={pularFase} data-testid="w98-bios">
        {BIOS(nucleos).slice(0, linhasBios).join('\n')}
        <span className="w98-pular">Clique ou pressione uma tecla para pular</span>
      </div>
    )
  else if (fase === 'abertura')
    sobreposicao = (
      <div className="w98-abertura" onClick={pularFase} data-testid="w98-abertura">
        <div className="w98-abertura-logo">
          <Icone nome="logo" tamanho={96} />
          <div className="w98-abertura-nome">
            <small>soudev</small>
            <strong>
              Windows<em>98</em>
            </strong>
          </div>
        </div>
        <div className="w98-abertura-barra" />
      </div>
    )
  else if (fase === 'aguarde')
    sobreposicao = (
      <div className="w98-tela-final aguarde">
        <Icone nome="logo" tamanho={64} />
        Aguarde enquanto o computador está sendo desligado.
      </div>
    )
  else if (fase === 'desligado')
    sobreposicao = (
      <div className="w98-tela-final" data-testid="w98-desligado">
        <div>
          Agora você pode desligar
          <br />o computador com segurança.
        </div>
        <div className="w98-linha">
          <button type="button" className="w98-botao" onClick={() => setFase('bios')} data-botao="Ligar">
            <span>Ligar o computador</span>
          </button>
          <a className="w98-botao" href="/apps/windows-98" style={{ display: 'inline-grid', placeItems: 'center', textDecoration: 'none' }}>
            <span>Voltar ao soudev</span>
          </a>
        </div>
      </div>
    )
  else if (fase === 'dos')
    sobreposicao = <Dos telaCheia aoSair={() => setFase('bios')} />

  useEffect(() => {
    if (fase !== 'bios' && fase !== 'abertura') return
    const f = () => pularFase()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  return (
    <SistemaCtx.Provider value={sis}>
      <div className="w98" style={vars} data-fase={fase} data-testid="w98" onContextMenu={(e) => e.preventDefault()}>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id="w98-selecao">
            <feFlood floodColor="#000080" floodOpacity="0.5" />
            <feComposite in2="SourceAlpha" operator="in" />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>
        </svg>
        {fase !== 'bios' && fase !== 'dos' && (
          <>
            <div className="w98-mesa" style={estiloFundo(config.fundo, config.esquema)} data-testid="w98-mesa">
              <Mesa area={area} setMenuMesa={setMenuMesa} ativa={estado.ativa} desfocar={() => dispatch({ tipo: 'desfocar' })} />
              {estado.janelas.map((j) => (
                <Moldura key={j.id} janela={j} ativa={estado.ativa === j.id} camada={camada(estado, j.id)} area={area} dispatch={dispatch} pedirFechar={pedirFechar} fecharJanela={fecharJanela} fechaveis={fechaveis} />
              ))}
            </div>
            <BarraTarefas estado={estado} dispatch={dispatch} iniciar={iniciar} setIniciar={setIniciar} abrirDataHora={() => abrir('datahora')} />
            {iniciar && <MenuIniciar fechar={() => setIniciar(false)} abrir={abrir} msg={msg} logoff={logoff} desligar={() => setDesligar(true)} recentes={config.recentes || []} abrirArquivo={abrirArquivo} />}
            {menuMesa && <MenuSuspenso itens={menuMesa.itens} x={menuMesa.x} y={menuMesa.y} aoFechar={() => setMenuMesa(null)} testid="w98-menu-contexto" />}
            <FecharFora aberto={!!menuMesa} fechar={() => setMenuMesa(null)} />
            {desligar && <Desligar responder={confirmarDesligar} />}
          </>
        )}
        {sobreposicao}
        {protetor && (
          <div className="w98-protetor" onPointerMove={sairDoProtetor} onPointerDown={() => setProtetor(null)} onKeyDown={() => setProtetor(null)} tabIndex={-1} ref={(el) => el?.focus()}>
            <Protetor tipo={protetor.tipo} />
          </div>
        )}
      </div>
    </SistemaCtx.Provider>
  )
}

function FecharFora({ aberto, fechar }) {
  useFecharFora(aberto, fechar)
  return null
}

/* ---------- Moldura: liga a janela ao programa ---------- */
function Moldura({ janela, ativa, camada: z, area, dispatch, pedirFechar, fecharJanela, fechaveis }) {
  const def = PROGRAMAS[janela.app]
  const { id } = janela
  const ctx = useMemo(
    () => ({
      id,
      ativa,
      definirTitulo: (titulo) => dispatch({ tipo: 'titulo', id, titulo }),
      definirIcone: (icone) => dispatch({ tipo: 'icone', id, icone }),
      registrarFechar: (fn) => {
        if (fn) fechaveis.current[id] = fn
        else delete fechaveis.current[id]
      },
      fechar: () => pedirFechar(id),
      fecharJa: () => fecharJanela(id),
    }),
    [id, ativa, dispatch, pedirFechar, fecharJanela, fechaveis],
  )
  const { responder, titulo, ...props } = janela.props
  const C = def.C
  const sis = useSistema()
  return (
    <JanelaCtx.Provider value={ctx}>
      <Janela janela={janela} ativa={ativa} camada={z} area={area} dispatch={dispatch} pedirFechar={() => pedirFechar(id)} dialogo={janela.dialogo} ajuda={janela.ajuda ? () => sis.abrir('ajuda') : undefined}>
        <C {...props} responder={responder} />
      </Janela>
    </JanelaCtx.Provider>
  )
}

/* ---------- Área de trabalho ---------- */
function Mesa({ area, setMenuMesa, ativa, desfocar }) {
  const sis = useSistema()
  const [sel, setSel] = useState([])
  const [laco, setLaco] = useState(null)
  const [arrastando, setArrastando] = useState(null) // { ids, dx, dy }
  const [renomeando, setRenomeando] = useState(null)
  const gesto = useRef(null)
  const lixeiraCheia = sis.disco.lixeira.length > 0

  const arquivos = (listar(sis.disco, MESA) || []).map((i) => ({ id: `arq:${i.nome}`, nome: i.tipo === 'arquivo' ? i.nome.replace(/\.lnk$/i, '') : i.nome, icone: iconeDoArquivo(i.nome, i.tipo), caminho: juntar(MESA, i.nome), tipo: i.tipo, arquivo: true, nomeReal: i.nome }))
  const icones = [...FIXOS.map((f) => (f.id === 'lixeira' ? { ...f, icone: lixeiraCheia ? 'lixeiraCheia' : 'lixeira' } : f)), ...arquivos]
  const pos = (ic, i) => sis.config.posicoes?.[ic.id] || posicaoPadrao(i, area.altura)
  const posicoes = icones.map((ic, i) => ({ ...ic, ...pos(ic, i) }))

  const abrirIcone = (ic) => {
    if (ic.id === 'meu-computador') sis.abrir('explorer', { local: 'meu-computador' })
    else if (ic.id === 'meus-documentos') sis.abrir('explorer', { local: 'C:\\Meus documentos' })
    else if (ic.id === 'ie') sis.abrir('ie')
    else if (ic.id === 'lixeira') sis.abrir('explorer', { local: 'lixeira' })
    else if (ic.id === 'minado') sis.abrir('minado')
    else if (ic.id === 'dos') sis.abrir('dos')
    else if (ic.id === 'rede') sis.msg({ titulo: 'Ambiente de rede', texto: 'Não é possível procurar na rede.\n\nA rede não está acessível.', icone: 'erro' })
    else if (ic.id === 'soudev') window.location.href = '/apps/windows-98'
    else sis.abrirArquivo(ic.caminho)
  }

  const excluirSel = async (ids = sel) => {
    const caminhos = posicoes.filter((p) => ids.includes(p.id) && p.arquivo).map((p) => p.caminho)
    const fixos = ids.filter((id) => !id.startsWith('arq:'))
    if (fixos.length && !caminhos.length) {
      if (fixos.includes('lixeira') || fixos.includes('meu-computador')) sis.msg({ titulo: 'Erro ao excluir', texto: 'Este item não pode ser excluído: ele faz parte do Windows.', icone: 'erro' })
      return
    }
    if (await sis.excluirComConfirmacao(caminhos)) setSel([])
  }

  const organizar = () => sis.mudarConfig((c) => ({ ...c, posicoes: {} }))

  const novo = (tipo) => {
    const nome = sis.novoItem(MESA, tipo)
    if (!nome) return
    const id = `arq:${nome}`
    setSel([id])
    setRenomeando(id)
  }

  const menuVazio = (e) => {
    e.preventDefault()
    setSel([])
    setMenuMesa({
      x: e.clientX,
      y: e.clientY,
      itens: [
        { rotulo: '&Active Desktop', sub: [{ rotulo: '&Exibir como página da Web', desabilitado: true }] },
        { sep: true },
        { rotulo: '&Organizar ícones', sub: [{ rotulo: 'Por &nome', acao: organizar }, { rotulo: 'Por &tipo', acao: organizar }, { sep: true }, { rotulo: 'Organização &automática', desabilitado: true }] },
        { rotulo: 'A&linhar ícones', acao: organizar },
        { sep: true },
        { rotulo: 'A&tualizar', acao: () => setSel([]) },
        { sep: true },
        { rotulo: '&Colar', desabilitado: true },
        { rotulo: 'Colar a&talho', desabilitado: true },
        { sep: true },
        {
          rotulo: '&Novo',
          sub: [
            { rotulo: '&Pasta', icone: 'pasta', acao: () => novo('pasta') },
            { rotulo: '&Atalho', icone: 'aplicativo', desabilitado: true },
            { sep: true },
            { rotulo: 'Documento de &texto', icone: 'texto', acao: () => novo('texto') },
            { rotulo: '&Imagem de bitmap', icone: 'imagem', acao: () => novo('imagem') },
          ],
        },
        { sep: true },
        { rotulo: 'P&ropriedades', acao: () => sis.abrir('video') },
      ],
    })
  }

  const menuIcone = (e, ic) => {
    e.preventDefault()
    e.stopPropagation()
    if (!sel.includes(ic.id)) setSel([ic.id])
    const base = [{ rotulo: '&Abrir', acao: () => abrirIcone(ic) }]
    let itens
    if (ic.id === 'lixeira') itens = [...base, { rotulo: '&Explorar', acao: () => abrirIcone(ic) }, { rotulo: 'E&svaziar Lixeira', desabilitado: !lixeiraCheia, acao: () => sis.esvaziarLixeira() }, { sep: true }, { rotulo: 'P&ropriedades', desabilitado: true }]
    else if (ic.id === 'meu-computador') itens = [...base, { rotulo: '&Explorar', acao: () => sis.abrir('explorer', { local: 'C:\\' }) }, { sep: true }, { rotulo: 'P&ropriedades', acao: () => sis.abrir('sistema') }]
    else if (ic.arquivo)
      itens = [...base, { sep: true }, { rotulo: '&Excluir', acao: () => excluirSel([ic.id]) }, { rotulo: 'Re&nomear', acao: () => setRenomeando(ic.id) }, { sep: true }, { rotulo: 'P&ropriedades', acao: () => sis.abrir('propriedades', { caminho: ic.caminho }) }]
    else if (ic.id === 'meus-documentos') itens = [...base, { rotulo: '&Explorar', acao: () => abrirIcone(ic) }, { sep: true }, { rotulo: 'P&ropriedades', acao: () => sis.abrir('propriedades', { caminho: 'C:\\Meus documentos' }) }]
    else itens = [...base, { sep: true }, { rotulo: 'P&ropriedades', desabilitado: ic.id !== 'ie', acao: () => sis.abrir('sobre', { programa: 'Internet Explorer', icone: 'internet' }) }]
    setMenuMesa({ x: e.clientX, y: e.clientY, itens })
  }

  /* ---- ponteiro: selecionar, arrastar ícones e laço de seleção ---- */
  const baixarIcone = (e, ic) => {
    if (e.button !== 0) return
    e.stopPropagation()
    desfocar()
    let ids = sel
    if (e.ctrlKey) ids = sel.includes(ic.id) ? sel.filter((x) => x !== ic.id) : [...sel, ic.id]
    else if (!sel.includes(ic.id)) ids = [ic.id]
    setSel(ids)
    e.currentTarget.setPointerCapture(e.pointerId)
    gesto.current = { tipo: 'icone', ic, ids, px: e.clientX, py: e.clientY, mexeu: false, toque: e.pointerType === 'touch' }
  }

  const baixarVazio = (e) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return
    desfocar()
    setSel([])
    setRenomeando(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    gesto.current = { tipo: 'laco', px: e.clientX, py: e.clientY }
  }

  const mover = (e) => {
    const g = gesto.current
    if (!g) return
    const dx = e.clientX - g.px
    const dy = e.clientY - g.py
    if (g.tipo === 'icone') {
      if (!g.mexeu && Math.abs(dx) + Math.abs(dy) < 5) return
      g.mexeu = true
      setArrastando({ ids: g.ids, dx, dy })
    } else {
      const r = { x: Math.min(g.px, e.clientX), y: Math.min(g.py, e.clientY), w: Math.abs(dx), h: Math.abs(dy) }
      setLaco(r)
      setSel(posicoes.filter((p) => p.x < r.x + r.w && p.x + CELULA.w > r.x && p.y < r.y + r.h && p.y + 60 > r.y).map((p) => p.id))
    }
  }

  const soltar = (e) => {
    const g = gesto.current
    gesto.current = null
    setLaco(null)
    if (!g || g.tipo !== 'icone') return
    if (!g.mexeu) {
      setArrastando(null)
      if (g.toque) abrirIcone(g.ic) // no toque, um toque abre (como no "clique simples" do 98)
      return
    }
    const dx = e.clientX - g.px
    const dy = e.clientY - g.py
    setArrastando(null)
    // Soltar arquivos em cima da Lixeira manda para a Lixeira.
    const lixeira = posicoes.find((p) => p.id === 'lixeira')
    if (lixeira && e.clientX >= lixeira.x && e.clientX <= lixeira.x + CELULA.w && e.clientY >= lixeira.y && e.clientY <= lixeira.y + 60 && !g.ids.includes('lixeira')) {
      excluirSel(g.ids)
      return
    }
    sis.mudarConfig((c) => {
      const novas = { ...c.posicoes }
      for (const p of posicoes)
        if (g.ids.includes(p.id)) novas[p.id] = { x: Math.max(0, Math.min(area.largura - CELULA.w, p.x + dx)), y: Math.max(0, Math.min(area.altura - CELULA.h, p.y + dy)) }
      // Ícones que ainda estão na posição padrão ficam fixos onde estão, para não pularem.
      posicoes.forEach((p) => {
        if (!novas[p.id]) novas[p.id] = { x: p.x, y: p.y }
      })
      return { ...c, posicoes: novas }
    })
  }

  /* ---- teclado da área de trabalho (quando nenhuma janela está ativa) ---- */
  useEffect(() => {
    if (ativa) return
    const f = (e) => {
      if (renomeando || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Delete' && sel.length) excluirSel()
      else if (e.key === 'F2' && sel.length === 1 && sel[0].startsWith('arq:')) {
        e.preventDefault()
        setRenomeando(sel[0])
      } else if (e.key === 'Enter' && sel.length) posicoes.filter((p) => sel.includes(p.id)).forEach(abrirIcone)
      else if (e.key === 'F5') {
        e.preventDefault()
        setSel([])
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  const terminarRenomear = (ic) => async (valor) => {
    setRenomeando(null)
    if (valor === null || valor === ic.nomeReal) return
    const novo = await sis.renomearItem(ic.caminho, valor)
    if (novo) {
      const antiga = sis.config.posicoes?.[ic.id]
      if (antiga) sis.mudarConfig((c) => ({ ...c, posicoes: { ...c.posicoes, [`arq:${novo}`]: antiga } }))
      setSel([`arq:${novo}`])
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }} onPointerDown={baixarVazio} onPointerMove={mover} onPointerUp={soltar} onContextMenu={menuVazio} data-testid="w98-area-icones">
      {posicoes.map((ic) => {
        const desloc = arrastando?.ids.includes(ic.id) ? arrastando : null
        return (
          <div
            key={ic.id}
            className={`w98-icone-mesa ${sel.includes(ic.id) ? 'selecionado' : ''}`}
            style={{ left: ic.x + (desloc?.dx || 0), top: ic.y + (desloc?.dy || 0), opacity: desloc ? 0.6 : 1 }}
            data-icone={ic.nome}
            onPointerDown={(e) => baixarIcone(e, ic)}
            onPointerMove={mover}
            onPointerUp={soltar}
            onDoubleClick={() => abrirIcone(ic)}
            onContextMenu={(e) => menuIcone(e, ic)}
          >
            <Icone nome={ic.icone} />
            {renomeando === ic.id ? <Renomear it={{ nome: ic.nomeReal, tipo: ic.tipo }} aoTerminar={terminarRenomear(ic)} /> : <span className="w98-rotulo">{ic.nome}</span>}
          </div>
        )
      })}
      {laco && <div className="w98-laco" style={{ left: laco.x, top: laco.y, width: laco.w, height: laco.h }} />}
    </div>
  )
}

/* ---------- Barra de tarefas ---------- */
function Relogio({ aoAbrir }) {
  const [agora, setAgora] = useState(() => new Date())
  const [dica, setDica] = useState(false)
  const temporizador = useRef(null)
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 5000)
    return () => clearInterval(t)
  }, [])
  return (
    <button
      type="button"
      data-testid="w98-relogio"
      onDoubleClick={aoAbrir}
      onPointerEnter={() => {
        temporizador.current = setTimeout(() => setDica(true), 600)
      }}
      onPointerLeave={() => {
        clearTimeout(temporizador.current)
        setDica(false)
      }}
      style={{ position: 'relative' }}
    >
      {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      {dica && (
        <span className="w98-dica" style={{ right: 0, bottom: 26 }}>
          {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      )}
    </button>
  )
}

function BarraTarefas({ estado, dispatch, iniciar, setIniciar, abrirDataHora }) {
  const sis = useSistema()
  return (
    <div className="w98-barra" data-testid="w98-barra" onContextMenu={(e) => e.preventDefault()}>
      <button
        type="button"
        className={`w98-botao w98-iniciar ${iniciar ? 'apertado' : ''}`}
        data-testid="w98-iniciar"
        onPointerDown={(e) => {
          e.stopPropagation()
          setIniciar((x) => !x)
        }}
      >
        <Icone nome="logo" tamanho={16} />
        <span>Iniciar</span>
      </button>
      <span className="w98-separador-barra" />
      <span className="w98-separador-barra alca" />
      <div className="w98-rapido">
        <button type="button" title="Iniciar o Internet Explorer" onClick={() => sis.abrir('ie')}>
          <Icone nome="internet" tamanho={16} />
        </button>
        <button type="button" title="Mostrar área de trabalho" onClick={() => dispatch({ tipo: 'minimizarTodas' })} data-testid="w98-mostrar-mesa">
          <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
            <path d="M1 3h14v9H1z" fill="#008080" stroke="#000" />
            <path d="M3 5h5v4H3z" fill="#fff" />
            <path d="M5 13h6v2H5z" fill="#808080" />
          </svg>
        </button>
        <button type="button" title="Prompt do MS-DOS" onClick={() => sis.abrir('dos')}>
          <Icone nome="dos" tamanho={16} />
        </button>
      </div>
      <span className="w98-separador-barra" />
      <span className="w98-separador-barra alca" />
      <div className="w98-tarefas">
        {estado.ordem
          .slice()
          .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
          .map((id) => estado.janelas.find((j) => j.id === id))
          .filter(Boolean)
          .map((j) => (
            <button key={j.id} type="button" className={`w98-tarefa ${estado.ativa === j.id && !j.min ? 'ativa' : ''}`} data-tarefa={j.titulo} title={j.titulo} onClick={() => dispatch({ tipo: 'tarefa', id: j.id })}>
              {j.icone && <Icone nome={j.icone} tamanho={16} />}
              <span>{j.titulo}</span>
            </button>
          ))}
      </div>
      <div className="w98-bandeja">
        <span title="Volume">
          <Icone nome="alto" tamanho={16} />
        </span>
        <Relogio aoAbrir={abrirDataHora} />
      </div>
    </div>
  )
}

/* ---------- Menu Iniciar ---------- */
function MenuIniciar({ fechar, abrir, msg, logoff, desligar, recentes, abrirArquivo }) {
  useFecharFora(true, fechar)
  const ie = (url) => () => abrir('ie', { url })
  const itens = [
    { rotulo: 'Windows Update', icone: 'internet', grande: true, acao: () => msg({ titulo: 'Windows Update', texto: 'Este computador já está com todas as atualizações desta recriação.', icone: 'info' }) },
    { sep: true },
    {
      rotulo: '&Programas',
      icone: 'programas',
      grande: true,
      sub: [
        {
          rotulo: 'Acessórios',
          icone: 'programas',
          sub: [
            { rotulo: 'Jogos', icone: 'programas', sub: [{ rotulo: 'Campo minado', icone: 'minado', acao: () => abrir('minado') }] },
            { sep: true },
            { rotulo: 'Bloco de notas', icone: 'bloco', acao: () => abrir('bloco') },
            { rotulo: 'Calculadora', icone: 'calculadora', acao: () => abrir('calculadora') },
            { rotulo: 'Paint', icone: 'paint', acao: () => abrir('paint') },
          ],
        },
        { rotulo: 'Iniciar', icone: 'programas', sub: [{ rotulo: '(Vazio)', desabilitado: true }] },
        { rotulo: 'Internet Explorer', icone: 'internet', acao: () => abrir('ie') },
        { rotulo: 'Prompt do MS-DOS', icone: 'dos', acao: () => abrir('dos') },
        { rotulo: 'Windows Explorer', icone: 'pastaAberta', acao: () => abrir('explorer', { local: 'C:\\' }) },
        { sep: true },
        { rotulo: 'Voltar ao soudev', icone: 'soudev', acao: () => (window.location.href = '/apps/windows-98') },
      ],
    },
    {
      rotulo: '&Favoritos',
      icone: 'pasta',
      grande: true,
      sub: [
        { rotulo: 'soudev', icone: 'internet', acao: ie('/') },
        { rotulo: 'Ferramentas', icone: 'internet', acao: ie('/ferramentas') },
        { rotulo: 'Jogos', icone: 'internet', acao: ie('/jogos') },
        { rotulo: 'Apps', icone: 'internet', acao: ie('/apps') },
      ],
    },
    {
      rotulo: '&Documentos',
      icone: 'documentosMenu',
      grande: true,
      sub: [
        { rotulo: 'Meus documentos', icone: 'documentos', acao: () => abrir('explorer', { local: 'C:\\Meus documentos' }) },
        { sep: true },
        ...(recentes.length ? recentes.map((c) => ({ rotulo: nomeDe(c), icone: iconeDoArquivo(nomeDe(c), 'arquivo'), acao: () => abrirArquivo(c) })) : [{ rotulo: '(Vazio)', desabilitado: true }]),
      ],
    },
    {
      rotulo: '&Configurações',
      icone: 'configuracoes',
      grande: true,
      sub: [
        { rotulo: '&Painel de controle', icone: 'painel', acao: () => abrir('explorer', { local: 'painel' }) },
        { rotulo: '&Impressoras', icone: 'pasta', acao: () => msg({ titulo: 'Impressoras', texto: 'Nenhuma impressora está instalada.', icone: 'info' }) },
        { rotulo: '&Barra de tarefas e menu Iniciar...', icone: 'aplicativo', desabilitado: true },
        { sep: true },
        { rotulo: '&Vídeo', icone: 'video', acao: () => abrir('video') },
      ],
    },
    { rotulo: '&Ajuda', icone: 'ajuda', grande: true, acao: () => abrir('ajuda') },
    { rotulo: '&Executar...', icone: 'executar', grande: true, acao: () => abrir('executar') },
    { sep: true },
    { rotulo: 'Fazer &logoff de Visitante...', icone: 'logoff', grande: true, acao: logoff },
    { rotulo: '&Desligar...', icone: 'desligar', grande: true, acao: desligar },
  ]
  const faixa = (
    <div className="w98-iniciar-faixa" aria-hidden="true">
      <span>
        <b>Windows</b>
        <i>98</i>
      </span>
    </div>
  )
  return <MenuSuspenso itens={itens} x={2} y={0} ancoraBaixo={typeof window !== 'undefined' ? window.innerHeight - 26 : 600} aoFechar={fechar} classe="w98-iniciar-menu" faixa={faixa} testid="w98-menu-iniciar" />
}

/* ---------- Desligar o Windows ---------- */
function Desligar({ responder }) {
  const [opcao, setOpcao] = useState('desligar')
  return (
    <>
      <div className="w98-escurecer" />
      <div className="w98-janela ativa" role="dialog" aria-label="Desligar o Windows" data-testid="w98-desligar" style={{ zIndex: 8600, left: '50%', top: '42%', transform: 'translate(-50%, -50%)', width: 320 }}>
        <div className="w98-titulo">
          <span className="w98-titulo-texto">Desligar o Windows</span>
          <span className="w98-titulo-botoes">
            <button type="button" className="w98-titulo-botao fechar" aria-label="Fechar" onClick={() => responder(null)}>
              <svg width="8" height="7" viewBox="0 0 8 7" shapeRendering="crispEdges">
                <path d="M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0z" fill="currentColor" />
              </svg>
            </button>
          </span>
        </div>
        <form
          className="w98-dialogo"
          onSubmit={(e) => {
            e.preventDefault()
            responder(opcao)
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <Icone nome="desligar" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>O que você deseja que o computador faça?</span>
              {[
                ['desligar', '&Desligar'],
                ['reiniciar', '&Reiniciar'],
                ['dos', 'Reiniciar em modo &MS-DOS'],
              ].map(([v, r]) => (
                <label key={v} className="w98-radio">
                  <input type="radio" name="w98-desligar" checked={opcao === v} onChange={() => setOpcao(v)} />
                  {r.replace('&', '')}
                </label>
              ))}
            </div>
          </div>
          <div className="w98-botoes-direita" style={{ justifyContent: 'center' }}>
            <button type="submit" className="w98-botao padrao" data-botao="OK">
              <span>OK</span>
            </button>
            <button type="button" className="w98-botao" onClick={() => responder(null)}>
              <span>Cancelar</span>
            </button>
            <button type="button" className="w98-botao" disabled>
              <span>Ajuda</span>
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
