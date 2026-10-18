'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { excluir, salvar, useColecao } from '@/lib/treino/banco'
import { MUSCULOS, addDias, curva1rm, equilibrio, estadoMusculos, hoje, recordes, repsDaSerie, round, seriesFeitas, uid } from '@/lib/treino/logica'
import Corpo from './Corpo'
import { Deslizavel, GraficoLinha, Modal, fmtData, fmtKg, fmtNum, nomeEx, useAviso, useBib } from './comum'

export default function Progresso({ cfg, mudarCfg }) {
  const sessoes = useColecao('sessoes')
  const bib = useBib()
  const [aba, setAba] = useState('geral')
  if (!sessoes || !bib) return <p className="tr-vazio">Carregando…</p>
  const concluidas = sessoes.filter((s) => s.status === 'concluida')
  return (
    <div className="tr-pagina">
      <div className="tr-abas" role="tablist">
        {[
          ['geral', 'Geral'],
          ['musculos', 'Músculos'],
          ['forca', 'Força'],
          ['corpo', 'Corpo'],
        ].map(([v, t]) => (
          <button key={v} type="button" role="tab" aria-selected={aba === v} className={aba === v ? 'ativo' : ''} onClick={() => setAba(v)}>
            {t}
          </button>
        ))}
      </div>
      {aba === 'geral' && <Geral concluidas={concluidas} />}
      {aba === 'musculos' && <Musculos sessoes={sessoes} bib={bib} />}
      {aba === 'forca' && <Forca sessoes={sessoes} bib={bib} />}
      {aba === 'corpo' && <CorpoPeso cfg={cfg} mudarCfg={mudarCfg} />}
    </div>
  )
}

/* ---------- Geral: mapa de calor e semanas ---------- */

