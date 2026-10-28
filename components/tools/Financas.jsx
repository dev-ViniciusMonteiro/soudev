'use client'

// Organizador de finanças mensal, salvo no navegador. Lança receitas e despesas (fixas que se repetem
// e variáveis do mês), mostra saldo, gasto por categoria com orçamento, projeção do mês pelo ritmo
// atual e gráficos. Exporta JSON/CSV. Nada é enviado a servidores.

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { downloadBlob } from '@/lib/client'

const CHAVE = 'soudev-financas-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const parseVal = (s) => { let v = String(s).trim().replace(/\s|R\$/g, ''); if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.'); return Math.abs(Number(v)) || 0 }
const mesDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const addMes = (ms, n) => { const [a, m] = ms.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return mesDe(d) }
const rotuloMes = (ms) => { const [a, m] = ms.split('-').map(Number); return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase()) }
const diasNoMes = (ms) => { const [a, m] = ms.split('-').map(Number); return new Date(a, m, 0).getDate() }

const CATEGORIAS = [
  ['moradia', 'Moradia', '#4f8cff'], ['alimentacao', 'Alimentação', '#34d399'], ['transporte', 'Transporte', '#f59e0b'],
  ['contas', 'Contas e assinaturas', '#a855f7'], ['saude', 'Saúde', '#f1564c'], ['educacao', 'Educação', '#06b6d4'],
  ['lazer', 'Lazer', '#ec4899'], ['compras', 'Compras', '#eab308'], ['outros', 'Outros', '#94a3b8'],
]
const catNome = (id) => (CATEGORIAS.find((c) => c[0] === id) || ['outros', 'Outros', '#94a3b8'])[1]
const catCor = (id) => (CATEGORIAS.find((c) => c[0] === id) || ['outros', 'Outros', '#94a3b8'])[2]

