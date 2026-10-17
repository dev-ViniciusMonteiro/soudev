'use client'

// Agenda do dia com uma coluna por profissional. Concluir o atendimento gera a venda (com comissão no relatório).

import { useMemo, useState } from 'react'
import { Combo, Modal, Selo, Topo, Vazio, useConfig, useMapa, useSistema, useTabela } from '../base'
import { ItensEditor, Pagamento } from '../comuns'
import { concluirVenda } from '@/lib/sistemas/acoes'
import { STATUS_AGENDA } from '@/lib/sistemas/schema'
import { addDias, brl, dataBR, hhmm, hojeISO, linkWhats, minutos, totalItens } from '@/lib/sistemas/regras'
import { linkPublico } from './Pedidos'

const PX_MIN = 1.6
const tomStatus = { agendado: 'neutro', confirmado: 'info', atendimento: 'aviso', concluido: 'ok', faltou: 'erro', cancelado: 'erro' }
const nomeStatus = (s) => STATUS_AGENDA.find(([id]) => id === s)?.[1] ?? s

export default function Agenda() {
  const { conexao, nicho } = useSistema()
  const cfg = useConfig()
  const profissionais = useTabela('profissionais')
  const agendamentos = useTabela('agendamentos')
  const servicos = useMapa('produtos')
  const pets = useMapa('pets')
  const [dia, setDia] = useState(hojeISO)
  const [editar, setEditar] = useState(null)
  const ativos = profissionais.filter((p) => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome))
  const abre = minutos(cfg.abre || '08:00')
  const fecha = Math.max(abre + 60, minutos(cfg.fecha || '19:00'))
  const passo = Math.max(10, Number(cfg.intervalo_agenda) || 30)
  const doDia = useMemo(() => agendamentos.filter((a) => String(a.inicio).startsWith(dia)), [agendamentos, dia])
  const linhas = []
  for (let t = abre; t < fecha; t += passo) linhas.push(t)
  const agora = new Date()
  const agoraMin = hojeISO() === dia ? agora.getHours() * 60 + agora.getMinutes() : null
  const semana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(`${dia}T12:00`).getDay()]
  const faturamento = doDia.filter((a) => a.status === 'concluido').reduce((s, a) => s + Number(a.valor || 0), 0)

  return (
    <div className="sx-modulo">
      <Topo titulo="Agenda" sub={`${semana}, ${dataBR(dia)} · ${doDia.filter((a) => a.status !== 'cancelado').length} horários · ${brl(faturamento)} atendidos`}>
        <div className="sx-navdia">
          <button type="button" className="icon-btn" aria-label="Dia anterior" onClick={() => setDia((d) => addDias(d, -1))}>
            ‹
          </button>
          <input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} aria-label="Dia" />
          <button type="button" className="icon-btn" aria-label="Próximo dia" onClick={() => setDia((d) => addDias(d, 1))}>
            ›
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setDia(hojeISO())}>
            Hoje
          </button>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditar({ inicio: `${dia}T${hhmm(abre)}`, profissional_id: ativos[0]?.id })}>
          Novo horário
        </button>
        <a className="btn btn-ghost" href={linkPublico(conexao, nicho, 'agendar')} target="_blank" rel="noopener noreferrer">
          Agendamento online ↗
        </a>
      </Topo>

      {ativos.length === 0 ? (
        <Vazio>Cadastre os profissionais para montar a agenda.</Vazio>
      ) : (
        <div className="sx-agenda" style={{ '--cols': ativos.length }}>
          <div className="sx-agenda-cab">
            <span />
            {ativos.map((p) => (
              <strong key={p.id} style={{ '--cor-prof': p.cor || 'var(--sx-cor)' }}>
                <i aria-hidden="true" /> {p.nome}
              </strong>
            ))}
          </div>
          <div className="sx-agenda-corpo" style={{ height: (fecha - abre) * PX_MIN }}>
            <div className="sx-agenda-horas">
              {linhas.map((t) => (
                <span key={t} style={{ top: (t - abre) * PX_MIN }}>
                  {hhmm(t)}
                </span>
              ))}
            </div>
            {ativos.map((p) => (
              <div key={p.id} className="sx-agenda-col">
                {linhas.map((t) => (
                  <button key={t} type="button" className="sx-slot" style={{ top: (t - abre) * PX_MIN, height: passo * PX_MIN }} aria-label={`Marcar ${hhmm(t)} com ${p.nome}`} onClick={() => setEditar({ inicio: `${dia}T${hhmm(t)}`, profissional_id: p.id })} />
                ))}
                {doDia
                  .filter((a) => a.profissional_id === p.id && a.status !== 'cancelado')
                  .map((a) => {
                    const i = minutos(String(a.inicio).slice(11, 16))
                    const f = minutos(String(a.fim || a.inicio).slice(11, 16)) || i + passo
                    const pet = a.pet_id ? pets.get(a.pet_id) : null
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`sx-evento st-${a.status}`}
                        style={{ top: (i - abre) * PX_MIN, height: Math.max(22, (f - i) * PX_MIN - 2), '--cor-prof': p.cor || 'var(--sx-cor)' }}
                        onClick={() => setEditar(a)}
                      >
                        <strong>
                          {String(a.inicio).slice(11, 16)} {a.cliente_nome}
                        </strong>
                        <span>
                          {pet ? `🐾 ${pet.nome} · ` : ''}
                          {servicos.get(a.servico_id)?.nome}
                        </span>
                        <Selo tom={tomStatus[a.status]}>{nomeStatus(a.status)}</Selo>
                      </button>
                    )
                  })}
              </div>
            ))}
            {agoraMin !== null && agoraMin > abre && agoraMin < fecha && <i className="sx-agora" style={{ top: (agoraMin - abre) * PX_MIN }} />}
          </div>
        </div>
      )}
      {editar && <Atendimento inicial={editar} onFechar={() => setEditar(null)} />}
    </div>
  )
}

