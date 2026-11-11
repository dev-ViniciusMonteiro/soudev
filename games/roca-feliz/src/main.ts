import './estilo.css'
import { chiado, destravarSom, estaMudo, alternarSom, sons, tom } from '../../comum/ui'
import { ADUBO, CACHORRO, CULTURAS, TOTAL_CANTEIROS, VIZINHOS, cultura, precoTerreno, xpDoNivel, type Vizinho } from './dados'
import { CELEIRO, Camera, canteiroEm, centroCanteiro, desenhar, iso, objetoEm, type Cena, type Efeitos, type Ponto, type Vista } from './cena'
import {
  adiantar, adubar, agora, ajudar, arar, bonusDiario, carregar, CHAVE, colher, comprarAdubo, comprarCachorro, comprarSemente, comprarTerreno,
  desligarLadroes, estagio, faltaMs, fazendaVizinho, limparVizinhos, matarBicho, novoDiario, novoEstado, plantar, processar,
  progressoNivel, proximoTerreno, regar, rendimento, roubar, salvar, tirarMato, valorCeleiro, vender, venderTudo,
  type Diario, type Estado, type Resultado,
} from './estado'

// Roça Feliz — releitura dos joguinhos de fazenda do Orkut: are, plante, regue, tire o mato, mate os bichos,
// colha, venda no celeiro e suba de nível. As plantas crescem no relógio, mesmo com o jogo fechado, e os
// vizinhos têm roças próprias para você ajudar... ou pegar umas frutinhas escondido.

const q = new URLSearchParams(location.search)
const VITRINE = q.get('vitrine') === '1'

/* ---------- estado ---------- */
let e: Estado
let primeiraVez = false
if (VITRINE) {
  e = estadoVitrine()
  desligarLadroes()
} else {
  const salvo = carregar()
  if (salvo) e = salvo
  else {
    e = novoEstado()
    primeiraVez = true
  }
}
limparVizinhos(e)
const fora = processar(e)
const bonus = VITRINE ? 0 : bonusDiario(e)

type Ferramenta = 'mao' | 'enxada' | 'semente' | 'regador' | 'mato' | 'bicho' | 'adubo'
const FERRAMENTAS: { id: Ferramenta; icone: string; nome: string; curto: string; visita: boolean }[] = [
  { id: 'mao', icone: '🖐️', nome: 'Colher', curto: 'Colher', visita: true },
  { id: 'enxada', icone: '⛏️', nome: 'Enxada', curto: 'Enxada', visita: false },
  { id: 'semente', icone: '🌱', nome: 'Plantar', curto: 'Plantar', visita: false },
  { id: 'regador', icone: '💧', nome: 'Regar', curto: 'Regar', visita: true },
  { id: 'mato', icone: '🌿', nome: 'Tirar mato', curto: 'Mato', visita: true },
  { id: 'bicho', icone: '🐛', nome: 'Matar bicho', curto: 'Bicho', visita: true },
  { id: 'adubo', icone: '🧪', nome: 'Adubar', curto: 'Adubo', visita: false },
]
let ferramenta: Ferramenta = 'mao'
let semente: string | null = Object.keys(e.sementes)[0] ?? null
let visitando: Vizinho | null = null

/* ---------- interface ---------- */
const app = document.getElementById('app') as HTMLDivElement
app.innerHTML = `
  <canvas class="rf-tela" aria-label="Sua roça"></canvas>
  <header class="rf-topo">
    <button class="rf-perfil" data-acao="casa" title="Sua roça">
      <span class="rf-avatar">🧑‍🌾</span>
      <span class="rf-info"><b class="rf-nome">Minha Roça</b><span class="rf-nivel">Nível <b>1</b></span>
        <span class="rf-xp"><i></i><small></small></span></span>
    </button>
    <div class="rf-moedas" title="Moedas">💰 <b>0</b></div>
    <nav class="rf-menu">
      <button data-acao="loja" title="Loja"><span>🏪</span><small>Loja</small></button>
      <button data-acao="celeiro" title="Celeiro"><span>🛖</span><small>Celeiro</small></button>
      <button data-acao="mochila" title="Mochila"><span>🎒</span><small>Mochila</small></button>
      <button data-acao="vizinhos" title="Vizinhos"><span>🏘️</span><small>Vizinhos</small></button>
      <button data-acao="recados" title="Recados"><span>📜</span><small>Recados</small><em class="rf-badge" hidden></em></button>
      <button data-acao="som" title="Som liga/desliga"><span class="rf-som"></span><small>Som</small></button>
    </nav>
  </header>
  <div class="rf-visita" hidden></div>
  <button class="rf-colher-tudo" hidden>🧺 Colher tudo</button>
  <footer class="rf-ferr" role="toolbar" aria-label="Ferramentas"></footer>
  <div class="rf-dica" hidden></div>
  <div class="rf-aviso" role="status" aria-live="polite"></div>
  <div class="rf-fundo" hidden>
    <div class="rf-janela" role="dialog" aria-modal="true" aria-labelledby="rf-titulo">
      <header><h2 id="rf-titulo"></h2><button class="rf-fechar" aria-label="Fechar">✕</button></header>
      <div class="rf-corpo"></div>
    </div>
  </div>`

