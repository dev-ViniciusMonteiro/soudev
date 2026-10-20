'use client'

// Peças usadas em mais de uma tela do Documentador.

import { useEffect, useId, useState } from 'react'

export const precoModelo = (m) => (m.gratis ? 'grátis' : `US$ ${(m.entrada * 1e6).toFixed(2)} / US$ ${(m.saida * 1e6).toFixed(2)} por milhão de tokens (entrada / saída)`)

/** Campo com busca na lista de modelos do OpenRouter. Vazio = usa o padrão. */
export function EscolherModelo({ modelos, valor, onChange, vazio = 'Modelo padrão' }) {
  const id = useId()
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  const confirmar = (v) => {
    const limpo = v.trim()
    if (!limpo || modelos.some((m) => m.id === limpo)) onChange(limpo)
  }
  return (
    <div className="dc-modelo">
      <input
        list={id}
        value={texto}
        placeholder={vazio}
        onChange={(e) => {
          setTexto(e.target.value)
          if (modelos.some((m) => m.id === e.target.value)) onChange(e.target.value)
        }}
        onBlur={(e) => confirmar(e.target.value)}
        aria-label="Modelo"
        spellCheck={false}
      />
      <datalist id={id}>
        {modelos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.gratis ? `Grátis · ${m.nome}` : m.nome}
          </option>
        ))}
      </datalist>
      {valor && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange('')}>
          Usar padrão
        </button>
      )}
    </div>
  )
}

/** Markdown renderizado com segurança (marked + DOMPurify carregados só quando precisa). */
export function MarkdownSeguro({ texto, className = 'dc-md' }) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    let vivo = true
    Promise.all([import('marked'), import('dompurify')]).then(([{ marked }, { default: DOMPurify }]) => {
      if (vivo) setHtml(DOMPurify.sanitize(marked.parse(String(texto || ''), { gfm: true })))
    })
    return () => {
      vivo = false
    }
  }, [texto])
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export const segundos = (ms) => (ms >= 60000 ? `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s` : `${Math.round(ms / 1000)} s`)
