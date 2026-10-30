import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apps, getApp } from '@/lib/apps'
import { bannerDoApp } from '@/lib/banners'
import { SITE_URL, jsonLd } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return apps.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const app = getApp(slug)
  if (!app) return {}
  return {
    title: app.titulo,
    description: app.descricao,
    alternates: { canonical: `/apps/${slug}` },
    openGraph: { title: app.titulo, description: app.descricao, url: `/apps/${slug}` },
  }
}

export default async function AppPage({ params }) {
  const { slug } = await params
  const app = getApp(slug)
  if (!app) notFound()
  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: app.nome,
      description: app.descricao,
      url: `${SITE_URL}/apps/${slug}`,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Navegador',
      inLanguage: 'pt-BR',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    },
    ...(app.faq.length
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: app.faq.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
          },
        ]
      : []),
  ]
  return (
    <main className="container tool-page" style={{ '--ap-cor': app.cor }}>
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/apps">Apps</Link>
        <span aria-hidden="true">/</span>
        <span>{app.nome}</span>
      </nav>

      <Image src={bannerDoApp(app.slug)} alt={`${app.nome}: ${app.curto}`} width={1920} height={768} priority className="pagina-banner" sizes="(max-width: 1192px) 100vw, 1160px" />
      <header className="ap-hero">
        <span className="ap-hero-icone" aria-hidden="true">
          {app.icone}
        </span>
        <div>
          <h1>{app.titulo}</h1>
          <p className="lead">{app.descricao}</p>
          <Link href={`/apps/${slug}/app`} className="btn btn-primary btn-lg">
            Abrir o {app.nome}
          </Link>
          <Link href={`/apps/${slug}/teste`} className="btn btn-ghost btn-lg">🧪 Testes</Link>
        </div>
      </header>

      {app.recursos.length > 0 && (
        <section className="tool-info">
          <h2>O que dá para fazer</h2>
          <div className="ap-recursos">
            {app.recursos.map(([t, d]) => (
              <div key={t} className="ap-recurso">
                <strong>{t}</strong>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {app.aviso && (
        <section className="tool-info prose">
          <p className="muted small">{app.aviso}</p>
        </section>
      )}

      {app.faq.length > 0 && (
        <section className="tool-info faq">
          <h2>Perguntas frequentes</h2>
          {app.faq.map(([q, r]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{r}</p>
            </details>
          ))}
        </section>
      )}

      <section className="ap-proposta">
        <div>
          <h2>Precisa de um app sob medida?</h2>
          <p className="muted">Eu desenvolvo apps web que funcionam no celular e offline, do jeito que o seu negócio precisa.</p>
        </div>
        <Link href="/curriculo#contato" className="btn btn-primary btn-lg">
          Pedir uma proposta
        </Link>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
