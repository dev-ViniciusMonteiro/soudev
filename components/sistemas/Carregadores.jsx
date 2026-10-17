'use client'

// Os sistemas usam IndexedDB e só fazem sentido no navegador: nada de renderizar no servidor.

import dynamic from 'next/dynamic'

const carregando = () => (
  <div className="sx-carregando">
    <span className="spinner" aria-hidden="true" /> Carregando…
  </div>
)

const App = dynamic(() => import('./App'), { ssr: false, loading: carregando })
const Loja = dynamic(() => import('./LojaPublica'), { ssr: false, loading: carregando })

export function SistemaCliente({ slug }) {
  return <App slug={slug} />
}

export function LojaCliente({ pagina }) {
  return <Loja pagina={pagina} />
}
