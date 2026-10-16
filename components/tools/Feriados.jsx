'use client'

import { useEffect, useMemo, useState } from 'react'
import { downloadBlob } from '@/lib/client'
import { feriadosDoAno, isoDate, parseIso } from '@/lib/feriados'

const ANO_INICIAL = 2026
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Feriadão: feriado na sexta/segunda (fim de semana de 3 dias) ou na terça/quinta (enforcado). */
function emenda(data) {
  const dia = parseIso(data).getDay()
  if (dia === 1 || dia === 5) return 'Fim de semana prolongado'
  if (dia === 2) return 'Dá para enforcar a segunda'
  if (dia === 4) return 'Dá para enforcar a sexta'
  if (dia === 0 || dia === 6) return 'Cai no fim de semana'
  return ''
}

function ics(lista, ano) {
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//soudev//feriados//PT']
  for (const f of lista) {
    const d = f.data.replace(/-/g, '')
    const prox = isoDate(new Date(parseIso(f.data).getTime() + 86400000)).replace(/-/g, '')
    linhas.push('BEGIN:VEVENT', `UID:${d}-${f.nome.replace(/\W/g, '')}@soudev`, `DTSTAMP:${ano}0101T000000Z`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${prox}`, `SUMMARY:${f.nome}${f.tipo === 'facultativo' ? ' (ponto facultativo)' : ''}`, 'END:VEVENT')
  }
  linhas.push('END:VCALENDAR')
  return linhas.join('\r\n')
}

export default function Feriados() {
  const [ano, setAno] = useState(ANO_INICIAL)
  const [hoje, setHoje] = useState('')
  useEffect(() => {
    setAno(new Date().getFullYear())
    setHoje(isoDate(new Date()))
  }, [])

  const lista = useMemo(() => feriadosDoAno(ano), [ano])
  const proximo = hoje ? lista.find((f) => f.data >= hoje) : null
  const diasAte = proximo ? Math.round((parseIso(proximo.data) - parseIso(hoje)) / 86400000) : null
  const prolongados = lista.filter((f) => [1, 2, 4, 5].includes(parseIso(f.data).getDay())).length

  const baixar = () => {
    downloadBlob(new Blob([ics(lista, ano)], { type: 'text/calendar' }), `feriados-${ano}.ics`)
  }

  return (
    <div className="tool-stack">
      <div className="chips">
        {[ano - 1, ano, ano + 1].map((a) => (
          <button key={a} type="button" className={a === ano ? 'chip active' : 'chip'} onClick={() => setAno(a)}>{a}</button>
        ))}
      </div>
      <div className="stats">
        {proximo && <div className="stat highlight"><span>Próximo feriado</span><strong>{proximo.nome} {diasAte === 0 ? '(hoje!)' : `em ${diasAte} dia${diasAte === 1 ? '' : 's'}`}</strong></div>}
        <div className="stat"><span>Feriados e pontos facultativos em {ano}</span><strong>{lista.length}</strong></div>
        <div className="stat"><span>Feriadões possíveis</span><strong>{prolongados}</strong></div>
      </div>
      <ol className="holiday-list">
        {lista.map((f) => (
          <li key={f.data} className={f.data < hoje ? 'past' : ''}>
            <span className="holiday-date">
              <b>{f.data.slice(8)}</b>
              {MES[Number(f.data.slice(5, 7)) - 1]}
            </span>
            <span>
              <strong>{f.nome}</strong>
              <small>
                {f.dia}
                {f.tipo === 'facultativo' && ' • ponto facultativo'}
                {emenda(f.data) && ` • ${emenda(f.data)}`}
              </small>
            </span>
          </li>
        ))}
      </ol>
      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={baixar}>Adicionar à agenda (.ics)</button>
      </div>
      <p className="muted small">Feriados nacionais e pontos facultativos nacionais. Cada estado e cidade tem feriados próprios (aniversário da cidade, padroeiro), que não aparecem aqui.</p>
    </div>
  )
}
