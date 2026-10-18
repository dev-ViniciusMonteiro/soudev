// Lógica do Treino (funções puras, sem React): 1RM, recordes, progressão, rotação, anilhas, músculos e importação.

export const round = (n, casas = 1) => {
  const f = 10 ** casas
  return Math.round((Number(n) || 0) * f) / f
}
const pad = (n) => String(n).padStart(2, '0')
export const hoje = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDias = (iso, n) => {
  const d = new Date(`${iso}T12:00`)
  d.setDate(d.getDate() + n)
  return hoje(d)
}
export const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000)
export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`)

/* ---------- Força ---------- */

/** 1RM estimado (Epley). Até 12 repetições a estimativa é razoável; acima disso perde precisão. */
export function e1rm(carga, reps) {
  const c = Number(carga) || 0
  const r = Number(reps) || 0
  if (!c || !r) return 0
  return r === 1 ? c : round(c * (1 + Math.min(r, 15) / 30), 1)
}

/** Repetições que contam de uma série: unilateral usa o menor lado. */
export function repsDaSerie(s) {
  if (s.repsE !== undefined || s.repsD !== undefined) return Math.min(Number(s.repsE) || 0, Number(s.repsD) || 0)
  return Number(s.reps) || 0
}

export const seriesFeitas = (item) => (item.series || []).filter((s) => s.feita && s.tipo !== 'aquecimento')

/** Melhores marcas de um exercício no histórico (sessões concluídas). */
export function recordes(sessoes, exId, ate = null) {
  const r = { carga: 0, e1rm: 0, reps: 0, volume: 0, tempo: 0, distancia: 0, data: {} }
  for (const s of sessoes) {
    if (s.status !== 'concluida' || (ate && s.data > ate)) continue
    for (const item of s.itens || []) {
      if (item.ex !== exId) continue
      let volume = 0
      for (const se of seriesFeitas(item)) {
        const reps = repsDaSerie(se)
        const carga = Number(se.carga) || 0
        volume += carga * reps
        const marcas = { carga, e1rm: e1rm(carga, reps), reps, tempo: Number(se.tempo) || 0, distancia: Number(se.distancia) || 0 }
        for (const [k, v] of Object.entries(marcas)) {
          if (v > r[k]) {
            r[k] = v
            r.data[k] = s.data
          }
        }
      }
      if (volume > r.volume) {
        r.volume = volume
        r.data.volume = s.data
      }
    }
  }
  return r
}

/** Esta série bate algum recorde? Devolve os nomes dos recordes batidos. */
export function novoRecorde(serie, antes) {
  const reps = repsDaSerie(serie)
  const carga = Number(serie.carga) || 0
  const batidos = []
  if (carga > 0 && carga > antes.carga) batidos.push('carga')
  if (carga > 0 && e1rm(carga, reps) > antes.e1rm) batidos.push('1RM estimado')
  if (!carga && reps > antes.reps) batidos.push('repetições')
  if (Number(serie.tempo) > antes.tempo && Number(serie.tempo) > 0) batidos.push('tempo')
  return batidos
}

/** Última vez que o exercício foi feito (para preencher as cargas). */
export function ultimaVez(sessoes, exId, antesDe = null) {
  const lista = sessoes.filter((s) => s.status === 'concluida' && (!antesDe || s.data < antesDe) && (s.itens || []).some((i) => i.ex === exId)).sort((a, b) => (b.data + (b.inicio || '')).localeCompare(a.data + (a.inicio || '')))
  if (!lista.length) return null
  const s = lista[0]
  return { sessao: s, item: s.itens.find((i) => i.ex === exId) }
}

/** Histórico de 1RM estimado por data (para o gráfico). */
export function curva1rm(sessoes, exId) {
  const porDia = new Map()
  for (const s of sessoes) {
    if (s.status !== 'concluida') continue
    for (const item of s.itens || []) {
      if (item.ex !== exId) continue
      for (const se of seriesFeitas(item)) {
        const v = e1rm(se.carga, repsDaSerie(se))
        if (v > (porDia.get(s.data) || 0)) porDia.set(s.data, v)
      }
    }
  }
  return [...porDia].sort((a, b) => a[0].localeCompare(b[0])).map(([data, valor]) => ({ data, valor }))
}

/* ---------- Progressão ---------- */

export const REGRAS = [
  ['nenhuma', 'Sem progressão automática', 'Você decide a carga.'],
  ['linear', 'Linear', 'Fez todas as repetições de todas as séries: sobe a carga. Falhou 3 vezes seguidas: volta 10%.'],
  ['greyskull', 'Greyskull LP', 'A última série é até a falha (AMRAP). Bateu a meta: sobe; passou de 10 repetições na última: sobe o dobro. Falhou: volta 10%.'],
  ['dupla', 'Dupla progressão', 'Trabalha numa faixa de repetições (ex.: 8 a 12). Chegou ao máximo em todas as séries: sobe a carga e volta ao mínimo.'],
  ['tripla', 'Tripla progressão', 'Primeiro sobe as repetições, depois as séries, depois a carga.'],
  ['tempo', 'Adicionar tempo', 'Para exercícios por tempo (prancha, isometria): completou, soma alguns segundos.'],
]

const kg = (n) => `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
const metaReps = (item) => Number(item.series?.find((s) => s.tipo !== 'aquecimento')?.reps) || 0

