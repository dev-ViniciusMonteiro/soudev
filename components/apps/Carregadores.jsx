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
const Win98 = dynamic(() => import('./win98/Win98'), { ssr: false, loading: carregando })
const Obra = dynamic(() => import('./demos/Obra'), { ssr: false, loading: carregando })
const MeuCarro = dynamic(() => import('./demos/MeuCarro'), { ssr: false, loading: carregando })
const Garantia = dynamic(() => import('./demos/Garantia'), { ssr: false, loading: carregando })
const Aluguel = dynamic(() => import('./demos/Aluguel'), { ssr: false, loading: carregando })
const AcheiPerdi = dynamic(() => import('./demos/AcheiPerdi'), { ssr: false, loading: carregando })
const Evento = dynamic(() => import('./demos/Evento'), { ssr: false, loading: carregando })
const ChecklistLimpeza = dynamic(() => import('./profissoes/ChecklistLimpeza'), { ssr: false, loading: carregando })
const PetRelatorio = dynamic(() => import('./profissoes/PetRelatorio'), { ssr: false, loading: carregando })
const AprovaFoto = dynamic(() => import('./profissoes/AprovaFoto'), { ssr: false, loading: carregando })
const AprovaProjeto = dynamic(() => import('./profissoes/AprovaProjeto'), { ssr: false, loading: carregando })
const Lentes = dynamic(() => import('./lentes/Lentes'), { ssr: false, loading: carregando })
const Karaoke = dynamic(() => import('./karaoke/Karaoke'), { ssr: false, loading: carregando })
const Visualizador = dynamic(() => import('./visualizador/Visualizador'), { ssr: false, loading: carregando })
const RachaConta = dynamic(() => import('./racha/RachaConta'), { ssr: false, loading: carregando })

export function AppCliente({ slug }) {
  if (slug === 'treino') return <Treino />
  if (slug === 'editor-de-video') return <Editor />
  if (slug === 'globo') return <Globo />
  if (slug === 'documentador') return <Documentador />
  if (slug === 'imoveis') return <Imoveis />
  if (slug === 'ppfd') return <Ppfd />
  if (slug === 'windows-98') return <Win98 />
  if (slug === 'obra-organizada') return <Obra />
  if (slug === 'meu-carro') return <MeuCarro />
  if (slug === 'garantia-facil') return <Garantia />
  if (slug === 'gestao-de-aluguel') return <Aluguel />
  if (slug === 'achei-perdi') return <AcheiPerdi />
  if (slug === 'evento-facil') return <Evento />
  if (slug === 'checklist-de-limpeza') return <ChecklistLimpeza />
  if (slug === 'pet-relatorio') return <PetRelatorio />
  if (slug === 'aprova-foto') return <AprovaFoto />
  if (slug === 'aprova-projeto') return <AprovaProjeto />
  if (slug === 'lente-certa') return <Lentes />
  if (slug === 'karaoke') return <Karaoke />
  if (slug === 'racha-conta') return <RachaConta />
  if (slug === 'visualizador') return <Visualizador />
  return null
}
