'use client'

// Caixa/gestão da mesa de poker por sessão (noite): jogadores, fichas, buy-in/rebuy/add-on, consumo,
// entradas e saídas, resumo e gráficos — tudo salvo no navegador (localStorage) e exportável. Avisa o
// relógio (onSync) sobre jogadores ativos e premiação acumulada para manter as telas em sincronia.

import { useEffect, useRef, useState } from 'react'
import { downloadBlob } from '@/lib/client'

const CHAVE = 'soudev-poker-mesa-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hora = () => new Date().toLocaleTimeString('pt-BR').slice(0, 5)
const hoje = () => new Date().toLocaleDateString('pt-BR')

const ITENS_PADRAO = [{ nome: 'Cerveja', preco: 8 }, { nome: 'Refrigerante', preco: 6 }, { nome: 'Água', preco: 4 }, { nome: 'Porção', preco: 25 }]

function novaSessao(base) {
  return {
    id: uid(), nome: 'Noite ' + hoje(), data: Date.now(),
    config: base?.config ? { ...base.config } : { buyin: 50, rebuy: 50, addon: 100, taxaPct: 0, fichasBuyin: 5000 },
    itens: base?.itens ? base.itens.map((i) => ({ ...i })) : ITENS_PADRAO.map((i) => ({ ...i })),
    jogadores: [], saidas: [],
  }
}

function resumo(s) {
  const r = { entradas: 0, premio: 0, casa: 0, buyins: 0, rebuys: 0, addons: 0, fichas: 0, consumoTotal: 0, consumoPago: 0, saidas: 0, ativos: 0, total: 0 }
  s.jogadores.forEach((p) => {
    r.total++; if (!p.eliminado) r.ativos++
    p.entradas.forEach((e) => {
      r.entradas += e.valor; r.fichas += e.fichas || 0
      const casa = e.valor * ((s.config.taxaPct || 0) / 100); r.casa += casa; r.premio += e.valor - casa
      if (e.tipo === 'buyin') r.buyins++; else if (e.tipo === 'rebuy') r.rebuys++; else if (e.tipo === 'addon') r.addons++
    })
    const c = p.consumo.reduce((a, x) => a + x.preco * x.qtd, 0); r.consumoTotal += c; if (p.pagou) r.consumoPago += c
  })
  s.saidas.forEach((x) => (r.saidas += x.valor))
  r.consumoAberto = r.consumoTotal - r.consumoPago
  r.saldo = r.entradas + r.consumoPago - r.saidas
  r.avg = r.ativos ? Math.round(r.fichas / r.ativos) : 0
  return r
}

