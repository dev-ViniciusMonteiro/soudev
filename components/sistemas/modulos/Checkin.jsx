'use client'

// Check-in na recepção: busca o aluno, registra a presença e mostra se a mensalidade está em dia.

import { useMemo, useState } from 'react'
import { Kpis, Selo, Topo, Vazio, useMapa, useSistema, useTabela } from '../base'
import { dataBR, diasEntre, hojeISO, horaBR, linkWhats } from '@/lib/sistemas/regras'

export default function Checkin() {
  const { banco } = useSistema()
  const clientes = useTabela('clientes')
  const matriculas = useTabela('matriculas')
  const lancamentos = useTabela('lancamentos')
  const presencas = useTabela('presencas')
  const planos = useMapa('planos')
  const porId = useMapa('clientes')
  const [busca, setBusca] = useState('')
  const [ultimo, setUltimo] = useState(null)
  const hoje = hojeISO()

  const situacao = useMemo(() => {
    const m = new Map()
    for (const x of matriculas) if (x.status !== 'cancelada') m.set(x.cliente_id, { matricula: x, atraso: 0 })
    for (const l of lancamentos) {
      if (l.categoria !== 'mensalidade' || l.pago_em || l.vencimento >= hoje) continue
      const s = m.get(l.cliente_id)
      if (s) s.atraso = Math.max(s.atraso, diasEntre(l.vencimento, hoje))
    }
    return m
  }, [matriculas, lancamentos, hoje])

  const ultimaVisita = useMemo(() => {
    const m = new Map()
    for (const p of presencas) if (!m.has(p.cliente_id) || p.criado_em > m.get(p.cliente_id)) m.set(p.cliente_id, p.criado_em)
    return m
  }, [presencas])

  const q = busca.trim().toLowerCase()
  const achados = q ? clientes.filter((c) => c.nome.toLowerCase().includes(q) || String(c.telefone).replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')).slice(0, 8) : []
  const deHoje = presencas.filter((p) => hojeISO(new Date(p.criado_em)) === hoje)
  const sumidos = matriculas
    .filter((x) => x.status === 'ativa')
    .map((x) => ({ x, c: porId.get(x.cliente_id), ultima: ultimaVisita.get(x.cliente_id) }))
    .filter(({ ultima }) => !ultima || diasEntre(hojeISO(new Date(ultima)), hoje) >= 7)
    .sort((a, b) => String(a.ultima || '').localeCompare(String(b.ultima || '')))

  const registrar = (c) => {
    banco.salvar('presencas', { cliente_id: c.id })
    setUltimo({ c, s: situacao.get(c.id) })
    setBusca('')
  }

  return (
    <div className="sx-modulo">
      <Topo titulo="Check-in" sub={`${deHoje.length} presenças hoje`} />
      <div className="sx-cartao">
        <input
          className="sx-busca-grande"
          autoFocus
          placeholder="Nome ou telefone do aluno"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && achados.length === 1 && registrar(achados[0])}
        />
        {achados.length > 0 && (
          <ul className="sx-achados">
            {achados.map((c) => {
              const s = situacao.get(c.id)
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => registrar(c)}>
                    <strong>{c.nome}</strong>
                    <span className="muted small">{s ? planos.get(s.matricula.plano_id)?.nome : 'Sem matrícula'}</span>
                    <Situacao s={s} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {ultimo && (
          <div className={`sx-checkin-ok ${ultimo.s?.atraso || !ultimo.s || ultimo.s.matricula.status !== 'ativa' ? 'alerta' : ''}`} role="status">
            <strong>✓ {ultimo.c.nome}</strong>
            <Situacao s={ultimo.s} />
          </div>
        )}
      </div>
      <Kpis itens={[['Presenças hoje', deHoje.length], ['Alunos sumidos (7+ dias)', sumidos.length, 'risco de cancelamento', sumidos.length ? 'aviso' : 'ok']]} />
      <div className="sx-grade-2">
        <section className="sx-cartao">
          <h2>Entradas de hoje</h2>
          {deHoje.length === 0 ? (
            <Vazio>Ninguém ainda.</Vazio>
          ) : (
            <ul className="sx-lista-simples">
              {[...deHoje]
                .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
                .map((p) => (
                  <li key={p.id}>
                    <strong>{horaBR(p.criado_em)}</strong> {porId.get(p.cliente_id)?.nome}
                  </li>
                ))}
            </ul>
          )}
        </section>
        <section className="sx-cartao">
          <h2>Sumidos há 7 dias ou mais</h2>
          {sumidos.length === 0 ? (
            <Vazio>Todos os alunos ativos vieram nesta semana.</Vazio>
          ) : (
            <ul className="sx-lista-simples">
              {sumidos.slice(0, 15).map(({ c, ultima }) =>
                c ? (
                  <li key={c.id}>
                    {c.nome} <span className="muted small">{ultima ? `última vez ${dataBR(ultima)}` : 'nunca veio'}</span>{' '}
                    {c.telefone && (
                      <a href={linkWhats(c.telefone, `Oi, ${c.nome.split(' ')[0]}! Sentimos sua falta nos treinos. Bora voltar esta semana? 💪`)} target="_blank" rel="noopener noreferrer">
                        Chamar
                      </a>
                    )}
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Situacao({ s }) {
  if (!s) return <Selo tom="erro">Sem matrícula</Selo>
  if (s.matricula.status !== 'ativa') return <Selo tom="aviso">Matrícula {s.matricula.status}</Selo>
  if (s.atraso) return <Selo tom="erro">Mensalidade {s.atraso} dias atrasada</Selo>
  return <Selo tom="ok">Em dia</Selo>
}
