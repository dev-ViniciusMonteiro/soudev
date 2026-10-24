import { VinicutCliente } from '@/components/vinicut/Carregador'

export const metadata = {
  title: 'Vinicut: a rede social com cara de Orkut',
  description: 'Recados, depoimentos, "sou fã", comunidades com fórum, fotos e o feed dos amigos. A rede social do Vinicius, grátis.',
  alternates: { canonical: '/vinicut' },
  openGraph: { title: 'Vinicut', description: 'A rede social com cara de Orkut e jeito de hoje.', url: '/vinicut' },
}

export default function VinicutPage() {
  return <VinicutCliente />
}
