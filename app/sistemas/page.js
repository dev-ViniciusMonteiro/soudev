import Link from 'next/link'
import { SITE_URL, jsonLd } from '@/lib/site'
import { nichos } from '@/lib/sistemas/nichos'

const title = 'Sistemas de Gestão Grátis: PDV, Cardápio Online, Agenda e OS'
const description =
  'Sistemas de gestão grátis que funcionam no navegador e guardam os dados na sua planilha do Google: PDV, cardápio online, agenda, ordem de serviço, academia, pet shop e CRM.'

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
        <h1>Sistemas de gestão grátis</h1>
        <p className="lead">
          PDV, caixa, cardápio online, agenda, ordem de serviço, mensalidades e CRM. Todos usam o mesmo banco de dados, uma planilha do Google sua, então os módulos se ligam: o cliente do cardápio é o mesmo da
          agenda, e a venda baixa o estoque e entra no caixa.
        </p>
      </header>

      <section className="tool-info">
        <div className="sx-nichos">
          {nichos.map((n) => (
            <Link key={n.slug} href={`/sistemas/${n.slug}`} className="sx-nicho-card" style={{ '--sx-cor': n.cor }}>
              <span className="sx-nicho-icone" aria-hidden="true">
                {n.badge}
              </span>
              <strong>{n.nome}</strong>
              <span>{n.curto}</span>
              <span className="sx-nicho-mais">Ver o sistema →</span>
            </Link>
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
      </section>

      <section className="tool-info prose">
        <h2>Uma planilha, vários sistemas</h2>
        <p>
          As abas são compartilhadas: <code>clientes</code>, <code>produtos</code>, <code>vendas</code>, <code>caixas</code>, <code>lancamentos</code>, e as de cada nicho, como <code>agendamentos</code>,{' '}
          <code>ordens</code>, <code>pets</code>, <code>matriculas</code> e <code>leads</code>. Um pet shop pode usar a agenda da barbearia e o PDV do mercadinho ao mesmo tempo, e uma academia pode ligar o funil
          de vendas do CRM. Campos novos viram colunas novas sozinhos.
        </p>
        <p className="muted small">
          Os sistemas emitem cupom não fiscal. Nota fiscal (NFC-e) exige certificado digital e integração com a SEFAZ, o que não faz parte desta versão.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
