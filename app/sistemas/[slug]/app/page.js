import { notFound } from 'next/navigation'
import { SistemaCliente } from '@/components/sistemas/Carregadores'
import { getNicho, nichos } from '@/lib/sistemas/nichos'

export const dynamicParams = false

export function generateStaticParams() {
  return nichos.map((n) => ({ slug: n.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const nicho = getNicho(slug)
  return {
    title: nicho ? `${nicho.nome}: demonstração` : 'Sistema',
    robots: { index: false, follow: true },
    alternates: { canonical: `/sistemas/${slug}` },
  }
}

export default async function SistemaAppPage({ params }) {
  const { slug } = await params
  if (!getNicho(slug)) notFound()
  return <SistemaCliente slug={slug} />
}
