import Link from 'next/link'
import ContactForm from '@/components/ContactForm'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { categories, tools } from '@/lib/tools'
import { nichos } from '@/lib/sistemas/nichos'
import { games } from '@/lib/games'

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

const icones = {
  golpes: '🛡️',
  saude: '💪',
  emergencia: '🚨',
  pdf: '📄',
  trabalho: '💼',
  dia: '🧮',
  texto: '🔐',
  geradores: '⚙️',
}

// Vitrine: as categorias de ferramentas mais os sistemas e os jogos, cada uma com os seus itens.
const vitrine = [
  ...categories.map((c) => ({
    id: c.id,
    icone: icones[c.id] ?? '🧰',
    nome: c.name,
    descricao: c.description,
    verTodos: `/ferramentas#${c.id}`,
    itens: tools.filter((t) => t.category === c.id).map((t) => ({ href: `/ferramentas/${t.slug}`, badge: t.badge, nome: t.name, texto: t.short })),
  })),
  {
    id: 'sistemas',
    icone: '🏪',
    nome: 'Sistemas de gestão',
    descricao: 'PDV, cardápio online, agenda, ordem de serviço, academia e CRM para usar sem limite. Precisa de algo do jeito do seu negócio? Faço sob medida.',
    verTodos: '/sistemas',
    itens: nichos.map((n) => ({ href: `/sistemas/${n.slug}`, badge: n.badge, nome: n.nome, texto: n.curto, emoji: true })),
  },
  {
    id: 'jogos',
    icone: '🎮',
    nome: 'Jogos',
    descricao: 'Jogos grátis direto no navegador, no PC ou no celular, sem baixar nada.',
    verTodos: '/jogos',
    itens: games.map((g) => ({ href: `/jogos/${g.slug}`, badge: g.badge, nome: g.name, texto: g.short })),
  },
]

export default function Home() {
  const featured = destaques.map((slug) => tools.find((tool) => tool.slug === slug))
  const total = vitrine.reduce((s, c) => s + c.itens.length, 0)

  return (
    <main>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">
            <span className="dot" /> {site.name} · {site.role}
          </p>
          <h1>
            Ferramentas, sistemas e jogos para usar <span className="gradient-text">sem limite</span>.
          </h1>
          <p className="lead">
            {tools.length} ferramentas de PDF, cálculos trabalhistas, QR Code Pix e geradores, {nichos.length} sistemas de gestão para pequenos negócios e {games.length} jogos. Tudo roda direto no
            navegador: sem cadastro, sem limite de uso, e seus arquivos nunca saem do seu computador.
          </p>
          <div className="hero-actions">
            <Link href="#categorias" className="btn btn-primary btn-lg">
              Ver por categoria
            </Link>
            <Link href="/ferramentas" className="btn btn-ghost btn-lg">
              Buscar ferramenta
            </Link>
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
          <strong>Sem limite e sem cadastro</strong>
          <span>Abra, use e pronto, quantas vezes quiser. Sem conta e sem limite diário.</span>
        </div>
        <div>
          <strong>Tabelas de 2026</strong>
          <span>INSS, IRRF com a nova isenção até R$ 5 mil e CNPJ alfanumérico.</span>
        </div>
      </section>

      <section className="container">
        <div className="proposta">
          <div>
            <strong>Aberto a propostas</strong>
            <span>Crio sistemas personalizados para o seu negócio: do jeito que você trabalha, com as integrações que precisar. Conte a ideia e eu preparo uma proposta.</span>
          </div>
          <Link href="#contato" className="btn btn-primary">
            Falar comigo
          </Link>
        </div>
      </section>

      <section id="categorias" className="container section">
        <div className="section-head">
          <h2>Categorias</h2>
          <p className="muted">
            {total} itens em {vitrine.length} categorias. Toque numa categoria para ir direto a ela.
          </p>
        </div>
        <nav className="vitrine-categorias" aria-label="Categorias">
          {vitrine.map((c) => (
            <a key={c.id} href={`#cat-${c.id}`} className="vitrine-categoria">
              <span className="vitrine-icone" aria-hidden="true">
                {c.icone}
              </span>
              <span className="vitrine-categoria-nome">{c.nome}</span>
              <span className="vitrine-qtd">{c.itens.length} {c.itens.length === 1 ? 'item' : 'itens'}</span>
            </a>
          ))}
        </nav>
      </section>

      <div className="container vitrine">
        {vitrine.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="vitrine-secao" aria-labelledby={`titulo-${c.id}`}>
            <header className="vitrine-cabecalho">
              <span className="vitrine-icone" aria-hidden="true">
                {c.icone}
              </span>
              <div>
                <h2 id={`titulo-${c.id}`}>{c.nome}</h2>
                <p className="muted">{c.descricao}</p>
              </div>
              <Link href={c.verTodos} className="vitrine-ver">
                Ver tudo →
              </Link>
            </header>
            <div className="vitrine-grade">
              {c.itens.map((item) => (
                <Link key={item.href} href={item.href} className="minicard">
                  <span className={item.emoji ? 'minicard-badge emoji' : 'minicard-badge'} aria-hidden="true">
                    {item.badge}
                  </span>
                  <span className="minicard-corpo">
                    <strong>{item.nome}</strong>
                    <span>{item.texto}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

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
          <h2>Sugira uma ferramenta ou peça um sistema sob medida.</h2>
          <p className="muted">
            Faltou alguma ferramenta? Quer um sistema personalizado para o seu negócio, um site ou uma automação com IA? Conte o que precisa que eu preparo uma proposta. Mande uma mensagem ou me acompanhe no Instagram{' '}
            <a href={site.instagram} target="_blank" rel="noopener noreferrer">{site.instagramHandle}</a>.
          </p>
        </div>
        <ContactForm />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
