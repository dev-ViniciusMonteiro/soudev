import Link from 'next/link'
import ContactForm from '@/components/ContactForm'
import ToolsGrid from '@/components/ToolsGrid'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { tools } from '@/lib/tools'

export const metadata = {
  alternates: { canonical: '/' },
}

const structured = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.shortName,
    alternateName: `Ferramentas grátis de ${site.name}`,
    url: SITE_URL,
    description: site.description,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE_URL}/#vinicius` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#vinicius`,
    name: site.name,
    jobTitle: site.role,
    url: SITE_URL,
    sameAs: [site.instagram],
    knowsAbout: ['Desenvolvimento web', 'E-commerce', 'Inteligência artificial', 'Next.js', 'React'],
  },
]

const destaques = ['calculadora-rescisao', 'juntar-pdf', 'gerador-qr-code', 'calculadora-salario-liquido']

const servicos = [
  ['Sites e aplicações web', 'Experiências rápidas, responsivas e pensadas para conversão.'],
  ['Sistemas e dashboards', 'Ferramentas internas para operação, gestão e decisão.'],
  ['IA e automação', 'Agentes de atendimento e automações que economizam horas da equipe.'],
  ['Aulas e mentoria', 'Programação e IA aplicada para pessoas e times.'],
]

export default function Home() {
  const featured = destaques.map((slug) => tools.find((tool) => tool.slug === slug))

  return (
    <main>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">
            <span className="dot" /> {site.name} · {site.role}
          </p>
          <h1>
            Ferramentas online grátis que resolvem <span className="gradient-text">em segundos</span>.
          </h1>
          <p className="lead">
            {tools.length} ferramentas de PDF, cálculos trabalhistas, QR Code Pix, recibos e geradores. Tudo roda direto no seu navegador:
            sem cadastro, sem limite de uso, e seus arquivos nunca saem do seu computador.
          </p>
          <div className="hero-actions">
            <Link href="#ferramentas" className="btn btn-primary btn-lg">Ver todas as ferramentas</Link>
            <Link href="#sobre" className="btn btn-ghost btn-lg">Quem fez</Link>
          </div>
          <div className="featured">
            {featured.map((tool) => (
              <Link key={tool.slug} href={`/ferramentas/${tool.slug}`} className="featured-item">
                <span className="tool-badge">{tool.badge}</span>
                {tool.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container trust">
        <div>
          <strong>100% no navegador</strong>
          <span>Arquivos e dados processados localmente, sem upload.</span>
        </div>
        <div>
          <strong>Grátis e sem cadastro</strong>
          <span>Abra, use e pronto. Sem conta, sem limite diário.</span>
        </div>
        <div>
          <strong>Tabelas de 2026</strong>
          <span>INSS, IRRF com a nova isenção até R$ 5 mil e CNPJ alfanumérico.</span>
        </div>
      </section>

      <section id="ferramentas" className="container section">
        <div className="section-head">
          <h2>Todas as ferramentas</h2>
          <p className="muted">Escolha uma categoria ou busque pelo nome.</p>
        </div>
        <ToolsGrid />
      </section>

      <section id="sobre" className="container section about">
        <div className="about-text">
          <p className="eyebrow">Quem faz</p>
          <h2>Olá, eu sou o Vinicius.</h2>
          <p>
            Sou <strong>{site.name}</strong>, desenvolvedor full stack com mais de 8 anos de experiência construindo produtos digitais,
            e-commerce e soluções com IA, inclusive para grandes players do mercado.
          </p>
          <p>
            Criei este espaço para deixar gratuitas as ferramentas que mais facilitam o dia a dia. Elas são rápidas, simples e respeitam
            sua privacidade. Se precisar de algo sob medida para o seu negócio, fale comigo.
          </p>
        </div>
        <div className="services">
          {servicos.map(([title, text]) => (
            <div key={title} className="service">
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="contato" className="container section contact">
        <div>
          <p className="eyebrow">Contato</p>
          <h2>Sugira uma ferramenta ou peça um projeto.</h2>
          <p className="muted">
            Faltou alguma ferramenta? Quer um site, sistema ou automação com IA? Mande uma mensagem ou me acompanhe no Instagram{' '}
            <a href={site.instagram} target="_blank" rel="noopener noreferrer">{site.instagramHandle}</a>.
          </p>
        </div>
        <ContactForm />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
