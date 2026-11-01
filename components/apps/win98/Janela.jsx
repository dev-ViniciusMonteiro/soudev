'use client'

// Moldura de janela do Windows 98: barra de título com degradê (azul ativa, cinza inativa), botões
// minimizar/maximizar/fechar, menu do sistema no ícone, arrastar e redimensionar com o contorno pontilhado.

import { useLayoutEffect, useRef, useState } from 'react'
import Icone from './icones'
import { MenuSuspenso, useFecharFora } from './Menu'

const Glifo = {
  min: <path d="M0 6h6v2H0z" />,
  max: <path d="M0 0h9v9H0zM1 2v6h7V2z" />,
  restaurar: <path d="M2 0h6v6H6v2H0V2h2zm1 2h4v3h-1V3H3zM1 4v3h4V4z" />,
  fechar: <path d="M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0z" />,
  ajuda: <path d="M1 0h4v1h1v3H5v1H4v2H2V4h1V3h1V1H2v1H0V1h1zM2 8h2v1H2z" />,
}

const Botao = ({ tipo, rotulo, onClick, disabled, className = '' }) => (
  <button
    type="button"
    className={`w98-titulo-botao ${className}`}
    aria-label={rotulo}
    title={rotulo}
    disabled={disabled}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={onClick}
  >
    <svg width={tipo === 'fechar' ? 8 : tipo === 'min' ? 6 : 9} height={tipo === 'min' ? 8 : tipo === 'ajuda' ? 9 : tipo === 'fechar' ? 7 : 9} viewBox={tipo === 'fechar' ? '0 0 8 7' : tipo === 'min' ? '0 0 6 8' : tipo === 'ajuda' ? '0 0 6 9' : '0 0 9 9'} shapeRendering="crispEdges">
      <g fill="currentColor">{Glifo[tipo]}</g>
    </svg>
  </button>
)

const ALCAS = ['c', 'b', 'e', 'd', 'ce', 'cd', 'be', 'bd']

