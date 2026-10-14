import { site } from '@/lib/site'

export default function manifest() {
  return {
    name: `${site.shortName}: ferramentas online grátis`,
    short_name: site.shortName,
    description: site.description,
    lang: 'pt-BR',
    start_url: '/',
    display: 'standalone',
    background_color: '#050b18',
    theme_color: '#050b18',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
