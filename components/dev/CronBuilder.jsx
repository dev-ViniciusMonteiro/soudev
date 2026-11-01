'use client'

import { useEffect, useMemo, useState } from 'react'
import { ATALHOS, CAMPOS, MESES, SEMANA, analisarCron, explicar, proximas } from '@/lib/dev/cron'
import { Aviso, Copiar, Seg, usePersistente } from './comum'

const rotuloValor = (c, v) => (c.id === 'mes' ? MESES[v - 1].slice(0, 3) : c.id === 'sem' ? SEMANA[v].slice(0, 3) : String(v).padStart(2, '0'))

function modoDe(txt, c) {
  if (txt === '*') return { modo: 'todo' }
  let m = /^\*\/(\d+)$/.exec(txt)
  if (m) return { modo: 'cada', n: +m[1] }
  m = /^(\d+)-(\d+)$/.exec(txt)
  if (m) return { modo: 'intervalo', a: +m[1], b: +m[2] }
  try {
    if (/^[\w,]+$/.test(txt)) {
      const r = analisarCron(['*', '*', '*', '*', '*'].map((x, i) => (CAMPOS[i].id === c.id ? txt : x)).join(' '))
      return { modo: 'lista', vals: [...r.sets[CAMPOS.indexOf(c)]] }
    }
  } catch {}
  return { modo: 'custom' }
}

function EditorCampo({ c, txt, onChange }) {
  const m = modoDe(txt, c)
  const todos = Array.from({ length: c.max - c.min + 1 }, (_, i) => c.min + i)
  const setModo = (modo) => {
    if (modo === 'todo') onChange('*')
    if (modo === 'cada') onChange(`*/${c.id === 'min' ? 5 : 2}`)
    if (modo === 'intervalo') onChange(c.id === 'sem' ? '1-5' : `${c.min}-${Math.min(c.max, c.min + 5)}`)
    if (modo === 'lista') onChange(String(c.id === 'min' || c.id === 'hora' ? 0 : c.min))
  }
  const alternar = (v) => {
    const s = new Set(m.vals || [])
    s.has(v) ? s.delete(v) : s.add(v)
    onChange(s.size ? [...s].sort((a, b) => a - b).join(',') : '*')
  }
  return (
    <div className="dv-cron-campo">
      <div className="dv-cron-cab">
        <b>{c.nome}</b>
        <code>{txt}</code>
      </div>
      <Seg
        rotulo={c.nome}
        valor={m.modo}
        onChange={setModo}
        opcoes={[['todo', 'Todos'], ['cada', 'A cada'], ['lista', 'Escolher'], ['intervalo', 'De/até'], ...(m.modo === 'custom' ? [['custom', 'Livre']] : [])]}
      />
      {m.modo === 'cada' && (
        <label className="dv-cron-linha">
          a cada
          <input className="dv-input dv-num" type="number" min={1} max={c.max} value={m.n} onChange={(e) => onChange(`*/${Math.max(1, +e.target.value || 1)}`)} />
          {c.nome.toLowerCase()}(s)
        </label>
      )}
      {m.modo === 'intervalo' && (
        <label className="dv-cron-linha">
          de
          <select className="dv-input" value={m.a} onChange={(e) => onChange(`${e.target.value}-${Math.max(+e.target.value, m.b)}`)}>
            {todos.map((v) => <option key={v} value={v}>{rotuloValor(c, v)}</option>)}
          </select>
          até
          <select className="dv-input" value={m.b} onChange={(e) => onChange(`${Math.min(m.a, +e.target.value)}-${e.target.value}`)}>
            {todos.map((v) => <option key={v} value={v}>{rotuloValor(c, v)}</option>)}
          </select>
        </label>
      )}
      {m.modo === 'lista' && (
        <div className="dv-cron-grade" data-campo={c.id}>
          {todos.map((v) => (
            <button key={v} type="button" aria-pressed={m.vals.includes(v)} onClick={() => alternar(v)}>
              {rotuloValor(c, v)}
            </button>
          ))}
        </div>
      )}
      {m.modo === 'custom' && <p className="dv-dica">Valor personalizado; edite direto na expressão acima.</p>}
    </div>
  )
}

