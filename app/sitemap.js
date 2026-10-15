import { SITE_URL, site } from '@/lib/site'
import { games } from '@/lib/games'
import { tools } from '@/lib/tools'

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
    { url: `${SITE_URL}/jogos`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    ...games.map((game) => ({
      url: `${SITE_URL}/jogos/${game.slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
      images: [`${SITE_URL}/jogos/${game.slug}/opengraph-image`],
    })),
  ]
}
