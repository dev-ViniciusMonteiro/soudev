'use client'

import { useEffect, useState } from 'react'

export default function VitrineTestes() {
  const [ind, setInd] = useState(undefined)
  useEffect(() => {
    fetch('/testes/indice.json').then((r) => (r.ok ? r.json() : null)).then(setInd).catch(() => setInd(null))
  }, [])

  if (ind === undefined) return <p className="muted">Carregando…</p>
  if (!ind) return <p className="muted">As evidências ainda não foram geradas. Rode <code>npm run test:e2e</code>.</p>

  const data = new Date(ind.geradoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const sistemas = ind.itens.filter((i) => i.tipo === 'sistema')
  const apps = ind.itens.filter((i) => i.tipo === 'app')
  const redes = ind.itens.filter((i) => i.tipo === 'rede')
  const destino = (i) => (i.tipo === 'sistema' ? `/sistemas/${i.slug}/teste` : i.tipo === 'app' ? `/apps/${i.slug}/teste` : `/${i.slug}`)

  const Cartao = (i) => (
    <a key={`${i.tipo}-${i.slug}`} className="vt-card" href={destino(i)}>
      <div className="vt-thumb">{i.capa ? <img src={i.capa} alt={i.nome} loading="lazy" /> : <span className="vt-semimg">sem print</span>}</div>
      <div className="vt-info">
        <strong>{i.nome}</strong>
        <span className={`vt-selo ${i.ok ? '' : 'ruim'}`}>{i.ok ? '✓ passou' : '✗ falhou'}</span>
      </div>
    </a>
  )

  return (
    <div className="vt">
      <div className={`vt-resumo ${ind.ok === ind.total ? 'bom' : 'ruim'}`}>
        <strong>{ind.ok}/{ind.total}</strong> projetos testados automaticamente e funcionando · atualizado em {data}
      </div>
      <h2 className="vt-sec">Sistemas de gestão</h2>
      <div className="vt-grid">{sistemas.map(Cartao)}</div>
      <h2 className="vt-sec">Apps</h2>
      <div className="vt-grid">{apps.map(Cartao)}</div>
      {redes.length > 0 && (
        <>
          <h2 className="vt-sec">Rede social</h2>
          <div className="vt-grid">{redes.map(Cartao)}</div>
        </>
      )}
      <p className="muted small">Cada projeto é testado num navegador real (Playwright): abre, interage e tira prints. Clique num card para ver os passos e as evidências.</p>
    </div>
  )
}
