'use client'

// Etapa 1: a chave do OpenRouter (colada ou pelo login) e o modelo padrão dos agentes.

import { useState } from 'react'
import { conferirChave, entrarComOpenRouter, salvarChave } from '@/lib/documentador/ia'
import { EscolherModelo, precoModelo } from './comuns'

export default function Conexao({ chave, setChave, modelos, erroModelos, modelo, modeloEfetivo, escolherModelo, aoConcluir }) {
  const [texto, setTexto] = useState(chave)
  const [ver, setVer] = useState(false)
  const [estado, setEstado] = useState(null) // { ok, msg }
  const [conferindo, setConferindo] = useState(false)

  const conectar = async (e) => {
    e.preventDefault()
    const c = texto.trim()
    if (!c) return setEstado({ ok: false, msg: 'Cole a chave do OpenRouter (começa com sk-or-).' })
    setConferindo(true)
    setEstado(null)
    try {
      const info = await conferirChave(c)
      salvarChave(c)
      setChave(c)
      const gasto = info.limite ? ` Usado US$ ${info.usado.toFixed(2)} de US$ ${Number(info.limite).toFixed(2)}.` : ''
      setEstado({ ok: true, msg: `Chave válida${info.rotulo ? ` (${info.rotulo})` : ''}.${gasto}` })
    } catch (e2) {
      setEstado({ ok: false, msg: e2.message })
    } finally {
      setConferindo(false)
    }
  }

  const desconectar = () => {
    salvarChave('')
    setChave('')
    setTexto('')
    setEstado({ ok: true, msg: 'Chave apagada deste navegador.' })
  }

  const info = modelos.find((m) => m.id === modeloEfetivo)

  return (
    <div className="dc-etapa">
      <section className="dc-cartao">
        <h2>Chave do OpenRouter</h2>
        <p className="muted">
          A IA roda na sua conta do OpenRouter. A chave fica só neste navegador e vai direto para o OpenRouter: o site não recebe nada. Há modelos gratuitos, então dá para testar sem pagar.
        </p>
        <form className="dc-linha" onSubmit={conectar}>
          <input type={ver ? 'text' : 'password'} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="sk-or-v1-…" autoComplete="off" spellCheck={false} aria-label="Chave do OpenRouter" />
          <button type="button" className="btn btn-ghost" onClick={() => setVer((v) => !v)}>
            {ver ? 'Esconder' : 'Mostrar'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={conferindo}>
            {conferindo ? 'Conferindo…' : 'Conectar'}
          </button>
        </form>
        <div className="dc-linha">
          <button type="button" className="btn btn-ghost" onClick={entrarComOpenRouter}>
            Entrar com a conta do OpenRouter
          </button>
          <a className="btn btn-ghost" href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
            Criar uma chave ↗
          </a>
          {chave && (
            <button type="button" className="btn btn-ghost" onClick={desconectar}>
              Apagar a chave
            </button>
          )}
        </div>
        {estado && <p className={estado.ok ? 'notice ok' : 'notice error'}>{estado.msg}</p>}
        <p className="muted small">Dica: crie uma chave só para o Documentador, com limite de crédito, e não use em computador compartilhado.</p>
      </section>

      <section className="dc-cartao">
        <h2>Modelo padrão dos agentes</h2>
        <p className="muted">Vale para todos os agentes que não tiverem um modelo próprio (dá para trocar por agente em “Processos e agentes”).</p>
        {erroModelos ? (
          <p className="notice error">{erroModelos}</p>
        ) : (
          <EscolherModelo modelos={modelos} valor={modelo} onChange={escolherModelo} vazio={`Automático: maior modelo gratuito (${modeloEfetivo || '…'})`} />
        )}
        {info && (
          <p className="muted small">
            {info.nome} · contexto de {Math.round(info.contexto / 1000)} mil tokens · {precoModelo(info)}
          </p>
        )}
        <p className="muted small">Modelos gratuitos têm limite de uso por minuto e às vezes ficam sobrecarregados: o Documentador espera e tenta de novo sozinho. Para documentos longos, um modelo pago barato costuma ser mais rápido e consistente.</p>
      </section>

      {chave && (
        <button type="button" className="btn btn-primary btn-lg" onClick={aoConcluir}>
          Continuar para gerar documento →
        </button>
      )}
    </div>
  )
}
