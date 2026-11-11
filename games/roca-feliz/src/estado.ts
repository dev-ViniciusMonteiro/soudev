// Regras da roça: estado salvo, crescimento no relógio (também com o jogo fechado), problemas
// (seca, mato e bichos), ladrões, colheita, loja, celeiro, níveis e as fazendas dos vizinhos.

import { ADUBO, CACHORRO, CANTEIROS_INICIAIS, CULTURAS, TOTAL_CANTEIROS, VIZINHOS, cultura, precoTerreno, xpDoNivel, type Cultura, type Vizinho } from './dados'

export interface Canteiro {
  aberto: boolean
  solo: 'arado' | 'plantado' | 'murcho'
  cultura?: string
  crescido: number // ms de crescimento já feito
  total: number // ms para amadurecer
  temporada: number // 1 = primeira colheita
  t: number // último instante processado
  prox: number // próximo problema sorteado
  seca: boolean
  mato: number
  bicho: number
  maduroEm: number // 0 = ainda não maduro
  roubado: number
  checado: number // último teste de ladrão
  adubado: boolean
}

export interface Recado {
  t: number
  texto: string
  de?: string // avatar
}

export interface Estado {
  versao: 1
  moedas: number
  xp: number
  nivel: number
  canteiros: Canteiro[]
  sementes: Record<string, number>
  celeiro: Record<string, number>
  adubo: number
  cachorro: boolean
  recados: Recado[]
  lidos: number // quantos recados já foram vistos
  vizinhos: Record<string, number> // ciclo do canteiro do vizinho -> o que já foi feito (bits)
  bonusDia: string
  stats: { colhidas: number; roubadas: number; ajudas: number; vendido: number }
}

export const CHAVE = 'roca-feliz.v1'
const MIN = 60000
const LADRAO_INTERVALO = 6 * MIN

/* ---------- relógio (o teste pode adiantar) ---------- */
let desloca = 0
export const agora = (): number => Date.now() + desloca
export const adiantar = (ms: number): void => {
  desloca += ms
}

/* ---------- criar, salvar e carregar ---------- */
function canteiroVazio(aberto: boolean, t: number): Canteiro {
  return { aberto, solo: 'arado', crescido: 0, total: 1, temporada: 1, t, prox: Infinity, seca: false, mato: 0, bicho: 0, maduroEm: 0, roubado: 0, checado: 0, adubado: false }
}

export function novoEstado(): Estado {
  const t = agora()
  return {
    versao: 1,
    moedas: 200,
    xp: 0,
    nivel: 1,
    canteiros: Array.from({ length: TOTAL_CANTEIROS }, (_, i) => canteiroVazio(i < CANTEIROS_INICIAIS, t)),
    sementes: { cenoura: 6, milho: 2 },
    celeiro: {},
    adubo: 2,
    cachorro: false,
    recados: [{ t, de: '👨‍🌾', texto: 'Zé do Milho: Seja bem-vindo à vizinhança! Deixei umas sementes de cenoura e milho na sua mochila.' }],
    lidos: 0,
    vizinhos: {},
    bonusDia: '',
    stats: { colhidas: 0, roubadas: 0, ajudas: 0, vendido: 0 },
  }
}

export function carregar(): Estado | null {
  try {
    const txt = localStorage.getItem(CHAVE)
    if (!txt) return null
    const e = JSON.parse(txt) as Estado
    if (e.versao !== 1 || !Array.isArray(e.canteiros)) return null
    // JSON não guarda Infinity
    for (const c of e.canteiros) if (c.prox === null || c.prox === undefined) c.prox = Infinity
    return e
  } catch {
    return null
  }
}

export function salvar(e: Estado): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e))
  } catch {
    /* sem armazenamento */
  }
}

/* ---------- aleatório com semente (fazendas dos vizinhos são iguais para todo mundo) ---------- */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

const sortear = <T>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)]

/* ---------- níveis ---------- */
export function ganharXp(e: Estado, n: number): number[] {
  e.xp += n
  const subiu: number[] = []
  while (e.xp >= xpDoNivel(e.nivel + 1)) {
    e.nivel++
    e.moedas += 20 * e.nivel
    subiu.push(e.nivel)
  }
  return subiu
}

export function progressoNivel(e: Estado): { atual: number; precisa: number } {
  const ini = xpDoNivel(e.nivel)
  return { atual: e.xp - ini, precisa: xpDoNivel(e.nivel + 1) - ini }
}

