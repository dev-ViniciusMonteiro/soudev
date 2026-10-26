'use client'

// Simulador DIDÁTICO e FICTÍCIO do fluxo de votação. Não reproduz o código da urna real, não usa
// resultados, nomes, números, partidos ou marcas reais. Serve para estudar como os dados caem
// (voto → contabilização → registro embaralhado → boletim → hash → assinatura → transmissão).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Field, Notice, Tabs } from '../ui'

/* ---------- configuração padrão (editável) ---------- */
const DEFAULT_CFG = {
  municipio: 'Vila Esperança',
  uf: 'ZZ',
  secao: '0001',
  zona: '005',
  aptos: 387,
  parties: [
    { sigla: 'PVD', nome: 'Partido Verde-Dourado', cor: '#2e8b57' },
    { sigla: 'PAZ', nome: 'Partido Azul', cor: '#2b6cb0' },
    { sigla: 'PRC', nome: 'Partido Rubro', cor: '#b23b3b' },
  ],
  cargos: [
    { id: 'depfed', nome: 'Deputado Federal', digits: 4, tipo: 'prop', cands: [
      { num: '1234', nome: 'Ana Figueira', part: 'PVD' },
      { num: '4567', nome: 'Carlos Mendes', part: 'PAZ' },
      { num: '2211', nome: 'Beto Rangel', part: 'PRC' },
    ] },
    { id: 'depest', nome: 'Deputado Estadual', digits: 5, tipo: 'prop', cands: [
      { num: '12345', nome: 'Beatriz Lima', part: 'PVD' },
      { num: '45678', nome: 'Rogério Alves', part: 'PAZ' },
    ] },
    { id: 'senador', nome: 'Senador', digits: 3, tipo: 'maj', cands: [
      { num: '123', nome: 'Marina Souza', part: 'PVD', sup: 'Hugo Dantas, Lia Prado' },
      { num: '456', nome: 'João Pereira', part: 'PAZ', sup: 'Rita Gomes, Elias Mota' },
    ] },
    { id: 'gov', nome: 'Governador', digits: 2, tipo: 'maj', cands: [
      { num: '12', nome: 'Helena Castro', part: 'PVD', vice: 'Pedro Nunes' },
      { num: '45', nome: 'Ricardo Teixeira', part: 'PAZ', vice: 'Sônia Melo' },
    ] },
    { id: 'pres', nome: 'Presidente', digits: 2, tipo: 'maj', cands: [
      { num: '13', nome: 'Laura Antunes', part: 'PVD', vice: 'Marcos Dias' },
      { num: '22', nome: 'Fernando Rocha', part: 'PAZ', vice: 'Clara Vieira' },
    ] },
  ],
}

const clone = (o) => JSON.parse(JSON.stringify(o))
const iniciais = (nome) => (nome || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const corDoPartido = (cfg, sigla) => cfg.parties.find((p) => p.sigla === sigla)?.cor || '#777'
const nomeDoPartido = (cfg, sigla) => cfg.parties.find((p) => p.sigla === sigla)?.nome || sigla

function freshRun(cfg) {
  const tally = {}
  cfg.cargos.forEach((c) => {
    const cand = {}
    c.cands.forEach((cd) => (cand[cd.num] = 0))
    tally[c.id] = { cand, branco: 0, nulo: 0 }
  })
  return { aberta: false, encerrada: false, comp: 0, tally, rdv: [], logs: [], voter: null, zeresima: null, bu: null }
}

/* ---------- cripto / som (só no cliente) ---------- */
function useCrypto() {
  const keyRef = useRef(null)
  const [pub, setPub] = useState(null)
  const [ok, setOk] = useState('verificando…')
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
        const jwk = await crypto.subtle.exportKey('jwk', k.publicKey)
        if (!vivo) return
        keyRef.current = k
        setPub(jwk)
        setOk('SHA-256 + ECDSA P-256 ✓')
      } catch {
        if (vivo) setOk('indisponível (modo simplificado)')
      }
    })()
    return () => { vivo = false }
  }, [])
  const hash = useCallback(async (str) => {
    try {
      const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
      return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch {
      let x = 0x811c9dc5
      for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) }
      return (x >>> 0).toString(16).padStart(8, '0') + ' (fallback)'
    }
  }, [])
  const sign = useCallback(async (str) => {
    if (!keyRef.current) return null
    try {
      const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keyRef.current.privateKey, new TextEncoder().encode(str))
      let s = ''; new Uint8Array(sig).forEach((b) => (s += String.fromCharCode(b)))
      return btoa(s)
    } catch { return null }
  }, [])
  const verify = useCallback(async (str, b64) => {
    if (!keyRef.current || !b64) return false
    try {
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keyRef.current.publicKey, raw, new TextEncoder().encode(str))
    } catch { return false }
  }, [])
  return { pub, ok, hash, sign, verify }
}

