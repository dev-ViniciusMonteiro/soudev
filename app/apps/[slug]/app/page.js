import { notFound } from 'next/navigation'
import { AppCliente } from '@/components/apps/Carregadores'
import { apps, getApp } from '@/lib/apps'

export const dynamicParams = false

export function generateStaticParams() {
  return apps.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const app = getApp(slug)
  return {
    title: app ? app.nome : 'App',
    robots: { index: false, follow: true },
    alternates: { canonical: `/apps/${slug}` },
    ...(slug === 'treino' ? { manifest: '/apps/treino/manifest.webmanifest' } : {}),
  }
}

export default async function AppAbertoPage({ params }) {
  const { slug } = await params
  if (!getApp(slug)) notFound()
  return <AppCliente slug={slug} />
}
