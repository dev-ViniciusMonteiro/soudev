'use client'

import { useMemo, useState } from 'react'
import { excluir, salvar, useColecao } from '@/lib/treino/banco'
import { CATEGORIAS, EQUIPAMENTOS, MUSCULOS, NIVEIS, curva1rm, recordes, uid } from '@/lib/treino/logica'
import Corpo from './Corpo'
import { FotoExercicio, GraficoLinha, Modal, fmtData, fmtKg, nomeEx, useAviso, useBib } from './comum'

export const tipoPadrao = (ex) => ex?.tipo || (ex?.c === 'cardio' ? 'cardio' : ex?.c === 'stretching' ? 'tempo' : 'reps')

const semAcento = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Lista filtrável. Com onEscolher vira seletor (usado ao montar rotinas e durante o treino). */
export default function Biblioteca({ onEscolher = null, multiplo = false }) {
  const bib = useBib()
  const sessoes = useColecao('sessoes') || []
  const [busca, setBusca] = useState('')
  const [musculo, setMusculo] = useState(null)
  const [equip, setEquip] = useState('')
  const [cat, setCat] = useState('')
  const [nivel, setNivel] = useState('')
  const [soMeus, setSoMeus] = useState(false)
  const [mapa, setMapa] = useState(false)
  const [limite, setLimite] = useState(60)
  const [aberto, setAberto] = useState(null)
  const [novo, setNovo] = useState(false)
  const [marcados, setMarcados] = useState([])

  const usados = useMemo(() => {
    const n = new Map()
    for (const s of sessoes) for (const i of s.itens || []) n.set(i.ex, (n.get(i.ex) || 0) + 1)
    return n
  }, [sessoes])

  const lista = useMemo(() => {
    if (!bib) return []
    const termos = semAcento(busca).split(/\s+/).filter(Boolean)
    return bib.todos
      .filter((e) => {
        if (soMeus && !e.meu) return false
        if (musculo && !(e.m || []).includes(musculo) && !(e.s || []).includes(musculo)) return false
        if (equip && e.e !== equip) return false
        if (cat && e.c !== cat) return false
        if (nivel && e.l !== nivel) return false
        if (termos.length) {
          const alvo = semAcento(`${e.pt || ''} ${e.n} ${(e.m || []).map((m) => MUSCULOS[m]).join(' ')} ${EQUIPAMENTOS[e.e] || ''}`)
          return termos.every((t) => alvo.includes(t))
        }
        return true
      })
      .sort((a, b) => (usados.get(b.id) || 0) - (usados.get(a.id) || 0) || Number(!!b.meu) - Number(!!a.meu) || Number(!!b.pt) - Number(!!a.pt) || nomeEx(a).localeCompare(nomeEx(b)))
  }, [bib, busca, musculo, equip, cat, nivel, soMeus, usados])

  if (!bib) return <p className="tr-vazio">Carregando exercícios…</p>

  const clicar = (e) => {
    if (!onEscolher) return setAberto(e)
    if (!multiplo) return onEscolher([e])
    setMarcados((m) => (m.includes(e.id) ? m.filter((x) => x !== e.id) : [...m, e.id]))
  }

  return (
    <div className="tr-biblioteca">
      <div className="tr-filtros">
        <input type="search" className="tr-input" placeholder={`Buscar entre ${bib.todos.length} exercícios`} value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar exercício" />
        <div className="tr-filtros-linha">
          <button type="button" className={`tr-chip ${mapa || musculo ? 'ativo' : ''}`} onClick={() => setMapa((m) => !m)} aria-expanded={mapa}>
            {musculo ? MUSCULOS[musculo] : 'Músculo'} ▾
          </button>
          <select className="tr-select" value={equip} onChange={(e) => setEquip(e.target.value)} aria-label="Equipamento">
            <option value="">Equipamento</option>
            {Object.entries(EQUIPAMENTOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="tr-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
            <option value="">Categoria</option>
            {Object.entries(CATEGORIAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="tr-select" value={nivel} onChange={(e) => setNivel(e.target.value)} aria-label="Nível">
            <option value="">Nível</option>
            {Object.entries(NIVEIS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button type="button" className={`tr-chip ${soMeus ? 'ativo' : ''}`} onClick={() => setSoMeus((s) => !s)} aria-pressed={soMeus}>
            Meus
          </button>
          <button type="button" className="tr-chip" onClick={() => setNovo(true)}>
            + Criar exercício
          </button>
        </div>
        {mapa && (
          <div className="tr-mapa-filtro">
            <Corpo selecionado={musculo} onEscolher={setMusculo} valores={musculo ? { [musculo]: 1 } : {}} />
            <p className="tr-ajuda">Toque num músculo para filtrar. {musculo && <button type="button" className="tr-link" onClick={() => setMusculo(null)}>Limpar</button>}</p>
          </div>
        )}
      </div>

      <p className="tr-ajuda" aria-live="polite">
        {lista.length} exercício{lista.length === 1 ? '' : 's'}
      </p>
      <ul className="tr-lista-ex">
        {lista.slice(0, limite).map((e) => (
          <li key={e.id}>
            <button type="button" className={`tr-ex-linha ${marcados.includes(e.id) ? 'marcado' : ''}`} onClick={() => clicar(e)} aria-pressed={multiplo ? marcados.includes(e.id) : undefined}>
              <FotoExercicio ex={e} tamanho={52} />
              <span className="tr-ex-texto">
                <strong>{nomeEx(e)}</strong>
                <span>
                  {(e.m || []).map((m) => MUSCULOS[m]).join(', ')} · {EQUIPAMENTOS[e.e] || e.e}
                  {e.meu ? ' · seu' : ''}
                </span>
              </span>
              {usados.get(e.id) ? <span className="tr-selo">{usados.get(e.id)}×</span> : null}
              {multiplo && <span className="tr-check" aria-hidden="true">{marcados.includes(e.id) ? '✓' : '+'}</span>}
            </button>
          </li>
        ))}
      </ul>
      {lista.length > limite && (
        <button type="button" className="tr-btn tr-btn-ghost tr-largo" onClick={() => setLimite((l) => l + 120)}>
          Mostrar mais ({lista.length - limite})
        </button>
      )}
      {multiplo && marcados.length > 0 && (
        <div className="tr-barra-fixa">
          <button type="button" className="tr-btn tr-btn-primario tr-largo" onClick={() => onEscolher(marcados.map((id) => bib.de(id)))}>
            Adicionar {marcados.length} exercício{marcados.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {aberto && <DetalheExercicio ex={aberto} onFechar={() => setAberto(null)} />}
      {novo && (
        <EditarExercicio
          onFechar={(criado) => {
            setNovo(false)
            if (criado && onEscolher && !multiplo) onEscolher([criado])
          }}
        />
      )}
    </div>
  )
}

export function DetalheExercicio({ ex, onFechar }) {
  const sessoes = useColecao('sessoes') || []
  const aviso = useAviso()
  const [editar, setEditar] = useState(false)
  const r = recordes(sessoes, ex.id)
  const curva = curva1rm(sessoes, ex.id)
  const historico = sessoes
    .filter((s) => s.status === 'concluida' && (s.itens || []).some((i) => i.ex === ex.id))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 12)
  return (
    <Modal titulo={nomeEx(ex)} onFechar={onFechar} largo>
      <div className="tr-detalhe-ex">
        <FotoExercicio ex={ex} tamanho={220} animar className="tr-foto-grande" />
        <div>
          {ex.pt && <p className="tr-ajuda">{ex.n}</p>}
          <dl className="tr-dl">
            <dt>Principais</dt>
            <dd>{(ex.m || []).map((m) => MUSCULOS[m]).join(', ') || '-'}</dd>
            {ex.s?.length ? (
              <>
                <dt>Auxiliares</dt>
                <dd>{ex.s.map((m) => MUSCULOS[m]).join(', ')}</dd>
              </>
            ) : null}
            <dt>Equipamento</dt>
            <dd>{EQUIPAMENTOS[ex.e] || ex.e}</dd>
            {ex.c && (
              <>
                <dt>Categoria</dt>
                <dd>{CATEGORIAS[ex.c] || ex.c}</dd>
              </>
            )}
            {ex.l && (
              <>
                <dt>Nível</dt>
                <dd>{NIVEIS[ex.l]}</dd>
              </>
            )}
          </dl>
          {ex.meu && (
            <div className="tr-acoes">
              <button type="button" className="tr-btn tr-btn-ghost" onClick={() => setEditar(true)}>
                Editar
              </button>
              <button
                type="button"
                className="tr-btn tr-btn-perigo"
                onClick={async () => {
                  await excluir('exercicios', ex.id)
                  aviso('Exercício apagado.', () => salvar('exercicios', { ...ex, meu: undefined }))
                  onFechar()
                }}
              >
                Apagar
              </button>
            </div>
          )}
        </div>
      </div>

      {ex.i?.length ? (
        <section>
          <h3>Como fazer</h3>
          <ol className="tr-passos">
            {ex.i.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          {!ex.meu && <p className="tr-ajuda">Instruções em inglês da base pública Free Exercise DB.</p>}
        </section>
      ) : null}

      <section>
        <h3>Seus recordes</h3>
        {r.carga || r.reps || r.tempo ? (
          <div className="tr-kpis">
            {r.carga ? <Kpi rotulo="Maior carga" valor={fmtKg(r.carga)} data={r.data.carga} /> : null}
            {r.e1rm ? <Kpi rotulo="1RM estimado" valor={fmtKg(r.e1rm)} data={r.data.e1rm} /> : null}
            {r.reps ? <Kpi rotulo="Mais repetições" valor={r.reps} data={r.data.reps} /> : null}
            {r.volume ? <Kpi rotulo="Maior volume" valor={fmtKg(r.volume)} data={r.data.volume} /> : null}
            {r.tempo ? <Kpi rotulo="Maior tempo" valor={`${r.tempo}s`} data={r.data.tempo} /> : null}
          </div>
        ) : (
          <p className="tr-vazio">Você ainda não registrou este exercício.</p>
        )}
      </section>

      {curva.length > 1 && (
        <section>
          <h3>Evolução do 1RM estimado</h3>
          <GraficoLinha pontos={curva} unidade=" kg" rotulo="1RM estimado" />
        </section>
      )}

      {historico.length > 0 && (
        <section>
          <h3>Histórico</h3>
          <ul className="tr-historico-ex">
            {historico.map((s) => {
              const it = s.itens.find((i) => i.ex === ex.id)
              return (
                <li key={s.id}>
                  <span>{fmtData(s.data)}</span>
                  <span>
                    {(it.series || [])
                      .filter((x) => x.feita)
                      .map((x) => (x.tempo && !x.reps ? `${x.tempo}s` : `${x.carga ? `${x.carga}×` : ''}${x.repsE !== undefined ? `${x.repsE}/${x.repsD}` : x.reps}`))
                      .join('  ')}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {editar && <EditarExercicio ex={ex} onFechar={() => setEditar(false)} />}
    </Modal>
  )
}

const Kpi = ({ rotulo, valor, data }) => (
  <div className="tr-kpi">
    <span>{rotulo}</span>
    <strong>{valor}</strong>
    {data && <small>{fmtData(data)}</small>}
  </div>
)

export function EditarExercicio({ ex = null, onFechar }) {
  const [f, setF] = useState(() => ({
    n: ex?.n || '',
    m: ex?.m || [],
    s: ex?.s || [],
    e: ex?.e || 'body only',
    c: ex?.c || 'strength',
    tipo: ex?.tipo || 'reps',
    i: (ex?.i || []).join('\n'),
    blob: ex?.blob || null,
  }))
  const [erro, setErro] = useState('')
  const alternar = (campo, m) => setF((x) => ({ ...x, [campo]: x[campo].includes(m) ? x[campo].filter((y) => y !== m) : [...x[campo], m] }))
  const gravar = async () => {
    if (!f.n.trim()) return setErro('Dê um nome ao exercício.')
    if (!f.m.length) return setErro('Escolha pelo menos um músculo principal.')
    const obj = { id: ex?.id || `meu:${uid()}`, n: f.n.trim(), pt: '', m: f.m, s: f.s.filter((x) => !f.m.includes(x)), e: f.e, c: f.c, l: '', k: '', f: '', tipo: f.tipo, i: f.i.split('\n').map((x) => x.trim()).filter(Boolean), img: 0, blob: f.blob }
    await salvar('exercicios', obj)
    onFechar({ ...obj, meu: true })
  }
  return (
    <Modal
      titulo={ex ? 'Editar exercício' : 'Criar exercício'}
      onFechar={() => onFechar(null)}
      rodape={
        <>
          <button type="button" className="tr-btn tr-btn-ghost" onClick={() => onFechar(null)}>
            Cancelar
          </button>
          <button type="button" className="tr-btn tr-btn-primario" onClick={gravar}>
            Salvar
          </button>
        </>
      }
    >
      <label className="tr-campo">
        <span>Nome</span>
        <input className="tr-input" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} autoFocus />
      </label>
      <div className="tr-grade-2">
        <label className="tr-campo">
          <span>Equipamento</span>
          <select className="tr-select" value={f.e} onChange={(e) => setF({ ...f, e: e.target.value })}>
            {Object.entries(EQUIPAMENTOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="tr-campo">
          <span>Como registrar</span>
          <select className="tr-select" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            <option value="reps">Carga e repetições</option>
            <option value="tempo">Tempo (prancha, isometria)</option>
            <option value="cardio">Cardio (tempo e distância)</option>
          </select>
        </label>
      </div>
      <fieldset className="tr-campo">
        <legend>Músculos principais</legend>
        <div className="tr-chips">
          {Object.entries(MUSCULOS).map(([k, v]) => (
            <button key={k} type="button" className={`tr-chip ${f.m.includes(k) ? 'ativo' : ''}`} aria-pressed={f.m.includes(k)} onClick={() => alternar('m', k)}>
              {v}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="tr-campo">
        <legend>Músculos auxiliares</legend>
        <div className="tr-chips">
          {Object.entries(MUSCULOS)
            .filter(([k]) => !f.m.includes(k))
            .map(([k, v]) => (
              <button key={k} type="button" className={`tr-chip ${f.s.includes(k) ? 'ativo' : ''}`} aria-pressed={f.s.includes(k)} onClick={() => alternar('s', k)}>
                {v}
              </button>
            ))}
        </div>
      </fieldset>
      <label className="tr-campo">
        <span>Foto ou vídeo curto (fica só no aparelho)</span>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => {
            const arq = e.target.files?.[0]
            if (!arq) return
            if (arq.size > 25 * 1024 * 1024) return setErro('Arquivo grande demais (máximo 25 MB).')
            setF({ ...f, blob: arq })
          }}
        />
      </label>
      {f.blob && (
        <p className="tr-ajuda">
          Mídia: {f.blob.name || f.blob.type}{' '}
          <button type="button" className="tr-link" onClick={() => setF({ ...f, blob: null })}>
            remover
          </button>
        </p>
      )}
      <label className="tr-campo">
        <span>Como fazer (um passo por linha)</span>
        <textarea className="tr-input" rows={4} value={f.i} onChange={(e) => setF({ ...f, i: e.target.value })} />
      </label>
      {erro && (
        <p className="tr-erro" role="alert">
          {erro}
        </p>
      )}
    </Modal>
  )
}
