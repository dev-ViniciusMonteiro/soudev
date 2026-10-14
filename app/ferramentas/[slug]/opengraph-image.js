import { ogSize, renderOg } from '@/lib/og'
import { getTool, tools } from '@/lib/tools'

export const alt = 'Ferramenta online grátis'
export const size = ogSize
export const contentType = 'image/png'

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }))
}

export default async function Image({ params }) {
  const { slug } = await params
  const tool = getTool(slug)
  return renderOg({ badge: tool?.badge, title: tool?.name ?? 'Ferramentas grátis', subtitle: tool?.short })
}