/**
 * Próxima meta de um exercício a partir do histórico. Devolve { carga, reps, series, tempo, motivo }.
 * Falha nunca aumenta a carga; três falhas seguidas (ou falha no Greyskull) geram deload.
 */
export function proximaMeta(item, sessoes, { hojeIso = hoje(), deloadAtivo = false, deloadPct = 10 } = {}) {
  const p = item.progressao || { regra: 'nenhuma' }
  const inc = Number(p.inc) || (item.corporal ? 0 : 2.5)
  const trabalho = (item.series || []).filter((s) => s.tipo !== 'aquecimento')
  const base = {
    carga: Number(trabalho[0]?.carga) || 0,
    reps: metaReps(item),
    series: trabalho.length,
    tempo: Number(trabalho[0]?.tempo) || 0,
  }
  const historico = sessoes
    .filter((s) => s.status === 'concluida' && s.data < hojeIso)
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((s) => (s.itens || []).find((i) => i.ex === item.ex))
    .filter(Boolean)
  const ultima = historico[0]
  const aplicaDeload = (m) => (deloadAtivo ? { ...m, carga: round(m.carga * (1 - deloadPct / 100), 1), motivo: `${m.motivo} Semana de deload: carga ${deloadPct}% menor.` } : m)
  if (!ultima || p.regra === 'nenhuma') {
    const cargaUlt = ultima ? Math.max(0, ...seriesFeitas(ultima).map((s) => Number(s.carga) || 0)) : 0
    return aplicaDeload({ ...base, carga: cargaUlt || base.carga, motivo: ultima ? 'Mesma carga da última vez.' : 'Primeira vez: comece leve e anote como foi.' })
  }
  const feitas = seriesFeitas(ultima)
  const cargaUlt = Math.max(0, ...feitas.map((s) => Number(s.carga) || 0))
  const repsUlt = feitas.map(repsDaSerie)
  const cumpriu = (alvo) => feitas.length >= base.series && repsUlt.every((r) => r >= alvo)
  const falhasSeguidas = () => {
    let n = 0
    for (const h of historico) {
      const fs = seriesFeitas(h)
      if (fs.length && fs.map(repsDaSerie).some((r) => r < base.reps)) n++
      else break
    }
    return n
  }
  switch (p.regra) {
    case 'linear': {
      if (cumpriu(base.reps)) return aplicaDeload({ ...base, carga: round(cargaUlt + inc, 2), motivo: `Você fez ${base.series}×${base.reps} com ${kg(cargaUlt)}: +${kg(inc)}.` })
      const f = falhasSeguidas()
      if (f >= 3) return aplicaDeload({ ...base, carga: round(cargaUlt * 0.9, 1), motivo: `Três treinos seguidos sem completar: voltamos 10% para pegar embalo.` })
      return aplicaDeload({ ...base, carga: cargaUlt, motivo: `Faltaram repetições na última vez (${repsUlt.join(', ')}): repete ${kg(cargaUlt)}.` })
    }
    case 'greyskull': {
      const ultimaSerie = repsUlt[repsUlt.length - 1] || 0
      const anteriores = repsUlt.slice(0, -1).every((r) => r >= base.reps)
      if (anteriores && ultimaSerie >= base.reps) {
        const passo = ultimaSerie >= 10 ? inc * 2 : inc
        return aplicaDeload({ ...base, carga: round(cargaUlt + passo, 2), motivo: `Última série AMRAP com ${ultimaSerie} repetições: +${kg(passo)}${ultimaSerie >= 10 ? ' (dobro, passou de 10)' : ''}.` })
      }
      return aplicaDeload({ ...base, carga: round(cargaUlt * 0.9, 1), motivo: 'Não bateu a meta: Greyskull volta 10% da carga.' })
    }
    case 'dupla': {
      const min = Number(p.min) || Math.max(1, base.reps - 2)
      const max = Number(p.max) || base.reps + 2
      if (cumpriu(max)) return aplicaDeload({ ...base, carga: round(cargaUlt + inc, 2), reps: min, motivo: `Chegou a ${max} repetições em todas as séries: +${kg(inc)} e volta para ${min}.` })
      const menor = Math.min(...repsUlt)
      return aplicaDeload({ ...base, carga: cargaUlt, reps: Math.min(max, Math.max(min, menor + 1)), motivo: `Faixa de ${min} a ${max}: tente ${Math.min(max, Math.max(min, menor + 1))} repetições em todas as séries com ${kg(cargaUlt)}.` })
    }
    case 'tripla': {
      const min = Number(p.min) || Math.max(1, base.reps - 2)
      const max = Number(p.max) || base.reps + 2
      const maxSeries = Number(p.maxSeries) || base.series + 1
      const nSeries = feitas.length
      const repsAtual = Math.min(...repsUlt)
      if (repsAtual < max) return aplicaDeload({ ...base, carga: cargaUlt, series: nSeries, reps: repsAtual + 1, motivo: `Passo 1: sobe uma repetição (${repsAtual + 1}).` })
      if (nSeries < maxSeries) return aplicaDeload({ ...base, carga: cargaUlt, series: nSeries + 1, reps: min, motivo: `Passo 2: chegou a ${max} repetições, ganha mais uma série (${nSeries + 1}).` })
      return aplicaDeload({ ...base, carga: round(cargaUlt + inc, 2), series: Number(p.series) || base.series, reps: min, motivo: `Passo 3: séries e repetições no máximo, sobe ${kg(inc)} e recomeça.` })
    }
    case 'tempo': {
      const incT = Number(p.incTempo) || 5
      const tempoUlt = Math.min(...feitas.map((s) => Number(s.tempo) || 0))
      if (tempoUlt >= base.tempo) return { ...base, tempo: tempoUlt + incT, motivo: `Segurou ${tempoUlt}s: +${incT}s.` }
      return { ...base, tempo: base.tempo, motivo: 'Não completou o tempo: repete.' }
    }
    default:
      return aplicaDeload({ ...base, motivo: '' })
  }
}

