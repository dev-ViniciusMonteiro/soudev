'use client'

import { useState } from 'react'
import { excluir, salvar, salvarVarios, useColecao } from '@/lib/treino/banco'
import { DIAS, DIAS_CURTOS, MUSCULOS, REGRAS, uid } from '@/lib/treino/logica'
import { PLANOS } from '@/lib/treino/planos'
import Biblioteca, { tipoPadrao } from './Biblioteca'
import { FotoExercicio, Modal, nomeEx, useAviso, useBib } from './comum'

export const TIPOS_SERIE = [
  ['normal', 'Normal'],
  ['aquecimento', 'Aquecimento'],
  ['drop', 'Drop set'],
  ['restpause', 'Rest-pause'],
  ['falha', 'Até a falha (AMRAP)'],
]
export const SIGLA_SERIE = { normal: '', aquecimento: 'A', drop: 'D', restpause: 'RP', falha: 'F' }

export const novoItem = (ex, descanso = 90) => {
  const tipo = tipoPadrao(ex)
  return {
    id: uid(),
    ex: ex.id,
    tipo,
    descanso,
    corporal: ex.e === 'body only',
    unilateral: false,
    series: Array.from({ length: 3 }, () => (tipo === 'reps' ? { tipo: 'normal', reps: 10, carga: 0 } : tipo === 'tempo' ? { tipo: 'normal', tempo: 30, reps: 0 } : { tipo: 'normal', tempo: 600, distancia: 0, reps: 0 })),
    progressao: { regra: tipo === 'tempo' ? 'tempo' : tipo === 'cardio' ? 'nenhuma' : 'dupla', min: 8, max: 12 },
  }
}

/* ---------- Compartilhar plano por link ---------- */

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const fluxo = async (bytes, transformacao) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(transformacao)).arrayBuffer())

/** Plano compactado no próprio link (deflate + base64url), sem servidor. */
export async function linkDoPlano(rotinas, modo) {
  const enxuto = { m: modo, r: rotinas.map((r) => ({ n: r.nome, d: r.dias, i: r.itens.map(({ id, motivo, ...resto }) => resto) })) }
  const json = new TextEncoder().encode(JSON.stringify(enxuto))
  const codigo = typeof CompressionStream !== 'undefined' ? `z${b64url(await fluxo(json, new CompressionStream('deflate-raw')))}` : `j${b64url(json)}`
  return `${location.origin}/apps/treino/app#plano=${codigo}`
}

export async function deBase64(codigo) {
  const bytes = deB64url(codigo.slice(1))
  const json = codigo[0] === 'z' ? await fluxo(bytes, new DecompressionStream('deflate-raw')) : bytes
  return JSON.parse(new TextDecoder().decode(json))
}

export function rotinasDoLink(dados) {
  return (dados.r || []).map((r, i) => ({ id: uid(), nome: r.n, dias: r.d || [], ordem: i + 1, itens: (r.i || []).map((x) => ({ ...x, id: uid() })) }))
}

