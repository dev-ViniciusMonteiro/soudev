'use client'

// Busca por nome: no computador é a lupa do topo (abre um painel, atalho Ctrl+K ou "/");
// no celular o mesmo campo aparece dentro do menu ☰ (CampoBusca).

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { buscar } from '@/lib/busca'

const Lupa = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

/** Campo com a lista de resultados; setas escolhem, Enter abre. */
export function CampoBusca({ indice, aoEscolher, autoFocus = false }) {
  const [termo, setTermo] = useState('')
  const [ativo, setAtivo] = useState(0)
  const router = useRouter()
  const id = useId()
  const resultados = buscar(indice, termo)

  const abrir = (item) => {
    aoEscolher?.()
    router.push(item.href)
  }

  const tecla = (e) => {
    if (!resultados.length) return
    if (e.key === 'ArrowDown') setAtivo((a) => (a + 1) % resultados.length)
    else if (e.key === 'ArrowUp') setAtivo((a) => (a - 1 + resultados.length) % resultados.length)
    else if (e.key === 'Enter') abrir(resultados[Math.min(ativo, resultados.length - 1)])
    else return
    e.preventDefault()
  }

  return (
    <div className="busca-campo">
      <label className="busca-entrada">
        <Lupa />
        <input
          type="search"
          value={termo}
          autoFocus={autoFocus}
          placeholder="Buscar ferramenta, app, jogo…"
          aria-label="Buscar no site"
          aria-controls={`${id}-lista`}
          aria-activedescendant={resultados.length ? `${id}-${ativo}` : undefined}
          onChange={(e) => {
            setTermo(e.target.value)
            setAtivo(0)
          }}
          onKeyDown={tecla}
        />
      </label>
      {termo.trim() && (
        <ul id={`${id}-lista`} className="busca-resultados" role="listbox">
          {resultados.length ? (
            resultados.map((r, i) => (
              <li key={r.href} id={`${id}-${i}`} role="option" aria-selected={i === ativo}>
                <Link href={r.href} className={i === ativo ? 'ativo' : ''} onClick={() => aoEscolher?.()} onMouseEnter={() => setAtivo(i)}>
                  <span className="busca-secao">{r.secao}</span>
                  <strong>{r.nome}</strong>
                  <small>{r.texto}</small>
                </Link>
              </li>
            ))
          ) : (
            <li className="busca-vazio">Nada encontrado para “{termo.trim()}”.</li>
          )}
        </ul>
      )}
    </div>
  )
}

/** Lupa do topo (computador). */
export default function Busca({ indice }) {
  const [aberta, setAberta] = useState(false)
  const caixa = useRef(null)

  useEffect(() => {
    const atalho = (e) => {
      const digitando = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !digitando)) {
        e.preventDefault()
        setAberta(true)
      } else if (e.key === 'Escape') setAberta(false)
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])

  useEffect(() => {
    if (!aberta) return
    const fora = (e) => {
      if (!caixa.current?.contains(e.target)) setAberta(false)
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberta])

  return (
    <div className="busca" ref={caixa}>
      <button type="button" className="busca-botao" aria-label="Buscar no site (Ctrl+K)" title="Buscar (Ctrl+K)" aria-expanded={aberta} onClick={() => setAberta((a) => !a)}>
        <Lupa />
      </button>
      {aberta && (
        <div className="busca-painel">
          <CampoBusca indice={indice} autoFocus aoEscolher={() => setAberta(false)} />
        </div>
      )}
    </div>
  )
}