export default function Janela({ janela, ativa, camada, area, dispatch, pedirFechar, dialogo = false, ajuda, children }) {
  const { id, titulo, icone, x, y, w, h, max, min, redimensionavel } = janela
  const [contorno, setContorno] = useState(null)
  const [menuSistema, setMenuSistema] = useState(null)
  const arrasto = useRef(null)
  const raiz = useRef(null)
  useFecharFora(!!menuSistema, () => setMenuSistema(null))

  // Diálogos nascem centralizados (o "Executar" fica no canto de baixo, perto do Iniciar).
  useLayoutEffect(() => {
    const el = raiz.current
    if (!el || !(janela.centralizar || janela.posicao)) return
    const r = el.getBoundingClientRect()
    const nx = janela.posicao === 'executar' ? 4 : Math.max(0, (area.largura - r.width) / 2)
    const ny = janela.posicao === 'executar' ? Math.max(0, area.altura - r.height - 4) : Math.max(0, (area.altura - r.height) / 2.4)
    dispatch({ tipo: 'mover', id, x: nx, y: ny })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const automatico = janela.ajustar && !max
  const geo = max ? { x: -2, y: -2, w: area.largura + 4, h: area.altura + 4 } : { x, y, w: automatico ? undefined : w, h: automatico ? undefined : h }

  // Arrastar pela barra de título: mostra só o contorno e move ao soltar.
  const comecarMover = (e) => {
    if (e.button !== 0 || max) return
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { tipo: 'mover', px: e.clientX, py: e.clientY, x, y, w: raiz.current.offsetWidth, h: raiz.current.offsetHeight, mexeu: false }
  }

  const comecarRedimensionar = (alca) => (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { tipo: alca, px: e.clientX, py: e.clientY, x, y, w, h, mexeu: false }
    dispatch({ tipo: 'focar', id })
  }

  const mover = (e) => {
    const a = arrasto.current
    if (!a) return
    const dx = e.clientX - a.px
    const dy = e.clientY - a.py
    if (!a.mexeu && Math.abs(dx) + Math.abs(dy) < 3) return
    a.mexeu = true
    if (a.tipo === 'mover') {
      // O título nunca some atrás da barra de tarefas nem acima da tela.
      const ny = Math.min(Math.max(0, a.y + dy), area.altura - 20)
      const nx = Math.min(Math.max(a.x + dx, 40 - a.w), area.largura - 40)
      setContorno({ x: nx, y: ny, w: a.w, h: a.h })
      return
    }
    let { x: nx, y: ny, w: nw, h: nh } = a
    if (a.tipo.includes('d')) nw = Math.max(120, a.w + dx)
    if (a.tipo.includes('b')) nh = Math.max(60, a.h + dy)
    if (a.tipo.includes('e')) {
      nw = Math.max(120, a.w - dx)
      nx = a.x + a.w - nw
    }
    if (a.tipo === 'c' || a.tipo.startsWith('c')) {
      nh = Math.max(60, a.h - dy)
      ny = Math.max(0, a.y + a.h - nh)
    }
    setContorno({ x: nx, y: ny, w: nw, h: nh })
  }

  const soltar = () => {
    const a = arrasto.current
    arrasto.current = null
    if (!a || !a.mexeu || !contorno) {
      setContorno(null)
      return
    }
    if (a.tipo === 'mover') dispatch({ tipo: 'mover', id, x: contorno.x, y: contorno.y })
    else dispatch({ tipo: 'redimensionar', id, x: contorno.x, y: contorno.y, w: contorno.w, h: contorno.h })
    setContorno(null)
  }

  const itensSistema = [
    { rotulo: '&Restaurar', desabilitado: !max, acao: () => dispatch({ tipo: 'maximizar', id }) },
    { rotulo: '&Mover', desabilitado: max },
    { rotulo: '&Tamanho', desabilitado: max || !redimensionavel },
    { rotulo: 'Mi&nimizar', desabilitado: dialogo, acao: () => dispatch({ tipo: 'minimizar', id }) },
    { rotulo: 'Ma&ximizar', desabilitado: max || !redimensionavel, acao: () => dispatch({ tipo: 'maximizar', id }) },
    { sep: true },
    { rotulo: '&Fechar', atalho: 'Alt+F4', acao: pedirFechar },
  ]

  return (
    <>
      <div
        ref={raiz}
        className={`w98-janela ${ativa ? 'ativa' : ''} ${max ? 'maximizada' : ''}`}
        style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h, zIndex: 10 + camada, display: min ? 'none' : undefined }}
        data-janela={janela.app}
        data-id={id}
        role="dialog"
        aria-label={titulo}
        onPointerDownCapture={() => !ativa && dispatch({ tipo: 'focar', id })}
      >
        <div
          className="w98-titulo"
          onPointerDown={comecarMover}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onDoubleClick={() => redimensionavel && dispatch({ tipo: 'maximizar', id })}
        >
          {icone && !dialogo && (
            <span
              onPointerDown={(e) => {
                e.stopPropagation()
                const r = e.currentTarget.getBoundingClientRect()
                setMenuSistema({ x: r.left, y: r.bottom + 1 })
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                pedirFechar()
              }}
            >
              <Icone nome={icone} tamanho={16} />
            </span>
          )}
          <span className="w98-titulo-texto">{titulo}</span>
          <span className="w98-titulo-botoes">
            {ajuda && <Botao tipo="ajuda" rotulo="Ajuda" onClick={ajuda} />}
            {!dialogo && (
              <>
                <Botao tipo="min" rotulo="Minimizar" onClick={() => dispatch({ tipo: 'minimizar', id })} />
                <Botao tipo={max ? 'restaurar' : 'max'} rotulo={max ? 'Restaurar' : 'Maximizar'} disabled={!redimensionavel} onClick={() => dispatch({ tipo: 'maximizar', id })} />
              </>
            )}
            <Botao tipo="fechar" rotulo="Fechar" className="fechar" onClick={pedirFechar} />
          </span>
        </div>
        <div className="w98-corpo">{children}</div>
        {redimensionavel &&
          !max &&
          ALCAS.map((a) => <div key={a} className={`w98-alca ${a}`} onPointerDown={comecarRedimensionar(a)} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} />)}
      </div>
      {contorno && <div className="w98-contorno" style={{ left: contorno.x, top: contorno.y, width: contorno.w, height: contorno.h }} />}
      {menuSistema && <MenuSuspenso itens={itensSistema} x={menuSistema.x} y={menuSistema.y} aoFechar={() => setMenuSistema(null)} />}
    </>
  )
}