const $ = <T extends HTMLElement>(s: string): T => app.querySelector(s) as T
const canvas = $<HTMLCanvasElement>('.rf-tela')
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
const barraFerr = $<HTMLElement>('.rf-ferr')
const dica = $<HTMLDivElement>('.rf-dica')
const aviso = $<HTMLDivElement>('.rf-aviso')
const fundo = $<HTMLDivElement>('.rf-fundo')
const corpo = $<HTMLDivElement>('.rf-corpo')
const titulo = $<HTMLHeadingElement>('#rf-titulo')
const faixaVisita = $<HTMLDivElement>('.rf-visita')
const botaoColherTudo = $<HTMLButtonElement>('.rf-colher-tudo')

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', texto = ''): HTMLElementTagNameMap[K] {
  const x = document.createElement(tag)
  if (cls) x.className = cls
  if (texto) x.textContent = texto
  return x
}

function botao(texto: string, fn: () => void, cls = 'rf-bt', desativado = false): HTMLButtonElement {
  const b = el('button', cls, texto)
  b.disabled = desativado
  b.onclick = fn
  return b
}

const fmt = (n: number): string => n.toLocaleString('pt-BR')
function fmtTempo(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s >= 3600) return `${Math.floor(s / 3600)} h` + (s % 3600 >= 60 ? ` ${Math.floor((s % 3600) / 60)} min` : '')
  if (s >= 60) return `${Math.floor(s / 60)} min` + (s % 60 ? ` ${s % 60} s` : '')
  return `${s} s`
}
function haQuanto(t: number): string {
  const s = Math.max(0, (agora() - t) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return `há ${Math.floor(s / 86400)} d`
}

/* ---------- ferramentas ---------- */
FERRAMENTAS.forEach((f, k) => {
  const b = el('button', 'rf-f')
  b.dataset.f = f.id
  b.title = `${f.nome} (${k + 1})`
  b.setAttribute('aria-label', f.nome)
  b.innerHTML = `<span class="rf-f-ic">${f.icone}</span><small>${f.curto}</small><kbd>${k + 1}</kbd><em class="rf-f-extra"></em>`
  b.onclick = () => escolher(f.id)
  barraFerr.appendChild(b)
})

function escolher(f: Ferramenta): void {
  destravarSom()
  const def = FERRAMENTAS.find((x) => x.id === f)
  if (!def) return
  if (visitando && !def.visita) return avisar('Na roça dos outros dá para colher, regar, tirar mato e matar bichos.')
  if (f === 'semente' && (ferramenta === 'semente' || !semente || !(e.sementes[semente] > 0))) {
    ferramenta = 'semente'
    atualizarHud()
    return abrirMochila()
  }
  ferramenta = f
  atualizarHud()
}

/* ---------- avisos e dica ---------- */
let avisoTimer = 0
function avisar(texto: string, ms = 2600): void {
  aviso.textContent = texto
  aviso.classList.add('on')
  clearTimeout(avisoTimer)
  avisoTimer = window.setTimeout(() => aviso.classList.remove('on'), ms)
}

function textoDica(i: number): string {
  if (visitando) {
    const lista = fazendaVizinho(e, visitando)
    const c = lista[i]
    if (!c) return ''
    if (!c.cultura) return 'Canteiro vazio'
    const ls = [`${c.cultura.emoji} ${c.cultura.nome}`]
    if (c.maduro) ls.push(c.feito & 1 ? 'Você já pegou daqui' : 'Pronto! Pegue um pouco 🤫')
    else ls.push(`Falta ${fmtTempo(c.falta)}`)
    if (c.seca) ls.push('💧 Terra seca: regue para ajudar')
    if (c.mato) ls.push('🌿 Tem mato: ajude a tirar')
    if (c.bicho) ls.push('🐛 Tem bicho: ajude a matar')
    return ls.join('\n')
  }
  const c = e.canteiros[i]
  if (!c.aberto) {
    if (i !== proximoTerreno(e)) return 'Terreno fechado'
    const p = precoTerreno(i)
    return `Canteiro à venda\n💰 ${fmt(p.moedas)} · nível ${p.nivel}\nClique para comprar`
  }
  if (c.solo === 'arado') return 'Terra arada\nPlante uma semente 🌱'
  if (c.solo === 'murcho') return 'Planta murcha\nLimpe com a enxada ⛏️'
  const cu = cultura(c.cultura)
  if (!cu) return ''
  const ls = [`${cu.emoji} ${cu.nome}${cu.colheitas > 1 ? ` · colheita ${c.temporada}/${cu.colheitas}` : ''}`]
  ls.push(c.maduroEm ? `Pronto para colher! Rende ${rendimento(c)}` : `Falta ${fmtTempo(faltaMs(c))}`)
  if (c.seca) ls.push('💧 Terra seca: cresce na metade da velocidade')
  if (c.mato) ls.push(`🌿 Mato ×${c.mato}`)
  if (c.bicho) ls.push(`🐛 Bichos ×${c.bicho}`)
  if (c.roubado) ls.push(`😠 Roubaram ${c.roubado}`)
  if (c.adubado) ls.push('🧪 Adubado')
  return ls.join('\n')
}

/* ---------- câmera e entrada ---------- */
const cam = new Camera()
let larg = 0
let alt = 0
function ajustar(): void {
  larg = window.innerWidth
  alt = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(larg * dpr)
  canvas.height = Math.round(alt * dpr)
  canvas.style.width = larg + 'px'
  canvas.style.height = alt + 'px'
  const topo = ($('.rf-topo').getBoundingClientRect().bottom || 64) + (visitando ? 46 : 4)
  const baixo = alt - (barraFerr.getBoundingClientRect().top || alt - 84) + 8
  cam.ajustar(larg, alt, topo, baixo, dpr)
}
window.addEventListener('resize', ajustar)

let hover = -1
let objHover: string | null = null
let ponteiro: { x: number; y: number; mouse: boolean } | null = null
let arrastando = false
const tocados = new Set<number>()

const qtdClicavel = (): number => (visitando ? fazendaVizinho(e, visitando).length : TOTAL_CANTEIROS)

function sobPonteiro(x: number, y: number): void {
  const p = cam.paraMundo(x, y)
  hover = canteiroEm(p, qtdClicavel())
  objHover = hover < 0 ? objetoEm(p) : null
  canvas.style.cursor = hover >= 0 || objHover ? 'pointer' : 'default'
}

canvas.addEventListener('pointerdown', (ev) => {
  destravarSom()
  ponteiro = { x: ev.clientX, y: ev.clientY, mouse: ev.pointerType === 'mouse' }
  sobPonteiro(ev.clientX, ev.clientY)
  if (hover >= 0) {
    arrastando = true
    tocados.clear()
    tocados.add(hover)
    canvas.setPointerCapture(ev.pointerId)
    usar(hover, true)
    if (!ponteiro.mouse) mostrarDica(hover, ev.clientX, ev.clientY, 2200)
  } else if (objHover) abrirObjeto(objHover)
})
canvas.addEventListener('pointermove', (ev) => {
  ponteiro = { x: ev.clientX, y: ev.clientY, mouse: ev.pointerType === 'mouse' }
  sobPonteiro(ev.clientX, ev.clientY)
  if (arrastando && hover >= 0 && !tocados.has(hover)) {
    tocados.add(hover)
    usar(hover, false)
  }
  if (ponteiro.mouse) mostrarDica(hover, ev.clientX, ev.clientY)
})
const soltar = (): void => {
  arrastando = false
}
canvas.addEventListener('pointerup', soltar)
canvas.addEventListener('pointercancel', soltar)
canvas.addEventListener('pointerleave', () => {
  if (ponteiro?.mouse) {
    ponteiro = null
    hover = -1
    objHover = null
    dica.hidden = true
  }
})

let dicaAte = 0
function mostrarDica(i: number, x: number, y: number, ms = 0): void {
  const t = i >= 0 ? textoDica(i) : objHover === 'celeiro' ? 'Celeiro: venda a colheita' : objHover === 'mural' ? 'Mural de recados' : objHover === 'casa' ? (visitando ? `Casa de ${visitando.nome}` : 'Sua casa') : ''
  if (!t) {
    if (!ms && agora() > dicaAte) dica.hidden = true
    return
  }
  dica.textContent = t
  dica.hidden = false
  const r = dica.getBoundingClientRect()
  dica.style.left = Math.min(larg - r.width - 8, Math.max(8, x + 18)) + 'px'
  dica.style.top = Math.min(alt - r.height - 8, Math.max(8, y + 18)) + 'px'
  if (ms) {
    dicaAte = agora() + ms
    window.setTimeout(() => {
      if (agora() >= dicaAte) dica.hidden = true
    }, ms)
  }
}

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') return fechar()
  if (!fundo.hidden) return
  const n = Number(ev.key)
  if (n >= 1 && n <= FERRAMENTAS.length) escolher(FERRAMENTAS[n - 1].id)
})

