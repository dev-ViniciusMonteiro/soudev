import { SITE_URL, site } from '@/lib/site'
import { games } from '@/lib/games'
import { tools } from '@/lib/tools'
import { nichos } from '@/lib/sistemas/nichos'
import { apps } from '@/lib/apps'
import { devTools } from '@/lib/dev/ferramentas'
import { servicos } from '@/lib/servicos'

export default function sitemap() {
  const lastModified = new Date(`${site.updated}T00:00:00Z`)
  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/ferramentas`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    ...tools.map((tool) => ({
      url: `${SITE_URL}/ferramentas/${tool.slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
      images: [`${SITE_URL}/ferramentas/${tool.slug}/opengraph-image`],
    })),
    { url: `${SITE_URL}/sistemas`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    ...nichos.map((n) => ({ url: `${SITE_URL}/sistemas/${n.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.8 })),
    { url: `${SITE_URL}/apps`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    ...apps.map((a) => ({ url: `${SITE_URL}/apps/${a.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.8 })),
    { url: `${SITE_URL}/4dev`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    ...devTools.map((t) => ({ url: `${SITE_URL}/4dev/${t.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.7 })),
    { url: `${SITE_URL}/catalogo`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/jornal`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/servicos`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    ...servicos.map((s) => ({ url: `${SITE_URL}/servicos/${s.slug}`, lastModified, changeFrequency: 'monthly', priority: 0.8 })),
    { url: `${SITE_URL}/jogos`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    ...games.map((game) => ({
      url: `${SITE_URL}/jogos/${game.slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
      images: [`${SITE_URL}/jogos/${game.slug}/opengraph-image`],
    })),
    { url: `${SITE_URL}/curriculo`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/privacidade`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
