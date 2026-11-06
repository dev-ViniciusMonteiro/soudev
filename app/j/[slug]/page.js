import { notFound } from 'next/navigation'
import Capa from '@/components/jornal/Capa'
import Visita from '@/components/jornal/Visita'
import { organizarCapa } from '@/lib/jornal/formato'
import { carregarJornal } from './dados'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const d = await carregarJornal(slug).catch(() => null)
  if (!d) return { title: 'Jornal não encontrado', robots: { index: false } }
  const { manchete } = organizarCapa(d.materias)
  const title = d.jornal.nome
  const description = d.jornal.config.lema || (manchete ? `Manchete: ${manchete.titulo}` : `As notícias de ${d.jornal.nome}.`)
  return { title: { absolute: title }, description, alternates: { canonical: `/j/${slug}` }, openGraph: { title, description, url: `/j/${slug}`, type: 'website' } }
}

export default async function JornalCapa({ params }) {
  const { slug } = await params
  const d = await carregarJornal(slug)
  if (!d) notFound()
  return (
    <>
      <Capa jornal={d.jornal} materias={d.materias} />
      <Visita slug={slug} />
    </>
  )
}
