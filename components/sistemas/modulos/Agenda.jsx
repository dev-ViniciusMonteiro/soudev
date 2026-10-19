'use client'

// Agenda do dia com uma coluna por profissional. Concluir o atendimento gera a venda (com comissão no relatório).
// Pedidos do agendamento online chegam como "pendente" e o profissional aceita ou recusa; bloqueios fecham horários.

import { useMemo, useState } from 'react'
import { Combo, Modal, Selo, Topo, Vazio, useConfig, useMapa, useSistema, useTabela } from '../base'
import { ItensEditor, Pagamento } from '../comuns'
import { concluirVenda } from '@/lib/sistemas/acoes'
import { STATUS_AGENDA } from '@/lib/sistemas/schema'
import { addDias, brl, dataBR, hhmm, hojeISO, linkWhats, minutos, ocupaHorario, totalItens } from '@/lib/sistemas/regras'
import { linkPublico } from './Pedidos'

const PX_MIN = 1.6
const tomStatus = { pendente: 'aviso', agendado: 'neutro', confirmado: 'info', atendimento: 'aviso', concluido: 'ok', faltou: 'erro', cancelado: 'erro', recusado: 'erro', bloqueio: 'neutro' }
const nomeStatus = (s) => STATUS_AGENDA.find(([id]) => id === s)?.[1] ?? s
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const fora = ['cancelado', 'recusado']
const quandoTexto = (a) => `${SEMANA[new Date(`${String(a.inicio).slice(0, 10)}T12:00`).getDay()]}, ${dataBR(String(a.inicio).slice(0, 10))} às ${String(a.inicio).slice(11, 16)}`

