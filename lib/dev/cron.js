// Cron de 5 campos (minuto hora dia-do-mês mês dia-da-semana), no estilo Vixie/crontab.

export const CAMPOS = [
  { id: 'min', nome: 'Minuto', min: 0, max: 59 },
  { id: 'hora', nome: 'Hora', min: 0, max: 23 },
  { id: 'dia', nome: 'Dia do mês', min: 1, max: 31 },
  { id: 'mes', nome: 'Mês', min: 1, max: 12, nomes: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] },
  { id: 'sem', nome: 'Dia da semana', min: 0, max: 6, nomes: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
]
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export const MACROS = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

function valor(txt, c) {
  const t = txt.toUpperCase()
  if (c.nomes) {
    const i = c.nomes.indexOf(t)
    if (i >= 0) return i + c.min
  }
  if (!/^\d+$/.test(t)) throw new Error(`${c.nome}: "${txt}" não é válido`)
  let n = Number(t)
  if (c.id === 'sem' && n === 7) n = 0
  if (n < c.min || n > c.max) throw new Error(`${c.nome}: ${n} fora do intervalo ${c.min}–${c.max}`)
  return n
}

function campo(txt, c) {
  const set = new Set()
  if (!txt) throw new Error(`${c.nome}: vazio`)
  for (const parte of txt.split(',')) {
    const m = /^(\*|[^/-]+)(?:-([^/]+))?(?:\/(\d+))?$/.exec(parte)
    if (!m) throw new Error(`${c.nome}: "${parte}" não é válido`)
    const passo = m[3] ? Number(m[3]) : 1
    if (passo < 1) throw new Error(`${c.nome}: passo precisa ser maior que 0`)
    let a
    let b
    if (m[1] === '*') {
      a = c.min
      b = c.max
    } else {
      a = valor(m[1], c)
      b = m[2] !== undefined ? valor(m[2], c) : m[3] ? c.max : a
    }
    if (c.id === 'sem' && m[2] !== undefined && m[2] === '7') b = 6, set.add(0)
    if (a > b) throw new Error(`${c.nome}: intervalo ${a}-${b} invertido`)
    for (let v = a; v <= b; v += passo) set.add(v)
  }
  return set
}

export function analisarCron(expr) {
  let e = String(expr || '').trim().replace(/\s+/g, ' ')
  if (MACROS[e.toLowerCase()]) e = MACROS[e.toLowerCase()]
  if (e.toLowerCase() === '@reboot') throw new Error('@reboot roda só quando o sistema liga; não tem horário.')
  const partes = e.split(' ')
  if (partes.length === 6) throw new Error('São 6 campos: este formato tem segundos (Quartz/Spring). Aqui usamos o cron padrão de 5 campos.')
  if (partes.length !== 5) throw new Error(`O cron tem 5 campos (minuto hora dia mês dia-da-semana); você passou ${partes.length}.`)
  const sets = CAMPOS.map((c, i) => campo(partes[i], c))
  return { expr: e, partes, sets, diaRestrito: partes[2] !== '*', semRestrito: partes[4] !== '*' }
}

