// Leitura e conferência de boletos (padrão Febraban) no próprio navegador.
// Boleto bancário: linha digitável com 47 números (código de barras com 44).
// Contas de consumo, tributos e multas ("arrecadação"): 48 números, começam com 8.

import { onlyDigits } from './br.js'

/** Módulo 10: pesos 2 e 1 da direita para a esquerda, somando os dígitos dos produtos. */
export function mod10(num) {
  let soma = 0
  let peso = 2
  for (let i = num.length - 1; i >= 0; i--) {
    let p = Number(num[i]) * peso
    if (p > 9) p = Math.floor(p / 10) + (p % 10)
    soma += p
    peso = peso === 2 ? 1 : 2
  }
  const resto = soma % 10
  return resto === 0 ? 0 : 10 - resto
}

/** Módulo 11 com pesos 2..9 (usado no dígito geral do boleto bancário). */
function soma11(num) {
  let soma = 0
  let peso = 2
  for (let i = num.length - 1; i >= 0; i--) {
    soma += Number(num[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  return soma
}
export function mod11Bancario(num) {
  const dv = 11 - (soma11(num) % 11)
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv
}
export function mod11Arrecadacao(num) {
  const resto = soma11(num) % 11
  if (resto === 0 || resto === 1) return 0
  if (resto === 10) return 1
  return 11 - resto
}

const BASE_ANTIGA = Date.UTC(1997, 9, 7) // fator 0
const BASE_NOVA = Date.UTC(2025, 1, 22) // fator 1000 depois que o fator passou de 9999 (22/02/2025)
const DIA = 86400000

/** Vencimento pelo fator. Depois de 22/02/2025 o fator recomeçou em 1000; escolhe a data mais próxima de hoje. */
export function vencimentoPorFator(fator, hoje = new Date()) {
  if (!fator) return null
  const antiga = new Date(BASE_ANTIGA + fator * DIA)
  const nova = new Date(BASE_NOVA + (fator - 1000) * DIA)
  const ref = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const data = Math.abs(nova - ref) < Math.abs(antiga - ref) ? nova : antiga
  return new Date(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
}

const SEGMENTOS = {
  1: 'Prefeituras (IPTU, ISS e taxas)',
  2: 'Saneamento (água e esgoto)',
  3: 'Energia elétrica e gás',
  4: 'Telecomunicações (telefone, internet, TV)',
  5: 'Órgãos governamentais (tributos)',
  6: 'Carnês e demais empresas',
  7: 'Multas de trânsito',
  9: 'Uso exclusivo do banco',
}

/**
 * Lê uma linha digitável (47 ou 48 números) ou código de barras (44).
 * Retorna os dados e a lista de problemas encontrados nos dígitos verificadores.
 */
export function lerBoleto(entrada, hoje = new Date()) {
  const n = onlyDigits(entrada)
  if (n.length === 47) return boletoBancario(n, hoje)
  if (n.length === 48) return arrecadacao(n)
  if (n.length === 44) return n[0] === '8' ? arrecadacaoBarras(n) : bancarioBarras(n, hoje)
  return { erro: `A linha digitável tem 47 números (boleto de banco) ou 48 (contas e tributos). Você digitou ${n.length}.` }
}

function boletoBancario(n, hoje) {
  const problemas = []
  const campos = [
    [n.slice(0, 9), Number(n[9]), 1],
    [n.slice(10, 20), Number(n[20]), 2],
    [n.slice(21, 31), Number(n[31]), 3],
  ]
  for (const [corpo, dv, i] of campos) if (mod10(corpo) !== dv) problemas.push(`O ${i}º bloco não confere (dígito verificador errado).`)
  const barras = n.slice(0, 4) + n[32] + n.slice(33, 47) + n.slice(4, 9) + n.slice(10, 20) + n.slice(21, 31)
  const r = bancarioBarras(barras, hoje)
  return { ...r, linha: n, problemas: [...problemas, ...r.problemas] }
}

function bancarioBarras(b, hoje) {
  const problemas = []
  const dvGeral = Number(b[4])
  if (mod11Bancario(b.slice(0, 4) + b.slice(5)) !== dvGeral) problemas.push('O dígito verificador geral não confere: o código pode ter sido alterado ou digitado errado.')
  const fator = Number(b.slice(5, 9))
  const valor = Number(b.slice(9, 19)) / 100
  return {
    tipo: 'bancario',
    barras: b,
    banco: b.slice(0, 3),
    moeda: b[3] === '9' ? 'Real' : 'Outra moeda',
    vencimento: vencimentoPorFator(fator, hoje),
    valor,
    problemas,
  }
}

function arrecadacao(n) {
  const problemas = []
  const ref = Number(n[2])
  const calc = ref === 6 || ref === 7 ? mod10 : mod11Arrecadacao
  for (let i = 0; i < 4; i++) {
    const bloco = n.slice(i * 12, i * 12 + 11)
    if (calc(bloco) !== Number(n[i * 12 + 11])) problemas.push(`O ${i + 1}º bloco não confere (dígito verificador errado).`)
  }
  const barras = [0, 1, 2, 3].map((i) => n.slice(i * 12, i * 12 + 11)).join('')
  const r = arrecadacaoBarras(barras)
  return { ...r, linha: n, problemas: [...problemas, ...r.problemas] }
}

function arrecadacaoBarras(b) {
  const problemas = []
  const ref = Number(b[2])
  const calc = ref === 6 || ref === 7 ? mod10 : mod11Arrecadacao
  if (calc(b.slice(0, 3) + b.slice(4)) !== Number(b[3])) problemas.push('O dígito verificador geral não confere: o código pode ter sido alterado ou digitado errado.')
  const valorReal = ref === 6 || ref === 8
  return {
    tipo: 'arrecadacao',
    barras: b,
    segmento: SEGMENTOS[b[1]] ?? 'Desconhecido',
    valor: valorReal ? Number(b.slice(4, 15)) / 100 : null,
    // Identificação do órgão/empresa: 4 dígitos (ou CNPJ parcial no segmento 6).
    empresa: b[1] === '6' ? b.slice(15, 23) : b.slice(15, 19),
    problemas,
  }
}
