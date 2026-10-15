import { SITE_URL } from '@/lib/site'

export default function robots() {
  return {
    // /jogar/ guarda os arquivos do jogo; a página indexável é /jogos/<nome>.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/jogar/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
