'use client'

import { useEffect, useState } from 'react'
import ToolCard from './ToolCard'
import { track } from '@/lib/analytics'
import { categories, tools } from '@/lib/tools'

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function ToolsGrid() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('todas')

  const q = normalize(query.trim())
  const visible = tools.filter(
    (tool) =>
      (category === 'todas' || tool.category === category) &&
      (!q || normalize([tool.name, tool.short, ...tool.keywords].join(' ')).includes(q)),
  )

  // Buscas sem resultado mostram quais ferramentas as pessoas procuram e ainda não existem.
  useEffect(() => {
    if (q.length < 2) return
    const timer = setTimeout(() => track('search', { search_term: q.slice(0, 100), results_count: visible.length, category }), 1200)
    return () => clearTimeout(timer)
  }, [q, category, visible.length])

  return (
    <div className="tools-browser">
      <div className="tools-toolbar">
        <input
          type="search"
          className="search"
          placeholder="Buscar ferramenta: pdf, rescisão, pix…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar ferramenta"
        />
        <div className="chips" role="group" aria-label="Filtrar por categoria">
          {[{ id: 'todas', name: 'Todas' }, ...categories].map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? 'chip active' : 'chip'}
              aria-pressed={category === item.id}
              onClick={() => {
                if (item.id !== category) track('filter_category', { category: item.id })
                setCategory(item.id)
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="muted">Nenhuma ferramenta encontrada para “{query}”.</p>
      ) : (
        <div className="tool-grid">
          {visible.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
