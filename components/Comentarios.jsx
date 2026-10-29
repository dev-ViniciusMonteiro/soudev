'use client'

import { useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_IDEIAS_API || ''

export default function Comentarios({ pagina = 'home', titulo = 'Comentários', subtitulo }) {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const honeypot = useRef('')

  useEffect(() => {
    try {
      const n = localStorage.getItem('soudev-coment-nome')
      if (n) setNome(n)
    } catch {}
  }, [])

  useEffect(() => {
    if (!API) {
      setCarregando(false)
      return
    }
    let vivo = true
    fetch(`${API}/comentarios?pagina=${encodeURIComponent(pagina)}`)
      .then((r) => r.json())
      .then((d) => { if (vivo) setLista(Array.isArray(d.comentarios) ? d.comentarios : []) })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [pagina])

  if (!API) return null

  async function enviar(e) {
    e.preventDefault()
    const msg = texto.trim()
    if (!msg || enviando) return
    if (honeypot.current) return
    setEnviando(true)
    setErro('')
    setOk(false)
    try {
      const r = await fetch(`${API}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: msg, nome: nome.trim() || undefined, pagina, website: honeypot.current }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Não consegui enviar agora.')
      if (d.comentario) setLista((l) => [d.comentario, ...l])
      setTexto('')
      setOk(true)
      try { if (nome.trim()) localStorage.setItem('soudev-coment-nome', nome.trim()) } catch {}
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const fmt = (ms) => {
    try {
      return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <section className="coment container secao">
      <h2>{titulo}</h2>
      {subtitulo && <p className="muted">{subtitulo}</p>}

      <form className="coment-form" onSubmit={enviar}>
        <input
          className="coment-nome"
          placeholder="Seu nome (opcional)"
          value={nome}
          maxLength={60}
          onChange={(e) => setNome(e.target.value)}
        />
        {/* honeypot anti-bot */}
        <input
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="coment-hp"
          onChange={(e) => { honeypot.current = e.target.value }}
        />
        <textarea
          className="coment-texto"
          placeholder="Escreva um comentário…"
          value={texto}
          maxLength={1000}
          rows={3}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="coment-acoes">
          {erro && <span className="coment-erro">{erro}</span>}
          {ok && !erro && <span className="coment-ok">Comentário publicado! 🎉</span>}
          <button type="submit" className="btn btn-primary" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando…' : 'Comentar'}
          </button>
        </div>
      </form>

      <div className="coment-lista">
        {carregando ? (
          <p className="muted">Carregando comentários…</p>
        ) : lista.length === 0 ? (
          <p className="muted">Seja o primeiro a comentar.</p>
        ) : (
          lista.map((c) => (
            <div key={c.id} className="coment-item">
              <div className="coment-cab">
                <strong>{c.nome || 'Anônimo'}</strong>
                <span className="muted">{fmt(c.criado_em)}</span>
              </div>
              <p>{c.mensagem}</p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
