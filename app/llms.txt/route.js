// /llms.txt: resumo em Markdown para assistentes de IA que pesquisam na web (proposta llmstxt.org).
import { curriculo as cv, periodo } from '@/lib/curriculo'
import { SITE_URL, site } from '@/lib/site'

export const dynamic = 'force-static'

export function GET() {
  const texto = [
    `# ${site.shortName}`,
    '',
    `> Site de ${cv.nome}, ${cv.titulo}. Ferramentas online grátis, sistemas de gestão, apps e jogos que rodam no navegador.`,
    '',
    `## Sobre ${cv.nome}`,
    '',
    cv.resumo,
    '',
    ...cv.destaques.map((d) => `- ${d}`),
    '',
    `## Experiência (${cv.empresa.nome}, ${cv.empresa.tipo}, ${periodo(cv.empresa)})`,
    '',
    ...cv.alocacoes.map((a) => `- ${a.cliente}, ${a.papel} (${periodo(a)}): ${a.itens[0]}`),
    '',
    '## Páginas',
    '',
    `- [Currículo completo](${SITE_URL}/curriculo): experiência, competências, certificações e formação`,
    `- [Currículo em JSON Resume](${SITE_URL}/resume.json)`,
    `- [Ferramentas](${SITE_URL}/ferramentas): PDF, calculadoras e geradores grátis`,
    `- [Sistemas](${SITE_URL}/sistemas): sistemas de gestão para pequenos negócios`,
    `- [Apps](${SITE_URL}/apps) e [Jogos](${SITE_URL}/jogos)`,
    '',
    '## Contato',
    '',
    `- E-mail: ${cv.email}`,
    ...cv.links.map(([nome, url]) => `- ${nome}: ${url}`),
    '',
  ].join('\n')
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
