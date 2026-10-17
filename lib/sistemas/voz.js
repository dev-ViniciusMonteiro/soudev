// Voz no navegador (sem servidor): ouvir com SpeechRecognition, falar com speechSynthesis e entender
// frases simples de quem vende: "vendi 2 coxinhas e um café", "gastei 50 reais de luz", "quanto vendi hoje".

export const vozDisponivel = () => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
export const falaDisponivel = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function falar(texto) {
  if (!falaDisponivel() || !texto) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = 'pt-BR'
  u.rate = 1
  const voz = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('pt'))
  if (voz) u.voice = voz
  window.speechSynthesis.speak(u)
}

/** Começa a ouvir. Devolve uma função para parar. */
export function ouvir({ onParcial, onFinal, onErro, onFim }) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!R) {
    onErro?.('Este navegador não entende voz. Use o Chrome no Android ou no computador.')
    return () => {}
  }
  const r = new R()
  r.lang = 'pt-BR'
  r.interimResults = true
  r.continuous = false
  r.maxAlternatives = 1
  r.onresult = (e) => {
    let texto = ''
    let final = false
    for (const res of e.results) {
      texto += res[0].transcript
      final = res.isFinal
    }
    if (final) onFinal?.(texto.trim())
    else onParcial?.(texto.trim())
  }
  r.onerror = (e) => onErro?.(e.error === 'not-allowed' ? 'Permita o uso do microfone para falar com o sistema.' : e.error === 'no-speech' ? 'Não ouvi nada. Toque no microfone e fale de novo.' : `Erro no microfone: ${e.error}`)
  r.onend = () => onFim?.()
  r.start()
  return () => r.abort()
}

/* ---------- Entender o que foi dito ---------- */

export const normalizar = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9,.$\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const UNIDADES = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 }

/** "duas coxinhas e cinquenta reais" -> "2 coxinhas e 50 reais". */
export function numerosPorExtenso(texto) {
  const tokens = normalizar(texto).split(' ')
  const out = []
  let atual = null
  let total = 0
  const fecha = () => {
    if (atual !== null || total) out.push(String(total + (atual || 0)))
    atual = null
    total = 0
  }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t === 'meia' && /^duzias?$/.test(tokens[i + 1] || '')) {
      if (atual !== null || total) fecha()
      out.push('6')
      i++
      continue
    }
    if (t in UNIDADES) {
      atual = (atual || 0) + UNIDADES[t]
      continue
    }
    if (t === 'mil') {
      total = (total + (atual || 1)) * 1000
      atual = 0
      continue
    }
    if (t === 'duzia' || t === 'duzias') {
      out.push(String((atual || 1) * 12))
      atual = null
      continue
    }
    // "vinte e cinco": o "e" no meio de um número não separa.
    if (t === 'e' && atual !== null && tokens[i + 1] in UNIDADES && (atual === 0 || UNIDADES[tokens[i + 1]] < (atual % 100 === 0 ? 100 : 10))) continue
    if (atual !== null || total) fecha()
    out.push(t)
  }
  fecha()
  return out.join(' ')
}

const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'no', 'na'])
const raiz = (p) => p.replace(/(oes|aes)$/, 'ao').replace(/(ns)$/, 'm').replace(/(es|s)$/, '')

/** Produto mais parecido com o trecho falado (ou null). */
export function acharProduto(trecho, produtos) {
  const palavras = normalizar(trecho)
    .split(' ')
    .filter((p) => p && !PARADAS.has(p) && !/^\d/.test(p))
    .map(raiz)
  if (!palavras.length) return null
  let melhor = null
  for (const p of produtos) {
    const nome = normalizar(p.nome)
      .split(' ')
      .filter((x) => x && !PARADAS.has(x))
      .map(raiz)
    if (!nome.length) continue
    const acertos = nome.filter((n) => palavras.some((w) => w === n || (w.length > 3 && n.startsWith(w)) || (n.length > 3 && w.startsWith(n)))).length
    const nota = acertos / nome.length + acertos * 0.01
    if (acertos && (!melhor || nota > melhor.nota)) melhor = { produto: p, nota }
  }
  return melhor && melhor.nota >= 0.5 ? melhor.produto : null
}