/* ---------- crescimento ---------- */
export interface Diario {
  amadureceu: number
  roubos: { quem: Vizinho; qtd: number; emoji: string }[]
  espantados: number
}

export const novoDiario = (): Diario => ({ amadureceu: 0, roubos: [], espantados: 0 })

function sortearProblema(c: Canteiro): void {
  if (Number(c.seca) + c.mato + c.bicho >= 3) return
  const op: ['seca' | 'mato' | 'bicho', number][] = []
  if (!c.seca) op.push(['seca', 4])
  if (c.mato < 3) op.push(['mato', 3])
  if (c.bicho < 3) op.push(['bicho', 3])
  if (!op.length) return
  let r = Math.random() * op.reduce((s, [, p]) => s + p, 0)
  for (const [tipo, p] of op) {
    if ((r -= p) > 0) continue
    if (tipo === 'seca') c.seca = true
    else if (tipo === 'mato') c.mato++
    else c.bicho++
    return
  }
}

// problemas aparecem de vez em quando (as plantas rápidas quase não têm)
const proximoProblema = (c: Canteiro, t: number): number => t + Math.max(c.total * (0.35 + Math.random() * 0.45), 1.5 * MIN)

/** Quanto o canteiro rende agora (problemas tiram 10% cada, e o que foi roubado sai da conta). */
export function rendimento(c: Canteiro): number {
  const cu = cultura(c.cultura)
  if (!cu) return 0
  const fator = 1 - 0.1 * (c.mato + c.bicho) - (c.seca ? 0.1 : 0)
  return Math.max(1, Math.round(cu.rende * fator) - c.roubado)
}

const limiteRoubo = (cu: Cultura): number => Math.floor(cu.rende * 0.4)

let semLadroes = false
export const desligarLadroes = (): void => {
  semLadroes = true
}

function ladroes(e: Estado, c: Canteiro, ate: number, d: Diario): void {
  const cu = cultura(c.cultura)
  if (!cu) return
  while (c.checado + LADRAO_INTERVALO <= ate) {
    c.checado += LADRAO_INTERVALO
    if (semLadroes || c.roubado >= limiteRoubo(cu) || Math.random() > 0.3) continue
    const quem = sortear(VIZINHOS)
    if (e.cachorro && Math.random() < 0.8) {
      d.espantados++
      if (d.espantados <= 2) e.recados.push({ t: c.checado, de: '🐕', texto: `O ${CACHORRO.nome} latiu e espantou ${quem.nome}, que estava de olho na sua plantação de ${cu.nome.toLowerCase()}!` })
      continue
    }
    const qtd = Math.min(1 + Math.floor(Math.random() * 2), limiteRoubo(cu) - c.roubado)
    c.roubado += qtd
    d.roubos.push({ quem, qtd, emoji: cu.emoji })
    e.recados.push({ t: c.checado, de: quem.avatar, texto: `${quem.nome} passou na sua roça e levou ${qtd} ${cu.emoji} ${cu.nome.toLowerCase()}. Arranje um cachorro!` })
  }
}

/** Leva o canteiro até o instante "ate": crescimento (metade da velocidade com seca), problemas e ladrões. */
function avancarCanteiro(e: Estado, c: Canteiro, ate: number, d: Diario): void {
  if (!c.aberto || c.solo !== 'plantado' || ate <= c.t) {
    c.t = Math.max(c.t, ate)
    return
  }
  let t = c.t
  for (let guarda = 0; guarda < 500 && t < ate; guarda++) {
    if (c.maduroEm) {
      ladroes(e, c, ate, d)
      break
    }
    const taxa = c.seca ? 0.5 : 1
    const falta = (c.total - c.crescido) / taxa
    const limite = Math.min(c.prox, ate)
    if (t + falta <= limite) {
      t += falta
      c.crescido = c.total
      c.maduroEm = t
      c.checado = t
      d.amadureceu++
      continue
    }
    c.crescido += (limite - t) * taxa
    t = limite
    if (t >= c.prox) {
      sortearProblema(c)
      c.prox = proximoProblema(c, t)
    }
  }
  c.t = ate
}

export function processar(e: Estado, ate = agora(), d = novoDiario()): Diario {
  for (const c of e.canteiros) avancarCanteiro(e, c, ate, d)
  if (e.recados.length > 60) {
    const tirar = e.recados.length - 60
    e.recados.splice(0, tirar)
    e.lidos = Math.max(0, e.lidos - tirar)
  }
  return d
}

