'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Só aparece na home e nas páginas de categoria. Nas páginas de produto (os /*/[slug]),
// no currículo, convite, vinicut etc. fica escondido.
const MOSTRAR_EM = ['/', '/ferramentas', '/sistemas', '/apps', '/jogos']

const API = process.env.NEXT_PUBLIC_IDEIAS_API || ''
const CHAVE = 'soudev-ideias-chat'

const INTRO = {
  de: 'bot',
  texto: 'Oi! 👋 Esse site é feito com ideias de quem usa. Tem alguma ferramenta, melhoria ou app que você gostaria de ver aqui? Manda pra mim!',
}

export default function BalaoIdeias() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [msgs, setMsgs] = useState([INTRO])
  const [texto, setTexto] = useState('')
  const [nome, setNome] = useState('')
  const [mostrarNome, setMostrarNome] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const honeypot = useRef('')
  const fimRef = useRef(null)
  const inputRef = useRef(null)

  // restaura a conversa salva neste navegador
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE)
      if (salvo) {
        const d = JSON.parse(salvo)
        if (Array.isArray(d?.msgs) && d.msgs.length) setMsgs(d.msgs)
        if (d?.nome) setNome(d.nome)
      }
    } catch {}
  }, [])

  // salva a conversa
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ msgs, nome }))
    } catch {}
  }, [msgs, nome])

  // rola pro fim quando chega mensagem
  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, aberto])

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 80)
  }, [aberto])

  // Esc fecha
  useEffect(() => {
    if (!aberto) return
    const h = (e) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [aberto])

  if (!MOSTRAR_EM.includes(pathname)) return null

  async function enviar(e) {
    e?.preventDefault()
    const msg = texto.trim()
    if (!msg || enviando) return
    if (honeypot.current) return // bot

    setMsgs((m) => [...m, { de: 'eu', texto: msg }])
    setTexto('')
    setEnviando(true)

    try {
      if (API) {
        const r = await fetch(`${API}/ideias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensagem: msg, nome: nome.trim() || undefined, pagina: pathname, website: honeypot.current }),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.error || 'Não consegui enviar agora.')
        }
      } else {
        // sem API configurada ainda — segue em modo demonstração
        await new Promise((res) => setTimeout(res, 400))
      }
      setMsgs((m) => [...m, { de: 'bot', texto: 'Anotado! Valeu demais pela ideia 🙌 Pode mandar outra se quiser.' }])
    } catch (err) {
      setMsgs((m) => [...m, { de: 'bot', texto: `Ops, ${err.message} Tenta de novo daqui a pouco.` }])
    } finally {
      setEnviando(false)
    }
  }

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

          <div className="bi-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`bi-msg ${m.de === 'eu' ? 'bi-eu' : 'bi-bot'}`}>{m.texto}</div>
            ))}
            <div ref={fimRef} />
          </div>

          <form className="bi-form" onSubmit={enviar}>
            {mostrarNome ? (
              <input
                className="bi-nome"
                placeholder="Seu nome (opcional)"
                value={nome}
                maxLength={120}
                onChange={(e) => setNome(e.target.value)}
              />
            ) : (
              <button type="button" className="bi-add-nome" onClick={() => setMostrarNome(true)}>
                + adicionar seu nome (opcional)
              </button>
            )}
            {/* honeypot: invisível para humanos */}
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="bi-hp"
              onChange={(e) => { honeypot.current = e.target.value }}
            />
            <div className="bi-linha">
              <textarea
                ref={inputRef}
                className="bi-input"
                placeholder="Escreva sua ideia…"
                value={texto}
                maxLength={2000}
                rows={1}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              />
              <button type="submit" className="bi-send" disabled={enviando || !texto.trim()} aria-label="Enviar">
                {enviando ? '…' : '➤'}
              </button>
            </div>
          </form>
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
