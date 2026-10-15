import Link from 'next/link'
import Script from 'next/script'
import { SITE_URL, site } from '@/lib/site'
import './globals.css'

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
  themeColor: '#050b18',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  const year = new Date().getFullYear()
  return (
    <html lang="pt-BR">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo">
              <span className="logo-mark">V</span>
              <span className="logo-text">
                vinicius<span>.dev</span>
              </span>
            </Link>
            <nav className="nav">
              <Link href="/ferramentas">Ferramentas</Link>
              <Link href="/jogos" className="nav-games">Jogos</Link>
              <Link href="/#sobre">Sobre</Link>
              <Link href="/#contato" className="nav-cta">Contato</Link>
            </nav>
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
              <Link href="/jogos">Jogos grátis</Link>
              <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram {site.instagramHandle}</a>
              <Link href="/#contato">Fale comigo</Link>
            </div>
          </div>
          <div className="container muted small footer-copy">© {year} {site.name}. Os resultados das calculadoras são estimativas.</div>
        </footer>

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
