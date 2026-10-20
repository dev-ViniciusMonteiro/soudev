'use client'

// Editor dos processos: a fila de agentes (nome, modelo e prompt de cada um), os campos do cabeçalho
// e a estrutura que o montador segue. O último agente é sempre o montador.

import { useRef, useState } from 'react'
import { downloadBlob } from '@/lib/client'
import { PADROES, novoAgente, novoId, processoDoPadrao } from '@/lib/documentador/processos'
import { EscolherModelo } from './comuns'

export default function Processos({ processos, setProcessos, processoId, escolherProcesso, modelos }) {
  const [aviso, setAviso] = useState('')
  const arquivo = useRef(null)
  const p = processos.find((x) => x.id === processoId) ?? processos[0]
  const ultimo = p.agentes.length - 1

  const mudar = (fn) => setProcessos((lista) => lista.map((x) => (x.id === p.id ? fn(x) : x)))
  const set = (k, v) => mudar((x) => ({ ...x, [k]: v }))
  const setAgente = (i, k, v) => mudar((x) => ({ ...x, agentes: x.agentes.map((a, j) => (j === i ? { ...a, [k]: v } : a)) }))
  const setCampo = (i, k, v) => mudar((x) => ({ ...x, campos: x.campos.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }))

  const mover = (i, delta) =>
    mudar((x) => {
      const ag = [...x.agentes]
      const [a] = ag.splice(i, 1)
      ag.splice(i + delta, 0, a)
      return { ...x, agentes: ag }
    })

  const adicionar = (novo) => {
    setProcessos((lista) => [...lista, novo])
    escolherProcesso(novo.id)
  }

  const exportar = () => {
    downloadBlob(new Blob([JSON.stringify({ ...p, id: undefined }, null, 2)], { type: 'application/json' }), `processo-${p.nome.toLowerCase().replace(/[^\w]+/g, '-')}.json`)
  }

  const importar = async (file) => {
    try {
      const dados = JSON.parse(await file.text())
      if (!dados?.nome || !Array.isArray(dados.agentes) || !dados.agentes.length || typeof dados.estrutura !== 'string') throw new Error()
      adicionar({
        ...dados,
        id: novoId(),
        campos: Array.isArray(dados.campos) ? dados.campos : [],
        agentes: dados.agentes.map((a) => ({ ...novoAgente(), ...a, id: novoId() })),
      })
      setAviso(`Processo “${dados.nome}” importado.`)
    } catch {
      setAviso('Arquivo inválido: use um processo exportado pelo Documentador.')
    }
  }

  const padraoBase = PADROES.find((x) => x.id === p.base)

  return (
    <div className="dc-etapa">
      <section className="dc-cartao">
        <h2>Processos</h2>
        <div className="dc-processos">
          {processos.map((x) => (
            <button key={x.id} type="button" className={x.id === p.id ? 'dc-processo ativo' : 'dc-processo'} onClick={() => escolherProcesso(x.id)}>
              <span aria-hidden="true">{x.icone}</span>
              <strong>{x.nome}</strong>
              <small>{x.agentes.length} agentes</small>
            </button>
          ))}
        </div>
        <div className="dc-linha">
          {PADROES.map((padrao) => (
            <button key={padrao.id} type="button" className="btn btn-ghost" onClick={() => adicionar(processoDoPadrao(padrao, `${padrao.nome} (cópia)`))}>
              + Novo a partir de {padrao.nome}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => adicionar({ ...structuredClone(p), id: novoId(), nome: `${p.nome} (cópia)`, agentes: p.agentes.map((a) => ({ ...a, id: novoId() })) })}>
            Duplicar este
          </button>
          <button type="button" className="btn btn-ghost" onClick={exportar}>
            Exportar (.json)
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => arquivo.current?.click()}>
            Importar
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              if (e.target.files[0]) importar(e.target.files[0])
              e.target.value = ''
            }}
          />
        </div>
        {aviso && <p className="notice ok">{aviso}</p>}
      </section>

      <section className="dc-cartao">
        <h2>Dados do processo</h2>
        <div className="dc-campos">
          <label className="field">
            <span className="field-label">Nome</span>
            <input value={p.nome} onChange={(e) => set('nome', e.target.value)} />
          </label>
          <label className="field dc-campo-curto">
            <span className="field-label">Ícone</span>
            <input value={p.icone} onChange={(e) => set('icone', e.target.value)} maxLength={4} />
          </label>
          <label className="field dc-campo-largo">
            <span className="field-label">Descrição</span>
            <input value={p.descricao} onChange={(e) => set('descricao', e.target.value)} />
          </label>
        </div>
        <div className="dc-linha">
          {padraoBase && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (!confirm(`Voltar “${p.nome}” para o padrão original (${padraoBase.nome})? Suas mudanças neste processo serão perdidas.`)) return
                mudar((x) => ({ ...processoDoPadrao(padraoBase), id: x.id }))
              }}
            >
              Restaurar o padrão original
            </button>
          )}
          {processos.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (!confirm(`Excluir o processo “${p.nome}”?`)) return
                const resto = processos.filter((x) => x.id !== p.id)
                setProcessos(resto)
                escolherProcesso(resto[0].id)
              }}
            >
              Excluir processo
            </button>
          )}
        </div>
      </section>

      <section className="dc-cartao">
        <h2>Agentes, na ordem em que trabalham</h2>
        <p className="muted small">Cada agente recebe o cabeçalho, o material e o que os anteriores escreveram. O último é o montador: recebe tudo e a estrutura abaixo, e escreve o documento.</p>
        <ol className="dc-agentes">
          {p.agentes.map((a, i) => (
            <li key={a.id} className={i === ultimo ? 'dc-agente montador' : 'dc-agente'}>
              <div className="dc-agente-topo">
                <input className="dc-icone" value={a.icone} onChange={(e) => setAgente(i, 'icone', e.target.value)} maxLength={4} aria-label="Ícone do agente" />
                <input className="dc-agente-nome" value={a.nome} onChange={(e) => setAgente(i, 'nome', e.target.value)} aria-label="Nome do agente" />
                {i === ultimo ? (
                  <span className="dc-selo">Montador (escreve o documento)</span>
                ) : (
                  <span className="dc-agente-acoes">
                    <button type="button" className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                      ↑
                    </button>
                    <button type="button" className="icon-btn" aria-label="Descer" disabled={i >= ultimo - 1} onClick={() => mover(i, 1)}>
                      ↓
                    </button>
                    <button type="button" className="icon-btn" aria-label="Remover agente" onClick={() => mudar((x) => ({ ...x, agentes: x.agentes.filter((_, j) => j !== i) }))}>
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <label className="field">
                <span className="field-label">Modelo deste agente</span>
                <EscolherModelo modelos={modelos} valor={a.modelo} onChange={(v) => setAgente(i, 'modelo', v)} vazio="Modelo padrão (Conexão)" />
              </label>
              <label className="field">
                <span className="field-label">Papel e instruções (prompt)</span>
                <textarea rows={i === ultimo ? 4 : 7} value={a.papel} onChange={(e) => setAgente(i, 'papel', e.target.value)} />
              </label>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-ghost" onClick={() => mudar((x) => ({ ...x, agentes: [...x.agentes.slice(0, -1), novoAgente(), x.agentes[x.agentes.length - 1]] }))}>
          + Agente antes do montador
        </button>
      </section>

      <section className="dc-cartao">
        <h2>Campos do cabeçalho</h2>
        <p className="muted small">Viram o formulário em “Gerar”. Com opções (separadas por vírgula), o campo vira uma lista.</p>
        <div className="dc-tabela-campos">
          {p.campos.map((c, i) => (
            <div key={i} className="dc-campo-linha">
              <input value={c.rotulo} onChange={(e) => setCampo(i, 'rotulo', e.target.value)} placeholder="Rótulo" aria-label="Rótulo" />
              <input value={c.dica ?? ''} onChange={(e) => setCampo(i, 'dica', e.target.value)} placeholder="Dica (opcional)" aria-label="Dica" />
              <input
                value={(c.opcoes ?? []).join(', ')}
                onChange={(e) => {
                  const ops = e.target.value
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean)
                  setCampo(i, 'opcoes', ops.length ? ops : undefined)
                }}
                placeholder="Opções (opcional)"
                aria-label="Opções"
              />
              <button type="button" className="icon-btn" aria-label="Remover campo" onClick={() => mudar((x) => ({ ...x, campos: x.campos.filter((_, j) => j !== i) }))}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => mudar((x) => ({ ...x, campos: [...x.campos, { id: `c${novoId().slice(0, 8)}`, rotulo: 'Novo campo' }] }))}>
          + Campo
        </button>
      </section>

      <section className="dc-cartao">
        <h2>Estrutura do documento (padrão que o montador segue)</h2>
        <p className="muted small">Títulos, ordem e tabelas obrigatórias, em Markdown. Use {'{…}'} para o que o montador deve preencher. É aqui que você define o padrão da empresa.</p>
        <textarea className="dc-estrutura" rows={22} value={p.estrutura} onChange={(e) => set('estrutura', e.target.value)} spellCheck={false} />
      </section>
    </div>
  )
}
