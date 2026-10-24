'use client'

// O Vinicut só roda no navegador (sessão no localStorage): nada de renderizar no servidor.

import dynamic from 'next/dynamic'

const Vinicut = dynamic(() => import('./Vinicut'), {
  ssr: false,
  loading: () => (
    <div className="vc-carregando">
      <span className="spinner" aria-hidden="true" /> Abrindo o Vinicut…
    </div>
  ),
})

export function VinicutCliente() {
  return <Vinicut />
}
