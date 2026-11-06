import Editor from '@/components/jornal/Editor'

const title = 'Meu Jornal: crie seu jornalzinho grátis, com cara de jornal de papel'
const description =
  'Crie de graça o seu próprio jornal com cara de jornal impresso antigo: escreva matérias, escolha a manchete, arraste para priorizar e compartilhe o link. Simples e limpo.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/jornal' },
  openGraph: { title, description, url: '/jornal' },
}

export default function JornalPage() {
  return <Editor />
}