export default function PokerMesa({ onSync }) {
  const [sessao, setSessao] = useState(() => novaSessao())
  const [historico, setHistorico] = useState([])
  const [nome, setNome] = useState('')
  const [saida, setSaida] = useState({ desc: '', valor: '' })
  const [novoItem, setNovoItem] = useState({ nome: '', preco: '' })
  const [verId, setVerId] = useState(null)
  const carregou = useRef(false)

  // restaura
  useEffect(() => {
    try {
      const s = localStorage.getItem(CHAVE)
      if (s) { const d = JSON.parse(s); if (d && d.sessaoAtual) setSessao(d.sessaoAtual); if (Array.isArray(d?.historico)) setHistorico(d.historico) }
    } catch { /* sem storage */ }
    carregou.current = true
  }, [])
  // salva
  useEffect(() => {
    if (!carregou.current) return
    const t = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify({ sessaoAtual: sessao, historico })) } catch { /* cheio */ } }, 400)
    return () => clearTimeout(t)
  }, [sessao, historico])

  const r = resumo(sessao)
  // sincroniza com o relógio (só quando há jogadores, para não zerar o padrão da tela)
  useEffect(() => { if (onSync && r.total > 0) onSync({ ativos: r.ativos, premio: r.premio }) /* eslint-disable-next-line */ }, [r.ativos, r.premio, r.total])

  const upd = (fn) => setSessao((s) => { const c = JSON.parse(JSON.stringify(s)); fn(c); return c })
  const setCfg = (k, v) => upd((s) => { s.config[k] = v })

  const addJogador = () => {
    const n = nome.trim(); if (!n) return
    upd((s) => s.jogadores.push({ id: uid(), nome: n, entradas: [{ tipo: 'buyin', valor: Number(s.config.buyin) || 0, fichas: Number(s.config.fichasBuyin) || 0, hora: hora() }], consumo: [], eliminado: false, posicao: null, pagou: false }))
    setNome('')
  }
  const entrada = (id, tipo) => upd((s) => { const p = s.jogadores.find((x) => x.id === id); if (!p) return; const valor = Number(s.config[tipo]) || 0; p.entradas.push({ tipo, valor, fichas: Number(s.config.fichasBuyin) || 0, hora: hora() }); if (tipo !== 'buyin') p.eliminado = false })
  const consumir = (id, item) => upd((s) => { const p = s.jogadores.find((x) => x.id === id); if (!p) return; const ex = p.consumo.find((c) => c.nome === item.nome); if (ex) ex.qtd++; else p.consumo.push({ nome: item.nome, preco: item.preco, qtd: 1 }) })
  const tirarConsumo = (id, nomeItem) => upd((s) => { const p = s.jogadores.find((x) => x.id === id); if (!p) return; const c = p.consumo.find((y) => y.nome === nomeItem); if (c) { c.qtd--; if (c.qtd <= 0) p.consumo = p.consumo.filter((y) => y.nome !== nomeItem) } })
  const eliminar = (id) => upd((s) => { const p = s.jogadores.find((x) => x.id === id); if (!p) return; if (p.eliminado) { p.eliminado = false; p.posicao = null } else { p.eliminado = true; p.posicao = s.jogadores.filter((x) => !x.eliminado).length } })
  const pagar = (id) => upd((s) => { const p = s.jogadores.find((x) => x.id === id); if (p) p.pagou = !p.pagou })
  const removerJogador = (id) => upd((s) => { s.jogadores = s.jogadores.filter((x) => x.id !== id) })
  const addSaida = () => { const v = Number(String(saida.valor).replace(',', '.')); if (!saida.desc.trim() || !v) return; upd((s) => s.saidas.push({ id: uid(), desc: saida.desc.trim(), valor: v, hora: hora() })); setSaida({ desc: '', valor: '' }) }
  const delSaida = (id) => upd((s) => { s.saidas = s.saidas.filter((x) => x.id !== id) })
  const addItem = () => { const pr = Number(String(novoItem.preco).replace(',', '.')); if (!novoItem.nome.trim() || !pr) return; upd((s) => s.itens.push({ nome: novoItem.nome.trim(), preco: pr })); setNovoItem({ nome: '', preco: '' }) }
  const delItem = (i) => upd((s) => { s.itens.splice(i, 1) })

  const novaNoite = () => {
    if (sessao.jogadores.length && !window.confirm('Encerrar esta noite e começar outra? A atual vai para o histórico.')) return
    setHistorico((h) => (sessao.jogadores.length ? [{ ...sessao, fechada: Date.now() }, ...h] : h))
    setSessao((s) => novaSessao(s))
  }
  const baixarJSON = () => downloadBlob(new Blob([JSON.stringify(sessao, null, 2)], { type: 'application/json' }), (sessao.nome || 'sessao').replace(/[^a-z0-9]+/gi, '-') + '.json')
  const baixarCSV = () => {
    const linhas = [['Jogador', 'Buy-in', 'Rebuys', 'Add-ons', 'Total entradas', 'Consumo', 'Pagou', 'Posição', 'Situação']]
    sessao.jogadores.forEach((p) => {
      const by = p.entradas.filter((e) => e.tipo === 'buyin').length, rb = p.entradas.filter((e) => e.tipo === 'rebuy').length, ad = p.entradas.filter((e) => e.tipo === 'addon').length
      const te = p.entradas.reduce((a, e) => a + e.valor, 0), co = p.consumo.reduce((a, c) => a + c.preco * c.qtd, 0)
      linhas.push([p.nome, by, rb, ad, te.toFixed(2), co.toFixed(2), p.pagou ? 'Sim' : 'Não', p.posicao || '', p.eliminado ? 'Eliminado' : 'Ativo'])
    })
    const csv = linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n')
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv' }), (sessao.nome || 'sessao').replace(/[^a-z0-9]+/gi, '-') + '.csv')
  }
  const excluirHist = (id) => { if (window.confirm('Excluir esta noite do histórico?')) setHistorico((h) => h.filter((x) => x.id !== id)) }

  const arrecadPorJogador = sessao.jogadores.map((p) => ({ label: p.nome, valor: p.entradas.reduce((a, e) => a + e.valor, 0) }))
  const consumoPorJogador = sessao.jogadores.map((p) => ({ label: p.nome, valor: p.consumo.reduce((a, c) => a + c.preco * c.qtd, 0) })).filter((x) => x.valor > 0)

  return (
    <div className="pm">
      <style>{CSS}</style>

      <div className="pm-sessao-bar">
        <input className="pm-nome" value={sessao.nome} onChange={(e) => upd((s) => { s.nome = e.target.value })} aria-label="Nome da noite" />
        <span className="muted">{hoje()}</span>
        <div className="pm-sessao-acoes">
          <button className="btn btn-ghost btn-sm" onClick={baixarJSON}>⬇ JSON</button>
          <button className="btn btn-ghost btn-sm" onClick={baixarCSV}>⬇ CSV</button>
          <button className="btn btn-sm" onClick={novaNoite}>Nova noite</button>
        </div>
      </div>

      {/* resumo */}
      <div className="pm-tiles">
        <Tile k="Jogadores" v={`${r.ativos}/${r.total}`} />
        <Tile k="Fichas em jogo" v={r.fichas.toLocaleString('pt-BR')} />
        <Tile k="Stack médio" v={r.avg.toLocaleString('pt-BR')} />
        <Tile k="Premiação" v={brl(r.premio)} destaque />
        <Tile k="Caixa da casa" v={brl(r.casa)} />
        <Tile k="Consumo (aberto)" v={brl(r.consumoAberto)} alerta={r.consumoAberto > 0} />
        <Tile k="Saídas" v={brl(r.saidas)} />
        <Tile k="Saldo em caixa" v={brl(r.saldo)} destaque />
      </div>

      {/* configuração da sessão */}
      <details className="pm-bloco">
        <summary>Valores e fichas da noite</summary>
        <div className="pm-cfg">
          <label>Buy-in (R$)<input inputMode="decimal" value={sessao.config.buyin} onChange={(e) => setCfg('buyin', Number(e.target.value) || 0)} /></label>
          <label>Rebuy (R$)<input inputMode="decimal" value={sessao.config.rebuy} onChange={(e) => setCfg('rebuy', Number(e.target.value) || 0)} /></label>
          <label>Add-on (R$)<input inputMode="decimal" value={sessao.config.addon} onChange={(e) => setCfg('addon', Number(e.target.value) || 0)} /></label>
          <label>Fichas por entrada<input inputMode="numeric" value={sessao.config.fichasBuyin} onChange={(e) => setCfg('fichasBuyin', Number(e.target.value) || 0)} /></label>
          <label>Taxa da casa (%)<input inputMode="decimal" value={sessao.config.taxaPct} onChange={(e) => setCfg('taxaPct', Number(e.target.value) || 0)} /></label>
        </div>
        <div className="pm-itens">
          <span className="pm-lbl">Itens de consumo</span>
          <div className="pm-itens-lista">
            {sessao.itens.map((it, i) => <span className="pm-chip" key={i}>{it.nome} {brl(it.preco)}<button onClick={() => delItem(i)} aria-label="Remover">×</button></span>)}
          </div>
          <div className="pm-add-item">
            <input placeholder="Item" value={novoItem.nome} onChange={(e) => setNovoItem((o) => ({ ...o, nome: e.target.value }))} />
            <input placeholder="Preço" inputMode="decimal" value={novoItem.preco} onChange={(e) => setNovoItem((o) => ({ ...o, preco: e.target.value }))} />
            <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Item</button>
          </div>
        </div>
      </details>

      {/* jogadores */}
      <div className="pm-add-jog">
        <input placeholder="Nome do jogador" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addJogador() }} />
        <button className="btn btn-primary" onClick={addJogador}>+ Entrar ({brl(sessao.config.buyin)})</button>
      </div>

      <div className="pm-jogadores">
        {sessao.jogadores.length === 0 && <p className="muted" style={{ padding: '10px 0' }}>Nenhum jogador ainda. Adicione o primeiro acima.</p>}
        {sessao.jogadores.map((p) => {
          const entr = p.entradas.reduce((a, e) => a + e.valor, 0)
          const cons = p.consumo.reduce((a, c) => a + c.preco * c.qtd, 0)
          const rb = p.entradas.filter((e) => e.tipo === 'rebuy').length, ad = p.entradas.filter((e) => e.tipo === 'addon').length
          return (
            <div className={'pm-jog' + (p.eliminado ? ' elim' : '')} key={p.id}>
              <div className="pm-jog-top">
                <b>{p.nome}{p.eliminado && p.posicao ? <span className="pm-pos"> · {p.posicao}º</span> : ''}</b>
                <span className="muted">{brl(entr)} em entradas{rb ? ` · ${rb} rebuy` : ''}{ad ? ` · ${ad} add-on` : ''}</span>
              </div>
              <div className="pm-jog-acoes">
                <button className="btn btn-ghost btn-sm" onClick={() => entrada(p.id, 'rebuy')}>+ Rebuy</button>
                <button className="btn btn-ghost btn-sm" onClick={() => entrada(p.id, 'addon')}>+ Add-on</button>
                <button className={'btn btn-sm' + (p.eliminado ? ' btn-primary' : '')} onClick={() => eliminar(p.id)}>{p.eliminado ? 'Voltar' : 'Eliminar'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => removerJogador(p.id)} aria-label="Remover jogador">🗑</button>
              </div>
              <div className="pm-consumo">
                {sessao.itens.map((it, i) => <button key={i} className="pm-cbtn" onClick={() => consumir(p.id, it)}>+ {it.nome}</button>)}
              </div>
              {p.consumo.length > 0 && (
                <div className="pm-consumo-lista">
                  {p.consumo.map((c) => <span key={c.nome} className="pm-chip">{c.nome} ×{c.qtd} <button onClick={() => tirarConsumo(p.id, c.nome)} aria-label="Tirar um">−</button></span>)}
                  <span className={'pm-consumo-tot' + (p.pagou ? ' pago' : '')}>{brl(cons)} {p.pagou ? '✓ pago' : ''}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => pagar(p.id)}>{p.pagou ? 'Marcar aberto' : 'Marcar pago'}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* saídas */}
      <details className="pm-bloco">
        <summary>Saídas de caixa (premiação paga, despesas) — {brl(r.saidas)}</summary>
        <div className="pm-add-item">
          <input placeholder="Descrição (ex.: 1º lugar)" value={saida.desc} onChange={(e) => setSaida((o) => ({ ...o, desc: e.target.value }))} />
          <input placeholder="Valor" inputMode="decimal" value={saida.valor} onChange={(e) => setSaida((o) => ({ ...o, valor: e.target.value }))} />
          <button className="btn btn-ghost btn-sm" onClick={addSaida}>+ Saída</button>
        </div>
        {sessao.saidas.map((x) => <div className="pm-saida" key={x.id}><span>{x.hora} · {x.desc}</span><b>− {brl(x.valor)}</b><button className="pm-x" onClick={() => delSaida(x.id)}>×</button></div>)}
      </details>

      {/* gráficos */}
      <div className="pm-bloco pm-aberto">
        <h3 className="pm-h3">Gráficos da noite</h3>
        <div className="pm-graficos">
          <Donut titulo="Dinheiro da noite" partes={[['Premiação', r.premio, '#34d399'], ['Caixa da casa', r.casa, '#e6be55'], ['Consumo pago', r.consumoPago, '#4f8cff']]} brl={brl} />
          <Barras titulo="Arrecadação por jogador" dados={arrecadPorJogador} fmt={brl} />
          <Barras titulo="Consumo por jogador" dados={consumoPorJogador} fmt={brl} />
        </div>
      </div>

      {/* histórico */}
      {historico.length > 0 && (
        <details className="pm-bloco">
          <summary>Histórico de noites ({historico.length})</summary>
          {historico.map((h) => {
            const hr = resumo(h)
            return (
              <div className="pm-hist" key={h.id}>
                <div><b>{h.nome}</b><span className="muted"> · {hr.total} jog. · {brl(hr.entradas)} · prêmio {brl(hr.premio)}</span></div>
                <div className="pm-hist-acoes">
                  <button className="btn btn-ghost btn-sm" onClick={() => setVerId(verId === h.id ? null : h.id)}>{verId === h.id ? 'Fechar' : 'Ver'}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadBlob(new Blob([JSON.stringify(h, null, 2)], { type: 'application/json' }), (h.nome || 'sessao').replace(/[^a-z0-9]+/gi, '-') + '.json')}>⬇</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => excluirHist(h.id)}>🗑</button>
                </div>
                {verId === h.id && (
                  <div className="pm-graficos" style={{ width: '100%' }}>
                    <Donut titulo="Dinheiro" partes={[['Premiação', hr.premio, '#34d399'], ['Casa', hr.casa, '#e6be55'], ['Consumo pago', hr.consumoPago, '#4f8cff']]} brl={brl} />
                    <Barras titulo="Arrecadação por jogador" dados={h.jogadores.map((p) => ({ label: p.nome, valor: p.entradas.reduce((a, e) => a + e.valor, 0) }))} fmt={brl} />
                  </div>
                )}
              </div>
            )
          })}
        </details>
      )}

      <p className="muted small">Tudo é salvo automaticamente neste navegador, por noite. Baixe o JSON/CSV para guardar ou abrir no Excel. Os jogadores ativos e a premiação aparecem no relógio automaticamente.</p>
    </div>
  )
}

