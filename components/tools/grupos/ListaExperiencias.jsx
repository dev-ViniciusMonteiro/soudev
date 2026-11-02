'use client'

import { useEffect, useMemo, useState } from 'react'
import { linkCom, lerDoLink, limparHash } from '@/lib/compartilhar'
import { Aviso, Compartilhar, uid, useLocal } from './comum'

const CATEGORIAS = {
  lugares: { nome: 'Lugares', ic: '🌍', cor: '#2563eb' },
  aventuras: { nome: 'Aventuras', ic: '🪂', cor: '#ea580c' },
  aprender: { nome: 'Aprender', ic: '📚', cor: '#7c3aed' },
  saude: { nome: 'Corpo e saúde', ic: '💪', cor: '#16a34a' },
  pessoas: { nome: 'Família e amigos', ic: '💛', cor: '#db2777' },
  criar: { nome: 'Criar algo', ic: '🎨', cor: '#0891b2' },
  ano: { nome: 'Metas do ano', ic: '🎯', cor: '#ca8a04' },
}
const SUGESTOES = {
  lugares: ['Ver a aurora boreal', 'Conhecer os Lençóis Maranhenses', 'Fazer uma viagem de trem', 'Visitar Machu Picchu', 'Acampar sob as estrelas', 'Conhecer Fernando de Noronha'],
  aventuras: ['Saltar de paraquedas', 'Fazer uma trilha de vários dias', 'Mergulhar com cilindro', 'Andar de balão', 'Fazer rafting', 'Voar de parapente'],
  aprender: ['Aprender a tocar violão', 'Falar inglês fluente', 'Aprender a nadar', 'Fazer um curso de culinária', 'Aprender a dirigir moto', 'Ler 12 livros num ano'],
  saude: ['Correr 10 km', 'Fazer uma meia maratona', 'Treinar 3x por semana por 6 meses', 'Aprender a meditar', 'Ficar 30 dias sem refrigerante'],
  pessoas: ['Levar meus pais para viajar', 'Fazer uma festa surpresa', 'Reencontrar amigos de escola', 'Cozinhar o almoço de domingo da família', 'Escrever uma carta para cada avó/avô'],
  criar: ['Plantar uma árvore', 'Escrever um livro', 'Montar uma horta', 'Gravar uma música', 'Construir um móvel', 'Criar um site ou app'],
  ano: ['Guardar 10% do salário todo mês', 'Tirar férias de verdade', 'Organizar a casa inteira', 'Doar sangue', 'Fazer um curso online até o fim'],
}

function demo() {
  const a = new Date().getFullYear()
  const i = (texto, categoria, feito = false, data = '', nota = '') => ({ id: uid(), texto, categoria, feito, data, nota })
  return {
    nome: 'Minha lista de experiências',
    ano: a,
    itens: [
      i('Conhecer os Lençóis Maranhenses', 'lugares', true, `${a - 1}-07-14`, 'Lagoas cheias em julho. Melhor viagem da vida!'),
      i('Ver a aurora boreal', 'lugares'),
      i('Saltar de paraquedas', 'aventuras'),
      i('Fazer uma trilha de vários dias', 'aventuras', true, `${a}-04-21`, 'Travessia da Serra Fina, 3 dias.'),
      i('Aprender a tocar violão', 'aprender'),
      i('Ler 12 livros num ano', 'ano', true, `${a}-10-02`, '12º livro: Torto Arado.'),
      i('Correr 10 km', 'saude'),
      i('Levar meus pais para viajar', 'pessoas'),
      i('Plantar uma árvore', 'criar', true, `${a}-03-19`, 'Um ipê amarelo no quintal da vó.'),
      i('Guardar 10% do salário todo mês', 'ano'),
    ],
  }
}

const hojeLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function Anel({ pct }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <svg className="ex-anel" viewBox="0 0 104 104" role="img" aria-label={`${pct}% concluído`}>
      <circle cx="52" cy="52" r={r} stroke="var(--panel-2)" />
      <circle cx="52" cy="52" r={r} stroke="#16a34a" strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 52 52)" style={{ transition: 'stroke-dasharray .5s' }} />
      <text x="52" y="60" textAnchor="middle">{pct}%</text>
    </svg>
  )
}

