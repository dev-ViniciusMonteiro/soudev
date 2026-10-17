import { notFound } from 'next/navigation'
import { LojaCliente } from '@/components/sistemas/Carregadores'

// Páginas que o cliente final da loja abre (o código da loja vem em ?s=).
const paginas = {
  cardapio: 'Cardápio e pedidos',
  agendar: 'Agendamento online',
  acompanhar: 'Acompanhe seu pedido',
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(paginas).map((pagina) => ({ pagina }))
}

export async function generateMetadata({ params }) {
  const { pagina } = await params
  return { title: paginas[pagina], robots: { index: false, follow: false } }
}

export default async function LojaPage({ params }) {
  const { pagina } = await params
  if (!paginas[pagina]) notFound()
  return <LojaCliente pagina={pagina} />
}