export default function Agenda() {
  const { conexao, nicho } = useSistema()
  const cfg = useConfig()
  const profissionais = useTabela('profissionais')
  const agendamentos = useTabela('agendamentos')
  const servicos = useMapa('produtos')
  const pets = useMapa('pets')
  const [dia, setDia] = useState(hojeISO)
  const [editar, setEditar] = useState(null)
  const [bloquear, setBloquear] = useState(null)
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
  const atendimentos = doDia.filter((a) => !fora.includes(a.status) && a.status !== 'bloqueio')

  return (
    <div className="sx-modulo">
      <Topo titulo="Agenda" sub={`${semana}, ${dataBR(dia)} · ${atendimentos.length} horários · ${brl(faturamento)} atendidos`}>
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
        <button type="button" className="btn btn-ghost" onClick={() => setBloquear({ de: dia, ate: dia, profissional_id: '', inteiro: true, das: hhmm(abre), as: hhmm(fecha) })}>
          Bloquear horário
        </button>
        <a className="btn btn-ghost" href={linkPublico(conexao, nicho, 'agendar')} target="_blank" rel="noopener noreferrer">
          Agendamento online ↗
        </a>
      </Topo>

      <Pendentes agendamentos={agendamentos} onAbrir={(a) => (setDia(String(a.inicio).slice(0, 10)), setEditar(a))} />

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
                  .filter((a) => !fora.includes(a.status) && (a.profissional_id === p.id || (a.status === 'bloqueio' && !a.profissional_id)))
                  .map((a) => {
                    const i = minutos(String(a.inicio).slice(11, 16))
                    const f = minutos(String(a.fim || a.inicio).slice(11, 16)) || i + passo
                    const pet = a.pet_id ? pets.get(a.pet_id) : null
                    if (a.status === 'bloqueio') {
                      const topo = Math.max(i, abre)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className="sx-evento st-bloqueio"
                          style={{ top: (topo - abre) * PX_MIN, height: Math.max(22, (Math.min(f, fecha) - topo) * PX_MIN - 2) }}
                          onClick={() => setBloquear({ ...a, de: String(a.inicio).slice(0, 10), ate: String(a.inicio).slice(0, 10), das: String(a.inicio).slice(11, 16), as: String(a.fim).slice(11, 16), inteiro: false })}
                        >
                          <strong>🔒 {a.obs || 'Bloqueado'}</strong>
                          <span>
                            {String(a.inicio).slice(11, 16)} às {String(a.fim).slice(11, 16)}
                            {!a.profissional_id && ' · todos'}
                          </span>
                        </button>
                      )
                    }
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
      {bloquear && <Bloqueio inicial={bloquear} profissionais={ativos} onFechar={() => setBloquear(null)} />}
    </div>
  )
}

/** Pedidos do agendamento online esperando resposta, do mais próximo para o mais distante. */
function Pendentes({ agendamentos, onAbrir }) {
  const { banco } = useSistema()
  const cfg = useConfig()
  const servicos = useMapa('produtos')
  const profs = useMapa('profissionais')
  const desde = `${hojeISO()}T00:00`
  const lista = agendamentos.filter((a) => a.status === 'pendente' && String(a.inicio) >= desde).sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)))
  if (!lista.length) return null
  const responder = (a, status) => banco.salvar('agendamentos', { id: a.id, status })
  const mensagem = (a, aceito) => {
    const s = servicos.get(a.servico_id)?.nome ?? 'atendimento'
    const p = profs.get(a.profissional_id)?.nome ?? ''
    return aceito
      ? `Olá, ${a.cliente_nome}! Seu horário de ${s}${p ? ` com ${p}` : ''} em ${quandoTexto(a)} está confirmado na ${cfg.empresa_nome || 'loja'}. Até lá!`
      : `Olá, ${a.cliente_nome}! Infelizmente não conseguimos atender ${s} em ${quandoTexto(a)}. Pode escolher outro horário pelo nosso link de agendamento?`
  }
  return (
    <section className="sx-cartao sx-pendentes">
      <h2>
        Pedidos de horário <span className="sx-chip-n">{lista.length}</span>
      </h2>
      <ul>
        {lista.map((a) => (
          <li key={a.id}>
            <button type="button" className="sx-pendente-info" onClick={() => onAbrir(a)}>
              <strong>{quandoTexto(a)}</strong>
              <span>
                {a.cliente_nome} · {servicos.get(a.servico_id)?.nome ?? 'Serviço'} · {profs.get(a.profissional_id)?.nome ?? ''}
              </span>
            </button>
            <div className="sx-pendente-acoes">
              <button type="button" className="btn btn-primary" onClick={() => responder(a, 'confirmado')}>
                Aceitar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => responder(a, 'recusado')}>
                Recusar
              </button>
              {a.telefone && (
                <>
                  <a className="btn btn-ghost" href={linkWhats(a.telefone, mensagem(a, true))} target="_blank" rel="noopener noreferrer" title="Abre o WhatsApp com a confirmação pronta">
                    WhatsApp ✓
                  </a>
                  <a className="btn btn-ghost" href={linkWhats(a.telefone, mensagem(a, false))} target="_blank" rel="noopener noreferrer" title="Abre o WhatsApp avisando que não dá">
                    WhatsApp ✕
                  </a>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Fecha um período da agenda (almoço, folga, férias) de um profissional ou de todos.
 * Vira um registro "bloqueio" por dia, para cada dia continuar sendo lido sozinho pela agenda e pelo site.
 */
function Bloqueio({ inicial, profissionais, onFechar }) {
  const { banco } = useSistema()
  const cfg = useConfig()
  const [b, setB] = useState(inicial)
  const [erro, setErro] = useState('')
  const set = (k, v) => setB((s) => ({ ...s, [k]: v }))
  const existente = Boolean(inicial.id)
  const das = b.inteiro ? cfg.abre || '09:00' : b.das
  const as = b.inteiro ? cfg.fecha || '19:00' : b.as
  const diasDoPeriodo = []
  for (let d = b.de; d && b.ate && d <= b.ate && diasDoPeriodo.length < 62; d = addDias(d, 1)) diasDoPeriodo.push(d)
  const afetados = banco
    .lista('agendamentos')
    .filter(
      (a) =>
        a.status !== 'bloqueio' &&
        !['cancelado', 'faltou', 'recusado'].includes(a.status) &&
        (!b.profissional_id || a.profissional_id === b.profissional_id) &&
        diasDoPeriodo.some((d) => String(a.inicio).startsWith(d)) &&
        String(a.inicio).slice(11, 16) < as &&
        String(a.fim || a.inicio).slice(11, 16) > das,
    )

  const salvar = () => {
    if (!diasDoPeriodo.length) return setErro('Confira as datas.')
    if (minutos(as) <= minutos(das)) return setErro('O fim precisa ser depois do começo.')
    const base = { status: 'bloqueio', profissional_id: b.profissional_id || '', cliente_nome: `Bloqueio: ${b.obs || 'agenda fechada'}`, obs: b.obs || '', origem: 'balcao', valor: 0 }
    if (existente) banco.salvar('agendamentos', { ...base, id: b.id, inicio: `${b.de}T${das}`, fim: `${b.de}T${as}` })
    else banco.salvarVarios(diasDoPeriodo.map((d) => ['agendamentos', { ...base, inicio: `${d}T${das}`, fim: `${d}T${as}` }]))
    onFechar()
  }

  return (
    <Modal
      titulo={existente ? 'Horário bloqueado' : 'Bloquear horário'}
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className="btn btn-primary" onClick={salvar}>
            {existente ? 'Salvar' : 'Bloquear'}
          </button>
          {existente && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                banco.excluir('agendamentos', b.id)
                onFechar()
              }}
            >
              Desbloquear
            </button>
          )}
        </>
      }
    >
      <p className="muted small">Os horários bloqueados somem do agendamento online assim que a planilha sincronizar.</p>
      <div className="sx-form-grid">
        <label className="field">
          <span className="field-label">Profissional</span>
          <select value={b.profissional_id || ''} onChange={(e) => set('profissional_id', e.target.value)}>
            <option value="">Todos (a loja inteira)</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Motivo</span>
          <input value={b.obs || ''} onChange={(e) => set('obs', e.target.value)} placeholder="Almoço, folga, férias, curso…" />
        </label>
        <label className="field">
          <span className="field-label">{existente ? 'Dia' : 'De'}</span>
          <input type="date" value={b.de} onChange={(e) => e.target.value && setB((s) => ({ ...s, de: e.target.value, ate: s.ate < e.target.value ? e.target.value : s.ate }))} />
        </label>
        {!existente && (
          <label className="field">
            <span className="field-label">Até</span>
            <input type="date" value={b.ate} min={b.de} onChange={(e) => e.target.value && set('ate', e.target.value)} />
          </label>
        )}
        <label className="sx-marcar">
          <input type="checkbox" checked={b.inteiro} onChange={(e) => set('inteiro', e.target.checked)} />
          Dia inteiro
        </label>
        {!b.inteiro && (
          <>
            <label className="field">
              <span className="field-label">Das</span>
              <input type="time" value={b.das} onChange={(e) => set('das', e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Às</span>
              <input type="time" value={b.as} onChange={(e) => set('as', e.target.value)} />
            </label>
          </>
        )}
      </div>
      {!existente && diasDoPeriodo.length > 1 && <p className="muted small">Serão bloqueados {diasDoPeriodo.length} dias.</p>}
      {afetados.length > 0 && <p className="notice warn">Já existem {afetados.length} horário(s) marcados nesse período. Eles continuam na agenda: remarque ou cancele se precisar.</p>}
      {erro && <p className="notice error">{erro}</p>}
    </Modal>
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
      .find((x) => x.id !== a.id && ocupaHorario(x, a.profissional_id) && String(x.inicio).slice(0, 10) === inicio.slice(0, 10) && x.inicio < fim && (x.fim || x.inicio) > inicio)
    const oQue = conflito?.status === 'bloqueio' ? `o horário bloqueado (${conflito.obs || 'agenda fechada'})` : `${conflito?.cliente_nome} às ${String(conflito?.inicio).slice(11, 16)}`
    if (conflito && !extra.status && !confirm(`${prof?.nome} já tem ${oQue}. Marcar mesmo assim (encaixe)?`)) return
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
              ['confirmado', a.status === 'pendente' ? 'Aceitar' : 'Confirmar'],
              ...(a.status === 'pendente' ? [['recusado', 'Recusar']] : []),
              ['atendimento', 'Iniciar'],
              ['faltou', 'Faltou'],
              ['cancelado', 'Cancelar'],
            ]
              .filter(([s]) => s !== a.status && a.status !== 'concluido' && (a.status !== 'pendente' || ['confirmado', 'recusado'].includes(s)))
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
