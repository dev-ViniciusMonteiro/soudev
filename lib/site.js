export const site = {
  name: 'Vinicius Monteiro Orlandi',
  shortName: 'Vinicius.dev',
  role: 'Tech Lead e desenvolvedor full stack',
  description:
    'Ferramentas online grátis: juntar e converter PDF, calculadora de rescisão e salário líquido 2026, QR Code Pix, recibo, gerador de CPF e CNPJ. Sem cadastro.',
  instagram: 'https://www.instagram.com/vinicius.d3v',
  instagramHandle: '@vinicius.d3v',
  // Data da última atualização de conteúdo (usada no sitemap). Atualize ao mudar as ferramentas.
  updated: '2026-10-16',
}

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000')
).replace(/\/$/, '')

export const jsonLd = (data) => ({ __html: JSON.stringify(data).replace(/</g, '\\u003c') })
