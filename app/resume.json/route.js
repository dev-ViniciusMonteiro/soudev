// Currículo no padrão JSON Resume (jsonresume.org): lido por ferramentas de currículo, ATS e IAs.
import { curriculo as cv } from '@/lib/curriculo'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

// "04/2021" vira "2021-04"; "atual" fica sem data de fim.
const iso = (d) => (d === 'atual' ? undefined : d.split('/').reverse().join('-'))

export function GET() {
  const dados = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: cv.nome,
      label: cv.titulo,
      email: cv.email,
      url: `${SITE_URL}/curriculo`,
      summary: cv.resumo,
      location: { region: 'SP', countryCode: 'BR', city: cv.local },
      profiles: cv.links.map(([network, url]) => ({ network, url })),
    },
    work: cv.alocacoes.map((a) => ({
      name: `${cv.empresa.nome} (cliente: ${a.cliente})`,
      position: a.papel,
      startDate: iso(a.inicio),
      endDate: iso(a.fim),
      highlights: a.itens,
      keywords: a.stack,
    })).concat(cv.anteriores.map((a) => ({ name: a.empresa, position: a.papel, startDate: a.inicio, endDate: a.fim, highlights: a.itens }))),
    languages: cv.idiomas.map(([language, fluency]) => ({ language, fluency })),
    education: cv.formacao.map(([curso, escola, ano]) => ({ institution: escola, studyType: 'Bacharelado', area: curso.replace('Bacharelado em ', ''), endDate: ano })),
    certificates: cv.certificacoes.map((name) => ({ name })),
    skills: cv.competencias.map(([name, itens]) => ({ name, keywords: itens.split(', ') })),
    meta: { canonical: `${SITE_URL}/resume.json`, lastModified: new Date().toISOString().slice(0, 10) },
  }
  return Response.json(dados)
}
