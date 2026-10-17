'use client'

// Visão geral: os indicadores mudam conforme os módulos ligados no nicho.

import { useMemo } from 'react'
import { Barras, Kpis, Selo, Topo, Vazio, useConfig, useMapa, useSistema, useTabela } from '../base'
import { addDias, brl, dataBR, hojeISO, horaBR, linkWhats, num, round2, saldos } from '@/lib/sistemas/regras'
import { ETAPAS_PEDIDO, STATUS_AGENDA, STATUS_OS } from '@/lib/sistemas/schema'
import { dosesAtuais } from './Vacinas'

const diaLocal = (iso) => hojeISO(new Date(iso))

export default function Painel() {
  const { ativos, ir, nicho } = useSistema()
  const cfg = useConfig()
  const vendas = useTabela('vendas')
  const lancamentos = useTabela('lancamentos')
  const agendamentos = useTabela('agendamentos')
  const ordens = useTabela('ordens')
  const produtos = useTabela('produtos')
  const movs = useTabela('estoque_mov')
  const leads = useTabela('leads')
  const vacinas = useTabela('vacinas')
  const matriculas = useTabela('matriculas')
  const presencas = useTabela('presencas')
  const clientes = useMapa('clientes')
  const pets = useMapa('pets')
  const servicos = useMapa('produtos')
  const tem = (m) => ativos.includes(m)
  const hoje = hojeISO()

  const n = useMemo(() => {
    const concluidas = vendas.filter((v) => v.status === 'concluida')
    const porDia = new Map()
    for (const v of concluidas) {
      const d = diaLocal(v.concluida_em || v.criado_em)
      porDia.set(d, round2((porDia.get(d) || 0) + Number(v.total)))
    }
    const deHoje = concluidas.filter((v) => diaLocal(v.concluida_em || v.criado_em) === hoje)
    const mes = hoje.slice(0, 7)
    const mesAnt = addDias(`${mes}-01`, -1).slice(0, 7)
    const doMes = concluidas.filter((v) => diaLocal(v.concluida_em || v.criado_em).startsWith(mes))
    const totalMes = doMes.reduce((s, v) => s + Number(v.total), 0)
    const diaDoMes = Number(hoje.slice(8, 10))
    const mesAntAteHoje = concluidas.filter((v) => {
      const d = diaLocal(v.concluida_em || v.criado_em)
      return d.startsWith(mesAnt) && Number(d.slice(8, 10)) <= diaDoMes
    })
    // Só compara quando há vendas desde o começo do mês passado (senão a porcentagem engana).
    const temBase = concluidas.some((v) => diaLocal(v.concluida_em || v.criado_em) <= `${mesAnt}-03`)
    const totalAnt = temBase ? mesAntAteHoje.reduce((s, v) => s + Number(v.total), 0) : 0
    const grafico = []
    for (let i = 13; i >= 0; i--) {
      const d = addDias(hoje, -i)
      const sem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${d}T12:00`).getDay()]
      grafico.push({ rotulo: `${sem} ${dataBR(d).slice(0, 5)}`, curto: dataBR(d).slice(0, 5), valor: porDia.get(d) || 0 })
    }
    const sald = saldos(movs)
    const baixos = produtos.filter((p) => p.controla_estoque && (sald.get(p.id) || 0) <= (Number(p.estoque_minimo) || 0))
    const aPagar = lancamentos.filter((l) => l.tipo === 'despesa' && !l.pago_em && l.vencimento <= addDias(hoje, 7))
    const atrasadas = lancamentos.filter((l) => l.tipo === 'receita' && !l.pago_em && l.vencimento < hoje)
    return {
      hojeTotal: deHoje.reduce((s, v) => s + Number(v.total), 0),
      hojeQtd: deHoje.length,
      totalMes,
      ticket: doMes.length ? totalMes / doMes.length : 0,
      variacao: totalAnt ? ((totalMes - totalAnt) / totalAnt) * 100 : null,
      grafico,
      baixos,
      aPagar,
      atrasadas,
    }
  }, [vendas, movs, produtos, lancamentos, hoje])

  const agendaHoje = agendamentos.filter((a) => String(a.inicio).startsWith(hoje) && a.status !== 'cancelado').sort((a, b) => a.inicio.localeCompare(b.inicio))
  const pedidosAbertos = vendas.filter((v) => v.origem === 'cardapio' && v.status === 'aberta')
  const mesasAbertas = vendas.filter((v) => v.origem === 'mesa' && v.status === 'aberta')
  const osAbertas = ordens.filter((o) => !['entregue', 'cancelada'].includes(o.status))
  const osProntas = ordens.filter((o) => o.status === 'pronta')
  const leadsAtrasados = leads.filter((l) => !['ganho', 'perdido'].includes(l.etapa) && l.proximo_contato && l.proximo_contato <= hoje)
  const funilAberto = leads.filter((l) => !['ganho', 'perdido'].includes(l.etapa)).reduce((s, l) => s + Number(l.valor || 0), 0)
  const vacinasProx = dosesAtuais(vacinas).filter((v) => v.proxima_em && v.proxima_em <= addDias(hoje, 15)).sort((a, b) => a.proxima_em.localeCompare(b.proxima_em))
  const ativosAlunos = matriculas.filter((m) => m.status === 'ativa').length
  const checkinsHoje = presencas.filter((p) => diaLocal(p.criado_em) === hoje).length

  const kpis = [
    ['Vendas hoje', brl(n.hojeTotal), `${n.hojeQtd} ${n.hojeQtd === 1 ? 'venda' : 'vendas'}`],
    ['Faturamento do mês', brl(n.totalMes), n.variacao === null ? 'sem base no mês passado' : `${n.variacao >= 0 ? '▲' : '▼'} ${num(Math.abs(n.variacao), 1)}% vs. mesmo período`, n.variacao === null ? null : n.variacao >= 0 ? 'ok' : 'erro'],
    ['Ticket médio', brl(n.ticket), 'no mês'],
    tem('pedidos') && ['Pedidos em andamento', pedidosAbertos.length, `${mesasAbertas.length} mesas abertas`, pedidosAbertos.some((p) => p.etapa === 'novo') ? 'aviso' : null],
    tem('agenda') && ['Agenda de hoje', agendaHoje.length, `${agendaHoje.filter((a) => a.status === 'concluido').length} atendidos`],
    tem('ordens') && ['OS em aberto', osAbertas.length, `${osProntas.length} prontas para entregar`, osProntas.length ? 'aviso' : null],
    tem('mensalidades') && ['Alunos ativos', ativosAlunos, `${checkinsHoje} check-ins hoje`],
    tem('mensalidades') && [
      'Mensalidades recebidas',
      brl(lancamentos.filter((l) => l.categoria === 'mensalidade' && String(l.pago_em).startsWith(hoje.slice(0, 7))).reduce((s, l) => s + Number(l.valor), 0)),
      'no mês',
    ],
    tem('funil') && ['Funil em aberto', brl(funilAberto), `${leadsAtrasados.length} contatos para hoje`, leadsAtrasados.length ? 'aviso' : null],
    tem('financeiro') && ['A receber vencido', brl(n.atrasadas.reduce((s, l) => s + Number(l.valor), 0)), `${n.atrasadas.length} lançamentos`, n.atrasadas.length ? 'erro' : 'ok'],
  ]

  return (
    <div className="sx-modulo">
      <Topo titulo={`Olá! Este é o painel ${cfg.empresa_nome ? `da ${cfg.empresa_nome}` : ''}`} sub={`${dataBR(hoje)} · ${nicho.nome}`}>
        {tem('pdv') && (
          <button type="button" className="btn btn-primary" onClick={() => ir('pdv')}>
            Nova venda
          </button>
        )}
        {tem('agenda') && (
          <button type="button" className="btn btn-ghost" onClick={() => ir('agenda')}>
            Abrir agenda
          </button>
        )}
      </Topo>
      <Kpis itens={kpis} />

      <div className="sx-grade-2">
        <section className="sx-cartao">
          <h2>Faturamento dos últimos 14 dias</h2>
          <Barras dados={n.grafico} rotulo="Faturamento" />
        </section>

        <section className="sx-cartao">
          <h2>Atenção</h2>
          <ul className="sx-alertas">
            {tem('pedidos') && pedidosAbertos.filter((p) => p.etapa === 'novo').length > 0 && (
              <li>
                <Selo tom="aviso">Pedido</Selo> {pedidosAbertos.filter((p) => p.etapa === 'novo').length} pedidos novos esperando aceite.{' '}
                <button type="button" className="sx-link" onClick={() => ir('pedidos')}>
                  Ver pedidos
                </button>
              </li>
            )}
            {tem('ordens') &&
              osProntas.slice(0, 4).map((o) => (
                <li key={o.id}>
                  <Selo tom="ok">OS #{o.numero}</Selo> {o.equipamento} {o.marca_modelo} pronta.{' '}
                  {clientes.get(o.cliente_id)?.telefone && (
                    <a href={linkWhats(clientes.get(o.cliente_id).telefone, `Olá, ${clientes.get(o.cliente_id).nome}! Seu ${o.equipamento} (OS #${o.numero}) está pronto para retirada.`)} target="_blank" rel="noopener noreferrer">
                      Avisar no WhatsApp
                    </a>
                  )}
                </li>
              ))}
            {n.baixos.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Selo tom="erro">Estoque</Selo> {p.nome} abaixo do mínimo.
              </li>
            ))}
            {tem('financeiro') &&
              n.aPagar.slice(0, 4).map((l) => (
                <li key={l.id}>
                  <Selo tom={l.vencimento < hoje ? 'erro' : 'aviso'}>A pagar</Selo> {l.descricao}: {brl(l.valor)} vence {dataBR(l.vencimento)}.
                </li>
              ))}
            {tem('funil') &&
              leadsAtrasados.slice(0, 4).map((l) => (
                <li key={l.id}>
                  <Selo tom="aviso">Contato</Selo> {l.nome} ({l.empresa}) {l.proximo_contato < hoje ? `atrasado desde ${dataBR(l.proximo_contato)}` : 'para hoje'}.
                </li>
              ))}
            {tem('vacinas') &&
              vacinasProx.slice(0, 4).map((v) => (
                <li key={v.id}>
                  <Selo tom={v.proxima_em < hoje ? 'erro' : 'aviso'}>Vacina</Selo> {pets.get(v.pet_id)?.nome}: {v.vacina} em {dataBR(v.proxima_em)}.
                </li>
              ))}
            {tem('mensalidades') && n.atrasadas.filter((l) => l.categoria === 'mensalidade').length > 0 && (
              <li>
                <Selo tom="erro">Mensalidade</Selo> {n.atrasadas.filter((l) => l.categoria === 'mensalidade').length} mensalidades atrasadas.{' '}
                <button type="button" className="sx-link" onClick={() => ir('mensalidades')}>
                  Cobrar
                </button>
              </li>
            )}
          </ul>
          {!n.baixos.length && !n.aPagar.length && !osProntas.length && !leadsAtrasados.length && !vacinasProx.length && !pedidosAbertos.length && <Vazio>Nada pendente. Tudo em dia!</Vazio>}
        </section>
      </div>

      {tem('agenda') && (
        <section className="sx-cartao">
          <h2>Agenda de hoje</h2>
          {agendaHoje.length === 0 ? (
            <Vazio>Nenhum horário marcado para hoje.</Vazio>
          ) : (
            <ul className="sx-lista-simples">
              {agendaHoje.map((a) => (
                <li key={a.id}>
                  <strong>{horaBR(a.inicio)}</strong> {a.cliente_nome}
                  {a.pet_id && pets.get(a.pet_id) ? ` · ${pets.get(a.pet_id).nome}` : ''} · {servicos.get(a.servico_id)?.nome}
                  <Selo tom={a.status === 'concluido' ? 'ok' : a.status === 'faltou' ? 'erro' : 'neutro'}>{STATUS_AGENDA.find(([s]) => s === a.status)?.[1]}</Selo>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tem('pedidos') && pedidosAbertos.length > 0 && (
        <section className="sx-cartao">
          <h2>Pedidos em andamento</h2>
          <ul className="sx-lista-simples">
            {pedidosAbertos.map((v) => (
              <li key={v.id}>
                <strong>#{v.numero || '—'}</strong> {v.cliente_nome} · {brl(v.total)} <Selo>{ETAPAS_PEDIDO.find(([e]) => e === v.etapa)?.[1]}</Selo>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tem('ordens') && osAbertas.length > 0 && (
        <section className="sx-cartao">
          <h2>Ordens de serviço em aberto</h2>
          <ul className="sx-lista-simples">
            {osAbertas.slice(0, 8).map((o) => (
              <li key={o.id}>
                <strong>#{o.numero || '—'}</strong> {clientes.get(o.cliente_id)?.nome} · {o.equipamento} {o.marca_modelo} <Selo>{STATUS_OS.find(([s]) => s === o.status)?.[1]}</Selo>
                {o.previsao && <small className="muted"> previsão {dataBR(o.previsao)}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
