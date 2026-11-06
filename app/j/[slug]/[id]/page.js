import { notFound } from 'next/navigation'
import Materia from '@/components/jornal/Materia'
import { resumo } from '@/lib/jornal/formato'
import { carregarJornal } from '../dados'

async function achar(params) {
  const { slug, id } = await params
  const d = await carregarJornal(slug).catch(() => null)
  const m = d?.materias.find((x) => x.id === id)
  return m ? { ...d, materia: m, slug } : null
}

export async function generateMetadata({ params }) {
  const d = await achar(params)
  if (!d) return { title: 'Matéria não encontrada', robots: { index: false } }
  const { materia: m, jornal, slug } = d
  const description = m.linha_fina || resumo(m.texto, 160)
  return {
    title: { absolute: `${m.titulo} | ${jornal.nome}` },
    description,
    alternates: { canonical: `/j/${slug}/${m.id}` },
    openGraph: { title: m.titulo, description, url: `/j/${slug}/${m.id}`, type: 'article' },
  }
}

export default async function JornalMateria({ params }) {
  const d = await achar(params)
  if (!d) notFound()
  return <Materia jornal={d.jornal} materias={d.materias} materia={d.materia} />
}
