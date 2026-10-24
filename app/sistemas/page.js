import Link from 'next/link'
import { SITE_URL, jsonLd } from '@/lib/site'
import { nichos } from '@/lib/sistemas/nichos'
import { bannerDoSistema } from '@/lib/banners'
import CartaoBanner from '@/components/CartaoBanner'

const title = 'Sistemas de Gestão: PDV, Cardápio Online, Agenda e OS'
const description =
  'Sistemas de gestão para usar sem limite no navegador, com os dados na sua planilha do Google: PDV, cardápio online, agenda, ordem de serviço, academia, pet shop e CRM.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/sistemas' },
  openGraph: { title, description, url: '/sistemas' },
}

const passos = [
  ['Teste na hora', 'Cada sistema abre com dados de exemplo. Nada é enviado: a demonstração fica só no seu navegador.'],
  ['Conecte sua planilha', 'Cole um script no Google Planilhas e publique. Cada tabela vira uma aba, e você é dono dos dados.'],
  ['Entre com o e-mail', 'Login por código enviado ao e-mail, sem senha. Cadastre funcionários na aba de usuários, com papel de dono, gerente ou operador.'],
  ['Funciona sem internet', 'As vendas ficam no aparelho e sobem para a planilha quando a conexão volta. Cada venda pode gerar um e-mail.'],
]

export default function SistemasIndex() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${SITE_URL}/sistemas`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: nichos.length,
      itemListElement: nichos.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n.nome, url: `${SITE_URL}/sistemas/${n.slug}` })),
    },
  }

  return (
    <main className="container tool-page">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span>Sistemas</span>
      </nav>
      <header className="index-header">
        <h1>Sistemas de gestão</h1>
        <p className="lead">
          PDV, caixa, cardápio online, agenda, ordem de serviço, mensalidades e CRM. Todos usam o mesmo banco de dados, uma planilha do Google sua, então os módulos se ligam: o cliente do cardápio é o mesmo da
          agenda, e a venda baixa o estoque e entra no caixa.
        </p>
      </header>

      <section className="tool-info">
        <div className="cartoes-grade">
          {nichos.map((n) => (
            <CartaoBanner key={n.slug} href={`/sistemas/${n.slug}`} banner={bannerDoSistema(n.slug)} nome={n.nome} texto={n.curto} />
          ))}
        </div>
      </section>

      <section className="tool-info">
        <h2>Como funciona</h2>
        <ol className="sx-como">
          {passos.map(([t, d]) => (
            <li key={t}>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ol>
        <p className="see-all">
          <Link href="/sistemas/planilha" className="btn btn-ghost">
            Como ligar à sua planilha: passo a passo →
          </Link>
        </p>
      </section>

      <section className="sx-sob-medida">
        <div>
          <h2>Não achou o sistema do seu negócio?</h2>
          <p className="muted">
            Todos aqui são para usar sem limite. Se você precisa de algo diferente, como outro nicho, integrações, app ou um fluxo do seu jeito, eu desenvolvo sob medida. Conte a ideia e eu preparo uma
            proposta.
          </p>
        </div>
        <Link href="/#contato" className="btn btn-primary btn-lg">
          Pedir uma proposta
        </Link>
      </section>

      <section className="tool-info prose">
        <h2>Uma planilha, vários sistemas</h2>
        <p>
          As abas são compartilhadas: <code>clientes</code>, <code>produtos</code>, <code>vendas</code>, <code>caixas</code>, <code>lancamentos</code>, e as de cada nicho, como <code>agendamentos</code>,{' '}
          <code>ordens</code>, <code>pets</code>, <code>matriculas</code> e <code>leads</code>. Um pet shop pode usar a agenda da barbearia e o PDV do mercadinho ao mesmo tempo, e uma academia pode ligar o funil
          de vendas do CRM. Campos novos viram colunas novas sozinhos.
        </p>
        <p className="muted small">
          Nota fiscal: a NFC-e e a NFS-e aparecem em modo simulação, com chave de acesso, DANFE e cancelamento, sem valor fiscal. A emissão real, com o certificado digital do seu negócio, entra num projeto sob medida.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