/* ---------- Agenda: semana ou rotação ---------- */

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** Rotina de hoje: pela semana (dias marcados) ou pela rotação (próxima ainda não feita). */
export function rotinaDoDia(rotinas, sessoes, { modo = 'semana', data = hoje(), troca = null } = {}) {
  const ordenadas = [...rotinas].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
  if (troca?.data === data) return ordenadas.find((r) => r.id === troca.rotina_id) || null
  if (modo === 'rotacao') {
    if (!ordenadas.length) return null
    const ultima = [...sessoes].filter((s) => s.status === 'concluida' && s.rotina_id).sort((a, b) => (b.data + (b.inicio || '')).localeCompare(a.data + (a.inicio || '')))[0]
    const feitaHoje = sessoes.some((s) => s.status === 'concluida' && s.data === data)
    if (!ultima) return ordenadas[0]
    const i = ordenadas.findIndex((r) => r.id === ultima.rotina_id)
    if (feitaHoje && ultima.data === data) return ordenadas[i] || null
    return ordenadas[(i + 1) % ordenadas.length]
  }
  const dia = new Date(`${data}T12:00`).getDay()
  return ordenadas.find((r) => (r.dias || []).includes(dia)) || null
}

/** Próximo dia com treino (para mostrar no dia de descanso). */
export function proximoTreino(rotinas, sessoes, opts) {
  for (let i = 1; i <= 14; i++) {
    const data = addDias(opts.data || hoje(), i)
    const r = rotinaDoDia(rotinas, sessoes, { ...opts, data, troca: null })
    if (r) return { data, rotina: r, dias: i }
  }
  return null
}