function Tile({ k, v, destaque, alerta }) {
  return <div className={'pm-tile' + (destaque ? ' destaque' : '') + (alerta ? ' alerta' : '')}><span>{k}</span><b>{v}</b></div>
}

function Donut({ titulo, partes, brl }) {
  const total = partes.reduce((a, p) => a + p[1], 0)
  const R = 52, C = 2 * Math.PI * R
  let off = 0
  return (
    <div className="pm-graf">
      <h4>{titulo}</h4>
      {total <= 0 ? <p className="muted">Sem dados ainda.</p> : (
        <div className="pm-donut-wrap">
          <svg viewBox="0 0 140 140" className="pm-donut">
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth="18" />
            {partes.map((p, i) => {
              if (p[1] <= 0) return null
              const len = (p[1] / total) * C
              const el = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={p[2]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />
              off += len
              return el
            })}
          </svg>
          <ul className="pm-legenda">{partes.map((p, i) => <li key={i}><span style={{ background: p[2] }} />{p[0]}<b>{brl(p[1])}</b></li>)}</ul>
        </div>
      )}
    </div>
  )
}

function Barras({ titulo, dados, fmt }) {
  const max = Math.max(1, ...dados.map((d) => d.valor))
  return (
    <div className="pm-graf">
      <h4>{titulo}</h4>
      {dados.length === 0 ? <p className="muted">Sem dados ainda.</p> : (
        <div className="pm-barras">
          {dados.map((d, i) => (
            <div className="pm-barra" key={i}>
              <span className="pm-barra-lbl">{d.label}</span>
              <span className="pm-barra-track"><span className="pm-barra-fill" style={{ width: (d.valor / max * 100) + '%' }} /></span>
              <span className="pm-barra-val">{fmt(d.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CSS = `
.pm{margin-top:14px;display:flex;flex-direction:column;gap:14px}
.pm .btn-sm{padding:6px 10px;font-size:13px}
.pm input{padding:8px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.pm-sessao-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pm-nome{font-weight:700;font-size:16px;flex:1;min-width:160px}
.pm-sessao-acoes{display:flex;gap:6px;flex-wrap:wrap}
.pm-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.pm-tile{background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--line-strong);border-radius:10px;padding:8px 12px;text-align:center}
.pm-tile span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700}
.pm-tile b{font-size:19px;font-variant-numeric:tabular-nums}
.pm-tile.destaque{border-top-color:var(--accent)}
.pm-tile.alerta{border-top-color:var(--amber)}
.pm-bloco{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px 14px}
.pm-bloco>summary{cursor:pointer;font-weight:600}
.pm-aberto{padding-top:14px}
.pm-h3{font-size:16px;margin:0 0 10px}
.pm-cfg{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:10px}
.pm-cfg label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted)}
.pm-itens{margin-top:12px}
.pm-lbl{display:block;font-weight:600;font-size:13px;margin-bottom:6px}
.pm-itens-lista{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.pm-chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:13px}
.pm-chip button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:15px;line-height:1}
.pm-add-item,.pm-add-jog{display:flex;gap:8px;flex-wrap:wrap}
.pm-add-item input{flex:1;min-width:90px}
.pm-add-jog input{flex:1;min-width:160px}
.pm-jogadores{display:flex;flex-direction:column;gap:10px}
.pm-jog{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px}
.pm-jog.elim{opacity:.6}
.pm-jog-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}
.pm-jog-top b{font-size:16px}
.pm-pos{color:var(--accent)}
.pm-jog-acoes{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
.pm-consumo{display:flex;gap:6px;flex-wrap:wrap}
.pm-cbtn{background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--text)}
.pm-consumo-lista{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;border-top:1px dashed var(--line);padding-top:8px}
.pm-consumo-tot{font-weight:700;font-size:14px}
.pm-consumo-tot.pago{color:var(--green)}
.pm-saida{display:flex;gap:10px;align-items:center;margin-top:8px;font-size:14px}
.pm-saida b{margin-left:auto;color:var(--red)}
.pm-x{background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px}
.pm-graficos{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.pm-graf h4{font-size:14px;margin:0 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.pm-donut-wrap{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.pm-donut{width:120px;height:120px;flex:none}
.pm-legenda{list-style:none;padding:0;margin:0;font-size:13px}
.pm-legenda li{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.pm-legenda li span{width:12px;height:12px;border-radius:3px;flex:none}
.pm-legenda li b{margin-left:auto;font-variant-numeric:tabular-nums}
.pm-barras{display:flex;flex-direction:column;gap:7px}
.pm-barra{display:grid;grid-template-columns:90px 1fr auto;gap:8px;align-items:center;font-size:13px}
.pm-barra-lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pm-barra-track{height:12px;background:var(--panel-2);border-radius:6px;overflow:hidden}
.pm-barra-fill{display:block;height:100%;background:var(--accent)}
.pm-barra-val{font-variant-numeric:tabular-nums;color:var(--muted)}
.pm-hist{border-top:1px solid var(--line);padding:10px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.pm-hist-acoes{display:flex;gap:6px}
`
