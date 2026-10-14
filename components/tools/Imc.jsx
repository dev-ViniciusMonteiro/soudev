'use client'

import { useState } from 'react'
import { Field, Notice, NumberInput, Stats } from '../ui'
import { fmt, parseNumber } from '@/lib/br'

const FAIXAS = [
  { ate: 18.5, label: 'Abaixo do peso', tone: 'warn' },
  { ate: 25, label: 'Peso normal', tone: 'ok' },
  { ate: 30, label: 'Sobrepeso', tone: 'warn' },
  { ate: 35, label: 'Obesidade grau I', tone: 'bad' },
  { ate: 40, label: 'Obesidade grau II', tone: 'bad' },
  { ate: Infinity, label: 'Obesidade grau III', tone: 'bad' },
]

export default function Imc() {
  const [peso, setPeso] = useState('70')
  const [altura, setAltura] = useState('170')

  const kg = parseNumber(peso)
  let metros = parseNumber(altura)
  if (metros > 3) metros /= 100
  const valid = kg > 0 && metros > 0.5 && metros < 2.6
  const imc = valid ? kg / metros ** 2 : 0
  const faixa = FAIXAS.find((item) => imc < item.ate)
  const position = Math.min(100, Math.max(0, ((imc - 15) / (42 - 15)) * 100))

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label="Peso (kg)">
          <NumberInput value={peso} onChange={(event) => setPeso(event.target.value)} />
        </Field>
        <Field label="Altura (cm ou m)" hint="Ex.: 170 ou 1,70">
          <NumberInput value={altura} onChange={(event) => setAltura(event.target.value)} />
        </Field>
      </div>
      <div className="tool-result">
        {!valid ? (
          <Notice kind="warn">Informe peso e altura válidos.</Notice>
        ) : (
          <>
            <Stats items={[['Seu IMC', fmt(imc, 1), true], ['Classificação', faixa.label]]} />
            <div className="scale" aria-hidden="true">
              <div className="scale-track" />
              <span className="scale-marker" style={{ left: `${position}%` }} />
              <div className="scale-labels">
                <span>18,5</span>
                <span>25</span>
                <span>30</span>
                <span>35</span>
                <span>40</span>
              </div>
            </div>
            <p>
              Para a sua altura, a faixa de peso considerada saudável vai de <strong>{fmt(18.5 * metros ** 2, 1)} kg</strong> a{' '}
              <strong>{fmt(24.9 * metros ** 2, 1)} kg</strong>.
            </p>
            <p className="muted small">Classificação da OMS para adultos. Não substitui avaliação médica ou nutricional.</p>
          </>
        )}
      </div>
    </div>
  )
}