/** Semana atual (para o plano), começando na segunda ou no domingo. */
export function semana(dataIso = hoje(), inicio = 1) {
  const d = new Date(`${dataIso}T12:00`)
  const desloc = (d.getDay() - inicio + 7) % 7
  return Array.from({ length: 7 }, (_, i) => addDias(dataIso, i - desloc))
}

/* ---------- Anilhas ---------- */

export const BARRAS = [
  ['olimpica', 'Barra olímpica', 20],
  ['feminina', 'Barra olímpica feminina', 15],
  ['ez', 'Barra W (EZ)', 10],
  ['trap', 'Trap bar (hexagonal)', 25],
  ['smith', 'Smith (peso da barra)', 15],
  ['curta', 'Barra curta', 5],
]
export const ANILHAS_PADRAO = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5]

/**
 * Quais anilhas pôr em cada lado para chegar na carga. pares = { 20: 2, 10: 3 } (quantos pares você tem).
 * Devolve { lado: [..], total, falta }.
 */
export function anilhas(carga, pesoBarra, pares = null) {
  let resto = round((Number(carga) - Number(pesoBarra)) / 2, 3)
  if (resto <= 0) return { lado: [], total: Number(pesoBarra), falta: round(Math.max(0, Number(carga) - Number(pesoBarra)), 2) }
  const disponivel = pares ? { ...pares } : Object.fromEntries(ANILHAS_PADRAO.map((a) => [a, 99]))
  const lado = []
  for (const a of Object.keys(disponivel).map(Number).sort((x, y) => y - x)) {
    while (resto >= a - 1e-9 && disponivel[a] > 0) {
      lado.push(a)
      resto = round(resto - a, 3)
      disponivel[a]--
    }
  }
  const total = round(Number(pesoBarra) + lado.reduce((s, a) => s + a, 0) * 2, 2)
  return { lado, total, falta: round(Number(carga) - total, 2) }
}

/* ---------- Músculos ---------- */

export const MUSCULOS = {
  chest: 'Peitoral',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraços',
  abdominals: 'Abdômen',
  lats: 'Dorsais',
  'middle back': 'Meio das costas',
  'lower back': 'Lombar',
  traps: 'Trapézio',
  neck: 'Pescoço',
  quadriceps: 'Quadríceps',
  hamstrings: 'Posteriores da coxa',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  adductors: 'Adutores',
  abductors: 'Abdutores',
}

export const EQUIPAMENTOS = {
  'body only': 'Peso corporal',
  barbell: 'Barra',
  dumbbell: 'Halteres',
  cable: 'Cabo / polia',
  machine: 'Máquina',
  kettlebells: 'Kettlebell',
  bands: 'Elásticos',
  'e-z curl bar': 'Barra W',
  'medicine ball': 'Medicine ball',
  'exercise ball': 'Bola suíça',
  'foam roll': 'Rolo de espuma',
  other: 'Outros',
}

export const CATEGORIAS = {
  strength: 'Força',
  stretching: 'Alongamento',
  plyometrics: 'Pliometria',
  strongman: 'Strongman',
  powerlifting: 'Powerlifting',
  cardio: 'Cardio',
  'olympic weightlifting': 'Levantamento olímpico',
}

export const NIVEIS = { beginner: 'Iniciante', intermediate: 'Intermediário', expert: 'Avançado' }

/** Horas de recuperação típicas por músculo (grandes demoram mais). */
const RECUPERACAO_H = { quadriceps: 72, hamstrings: 72, glutes: 72, 'lower back': 72, chest: 60, lats: 60, 'middle back': 60, traps: 48, shoulders: 48, adductors: 48, abductors: 48, biceps: 48, triceps: 48, calves: 36, forearms: 36, abdominals: 36, neck: 36 }

