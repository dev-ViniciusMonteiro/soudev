import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container section not-found">
      <h1>Página não encontrada</h1>
      <p className="muted">O endereço pode ter mudado. Veja todas as ferramentas disponíveis.</p>
      <Link href="/#ferramentas" className="btn btn-primary">Ver ferramentas</Link>
    </main>
  )
}