/** 0 semente, 1 broto, 2 folhas, 3 grande, 4 flor, 5 maduro */
export function estagio(fracao: number, maduro: boolean): number {
  if (maduro) return 5
  if (fracao < 0.1) return 0
  if (fracao < 0.3) return 1
  if (fracao < 0.55) return 2
  if (fracao < 0.8) return 3
  return 4
}

export function faltaMs(c: Canteiro): number {
  if (c.solo !== 'plantado' || c.maduroEm) return 0
  return (c.total - c.crescido) / (c.seca ? 0.5 : 1)
}

/* ---------- ações na própria roça ---------- */
export interface Resultado {
  ok: boolean
  msg?: string
  xp?: number
  moedas?: number
  itens?: { emoji: string; qtd: number }
  niveis?: number[]
  som?: 'arar' | 'plantar' | 'regar' | 'tirar' | 'colher' | 'moeda' | 'erro' | 'adubo'
}

const falha = (msg: string): Resultado => ({ ok: false, msg, som: 'erro' })

function comXp(e: Estado, r: Resultado): Resultado {
  if (r.xp) r.niveis = ganharXp(e, r.xp)
  return r
}

export function arar(e: Estado, i: number): Resultado {
  const c = e.canteiros[i]
  if (c.solo === 'arado') return falha('Esse canteiro já está arado. Plante uma semente!')
  if (c.solo === 'plantado') return falha('Ainda tem planta aqui. A enxada é para limpar o que murchou.')
  Object.assign(c, canteiroVazio(true, agora()))
  return comXp(e, { ok: true, xp: 1, som: 'arar' })
}

export function plantar(e: Estado, i: number, id: string): Resultado {
  const c = e.canteiros[i]
  const cu = cultura(id)
  if (!cu) return falha('Escolha uma semente na mochila.')
  if (c.solo === 'murcho') return falha('Use a enxada para limpar o canteiro antes de plantar.')
  if (c.solo === 'plantado') return falha('Já tem uma plantação aqui.')
  if (!(e.sementes[id] > 0)) return falha(`Acabaram as sementes de ${cu.nome.toLowerCase()}. Compre mais na loja.`)
  e.sementes[id]--
  if (!e.sementes[id]) delete e.sementes[id]
  const t = agora()
  Object.assign(c, canteiroVazio(true, t), { solo: 'plantado', cultura: id, total: cu.minutos * MIN })
  c.prox = proximoProblema(c, t)
  return comXp(e, { ok: true, xp: 1, som: 'plantar' })
}

export function regar(e: Estado, i: number): Resultado {
  const c = e.canteiros[i]
  if (c.solo !== 'plantado' || !c.seca) return falha('Essa terra não está seca.')
  c.seca = false
  return comXp(e, { ok: true, xp: 2, som: 'regar' })
}

export function tirarMato(e: Estado, i: number): Resultado {
  const c = e.canteiros[i]
  if (c.solo !== 'plantado' || !c.mato) return falha('Não tem mato aqui.')
  c.mato--
  return comXp(e, { ok: true, xp: 2, som: 'tirar' })
}

export function matarBicho(e: Estado, i: number): Resultado {
  const c = e.canteiros[i]
  if (c.solo !== 'plantado' || !c.bicho) return falha('Não tem bicho aqui.')
  c.bicho--
  return comXp(e, { ok: true, xp: 2, som: 'tirar' })
}

export function adubar(e: Estado, i: number): Resultado {
  const c = e.canteiros[i]
  if (c.solo !== 'plantado' || c.maduroEm) return falha('O adubo é para plantas que ainda estão crescendo.')
  if (c.adubado) return falha('Essa planta já foi adubada nesta colheita.')
  if (e.adubo <= 0) return falha('Acabou o adubo. Compre na loja.')
  e.adubo--
  c.adubado = true
  c.crescido = Math.min(c.total, c.crescido + c.total * ADUBO.ganho)
  if (c.crescido >= c.total) {
    c.maduroEm = agora()
    c.checado = c.maduroEm
  }
  return { ok: true, som: 'adubo' }
}