/**
 * Estado de cada músculo: séries na janela (volume), recuperação (0 a 1) e dias desde o último treino.
 * A série conta 1 para o músculo principal e 0,5 para os secundários.
 */
export function estadoMusculos(sessoes, exercicioDe, { agora = new Date(), dias = 7 } = {}) {
  const r = Object.fromEntries(Object.keys(MUSCULOS).map((m) => [m, { series: 0, ultimo: null }]))
  const limite = addDias(hoje(agora), -(dias - 1))
  for (const s of sessoes) {
    if (s.status !== 'concluida') continue
    for (const item of s.itens || []) {
      const ex = exercicioDe(item.ex)
      if (!ex) continue
      const n = seriesFeitas(item).length
      if (!n) continue
      const quando = s.fim || `${s.data}T18:00`
      for (const [lista, peso] of [
        [ex.m || [], 1],
        [ex.s || [], 0.5],
      ]) {
        for (const m of lista) {
          if (!r[m]) continue
          if (s.data >= limite) r[m].series += n * peso
          if (peso === 1 && (!r[m].ultimo || quando > r[m].ultimo)) r[m].ultimo = quando
        }
      }
    }
  }
  for (const [m, x] of Object.entries(r)) {
    const horas = x.ultimo ? (agora - new Date(x.ultimo)) / 3600000 : Infinity
    x.recuperacao = Math.max(0, Math.min(1, horas / (RECUPERACAO_H[m] || 48)))
    x.diasSem = x.ultimo ? Math.floor(horas / 24) : null
  }
  return r
}

/* ---------- Equilíbrio de força ---------- */

// Proporções de referência aproximadas entre os grandes levantamentos (1RM), usadas por treinadores de força.
// Servem para achar desequilíbrios grandes, não como regra exata.
export const PROPORCOES = [
  { nome: 'Supino / Agachamento', a: 'supino', b: 'agachamento', ideal: 0.75, faixa: [0.65, 0.85] },
  { nome: 'Agachamento / Terra', a: 'agachamento', b: 'terra', ideal: 0.85, faixa: [0.75, 0.95] },
  { nome: 'Desenvolvimento / Supino', a: 'desenvolvimento', b: 'supino', ideal: 0.65, faixa: [0.55, 0.75] },
  { nome: 'Remada / Supino', a: 'remada', b: 'supino', ideal: 0.85, faixa: [0.75, 1.05] },
  { nome: 'Agachamento frontal / Agachamento', a: 'frontal', b: 'agachamento', ideal: 0.85, faixa: [0.8, 0.9] },
]

export const LEVANTAMENTOS = {
  supino: ['Barbell_Bench_Press_-_Medium_Grip', 'Bench_Press_-_Powerlifting', 'Smith_Machine_Bench_Press'],
  agachamento: ['Barbell_Squat', 'Smith_Machine_Squat'],
  terra: ['Barbell_Deadlift', 'Sumo_Deadlift', 'Trap_Bar_Deadlift'],
  desenvolvimento: ['Standing_Military_Press', 'Barbell_Shoulder_Press', 'Smith_Machine_Overhead_Shoulder_Press'],
  remada: ['Bent_Over_Barbell_Row', 'Reverse_Grip_Bent-Over_Rows', 'T-Bar_Row_with_Handle'],
  frontal: ['Front_Squat_Clean_Grip'],
}

export function equilibrio(sessoes) {
  const melhor = {}
  for (const [lev, ids] of Object.entries(LEVANTAMENTOS)) melhor[lev] = Math.max(0, ...ids.map((id) => recordes(sessoes, id).e1rm))
  return PROPORCOES.map((p) => {
    const a = melhor[p.a]
    const b = melhor[p.b]
    if (!a || !b) return { ...p, valor: null }
    const valor = round(a / b, 2)
    return { ...p, valor, situacao: valor < p.faixa[0] ? 'baixo' : valor > p.faixa[1] ? 'alto' : 'ok' }
  })
}

/* ---------- Esforço (RIR / RPE) ---------- */

