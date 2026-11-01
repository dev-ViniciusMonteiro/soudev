'use client'

import dynamic from 'next/dynamic'

const loading = () => (
  <div className="dv-ferramenta dv-carregando">
    <span className="pm-girando" aria-hidden="true" /> Carregando…
  </div>
)

const componentes = {
  'json-toolkit': dynamic(() => import('./JsonToolkit'), { loading, ssr: false }),
  'jwt-decoder': dynamic(() => import('./JwtDecoder'), { loading, ssr: false }),
  'cron-builder': dynamic(() => import('./CronBuilder'), { loading, ssr: false }),
  'api-tester': dynamic(() => import('./ApiTester'), { loading, ssr: false }),
  'sql-toolkit': dynamic(() => import('./SqlToolkit'), { loading, ssr: false }),
  'webhook-inspector': dynamic(() => import('./WebhookInspector'), { loading, ssr: false }),
}

export default function DevRenderer({ slug }) {
  const C = componentes[slug]
  return C ? <C /> : null
}
