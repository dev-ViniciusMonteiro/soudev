import Link from 'next/link'
import { devTools } from '@/lib/dev/ferramentas'
import { SITE_URL, jsonLd } from '@/lib/site'

const title = '4dev: ferramentas grátis para programadores'
const description = 'JSON Toolkit, JWT Decoder, Cron Builder, API Tester no estilo Postman, SQL Toolkit e Webhook Inspector. Grátis, sem cadastro e rodando no navegador.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/4dev' },
  openGraph: { title, description, url: '/4dev' },
}

export default function DevIndex() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${SITE_URL}/4dev`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: devTools.length,
      itemListElement: devTools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.nome, url: `${SITE_URL}/4dev/${t.slug}` })),
    },
  }
  return (
    <main className="dv-pagina">
      <section className="dv-hero">
        <div className="container">
          <nav className="breadcrumb dv-bc" aria-label="Você está em">
            <Link href="/">Início</Link>
            <span aria-hidden="true">/</span>
            <span>4dev</span>
          </nav>
          <p className="dv-prompt" aria-hidden="true"><span>~/soudev</span> $ ls 4dev/</p>
          <h1>
            <span className="dv-logo">4dev</span> ferramentas para quem programa
          </h1>
          <p className="dv-lead">{description}</p>
          <div className="dv-cards">
            {devTools.map((t) => (
              <Link key={t.slug} href={`/4dev/${t.slug}`} className="dv-card" style={{ '--c': t.cor }}>
                <span className="dv-card-sigla">{t.sigla}</span>
                <h2>{t.nome}</h2>
                <p>{t.curto}</p>
                <ul>
                  {t.recursos.slice(0, 4).map((r) => <li key={r}>{r}</li>)}
                </ul>
                <span className="dv-card-ir">Abrir →</span>
              </Link>
            ))}
          </div>
          <p className="dv-rodape-hero">Tudo roda no seu navegador: nada do que você cola é enviado. A exceção é o Webhook Inspector, que precisa de uma URL pública para receber as requisições (e apaga tudo em 24 h).</p>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
