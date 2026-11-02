'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { hashParam } from '@/lib/compartilhar'
import { agir, apagarSala, chaveDe, criarSala, esquecerSala, guardarSala, lerSala, minhasSalas, temApi } from '@/lib/grupos-api'
import { Aviso, Carregando, Compartilhar, uid, useIntervalo } from './comum'

const EMOJIS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🐝', '🦄', '🐢', '🐧', '🐶', '🐱', '🌵']
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const FREQ = { diaria: 'Todo dia', semanal: 'Toda semana', mensal: 'Todo mês', unica: 'Uma vez' }
const PESO = { diaria: 7, semanal: 1, mensal: 0.25, unica: 0.2 }
const MODELOS = {
  República: [['Tirar o lixo', 'diaria', 1, 'Cozinha'], ['Lavar a louça do jantar', 'diaria', 2, 'Cozinha'], ['Limpar o banheiro', 'semanal', 4, 'Banheiro'], ['Aspirar / varrer a casa', 'semanal', 3, 'Sala'], ['Limpar a geladeira', 'mensal', 4, 'Cozinha'], ['Fazer compras do mês', 'mensal', 3, 'Rua'], ['Regar as plantas', 'semanal', 1, 'Área']],
  Família: [['Arrumar a cama', 'diaria', 1, 'Quarto'], ['Pôr e tirar a mesa', 'diaria', 1, 'Cozinha'], ['Dar comida ao cachorro', 'diaria', 1, 'Área'], ['Lavar o carro', 'mensal', 4, 'Garagem'], ['Organizar os brinquedos', 'semanal', 2, 'Quarto'], ['Estender a roupa', 'semanal', 2, 'Lavanderia']],
}

const iso = (d) => {
  const z = new Date(d)
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset())
  return z.toISOString().slice(0, 10)
}
function semanaIso(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dia = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dia)
  const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return `${t.getUTCFullYear()}-S${String(Math.ceil(((t - ini) / 86400000 + 1) / 7)).padStart(2, '0')}`
}
const periodo = (t, d) => (t.frequencia === 'diaria' ? iso(d) : t.frequencia === 'semanal' ? semanaIso(d) : t.frequencia === 'mensal' ? iso(d).slice(0, 7) : 'u')
const linkDa = (id) => `${window.location.origin}${window.location.pathname}#c=${id}`

// Distribui as tarefas para equilibrar a carga semanal (pontos × frequência).
function dividir(tarefas, membros) {
  if (!membros.length) return tarefas
  const carga = Object.fromEntries(membros.map((m) => [m.id, 0]))
  const ord = [...tarefas].sort((a, b) => b.pontos * PESO[b.frequencia] - a.pontos * PESO[a.frequencia])
  const resp = {}
  for (const t of ord) {
    const m = Object.entries(carga).sort((a, b) => a[1] - b[1])[0][0]
    resp[t.id] = m
    carga[m] += t.pontos * PESO[t.frequencia]
  }
  return tarefas.map((t) => ({ ...t, responsavel: resp[t.id] }))
}

function Criar({ onCriada }) {
  const [nome, setNome] = useState('')
  const [membros, setMembros] = useState(['', '', ''])
  const [modelo, setModelo] = useState('República')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const minhas = minhasSalas('tarefas')
  const criar = async (e) => {
    e.preventDefault()
    const ms = membros.map((m) => m.trim()).filter(Boolean).map((n, i) => ({ id: uid(), nome: n, emoji: EMOJIS[i % EMOJIS.length] }))
    if (!nome.trim()) return setErro('Dê um nome à casa (ex.: República do Centro).')
    if (ms.length < 2) return setErro('Coloque pelo menos duas pessoas.')
    const tarefas = dividir((MODELOS[modelo] || []).map(([titulo, frequencia, pontos, comodo]) => ({ id: uid(), titulo, frequencia, pontos, comodo, dia: 6, responsavel: '' })), ms)
    setEnviando(true)
    try {
      const r = await criarSala('tarefas', { nome, membros: ms, tarefas })
      guardarSala('tarefas', { id: r.id, chave: r.chave, titulo: nome.trim(), em: Date.now() })
      onCriada(r.id)
    } catch (er) {
      setErro(er.message)
    } finally {
      setEnviando(false)
    }
  }
  return (
    <div className="gp">
      <form className="gp-caixa" onSubmit={criar}>
        <label className="gp-campo"><span>Nome da casa ou do grupo</span><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Apê 302, Família Lima, República Toca" maxLength={60} /></label>
        <div className="gp-campo">
          <span>Quem mora / participa</span>
          {membros.map((m, i) => (
            <div key={i} className="gp-linha">
              <span style={{ fontSize: '1.3rem' }}>{EMOJIS[i % EMOJIS.length]}</span>
              <input value={m} onChange={(e) => { const l = membros.map((x, j) => (j === i ? e.target.value : x)); if (i === l.length - 1 && e.target.value && l.length < 12) l.push(''); setMembros(l) }} placeholder={`Pessoa ${i + 1}`} maxLength={30} />
            </div>
          ))}
        </div>
        <div className="gp-chips">
          <span className="gp-sub">Tarefas iniciais:</span>
          {[...Object.keys(MODELOS), 'Nenhuma'].map((k) => <button key={k} type="button" className="gp-chip" aria-pressed={modelo === k} onClick={() => setModelo(k)}>{k}</button>)}
        </div>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Criando…' : 'Criar e dividir as tarefas'}</button>
        <p className="gp-sub">As tarefas já saem divididas de forma equilibrada. Todo mundo com o link marca o que fez.</p>
      </form>
      {minhas.length > 0 && (
        <div className="gp-caixa">
          <b>Casas que você criou neste aparelho</b>
          {minhas.map((m) => <a key={m.id} href={`#c=${m.id}`}>{m.titulo}</a>)}
        </div>
      )}
    </div>
  )
}

