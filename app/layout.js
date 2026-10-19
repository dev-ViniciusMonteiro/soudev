import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google'
import Link from 'next/link'
import Script from 'next/script'
import Analytics from '@/components/Analytics'
import CookieConsent, { CookiePreferencesButton } from '@/components/CookieConsent'
import MenuMobile from '@/components/MenuMobile'
import { GA_ID, gaInitScript } from '@/lib/analytics'
import { SITE_URL, site } from '@/lib/site'
import './globals.css'

// Títulos em serifa (Newsreader) e texto em IBM Plex: fogem do Inter que todo site gerado por IA usa.
const serif = Newsreader({ subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'], variable: '--font-newsreader', display: 'swap' })
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-plex', display: 'swap' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' })

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Ferramentas Online Grátis: PDF, Calculadoras e Geradores',
    template: `%s | ${site.shortName}`,
  },
  description: site.description,
  applicationName: site.shortName,
  authors: [{ name: site.name, url: SITE_URL }],
  creator: site.name,
  publisher: site.name,
  category: 'utilities',
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { type: 'website', locale: 'pt_BR', siteName: site.shortName },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
}

export const viewport = {
  themeColor: '#f7f5f0',
  width: 'device-width',
  initialScale: 1,
}

const menu = [
  ['/ferramentas', 'Ferramentas'],
  ['/sistemas', 'Sistemas'],
  ['/apps', 'Apps'],
  ['/jogos', 'Jogos'],
  ['/curriculo', 'Currículo'],
  ['/#contato', 'Contato'],
]

export default function RootLayout({ children }) {
  const year = new Date().getFullYear()
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: gaInitScript }} />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo">
              Vinicius Monteiro
            </Link>
            <nav className="nav">
              <Link href="/ferramentas">Ferramentas</Link>
              <Link href="/sistemas">Sistemas</Link>
              <Link href="/apps">Apps</Link>
              <Link href="/jogos">Jogos</Link>
              <Link href="/curriculo">Currículo</Link>
              <Link href="/#contato" className="nav-cta">Contato</Link>
            </nav>
            <MenuMobile links={menu} />
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="container footer-inner">
            <div>
              <strong>{site.name}</strong>
              <p className="muted small">
                {site.role}. Ferramentas gratuitas que rodam no seu navegador: seus arquivos não são enviados para servidores.
              </p>
            </div>
            <div className="footer-links">
              <Link href="/ferramentas">Todas as ferramentas</Link>
              <Link href="/sistemas">Sistemas de gestão</Link>
              <Link href="/jogos">Jogos grátis</Link>
              <Link href="/curriculo">Currículo</Link>
              <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram {site.instagramHandle}</a>
              <Link href="/#contato">Fale comigo</Link>
              <Link href="/privacidade">Privacidade</Link>
              <CookiePreferencesButton />
            </div>
          </div>
          <div className="container muted small footer-copy">© {year} {site.name}. Os resultados das calculadoras são estimativas.</div>
        </footer>

        {/* Carrega depois da página ficar interativa: não atrasa a renderização nem os Core Web Vitals. */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Analytics />
        <CookieConsent />

        {adsenseClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
