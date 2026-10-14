export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '')

export function parseNumber(value) {
  if (typeof value === 'number') return value
  const text = String(value ?? '').trim().replace(/\s|R\$|%/g, '')
  if (!text) return NaN
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text
  return Number(normalized)
}

export const brl = (value) =>
  (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmt = (value, digits = 2) =>
  (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits })

export const randomInt = (max) => {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] % max
}

/* ---------- CPF ---------- */

function cpfDigit(digits) {
  const sum = digits.reduce((total, digit, index) => total + digit * (digits.length + 1 - index), 0)
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

export const CPF_REGIOES = [
  { digit: 0, label: 'RS' },
  { digit: 1, label: 'DF, GO, MS, MT, TO' },
  { digit: 2, label: 'AC, AM, AP, PA, RO, RR' },
  { digit: 3, label: 'CE, MA, PI' },
  { digit: 4, label: 'AL, PB, PE, RN' },
  { digit: 5, label: 'BA, SE' },
  { digit: 6, label: 'MG' },
  { digit: 7, label: 'ES, RJ' },
  { digit: 8, label: 'SP' },
  { digit: 9, label: 'PR, SC' },
]

export function gerarCpf(regiao = null) {
  let digits
  do {
    digits = Array.from({ length: 9 }, () => randomInt(10))
    if (regiao !== null) digits[8] = regiao
  } while (digits.every((digit) => digit === digits[0]))
  digits.push(cpfDigit(digits))
  digits.push(cpfDigit(digits))
  return digits.join('')
}

export function validarCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digits = cpf.split('').map(Number)
  return cpfDigit(digits.slice(0, 9)) === digits[9] && cpfDigit(digits.slice(0, 10)) === digits[10]
}

export const formatCpf = (cpf) => onlyDigits(cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

/* ---------- CNPJ (numérico e alfanumérico) ---------- */

const CNPJ_ALFA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CNPJ_PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const CNPJ_PESOS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

function cnpjDigit(chars) {
  const weights = chars.length === 12 ? CNPJ_PESOS_1 : CNPJ_PESOS_2
  const sum = chars.reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index], 0)
  const rest = sum % 11
  return rest < 2 ? '0' : String(11 - rest)
}

export function gerarCnpj({ alfanumerico = false, matriz = true } = {}) {
  const pool = alfanumerico ? CNPJ_ALFA : '0123456789'
  const pick = () => pool[randomInt(pool.length)]
  let chars
  do {
    const raiz = Array.from({ length: 8 }, pick)
    const ordem = matriz ? ['0', '0', '0', '1'] : Array.from({ length: 4 }, pick)
    chars = [...raiz, ...ordem]
  } while (chars.every((char) => char === chars[0]))
  chars.push(cnpjDigit(chars))
  chars.push(cnpjDigit(chars))
  return chars.join('')
}

export const limparCnpj = (value) => String(value ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')

export function validarCnpj(value) {
  const cnpj = limparCnpj(value)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false
  const chars = cnpj.split('')
  return cnpjDigit(chars.slice(0, 12)) === chars[12] && cnpjDigit(chars.slice(0, 13)) === chars[13]
}

export const formatCnpj = (cnpj) =>
  limparCnpj(cnpj).replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5')

/* ---------- Valor por extenso ---------- */

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
const ESCALAS = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']]

function ate999(n) {
  if (n === 100) return 'cem'
  const parts = []
  const centena = Math.floor(n / 100)
  const resto = n % 100
  if (centena) parts.push(CENTENAS[centena])
  if (resto) {
    if (resto < 20) parts.push(UNIDADES[resto])
    else {
      const unidade = resto % 10
      const dezena = DEZENAS[Math.floor(resto / 10)]
      parts.push(unidade ? `${dezena} e ${UNIDADES[unidade]}` : dezena)
    }
  }
  return parts.join(' e ')
}

export function inteiroPorExtenso(n) {
  if (n === 0) return 'zero'
  const grupos = []
  for (let x = n; x > 0; x = Math.floor(x / 1000)) grupos.push(x % 1000)
  const partes = []
  for (let i = grupos.length - 1; i >= 0; i--) {
    const grupo = grupos[i]
    if (!grupo) continue
    const escala = i ? ` ${grupo === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}` : ''
    partes.push({ texto: i === 1 && grupo === 1 ? 'mil' : `${ate999(grupo)}${escala}`, grupo })
  }
  return partes
    .map((parte, index) => {
      if (index === 0) return parte.texto
      const ultimo = index === partes.length - 1
      return `${ultimo && (parte.grupo < 100 || parte.grupo % 100 === 0) ? 'e ' : ''}${parte.texto}`
    })
    .join(' ')
}

export function valorPorExtenso(valor) {
  if (!Number.isFinite(valor) || valor < 0) return ''
  const centavosTotais = Math.round(valor * 100)
  const reais = Math.floor(centavosTotais / 100)
  const centavos = centavosTotais % 100
  const partes = []
  if (reais) {
    const de = reais >= 1_000_000 && reais % 1_000_000 === 0 ? ' de' : ''
    partes.push(`${inteiroPorExtenso(reais)}${de} ${reais === 1 ? 'real' : 'reais'}`)
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  return partes.join(' e ') || 'zero reais'
}