/* ---------- usar ferramenta ---------- */
const efeitos: Efeitos = { textos: [], voos: [] }

function usar(i: number, primeiro: boolean): void {
  processar(e)
  let r: Resultado
  if (visitando) {
    const v = visitando
    if (ferramenta === 'mao') r = roubar(e, v, i)
    else if (ferramenta === 'regador') r = ajudar(e, v, i, 'seca')
    else if (ferramenta === 'mato') r = ajudar(e, v, i, 'mato')
    else if (ferramenta === 'bicho') r = ajudar(e, v, i, 'bicho')
    else r = { ok: false, msg: 'Escolha outra ferramenta.' }
  } else {
    const c = e.canteiros[i]
    if (!c.aberto) {
      if (primeiro) abrirTerreno(i)
      return
    }
    switch (ferramenta) {
      case 'mao':
        r = colher(e, i)
        break
      case 'enxada':
        r = arar(e, i)
        break
      case 'semente':
        if (!semente) {
          if (primeiro) abrirMochila()
          return
        }
        r = plantar(e, i, semente)
        if (r.ok && !(e.sementes[semente] > 0)) {
          avisar(`Acabaram as sementes de ${cultura(semente)?.nome.toLowerCase()}.`)
          semente = Object.keys(e.sementes)[0] ?? null
        }
        break
      case 'regador':
        r = regar(e, i)
        break
      case 'mato':
        r = tirarMato(e, i)
        break
      case 'bicho':
        r = matarBicho(e, i)
        break
      case 'adubo':
        r = adubar(e, i)
        break
    }
  }
  retorno(r, centroCanteiro(i), primeiro)
}

function retorno(r: Resultado, p: Ponto, mostrarErro = true): void {
  tocar(r.som)
  if (!r.ok) {
    if (r.moedas) efeitos.textos.push({ texto: `${fmt(r.moedas)} 💰`, x: p.x, y: p.y - 40, cor: '#f87171', vida: 1.4 })
    if (mostrarErro && r.msg) avisar(r.msg)
    atualizarHud()
    return
  }
  let dy = 30
  if (r.itens) {
    const para = cam.paraMundo(56, 36)
    for (let k = 0; k < Math.min(4, r.itens.qtd); k++) efeitos.voos.push({ emoji: r.itens.emoji, de: { x: p.x + (k - 1.5) * 10, y: p.y - 20 }, para: visitando ? para : iso(CELEIRO.c + 0.8, CELEIRO.r + 1.4), t: -k * 0.08, dur: 0.75 })
    efeitos.textos.push({ texto: `+${r.itens.qtd} ${r.itens.emoji}`, x: p.x, y: p.y - dy, cor: '#fff', vida: 1.3 })
    dy += 22
  }
  if (r.xp) {
    efeitos.textos.push({ texto: `+${r.xp} XP`, x: p.x, y: p.y - dy, cor: '#7dd3fc', vida: 1.1 })
    dy += 20
  }
  if (r.moedas && r.moedas > 0) efeitos.textos.push({ texto: `+${r.moedas} 💰`, x: p.x, y: p.y - dy, cor: '#fde047', vida: 1.2 })
  if (r.niveis?.length) subiuNivel(r.niveis)
  atualizarHud()
  guardar()
}

