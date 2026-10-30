import { notFound } from 'next/navigation'
import { apps, getApp } from '@/lib/apps'
import TesteApp from '@/components/teste/TesteApp'

export const dynamicParams = false

export function generateStaticParams() {
  return apps.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const a = getApp(slug)
  return {
    title: a ? `Autoteste: ${a.nome}` : 'Autoteste',
    robots: { index: false, follow: false },
    alternates: { canonical: `/apps/${slug}/teste` },
  }
}

export default async function TesteAppPage({ params }) {
  const { slug } = await params
  const a = getApp(slug)
  if (!a) notFound()
  return <TesteApp slug={slug} nome={a.nome} />
}
