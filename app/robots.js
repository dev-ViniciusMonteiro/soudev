import { SITE_URL } from '@/lib/site'

export default function robots() {
  return {
    // /jogar/ guarda os arquivos do jogo; a página indexável é /jogos/<nome>. Ele fica liberado para o
    // Google conseguir ler o noindex (next.config.mjs): bloqueado aqui, a URL ainda poderia ser indexada.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
