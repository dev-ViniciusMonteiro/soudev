'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TRILHAS, alvosDeIma, arred, duracaoProjeto, fimDo, fmtTempo, imantar, livre } from '@/lib/editor/modelo'

const ALT_REGUA = 28
const ALT_MARC = 22
const ALT_TRILHA = { midia: 58, audio: 50, texto: 38, sticker: 38 }
const LARG_CAB = 132
const PASSOS = [1 / 30, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]

function Onda({ midia, clipe, largura, altura }) {
  const ondas = midia?.ondas
  if (!ondas?.length || !midia.duracao) return null
  const n = Math.max(2, Math.min(Math.floor(largura / 2), 600))
  const ini = clipe.corte / midia.duracao
  const fim = (clipe.corte + clipe.dur * (clipe.vel || 1)) / midia.duracao
  const meio = altura / 2
  let d = ''
  for (let i = 0; i <= n; i++) {
    const f = ini + ((fim - ini) * i) / n
    const v = ondas[Math.min(ondas.length - 1, Math.floor(f * ondas.length))] || 0
    d += `${i ? 'L' : 'M'}${((i / n) * largura).toFixed(1)},${(meio - v * meio * 0.9).toFixed(1)}`
  }
  for (let i = n; i >= 0; i--) {
    const f = ini + ((fim - ini) * i) / n
    const v = ondas[Math.min(ondas.length - 1, Math.floor(f * ondas.length))] || 0
    d += `L${((i / n) * largura).toFixed(1)},${(meio + v * meio * 0.9).toFixed(1)}`
  }
  return (
    <svg className="ed-onda" width={largura} height={altura} aria-hidden="true">
      <path d={`${d}Z`} />
    </svg>
  )
}

