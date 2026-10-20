'use client'

// Etapa 2: escolhe o processo, preenche o cabeçalho, manda o material e roda a fila de agentes.
// O que cada agente escreve fica visível; dá para parar, continuar de onde parou ou refazer a partir de um agente.

import { useEffect, useRef, useState } from 'react'
import { rodarLinha, tokensAprox } from '@/lib/documentador/linha'
import { novoId } from '@/lib/documentador/processos'
import { guardar, ler } from './armazem'
import { MarkdownSeguro, segundos } from './comuns'

const TEXTO = /\.(txt|md|markdown|json|ya?ml|xml|csv|tsv|sql|log|ini|env|properties|conf|cfg|js|jsx|ts|tsx|mjs|cjs|py|java|kt|cs|go|rb|php|rs|c|cpp|h|sh|ps1|bat|tf|hcl|graphql|gql|html|css|scss|vue|svelte|dockerfile|gradle|toml)$/i
const MAX_ARQUIVO = 2 * 1024 * 1024

async function lerArquivo(file) {
  if (file.size > MAX_ARQUIVO) throw new Error(`${file.name}: maior que 2 MB.`)
  if (/\.docx$/i.test(file.name)) {
    const mod = await import('mammoth/mammoth.browser.js')
    const mammoth = mod.default ?? mod
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return r.value
  }
  if (TEXTO.test(file.name) || /^Dockerfile$/i.test(file.name) || file.type.startsWith('text/')) return file.text()
  throw new Error(`${file.name}: formato não suportado. Use texto, código, Markdown, JSON, CSV ou Word (.docx).`)
}

const vazio = { valores: {}, material: '', anexos: [], estados: [] }