function useBeep() {
  const ctxRef = useRef(null)
  return useCallback((kind) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = ctxRef.current || (ctxRef.current = new AC())
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = 'sine'
      o.frequency.value = kind === 'err' ? 180 : kind === 'fim' ? 660 : 880
      g.gain.value = 0.06
      o.start()
      o.stop(ctx.currentTime + (kind === 'err' ? 0.18 : kind === 'fim' ? 0.5 : 0.14))
    } catch {}
  }, [])
}

/* =========================================================== */
export default function UrnaSimulada() {
  const [cfg, setCfg] = useState(DEFAULT_CFG)
  const [editando, setEditando] = useState(false)
  const [run, setRun] = useState(() => freshRun(DEFAULT_CFG))
  const [shake, setShake] = useState(0)
  const [aba, setAba] = useState('tally')
  const runRef = useRef(run)
  const fimTimer = useRef(null)
  const { pub, ok, hash, sign, verify } = useCrypto()
  const beep = useBeep()

  const commit = useCallback((next) => { runRef.current = next; setRun(next) }, [])
  useEffect(() => () => clearTimeout(fimTimer.current), [])

  const cargoAtual = run.voter ? cfg.cargos[run.voter.idx] : null
  const mapaCands = useMemo(() => {
    const m = {}
    cfg.cargos.forEach((c) => { m[c.id] = {}; c.cands.forEach((cd) => (m[c.id][cd.num] = cd)) })
    return m
  }, [cfg])

  const addLog = (r, ev) => ({ ...r, logs: [...r.logs, { t: new Date().toTimeString().slice(0, 8), ev }] })
  const tremer = () => { setShake((s) => s + 1); beep('err') }

  /* ---- ações de seção ---- */
  const buObject = (r, zero) => {
    const cargos = {}
    cfg.cargos.forEach((c) => {
      const t = r.tally[c.id]
      const nominais = {}
      c.cands.forEach((cd) => (nominais[cd.num + ' · ' + cd.nome] = zero ? 0 : t.cand[cd.num]))
      cargos[c.nome] = { nominais, branco: zero ? 0 : t.branco, nulo: zero ? 0 : t.nulo }
    })
    return {
      urna: 'SIMULADA-' + cfg.uf + cfg.secao + cfg.zona,
      municipio: cfg.municipio, uf: cfg.uf, secao: cfg.secao, zona: cfg.zona,
      aptos: Number(cfg.aptos) || 0,
      comparecimento: zero ? 0 : r.comp,
      abstencoes: zero ? (Number(cfg.aptos) || 0) : (Number(cfg.aptos) || 0) - r.comp,
      emitido: new Date().toISOString(),
      tipo: zero ? 'ZERESIMA' : 'BOLETIM_DE_URNA',
      cargos,
    }
  }

  const abrir = async () => {
    if (runRef.current.aberta) return
    let r = { ...freshRun(cfg), aberta: true }
    r = addLog(r, 'ABERTURA DA SEÇÃO')
    const doc = buObject(r, true)
    const json = JSON.stringify(doc)
    const h = await hash(json), s = await sign(json)
    r = addLog({ ...r, zeresima: { doc, json, hash: h, sig: s } }, 'ZERÉSIMA EMITIDA · hash ' + h.slice(0, 12) + '…')
    commit(r); setAba('bu')
  }

  const habilitar = () => {
    const r = runRef.current
    if (!r.aberta || r.encerrada || r.voter) return
    if (r.comp >= (Number(cfg.aptos) || 0)) return
    const comp = r.comp + 1
    commit(addLog({ ...r, comp, voter: { idx: 0, buffer: '', sel: null, phase: 'voting', votes: [] } }, 'ELEITOR HABILITADO pelo mesário (#' + comp + ')'))
  }

  const encerrar = async () => {
    const r0 = runRef.current
    if (!r0.aberta || r0.encerrada || r0.voter) return
    let r = addLog({ ...r0, encerrada: true }, 'ENCERRAMENTO DA VOTAÇÃO')
    const doc = buObject(r, false)
    const json = JSON.stringify(doc)
    const h = await hash(json), s = await sign(json), conf = await verify(json, s)
    r = { ...r, bu: { doc, json, hash: h, sig: s, ok: conf } }
    r = addLog(r, 'BOLETIM DE URNA EMITIDO · hash ' + h.slice(0, 12) + '…')
    r = addLog(r, 'TRANSMISSÃO SIMULADA · pacote assinado enviado')
    commit(r); setAba('bu')
  }

  const reiniciar = () => { clearTimeout(fimTimer.current); commit(freshRun(cfg)); setAba('tally') }

  /* ---- teclado ---- */
  const registrar = (r, cargo, voto) => {
    const tally = clone(r.tally)
    if (voto.tipo === 'cand') tally[cargo.id].cand[voto.num]++
    else tally[cargo.id][voto.tipo]++
    const label = voto.tipo === 'cand'
      ? (mapaCands[cargo.id][voto.num].part + ' ' + voto.num)
      : voto.tipo.toUpperCase()
    const rdv = [...r.rdv]
    rdv.splice(Math.floor(Math.random() * (rdv.length + 1)), 0, { cargo: cargo.nome, voto: label }) // embaralhado
    return { ...r, tally, rdv }
  }

  const digitar = (d) => {
    const r = runRef.current
    const v = r.voter
    if (!v || v.phase !== 'voting') return
    if (v.sel === 'branco') return tremer()
    const cargo = cfg.cargos[v.idx]
    if (v.buffer.length >= cargo.digits) return
    const buffer = v.buffer + d
    let sel = v.sel
    if (buffer.length === cargo.digits) {
      const cd = mapaCands[cargo.id][buffer]
      sel = cd ? { type: 'cand', num: buffer, cand: cd } : { type: 'nulo', num: buffer }
    }
    commit({ ...r, voter: { ...v, buffer, sel } })
  }
  const branco = () => {
    const r = runRef.current, v = r.voter
    if (!v || v.phase !== 'voting') return
    if (v.buffer.length > 0 || v.sel) return tremer()
    commit({ ...r, voter: { ...v, sel: 'branco' } })
  }
  const corrige = () => {
    const r = runRef.current, v = r.voter
    if (!v || v.phase !== 'voting') return
    commit({ ...r, voter: { ...v, buffer: '', sel: null } })
  }
  const confirma = () => {
    const r = runRef.current, v = r.voter
    if (!v || v.phase !== 'voting') return
    let voto
    if (v.sel === 'branco') voto = { tipo: 'branco' }
    else if (v.sel && v.sel.type === 'cand') voto = { tipo: 'cand', num: v.sel.num }
    else if (v.sel && v.sel.type === 'nulo') voto = { tipo: 'nulo', num: v.sel.num }
    else return tremer()
    beep('ok')
    const cargo = cfg.cargos[v.idx]
    let next = registrar(r, cargo, voto)
    const votes = [...v.votes, { cargo: cargo.id, ...voto }]
    const idx = v.idx + 1
    if (idx >= cfg.cargos.length) {
      next = addLog({ ...next, voter: { ...v, votes, phase: 'done' } }, 'VOTO COMPUTADO (eleitor concluiu)')
      commit(next); beep('fim')
      fimTimer.current = setTimeout(() => commit({ ...runRef.current, voter: null }), 2600)
    } else {
      commit({ ...next, voter: { ...v, votes, idx, buffer: '', sel: null } })
    }
  }

  const onKey = (e) => {
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); digitar(e.key) }
    else if (e.key === 'Enter') { e.preventDefault(); confirma() }
    else if (e.key === 'Backspace') { e.preventDefault(); corrige() }
    else if (e.key.toLowerCase() === 'b') { e.preventDefault(); branco() }
  }

  /* ---- edição de config ---- */
  const setCampo = (k) => (e) => setCfg((c) => ({ ...c, [k]: e.target.value }))
  const setCand = (ci, ri, k, val) => setCfg((c) => {
    const cargos = clone(c.cargos); cargos[ci].cands[ri][k] = val; return { ...c, cargos }
  })
  const addCand = (ci) => setCfg((c) => {
    const cargos = clone(c.cargos)
    cargos[ci].cands.push({ num: '', nome: 'Novo candidato', part: c.parties[0]?.sigla || '' })
    return { ...c, cargos }
  })
  const delCand = (ci, ri) => setCfg((c) => {
    const cargos = clone(c.cargos); cargos[ci].cands.splice(ri, 1); return { ...c, cargos }
  })
  const setParty = (pi, k, val) => setCfg((c) => {
    const parties = clone(c.parties); parties[pi][k] = val; return { ...c, parties }
  })

  const aplicarConfig = () => { reiniciar(); setEditando(false) }
  const restaurar = () => { setCfg(DEFAULT_CFG); commit(freshRun(DEFAULT_CFG)); }

  const status = !run.aberta ? 'Fechada' : run.encerrada ? 'Encerrada' : 'Em votação'
  const podeHabilitar = run.aberta && !run.encerrada && !run.voter && run.comp < (Number(cfg.aptos) || 0)

  /* =================== render =================== */
  return (
    <div className="urna-sim">
      <style>{CSS}</style>

      <Notice kind="info">
        Simulador <b>educativo e fictício</b>. Nomes, números, partidos e seção são inventados. Reproduz o fluxo e o
        caminho dos dados — não o código, os resultados nem as chaves da urna real.
      </Notice>

      {/* barra de controle */}
      <div className="us-bar">
        <div className="us-meta">
          <span><i>Seção/Zona</i><b>{cfg.secao} / {cfg.zona}</b></span>
          <span><i>Aptos</i><b>{Number(cfg.aptos) || 0}</b></span>
          <span><i>Comparecimento</i><b>{run.comp}</b></span>
          <span><i>Situação</i><b>{status}</b></span>
          <span><i>Cripto</i><b className="us-crypto">{ok}</b></span>
        </div>
        <div className="us-actions">
          <button className="btn btn-primary" onClick={abrir} disabled={run.aberta}>▶ Abrir (Zerésima)</button>
          <button className="btn" onClick={habilitar} disabled={!podeHabilitar}>＋ Habilitar eleitor</button>
          <button className="btn" onClick={encerrar} disabled={!run.aberta || run.encerrada || !!run.voter}>■ Encerrar (BU)</button>
          <button className="btn btn-ghost" onClick={reiniciar}>↺ Reiniciar</button>
          <button className="btn btn-ghost" onClick={() => setEditando((v) => !v)} aria-expanded={editando}>⚙ {editando ? 'Fechar edição' : 'Editar candidatos'}</button>
        </div>
      </div>

      {/* editor de configuração */}
      {editando && (
        <div className="us-editor">
          <div className="us-grid4">
            <Field label="Município"><input value={cfg.municipio} onChange={setCampo('municipio')} /></Field>
            <Field label="UF"><input value={cfg.uf} onChange={setCampo('uf')} maxLength={2} /></Field>
            <Field label="Seção"><input value={cfg.secao} onChange={setCampo('secao')} inputMode="numeric" /></Field>
            <Field label="Zona"><input value={cfg.zona} onChange={setCampo('zona')} inputMode="numeric" /></Field>
            <Field label="Eleitores aptos"><input value={cfg.aptos} onChange={setCampo('aptos')} inputMode="numeric" /></Field>
          </div>

          <h4 className="us-h4">Partidos</h4>
          <div className="us-parties">
            {cfg.parties.map((p, pi) => (
              <div className="us-party" key={pi}>
                <input className="us-sig" value={p.sigla} onChange={(e) => setParty(pi, 'sigla', e.target.value.toUpperCase())} aria-label="Sigla" />
                <input value={p.nome} onChange={(e) => setParty(pi, 'nome', e.target.value)} aria-label="Nome do partido" />
                <input type="color" value={p.cor} onChange={(e) => setParty(pi, 'cor', e.target.value)} aria-label="Cor" />
              </div>
            ))}
          </div>

          {cfg.cargos.map((c, ci) => (
            <div className="us-cargo-edit" key={c.id}>
              <h4 className="us-h4">{c.nome} <span className="muted">· {c.digits} dígitos</span></h4>
              {c.cands.map((cd, ri) => (
                <div className="us-cand-edit" key={ri}>
                  <input className="us-num" value={cd.num} onChange={(e) => setCand(ci, ri, 'num', e.target.value.replace(/\D/g, '').slice(0, c.digits))} placeholder="nº" inputMode="numeric" aria-label="Número" />
                  <input value={cd.nome} onChange={(e) => setCand(ci, ri, 'nome', e.target.value)} placeholder="Nome" aria-label="Nome" />
                  <select value={cd.part} onChange={(e) => setCand(ci, ri, 'part', e.target.value)} aria-label="Partido">
                    {cfg.parties.map((p) => <option key={p.sigla} value={p.sigla}>{p.sigla}</option>)}
                  </select>
                  <button className="icon-btn" onClick={() => delCand(ci, ri)} aria-label="Remover candidato">×</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => addCand(ci)}>+ Adicionar candidato</button>
            </div>
          ))}

          <div className="us-editor-foot">
            <button className="btn btn-primary" onClick={aplicarConfig}>Aplicar e reiniciar</button>
            <button className="btn btn-ghost" onClick={restaurar}>Restaurar exemplo</button>
            <small className="muted">Editar reinicia a votação para manter os totais coerentes.</small>
          </div>
        </div>
      )}

      {/* duas colunas */}
      <div className="us-cols">
        {/* URNA */}
        <div className="us-urna" tabIndex={0} onKeyDown={onKey} role="group" aria-label="Terminal de votação simulado">
          <div className="us-brand"><span>SIMULADOR · URNA DIDÁTICA</span><span className={'us-dot' + (run.aberta && !run.encerrada ? ' on' : '')} /></div>
          <div className={'us-screen' + (shake ? ' us-shk' : '')} key={shake}>
            <Tela run={run} cfg={cfg} cargo={cargoAtual} />
          </div>
          <Teclado onDigit={digitar} onBranco={branco} onCorrige={corrige} onConfirma={confirma} />
          <p className="us-tip muted small">Clique na urna e use o teclado (números, Enter = CONFIRMA, Backspace = CORRIGE, B = BRANCO) ou os botões acima.</p>
        </div>

        {/* BASTIDORES */}
        <div className="us-back">
          <Tabs value={aba} onChange={setAba} tabs={[['tally', 'Contabilização'], ['rdv', 'RDV embaralhado'], ['log', 'Log'], ['bu', 'Boletim · Assinatura']]} />
          <div className="us-pane">
            {aba === 'tally' && <PainelTally run={run} cfg={cfg} />}
            {aba === 'rdv' && <PainelRDV run={run} />}
            {aba === 'log' && <PainelLog run={run} />}
            {aba === 'bu' && <PainelBU run={run} pub={pub} />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- tela da urna ---------- */
function Tela({ run, cfg, cargo }) {
  if (!run.aberta) return <Idle big="URNA FECHADA" sub="Aguardando abertura da seção pelo mesário." />
  if (run.encerrada) return <Idle big="VOTAÇÃO ENCERRADA" sub="Boletim de urna emitido e transmitido." />
  if (!run.voter) return <Idle big="AGUARDE" sub="O mesário vai liberar a urna para o próximo eleitor." />
  if (run.voter.phase === 'done') return <div className="us-verdict us-fim">FIM</div>

  const v = run.voter
  return (
    <>
      <div className="us-sbar"><span>SEU VOTO PARA</span><span>{v.idx + 1}/{cfg.cargos.length}</span></div>
      <div className="us-body">
        <div className="us-cargo">{cargo.nome.toUpperCase()}</div>
        <div className="us-numrow">
          <span className="us-numlbl">Número:</span>
          <span className="us-boxes">
            {Array.from({ length: cargo.digits }).map((_, i) => (
              <span className={'us-box' + (v.buffer[i] ? ' filled' : '')} key={i}>{v.buffer[i] || ''}</span>
            ))}
          </span>
        </div>

        {v.sel === 'branco' && <div className="us-verdict us-branco">VOTO EM BRANCO</div>}
        {v.sel && v.sel.type === 'nulo' && (
          <>
            <div className="us-verdict us-nulo">VOTO NULO</div>
            <p className="us-smallc">Número {v.sel.num} não corresponde a nenhum candidato.</p>
          </>
        )}
        {v.sel && v.sel.type === 'cand' && <Candidato cfg={cfg} sel={v.sel} />}

        <div className="us-instruct">
          {v.sel
            ? <>Aperte <b className="us-c">CONFIRMA</b> (verde) para confirmar · <b className="us-o">CORRIGE</b> (laranja) para refazer.</>
            : <>Digite o número do candidato. Para votar em branco, aperte <b>BRANCO</b>.</>}
        </div>
      </div>
    </>
  )
}
function Idle({ big, sub }) {
  return <div className="us-idle"><div className="us-idle-big">{big}</div><div>{sub}</div></div>
}
function Candidato({ cfg, sel }) {
  const c = sel.cand
  const linhas = [['Nome', c.nome], ['Número', sel.num], ['Partido', c.part + ' · ' + nomeDoPartido(cfg, c.part)]]
  if (c.vice) linhas.push(['Vice', c.vice])
  if (c.sup) linhas.push(['Suplentes', c.sup])
  return (
    <div className="us-cand">
      <dl>{linhas.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
      <div className="us-photo" style={{ background: corDoPartido(cfg, c.part) }}>{iniciais(c.nome)}</div>
    </div>
  )
}

/* ---------- teclado ---------- */
function Teclado({ onDigit, onBranco, onCorrige, onConfirma }) {
  return (
    <div className="us-pad">
      <div className="us-nums">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button className="us-key" key={n} onClick={() => onDigit(n)}>{n}</button>
        ))}
        <span /><button className="us-key" onClick={() => onDigit('0')}>0</button><span />
      </div>
      <div className="us-fns">
        <button className="us-key us-branco-k" onClick={onBranco}>BRANCO</button>
        <button className="us-key us-corrige-k" onClick={onCorrige}>CORRIGE</button>
        <button className="us-key us-confirma-k" onClick={onConfirma}>CONFIRMA</button>
      </div>
    </div>
  )
}

/* ---------- painéis bastidores ---------- */
function PainelTally({ run, cfg }) {
  return (
    <>
      <p className="us-hint">Cada CONFIRMA incrementa um contador. É a soma pública — totais por candidato, mais branco e nulo. Nenhuma identidade de eleitor entra aqui.</p>
      {cfg.cargos.map((c) => {
        const t = run.tally[c.id]
        const nums = c.cands.map((cd) => t.cand[cd.num])
        const tot = nums.reduce((a, b) => a + b, 0) + t.branco + t.nulo
        const max = Math.max(1, ...nums, t.branco, t.nulo)
        return (
          <details className="us-tcargo" key={c.id} open>
            <summary>{c.nome}<span className="us-tot">{tot} voto(s)</span></summary>
            {c.cands.map((cd) => (
              <Linha key={cd.num} cor={corDoPartido(cfg, cd.part)} nome={cd.nome} pn={cd.num + ' · ' + cd.part} ct={t.cand[cd.num]} max={max} />
            ))}
            <Linha cls="bch" cor="#8a8f96" nome="Branco" ct={t.branco} max={max} />
            <Linha cls="nul" cor="var(--red)" nome="Nulo" ct={t.nulo} max={max} />
          </details>
        )
      })}
    </>
  )
}
function Linha({ cls = '', cor, nome, pn, ct, max }) {
  return (
    <div className={'us-trow ' + cls}>
      <span className="us-sw" style={{ background: cor }} />
      <span className="us-nm">{nome}{pn && <span className="us-pn"> {pn}</span>}</span>
      <span className="us-barw"><span className="us-barf" style={{ width: (ct / max * 100) + '%', background: cor }} /></span>
      <span className="us-ct">{ct}</span>
    </div>
  )
}
function PainelRDV({ run }) {
  return (
    <>
      <p className="us-hint">O <b>Registro Digital do Voto</b> guarda cada voto isolado por cargo, em ordem <b>embaralhada</b>: cada entrada entra numa posição aleatória, para que ninguém reconstrua a sequência de votos de um mesmo eleitor.</p>
      {run.rdv.length === 0 ? <p className="muted us-empty">Sem registros ainda.</p> : (
        <div className="us-scroll mono">
          {run.rdv.map((e, i) => (
            <div className="us-ln" key={i}><span className="us-t">#{String(i + 1).padStart(3, '0')}</span><span className="us-cc">{e.cargo.split(' ')[0]}</span><span>{e.voto}</span></div>
          ))}
        </div>
      )}
    </>
  )
}
function PainelLog({ run }) {
  return run.logs.length === 0
    ? <p className="muted us-empty">Seção fechada.</p>
    : <div className="us-scroll mono">{run.logs.map((l, i) => <div className="us-ln" key={i}><span className="us-t">{l.t}</span><span>{l.ev}</span></div>)}</div>
}
function PainelBU({ run, pub }) {
  if (!run.zeresima && !run.bu) return <p className="muted us-empty">Abra e encerre a seção para gerar os documentos.</p>
  return (
    <>
      <p className="us-hint">Na abertura sai a <b>Zerésima</b> (tudo zerado). No encerramento sai o <b>Boletim de Urna</b>, com hash SHA-256 e assinatura ECDSA sobre o conteúdo — é o que viabiliza a conferência por qualquer pessoa.</p>
      {run.zeresima && <Cupom d={run.zeresima} titulo="ZERÉSIMA" pub={pub} />}
      {run.bu && <Cupom d={run.bu} titulo="BOLETIM DE URNA" pub={pub} transmit />}
    </>
  )
}
function Cupom({ d, titulo, pub, transmit }) {
  const o = d.doc
  const pkg = { documento: o, hash_sha256: d.hash, assinatura_ecdsa: d.sig, chave_publica: pub }
  return (
    <div className="us-cupom">
      <h4>{titulo}</h4>
      <div className="us-center">{o.municipio} · {o.uf}</div>
      <hr />
      <Kv k="Urna" v={o.urna} /><Kv k="Seção / Zona" v={o.secao + ' / ' + o.zona} />
      <Kv k="Aptos" v={o.aptos} /><Kv k="Comparecimento" v={o.comparecimento} /><Kv k="Abstenções" v={o.abstencoes} />
      {Object.entries(o.cargos).map(([cn, cg]) => (
        <div key={cn}><hr /><div className="us-strong">{cn.toUpperCase()}</div>
          {Object.entries(cg.nominais).map(([n, q]) => <Kv key={n} k={n} v={q} />)}
          <Kv k="Branco" v={cg.branco} /><Kv k="Nulo" v={cg.nulo} />
        </div>
      ))}
      <hr />
      <div className="us-strong">HASH SHA-256</div><div className="us-break">{d.hash}</div>
      <hr />
      <div className="us-strong">ASSINATURA ECDSA</div><div className="us-break">{d.sig || '(indisponível neste navegador)'}</div>
      {transmit && <><hr /><Kv k="Assinatura confere?" v={<span className="us-ok">{d.ok ? 'SIM ✓' : '—'}</span>} /><Kv k="Status" v="TRANSMITIDO (simulado)" /></>}
      <details className="us-more"><summary>Ver pacote JSON assinado + chave pública</summary>
        <pre>{JSON.stringify(pkg, null, 2)}</pre>
      </details>
    </div>
  )
}
function Kv({ k, v }) { return <div className="us-kv"><span>{k}</span><span>{v}</span></div> }

/* ---------- estilos (namespace .urna-sim) ---------- */
const CSS = `
.urna-sim{--confirma:#1f8a3b;--corrige:#e8730c;--dev-screen:#f4f3ec;--dev-ink:#1a2230;--dev-bar:#15497e}
.urna-sim .us-bar{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;justify-content:space-between;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px 14px;margin:14px 0}
.urna-sim .us-meta{display:flex;flex-wrap:wrap;gap:12px 18px}
.urna-sim .us-meta span{display:flex;flex-direction:column;gap:2px}
.urna-sim .us-meta i{font-style:normal;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.urna-sim .us-meta b{font-size:17px;font-variant-numeric:tabular-nums}
.urna-sim .us-crypto{font-size:13px;color:var(--green)}
.urna-sim .us-actions{display:flex;flex-wrap:wrap;gap:8px}
.urna-sim .btn-sm{padding:6px 10px;font-size:13px}
.urna-sim .us-editor{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:14px;margin-bottom:14px}
.urna-sim .us-grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.urna-sim .us-h4{margin:14px 0 6px;font-size:15px}
.urna-sim .us-parties,.urna-sim .us-cand-edit,.urna-sim .us-party{display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap}
.urna-sim .us-party input,.urna-sim .us-cand-edit input,.urna-sim .us-cand-edit select{flex:1;min-width:0}
.urna-sim .us-party .us-sig,.urna-sim .us-cand-edit .us-num{flex:0 0 72px}
.urna-sim .us-party input[type=color]{flex:0 0 42px;padding:2px;height:38px}
.urna-sim .us-editor input,.urna-sim .us-editor select{padding:8px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.urna-sim .us-editor-foot{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px}
.urna-sim .icon-btn{flex:0 0 auto;width:34px;height:34px;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:var(--radius);cursor:pointer}

.urna-sim .us-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
@media(max-width:760px){.urna-sim .us-cols{grid-template-columns:minmax(0,1fr)}}

.urna-sim .us-urna{background:linear-gradient(180deg,#d9d6cc,#c7c3b6);border-radius:16px;padding:14px;box-shadow:0 14px 34px rgba(0,0,0,.35);color:var(--dev-ink)}
.urna-sim .us-urna:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.urna-sim .us-brand{display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.06em;color:#5a5a50;font-weight:700;margin-bottom:8px}
.urna-sim .us-dot{width:9px;height:9px;border-radius:50%;background:#c23b2e}
.urna-sim .us-dot.on{background:#2ea043;box-shadow:0 0 8px #2ea043}
.urna-sim .us-screen{background:var(--dev-screen);border:2px solid #9c988a;border-radius:8px;min-height:300px;display:flex;flex-direction:column;overflow:hidden;color:var(--dev-ink)}
@keyframes usShake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(3px)}50%{transform:translateX(-3px)}}
.urna-sim .us-shk{animation:usShake .3s}
.urna-sim .us-sbar{background:var(--dev-bar);color:#fff;padding:7px 12px;font-size:14px;letter-spacing:.05em;display:flex;justify-content:space-between}
.urna-sim .us-body{padding:14px;display:flex;flex-direction:column;gap:10px;flex:1}
.urna-sim .us-cargo{font-weight:800;font-size:clamp(20px,4.5vw,28px);line-height:1;text-transform:uppercase}
.urna-sim .us-numrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.urna-sim .us-numlbl{font-weight:600;font-size:13px}
.urna-sim .us-boxes{display:flex;gap:6px}
.urna-sim .us-box{width:28px;height:38px;border:2px solid #8f8b7e;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:20px;font-weight:600}
.urna-sim .us-box.filled{border-color:var(--dev-bar)}
.urna-sim .us-cand{display:grid;grid-template-columns:1fr auto;gap:10px;background:#fff;border:1px solid #d8d4c6;border-radius:6px;padding:10px}
.urna-sim .us-cand dl{margin:0;display:flex;flex-direction:column;gap:3px}
.urna-sim .us-cand dl div{display:grid;grid-template-columns:auto 1fr;gap:3px 10px}
.urna-sim .us-cand dt{color:#6b6b60;font-weight:600;font-size:13px}
.urna-sim .us-cand dd{margin:0;font-weight:600;font-size:13px}
.urna-sim .us-photo{width:70px;height:90px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:26px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.urna-sim .us-verdict{font-weight:800;text-align:center;padding:14px 0;line-height:1;font-size:clamp(24px,6vw,38px)}
.urna-sim .us-branco{color:#555}
.urna-sim .us-nulo{color:#b3261e}
.urna-sim .us-fim{color:#1f8a3b;font-size:clamp(46px,15vw,90px);letter-spacing:.1em}
.urna-sim .us-smallc{text-align:center;font-size:12px;color:#555;margin:0}
.urna-sim .us-instruct{margin-top:auto;font-size:12px;color:#555;border-top:1px dashed #cbc7b8;padding-top:8px}
.urna-sim .us-instruct .us-c{color:var(--confirma)}.urna-sim .us-instruct .us-o{color:var(--corrige)}
.urna-sim .us-idle{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;color:#6b6b60;padding:20px}
.urna-sim .us-idle-big{font-weight:800;font-size:24px;color:var(--dev-ink)}

.urna-sim .us-pad{margin-top:14px;display:grid;grid-template-columns:1fr auto;gap:10px}
.urna-sim .us-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.urna-sim .us-fns{display:flex;flex-direction:column;gap:8px;min-width:116px}
.urna-sim .us-key{font-weight:700;font-size:22px;border-radius:9px;border:1px solid #b3afa2;background:linear-gradient(180deg,#fff,#ebe8df);color:#2a2a22;padding:12px 0;cursor:pointer;box-shadow:0 3px 0 #b3afa2}
.urna-sim .us-key:active{transform:translateY(2px);box-shadow:0 1px 0 #b3afa2}
.urna-sim .us-fns .us-key{flex:1;font-size:15px}
.urna-sim .us-branco-k{background:linear-gradient(180deg,#fff,#efefe8);color:#333}
.urna-sim .us-corrige-k{background:linear-gradient(180deg,#f59333,#e8730c);border-color:#b85b06;box-shadow:0 3px 0 #b85b06;color:#fff}
.urna-sim .us-confirma-k{background:linear-gradient(180deg,#2aa64b,#1f8a3b);border-color:#146427;box-shadow:0 3px 0 #146427;color:#fff}
.urna-sim .us-tip{margin-top:10px}

.urna-sim .us-back{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden}
.urna-sim .us-pane{padding:14px}
.urna-sim .us-hint{font-size:12.5px;color:var(--muted);margin:0 0 12px}
.urna-sim .us-empty{font-style:italic;padding:16px;text-align:center}
.urna-sim .us-tcargo{border:1px solid var(--line);border-radius:var(--radius);margin-bottom:10px;overflow:hidden}
.urna-sim .us-tcargo summary{cursor:pointer;padding:8px 11px;font-weight:600;display:flex;align-items:center;background:var(--panel-2)}
.urna-sim .us-tcargo .us-tot{margin-left:auto;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.urna-sim .us-trow{display:flex;align-items:center;gap:10px;padding:6px 11px;border-top:1px solid var(--line);font-size:13px}
.urna-sim .us-sw{width:10px;height:10px;border-radius:3px;flex:none}
.urna-sim .us-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.urna-sim .us-pn{color:var(--muted);font-size:11px;font-family:var(--font-mono)}
.urna-sim .us-barw{flex:1 1 50px;max-width:150px;height:7px;background:var(--panel-2);border-radius:4px;overflow:hidden}
.urna-sim .us-barf{display:block;height:100%;width:0;transition:width .4s}
.urna-sim .us-ct{font-family:var(--font-mono);font-weight:600;min-width:2.5ch;text-align:right;font-variant-numeric:tabular-nums}
.urna-sim .us-trow.nul .us-ct{color:var(--red)}
.urna-sim .us-scroll{max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg-2)}
.urna-sim .mono{font-family:var(--font-mono);font-size:12px}
.urna-sim .us-ln{display:flex;gap:10px;padding:4px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.urna-sim .us-ln .us-t{color:var(--muted);flex:none}
.urna-sim .us-ln .us-cc{color:var(--blue);flex:none;width:9ch;overflow:hidden;text-overflow:ellipsis}

.urna-sim .us-cupom{font-family:var(--font-mono);font-size:12px;background:#fcfcf7;color:#1a2230;border:1px dashed #b9b4a4;border-radius:var(--radius);padding:14px;line-height:1.5;margin-bottom:12px}
.urna-sim .us-cupom h4{text-align:center;margin:0 0 2px;font-size:16px}
.urna-sim .us-cupom hr{border:none;border-top:1px dashed #b9b4a4;margin:8px 0}
.urna-sim .us-center{text-align:center}
.urna-sim .us-strong{font-weight:700}
.urna-sim .us-kv{display:flex;justify-content:space-between;gap:12px}
.urna-sim .us-break{word-break:break-all}
.urna-sim .us-ok{color:#1f8a3b;font-weight:700}
.urna-sim .us-more{margin-top:10px}
.urna-sim .us-more summary{cursor:pointer;color:var(--blue)}
.urna-sim .us-more pre{white-space:pre-wrap;word-break:break-word;margin:8px 0 0;font-size:11px}
@media(prefers-reduced-motion:reduce){.urna-sim *{animation:none!important;transition:none!important}}
`
