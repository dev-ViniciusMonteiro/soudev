import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Painel',
  robots: { index: false, follow: false },
}

// Atalho curto/discreto para o painel admin (servido pelo Worker da Cloudflare).
export default function AtalhoAdmin() {
  const api = process.env.NEXT_PUBLIC_IDEIAS_API
  if (api) redirect(`${api.replace(/\/$/, '')}/admin`)

  return (
    <main className="container" style={{ padding: '48px 0', maxWidth: 640 }}>
      <h1>Painel</h1>
      <p className="muted">
        Falta definir a variável <code>NEXT_PUBLIC_IDEIAS_API</code> (Vercel → Settings →
        Environment Variables) e refazer o deploy. O painel fica no endereço do Worker,
        terminando em <code>/admin</code>.
      </p>
    </main>
  )
}
