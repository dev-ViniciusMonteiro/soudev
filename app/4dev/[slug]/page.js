import Link from 'next/link'
import { notFound } from 'next/navigation'
import DevRenderer from '@/components/dev/DevRenderer'
import EvidenciasTeste from '@/components/teste/EvidenciasTeste'
import { devTools, getDevTool } from '@/lib/dev/ferramentas'
import { SITE_URL, jsonLd, site } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return devTools.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const t = getDevTool(slug)
  if (!t) return {}
  return {
    title: t.titulo,
    description: t.descricao,
    keywords: t.keywords,
    alternates: { canonical: `/4dev/${slug}` },
    openGraph: { title: t.titulo, description: t.descricao, url: `/4dev/${slug}` },
  }
}

export default async function DevToolPage({ params }) {
  const { slug } = await params
  const t = getDevTool(slug)
  if (!t) notFound()
  const outras = devTools.filter((x) => x.slug !== slug)
  const url = `${SITE_URL}/4dev/${slug}`
  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: t.nome,
      description: t.descricao,
      url,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Qualquer navegador',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      author: { '@type': 'Person', name: site.name, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t.faq.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
    },
  ]
  return (
    <main className="dv-pagina" style={{ '--c': t.cor }}>
      <div className="dv-topo-ferramenta">
        <div className="dv-largo">
          <nav className="breadcrumb dv-bc" aria-label="Você está em">
            <Link href="/">Início</Link>
            <span aria-hidden="true">/</span>
            <Link href="/4dev">4dev</Link>
            <span aria-hidden="true">/</span>
            <span>{t.nome}</span>
          </nav>
          <header className="dv-cab">
            <span className="dv-card-sigla dv-sigla-g">{t.sigla}</span>
            <div>
              <h1>{t.nome}</h1>
              <p>{t.curto}</p>
            </div>
          </header>
          <div className="dv-palco" data-slug={slug}>
            <DevRenderer slug={slug} />
          </div>
        </div>
      </div>

      <div className="container dv-info">
        <section>
          <h2>O que dá para fazer</h2>
          <ul className="dv-recursos">
            {t.recursos.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="dv-desc">{t.descricao}</p>
        </section>
        <section>
          <h2>Perguntas frequentes</h2>
          {t.faq.map(([q, r]) => (
            <details key={q} className="dv-faq">
              <summary>{q}</summary>
              <p>{r}</p>
            </details>
          ))}
        </section>
        <EvidenciasTeste tipo="4dev" slug={slug} />
        <section>
          <h2>Outras ferramentas 4dev</h2>
          <div className="dv-mini-cards">
            {outras.map((o) => (
              <Link key={o.slug} href={`/4dev/${o.slug}`} style={{ '--c': o.cor }}>
                <span className="dv-card-sigla">{o.sigla}</span>
                <b>{o.nome}</b>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
