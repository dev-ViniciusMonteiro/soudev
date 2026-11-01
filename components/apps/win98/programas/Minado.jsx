'use client'

// Campo Minado: painel com contador de minas e relógio em LED, a carinha (normal, susto, morta, de óculos),
// níveis Iniciante/Intermediário/Avançado/Personalizado, marcas (?), recordes por nível e acorde.
// No toque: toque abre, toque longo marca bandeira.

import { useEffect, useRef, useState } from 'react'
import { MenuBarra } from '../Menu'
import { useJanela, useSistema } from '../sistema'
import { NIVEIS, acorde, marcar, minasRestantes, novoJogo, revelar, segundosDeJogo, vizinhas } from '@/lib/win98/campo-minado'

// Segmentos do LED (a, b, c, d, e, f, g) de cada dígito.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' }
const FORMAS = {
  a: 'M2 1h9l-2 2H4z',
  b: 'M11.5 1.5v9l-2-1.5V3.5z',
  c: 'M11.5 12.5v9l-2-2v-5.5z',
  d: 'M2 22h9l-2-2H4z',
  e: 'M1.5 12.5v9l2-2v-5.5z',
  f: 'M1.5 1.5v9l2-1.5V3.5z',
  g: 'M2.5 11.5l1.5-1h5l1.5 1-1.5 1H4z',
}

function Led({ valor }) {
  const v = Math.max(-99, Math.min(999, valor))
  const txt = v < 0 ? '-' + String(Math.abs(v)).padStart(2, '0') : String(v).padStart(3, '0')
  return (
    <div className="w98-led" aria-label={String(valor)}>
      {[...txt].map((ch, i) => (
        <svg key={i} width="13" height="23" viewBox="0 0 13 23">
          {Object.entries(FORMAS).map(([s, d]) => (
            <path key={s} d={d} fill={SEG[ch]?.includes(s) ? '#ff0000' : '#400000'} />
          ))}
        </svg>
      ))}
    </div>
  )
}

function Carinha({ humor }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" shapeRendering="crispEdges">
      <circle cx="8.5" cy="8.5" r="8" fill="#000" />
      <circle cx="8.5" cy="8.5" r="7" fill="#ffff00" />
      {humor === 'morta' ? (
        <path d="M4 5l3 3M7 5l-3 3M10 5l3 3M13 5l-3 3M5 13q3.5-3 7 0" stroke="#000" fill="none" strokeWidth="1.2" />
      ) : humor === 'oculos' ? (
        <>
          <path d="M2 6h13v1H2z M3 6h5v3H3z M9 6h5v3H9z" fill="#000" />
          <path d="M5 11q3.5 3 7 0" stroke="#000" fill="none" strokeWidth="1.2" />
        </>
      ) : humor === 'susto' ? (
        <>
          <rect x="5" y="5" width="2" height="3" fill="#000" />
          <rect x="10" y="5" width="2" height="3" fill="#000" />
          <circle cx="8.5" cy="11.5" r="2" fill="none" stroke="#000" strokeWidth="1.2" />
        </>
      ) : (
        <>
          <rect x="5" y="5" width="2" height="2" fill="#000" />
          <rect x="10" y="5" width="2" height="2" fill="#000" />
          <path d="M5 10q3.5 4 7 0" stroke="#000" fill="none" strokeWidth="1.2" />
        </>
      )}
    </svg>
  )
}

const Mina = ({ errada }) => (
  <svg width="13" height="13" viewBox="0 0 13 13" shapeRendering="crispEdges">
    <path d="M6 0h1v13H6zM0 6h13v1H0zM2 2h1v1H2zM10 2h1v1h-1zM2 10h1v1H2zM10 10h1v1h-1z" fill="#000" />
    <circle cx="6.5" cy="6.5" r="4" fill="#000" />
    <rect x="4" y="4" width="2" height="2" fill="#fff" />
    {errada && <path d="M1 1l11 11M12 1L1 12" stroke="#f00" strokeWidth="1.5" />}
  </svg>
)

