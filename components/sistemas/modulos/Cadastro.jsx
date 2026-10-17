'use client'

// Cadastro genérico de qualquer tabela, montado pelo esquema. O cliente mostra o histórico de todos os módulos.

import { useMemo, useState } from 'react'
import { Formulario, Kpis, Modal, Selo, Topo, Vazio, mostrarValor, useMapa, useSistema, useTabela } from '../base'
import { campo, camposDe, tabelas } from '@/lib/sistemas/schema'
import { brl, csv, dataBR, linkWhats, num, saldos } from '@/lib/sistemas/regras'
import { downloadBlob } from '@/lib/client'

export default function Cadastro({ tabela }) {
  const { banco, nicho } = useSistema()
  const def = tabelas[tabela]
  const lista = useTabela(tabela)
  const movs = useTabela('estoque_mov')
  const refs = [...new Set(def.campos.filter((c) => c.tipo === 'ref').map((c) => c.ref))]
  const mapas = {
    clientes: useMapa('clientes'),
    produtos: useMapa('produtos'),
    categorias: useMapa('categorias'),
    fornecedores: useMapa('fornecedores'),
    profissionais: useMapa('profissionais'),
    planos: useMapa('planos'),
    pets: useMapa('pets'),
    leads: useMapa('leads'),
    caixas: useMapa('caixas'),
  }
  const [busca, setBusca] = useState('')
  const [editar, setEditar] = useState(null)
  const [ordem, setOrdem] = useState(null)
  const rotulo = nicho.rotulos[tabela] ?? def.rotulo
  const colunas = def.colunas.filter((id) => {
    const c = campo(tabela, id)
    return !c?.nichos || c.nichos.includes(nicho.slug)
  })
  const sald = useMemo(() => (tabela === 'produtos' ? saldos(movs) : null), [tabela, movs])

  const q = busca.trim().toLowerCase()
  const filtrados = useMemo(() => {
    let r = lista
    if (q) {
      r = r.filter((x) =>
        camposDe(tabela, nicho.slug).some((c) => {
          const v = c.tipo === 'ref' ? mostrarValor(tabela, c.id, x[c.id], mapas) : x[c.id]
          return typeof v === 'string' || typeof v === 'number' ? String(v).toLowerCase().includes(q) : false
        }),
      )
    }
    if (ordem) {
      const [id, dir] = ordem
      r = [...r].sort((a, b) => {
        const va = campo(tabela, id)?.tipo === 'ref' ? String(mostrarValor(tabela, id, a[id], mapas)) : a[id] ?? ''
        const vb = campo(tabela, id)?.tipo === 'ref' ? String(mostrarValor(tabela, id, b[id], mapas)) : b[id] ?? ''
        return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })) * dir
      })
    } else if (def.titulo && ['nome', 'email', 'descricao'].includes(def.titulo)) {
      r = [...r].sort((a, b) => String(a[def.titulo] ?? '').localeCompare(String(b[def.titulo] ?? ''), 'pt-BR'))
    }
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, q, ordem, tabela, nicho.slug, ...refs.map((t) => mapas[t])])

  const exportar = () => {
    const campos = camposDe(tabela, nicho.slug)
    const linhas = [campos.map((c) => c.rotulo)]
    for (const r of filtrados) linhas.push(campos.map((c) => (c.tipo === 'ref' ? mostrarValor(tabela, c.id, r[c.id], mapas) : r[c.id])))
    downloadBlob(new Blob([csv(linhas)], { type: 'text/csv;charset=utf-8' }), `${tabela}.csv`)
  }

  return (
    <div className="sx-modulo">
      <Topo titulo={rotulo} sub={`${lista.length} cadastrados · aba “${tabela}” na planilha`}>
        <input className="sx-busca" placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button type="button" className="btn btn-ghost" onClick={exportar}>
          Exportar CSV
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setEditar({})}>
          Novo {def.singular}
        </button>
      </Topo>
      {filtrados.length === 0 ? (
        <Vazio>{q ? 'Nada encontrado.' : `Nenhum ${def.singular} ainda.`}</Vazio>
      ) : (
        <div className="table-wrap">
          <table className="table sx-tabela-clique">
            <thead>
              <tr>
                {colunas.map((id) => (
                  <th key={id}>
                    <button type="button" className="sx-th" onClick={() => setOrdem((o) => (o?.[0] === id ? [id, -o[1]] : [id, 1]))}>
                      {campo(tabela, id)?.rotulo ?? id}
                      {ordem?.[0] === id ? (ordem[1] > 0 ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
                {sald && <th>Estoque</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 500).map((r) => (
                <tr key={r.id} onClick={() => setEditar(r)}>
                  {colunas.map((id) => (
                    <td key={id} className={id === def.titulo ? 'sx-quebra' : ''}>
                      {mostrarValor(tabela, id, r[id], mapas)}
                      {id === def.titulo && r.ativo === false && <Selo tom="neutro">inativo</Selo>}
                    </td>
                  ))}
                  {sald && <td>{r.controla_estoque ? num(sald.get(r.id) || 0, 3) : <span className="muted">—</span>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editar && (
        <Modal titulo={editar.id ? `Editar ${def.singular}` : `Novo ${def.singular}`} onFechar={() => setEditar(null)} largo>
          {tabela === 'clientes' && editar.id && <HistoricoCliente cliente={editar} />}
          <Formulario
            tabela={tabela}
            registro={editar.id ? editar : null}
            onSalvo={() => setEditar(null)}
            onCancelar={() => setEditar(null)}
            extras={
              editar.id && (
                <p className="small">
                  <button
                    type="button"
                    className="sx-link sx-perigo"
                    onClick={() => {
                      if (!confirm(`Excluir este ${def.singular}? O histórico ligado a ele continua guardado.`)) return
                      banco.excluir(tabela, editar.id)
                      setEditar(null)
                    }}
                  >
                    Excluir {def.singular}
                  </button>
                  <span className="muted"> · criado em {dataBR(editar.criado_em, true)}</span>
                </p>
              )
            }
          />
        </Modal>
      )}
    </div>
  )
}

/** Tudo o que o cliente tem nos outros módulos: compras, agenda, OS, pets, matrículas, fiado. */
function HistoricoCliente({ cliente }) {
  const { ativos } = useSistema()
  const vendas = useTabela('vendas').filter((v) => v.cliente_id === cliente.id && v.status === 'concluida')
  const agenda = useTabela('agendamentos').filter((a) => a.cliente_id === cliente.id)
  const ordens = useTabela('ordens').filter((o) => o.cliente_id === cliente.id)
  const pets = useTabela('pets').filter((p) => p.cliente_id === cliente.id)
  const abertos = useTabela('lancamentos').filter((l) => l.cliente_id === cliente.id && l.tipo === 'receita' && !l.pago_em)
  const total = vendas.reduce((s, v) => s + Number(v.total), 0)
  const ultima = [...vendas.map((v) => v.concluida_em || v.criado_em), ...agenda.filter((a) => a.status === 'concluido').map((a) => a.inicio)].sort().at(-1)
  return (
    <div className="sx-historico">
      <Kpis
        itens={[
          ['Compras', vendas.length, brl(total)],
          ['Ticket médio', brl(vendas.length ? total / vendas.length : 0)],
          ['Última visita', ultima ? dataBR(ultima) : '—'],
          abertos.length > 0 && ['Em aberto', brl(abertos.reduce((s, l) => s + Number(l.valor), 0)), `${abertos.length} lançamentos`, 'aviso'],
        ]}
      />
      <p className="small sx-links">
        {cliente.telefone && (
          <a href={linkWhats(cliente.telefone, `Olá, ${cliente.nome.split(' ')[0]}!`)} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
        {ativos.includes('agenda') && <span>{agenda.length} agendamentos</span>}
        {ativos.includes('ordens') && <span>{ordens.length} ordens de serviço</span>}
        {pets.length > 0 && <span>Pets: {pets.map((p) => p.nome).join(', ')}</span>}
      </p>
    </div>
  )
}
