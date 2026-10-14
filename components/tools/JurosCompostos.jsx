'use client'

import { useMemo, useState } from 'react'
import { Field, Notice, NumberInput, Stats } from '../ui'
import { brl, parseNumber } from '@/lib/br'

export default function JurosCompostos() {
  const [form, setForm] = useState({ capital: '1.000', aporte: '300', taxa: '1', tipoTaxa: 'mes', periodo: '10', tipoPeriodo: 'anos' })
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const sim = useMemo(() => {
    const capital = parseNumber(form.capital) || 0
    const aporte = parseNumber(form.aporte) || 0
    const taxa = parseNumber(form.taxa) / 100
    const periodo = Math.round(parseNumber(form.periodo))
    if (!Number.isFinite(taxa) || taxa < 0 || !(periodo > 0)) return null
    const meses = form.tipoPeriodo === 'anos' ? periodo * 12 : periodo
    if (meses > 1200) return null
    const i = form.tipoTaxa === 'ano' ? (1 + taxa) ** (1 / 12) - 1 : taxa

    let saldo = capital
    let investido = capital
    const linhas = []
    const passo = meses > 24 ? 12 : 1
    for (let m = 1; m <= meses; m++) {
      saldo = saldo * (1 + i) + aporte
      investido += aporte
      if (m % passo === 0 || m === meses) linhas.push({ periodo: passo === 12 ? `Ano ${Math.ceil(m / 12)}` : `Mês ${m}`, investido, juros: saldo - investido, saldo })
    }
    return { saldo, investido, juros: saldo - investido, linhas, taxaMensal: i }
  }, [form])

  const max = sim ? sim.saldo : 1

  return (
    <div className="tool-stack">
      <div className="grid-3">
        <Field label="Valor inicial (R$)">
          <NumberInput value={form.capital} onChange={set('capital')} />
        </Field>
        <Field label="Aporte mensal (R$)">
          <NumberInput value={form.aporte} onChange={set('aporte')} />
        </Field>
        <Field label="Taxa de juros (%)">
          <div className="input-group">
            <NumberInput value={form.taxa} onChange={set('taxa')} />
            <select value={form.tipoTaxa} onChange={set('tipoTaxa')} aria-label="Período da taxa">
              <option value="mes">ao mês</option>
              <option value="ano">ao ano</option>
            </select>
          </div>
        </Field>
        <Field label="Período">
          <div className="input-group">
            <NumberInput value={form.periodo} onChange={set('periodo')} inputMode="numeric" />
            <select value={form.tipoPeriodo} onChange={set('tipoPeriodo')} aria-label="Unidade do período">
              <option value="anos">anos</option>
              <option value="meses">meses</option>
            </select>
          </div>
        </Field>
      </div>

      {!sim ? (
        <Notice kind="warn">Preencha a taxa e um período de até 100 anos.</Notice>
      ) : (
        <>
          <Stats items={[['Total investido', brl(sim.investido)], ['Total em juros', brl(sim.juros)], ['Valor final', brl(sim.saldo), true]]} />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Investido</th>
                  <th>Juros</th>
                  <th>Total</th>
                  <th className="bar-col" aria-label="Gráfico" />
                </tr>
              </thead>
              <tbody>
                {sim.linhas.map((linha) => (
                  <tr key={linha.periodo}>
                    <td>{linha.periodo}</td>
                    <td>{brl(linha.investido)}</td>
                    <td>{brl(linha.juros)}</td>
                    <td><strong>{brl(linha.saldo)}</strong></td>
                    <td className="bar-col">
                      <span className="bar">
                        <span className="bar-a" style={{ width: `${(linha.investido / max) * 100}%` }} />
                        <span className="bar-b" style={{ width: `${(Math.max(0, linha.juros) / max) * 100}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            <span className="legend legend-a" /> investido <span className="legend legend-b" /> juros. Valores brutos, sem imposto e inflação.
          </p>
        </>
      )}
    </div>
  )
}
