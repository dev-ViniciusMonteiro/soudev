'use client'

import { useState } from 'react'
import { Field, Notice, NumberInput, Rows, Stats } from '../ui'
import { brl, parseNumber } from '@/lib/br'
import { SALARIO_MINIMO, SEGURO_DESEMPREGO, calcularSeguroDesemprego, parcelasSeguroDesemprego, round2 } from '@/lib/trabalhista'

const MINIMO_MESES = { 1: 12, 2: 9, 3: 6 }

export default function SeguroDesemprego() {
  const [salarios, setSalarios] = useState(['2.800,00', '2.800,00', '2.800,00'])
  const [solicitacao, setSolicitacao] = useState('1')
  const [meses, setMeses] = useState('18')

  const valores = salarios.map(parseNumber).filter((n) => n > 0)
  const nSolicitacao = Number(solicitacao)
  const nMeses = Math.trunc(parseNumber(meses))

  let result = <Notice kind="warn">Informe pelo menos um salário e os meses trabalhados.</Notice>
  if (valores.length && Number.isFinite(nMeses) && nMeses >= 0) {
    const media = round2(valores.reduce((t, v) => t + v, 0) / valores.length)
    const parcela = calcularSeguroDesemprego(media)
    const parcelas = parcelasSeguroDesemprego(nSolicitacao, nMeses)
    const faixa =
      media <= SEGURO_DESEMPREGO.faixa1
        ? '80% da média salarial'
        : media <= SEGURO_DESEMPREGO.faixa2
          ? `${brl(SEGURO_DESEMPREGO.base2)} + 50% do que passa de ${brl(SEGURO_DESEMPREGO.faixa1)}`
          : 'teto do benefício'

    result = parcelas ? (
      <>
        <Stats items={[['Valor da parcela', brl(parcela), true], ['Parcelas', String(parcelas)], ['Total a receber', brl(parcela * parcelas)]]} />
        <Rows
          rows={[
            { label: `Média dos ${valores.length} último(s) salário(s)`, value: brl(media) },
            { label: 'Regra aplicada', value: faixa },
            ...(parcela === SALARIO_MINIMO ? [{ label: 'Ajuste', value: 'elevado ao salário mínimo' }] : []),
          ]}
        />
        <p className="muted small">
          Tabela vigente desde 11/01/2026: piso de {brl(SALARIO_MINIMO)} e teto de {brl(SEGURO_DESEMPREGO.teto)}. Peça o benefício entre 7 e 120 dias
          após a dispensa, pela Carteira de Trabalho Digital ou pelo gov.br. Estimativa: a análise final é do Ministério do Trabalho.
        </p>
      </>
    ) : (
      <Notice kind="warn">
        Na {nSolicitacao === 3 ? '3ª solicitação ou mais' : `${nSolicitacao}ª solicitação`} é preciso ter trabalhado pelo menos {MINIMO_MESES[Math.min(nSolicitacao, 3)]}{' '}
        meses{nSolicitacao === 1 ? ' nos últimos 18 meses' : ''}. Com {nMeses} meses, você ainda não tem direito ao seguro-desemprego.
      </Notice>
    )
  }

  return (
    <div className="tool-split">
      <div className="tool-form">
        <span className="field-label">Salários brutos dos 3 meses antes da dispensa</span>
        <div className="grid-3">
          {['Antepenúltimo', 'Penúltimo', 'Último'].map((label, index) => (
            <Field key={label} label={`${label} (R$)`}>
              <NumberInput
                value={salarios[index]}
                onChange={(event) => setSalarios((current) => current.map((s, i) => (i === index ? event.target.value : s)))}
              />
            </Field>
          ))}
        </div>
        <Field label="Quantas vezes você já pediu o seguro-desemprego?">
          <select value={solicitacao} onChange={(event) => setSolicitacao(event.target.value)}>
            <option value="1">Esta é a 1ª vez</option>
            <option value="2">Esta é a 2ª vez</option>
            <option value="3">3ª vez ou mais</option>
          </select>
        </Field>
        <Field label="Meses trabalhados com carteira assinada nos últimos 36 meses">
          <NumberInput value={meses} onChange={(event) => setMeses(event.target.value)} inputMode="numeric" />
        </Field>
        <Notice>Só tem direito quem foi dispensado sem justa causa. Pedido de demissão e acordo não dão direito.</Notice>
      </div>
      <div className="tool-result">{result}</div>
    </div>
  )
}