/* ------------------------------ explicar ------------------------------ */
const pad = (n) => String(n).padStart(2, '0')
const lista = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} e ${arr[arr.length - 1]}`)

function descreve(txt, c, fmt) {
  if (txt === '*') return null
  const partes = txt.split(',').map((p) => {
    const m = /^(\*|[^/-]+)(?:-([^/]+))?(?:\/(\d+))?$/.exec(p)
    const v = (x) => fmt(valor(x, c))
    if (m[1] === '*' && m[3]) return { passo: Number(m[3]) }
    if (m[2] !== undefined) return { txt: `de ${v(m[1])} a ${v(m[2])}${m[3] ? ` (a cada ${m[3]})` : ''}` }
    if (m[3]) return { txt: `a partir de ${v(m[1])}, a cada ${m[3]}` }
    return { txt: v(m[1]) }
  })
  return partes
}

export function explicar(r) {
  const [pm, ph, pd, pmes, psem] = r.partes
  const frases = []
  const mins = [...r.sets[0]].sort((a, b) => a - b)
  const horas = [...r.sets[1]].sort((a, b) => a - b)

  // horário
  const simplesMin = /^\d+$/.test(pm)
  const simplesHora = /^[\d,]+$/.test(ph)
  if (simplesMin && simplesHora) {
    frases.push(`às ${lista(horas.map((h) => `${pad(h)}:${pad(mins[0])}`))}`)
  } else {
    const dm = descreve(pm, { ...{ nome: 'Minuto', min: 0, max: 59 } }, String)
    if (!dm) frases.push('a cada minuto')
    else if (dm.length === 1 && dm[0].passo) frases.push(`a cada ${dm[0].passo} minutos`)
    else frases.push(`no minuto ${lista(dm.map((x) => x.txt ?? `*/${x.passo}`))}`)
    const dh = descreve(ph, { nome: 'Hora', min: 0, max: 23 }, (h) => `${pad(h)}h`)
    if (dh) {
      if (dh.length === 1 && dh[0].passo) frases.push(`a cada ${dh[0].passo} horas`)
      else frases.push(`${dh.length === 1 && !dh[0].txt.startsWith('de') ? 'durante a hora' : 'nas horas'} ${lista(dh.map((x) => x.txt ?? `*/${x.passo}`))}`)
    }
  }

  // dias
  const dd = descreve(pd, CAMPOS[2], String)
  const ds = descreve(psem, CAMPOS[4], (n) => SEMANA[n])
  const dmes = descreve(pmes, CAMPOS[3], (n) => MESES[n - 1])
  const tDia = dd && (dd.length === 1 && dd[0].passo ? `a cada ${dd[0].passo} dias` : `no dia ${lista(dd.map((x) => x.txt))} do mês`)
  const tSem = ds && (ds.length === 1 && ds[0].passo ? `a cada ${ds[0].passo} dias da semana` : psem === '1-5' ? 'de segunda a sexta' : `${ds.length === 1 && !ds[0].txt.startsWith('de') ? 'toda' : ''} ${lista(ds.map((x) => x.txt))}`.trim())
  if (tDia && tSem) frases.push(`${tDia} ou ${tSem}`)
  else if (tDia) frases.push(tDia)
  else if (tSem) frases.push(tSem)
  else frases.push('todos os dias')
  if (dmes) frases.push(dmes.length === 1 && dmes[0].passo ? `a cada ${dmes[0].passo} meses` : `em ${lista(dmes.map((x) => x.txt))}`)

  let t = frases.join(', ')
  t = t.charAt(0).toUpperCase() + t.slice(1) + '.'
  const avisos = []
  if (r.diaRestrito && r.semRestrito) avisos.push('Dia do mês e dia da semana estão restritos: o cron roda quando QUALQUER um dos dois bate (regra OU), não os dois juntos.')
  if ([...r.sets[2]].every((d) => d > 28) && r.diaRestrito && !r.semRestrito) avisos.push('Dias 29, 30 e 31 não existem em todos os meses: nesses meses não haverá execução.')
  if (pm === '*' ) avisos.push('Roda a cada minuto dentro do período. Confira se não queria um minuto fixo (ex.: 0).')
  return { texto: t, avisos }
}

/* ------------------------------ próximas execuções ------------------------------ */
export function proximas(r, n = 8, { de = new Date(), utc = false } = {}) {
  const [M, H, D, MES, S] = r.sets
  const g = utc
    ? { ano: (d) => d.getUTCFullYear(), mes: (d) => d.getUTCMonth(), dia: (d) => d.getUTCDate(), hora: (d) => d.getUTCHours(), min: (d) => d.getUTCMinutes(), sem: (d) => d.getUTCDay() }
    : { ano: (d) => d.getFullYear(), mes: (d) => d.getMonth(), dia: (d) => d.getDate(), hora: (d) => d.getHours(), min: (d) => d.getMinutes(), sem: (d) => d.getDay() }
  const mk = utc ? (a, m, d, h, mi) => new Date(Date.UTC(a, m, d, h, mi)) : (a, m, d, h, mi) => new Date(a, m, d, h, mi)
  const diaOk = (d) => {
    const okD = D.has(g.dia(d))
    const okS = S.has(g.sem(d))
    if (r.diaRestrito && r.semRestrito) return okD || okS
    if (r.diaRestrito) return okD
    if (r.semRestrito) return okS
    return true
  }
  const out = []
  let t = new Date(de.getTime() + 60000)
  t = mk(g.ano(t), g.mes(t), g.dia(t), g.hora(t), g.min(t))
  const limite = de.getTime() + 5 * 366 * 86400000
  let guarda = 0
  while (out.length < n && t.getTime() < limite && guarda++ < 200000) {
    if (!MES.has(g.mes(t) + 1)) {
      t = mk(g.ano(t), g.mes(t) + 1, 1, 0, 0)
      continue
    }
    if (!diaOk(t)) {
      t = mk(g.ano(t), g.mes(t), g.dia(t) + 1, 0, 0)
      continue
    }
    if (!H.has(g.hora(t))) {
      t = mk(g.ano(t), g.mes(t), g.dia(t), g.hora(t) + 1, 0)
      continue
    }
    if (!M.has(g.min(t))) {
      t = mk(g.ano(t), g.mes(t), g.dia(t), g.hora(t), g.min(t) + 1)
      continue
    }
    out.push(t)
    t = mk(g.ano(t), g.mes(t), g.dia(t), g.hora(t), g.min(t) + 1)
  }
  return out
}

export const ATALHOS = [
  ['* * * * *', 'A cada minuto'],
  ['*/5 * * * *', 'A cada 5 minutos'],
  ['*/15 * * * *', 'A cada 15 minutos'],
  ['0 * * * *', 'De hora em hora'],
  ['0 */6 * * *', 'A cada 6 horas'],
  ['0 0 * * *', 'Todo dia à meia-noite'],
  ['0 9 * * 1-5', 'Dias úteis às 9h'],
  ['30 18 * * 5', 'Sexta às 18:30'],
  ['0 8 1 * *', 'Dia 1 de cada mês às 8h'],
  ['0 3 * * 0', 'Domingo às 3h (backup)'],
  ['0 0 1 1 *', 'Todo 1º de janeiro'],
]
