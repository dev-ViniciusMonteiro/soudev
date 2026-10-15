import { ogSize, renderOg } from '@/lib/og'
import { games, getGame } from '@/lib/games'

export const alt = 'Jogo online grátis'
export const size = ogSize
export const contentType = 'image/png'

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }))
}

export default async function Image({ params }) {
  const { slug } = await params
  const game = getGame(slug)
  return renderOg({ badge: game?.badge, title: game?.name ?? 'Jogos grátis', subtitle: game?.short })
}
