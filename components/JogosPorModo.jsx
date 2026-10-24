'use client'

// Jogos filtrados por modo (Todos, Online, Câmera, Clássicos). "lista" = nomes no índice da home; "grade" = cartões
// com o banner em /jogos. O filtro escolhido vai para o endereço (#online, #camera, #classico).

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function JogosPorModo({ jogos, modos, variante = 'grade' }) {
  const [modo, setModo] = useState('todos')

  useEffect(() => {
    const h = window.location.hash.slice(1)
    if (modos.some(([id]) => id === h)) setModo(h)
  }, [modos])

  const escolher = (id) => {
    setModo(id)
    if (variante === 'grade') history.replaceState(null, '', id === 'todos' ? window.location.pathname : `#${id}`)
  }
  const visiveis = modo === 'todos' ? jogos : jogos.filter((j) => j.modos.includes(modo))
  const icone = Object.fromEntries(modos.map(([id, , i]) => [id, i]))
  const nome = Object.fromEntries(modos.map(([id, n]) => [id, n]))

  return (
    <div className={`jogos-modo jogos-modo-${variante}`}>
      <div className="jogos-filtros" role="group" aria-label="Filtrar jogos por modo">
        <button type="button" className={modo === 'todos' ? 'ativo' : ''} aria-pressed={modo === 'todos'} onClick={() => escolher('todos')}>
          Todos <span>{jogos.length}</span>
        </button>
        {modos.map(([id, rotulo, i]) => (
          <button key={id} type="button" className={modo === id ? 'ativo' : ''} aria-pressed={modo === id} onClick={() => escolher(id)}>
            {i} {rotulo} <span>{jogos.filter((j) => j.modos.includes(id)).length}</span>
          </button>
        ))}
      </div>
      {variante === 'lista' ? (
        <ul>
          {visiveis.map((j) => (
            <li key={j.slug}>
              <Link href={`/jogos/${j.slug}`} title={j.short}>
                {j.name}{' '}
                <span className="jogo-modos" aria-label={j.modos.map((m) => nome[m]).join(', ')}>
                  {j.modos.map((m) => icone[m]).join('')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="jogos-grade">
          {visiveis.map((j) => (
            <Link key={j.slug} href={`/jogos/${j.slug}`} className="jogo-cartao">
              <Image src={j.banner} alt={`${j.name}: ${j.short}`} width={1920} height={768} sizes="(max-width: 720px) 100vw, 560px" />
              <span className="jogo-cartao-corpo">
                <strong>{j.name}</strong>
                <span className="jogo-cartao-modos">
                  {j.modos.map((m) => (
                    <span key={m}>
                      {icone[m]} {nome[m]}
                    </span>
                  ))}
                </span>
                <span className="jogo-cartao-texto">{j.short}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
