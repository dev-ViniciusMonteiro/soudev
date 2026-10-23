'use client'

// Menu do topo no celular: o botão ☰ abre a busca por nome e a lista com todas as seções do site.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CampoBusca } from '@/components/Busca'

export default function MenuMobile({ links, indiceBusca }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)
  const pathname = usePathname()

  useEffect(() => setAberto(false), [pathname])

  useEffect(() => {
    if (!aberto) return
    const fora = (e) => {
      if (!caixa.current?.contains(e.target)) setAberto(false)
    }
    const esc = (e) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('pointerdown', fora)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fora)
      window.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div className="menu-mobile" ref={caixa}>
      <button type="button" className="menu-mobile-botao" aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={aberto} aria-controls="menu-mobile-lista" onClick={() => setAberto((a) => !a)}>
        <span aria-hidden="true">{aberto ? '✕' : '☰'}</span>
      </button>
      {aberto && (
        <nav id="menu-mobile-lista" className="menu-mobile-lista" aria-label="Menu">
          <CampoBusca indice={indiceBusca} aoEscolher={() => setAberto(false)} />
          {links.map(([href, rotulo]) => (
            <Link key={href} href={href} onClick={() => setAberto(false)} className={pathname === href || (href !== '/' && pathname.startsWith(href) && !href.includes('#')) ? 'ativo' : ''}>
              {rotulo}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
