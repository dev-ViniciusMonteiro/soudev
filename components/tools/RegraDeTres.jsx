'use client'

import { useState } from 'react'
import { Notice, NumberInput, Tabs } from '../ui'
import { fmt, parseNumber } from '@/lib/br'

export default function RegraDeTres() {
  const [tipo, setTipo] = useState('direta')
  const [values, setValues] = useState({ a: '2', b: '10', c: '5' })
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }))

  const a = parseNumber(values.a)
  const b = parseNumber(values.b)
  const c = parseNumber(values.c)
  const ready = [a, b, c].every(Number.isFinite)
  const divisor = tipo === 'direta' ? a : c
  const x = ready && divisor !== 0 ? (tipo === 'direta' ? (b * c) / a : (a * b) / c) : null

  return (
    <div className="tool-stack">
      <Tabs tabs={[['direta', 'Diretamente proporcional'], ['inversa', 'Inversamente proporcional']]} value={tipo} onChange={setTipo} />
      <div className="rule3">
        <NumberInput value={values.a} onChange={set('a')} aria-label="Valor A" />
        <span>está para</span>
        <NumberInput value={values.b} onChange={set('b')} aria-label="Valor B" />
        <span>assim como</span>
        <NumberInput value={values.c} onChange={set('c')} aria-label="Valor C" />
        <span>está para</span>
        <output className="rule3-x">{x === null ? 'X' : fmt(x, 6)}</output>
      </div>
      {x === null ? (
        <Notice kind="warn">{ready ? 'Não é possível dividir por zero.' : 'Preencha os três valores.'}</Notice>
      ) : (
        <div className="steps">
          <h2 className="tool-subtitle">Passo a passo</h2>
          {tipo === 'direta' ? (
            <>
              <p>{fmt(a, 6)} · X = {fmt(b, 6)} · {fmt(c, 6)}</p>
              <p>X = ({fmt(b, 6)} × {fmt(c, 6)}) ÷ {fmt(a, 6)}</p>
            </>
          ) : (
            <>
              <p>As grandezas são inversas, então multiplicamos em linha: {fmt(a, 6)} · {fmt(b, 6)} = {fmt(c, 6)} · X</p>
              <p>X = ({fmt(a, 6)} × {fmt(b, 6)}) ÷ {fmt(c, 6)}</p>
            </>
          )}
          <p>
            <strong>X = {fmt(x, 6)}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
