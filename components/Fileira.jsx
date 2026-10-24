'use client'

// Fileira de cartões que rola para o lado (arrasta no celular, setas no computador).

import { useEffect, useRef, useState } from 'react'

const Seta = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export default function Fileira({ children, rotulo }) {
  const trilho = useRef(null)
  const [rola, setRola] = useState(false)

  // As setas só aparecem quando há cartões fora da tela.
  useEffect(() => {
    const t = trilho.current
    if (!t) return
    const medir = () => setRola(t.scrollWidth > t.clientWidth + 4)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(t)
    return () => obs.disconnect()
  }, [children])

  const rolar = (lado) => {
    const t = trilho.current
    if (t) t.scrollBy({ left: lado * t.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <div className={`fileira${rola ? ' rola' : ''}`}>
      <div className="fileira-trilho" ref={trilho} role="group" aria-label={rotulo}>
        {children}
      </div>
      <button type="button" className="fileira-seta anterior" aria-label={`Voltar em ${rotulo}`} onClick={() => rolar(-1)}>
        <Seta />
      </button>
      <button type="button" className="fileira-seta proxima" aria-label={`Avançar em ${rotulo}`} onClick={() => rolar(1)}>
        <Seta />
      </button>
    </div>
  )
}
