import Link from 'next/link'
import { TrackEvent } from '@/components/Analytics'

export default function NotFound() {
  return (
    <main className="container section not-found">
      <TrackEvent name="page_not_found" />
      <h1>Página não encontrada</h1>
      <p className="muted">O endereço pode ter mudado. Veja todas as ferramentas disponíveis.</p>
      <Link href="/#ferramentas" className="btn btn-primary">Ver ferramentas</Link>
    </main>
  )
}
