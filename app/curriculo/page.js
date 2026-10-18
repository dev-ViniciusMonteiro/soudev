import Link from 'next/link'
import { BaixarCurriculo } from '@/components/BaixarCurriculo'
import { curriculo as cv, periodo } from '@/lib/curriculo'
import { SITE_URL, jsonLd } from '@/lib/site'
import './curriculo.css'

const title = `Currículo de ${cv.nome}: ${cv.titulo}`
const description = cv.resumo

export const metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/curriculo' },
  openGraph: { type: 'profile', title, description, url: '/curriculo' },
}

const host = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

export default function Curriculo() {
  // Dados estruturados: Google, LinkedIn e IAs de triagem leem o perfil sem depender do layout.
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: `${SITE_URL}/curriculo`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'Person',
      name: cv.nome,
      jobTitle: cv.titulo,
      email: `mailto:${cv.email}`,
      description: cv.resumo,
      url: `${SITE_URL}/curriculo`,
      sameAs: cv.links.map(([, url]) => url),
      worksFor: { '@type': 'Organization', name: cv.empresa.nome },
      alumniOf: cv.formacao.map(([curso, escola]) => ({ '@type': 'CollegeOrUniversity', name: escola.split(',')[0], description: curso })),
      hasCredential: cv.certificacoes.map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c })),
      knowsAbout: cv.competencias.flatMap(([, itens]) => itens.split(', ')),
      address: { '@type': 'PostalAddress', addressRegion: 'SP', addressCountry: 'BR' },
    },
  }

  return (
    <main className="container cv-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
      <nav className="breadcrumb cv-sem-impressao" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span>Currículo</span>
      </nav>

      <BaixarCurriculo />

      <article className="cv print-area">
        <header className="cv-topo">
          <h1>{cv.nome}</h1>
          <p className="cv-titulo">{cv.titulo}</p>
          <p className="cv-contato">
            <span>{cv.local}</span>
            <a href={`mailto:${cv.email}`}>{cv.email}</a>
            {cv.links.map(([nome, url]) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={nome}>
                {host(url)}
              </a>
            ))}
          </p>
        </header>

        <section>
          <h2>Resumo</h2>
          <p>{cv.resumo}</p>
          <ul>
            {cv.destaques.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Experiência</h2>
          <div className="cv-empresa">
            <h3>
              {cv.empresa.nome}: {cv.empresa.cargo}
            </h3>
            <span className="cv-data">{periodo(cv.empresa)}</span>
          </div>
          <p className="cv-nota">Consultoria de tecnologia (CLT). Alocações em clientes:</p>
          {cv.alocacoes.map((a) => (
            <div key={a.cliente} className="cv-alocacao">
              <div className="cv-empresa">
                <h4>
                  {a.cliente}: {a.papel}
                </h4>
                <span className="cv-data">{periodo(a)}</span>
              </div>
              <ul>
                {a.itens.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              {a.stack.length > 0 && <p className="cv-stack">{a.stack.join(' · ')}</p>}
            </div>
          ))}
        </section>

        <section>
          <h2>Competências</h2>
          <dl className="cv-competencias">
            {cv.competencias.map(([grupo, itens]) => (
              <div key={grupo}>
                <dt>{grupo}</dt>
                <dd>{itens}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Certificações</h2>
          <ul>
            {cv.certificacoes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Formação</h2>
          {cv.formacao.map(([curso, escola, ano]) => (
            <div key={curso} className="cv-empresa">
              <h3>
                {curso}, {escola}
              </h3>
              <span className="cv-data">{ano}</span>
            </div>
          ))}
        </section>
      </article>
    </main>
  )
}
