// Modelo do editor de vídeo (funções puras): projeto, trilhas, clipes, keyframes e operações da linha do tempo.

export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 13) : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`)
export const arred = (n, casas = 3) => Math.round(n * 10 ** casas) / 10 ** casas

/** Que tipo de clipe cabe em cada trilha. A trilha de cima aparece por cima no vídeo. */
export const TRILHAS = {
  midia: { nome: 'Vídeo e imagem', aceita: ['video', 'imagem'], cor: '#60a5fa' },
  texto: { nome: 'Texto', aceita: ['texto'], cor: '#f472b6' },
  sticker: { nome: 'Figurinhas', aceita: ['sticker'], cor: '#fbbf24' },
  audio: { nome: 'Áudio', aceita: ['audio'], cor: '#4ade80' },
}
export const trilhaDoClipe = (tipo) => Object.entries(TRILHAS).find(([, v]) => v.aceita.includes(tipo))[0]

export const TAMANHOS = [
  ['16:9', 'Paisagem 16:9 (YouTube)', 1920, 1080],
  ['9:16', 'Vertical 9:16 (Reels, TikTok, Shorts)', 1080, 1920],
  ['1:1', 'Quadrado 1:1', 1080, 1080],
  ['4:5', 'Retrato 4:5 (feed)', 1080, 1350],
  ['4:3', 'Clássico 4:3', 1440, 1080],
  ['21:9', 'Cinema 21:9', 2560, 1080],
]

export const BLENDS = [
  ['source-over', 'Normal'],
  ['multiply', 'Multiplicar'],
  ['screen', 'Tela'],
  ['overlay', 'Sobrepor'],
  ['darken', 'Escurecer'],
  ['lighten', 'Clarear'],
  ['color-dodge', 'Subexposição de cor'],
  ['color-burn', 'Superexposição de cor'],
  ['hard-light', 'Luz direta'],
  ['soft-light', 'Luz suave'],
  ['difference', 'Diferença'],
  ['exclusion', 'Exclusão'],
  ['hue', 'Matiz'],
  ['saturation', 'Saturação'],
  ['color', 'Cor'],
  ['luminosity', 'Luminosidade'],
]

export const MASCARAS = [
  ['', 'Nenhuma'],
  ['retangulo', 'Retângulo'],
  ['elipse', 'Elipse'],
  ['estrela', 'Estrela'],
  ['coracao', 'Coração'],
  ['losango', 'Losango'],
  ['dividir', 'Dividir (metade)'],
  ['cinema', 'Barras de cinema'],
]

/** Propriedades que podem ser animadas com keyframes. */
export const ANIMAVEIS = {
  x: ['Posição X', 'px'],
  y: ['Posição Y', 'px'],
  escala: ['Escala', '×'],
  rot: ['Rotação', '°'],
  opac: ['Opacidade', '%'],
  desfoque: ['Desfoque', 'px'],
  vol: ['Volume', '%'],
}

export const EASES = [
  ['linear', 'Linear', [0, 0, 1, 1]],
  ['suave', 'Suave', [0.42, 0, 0.58, 1]],
  ['entrada', 'Acelerando', [0.42, 0, 1, 1]],
  ['saida', 'Desacelerando', [0, 0, 0.58, 1]],
  ['mola', 'Passa e volta', [0.34, 1.56, 0.64, 1]],
  ['degrau', 'Degrau (sem transição)', null],
]

export function novoProjeto(nome = 'Projeto sem nome', [largura, altura] = [1920, 1080]) {
  const agora = new Date().toISOString()
  return {
    id: uid(),
    nome,
    criado: agora,
    alterado: agora,
    largura,
    altura,
    fps: 30,
    fundo: { tipo: 'cor', cor: '#000000', cor2: '#1e3a8a', desfoque: 40 },
    trilhas: [
      { id: uid(), tipo: 'texto', mudo: false, oculto: false, itens: [] },
      { id: uid(), tipo: 'midia', mudo: false, oculto: false, itens: [] },
      { id: uid(), tipo: 'audio', mudo: false, oculto: false, itens: [] },
    ],
    marcadores: [],
  }
}

export const TEXTO_PADRAO = { conteudo: 'Seu texto', fonte: 'Inter', tamanho: 96, cor: '#ffffff', peso: 700, italico: false, alinhar: 'center', fundo: '', contorno: 0, corContorno: '#000000', sombra: true, espaco: 1.15, letra: 0 }

export function novoClipe(tipo, { midia = null, inicio = 0, dur = 5, ...extra } = {}) {
  return {
    id: uid(),
    tipo,
    midia: midia?.id ?? null,
    nome: midia?.nome ?? (tipo === 'texto' ? 'Texto' : tipo === 'sticker' ? 'Figurinha' : ''),
    inicio: arred(inicio),
    dur: arred(midia?.duracao && tipo !== 'imagem' ? midia.duracao : dur),
    corte: 0,
    vel: 1,
    vol: 1,
    tom: true,
    t: { x: 0, y: 0, escala: 1, sx: 1, sy: 1, rot: 0, opac: 1 },
    blend: 'source-over',
    efeitos: { desfoque: 0, brilho: 100, contraste: 100, saturacao: 100 },
    mascara: null,
    kf: {},
    ...(tipo === 'texto' ? { texto: { ...TEXTO_PADRAO } } : {}),
    ...(tipo === 'sticker' ? { sticker: { tipo: 'emoji', valor: '⭐', cor: '#fbbf24' } } : {}),
    ...extra,
  }
}

export const fimDo = (c) => c.inicio + c.dur

export function duracaoProjeto(p) {
  let fim = 0
  for (const tr of p.trilhas) for (const c of tr.itens) fim = Math.max(fim, fimDo(c))
  return arred(fim)
}

export function acharClipe(p, id) {
  for (const tr of p.trilhas) {
    const c = tr.itens.find((x) => x.id === id)
    if (c) return { clipe: c, trilha: tr }
  }
  return null
}

/** Clipes visíveis no instante t, de baixo para cima (ordem de desenho). */
export function clipesEm(p, t) {
  const out = []
  for (let i = p.trilhas.length - 1; i >= 0; i--) {
    const tr = p.trilhas[i]
    for (const c of tr.itens) if (t >= c.inicio && t < fimDo(c)) out.push({ clipe: c, trilha: tr })
  }
  return out
}

/* ---------- Keyframes ---------- */

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x
      const d = dx(t)
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break
      t -= e / d
    }
    if (t < 0 || t > 1) {
      let lo = 0
      let hi = 1
      t = x
      for (let i = 0; i < 30; i++) {
        if (sx(t) < x) lo = t
        else hi = t
        t = (lo + hi) / 2
      }
    }
    return sy(t)
  }
}

export const valorBase = (c, prop) => {
  if (prop === 'desfoque') return c.efeitos?.desfoque ?? 0
  if (prop === 'vol') return (c.vol ?? 1) * 100
  if (prop === 'opac') return (c.t?.opac ?? 1) * 100
  return c.t?.[prop] ?? 0
}

/** Valor animado da propriedade no tempo local do clipe (segundos desde o início do clipe). */
export function valorEm(c, prop, tl) {
  const ks = c.kf?.[prop]
  if (!ks?.length) return valorBase(c, prop)
  if (tl <= ks[0].t) return ks[0].v
  const ult = ks[ks.length - 1]
  if (tl >= ult.t) return ult.v
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i]
    const b = ks[i + 1]
    if (tl >= a.t && tl <= b.t) {
      if (!a.e) return a.v
      const f = (tl - a.t) / (b.t - a.t || 1)
      return a.v + (b.v - a.v) * bezier(...a.e)(f)
    }
  }
  return ult.v
}

/** Grava (ou atualiza) um keyframe na propriedade, no tempo local tl. */
export function comKeyframe(c, prop, tl, v, e = [0.42, 0, 0.58, 1]) {
  const ks = [...(c.kf?.[prop] || [])].filter((k) => Math.abs(k.t - tl) > 0.001)
  ks.push({ t: arred(tl), v, e })
  ks.sort((a, b) => a.t - b.t)
  return { ...c, kf: { ...c.kf, [prop]: ks } }
}

export const keyframeEm = (c, prop, tl) => (c.kf?.[prop] || []).find((k) => Math.abs(k.t - tl) < 0.02)

/* ---------- Operações da linha do tempo ---------- */

const mapaClipes = (p, fn) => ({ ...p, trilhas: p.trilhas.map((tr) => ({ ...tr, itens: tr.itens.flatMap((c) => fn(c, tr) ?? []) })) })

/** Divide o clipe no tempo t (absoluto). Devolve [projeto, idDaDireita]. */
export function dividir(p, id, t) {
  let idNovo = null
  const novo = mapaClipes(p, (c) => {
    if (c.id !== id || t <= c.inicio + 0.02 || t >= fimDo(c) - 0.02) return c
    const esq = arred(t - c.inicio)
    const kfEsq = {}
    const kfDir = {}
    for (const [prop, ks] of Object.entries(c.kf || {})) {
      const meio = valorEm(c, prop, esq)
      kfEsq[prop] = [...ks.filter((k) => k.t < esq), ...(ks.some((k) => k.t > esq) ? [{ t: esq, v: meio, e: [0, 0, 1, 1] }] : [])]
      kfDir[prop] = [...(ks.some((k) => k.t < esq) ? [{ t: 0, v: meio, e: [0, 0, 1, 1] }] : []), ...ks.filter((k) => k.t > esq).map((k) => ({ ...k, t: arred(k.t - esq) }))]
      if (!kfEsq[prop].length) delete kfEsq[prop]
      if (!kfDir[prop].length) delete kfDir[prop]
    }
    idNovo = uid()
    return [
      { ...c, dur: esq, kf: kfEsq },
      { ...c, id: idNovo, inicio: arred(t), dur: arred(c.dur - esq), corte: arred(c.corte + esq * c.vel), kf: kfDir },
    ]
  })
  return [novo, idNovo]
}

/** Remove clipes. Em modo ripple, puxa os clipes seguintes da mesma trilha para fechar o buraco. */
export function remover(p, ids, ripple = false) {
  const set = new Set(ids)
  return {
    ...p,
    trilhas: p.trilhas.map((tr) => {
      const saem = tr.itens.filter((c) => set.has(c.id)).sort((a, b) => b.inicio - a.inicio)
      let itens = tr.itens.filter((c) => !set.has(c.id))
      if (ripple)
        for (const s of saem) itens = itens.map((c) => (c.inicio >= fimDo(s) - 0.001 ? { ...c, inicio: arred(c.inicio - s.dur) } : c))
      return { ...tr, itens }
    }),
  }
}

/** Ímã: aproxima t do alvo mais próximo dentro do limite (em segundos). */
export function imantar(t, alvos, limite) {
  let melhor = null
  for (const a of alvos) if (Math.abs(a - t) <= limite && (melhor === null || Math.abs(a - t) < Math.abs(melhor - t))) melhor = a
  return melhor
}

export function alvosDeIma(p, { exceto = new Set(), playhead = null } = {}) {
  const alvos = [0]
  if (playhead !== null) alvos.push(playhead)
  for (const tr of p.trilhas) for (const c of tr.itens) if (!exceto.has(c.id)) alvos.push(c.inicio, fimDo(c))
  for (const m of p.marcadores || []) {
    alvos.push(m.t)
    if (m.dur) alvos.push(m.t + m.dur)
  }
  return alvos
}

/** Há espaço livre na trilha para [ini, fim)? */
export const livre = (trilha, ini, fim, ignorar = new Set()) => trilha.itens.every((c) => ignorar.has(c.id) || fim <= c.inicio + 0.001 || ini >= fimDo(c) - 0.001)

/** Primeiro instante livre a partir de t, na trilha, para um clipe de duração d. */
export function proximoLivre(trilha, t, d) {
  let ini = t
  const ord = [...trilha.itens].sort((a, b) => a.inicio - b.inicio)
  for (const c of ord) if (ini + d > c.inicio + 0.001 && ini < fimDo(c) - 0.001) ini = fimDo(c)
  return arred(ini)
}

/** Insere clipe na trilha compatível; cria trilha nova se a de destino estiver ocupada. */
export function inserir(p, clipe, { trilhaId = null, empurrar = false } = {}) {
  const tipoTr = trilhaDoClipe(clipe.tipo)
  let trilhas = p.trilhas
  let alvo = trilhaId ? trilhas.find((t) => t.id === trilhaId && t.tipo === tipoTr) : null
  if (!alvo) alvo = trilhas.find((t) => t.tipo === tipoTr && livre(t, clipe.inicio, fimDo(clipe)))
  if (!alvo && empurrar) alvo = trilhas.find((t) => t.tipo === tipoTr)
  if (alvo && !livre(alvo, clipe.inicio, fimDo(clipe))) clipe = { ...clipe, inicio: proximoLivre(alvo, clipe.inicio, clipe.dur) }
  if (!alvo) {
    alvo = { id: uid(), tipo: tipoTr, mudo: false, oculto: false, itens: [] }
    const i = tipoTr === 'audio' ? trilhas.length : Math.max(0, trilhas.findIndex((t) => t.tipo === tipoTr))
    trilhas = [...trilhas.slice(0, i), alvo, ...trilhas.slice(i)]
  }
  return { ...p, trilhas: trilhas.map((t) => (t.id === alvo.id ? { ...t, itens: [...t.itens, clipe] } : t)) }
}

export const limparTrilhasVazias = (p) => {
  const tipos = new Set()
  return {
    ...p,
    trilhas: p.trilhas.filter((t) => {
      if (t.itens.length) return true
      if (tipos.has(t.tipo)) return false
      tipos.add(t.tipo)
      return true
    }),
  }
}

/* ---------- Campos numéricos com conta (ex.: 1920/2, 10+5*3) ---------- */

export function calcular(texto) {
  const s = String(texto).replace(/,/g, '.').replace(/\s+/g, '')
  if (!s) return NaN
  let i = 0
  const num = () => {
    if (s[i] === '(') {
      i++
      const v = soma()
      i++
      return v
    }
    if (s[i] === '-') {
      i++
      return -num()
    }
    if (s[i] === '+') {
      i++
      return num()
    }
    const m = s.slice(i).match(/^\d*\.?\d+(e[+-]?\d+)?/i)
    if (!m) throw new Error('número')
    i += m[0].length
    return Number(m[0])
  }
  const pot = () => {
    let v = num()
    while (s[i] === '^') {
      i++
      v **= num()
    }
    return v
  }
  const mult = () => {
    let v = pot()
    while (s[i] === '*' || s[i] === '/' || s[i] === '%') {
      const op = s[i++]
      const d = pot()
      v = op === '*' ? v * d : op === '/' ? v / d : v % d
    }
    return v
  }
  function soma() {
    let v = mult()
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i++]
      const d = mult()
      v = op === '+' ? v + d : v - d
    }
    return v
  }
  try {
    const v = soma()
    return i === s.length && Number.isFinite(v) ? v : NaN
  } catch {
    return NaN
  }
}

/* ---------- Legendas (SRT / VTT) ---------- */

const tempoLegenda = (s) => {
  const m = s.trim().match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/)
  if (!m) return NaN
  return (Number(m[1]) || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(`0.${m[4]}`)
}

export function lerLegendas(texto) {
  const blocos = String(texto).replace(/\r/g, '').replace(/^WEBVTT[^\n]*\n/, '').split(/\n{2,}/)
  const out = []
  for (const b of blocos) {
    const linhas = b.split('\n').filter((l) => l.trim() && !/^NOTE\b/.test(l))
    const iT = linhas.findIndex((l) => l.includes('-->'))
    if (iT < 0) continue
    const [a, z] = linhas[iT].split('-->')
    const ini = tempoLegenda(a)
    const fim = tempoLegenda(z)
    const txt = linhas
      .slice(iT + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim()
    if (Number.isFinite(ini) && Number.isFinite(fim) && fim > ini && txt) out.push({ ini, fim, txt })
  }
  return out
}

/* ---------- Tempo ---------- */

export function fmtTempo(s, fps = 30, quadros = false) {
  const t = Math.max(0, s)
  const m = Math.floor(t / 60)
  const ss = Math.floor(t % 60)
  const base = `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return quadros ? `${base}:${String(Math.floor((t % 1) * fps + 1e-6)).padStart(2, '0')}` : base
}

