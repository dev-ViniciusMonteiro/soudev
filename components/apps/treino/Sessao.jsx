'use client'

// Treino guiado: séries preenchidas pela progressão, descanso com alerta, recordes na hora, calculadora de anilhas.

import { useEffect, useMemo, useRef, useState } from 'react'
import { excluir, salvar, useColecao } from '@/lib/treino/banco'
import { BARRAS, RIR, RPE, anilhas, corEsforco, e1rm, emDeload, hoje, novoRecorde, proximaMeta, recordes, repsDaSerie, round, seriesFeitas, ultimaVez, uid } from '@/lib/treino/logica'
import Biblioteca, { DetalheExercicio } from './Biblioteca'
import { FotoExercicio, Modal, fmtDuracao, fmtKg, fmtNum, nomeEx, useAviso, useBib } from './comum'
import { SIGLA_SERIE, TIPOS_SERIE, novoItem } from './Rotinas'

const agoraLocal = () => {
  const d = new Date()
  return `${hoje(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

/** Monta a sessão a partir da rotina, já com as cargas da progressão. */
export function criarSessao(rotina, sessoes, cfg, data = hoje()) {
  const deload = emDeload(cfg, sessoes, data)
  const itens = (rotina?.itens || []).map((it) => {
    const meta = proximaMeta(it, sessoes, { hojeIso: data, deloadAtivo: deload, deloadPct: cfg.deloadPct })
    const aquecimento = it.series.filter((s) => s.tipo === 'aquecimento')
    const trabalho = it.series.filter((s) => s.tipo !== 'aquecimento')
    const n = Math.max(1, meta.series || trabalho.length)
    const series = [
      ...aquecimento.map((s) => ({ ...s, carga: meta.carga ? round(meta.carga * 0.5 * 2, 0) / 2 : s.carga, feita: false })),
      ...Array.from({ length: n }, (_, k) => {
        const s = trabalho[Math.min(k, trabalho.length - 1)] || { tipo: 'normal' }
        const piramide = it.progressao?.regra === 'nenhuma' && trabalho.length > 1
        return {
          ...s,
          carga: piramide ? s.carga : meta.carga,
          reps: it.tipo === 'reps' ? (piramide ? s.reps : meta.reps || s.reps) : 0,
          tempo: it.tipo !== 'reps' ? meta.tempo || s.tempo : undefined,
          ...(it.unilateral && it.tipo === 'reps' ? { repsE: '', repsD: '' } : {}),
          feita: false,
        }
      }),
    ]
    return { ...it, series, motivo: meta.motivo }
  })
  return { id: uid(), rotina_id: rotina?.id || null, nome: rotina?.nome || 'Treino livre', data, inicio: agoraLocal(), fim: null, status: 'andamento', itens, nota: '', deload, pesoCorporal: cfg.pesoCorporal || 0 }
}

/* ---------- Som e alerta do descanso ---------- */

let audio = null
function bipe(vezes = 3) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    for (let i = 0; i < vezes; i++) {
      const o = audio.createOscillator()
      const g = audio.createGain()
      o.frequency.value = i === vezes - 1 ? 1320 : 880
      g.gain.setValueAtTime(0.0001, audio.currentTime + i * 0.25)
      g.gain.exponentialRampToValueAtTime(0.3, audio.currentTime + i * 0.25 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + i * 0.25 + 0.18)
      o.connect(g).connect(audio.destination)
      o.start(audio.currentTime + i * 0.25)
      o.stop(audio.currentTime + i * 0.25 + 0.2)
    }
  } catch {}
}

function useWakeLock(ativo) {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return
    let trava = null
    const pedir = () =>
      navigator.wakeLock
        .request('screen')
        .then((t) => (trava = t))
        .catch(() => {})
    pedir()
    const vis = () => document.visibilityState === 'visible' && pedir()
    document.addEventListener('visibilitychange', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      trava?.release().catch(() => {})
    }
  }, [ativo])
}

/* ---------- Tela do treino ---------- */

export default function Sessao({ sessao: inicial, cfg, onFechar, edicao = false }) {
  const bib = useBib()
  const aviso = useAviso()
  const todas = useColecao('sessoes') || []
  const [s, setS] = useState(inicial)
  const [descanso, setDescanso] = useState(null)
  const [agora, setAgora] = useState(Date.now())
  const [flash, setFlash] = useState(false)
  const [anilhasDe, setAnilhasDe] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [adicionar, setAdicionar] = useState(false)
  const [resumo, setResumo] = useState(null)
  const [cronometro, setCronometro] = useState(null)
  const [trocar, setTrocar] = useState(null)
  useWakeLock(!edicao && s.status === 'andamento')

  const outras = useMemo(() => todas.filter((x) => x.id !== s.id), [todas, s.id])
  const antes = useMemo(() => {
    const m = {}
    for (const it of s.itens) m[it.ex] ??= recordes(outras, it.ex)
    return m
  }, [outras, s.itens])

  // grava a cada mudança (o treino sobrevive a recarregar a página)
  const primeira = useRef(true)
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      if (edicao) return
    }
    if (edicao && s.status !== 'andamento') return
    const t = setTimeout(() => salvar('sessoes', s), 300)
    return () => clearTimeout(t)
  }, [s, edicao])

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  // fim do descanso: som, vibração e tela piscando
  useEffect(() => {
    if (!descanso || descanso.avisado || agora < descanso.fim) return
    setDescanso((d) => ({ ...d, avisado: true }))
    if (cfg.som) bipe()
    if (cfg.vibrar) navigator.vibrate?.([200, 100, 200, 100, 400])
    setFlash(true)
    setTimeout(() => setFlash(false), 1600)
    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') new Notification('Descanso acabou', { body: 'Hora da próxima série.' })
  }, [agora, descanso, cfg.som, cfg.vibrar])

  // cronômetro de série por tempo
  useEffect(() => {
    if (!cronometro || agora < cronometro.fim) return
    const { i, k, total } = cronometro
    setCronometro(null)
    if (cfg.som) bipe(2)
    if (cfg.vibrar) navigator.vibrate?.(400)
    marcar(i, k, { tempo: total })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agora, cronometro])

  const mudarItem = (i, patch) => setS((x) => ({ ...x, itens: x.itens.map((it, j) => (j === i ? { ...it, ...patch } : it)) }))
  const mudarSerie = (i, k, patch) => setS((x) => ({ ...x, itens: x.itens.map((it, j) => (j === i ? { ...it, series: it.series.map((se, m) => (m === k ? { ...se, ...patch } : se)) } : it)) }))

  function marcar(i, k, extra = {}) {
    const it = s.itens[i]
    const se = { ...it.series[k], ...extra }
    const feita = !se.feita
    mudarSerie(i, k, { ...extra, feita })
    if (!feita || edicao) return
    if (se.tipo !== 'aquecimento') {
      const batidos = novoRecorde(se, antes[it.ex] || { carga: 0, e1rm: 0, reps: 0, tempo: 0 })
      if (batidos.length && todas.some((x) => x.status === 'concluida' && x.id !== s.id && x.itens?.some((y) => y.ex === it.ex))) {
        aviso(`🏆 Recorde em ${nomeEx(bib?.de(it.ex))}: ${batidos.join(', ')}!`)
        if (cfg.vibrar) navigator.vibrate?.([80, 60, 80])
      }
    }
    // supersérie: só descansa depois do último exercício do grupo
    const proximoNoGrupo = it.grupo && s.itens[i + 1]?.grupo === it.grupo
    if (proximoNoGrupo) return
    const seg = Number(se.descanso) || Number(it.descanso) || cfg.descansoPadrao
    if (seg > 0) setDescanso({ fim: Date.now() + seg * 1000, total: seg, avisado: false })
  }

  const concluir = async () => {
    const final = { ...s, status: 'concluida', fim: edicao ? s.fim || `${s.data}T${(s.inicio || 'T18:00').split('T')[1] || '18:00'}` : agoraLocal(), itens: s.itens.filter((it) => it.series.some((x) => x.feita)) }
    if (!final.itens.length) {
      aviso('Marque pelo menos uma série feita (✓) antes de terminar.')
      return
    }
    if (edicao) final.inicio = `${final.data}T${(s.inicio || '').split('T')[1] || '18:00'}`
    await salvar('sessoes', final)
    if (edicao) return onFechar()
    const prs = []
    for (const it of final.itens) {
      const a = antes[it.ex]
      const depois = recordes([...outras, final], it.ex)
      const temHistorico = outras.some((x) => x.status === 'concluida' && x.itens?.some((y) => y.ex === it.ex))
      if (temHistorico && (depois.carga > a.carga || depois.e1rm > a.e1rm || depois.reps > a.reps || depois.tempo > a.tempo)) prs.push(nomeEx(bib?.de(it.ex)))
    }
    setResumo({ sessao: final, prs })
  }

  const descartar = async () => {
    if (!confirm('Descartar este treino? O que você marcou será perdido.')) return
    await excluir('sessoes', s.id)
    onFechar()
  }

  const decorrido = (Date.now() - new Date(s.inicio).getTime()) / 1000
  const volume = s.itens.reduce((t, it) => t + seriesFeitas(it).reduce((v, se) => v + ((it.corporal ? Number(s.pesoCorporal) || 0 : 0) + (Number(se.carga) || 0)) * repsDaSerie(se), 0), 0)
  const feitas = s.itens.reduce((t, it) => t + it.series.filter((x) => x.feita).length, 0)
  const total = s.itens.reduce((t, it) => t + it.series.length, 0)
  const restante = descanso ? Math.ceil((descanso.fim - agora) / 1000) : 0

  return (
    <div className={`tr-sessao ${flash ? 'tr-flash' : ''}`}>
      <header className="tr-sessao-topo">
        <button type="button" className="tr-icone" onClick={onFechar} aria-label="Minimizar treino">
          ⌄
        </button>
        <div className="tr-sessao-titulo">
          <input className="tr-input-titulo" value={s.nome} onChange={(e) => setS({ ...s, nome: e.target.value })} aria-label="Nome do treino" />
          <span className="tr-ajuda">
            {edicao ? (
              <input type="date" className="tr-input tr-mini" value={s.data} max={hoje()} onChange={(e) => setS({ ...s, data: e.target.value })} aria-label="Data do treino" />
            ) : (
              <>
                {fmtDuracao(decorrido)} · {feitas}/{total} séries · {fmtKg(round(volume, 0))}
              </>
            )}
            {s.deload && <span className="tr-selo tr-selo-aviso">Deload</span>}
          </span>
        </div>
        <button type="button" className="tr-btn tr-btn-primario" onClick={concluir}>
          {edicao ? 'Salvar' : 'Terminar'}
        </button>
      </header>
      <div className="tr-progresso" aria-hidden="true">
        <span style={{ width: `${total ? (feitas / total) * 100 : 0}%` }} />
      </div>

      <div className="tr-sessao-corpo">
        {s.itens.map((it, i) => {
          const ex = bib?.de(it.ex)
          const ult = ultimaVez(outras, it.ex, edicao ? s.data : null)
          const grupoInicio = it.grupo && s.itens[i - 1]?.grupo !== it.grupo
          return (
            <section key={it.id} className={`tr-cartao tr-exercicio ${it.grupo ? 'tr-item-super' : ''}`} aria-label={nomeEx(ex)}>
              {grupoInicio && <p className="tr-super-rotulo">⛓ Supersérie: faça uma série de cada, depois descanse</p>}
              <div className="tr-item-topo">
                <button type="button" className="tr-foto-botao" onClick={() => ex && setDetalhe(ex)} aria-label={`Ver como fazer ${nomeEx(ex)}`}>
                  <FotoExercicio ex={ex} tamanho={52} />
                </button>
                <div className="tr-item-nome">
                  <strong>{nomeEx(ex)}</strong>
                  {ult && (
                    <span className="tr-ajuda">
                      Última vez:{' '}
                      {seriesFeitas(ult.item)
                        .map((x) => (x.tempo && !x.reps ? `${x.tempo}s` : `${x.carga ? `${fmtNum(x.carga)}×` : ''}${repsDaSerie(x)}`))
                        .join(', ')}
                    </span>
                  )}
                  {it.motivo && <span className="tr-motivo">{it.motivo}</span>}
                  {it.nota && <span className="tr-ajuda">📝 {it.nota}</span>}
                </div>
                <details className="tr-menu">
                  <summary className="tr-icone" aria-label="Opções do exercício">
                    ⋯
                  </summary>
                  <div className="tr-menu-lista">
                    <button type="button" onClick={() => setTrocar(i)}>
                      Trocar exercício
                    </button>
                    <button type="button" onClick={() => setAnilhasDe({ carga: it.series.find((x) => !x.feita && x.tipo !== 'aquecimento')?.carga || it.series.find((x) => x.tipo !== 'aquecimento')?.carga || 20 })}>
                      Calculadora de anilhas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nota = prompt('Observação deste exercício:', it.nota || '')
                        if (nota !== null) mudarItem(i, { nota })
                      }}
                    >
                      Observação
                    </button>
                    <button type="button" onClick={() => mudarItem(i, { unilateral: !it.unilateral, series: it.series.map((x) => (it.unilateral ? { ...x, repsE: undefined, repsD: undefined } : { ...x, repsE: x.reps, repsD: x.reps })) })}>
                      {it.unilateral ? 'Lados juntos' : 'Cada lado separado'}
                    </button>
                    <button type="button" className="tr-perigo" onClick={() => setS({ ...s, itens: s.itens.filter((_, j) => j !== i) })}>
                      Remover do treino
                    </button>
                  </div>
                </details>
              </div>

              <div className="tr-series" role="table" aria-label="Séries">
                <div className="tr-serie tr-serie-cab" role="row">
                  <span role="columnheader">Série</span>
                  {it.tipo === 'cardio' ? (
                    <>
                      <span role="columnheader">Min</span>
                      <span role="columnheader">Km</span>
                    </>
                  ) : it.tipo === 'tempo' ? (
                    <>
                      <span role="columnheader">{it.corporal ? '+kg' : 'kg'}</span>
                      <span role="columnheader">Segundos</span>
                    </>
                  ) : (
                    <>
                      <span role="columnheader">{it.corporal ? '+kg' : 'kg'}</span>
                      <span role="columnheader">{it.unilateral ? 'Esq / Dir' : 'Reps'}</span>
                    </>
                  )}
                  <span role="columnheader">{cfg.esforco === 'rpe' ? 'RPE' : 'RIR'}</span>
                  <span role="columnheader" className="sr-only">
                    Feita
                  </span>
                </div>
                {it.series.map((se, k) => {
                  const nWork = it.series.slice(0, k + 1).filter((x) => x.tipo !== 'aquecimento').length
                  const pr = se.feita && se.tipo !== 'aquecimento' && antes[it.ex] && (Number(se.carga) > antes[it.ex].carga || e1rm(se.carga, repsDaSerie(se)) > antes[it.ex].e1rm) && antes[it.ex].e1rm > 0
                  const rodando = cronometro && cronometro.i === i && cronometro.k === k
                  return (
                    <div key={k} className={`tr-serie ${se.feita ? 'feita' : ''} tr-serie-${se.tipo}`} role="row">
                      <button
                        type="button"
                        className="tr-serie-tipo"
                        title={TIPOS_SERIE.find((t) => t[0] === se.tipo)?.[1]}
                        aria-label={`Série ${k + 1}, ${TIPOS_SERIE.find((t) => t[0] === se.tipo)?.[1]}. Toque para mudar o tipo`}
                        onClick={() => {
                          const ordem = TIPOS_SERIE.map((t) => t[0])
                          mudarSerie(i, k, { tipo: ordem[(ordem.indexOf(se.tipo) + 1) % ordem.length] })
                        }}
                      >
                        {SIGLA_SERIE[se.tipo] || nWork}
                        {pr && <span aria-label="recorde"> 🏆</span>}
                      </button>
                      {it.tipo === 'cardio' ? (
                        <>
                          <input className="tr-input tr-num" type="number" inputMode="decimal" value={se.tempo ? round(se.tempo / 60, 1) : ''} onChange={(e) => mudarSerie(i, k, { tempo: Math.round(Number(e.target.value) * 60) })} aria-label="Minutos" />
                          <input className="tr-input tr-num" type="number" inputMode="decimal" step="0.1" value={se.distancia ?? ''} onChange={(e) => mudarSerie(i, k, { distancia: Number(e.target.value) })} aria-label="Quilômetros" />
                        </>
                      ) : (
                        <>
                          <input className="tr-input tr-num" type="number" inputMode="decimal" step="0.5" value={se.carga ?? ''} placeholder="0" onChange={(e) => mudarSerie(i, k, { carga: e.target.value === '' ? '' : Number(e.target.value) })} aria-label={it.corporal ? 'Carga extra em kg' : 'Carga em kg'} />
                          {it.tipo === 'tempo' ? (
                            <button
                              type="button"
                              className={`tr-input tr-num tr-cron ${rodando ? 'rodando' : ''}`}
                              onClick={() => (rodando ? setCronometro(null) : setCronometro({ i, k, total: Number(se.tempo) || 30, fim: Date.now() + (Number(se.tempo) || 30) * 1000 }))}
                              aria-label={rodando ? 'Parar cronômetro' : `Iniciar ${se.tempo || 30} segundos`}
                            >
                              {rodando ? `${Math.max(0, Math.ceil((cronometro.fim - agora) / 1000))}s ■` : `▶ ${se.tempo || 30}s`}
                            </button>
                          ) : it.unilateral ? (
                            <span className="tr-lados">
                              <input className="tr-input tr-num" type="number" inputMode="numeric" value={se.repsE ?? ''} placeholder={String(se.reps || '')} onChange={(e) => mudarSerie(i, k, { repsE: Number(e.target.value) })} aria-label="Repetições lado esquerdo" />
                              <input className="tr-input tr-num" type="number" inputMode="numeric" value={se.repsD ?? ''} placeholder={String(se.reps || '')} onChange={(e) => mudarSerie(i, k, { repsD: Number(e.target.value) })} aria-label="Repetições lado direito" />
                            </span>
                          ) : (
                            <input className="tr-input tr-num" type="number" inputMode="numeric" value={se.reps ?? ''} onChange={(e) => mudarSerie(i, k, { reps: e.target.value === '' ? '' : Number(e.target.value) })} aria-label="Repetições" />
                          )}
                        </>
                      )}
                      <select
                        className="tr-select tr-num tr-esforco"
                        value={se.esforco ?? ''}
                        onChange={(e) => mudarSerie(i, k, { esforco: e.target.value === '' ? '' : Number(e.target.value) })}
                        style={se.esforco !== '' && se.esforco !== undefined ? { color: corEsforco(cfg.esforco, se.esforco) } : undefined}
                        aria-label={cfg.esforco === 'rpe' ? 'Esforço (RPE)' : 'Repetições na reserva (RIR)'}
                      >
                        <option value="">-</option>
                        {(cfg.esforco === 'rpe' ? RPE : RIR).map(([v, t]) => (
                          <option key={v} value={v} title={t}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <button type="button" className={`tr-feita ${se.feita ? 'sim' : ''}`} onClick={() => marcar(i, k)} aria-pressed={!!se.feita} aria-label={se.feita ? 'Desmarcar série' : 'Marcar série como feita'}>
                        ✓
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="tr-acoes">
                <button type="button" className="tr-btn tr-btn-ghost tr-pequeno" onClick={() => mudarItem(i, { series: [...it.series, { ...(it.series.filter((x) => x.tipo !== 'aquecimento').at(-1) || { tipo: 'normal', reps: 10 }), feita: false }] })}>
                  + Série
                </button>
                {it.series.length > 0 && (
                  <button type="button" className="tr-btn tr-btn-ghost tr-pequeno" onClick={() => mudarItem(i, { series: it.series.slice(0, -1) })}>
                    − Série
                  </button>
                )}
                <span className="tr-ajuda">Descanso {it.descanso}s</span>
              </div>
            </section>
          )
        })}

        <button type="button" className="tr-btn tr-btn-ghost tr-largo" onClick={() => setAdicionar(true)}>
          + Adicionar exercício
        </button>
        <label className="tr-campo">
          <span>Como foi o treino?</span>
          <textarea className="tr-input" rows={2} value={s.nota || ''} onChange={(e) => setS({ ...s, nota: e.target.value })} placeholder="Sono, energia, dores…" />
        </label>
        <div className="tr-grade-2">
          <label className="tr-campo">
            <span>Peso corporal hoje (kg)</span>
            <input className="tr-input" type="number" inputMode="decimal" step="0.1" value={s.pesoCorporal || ''} onChange={(e) => setS({ ...s, pesoCorporal: Number(e.target.value) })} />
          </label>
          {!edicao && (
            <div className="tr-campo">
              <span>&nbsp;</span>
              <button type="button" className="tr-btn tr-btn-perigo" onClick={descartar}>
                Descartar treino
              </button>
            </div>
          )}
        </div>
      </div>

      {descanso && restante > -30 && (
        <div className={`tr-descanso ${restante <= 0 ? 'acabou' : ''}`} role="timer" aria-live="off">
          <div className="tr-descanso-barra" style={{ width: `${Math.max(0, Math.min(100, (restante / descanso.total) * 100))}%` }} />
          <span className="tr-descanso-rotulo">{restante > 0 ? 'Descanso' : 'Bora!'}</span>
          <strong>{restante > 0 ? fmtDuracao(restante) : `+${fmtDuracao(-restante)}`}</strong>
          <button type="button" className="tr-btn tr-btn-ghost tr-pequeno" onClick={() => setDescanso((d) => ({ ...d, fim: d.fim - 15000 }))}>
            −15
          </button>
          <button type="button" className="tr-btn tr-btn-ghost tr-pequeno" onClick={() => setDescanso((d) => ({ ...d, fim: d.fim + 15000, total: d.total + 15, avisado: false }))}>
            +15
          </button>
          <button type="button" className="tr-btn tr-btn-ghost tr-pequeno" onClick={() => setDescanso(null)}>
            Pular
          </button>
        </div>
      )}

      {anilhasDe && <CalculadoraAnilhas inicial={anilhasDe.carga} cfg={cfg} onFechar={() => setAnilhasDe(null)} />}
      {detalhe && <DetalheExercicio ex={detalhe} onFechar={() => setDetalhe(null)} />}
      {(adicionar || trocar !== null) && (
        <Modal titulo={trocar !== null ? 'Trocar por' : 'Adicionar exercício'} onFechar={() => (setAdicionar(false), setTrocar(null))} largo>
          <Biblioteca
            onEscolher={([ex]) => {
              if (trocar !== null) {
                const novo = novoItem(ex, s.itens[trocar].descanso)
                mudarItem(trocar, { ex: ex.id, tipo: novo.tipo, motivo: 'Exercício trocado neste treino.', series: s.itens[trocar].series.map((x) => ({ ...x, feita: false })) })
              } else setS((x) => ({ ...x, itens: [...x.itens, novoItem(ex, cfg.descansoPadrao)] }))
              setAdicionar(false)
              setTrocar(null)
            }}
          />
        </Modal>
      )}
      {resumo && <Resumo {...resumo} onFechar={onFechar} />}
    </div>
  )
}

function Resumo({ sessao, prs, onFechar }) {
  const bib = useBib()
  const dur = (new Date(sessao.fim) - new Date(sessao.inicio)) / 1000
  const series = sessao.itens.reduce((t, it) => t + seriesFeitas(it).length, 0)
  const volume = sessao.itens.reduce((t, it) => t + seriesFeitas(it).reduce((v, se) => v + ((it.corporal ? Number(sessao.pesoCorporal) || 0 : 0) + (Number(se.carga) || 0)) * repsDaSerie(se), 0), 0)
  return (
    <Modal titulo="Treino concluído 💪" onFechar={onFechar}>
      <div className="tr-kpis">
        <div className="tr-kpi">
          <span>Duração</span>
          <strong>{fmtDuracao(dur)}</strong>
        </div>
        <div className="tr-kpi">
          <span>Séries</span>
          <strong>{series}</strong>
        </div>
        <div className="tr-kpi">
          <span>Volume</span>
          <strong>{fmtKg(round(volume, 0))}</strong>
        </div>
      </div>
      {prs.length > 0 ? (
        <div className="tr-cartao tr-recordes">
          <strong>🏆 Novos recordes</strong>
          <ul>
            {prs.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="tr-ajuda">Sem recorde hoje, mas cada treino conta.</p>
      )}
      <ul className="tr-resumo-lista">
        {sessao.itens.map((it) => (
          <li key={it.id}>
            <span>{nomeEx(bib?.de(it.ex))}</span>
            <span className="tr-ajuda">{seriesFeitas(it).length} séries</span>
          </li>
        ))}
      </ul>
      <button type="button" className="tr-btn tr-btn-primario tr-largo" onClick={onFechar}>
        Fechar
      </button>
    </Modal>
  )
}

/* ---------- Calculadora de anilhas ---------- */

const COR_ANILHA = { 25: '#ef4444', 20: '#3b82f6', 15: '#eab308', 10: '#22c55e', 5: '#e5e7eb', 2.5: '#a855f7', 2: '#64748b', 1.25: '#94a3b8', 1: '#cbd5e1', 0.5: '#f1f5f9' }

export function CalculadoraAnilhas({ inicial = 60, cfg, onFechar }) {
  const [carga, setCarga] = useState(inicial || 60)
  const [barra, setBarra] = useState(cfg.barra || 20)
  const r = anilhas(carga, barra, cfg.anilhas)
  return (
    <Modal titulo="Calculadora de anilhas" onFechar={onFechar}>
      <div className="tr-grade-2">
        <label className="tr-campo">
          <span>Carga total (kg)</span>
          <input className="tr-input" type="number" inputMode="decimal" step="0.5" value={carga} onChange={(e) => setCarga(Number(e.target.value))} autoFocus />
        </label>
        <label className="tr-campo">
          <span>Barra</span>
          <select className="tr-select" value={barra} onChange={(e) => setBarra(Number(e.target.value))}>
            {BARRAS.map(([id, nome, peso]) => (
              <option key={id} value={peso}>
                {nome} ({peso} kg)
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="tr-barra-desenho" aria-hidden="true">
        <span className="tr-barra-eixo" />
        {r.lado.map((a, i) => (
          <span key={i} className="tr-anilha" style={{ background: COR_ANILHA[a] || '#94a3b8', height: `${30 + Math.min(a, 25) * 3.2}px` }}>
            {a}
          </span>
        ))}
      </div>
      <p>
        <strong>Em cada lado:</strong> {r.lado.length ? r.lado.map((a) => `${a.toLocaleString('pt-BR')} kg`).join(' + ') : 'nada, só a barra'}
      </p>
      <p className="tr-ajuda">
        Total montado: {fmtKg(r.total)}
        {r.falta > 0 && ` · faltam ${fmtKg(r.falta)} (anilhas disponíveis não fecham a conta)`}
      </p>
      {!cfg.anilhas && <p className="tr-ajuda">Considera anilhas de 25 a 0,5 kg à vontade. Informe as que sua academia tem em Ajustes.</p>}
    </Modal>
  )
}
