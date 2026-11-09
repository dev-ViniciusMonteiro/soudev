import Link from 'next/link'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { FAQ_GERAL, servicos } from '@/lib/servicos'
import { tools } from '@/lib/tools'
import { apps } from '@/lib/apps'
import { games } from '@/lib/games'
import { nichos } from '@/lib/sistemas/nichos'
import { BotaoAdicionar, BotaoPedir, Carrinho } from '@/components/servicos/Orcamento'

const title = 'Aulas de programação, criação de sistemas, deploy e IA para empresas'
const description =
  'Aulas particulares de programação e IA, criação de sites, sistemas e apps sob medida, publicação de projetos (domínio, hospedagem, deploy) e implantação de inteligência artificial em empresas. Orçamento grátis, online para todo o Brasil.'

export const metadata = {
  title: { absolute: `${title} | Vinicius Monteiro` },
  description,
  keywords: servicos.flatMap((s) => s.keywords.slice(0, 3)),
  alternates: { canonical: '/servicos' },
  openGraph: { title, description, url: '/servicos', type: 'website' },
}

const projetosNoAr = tools.length + apps.length + games.length + nichos.length

const exemplos = [
  ['/catalogo', 'Catálogo digital', 'Vitrine com pedido pelo WhatsApp'],
  ['/sistemas', 'Sistemas de gestão', `${nichos.length} sistemas: PDV, agenda, cardápio, OS`],
  ['/jornal', 'Meu Jornal', 'Editor com login e página pública'],
  ['/apps/racha-conta', 'Racha Conta', 'Cálculo que fecha no centavo'],
  ['/apps/karaoke', 'Karaokê', 'YouTube com letra sincronizada'],
  ['/ferramentas', 'Ferramentas grátis', `${tools.length} ferramentas no navegador`],
]

export default function ServicosPage() {
  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: `${site.name}: desenvolvimento, aulas e IA`,
      url: `${SITE_URL}/servicos`,
      description,
      founder: { '@type': 'Person', name: site.name, jobTitle: site.role, url: `${SITE_URL}/curriculo` },
      areaServed: [{ '@type': 'Country', name: 'Brasil' }, { '@type': 'City', name: 'Mogi Guaçu' }],
      address: { '@type': 'PostalAddress', addressLocality: 'Mogi Guaçu', addressRegion: 'SP', addressCountry: 'BR' },
      sameAs: [site.instagram],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Serviços',
        itemListElement: servicos.map((s) => ({
          '@type': 'OfferCatalog',
          name: s.nome,
          url: `${SITE_URL}/servicos/${s.slug}`,
          itemListElement: s.itens.map((i) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: i.nome, description: i.resumo } })),
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_GERAL.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ]

  return (
    <main className="container sv">
      <section className="sv-hero">
        <p className="sv-sobre">Serviços · Vinicius Monteiro</p>
        <h1>Aulas, sites, sistemas e IA para <span className="marca-texto">tirar sua ideia do papel</span>.</h1>
        <p className="sv-lead">
          Sou Tech Lead e desenvolvedor full stack há mais de 8 anos. Ensino programação, coloco projetos no ar, construo sistemas sob medida e
          implanto inteligência artificial em empresas. Online para todo o Brasil, presencial em Mogi Guaçu/SP.
        </p>
        <div className="sv-cta">
          <BotaoPedir />
          <a href="#catalogo" className="btn btn-lg">Ver o catálogo</a>
        </div>
        <ul className="sv-provas">
          <li><b>8+ anos</b> em grandes empresas</li>
          <li><b>{projetosNoAr}+</b> projetos no ar neste site</li>
          <li><b>Orçamento</b> grátis e sem compromisso</li>
        </ul>
      </section>

      <section className="sv-cards" aria-label="Serviços">
        {servicos.map((s) => (
          <Link key={s.slug} href={`/servicos/${s.slug}`} className="sv-card" style={{ '--sv-cor': s.cor }}>
            <span className="sv-card-icone" aria-hidden="true">{s.icone}</span>
            <h2>{s.nome}</h2>
            <p>{s.curto}</p>
            <span className="sv-card-mais">Ver detalhes →</span>
          </Link>
        ))}
      </section>

      <section id="catalogo" className="sv-catalogo">
        <h2>Monte seu pedido</h2>
        <p className="muted">Escolha um ou mais itens e envie o pedido. Respondo com valores e prazos, sem compromisso.</p>
        {servicos.map((s) => (
          <div key={s.slug} className="sv-grupo" style={{ '--sv-cor': s.cor }}>
            <h3><span aria-hidden="true">{s.icone}</span> <Link href={`/servicos/${s.slug}`}>{s.nome}</Link></h3>
            <ul className="sv-produtos">
              {s.itens.map((i) => (
                <li key={i.id} className="sv-produto">
                  <div>
                    <h4>{i.nome}</h4>
                    <p>{i.resumo}</p>
                  </div>
                  <div className="sv-produto-pe">
                    <span className="sv-preco">{i.preco || 'Sob orçamento'}</span>
                    <BotaoAdicionar servico={s.slug} item={i.id} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="sv-passos">
        <h2>Como funciona</h2>
        <ol>
          <li><b>Monte o pedido</b><span>Escolha os serviços ou só conte a sua ideia.</span></li>
          <li><b>Receba a proposta</b><span>Valores, prazos e o que está incluído, por escrito.</span></li>
          <li><b>Aprovou, começamos</b><span>Pagamento por etapas, conforme as entregas.</span></li>
          <li><b>No ar e seu</b><span>Código, domínio e acessos ficam com você.</span></li>
        </ol>
      </section>

      <section className="sv-exemplos">
        <h2>Feito por mim e no ar para você testar</h2>
        <ul>
          {exemplos.map(([href, nome, txt]) => (
            <li key={href}><Link href={href}><b>{nome}</b><span>{txt}</span></Link></li>
          ))}
        </ul>
        <p className="muted small">Experiência em grandes empresas de saúde, educação, varejo e cosméticos: veja o <Link href="/curriculo">currículo</Link>.</p>
      </section>

      <section className="sv-faq">
        <h2>Perguntas frequentes</h2>
        {FAQ_GERAL.map(([q, a]) => (
          <details key={q}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>

      <section className="sv-final">
        <h2>Tem uma ideia? Vamos colocar no ar.</h2>
        <BotaoPedir />
      </section>

      <Carrinho />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
