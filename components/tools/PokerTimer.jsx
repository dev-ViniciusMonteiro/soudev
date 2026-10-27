'use client'

// Configurador do relógio de poker (torneio e cash): monta a estrutura de blinds, temas e logo, mostra
// a prévia ao vivo (iframe com o HTML autossuficiente) e permite baixar esse HTML para rodar offline.

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { downloadBlob } from '@/lib/client'
import { Field, Notice } from '../ui'
import { TEMAS, configPadrao, gerarEstrutura, gerarHTML } from '@/lib/poker'

export default function PokerTimer() {
  const [cfg, setCfg] = useState(configPadrao)
  const [ger, setGer] = useState({ sb: 25, bb: 50, min: 20, qtd: 12, mult: 1.5, comAnte: false, pausaCada: 4, pausaMin: 10 })
  const [srcdoc, setSrcdoc] = useState('')
  const [msg, setMsg] = useState('')
  const nomeArq = (cfg.nome || 'relogio-poker').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // prévia com atraso, para não recarregar o relógio a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setSrcdoc(gerarHTML(cfg)), 500)
    return () => clearTimeout(t)
  }, [cfg])

  const set = (k) => (e) => setCfg((c) => ({ ...c, [k]: e.target.value }))
  const setGerCampo = (k, v) => setGer((g) => ({ ...g, [k]: v }))
  const gerar = () => {
    setCfg((c) => ({ ...c, niveis: gerarEstrutura({
      sb: Number(ger.sb) || 25, bb: Number(ger.bb) || 50, min: Number(ger.min) || 20,
      qtd: Math.max(1, Math.min(60, Number(ger.qtd) || 12)), mult: Number(ger.mult) || 1.5,
      comAnte: ger.comAnte, pausaCada: Number(ger.pausaCada) || 0, pausaMin: Number(ger.pausaMin) || 10,
    }) }))
  }

  const setNivel = (i, k, v) => setCfg((c) => ({ ...c, niveis: c.niveis.map((n, j) => (j === i ? { ...n, [k]: v } : n)) }))
  const addNivel = () => setCfg((c) => { const u = c.niveis[c.niveis.length - 1] || { bb: 50, min: 20 }; return { ...c, niveis: [...c.niveis, { sb: u.bb || 50, bb: (u.bb || 50) * 2, ante: 0, min: u.min || 20, pausa: false }] } })
  const addPausa = () => setCfg((c) => ({ ...c, niveis: [...c.niveis, { sb: 0, bb: 0, ante: 0, min: 10, pausa: true }] }))
  const delNivel = (i) => setCfg((c) => ({ ...c, niveis: c.niveis.filter((_, j) => j !== i) }))

  const trocarLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 1.5 * 1024 * 1024) { setMsg('Logo muito grande (máx. ~1,5 MB). Use uma imagem menor.'); return }
    const r = new FileReader(); r.onload = () => { setCfg((c) => ({ ...c, logo: r.result })); setMsg('') }; r.readAsDataURL(f)
  }

  const baixar = () => { downloadBlob(new Blob([gerarHTML(cfg)], { type: 'text/html' }), `${nomeArq}.html`); track('poker_baixar', { modo: cfg.modo }) }
  const abrir = () => { const u = URL.createObjectURL(new Blob([gerarHTML(cfg)], { type: 'text/html' })); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 10000); track('poker_abrir') }

  return (
    <div className="pt">
      <style>{CSS}</style>
      <Notice kind="info">
        Monte o relógio do seu jogo, veja a prévia funcionando ao lado e <b>baixe um arquivo HTML</b> que roda offline — é só abrir no navegador de qualquer computador ou TV, sem internet depois de pronto.
      </Notice>

      <div className="pt-layout">
        <div className="pt-form">
          <div className="pt-grid2">
            <Field label="Nome do torneio/jogo" className="pt-field"><input value={cfg.nome} onChange={set('nome')} /></Field>
            <Field label="Modo" className="pt-field">
              <select value={cfg.modo} onChange={set('modo')}>
                <option value="torneio">Torneio (blinds que sobem)</option>
                <option value="cash">Cash game (tempo de sessão)</option>
              </select>
            </Field>
          </div>

          <div className="pt-temas">
            <span className="pt-lbl">Tema</span>
            <div className="pt-temas-chips">
              {TEMAS.map((t) => (
                <button key={t.id} type="button" className={'pt-tema' + (t.id === cfg.temaId ? ' sel' : '')} onClick={() => setCfg((c) => ({ ...c, temaId: t.id }))} title={t.nome}
                  style={{ background: t.bg, borderColor: t.id === cfg.temaId ? t.accent : 'var(--line-strong)' }}>
                  <span style={{ background: t.accent }} /><span style={{ background: t.fg }} />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-logo">
            <span className="pt-lbl">Logo (opcional)</span>
            <div className="pt-logo-row">
              {cfg.logo && <img className="pt-logo-mini" src={cfg.logo} alt="" />}
              <label className="btn btn-ghost btn-sm">{cfg.logo ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/*" hidden onChange={trocarLogo} /></label>
              {cfg.logo && <button className="btn btn-ghost btn-sm" onClick={() => setCfg((c) => ({ ...c, logo: '' }))}>Remover</button>}
            </div>
            <small className="muted">A logo fica embutida no HTML baixado, então funciona offline.</small>
          </div>

          {cfg.modo === 'cash' ? (
            <Field label="Avisar a cada (minutos) — 0 para desligar" className="pt-field">
              <input inputMode="numeric" value={cfg.cash?.lembreteMin ?? 30} onChange={(e) => setCfg((c) => ({ ...c, cash: { lembreteMin: Number(e.target.value) || 0 } }))} />
            </Field>
          ) : (
            <>
              <div className="pt-gerador">
                <span className="pt-lbl">Gerar estrutura rápida</span>
                <div className="pt-grid-ger">
                  <label>Small blind<input inputMode="numeric" value={ger.sb} onChange={(e) => setGerCampo('sb', e.target.value)} /></label>
                  <label>Big blind<input inputMode="numeric" value={ger.bb} onChange={(e) => setGerCampo('bb', e.target.value)} /></label>
                  <label>Min/nível<input inputMode="numeric" value={ger.min} onChange={(e) => setGerCampo('min', e.target.value)} /></label>
                  <label>Nº de níveis<input inputMode="numeric" value={ger.qtd} onChange={(e) => setGerCampo('qtd', e.target.value)} /></label>
                  <label>Aumento (x)<input inputMode="decimal" value={ger.mult} onChange={(e) => setGerCampo('mult', e.target.value)} /></label>
                  <label>Pausa a cada<input inputMode="numeric" value={ger.pausaCada} onChange={(e) => setGerCampo('pausaCada', e.target.value)} /></label>
                  <label>Pausa (min)<input inputMode="numeric" value={ger.pausaMin} onChange={(e) => setGerCampo('pausaMin', e.target.value)} /></label>
                  <label className="pt-check"><input type="checkbox" checked={ger.comAnte} onChange={(e) => setGerCampo('comAnte', e.target.checked)} /> Com ante</label>
                </div>
                <button className="btn btn-primary btn-sm" onClick={gerar}>Gerar estrutura</button>
              </div>

              <div className="pt-niveis">
                <span className="pt-lbl">Níveis (ajuste fino)</span>
                <div className="pt-tab-head"><span>#</span><span>SB</span><span>BB</span><span>Ante</span><span>Min</span><span></span></div>
                {cfg.niveis.map((n, i) => (
                  <div className={'pt-tab-row' + (n.pausa ? ' pausa' : '')} key={i}>
                    {n.pausa ? <span className="pt-pausa-lbl">Intervalo</span> : <>
                      <input inputMode="numeric" value={n.sb} onChange={(e) => setNivel(i, 'sb', Number(e.target.value) || 0)} aria-label="Small blind" />
                      <input inputMode="numeric" value={n.bb} onChange={(e) => setNivel(i, 'bb', Number(e.target.value) || 0)} aria-label="Big blind" />
                      <input inputMode="numeric" value={n.ante} onChange={(e) => setNivel(i, 'ante', Number(e.target.value) || 0)} aria-label="Ante" />
                    </>}
                    <input inputMode="numeric" value={n.min} onChange={(e) => setNivel(i, 'min', Number(e.target.value) || 1)} aria-label="Minutos" className="pt-min" />
                    <button className="pt-del" onClick={() => delNivel(i)} aria-label="Remover">×</button>
                  </div>
                ))}
                <div className="pt-niveis-acoes">
                  <button className="btn btn-ghost btn-sm" onClick={addNivel}>+ Nível</button>
                  <button className="btn btn-ghost btn-sm" onClick={addPausa}>+ Intervalo</button>
                </div>
              </div>
            </>
          )}
          {msg && <Notice kind="warning">{msg}</Notice>}
        </div>

        <div className="pt-side">
          <div className="pt-preview">
            <iframe title="Prévia do relógio" srcDoc={srcdoc} />
          </div>
          <div className="pt-acoes">
            <button className="btn btn-primary" onClick={baixar}>⬇ Baixar HTML (offline)</button>
            <button className="btn" onClick={abrir}>↗ Abrir em nova aba</button>
          </div>
          <small className="muted">Dica: na prévia e no arquivo baixado funcionam o teclado (espaço = pausar, ← → trocam de nível, F = tela cheia) e os botões na tela.</small>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.pt{margin-top:14px}
.pt .btn-sm{padding:6px 10px;font-size:13px}
.pt-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);gap:20px;margin-top:14px}
@media(max-width:860px){.pt-layout{grid-template-columns:minmax(0,1fr)}}
.pt-form{display:flex;flex-direction:column;gap:14px}
.pt-field input,.pt-field select{width:100%;padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.pt-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:520px){.pt-grid2{grid-template-columns:1fr}}
.pt-lbl{display:block;font-weight:600;font-size:14px;margin-bottom:6px}
.pt-temas-chips{display:flex;flex-wrap:wrap;gap:8px}
.pt-tema{width:52px;height:40px;border-radius:10px;border:2px solid var(--line-strong);cursor:pointer;display:flex;overflow:hidden;padding:0}
.pt-tema span{flex:1;display:block}
.pt-tema.sel{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--accent)}
.pt-logo-row{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.pt-logo-mini{height:40px;max-width:120px;object-fit:contain;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:2px}
.pt-gerador,.pt-niveis{border-top:1px solid var(--line);padding-top:12px}
.pt-grid-ger{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:10px}
.pt-grid-ger label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}
.pt-grid-ger input{padding:7px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.pt-check{flex-direction:row!important;align-items:center;gap:6px!important;color:var(--text)!important;font-size:13px!important}
.pt-check input{width:auto}
.pt-tab-head,.pt-tab-row{display:grid;grid-template-columns:1fr 1fr 1fr 56px 34px;gap:6px;align-items:center}
.pt-tab-head{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.pt-tab-head span:first-child{display:none}
.pt-tab-row{margin-bottom:6px}
.pt-tab-row input{padding:7px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit;min-width:0}
.pt-tab-row.pausa{grid-template-columns:1fr 56px 34px}
.pt-pausa-lbl{font-weight:600;color:var(--accent)}
.pt-del{width:30px;height:32px;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--red);border-radius:var(--radius);cursor:pointer}
.pt-niveis-acoes{display:flex;gap:8px;margin-top:6px}
.pt-side{display:flex;flex-direction:column;gap:12px;position:sticky;top:12px;align-self:start}
.pt-preview{aspect-ratio:9/16;max-height:70vh;background:#000;border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden}
@media(min-width:861px){.pt-preview{aspect-ratio:3/4}}
.pt-preview iframe{width:100%;height:100%;border:0;display:block}
.pt-acoes{display:flex;gap:8px;flex-wrap:wrap}
.pt-acoes .btn{flex:1;min-width:150px}
`
