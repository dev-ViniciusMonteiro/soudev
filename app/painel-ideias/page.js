import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Painel de ideias',
  robots: { index: false, follow: false },
}

// Atalho: leva direto para o painel admin (servido pelo Worker da Cloudflare).
// Usa a mesma variável do balão. Enquanto ela não estiver configurada, mostra as instruções.
export default function PainelIdeias() {
  const api = process.env.NEXT_PUBLIC_IDEIAS_API
  if (api) redirect(`${api.replace(/\/$/, '')}/admin`)

  return (
    <main className="container" style={{ padding: '48px 0', maxWidth: 640 }}>
      <h1>Painel de ideias</h1>
      <p className="muted">
        O painel ainda não está ligado. Falta definir a variável{' '}
        <code>NEXT_PUBLIC_IDEIAS_API</code> com a URL do Worker da Cloudflare (em
        Vercel → Settings → Environment Variables) e refazer o deploy.
      </p>
      <p className="muted">
        Enquanto isso, o painel fica no endereço do próprio Worker, terminando em{' '}
        <code>/admin</code>.
      </p>
    </main>
  )
}