function tocar(s: Resultado['som']): void {
  if (s === 'arar') chiado(0.16, 600, 0.35, 'lowpass')
  else if (s === 'plantar') [520, 780].forEach((f, k) => tom(f, 0.08, 'triangle', 0.1, k * 0.05))
  else if (s === 'regar') chiado(0.35, 4200, 0.12, 'highpass')
  else if (s === 'tirar') {
    chiado(0.09, 1800, 0.25, 'bandpass')
    tom(330, 0.07, 'square', 0.04)
  } else if (s === 'colher') [523, 659, 784].forEach((f, k) => tom(f, 0.12, 'triangle', 0.11, k * 0.06))
  else if (s === 'moeda') sons.moeda()
  else if (s === 'adubo') tom(380, 0.25, 'sine', 0.12, 0, 900)
  else if (s === 'erro') tom(196, 0.16, 'sine', 0.08)
}

function colherTudo(): void {
  destravarSom()
  processar(e)
  let total = 0
  e.canteiros.forEach((c, i) => {
    if (c.aberto && c.solo === 'plantado' && c.maduroEm) {
      const r = colher(e, i)
      if (r.ok) {
        total++
        retorno({ ...r, som: undefined }, centroCanteiro(i), false)
      }
    }
  })
  if (total) tocar('colher')
}
botaoColherTudo.onclick = colherTudo

/* ---------- janelas ---------- */
let aoFechar: (() => void) | null = null
function abrir(t: string, conteudo: HTMLElement, cls = ''): void {
  titulo.textContent = t
  corpo.replaceChildren(conteudo)
  fundo.querySelector('.rf-janela')!.className = 'rf-janela ' + cls
  fundo.hidden = false
  dica.hidden = true
}
function fechar(): void {
  if (fundo.hidden) return
  fundo.hidden = true
  const f = aoFechar
  aoFechar = null
  f?.()
}
fundo.addEventListener('pointerdown', (ev) => {
  if (ev.target === fundo) fechar()
})
$<HTMLButtonElement>('.rf-fechar').onclick = fechar

function abrirObjeto(o: string): void {
  if (o === 'celeiro') return visitando ? avisar(`Esse é o celeiro de ${visitando.nome}. 😅`) : abrirCeleiro()
  if (o === 'mural') return abrirRecados()
  if (o === 'casa') return abrirCasa()
}

/* Loja */
let abaLoja: 'sementes' | 'itens' = 'sementes'
function abrirLoja(): void {
  const raiz = el('div')
  const abas = el('div', 'rf-abas')
  for (const [id, nome] of [['sementes', '🌱 Sementes'], ['itens', '🧰 Itens']] as const) {
    const b = botao(nome, () => {
      abaLoja = id
      abrirLoja()
    }, 'rf-aba' + (abaLoja === id ? ' on' : ''))
    b.setAttribute('role', 'tab')
    b.setAttribute('aria-selected', String(abaLoja === id))
    abas.appendChild(b)
  }
  const grade = el('div', 'rf-grade')
  const comprar = (r: Resultado): void => {
    tocar(r.som)
    if (!r.ok && r.msg) avisar(r.msg)
    atualizarHud()
    guardar()
    abrirLoja()
  }
  if (abaLoja === 'sementes') {
    for (const cu of CULTURAS) {
      const trava = e.nivel < cu.nivel
      const card = el('div', 'rf-card' + (trava ? ' trava' : ''))
      card.innerHTML = `<div class="rf-card-em">${cu.emoji}</div><b>${cu.nome}</b>
        <small>⏱ ${fmtTempo(cu.minutos * 60000)}${cu.colheitas > 1 ? ` · ${cu.colheitas} colheitas` : ''}</small>
        <small>Rende ${cu.rende} × 💰${cu.preco}</small>
        <div class="rf-preco">${trava ? `🔒 Nível ${cu.nivel}` : `💰 ${fmt(cu.semente)}`}</div>
        <small class="rf-tem">${e.sementes[cu.id] ? `Na mochila: ${e.sementes[cu.id]}` : '&nbsp;'}</small>`
      const bts = el('div', 'rf-card-bts')
      const b1 = botao('Comprar', () => comprar(comprarSemente(e, cu.id, 1)), 'rf-bt', trava || e.moedas < cu.semente)
      b1.setAttribute('aria-label', `Comprar semente de ${cu.nome}`)
      bts.append(b1, botao('×5', () => comprar(comprarSemente(e, cu.id, 5)), 'rf-bt sec', trava || e.moedas < cu.semente * 5))
      card.appendChild(bts)
      grade.appendChild(card)
    }
  } else {
    const ad = el('div', 'rf-card')
    ad.innerHTML = `<div class="rf-card-em">🧪</div><b>Adubo</b><small>Adianta ${ADUBO.ganho * 100}% do crescimento de uma planta</small>
      <div class="rf-preco">💰 ${ADUBO.preco}</div><small class="rf-tem">Você tem: ${e.adubo}</small>`
    const bts = el('div', 'rf-card-bts')
    bts.append(botao('Comprar', () => comprar(comprarAdubo(e, 1)), 'rf-bt', e.moedas < ADUBO.preco), botao('×5', () => comprar(comprarAdubo(e, 5)), 'rf-bt sec', e.moedas < ADUBO.preco * 5))
    ad.appendChild(bts)
    const trava = e.nivel < CACHORRO.nivel
    const dog = el('div', 'rf-card' + (trava && !e.cachorro ? ' trava' : ''))
    dog.innerHTML = `<div class="rf-card-em">🐕</div><b>Cachorro ${CACHORRO.nome}</b><small>Late e espanta a maioria dos vizinhos que vêm pegar sua colheita</small>
      <div class="rf-preco">${e.cachorro ? '✓ Já é seu' : trava ? `🔒 Nível ${CACHORRO.nivel}` : `💰 ${fmt(CACHORRO.preco)}`}</div>`
    if (!e.cachorro) dog.appendChild(botao('Adotar', () => comprar(comprarCachorro(e)), 'rf-bt', trava || e.moedas < CACHORRO.preco))
    grade.append(ad, dog)
  }
  raiz.append(abas, grade)
  abrir('Loja', raiz, 'larga')
}

