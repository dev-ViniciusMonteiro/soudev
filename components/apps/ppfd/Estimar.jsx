'use client'

// Estimativa pela ficha da luminária: potência na tomada × eficiência (µmol/J) = PPF; dividido pela área = PPFD médio.
// Serve para conferir se a medição está na faixa esperada e para escolher a potência certa para a tenda.

import { useState } from 'react'
import { FAIXAS, dli, estimarPelaPotencia } from '@/lib/ppfd/luz'

const TENDAS = [
  ['60×60', 0.6, 0.6],
  ['80×80', 0.8, 0.8],
  ['100×100', 1, 1],
  ['120×120', 1.2, 1.2],
  ['150×150', 1.5, 1.5],
  ['120×240', 1.2, 2.4],
]

export default function Estimar({ fase, horas }) {
  const [watts, setWatts] = useState(240)
  const [eficiencia, setEficiencia] = useState(2.8)
  const [largura, setLargura] = useState(1)
  const [comprimento, setComprimento] = useState(1)
  const r = estimarPelaPotencia({ watts, eficiencia, largura, comprimento })
  const f = FAIXAS.find((x) => x.id === fase) ?? FAIXAS[2]
  // Potência para ficar no meio da faixa da fase nessa área.
  const ideal = r.area && eficiencia ? (((f.min + f.max) / 2) * r.area) / 0.85 / eficiencia : 0

  return (
    <div className="pf-estimar">
      <section className="pf-cartao">
        <h2>Estimar o PPFD pela potência</h2>
        <p className="muted small">Use a potência real na tomada (a da caixa “equivalente” não vale) e a eficiência da placa. Placas com Samsung LM301H/EVO costumam ficar entre 2,6 e 3,0 µmol/J na luminária completa.</p>
        <div className="pf-form">
          <label className="field">
            <span className="field-label">Potência na tomada (W)</span>
            <input value={watts} onChange={(e) => setWatts(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            <span className="field-label">Eficiência (µmol/J)</span>
            <input value={eficiencia} onChange={(e) => setEficiencia(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            <span className="field-label">Largura da área (m)</span>
            <input value={largura} onChange={(e) => setLargura(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            <span className="field-label">Comprimento (m)</span>
            <input value={comprimento} onChange={(e) => setComprimento(e.target.value)} inputMode="decimal" />
          </label>
        </div>
        <div className="pf-linha">
          {TENDAS.map(([nome, l, c]) => (
            <button key={nome} type="button" className="chip" onClick={() => (setLargura(l), setComprimento(c))}>
              {nome}
            </button>
          ))}
        </div>
        <dl className="pf-dados">
          <dt>PPF da luminária</dt>
          <dd>{Math.round(r.ppf)} µmol/s</dd>
          <dt>Área</dt>
          <dd>{r.area.toFixed(2)} m²</dd>
          <dt>PPFD médio esperado</dt>
          <dd>
            <strong>{Math.round(r.ppfdMedio)} µmol/m²/s</strong>
          </dd>
          <dt>DLI ({horas} h)</dt>
          <dd>{dli(r.ppfdMedio, horas).toFixed(1)} mol/m²/dia</dd>
          <dt>Para {f.nome.toLowerCase()} nessa área</dt>
          <dd>~{Math.round(ideal)} W na tomada</dd>
        </dl>
        <p className="muted small">No centro, embaixo da luz, o PPFD costuma ser 20–40% maior que a média; nos cantos, menor. Para ver de verdade, faça o mapa da área.</p>
      </section>
    </div>
  )
}