export default function CronBuilder() {
  const [expr, setExpr] = usePersistente('4dev-cron', '0 9 * * 1-5')
  const [utc, setUtc] = useState(false)
  const [agora, setAgora] = useState(null)
  useEffect(() => setAgora(new Date()), [expr, utc])

  const r = useMemo(() => {
    try {
      return { ok: true, ...analisarCron(expr) }
    } catch (e) {
      return { ok: false, erro: e.message }
    }
  }, [expr])
  const exp = r.ok ? explicar(r) : null
  const datas = r.ok && agora ? proximas(r, 10, { de: agora, utc }) : []
  const partes = r.ok ? r.partes : String(expr).trim().split(/\s+/)
  const setParte = (i, v) => {
    const p = [...(r.ok ? r.partes : ['*', '*', '*', '*', '*'])]
    p[i] = v
    setExpr(p.join(' '))
  }
  const fmt = (d) =>
    d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...(utc ? { timeZone: 'UTC' } : {}) })

  return (
    <div className="dv-ferramenta">
      <div className="dv-cron-expr">
        <input className="dv-input dv-cron-input" value={expr} onChange={(e) => setExpr(e.target.value)} spellCheck={false} aria-label="Expressão cron" data-erro={!r.ok || undefined} />
        <Copiar texto={expr} />
      </div>
      <div className="dv-cron-legenda" aria-hidden="true">
        {CAMPOS.map((c, i) => (
          <span key={c.id} data-ok={r.ok || undefined}>
            <code>{partes[i] ?? '?'}</code>
            {c.nome}
          </span>
        ))}
      </div>

      {r.ok ? (
        <div className="dv-cron-frase">
          <span aria-hidden="true">🗓️</span> {exp.texto}
        </div>
      ) : (
        <Aviso tipo="erro">{r.erro}</Aviso>
      )}
      {exp?.avisos.map((a) => (
        <Aviso key={a} tipo="alerta">⚠ {a}</Aviso>
      ))}

      <div className="dv-chips dv-atalhos">
        {ATALHOS.map(([e, nome]) => (
          <button key={e} type="button" className="dv-chip dv-chip-btn" aria-pressed={expr === e} onClick={() => setExpr(e)} title={e}>
            {nome}
          </button>
        ))}
      </div>

      <div className="dv-cron-layout">
        <div className="dv-cron-campos">
          {CAMPOS.map((c, i) => (
            <EditorCampo key={c.id} c={c} txt={r.ok ? r.partes[i] : '*'} onChange={(v) => setParte(i, v)} />
          ))}
        </div>
        <div className="dv-caixa dv-cron-prox">
          <div className="dv-barra">
            <p className="dv-rotulo">Próximas execuções</p>
            <span className="dv-espaco" />
            <label className="dv-check"><input type="checkbox" checked={utc} onChange={(e) => setUtc(e.target.checked)} /> UTC</label>
          </div>
          {r.ok && (
            <ol className="dv-lista-datas">
              {datas.map((d, i) => (
                <li key={d.getTime()}>
                  <span>{fmt(d)}</span>
                  {i === 0 && agora && <small>em {Math.max(1, Math.round((d - agora) / 60000)).toLocaleString('pt-BR')} min</small>}
                </li>
              ))}
              {!datas.length && <li>Nenhuma execução nos próximos 5 anos.</li>}
            </ol>
          )}
          <p className="dv-dica">Fuso: {utc ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone}. Servidores e GitHub Actions costumam usar UTC.</p>
        </div>
      </div>

      <details className="dv-colinha">
        <summary>Colinha de sintaxe</summary>
        <table className="dv-tabela">
          <tbody>
            <tr><td><code>*</code></td><td>qualquer valor</td></tr>
            <tr><td><code>5</code></td><td>exatamente 5</td></tr>
            <tr><td><code>1,15</code></td><td>lista: 1 e 15</td></tr>
            <tr><td><code>9-17</code></td><td>intervalo: de 9 a 17</td></tr>
            <tr><td><code>*/10</code></td><td>a cada 10</td></tr>
            <tr><td><code>0-30/5</code></td><td>de 0 a 30, a cada 5</td></tr>
            <tr><td><code>MON-FRI</code></td><td>nomes em inglês (dia da semana e mês)</td></tr>
            <tr><td><code>@daily</code></td><td>atalhos: @hourly, @daily, @weekly, @monthly, @yearly</td></tr>
          </tbody>
        </table>
      </details>
    </div>
  )
}
