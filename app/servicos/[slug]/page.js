import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { getServico, servicos } from '@/lib/servicos'
import { BotaoAdicionar, BotaoPedir, Carrinho } from '@/components/servicos/Orcamento'

export const dynamicParams = false
export function generateStaticParams() {
  return servicos.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const s = getServico(slug)
  if (!s) return {}
  return {
    title: { absolute: `${s.titulo} | Vinicius Monteiro` },
    description: s.descricao,
    keywords: s.keywords,
    alternates: { canonical: `/servicos/${s.slug}` },
    openGraph: { title: s.titulo, description: s.descricao, url: `/servicos/${s.slug}`, type: 'website' },
  }
}

export default async function ServicoPage({ params }) {
  const { slug } = await params
  const s = getServico(slug)
  if (!s) notFound()
  const url = `${SITE_URL}/servicos/${s.slug}`
  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: s.nome,
      serviceType: s.nome,
      description: s.descricao,
      url,
      provider: { '@type': 'Person', name: site.name, jobTitle: site.role, url: `${SITE_URL}/curriculo` },
      areaServed: { '@type': 'Country', name: 'Brasil' },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: s.nome,
        itemListElement: s.itens.map((i) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: i.nome, description: i.resumo } })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: s.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Serviços', item: `${SITE_URL}/servicos` },
        { '@type': 'ListItem', position: 3, name: s.nome, item: url },
      ],
    },
  ]
  const outros = servicos.filter((x) => x.slug !== s.slug)

  return (
    <main className="container sv" style={{ '--sv-cor': s.cor }}>
      <nav className="sv-trilha" aria-label="Você está em">
        <Link href="/">Início</Link> / <Link href="/servicos">Serviços</Link> / <span>{s.nome}</span>
      </nav>
      <section className="sv-hero sv-hero-servico">
        <span className="sv-hero-icone" aria-hidden="true">{s.icone}</span>
        <h1>{s.titulo}</h1>
        <p className="sv-lead">{s.chamada}</p>
        <p>{s.descricao}</p>
        <div className="sv-cta">
          <BotaoPedir />
          <a href="#itens" className="btn btn-lg">Ver opções</a>
        </div>
      </section>

      <section className="sv-beneficios">
        {s.beneficios.map(([t, d]) => (
          <div key={t}><h2>{t}</h2><p>{d}</p></div>
        ))}
      </section>

      <section id="itens" className="sv-catalogo">
        <h2>Escolha o que você precisa</h2>
        <ul className="sv-produtos">
          {s.itens.map((i) => (
            <li key={i.id} className="sv-produto">
              <div>
                <h3>{i.nome}</h3>
                <p>{i.resumo}</p>
              </div>
              <div className="sv-produto-pe">
                <span className="sv-preco">{i.preco || 'Sob orçamento'}</span>
                <BotaoAdicionar servico={s.slug} item={i.id} />
              </div>
            </li>
          ))}
        </ul>
        <div className="sv-cta"><BotaoPedir>Ver meu pedido e enviar</BotaoPedir></div>
      </section>

      <section className="sv-faq">
        <h2>Perguntas frequentes</h2>
        {s.faq.map(([q, a]) => (
          <details key={q}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>

      <section className="sv-outros">
        <h2>Outros serviços</h2>
        <div className="sv-cards">
          {outros.map((x) => (
            <Link key={x.slug} href={`/servicos/${x.slug}`} className="sv-card" style={{ '--sv-cor': x.cor }}>
              <span className="sv-card-icone" aria-hidden="true">{x.icone}</span>
              <h3>{x.nome}</h3>
              <p>{x.curto}</p>
              <span className="sv-card-mais">Ver detalhes →</span>
            </Link>
          ))}
        </div>
      </section>

      <Carrinho />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
