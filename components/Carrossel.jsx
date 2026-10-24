'use client'

// Carrossel de banners da home: cada banner é um link. Arrasta no celular (scroll com encaixe), setas e
// bolinhas, passa sozinho a cada 6 s (para com o mouse em cima, com foco do teclado ou com "reduzir movimento").

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Carrossel({ slides, intervalo = 6000 }) {
  const trilho = useRef(null)
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)

  const ir = useCallback(
    (i) => {
      const t = trilho.current
      if (!t) return
      const n = (i + slides.length) % slides.length
      t.scrollTo({ left: n * t.clientWidth, behavior: 'smooth' })
    },
    [slides.length],
  )

  // Qual slide está na tela (também quando a pessoa arrasta).
  useEffect(() => {
    const t = trilho.current
    if (!t) return
    const aoRolar = () => setAtual(Math.round(t.scrollLeft / Math.max(1, t.clientWidth)))
    t.addEventListener('scroll', aoRolar, { passive: true })
    return () => t.removeEventListener('scroll', aoRolar)
  }, [])

  useEffect(() => {
    if (pausado || slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => document.visibilityState === 'visible' && ir(atual + 1), intervalo)
    return () => clearInterval(id)
  }, [atual, pausado, ir, intervalo, slides.length])

  return (
    <section
      className="carrossel"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="carrossel-janela">
        <div className="carrossel-trilho" ref={trilho}>
          {slides.map((s, i) => (
            <Link key={s.href + s.imagem} href={s.href} className="carrossel-slide" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}: ${s.titulo}`}>
              <Image src={s.imagem} alt={s.alt} width={s.largura} height={s.altura} priority={i === 0} sizes="(max-width: 1192px) 100vw, 1160px" />
            </Link>
          ))}
        </div>
        {slides.length > 1 && (
          <>
            <button type="button" className="carrossel-seta anterior" aria-label="Banner anterior" onClick={() => ir(atual - 1)}>
              ‹
            </button>
            <button type="button" className="carrossel-seta proxima" aria-label="Próximo banner" onClick={() => ir(atual + 1)}>
              ›
            </button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <div className="carrossel-bolinhas">
          {slides.map((s, i) => (
            <button key={s.href + s.imagem} type="button" aria-label={`Ir para o banner ${i + 1}: ${s.titulo}`} aria-current={i === atual} className={i === atual ? 'ativa' : ''} onClick={() => ir(i)} />
          ))}
        </div>
      )}
    </section>
  )
}
