'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import ChatIdeias from './ChatIdeias'

// Só aparece na home e nas páginas de categoria. Nas páginas de produto (os /*/[slug]),
// no currículo (que tem a conversa embutida), convite, vinicut etc. fica escondido.
const MOSTRAR_EM = ['/', '/ferramentas', '/sistemas', '/apps', '/jogos']

export default function BalaoIdeias() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)

  // Esc fecha
  useEffect(() => {
    if (!aberto) return
    const h = (e) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [aberto])

  if (!MOSTRAR_EM.includes(pathname)) return null

  return (
    <div className="balao-ideias">
      {aberto && (
        <section className="bi-painel" role="dialog" aria-label="Enviar uma ideia para o soudev">
          <header className="bi-head">
            <div>
              <strong>Ideias pro site</strong>
              <span>Sugira uma ferramenta ou melhoria</span>
            </div>
            <button type="button" className="bi-x" onClick={() => setAberto(false)} aria-label="Fechar">×</button>
          </header>
          <ChatIdeias
            chave="soudev-ideias-chat"
            focar
            intro="Oi! 👋 Esse site é feito com ideias de quem usa. Tem alguma ferramenta, melhoria ou app que você gostaria de ver aqui? Manda pra mim!"
            resposta="Anotado! Valeu demais pela ideia 🙌 Pode mandar outra se quiser."
            placeholder="Escreva sua ideia…"
          />
        </section>
      )}

      <button
        type="button"
        className={`bi-fab ${aberto ? 'bi-fab-aberto' : ''}`}
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? 'Fechar caixa de ideias' : 'Enviar uma ideia'}
      >
        <span aria-hidden="true">{aberto ? '×' : '💡'}</span>
        {!aberto && <span className="bi-fab-txt">Tem uma ideia?</span>}
      </button>
    </div>
  )
}
