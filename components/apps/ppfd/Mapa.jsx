'use client'

// Mapa da área: divide a tenda em quadrados, mede cada ponto e mostra o mapa de calor com média, mínimo, máximo
// e uniformidade (mínimo ÷ média). Os mapas ficam salvos no aparelho e saem em planilha.

import { useEffect, useState } from 'react'
import { downloadBlob } from '@/lib/client'
import { FAIXAS, resumoMapa } from '@/lib/ppfd/luz'

const cor = (v, max) => {
  if (!v) return 'transparent'
  const k = Math.min(1, v / Math.max(max, 1))
  return `hsl(${220 - k * 200}, 85%, ${30 + k * 25}%)`
}

export default function Mapa({ leitura, fator, luxDe, fase }) {
  const [tamanho, setTamanho] = useState(3)
  const [valores, setValores] = useState(() => Array(9).fill(null))
  const [salvos, setSalvos] = useState([])
  const [nome, setNome] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    try {
      setSalvos(JSON.parse(localStorage.getItem('ppfd.mapas')) ?? [])
    } catch {
      setSalvos([])
    }
  }, [])

  const mudarTamanho = (n) => {
    setTamanho(n)
    setValores(Array(n * n).fill(null))
  }

  const medirAqui = (i) => {
    const bruto = leitura.mediaRecente()
    const lux = luxDe(bruto)
    if (lux === null) {
      setAviso(leitura.fonte ? 'Calibre a câmera na aba Medir antes de mapear.' : 'Ligue o sensor ou a câmera na aba Medir primeiro.')
      return
    }
    setAviso('')
    setValores((v) => v.map((x, k) => (k === i ? Math.round(lux * fator) : x)))
  }

  const r = resumoMapa(valores)
  const f = FAIXAS.find((x) => x.id === fase)
  const max = Math.max(...valores.filter(Boolean), f?.max ?? 900)

  const salvar = () => {
    const lista = [{ nome: nome || `Mapa ${new Date().toLocaleString('pt-BR')}`, tamanho, valores, quando: new Date().toISOString() }, ...salvos].slice(0, 20)
    setSalvos(lista)
    try {
      localStorage.setItem('ppfd.mapas', JSON.stringify(lista))
    } catch {
      /* sem armazenamento */
    }
    setNome('')
    setAviso('Mapa salvo.')
  }

  const exportar = () => {
    const linhas = []
    for (let l = 0; l < tamanho; l++) linhas.push(valores.slice(l * tamanho, l * tamanho + tamanho).map((v) => v ?? '').join(';'))
    downloadBlob(new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' }), `mapa-ppfd-${tamanho}x${tamanho}.csv`)
  }

  return (
    <div className="pf-mapa">
      <section className="pf-cartao">
        <h2>Mapa da área</h2>
        <p className="muted small">
          Divida a área da luz em quadrados. Coloque o celular no centro de cada um, na altura das pontas das plantas, espere 2 segundos e toque no quadrado. {leitura.fonte ? '' : 'Ligue a medição na aba Medir antes.'}
        </p>
        <div className="pf-linha">
          {[3, 4, 5].map((n) => (
            <button key={n} type="button" className={tamanho === n ? 'chip active' : 'chip'} onClick={() => mudarTamanho(n)}>
              {n}×{n}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setValores(Array(tamanho * tamanho).fill(null))}>
            Limpar
          </button>
        </div>
        <div className="pf-grade" style={{ gridTemplateColumns: `repeat(${tamanho}, 1fr)` }}>
          {valores.map((v, i) => (
            <button key={i} type="button" className="pf-celula" style={{ background: cor(v, max) }} onClick={() => medirAqui(i)} aria-label={`Medir o quadrado ${i + 1}`}>
              {v ?? '+'}
            </button>
          ))}
        </div>
        {aviso && <p className="notice ok small">{aviso}</p>}
        {r && (
          <dl className="pf-dados">
            <dt>Média</dt>
            <dd>{Math.round(r.media)} µmol/m²/s</dd>
            <dt>Mínimo / máximo</dt>
            <dd>
              {r.min} / {r.max}
            </dd>
            <dt>Uniformidade</dt>
            <dd>
              {r.uniformidade.toFixed(2)} {r.uniformidade >= 0.7 ? '(boa)' : r.uniformidade >= 0.5 ? '(média: suba um pouco a luz)' : '(fraca: suba a luz ou acrescente outra)'}
            </dd>
            <dt>Pontos</dt>
            <dd>
              {r.n} de {tamanho * tamanho}
            </dd>
          </dl>
        )}
        <div className="pf-linha">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: tenda 1, 45 cm)" aria-label="Nome do mapa" />
          <button type="button" className="btn btn-primary" onClick={salvar} disabled={!r}>
            Salvar
          </button>
          <button type="button" className="btn btn-ghost" onClick={exportar} disabled={!r}>
            Planilha
          </button>
        </div>
      </section>
      {salvos.length > 0 && (
        <section className="pf-cartao">
          <h2>Mapas salvos</h2>
          <ul className="pf-salvos">
            {salvos.map((m, k) => {
              const s = resumoMapa(m.valores)
              return (
                <li key={k}>
                  <button type="button" onClick={() => (setTamanho(m.tamanho), setValores(m.valores))}>
                    <strong>{m.nome}</strong>
                    <span className="muted small">
                      {m.tamanho}×{m.tamanho} · média {s ? Math.round(s.media) : '—'} · uniformidade {s ? s.uniformidade.toFixed(2) : '—'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