/* Celeiro */
function abrirCeleiro(): void {
  const raiz = el('div')
  const itens = Object.entries(e.celeiro).filter(([, n]) => n > 0)
  if (!itens.length) raiz.appendChild(el('p', 'rf-vazio', 'O celeiro está vazio. Colha as plantas prontas com a mão 🖐️ e elas vêm para cá.'))
  else {
    const lista = el('div', 'rf-lista')
    for (const [id, n] of itens) {
      const cu = cultura(id)
      if (!cu) continue
      const linha = el('div', 'rf-linha')
      linha.innerHTML = `<span class="rf-linha-em">${cu.emoji}</span><span class="rf-linha-txt"><b>${cu.nome}</b><small>${n} × 💰${cu.preco}</small></span>`
      const b = botao(`Vender 💰${fmt(n * cu.preco)}`, () => {
        retorno(vender(e, id), { x: 0, y: 0 })
        abrirCeleiro()
      })
      b.setAttribute('aria-label', `Vender ${cu.nome}`)
      linha.appendChild(b)
      lista.appendChild(linha)
    }
    raiz.appendChild(lista)
    raiz.appendChild(
      botao(`Vender tudo (💰 ${fmt(valorCeleiro(e))})`, () => {
        const r = venderTudo(e)
        tocar(r.som)
        avisar(`Vendeu tudo por 💰 ${fmt(r.moedas ?? 0)}!`)
        atualizarHud()
        guardar()
        abrirCeleiro()
      }, 'rf-bt grande'),
    )
  }
  raiz.appendChild(el('p', 'rf-rodape', `Já colheu ${fmt(e.stats.colhidas)} · pegou dos vizinhos ${fmt(e.stats.roubadas)} · vendeu 💰 ${fmt(e.stats.vendido)}`))
  abrir('Celeiro', raiz)
}

/* Mochila */
function abrirMochila(): void {
  const raiz = el('div')
  const ids = Object.keys(e.sementes).filter((id) => e.sementes[id] > 0)
  if (!ids.length) {
    raiz.appendChild(el('p', 'rf-vazio', 'Sua mochila está sem sementes.'))
    raiz.appendChild(botao('🏪 Ir à loja', () => abrirLoja(), 'rf-bt grande'))
  } else {
    raiz.appendChild(el('p', 'rf-sub', 'Escolha a semente e clique (ou arraste) nos canteiros arados:'))
    const grade = el('div', 'rf-grade peq')
    for (const id of ids) {
      const cu = cultura(id)
      if (!cu) continue
      const b = el('button', 'rf-card sel' + (semente === id ? ' on' : ''))
      b.innerHTML = `<div class="rf-card-em">${cu.emoji}</div><b>${cu.nome}</b><small>×${e.sementes[id]} · ${fmtTempo(cu.minutos * 60000)}</small>`
      b.setAttribute('aria-label', `Plantar ${cu.nome}`)
      b.onclick = () => {
        semente = id
        ferramenta = 'semente'
        atualizarHud()
        fechar()
        avisar(`${cu.emoji} ${cu.nome}: clique nos canteiros arados para plantar.`)
      }
      grade.appendChild(b)
    }
    raiz.appendChild(grade)
  }
  const ad = el('div', 'rf-linha')
  ad.innerHTML = `<span class="rf-linha-em">🧪</span><span class="rf-linha-txt"><b>Adubo</b><small>Você tem ${e.adubo}</small></span>`
  ad.appendChild(botao('Usar', () => {
    ferramenta = 'adubo'
    atualizarHud()
    fechar()
  }, 'rf-bt sec', e.adubo <= 0))
  raiz.appendChild(ad)
  abrir('Mochila', raiz)
}