export const RIR = [
  [0, 'Falha: não sairia nenhuma a mais'],
  [1, 'Sairia só mais 1'],
  [2, 'Sairiam mais 2'],
  [3, 'Sairiam mais 3'],
  [4, 'Sobraram 4 ou mais: leve'],
]
export const RPE = [
  [10, 'Máximo: nenhuma repetição sobrando'],
  [9.5, 'Talvez mais 1, talvez mais carga'],
  [9, 'Mais 1 repetição'],
  [8.5, 'Mais 1 ou 2'],
  [8, 'Mais 2 repetições'],
  [7.5, 'Mais 2 ou 3'],
  [7, 'Mais 3 repetições'],
  [6, 'Mais 4 ou mais: leve'],
]
export const corEsforco = (tipo, v) => {
  const n = tipo === 'rir' ? 10 - Number(v) : Number(v)
  return n >= 9.5 ? '#f87171' : n >= 8.5 ? '#fb923c' : n >= 7.5 ? '#fbbf24' : '#4ade80'
}

/* ---------- Importação ---------- */

/** CSV simples com aspas, separador , ou ; detectado pela primeira linha. */
export function lerCsv(texto) {
  const linhas = String(texto).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!linhas.length) return []
  const sep = (linhas[0].match(/;/g) || []).length > (linhas[0].match(/,/g) || []).length ? ';' : ','
  const campos = (l) => {
    const out = []
    let atual = ''
    let aspas = false
    for (let i = 0; i < l.length; i++) {
      const c = l[i]
      if (c === '"') {
        if (aspas && l[i + 1] === '"') {
          atual += '"'
          i++
        } else aspas = !aspas
      } else if (c === sep && !aspas) {
        out.push(atual)
        atual = ''
      } else atual += c
    }
    out.push(atual)
    return out.map((x) => x.trim())
  }
  const cab = campos(linhas[0]).map((c) => c.toLowerCase())
  return linhas.slice(1).map((l) => Object.fromEntries(campos(l).map((v, i) => [cab[i], v])))
}

const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0
const lbParaKg = (v) => round(num(v) * 0.45359237, 2)

/**
 * Converte exportações de outros apps em sessões. Formatos: Strong, Hevy (CSV) e FitNotes (CSV).
 * resolverExercicio(nome) devolve o id de um exercício (cria personalizado se precisar).
 */
export function importarCsv(texto, resolverExercicio) {
  const linhas = lerCsv(texto)
  if (!linhas.length) throw new Error('Arquivo vazio.')
  const cab = Object.keys(linhas[0])
  let formato
  if (cab.includes('exercise_title') && cab.includes('start_time')) formato = 'hevy'
  else if (cab.includes('exercise name') && cab.includes('set order')) formato = 'strong'
  else if (cab.includes('exercise') && cab.some((c) => c.startsWith('weight')) && cab.includes('date')) formato = 'fitnotes'
  else throw new Error('Formato não reconhecido. Use a exportação CSV do Strong, Hevy ou FitNotes.')

  const sessoes = new Map()
  for (const l of linhas) {
    let chave
    let data
    let nomeTreino
    let exNome
    let serie
    if (formato === 'hevy') {
      data = paraIso(l.start_time)
      chave = `${l.title}|${l.start_time}`
      nomeTreino = l.title
      exNome = l.exercise_title
      serie = { tipo: l.set_type === 'warmup' ? 'aquecimento' : l.set_type === 'dropset' ? 'drop' : 'normal', carga: num(l.weight_kg) || lbParaKg(l.weight_lbs), reps: num(l.reps), tempo: num(l.duration_seconds), distancia: num(l.distance_km), esforco: l.rpe ? num(l.rpe) : '', feita: true }
    } else if (formato === 'strong') {
      data = paraIso(l.date)
      chave = `${l['workout name']}|${l.date}`
      nomeTreino = l['workout name']
      exNome = l['exercise name']
      const kg = cab.includes('weight unit') && /lb/i.test(l['weight unit']) ? lbParaKg(l.weight) : num(l.weight)
      serie = { tipo: /w/i.test(l['set order']) ? 'aquecimento' : 'normal', carga: kg, reps: num(l.reps), tempo: num(l.seconds), distancia: num(l.distance), esforco: l.rpe ? num(l.rpe) : '', feita: true }
    } else {
      data = paraIso(l.date)
      chave = l.date
      nomeTreino = 'Treino importado (FitNotes)'
      exNome = l.exercise
      const pesoCampo = cab.find((c) => c.startsWith('weight'))
      const kg = /lb/.test(pesoCampo) ? lbParaKg(l[pesoCampo]) : num(l[pesoCampo])
      const tempo = String(l.time || '').split(':').reduce((s, x) => s * 60 + num(x), 0)
      serie = { tipo: 'normal', carga: kg, reps: num(l.reps), tempo, distancia: num(l.distance), feita: true }
    }
    if (!data || !exNome) continue
    if (!sessoes.has(chave)) sessoes.set(chave, { data: data.slice(0, 10), inicio: data, nome: nomeTreino, itens: new Map() })
    const s = sessoes.get(chave)
    const id = resolverExercicio(exNome)
    if (!s.itens.has(id)) s.itens.set(id, { ex: id, series: [] })
    s.itens.get(id).series.push(serie)
  }
  return { formato, sessoes: [...sessoes.values()].map((s) => ({ ...s, itens: [...s.itens.values()] })) }
}

