'use client'

import { useState } from 'react'
import { Field, Notice, NumberInput, Rows, Stats } from '../ui'
import { brl, fmt, parseNumber } from '@/lib/br'
import { ANO_TABELAS, calcularInss, calcularIrrf, round2 } from '@/lib/trabalhista'

export default function SalarioLiquido() {
  const [bruto, setBruto] = useState('4.500,00')
  const [dependentes, setDependentes] = useState('0')
  const [outros, setOutros] = useState('')
  const [vt, setVt] = useState(false)

  const salario = parseNumber(bruto)
  const valid = salario > 0

  let content = <Notice kind="warn">Informe o salário bruto.</Notice>
  if (valid) {
    const inss = calcularInss(salario)
    const ir = calcularIrrf(salario, { inss, dependentes: Number(dependentes) || 0 })
    const valeTransporte = vt ? round2(salario * 0.06) : 0
    const outrosDescontos = parseNumber(outros) || 0
    const descontos = round2(inss + ir.imposto + valeTransporte + outrosDescontos)
    const liquido = round2(salario - descontos)

    content = (
      <>
        <Stats
          items={[
            ['Salário bruto', brl(salario)],
            ['Total de descontos', brl(descontos)],
            ['Salário líquido', brl(liquido), true],
          ]}
        />
        <Rows
          title="Descontos"
          negative
          rows={[
            { label: `INSS (alíquota efetiva ${fmt((inss / salario) * 100)}%)`, value: brl(inss) },
            { label: `IRRF (faixa de ${fmt(ir.aliquota * 100, 1)}%${ir.simplificado ? ', desconto simplificado' : ''})`, value: brl(ir.imposto) },
            ...(valeTransporte ? [{ label: 'Vale-transporte (6%)', value: brl(valeTransporte) }] : []),
            ...(outrosDescontos ? [{ label: 'Outros descontos', value: brl(outrosDescontos) }] : []),
          ]}
          total={{ label: 'Salário líquido', value: brl(liquido) }}
        />
        <p className="muted small">
          Base de cálculo do IR: {brl(ir.base)}. Tabelas de {ANO_TABELAS}, incluindo a redução do IR para rendimentos até R$ 7.350 (Lei 15.270/2025).
        </p>
      </>
    )
  }

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label="Salário bruto mensal (R$)">
          <NumberInput value={bruto} onChange={(event) => setBruto(event.target.value)} />
        </Field>
        <Field label="Número de dependentes">
          <NumberInput value={dependentes} onChange={(event) => setDependentes(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Outros descontos (R$)" hint="Plano de saúde, pensão, empréstimo consignado etc.">
          <NumberInput value={outros} onChange={(event) => setOutros(event.target.value)} placeholder="0,00" />
        </Field>
        <label className="check">
          <input type="checkbox" checked={vt} onChange={(event) => setVt(event.target.checked)} />
          Descontar vale-transporte (6% do salário)
        </label>
      </div>
      <div className="tool-result">{content}</div>
    </div>
  )
}
