'use client'

// Funil de vendas (CRM): oportunidades em colunas, arrastar entre etapas, atividades, proposta e ganho -> cliente.

import { useState } from 'react'
import { Formulario, Modal, Selo, Topo, Vazio, useConfig, useSistema, useTabela } from '../base'
import { ItensEditor, htmlProposta, imprimir } from '../comuns'
import { ETAPAS_FUNIL } from '@/lib/sistemas/schema'
import { addDias, brl, dataBR, hojeISO, linkWhats, novoId, totalItens } from '@/lib/sistemas/regras'

const abertas = ETAPAS_FUNIL.filter(([e]) => !['ganho', 'perdido'].includes(e))

export default function Funil() {
  const { banco } = useSistema()
  const leads = useTabela('leads')
  const [ver, setVer] = useState(null)
  const [arrastando, setArrastando] = useState(null)
  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)
  const ganhosMes = leads.filter((l) => l.etapa === 'ganho' && String(l.atualizado_em ? new Date(l.atualizado_em).toISOString() : '').startsWith(mes))
  const fechados = leads.filter((l) => ['ganho', 'perdido'].includes(l.etapa))
  const taxa = fechados.length ? (leads.filter((l) => l.etapa === 'ganho').length / fechados.length) * 100 : 0

  return (
    <div className="sx-modulo">
      <Topo titulo="Funil de vendas" sub={`${leads.filter((l) => !['ganho', 'perdido'].includes(l.etapa)).length} oportunidades abertas · ${ganhosMes.length} ganhas no mês · conversão ${Math.round(taxa)}%`}>
        <button type="button" className="btn btn-primary" onClick={() => setVer({})}>
          Nova oportunidade
        </button>
      </Topo>
      <div className="sx-kanban">
        {[...abertas, ['ganho', 'Ganho'], ['perdido', 'Perdido']].map(([etapa, nome]) => {
          const lista = leads.filter((l) => l.etapa === etapa).sort((a, b) => String(a.proximo_contato || '9').localeCompare(String(b.proximo_contato || '9')))
          const total = lista.reduce((s, l) => s + Number(l.valor || 0), 0)
          return (
            <section
              key={etapa}
              className={`sx-coluna-k ${arrastando ? 'soltavel' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                if (id) banco.salvar('leads', { id, etapa })
                setArrastando(null)
              }}
            >
              <header>
                <h2>{nome}</h2>
                <span className="sx-chip-n">{lista.length}</span>
              </header>
              <p className="small muted">{brl(total)}</p>
              {lista.length === 0 && <Vazio>Arraste para cá</Vazio>}
              {lista.slice(0, etapa === 'ganho' || etapa === 'perdido' ? 8 : 50).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', l.id)
                    setArrastando(l.id)
                  }}
                  onDragEnd={() => setArrastando(null)}
                  className="sx-card-k sx-card-botao"
                  onClick={() => setVer(l)}
                >
                  <span className="sx-card-k-topo">
                    <strong>{l.nome}</strong>
                  </span>
                  <span className="small">{l.empresa}</span>
                  <span className="small muted">{l.interesse}</span>
                  <span className="sx-card-k-pe">
                    <strong>{brl(l.valor)}</strong>
                    {l.proximo_contato && !['ganho', 'perdido'].includes(l.etapa) && <Selo tom={l.proximo_contato < hoje ? 'erro' : l.proximo_contato === hoje ? 'aviso' : 'neutro'}>{dataBR(l.proximo_contato).slice(0, 5)}</Selo>}
                  </span>
                </button>
              ))}
            </section>
          )
        })}
      </div>
      <p className="muted small">No computador, arraste os cartões entre as colunas. No celular, toque no cartão e mude a etapa.</p>
      {ver && <Oportunidade lead={ver} onFechar={() => setVer(null)} />}
    </div>
  )
}

function Oportunidade({ lead, onFechar }) {
  const { banco, usuario } = useSistema()
  const cfg = useConfig()
  const atividades = useTabela('atividades').filter((a) => a.lead_id === lead.id)
  const propostas = useTabela('vendas').filter((v) => v.ref_id === lead.id && v.status === 'orcamento')
  const [aba, setAba] = useState('dados')
  const [nova, setNova] = useState('')
  const [itens, setItens] = useState([])
  const atual = lead.id ? banco.get('leads', lead.id) || lead : lead

  if (!lead.id) return <Modal titulo="Nova oportunidade" onFechar={onFechar} largo><Formulario tabela="leads" onSalvo={onFechar} onCancelar={onFechar} /></Modal>

  const ganhar = () => {
    let clienteId = atual.cliente_id
    if (!clienteId) clienteId = banco.salvar('clientes', { nome: atual.nome, empresa: atual.empresa, telefone: atual.telefone, email: atual.email, obs: `Veio do funil (${atual.origem || 'sem origem'})` }).id
    // A venda entra no faturamento e o dinheiro, no contas a receber (a prazo).
    const valor = Number(atual.valor) || 0
    const proposta = banco.lista('vendas').find((v) => v.ref_id === atual.id && v.status === 'orcamento')
    const vendaId = proposta?.id || novoId()
    const itens = proposta?.itens || [{ produto_id: '', nome: atual.interesse || 'Serviço', qtd: 1, preco: valor }]
    const total = proposta?.total ?? valor
    banco.salvarVarios([
      ['leads', { id: atual.id, etapa: 'ganho', cliente_id: clienteId, proximo_contato: '' }],
      ['vendas', { id: vendaId, itens, subtotal: totalItens(itens), total, status: 'concluida', origem: 'proposta', cliente_id: clienteId, cliente_nome: atual.empresa || atual.nome, telefone: atual.telefone, pagamentos: [{ forma: 'fiado', valor: total }], concluida_em: new Date().toISOString(), ref_id: atual.id, operador: usuario }],
      ['lancamentos', { tipo: 'receita', descricao: `${atual.interesse || 'Venda'} - ${atual.empresa || atual.nome}`, valor: total, vencimento: addDias(hojeISO(), 7), categoria: 'servico', cliente_id: clienteId, ref_id: vendaId }],
    ])
    onFechar()
  }

  return (
    <Modal
      titulo={`${atual.nome}${atual.empresa ? ` · ${atual.empresa}` : ''}`}
      onFechar={onFechar}
      largo
      rodape={
        !['ganho', 'perdido'].includes(atual.etapa) && (
          <>
            <button type="button" className="btn btn-primary" onClick={ganhar}>
              Marcar como ganho
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const motivo = prompt('Motivo da perda (preço, concorrente, sem retorno…)')
                if (motivo === null) return
                banco.salvar('leads', { id: atual.id, etapa: 'perdido', motivo_perda: motivo, proximo_contato: '' })
                onFechar()
              }}
            >
              Marcar como perdido
            </button>
            {atual.telefone && (
              <a className="btn btn-ghost" href={linkWhats(atual.telefone, `Olá, ${atual.nome.split(' ')[0]}! Tudo bem? Aqui é da ${cfg.empresa_nome || 'nossa empresa'}.`)} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            )}
          </>
        )
      }
    >
      <div className="tabs">
        {[
          ['dados', 'Dados'],
          ['atividades', `Atividades (${atividades.length})`],
          ['proposta', `Propostas (${propostas.length})`],
        ].map(([id, r]) => (
          <button key={id} type="button" className={aba === id ? 'tab active' : 'tab'} onClick={() => setAba(id)}>
            {r}
          </button>
        ))}
      </div>
      {aba === 'dados' && <Formulario tabela="leads" registro={atual} onSalvo={onFechar} />}
      {aba === 'atividades' && (
        <div className="sx-stack">
          <form
            className="sx-linha"
            onSubmit={(e) => {
              e.preventDefault()
              if (!nova.trim()) return
              banco.salvar('atividades', { lead_id: atual.id, tipo: 'tarefa', descricao: nova.trim(), data: hojeISO(), feita: false })
              setNova('')
            }}
          >
            <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova atividade: ligar, enviar proposta…" />
            <button type="submit" className="btn btn-ghost">
              Adicionar
            </button>
          </form>
          <ul className="sx-lista-simples">
            {atividades
              .sort((a, b) => String(b.data).localeCompare(String(a.data)))
              .map((a) => (
                <li key={a.id}>
                  <label className="check">
                    <input type="checkbox" checked={Boolean(a.feita)} onChange={(e) => banco.salvar('atividades', { id: a.id, feita: e.target.checked })} />
                    <span className={a.feita ? 'sx-riscado' : ''}>{a.descricao}</span>
                  </label>
                  <small className="muted">{dataBR(a.data)}</small>
                </li>
              ))}
          </ul>
          {atividades.length === 0 && <Vazio>Nenhuma atividade.</Vazio>}
        </div>
      )}
      {aba === 'proposta' && (
        <div className="sx-stack">
          {propostas.map((p) => (
            <div key={p.id} className="sx-linha">
              <span>
                Proposta #{p.numero || '—'} de {dataBR(p.criado_em)}: <strong>{brl(p.total)}</strong>
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => imprimir(htmlProposta(p, cfg), { titulo: `Proposta ${p.numero}` })}>
                Imprimir / PDF
              </button>
            </div>
          ))}
          <h3>Nova proposta</h3>
          <ItensEditor itens={itens} onChange={setItens} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!itens.length}
            onClick={() => {
              const total = totalItens(itens)
              const v = banco.salvar('vendas', { itens, subtotal: total, total, status: 'orcamento', origem: 'proposta', cliente_id: atual.cliente_id || '', cliente_nome: `${atual.nome}${atual.empresa ? ` (${atual.empresa})` : ''}`, telefone: atual.telefone, ref_id: atual.id, pagamentos: [], operador: usuario })
              banco.salvar('leads', { id: atual.id, valor: total, etapa: ['novo', 'qualificado'].includes(atual.etapa) ? 'proposta' : atual.etapa })
              setItens([])
              imprimir(htmlProposta(v, cfg), { titulo: 'Proposta' })
            }}
          >
            Salvar e imprimir proposta
          </button>
        </div>
      )}
    </Modal>
  )
}
