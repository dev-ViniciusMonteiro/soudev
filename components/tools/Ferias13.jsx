'use client'

import { useState } from 'react'
import { Field, Notice, NumberInput, Rows, Stats, Tabs } from '../ui'
import { brl, parseNumber } from '@/lib/br'
import { calcularInss, calcularIrrf, round2 } from '@/lib/trabalhista'

function Ferias({ salario, dependentes }) {
  const [dias, setDias] = useState('30')
  const [abono, setAbono] = useState(false)
  const [mediaExtras, setMediaExtras] = useState('')

  const base = salario + (parseNumber(mediaExtras) || 0)
  const diasGozo = Math.min(Number(dias), abono ? 20 : 30)
  const ferias = round2((base / 30) * diasGozo)
  const terco = round2(ferias / 3)
  const abonoValor = abono ? round2((base / 30) * 10) : 0
  const abonoTerco = round2(abonoValor / 3)
  const inss = calcularInss(ferias + terco)
  const ir = calcularIrrf(ferias + terco, { inss, dependentes }).imposto
  const liquido = round2(ferias + terco + abonoValor + abonoTerco - inss - ir)

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label="Dias de férias">
          <select value={dias} onChange={(event) => setDias(event.target.value)}>
            {['30', '20', '15', '10'].map((d) => (
              <option key={d} value={d}>{d} dias</option>
            ))}
          </select>
        </Field>
        <Field label="Média de horas extras e adicionais (R$)" hint="Opcional. Entra na base das férias.">
          <NumberInput value={mediaExtras} onChange={(event) => setMediaExtras(event.target.value)} placeholder="0,00" />
        </Field>
        <label className="check">
          <input type="checkbox" checked={abono} onChange={(event) => setAbono(event.target.checked)} />
          Vender 10 dias (abono pecuniário)
        </label>
        {abono && Number(dias) > 20 && <Notice>Com a venda de 10 dias, o descanso fica em 20 dias.</Notice>}
      </div>
      <div className="tool-result">
        <Stats items={[['Férias brutas', brl(ferias + terco + abonoValor + abonoTerco)], ['Descontos', brl(inss + ir)], ['Férias líquidas', brl(liquido), true]]} />
        <Rows
          rows={[
            { label: `Férias (${diasGozo} dias)`, value: brl(ferias) },
            { label: '1/3 constitucional', value: brl(terco) },
            ...(abono ? [{ label: 'Abono pecuniário (10 dias)', value: brl(abonoValor) }, { label: '1/3 do abono', value: brl(abonoTerco) }] : []),
            { label: 'INSS', value: `− ${brl(inss)}` },
            { label: 'IRRF', value: `− ${brl(ir)}` },
          ]}
          total={{ label: 'Valor líquido', value: brl(liquido) }}
        />
        <p className="muted small">As férias devem ser pagas até 2 dias antes do início do descanso. O abono é isento de INSS e IR.</p>
      </div>
    </div>
  )
}

function Decimo({ salario, dependentes }) {
  const [meses, setMeses] = useState('12')
  const total = round2((salario / 12) * Number(meses))
  const primeira = round2(total / 2)
  const inss = calcularInss(total)
  const ir = calcularIrrf(total, { inss, dependentes }).imposto
  const segunda = round2(total - primeira - inss - ir)

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label="Meses trabalhados no ano" hint="Conta o mês em que você trabalhou 15 dias ou mais.">
          <select value={meses} onChange={(event) => setMeses(event.target.value)}>
            {Array.from({ length: 12 }, (_, i) => String(12 - i)).map((m) => (
              <option key={m} value={m}>{m} {m === '1' ? 'mês' : 'meses'}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="tool-result">
        <Stats items={[['13º bruto', brl(total)], ['1ª parcela (até 30/11)', brl(primeira)], ['2ª parcela (até 20/12)', brl(segunda), true]]} />
        <Rows
          rows={[
            { label: `13º proporcional (${meses}/12)`, value: brl(total) },
            { label: 'Adiantamento (1ª parcela)', value: `− ${brl(primeira)}` },
            { label: 'INSS', value: `− ${brl(inss)}` },
            { label: 'IRRF (tributação exclusiva)', value: `− ${brl(ir)}` },
          ]}
          total={{ label: 'Total líquido no ano', value: brl(primeira + segunda) }}
        />
      </div>
    </div>
  )
}

export default function Ferias13() {
  const [mode, setMode] = useState('ferias')
  const [bruto, setBruto] = useState('3.500,00')
  const [dependentes, setDependentes] = useState('0')
  const salario = parseNumber(bruto)

  return (
    <div className="tool-stack">
      <Tabs tabs={[['ferias', 'Férias'], ['decimo', '13º salário']]} value={mode} onChange={setMode} />
      <div className="grid-2">
        <Field label="Salário bruto (R$)">
          <NumberInput value={bruto} onChange={(event) => setBruto(event.target.value)} />
        </Field>
        <Field label="Dependentes (IR)">
          <NumberInput value={dependentes} onChange={(event) => setDependentes(event.target.value)} inputMode="numeric" />
        </Field>
      </div>
      {salario > 0 ? (
        mode === 'ferias' ? (
          <Ferias salario={salario} dependentes={Number(dependentes) || 0} />
        ) : (
          <Decimo salario={salario} dependentes={Number(dependentes) || 0} />
        )
      ) : (
        <Notice kind="warn">Informe o salário bruto.</Notice>
      )}
    </div>
  )
}
