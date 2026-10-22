'use client'

// Os apps usam APIs do navegador (IndexedDB, câmera, WebGL, WebCodecs): nada de renderizar no servidor.

import dynamic from 'next/dynamic'

const carregando = () => (
  <div className="ap-carregando">
    <span className="spinner" aria-hidden="true" /> Carregando…
  </div>
)

const Treino = dynamic(() => import('./treino/Treino'), { ssr: false, loading: carregando })
const Editor = dynamic(() => import('./editor/Editor'), { ssr: false, loading: carregando })
const Globo = dynamic(() => import('./globo/Globo'), { ssr: false, loading: carregando })
const Documentador = dynamic(() => import('./documentador/Documentador'), { ssr: false, loading: carregando })
const Imoveis = dynamic(() => import('./imoveis/Imoveis'), { ssr: false, loading: carregando })
const Ppfd = dynamic(() => import('./ppfd/Ppfd'), { ssr: false, loading: carregando })

export function AppCliente({ slug }) {
  if (slug === 'treino') return <Treino />
  if (slug === 'editor-de-video') return <Editor />
  if (slug === 'globo') return <Globo />
  if (slug === 'documentador') return <Documentador />
  if (slug === 'imoveis') return <Imoveis />
  if (slug === 'ppfd') return <Ppfd />
  return null
}
