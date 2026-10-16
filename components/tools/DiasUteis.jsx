'use client'

import { useEffect, useMemo, useState } from 'react'
import { Field, Notice, NumberInput, Stats, Tabs } from '../ui'
import { contarDiasUteis, feriadosNoIntervalo, isoDate, parseIso, somarDiasUteis, diaDaSemana } from '@/lib/feriados'
import { parseNumber } from '@/lib/br'

const DATA_INICIAL = '2026-01-02'

/** Datas extras (feriado estadual/municipal) digitadas como dd/mm/aaaa, uma por linha ou separadas por vírgula. */
function lerExtras(texto) {
  return texto
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .map((s) => s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))
    .filter(Boolean)
    .map(([, d, m, a]) => `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
}

const br = (iso) => iso.split('-').reverse().join('/')

export default function DiasUteis() {
  const [aba, setAba] = useState('contar')
  const [inicio, setInicio] = useState(DATA_INICIAL)
  const [fim, setFim] = useState('2026-02-02')
  const [dias, setDias] = useState('15')
  const [facultativos, setFacultativos] = useState(true)
  const [extrasTexto, setExtrasTexto] = useState('')

  useEffect(() => {
    const hoje = new Date()
    setInicio(isoDate(hoje))
    setFim(isoDate(new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate())))
  }, [])

  const extras = useMemo(() => lerExtras(extrasTexto), [extrasTexto])
  const opts = { facultativos, extras }

  const res = useMemo(() => {
    if (!inicio) return null
    const a = parseIso(inicio)
    if (aba === 'contar') {
      if (!fim) return null
      const b = parseIso(fim)
      const corridos = Math.round((b - a) / 86400000)
      const uteis = contarDiasUteis(a, b, opts)
      const feriados = feriadosNoIntervalo(a, b).filter((f) => facultativos || f.tipo === 'nacional')
      return { tipo: 'contar', corridos, uteis, feriados }
    }
    const n = Math.round(parseNumber(dias))
    if (!Number.isFinite(n) || Math.abs(n) > 3000) return null
    const data = somarDiasUteis(a, n, opts)
    return { tipo: 'somar', data, feriados: feriadosNoIntervalo(a < data ? a : data, a < data ? data : a).filter((f) => facultativos || f.tipo === 'nacional') }
  }, [aba, inicio, fim, dias, facultativos, extras])

  return (
    <div className="tool-stack">
      <Tabs tabs={[['contar', 'Contar dias úteis entre datas'], ['somar', 'Somar dias úteis (prazo)']]} value={aba} onChange={setAba} />
      <div className="grid-3">
        <Field label={aba === 'contar' ? 'Data inicial' : 'A partir de'}>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Field>
        {aba === 'contar' ? (
          <Field label="Data final">
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </Field>
        ) : (
          <Field label="Quantidade de dias úteis" hint="Use número negativo para contar para trás.">
            <NumberInput value={dias} onChange={(e) => setDias(e.target.value)} />
          </Field>
        )}
        <Field label="Carnaval e Corpus Christi">
          <select value={facultativos ? 'sim' : 'nao'} onChange={(e) => setFacultativos(e.target.value === 'sim')}>
            <option value="sim">Contam como folga</option>
            <option value="nao">Contam como dia útil</option>
          </select>
        </Field>
      </div>
      <Field label="Feriados estaduais ou municipais (opcional)" hint="Digite as datas no formato dd/mm/aaaa, separadas por vírgula. Ex.: 25/01/2026, 09/07/2026">
        <input value={extrasTexto} onChange={(e) => setExtrasTexto(e.target.value)} placeholder="25/01/2026, 09/07/2026" />
      </Field>
      {res?.tipo === 'contar' && (
        <Stats
          items={[
            ['Dias úteis', String(res.uteis), true],
            ['Dias corridos', String(res.corridos)],
            ['Feriados no período', String(res.feriados.length + extras.filter((e) => e > inicio && e <= fim).length)],
          ]}
        />
      )}
      {res?.tipo === 'somar' && (
        <Stats items={[['Data final', `${res.data.toLocaleDateString('pt-BR')} (${diaDaSemana(res.data)})`, true]]} />
      )}
      {res?.feriados.length > 0 && (
        <div className="rows">
          <h2 className="tool-subtitle">Feriados no período</h2>
          {res.feriados.map((f) => (
            <div key={f.data} className="row"><span>{br(f.data)} ({f.dia})</span><strong>{f.nome}{f.tipo === 'facultativo' ? ' (ponto facultativo)' : ''}</strong></div>
          ))}
        </div>
      )}
      <Notice kind="info">A data inicial não entra na conta, e a final entra. Sábados, domingos e feriados nacionais (inclusive Sexta-feira Santa, que muda todo ano) são descontados automaticamente.</Notice>
    </div>
  )
}
