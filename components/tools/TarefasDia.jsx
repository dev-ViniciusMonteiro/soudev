'use client'

// Controle de tarefas diárias, salvo no navegador. Rotina (repete todo dia, com sequência/streak) e
// tarefas avulsas por data. Navega entre os dias, mostra progresso e marca concluídas. Nada vai a servidores.

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'

const CHAVE = 'soudev-tarefas-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const isoLocal = (d) => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10) }
const diaSemana = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long' })
const dataCurta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const addDias = (d, n) => { const z = new Date(d); z.setDate(z.getDate() + n); return z }

export default function TarefasDia() {
  const [rotina, setRotina] = useState([]) // {id, texto, horario}
  const [avulsas, setAvulsas] = useState([]) // {id, texto, data, feito}
  const [feitos, setFeitos] = useState({}) // { 'YYYY-MM-DD': { rotinaId: true } }
  const [dataSel, setDataSel] = useState(() => new Date())
  const [novaRot, setNovaRot] = useState('')
  const [novaAv, setNovaAv] = useState('')
  const carregou = useRef(false)

  useEffect(() => {
    try { const s = localStorage.getItem(CHAVE); if (s) { const d = JSON.parse(s); if (Array.isArray(d.rotina)) setRotina(d.rotina); if (Array.isArray(d.avulsas)) setAvulsas(d.avulsas); if (d.feitos) setFeitos(d.feitos) } } catch { /* sem storage */ }
    carregou.current = true
  }, [])
  useEffect(() => {
    if (!carregou.current) return
    const t = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify({ rotina, avulsas, feitos })) } catch { /* cheio */ } }, 300)
    return () => clearTimeout(t)
  }, [rotina, avulsas, feitos])

  const iso = isoLocal(dataSel)
  const ehHoje = iso === isoLocal(new Date())
  const avulsasDoDia = avulsas.filter((a) => a.data === iso)

  const rotinaFeita = (id) => !!(feitos[iso] && feitos[iso][id])
  const toggleRotina = (id) => setFeitos((f) => { const dia = { ...(f[iso] || {}) }; if (dia[id]) delete dia[id]; else dia[id] = true; return { ...f, [iso]: dia } })
  const toggleAvulsa = (id) => setAvulsas((l) => l.map((a) => (a.id === id ? { ...a, feito: !a.feito } : a)))

  const addRotina = () => { const t = novaRot.trim(); if (!t) return; setRotina((l) => [...l, { id: uid(), texto: t, horario: '' }]); setNovaRot(''); track('tarefas_add', { tipo: 'rotina' }) }
  const addAvulsa = () => { const t = novaAv.trim(); if (!t) return; setAvulsas((l) => [...l, { id: uid(), texto: t, data: iso, feito: false }]); setNovaAv(''); track('tarefas_add', { tipo: 'avulsa' }) }
  const delRotina = (id) => { setRotina((l) => l.filter((r) => r.id !== id)); setFeitos((f) => { const c = { ...f }; Object.keys(c).forEach((k) => { if (c[k][id]) { const dia = { ...c[k] }; delete dia[id]; c[k] = dia } }); return c }) }
  const delAvulsa = (id) => setAvulsas((l) => l.filter((a) => a.id !== id))

  const streak = (id) => { let n = 0, d = new Date(dataSel); while (true) { const k = isoLocal(d); if (feitos[k] && feitos[k][id]) { n++; d = addDias(d, -1) } else break } return n }

  const total = rotina.length + avulsasDoDia.length
  const feitosCount = rotina.filter((r) => rotinaFeita(r.id)).length + avulsasDoDia.filter((a) => a.feito).length
  const pct = total ? Math.round((feitosCount / total) * 100) : 0

  return (
    <div className="td">
      <style>{CSS}</style>

      <div className="td-nav">
        <button className="td-seta" onClick={() => setDataSel((d) => addDias(d, -1))} aria-label="Dia anterior">‹</button>
        <div className="td-data">
          <b>{ehHoje ? 'Hoje' : diaSemana(dataSel).replace(/^\w/, (m) => m.toUpperCase())}</b>
          <span>{dataCurta(dataSel)}</span>
        </div>
        <button className="td-seta" onClick={() => setDataSel((d) => addDias(d, 1))} aria-label="Próximo dia">›</button>
        {!ehHoje && <button className="btn btn-ghost btn-sm td-hoje" onClick={() => setDataSel(new Date())}>Hoje</button>}
      </div>

      <div className="td-progresso">
        <div className="td-bar"><span style={{ width: pct + '%' }} /></div>
        <span className="td-prog-txt">{total === 0 ? 'Sem tarefas para este dia' : feitosCount === total ? '✓ Tudo concluído!' : `${feitosCount} de ${total} concluída(s) · ${pct}%`}</span>
      </div>

      <section className="td-sec">
        <h3 className="td-h3">🔁 Rotina <span className="muted">(repete todo dia)</span></h3>
        {rotina.length === 0 && <p className="muted td-vazio">Adicione hábitos ou tarefas que se repetem todos os dias (ex.: beber água, estudar, treinar).</p>}
        <ul className="td-lista">
          {rotina.map((r) => {
            const feito = rotinaFeita(r.id); const s = streak(r.id)
            return (
              <li key={r.id} className={feito ? 'td-item feito' : 'td-item'}>
                <label className="td-check">
                  <input type="checkbox" checked={feito} onChange={() => toggleRotina(r.id)} />
                  <span className="td-marca" aria-hidden="true" />
                  <span className="td-texto">{r.texto}</span>
                </label>
                {s > 1 && <span className="td-streak" title="Dias seguidos">🔥 {s}</span>}
                <button className="td-del" onClick={() => delRotina(r.id)} aria-label="Remover da rotina">×</button>
              </li>
            )
          })}
        </ul>
        <form className="td-add" onSubmit={(e) => { e.preventDefault(); addRotina() }}>
          <input value={novaRot} onChange={(e) => setNovaRot(e.target.value)} placeholder="Nova tarefa de rotina" />
          <button type="submit" className="btn btn-ghost btn-sm">+ Rotina</button>
        </form>
      </section>

      <section className="td-sec">
        <h3 className="td-h3">📌 Só {ehHoje ? 'hoje' : 'neste dia'}</h3>
        {avulsasDoDia.length === 0 && <p className="muted td-vazio">Tarefas que valem só para este dia aparecem aqui.</p>}
        <ul className="td-lista">
          {avulsasDoDia.map((a) => (
            <li key={a.id} className={a.feito ? 'td-item feito' : 'td-item'}>
              <label className="td-check">
                <input type="checkbox" checked={a.feito} onChange={() => toggleAvulsa(a.id)} />
                <span className="td-marca" aria-hidden="true" />
                <span className="td-texto">{a.texto}</span>
              </label>
              <button className="td-del" onClick={() => delAvulsa(a.id)} aria-label="Remover tarefa">×</button>
            </li>
          ))}
        </ul>
        <form className="td-add" onSubmit={(e) => { e.preventDefault(); addAvulsa() }}>
          <input value={novaAv} onChange={(e) => setNovaAv(e.target.value)} placeholder={ehHoje ? 'Nova tarefa de hoje' : 'Nova tarefa para este dia'} />
          <button type="submit" className="btn btn-ghost btn-sm">+ Tarefa</button>
        </form>
      </section>

      <p className="muted small">Tudo fica salvo só neste navegador, sem cadastro. A rotina se repete todos os dias e a sequência (🔥) conta os dias seguidos concluídos.</p>
    </div>
  )
}

