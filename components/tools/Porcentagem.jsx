'use client'

import { useState } from 'react'
import { NumberInput } from '../ui'
import { fmt, parseNumber } from '@/lib/br'

function Calc({ title, before, middle, after, compute, explain }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const x = parseNumber(a)
  const y = parseNumber(b)
  const ready = Number.isFinite(x) && Number.isFinite(y)
  const result = ready ? compute(x, y) : null
  const ok = result !== null && Number.isFinite(result)

  return (
    <div className="mini-calc">
      <h2 className="tool-subtitle">{title}</h2>
      <div className="sentence">
        {before && <span>{before}</span>}
        <NumberInput value={a} onChange={(event) => setA(event.target.value)} aria-label="Primeiro valor" />
        <span>{middle}</span>
        <NumberInput value={b} onChange={(event) => setB(event.target.value)} aria-label="Segundo valor" />
        {after && <span>{after}</span>}
      </div>
      <p className="mini-result" aria-live="polite">
        {ok ? explain(x, y, result) : ready ? 'Não dá para dividir por zero.' : 'Preencha os dois campos.'}
      </p>
    </div>
  )
}

export default function Porcentagem() {
  return (
    <div className="mini-grid">
      <Calc
        title="Quanto é X% de um valor"
        before="Quanto é"
        middle="% de"
        compute={(x, y) => (x / 100) * y}
        explain={(x, y, r) => <><strong>{fmt(r, 4)}</strong> ({fmt(x, 4)}% de {fmt(y, 4)})</>}
      />
      <Calc
        title="Que porcentagem X representa"
        middle="é quantos % de"
        compute={(x, y) => (y === 0 ? null : (x / y) * 100)}
        explain={(x, y, r) => <><strong>{fmt(r, 4)}%</strong> ({fmt(x, 4)} de {fmt(y, 4)})</>}
      />
      <Calc
        title="Aumento ou desconto"
        before="Valor"
        middle="com variação de (%)"
        after="(use − para desconto)"
        compute={(x, y) => x * (1 + y / 100)}
        explain={(x, y, r) => <>Resultado: <strong>{fmt(r, 4)}</strong> ({y >= 0 ? 'aumento' : 'desconto'} de {fmt(Math.abs(x * (y / 100)), 4)})</>}
      />
      <Calc
        title="Variação percentual"
        before="De"
        middle="para"
        compute={(x, y) => (x === 0 ? null : ((y - x) / Math.abs(x)) * 100)}
        explain={(x, y, r) => <>Variação de <strong>{r >= 0 ? '+' : ''}{fmt(r, 4)}%</strong> ({r >= 0 ? 'aumento' : 'queda'})</>}
      />
    </div>
  )
}
