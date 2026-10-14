'use client'

import { useEffect, useState } from 'react'
import { Field, Notice, NumberInput, Stats, Tabs } from '../ui'
import { fmt } from '@/lib/br'
import { DATA_INICIAL, addDays, diferencaCalendario, diffDays, parseDate, toInputDate } from '@/lib/trabalhista'

// Começa com uma data fixa (igual no servidor e no navegador) e troca por hoje após carregar.
function useHoje(setter, offset = 0) {
  useEffect(() => setter(toInputDate(addDays(new Date(), offset))), [setter, offset])
}

const FERIADOS_FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const isDiaUtil = (date) => {
  const dia = date.getDay()
  const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return dia !== 0 && dia !== 6 && !FERIADOS_FIXOS.includes(md)
}

const longDate = (date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

function contarDiasUteis(inicio, fim) {
  const [a, b] = inicio <= fim ? [inicio, fim] : [fim, inicio]
  let count = 0
  for (let d = addDays(a, 1); d <= b; d = addDays(d, 1)) if (isDiaUtil(d)) count++
  return count
}

function somarDiasUteis(inicio, dias) {
  const passo = dias >= 0 ? 1 : -1
  let restante = Math.abs(dias)
  let d = inicio
  while (restante > 0) {
    d = addDays(d, passo)
    if (isDiaUtil(d)) restante--
  }
  return d
}

const plural = (n, um, varios) => `${fmt(n, 0)} ${n === 1 ? um : varios}`

function EntreDatas() {
  const [inicio, setInicio] = useState(toInputDate(DATA_INICIAL))
  const [fim, setFim] = useState(toInputDate(addDays(DATA_INICIAL, 30)))
  useHoje(setInicio)
  useHoje(setFim, 30)
  const a = parseDate(inicio)
  const b = parseDate(fim)
  if (!a || !b)
    return (
      <Form inicio={inicio} fim={fim} setInicio={setInicio} setFim={setFim}>
        <Notice kind="warn">Informe as duas datas.</Notice>
      </Form>
    )
  const dias = diffDays(a, b)
  const cal = diferencaCalendario(a <= b ? a : b, a <= b ? b : a)
  return (
    <Form inicio={inicio} fim={fim} setInicio={setInicio} setFim={setFim}>
      <Stats
        items={[
          ['Dias corridos', fmt(Math.abs(dias), 0), true],
          ['Dias úteis', fmt(contarDiasUteis(a, b), 0)],
          ['Semanas', fmt(Math.abs(dias) / 7, 1)],
        ]}
      />
      <p>
        São {plural(cal.anos, 'ano', 'anos')}, {plural(cal.meses, 'mês', 'meses')} e {plural(cal.dias, 'dia', 'dias')}
        {dias < 0 ? ' (a data final é anterior à inicial)' : ''}.
      </p>
      <p className="muted small">Dias úteis desconsideram a data inicial, fins de semana e feriados nacionais fixos.</p>
    </Form>
  )
}

function Form({ inicio, fim, setInicio, setFim, children }) {
  return (
    <div className="tool-stack">
      <div className="grid-2">
        <Field label="Data inicial">
          <input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} />
        </Field>
        <Field label="Data final">
          <input type="date" value={fim} onChange={(event) => setFim(event.target.value)} />
        </Field>
      </div>
      {children}
    </div>
  )
}

function SomarDias() {
  const [inicio, setInicio] = useState(toInputDate(DATA_INICIAL))
  useHoje(setInicio)
  const [dias, setDias] = useState('30')
  const [tipo, setTipo] = useState('corridos')
  const a = parseDate(inicio)
  const n = Math.trunc(Number(String(dias).replace(',', '.')))
  const valid = a && Number.isFinite(n) && Math.abs(n) <= 36500
  const resultado = valid ? (tipo === 'uteis' ? somarDiasUteis(a, n) : addDays(a, n)) : null
  return (
    <div className="tool-stack">
      <div className="grid-3">
        <Field label="Data de partida">
          <input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} />
        </Field>
        <Field label="Dias (use − para subtrair)">
          <NumberInput value={dias} onChange={(event) => setDias(event.target.value)} />
        </Field>
        <Field label="Tipo de contagem">
          <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="corridos">Dias corridos</option>
            <option value="uteis">Dias úteis</option>
          </select>
        </Field>
      </div>
      {resultado ? <Stats items={[['Data resultante', longDate(resultado), true]]} /> : <Notice kind="warn">Preencha a data e a quantidade de dias.</Notice>}
    </div>
  )
}

function Idade() {
  const [nascimento, setNascimento] = useState('1995-06-15')
  const [referencia, setReferencia] = useState(toInputDate(DATA_INICIAL))
  useHoje(setReferencia)
  const a = parseDate(nascimento)
  const b = parseDate(referencia)
  const valid = a && b && a <= b
  let content = <Notice kind="warn">A data de nascimento precisa ser anterior à data de referência.</Notice>
  if (valid) {
    const idade = diferencaCalendario(a, b)
    let proximo = new Date(b.getFullYear(), a.getMonth(), a.getDate())
    if (proximo < b) proximo = new Date(b.getFullYear() + 1, a.getMonth(), a.getDate())
    const faltam = diffDays(b, proximo)
    content = (
      <>
        <Stats
          items={[
            ['Idade', plural(idade.anos, 'ano', 'anos'), true],
            ['Meses e dias', `${plural(idade.meses, 'mês', 'meses')} e ${plural(idade.dias, 'dia', 'dias')}`],
            ['Dias de vida', fmt(diffDays(a, b), 0)],
          ]}
        />
        <p>
          Nasceu em uma {SEMANA[a.getDay()]}. {faltam === 0 ? 'Feliz aniversário! 🎉' : `Faltam ${plural(faltam, 'dia', 'dias')} para o próximo aniversário (${SEMANA[proximo.getDay()]}).`}
        </p>
      </>
    )
  }
  return (
    <div className="tool-stack">
      <div className="grid-2">
        <Field label="Data de nascimento">
          <input type="date" value={nascimento} onChange={(event) => setNascimento(event.target.value)} />
        </Field>
        <Field label="Calcular idade em">
          <input type="date" value={referencia} onChange={(event) => setReferencia(event.target.value)} />
        </Field>
      </div>
      {content}
    </div>
  )
}

export default function Datas() {
  const [mode, setMode] = useState('entre')
  return (
    <div className="tool-stack">
      <Tabs tabs={[['entre', 'Dias entre datas'], ['somar', 'Somar dias'], ['idade', 'Calcular idade']]} value={mode} onChange={setMode} />
      {mode === 'entre' && <EntreDatas />}
      {mode === 'somar' && <SomarDias />}
      {mode === 'idade' && <Idade />}
    </div>
  )
}
