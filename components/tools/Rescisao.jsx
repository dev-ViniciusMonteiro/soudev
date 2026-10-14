'use client'

import { useEffect, useMemo, useState } from 'react'
import { Field, Notice, NumberInput, Rows, Stats } from '../ui'
import { brl, parseNumber } from '@/lib/br'
import { ANO_TABELAS, DATA_INICIAL, MOTIVOS_RESCISAO, calcularRescisao, parseDate, toInputDate } from '@/lib/trabalhista'

const datasPadrao = (hoje) => ({
  admissao: toInputDate(new Date(hoje.getFullYear() - 2, hoje.getMonth(), 1)),
  saida: toInputDate(hoje),
})

export default function Rescisao() {
  const [form, setForm] = useState({
    salario: '3.000,00',
    ...datasPadrao(DATA_INICIAL),
    motivo: 'sem_justa',
    aviso: 'indenizado',
    feriasVencidas: '0',
    saldoFgts: '',
    dependentes: '0',
  })
  // O HTML do build usa uma data fixa; no navegador trocamos pelas datas de hoje.
  useEffect(() => setForm((current) => ({ ...current, ...datasPadrao(new Date()) })), [])
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const { result, error } = useMemo(() => {
    const salario = parseNumber(form.salario)
    const admissao = parseDate(form.admissao)
    const saida = parseDate(form.saida)
    if (!(salario > 0)) return { error: 'Informe o último salário bruto.' }
    if (!admissao || !saida) return { error: 'Informe as datas de admissão e de saída.' }
    if (saida <= admissao) return { error: 'A data de saída precisa ser depois da admissão.' }
    const saldo = parseNumber(form.saldoFgts)
    return {
      result: calcularRescisao({
        salario,
        admissao,
        saida,
        motivo: form.motivo,
        aviso: form.aviso,
        feriasVencidas: Number(form.feriasVencidas),
        saldoFgts: Number.isFinite(saldo) ? saldo : undefined,
        dependentes: Number(form.dependentes) || 0,
      }),
    }
  }, [form])

  const avisoOptions =
    form.motivo === 'pedido'
      ? [['trabalhado', 'Trabalhado ou dispensado pela empresa'], ['nao_cumprido', 'Não cumprido (será descontado)']]
      : form.motivo === 'justa'
        ? [['trabalhado', 'Não se aplica']]
        : [['indenizado', 'Indenizado'], ['trabalhado', 'Trabalhado']]

  const changeMotivo = (event) => {
    const motivo = event.target.value
    const aviso = motivo === 'sem_justa' || motivo === 'acordo' ? 'indenizado' : 'trabalhado'
    setForm((current) => ({ ...current, motivo, aviso }))
  }

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label="Último salário bruto (R$)">
          <NumberInput value={form.salario} onChange={set('salario')} />
        </Field>
        <div className="grid-2">
          <Field label="Data de admissão">
            <input type="date" value={form.admissao} onChange={set('admissao')} />
          </Field>
          <Field label="Último dia trabalhado">
            <input type="date" value={form.saida} onChange={set('saida')} />
          </Field>
        </div>
        <Field label="Motivo da saída">
          <select value={form.motivo} onChange={changeMotivo}>
            {Object.entries(MOTIVOS_RESCISAO).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Aviso prévio">
          <select value={form.aviso} onChange={set('aviso')} disabled={form.motivo === 'justa'}>
            {avisoOptions.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </Field>
        <div className="grid-2">
          <Field label="Férias vencidas">
            <select value={form.feriasVencidas} onChange={set('feriasVencidas')}>
              <option value="0">Não tenho</option>
              <option value="1">1 período</option>
              <option value="2">2 períodos</option>
            </select>
          </Field>
          <Field label="Dependentes (IR)">
            <NumberInput value={form.dependentes} onChange={set('dependentes')} inputMode="numeric" />
          </Field>
        </div>
        <Field label="Saldo do FGTS (opcional)" hint="Se deixar em branco, estimamos 8% do salário por mês trabalhado.">
          <NumberInput value={form.saldoFgts} onChange={set('saldoFgts')} placeholder="Ex.: 8.500,00" />
        </Field>
      </div>

      <div className="tool-result">
        {error ? (
          <Notice kind="warn">{error}</Notice>
        ) : (
          <>
            <Stats
              items={[
                ['Total bruto', brl(result.bruto)],
                ['Descontos', brl(result.totalDescontos)],
                ['Líquido a receber', brl(result.liquido), true],
              ]}
            />
            <Rows title="Verbas rescisórias" rows={result.linhas.map((l) => ({ label: l.label, value: brl(l.valor) }))} />
            {result.descontos.length > 0 && (
              <Rows title="Descontos" negative rows={result.descontos.map((l) => ({ label: l.label, value: brl(l.valor) }))} />
            )}
            <Rows
              title="FGTS"
              rows={[
                { label: `Saldo${result.fgts.saldoEstimado ? ' (estimado)' : ''}`, value: brl(result.fgts.saldo) },
                { label: 'Depósito sobre a rescisão', value: brl(result.fgts.deposito) },
                ...(result.fgts.multa ? [{ label: `Multa de ${result.fgts.multaPercentual * 100}%`, value: brl(result.fgts.multa) }] : []),
              ]}
              total={result.fgts.saque ? { label: 'Disponível para saque', value: brl(result.fgts.saque) } : undefined}
            />
            <p className="muted small">
              Tempo de casa: {result.anos} ano(s) completo(s). Aviso prévio proporcional: {result.diasAviso} dias.
              {result.seguroDesemprego && ' Você pode ter direito ao seguro-desemprego.'} Estimativa com tabelas de INSS e IRRF de {ANO_TABELAS}. Não substitui o cálculo oficial
              da empresa ou do sindicato.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
