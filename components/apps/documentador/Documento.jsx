'use client'

// Etapa 3: o documento pronto. Prévia, edição do Markdown e exportação (Word, PDF, Markdown).

import { useEffect, useState } from 'react'
import { downloadBlob } from '@/lib/client'
import { markdownParaDocx, nomeArquivo } from '@/lib/documentador/exportar'
import { MarkdownSeguro } from './comuns'

export function Documento({ documento, aoEditar }) {
  const [modo, setModo] = useState('previa')
  const [texto, setTexto] = useState(documento.markdown)
  const [aviso, setAviso] = useState('')
  const [gerando, setGerando] = useState(false)
  const nome = nomeArquivo(documento.markdown, 'documento')

  useEffect(() => setTexto(documento.markdown), [documento.id, documento.markdown])

  // Grava a edição meio segundo depois de parar de digitar.
  useEffect(() => {
    if (texto === documento.markdown) return
    const t = setTimeout(() => aoEditar(texto), 500)
    return () => clearTimeout(t)
  }, [texto, documento.markdown, aoEditar])

  const avisar = (msg) => {
    setAviso(msg)
    setTimeout(() => setAviso(''), 2500)
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      avisar('Markdown copiado.')
    } catch {
      avisar('O navegador bloqueou a cópia. Use “Baixar .md”.')
    }
  }

  const word = async () => {
    setGerando(true)
    try {
      downloadBlob(await markdownParaDocx(texto, documento.titulo), `${nome}.docx`)
    } catch (e) {
      avisar(`Não foi possível gerar o Word: ${e.message}`)
    } finally {
      setGerando(false)
    }
  }

  const pdf = () => {
    setModo('previa')
    // O nome sugerido ao salvar em PDF vem do título da aba; a classe esconde tudo menos o documento.
    setTimeout(() => {
      const antes = document.title
      document.title = nome
      document.documentElement.classList.add('dc-imprimindo')
      window.print()
      document.documentElement.classList.remove('dc-imprimindo')
      document.title = antes
    }, 50)
  }

  const pendencias = (texto.match(/\[A DEFINIR[^\]]*\]/g) ?? []).length

  return (
    <div className="dc-etapa">
      <div className="dc-doc-barra">
        <div className="chips">
          <button type="button" className={modo === 'previa' ? 'chip active' : 'chip'} onClick={() => setModo('previa')}>
            Prévia
          </button>
          <button type="button" className={modo === 'editar' ? 'chip active' : 'chip'} onClick={() => setModo('editar')}>
            Editar Markdown
          </button>
        </div>
        <div className="dc-linha">
          <button type="button" className="btn btn-primary" onClick={word} disabled={gerando}>
            {gerando ? 'Gerando…' : 'Baixar Word'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={pdf}>
            PDF / imprimir
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => downloadBlob(new Blob([texto], { type: 'text/markdown;charset=utf-8' }), `${nome}.md`)}>
            Baixar .md
          </button>
          <button type="button" className="btn btn-ghost" onClick={copiar}>
            Copiar
          </button>
        </div>
      </div>
      {aviso && (
        <p className="notice ok" role="status">
          {aviso}
        </p>
      )}
      {pendencias > 0 && (
        <p className="notice warn">
          {pendencias} {pendencias === 1 ? 'informação ficou' : 'informações ficaram'} como [A DEFINIR]. Complete em “Editar Markdown” ou adicione ao material e gere de novo.
        </p>
      )}
      {modo === 'previa' ? (
        <article className="dc-previa">
          <MarkdownSeguro texto={texto} />
        </article>
      ) : (
        <textarea className="dc-editor" value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck={false} aria-label="Markdown do documento" />
      )}
    </div>
  )
}

export function Historico({ historico, abrir, apagar }) {
  if (!historico.length) return <p className="dc-vazio">Os documentos gerados aparecem aqui (ficam só neste navegador, até 30).</p>
  return (
    <div className="dc-etapa">
      <ul className="dc-historico">
        {historico.map((d) => (
          <li key={d.id}>
            <button type="button" className="dc-historico-item" onClick={() => abrir(d)}>
              <strong>{d.titulo}</strong>
              <span className="muted small">
                {d.processo} · {new Date(d.criado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Apagar ${d.titulo}`}
              onClick={() => {
                if (confirm(`Apagar “${d.titulo}” do histórico?`)) apagar(d.id)
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
