import Link from 'next/link'
import CartaoBanner from '@/components/CartaoBanner'
import { bannerDaFerramenta } from '@/lib/banners'
import { SITE_URL, jsonLd } from '@/lib/site'
import { categories, tools } from '@/lib/tools'

const title = 'Todas as Ferramentas Online Grátis'
const description = `Lista completa com ${tools.length} ferramentas grátis: PDF, imagem, calculadoras trabalhistas 2026, porcentagem, IMC, QR Code Pix, recibo, CPF e CNPJ.`

export const metadata = {
  title,
  description,
  alternates: { canonical: '/ferramentas' },
  openGraph: { title, description, url: '/ferramentas' },
}

export default function ToolsIndex() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${SITE_URL}/ferramentas`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: tool.name,
        url: `${SITE_URL}/ferramentas/${tool.slug}`,
      })),
    },
  }

  return (
    <main className="container tool-page">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span>Ferramentas</span>
      </nav>
      <header className="index-header">
        <h1>Ferramentas online grátis</h1>
        <p className="lead">
          {tools.length} ferramentas que rodam direto no seu navegador, sem cadastro e sem enviar arquivos para a internet. Escolha uma categoria:
        </p>
        <div className="chips">
          {categories.map((category) => (
            <a key={category.id} href={`#${category.id}`} className="chip">
              {category.name}
            </a>
          ))}
        </div>
      </header>

      {categories.map((category) => (
        <section key={category.id} id={category.id} className="tool-info category-section">
          <h2>{category.name}</h2>
          <p className="muted category-desc">{category.description}</p>
          <div className="cartoes-grade">
            {tools
              .filter((tool) => tool.category === category.id)
              .map((tool) => (
                <CartaoBanner key={tool.slug} href={`/ferramentas/${tool.slug}`} banner={bannerDaFerramenta(tool.slug)} nome={tool.name} texto={tool.short} />
              ))}
          </div>
        </section>
      ))}

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
