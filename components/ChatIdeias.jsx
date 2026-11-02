'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Conversa que envia a mensagem para o worker (POST /ideias), a mesma do balão "Tem uma ideia?".
// Usada no balão flutuante e embutida no currículo. Tudo cai no painel admin de ideias.

const API = process.env.NEXT_PUBLIC_IDEIAS_API || ''

export default function ChatIdeias({ chave, intro, resposta, placeholder = 'Escreva aqui…', focar = false, pagina }) {
  const pathname = usePathname()
  const INTRO = { de: 'bot', texto: intro }
  const [msgs, setMsgs] = useState([INTRO])
  const [texto, setTexto] = useState('')
  const [nome, setNome] = useState('')
  const [mostrarNome, setMostrarNome] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const honeypot = useRef('')
  const caixaRef = useRef(null)
  const inputRef = useRef(null)

  // restaura a conversa salva neste navegador
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(chave) || 'null')
      if (Array.isArray(d?.msgs) && d.msgs.length) setMsgs(d.msgs)
      if (d?.nome) {
        setNome(d.nome)
        setMostrarNome(true)
      }
    } catch {}
  }, [chave])

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify({ msgs, nome }))
    } catch {}
  }, [chave, msgs, nome])

  // rola só a caixa de mensagens (não a página)
  useEffect(() => {
    const c = caixaRef.current
    if (c) c.scrollTop = c.scrollHeight
  }, [msgs])

  useEffect(() => {
    if (focar) setTimeout(() => inputRef.current?.focus(), 80)
  }, [focar])

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
          body: JSON.stringify({ mensagem: msg, nome: nome.trim() || undefined, pagina: pagina || pathname, website: honeypot.current }),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.error || 'Não consegui enviar agora.')
        }
      } else {
        await new Promise((res) => setTimeout(res, 400)) // sem API configurada: modo demonstração
      }
      setMsgs((m) => [...m, { de: 'bot', texto: resposta }])
    } catch (err) {
      setMsgs((m) => [...m, { de: 'bot', texto: `Ops, ${err.message} Tenta de novo daqui a pouco.` }])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="bi-msgs" ref={caixaRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`bi-msg ${m.de === 'eu' ? 'bi-eu' : 'bi-bot'}`}>{m.texto}</div>
        ))}
      </div>

      <form className="bi-form" onSubmit={enviar}>
        {mostrarNome ? (
          <input className="bi-nome" placeholder="Seu nome (opcional)" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
        ) : (
          <button type="button" className="bi-add-nome" onClick={() => setMostrarNome(true)}>
            + adicionar seu nome (opcional)
          </button>
        )}
        {/* honeypot: invisível para humanos */}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="bi-hp" onChange={(e) => { honeypot.current = e.target.value }} />
        <div className="bi-linha">
          <textarea
            ref={inputRef}
            className="bi-input"
            placeholder={placeholder}
            value={texto}
            maxLength={2000}
            rows={1}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar()
              }
            }}
          />
          <button type="submit" className="bi-send" disabled={enviando || !texto.trim()} aria-label="Enviar">
            {enviando ? '…' : '➤'}
          </button>
        </div>
      </form>
    </>
  )
}