/* Vizinhos */
function abrirVizinhos(): void {
  const raiz = el('div')
  raiz.appendChild(el('p', 'rf-sub', 'Ajude seus vizinhos a cuidar da roça (ganha XP e moedas) ou pegue umas frutinhas prontas... se o cachorro deixar.'))
  const lista = el('div', 'rf-lista')
  for (const v of VIZINHOS) {
    const f = fazendaVizinho(e, v)
    const prontos = f.filter((c) => c.maduro && !(c.feito & 1)).length
    const ajuda = f.filter((c) => c.mato || c.bicho || c.seca).length
    const linha = el('div', 'rf-linha')
    linha.innerHTML = `<span class="rf-linha-em">${v.avatar}</span><span class="rf-linha-txt"><b>${v.nome}${v.cachorro ? ' 🐕' : ''}</b>
      <small>Nível ${v.nivel} · ${prontos} pronto${prontos === 1 ? '' : 's'} · ${ajuda} precisando de ajuda</small></span>`
    const b = botao('Visitar', () => visitar(v))
    b.setAttribute('aria-label', `Visitar ${v.nome}`)
    linha.appendChild(b)
    lista.appendChild(linha)
  }
  raiz.appendChild(lista)
  abrir('Vizinhos', raiz)
}

function visitar(v: Vizinho | null): void {
  visitando = v
  fechar()
  if (v) {
    if (!FERRAMENTAS.find((x) => x.id === ferramenta)?.visita) ferramenta = 'mao'
    faixaVisita.innerHTML = ''
    const txt = el('span')
    txt.innerHTML = `<b>${v.avatar} Roça de ${v.nome}</b><small>“${v.frase}”</small>`
    faixaVisita.append(txt, botao('🏠 Voltar pra minha roça', () => visitar(null)))
    avisar(`Você está na roça de ${v.nome}.`)
  }
  faixaVisita.hidden = !v
  hover = -1
  atualizarHud()
  ajustar()
}

/* Recados */
function abrirRecados(): void {
  const raiz = el('div', 'rf-recados')
  if (!e.recados.length) raiz.appendChild(el('p', 'rf-vazio', 'Nenhum recado ainda.'))
  for (const r of [...e.recados].reverse()) {
    const d = el('div', 'rf-recado')
    d.innerHTML = `<span class="rf-linha-em"></span><span class="rf-linha-txt"><span></span><small></small></span>`
    ;(d.querySelector('.rf-linha-em') as HTMLElement).textContent = r.de ?? '✉️'
    ;(d.querySelector('.rf-linha-txt span') as HTMLElement).textContent = r.texto
    ;(d.querySelector('small') as HTMLElement).textContent = haQuanto(r.t)
    raiz.appendChild(d)
  }
  e.lidos = e.recados.length
  atualizarHud()
  guardar()
  abrir('Mural de recados', raiz)
}

/* Casa */
let confirmarRecomeco = false
function abrirCasa(): void {
  const raiz = el('div')
  if (visitando) {
    raiz.innerHTML = `<p class="rf-grande-em">${visitando.avatar}</p><p class="rf-sub">“${visitando.frase}”</p>`
    abrir(`Casa de ${visitando.nome}`, raiz)
    return
  }
  const { atual, precisa } = progressoNivel(e)
  const abertos = e.canteiros.filter((c) => c.aberto).length
  raiz.innerHTML = `<div class="rf-stats">
    <div><b>${e.nivel}</b><small>nível</small></div><div><b>${fmt(atual)}/${fmt(precisa)}</b><small>XP para o próximo</small></div>
    <div><b>${abertos}/${TOTAL_CANTEIROS}</b><small>canteiros</small></div><div><b>${fmt(e.stats.colhidas)}</b><small>colhidos</small></div>
    <div><b>${fmt(e.stats.ajudas)}</b><small>ajudas aos vizinhos</small></div><div><b>💰 ${fmt(e.stats.vendido)}</b><small>vendidos</small></div></div>
    <p class="rf-rodape">Sua roça fica salva neste aparelho e continua crescendo com o jogo fechado.</p>`
  if (!VITRINE)
    raiz.appendChild(
      botao(confirmarRecomeco ? 'Tem certeza? Clique de novo para apagar tudo' : 'Recomeçar a roça do zero', () => {
        if (!confirmarRecomeco) {
          confirmarRecomeco = true
          return abrirCasa()
        }
        try {
          localStorage.removeItem(CHAVE)
        } catch {
          /* sem armazenamento */
        }
        location.reload()
      }, 'rf-bt perigo'),
    )
  aoFechar = () => (confirmarRecomeco = false)
  abrir('Sua roça', raiz)
}

/* Terreno */
function abrirTerreno(i: number): void {
  const prox = proximoTerreno(e)
  if (i !== prox) return avisar('Compre primeiro o canteiro com a placa “À venda”.')
  const p = precoTerreno(i)
  const raiz = el('div')
  raiz.innerHTML = `<p class="rf-grande-em">🟫</p><p class="rf-sub">Mais um canteiro para plantar, já arado.</p><p class="rf-preco">💰 ${fmt(p.moedas)} · nível ${p.nivel}</p>`
  const pode = e.nivel >= p.nivel && e.moedas >= p.moedas
  if (!pode) raiz.appendChild(el('p', 'rf-rodape', e.nivel < p.nivel ? `Libera no nível ${p.nivel}.` : 'Moedas insuficientes.'))
  raiz.appendChild(
    botao('Comprar canteiro', () => {
      const r = comprarTerreno(e, i)
      fechar()
      retorno(r, centroCanteiro(i))
      if (r.ok) avisar('Canteiro novo! 🎉')
    }, 'rf-bt grande', !pode),
  )
  abrir('Canteiro à venda', raiz)
}