export function colher(e: Estado, i: number): Resultado {
  const c = e.canteiros[i]
  const cu = cultura(c.cultura)
  if (c.solo !== 'plantado' || !cu) return falha('Não tem nada para colher aqui.')
  if (!c.maduroEm) return falha(`${cu.nome} ainda não está pronta.`)
  const qtd = rendimento(c)
  e.celeiro[cu.id] = (e.celeiro[cu.id] ?? 0) + qtd
  e.stats.colhidas += qtd
  const t = agora()
  if (c.temporada < cu.colheitas) {
    // volta a dar fruto, mais rápido (já é uma planta grande)
    Object.assign(c, { temporada: c.temporada + 1, crescido: c.total * 0.5, maduroEm: 0, roubado: 0, seca: false, mato: 0, bicho: 0, adubado: false, t })
    c.prox = proximoProblema(c, t)
  } else {
    Object.assign(c, { solo: 'murcho', maduroEm: 0, seca: false, mato: 0, bicho: 0, prox: Infinity, t })
  }
  return comXp(e, { ok: true, xp: cu.xp, itens: { emoji: cu.emoji, qtd }, som: 'colher' })
}

/* ---------- loja e celeiro ---------- */
export function comprarSemente(e: Estado, id: string, qtd: number): Resultado {
  const cu = cultura(id)
  if (!cu) return falha('Semente desconhecida.')
  if (e.nivel < cu.nivel) return falha(`${cu.nome} libera no nível ${cu.nivel}.`)
  const custo = cu.semente * qtd
  if (e.moedas < custo) return falha('Moedas insuficientes.')
  e.moedas -= custo
  e.sementes[id] = (e.sementes[id] ?? 0) + qtd
  return { ok: true, moedas: -custo, som: 'moeda' }
}

export function comprarAdubo(e: Estado, qtd: number): Resultado {
  const custo = ADUBO.preco * qtd
  if (e.moedas < custo) return falha('Moedas insuficientes.')
  e.moedas -= custo
  e.adubo += qtd
  return { ok: true, moedas: -custo, som: 'moeda' }
}

export function comprarCachorro(e: Estado): Resultado {
  if (e.cachorro) return falha('Você já tem o Totó.')
  if (e.nivel < CACHORRO.nivel) return falha(`O cachorro libera no nível ${CACHORRO.nivel}.`)
  if (e.moedas < CACHORRO.preco) return falha('Moedas insuficientes.')
  e.moedas -= CACHORRO.preco
  e.cachorro = true
  return { ok: true, moedas: -CACHORRO.preco, som: 'moeda' }
}

export function comprarTerreno(e: Estado, i: number): Resultado {
  const c = e.canteiros[i]
  if (c.aberto) return falha('Esse canteiro já é seu.')
  if (i !== proximoTerreno(e)) return falha('Compre os canteiros na ordem.')
  const p = precoTerreno(i)
  if (e.nivel < p.nivel) return falha(`Esse canteiro libera no nível ${p.nivel}.`)
  if (e.moedas < p.moedas) return falha('Moedas insuficientes.')
  e.moedas -= p.moedas
  Object.assign(c, canteiroVazio(true, agora()))
  return { ok: true, moedas: -p.moedas, som: 'moeda' }
}

export const proximoTerreno = (e: Estado): number => e.canteiros.findIndex((c) => !c.aberto)

export function vender(e: Estado, id: string, qtd = e.celeiro[id] ?? 0): Resultado {
  const cu = cultura(id)
  const tem = e.celeiro[id] ?? 0
  if (!cu || tem <= 0 || qtd <= 0) return falha('Nada para vender.')
  const n = Math.min(qtd, tem)
  const ganho = n * cu.preco
  e.celeiro[id] = tem - n
  if (!e.celeiro[id]) delete e.celeiro[id]
  e.moedas += ganho
  e.stats.vendido += ganho
  return { ok: true, moedas: ganho, som: 'moeda' }
}

export function venderTudo(e: Estado): Resultado {
  let ganho = 0
  for (const id of Object.keys(e.celeiro)) ganho += vender(e, id).moedas ?? 0
  return ganho ? { ok: true, moedas: ganho, som: 'moeda' } : falha('O celeiro está vazio.')
}

export const valorCeleiro = (e: Estado): number => Object.entries(e.celeiro).reduce((s, [id, n]) => s + n * (cultura(id)?.preco ?? 0), 0)

/** Bônus de quem volta a cada dia. */
export function bonusDiario(e: Estado): number {
  const hoje = new Date(agora()).toISOString().slice(0, 10)
  if (e.bonusDia === hoje) return 0
  const primeiro = e.bonusDia === ''
  e.bonusDia = hoje
  if (primeiro) return 0
  const b = 20 + e.nivel * 10
  e.moedas += b
  e.recados.push({ t: agora(), de: '🎁', texto: `Bônus do dia: você ganhou ${b} moedas por voltar à roça.` })
  return b
}

