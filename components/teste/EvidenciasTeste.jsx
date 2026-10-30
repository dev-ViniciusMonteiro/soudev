'use client'

// Mostra as evidências (prints) geradas pelos testes E2E do Playwright para este app/sistema.
// Lê o JSON estático em /testes/dados/<tipo>-<slug>.json (gerado por `npm run test:e2e`).

import { useEffect, useState } from 'react'

export default function EvidenciasTeste({ tipo, slug }) {
  const [dados, setDados] = useState(undefined)

  useEffect(() => {
    fetch(`/testes/dados/${tipo}-${slug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setDados)
      .catch(() => setDados(null))
  }, [tipo, slug])

  if (dados === undefined || dados === null) return null

  const data = new Date(dados.geradoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const prints = dados.passos.filter((p) => p.img)

  return (
    <section className="ev">
      <div className="ev-cabecalho">
        <h2>Evidências dos testes {dados.ok ? <span className="ev-selo">✓ passou</span> : <span className="ev-selo ruim">✗ falhou</span>}</h2>
        <p className="muted">Testado automaticamente num navegador real (Playwright) em {data}. Cada imagem é um print capturado durante o teste.</p>
      </div>
      <ol className="ev-passos">
        {dados.passos.map((p, i) => (
          <li key={i}>
            <div className="ev-passo-cab"><span className="ev-check">✓</span> {p.titulo}</div>
            {p.detalhe && <p className="ev-detalhe">{p.detalhe}</p>}
            {p.img && (
              <a href={p.img} target="_blank" rel="noopener noreferrer" className="ev-print">
                <img src={p.img} alt={p.titulo} loading="lazy" />
                <span className="ev-print-zoom">ver print ↗</span>
              </a>
            )}
          </li>
        ))}
      </ol>
      <p className="muted small">{prints.length} print(s) de evidência · <a href="/testes">ver todos os testes do site</a></p>
    </section>
  )
}
