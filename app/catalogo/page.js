import Catalogo from '@/components/catalogo/Editor'

const title = 'Catálogo digital grátis com pedido pelo WhatsApp'
const description =
  'Crie grátis o catálogo da sua loja: cadastre até 20 produtos com foto e preço, monte a página arrastando os blocos e compartilhe o link. O cliente faz o pedido direto no seu WhatsApp.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/catalogo' },
  openGraph: { title, description, url: '/catalogo' },
}

export default function CatalogoPage() {
  return <Catalogo />
}
