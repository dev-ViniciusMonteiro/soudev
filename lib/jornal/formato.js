// Formatação do Meu Jornal (serve no servidor e no navegador).

const FUSO = 'America/Sao_Paulo'
const DIA = 86400000

export const PESOS = [
  ['manchete', 'Manchete', 'O assunto principal: título enorme no topo da capa.'],
  ['destaque', 'Destaque', 'Título grande e foto, logo abaixo da manchete.'],
  ['normal', 'Normal', 'Nas colunas da capa, com um trecho do texto.'],
  ['curta', 'Nota curta', 'Na coluna lateral "Curtas", com o texto inteiro.'],
]
export const SECOES = ['Cidade', 'Bairro', 'Política', 'Economia', 'Esporte', 'Cultura', 'Opinião', 'Tecnologia', 'Família', 'Classificados']

export const dataExtenso = (ms) =>
  new Date(ms).toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const dataCurta = (ms) => new Date(ms).toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' })

function romano(n) {
  const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let s = ''
  for (const [v, r] of t) while (n >= v) { s += r; n -= v }
  return s
}
// dia "civil" em São Paulo (para contar edições por dia)
const diaSP = (ms) => Math.floor((ms - 3 * 3600000) / DIA)

/** Data da edição = a publicação mais recente; Nº = dias desde a fundação; Ano em romano. */
export function edicao(jornal, materias) {
  const ultima = Math.max(jornal.criado_em, ...materias.map((m) => m.atualizado_em || m.publicado_em || 0))
  const dias = diaSP(ultima) - diaSP(jornal.criado_em)
  return { data: ultima, numero: dias + 1, ano: romano(Math.floor(dias / 365) + 1) }
}

export const paragrafos = (texto) => String(texto || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

export function resumo(texto, max = 240) {
  const p = paragrafos(texto)[0] || ''
  if (p.length <= max) return p
  return p.slice(0, p.lastIndexOf(' ', max) > 0 ? p.lastIndexOf(' ', max) : max).replace(/[,.;:\s]+$/, '') + '…'
}

/** Separa as matérias publicadas nos espaços da capa, respeitando a ordem escolhida. */
export function organizarCapa(materias) {
  const pubs = materias.filter((m) => m.estado === 'publicada')
  const curtas = pubs.filter((m) => m.peso === 'curta')
  const resto = pubs.filter((m) => m.peso !== 'curta')
  const manchete = resto.find((m) => m.peso === 'manchete') || resto[0] || null
  const sem = resto.filter((m) => m !== manchete)
  return {
    manchete,
    destaques: sem.filter((m) => m.peso === 'destaque' || m.peso === 'manchete'),
    normais: sem.filter((m) => m.peso === 'normal'),
    curtas,
    secoes: [...new Set(pubs.map((m) => m.secao).filter(Boolean))],
  }
}