export default function ListaExperiencias() {
  const [local, setLocal] = useLocal('soudev-experiencias-v1', demo)
  const [compartilhada, setCompartilhada] = useState(null)
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [novo, setNovo] = useState('')
  const [novaCat, setNovaCat] = useState('lugares')
  const [concluindo, setConcluindo] = useState(null)
  const [link, setLink] = useState('')

  useEffect(() => {
    const d = lerDoLink()
    if (d?.itens) setCompartilhada(d)
  }, [])
  const lista = compartilhada || local
  const soLeitura = Boolean(compartilhada)
  const stats = useMemo(() => {
    if (!lista) return null
    const feitos = lista.itens.filter((i) => i.feito)
    const anoAtual = String(new Date().getFullYear())
    return { total: lista.itens.length, feitos: feitos.length, noAno: feitos.filter((i) => i.data?.startsWith(anoAtual)).length, pct: lista.itens.length ? Math.round((feitos.length / lista.itens.length) * 100) : 0 }
  }, [lista])
  if (!lista) return null

  const mudar = (fn) => setLocal((l) => ({ ...l, itens: fn(l.itens) }))
  const adicionar = (texto, categoria) => {
    const t = texto.trim()
    if (!t || lista.itens.some((i) => i.texto.toLowerCase() === t.toLowerCase())) return
    mudar((l) => [{ id: uid(), texto: t, categoria, feito: false, data: '', nota: '' }, ...l])
  }
  const itens = lista.itens.filter((i) => (!cat || i.categoria === cat) && (!status || (status === 'feito' ? i.feito : !i.feito)))
  const ordenados = [...itens].sort((a, b) => (a.feito - b.feito) || (b.data || '').localeCompare(a.data || ''))
  const sugestoes = (SUGESTOES[cat || novaCat] || []).filter((s) => !lista.itens.some((i) => i.texto === s))

  return (
    <div className="gp">
      {soLeitura && (
        <Aviso tom="alerta">
          Esta é a lista de outra pessoa (somente leitura).{' '}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (!confirm('Criar a sua lista a partir desta (tudo desmarcado)? A sua lista atual neste navegador será substituída.')) return
              setLocal({ nome: 'Minha lista de experiências', ano: new Date().getFullYear(), itens: compartilhada.itens.map((i) => ({ ...i, id: uid(), feito: false, data: '', nota: '' })) })
              setCompartilhada(null)
              limparHash()
            }}
          >
            Fazer a minha a partir desta
          </button>{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCompartilhada(null); limparHash() }}>Ver a minha</button>
        </Aviso>
      )}

      <div className="gp-caixa ex-topo">
        <Anel pct={stats.pct} />
        <div style={{ display: 'grid', gap: 6 }}>
          {soLeitura ? <h3 className="gp-titulo">{lista.nome}</h3> : <input value={lista.nome} onChange={(e) => setLocal((l) => ({ ...l, nome: e.target.value }))} style={{ fontWeight: 700, maxWidth: 360 }} aria-label="Nome da lista" />}
          <p className="gp-sub">{stats.feitos} de {stats.total} experiências vividas · {stats.noAno} neste ano</p>
          {!soLeitura && <button type="button" className="btn btn-primary btn-sm" style={{ justifySelf: 'start' }} onClick={() => setLink(linkCom(lista))}>Compartilhar minha lista</button>}
        </div>
      </div>
      {link && !soLeitura && <Compartilhar link={link} mensagem={`Minha lista de experiências: já vivi ${stats.feitos} de ${stats.total}! ✨`} titulo="Link da sua lista" dica="Quem abrir vê o seu progresso e pode criar a própria lista a partir da sua. A lista vai dentro do link." />}

      <div className="gp-chips">
        <button type="button" className="gp-chip" aria-pressed={!cat} onClick={() => setCat('')}>Tudo</button>
        {Object.entries(CATEGORIAS).map(([k, c]) => {
          const n = lista.itens.filter((i) => i.categoria === k)
          return <button key={k} type="button" className="gp-chip" aria-pressed={cat === k} onClick={() => { setCat(k); setNovaCat(k) }}>{c.ic} {c.nome} {n.length ? `${n.filter((i) => i.feito).length}/${n.length}` : ''}</button>
        })}
      </div>
      <div className="gp-chips">
        {[['', 'Todas'], ['falta', 'Quero fazer'], ['feito', 'Já vivi']].map(([k, n]) => <button key={k} type="button" className="gp-chip" aria-pressed={status === k} onClick={() => setStatus(k)}>{n}</button>)}
      </div>

      {!soLeitura && (
        <div className="gp-caixa">
          <form className="gp-linha" onSubmit={(e) => { e.preventDefault(); adicionar(novo, novaCat); setNovo('') }}>
            <select value={novaCat} onChange={(e) => setNovaCat(e.target.value)} aria-label="Categoria" style={{ flex: '0 0 auto', width: 'auto' }}>
              {Object.entries(CATEGORIAS).map(([k, c]) => <option key={k} value={k}>{c.ic} {c.nome}</option>)}
            </select>
            <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="O que você quer viver?" maxLength={120} />
            <button type="submit" className="btn btn-primary btn-sm">Adicionar</button>
          </form>
          {sugestoes.length > 0 && (
            <div className="ex-sugestoes">
              <span className="gp-sub">Ideias:</span>
              {sugestoes.slice(0, 6).map((s) => <button key={s} type="button" className="gp-chip" onClick={() => adicionar(s, cat || novaCat)}>＋ {s}</button>)}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {ordenados.map((i) => {
          const c = CATEGORIAS[i.categoria] || CATEGORIAS.ano
          return (
            <div key={i.id} className="ex-item" data-feito={i.feito || undefined}>
              <button
                type="button"
                className="ex-check"
                disabled={soLeitura}
                aria-label={i.feito ? 'Desmarcar' : 'Marcar como vivida'}
                onClick={() => (i.feito ? mudar((l) => l.map((x) => (x.id === i.id ? { ...x, feito: false, data: '', nota: '' } : x))) : setConcluindo({ id: i.id, data: hojeLocal(), nota: '' }))}
              >
                {i.feito ? '✓' : ''}
              </button>
              <div className="ex-texto">
                <b>{i.texto}</b>
                <small>{c.ic} {c.nome}{i.feito && i.data ? ` · vivida em ${new Date(`${i.data}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</small>
                {i.nota && <span className="ex-nota">“{i.nota}”</span>}
                {concluindo?.id === i.id && (
                  <form
                    className="gp-linha"
                    style={{ flexWrap: 'wrap', marginTop: 6 }}
                    onSubmit={(e) => {
                      e.preventDefault()
                      mudar((l) => l.map((x) => (x.id === i.id ? { ...x, feito: true, data: concluindo.data, nota: concluindo.nota.trim() } : x)))
                      setConcluindo(null)
                    }}
                  >
                    <input type="date" value={concluindo.data} onChange={(e) => setConcluindo({ ...concluindo, data: e.target.value })} style={{ flex: '0 0 160px' }} aria-label="Quando" />
                    <input value={concluindo.nota} onChange={(e) => setConcluindo({ ...concluindo, nota: e.target.value })} placeholder="Como foi? (opcional)" maxLength={200} autoFocus />
                    <button type="submit" className="btn btn-primary btn-sm">🎉 Vivi!</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConcluindo(null)}>Cancelar</button>
                  </form>
                )}
              </div>
              {!soLeitura && <button type="button" className="gp-x" onClick={() => mudar((l) => l.filter((x) => x.id !== i.id))} aria-label="Remover">✕</button>}
            </div>
          )
        })}
        {!ordenados.length && <p className="gp-vazio">Nada aqui ainda.</p>}
      </div>
      {!soLeitura && <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => confirm('Voltar à lista de exemplo?') && setLocal(demo())}>Ver exemplo</button>}
    </div>
  )
}
