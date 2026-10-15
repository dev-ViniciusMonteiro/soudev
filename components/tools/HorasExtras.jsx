'use client'

import { useState } from 'react'
import { Field, Notice, NumberInput, Rows, Stats } from '../ui'
import { brl, fmt, parseNumber } from '@/lib/br'
import { round2 } from '@/lib/trabalhista'

// Aceita "10", "10,5" ou "10:30".
function parseHoras(value) {
  const text = String(value ?? '').trim()
  if (!text) return 0
  const clock = text.match(/^(\d+):([0-5]?\d)$/)
  if (clock) return Number(clock[1]) + Number(clock[2]) / 60
  const n = parseNumber(text)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export default function HorasExtras() {
  const [f, setF] = useState({
    salario: '2.500,00',
    jornada: '220',
    he50: '10',
    he100: '',
    noturnas: '',
    percentual50: '50',
    percentual100: '100',
    diasUteis: '25',
    domingos: '5',
  })
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }))

  const salario = parseNumber(f.salario)
  const jornada = parseNumber(f.jornada)
  const h50 = parseHoras(f.he50)
  const h100 = parseHoras(f.he100)
  const hn = parseHoras(f.noturnas)
  const p50 = parseNumber(f.percentual50) / 100
  const p100 = parseNumber(f.percentual100) / 100
  const diasUteis = parseNumber(f.diasUteis)
  const domingos = parseNumber(f.domingos)
  const valid = salario > 0 && jornada > 0 && [h50, h100, hn, p50, p100].every(Number.isFinite) && diasUteis > 0 && domingos >= 0

  let result = <Notice kind="warn">Preencha o salário, a jornada e as horas (ex.: 10 ou 10:30).</Notice>
  if (valid) {
    const hora = salario / jornada
    const v50 = round2(hora * (1 + p50) * h50)
    const v100 = round2(hora * (1 + p100) * h100)
    const vNoturno = round2(hora * 0.2 * hn)
    const extras = v50 + v100 + vNoturno
    const dsr = round2((extras / diasUteis) * domingos)
    const total = round2(extras + dsr)
    result = (
      <>
        <Stats items={[['Valor da hora normal', brl(hora)], ['Hora extra a 50%', brl(hora * (1 + p50))], ['Total a receber', brl(total), true]]} />
        <Rows
          rows={[
            { label: `Horas extras a ${fmt(p50 * 100)}% (${fmt(h50)} h)`, value: brl(v50) },
            { label: `Horas extras a ${fmt(p100 * 100)}% (${fmt(h100)} h)`, value: brl(v100) },
            { label: `Adicional noturno de 20% (${fmt(hn)} h)`, value: brl(vNoturno) },
            { label: 'Reflexo no DSR', value: brl(dsr) },
          ]}
          total={{ label: 'Total de horas extras + DSR', value: brl(total) }}
        />
        <p className="muted small">
          Valores brutos, que entram na base do INSS, do IRRF e do FGTS. A hora noturna urbana (22h às 5h) tem 52 min 30 s; confira se o seu
          ponto já considera isso. Convenções coletivas podem prever percentuais maiores.
        </p>
      </>
    )
  }

  return (
    <div className="tool-split">
      <div className="tool-form">
        <div className="grid-2">
          <Field label="Salário bruto (R$)">
            <NumberInput value={f.salario} onChange={set('salario')} />
          </Field>
          <Field label="Jornada mensal (horas)">
            <select value={f.jornada} onChange={set('jornada')}>
              <option value="220">220 h (44h semanais)</option>
              <option value="200">200 h (40h semanais)</option>
              <option value="180">180 h (36h semanais)</option>
              <option value="150">150 h (30h semanais)</option>
            </select>
          </Field>
          <Field label="Horas extras em dias úteis" hint="Ex.: 10 ou 10:30">
            <input value={f.he50} onChange={set('he50')} inputMode="decimal" />
          </Field>
          <Field label="Adicional (%)">
            <NumberInput value={f.percentual50} onChange={set('percentual50')} />
          </Field>
          <Field label="Horas em domingos e feriados">
            <input value={f.he100} onChange={set('he100')} inputMode="decimal" placeholder="0" />
          </Field>
          <Field label="Adicional (%)">
            <NumberInput value={f.percentual100} onChange={set('percentual100')} />
          </Field>
          <Field label="Horas noturnas (22h às 5h)">
            <input value={f.noturnas} onChange={set('noturnas')} inputMode="decimal" placeholder="0" />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Dias úteis no mês" hint="Inclui sábados, se forem dias de trabalho.">
            <NumberInput value={f.diasUteis} onChange={set('diasUteis')} inputMode="numeric" />
          </Field>
          <Field label="Domingos e feriados no mês">
            <NumberInput value={f.domingos} onChange={set('domingos')} inputMode="numeric" />
          </Field>
        </div>
      </div>
      <div className="tool-result">{result}</div>
    </div>
  )
}