function paraIso(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  // "2024-05-01 18:30:00", "1 May 2024, 18:30", "2024-05-01"
  const d = new Date(s.replace(' ', 'T'))
  if (!Number.isNaN(d.getTime())) return `${hoje(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  const d2 = new Date(s)
  return Number.isNaN(d2.getTime()) ? '' : `${hoje(d2)}T${pad(d2.getHours())}:${pad(d2.getMinutes())}`
}

/** Peso do Apple Saúde (export.xml): registros HKQuantityTypeIdentifierBodyMass. */
export function importarAppleSaude(xml) {
  const out = new Map()
  const re = /<Record[^>]*type="HKQuantityTypeIdentifierBodyMass"[^>]*>/g
  for (const m of String(xml).match(re) || []) {
    const valor = num(m.match(/value="([^"]+)"/)?.[1])
    const unidade = m.match(/unit="([^"]+)"/)?.[1] || 'kg'
    const data = (m.match(/startDate="([^"]+)"/)?.[1] || '').slice(0, 10)
    if (!valor || !data) continue
    out.set(data, unidade === 'lb' ? lbParaKg(valor) : round(valor, 2))
  }
  return [...out].map(([data, peso]) => ({ data, peso }))
}

// Nomes usados pelo Strong e pelo Hevy (e alguns em português) -> exercício da biblioteca.
const APELIDOS = {
  'bench press barbell': 'Barbell_Bench_Press_-_Medium_Grip',
  'bench press': 'Barbell_Bench_Press_-_Medium_Grip',
  supino: 'Barbell_Bench_Press_-_Medium_Grip',
  'bench press dumbbell': 'Dumbbell_Bench_Press',
  'incline bench press barbell': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'incline bench press dumbbell': 'Incline_Dumbbell_Press',
  'squat barbell': 'Barbell_Squat',
  squat: 'Barbell_Squat',
  agachamento: 'Barbell_Squat',
  'front squat barbell': 'Front_Squat_Clean_Grip',
  'goblet squat': 'Goblet_Squat',
  'bulgarian split squat': 'Split_Squats',
  'deadlift barbell': 'Barbell_Deadlift',
  deadlift: 'Barbell_Deadlift',
  terra: 'Barbell_Deadlift',
  'sumo deadlift barbell': 'Sumo_Deadlift',
  'romanian deadlift barbell': 'Romanian_Deadlift',
  'romanian deadlift dumbbell': 'Stiff-Legged_Dumbbell_Deadlift',
  'trap bar deadlift': 'Trap_Bar_Deadlift',
  'overhead press barbell': 'Standing_Military_Press',
  'overhead press dumbbell': 'Dumbbell_Shoulder_Press',
  'shoulder press dumbbell': 'Dumbbell_Shoulder_Press',
  'seated shoulder press machine': 'Machine_Shoulder_Military_Press',
  'bent over row barbell': 'Bent_Over_Barbell_Row',
  'bent over one arm row dumbbell': 'One-Arm_Dumbbell_Row',
  'dumbbell row': 'One-Arm_Dumbbell_Row',
  'seated cable row': 'Seated_Cable_Rows',
  'seated row cable': 'Seated_Cable_Rows',
  't bar row': 'T-Bar_Row_with_Handle',
  'lat pulldown cable': 'Wide-Grip_Lat_Pulldown',
  'lat pulldown': 'Wide-Grip_Lat_Pulldown',
  'pull up': 'Pullups',
  'chin up': 'Chin-Up',
  'leg press': 'Leg_Press',
  'leg press machine': 'Leg_Press',
  'leg extension machine': 'Leg_Extensions',
  'lying leg curl machine': 'Lying_Leg_Curls',
  'seated leg curl machine': 'Seated_Leg_Curl',
  'standing calf raise': 'Standing_Calf_Raises',
  'standing calf raise machine': 'Standing_Calf_Raises',
  'seated calf raise': 'Seated_Calf_Raise',
  'hip thrust barbell': 'Barbell_Hip_Thrust',
  'glute bridge': 'Butt_Lift_Bridge',
  'bicep curl barbell': 'Barbell_Curl',
  'bicep curl dumbbell': 'Dumbbell_Bicep_Curl',
  'hammer curl dumbbell': 'Hammer_Curls',
  'preacher curl': 'Preacher_Curl',
  'triceps pushdown cable straight bar': 'Triceps_Pushdown',
  'triceps pushdown': 'Triceps_Pushdown',
  'triceps rope pushdown': 'Triceps_Pushdown_-_Rope_Attachment',
  'skullcrusher barbell': 'EZ-Bar_Skullcrusher',
  'lateral raise dumbbell': 'Side_Lateral_Raise',
  'front raise dumbbell': 'Front_Dumbbell_Raise',
  'face pull cable': 'Face_Pull',
  'shrug dumbbell': 'Dumbbell_Shrug',
  'shrug barbell': 'Barbell_Shrug',
  'chest fly dumbbell': 'Dumbbell_Flyes',
  'cable crossover': 'Cable_Crossover',
  'push up': 'Pushups',
  dip: 'Dips_-_Triceps_Version',
  'lunge dumbbell': 'Dumbbell_Lunges',
  'walking lunge': 'Barbell_Walking_Lunge',
  plank: 'Plank',
  crunch: 'Crunches',
  'hanging leg raise': 'Hanging_Leg_Raise',
  'running treadmill': 'Running_Treadmill',
  'cycling indoor': 'Bicycling_Stationary',
}

/** Nome importado -> exercício da biblioteca (apelidos conhecidos, depois comparação de palavras). */
export function casarExercicio(nome, biblioteca) {
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !['the', 'a', 'de', 'com', 'with', 'na', 'no', 'on'].includes(w))
  const alvo = norm(nome)
  if (!alvo.length) return null
  const chave = alvo.join(' ')
  if (APELIDOS[chave] && biblioteca.some((e) => e.id === APELIDOS[chave])) return APELIDOS[chave]
  let melhor = null
  for (const e of biblioteca) {
    for (const n of [e.n, e.pt].filter(Boolean)) {
      const p = norm(n)
      const comuns = alvo.filter((w) => p.includes(w)).length
      // Todas as palavras ditas precisam aparecer; nomes mais curtos (mais genéricos) ganham no empate.
      const nota = comuns / alvo.length - p.length * 0.01
      if (comuns === alvo.length && nota > (melhor?.nota ?? -1)) melhor = { id: e.id, nota }
    }
  }
  return melhor?.id ?? null
}

/* ---------- Deload ---------- */

/** Semana de deload: marcada à mão (até uma data) ou automática a cada N semanas de treino. */
export function emDeload(cfg, sessoes, data = hoje()) {
  if (cfg.deloadAte && data <= cfg.deloadAte) return true
  const cada = Number(cfg.deloadCada) || 0
  if (!cada) return false
  const datas = sessoes.filter((s) => s.status === 'concluida').map((s) => s.data).sort()
  if (!datas.length) return false
  const semanas = Math.floor(diasEntre(datas[0], data) / 7)
  return semanas % (cada + 1) === cada
}