/** Primeiro valor em reais da frase: "50 reais e 30 centavos", "r$ 12,90", "12.5". */
export function lerValor(texto) {
  const t = numerosPorExtenso(texto).replace(/r\$\s*/g, '')
  const m = t.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real)?(?:\s*e\s*(\d{1,2})\s*centavos?)?/)
  if (!m) return null
  let v = Number(m[1].replace(',', '.'))
  if (m[2]) v += Number(m[2]) / 100
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null
}

const CATEGORIAS_GASTO = [
  ['contas', /\b(luz|energia|agua|internet|telefone|celular|gas)\b/],
  ['aluguel', /\baluguel\b/],
  ['impostos', /\b(das|imposto|taxa|inss)\b/],
  ['fornecedor', /\b(mercadoria|ingrediente|estoque|fornecedor|material|produto|embalage)/],
  ['marketing', /\b(anuncio|propaganda|instagram|marketing|panfleto)\b/],
  ['outros', /\b(gasolina|combustivel|uber|onibus|transporte|frete|entrega)\b/],
]

/**
 * Transforma a frase num comando. Tipos: vender, gasto, consulta, pagar, nota, limpar, desconhecido.
 */
export function interpretar(texto, produtos) {
  const t = numerosPorExtenso(texto)
  if (!t) return { acao: 'desconhecido', texto }
  if (/\b(limpa|limpar|apaga|apagar|cancela|cancelar|zera|zerar)\b/.test(t)) return { acao: 'limpar' }
  if (/\bnota\b/.test(t)) return { acao: 'nota' }
  if (/\bquanto\b|\bresumo\b|\bfaturei\b/.test(t)) {
    const periodo = /\bhoje\b/.test(t) ? 'hoje' : /\bsemana\b/.test(t) ? 'semana' : /\bano\b/.test(t) ? 'ano' : 'mes'
    const oque = /\b(gastei|gasto|gastos|despesa)\b/.test(t) ? 'gastos' : /\b(lucro|sobrou|ganhei)\b/.test(t) ? 'lucro' : 'vendas'
    return { acao: 'consulta', periodo, oque }
  }
  if (/\b(gastei|paguei|despesa|comprei|gasto)\b/.test(t)) {
    const valor = lerValor(t)
    const descricao = (t.split(/\b(?:com|de|do|da|no|na|em)\b/).slice(1).join(' ').replace(/\d+([.,]\d+)?|reais?|centavos?/g, '').trim() || 'Gasto').replace(/^\w/, (c) => c.toUpperCase())
    const categoria = CATEGORIAS_GASTO.find(([, re]) => re.test(t))?.[0] ?? 'outros'
    return { acao: 'gasto', valor, descricao, categoria }
  }
  const forma = /\bpix\b/.test(t) ? 'pix' : /\b(dinheiro|especie)\b/.test(t) ? 'dinheiro' : /\bcredito\b/.test(t) ? 'credito' : /\b(debito|cartao)\b/.test(t) ? 'debito' : null
  if (forma && /\b(pagou|pagar|pago|paga|finaliza|finalizar|fechar|fecha|recebi|receber|no|em)\b/.test(t) && !acharProduto(t.replace(/\b(pix|dinheiro|credito|debito|cartao)\b/g, ''), produtos)) {
    return { acao: 'pagar', forma }
  }
  // Venda: "vendi 2 coxinhas e 1 cafe", "mais um refrigerante".
  const corpo = t.replace(/\b(vendi|vender|vende|venda|adiciona|adicionar|coloca|colocar|mais|bota|botar|quero|me ve)\b/g, ' ')
  const partes = corpo.split(/,|\be\b/).map((p) => p.trim()).filter(Boolean)
  const itens = []
  for (const parte of partes) {
    const qtd = Number(parte.match(/\b(\d+(?:[.,]\d+)?)\b/)?.[1]?.replace(',', '.') || 1)
    const produto = acharProduto(parte, produtos)
    if (produto) itens.push({ produto, qtd: qtd > 0 && qtd < 1000 ? qtd : 1 })
  }
  if (itens.length) return { acao: 'vender', itens, forma }
  return { acao: 'desconhecido', texto }
}
