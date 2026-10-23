import { notFound } from 'next/navigation'
import { EquipeCliente } from '@/components/sistemas/Carregadores'
import { getNicho, nichos } from '@/lib/sistemas/nichos'

export const dynamicParams = false

export function generateStaticParams() {
  return nichos.map((n) => ({ slug: n.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const nicho = getNicho(slug)
  return {
    title: nicho ? `${nicho.nome}: cadastrar equipe` : 'Equipe',
    description: nicho ? `Crie sua conta grátis, cadastre a equipe e use o ${nicho.nome} com os dados na nuvem.` : undefined,
    robots: { index: false, follow: true },
    alternates: { canonical: `/sistemas/${slug}` },
  }
}

export default async function EquipePage({ params }) {
  const { slug } = await params
  if (!getNicho(slug)) notFound()
  return <EquipeCliente slug={slug} />
}