/* ---------- fazendas dos vizinhos ---------- */
export interface CanteiroVizinho {
  cultura: Cultura | null // null = canteiro murcho/vazio
  fracao: number
  maduro: boolean
  chave: string
  feito: number // bits: 1 colheu (roubou), 2 tirou mato, 4 matou bicho, 8 regou
  mato: boolean
  bicho: boolean
  seca: boolean
  falta: number
}

export const qtdCanteirosVizinho = (v: Vizinho): number => Math.min(TOTAL_CANTEIROS, 6 + Math.floor(v.nivel * 1.1))

export function fazendaVizinho(e: Estado, v: Vizinho, t = agora()): CanteiroVizinho[] {
  const dia = Math.floor(t / 86400000)
  const disp = CULTURAS.filter((c) => c.nivel <= v.nivel)
  return Array.from({ length: qtdCanteirosVizinho(v) }, (_, p) => {
    const cu = disp[Math.floor(hash(`${v.id}:${p}:${dia}:c`) * disp.length)]
    const T = cu.minutos * MIN
    const ciclo = T + Math.max(0.8 * T, 5 * MIN)
    const desl = hash(`${v.id}:${p}:${dia}:d`) * ciclo
    const k = Math.floor((t + desl) / ciclo)
    const fase = (t + desl) % ciclo
    const chave = `${v.id}:${p}:${dia}:${k}`
    const feito = e.vizinhos[chave] ?? 0
    const vazio = hash(chave + 'v') < 0.08
    const maduro = fase >= T
    return {
      cultura: vazio ? null : cu,
      fracao: Math.min(1, fase / T),
      maduro: !vazio && maduro,
      chave,
      feito,
      mato: !vazio && hash(chave + 'm') < 0.3 && !(feito & 2),
      bicho: !vazio && hash(chave + 'b') < 0.25 && !(feito & 4),
      seca: !vazio && !maduro && hash(chave + 's') < 0.2 && !(feito & 8),
      falta: maduro ? 0 : T - fase,
    }
  })
}

/** Limpa as marcas de dias anteriores. */
export function limparVizinhos(e: Estado): void {
  const dia = Math.floor(agora() / 86400000)
  for (const k of Object.keys(e.vizinhos)) if (Number(k.split(':')[2]) < dia) delete e.vizinhos[k]
}

function marcar(e: Estado, chave: string, bit: number): void {
  e.vizinhos[chave] = (e.vizinhos[chave] ?? 0) | bit
}

export function roubar(e: Estado, v: Vizinho, p: number): Resultado {
  const c = fazendaVizinho(e, v)[p]
  if (!c?.cultura) return falha('Não tem nada aqui.')
  if (!c.maduro) return falha(`${c.cultura.nome} ainda não está pronta.`)
  if (c.feito & 1) return falha('Você já pegou daqui. Deixa um pouco para o vizinho!')
  marcar(e, c.chave, 1)
  if (v.cachorro && Math.random() < 0.25) {
    const multa = Math.min(e.moedas, 10 + Math.floor(Math.random() * 21))
    e.moedas -= multa
    e.recados.push({ t: agora(), de: '🐕', texto: `A ${v.cachorro}, cachorra de ${v.nome}, te pegou no flagra! Você saiu correndo e perdeu ${multa} moedas.` })
    return { ok: false, msg: `🐕 ${v.cachorro} te pegou! −${multa} moedas`, moedas: -multa, som: 'erro' }
  }
  const qtd = 1 + Math.floor(Math.random() * 3)
  e.celeiro[c.cultura.id] = (e.celeiro[c.cultura.id] ?? 0) + qtd
  e.stats.roubadas += qtd
  return comXp(e, { ok: true, xp: 1, itens: { emoji: c.cultura.emoji, qtd }, som: 'colher' })
}

export function ajudar(e: Estado, v: Vizinho, p: number, tipo: 'mato' | 'bicho' | 'seca'): Resultado {
  const c = fazendaVizinho(e, v)[p]
  if (!c?.cultura || !c[tipo]) return falha(tipo === 'mato' ? 'Não tem mato aqui.' : tipo === 'bicho' ? 'Não tem bicho aqui.' : 'Essa terra não está seca.')
  marcar(e, c.chave, tipo === 'mato' ? 2 : tipo === 'bicho' ? 4 : 8)
  e.stats.ajudas++
  e.moedas += 1
  return comXp(e, { ok: true, xp: 2, moedas: 1, som: tipo === 'seca' ? 'regar' : 'tirar' })
}
