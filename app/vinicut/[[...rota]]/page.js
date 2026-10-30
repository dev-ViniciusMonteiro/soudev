import Vinicut from '@/components/vinicut/Vinicut'

export const metadata = {
  title: 'Vinicut: rede social com cara de Orkut',
  description: 'Recados, depoimentos, amigos e comunidades — só texto, de brincadeira, no estilo Orkut. Entre só com usuário e senha.',
  alternates: { canonical: '/vinicut' },
  openGraph: { title: 'Vinicut', description: 'A rede social de brincadeira com cara de Orkut.', url: '/vinicut' },
}

export default function VinicutPage() {
  return <Vinicut />
}
