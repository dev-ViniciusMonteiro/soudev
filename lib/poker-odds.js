// Calculadora de odds de Texas Hold'em: avaliador de mãos (7 cartas), simulação de Monte Carlo,
// outs, pot odds e recomendação. Tudo puro (sem DOM) para rodar no navegador e nos testes.

// Carta = inteiro 0..51. Valor = (c >> 2) + 2 (2..14, Ás = 14). Naipe = c & 3.
export const VALORES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const NAIPES = [
  { id: 's', simbolo: '♠', nome: 'espadas', vermelho: false },
  { id: 'h', simbolo: '♥', nome: 'copas', vermelho: true },
  { id: 'd', simbolo: '♦', nome: 'ouros', vermelho: true },
  { id: 'c', simbolo: '♣', nome: 'paus', vermelho: false },
]
export const valorDe = (c) => (c >> 2) + 2
export const naipeDe = (c) => c & 3
export const carta = (valor, naipe) => ((valor - 2) << 2) | naipe
export const nomeValor = (v) => VALORES[v - 2]
export const textoCarta = (c) => nomeValor(valorDe(c)) + NAIPES[naipeDe(c)].simbolo
/** "As", "10d", "Th", "9h" → carta */
export function lerCarta(txt) {
  const t = String(txt).trim()
  const n = NAIPES.findIndex((x) => x.id === t.slice(-1).toLowerCase())
  let v = t.slice(0, -1).toUpperCase()
  if (v === 'T') v = '10'
  const i = VALORES.indexOf(v)
  if (i < 0 || n < 0) throw new Error('carta inválida: ' + txt)
  return carta(i + 2, n)
}

export const CATEGORIAS = ['Carta alta', 'Um par', 'Dois pares', 'Trinca', 'Sequência', 'Flush', 'Full house', 'Quadra', 'Straight flush']

/* ------------------------------ avaliador ------------------------------ */
const cont = new Uint8Array(15)
const naipeQtd = new Uint8Array(4)
const naipeMask = new Uint16Array(4)

function maiorSequencia(mask) {
  if (mask & (1 << 14)) mask |= 1 << 1 // Ás vale 1 na sequência A-2-3-4-5
  for (let h = 14; h >= 5; h--) if (((mask >> (h - 4)) & 31) === 31) return h
  return 0
}
function pontos(cat, k1 = 0, k2 = 0, k3 = 0, k4 = 0, k5 = 0) {
  return ((((cat * 16 + k1) * 16 + k2) * 16 + k3) * 16 + k4) * 16 + k5
}
function quadraOuFull() {
  let quadra = 0, trinca = 0, par = 0
  for (let v = 14; v >= 2; v--) {
    if (cont[v] === 4 && !quadra) quadra = v
    else if (cont[v] === 3) { if (!trinca) trinca = v; else if (!par) par = v }
    else if (cont[v] === 2 && !par) par = v
  }
  if (quadra) {
    let k = 0
    for (let v = 14; v >= 2; v--) if (v !== quadra && cont[v]) { k = v; break }
    return pontos(7, quadra, k)
  }
  if (trinca && par) return pontos(6, trinca, par)
  return 0
}

