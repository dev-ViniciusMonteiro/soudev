import { notFound } from 'next/navigation'
import Vitrine from '@/components/catalogo/Vitrine'
import { SITE_URL } from '@/lib/site'
import { carregarLoja } from './dados'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const d = await carregarLoja(slug).catch(() => null)
  if (!d) return { title: 'Catálogo não encontrado', robots: { index: false } }
  const { loja, produtos } = d
  const title = `${loja.nome}: catálogo e pedidos pelo WhatsApp`
  const description = loja.config.descricao || `Veja ${produtos.length} produtos de ${loja.nome} e faça o pedido direto pelo WhatsApp.`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/c/${slug}` },
    openGraph: { title: loja.nome, description, url: `/c/${slug}`, type: 'website' },
  }
}

export default async function CatalogoPublico({ params }) {
  const { slug } = await params
  const d = await carregarLoja(slug)
  if (!d) notFound()
  return (
    <div className="ct-publico">
      <Vitrine loja={d.loja} produtos={d.produtos} urlPublica={`${SITE_URL}/c/${slug}`} />
    </div>
  )
}
