'use client'

import { useState } from 'react'

const CATEGORIAS = [
  ['', 'Qualquer tipo', ''],
  ['show', 'Música / shows', 'show'],
  ['esporte', 'Esportes', 'jogo'],
  ['teatro', 'Teatro e artes', 'teatro'],
  ['familia', 'Infantil / família', 'infantil'],
  ['cinema', 'Cinema', 'cinema'],
  ['festa', 'Festas e baladas', 'festa'],
  ['curso', 'Cursos e workshops', 'workshop'],
]

const slug = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const PLATAFORMAS = [
  {
    nome: 'Sympla',
    desc: 'A maior do Brasil para shows, festas, cursos e eventos locais.',
    url: (q) => `https://www.sympla.com.br/eventos?s=${encodeURIComponent(q.texto)}`,
  },
  {
    nome: 'Eventbrite',
    desc: 'Workshops, encontros e eventos no Brasil e no mundo.',
    url: (q) => `https://www.eventbrite.com.br/d/brazil/${slug(q.palavra || 'eventos')}/`,
  },
  {
    nome: 'Google',
    desc: 'Mostra o painel de eventos do Google com data e local.',
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`${q.texto} eventos ingressos`)}`,
  },
  {
    nome: 'Ticketmaster',
    desc: 'Grandes shows e eventos (cobertura maior no exterior).',
    url: (q) => `https://www.ticketmaster.com/search?q=${encodeURIComponent(q.palavra || q.texto)}`,
  },
]

export default function BuscadorEventos() {
  const [termo, setTermo] = useState('')
  const [cidade, setCidade] = useState('')
  const [categoria, setCategoria] = useState('')

  const palavraCat = CATEGORIAS.find(([id]) => id === categoria)?.[2] || ''
  const texto = [termo, palavraCat, cidade].filter(Boolean).join(' ').trim()
  const palavra = termo || palavraCat || ''
  const q = { texto: texto || 'eventos', palavra }

  return (
    <div className="ev-busca">
      <div className="ev-filtros ev-filtros-3">
        <div className="field">
          <span className="field-label">O que você procura</span>
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="show, time, peça, artista, curso…" />
        </div>
        <div className="field">
          <span className="field-label">Cidade</span>
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="ex.: São Paulo" />
        </div>
        <div className="field">
          <span className="field-label">Tipo</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </div>
      </div>

      <p className="muted ev-explica">
        Escolha onde buscar: cada botão abre a plataforma com a sua busca <strong>já preenchida</strong>. É grátis e não precisa de cadastro.
      </p>

      <div className="ev-plataformas">
        {PLATAFORMAS.map((p) => (
          <a key={p.nome} href={p.url(q)} target="_blank" rel="noopener noreferrer" className="ev-plat">
            <strong>Buscar na {p.nome} ↗</strong>
            <span>{p.desc}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