/** Pontuação da melhor mão de 5 entre as cartas dadas (5 a 7). Maior = melhor. */
export function avaliar(cartas) {
  cont.fill(0); naipeQtd.fill(0); naipeMask.fill(0)
  let mask = 0
  for (let i = 0; i < cartas.length; i++) {
    const c = cartas[i], v = (c >> 2) + 2, n = c & 3
    cont[v]++; naipeQtd[n]++; naipeMask[n] |= 1 << v; mask |= 1 << v
  }
  for (let n = 0; n < 4; n++) {
    if (naipeQtd[n] >= 5) {
      const sf = maiorSequencia(naipeMask[n])
      if (sf) return pontos(8, sf)
      const ks = []
      for (let v = 14; v >= 2 && ks.length < 5; v--) if (naipeMask[n] & (1 << v)) ks.push(v)
      const flush = pontos(5, ...ks)
      const q = quadraOuFull() // com 7 cartas, flush e quadra/full podem coexistir
      return q > flush ? q : flush
    }
  }
  const q = quadraOuFull()
  if (q) return q
  const seq = maiorSequencia(mask)
  if (seq) return pontos(4, seq)
  let trinca = 0
  const pares = [], soltas = []
  for (let v = 14; v >= 2; v--) {
    if (cont[v] === 3) { if (!trinca) trinca = v }
    else if (cont[v] === 2) pares.push(v)
    else if (cont[v] === 1) soltas.push(v)
  }
  if (trinca) return pontos(3, trinca, soltas[0], soltas[1])
  if (pares.length >= 2) return pontos(2, pares[0], pares[1], Math.max(pares[2] || 0, soltas[0] || 0))
  if (pares.length === 1) return pontos(1, pares[0], soltas[0], soltas[1], soltas[2])
  return pontos(0, soltas[0], soltas[1], soltas[2], soltas[3], soltas[4])
}
export const categoriaDe = (pts) => Math.floor(pts / 16 ** 5)

/* ------------------------------ força pré-flop (fórmula de Chen) ------------------------------ */
export function pontosChen(a, b) {
  const va = valorDe(a), vb = valorDe(b)
  const alto = Math.max(va, vb), baixo = Math.min(va, vb)
  const base = (v) => (v === 14 ? 10 : v === 13 ? 8 : v === 12 ? 7 : v === 11 ? 6 : v / 2)
  let s = base(alto)
  if (va === vb) return Math.max(5, s * 2)
  if (naipeDe(a) === naipeDe(b)) s += 2
  const gap = alto - baixo - 1
  s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5
  if (gap <= 1 && alto < 12) s += 1
  return Math.ceil(s)
}
// percentil de cada mão inicial (0 = entre as melhores) nas 1326 combinações
const PERCENTIL = (() => {
  const lista = []
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) lista.push([a, b, pontosChen(a, b)])
  lista.sort((x, y) => y[2] - x[2])
  const porPonto = new Map()
  lista.forEach(([, , p], i) => { if (!porPonto.has(p)) porPonto.set(p, i / lista.length) })
  const mapa = new Float32Array(52 * 52)
  for (const [a, b, p] of lista) mapa[a * 52 + b] = mapa[b * 52 + a] = porPonto.get(p)
  return mapa
})()
export const percentilInicial = (a, b) => PERCENTIL[a * 52 + b]

export function faixaInicial(a, b) {
  const p = percentilInicial(a, b)
  if (p <= 0.05) return { nome: 'Premium', p }
  if (p <= 0.15) return { nome: 'Forte', p }
  if (p <= 0.35) return { nome: 'Jogável', p }
  if (p <= 0.6) return { nome: 'Marginal', p }
  return { nome: 'Fraca', p }
}

/* ------------------------------ simulação ------------------------------ */
/**
 * faixa: 1 = adversários com qualquer mão; 0.5 = só as 50% melhores mãos iniciais etc.
 * Devolve { rodar(n), resultado } e acumula: dá para rodar em pedaços sem travar a tela.
 */
