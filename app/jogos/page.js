import Link from 'next/link'
import { SITE_URL, jsonLd } from '@/lib/site'
import { games } from '@/lib/games'

const title = 'Jogos Online Grátis no Navegador'
const description = 'Jogos grátis para jogar direto no navegador, sem baixar nada: mundo aberto 3D, corrida e mais. Funcionam no PC e no celular.'

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
        <p className="lead">Jogue direto no navegador, sem baixar nada e sem cadastro. Funciona no computador e no celular.</p>
      </header>

      <section className="tool-info">
        <div className="game-grid">
          {games.map((game) => (
            <Link key={game.slug} href={`/jogos/${game.slug}`} className="game-card">
              <span className="game-card-art" aria-hidden="true">
                <span>{game.name}</span>
              </span>
              <span className="game-card-body">
                <strong>{game.name}</strong>
                <span>{game.short}</span>
                <span className="game-tags">
                  {game.genre.map((g) => (
                    <span key={g}>{g}</span>
                  ))}
                </span>
              </span>
            </Link>
          ))}
        </div>
        <p className="muted small see-all">Mais jogos em breve.</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