/* ---------- Áudio: mudar a velocidade sem mudar o tom (sobreposição de janelas) ---------- */

export function esticarSemTom(dados, fator) {
  if (Math.abs(fator - 1) < 0.01) return dados
  const N = 2048
  const saidaHop = N / 4
  const entradaHop = saidaHop * fator
  const quadros = Math.floor((dados.length - N) / entradaHop)
  if (quadros <= 0) return dados
  const out = new Float32Array(Math.ceil(quadros * saidaHop + N))
  const peso = new Float32Array(out.length)
  const janela = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))
  let anterior = 0
  for (let q = 0; q < quadros; q++) {
    // procura o deslocamento mais parecido com o fim do quadro anterior (reduz "chiado")
    const base = Math.round(q * entradaHop)
    let melhor = 0
    if (q > 0) {
      let max = -Infinity
      for (let d = -256; d <= 256; d += 8) {
        const p = base + d
        if (p < 0 || p + N >= dados.length) continue
        let c = 0
        for (let k = 0; k < 256; k += 4) c += dados[p + k] * dados[anterior + saidaHop + k]
        if (c > max) {
          max = c
          melhor = d
        }
      }
    }
    const ini = Math.max(0, Math.min(dados.length - N, base + melhor))
    anterior = ini
    const o = Math.round(q * saidaHop)
    for (let k = 0; k < N; k++) {
      out[o + k] += dados[ini + k] * janela[k]
      peso[o + k] += janela[k]
    }
  }
  for (let i = 0; i < out.length; i++) if (peso[i] > 1e-3) out[i] /= peso[i]
  return out
}
