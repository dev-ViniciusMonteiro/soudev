import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CartaoBanner from '@/components/CartaoBanner'
import { SITE_URL, jsonLd, site } from '@/lib/site'
import { getNicho, modulos, nichos } from '@/lib/sistemas/nichos'
import { bannerDoSistema } from '@/lib/banners'

export const dynamicParams = false

export function generateStaticParams() {
  return nichos.map((n) => ({ slug: n.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const n = getNicho(slug)
  if (!n) return {}
  const url = `/sistemas/${n.slug}`
  return {
    title: n.titulo,
    description: n.description,
    keywords: n.keywords,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: n.titulo, description: n.description, url },
  }
}

const faqComum = [
  ['Tem limite de uso ou mensalidade?', 'Não. É grátis: crie a conta, cadastre a equipe e use com quantas vendas, clientes e aparelhos precisar. A versão beta roda no seu navegador com dados de exemplo, sem cadastro.'],
  ['Dá para fazer um sistema do jeito do meu negócio?', 'Sim. Se precisar de outro fluxo, integração com o que você já usa, nota fiscal, app ou um sistema totalmente sob medida, mande uma mensagem pelo formulário de contato e eu preparo uma proposta.'],
  ['Onde ficam os meus dados?', 'Na versão beta, só no seu navegador. Com a equipe cadastrada, na nuvem (Cloudflare), separados por equipe e disponíveis em todos os aparelhos. Em Configurações → Backup dá para baixar tudo quando quiser.'],
  ['Funciona sem internet?', 'Sim. As vendas e os cadastros ficam guardados no aparelho e sobem para a nuvem quando a internet volta. O status no topo mostra quantas alterações estão na fila.'],
  ['Como funciona o login e a equipe?', 'Com e-mail e senha. Quem cria a equipe é o dono e, em Configurações → Equipe, adiciona o e-mail de cada funcionário como gerente ou operador. A pessoa cria a conta com o mesmo e-mail e a equipe já aparece. Esqueceu a senha? O dono gera uma senha provisória.'],
  ['Recebo um e-mail a cada venda?', 'Na nuvem, os avisos aparecem no próprio sistema (pedidos e agendamentos novos chegam na tela). O aviso por e-mail a cada venda existe no modo planilha do Google, que manda até cerca de 100 e-mails por dia de uma conta Gmail comum.'],
  ['Emite nota fiscal?', 'Na demonstração, a NFC-e (venda de produto) e a NFS-e (serviço) saem em modo simulação: o sistema mostra todo o fluxo, gera a chave de acesso e imprime o DANFE com QR Code, mas nada vai para a SEFAZ e a nota não tem valor fiscal. A emissão de verdade entra num sistema sob medida, ligado a uma API fiscal com o certificado digital do seu negócio.'],
]

export default async function NichoPage({ params }) {
  const { slug } = await params
  const n = getNicho(slug)
  if (!n) notFound()
  const url = `${SITE_URL}/sistemas/${n.slug}`
  const outros = nichos.filter((x) => x.slug !== n.slug)
  const fonte = `demo-${n.slug}`

  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: n.nome,
      headline: n.titulo,
      description: n.description,
      url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Qualquer navegador',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      author: { '@type': 'Person', name: site.name, url: SITE_URL },
      featureList: n.recursos.map(([t]) => t),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Sistemas', item: `${SITE_URL}/sistemas` },
        { '@type': 'ListItem', position: 3, name: n.nome, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqComum.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ]

  return (
    <main className="container tool-page">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/sistemas">Sistemas</Link>
        <span aria-hidden="true">/</span>
        <span>{n.nome}</span>
      </nav>

      <Image src={bannerDoSistema(n.slug)} alt={`${n.nome}: ${n.curto}`} width={1920} height={768} priority className="pagina-banner" sizes="(max-width: 1192px) 100vw, 1160px" />

      <header className="sx-hero" style={{ '--sx-cor': n.cor }}>
        <span className="sx-nicho-icone grande" aria-hidden="true">
          {n.badge}
        </span>
        <div>
          <h1>{n.titulo}</h1>
          <p className="lead">{n.curto} Versão de demonstração grátis: roda no seu navegador com dados de exemplo, para você testar à vontade.</p>
          <div className="hero-actions">
            <Link href={`/sistemas/${n.slug}/app?beta=1`} className="btn btn-primary btn-lg">
              Abrir demonstração
            </Link>
            <Link href={`/sistemas/${n.slug}/teste`} className="btn btn-ghost btn-lg">🧪 Testes</Link>
            {n.publico.includes('cardapio') && (
              <Link href={`/loja/cardapio?s=${fonte}`} className="btn btn-ghost btn-lg">
                Ver o cardápio do cliente
              </Link>
            )}
            {n.publico.includes('agendar') && (
              <Link href={`/loja/agendar?s=${fonte}`} className="btn btn-ghost btn-lg">
                Ver o agendamento online
              </Link>
            )}
          </div>
          <p className="muted small">A versão beta já vem com clientes, produtos e vendas de exemplo, sem cadastro: pode mexer à vontade, tudo fica só no seu navegador.</p>
        </div>
      </header>

      <section className="tool-info">
        <h2>O que o sistema faz</h2>
        <div className="sx-recursos">
          {n.recursos.map(([t, d]) => (
            <div key={t} className="sx-recurso">
              <strong>{t}</strong>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="tool-info">
        <h2>Módulos incluídos</h2>
        <ul className="sx-modulos-lista">
          {n.modulos.map((m) => (
            <li key={m}>
              <span aria-hidden="true">{modulos[m].icone}</span> {modulos[m].tabela ? n.rotulos[modulos[m].tabela] ?? modulos[m].rotulo : modulos[m].rotulo}
            </li>
          ))}
        </ul>
        <p className="muted small">
          Recursos que você encontra em sistemas pagos como {n.parecido.join(', ')}. Dá para ligar módulos dos outros sistemas em Configurações, porque todos usam o mesmo banco de dados.
        </p>
      </section>

      <section className="tool-info">
        <h2>Como começar</h2>
        <ol className="steps-list">
          <li>Clique em “Abrir demonstração”: o sistema abre no seu navegador, já com dados de exemplo.</li>
          <li>Explore os módulos no menu lateral (PDV, caixa, cardápio, agenda…) e veja se serve para o seu negócio.</li>
          <li>Cadastre, edite e apague à vontade: nada é enviado, tudo fica só neste navegador.</li>
          <li>Em Configurações você liga módulos de outros sistemas e baixa um backup dos dados quando quiser.</li>
        </ol>
      </section>

      <section className="sx-sob-medida" style={{ '--sx-cor': n.cor }}>
        <div>
          <h2>Precisa do seu jeito?</h2>
          <p className="muted">
            Faço versões personalizadas deste sistema ou um sistema do zero para o seu negócio: outros fluxos, integração com o que você já usa, app, nota fiscal e o que mais precisar. Conte a ideia e eu
            preparo uma proposta.
          </p>
        </div>
        <Link href="/curriculo#contato" className="btn btn-primary btn-lg">
          Pedir uma proposta
        </Link>
      </section>

      <section className="tool-info">
        <h2>Perguntas frequentes</h2>
        <div className="faq">
          {faqComum.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tool-info">
        <h2>Outros sistemas</h2>
        <div className="cartoes-grade">
          {outros.map((o) => (
            <CartaoBanner key={o.slug} href={`/sistemas/${o.slug}`} banner={bannerDoSistema(o.slug)} nome={o.nome} texto={o.curto} />
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
