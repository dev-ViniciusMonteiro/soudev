'use client'

// Motor de autoteste reutilizável. Recebe:
//  - montar(): prepara o ambiente e devolve { ctx, cenarios, limpar }
//  - aoQuebrar(ctx): (opcional) estraga algo de propósito, para demonstrar a correção
// Cada cenário: { nome, rodar(ctx) -> {ok, detalhe}, corrigir?(ctx) -> {feito, antes, depois} }
// Se um cenário falha e tem corrigir(), tenta consertar, documenta Antes/Depois e roda de novo.

import { useCallback, useEffect, useRef, useState } from 'react'

const ICONE = { passou: '✓', corrigido: '✓', falhou: '✗', rodando: '…' }

export default function Autoteste({ titulo, intro, montar, aoQuebrar }) {
  const [itens, setItens] = useState([])
  const [estado, setEstado] = useState('parado')
  const rodou = useRef(false)

  const executar = useCallback(async (simularProblema) => {
    setEstado('rodando')
    setItens([])
    let pacote
    try {
      pacote = await montar()
    } catch (e) {
      setItens([{ nome: 'Preparar o ambiente de teste', status: 'falhou', detalhe: String(e?.message || e) }])
      setEstado('pronto')
      return
    }
    const { ctx, cenarios, limpar } = pacote
    if (simularProblema && aoQuebrar) {
      try { await aoQuebrar(ctx) } catch {}
    }
    const out = []
    for (const c of cenarios) {
      out.push({ nome: c.nome, status: 'rodando' })
      setItens([...out])
      let r
      try { r = await c.rodar(ctx) } catch (e) { r = { ok: false, detalhe: String(e?.message || e) } }
      if (r.ok) {
        out[out.length - 1] = { nome: c.nome, status: 'passou', detalhe: r.detalhe }
      } else if (c.corrigir) {
        let correcao = null
        let erroCorr = null
        try { correcao = await c.corrigir(ctx) } catch (e) { erroCorr = String(e?.message || e) }
        let r2 = null
        if (correcao) { try { r2 = await c.rodar(ctx) } catch (e) { r2 = { ok: false, detalhe: String(e?.message || e) } } }
        if (r2?.ok) out[out.length - 1] = { nome: c.nome, status: 'corrigido', detalhe: r2.detalhe, correcao, problema: r.detalhe }
        else out[out.length - 1] = { nome: c.nome, status: 'falhou', detalhe: erroCorr || r.detalhe }
      } else {
        out[out.length - 1] = { nome: c.nome, status: 'falhou', detalhe: r.detalhe }
      }
      setItens([...out])
    }
    try { await limpar?.() } catch {}
    setEstado('pronto')
  }, [montar, aoQuebrar])

  useEffect(() => {
    if (rodou.current) return
    rodou.current = true
    executar(false)
  }, [executar])

  const total = itens.length
  const okN = itens.filter((i) => i.status === 'passou' || i.status === 'corrigido').length
  const falhas = itens.filter((i) => i.status === 'falhou').length
  const corrigidos = itens.filter((i) => i.status === 'corrigido').length

  return (
    <div className="at">
      <header className="at-topo">
        <h1>{titulo}</h1>
        {intro && <p className="muted">{intro}</p>}
        <div className="at-acoes">
          <button className="btn btn-primary" onClick={() => executar(false)} disabled={estado === 'rodando'}>
            {estado === 'rodando' ? 'Rodando…' : 'Rodar os testes de novo'}
          </button>
          {aoQuebrar && (
            <button className="btn btn-ghost" onClick={() => executar(true)} disabled={estado === 'rodando'} title="Estraga algo de propósito para você ver a correção automática em ação">
              Simular um problema e corrigir
            </button>
          )}
        </div>
      </header>

      {estado === 'pronto' && (
        <div className={`at-resumo ${falhas ? 'ruim' : 'bom'}`}>
          {falhas ? `${falhas} de ${total} falharam` : `Tudo certo: ${okN} de ${total} passaram`}
          {corrigidos ? ` · ${corrigidos} corrigido(s) automaticamente` : ''}
        </div>
      )}

      <ol className="at-lista">
        {itens.map((i, n) => (
          <li key={n} className={`at-item at-${i.status}`}>
            <div className="at-linha">
              <span className="at-icone" aria-hidden="true">{ICONE[i.status]}</span>
              <span className="at-nome">{i.nome}</span>
              <span className="at-tag">{i.status === 'corrigido' ? 'corrigido' : i.status === 'passou' ? 'passou' : i.status === 'falhou' ? 'falhou' : '…'}</span>
            </div>
            {i.detalhe && <p className="at-detalhe">{i.detalhe}</p>}
            {i.status === 'corrigido' && i.correcao && (
              <div className="at-correcao">
                <p className="at-correcao-tit">🔧 Correção aplicada: {i.correcao.feito}</p>
                {i.problema && <p className="at-problema">Problema detectado: {i.problema}</p>}
                <div className="at-prints">
                  <figure className="at-print">
                    <figcaption>Antes</figcaption>
                    <pre>{i.correcao.antes}</pre>
                  </figure>
                  <figure className="at-print depois">
                    <figcaption>Depois</figcaption>
                    <pre>{i.correcao.depois}</pre>
                  </figure>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {estado === 'rodando' && !itens.length && <p className="muted">Preparando o ambiente de teste…</p>}
    </div>
  )
}
