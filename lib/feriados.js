// Feriados nacionais do Brasil calculados no próprio navegador (sem depender de API).
// Os móveis saem da data da Páscoa. "facultativo" = ponto facultativo nacional (Carnaval, Corpus Christi).

const pad = (n) => String(n).padStart(2, '0')
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseIso = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano) {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
export const diaDaSemana = (d) => DIAS[d.getDay()]

/** Lista de feriados nacionais e pontos facultativos nacionais do ano, em ordem. */
export function feriadosDoAno(ano) {
  const p = pascoa(ano)
  const lista = [
    [new Date(ano, 0, 1), 'Confraternização Universal', 'nacional'],
    [addDays(p, -48), 'Carnaval (segunda-feira)', 'facultativo'],
    [addDays(p, -47), 'Carnaval (terça-feira)', 'facultativo'],
    [addDays(p, -2), 'Sexta-feira Santa', 'nacional'],
    [new Date(ano, 3, 21), 'Tiradentes', 'nacional'],
    [new Date(ano, 4, 1), 'Dia do Trabalho', 'nacional'],
    [addDays(p, 60), 'Corpus Christi', 'facultativo'],
    [new Date(ano, 8, 7), 'Independência do Brasil', 'nacional'],
    [new Date(ano, 9, 12), 'Nossa Senhora Aparecida', 'nacional'],
    [new Date(ano, 10, 2), 'Finados', 'nacional'],
    [new Date(ano, 10, 15), 'Proclamação da República', 'nacional'],
    [new Date(ano, 11, 25), 'Natal', 'nacional'],
  ]
  // Dia da Consciência Negra é feriado nacional desde 2024 (Lei 14.759/2023).
  if (ano >= 2024) lista.push([new Date(ano, 10, 20), 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'])
  return lista
    .map(([data, nome, tipo]) => ({ data: isoDate(data), nome, tipo, dia: diaDaSemana(data) }))
    .sort((a, b) => a.data.localeCompare(b.data))
}

/**
 * Conjunto de datas (AAAA-MM-DD) sem expediente entre dois anos.
 * extras: datas a mais (feriados estaduais/municipais), facultativos: se pontos facultativos contam como folga.
 */
export function datasSemExpediente(anoInicio, anoFim, { facultativos = true, extras = [] } = {}) {
  const set = new Set(extras)
  for (let ano = anoInicio; ano <= anoFim; ano++) {
    for (const f of feriadosDoAno(ano)) if (facultativos || f.tipo === 'nacional') set.add(f.data)
  }
  return set
}

export const ehDiaUtil = (d, folgas) => d.getDay() !== 0 && d.getDay() !== 6 && !folgas.has(isoDate(d))

/** Dias úteis entre duas datas (sem contar a inicial, contando a final). */
export function contarDiasUteis(inicio, fim, opts) {
  const [a, b] = inicio <= fim ? [inicio, fim] : [fim, inicio]
  const folgas = datasSemExpediente(a.getFullYear(), b.getFullYear(), opts)
  let n = 0
  for (let d = addDays(a, 1); d <= b; d = addDays(d, 1)) if (ehDiaUtil(d, folgas)) n++
  return inicio <= fim ? n : -n
}

/** Data após somar (ou subtrair) N dias úteis. */
export function somarDiasUteis(inicio, dias, opts) {
  const passo = dias >= 0 ? 1 : -1
  const folgas = datasSemExpediente(inicio.getFullYear() - 1, inicio.getFullYear() + Math.ceil(Math.abs(dias) / 200) + 1, opts)
  let d = inicio
  let restantes = Math.abs(dias)
  while (restantes > 0) {
    d = addDays(d, passo)
    if (ehDiaUtil(d, folgas)) restantes--
  }
  return d
}

/** Feriados que caem entre duas datas (para mostrar no resultado). */
export function feriadosNoIntervalo(inicio, fim) {
  const [a, b] = inicio <= fim ? [inicio, fim] : [fim, inicio]
  const out = []
  for (let ano = a.getFullYear(); ano <= b.getFullYear(); ano++) {
    for (const f of feriadosDoAno(ano)) {
      const d = parseIso(f.data)
      if (d > a && d <= b) out.push(f)
    }
  }
  return out
}