function Geral({ concluidas }) {
  const [ano, setAno] = useState(Number(hoje().slice(0, 4)))
  const rolagem = useRef(null)
  useEffect(() => {
    if (rolagem.current) rolagem.current.scrollLeft = rolagem.current.scrollWidth
  }, [ano])
  const porDia = useMemo(() => {
    const m = new Map()
    for (const s of concluidas) m.set(s.data, (m.get(s.data) || 0) + s.itens.reduce((t, it) => t + seriesFeitas(it).length, 0))
    return m
  }, [concluidas])
  const anos = [...new Set(concluidas.map((s) => Number(s.data.slice(0, 4))))]
  if (!anos.includes(ano)) anos.push(ano)
  const doAno = concluidas.filter((s) => s.data.startsWith(String(ano)))
  const maxSeries = Math.max(1, ...porDia.values())

  // grade: colunas = semanas, linhas = dias (dom..sáb)
  const inicio = `${ano}-01-01`
  const desloc = new Date(`${inicio}T12:00`).getDay()
  const total = new Date(ano, 1, 29).getMonth() === 1 ? 366 : 365
  const celulas = Array.from({ length: total }, (_, i) => addDias(inicio, i))
  const semanas = Math.ceil((total + desloc) / 7)

  const semanasRecentes = Array.from({ length: 8 }, (_, i) => {
    const fim = addDias(hoje(), -7 * i)
    const ini = addDias(fim, -6)
    const ss = concluidas.filter((s) => s.data >= ini && s.data <= fim)
    const vol = ss.reduce((t, s) => t + s.itens.reduce((a, it) => a + seriesFeitas(it).reduce((v, se) => v + ((it.corporal ? Number(s.pesoCorporal) || 0 : 0) + (Number(se.carga) || 0)) * repsDaSerie(se), 0), 0), 0)
    return { ini, treinos: ss.length, vol }
  }).reverse()
  const maxVol = Math.max(1, ...semanasRecentes.map((s) => s.vol))

  let sequencia = 0
  for (let i = 0; ; i++) {
    const fim = addDias(hoje(), -7 * i)
    if (concluidas.some((s) => s.data > addDias(fim, -7) && s.data <= fim)) sequencia++
    else if (i > 0) break
    else continue
  }

  return (
    <>
      <div className="tr-kpis">
        <div className="tr-kpi">
          <span>Treinos em {ano}</span>
          <strong>{doAno.length}</strong>
        </div>
        <div className="tr-kpi">
          <span>Séries em {ano}</span>
          <strong>{doAno.reduce((t, s) => t + s.itens.reduce((a, it) => a + seriesFeitas(it).length, 0), 0)}</strong>
        </div>
        <div className="tr-kpi">
          <span>Semanas seguidas</span>
          <strong>{sequencia}</strong>
        </div>
      </div>
      <section className="tr-cartao">
        <div className="tr-titulo-linha">
          <h2>Ano de treino</h2>
          <select className="tr-select" value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano">
            {anos.sort().map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="tr-calor-rolagem" ref={rolagem}>
          <svg className="tr-calor" viewBox={`0 0 ${semanas * 13 + 4} ${7 * 13 + 18}`} role="img" aria-label={`${doAno.length} treinos em ${ano}`}>
            {['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((m, i) => {
              const dia = Math.floor((new Date(ano, i, 1) - new Date(ano, 0, 1)) / 86400000)
              return (
                <text key={m} x={Math.floor((dia + desloc) / 7) * 13 + 2} y="9" className="tr-eixo">
                  {m}
                </text>
              )
            })}
            {celulas.map((d, i) => {
              const n = porDia.get(d) || 0
              const col = Math.floor((i + desloc) / 7)
              const lin = (i + desloc) % 7
              return (
                <rect key={d} x={col * 13 + 2} y={lin * 13 + 14} width="11" height="11" rx="2" className="tr-calor-dia" style={n ? { fill: `color-mix(in srgb, var(--cyan) ${Math.round(30 + (n / maxSeries) * 70)}%, var(--panel-2))` } : undefined}>
                  <title>{`${fmtData(d)}: ${n ? `${n} séries` : 'sem treino'}`}</title>
                </rect>
              )
            })}
          </svg>
        </div>
      </section>
      <section className="tr-cartao">
        <h2>Volume por semana</h2>
        <div className="tr-barras" role="img" aria-label="Volume nas últimas 8 semanas">
          {semanasRecentes.map((s) => (
            <div key={s.ini} className="tr-barra-col" title={`Semana de ${fmtData(s.ini, { day: '2-digit', month: 'short' })}: ${s.treinos} treinos, ${fmtKg(round(s.vol, 0))}`}>
              <span className="tr-barra-valor">{s.vol ? `${fmtNum(s.vol / 1000)}t` : ''}</span>
              <span className="tr-barra" style={{ height: `${(s.vol / maxVol) * 100}%` }} />
              <span className="tr-eixo-html">{fmtData(s.ini, { day: '2-digit', month: '2-digit' })}</span>
            </div>
          ))}
        </div>
        <p className="tr-ajuda">Volume = carga × repetições das séries feitas (sem aquecimento). t = toneladas.</p>
      </section>
    </>
  )
}

/* ---------- Músculos ---------- */