export function criarSimulacao({ minhas, mesa, adversarios, faixa = 1, aleatorio = Math.random }) {
  const usadas = new Set([...minhas, ...mesa])
  const deck = []
  for (let c = 0; c < 52; c++) if (!usadas.has(c)) deck.push(c)
  const faltamMesa = 5 - mesa.length
  const resultado = { jogos: 0, vitorias: 0, empates: 0, equidade: 0, categorias: new Array(9).fill(0) }
  const eu = new Array(7), op = new Array(7), tab = new Array(5)

  function rodar(n) {
    for (let it = 0; it < n; it++) {
      let topo = 0
      const tirar = () => {
        const j = topo + Math.floor(aleatorio() * (deck.length - topo))
        const t = deck[topo]; deck[topo] = deck[j]; deck[j] = t
        return deck[topo++]
      }
      for (let i = 0; i < mesa.length; i++) tab[i] = mesa[i]
      for (let i = 0; i < faltamMesa; i++) tab[mesa.length + i] = tirar()
      eu[0] = minhas[0]; eu[1] = minhas[1]
      for (let i = 0; i < 5; i++) eu[2 + i] = tab[i]
      const meu = avaliar(eu)
      resultado.categorias[categoriaDe(meu)]++
      let melhor = -1, empatados = 0
      for (let a = 0; a < adversarios; a++) {
        let c1, c2, tent = 0
        for (;;) {
          const ini = topo
          c1 = tirar(); c2 = tirar()
          if (faixa >= 1 || percentilInicial(c1, c2) <= faixa || ++tent > 60) break
          topo = ini // mão fraca demais para a faixa: devolve e sorteia outra
        }
        op[0] = c1; op[1] = c2
        for (let i = 0; i < 5; i++) op[2 + i] = tab[i]
        const p = avaliar(op)
        if (p > melhor) { melhor = p; empatados = 1 } else if (p === melhor) empatados++
      }
      resultado.jogos++
      if (meu > melhor) { resultado.vitorias++; resultado.equidade += 1 }
      else if (meu === melhor) { resultado.empates++; resultado.equidade += 1 / (empatados + 1) }
    }
    return resultado
  }
  return { rodar, resultado }
}

/* ------------------------------ outs ------------------------------ */
/** Cartas que melhoram a categoria da sua mão na próxima carta (no flop e no turn). */
export function calcularOuts(minhas, mesa) {
  if (mesa.length < 3 || mesa.length > 4) return []
  const usadas = new Set([...minhas, ...mesa])
  const atual = categoriaDe(avaliar([...minhas, ...mesa]))
  const outs = []
  for (let c = 0; c < 52; c++) {
    if (usadas.has(c)) continue
    const nova = categoriaDe(avaliar([...minhas, ...mesa, c]))
    if (nova <= atual) continue
    // se a mesa sozinha já forma essa mão, todo mundo tem: não é out
    const soMesa = categoriaDe(avaliar([...mesa, c]))
    if (nova > soMesa) outs.push({ carta: c, vira: CATEGORIAS[nova] })
  }
  return outs
}

/* ------------------------------ decisão ------------------------------ */
/** equidade 0..1; pote e aPagar em fichas; ativos = adversários ainda na mão. */
export function recomendar({ equidade, pote = 0, aPagar = 0, ativos }) {
  const justa = 1 / (ativos + 1) // sua "parte justa" do pote
  const precisa = aPagar > 0 ? aPagar / (pote + aPagar) : 0
  const pct = (x) => `${Math.round(x * 100)}%`
  if (aPagar <= 0) {
    if (equidade >= Math.min(0.85, justa * 1.6)) return { acao: 'Apostar', tom: 'forte', precisa, justa, motivo: `Você ganha ${pct(equidade)} das vezes, bem acima da sua parte justa (${pct(justa)} com ${ativos + 1} na mão). Aposte para cobrar de quem tem mão pior.` }
    return { acao: 'Passar (mesa)', tom: 'neutro', precisa, justa, motivo: `Ninguém apostou: veja a próxima carta de graça. Sua chance é ${pct(equidade)}; a parte justa com ${ativos + 1} na mão é ${pct(justa)}.` }
  }
  if (equidade >= precisa) {
    if (equidade >= Math.min(0.85, justa * 1.8) && equidade - precisa > 0.15) return { acao: 'Aumentar', tom: 'forte', precisa, justa, motivo: `Você ganha ${pct(equidade)} e precisa de só ${pct(precisa)} para o pagamento valer a pena. Mão forte para ${ativos + 1} jogadores: aumente.` }
    return { acao: 'Pagar (continuar)', tom: 'bom', precisa, justa, motivo: `Pagar ${aPagar} para disputar ${pote + aPagar} exige vencer ${pct(precisa)} das vezes, e você vence ${pct(equidade)}. A longo prazo, pagar dá lucro.` }
  }
  return { acao: 'Correr', tom: 'ruim', precisa, justa, motivo: `Pagar ${aPagar} para disputar ${pote + aPagar} exige vencer ${pct(precisa)} das vezes, mas você vence ${pct(equidade)}. A longo prazo, pagar dá prejuízo.` }
}
