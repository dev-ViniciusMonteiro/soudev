'use client'

import { useState } from 'react'

const PAISES = [
  ['BR', 'Brasil'],
  ['US', 'Estados Unidos'],
  ['GB', 'Reino Unido'],
  ['', 'Todos os países'],
]
const CATEGORIAS = [
  ['', 'Todas as categorias'],
  ['musica', 'Música / shows'],
  ['esportes', 'Esportes'],
  ['teatro', 'Artes e teatro'],
  ['familia', 'Família'],
  ['cinema', 'Cinema'],
]

const slug = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

function fmtData(d, h) {
  if (!d) return ''
  try {
    const data = new Date(`${d}T${h || '00:00:00'}`)
    return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) + (h ? ` · ${h.slice(0, 5)}` : '')
  } catch {
    return d
  }
}

export default function BuscadorEventos() {
  const [f, setF] = useState({ termo: '', cidade: '', pais: 'BR', categoria: '', de: '', ate: '' })
  const [eventos, setEventos] = useState(null)
  const [estado, setEstado] = useState('parado') // parado | buscando | pronto
  const [aviso, setAviso] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const buscar = async (e) => {
    e?.preventDefault()
    setEstado('buscando')
    setAviso('')
    setEventos(null)
    try {
      const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v))
      const r = await fetch(`/api/eventos?${q}`)
      const d = await r.json()
      if (d.erro) setAviso(d.erro)
      setEventos(Array.isArray(d.eventos) ? d.eventos : [])
    } catch {
      setAviso('Não consegui buscar agora. Tente os atalhos abaixo.')
      setEventos([])
    } finally {
      setEstado('pronto')
    }
  }

  const termoBusca = [f.termo, f.cidade].filter(Boolean).join(' ').trim() || 'eventos'
  const atalhos = [
    ['Sympla', `https://www.sympla.com.br/eventos?s=${encodeURIComponent(termoBusca)}`],
    ['Eventbrite', `https://www.eventbrite.com.br/d/brazil/${slug(f.termo || 'eventos')}/`],
    ['Google eventos', `https://www.google.com/search?q=${encodeURIComponent(`${termoBusca} eventos ingressos`)}`],
  ]

  return (
    <div className="ev-busca">
      <form className="ev-filtros" onSubmit={buscar}>
        <div className="field">
          <span className="field-label">O que você procura</span>
          <input value={f.termo} onChange={set('termo')} placeholder="show, time, peça, artista…" />
        </div>
        <div className="field">
          <span className="field-label">Cidade</span>
          <input value={f.cidade} onChange={set('cidade')} placeholder="ex.: São Paulo" />
        </div>
        <div className="field">
          <span className="field-label">País</span>
          <select value={f.pais} onChange={set('pais')}>
            {PAISES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Categoria</span>
          <select value={f.categoria} onChange={set('categoria')}>
            {CATEGORIAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field-label">De</span>
          <input type="date" value={f.de} onChange={set('de')} />
        </div>
        <div className="field">
          <span className="field-label">Até</span>
          <input type="date" value={f.ate} onChange={set('ate')} />
        </div>
        <button type="submit" className="btn btn-primary ev-buscar" disabled={estado === 'buscando'}>
          {estado === 'buscando' ? 'Buscando…' : 'Buscar eventos'}
        </button>
      </form>

      <div className="ev-atalhos">
        <span className="muted">Buscar também em:</span>
        {atalhos.map(([nome, url]) => (
          <a key={nome} href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">{nome} ↗</a>
        ))}
      </div>

      {aviso && <p className="notice warn ev-aviso">{aviso}</p>}

      {estado === 'buscando' && <p className="muted">Procurando eventos…</p>}

      {estado === 'pronto' && eventos && eventos.length === 0 && !aviso && (
        <p className="muted ev-vazio">Nenhum evento encontrado pela Ticketmaster com esses filtros. No Brasil, a cobertura é menor — tente os atalhos acima (Sympla costuma ter mais).</p>
      )}

      {eventos && eventos.length > 0 && (
        <div className="ev-grid">
          {eventos.map((ev) => (
            <a key={ev.id} href={ev.url || '#'} target="_blank" rel="noopener noreferrer" className="ev-card">
              <div className="ev-img">
                {ev.imagem ? <img src={ev.imagem} alt="" loading="lazy" /> : <span className="ev-semimg">sem imagem</span>}
                {ev.categoria && <span className="ev-cat">{ev.categoria}</span>}
              </div>
              <div className="ev-corpo">
                <span className="ev-data">{fmtData(ev.data, ev.hora)}</span>
                <strong className="ev-nome">{ev.nome}</strong>
                <span className="ev-local">{[ev.local, ev.cidade, ev.estado].filter(Boolean).join(' · ')}</span>
                <span className="ev-comprar">Comprar ingresso ↗</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
