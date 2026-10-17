'use client'

// Ordens de serviço: quadro por situação, ficha completa, impressão e entrega com pagamento.

import { useMemo, useState } from 'react'
import { Combo, Modal, Selo, Topo, Vazio, useConfig, useMapa, useSistema, useTabela } from '../base'
import { ItensEditor, Pagamento, htmlOS, imprimir } from '../comuns'
import { concluirVenda } from '@/lib/sistemas/acoes'
import { STATUS_OS } from '@/lib/sistemas/schema'
import { brl, dataBR, hojeISO, linkWhats, totalItens } from '@/lib/sistemas/regras'
import { linkPublico } from './Pedidos'

const CHECK = ['liga', 'tela', 'touch', 'camera', 'som', 'microfone', 'wifi', 'carrega', 'biometria', 'botoes']
const abertas = ['aberta', 'orcamento', 'aprovada', 'execucao', 'pronta']
const nome = (s) => STATUS_OS.find(([id]) => id === s)?.[1] ?? s

export default function Ordens() {
  const ordens = useTabela('ordens')
  const clientes = useMapa('clientes')
  const [editar, setEditar] = useState(null)
  const [busca, setBusca] = useState('')
  const hoje = hojeISO()
  const q = busca.trim().toLowerCase()
  const filtradas = useMemo(
    () => ordens.filter((o) => !q || [o.numero, o.equipamento, o.marca_modelo, o.serie, clientes.get(o.cliente_id)?.nome, o.codigo_publico].some((v) => String(v ?? '').toLowerCase().includes(q))),
    [ordens, q, clientes],
  )
  const finalizadas = filtradas.filter((o) => !abertas.includes(o.status)).slice(0, 40)

  return (
    <div className="sx-modulo">
      <Topo titulo="Ordens de serviço" sub={`${ordens.filter((o) => abertas.includes(o.status)).length} em aberto · ${ordens.filter((o) => o.status === 'pronta').length} prontas`}>
        <input className="sx-busca" placeholder="Buscar nº, cliente, aparelho, IMEI…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={() => setEditar({})}>
          Nova OS
        </button>
      </Topo>
      <div className="sx-kanban">
        {abertas.map((st) => {
          const lista = filtradas.filter((o) => o.status === st)
          return (
            <section key={st} className="sx-coluna-k">
              <header>
                <h2>{nome(st)}</h2>
                <span className="sx-chip-n">{lista.length}</span>
              </header>
              {lista.length === 0 && <Vazio>—</Vazio>}
              {lista.map((o) => (
                <button key={o.id} type="button" className="sx-card-k sx-card-botao" onClick={() => setEditar(o)}>
                  <span className="sx-card-k-topo">
                    <strong>#{o.numero || '—'}</strong>
                    <span>{clientes.get(o.cliente_id)?.nome}</span>
                  </span>
                  <span className="small">
                    {o.equipamento} {o.marca_modelo}
                  </span>
                  <span className="small muted sx-corta">{o.defeito}</span>
                  <span className="sx-card-k-pe">
                    <strong>{Number(o.total) ? brl(o.total) : 'sem orçamento'}</strong>
                    {o.previsao && <Selo tom={o.previsao < hoje ? 'erro' : 'neutro'}>{dataBR(o.previsao).slice(0, 5)}</Selo>}
                  </span>
                </button>
              ))}
            </section>
          )
        })}
      </div>
      <section className="sx-cartao">
        <h2>Entregues e canceladas</h2>
        {finalizadas.length === 0 ? (
          <Vazio>Nenhuma.</Vazio>
        ) : (
          <div className="table-wrap">
            <table className="table sx-tabela-clique">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Equipamento</th>
                  <th>Total</th>
                  <th>Situação</th>
                  <th>Entrada</th>
                </tr>
              </thead>
              <tbody>
                {finalizadas.map((o) => (
                  <tr key={o.id} onClick={() => setEditar(o)}>
                    <td>#{o.numero}</td>
                    <td>{clientes.get(o.cliente_id)?.nome}</td>
                    <td>
                      {o.equipamento} {o.marca_modelo}
                    </td>
                    <td>{brl(o.total)}</td>
                    <td>
                      <Selo tom={o.status === 'entregue' ? 'ok' : 'erro'}>{nome(o.status)}</Selo>
                    </td>
                    <td>{dataBR(o.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editar && <FichaOS inicial={editar} onFechar={() => setEditar(null)} />}
    </div>
  )
}

function FichaOS({ inicial, onFechar }) {
  const { banco, usuario, conexao, nicho } = useSistema()
  const cfg = useConfig()
  const [os, setOs] = useState(() => ({ status: 'aberta', garantia_dias: 90, checklist: {}, itens: [], ...inicial }))
  const [cobrar, setCobrar] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setOs((s) => ({ ...s, [k]: v }))
  const cliente = banco.get('clientes', os.cliente_id)
  const total = totalItens(os.itens)
  const travada = ['entregue', 'cancelada'].includes(inicial.status)

  const salvar = (extra = {}) => {
    if (!os.cliente_id) return setErro('Escolha o cliente.')
    if (!String(os.equipamento || '').trim()) return setErro('Informe o equipamento.')
    if (!String(os.defeito || '').trim()) return setErro('Descreva o defeito.')
    const salvo = banco.salvar('ordens', { ...os, total, ...extra })
    setOs(salvo)
    return salvo
  }

  const acompanhar = `${typeof window !== 'undefined' ? window.location.origin : ''}${linkPublico(conexao, nicho, 'acompanhar')}&c=${os.codigo_publico || ''}`
  const msg = {
    orcamento: `Olá, ${cliente?.nome}! O orçamento do seu ${os.equipamento} (OS #${os.numero}) ficou em ${brl(total)}. ${os.laudo ? `Laudo: ${os.laudo}. ` : ''}Podemos seguir com o serviço?`,
    pronta: `Olá, ${cliente?.nome}! Seu ${os.equipamento} (OS #${os.numero}) está pronto para retirada. Total ${brl(total)}.`,
  }

  return (
    <Modal
      titulo={inicial.id ? `OS #${os.numero || '—'} · ${cliente?.nome ?? ''}` : 'Nova ordem de serviço'}
      onFechar={onFechar}
      largo
      rodape={
        <>
          {!travada && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (salvar()) onFechar()
              }}
            >
              Salvar
            </button>
          )}
          {os.id && (
            <button type="button" className="btn btn-ghost" onClick={() => imprimir(htmlOS({ ...os, total }, cliente, cfg), { titulo: `OS ${os.numero}` })}>
              Imprimir OS
            </button>
          )}
          {os.id && !travada && (
            <button type="button" className="btn btn-primary" onClick={() => salvar() && setCobrar(true)}>
              Entregar e cobrar
            </button>
          )}
          {os.id && !travada && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (confirm('Cancelar esta OS?') && salvar({ status: 'cancelada' })) onFechar()
              }}
            >
              Cancelar OS
            </button>
          )}
        </>
      }
    >
      <fieldset disabled={travada} className="sx-fieldset">
        <div className="sx-form-grid">
          <div className="field">
            <span className="field-label">Cliente *</span>
            <Combo tabela="clientes" value={os.cliente_id} onChange={(v) => set('cliente_id', v)} />
          </div>
          <label className="field">
            <span className="field-label">Equipamento / veículo *</span>
            <input value={os.equipamento || ''} onChange={(e) => set('equipamento', e.target.value)} placeholder="Celular, notebook, carro…" list="sx-equip" />
            <datalist id="sx-equip">
              <option value="Celular" />
              <option value="Notebook" />
              <option value="Tablet" />
              <option value="Computador" />
              <option value="Videogame" />
              <option value="Carro" />
              <option value="Moto" />
            </datalist>
          </label>
          <label className="field">
            <span className="field-label">Marca e modelo</span>
            <input value={os.marca_modelo || ''} onChange={(e) => set('marca_modelo', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Nº de série / IMEI / placa</span>
            <input value={os.serie || ''} onChange={(e) => set('serie', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Acessórios deixados</span>
            <input value={os.acessorios || ''} onChange={(e) => set('acessorios', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Situação</span>
            <select value={os.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OS.filter(([s]) => s !== 'entregue' || travada).map(([s, r]) => (
                <option key={s} value={s}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Previsão de entrega</span>
            <input type="date" value={os.previsao || ''} onChange={(e) => set('previsao', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Técnico</span>
            <input value={os.tecnico || ''} onChange={(e) => set('tecnico', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Garantia (dias)</span>
            <input inputMode="numeric" value={os.garantia_dias ?? ''} onChange={(e) => set('garantia_dias', Number(e.target.value) || 0)} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Defeito relatado *</span>
          <textarea rows={2} value={os.defeito || ''} onChange={(e) => set('defeito', e.target.value)} />
        </label>
        <div className="field">
          <span className="field-label">Checklist de entrada (marque o que funciona)</span>
          <div className="sx-check">
            {CHECK.map((k) => (
              <label key={k} className="check">
                <input type="checkbox" checked={Boolean(os.checklist?.[k])} onChange={(e) => set('checklist', { ...os.checklist, [k]: e.target.checked })} />
                {k}
              </label>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field-label">Laudo técnico</span>
          <textarea rows={2} value={os.laudo || ''} onChange={(e) => set('laudo', e.target.value)} />
        </label>
        <div className="field">
          <span className="field-label">Peças e serviços</span>
          <ItensEditor itens={os.itens || []} onChange={(v) => set('itens', v)} />
        </div>
      </fieldset>
      {os.id && cliente?.telefone && (
        <p className="small sx-links">
          {msg[os.status] && (
            <a href={linkWhats(cliente.telefone, msg[os.status])} target="_blank" rel="noopener noreferrer">
              Mandar {os.status === 'pronta' ? 'aviso de pronto' : 'orçamento'} no WhatsApp
            </a>
          )}
          <a href={linkWhats(cliente.telefone, `Acompanhe sua OS #${os.numero} pelo link: ${acompanhar}`)} target="_blank" rel="noopener noreferrer">
            Mandar link de acompanhamento
          </a>
          <span className="muted">Código: {os.codigo_publico}</span>
        </p>
      )}
      {erro && <p className="notice error">{erro}</p>}
      {cobrar && (
        <Pagamento
          total={total}
          cliente={cliente}
          titulo={`Entregar OS #${os.numero || ''}`}
          onFechar={() => setCobrar(false)}
          onConfirmar={(pagamentos, troco) => {
            const v = concluirVenda(banco, {
              venda: { itens: os.itens, cliente_id: os.cliente_id, cliente_nome: cliente?.nome ?? '', telefone: cliente?.telefone ?? '', origem: 'os', ref_id: os.id },
              pagamentos,
              troco,
              operador: usuario,
            })
            banco.salvar('ordens', { id: os.id, status: 'entregue', venda_id: v.id })
            onFechar()
          }}
        />
      )}
    </Modal>
  )
}
