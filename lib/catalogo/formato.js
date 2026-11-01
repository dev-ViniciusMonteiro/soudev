// Preço, WhatsApp e cores do Catálogo digital.

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const reais = (centavos) => BRL.format((Number(centavos) || 0) / 100)

// "12,90" | "12.90" | "1.234,50" | "12" -> centavos
export function paraCentavos(texto) {
  let s = String(texto ?? '').replace(/[^\d,.]/g, '')
  if (!s) return 0
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
export const deCentavos = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')

// Guarda só dígitos; número brasileiro de 10/11 dígitos ganha o 55 na frente.
export function whatsappCompleto(digitos) {
  const d = String(digitos || '').replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) return `55${d}`
  return d
}
export function mascaraTelefone(digitos) {
  const d = String(digitos || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
}
export const linkWhatsapp = (digitos, texto) =>
  `https://wa.me/${whatsappCompleto(digitos)}?text=${encodeURIComponent(texto)}`

export function mensagemPedido({ loja, itens, nome, obs, entrega, url }) {
  const linhas = [`Olá! Vim pelo catálogo *${loja.nome}* e quero fazer um pedido:`, '']
  let total = 0
  for (const i of itens) {
    const sub = i.preco * i.qtd
    total += sub
    linhas.push(`• ${i.qtd}x ${i.nome}${i.preco ? ` — ${reais(sub)}` : ''}`)
  }
  linhas.push('', `*Total: ${reais(total)}*`)
  if (entrega) linhas.push(`Como receber: ${entrega}`)
  if (nome) linhas.push(`Nome: ${nome}`)
  if (obs) linhas.push(`Observação: ${obs}`)
  if (url) linhas.push('', url)
  return linhas.join('\n')
}

export function slugDe(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '')
}

// Texto preto ou branco, o que tiver mais contraste com a cor.
export function corDoTexto(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const lin = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L > 0.4 ? '#111111' : '#ffffff'
}