export default function Financas() {
  const [fixos, setFixos] = useState([]) // {id,tipo,desc,categoria,valor,dia,desde}
  const [variaveis, setVariaveis] = useState([]) // {id,tipo,desc,categoria,valor,dia,mes}
  const [orcamento, setOrcamento] = useState({}) // categoria -> valor
  const [mesSel, setMesSel] = useState(() => mesDe(new Date()))
  const [form, setForm] = useState({ tipo: 'despesa', desc: '', categoria: 'alimentacao', valor: '', dia: '', fixo: false })
  const [verOrc, setVerOrc] = useState(false)
  const carregou = useRef(false)

  useEffect(() => {
    try { const s = localStorage.getItem(CHAVE); if (s) { const d = JSON.parse(s); if (Array.isArray(d.fixos)) setFixos(d.fixos); if (Array.isArray(d.variaveis)) setVariaveis(d.variaveis); if (d.orcamento) setOrcamento(d.orcamento) } } catch { /* sem storage */ }
    carregou.current = true
  }, [])
  useEffect(() => {
    if (!carregou.current) return
    const t = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify({ fixos, variaveis, orcamento })) } catch { /* cheio */ } }, 300)
    return () => clearTimeout(t)
  }, [fixos, variaveis, orcamento])

  // lançamentos do mês selecionado
  const doMes = [
    ...fixos.filter((f) => f.desde <= mesSel).map((f) => ({ ...f, fixo: true })),
    ...variaveis.filter((v) => v.mes === mesSel).map((v) => ({ ...v, fixo: false })),
  ]
  const receitas = doMes.filter((x) => x.tipo === 'receita')
  const despesas = doMes.filter((x) => x.tipo === 'despesa')
  const totalRec = receitas.reduce((a, x) => a + x.valor, 0)
  const totalDesp = despesas.reduce((a, x) => a + x.valor, 0)
  const saldo = totalRec - totalDesp

  // por categoria
  const porCat = {}
  despesas.forEach((d) => { porCat[d.categoria] = (porCat[d.categoria] || 0) + d.valor })

  // projeção do mês (só no mês atual, pelo ritmo das variáveis + fixas cheias)
  const mesAtual = mesDe(new Date())
  const ehAtual = mesSel === mesAtual
  const dim = diasNoMes(mesSel)
  const diaHoje = ehAtual ? new Date().getDate() : dim
  const despVar = variaveis.filter((v) => v.mes === mesSel && v.tipo === 'despesa').reduce((a, v) => a + v.valor, 0)
  const despFix = fixos.filter((f) => f.tipo === 'despesa' && f.desde <= mesSel).reduce((a, f) => a + f.valor, 0)
  const ritmoVar = diaHoje > 0 ? (despVar / diaHoje) * dim : despVar
  const projecao = ehAtual && diaHoje < dim ? despFix + ritmoVar : totalDesp

  // evolução dos últimos 6 meses (despesas)
  const evolucao = []
  for (let i = 5; i >= 0; i--) {
    const ms = addMes(mesSel, -i)
    const df = fixos.filter((f) => f.tipo === 'despesa' && f.desde <= ms).reduce((a, f) => a + f.valor, 0)
    const dv = variaveis.filter((v) => v.mes === ms && v.tipo === 'despesa').reduce((a, v) => a + v.valor, 0)
    evolucao.push({ ms, valor: df + dv })
  }
  const maxEvol = Math.max(1, ...evolucao.map((e) => e.valor))

  const add = () => {
    const valor = parseVal(form.valor); if (!form.desc.trim() || !valor) return
    const base = { id: uid(), tipo: form.tipo, desc: form.desc.trim(), categoria: form.tipo === 'despesa' ? form.categoria : '', valor, dia: Number(form.dia) || null }
    if (form.fixo) setFixos((l) => [...l, { ...base, desde: mesSel }])
    else setVariaveis((l) => [...l, { ...base, mes: mesSel }])
    setForm((f) => ({ ...f, desc: '', valor: '', dia: '' }))
    track('financas_add', { tipo: form.tipo, fixo: form.fixo })
  }
  const remover = (item) => { if (item.fixo) setFixos((l) => l.filter((x) => x.id !== item.id)); else setVariaveis((l) => l.filter((x) => x.id !== item.id)) }
  const setOrc = (cat, v) => setOrcamento((o) => { const n = { ...o }; const val = parseVal(v); if (val) n[cat] = val; else delete n[cat]; return n })

  const baixarJSON = () => downloadBlob(new Blob([JSON.stringify({ fixos, variaveis, orcamento }, null, 2)], { type: 'application/json' }), 'financas.json')
  const baixarCSV = () => {
    const linhas = [['Tipo', 'Descrição', 'Categoria', 'Valor', 'Dia', 'Fixo']]
    doMes.forEach((x) => linhas.push([x.tipo, x.desc, x.tipo === 'despesa' ? catNome(x.categoria) : '', x.valor.toFixed(2), x.dia || '', x.fixo ? 'Sim' : 'Não']))
    const csv = linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n')
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv' }), `financas-${mesSel}.csv`)
  }

  const cats = CATEGORIAS.filter((c) => porCat[c[0]] || orcamento[c[0]])
  const maxCat = Math.max(1, ...cats.map((c) => Math.max(porCat[c[0]] || 0, orcamento[c[0]] || 0)))

  return (
    <div className="fin">
      <style>{CSS}</style>

      <div className="fin-nav">
        <button className="fin-seta" onClick={() => setMesSel((m) => addMes(m, -1))} aria-label="Mês anterior">‹</button>
        <b className="fin-mes">{rotuloMes(mesSel)}</b>
        <button className="fin-seta" onClick={() => setMesSel((m) => addMes(m, 1))} aria-label="Próximo mês">›</button>
        {!ehAtual && <button className="btn btn-ghost btn-sm" onClick={() => setMesSel(mesAtual)}>Mês atual</button>}
      </div>

      <div className="fin-tiles">
        <div className="fin-tile rec"><span>Receitas</span><b>{brl(totalRec)}</b></div>
        <div className="fin-tile desp"><span>Despesas</span><b>{brl(totalDesp)}</b></div>
        <div className={'fin-tile ' + (saldo >= 0 ? 'ok' : 'neg')}><span>Saldo</span><b>{brl(saldo)}</b></div>
        <div className="fin-tile proj"><span>Projeção do mês {ehAtual && diaHoje < dim ? '(ritmo)' : ''}</span><b>{brl(projecao)}</b></div>
      </div>
      {ehAtual && diaHoje < dim && despVar > 0 && (
        <p className="fin-dica">No ritmo atual (dia {diaHoje} de {dim}), a previsão de gasto do mês é <b>{brl(projecao)}</b>. {saldo - (projecao - totalDesp) < 0 ? 'Atenção: pode fechar no vermelho.' : ''}</p>
      )}

      {/* adicionar */}
      <div className="fin-add">
        <div className="fin-add-tipo">
          <button className={'fin-t' + (form.tipo === 'despesa' ? ' sel' : '')} onClick={() => setForm((f) => ({ ...f, tipo: 'despesa' }))}>Despesa</button>
          <button className={'fin-t rec' + (form.tipo === 'receita' ? ' sel' : '')} onClick={() => setForm((f) => ({ ...f, tipo: 'receita' }))}>Receita</button>
        </div>
        <div className="fin-add-campos">
          <input placeholder="Descrição (ex.: mercado, salário)" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
          {form.tipo === 'despesa' && (
            <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
              {CATEGORIAS.map((c) => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
            </select>
          )}
          <input className="fin-valor" placeholder="Valor" inputMode="decimal" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
          <input className="fin-dia" placeholder="Dia" inputMode="numeric" value={form.dia} onChange={(e) => setForm((f) => ({ ...f, dia: e.target.value }))} />
          <label className="fin-fixo"><input type="checkbox" checked={form.fixo} onChange={(e) => setForm((f) => ({ ...f, fixo: e.target.checked }))} /> Fixo (todo mês)</label>
          <button className="btn btn-primary" onClick={add}>Adicionar</button>
        </div>
      </div>

      {/* listas */}
      <div className="fin-colunas">
        <div className="fin-lista">
          <h3 className="fin-h3">Despesas <span className="muted">{brl(totalDesp)}</span></h3>
          {despesas.length === 0 && <p className="muted fin-vazio">Nada lançado neste mês.</p>}
          {despesas.sort((a, b) => b.valor - a.valor).map((x) => (
            <div className="fin-item" key={x.id}>
              <span className="fin-dot" style={{ background: catCor(x.categoria) }} />
              <span className="fin-item-desc">{x.desc}{x.fixo && <span className="fin-badge">🔁 fixo</span>}<small>{catNome(x.categoria)}{x.dia ? ` · dia ${x.dia}` : ''}</small></span>
              <b className="fin-item-val">{brl(x.valor)}</b>
              <button className="fin-x" onClick={() => remover(x)} aria-label="Remover">×</button>
            </div>
          ))}
        </div>
        <div className="fin-lista">
          <h3 className="fin-h3">Receitas <span className="muted">{brl(totalRec)}</span></h3>
          {receitas.length === 0 && <p className="muted fin-vazio">Nada lançado neste mês.</p>}
          {receitas.sort((a, b) => b.valor - a.valor).map((x) => (
            <div className="fin-item" key={x.id}>
              <span className="fin-dot" style={{ background: '#34d399' }} />
              <span className="fin-item-desc">{x.desc}{x.fixo && <span className="fin-badge">🔁 fixo</span>}{x.dia ? <small>dia {x.dia}</small> : null}</span>
              <b className="fin-item-val rec">{brl(x.valor)}</b>
              <button className="fin-x" onClick={() => remover(x)} aria-label="Remover">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* por categoria + orçamento */}
      <div className="fin-bloco">
        <div className="fin-bloco-top">
          <h3 className="fin-h3">Gastos por categoria</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => setVerOrc((v) => !v)}>{verOrc ? 'Fechar orçamento' : 'Definir orçamento'}</button>
        </div>
        {cats.length === 0 && <p className="muted fin-vazio">Lance despesas para ver a divisão por categoria.</p>}
        {cats.map((c) => {
          const gasto = porCat[c[0]] || 0, orc = orcamento[c[0]] || 0
          const estourou = orc && gasto > orc
          return (
            <div className="fin-cat" key={c[0]}>
              <div className="fin-cat-top">
                <span><span className="fin-dot" style={{ background: c[2] }} /> {c[1]}</span>
                <span className="fin-cat-val">{brl(gasto)}{orc ? <span className={'muted' + (estourou ? ' fin-estouro' : '')}> / {brl(orc)}</span> : ''}</span>
              </div>
              <div className="fin-cat-bar"><span style={{ width: Math.min(100, gasto / maxCat * 100) + '%', background: estourou ? 'var(--red)' : c[2] }} />{orc ? <i style={{ left: Math.min(100, orc / maxCat * 100) + '%' }} /> : null}</div>
              {verOrc && <div className="fin-orc"><input placeholder="Orçamento mensal" inputMode="decimal" defaultValue={orc || ''} onBlur={(e) => setOrc(c[0], e.target.value)} /></div>}
            </div>
          )
        })}
        {verOrc && (
          <div className="fin-orc-extra">
            <span className="muted">Definir orçamento para outras categorias:</span>
            <div className="fin-orc-grid">
              {CATEGORIAS.filter((c) => !cats.includes(c)).map((c) => (
                <label key={c[0]}>{c[1]}<input placeholder="R$" inputMode="decimal" defaultValue={orcamento[c[0]] || ''} onBlur={(e) => setOrc(c[0], e.target.value)} /></label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* evolução */}
      <div className="fin-bloco">
        <h3 className="fin-h3">Despesas dos últimos 6 meses</h3>
        <div className="fin-evol">
          {evolucao.map((e) => (
            <div className="fin-evol-col" key={e.ms} title={brl(e.valor)}>
              <span className="fin-evol-val">{e.valor ? brl(e.valor).replace('R$', '').trim() : ''}</span>
              <div className="fin-evol-bar" style={{ height: Math.max(4, e.valor / maxEvol * 120) + 'px', background: e.ms === mesSel ? 'var(--accent)' : 'var(--line-strong)' }} />
              <span className="fin-evol-ms">{e.ms.split('-')[1]}/{e.ms.split('-')[0].slice(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fin-acoes">
        <button className="btn btn-ghost btn-sm" onClick={baixarJSON}>⬇ Backup (JSON)</button>
        <button className="btn btn-ghost btn-sm" onClick={baixarCSV}>⬇ Mês (CSV)</button>
      </div>
      <p className="muted small">Tudo fica salvo só neste navegador. As despesas e receitas marcadas como <b>fixas</b> se repetem automaticamente nos próximos meses. A projeção usa o ritmo de gasto do mês atual.</p>
    </div>
  )
}

const CSS = `
.fin{margin-top:14px;display:flex;flex-direction:column;gap:16px}
.fin .btn-sm{padding:6px 10px;font-size:13px}
.fin input,.fin select{padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.fin-nav{display:flex;align-items:center;gap:10px;justify-content:center}
.fin-seta{width:40px;height:40px;border-radius:50%;border:1px solid var(--line-strong);background:var(--panel);color:var(--text);font-size:22px;cursor:pointer;line-height:1}
.fin-mes{font-size:19px;min-width:170px;text-align:center}
.fin-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.fin-tile{background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--line-strong);border-radius:10px;padding:10px 12px;text-align:center}
.fin-tile span{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}
.fin-tile b{font-size:20px;font-variant-numeric:tabular-nums}
.fin-tile.rec{border-top-color:var(--green)} .fin-tile.rec b{color:var(--green)}
.fin-tile.desp{border-top-color:var(--red)} .fin-tile.desp b{color:var(--red)}
.fin-tile.ok{border-top-color:var(--accent)} .fin-tile.neg{border-top-color:var(--red)} .fin-tile.neg b{color:var(--red)}
.fin-tile.proj{border-top-color:var(--amber)}
.fin-dica{font-size:13px;color:var(--muted);margin:-6px 0 0;text-align:center}
.fin-add{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px}
.fin-add-tipo{display:flex;gap:8px;margin-bottom:10px}
.fin-t{flex:1;padding:9px;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:var(--radius);cursor:pointer;font:inherit;font-weight:700}
.fin-t.sel{background:var(--red);border-color:var(--red);color:#fff}
.fin-t.rec.sel{background:var(--green);border-color:var(--green)}
.fin-add-campos{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.fin-add-campos input,.fin-add-campos select{flex:1;min-width:120px}
.fin-add-campos .fin-valor{flex:0 0 120px;min-width:90px}
.fin-add-campos .fin-dia{flex:0 0 70px;min-width:56px}
.fin-fixo{display:flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap}
.fin-fixo input{flex:none}
.fin-colunas{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:620px){.fin-colunas{grid-template-columns:1fr}}
.fin-h3{font-size:16px;margin:0 0 10px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.fin-vazio{font-size:13px;padding:6px 0}
.fin-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}
.fin-dot{width:10px;height:10px;border-radius:3px;flex:none}
.fin-item-desc{flex:1;min-width:0;display:flex;flex-direction:column;overflow-wrap:anywhere}
.fin-item-desc small{color:var(--muted);font-size:11px}
.fin-badge{font-size:10px;color:var(--muted);margin-left:6px}
.fin-item-val{font-variant-numeric:tabular-nums;white-space:nowrap}
.fin-item-val.rec{color:var(--green)}
.fin-x{border:none;background:none;color:var(--muted);font-size:18px;cursor:pointer;flex:none}
.fin-x:hover{color:var(--red)}
.fin-bloco{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:14px}
.fin-bloco-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.fin-cat{margin-top:10px}
.fin-cat-top{display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px}
.fin-cat-top span{display:flex;align-items:center;gap:8px}
.fin-cat-val{font-variant-numeric:tabular-nums}
.fin-estouro{color:var(--red);font-weight:700}
.fin-cat-bar{position:relative;height:12px;background:var(--panel-2);border-radius:6px;overflow:hidden}
.fin-cat-bar span{display:block;height:100%;border-radius:6px}
.fin-cat-bar i{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--fg);opacity:.55}
.fin-orc{margin-top:6px}
.fin-orc input{width:160px}
.fin-orc-extra{margin-top:14px;border-top:1px dashed var(--line);padding-top:10px}
.fin-orc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px}
.fin-orc-grid label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}
.fin-evol{display:flex;align-items:flex-end;gap:8px;height:170px;padding-top:10px}
.fin-evol-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:100%}
.fin-evol-val{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
.fin-evol-bar{width:70%;border-radius:6px 6px 0 0;transition:height .3s}
.fin-evol-ms{font-size:11px;color:var(--muted)}
.fin-acoes{display:flex;gap:8px;flex-wrap:wrap}
`
