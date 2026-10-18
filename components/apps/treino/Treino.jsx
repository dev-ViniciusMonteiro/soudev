'use client'

import { useEffect, useState } from 'react'
import { salvarVarios, useColecao, useConfig } from '@/lib/treino/banco'
import Ajustes from './Ajustes'
import Biblioteca from './Biblioteca'
import { AvisoProvider, BibProvider, Modal, useBiblioteca } from './comum'
import Hoje from './Hoje'
import Progresso from './Progresso'
import Rotinas, { deBase64, rotinasDoLink } from './Rotinas'
import Sessao from './Sessao'

const ABAS = [
  ['hoje', 'Hoje', '🏋️'],
  ['rotinas', 'Rotinas', '📋'],
  ['exercicios', 'Exercícios', '📚'],
  ['progresso', 'Progresso', '📈'],
  ['ajustes', 'Ajustes', '⚙️'],
]

export default function Treino() {
  const bib = useBiblioteca()
  const [cfg, mudarCfg, pronto] = useConfig()
  const rotinas = useColecao('rotinas')
  const [aba, setAba] = useState('hoje')
  const [sessao, setSessao] = useState(null)
  const [planoLink, setPlanoLink] = useState(null)

  useEffect(() => {
    document.documentElement.classList.add('ap-tela-cheia')
    if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('/apps/treino/sw.js', { scope: '/apps/treino/' }).catch(() => {})
    const lerHash = async () => {
      const m = location.hash.match(/plano=([\w-]+)/)
      if (!m) return
      history.replaceState(null, '', location.pathname)
      try {
        setPlanoLink(await deBase64(m[1]))
      } catch {}
    }
    lerHash()
    window.addEventListener('hashchange', lerHash)
    const salva = (() => {
      try {
        return sessionStorage.getItem('tr.aba')
      } catch {
        return null
      }
    })()
    if (salva && ABAS.some((a) => a[0] === salva)) setAba(salva)
    return () => {
      window.removeEventListener('hashchange', lerHash)
      document.documentElement.classList.remove('ap-tela-cheia')
    }
  }, [])

  const ir = (a) => {
    setAba(a)
    try {
      sessionStorage.setItem('tr.aba', a)
    } catch {}
    window.scrollTo(0, 0)
  }

  if (!bib || !pronto || !rotinas)
    return (
      <div className="tr-app tr-carregando">
        <span className="spinner" aria-hidden="true" /> Carregando o Treino…
      </div>
    )

  return (
    <BibProvider value={bib}>
      <AvisoProvider>
        <div className="tr-app">
          <header className="tr-topo">
            <a href="/apps/treino" className="tr-voltar" aria-label="Sair do app">
              ←
            </a>
            <h1>{ABAS.find((a) => a[0] === aba)[1]}</h1>
            <span className="tr-marca">Treino</span>
          </header>
          <main className="tr-conteudo">
            {aba === 'hoje' && <Hoje cfg={cfg} mudarCfg={mudarCfg} abrirSessao={(s, edicao = false) => setSessao({ s, edicao })} irPara={ir} />}
            {aba === 'rotinas' && <Rotinas cfg={cfg} mudarCfg={mudarCfg} />}
            {aba === 'exercicios' && (
              <div className="tr-pagina">
                <Biblioteca />
              </div>
            )}
            {aba === 'progresso' && <Progresso cfg={cfg} mudarCfg={mudarCfg} />}
            {aba === 'ajustes' && <Ajustes cfg={cfg} mudarCfg={mudarCfg} />}
          </main>
          <nav className="tr-abas-baixo" aria-label="Seções">
            {ABAS.map(([id, nome, icone]) => (
              <button key={id} type="button" className={aba === id ? 'ativo' : ''} aria-current={aba === id ? 'page' : undefined} onClick={() => ir(id)}>
                <span aria-hidden="true">{icone}</span>
                {nome}
              </button>
            ))}
          </nav>
          {sessao && <Sessao key={sessao.s.id} sessao={sessao.s} edicao={sessao.edicao} cfg={cfg} onFechar={() => setSessao(null)} />}
          {planoLink && (
            <Modal titulo="Importar plano compartilhado" onFechar={() => setPlanoLink(null)}>
              <p>Alguém compartilhou um plano com {planoLink.r?.length || 0} rotina(s):</p>
              <ul>
                {(planoLink.r || []).map((r, i) => (
                  <li key={i}>
                    <strong>{r.n}</strong> <span className="tr-ajuda">({r.i?.length || 0} exercícios)</span>
                  </li>
                ))}
              </ul>
              <div className="tr-acoes">
                <button
                  type="button"
                  className="tr-btn tr-btn-primario"
                  onClick={async () => {
                    const novas = rotinasDoLink(planoLink).map((r, i) => ({ ...r, ordem: rotinas.length + i + 1 }))
                    await salvarVarios('rotinas', novas)
                    if (planoLink.m && planoLink.m !== cfg.modo && !rotinas.length) await mudarCfg({ modo: planoLink.m })
                    setPlanoLink(null)
                    ir('rotinas')
                  }}
                >
                  Adicionar às minhas rotinas
                </button>
                <button type="button" className="tr-btn tr-btn-ghost" onClick={() => setPlanoLink(null)}>
                  Agora não
                </button>
              </div>
            </Modal>
          )}
        </div>
      </AvisoProvider>
    </BibProvider>
  )
}
