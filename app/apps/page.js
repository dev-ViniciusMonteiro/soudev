import Link from 'next/link'
import { apps } from '@/lib/apps'
import { SITE_URL, jsonLd } from '@/lib/site'

const title = 'Apps no navegador: treino, editor de vídeo, globo ao vivo e baixador'
const description = 'Apps completos que rodam no navegador, sem instalar e sem cadastro: diário de treino com progressão, editor de vídeo com linha do tempo, globo 3D ao vivo e baixador de vídeos.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/apps' },
  openGraph: { title, description, url: '/apps' },
}

export default function AppsIndex() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${SITE_URL}/apps`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: apps.length,
      itemListElement: apps.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.nome, url: `${SITE_URL}/apps/${a.slug}` })),
    },
  }
  return (
    <main className="container tool-page">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span>Apps</span>
      </nav>
      <header className="index-header">
        <h1>Apps</h1>
        <p className="lead">Aplicativos completos que abrem direto no navegador. Sem instalar, sem cadastro e sem limite: seus arquivos e dados ficam no seu aparelho.</p>
      </header>
      <section className="tool-info">
        <div className="ap-cards">
          {apps.map((a) => (
            <Link key={a.slug} href={`/apps/${a.slug}`} className="ap-card">
              <span className="ap-card-icone" aria-hidden="true">
                {a.icone}
              </span>
              <strong>{a.nome}</strong>
              <span>{a.curto}</span>
              <span className="ap-card-mais">Conhecer →</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="ap-proposta">
        <div>
          <h2>Quer um app assim para o seu negócio?</h2>
          <p className="muted">Eu desenvolvo apps web sob medida, que funcionam offline e no celular. Conte a ideia e eu preparo uma proposta.</p>
        </div>
        <Link href="/#contato" className="btn btn-primary btn-lg">
          Pedir uma proposta
        </Link>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
