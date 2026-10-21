'use client'

// Carteira de prospecção: os imóveis salvos, com etapa, proprietário, contato e anotações. Exporta planilha (CSV).

import { useMemo, useState } from 'react'
import { downloadBlob } from '@/lib/client'
import { enderecoTexto } from '@/lib/imoveis/fontes'
import { STATUS, corStatus, nomeStatus } from './status'

const whats = (tel, texto) => {
  let n = String(tel).replace(/\D/g, '')
  if (n.length >= 10 && n.length <= 11) n = `55${n}`
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

function csv(linhas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\n')
}

export default function Carteira({ carteira, salvar, abrirNoMapa }) {
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return carteira.filter((x) => (filtro === 'todos' || x.status === filtro) && (!q || [x.titulo, x.proprietario, x.notas, enderecoTexto(x.endereco)].join(' ').toLowerCase().includes(q)))
  }, [carteira, filtro, busca])

  const exportar = () => {
    const linhas = [['Endereço', 'Etapa', 'Proprietário', 'Telefone', 'E-mail', 'Matrícula/cartório', 'Valor', 'Tipo', 'Área (m²)', 'Latitude', 'Longitude', 'Anotações', 'Atualizado']]
    for (const x of carteira) linhas.push([enderecoTexto(x.endereco) || x.titulo, nomeStatus(x.status), x.proprietario, x.telefone, x.email, x.matricula, x.valor, x.tipo, x.area, x.lat, x.lon, x.notas, x.atualizado?.slice(0, 10)])
    downloadBlob(new Blob([csv(linhas)], { type: 'text/csv;charset=utf-8' }), `carteira-imoveis-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const atualizar = (id, campos) => salvar(carteira.map((x) => (x.id === id ? { ...x, ...campos, atualizado: new Date().toISOString() } : x)))

  if (!carteira.length) {
    return (
      <div className="im-pagina">
        <p className="im-vazio">Sua carteira está vazia. No mapa, toque num imóvel e use “Salvar na carteira”.</p>
      </div>
    )
  }

  return (
    <div className="im-pagina">
      <div className="im-carteira-topo">
        <div className="chips">
          <button type="button" className={filtro === 'todos' ? 'chip active' : 'chip'} onClick={() => setFiltro('todos')}>
            Todos ({carteira.length})
          </button>
          {STATUS.map(([id, nome]) => {
            const n = carteira.filter((x) => x.status === id).length
            return n ? (
              <button key={id} type="button" className={filtro === id ? 'chip active' : 'chip'} onClick={() => setFiltro(id)}>
                {nome} ({n})
              </button>
            ) : null
          })}
        </div>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar endereço, dono, anotação…" aria-label="Buscar na carteira" />
        <button type="button" className="btn btn-ghost" onClick={exportar}>
          Exportar planilha (CSV)
        </button>
      </div>
      <ul className="im-carteira">
        {lista.map((x) => (
          <li key={x.id} style={{ '--cor': corStatus(x.status) }}>
            <div className="im-item-topo">
              <strong>{x.titulo}</strong>
              <select value={x.status} onChange={(e) => atualizar(x.id, { status: e.target.value })} aria-label="Etapa">
                {STATUS.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
            <p className="muted small">{enderecoTexto(x.endereco)}</p>
            <p className="small">
              {[x.tipo, x.area && `~${x.area} m²`, x.proprietario && `Dono: ${x.proprietario}`, x.matricula && `Matrícula ${x.matricula}`, x.valor && `Valor ${x.valor}`].filter(Boolean).join(' · ')}
            </p>
            {x.notas && <p className="small im-notas">{x.notas}</p>}
            {editando === x.id ? (
              <div className="im-form">
                {[
                  ['proprietario', 'Proprietário'],
                  ['telefone', 'Telefone'],
                  ['email', 'E-mail'],
                  ['matricula', 'Matrícula / cartório'],
                  ['valor', 'Valor pedido'],
                ].map(([k, rotulo]) => (
                  <label key={k} className="field">
                    <span className="field-label">{rotulo}</span>
                    <input defaultValue={x[k] ?? ''} onBlur={(e) => atualizar(x.id, { [k]: e.target.value })} />
                  </label>
                ))}
                <label className="field im-largo">
                  <span className="field-label">Anotações</span>
                  <textarea rows={3} defaultValue={x.notas ?? ''} onBlur={(e) => atualizar(x.id, { notas: e.target.value })} />
                </label>
              </div>
            ) : null}
            <div className="im-links">
              <button type="button" className="btn btn-ghost" onClick={() => abrirNoMapa(x)}>
                Ver no mapa
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditando(editando === x.id ? null : x.id)}>
                {editando === x.id ? 'Fechar' : 'Editar'}
              </button>
              {x.telefone && (
                <a className="btn btn-ghost" href={whats(x.telefone, `Olá${x.proprietario ? `, ${x.proprietario.split(' ')[0]}` : ''}! Sou corretor(a) de imóveis e tenho interesse no seu imóvel em ${x.titulo}. Podemos conversar?`)} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (confirm(`Tirar “${x.titulo}” da carteira?`)) salvar(carteira.filter((y) => y.id !== x.id))
                }}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="muted small">A carteira fica só neste navegador. Exporte a planilha para guardar uma cópia.</p>
    </div>
  )
}
