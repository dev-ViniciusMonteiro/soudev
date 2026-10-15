'use client'

import { useMemo, useState } from 'react'
import { Field, Notice, NumberInput, Tabs } from '../ui'
import { brl, fmt, parseNumber } from '@/lib/br'

function simular(principal, i, n, sistema) {
  const linhas = []
  let saldo = principal
  const price = i === 0 ? principal / n : (principal * i) / (1 - (1 + i) ** -n)
  const amortSac = principal / n
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i
    const amortizacao = sistema === 'sac' ? amortSac : price - juros
    const parcela = amortizacao + juros
    saldo = Math.max(0, saldo - amortizacao)
    linhas.push({ k, parcela, juros, amortizacao, saldo })
  }
  const total = linhas.reduce((t, l) => t + l.parcela, 0)
  return { linhas, total, juros: total - principal, primeira: linhas[0].parcela, ultima: linhas.at(-1).parcela }
}

export default function Financiamento() {
  const [f, setF] = useState({ valor: '300.000', entrada: '60.000', taxa: '11', tipoTaxa: 'ano', prazo: '360' })
  const [tabela, setTabela] = useState('sac')
  // A tabela (até 600 linhas) só é montada quando aberta, para manter a página leve.
  const [aberta, setAberta] = useState(false)
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }))

  const sim = useMemo(() => {
    const valor = parseNumber(f.valor)
    const entrada = parseNumber(f.entrada) || 0
    const taxa = parseNumber(f.taxa) / 100
    const prazo = Math.trunc(parseNumber(f.prazo))
    const principal = valor - entrada
    if (!(principal > 0) || !Number.isFinite(taxa) || taxa < 0 || !(prazo >= 1 && prazo <= 600)) return null
    const i = f.tipoTaxa === 'ano' ? (1 + taxa) ** (1 / 12) - 1 : taxa
    return { principal, i, sac: simular(principal, i, prazo, 'sac'), price: simular(principal, i, prazo, 'price') }
  }, [f])

  const atual = sim?.[tabela]

  return (
    <div className="tool-stack">
      <div className="grid-3">
        <Field label="Valor do bem (R$)">
          <NumberInput value={f.valor} onChange={set('valor')} />
        </Field>
        <Field label="Entrada (R$)">
          <NumberInput value={f.entrada} onChange={set('entrada')} />
        </Field>
        <Field label="Taxa de juros (%)">
          <div className="input-group">
            <NumberInput value={f.taxa} onChange={set('taxa')} />
            <select value={f.tipoTaxa} onChange={set('tipoTaxa')} aria-label="Período da taxa">
              <option value="ano">ao ano</option>
              <option value="mes">ao mês</option>
            </select>
          </div>
        </Field>
        <Field label="Prazo (meses)" hint="Até 600 meses.">
          <NumberInput value={f.prazo} onChange={set('prazo')} inputMode="numeric" />
        </Field>
      </div>

      {!sim ? (
        <Notice kind="warn">Confira os valores: a entrada precisa ser menor que o valor do bem e o prazo entre 1 e 600 meses.</Notice>
      ) : (
        <>
          <p className="muted">
            Valor financiado: <strong>{brl(sim.principal)}</strong> · taxa mensal equivalente: <strong>{fmt(sim.i * 100, 4)}%</strong>
          </p>
          <div className="compare-cards">
            {[
              ['sac', 'SAC', 'Parcelas decrescentes'],
              ['price', 'Price', 'Parcelas fixas'],
            ].map(([id, nome, desc]) => (
              <div key={id} className={sim.sac.juros <= sim.price.juros === (id === 'sac') ? 'compare-card best' : 'compare-card'}>
                <h2 className="tool-subtitle">{nome} <small className="muted">· {desc}</small></h2>
                <div className="row"><span>1ª parcela</span><strong>{brl(sim[id].primeira)}</strong></div>
                <div className="row"><span>Última parcela</span><strong>{brl(sim[id].ultima)}</strong></div>
                <div className="row"><span>Total de juros</span><strong>{brl(sim[id].juros)}</strong></div>
                <div className="row total"><span>Total pago</span><strong>{brl(sim[id].total)}</strong></div>
              </div>
            ))}
          </div>
          <p className="muted small">
            No SAC você paga {brl(sim.price.juros - sim.sac.juros)} a menos de juros. Simulação sem seguros, tarifas e correção monetária (TR/IPCA).
          </p>

          <details className="details" onToggle={(event) => setAberta(event.currentTarget.open)}>
            <summary>Ver tabela de amortização</summary>
            {aberta && (
            <div className="details-body">
              <Tabs tabs={[['sac', 'SAC'], ['price', 'Price']]} value={tabela} onChange={setTabela} />
              <div className="table-wrap table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Parcela</th>
                      <th>Juros</th>
                      <th>Amortização</th>
                      <th>Saldo devedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atual.linhas.map((l) => (
                      <tr key={l.k}>
                        <td>{l.k}</td>
                        <td>{brl(l.parcela)}</td>
                        <td>{brl(l.juros)}</td>
                        <td>{brl(l.amortizacao)}</td>
                        <td>{brl(l.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </details>
        </>
      )}
    </div>
  )
}
