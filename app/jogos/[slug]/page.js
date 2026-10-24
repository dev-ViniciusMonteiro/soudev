import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdSlot from '@/components/AdSlot'
import GamePlayer from '@/components/GamePlayer'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { games, getGame } from '@/lib/games'
import { bannerDoJogo } from '@/lib/banners'

export const dynamicParams = false

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const game = getGame(slug)
  if (!game) return {}
  const url = `/jogos/${game.slug}`
  return {
    title: game.title,
    description: game.description,
    keywords: game.keywords,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: game.title, description: game.description, url },
    twitter: { card: 'summary_large_image', title: game.title, description: game.description },
  }
}

export default async function GamePage({ params }) {
  const { slug } = await params
  const game = getGame(slug)
  if (!game) notFound()
  const url = `${SITE_URL}/jogos/${game.slug}`

  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: game.name,
      description: game.description,
      url,
      image: `${url}/opengraph-image`,
      genre: game.genre,
      gamePlatform: ['Navegador web', 'PC', 'Celular'],
      playMode: 'SinglePlayer',
      applicationCategory: 'Game',
      operatingSystem: 'Qualquer navegador com WebGL',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      author: { '@type': 'Person', name: site.name, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Jogos', item: `${SITE_URL}/jogos` },
        { '@type': 'ListItem', position: 3, name: game.name, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: game.faq.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ]

  return (
    <main className="container tool-page" data-game-slug={game.slug}>
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/jogos">Jogos</Link>
      </nav>

      <Image src={bannerDoJogo(game.slug)} alt={`${game.name}: ${game.short}`} width={1920} height={768} priority className="pagina-banner" sizes="(max-width: 1192px) 100vw, 1160px" />

      <header className="tool-header">
        <span className="tool-badge tool-badge-lg" aria-hidden="true">{game.badge}</span>
        <div>
          <h1>{game.name}</h1>
          <p className="lead">{game.intro}</p>
        </div>
      </header>

      <GamePlayer name={game.name} playUrl={game.playUrl} />

      <AdSlot />

      <div className="tool-content">
        <section className="tool-info">
          <h2>Controles</h2>
          <div className="rows">
            {game.controls.map(([action, keys]) => (
              <div key={action} className="row">
                <span>{action}</span>
                <strong>{keys}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="tool-info prose">
          <h2>Sobre o jogo</h2>
          {game.about.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </section>
      </div>

      <section className="tool-info">
        <h2>Perguntas frequentes</h2>
        <div className="faq">
          {game.faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tool-info">
        <h2>Créditos</h2>
        <p className="muted">
          {game.credits.text}{' '}
          <a href={game.credits.url} target="_blank" rel="noopener noreferrer">
            {game.credits.linkText ?? 'Ver o projeto original'}
          </a>
          {game.credits.license ? ` (licença ${game.credits.license}).` : '.'}
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
