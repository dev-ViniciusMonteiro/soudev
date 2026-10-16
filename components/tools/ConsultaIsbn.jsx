'use client'

import { useState } from 'react'
import { CopyButton, Field, Notice } from '../ui'
import { BRASIL_API, apiMessage, fetchJson } from '@/lib/apis'
import { brl } from '@/lib/br'

/** Confere o dígito do ISBN-10 ou ISBN-13. */
function isbnValido(isbn) {
  if (/^\d{13}$/.test(isbn)) {
    const soma = [...isbn.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0)
    return (10 - (soma % 10)) % 10 === Number(isbn[12])
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const soma = [...isbn].reduce((s, d, i) => s + (d === 'X' ? 10 : Number(d)) * (10 - i), 0)
    return soma % 11 === 0
  }
  return false
}

export default function ConsultaIsbn() {
  const [isbn, setIsbn] = useState('')
  const [livro, setLivro] = useState(null)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const buscar = async (event) => {
    event.preventDefault()
    setErro('')
    setLivro(null)
    const limpo = isbn.toUpperCase().replace(/[^\dX]/g, '')
    if (!isbnValido(limpo)) return setErro('ISBN inválido. Ele tem 10 ou 13 números e fica na contracapa, perto do código de barras.')
    setBusy(true)
    try {
      setLivro(await fetchJson(`${BRASIL_API}/isbn/v1/${limpo}`, { timeout: 15000 }))
    } catch (e) {
      setErro(apiMessage(e, 'Livro não encontrado nas bases consultadas.'))
    } finally {
      setBusy(false)
    }
  }

  const citacao = livro
    ? `${(livro.authors ?? []).map((a) => a.toUpperCase()).join('; ')}. ${livro.title}${livro.subtitle ? `: ${livro.subtitle}` : ''}. ${livro.location ? `${livro.location}: ` : ''}${livro.publisher ?? ''}${livro.year ? `, ${livro.year}` : ''}.`
    : ''

  return (
    <div className="tool-stack">
      <form className="grid-2" onSubmit={buscar}>
        <Field label="ISBN" hint="Com ou sem traços. Ex.: 978-85-457-0287-0">
          <input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="9788545702870" inputMode="numeric" />
        </Field>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Buscando…' : 'Buscar livro'}</button>
        </div>
      </form>
      <Notice kind="error">{erro}</Notice>
      {livro && (
        <div className="book">
          {livro.cover_url && <img src={livro.cover_url} alt={`Capa de ${livro.title}`} loading="lazy" />}
          <div className="rows">
            <h2 className="tool-subtitle">{livro.title}{livro.subtitle ? `: ${livro.subtitle}` : ''}</h2>
            {[
              ['Autor(es)', (livro.authors ?? []).join(', ')],
              ['Editora', livro.publisher],
              ['Ano', livro.year],
              ['Páginas', livro.page_count],
              ['Formato', livro.format === 'PHYSICAL' ? 'Impresso' : livro.format === 'DIGITAL' ? 'Digital' : livro.format],
              ['Assuntos', (livro.subjects ?? []).join(', ')],
              ['Preço sugerido', livro.retail_price?.amount ? brl(livro.retail_price.amount) : ''],
              ['ISBN', livro.isbn],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="row"><span>{k}</span><strong>{v}</strong></div>
              ))}
            {livro.synopsis && <p className="muted">{livro.synopsis}</p>}
            <div className="actions">
              <CopyButton text={citacao} label="Copiar referência (ABNT simplificada)" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
