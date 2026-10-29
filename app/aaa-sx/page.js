import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Empresas',
  robots: { index: false, follow: false },
}

// Atalho para a tela de super-admin das empresas (servida pelo painel de ideias, mesmo login).
export default function AtalhoEmpresas() {
  const api = process.env.NEXT_PUBLIC_IDEIAS_API
  if (api) redirect(`${api.replace(/\/$/, '')}/admin/empresas`)

  return (
    <main className="container" style={{ padding: '48px 0', maxWidth: 640 }}>
      <h1>Empresas</h1>
      <p className="muted">
        Falta definir a variável <code>NEXT_PUBLIC_IDEIAS_API</code> (Vercel → Settings →
        Environment Variables) e refazer o deploy.
      </p>
    </main>
  )
}