/* Nível */
function subiuNivel(niveis: number[]): void {
  const n = niveis[niveis.length - 1]
  sons.vitoria()
  const novas = CULTURAS.filter((c) => niveis.includes(c.nivel))
  const raiz = el('div', 'rf-centro')
  raiz.innerHTML = `<p class="rf-grande-em">🎉</p><p class="rf-sub">Você chegou ao <b>nível ${n}</b> e ganhou 💰 ${fmt(niveis.reduce((s, k) => s + 20 * k, 0))}!</p>
    ${novas.length ? `<p>Sementes novas na loja: ${novas.map((c) => `${c.emoji} ${c.nome}`).join(', ')}</p>` : ''}
    ${niveis.includes(CACHORRO.nivel) ? '<p>🐕 Agora você pode adotar um cachorro na loja.</p>' : ''}`
  raiz.appendChild(botao('Oba!', fechar, 'rf-bt grande'))
  abrir('Subiu de nível!', raiz)
}

/* Boas-vindas */
function boasVindas(): void {
  const raiz = el('div', 'rf-centro')
  raiz.innerHTML = `<p class="rf-grande-em">🧑‍🌾</p>
    <ol class="rf-passos">
      <li><b>🌱 Plante</b>: escolha a semente e clique nos canteiros arados (dá para arrastar).</li>
      <li><b>⏳ Espere</b>: as plantas crescem no relógio, até com o jogo fechado.</li>
      <li><b>💧🌿🐛 Cuide</b>: regue a terra seca, tire o mato e mate os bichos para render mais.</li>
      <li><b>🖐️ Colha</b> e venda no <b>celeiro</b> para comprar sementes melhores e mais terra.</li>
      <li><b>🏘️ Visite os vizinhos</b>: ajude... ou pegue umas frutinhas prontas. 🤫</li>
    </ol>`
  raiz.appendChild(botao('Começar', fechar, 'rf-bt grande'))
  abrir('Bem-vindo à Roça Feliz!', raiz)
}

/* ---------- HUD ---------- */
let ultimoHud = ''
function atualizarHud(): void {
  const { atual, precisa } = progressoNivel(e)
  $('.rf-nivel b').textContent = String(e.nivel)
  $<HTMLElement>('.rf-xp i').style.width = `${Math.min(100, (atual / precisa) * 100)}%`
  $('.rf-xp small').textContent = `${fmt(atual)}/${fmt(precisa)} XP`
  $('.rf-moedas b').textContent = fmt(e.moedas)
  const novos = e.recados.length - e.lidos
  const badge = $<HTMLElement>('.rf-badge')
  badge.hidden = novos <= 0
  badge.textContent = String(novos)
  $('.rf-som').textContent = estaMudo() ? '🔇' : '🔊'
  barraFerr.querySelectorAll<HTMLButtonElement>('.rf-f').forEach((b) => {
    const f = FERRAMENTAS.find((x) => x.id === b.dataset.f)!
    b.classList.toggle('on', ferramenta === f.id)
    b.setAttribute('aria-pressed', String(ferramenta === f.id))
    b.disabled = !!visitando && !f.visita
    const extra = b.querySelector('.rf-f-extra') as HTMLElement
    if (f.id === 'semente') extra.textContent = semente && e.sementes[semente] ? `${cultura(semente)?.emoji}${e.sementes[semente]}` : ''
    if (f.id === 'adubo') extra.textContent = e.adubo ? String(e.adubo) : ''
  })
}

function atualizarColherTudo(): void {
  const prontos = !visitando && e.canteiros.some((c) => c.aberto && c.solo === 'plantado' && c.maduroEm)
  const chave = String(prontos)
  if (chave !== ultimoHud) {
    ultimoHud = chave
    botaoColherTudo.hidden = !prontos
  }
}

app.querySelectorAll<HTMLButtonElement>('[data-acao]').forEach((b) => {
  b.onclick = () => {
    destravarSom()
    const a = b.dataset.acao
    if (a === 'loja') abrirLoja()
    else if (a === 'celeiro') abrirCeleiro()
    else if (a === 'mochila') abrirMochila()
    else if (a === 'vizinhos') abrirVizinhos()
    else if (a === 'recados') abrirRecados()
    else if (a === 'casa') abrirCasa()
    else if (a === 'som') {
      alternarSom()
      atualizarHud()
    }
  }
})

/* ---------- salvar ---------- */
function guardar(): void {
  if (!VITRINE) salvar(e)
}
setInterval(guardar, 5000)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) guardar()
  else contarAusencia(processar(e))
})
window.addEventListener('pagehide', guardar)

function contarAusencia(d: Diario): void {
  const partes: string[] = []
  if (d.amadureceu) partes.push(`${d.amadureceu} plantaç${d.amadureceu === 1 ? 'ão ficou pronta' : 'ões ficaram prontas'}`)
  for (const r of d.roubos.slice(0, 2)) partes.push(`${r.quem.nome} levou ${r.qtd} ${r.emoji}`)
  if (d.espantados) partes.push(`o ${CACHORRO.nome} espantou ${d.espantados} ladrão${d.espantados === 1 ? '' : 'ões'}`)
  if (partes.length) avisar('Enquanto você esteve fora: ' + partes.join(' · '), 5000)
  atualizarHud()
}