function Musculos({ sessoes, bib }) {
  const [modo, setModo] = useState('volume')
  const [dias, setDias] = useState(7)
  const est = useMemo(() => estadoMusculos(sessoes, bib.de, { dias }), [sessoes, bib, dias])
  const max = Math.max(1, ...Object.values(est).map((x) => x.series))
  const valores = {}
  const dicas = {}
  const destaque = []
  for (const [m, x] of Object.entries(est)) {
    if (modo === 'volume') {
      valores[m] = x.series / max
      dicas[m] = `${fmtNum(x.series)} séries em ${dias} dias`
    } else if (modo === 'recuperacao') {
      valores[m] = x.ultimo ? 1 - x.recuperacao : 0
      dicas[m] = x.ultimo ? (x.recuperacao >= 1 ? 'recuperado' : `${Math.round(x.recuperacao * 100)}% recuperado`) : 'sem registro'
    } else {
      const esquecido = x.diasSem === null || x.diasSem >= 8
      valores[m] = esquecido ? 1 : 0
      if (esquecido) destaque.push(m)
      dicas[m] = x.diasSem === null ? 'nunca treinado' : `há ${x.diasSem} dias`
    }
  }
  const cor = modo === 'volume' ? 'var(--cyan)' : modo === 'recuperacao' ? '#fb923c' : '#fbbf24'
  const lista = Object.entries(est).sort((a, b) => b[1].series - a[1].series)
  return (
    <>
      <div className="tr-segmentos tr-segmentos-curtos" role="radiogroup" aria-label="O que mostrar">
        {[
          ['volume', 'Volume'],
          ['recuperacao', 'Recuperação'],
          ['esquecidos', 'Esquecidos'],
        ].map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={modo === v} className={modo === v ? 'ativo' : ''} onClick={() => setModo(v)}>
            <strong>{t}</strong>
          </button>
        ))}
      </div>
      {modo === 'volume' && (
        <label className="tr-campo tr-campo-linha">
          <span>Período</span>
          <select className="tr-select" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </label>
      )}
      <section className="tr-cartao">
        <Corpo valores={valores} dicas={dicas} destaque={destaque} cor={cor} />
        <p className="tr-ajuda">
          {modo === 'volume' && 'Mais escuro = mais séries. Série do músculo principal conta 1; do auxiliar, meia.'}
          {modo === 'recuperacao' && 'Laranja = ainda se recuperando (músculos grandes levam ~72 h, pequenos ~36 h). Sem cor = pronto para treinar.'}
          {modo === 'esquecidos' && 'Em amarelo: músculos sem treino há 8 dias ou mais.'}
        </p>
      </section>
      <section className="tr-cartao">
        <table className="tr-tabela">
          <thead>
            <tr>
              <th>Músculo</th>
              <th>Séries ({dias}d)</th>
              <th>Último treino</th>
              <th>Recuperação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(([m, x]) => (
              <tr key={m}>
                <td>{MUSCULOS[m]}</td>
                <td>{fmtNum(x.series)}</td>
                <td>{x.diasSem === null ? '-' : x.diasSem === 0 ? 'hoje' : `há ${x.diasSem} d`}</td>
                <td>{x.ultimo ? `${Math.round(x.recuperacao * 100)}%` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

/* ---------- Força ---------- */

function Forca({ sessoes, bib }) {
  const exercicios = useMemo(() => {
    const ids = new Set(sessoes.filter((s) => s.status === 'concluida').flatMap((s) => s.itens.map((i) => i.ex)))
    return [...ids]
      .map((id) => ({ id, ex: bib.de(id), r: recordes(sessoes, id) }))
      .filter((x) => x.r.e1rm || x.r.reps || x.r.tempo)
      .sort((a, b) => b.r.e1rm - a.r.e1rm || b.r.reps - a.r.reps)
  }, [sessoes, bib])
  const [sel, setSel] = useState(exercicios[0]?.id || '')
  const curva = sel ? curva1rm(sessoes, sel) : []
  const eq = equilibrio(sessoes)
  return (
    <>
      <section className="tr-cartao">
        <h2>Curva de 1RM estimado</h2>
        {exercicios.length ? (
          <>
            <select className="tr-select tr-largo" value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Exercício">
              {exercicios.map((x) => (
                <option key={x.id} value={x.id}>
                  {nomeEx(x.ex)}
                </option>
              ))}
            </select>
            <GraficoLinha pontos={curva} unidade=" kg" rotulo={`1RM estimado de ${nomeEx(bib.de(sel))}`} />
            <p className="tr-ajuda">1RM estimado pela fórmula de Epley (carga × (1 + repetições ÷ 30)) da melhor série de cada dia.</p>
          </>
        ) : (
          <p className="tr-vazio">Registre treinos com carga para ver a curva.</p>
        )}
      </section>
      <section className="tr-cartao">
        <h2>Equilíbrio de força</h2>
        <p className="tr-ajuda">Compara o 1RM dos grandes levantamentos. Fora da faixa indica um lado mais fraco que vale treinar mais.</p>
        <table className="tr-tabela">
          <thead>
            <tr>
              <th>Proporção</th>
              <th>Sua</th>
              <th>Referência</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {eq.map((p) => (
              <tr key={p.nome}>
                <td>{p.nome}</td>
                <td>{p.valor ?? '-'}</td>
                <td>
                  {p.faixa[0]} a {p.faixa[1]}
                </td>
                <td>{p.valor === null ? <span className="tr-ajuda">faltam dados</span> : p.situacao === 'ok' ? '✅ ok' : p.situacao === 'baixo' ? '⬇ abaixo' : '⬆ acima'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="tr-cartao">
        <h2>Recordes</h2>
        <table className="tr-tabela">
          <thead>
            <tr>
              <th>Exercício</th>
              <th>Carga</th>
              <th>1RM est.</th>
              <th>Reps</th>
            </tr>
          </thead>
          <tbody>
            {exercicios.map((x) => (
              <tr key={x.id}>
                <td>{nomeEx(x.ex)}</td>
                <td>{x.r.carga ? fmtKg(x.r.carga) : '-'}</td>
                <td>{x.r.e1rm ? fmtKg(x.r.e1rm) : '-'}</td>
                <td>{x.r.reps || (x.r.tempo ? `${x.r.tempo}s` : '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

/* ---------- Corpo: peso e fotos ---------- */

function CorpoPeso({ cfg, mudarCfg }) {
  const pesos = useColecao('pesos')
  const fotos = useColecao('fotos')
  const aviso = useAviso()
  const [novo, setNovo] = useState({ data: hoje(), peso: '' })
  const [comparar, setComparar] = useState(null)
  const [escolhidas, setEscolhidas] = useState([])
  if (!pesos || !fotos) return null
  const ordenados = [...pesos].sort((a, b) => a.data.localeCompare(b.data))
  const ultimo = ordenados.at(-1)
  const fotosOrd = [...fotos].sort((a, b) => b.data.localeCompare(a.data))

  const addPeso = async () => {
    const p = Number(String(novo.peso).replace(',', '.'))
    if (!p) return
    await salvar('pesos', { id: novo.data, data: novo.data, peso: p })
    if (novo.data >= (ultimo?.data || '')) await mudarCfg({ pesoCorporal: p })
    setNovo({ data: hoje(), peso: '' })
  }

  const addFoto = async (arquivos) => {
    for (const arq of arquivos) {
      const blob = await reduzir(arq)
      await salvar('fotos', { id: uid(), data: hoje(), blob, nota: '' })
    }
  }

  return (
    <>
      <section className="tr-cartao">
        <h2>Peso corporal</h2>
        <div className="tr-kpis">
          <div className="tr-kpi">
            <span>Atual</span>
            <strong>{ultimo ? fmtKg(ultimo.peso) : '-'}</strong>
          </div>
          {ordenados.length > 1 && (
            <div className="tr-kpi">
              <span>Variação</span>
              <strong>
                {ultimo.peso - ordenados[0].peso > 0 ? '+' : ''}
                {fmtKg(round(ultimo.peso - ordenados[0].peso, 1))}
              </strong>
              <small>desde {fmtData(ordenados[0].data)}</small>
            </div>
          )}
          <label className="tr-kpi">
            <span>Meta (kg)</span>
            <input className="tr-input tr-mini" type="number" inputMode="decimal" step="0.1" value={cfg.metaPeso || ''} onChange={(e) => mudarCfg({ metaPeso: Number(e.target.value) })} />
            {cfg.metaPeso && ultimo ? <small>faltam {fmtKg(round(Math.abs(cfg.metaPeso - ultimo.peso), 1))}</small> : null}
          </label>
        </div>
        <GraficoLinha pontos={ordenados.map((p) => ({ data: p.data, valor: p.peso }))} unidade=" kg" meta={cfg.metaPeso || null} rotulo="Peso corporal" />
        <div className="tr-linha-form">
          <input className="tr-input" type="date" value={novo.data} max={hoje()} onChange={(e) => setNovo({ ...novo, data: e.target.value })} aria-label="Data" />
          <input className="tr-input" type="number" inputMode="decimal" step="0.1" placeholder="Peso (kg)" value={novo.peso} onChange={(e) => setNovo({ ...novo, peso: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addPeso()} aria-label="Peso em kg" />
          <button type="button" className="tr-btn tr-btn-primario" onClick={addPeso}>
            Anotar
          </button>
        </div>
        {ordenados.length > 0 && (
          <ul className="tr-historico tr-pesos">
            {[...ordenados]
              .reverse()
              .slice(0, 8)
              .map((p) => (
                <li key={p.id}>
                  <Deslizavel
                    onApagar={async () => {
                      await excluir('pesos', p.id)
                      aviso('Peso apagado.', () => salvar('pesos', p))
                    }}
                  >
                    <div className="tr-peso-linha">
                      <span>{fmtData(p.data)}</span>
                      <strong>{fmtKg(p.peso)}</strong>
                    </div>
                  </Deslizavel>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="tr-cartao">
        <div className="tr-titulo-linha">
          <h2>Fotos de progresso</h2>
          <label className="tr-btn tr-btn-ghost">
            + Foto
            <input type="file" accept="image/*" capture="user" multiple hidden onChange={(e) => addFoto([...(e.target.files || [])])} />
          </label>
        </div>
        <p className="tr-ajuda">Ficam só neste aparelho. Escolha duas para comparar antes e depois.</p>
        {fotosOrd.length ? (
          <ul className="tr-fotos">
            {fotosOrd.map((f) => (
              <li key={f.id}>
                <FotoBlob
                  foto={f}
                  marcada={escolhidas.includes(f.id)}
                  onClick={() => setEscolhidas((e) => (e.includes(f.id) ? e.filter((x) => x !== f.id) : [...e, f.id].slice(-2)))}
                />
                <span className="tr-ajuda">{fmtData(f.data, { day: '2-digit', month: 'short', year: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tr-vazio">Nenhuma foto ainda.</p>
        )}
        {escolhidas.length > 0 && (
          <div className="tr-acoes">
            {escolhidas.length === 2 && (
              <button type="button" className="tr-btn tr-btn-primario" onClick={() => setComparar(escolhidas.map((id) => fotos.find((f) => f.id === id)).sort((a, b) => a.data.localeCompare(b.data)))}>
                Comparar antes e depois
              </button>
            )}
            <button
              type="button"
              className="tr-btn tr-btn-perigo"
              onClick={async () => {
                const apagadas = fotos.filter((f) => escolhidas.includes(f.id))
                for (const f of apagadas) await excluir('fotos', f.id)
                setEscolhidas([])
                aviso(`${apagadas.length} foto(s) apagada(s).`, () => apagadas.forEach((f) => salvar('fotos', f)))
              }}
            >
              Apagar
            </button>
          </div>
        )}
      </section>
      {comparar && <AntesDepois fotos={comparar} onFechar={() => setComparar(null)} />}
    </>
  )
}

function useUrl(blob) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!(blob instanceof Blob)) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function FotoBlob({ foto, marcada, onClick }) {
  const url = useUrl(foto.blob)
  return (
    <button type="button" className={`tr-foto-progresso ${marcada ? 'marcado' : ''}`} onClick={onClick} aria-pressed={marcada} aria-label={`Foto de ${fmtData(foto.data)}`}>
      {url && <img src={url} alt="" />}
      {marcada && <span className="tr-check">✓</span>}
    </button>
  )
}

function AntesDepois({ fotos, onFechar }) {
  const a = useUrl(fotos[0].blob)
  const b = useUrl(fotos[1].blob)
  const [pos, setPos] = useState(50)
  const caixa = useRef(null)
  const arrastar = (e) => {
    const r = caixa.current.getBoundingClientRect()
    setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
  }
  return (
    <Modal titulo="Antes e depois" onFechar={onFechar} largo>
      <div
        className="tr-antes-depois"
        ref={caixa}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          arrastar(e)
        }}
        onPointerMove={(e) => e.buttons && arrastar(e)}
      >
        {b && <img src={b} alt={`Depois, ${fmtData(fotos[1].data)}`} />}
        {a && <img src={a} alt={`Antes, ${fmtData(fotos[0].data)}`} className="tr-antes" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
        <span className="tr-divisor" style={{ left: `${pos}%` }} aria-hidden="true" />
        <span className="tr-rotulo-foto tr-rotulo-esq">Antes · {fmtData(fotos[0].data, { day: '2-digit', month: 'short', year: '2-digit' })}</span>
        <span className="tr-rotulo-foto tr-rotulo-dir">Depois · {fmtData(fotos[1].data, { day: '2-digit', month: 'short', year: '2-digit' })}</span>
      </div>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} className="tr-largo" aria-label="Posição do divisor" />
    </Modal>
  )
}

/** Reduz a foto para no máximo 1280 px (economiza espaço no aparelho). */
async function reduzir(arq) {
  try {
    const img = await createImageBitmap(arq)
    const esc = Math.min(1, 1280 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * esc)
    c.height = Math.round(img.height * esc)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return await new Promise((ok) => c.toBlob((b) => ok(b || arq), 'image/jpeg', 0.85))
  } catch {
    return arq
  }
}
