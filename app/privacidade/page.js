import Link from 'next/link'
import { CookiePreferencesButton } from '@/components/CookieConsent'
import { site } from '@/lib/site'

export const metadata = {
  title: 'Política de Privacidade e Cookies',
  description: 'Como o site trata seus dados: ferramentas que rodam no navegador, consultas a APIs públicas, Google Analytics, AdSense e seus direitos na LGPD.',
  alternates: { canonical: '/privacidade' },
}

const UPDATED = '16 de outubro de 2026'

export default function Privacidade() {
  return (
    <main className="container tool-page">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span>Privacidade</span>
      </nav>

      <header className="tool-header">
        <div>
          <h1>Política de Privacidade e Cookies</h1>
          <p className="lead">Atualizada em {UPDATED}. Responsável pelo site: {site.name}.</p>
        </div>
      </header>

      <div className="tool-info prose">
        <h2>Ferramentas e arquivos</h2>
        <p>
          As ferramentas de PDF, imagem, calculadoras e geradores rodam inteiramente no seu navegador. Os arquivos que você abre e os
          valores que você digita não são enviados para nossos servidores nem guardados.
        </p>
        <p>
          Algumas ferramentas consultam serviços públicos para buscar informações: BrasilAPI (CEP, CNPJ, DDD, bancos, ISBN), Banco Central
          e AwesomeAPI (cotações e taxas), FIPE (preço de veículos), Open-Meteo (clima e qualidade do ar), OpenStreetMap (endereços e
          lugares próximos) e os registros de domínios (registro.br e RDAP). Só o dado necessário para a consulta é enviado, e a página de
          cada ferramenta explica o que é consultado. Sua localização só é usada quando você permite, no próprio navegador.
        </p>

        <h2>Formulário de contato</h2>
        <p>
          O nome e a mensagem enviados pelo formulário de contato ficam guardados em uma planilha do Google, usada só para responder você.
          Peça a exclusão a qualquer momento pelo mesmo formulário ou pelo Instagram{' '}
          <a href={site.instagram} target="_blank" rel="noopener noreferrer">{site.instagramHandle}</a>.
        </p>

        <h2>Cookies</h2>
        <p>
          <strong>Necessários:</strong> guardam no seu navegador a escolha feita no aviso de cookies, por 12 meses.
        </p>
        <p>
          <strong>Estatísticas (Google Analytics):</strong> medem páginas visitadas, tempo de uso, tipo de aparelho, região aproximada e quais
          botões das ferramentas são usados. Nunca enviamos o texto que você digita nem o nome dos seus arquivos. Só são usados se você
          aceitar; sem aceite, o Google recebe apenas sinais anônimos sem cookies.
        </p>
        <p>
          <strong>Anúncios (Google AdSense):</strong> os anúncios mantêm o site gratuito. Com o seu aceite, o Google pode usar cookies para
          mostrar anúncios de acordo com seus interesses; recusando, os anúncios continuam, mas não são personalizados. Veja como o Google
          usa os dados em{' '}
          <a href="https://policies.google.com/technologies/partner-sites?hl=pt-BR" target="_blank" rel="noopener noreferrer">
            policies.google.com
          </a>
          .
        </p>
        <p>
          <CookiePreferencesButton className="btn btn-ghost" />
        </p>

        <h2>Seus direitos (LGPD)</h2>
        <p>
          Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir confirmação, acesso, correção ou exclusão dos seus dados e
          revogar o consentimento a qualquer momento. Para isso, use o <Link href="/#contato">formulário de contato</Link>.
        </p>
      </div>
    </main>
  )
}