function Casa({ id, onSair }) {
  const [sala, setSala] = useState(null)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState('hoje')
  const [eu, setEu] = useState('')
  const [dia, setDia] = useState(() => new Date())
  const [edicao, setEdicao] = useState(null)
  const chave = chaveDe('tarefas', id)
  const chaveEu = `gp-tarefas-eu-${id}`

  const carregar = useCallback(async () => {
    try {
      setSala(await lerSala(id, { chave }))
      setErro('')
    } catch (e) {
      setErro(e.message)
    }
  }, [id, chave])
  useEffect(() => {
    try {
      setEu(localStorage.getItem(chaveEu) || '')
    } catch {}
    carregar()
  }, [carregar, chaveEu])
  useIntervalo(carregar, 5000, Boolean(sala) && !edicao)

  const d = sala?.dados
  const ranking = useMemo(() => {
    if (!d) return []
    const semana = semanaIso(new Date())
    const mes = iso(new Date()).slice(0, 7)
    const pts = Object.fromEntries(d.membros.map((m) => [m.id, { semana: 0, mes: 0, feitas: 0 }]))
    for (const [, per] of Object.entries(d.feitos)) {
      for (const f of Object.values(per)) {
        if (!pts[f.membro]) continue
        const quando = new Date(f.em)
        if (semanaIso(quando) === semana) pts[f.membro].semana += f.pontos
        if (iso(quando).slice(0, 7) === mes) {
          pts[f.membro].mes += f.pontos
          pts[f.membro].feitas++
        }
      }
    }
    return d.membros.map((m) => ({ ...m, ...pts[m.id] })).sort((a, b) => b.semana - a.semana || b.mes - a.mes)
  }, [d])

  if (erro && !sala) return <Aviso tom="erro">{erro} <button type="button" className="btn btn-ghost btn-sm" onClick={onSair}>Criar uma casa</button></Aviso>
  if (!sala) return <Carregando />
  const porId = Object.fromEntries(d.membros.map((m) => [m.id, m]))
  const escolherEu = (m) => {
    setEu(m)
    try {
      localStorage.setItem(chaveEu, m)
    } catch {}
  }
  const marcar = async (t) => {
    const per = periodo(t, dia)
    const feito = d.feitos[t.id]?.[per]
    if (!feito && !eu) return setErro('Escolha quem é você lá em cima.')
    try {
      const r = await agir(id, feito ? { acao: 'desfazer', tarefaId: t.id, periodo: per } : { acao: 'concluir', tarefaId: t.id, membroId: eu, periodo: per })
      setSala((s) => ({ ...s, dados: r.dados }))
      setErro('')
    } catch (e) {
      setErro(e.message)
    }
  }
  const salvarEdicao = async (dados) => {
    try {
      const r = await agir(id, { acao: 'editar', ...dados })
      setSala((s) => ({ ...s, dados: r.dados }))
      setEdicao(null)
    } catch (e) {
      setErro(e.message)
    }
  }
  // tarefas que valem para o dia escolhido
  const doDia = d.tarefas
  const grupos = [
    ['diaria', 'Hoje'],
    ['semanal', 'Nesta semana'],
    ['mensal', 'Neste mês'],
    ['unica', 'Avulsas'],
  ]
  const hojeIso = iso(new Date())
  const semanaDias = Array.from({ length: 7 }, (_, i) => {
    const x = new Date()
    x.setDate(x.getDate() - x.getDay() + i)
    return x
  })
  const total = doDia.length
  const feitasDia = doDia.filter((t) => d.feitos[t.id]?.[periodo(t, dia)]).length

  return (
    <div className="gp">
      <div className="gp-barra">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSair}>← Outra casa</button>
        <h3 className="gp-titulo">{d.nome}</h3>
        <span className="gp-espaco" />
        <label className="gp-linha" style={{ flex: '0 0 auto' }}>
          <span className="gp-sub">Eu sou</span>
          <select value={eu} onChange={(e) => escolherEu(e.target.value)} style={{ width: 'auto' }} aria-label="Quem é você">
            <option value="">— escolha —</option>
            {d.membros.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}
          </select>
        </label>
      </div>
      <div className="gp-chips">
        {[['hoje', '✅ Tarefas'], ['ranking', '🏆 Placar'], ['editar', '⚙️ Organizar']].map(([k, n]) => <button key={k} type="button" className="gp-chip" aria-pressed={aba === k} onClick={() => setAba(k)}>{n}</button>)}
      </div>
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {aba === 'hoje' && (
        <>
          <div className="dt-semana" role="group" aria-label="Dia">
            {semanaDias.map((x) => (
              <button key={iso(x)} type="button" aria-pressed={iso(x) === iso(dia)} onClick={() => setDia(x)}>
                {DIAS[x.getDay()]}
                <b>{x.getDate()}</b>
                {iso(x) === hojeIso && <small>hoje</small>}
              </button>
            ))}
          </div>
          <div className="gp-progresso" aria-label={`${feitasDia} de ${total}`}><span style={{ width: `${total ? (feitasDia / total) * 100 : 0}%` }} /></div>
          {grupos.map(([freq, rot]) => {
            const ts = d.tarefas.filter((t) => t.frequencia === freq)
            if (!ts.length) return null
            return (
              <div key={freq} style={{ display: 'grid', gap: 8 }}>
                <b>{rot}</b>
                {ts.sort((a, b) => (a.responsavel === eu ? -1 : 0) - (b.responsavel === eu ? -1 : 0)).map((t) => {
                  const f = d.feitos[t.id]?.[periodo(t, dia)]
                  const resp = porId[t.responsavel]
                  return (
                    <div key={t.id} className="dt-tarefa" data-feita={f ? '' : undefined}>
                      <button type="button" className="dt-check" onClick={() => marcar(t)} aria-label={f ? 'Desmarcar' : 'Marcar como feita'}>{f ? '✓' : ''}</button>
                      <div className="dt-tarefa-txt">
                        <b>{t.titulo}</b>
                        <small>
                          {resp ? `${resp.emoji} ${resp.nome}` : 'Sem responsável'}
                          {t.frequencia === 'semanal' ? ` · até ${DIAS[t.dia]}` : ''}
                          {t.comodo ? ` · ${t.comodo}` : ''}
                          {f && ` · feita por ${porId[f.membro]?.nome || '—'}`}
                        </small>
                      </div>
                      <span className="dt-pontos">+{t.pontos}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {!d.tarefas.length && <p className="gp-vazio">Nenhuma tarefa. Vá em Organizar para criar.</p>}
        </>
      )}

      {aba === 'ranking' && (
        <div className="gp-caixa">
          <b>Placar da semana</b>
          <div className="dt-membros">
            {ranking.map((m, i) => (
              <div key={m.id} className="dt-membro" data-lider={(i === 0 && m.semana > 0) || undefined}>
                <span className="dt-avatar">{i === 0 && m.semana > 0 ? '👑' : m.emoji}</span>
                <b>{m.nome}</b>
                <small>{m.semana} pts na semana</small>
                <small>{m.mes} pts · {m.feitas} tarefas no mês</small>
              </div>
            ))}
          </div>
          <p className="gp-sub">Cada tarefa vale pontos (as mais chatas valem mais). Combine um prêmio para quem ganhar a semana 😉</p>
        </div>
      )}

      {aba === 'editar' && (
        <Organizar d={d} edicao={edicao} setEdicao={setEdicao} onSalvar={salvarEdicao} />
      )}

      <Compartilhar link={linkDa(id)} mensagem={`🧹 Divisão de tarefas da ${d.nome}: marque aqui o que você fez`} titulo="Link da casa" dica="Todo mundo usa o mesmo link: escolhe quem é e marca as tarefas. Não precisa de cadastro." />
      {chave && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626', justifySelf: 'start' }} onClick={async () => { if (confirm('Apagar a casa e o histórico para todo mundo?')) { await apagarSala(id, chave).catch(() => {}); esquecerSala('tarefas', id); onSair() } }}>
          Apagar esta casa
        </button>
      )}
    </div>
  )
}

function Organizar({ d, edicao, setEdicao, onSalvar }) {
  const e = edicao || { nome: d.nome, membros: d.membros, tarefas: d.tarefas }
  const set = (parcial) => setEdicao({ ...e, ...parcial })
  const setT = (i, k, v) => set({ tarefas: e.tarefas.map((t, j) => (j === i ? { ...t, [k]: v } : t)) })
  const carga = Object.fromEntries(e.membros.map((m) => [m.id, 0]))
  for (const t of e.tarefas) if (carga[t.responsavel] !== undefined) carga[t.responsavel] += t.pontos * PESO[t.frequencia]
  return (
    <div className="gp-caixa">
      <b>Pessoas</b>
      <div className="dt-membros">
        {e.membros.map((m, i) => (
          <div key={m.id} className="dt-membro">
            <span className="dt-avatar">{m.emoji}</span>
            <input value={m.nome} onChange={(ev) => set({ membros: e.membros.map((x, j) => (j === i ? { ...x, nome: ev.target.value } : x)) })} style={{ width: 100, textAlign: 'center' }} aria-label="Nome" />
            <small>carga {Math.round(carga[m.id] * 10) / 10}/sem</small>
            <button type="button" className="gp-x" onClick={() => set({ membros: e.membros.filter((x) => x.id !== m.id), tarefas: e.tarefas.map((t) => (t.responsavel === m.id ? { ...t, responsavel: '' } : t)) })} aria-label="Remover pessoa">✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ membros: [...e.membros, { id: uid(), nome: 'Nova pessoa', emoji: EMOJIS[e.membros.length % EMOJIS.length] }] })}>＋ Pessoa</button>
      </div>
      <div className="gp-barra">
        <b>Tarefas</b>
        <span className="gp-espaco" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ tarefas: dividir(e.tarefas, e.membros) })}>⚖️ Dividir de forma justa</button>
      </div>
      {e.tarefas.map((t, i) => (
        <div key={t.id} className="dt-editar">
          <input value={t.titulo} onChange={(ev) => setT(i, 'titulo', ev.target.value)} aria-label="Tarefa" maxLength={100} />
          <select value={t.responsavel} onChange={(ev) => setT(i, 'responsavel', ev.target.value)} aria-label="Responsável">
            <option value="">Sem responsável</option>
            {e.membros.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}
          </select>
          <select value={t.frequencia} onChange={(ev) => setT(i, 'frequencia', ev.target.value)} aria-label="Frequência">
            {Object.entries(FREQ).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <input type="number" min={1} max={20} value={t.pontos} onChange={(ev) => setT(i, 'pontos', Number(ev.target.value) || 1)} aria-label="Pontos" title="Pontos" />
          <button type="button" className="gp-x" onClick={() => set({ tarefas: e.tarefas.filter((_, j) => j !== i) })} aria-label="Remover tarefa">✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => set({ tarefas: [...e.tarefas, { id: uid(), titulo: '', responsavel: '', frequencia: 'semanal', dia: 6, pontos: 2, comodo: '' }] })}>＋ Tarefa</button>
      {edicao && (
        <div className="gp-barra">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onSalvar({ nome: e.nome, membros: e.membros, tarefas: e.tarefas.filter((t) => t.titulo.trim()) })}>Salvar para todos</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdicao(null)}>Descartar</button>
        </div>
      )}
    </div>
  )
}

export default function DivisaoTarefas() {
  const [id, setId] = useState(null)
  useEffect(() => {
    const ler = () => setId(hashParam('c') || '')
    ler()
    window.addEventListener('hashchange', ler)
    return () => window.removeEventListener('hashchange', ler)
  }, [])
  if (!temApi()) return <Aviso tom="erro">Esta ferramenta precisa da variável NEXT_PUBLIC_IDEIAS_API.</Aviso>
  if (id === null) return <Carregando />
  if (!id) return <Criar onCriada={(n) => { window.location.hash = `c=${n}` }} />
  return <Casa key={id} id={id} onSair={() => { history.replaceState(null, '', window.location.pathname); setId('') }} />
}