function Atendimento({ inicial, onFechar }) {
  const { banco, nicho, usuario } = useSistema()
  const cfg = useConfig()
  const servicos = useTabela('produtos')
  const profissionais = useTabela('profissionais')
  const [a, setA] = useState(() => ({ status: 'agendado', origem: 'balcao', ...inicial }))
  const [cobrar, setCobrar] = useState(false)
  const [extras, setExtras] = useState([])
  const [erro, setErro] = useState('')
  const novo = !inicial.id
  const servico = servicos.find((s) => s.id === a.servico_id)
  const prof = profissionais.find((p) => p.id === a.profissional_id)
  const cliente = banco.get('clientes', a.cliente_id)
  const pet = a.pet_id ? banco.get('pets', a.pet_id) : null
  const petshop = nicho.modulos.includes('vacinas') || nicho.slug === 'petshop'
  const set = (k, v) => setA((s) => ({ ...s, [k]: v }))

  const salvar = (extra = {}) => {
    if (!a.cliente_id && !a.cliente_nome) return setErro('Escolha o cliente.')
    if (!a.servico_id) return setErro('Escolha o serviço.')
    const dur = Number(servico?.duracao_min) || Number(cfg.intervalo_agenda) || 30
    const inicio = String(a.inicio).slice(0, 16)
    const fim = `${inicio.slice(0, 10)}T${hhmm(minutos(inicio.slice(11, 16)) + dur)}`
    const conflito = banco
      .lista('agendamentos')
      .find((x) => x.id !== a.id && x.profissional_id === a.profissional_id && !['cancelado', 'faltou'].includes(x.status) && String(x.inicio).slice(0, 10) === inicio.slice(0, 10) && x.inicio < fim && (x.fim || x.inicio) > inicio)
    if (conflito && !extra.status && !confirm(`${prof?.nome} já tem ${conflito.cliente_nome} às ${String(conflito.inicio).slice(11, 16)}. Marcar mesmo assim (encaixe)?`)) return
    const salvo = banco.salvar('agendamentos', {
      ...a,
      inicio,
      fim,
      cliente_nome: cliente?.nome || a.cliente_nome,
      telefone: cliente?.telefone || a.telefone || '',
      valor: a.valor === undefined || a.valor === '' || a.servico_id !== inicial.servico_id ? Number(servico?.preco) || 0 : a.valor,
      ...extra,
    })
    return salvo
  }

  const whats = cliente?.telefone || a.telefone
  const quando = `${dataBR(String(a.inicio).slice(0, 10))} às ${String(a.inicio).slice(11, 16)}`

  return (
    <Modal
      titulo={novo ? 'Novo horário' : `${a.cliente_nome || 'Atendimento'} · ${quando}`}
      onFechar={onFechar}
      largo
      rodape={
        <>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (salvar()) onFechar()
            }}
          >
            Salvar
          </button>
          {!novo && !['concluido', 'cancelado'].includes(a.status) && (
            <button type="button" className="btn btn-primary" onClick={() => setCobrar(true)}>
              Concluir e cobrar
            </button>
          )}
          {!novo &&
            [
              ['confirmado', 'Confirmar'],
              ['atendimento', 'Iniciar'],
              ['faltou', 'Faltou'],
              ['cancelado', 'Cancelar'],
            ]
              .filter(([s]) => s !== a.status && a.status !== 'concluido')
              .map(([s, r]) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (salvar({ status: s })) onFechar()
                  }}
                >
                  {r}
                </button>
              ))}
        </>
      }
    >
      <div className="sx-form-grid">
        <div className="field">
          <span className="field-label">{nicho.rotulos.clientes === 'Tutores' ? 'Tutor' : 'Cliente'} *</span>
          <Combo tabela="clientes" value={a.cliente_id} onChange={(v) => setA((s) => ({ ...s, cliente_id: v, pet_id: '' }))} />
          {!a.cliente_id && <input placeholder="ou digite só o nome" value={a.cliente_nome || ''} onChange={(e) => set('cliente_nome', e.target.value)} />}
        </div>
        {petshop && (
          <div className="field">
            <span className="field-label">Pet</span>
            <Combo tabela="pets" value={a.pet_id} onChange={(v) => set('pet_id', v)} filtro={a.cliente_id ? (p) => p.cliente_id === a.cliente_id : undefined} />
          </div>
        )}
        <div className="field">
          <span className="field-label">Serviço *</span>
          <select value={a.servico_id || ''} onChange={(e) => setA((s) => ({ ...s, servico_id: e.target.value, valor: '' }))}>
            <option value="">—</option>
            {servicos
              .filter((s) => s.tipo === 'servico' && s.ativo !== false)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} · {brl(s.preco)} · {s.duracao_min || 30} min
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Profissional</span>
          <select value={a.profissional_id || ''} onChange={(e) => set('profissional_id', e.target.value)}>
            {profissionais
              .filter((p) => p.ativo !== false)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Data e hora</span>
          <input type="datetime-local" value={String(a.inicio).slice(0, 16)} onChange={(e) => set('inicio', e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">Observações</span>
          <input value={a.obs || ''} onChange={(e) => set('obs', e.target.value)} />
        </div>
      </div>
      {pet?.alergias && <p className="notice warn">Cuidado: {pet.alergias}</p>}
      {!novo && (
        <p className="muted small">
          {nomeStatus(a.status)} · marcado {a.origem === 'online' ? 'pelo agendamento online' : 'no balcão'}
          {whats && (
            <>
              {' · '}
              <a href={linkWhats(whats, `Olá, ${a.cliente_nome}! Confirmando seu horário de ${servico?.nome ?? 'atendimento'}${pet ? ` para o(a) ${pet.nome}` : ''} com ${prof?.nome ?? ''} em ${quando} na ${cfg.empresa_nome || 'loja'}. Podemos confirmar?`)} target="_blank" rel="noopener noreferrer">
                Confirmar pelo WhatsApp
              </a>
            </>
          )}
        </p>
      )}
      {erro && <p className="notice error">{erro}</p>}
      {cobrar === true && (
        <Modal
          titulo="Concluir atendimento"
          onFechar={() => setCobrar(false)}
          largo
          rodape={
            <button type="button" className="btn btn-primary" onClick={() => setCobrar('pagar')}>
              Ir para o pagamento
            </button>
          }
        >
          <p className="muted">Adicione produtos vendidos junto, se houver.</p>
          <ItensEditor itens={extras} onChange={setExtras} filtro={(p) => p.tipo !== 'servico'} />
          <p>
            Total: <strong>{brl((Number(a.valor) || Number(servico?.preco) || 0) + totalItens(extras))}</strong>
          </p>
        </Modal>
      )}
      {cobrar === 'pagar' && (
          <Pagamento
            total={(Number(a.valor) || Number(servico?.preco) || 0) + totalItens(extras)}
            cliente={cliente}
            titulo="Receber"
            onFechar={() => setCobrar(false)}
            onConfirmar={(pagamentos, troco) => {
              const ag = salvar({ status: 'concluido' })
              if (!ag) return
              const itens = [{ produto_id: servico?.id, nome: servico?.nome ?? 'Serviço', qtd: 1, preco: Number(ag.valor) || 0 }, ...extras]
              const v = concluirVenda(banco, {
                venda: { itens, cliente_id: ag.cliente_id, cliente_nome: ag.cliente_nome, telefone: ag.telefone, origem: 'agenda', profissional_id: ag.profissional_id, ref_id: ag.id },
                pagamentos,
                troco,
                operador: usuario,
              })
              banco.salvar('agendamentos', { id: ag.id, venda_id: v.id })
              onFechar()
            }}
          />
      )}
    </Modal>
  )
}
