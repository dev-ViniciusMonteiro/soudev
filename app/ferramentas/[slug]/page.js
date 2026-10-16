import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdSlot from '@/components/AdSlot'
import ToolCard from '@/components/ToolCard'
import ToolRenderer from '@/components/ToolRenderer'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { categories, getTool, tools } from '@/lib/tools'

export const dynamicParams = false

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) return {}
  const url = `/ferramentas/${tool.slug}`
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: tool.title, description: tool.description, url },
    twitter: { card: 'summary_large_image', title: tool.title, description: tool.description },
  }
}

export default async function ToolPage({ params }) {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) notFound()

  const category = categories.find((item) => item.id === tool.category)
  const sameCategory = tools.filter((item) => item.category === tool.category && item.slug !== tool.slug)
  const others = tools.filter((item) => item.category !== tool.category)
  const related = [...sameCategory, ...others].slice(0, 6)
  const url = `${SITE_URL}/ferramentas/${tool.slug}`

  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: tool.name,
      headline: tool.title,
      description: tool.description,
      url,
      image: `${url}/opengraph-image`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Qualquer navegador',
      browserRequirements: 'Requer JavaScript',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      author: { '@type': 'Person', name: site.name, url: SITE_URL },
      dateModified: site.updated,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Ferramentas', item: `${SITE_URL}/ferramentas` },
        { '@type': 'ListItem', position: 3, name: tool.name, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faq.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ]

  return (
    <main className="container tool-page">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/ferramentas">Ferramentas</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/ferramentas#${category.id}`}>{category.name}</Link>
      </nav>

      <header className="tool-header">
        <span className="tool-badge tool-badge-lg" aria-hidden="true">{tool.badge}</span>
        <div>
          <h1>{tool.name}</h1>
          <p className="lead">{tool.intro}</p>
        </div>
      </header>

      <section className="tool-card-main" aria-label={tool.name} data-tool-slug={tool.slug} data-tool-category={tool.category}>
        <ToolRenderer slug={tool.slug} />
      </section>

      <AdSlot />

      <div className="tool-content">
        <section className="tool-info">
          <h2>Como usar: {tool.name.toLowerCase()}</h2>
          <ol className="steps-list">
            {tool.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="tool-info prose">
          <h2>Sobre a ferramenta</h2>
          {tool.about.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          <p className="muted small privacy-note">
            🔒 {tool.privacy ?? 'Esta ferramenta roda inteiramente no seu navegador. Nenhum dado ou arquivo é enviado para servidores.'} Feita por{' '}
            <Link href="/#sobre">{site.name}</Link>.
          </p>
        </section>
      </div>

      <section className="tool-info">
        <h2>Perguntas frequentes</h2>
        <div className="faq">
          {tool.faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tool-info">
        <h2>Outras ferramentas grátis</h2>
        <div className="tool-grid">
          {related.map((item) => (
            <ToolCard key={item.slug} tool={item} />
          ))}
        </div>
        <p className="see-all">
          <Link href="/ferramentas">Ver todas as {tools.length} ferramentas →</Link>
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
