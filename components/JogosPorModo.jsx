'use client'

// Jogos filtrados por modo (Todos, Online, Câmera, Clássicos), em cartões com o banner. "grade" = todos à vista
// (em /jogos, com o filtro no endereço: #online, #camera, #classico); "fileira" = uma fileira que rola (na home).

import { useEffect, useState } from 'react'
import CartaoBanner from './CartaoBanner'
import Fileira from './Fileira'

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
  const etiqueta = Object.fromEntries(modos.map(([id, nome, icone]) => [id, `${icone} ${nome}`]))
  const cartoes = visiveis.map((j) => (
    <CartaoBanner key={j.slug} href={`/jogos/${j.slug}`} banner={j.banner} nome={j.name} texto={j.short} etiquetas={j.modos.map((m) => etiqueta[m])} />
  ))

  return (
    <div className="jogos-modo">
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
      {variante === 'fileira' ? <Fileira rotulo="Jogos">{cartoes}</Fileira> : <div className="cartoes-grade">{cartoes}</div>}
    </div>
  )
}