/* ---------- cena ---------- */
function vistas(): Cena {
  if (visitando) {
    const lista = fazendaVizinho(e, visitando)
    const vs: Vista[] = Array.from({ length: TOTAL_CANTEIROS }, (_, i) => {
      const c = lista[i]
      if (!c) return { solo: 'fechado', venda: false, cultura: null, estagio: 0, seca: false, mato: 0, bicho: 0 }
      if (!c.cultura) return { solo: 'murcho', venda: false, cultura: null, estagio: 0, seca: false, mato: 0, bicho: 0 }
      const ja = c.maduro && !!(c.feito & 1)
      return { solo: 'plantado', venda: false, cultura: c.cultura, estagio: ja ? 4 : estagio(c.fracao, c.maduro), seca: c.seca, mato: c.mato ? 1 : 0, bicho: c.bicho ? 1 : 0 }
    })
    return { vistas: vs, cachorro: !!visitando.cachorro, telhado: visitando.casa, dono: `Roça de ${visitando.nome}` }
  }
  const prox = proximoTerreno(e)
  const vs: Vista[] = e.canteiros.map((c, i) => {
    if (!c.aberto) return { solo: 'fechado', venda: i === prox, cultura: null, estagio: 0, seca: false, mato: 0, bicho: 0 }
    return {
      solo: c.solo,
      venda: false,
      cultura: c.solo === 'plantado' ? (cultura(c.cultura) ?? null) : null,
      estagio: estagio(c.crescido / c.total, !!c.maduroEm),
      seca: c.seca,
      mato: c.mato,
      bicho: c.bicho,
    }
  })
  return { vistas: vs, cachorro: e.cachorro, telhado: '#dc2626', dono: 'Minha Roça' }
}

let antes = performance.now()
let relogio = 0
let ultimaDica = 0
function quadro(t: number): void {
  requestAnimationFrame(quadro)
  const dt = Math.min(0.05, (t - antes) / 1000)
  antes = t
  relogio += dt
  const d = processar(e)
  if (d.roubos.length || d.espantados) contarAusencia(d)
  desenhar(ctx, cam, larg, alt, vistas(), relogio, ponteiro?.mouse || arrastando ? hover : -1, objHover, efeitos, dt)
  // ferramenta junto do ponteiro do mouse
  if (ponteiro?.mouse && (hover >= 0 || objHover) && fundo.hidden) {
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0)
    const f = FERRAMENTAS.find((x) => x.id === ferramenta)!
    ctx.font = '26px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000'
    ctx.fillText(ferramenta === 'semente' && semente ? (cultura(semente)?.emoji ?? f.icone) : f.icone, ponteiro.x + 2, ponteiro.y - 22)
  }
  if (t - ultimaDica > 300) {
    ultimaDica = t
    if (ponteiro?.mouse && hover >= 0 && !dica.hidden) mostrarDica(hover, ponteiro.x, ponteiro.y)
    atualizarColherTudo()
  }
}

/* ---------- vitrine (banner) ---------- */
function estadoVitrine(): Estado {
  const v = novoEstado()
  const t = agora()
  v.nivel = 9
  v.xp = xpDoNivel(9) + 260
  v.moedas = 4870
  v.cachorro = true
  v.adubo = 6
  v.sementes = { uva: 4, morango: 8, tomate: 5 }
  v.celeiro = { morango: 22, tomate: 14, milho: 30 }
  v.bonusDia = new Date(t).toISOString().slice(0, 10)
  const plano: [string, number, Partial<{ seca: boolean; mato: number; bicho: number }>?][] = [
    ['melancia', 1], ['girassol', 1], ['girassol', 1], ['uva', 0.6], ['uva', 0.85], ['morango', 1],
    ['tomate', 1], ['abobora', 0.9, { mato: 2 }], ['abobora', 1], ['milho', 0.4], ['milho', 0.5, { seca: true }], ['berinjela', 1],
    ['morango', 0.2], ['cenoura', 1], ['batata', 0.7, { bicho: 2 }], ['melancia', 0.15], ['', 0], ['tomate', 1],
  ]
  plano.forEach(([id, f, prob], i) => {
    const c = v.canteiros[i]
    c.aberto = true
    if (!id) {
      c.solo = 'arado'
      return
    }
    const cu = cultura(id)!
    Object.assign(c, { solo: 'plantado', cultura: id, total: cu.minutos * 60000, t, prox: Infinity, ...prob })
    c.crescido = c.total * f
    if (f >= 1) {
      c.maduroEm = t
      c.checado = t
    }
  })
  v.recados.push({ t, de: '👵', texto: 'Tia Cida: Obrigada por regar meu morango! 🍓' })
  v.lidos = v.recados.length - 1
  return v
}

/* ---------- ganchos para os testes ---------- */
declare global {
  interface Window {
    __roca: unknown
  }
}
window.__roca = {
  estado: () => JSON.parse(JSON.stringify(e)) as Estado,
  /** Adianta o relógio do jogo em minutos. */
  adiantar: (min: number) => {
    adiantar(min * 60000)
    processar(e)
    atualizarHud()
  },
  /** Posição na tela (px) do canteiro i. */
  canteiro: (i: number) => cam.paraTela(centroCanteiro(i)),
  visitando: () => visitando?.id ?? null,
  fazendaVizinho: (id: string) => {
    const v = VIZINHOS.find((x) => x.id === id)
    return v ? fazendaVizinho(e, v).map((c) => ({ maduro: c.maduro, feito: c.feito, mato: c.mato, bicho: c.bicho, seca: c.seca, cultura: c.cultura?.id ?? null })) : []
  },
  ferramenta: () => ferramenta,
  /** Põe problemas num canteiro plantado (para testar as ferramentas). */
  forcar: (i: number, p: { seca?: boolean; mato?: number; bicho?: number }) => {
    Object.assign(e.canteiros[i], p)
  },
  novoDiario,
}

/* ---------- começo ---------- */
ajustar()
atualizarHud()
requestAnimationFrame(quadro)
if (primeiraVez) boasVindas()
else if (!VITRINE) {
  contarAusencia(fora)
  if (bonus) window.setTimeout(() => avisar(`🎁 Bônus do dia: +${bonus} moedas!`, 3500), fora.amadureceu || fora.roubos.length ? 5200 : 300)
}
guardar()
