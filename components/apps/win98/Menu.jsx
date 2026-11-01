'use client'

// Menus do Windows 98: barra de menus das janelas, menu de contexto e submenus que abrem ao passar o mouse.
// Itens: { rotulo: '&Abrir', acao, atalho, marcado: true|'ponto', desabilitado, sub: [...], icone, grande } ou { sep: true }.
// O "&" sublinha a letra de acesso, como no original (no 98 o sublinhado aparece sempre).

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icone from './icones'

export function Rotulo({ texto }) {
  const i = texto.indexOf('&')
  if (i < 0) return texto
  return (
    <>
      {texto.slice(0, i)}
      <u>{texto[i + 1]}</u>
      {texto.slice(i + 2)}
    </>
  )
}

const semE = (t) => t.replace('&', '')

const Seta = () => (
  <svg width="4" height="7" viewBox="0 0 4 7" aria-hidden="true">
    <path d="M0 0h1v1h1v1h1v1h1v1H3v1H2v1H1v1H0z" fill="currentColor" />
  </svg>
)

export function MenuSuspenso({ itens, x, y, aoFechar, larguraPai = 0, classe = '', faixa = null, testid, ancoraBaixo }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x, y })
  const [aberto, setAberto] = useState(-1)
  const temporizador = useRef(null)

  // Não deixa o menu sair da tela: abre para a esquerda/para cima quando precisa.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let nx = x
    let ny = y
    if (nx + r.width > window.innerWidth) nx = Math.max(0, larguraPai ? x - larguraPai - r.width : window.innerWidth - r.width)
    if (ancoraBaixo !== undefined) ny = Math.max(0, ancoraBaixo - r.height)
    else if (ny + r.height > window.innerHeight) ny = Math.max(0, window.innerHeight - r.height)
    setPos({ x: nx, y: ny })
  }, [x, y, larguraPai, ancoraBaixo])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  const passar = (i, item) => {
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setAberto(item.sub && !item.desabilitado ? i : -1), item.sub ? 120 : 250)
  }

  const escolher = (item, i) => {
    if (item.desabilitado) return
    if (item.sub) {
      clearTimeout(temporizador.current)
      setAberto(i)
      return
    }
    aoFechar?.(true)
    item.acao?.()
  }

  return (
    <div
      ref={ref}
      className={`w98-menu ${classe}`}
      style={{ position: 'fixed', left: pos.x, top: pos.y }}
      role="menu"
      data-testid={testid}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {faixa}
      <div className={faixa ? 'w98-iniciar-itens' : undefined}>
        {itens.map((item, i) =>
          item.sep ? (
            <div key={i} className="w98-menu-sep" role="separator" />
          ) : (
            <ItemMenu key={i} item={item} realce={aberto === i} aoPassar={() => passar(i, item)} aoEscolher={() => escolher(item, i)}>
              {aberto === i && item.sub && <SubMenu item={item} indice={i} paiRef={ref} aoFechar={aoFechar} />}
            </ItemMenu>
          ),
        )}
      </div>
    </div>
  )
}

function ItemMenu({ item, realce, aoPassar, aoEscolher, children }) {
  const tipo = item.grande ? 'grande' : item.icone ? 'icone' : ''
  return (
    <>
      <button
        type="button"
        className={`w98-menu-item ${tipo} ${realce ? 'realce' : ''}`}
        role="menuitem"
        disabled={item.desabilitado}
        aria-haspopup={item.sub ? 'menu' : undefined}
        data-item={semE(item.rotulo)}
        onPointerEnter={aoPassar}
        onClick={aoEscolher}
      >
        {item.icone ? (
          <Icone nome={item.icone} tamanho={item.grande ? 32 : 16} />
        ) : (
          <span className="w98-marca">{item.marcado === 'ponto' ? '●' : item.marcado ? '✓' : ''}</span>
        )}
        <span className="w98-rotulo">
          <Rotulo texto={item.rotulo} />
        </span>
        {item.atalho && <span className="w98-atalho">{item.atalho}</span>}
        <span className="w98-seta">{item.sub ? <Seta /> : null}</span>
      </button>
      {children}
    </>
  )
}

function SubMenu({ item, indice, paiRef, aoFechar }) {
  const [pos, setPos] = useState(null)
  useLayoutEffect(() => {
    const pai = paiRef.current
    if (!pai) return
    const botao = pai.querySelectorAll('.w98-menu-item')[contarAte(pai, indice)]
    const rp = pai.getBoundingClientRect()
    const rb = botao?.getBoundingClientRect()
    setPos({ x: rp.right - 3, y: (rb?.top ?? rp.top) - 3, largura: rp.width })
  }, [paiRef, indice])
  if (!pos) return null
  return <MenuSuspenso itens={item.sub} x={pos.x} y={pos.y} larguraPai={pos.largura} aoFechar={aoFechar} />
}

// Índice do botão entre os itens (os separadores não são botões).
function contarAte(pai, indice) {
  const filhos = [...pai.querySelector(':scope > div')?.children || []]
  let n = -1
  for (let i = 0; i <= indice && i < filhos.length; i++) if (filhos[i].classList.contains('w98-menu-item')) n++
  return n
}

/** Fecha o menu ao clicar fora dele. */
export function useFecharFora(aberto, fechar) {
  useEffect(() => {
    if (!aberto) return
    const f = () => fechar()
    const tecla = (e) => e.key === 'Escape' && fechar()
    window.addEventListener('pointerdown', f)
    window.addEventListener('keydown', tecla)
    window.addEventListener('blur', f)
    return () => {
      window.removeEventListener('pointerdown', f)
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('blur', f)
    }
  }, [aberto, fechar])
}

/** Barra de menus de uma janela (Arquivo, Editar, …). */
export function MenuBarra({ menus }) {
  const [aberto, setAberto] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const fechar = () => setAberto(null)
  useFecharFora(aberto !== null, fechar)

  const abrir = (i, el) => {
    const r = el.getBoundingClientRect()
    setPos({ x: r.left, y: r.bottom })
    setAberto(i)
  }

  return (
    <div className="w98-menubar" role="menubar" onPointerDown={(e) => e.stopPropagation()}>
      {menus.map((m, i) => (
        <button
          key={m.rotulo}
          type="button"
          className={aberto === i ? 'aberto' : ''}
          data-menu={semE(m.rotulo)}
          onPointerDown={(e) => {
            e.stopPropagation()
            if (aberto === i) fechar()
            else abrir(i, e.currentTarget)
          }}
          onPointerEnter={(e) => aberto !== null && aberto !== i && abrir(i, e.currentTarget)}
        >
          <Rotulo texto={m.rotulo} />
        </button>
      ))}
      {aberto !== null && <MenuSuspenso itens={menus[aberto].itens} x={pos.x} y={pos.y} aoFechar={fechar} />}
    </div>
  )
}