export default function Gerar({ chave, modelos, modeloPadrao, processos, processo, escolherProcesso, irPara, aoTerminar }) {
  // pid: de qual processo é o rascunho (evita gravar o rascunho de um processo no lugar do outro ao trocar).
  const [rascunho, setRascunho] = useState(() => ({ ...ler(`doc.rascunho.${processo.id}`, vazio), pid: processo.id }))
  const [rodando, setRodando] = useState(false)
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(Date.now())
  const controle = useRef(null)
  const { valores, material, anexos, estados } = rascunho

  // Troca de processo: carrega o rascunho daquele processo.
  useEffect(() => {
    setRascunho((r) => (r.pid === processo.id ? r : { ...ler(`doc.rascunho.${processo.id}`, vazio), pid: processo.id }))
    setErro('')
  }, [processo.id])

  useEffect(() => {
    if (rascunho.pid !== processo.id) return
    guardar(`doc.rascunho.${rascunho.pid}`, { ...rascunho, estados: rascunho.estados.map((e) => (e.estado === 'rodando' || e.estado === 'esperando' ? { ...e, estado: 'parado' } : e)) })
  }, [rascunho, processo.id])

  useEffect(() => {
    if (!rodando) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [rodando])

  const mudar = (parcial) => setRascunho((r) => ({ ...r, ...parcial }))
  const setValor = (id, v) => setRascunho((r) => ({ ...r, valores: { ...r.valores, [id]: v } }))

  const anexar = async (files) => {
    setErro('')
    const novos = []
    for (const f of files) {
      try {
        novos.push({ nome: f.name, texto: await lerArquivo(f) })
      } catch (e) {
        setErro(e.message)
      }
    }
    if (novos.length) setRascunho((r) => ({ ...r, anexos: [...r.anexos.filter((a) => !novos.some((n) => n.nome === a.nome)), ...novos] }))
  }

  const tamanho = tokensAprox(material) + anexos.reduce((s, a) => s + tokensAprox(a.texto), 0)
  const contexto = modelos.find((m) => m.id === modeloPadrao)?.contexto ?? 0
  const agentes = processo.agentes
  const ultimoFeito = agentes.findIndex((_, i) => estados[i]?.estado !== 'feito')
  const podeContinuar = !rodando && estados.length > 0 && ultimoFeito > 0

  const rodar = async (inicio = 0) => {
    if (!chave) return irPara('conexao')
    if (!material.trim() && !anexos.length) return setErro('Escreva ou anexe o material que os agentes vão usar.')
    if (!modeloPadrao) return setErro('Os modelos ainda estão carregando. Tente de novo em alguns segundos.')
    setErro('')
    setRodando(true)
    const pid = processo.id
    controle.current = new AbortController()
    setRascunho((r) => ({ ...r, estados: [...r.estados.slice(0, inicio), ...agentes.slice(inicio).map(() => ({ estado: 'aguardando' }))] }))
    try {
      const saidas = await rodarLinha({
        processo,
        valores,
        material,
        anexos,
        saidas: estados.map((e) => (e?.estado === 'feito' ? e : null)),
        inicio,
        chave,
        modeloPadrao,
        modelos,
        sinal: controle.current.signal,
        aoMudar: (i, parcial) =>
          setRascunho((r) => {
            if (r.pid !== pid) return r // a pessoa trocou de processo no meio: não mistura os rascunhos
            const lista = [...r.estados]
            lista[i] = { ...lista[i], ...parcial }
            return { ...r, estados: lista }
          }),
      })
      const markdown = saidas[saidas.length - 1].texto
      aoTerminar({
        id: novoId(),
        titulo: markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || processo.nome,
        processo: processo.nome,
        criado: new Date().toISOString(),
        markdown,
      })
    } catch (e) {
      if (e?.name !== 'AbortError') setErro(e.message)
    } finally {
      setRodando(false)
      controle.current = null
    }
  }

  const custo = estados.reduce((s, e) => {
    const m = modelos.find((x) => x.id === e?.modelo)
    return s + (m ? (e.entrada || 0) * m.entrada + (e.saida || 0) * m.saida : 0)
  }, 0)

  return (
    <div className="dc-etapa">
      <section className="dc-cartao">
        <h2>Tipo de documento</h2>
        <div className="dc-processos">
          {processos.map((p) => (
            <button key={p.id} type="button" className={p.id === processo.id ? 'dc-processo ativo' : 'dc-processo'} onClick={() => escolherProcesso(p.id)} disabled={rodando}>
              <span aria-hidden="true">{p.icone}</span>
              <strong>{p.nome}</strong>
              <small>{p.agentes.length} agentes</small>
            </button>
          ))}
        </div>
        <p className="muted small">{processo.descricao}</p>
        <ol className="dc-fila" aria-label="Fila de agentes">
          {agentes.map((a, i) => (
            <li key={a.id} className={i === agentes.length - 1 ? 'montador' : ''}>
              <span aria-hidden="true">{a.icone}</span> {a.nome}
            </li>
          ))}
        </ol>
        <button type="button" className="dc-link" onClick={() => irPara('processos')}>
          Editar agentes, prompts e estrutura do documento
        </button>
      </section>

      <section className="dc-cartao">
        <h2>Cabeçalho</h2>
        <p className="muted small">O que você preencher aqui vale mais que qualquer coisa no material. Em branco, os agentes tiram do material ou deixam [A DEFINIR].</p>
        <div className="dc-campos">
          {processo.campos.map((c) => (
            <label key={c.id} className="field">
              <span className="field-label">{c.rotulo}</span>
              {c.opcoes ? (
                <select value={valores[c.id] ?? ''} onChange={(e) => setValor(c.id, e.target.value)}>
                  <option value="">{c.dica || '—'}</option>
                  {c.opcoes.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input value={valores[c.id] ?? ''} onChange={(e) => setValor(c.id, e.target.value)} placeholder={c.dica || ''} />
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="dc-cartao">
        <h2>Material</h2>
        <p className="muted small">Cole tudo o que tiver: descrição da demanda, conversa, história do Jira, passos do deploy, trechos de código, scripts SQL, logs. Quanto mais concreto, melhor o documento.</p>
        <textarea
          className="dc-material"
          value={material}
          onChange={(e) => mudar({ material: e.target.value })}
          placeholder="Ex.: Vamos subir a versão 2.4 do serviço de pedidos para corrigir o cálculo de frete. Muda a tabela fretes (nova coluna prazo_dias), o job de sincronização roda às 23h…"
          rows={10}
        />
        <div className="dc-linha">
          <label className="btn btn-ghost dc-anexar">
            Anexar arquivos
            <input
              type="file"
              multiple
              onChange={(e) => {
                anexar([...e.target.files])
                e.target.value = ''
              }}
            />
          </label>
          <span className={contexto && tamanho > contexto * 0.6 ? 'notice warn small' : 'muted small'}>
            ≈ {tamanho.toLocaleString('pt-BR')} tokens de material
            {contexto && tamanho > contexto * 0.6 ? ` (perto do limite de ${Math.round(contexto / 1000)} mil do modelo; resuma ou troque de modelo)` : ''}
          </span>
        </div>
        {anexos.length > 0 && (
          <ul className="dc-anexos">
            {anexos.map((a) => (
              <li key={a.nome}>
                📎 {a.nome} <span className="muted small">({tokensAprox(a.texto).toLocaleString('pt-BR')} tokens)</span>
                <button type="button" className="dc-link" onClick={() => mudar({ anexos: anexos.filter((x) => x.nome !== a.nome) })}>
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {erro && <p className="notice error">{erro}</p>}

      <div className="dc-linha">
        {rodando ? (
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => controle.current?.abort()}>
            Parar
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => rodar(0)}>
              {chave ? 'Gerar documento' : 'Conectar o OpenRouter primeiro'}
            </button>
            {podeContinuar && (
              <button type="button" className="btn btn-ghost btn-lg" onClick={() => rodar(ultimoFeito)}>
                Continuar de onde parou
              </button>
            )}
          </>
        )}
        {(material || anexos.length > 0 || Object.keys(valores).length > 0) && !rodando && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (confirm('Limpar o cabeçalho, o material e as análises deste tipo de documento?')) setRascunho({ ...vazio, pid: processo.id })
            }}
          >
            Limpar tudo
          </button>
        )}
      </div>

      {estados.length > 0 && (
        <section className="dc-cartao">
          <h2>Agentes trabalhando</h2>
          <ol className="dc-progresso">
            {agentes.map((a, i) => {
              const e = estados[i] ?? { estado: 'aguardando' }
              const tempo = e.estado === 'rodando' || e.estado === 'esperando' ? agora - (e.inicio || agora) : e.ms
              return (
                <li key={a.id} className={`dc-passo st-${e.estado}`}>
                  <div className="dc-passo-topo">
                    <span className="dc-passo-icone" aria-hidden="true">
                      {e.estado === 'feito' ? '✓' : e.estado === 'erro' ? '!' : a.icone}
                    </span>
                    <strong>{a.nome}</strong>
                    <span className="muted small">
                      {
                        {
                          aguardando: 'na fila',
                          rodando: 'escrevendo…',
                          esperando: 'esperando o modelo…',
                          feito: 'pronto',
                          erro: 'erro',
                          parado: 'parado',
                        }[e.estado]
                      }
                      {tempo ? ` · ${segundos(tempo)}` : ''}
                      {e.modelo ? ` · ${e.modelo}` : ''}
                      {e.saida ? ` · ${(e.entrada + e.saida).toLocaleString('pt-BR')} tokens` : ''}
                    </span>
                    {e.estado === 'feito' && !rodando && (
                      <button type="button" className="dc-link" onClick={() => rodar(i)}>
                        refazer daqui
                      </button>
                    )}
                  </div>
                  {e.aviso && <p className="muted small">{e.aviso}</p>}
                  {e.erro && <p className="notice error small">{e.erro}</p>}
                  {e.texto && (
                    <details>
                      <summary>{i === agentes.length - 1 ? 'Ver o documento gerado' : 'Ver a análise'}</summary>
                      <MarkdownSeguro texto={e.texto} />
                    </details>
                  )}
                </li>
              )
            })}
          </ol>
          {custo > 0 && <p className="muted small">Custo estimado no OpenRouter: US$ {custo.toFixed(4)}</p>}
        </section>
      )}
    </div>
  )
}
