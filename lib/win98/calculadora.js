// Calculadora "Padrão" do Windows 98 (em português): conta da esquerda para a direita sem precedência
// (2 + 3 × 4 = 20), "=" repetido refaz a última operação, % calcula a porcentagem do primeiro número,
// vírgula como separador decimal e o visor sempre mostra a vírgula ("5,").

export const ERRO_DIVISAO = 'Não é possível dividir por zero.'
export const ERRO_FUNCAO = 'Entrada inválida para a função.'
const MAX_DIGITOS = 32

export const inicial = () => ({ visor: '0', digitando: false, acumulado: null, operador: null, repetir: null, memoria: 0, erro: null })

const numero = (visor) => Number(visor.replace(',', '.'))

/** Formata como no visor do Windows: vírgula decimal, sem zeros sobrando e a vírgula sempre no fim do inteiro. */
export function formatar(n) {
  if (!Number.isFinite(n)) return ERRO_DIVISAO
  if (Object.is(n, -0)) n = 0
  const abs = Math.abs(n)
  if (abs !== 0 && (abs >= 1e21 || abs < 1e-15)) {
    const [m, e] = n.toExponential(14).split('e')
    const mant = m.replace(/\.?0+$/, '').replace('.', ',')
    const exp = Number(e)
    return `${mant.includes(',') ? mant : mant + ','}e${exp < 0 ? '-' : '+'}${Math.abs(exp)}`
  }
  let s = String(Number(n.toPrecision(15)))
  if (s.includes('e')) s = Number(s).toFixed(20).replace(/0+$/, '')
  s = s.replace('.', ',')
  return s.includes(',') ? s : s + ','
}

/** Texto do visor (o estado guarda sem a vírgula final enquanto digita). */
export const textoVisor = (e) => (e.erro ? e.erro : e.visor.includes(',') ? e.visor : e.visor + ',')

function calcular(a, op, b) {
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '*') return a * b
  if (op === '/') return b === 0 ? NaN : a / b
  return b
}

const comErro = (e, msg) => ({ ...e, erro: msg, digitando: false, acumulado: null, operador: null, repetir: null })

function mostrar(e, valor) {
  if (Number.isNaN(valor) || !Number.isFinite(valor)) return comErro(e, ERRO_DIVISAO)
  return { ...e, visor: formatar(valor).replace(/,$/, '') || '0', digitando: false }
}

/** Aplica uma tecla: '0'..'9', ',', '+', '-', '*', '/', '=', '%', 'sqrt', '1/x', '+/-', 'C', 'CE', 'Back', 'MC', 'MR', 'MS', 'M+'. */
export function tecla(e, t) {
  // Com erro no visor só C, CE e as teclas de número limpam.
  if (e.erro) {
    if (t === 'C' || t === 'CE') return { ...inicial(), memoria: e.memoria }
    if (/^[0-9]$/.test(t) || t === ',') e = { ...inicial(), memoria: e.memoria }
    else return e
  }

  if (/^[0-9]$/.test(t)) {
    if (!e.digitando) return { ...e, visor: t, digitando: true }
    const digitos = e.visor.replace(/[^0-9]/g, '').length
    if (digitos >= MAX_DIGITOS) return e
    return { ...e, visor: e.visor === '0' ? t : e.visor === '-0' ? '-' + t : e.visor + t }
  }
  if (t === ',') {
    if (!e.digitando) return { ...e, visor: '0,', digitando: true }
    return e.visor.includes(',') ? e : { ...e, visor: e.visor + ',' }
  }
  if (t === 'Back') {
    if (!e.digitando) return e
    const v = e.visor.slice(0, -1)
    return { ...e, visor: v === '' || v === '-' ? '0' : v }
  }
  if (t === 'CE') return { ...e, visor: '0', digitando: false }
  if (t === 'C') return { ...inicial(), memoria: e.memoria }
  if (t === '+/-') {
    if (e.digitando) return { ...e, visor: e.visor.startsWith('-') ? e.visor.slice(1) : e.visor === '0' ? '0' : '-' + e.visor }
    return mostrar({ ...e }, -numero(e.visor))
  }

  const atual = numero(e.visor)
  if (t === '+' || t === '-' || t === '*' || t === '/') {
    // Trocar de operador sem digitar outro número só troca o operador.
    if (!e.digitando && e.operador) return { ...e, operador: t, repetir: null }
    if (e.operador && e.acumulado !== null) {
      const r = calcular(e.acumulado, e.operador, atual)
      const m = mostrar(e, r)
      if (m.erro) return m
      return { ...m, acumulado: numero(m.visor), operador: t, repetir: null }
    }
    return { ...e, acumulado: atual, operador: t, digitando: false, repetir: null }
  }
  if (t === '=') {
    if (e.operador && e.acumulado !== null) {
      const r = calcular(e.acumulado, e.operador, atual)
      const m = mostrar(e, r)
      if (m.erro) return m
      return { ...m, acumulado: null, operador: null, repetir: { op: e.operador, valor: atual } }
    }
    if (e.repetir) {
      const m = mostrar(e, calcular(atual, e.repetir.op, e.repetir.valor))
      return m.erro ? m : { ...m, repetir: e.repetir }
    }
    return { ...e, digitando: false }
  }
  if (t === '%') {
    // 200 + 10 % → 20 (10% de 200). Sem operação pendente, o Windows mostra 0.
    const base = e.acumulado ?? 0
    return mostrar(e, (base * atual) / 100)
  }
  if (t === 'sqrt') return atual < 0 ? comErro(e, ERRO_FUNCAO) : mostrar(e, Math.sqrt(atual))
  if (t === '1/x') return atual === 0 ? comErro(e, ERRO_DIVISAO) : mostrar(e, 1 / atual)

  if (t === 'MC') return { ...e, memoria: 0 }
  if (t === 'MR') return { ...e, visor: formatar(e.memoria).replace(/,$/, ''), digitando: false }
  if (t === 'MS') return { ...e, memoria: atual, digitando: false }
  if (t === 'M+') return { ...e, memoria: e.memoria + atual, digitando: false }
  return e
}

/** Aplica uma sequência de teclas (usado no autoteste). */
export const sequencia = (teclas, e = inicial()) => teclas.reduce(tecla, e)