export default function Linha({ projeto, midias, tempo, setTempo, setTocando, tocando, selecao, selecionar, definir, ima, ripple, zoom, setZoom, marcadorSel, setMarcadorSel, onSoltar, trilhaMudar }) {
  const rolagem = useRef(null)
  const acao = useRef(null)
  const [caixaSel, setCaixaSel] = useState(null)
  const [guia, setGuia] = useState(null)
  const dur = duracaoProjeto(projeto)
  const largura = Math.max((dur + 20) * zoom, 800)
  const passo = PASSOS.find((s) => s * zoom >= 70) || 300

  // a agulha acompanha a reprodução
  useEffect(() => {
    const el = rolagem.current
    if (!el || !tocando) return
    const x = tempo * zoom + LARG_CAB
    if (x > el.scrollLeft + el.clientWidth - 40 || x < el.scrollLeft + LARG_CAB) el.scrollLeft = x - LARG_CAB - 40
  }, [tempo, tocando, zoom])

  // Ctrl + roda: zoom em volta do ponteiro
  useEffect(() => {
    const el = rolagem.current
    const roda = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const tPonteiro = (e.clientX - r.left + el.scrollLeft - LARG_CAB) / zoom
      const novo = Math.max(4, Math.min(600, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
      setZoom(novo)
      requestAnimationFrame(() => (el.scrollLeft = tPonteiro * novo + LARG_CAB - (e.clientX - r.left)))
    }
    el.addEventListener('wheel', roda, { passive: false })
    return () => el.removeEventListener('wheel', roda)
  }, [zoom, setZoom])

  const tempoDoX = (clientX) => {
    const r = rolagem.current.getBoundingClientRect()
    return Math.max(0, (clientX - r.left + rolagem.current.scrollLeft - LARG_CAB) / zoom)
  }

  const linhas = useMemo(() => {
    let y = ALT_REGUA + ALT_MARC
    return projeto.trilhas.map((tr) => {
      const a = ALT_TRILHA[tr.tipo]
      const l = { tr, y, a }
      y += a
      return l
    })
  }, [projeto.trilhas])

  /* ---------- régua: buscar arrastando ---------- */
  const buscar = (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    setTocando(false)
    const t = tempoDoX(e.clientX)
    setTempo(ima && !e.shiftKey ? (imantar(t, alvosDeIma(projeto), 8 / zoom) ?? t) : t)
    acao.current = { tipo: 'buscar' }
  }

  /* ---------- clipes: mover e aparar ---------- */
  const iniciarClipe = (e, clipe, trilha, modo) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      selecionar(selecao.includes(clipe.id) ? selecao.filter((x) => x !== clipe.id) : [...selecao, clipe.id])
      return
    }
    const ids = selecao.includes(clipe.id) && modo === 'mover' ? selecao : [clipe.id]
    if (!selecao.includes(clipe.id) || modo !== 'mover') selecionar(ids)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    const orig = new Map()
    for (const tr of projeto.trilhas) for (const c of tr.itens) if (ids.includes(c.id)) orig.set(c.id, { ...c, trilha: tr.id })
    acao.current = { tipo: modo, id: clipe.id, trilha: trilha.id, x0: e.clientX, ids, orig, base: projeto, primeiro: true, moveu: false }
  }

  const mover = (e) => {
    const a = acao.current
    if (!a) return
    if (a.tipo === 'buscar') {
      const t = tempoDoX(e.clientX)
      setTempo(ima && !e.shiftKey ? (imantar(t, alvosDeIma(projeto), 8 / zoom) ?? t) : t)
      return
    }
    if (a.tipo === 'caixa') {
      const r = rolagem.current.getBoundingClientRect()
      const x = e.clientX - r.left + rolagem.current.scrollLeft
      const y = e.clientY - r.top + rolagem.current.scrollTop
      const cx = { x0: Math.min(a.x, x), x1: Math.max(a.x, x), y0: Math.min(a.y, y), y1: Math.max(a.y, y) }
      a.moveu = a.moveu || Math.abs(x - a.x) + Math.abs(y - a.y) > 4
      if (!a.moveu) return
      setCaixaSel(cx)
      const t0 = (cx.x0 - LARG_CAB) / zoom
      const t1 = (cx.x1 - LARG_CAB) / zoom
      const ids = []
      for (const l of linhas) if (l.y + l.a > cx.y0 && l.y < cx.y1) for (const c of l.tr.itens) if (fimDo(c) > t0 && c.inicio < t1) ids.push(c.id)
      selecionar(e.ctrlKey || e.metaKey ? [...new Set([...a.selAntes, ...ids])] : ids)
      return
    }
    if (a.tipo === 'marcador') {
      const t = Math.max(0, arred(a.t0 + (e.clientX - a.x0) / zoom))
      definir({ ...projeto, marcadores: projeto.marcadores.map((m) => (m.id === a.id ? { ...m, t } : m)) }, a.primeiro)
      a.primeiro = false
      return
    }
    const dx = (e.clientX - a.x0) / zoom
    if (!a.moveu && Math.abs(e.clientX - a.x0) < 3) return
    a.moveu = true
    const alvos = ima && !e.shiftKey ? alvosDeIma(a.base, { exceto: new Set(a.ids), playhead: tempo }) : []
    const lim = 8 / zoom
    const o = a.orig.get(a.id)
    let novo = a.base

    if (a.tipo === 'mover') {
      let delta = dx
      const minIni = Math.min(...[...a.orig.values()].map((c) => c.inicio))
      if (alvos.length) {
        const s1 = imantar(o.inicio + delta, alvos, lim)
        const s2 = imantar(o.inicio + o.dur + delta, alvos, lim)
        if (s1 !== null) delta = s1 - o.inicio
        else if (s2 !== null) delta = s2 - o.inicio - o.dur
        setGuia(s1 ?? s2)
      }
      delta = Math.max(-minIni, delta)
      // trilha de destino (só para um clipe)
      let destino = null
      if (a.ids.length === 1) {
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-trilha]')
        const tr = el && a.base.trilhas.find((t) => t.id === el.dataset.trilha)
        if (tr && TRILHAS[tr.tipo].aceita.includes(o.tipo)) destino = tr.id
      }
      const ignorar = new Set(a.ids)
      // tira os clipes que se movem e os põe de volta na trilha de destino, deslocados
      const tentativa = {
        ...a.base,
        trilhas: a.base.trilhas.map((tr) => {
          const itens = tr.itens.filter((c) => !a.orig.has(c.id))
          for (const [, c] of a.orig) {
            const alvo = a.ids.length === 1 && destino ? destino : c.trilha
            if (alvo !== tr.id) continue
            const { trilha, ...resto } = c
            itens.push({ ...resto, inicio: arred(c.inicio + delta) })
          }
          return { ...tr, itens }
        }),
      }
      const ok = tentativa.trilhas.every((tr) => tr.itens.filter((c) => ignorar.has(c.id)).every((c) => livre(tr, c.inicio, fimDo(c), ignorar)))
      if (ok) {
        novo = tentativa
        a.ultimo = novo
      } else novo = a.ultimo || a.base
    } else {
      const m = midias.get(o.midia)
      const limitado = o.tipo === 'video' || o.tipo === 'audio'
      const vel = o.vel || 1
      const tr = a.base.trilhas.find((t) => t.id === o.trilha)
      const vizinhos = tr.itens.filter((c) => c.id !== o.id)
      if (a.tipo === 'aparar-esq') {
        let ini = o.inicio + dx
        if (alvos.length) {
          const s = imantar(ini, alvos, lim)
          if (s !== null) ini = s
          setGuia(s)
        }
        const minIni = Math.max(0, limitado ? o.inicio - o.corte / vel : -Infinity, ...vizinhos.filter((c) => fimDo(c) <= o.inicio + 0.001).map(fimDo))
        ini = Math.min(Math.max(ini, minIni), fimDo(o) - 1 / 30)
        const d = ini - o.inicio
        const kf = Object.fromEntries(Object.entries(o.kf || {}).map(([p, ks]) => [p, ks.map((k) => ({ ...k, t: arred(k.t - d) })).filter((k) => k.t >= -0.001)]))
        novo = { ...a.base, trilhas: a.base.trilhas.map((t) => (t.id === tr.id ? { ...t, itens: t.itens.map((c) => (c.id === o.id ? { ...c, inicio: arred(ini), dur: arred(o.dur - d), corte: arred(o.corte + d * vel), kf } : c)) } : t)) }
      } else {
        let fim = fimDo(o) + dx
        if (alvos.length) {
          const s = imantar(fim, alvos, lim)
          if (s !== null) fim = s
          setGuia(s)
        }
        const maxFim = Math.min(limitado && m ? o.inicio + (m.duracao - o.corte) / vel : Infinity, ripple ? Infinity : Math.min(Infinity, ...vizinhos.filter((c) => c.inicio >= fimDo(o) - 0.001).map((c) => c.inicio)))
        fim = Math.max(o.inicio + 1 / 30, Math.min(fim, maxFim))
        const d = fim - fimDo(o)
        novo = {
          ...a.base,
          trilhas: a.base.trilhas.map((t) =>
            t.id === tr.id ? { ...t, itens: t.itens.map((c) => (c.id === o.id ? { ...c, dur: arred(fim - o.inicio) } : ripple && c.inicio >= fimDo(o) - 0.001 ? { ...c, inicio: arred(c.inicio + d) } : c)) } : t,
          ),
        }
      }
    }
    definir(novo, a.primeiro)
    a.primeiro = false
  }

  const soltar = (e) => {
    const a = acao.current
    acao.current = null
    setGuia(null)
    setCaixaSel(null)
    // clique (sem arrastar) num clipe de uma seleção múltipla: fica só ele
    if (a?.tipo === 'mover' && !a.moveu && a.ids.length > 1) selecionar([a.id])
    if (a?.tipo === 'caixa' && !a.moveu) {
      setTocando(false)
      setTempo(tempoDoX(e.clientX))
      if (!e.ctrlKey && !e.metaKey) selecionar([])
      setMarcadorSel(null)
    }
  }

  const iniciarCaixa = (e) => {
    if (e.button !== 0) return
    const r = rolagem.current.getBoundingClientRect()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    acao.current = { tipo: 'caixa', x: e.clientX - r.left + rolagem.current.scrollLeft, y: e.clientY - r.top + rolagem.current.scrollTop, moveu: false, selAntes: selecao }
  }

  const soltarArquivo = (e, trilha) => {
    e.preventDefault()
    const t = Math.round(tempoDoX(e.clientX) * 100) / 100
    const idMidia = e.dataTransfer.getData('application/x-ed-midia')
    if (idMidia) onSoltar({ midia: idMidia }, t, trilha?.id)
    else if (e.dataTransfer.files?.length) onSoltar({ arquivos: [...e.dataTransfer.files] }, t, trilha?.id)
  }

  const ticks = []
  for (let t = 0; t <= dur + 20; t += passo) ticks.push(arred(t, 4))

  return (
    <div className="ed-linha" ref={rolagem} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onDragOver={(e) => e.preventDefault()} onDrop={(e) => soltarArquivo(e, null)}>
      <div className="ed-linha-conteudo" style={{ width: largura + LARG_CAB }}>
        <div className="ed-regua" style={{ height: ALT_REGUA }}>
          <div className="ed-cab ed-cab-regua" style={{ width: LARG_CAB }}>
            {fmtTempo(tempo, projeto.fps, true)}
          </div>
          <div className="ed-regua-faixa" onPointerDown={buscar}>
            {ticks.map((t) => (
              <span key={t} className="ed-tick" style={{ left: t * zoom }}>
                {passo < 1 && t % 1 ? '' : fmtTempo(t)}
              </span>
            ))}
          </div>
        </div>
        <div className="ed-marcadores" style={{ height: ALT_MARC }}>
          <div className="ed-cab" style={{ width: LARG_CAB }}>
            Marcadores
          </div>
          <div className="ed-marcadores-faixa" onPointerDown={buscar}>
            {(projeto.marcadores || []).map((m) => (
              <button
                key={m.id}
                type="button"
                className={`ed-marcador ${marcadorSel === m.id ? 'sel' : ''}`}
                style={{ left: m.t * zoom, width: m.dur ? m.dur * zoom : undefined, '--cor': m.cor }}
                title={`${fmtTempo(m.t, projeto.fps, true)}${m.nota ? `: ${m.nota}` : ''}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId)
                  } catch {}
                  setMarcadorSel(m.id)
                  selecionar([])
                  setTempo(m.t)
                  acao.current = { tipo: 'marcador', id: m.id, x0: e.clientX, t0: m.t, primeiro: true }
                }}
              >
                <span aria-hidden="true">⚑</span>
                {m.nota && <span className="ed-marcador-nota">{m.nota}</span>}
              </button>
            ))}
          </div>
        </div>
        {linhas.map(({ tr, a }) => (
          <div key={tr.id} className={`ed-trilha ed-trilha-${tr.tipo} ${tr.oculto ? 'oculta' : ''}`} style={{ height: a }}>
            <div className="ed-cab" style={{ width: LARG_CAB }}>
              <span className="ed-cab-nome" style={{ color: TRILHAS[tr.tipo].cor }}>
                {TRILHAS[tr.tipo].nome}
              </span>
              <span className="ed-cab-botoes">
                {tr.tipo !== 'texto' && tr.tipo !== 'sticker' && (
                  <button type="button" className={`ed-icone ${tr.mudo ? 'ativo' : ''}`} title={tr.mudo ? 'Ligar som' : 'Silenciar trilha'} aria-pressed={tr.mudo} onClick={() => trilhaMudar(tr.id, { mudo: !tr.mudo })}>
                    {tr.mudo ? '🔇' : '🔊'}
                  </button>
                )}
                {tr.tipo !== 'audio' && (
                  <button type="button" className={`ed-icone ${tr.oculto ? 'ativo' : ''}`} title={tr.oculto ? 'Mostrar trilha' : 'Esconder trilha'} aria-pressed={tr.oculto} onClick={() => trilhaMudar(tr.id, { oculto: !tr.oculto })}>
                    {tr.oculto ? '🙈' : '👁'}
                  </button>
                )}
                {!tr.itens.length && projeto.trilhas.filter((t) => t.tipo === tr.tipo).length > 1 && (
                  <button type="button" className="ed-icone" title="Remover trilha vazia" onClick={() => trilhaMudar(tr.id, null)}>
                    ✕
                  </button>
                )}
              </span>
            </div>
            <div className="ed-faixa" data-trilha={tr.id} onPointerDown={iniciarCaixa} onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.stopPropagation(), soltarArquivo(e, tr))}>
              {tr.itens.map((c) => {
                const m = midias.get(c.midia)
                const w = Math.max(2, c.dur * zoom)
                const kfs = [...new Set(Object.values(c.kf || {}).flatMap((ks) => ks.map((k) => k.t)))]
                return (
                  <div
                    key={c.id}
                    className={`ed-clipe ed-clipe-${c.tipo} ${selecao.includes(c.id) ? 'sel' : ''}`}
                    style={{ left: c.inicio * zoom, width: w, backgroundImage: c.tipo === 'video' || c.tipo === 'imagem' ? `url(${m?.miniatura || ''})` : undefined }}
                    onPointerDown={(e) => iniciarClipe(e, c, tr, 'mover')}
                    title={`${c.nome || c.texto?.conteudo || ''} · ${fmtTempo(c.inicio, projeto.fps, true)} → ${fmtTempo(fimDo(c), projeto.fps, true)}${c.vel !== 1 ? ` · ${c.vel}×` : ''}`}
                  >
                    {(c.tipo === 'audio' || (c.tipo === 'video' && m?.ondas)) && <Onda midia={m} clipe={c} largura={w} altura={c.tipo === 'audio' ? a - 6 : 18} />}
                    <span className="ed-clipe-nome">
                      {c.tipo === 'texto' ? c.texto.conteudo.split('\n')[0] : c.tipo === 'sticker' ? `${c.sticker.tipo === 'emoji' ? c.sticker.valor : '◆'} ${c.nome}` : c.nome}
                      {c.vel !== 1 && <em> {c.vel}×</em>}
                      {c.mascara?.tipo && <em> ◐</em>}
                    </span>
                    {kfs.map((t) => (
                      <span key={t} className="ed-clipe-kf" style={{ left: t * zoom }} aria-hidden="true" />
                    ))}
                    <span className="ed-borda ed-borda-esq" onPointerDown={(e) => iniciarClipe(e, c, tr, 'aparar-esq')} title="Arraste para aparar o início" />
                    <span className="ed-borda ed-borda-dir" onPointerDown={(e) => iniciarClipe(e, c, tr, 'aparar-dir')} title="Arraste para aparar o fim" />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div className="ed-agulha" style={{ left: LARG_CAB + tempo * zoom }} aria-hidden="true" />
        {guia !== null && <div className="ed-guia" style={{ left: LARG_CAB + guia * zoom }} aria-hidden="true" />}
        {caixaSel && <div className="ed-caixa-sel" style={{ left: caixaSel.x0, top: caixaSel.y0, width: caixaSel.x1 - caixaSel.x0, height: caixaSel.y1 - caixaSel.y0 }} aria-hidden="true" />}
      </div>
    </div>
  )
}