export function imprimirPlano(rotinas, bib) {
  const linhas = rotinas
    .map(
      (r) => `<section><h2>${esc(r.nome)}</h2><p>${(r.dias || []).map((d) => DIAS[d]).join(', ') || 'Rotação'}</p><table><thead><tr><th>Exercício</th><th>Séries</th><th>Descanso</th><th>Progressão</th></tr></thead><tbody>${r.itens
        .map((it) => {
          const ex = bib.de(it.ex)
          const series = it.series.map((s) => `${SIGLA_SERIE[s.tipo] ? `${SIGLA_SERIE[s.tipo]} ` : ''}${s.tempo && !s.reps ? `${s.tempo}s` : `${s.reps}${s.carga ? `×${s.carga}kg` : ''}`}`).join(' · ')
          return `<tr><td>${esc(nomeEx(ex))}${it.grupo ? ' <em>(supersérie)</em>' : ''}</td><td>${esc(series)}</td><td>${it.descanso}s</td><td>${esc(REGRAS.find((x) => x[0] === it.progressao?.regra)?.[1] || '')}</td></tr>`
        })
        .join('')}</tbody></table></section>`,
    )
    .join('')
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Meu plano de treino</title><style>body{font:14px system-ui,sans-serif;margin:24px;color:#111}h1{font-size:22px}h2{font-size:17px;margin:20px 0 2px}p{margin:0 0 6px;color:#555}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #ddd;padding:6px 4px;vertical-align:top}th{font-size:12px;color:#555}section{break-inside:avoid}</style></head><body><h1>Meu plano de treino</h1>${linhas}<script>onload=()=>print()</script></body></html>`,
  )
  w.document.close()
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/* ---------- Tela de rotinas ---------- */

export default function Rotinas({ cfg, mudarCfg }) {
  const rotinas = useColecao('rotinas')
  const bib = useBib()
  const aviso = useAviso()
  const [editando, setEditando] = useState(null)
  const [planos, setPlanos] = useState(false)
  const [link, setLink] = useState('')
  if (!rotinas) return null
  const ordenadas = [...rotinas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  const mover = async (r, dir) => {
    const i = ordenadas.indexOf(r)
    const j = i + dir
    if (j < 0 || j >= ordenadas.length) return
    const nova = [...ordenadas]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    await salvarVarios('rotinas', nova.map((x, k) => ({ ...x, ordem: k + 1 })))
  }

  const usarPlano = async (p, substituir) => {
    if (substituir) for (const r of rotinas) await excluir('rotinas', r.id)
    const base = substituir ? 0 : ordenadas.length
    await salvarVarios(
      'rotinas',
      p.rotinas.map((r, i) => ({ id: uid(), nome: r.nome, dias: r.dias, ordem: base + i + 1, itens: r.itens(), nota: '' })),
    )
    if (p.modo !== cfg.modo) await mudarCfg({ modo: p.modo })
    setPlanos(false)
    aviso(`Plano "${p.nome}" adicionado. Ajuste as cargas no primeiro treino.`)
  }

  return (
    <div className="tr-pagina">
      <div className="tr-cartao">
        <h2>Como você treina</h2>
        <div className="tr-segmentos" role="radiogroup" aria-label="Agenda">
          {[
            ['semana', 'Dias da semana', 'Cada rotina tem dias fixos (seg, qua, sex…).'],
            ['rotacao', 'Rotação', 'Segue a ordem A, B, C… sem dia fixo. Faltou? Continua de onde parou.'],
          ].map(([v, t, d]) => (
            <button key={v} type="button" role="radio" aria-checked={cfg.modo === v} className={cfg.modo === v ? 'ativo' : ''} onClick={() => mudarCfg({ modo: v })}>
              <strong>{t}</strong>
              <span>{d}</span>
            </button>
          ))}
        </div>
        {cfg.modo === 'semana' && (
          <label className="tr-campo tr-campo-linha">
            <span>A semana começa no</span>
            <select className="tr-select" value={cfg.inicioSemana} onChange={(e) => mudarCfg({ inicioSemana: Number(e.target.value) })}>
              <option value={1}>Segunda</option>
              <option value={0}>Domingo</option>
            </select>
          </label>
        )}
      </div>

      <div className="tr-titulo-linha">
        <h2>Rotinas</h2>
        <div className="tr-acoes">
          <button type="button" className="tr-btn tr-btn-ghost" onClick={() => setPlanos(true)}>
            Planos prontos
          </button>
          <button type="button" className="tr-btn tr-btn-primario" onClick={() => setEditando({ id: uid(), nome: '', dias: [], ordem: ordenadas.length + 1, itens: [], nota: '' })}>
            + Nova rotina
          </button>
        </div>
      </div>

      {!ordenadas.length ? (
        <div className="tr-cartao tr-centro">
          <p>Você ainda não tem rotinas. Comece por um plano pronto ou monte a sua.</p>
          <button type="button" className="tr-btn tr-btn-primario" onClick={() => setPlanos(true)}>
            Ver planos prontos
          </button>
        </div>
      ) : (
        <ul className="tr-rotinas">
          {ordenadas.map((r, i) => (
            <li key={r.id} className="tr-cartao">
              <div className="tr-rotina-topo">
                <div>
                  <strong>
                    {cfg.modo === 'rotacao' ? `${i + 1}. ` : ''}
                    {r.nome || 'Sem nome'}
                  </strong>
                  <span className="tr-ajuda">
                    {cfg.modo === 'semana' ? (r.dias?.length ? r.dias.map((d) => DIAS_CURTOS[d]).join(' · ') : 'Sem dia definido') : `${r.itens.length} exercícios`}
                  </span>
                </div>
                <div className="tr-acoes">
                  <button type="button" className="tr-icone" onClick={() => mover(r, -1)} disabled={!i} aria-label="Subir">
                    ↑
                  </button>
                  <button type="button" className="tr-icone" onClick={() => mover(r, 1)} disabled={i === ordenadas.length - 1} aria-label="Descer">
                    ↓
                  </button>
                  <button type="button" className="tr-btn tr-btn-ghost" onClick={() => setEditando(structuredClone(r))}>
                    Editar
                  </button>
                </div>
              </div>
              <p className="tr-ajuda">{r.itens.map((it) => nomeEx(bib?.de(it.ex))).join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}

      {ordenadas.length > 0 && bib && (
        <div className="tr-acoes">
          <button
            type="button"
            className="tr-btn tr-btn-ghost"
            onClick={async () => {
              const l = await linkDoPlano(ordenadas, cfg.modo)
              setLink(l)
              try {
                if (navigator.share) await navigator.share({ title: 'Meu plano de treino', url: l })
                else await navigator.clipboard.writeText(l)
              } catch {}
            }}
          >
            Compartilhar plano
          </button>
          <button type="button" className="tr-btn tr-btn-ghost" onClick={() => imprimirPlano(ordenadas, bib)}>
            Imprimir / PDF
          </button>
        </div>
      )}
      {link && (
        <div className="tr-cartao">
          <p className="tr-ajuda">Quem abrir este link pode importar suas rotinas (só as rotinas, sem seu histórico):</p>
          <input className="tr-input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link do plano" />
        </div>
      )}

      {planos && (
        <Modal titulo="Planos prontos" onFechar={() => setPlanos(false)} largo>
          <div className="tr-planos">
            {PLANOS.map((p) => (
              <div key={p.id} className="tr-cartao">
                <strong>{p.nome}</strong>
                <p className="tr-ajuda">{p.descricao}</p>
                <ul className="tr-plano-rotinas">
                  {p.rotinas.map((r) => (
                    <li key={r.nome}>
                      <b>{r.nome}</b>
                      {r.dias.length ? ` (${r.dias.map((d) => DIAS_CURTOS[d]).join(', ')})` : ''}: {r.itens().map((it) => nomeEx(bib?.de(it.ex))).join(', ')}
                    </li>
                  ))}
                </ul>
                <div className="tr-acoes">
                  <button type="button" className="tr-btn tr-btn-primario" onClick={() => usarPlano(p, true)}>
                    Usar este plano
                  </button>
                  {ordenadas.length > 0 && (
                    <button type="button" className="tr-btn tr-btn-ghost" onClick={() => usarPlano(p, false)}>
                      Somar às minhas
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {editando && <EditarRotina rotina={editando} modo={cfg.modo} descansoPadrao={cfg.descansoPadrao} onFechar={() => setEditando(null)} />}
    </div>
  )
}

/* ---------- Editor de rotina ---------- */

export function EditarRotina({ rotina, modo, descansoPadrao = 90, onFechar }) {
  const bib = useBib()
  const aviso = useAviso()
  const [r, setR] = useState(rotina)
  const [escolher, setEscolher] = useState(false)
  const [erro, setErro] = useState('')
  const mudarItem = (id, patch) => setR((x) => ({ ...x, itens: x.itens.map((it) => (it.id === id ? { ...it, ...patch } : it)) }))
  const moverItem = (i, dir) =>
    setR((x) => {
      const itens = [...x.itens]
      const j = i + dir
      if (j < 0 || j >= itens.length) return x
      ;[itens[i], itens[j]] = [itens[j], itens[i]]
      return { ...x, itens }
    })
  const ligarSuperserie = (i) =>
    setR((x) => {
      const itens = [...x.itens]
      const a = itens[i]
      const b = itens[i + 1]
      if (!b) return x
      if (a.grupo && a.grupo === b.grupo) {
        itens[i + 1] = { ...b, grupo: undefined }
        if (!itens.some((it, k) => k !== i && it.grupo === a.grupo)) itens[i] = { ...a, grupo: undefined }
      } else {
        const g = a.grupo || b.grupo || uid()
        itens[i] = { ...a, grupo: g }
        itens[i + 1] = { ...b, grupo: g }
      }
      return { ...x, itens }
    })

  const gravar = async () => {
    if (!r.nome.trim()) return setErro('Dê um nome à rotina, como "Peito e tríceps" ou "Treino A".')
    await salvar('rotinas', { ...r, nome: r.nome.trim() })
    onFechar()
  }

  return (
    <Modal
      titulo={rotina.nome ? 'Editar rotina' : 'Nova rotina'}
      onFechar={onFechar}
      largo
      rodape={
        <>
          {rotina.nome && (
            <button
              type="button"
              className="tr-btn tr-btn-perigo"
              onClick={async () => {
                await excluir('rotinas', rotina.id)
                aviso('Rotina apagada.', () => salvar('rotinas', rotina))
                onFechar()
              }}
            >
              Apagar
            </button>
          )}
          <span className="tr-espaco" />
          <button type="button" className="tr-btn tr-btn-ghost" onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className="tr-btn tr-btn-primario" onClick={gravar}>
            Salvar rotina
          </button>
        </>
      }
    >
      <label className="tr-campo">
        <span>Nome</span>
        <input className="tr-input" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} placeholder="Ex.: Treino A, Peito e tríceps" />
      </label>
      {modo === 'semana' && (
        <fieldset className="tr-campo">
          <legend>Dias da semana</legend>
          <div className="tr-chips">
            {DIAS_CURTOS.map((d, i) => (
              <button key={d} type="button" className={`tr-chip ${r.dias?.includes(i) ? 'ativo' : ''}`} aria-pressed={r.dias?.includes(i)} onClick={() => setR({ ...r, dias: r.dias?.includes(i) ? r.dias.filter((x) => x !== i) : [...(r.dias || []), i].sort() })}>
                {d}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <h3>Exercícios</h3>
      {!r.itens.length && <p className="tr-vazio">Adicione exercícios da biblioteca.</p>}
      <ol className="tr-itens">
        {r.itens.map((it, i) => (
          <li key={it.id} className={`tr-item ${it.grupo ? 'tr-item-super' : ''}`}>
            <EditarItem item={it} ex={bib?.de(it.ex)} onMudar={(p) => mudarItem(it.id, p)} onRemover={() => setR({ ...r, itens: r.itens.filter((x) => x.id !== it.id) })} onMover={(d) => moverItem(i, d)} primeiro={!i} ultimo={i === r.itens.length - 1} />
            {i < r.itens.length - 1 && (
              <button type="button" className={`tr-super-link ${it.grupo && it.grupo === r.itens[i + 1].grupo ? 'ativo' : ''}`} onClick={() => ligarSuperserie(i)}>
                {it.grupo && it.grupo === r.itens[i + 1].grupo ? '⛓ Supersérie com o próximo (desligar)' : '⛓ Fazer supersérie com o próximo'}
              </button>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="tr-btn tr-btn-ghost tr-largo" onClick={() => setEscolher(true)}>
        + Adicionar exercícios
      </button>
      <label className="tr-campo">
        <span>Observação da rotina</span>
        <input className="tr-input" value={r.nota || ''} onChange={(e) => setR({ ...r, nota: e.target.value })} placeholder="Ex.: aquecer 5 min na bike antes" />
      </label>
      {erro && (
        <p className="tr-erro" role="alert">
          {erro}
        </p>
      )}
      {escolher && (
        <Modal titulo="Escolher exercícios" onFechar={() => setEscolher(false)} largo>
          <Biblioteca
            multiplo
            onEscolher={(lista) => {
              setR((x) => ({ ...x, itens: [...x.itens, ...lista.map((ex) => novoItem(ex, descansoPadrao))] }))
              setEscolher(false)
            }}
          />
        </Modal>
      )}
    </Modal>
  )
}

function EditarItem({ item, ex, onMudar, onRemover, onMover, primeiro, ultimo }) {
  const [aberto, setAberto] = useState(false)
  const regra = REGRAS.find((x) => x[0] === (item.progressao?.regra || 'nenhuma'))
  const mudarSerie = (k, patch) => onMudar({ series: item.series.map((s, j) => (j === k ? { ...s, ...patch } : s)) })
  const ultimaTrabalho = [...item.series].reverse().find((s) => s.tipo !== 'aquecimento') || item.series[item.series.length - 1] || { tipo: 'normal', reps: 10, carga: 0 }
  const piramide = () => {
    const base = Number(ultimaTrabalho.carga) || 20
    onMudar({
      series: [
        { tipo: 'normal', reps: 12, carga: base },
        { tipo: 'normal', reps: 10, carga: Math.round(base * 1.1 * 2) / 2 },
        { tipo: 'normal', reps: 8, carga: Math.round(base * 1.2 * 2) / 2 },
        { tipo: 'normal', reps: 6, carga: Math.round(base * 1.3 * 2) / 2 },
      ],
      progressao: { regra: 'nenhuma' },
    })
  }
  return (
    <div className="tr-cartao tr-item-cartao">
      <div className="tr-item-topo">
        <FotoExercicio ex={ex} tamanho={44} />
        <button type="button" className="tr-item-nome" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
          <strong>{nomeEx(ex)}</strong>
          <span className="tr-ajuda">
            {item.series.filter((s) => s.tipo !== 'aquecimento').length} séries · {item.descanso}s descanso · {regra?.[1]}
            {(ex?.m || []).length ? ` · ${MUSCULOS[ex.m[0]]}` : ''}
          </span>
        </button>
        <div className="tr-acoes">
          <button type="button" className="tr-icone" onClick={() => onMover(-1)} disabled={primeiro} aria-label="Subir exercício">
            ↑
          </button>
          <button type="button" className="tr-icone" onClick={() => onMover(1)} disabled={ultimo} aria-label="Descer exercício">
            ↓
          </button>
          <button type="button" className="tr-icone" onClick={onRemover} aria-label="Remover exercício">
            ✕
          </button>
        </div>
      </div>
      {aberto && (
        <div className="tr-item-detalhe">
          <table className="tr-series-tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Tipo</th>
                {item.tipo !== 'reps' ? <th>Tempo (s)</th> : <th>Reps</th>}
                {item.tipo === 'cardio' ? <th>Dist. (km)</th> : <th>{item.corporal ? 'Carga extra' : 'Carga (kg)'}</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {item.series.map((s, k) => (
                <tr key={k}>
                  <td>{k + 1}</td>
                  <td>
                    <select className="tr-select tr-mini" value={s.tipo} onChange={(e) => mudarSerie(k, { tipo: e.target.value })} aria-label="Tipo de série">
                      {TIPOS_SERIE.map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {item.tipo !== 'reps' ? (
                      <input className="tr-input tr-mini" type="number" inputMode="numeric" value={s.tempo ?? ''} onChange={(e) => mudarSerie(k, { tempo: Number(e.target.value) })} aria-label="Tempo em segundos" />
                    ) : (
                      <input className="tr-input tr-mini" type="number" inputMode="numeric" value={s.reps ?? ''} onChange={(e) => mudarSerie(k, { reps: Number(e.target.value) })} aria-label="Repetições" />
                    )}
                  </td>
                  <td>
                    {item.tipo === 'cardio' ? (
                      <input className="tr-input tr-mini" type="number" inputMode="decimal" step="0.1" value={s.distancia ?? ''} onChange={(e) => mudarSerie(k, { distancia: Number(e.target.value) })} aria-label="Distância" />
                    ) : (
                      <input className="tr-input tr-mini" type="number" inputMode="decimal" step="0.5" value={s.carga ?? ''} onChange={(e) => mudarSerie(k, { carga: Number(e.target.value) })} aria-label="Carga" />
                    )}
                  </td>
                  <td>
                    <button type="button" className="tr-icone" onClick={() => onMudar({ series: item.series.filter((_, j) => j !== k) })} aria-label="Remover série">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tr-acoes">
            <button type="button" className="tr-btn tr-btn-ghost" onClick={() => onMudar({ series: [...item.series, { ...ultimaTrabalho }] })}>
              + Série
            </button>
            <button type="button" className="tr-btn tr-btn-ghost" onClick={() => onMudar({ series: [{ tipo: 'aquecimento', reps: 10, carga: Math.round((Number(ultimaTrabalho.carga) || 0) * 0.5 * 2) / 2 }, ...item.series] })}>
              + Aquecimento
            </button>
            {item.tipo === 'reps' && (
              <button type="button" className="tr-btn tr-btn-ghost" onClick={piramide}>
                Pirâmide
              </button>
            )}
          </div>
          <div className="tr-grade-3">
            <label className="tr-campo">
              <span>Descanso (s)</span>
              <input className="tr-input" type="number" inputMode="numeric" value={item.descanso} onChange={(e) => onMudar({ descanso: Number(e.target.value) })} />
            </label>
            <label className="tr-campo">
              <span>Registrar como</span>
              <select className="tr-select" value={item.tipo} onChange={(e) => onMudar({ tipo: e.target.value })}>
                <option value="reps">Carga e repetições</option>
                <option value="tempo">Tempo</option>
                <option value="cardio">Cardio (tempo e distância)</option>
              </select>
            </label>
            <label className="tr-campo">
              <span>Progressão</span>
              <select className="tr-select" value={item.progressao?.regra || 'nenhuma'} onChange={(e) => onMudar({ progressao: { ...item.progressao, regra: e.target.value } })}>
                {REGRAS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="tr-ajuda">{regra?.[2]}</p>
          {['linear', 'greyskull', 'dupla', 'tripla'].includes(item.progressao?.regra) && (
            <div className="tr-grade-3">
              <label className="tr-campo">
                <span>Aumento (kg)</span>
                <input className="tr-input" type="number" inputMode="decimal" step="0.5" value={item.progressao.inc ?? 2.5} onChange={(e) => onMudar({ progressao: { ...item.progressao, inc: Number(e.target.value) } })} />
              </label>
              {['dupla', 'tripla'].includes(item.progressao.regra) && (
                <>
                  <label className="tr-campo">
                    <span>Reps mínimo</span>
                    <input className="tr-input" type="number" inputMode="numeric" value={item.progressao.min ?? 8} onChange={(e) => onMudar({ progressao: { ...item.progressao, min: Number(e.target.value) } })} />
                  </label>
                  <label className="tr-campo">
                    <span>Reps máximo</span>
                    <input className="tr-input" type="number" inputMode="numeric" value={item.progressao.max ?? 12} onChange={(e) => onMudar({ progressao: { ...item.progressao, max: Number(e.target.value) } })} />
                  </label>
                </>
              )}
              {item.progressao.regra === 'tripla' && (
                <label className="tr-campo">
                  <span>Máximo de séries</span>
                  <input className="tr-input" type="number" inputMode="numeric" value={item.progressao.maxSeries ?? 4} onChange={(e) => onMudar({ progressao: { ...item.progressao, maxSeries: Number(e.target.value) } })} />
                </label>
              )}
            </div>
          )}
          {item.progressao?.regra === 'tempo' && (
            <label className="tr-campo">
              <span>Somar a cada treino (s)</span>
              <input className="tr-input" type="number" inputMode="numeric" value={item.progressao.incTempo ?? 5} onChange={(e) => onMudar({ progressao: { ...item.progressao, incTempo: Number(e.target.value) } })} />
            </label>
          )}
          <div className="tr-chips">
            <label className="tr-check-linha">
              <input type="checkbox" checked={!!item.unilateral} onChange={(e) => onMudar({ unilateral: e.target.checked })} /> Cada lado separado (unilateral)
            </label>
            <label className="tr-check-linha">
              <input type="checkbox" checked={!!item.corporal} onChange={(e) => onMudar({ corporal: e.target.checked })} /> Peso do corpo (+ cinto/colete)
            </label>
          </div>
          <label className="tr-campo">
            <span>Observação</span>
            <input className="tr-input" value={item.nota || ''} onChange={(e) => onMudar({ nota: e.target.value })} placeholder="Ex.: banco no furo 3, pegada fechada" />
          </label>
        </div>
      )}
    </div>
  )
}
