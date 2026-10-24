import Link from 'next/link'
import { SITE_URL, jsonLd } from '@/lib/site'
import { MODOS, games } from '@/lib/games'
import { bannerDoJogo } from '@/lib/banners'
import JogosPorModo from '@/components/JogosPorModo'

const title = 'Jogos Online Grátis no Navegador'
const description = 'Jogos grátis direto no navegador, sem baixar nada: online com amigos, com o corpo pela câmera e clássicos em 3D. Funcionam no PC e no celular.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/jogos' },
  openGraph: { title, description, url: '/jogos' },
}

export default function GamesIndex() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${SITE_URL}/jogos`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: games.length,
      itemListElement: games.map((game, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: game.name,
        url: `${SITE_URL}/jogos/${game.slug}`,
      })),
    },
  }

  return (
    <main className="container tool-page">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span>Jogos</span>
      </nav>
      <header className="index-header">
        <h1>Jogos online grátis</h1>
        <p className="lead">Jogue direto no navegador, sem baixar nada. Escolha o modo: online com amigos, com o corpo pela câmera ou clássico, no teclado e no toque.</p>
      </header>

      <section className="tool-info">
        <JogosPorModo jogos={games.map((g) => ({ slug: g.slug, name: g.name, short: g.short, modos: g.modos, banner: bannerDoJogo(g.slug) }))} modos={MODOS} />
        <p className="muted small see-all">Mais jogos em breve.</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
