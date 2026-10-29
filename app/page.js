import Image from 'next/image'
import Link from 'next/link'
import CartaoBanner from '@/components/CartaoBanner'
import Comentarios from '@/components/Comentarios'
import Fileira from '@/components/Fileira'
import JogosPorModo from '@/components/JogosPorModo'
import { DESTAQUES, bannerDaFerramenta, bannerDoApp, bannerDoJogo, bannerDoSistema, bannerPessoal } from '@/lib/banners'
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

// Todos os itens do site com o banner de cada um, por tipo.
const itens = {
  jogos: games.map((g) => ({ slug: g.slug, href: `/jogos/${g.slug}`, nome: g.name, texto: g.short, banner: bannerDoJogo(g.slug) })),
  apps: apps.map((a) => ({ slug: a.slug, href: `/apps/${a.slug}`, nome: a.nome, texto: a.curto, banner: bannerDoApp(a.slug) })),
  sistemas: nichos.map((n) => ({ slug: n.slug, href: `/sistemas/${n.slug}`, nome: n.nome, texto: n.curto, banner: bannerDoSistema(n.slug) })),
  ferramentas: tools.map((t) => ({ slug: t.slug, href: `/ferramentas/${t.slug}`, nome: t.name, texto: t.short, banner: bannerDaFerramenta(t.slug), categoria: t.category })),
}
const destaques = DESTAQUES.map((d) => ({ ...itens[d.tipo].find((i) => i.slug === d.slug), selo: d.selo }))

// Jogos para o filtro por modo (só o que o componente do navegador precisa).
const jogos = games.map((g) => ({ slug: g.slug, name: g.name, short: g.short, modos: g.modos, banner: bannerDoJogo(g.slug) }))

const total = Object.values(itens).reduce((s, l) => s + l.length, 0)

function Cabeca({ titulo, qtd, texto, href }) {
  return (
    <div className="secao-cabeca secao-cabeca-linha">
      <div>
        <h2>
          {titulo} <span className="secao-qtd">{qtd}</span>
        </h2>
        <p className="muted">{texto}</p>
      </div>
      <Link href={href} className="secao-ver">
        Ver todos →
      </Link>
    </div>
  )
}

const cartoes = (lista) => lista.map((i) => <CartaoBanner key={i.href} href={i.href} banner={i.banner} nome={i.nome} texto={i.texto} sizes="(max-width: 720px) 80vw, 340px" />)

export default function Home() {
  return (
    <main>
      <section className="container intro">
        <Link href={bannerPessoal.href} className="banner-pessoal">
          <Image src={bannerPessoal.imagem} alt={bannerPessoal.alt} width={bannerPessoal.largura} height={bannerPessoal.altura} priority sizes="(max-width: 1192px) 100vw, 1160px" />
        </Link>
        <h1>Oi, eu sou o Vinicius. Faço ferramentas que resolvem as partes chatas do dia a dia, de graça.</h1>
        <p className="intro-acoes">
          <Link href="#destaques" className="btn btn-primary">
            Ver os projetos
          </Link>
          <Link href="/curriculo">Meu currículo</Link>
          <a href={site.instagram} target="_blank" rel="noopener noreferrer">Fale comigo</a>
        </p>
      </section>

      <section id="destaques" className="container secao">
        <div className="secao-cabeca">
          <h2>Destaques</h2>
          <p className="muted">
            {total} projetos no ar, todos grátis e direto no navegador. Comece pelos que mais impressionam.
          </p>
        </div>
        <div className="destaques">
          {destaques.map((i, n) => (
            <div key={i.href} className={`destaque${n === 0 ? ' destaque-principal' : ''}`}>
              <CartaoBanner href={i.href} banner={i.banner} nome={i.nome} texto={i.texto} etiquetas={[i.selo]} grande={n === 0} priority={n === 0} sizes={n === 0 ? '(max-width: 1192px) 100vw, 1160px' : n < 3 ? '(max-width: 720px) 100vw, 570px' : '(max-width: 720px) 100vw, 380px'} />
            </div>
          ))}
        </div>
      </section>

      <section id="jogos" className="container secao">
        <Cabeca titulo="Jogos" qtd={jogos.length} texto="Online com amigos, com o corpo pela câmera ou no modo clássico. Sem baixar nada." href="/jogos" />
        <JogosPorModo jogos={jogos} modos={MODOS} variante="fileira" />
      </section>

      <section id="apps" className="container secao">
        <Cabeca titulo="Apps" qtd={itens.apps.length} texto="Apps completos que abrem no navegador e guardam os dados no seu aparelho." href="/apps" />
        <Fileira rotulo="Apps">{cartoes(itens.apps)}</Fileira>
      </section>

      <section id="sistemas" className="container secao">
        <Cabeca titulo="Sistemas de gestão" qtd={itens.sistemas.length} texto="PDV, cardápio online, agenda, ordem de serviço, academia e CRM, grátis para a sua equipe." href="/sistemas" />
        <Fileira rotulo="Sistemas">{cartoes(itens.sistemas)}</Fileira>
      </section>

      <section id="ferramentas" className="container secao">
        <Cabeca titulo="Ferramentas" qtd={itens.ferramentas.length} texto="Resolvem na hora, sem cadastro e sem enviar seus arquivos para a internet." href="/ferramentas" />
        {categories.map((cat) => (
          <div key={cat.id} id={`cat-${cat.id}`} className="ferramentas-categoria">
            <h3>
              <Link href={`/ferramentas#${cat.id}`}>{cat.name}</Link>
            </h3>
            <Fileira rotulo={cat.name}>{cartoes(itens.ferramentas.filter((t) => t.categoria === cat.id))}</Fileira>
          </div>
        ))}
      </section>

      <section className="container secao">
        <div className="proposta">
          <div>
            <strong>Aberto a propostas</strong>
            <span>Faço sistemas sob medida: do jeito que você trabalha, com as integrações que precisar. Conte a ideia e eu preparo uma proposta.</span>
          </div>
          <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Falar comigo
          </a>
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

      <Comentarios
        pagina="home"
        titulo="Comentários"
        subtitulo="Deixe uma ideia, um elogio ou conte o que você gostaria de ver no site."
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
