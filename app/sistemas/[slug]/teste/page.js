import { notFound } from 'next/navigation'
import { getNicho, nichos } from '@/lib/sistemas/nichos'
import TesteSistema from '@/components/teste/TesteSistema'

export const dynamicParams = false

export function generateStaticParams() {
  return nichos.map((n) => ({ slug: n.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const n = getNicho(slug)
  return {
    title: n ? `Autoteste: ${n.nome}` : 'Autoteste',
    robots: { index: false, follow: false },
    alternates: { canonical: `/sistemas/${slug}/teste` },
  }
}

export default async function TesteSistemaPage({ params }) {
  const { slug } = await params
  const n = getNicho(slug)
  if (!n) notFound()
  return <TesteSistema slug={slug} nome={n.nome} />
}
