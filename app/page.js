import Link from 'next/link'
import Carrossel from '@/components/Carrossel'
import ContactForm from '@/components/ContactForm'
import JogosPorModo from '@/components/JogosPorModo'
import { bannerDoJogo, bannersDaHome } from '@/lib/banners'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { categories, tools } from '@/lib/tools'
import { nichos } from '@/lib/sistemas/nichos'
import { MODOS, games } from '@/lib/games'
import { apps } from '@/lib/apps'

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

const servicos = [
  ['Sites e aplicações web', 'Rápidos, responsivos e feitos para vender.'],
  ['Sistemas sob medida', 'Do jeito que o seu negócio trabalha, com as integrações que precisar.'],
  ['IA e automação', 'Atendimento e rotinas que hoje tomam horas da sua equipe.'],
  ['Aulas e mentoria', 'Programação e IA aplicada, para pessoas e times.'],
]

// Índice: as categorias de ferramentas mais os sistemas, os apps e os jogos, cada uma com os seus itens.
const indice = [
  ...categories.map((c) => ({
    id: c.id,
    nome: c.name,
    descricao: c.description,
    verTodos: `/ferramentas#${c.id}`,
    itens: tools.filter((t) => t.category === c.id).map((t) => ({ href: `/ferramentas/${t.slug}`, nome: t.name, texto: t.short })),
  })),
  {
    id: 'sistemas',
    nome: 'Sistemas de gestão',
    descricao: 'PDV, cardápio online, agenda, ordem de serviço, academia e CRM.',
    verTodos: '/sistemas',
    itens: nichos.map((n) => ({ href: `/sistemas/${n.slug}`, nome: n.nome, texto: n.curto })),
  },
  {
    id: 'apps',
    nome: 'Apps',
    descricao: 'Apps completos que abrem no navegador e guardam os dados no seu aparelho.',
    verTodos: '/apps',
    itens: apps.map((a) => ({ href: `/apps/${a.slug}`, nome: a.nome, texto: a.curto })),
  },
  {
    id: 'jogos',
    nome: 'Jogos',
    descricao: 'Direto no navegador, no PC ou no celular, sem baixar nada.',
    verTodos: '/jogos',
    itens: games.map((g) => ({ href: `/jogos/${g.slug}`, nome: g.name, texto: g.short, icones: g.modos.map((m) => MODOS.find(([id]) => id === m)?.[2]).join('') })),
  },
]

// Jogos para o filtro por modo (só o que o componente do navegador precisa).
const jogos = games.map((g) => ({ slug: g.slug, name: g.name, short: g.short, modos: g.modos, banner: bannerDoJogo(g.slug) }))

export default function Home() {
  const total = indice.reduce((s, c) => s + c.itens.length, 0)

  return (
    <main>
      <section className="container intro">
        <Carrossel slides={bannersDaHome()} />
        <h1>Oi, eu sou o Vinicius. Faço ferramentas que resolvem as partes chatas do dia a dia, de graça.</h1>
        <p className="intro-acoes">
          <Link href="/ferramentas" className="btn btn-primary">
            Ver as ferramentas
          </Link>
          <Link href="/curriculo">Meu currículo</Link>
          <Link href="#contato">Fale comigo</Link>
        </p>
      </section>

      <section id="jogos" className="container secao">
        <div className="secao-cabeca">
          <h2>Jogos</h2>
          <p className="muted">
            Direto no navegador, sem baixar nada. Jogue online com amigos, com o corpo pela câmera ou no modo clássico. <Link href="/jogos">Ver todos os jogos</Link>.
          </p>
        </div>
        <JogosPorModo jogos={jogos} modos={MODOS} />
      </section>

      <section id="categorias" className="container secao">
        <div className="secao-cabeca">
          <h2>Tudo o que tem aqui</h2>
          <p className="muted">
            {total} itens, organizados como um índice. Precisa de algo que não está na lista? <Link href="#contato">Me conte</Link>.
          </p>
        </div>
        <div className="indice">
          {indice.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} className="indice-grupo" aria-labelledby={`titulo-${c.id}`}>
              <h3 id={`titulo-${c.id}`}>
                {c.nome} <span className="indice-qtd">{c.itens.length}</span>
              </h3>
              <p className="indice-descricao">{c.descricao}</p>
              <ul>
                {c.itens.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} title={item.texto}>
                      {item.nome}
                      {item.icones && <span className="jogo-modos"> {item.icones}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={c.verTodos} className="indice-ver">
                Ver todos →
              </Link>
            </section>
          ))}
        </div>
      </section>

      <section className="container secao">
        <div className="proposta">
          <div>
            <strong>Aberto a propostas</strong>
            <span>Faço sistemas sob medida: do jeito que você trabalha, com as integrações que precisar. Conte a ideia e eu preparo uma proposta.</span>
          </div>
          <Link href="#contato" className="btn btn-primary">
            Falar comigo
          </Link>
        </div>
      </section>

      <section id="sobre" className="container secao sobre">
        <div>
          <h2>Quem faz</h2>
          <p>
            Sou <strong>{site.name}</strong>, Tech Lead e desenvolvedor full stack. Atuo na área desde 2018 e, desde 2021, na Compass UOL,
            em projetos para Natura, Qualicorp, UOL EdTech e hoje no Cidade Center Norte.
          </p>
          <p>
            Criei este site para deixar de graça as ferramentas que mais facilitam o dia a dia. Elas são rápidas, simples e não guardam os seus
            dados. <Link href="/curriculo">Veja meu currículo completo</Link>.
          </p>
        </div>
        <dl className="servicos">
          {servicos.map(([title, text]) => (
            <div key={title}>
              <dt>{title}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="contato" className="container secao contact">
        <div>
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