const CSS = `
.td{margin-top:14px;max-width:640px}
.td .btn-sm{padding:6px 10px;font-size:13px}
.td-nav{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:12px}
.td-seta{width:42px;height:42px;border-radius:50%;border:1px solid var(--line-strong);background:var(--panel);color:var(--text);font-size:22px;cursor:pointer;line-height:1}
.td-data{text-align:center;min-width:140px}
.td-data b{display:block;font-size:19px}
.td-data span{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.td-hoje{margin-left:4px}
.td-progresso{margin-bottom:18px}
.td-bar{height:12px;background:var(--panel-2);border:1px solid var(--line);border-radius:999px;overflow:hidden}
.td-bar span{display:block;height:100%;background:var(--accent);transition:width .35s}
.td-prog-txt{display:block;margin-top:6px;font-size:13px;color:var(--muted);text-align:center}
.td-sec{margin-bottom:20px}
.td-h3{font-size:16px;margin:0 0 10px}
.td-vazio{font-size:13px;padding:6px 0 10px}
.td-lista{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.td-item{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:10px 12px}
.td-item.feito{opacity:.62}
.td-check{display:flex;align-items:center;gap:12px;flex:1;min-width:0;cursor:pointer}
.td-check input{position:absolute;opacity:0;width:0;height:0}
.td-marca{width:24px;height:24px;flex:none;border:2px solid var(--line-strong);border-radius:7px;position:relative;transition:background .15s,border-color .15s}
.td-check input:checked+.td-marca{background:var(--accent);border-color:var(--accent)}
.td-check input:checked+.td-marca::after{content:"";position:absolute;left:7px;top:3px;width:6px;height:11px;border:solid var(--on-accent);border-width:0 3px 3px 0;transform:rotate(45deg)}
.td-check input:focus-visible+.td-marca{outline:2px solid var(--accent);outline-offset:2px}
.td-texto{min-width:0;overflow-wrap:anywhere}
.td-item.feito .td-texto{text-decoration:line-through}
.td-streak{font-size:13px;font-weight:700;color:var(--amber);white-space:nowrap}
.td-del{width:28px;height:28px;flex:none;border:none;background:none;color:var(--muted);font-size:20px;cursor:pointer;border-radius:6px}
.td-del:hover{color:var(--red);background:var(--panel-2)}
.td-add{display:flex;gap:8px;margin-top:10px}
.td-add input{flex:1;min-width:0;padding:10px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
`
