import Link from 'next/link'
import VitrineTestes from '@/components/teste/VitrineTestes'

export const metadata = {
  title: 'Qualidade e testes: tudo testado e funcional',
  description: 'Todos os apps e sistemas do soudev são testados automaticamente num navegador real, com prints de evidência de cada etapa.',
  alternates: { canonical: '/testes' },
}

export default function TestesPage() {
  return (
    <main className="container tool-page">
      <p className="breadcrumb"><Link href="/">← Início</Link></p>
      <h1>Qualidade e testes</h1>
      <p className="lead">
        Cada app e sistema aqui do site passa por <strong>testes automatizados num navegador real</strong> (Playwright):
        o teste abre o projeto, interage e tira <strong>prints de cada etapa</strong> como evidência. Abaixo, o resultado de todos.
      </p>
      <VitrineTestes />
    </main>
  )
}
