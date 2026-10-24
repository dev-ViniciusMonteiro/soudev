import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  ['Tem limite de uso ou mensalidade?', 'Não. Use quanto quiser, com quantas vendas, clientes e aparelhos precisar. A demonstração roda no seu navegador e, para usar de verdade, os dados ficam numa planilha do Google na sua conta.'],
  ['Dá para fazer um sistema do jeito do meu negócio?', 'Sim. Se precisar de outro fluxo, integração com o que você já usa, nota fiscal, app ou um sistema totalmente sob medida, mande uma mensagem pelo formulário de contato e eu preparo uma proposta.'],
  ['Onde ficam os meus dados?', 'Na demonstração, só no seu navegador. Conectado, numa planilha do Google Planilhas que é sua: cada tabela é uma aba e você pode abrir, filtrar e baixar tudo a qualquer momento.'],
  ['Funciona sem internet?', 'Sim. As vendas e os cadastros ficam guardados no aparelho e sobem para a planilha quando a internet volta. O status no topo mostra quantas alterações estão na fila.'],
  ['Como funciona o login?', 'Por e-mail, sem senha: você digita o e-mail e recebe um código de 6 dígitos. O dono da planilha cadastra os funcionários na aba de usuários, com papel de gerente ou operador de caixa.'],
  ['Recebo um e-mail a cada venda?', 'Sim, se quiser. O servidor da planilha manda um e-mail para os endereços que você escolher a cada venda concluída e a cada pedido ou agendamento online. Uma conta Gmail comum envia até cerca de 100 e-mails por dia.'],
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
          <p className="lead">{n.curto} Use sem limite, no navegador, com os dados na sua planilha do Google.</p>
          <div className="hero-actions">
            <Link href={`/sistemas/${n.slug}/app`} className="btn btn-primary btn-lg">
              Abrir demonstração
            </Link>
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
          <p className="muted small">A demonstração já vem com clientes, produtos e vendas de exemplo. Pode mexer à vontade: tudo fica só no seu navegador.</p>
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
          Recursos que você encontra em sistemas pagos como {n.parecido.join(', ')}. Dá para ligar módulos dos outros sistemas em Configurações, porque todos usam a mesma planilha.
        </p>
      </section>

      <section className="tool-info">
        <h2>Como usar com a sua planilha</h2>
        <ol className="steps-list">
          <li>Abra a demonstração e veja se o sistema serve para o seu negócio.</li>
          <li>Crie uma planilha no Google Planilhas, abra Extensões → Apps Script e cole o código que o sistema oferece em Configurações.</li>
          <li>Rode a função “configurar” e publique como App da Web. As abas são criadas sozinhas.</li>
          <li>Cole o link no sistema e entre com o código que chega no seu e-mail. Se quiser, leve junto os dados da demonstração.</li>
          <li>Cadastre seus produtos, serviços e funcionários. Pronto: cada venda vai para a planilha e para o seu e-mail.</li>
        </ol>
        <p className="see-all">
          <Link href="/sistemas/planilha" className="btn btn-ghost">
            Ver o guia completo, tela por tela →
          </Link>
        </p>
      </section>

      <section className="sx-sob-medida" style={{ '--sx-cor': n.cor }}>
        <div>
          <h2>Precisa do seu jeito?</h2>
          <p className="muted">
            Faço versões personalizadas deste sistema ou um sistema do zero para o seu negócio: outros fluxos, integração com o que você já usa, app, nota fiscal e o que mais precisar. Conte a ideia e eu
            preparo uma proposta.
          </p>
        </div>
        <Link href="/#contato" className="btn btn-primary btn-lg">
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
        <div className="sx-nichos">
          {outros.map((o) => (
            <Link key={o.slug} href={`/sistemas/${o.slug}`} className="sx-nicho-card" style={{ '--sx-cor': o.cor }}>
              <span className="sx-nicho-icone" aria-hidden="true">
                {o.badge}
              </span>
              <strong>{o.nome}</strong>
              <span>{o.curto}</span>
            </Link>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