const Bandeira = () => (
  <svg width="11" height="12" viewBox="0 0 11 12" shapeRendering="crispEdges">
    <path d="M5 1h1v6H5z" fill="#f00" />
    <path d="M2 1h4v5H2zM4 0h2v1H4z" fill="#f00" />
    <path d="M5 6h1v3H5zM3 9h5v1H3zM1 10h9v2H1z" fill="#000" />
  </svg>
)

const nivelDe = (config) => (config.nivelMinado === 'personalizado' && config.personalizado ? config.personalizado : NIVEIS[config.nivelMinado] || NIVEIS.iniciante)

export default function Minado() {
  const sis = useSistema()
  const jan = useJanela()
  const [jogo, setJogo] = useState(() => novoJogo(nivelDe(sis.config)))
  const [apertada, setApertada] = useState(null) // índice da casa apertada (botão segurado)
  const [acordeAtivo, setAcordeAtivo] = useState(false)
  const [, setTique] = useState(0)
  const botoes = useRef(0)
  const toque = useRef(null)
  const config = sis.config
  const marcas = config.marcasMinado !== false
  const cores = config.coresMinado !== false

  const reiniciar = (nivel = nivelDe(sis.config)) => {
    setJogo(novoJogo(nivel))
    setApertada(null)
  }

  useEffect(() => {
    if (jogo.estado !== 'jogando') return
    const t = setInterval(() => setTique((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [jogo.estado])

  useEffect(() => {
    if (!jan.ativa) return
    const f = (e) => {
      if (e.key === 'F2') {
        e.preventDefault()
        reiniciar()
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  // Recorde ao ganhar num nível padrão.
  const nivelAtual = config.nivelMinado
  useEffect(() => {
    if (jogo.estado !== 'ganhou' || !NIVEIS[nivelAtual]) return
    const tempo = segundosDeJogo(jogo)
    const atual = config.recordes?.[nivelAtual]
    if (atual && atual.tempo <= tempo) return
    sis
      .pedirTexto({ titulo: 'Campo minado', texto: `Você tem o tempo mais rápido para o nível ${NIVEIS[nivelAtual].nome.toLowerCase()}.\nDigite seu nome.`, valor: 'Anônimo', botao: 'OK' })
      .then((nome) => {
        sis.mudarConfig((c) => ({ ...c, recordes: { ...c.recordes, [nivelAtual]: { tempo, nome: (nome || 'Anônimo').slice(0, 32) } } }))
        sis.abrir('recordes')
      })
  }, [jogo.estado]) // eslint-disable-line react-hooks/exhaustive-deps

  const escolherNivel = (n) => {
    sis.mudarConfig((c) => ({ ...c, nivelMinado: n }))
    reiniciar(NIVEIS[n])
  }

  const personalizado = async () => {
    const atual = nivelDe(sis.config)
    const r = await sis.abrirEsperar('minadoPersonalizado', { valores: { linhas: atual.linhas, colunas: atual.colunas, minas: atual.minas } })
    if (!r) return
    const linhas = Math.min(24, Math.max(9, r.linhas | 0))
    const colunas = Math.min(30, Math.max(9, r.colunas | 0))
    const minas = Math.min((linhas - 1) * (colunas - 1), Math.max(10, r.minas | 0))
    const nivel = { nome: 'Personalizado', linhas, colunas, minas }
    sis.mudarConfig((c) => ({ ...c, nivelMinado: 'personalizado', personalizado: nivel }))
    reiniciar(nivel)
  }

  const menus = [
    {
      rotulo: '&Jogo',
      itens: [
        { rotulo: '&Novo', atalho: 'F2', acao: () => reiniciar() },
        { sep: true },
        { rotulo: '&Iniciante', marcado: nivelAtual === 'iniciante', acao: () => escolherNivel('iniciante') },
        { rotulo: 'I&ntermediário', marcado: nivelAtual === 'intermediario', acao: () => escolherNivel('intermediario') },
        { rotulo: '&Avançado', marcado: nivelAtual === 'avancado', acao: () => escolherNivel('avancado') },
        { rotulo: '&Personalizado...', marcado: nivelAtual === 'personalizado', acao: personalizado },
        { sep: true },
        { rotulo: '&Marcas (?)', marcado: marcas, acao: () => sis.mudarConfig((c) => ({ ...c, marcasMinado: !marcas })) },
        { rotulo: '&Cor', marcado: cores, acao: () => sis.mudarConfig((c) => ({ ...c, coresMinado: !cores })) },
        { sep: true },
        { rotulo: '&Melhores tempos...', acao: () => sis.abrir('recordes') },
        { sep: true },
        { rotulo: 'Sai&r', acao: () => jan.fechar() },
      ],
    },
    { rotulo: '&Ajuda', itens: [{ rotulo: '&Conteúdo', atalho: 'F1', acao: () => sis.abrir('ajuda') }, { sep: true }, { rotulo: '&Sobre o Campo minado...', acao: () => sis.abrir('sobre', { programa: 'Campo minado', icone: 'minado' }) }] },
  ]

  const fim = jogo.estado === 'ganhou' || jogo.estado === 'perdeu'
  const humor = jogo.estado === 'perdeu' ? 'morta' : jogo.estado === 'ganhou' ? 'oculos' : apertada !== null ? 'susto' : 'feliz'
  const apertadas = new Set(apertada === null ? [] : acordeAtivo ? [apertada, ...vizinhas(jogo, apertada)] : [apertada])

  const indiceDe = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-casa]')
    return el ? Number(el.dataset.casa) : null
  }

  const baixar = (e, i) => {
    if (fim) return
    e.preventDefault()
    botoes.current = e.buttons
    e.currentTarget.parentElement.setPointerCapture?.(e.pointerId)
    if (e.pointerType === 'touch') {
      setApertada(i)
      toque.current = setTimeout(() => {
        toque.current = 'marcou'
        setJogo((j) => marcar(j, i, marcas))
        setApertada(null)
        navigator.vibrate?.(30)
      }, 450)
      return
    }
    if (e.button === 2 && !(e.buttons & 1)) {
      setJogo((j) => marcar(j, i, marcas))
      return
    }
    setAcordeAtivo(e.button === 1 || (e.buttons & 3) === 3)
    setApertada(i)
  }

  const moverPonteiro = (e) => {
    if (apertada === null || e.pointerType === 'touch') return
    const i = indiceDe(e)
    if (i !== null && i !== apertada) setApertada(i)
    if ((e.buttons & 3) === 3) setAcordeAtivo(true)
  }

  const soltar = (e) => {
    if (e.pointerType === 'touch') {
      const marcou = toque.current === 'marcou'
      clearTimeout(toque.current)
      toque.current = null
      if (!marcou && apertada !== null) {
        const c = jogo.casas[apertada]
        setJogo((j) => (c.aberta ? acorde(j, apertada) : revelar(j, apertada)))
      }
      setApertada(null)
      return
    }
    if (apertada === null) return
    const i = apertada
    if (acordeAtivo) setJogo((j) => acorde(j, i))
    else if (e.button === 0) setJogo((j) => revelar(j, i))
    setApertada(null)
    setAcordeAtivo(false)
  }

  const conteudo = (c) => {
    if (c.aberta) {
      if (c.mina) return <Mina />
      return c.vizinhas || ''
    }
    if (fim && jogo.estado === 'perdeu' && c.marca === 'bandeira' && !c.mina) return <Mina errada />
    if (c.marca === 'bandeira') return <Bandeira />
    if (c.marca === 'interrogacao') return <span style={{ color: '#000' }}>?</span>
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <MenuBarra menus={menus} />
      <div className={`w98-minado ${cores ? '' : 'sem-cor'}`}>
        <div className="w98-minado-painel">
          <Led valor={minasRestantes(jogo)} />
          <button type="button" className="w98-carinha" aria-label="Novo jogo" data-humor={humor} onClick={() => reiniciar()}>
            <Carinha humor={humor} />
          </button>
          <Led valor={segundosDeJogo(jogo)} />
        </div>
        <div
          className="w98-minado-grade"
          style={{ gridTemplateColumns: `repeat(${jogo.colunas}, 16px)` }}
          data-estado={jogo.estado}
          data-testid="w98-campo"
          onContextMenu={(e) => e.preventDefault()}
          onPointerMove={moverPonteiro}
          onPointerUp={soltar}
          onPointerCancel={() => {
            clearTimeout(toque.current)
            setApertada(null)
          }}
          onPointerLeave={(e) => e.pointerType !== 'touch' && apertada !== null && !(e.buttons & 3) && setApertada(null)}
        >
          {jogo.casas.map((c, i) => {
            const aberta = c.aberta
            const pressionada = !c.aberta && !c.marca && apertadas.has(i)
            const erroBandeira = fim && jogo.estado === 'perdeu' && c.marca === 'bandeira' && !c.mina
            return (
              <div
                key={i}
                data-casa={i}
                className={`w98-casa ${aberta || erroBandeira ? 'aberta' : ''} ${pressionada ? 'apertada' : ''} ${jogo.explodiu === i ? 'explodiu' : ''} ${c.aberta && !c.mina && c.vizinhas ? 'n' + c.vizinhas : ''}`}
                onPointerDown={(e) => baixar(e, i)}
              >
                {conteudo(c)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------- Diálogos do Campo minado ---------- */
export function Personalizado({ valores, responder }) {
  const jan = useJanela()
  const [v, setV] = useState(valores)
  const respondeu = useRef(false)
  useEffect(() => {
    jan.registrarFechar(() => {
      if (!respondeu.current) responder?.(null)
      return true
    })
  }, [jan, responder])
  const campo = (k, r) => (
    <label className="w98-linha" style={{ justifyContent: 'space-between' }}>
      <span>{r}</span>
      <input className="w98-campo" style={{ width: 52 }} inputMode="numeric" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value.replace(/\D/g, '') })} aria-label={r.replace('&', '')} />
    </label>
  )
  return (
    <form
      className="w98-dialogo"
      style={{ width: 230, flexDirection: 'row', alignItems: 'center', gap: 16 }}
      onSubmit={(e) => {
        e.preventDefault()
        respondeu.current = true
        responder?.({ linhas: Number(v.linhas), colunas: Number(v.colunas), minas: Number(v.minas) })
        jan.fecharJa()
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {campo('linhas', 'Altura:')}
        {campo('colunas', 'Largura:')}
        {campo('minas', 'Minas:')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="submit" className="w98-botao padrao">
          <span>OK</span>
        </button>
        <button type="button" className="w98-botao" onClick={() => jan.fechar()}>
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  )
}

export function Recordes() {
  const sis = useSistema()
  const jan = useJanela()
  const r = sis.config.recordes || {}
  return (
    <div className="w98-dialogo" style={{ width: 300 }}>
      <fieldset className="w98-fieldset">
        <legend>Melhores tempos</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '6px 12px' }} data-testid="w98-recordes">
          {Object.entries(NIVEIS).map(([k, n]) => (
            <div key={k} style={{ display: 'contents' }}>
              <span>{n.nome}:</span>
              <span>{r[k]?.tempo ?? 999} segundos</span>
              <span>{r[k]?.nome ?? 'Anônimo'}</span>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="w98-botoes-direita" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="w98-botao" onClick={() => sis.mudarConfig((c) => ({ ...c, recordes: {} }))}>
          <span>
            <u>R</u>edefinir pontuações
          </span>
        </button>
        <button type="button" className="w98-botao padrao" onClick={() => jan.fecharJa()}>
          <span>OK</span>
        </button>
      </div>
    </div>
  )
}
