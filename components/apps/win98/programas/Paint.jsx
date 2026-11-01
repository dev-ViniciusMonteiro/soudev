'use client'

// Paint: caixa de ferramentas 2×8 com opções embaixo, paleta de 28 cores (botão esquerdo = cor do primeiro plano,
// direito = cor de fundo), desfazer em 3 níveis, inverter/girar, inverter cores, atributos e salvar no disco C:.

import { useEffect, useRef, useState } from 'react'
import { MenuBarra } from '../Menu'
import { useAntesDeFechar, useJanela, useSistema } from '../sistema'
import { gravarArquivo, lerArquivo, nomeDe } from '@/lib/win98/arquivos'

export const PALETA = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
]

const TIPOS = [
  { rotulo: 'Bitmap de 24 bits (*.bmp)', ext: ['bmp'] },
  { rotulo: 'Todos os arquivos (*.*)', ext: null },
]

// Ferramentas na ordem da caixa do Paint do 98.
const FERRAMENTAS = [
  ['livre', 'Seleção livre', true],
  ['selecao', 'Selecionar'],
  ['borracha', 'Borracha/Borracha de cor'],
  ['balde', 'Preencher com cor'],
  ['contagotas', 'Selecionar cor'],
  ['lupa', 'Lente de aumento'],
  ['lapis', 'Lápis'],
  ['pincel', 'Pincel'],
  ['spray', 'Aerógrafo'],
  ['texto', 'Texto'],
  ['linha', 'Linha'],
  ['curva', 'Curva', true],
  ['retangulo', 'Retângulo'],
  ['poligono', 'Polígono'],
  ['elipse', 'Elipse'],
  ['arredondado', 'Retângulo arredondado'],
]

const GLIFOS = {
  livre: <path d="M3 9c0-4 5-6 8-4s2 6-2 7-3 3-1 4" fill="none" stroke="#000" strokeDasharray="1 1" />,
  selecao: <rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="#000" strokeDasharray="1 1" />,
  borracha: (
    <>
      <path d="M3 10l5-6h5l-5 6z" fill="#ff8080" stroke="#000" />
      <path d="M3 10h5v3H3z" fill="#fff" stroke="#000" />
    </>
  ),
  balde: (
    <>
      <path d="M3 8l5-5 5 5-5 5z" fill="#fff" stroke="#000" />
      <path d="M12 8c1 2 2 3 1 5" stroke="#00f" strokeWidth="2" fill="none" />
    </>
  ),
  contagotas: (
    <>
      <path d="M3 13l7-7 2 2-7 7H3z" fill="#fff" stroke="#000" />
      <path d="M10 4l2-2 2 2-2 2z" fill="#000" />
    </>
  ),
  lupa: (
    <>
      <circle cx="7" cy="7" r="4" fill="#bfe8ff" stroke="#000" />
      <path d="M10 10l4 4" stroke="#000" strokeWidth="2" />
    </>
  ),
  lapis: (
    <>
      <path d="M3 13l1-3 7-7 2 2-7 7z" fill="#ffd700" stroke="#000" />
      <path d="M3 13l1-3 2 2z" fill="#000" />
    </>
  ),
  pincel: (
    <>
      <path d="M8 9l5-7 1 1-5 7z" fill="#804000" stroke="#000" />
      <path d="M3 14c0-3 2-5 5-5l1 1c0 3-3 4-6 4z" fill="#000" />
    </>
  ),
  spray: (
    <>
      <path d="M6 6h5v8H6z" fill="#c0c0c0" stroke="#000" />
      <path d="M7 3h3v3H7z" fill="#000" />
      {[[2, 2], [3, 4], [1, 5], [4, 1], [2, 7]].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width="1" height="1" fill="#000" />
      ))}
    </>
  ),
  texto: <text x="3" y="13" fontSize="13" fontFamily="serif" fontWeight="bold" fill="#000">A</text>,
  linha: <path d="M2 13L14 3" stroke="#000" />,
  curva: <path d="M2 12C5 0 10 16 14 4" stroke="#000" fill="none" />,
  retangulo: <rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="#000" />,
  poligono: <path d="M3 13L4 4l5 4 4-5v10z" fill="none" stroke="#000" />,
  elipse: <ellipse cx="8" cy="8" rx="6" ry="4.5" fill="none" stroke="#000" />,
  arredondado: <rect x="2.5" y="3.5" width="11" height="9" rx="3" fill="none" stroke="#000" />,
}

// Tamanhos das opções de cada ferramenta.
const OPCOES = {
  borracha: [4, 6, 8, 10],
  pincel: [2, 4, 7],
  spray: [5, 9, 13],
  linha: [1, 2, 3, 4, 5],
  curva: [1, 2, 3, 4, 5],
  retangulo: ['contorno', 'ambos', 'cheio'],
  elipse: ['contorno', 'ambos', 'cheio'],
  arredondado: ['contorno', 'ambos', 'cheio'],
  poligono: ['contorno', 'ambos', 'cheio'],
  lupa: [1, 2, 6, 8],
}

const hexDe = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
const rgbDe = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Balde: preenchimento 4-conectado da cor exata. */
export function preencher(ctx, x0, y0, cor) {
  const { width: w, height: h } = ctx.canvas
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const i0 = (y0 * w + x0) * 4
  const alvo = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]]
  const [r, g, b] = rgbDe(cor)
  if (alvo[0] === r && alvo[1] === g && alvo[2] === b && alvo[3] === 255) return
  const igual = (i) => d[i] === alvo[0] && d[i + 1] === alvo[1] && d[i + 2] === alvo[2] && d[i + 3] === alvo[3]
  const pilha = [[x0, y0]]
  while (pilha.length) {
    const [x, y] = pilha.pop()
    let xi = x
    while (xi >= 0 && igual((y * w + xi) * 4)) xi--
    xi++
    let cima = false
    let baixo = false
    while (xi < w && igual((y * w + xi) * 4)) {
      const i = (y * w + xi) * 4
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
      d[i + 3] = 255
      if (y > 0) {
        const c = igual(((y - 1) * w + xi) * 4)
        if (c && !cima) pilha.push([xi, y - 1])
        cima = c
      }
      if (y < h - 1) {
        const c = igual(((y + 1) * w + xi) * 4)
        if (c && !baixo) pilha.push([xi, y + 1])
        baixo = c
      }
      xi++
    }
  }
  ctx.putImageData(img, 0, 0)
}

/** Linha de pixels sem suavização (Bresenham), como o lápis do Paint. */
function linhaPixel(ctx, x0, y0, x1, y1, tam = 1) {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  const meio = Math.floor(tam / 2)
  for (;;) {
    ctx.fillRect(x0 - meio, y0 - meio, tam, tam)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

function desenharForma(ctx, tipo, a, b, estilo, contorno, fundo, espessura, quadrado) {
  let x = Math.min(a.x, b.x)
  let y = Math.min(a.y, b.y)
  let w = Math.abs(b.x - a.x)
  let h = Math.abs(b.y - a.y)
  if (quadrado) {
    const m = Math.max(w, h)
    w = h = m
    if (b.x < a.x) x = a.x - m
    if (b.y < a.y) y = a.y - m
  }
  ctx.beginPath()
  if (tipo === 'retangulo') ctx.rect(x + 0.5, y + 0.5, w, h)
  else if (tipo === 'elipse') ctx.ellipse(x + w / 2 + 0.5, y + h / 2 + 0.5, w / 2, h / 2, 0, 0, Math.PI * 2)
  else ctx.roundRect(x + 0.5, y + 0.5, w, h, Math.min(8, w / 2, h / 2))
  if (estilo !== 'contorno') {
    ctx.fillStyle = estilo === 'cheio' ? contorno : fundo
    ctx.fill()
  }
  if (estilo !== 'cheio') {
    ctx.strokeStyle = contorno
    ctx.lineWidth = espessura
    ctx.stroke()
  }
}

export default function Paint({ caminho: caminhoInicial }) {
  const sis = useSistema()
  const jan = useJanela()
  const tela = useRef(null)
  const camada = useRef(null)
  const seletorCor = useRef(null)
  const [ferramenta, setFerramenta] = useState('lapis')
  const anterior = useRef('lapis')
  const [opcoes, setOpcoes] = useState({ borracha: 6, pincel: 4, spray: 9, linha: 1, retangulo: 'contorno', elipse: 'contorno', arredondado: 'contorno', poligono: 'contorno', lupa: 1 })
  const [cor1, setCor1] = useState('#000000')
  const [cor2, setCor2] = useState('#ffffff')
  const [tamanho, setTamanho] = useState({ w: 480, h: 320 })
  const [caminho, setCaminho] = useState(caminhoInicial || null)
  const [alterado, setAlterado] = useState(false)
  const [posicao, setPosicao] = useState('')
  const [texto, setTexto] = useState(null) // { x, y, valor }
  const [selecao, setSelecao] = useState(null) // { x, y, w, h, img?, ox, oy }
  const desfazer = useRef([])
  const refazer = useRef([])
  const traco = useRef(null)
  const poligono = useRef(null)
  const zoom = opcoes.lupa
  const nomeDoc = caminho ? nomeDe(caminho).replace(/\.bmp$/i, '') : 'sem título'

  useEffect(() => {
    jan.definirTitulo(`${nomeDoc} - Paint`)
  }, [nomeDoc, jan])

  const ctx = () => tela.current.getContext('2d', { willReadFrequently: true })

  // Tela branca (ou a imagem aberta) ao começar.
  useEffect(() => {
    const c = ctx()
    c.fillStyle = '#ffffff'
    c.fillRect(0, 0, tela.current.width, tela.current.height)
    if (caminhoInicial) carregarImagem(lerArquivo(sis.disco, caminhoInicial))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const guardarDesfazer = () => {
    desfazer.current.push({ img: ctx().getImageData(0, 0, tela.current.width, tela.current.height) })
    if (desfazer.current.length > 3) desfazer.current.shift()
    refazer.current = []
  }

  const voltar = () => {
    const passo = desfazer.current.pop()
    if (!passo) return
    refazer.current.push({ img: ctx().getImageData(0, 0, tela.current.width, tela.current.height) })
    redimensionarTela(passo.img.width, passo.img.height, passo.img)
  }

  const avancar = () => {
    const passo = refazer.current.pop()
    if (!passo) return
    desfazer.current.push({ img: ctx().getImageData(0, 0, tela.current.width, tela.current.height) })
    redimensionarTela(passo.img.width, passo.img.height, passo.img)
  }

  const redimensionarTela = (w, h, img) => {
    const antes = img || ctx().getImageData(0, 0, tela.current.width, tela.current.height)
    setTamanho({ w, h })
    requestAnimationFrame(() => {
      const c = ctx()
      c.fillStyle = cor2
      c.fillRect(0, 0, w, h)
      c.putImageData(antes, 0, 0)
    })
  }

  function carregarImagem(dataUrl) {
    if (!dataUrl || !String(dataUrl).startsWith('data:image')) return
    const im = new Image()
    im.onload = () => {
      setTamanho({ w: im.width, h: im.height })
      requestAnimationFrame(() => {
        const c = ctx()
        c.fillStyle = '#fff'
        c.fillRect(0, 0, im.width, im.height)
        c.drawImage(im, 0, 0)
      })
    }
    im.src = dataUrl
  }

  const ponto = (e) => {
    const r = tela.current.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * tela.current.width),
      y: Math.floor(((e.clientY - r.top) / r.height) * tela.current.height),
    }
  }

  const limparCamada = () => {
    const c = camada.current.getContext('2d')
    c.clearRect(0, 0, camada.current.width, camada.current.height)
    return c
  }

  // ---------- seleção ----------
  const confirmarSelecao = () => {
    if (selecao?.img) ctx().putImageData(selecao.img, selecao.x, selecao.y)
    setSelecao(null)
    limparCamada()
  }

  const desenharSelecao = (s) => {
    const c = limparCamada()
    if (s.img) c.putImageData(s.img, s.x, s.y)
    c.save()
    c.setLineDash([3, 3])
    c.strokeStyle = '#000'
    c.lineWidth = 1
    c.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1)
    c.restore()
  }

  // ---------- desenho ----------
  const baixar = (e) => {
    if (e.button !== 0 && e.button !== 2) return
    e.preventDefault()
    const p = ponto(e)
    const direito = e.button === 2
    const principal = direito ? cor2 : cor1
    const secundaria = direito ? cor1 : cor2

    if (ferramenta === 'lupa') {
      setOpcoes((o) => ({ ...o, lupa: o.lupa === 1 ? 4 : 1 }))
      return
    }
    if (ferramenta === 'contagotas') {
      const [r, g, b] = ctx().getImageData(p.x, p.y, 1, 1).data
      if (direito) setCor2(hexDe([r, g, b]))
      else setCor1(hexDe([r, g, b]))
      setFerramenta(anterior.current) // volta para a ferramenta anterior, como no Paint
      return
    }
    if (ferramenta === 'texto') {
      if (texto?.valor) gravarTexto()
      setTexto({ x: p.x, y: p.y, valor: '', cor: principal })
      return
    }
    if (ferramenta === 'selecao') {
      if (selecao && p.x >= selecao.x && p.x < selecao.x + selecao.w && p.y >= selecao.y && p.y < selecao.y + selecao.h) {
        // Arrastar a seleção: na primeira vez, recorta os pixels e pinta o buraco com a cor de fundo.
        let s = selecao
        if (!s.img) {
          guardarDesfazer()
          const img = ctx().getImageData(s.x, s.y, s.w, s.h)
          ctx().fillStyle = cor2
          ctx().fillRect(s.x, s.y, s.w, s.h)
          s = { ...s, img }
        }
        traco.current = { tipo: 'mover-selecao', inicio: p, sel: s }
        tela.current.setPointerCapture(e.pointerId)
        return
      }
      confirmarSelecao()
      traco.current = { tipo: 'selecionar', inicio: p }
      tela.current.setPointerCapture(e.pointerId)
      return
    }
    if (selecao) confirmarSelecao()

    if (ferramenta === 'poligono') {
      if (!poligono.current) {
        guardarDesfazer()
        poligono.current = { pontos: [p], cor: principal, fundo: secundaria }
      }
      traco.current = { tipo: 'poligono', inicio: p }
      tela.current.setPointerCapture(e.pointerId)
      return
    }

    guardarDesfazer()
    setAlterado(true)
    const c = ctx()
    if (ferramenta === 'balde') {
      preencher(c, p.x, p.y, principal)
      return
    }
    traco.current = { tipo: ferramenta, inicio: p, ultimo: p, cor: principal, fundo: secundaria }
    tela.current.setPointerCapture(e.pointerId)
    pintarPonto(p, p)
  }

  const pintarPonto = (de, ate) => {
    const t = traco.current
    const c = ctx()
    if (t.tipo === 'lapis') {
      c.fillStyle = t.cor
      linhaPixel(c, de.x, de.y, ate.x, ate.y, 1)
    } else if (t.tipo === 'borracha') {
      c.fillStyle = t.fundo
      linhaPixel(c, de.x, de.y, ate.x, ate.y, opcoes.borracha)
    } else if (t.tipo === 'pincel') {
      c.strokeStyle = t.cor
      c.lineWidth = opcoes.pincel
      c.lineCap = 'round'
      c.beginPath()
      c.moveTo(de.x + 0.5, de.y + 0.5)
      c.lineTo(ate.x + 0.5, ate.y + 0.5)
      c.stroke()
    } else if (t.tipo === 'spray') {
      c.fillStyle = t.cor
      const r = opcoes.spray
      for (let i = 0; i < r * 1.5; i++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() * r
        c.fillRect(Math.round(ate.x + Math.cos(a) * d), Math.round(ate.y + Math.sin(a) * d), 1, 1)
      }
    }
  }

  const mover = (e) => {
    const p = ponto(e)
    if (p.x >= 0 && p.y >= 0 && p.x < tamanho.w && p.y < tamanho.h) setPosicao(`${p.x},${p.y}`)
    const t = traco.current
    if (!t) return
    if (t.tipo === 'lapis' || t.tipo === 'borracha' || t.tipo === 'pincel' || t.tipo === 'spray') {
      pintarPonto(t.ultimo, p)
      t.ultimo = p
      return
    }
    if (t.tipo === 'selecionar') {
      const s = { x: Math.max(0, Math.min(t.inicio.x, p.x)), y: Math.max(0, Math.min(t.inicio.y, p.y)), w: Math.abs(p.x - t.inicio.x) + 1, h: Math.abs(p.y - t.inicio.y) + 1 }
      desenharSelecao(s)
      t.atual = s
      setPosicao(`${s.w}x${s.h}`)
      return
    }
    if (t.tipo === 'mover-selecao') {
      const s = { ...t.sel, x: t.sel.x + p.x - t.inicio.x, y: t.sel.y + p.y - t.inicio.y }
      desenharSelecao(s)
      t.atual = s
      return
    }
    const c = limparCamada()
    if (t.tipo === 'linha' || t.tipo === 'poligono') {
      let fim = p
      if (e.shiftKey) {
        // Shift prende a linha em 0°, 45° ou 90°.
        const dx = p.x - t.inicio.x
        const dy = p.y - t.inicio.y
        const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
        const len = Math.hypot(dx, dy)
        fim = { x: Math.round(t.inicio.x + Math.cos(ang) * len), y: Math.round(t.inicio.y + Math.sin(ang) * len) }
      }
      c.fillStyle = t.tipo === 'poligono' ? poligono.current.cor : t.cor
      if (t.tipo === 'poligono') {
        const pts = poligono.current.pontos
        for (let i = 1; i < pts.length; i++) linhaPixel(c, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, 1)
        linhaPixel(c, pts.at(-1).x, pts.at(-1).y, fim.x, fim.y, 1)
      } else linhaPixel(c, t.inicio.x, t.inicio.y, fim.x, fim.y, opcoes.linha)
      t.fim = fim
      return
    }
    if (t.tipo === 'retangulo' || t.tipo === 'elipse' || t.tipo === 'arredondado') {
      desenharForma(c, t.tipo, t.inicio, p, opcoes[t.tipo], t.cor, t.fundo, opcoes.linha, e.shiftKey)
      t.fim = p
      t.quadrado = e.shiftKey
      setPosicao(`${Math.abs(p.x - t.inicio.x)}x${Math.abs(p.y - t.inicio.y)}`)
    }
  }

  const soltar = () => {
    const t = traco.current
    traco.current = null
    if (!t) return
    const c = ctx()
    if (t.tipo === 'selecionar') {
      if (t.atual && t.atual.w > 1 && t.atual.h > 1) setSelecao(t.atual)
      else limparCamada()
      return
    }
    if (t.tipo === 'mover-selecao') {
      setSelecao(t.atual || t.sel)
      setAlterado(true)
      return
    }
    if (t.tipo === 'linha' && t.fim) {
      c.fillStyle = t.cor
      linhaPixel(c, t.inicio.x, t.inicio.y, t.fim.x, t.fim.y, opcoes.linha)
    } else if ((t.tipo === 'retangulo' || t.tipo === 'elipse' || t.tipo === 'arredondado') && t.fim) {
      desenharForma(c, t.tipo, t.inicio, t.fim, opcoes[t.tipo], t.cor, t.fundo, opcoes.linha, t.quadrado)
    } else if (t.tipo === 'poligono') {
      const fim = t.fim || t.inicio
      const pts = poligono.current.pontos
      if (fim.x !== pts.at(-1).x || fim.y !== pts.at(-1).y) pts.push(fim)
      setAlterado(true)
      return
    }
    limparCamada()
  }

  const fecharPoligono = () => {
    const pg = poligono.current
    poligono.current = null
    limparCamada()
    if (!pg || pg.pontos.length < 2) return
    const c = ctx()
    const estilo = opcoes.poligono
    c.beginPath()
    pg.pontos.forEach((q, i) => (i ? c.lineTo(q.x + 0.5, q.y + 0.5) : c.moveTo(q.x + 0.5, q.y + 0.5)))
    c.closePath()
    if (estilo !== 'contorno') {
      c.fillStyle = estilo === 'cheio' ? pg.cor : pg.fundo
      c.fill()
    }
    if (estilo !== 'cheio') {
      c.fillStyle = pg.cor
      const pts = [...pg.pontos, pg.pontos[0]]
      for (let i = 1; i < pts.length; i++) linhaPixel(c, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, 1)
    }
  }

  function gravarTexto() {
    if (!texto?.valor) {
      setTexto(null)
      return
    }
    guardarDesfazer()
    const c = ctx()
    c.fillStyle = texto.cor
    c.font = '13px Arial, sans-serif'
    c.textBaseline = 'top'
    texto.valor.split('\n').forEach((l, i) => c.fillText(l, texto.x + 2, texto.y + 2 + i * 15))
    setAlterado(true)
    setTexto(null)
  }

  const escolherFerramenta = (f) => {
    if (f === 'contagotas' && ferramenta !== 'contagotas') anterior.current = ferramenta
    if (selecao) confirmarSelecao()
    if (poligono.current) fecharPoligono()
    if (texto) gravarTexto()
    setFerramenta(f)
  }

  // ---------- arquivo ----------
  const dados = () => tela.current.toDataURL('image/png')
  const bytesBmp = () => 54 + Math.ceil((tamanho.w * 3) / 4) * 4 * tamanho.h

  const salvarEm = (c) => {
    if (selecao) confirmarSelecao()
    try {
      sis.mudarDisco((d) => gravarArquivo(d, c, dados(), { tamanho: bytesBmp() }))
      setCaminho(c)
      setAlterado(false)
      sis.adicionarRecente(c)
      return true
    } catch (e) {
      sis.msg({ titulo: 'Paint', texto: e.message, icone: 'erro' })
      return false
    }
  }

  const salvarComo = async () => {
    const c = await sis.dialogoArquivo({ modo: 'salvar', titulo: 'Salvar como', nome: caminho ? nomeDe(caminho) : 'sem título', pasta: 'C:\\Meus documentos\\Minhas imagens', tipos: TIPOS })
    return c ? salvarEm(c) : false
  }
  const salvar = () => (caminho ? salvarEm(caminho) : salvarComo())

  const confirmarDescarte = async () => {
    if (!alterado) return true
    const r = await sis.msg({ titulo: 'Paint', texto: `Salvar as alterações em ${nomeDoc}?`, icone: 'aviso', botoes: ['&Sim', '&Não', 'Cancelar'] })
    if (r === '&Sim') return await salvar()
    return r === '&Não'
  }
  useAntesDeFechar(confirmarDescarte)

  const limparImagem = () => {
    guardarDesfazer()
    const c = ctx()
    c.fillStyle = cor2
    c.fillRect(0, 0, tamanho.w, tamanho.h)
    setAlterado(true)
  }

  const novo = async () => {
    if (!(await confirmarDescarte())) return
    desfazer.current = []
    setCaminho(null)
    setAlterado(false)
    setTamanho({ w: 480, h: 320 })
    requestAnimationFrame(() => {
      const c = ctx()
      c.fillStyle = '#fff'
      c.fillRect(0, 0, 480, 320)
    })
  }

  const abrir = async () => {
    if (!(await confirmarDescarte())) return
    const c = await sis.dialogoArquivo({ modo: 'abrir', titulo: 'Abrir', pasta: 'C:\\Meus documentos\\Minhas imagens', tipos: TIPOS })
    if (!c) return
    const conteudo = lerArquivo(sis.disco, c)
    if (!String(conteudo).startsWith('data:image')) {
      sis.msg({ titulo: 'Paint', texto: `O Paint não pode ler este arquivo.\nEste não é um arquivo de bitmap válido ou seu formato não tem suporte no momento.`, icone: 'aviso' })
      return
    }
    desfazer.current = []
    setCaminho(c)
    setAlterado(false)
    carregarImagem(conteudo)
  }

  const transformar = (fn) => () => {
    if (selecao) confirmarSelecao()
    guardarDesfazer()
    const c = ctx()
    const copia = document.createElement('canvas')
    copia.width = tamanho.w
    copia.height = tamanho.h
    copia.getContext('2d').drawImage(tela.current, 0, 0)
    c.save()
    fn(c)
    c.drawImage(copia, 0, 0)
    c.restore()
    setAlterado(true)
  }

  const inverterCores = () => {
    guardarDesfazer()
    const c = ctx()
    const img = c.getImageData(0, 0, tamanho.w, tamanho.h)
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 255 - img.data[i]
      img.data[i + 1] = 255 - img.data[i + 1]
      img.data[i + 2] = 255 - img.data[i + 2]
    }
    c.putImageData(img, 0, 0)
    setAlterado(true)
  }

  const atributos = async () => {
    const r = await sis.abrirEsperar('paintAtributos', { w: tamanho.w, h: tamanho.h })
    if (!r) return
    const w = Math.max(1, Math.min(2000, r.w | 0))
    const h = Math.max(1, Math.min(2000, r.h | 0))
    if (w === tamanho.w && h === tamanho.h) return
    guardarDesfazer()
    redimensionarTela(w, h)
    setAlterado(true)
  }

  useEffect(() => {
    if (!jan.ativa) return
    const f = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      const k = e.key.toLowerCase()
      if (e.ctrlKey && k === 'z') {
        e.preventDefault()
        voltar()
      } else if (e.ctrlKey && k === 'y') {
        e.preventDefault()
        avancar()
      } else if (e.ctrlKey && k === 's') {
        e.preventDefault()
        salvar()
      } else if (e.ctrlKey && k === 'i') {
        e.preventDefault()
        inverterCores()
      } else if (e.ctrlKey && e.shiftKey && k === 'n') {
        e.preventDefault()
        limparImagem()
      } else if (e.key === 'Delete' && selecao) {
        guardarDesfazer()
        ctx().fillStyle = cor2
        if (!selecao.img) ctx().fillRect(selecao.x, selecao.y, selecao.w, selecao.h)
        setSelecao(null)
        limparCamada()
        setAlterado(true)
      } else if (e.key === 'Escape' && poligono.current) fecharPoligono()
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  const menus = [
    {
      rotulo: '&Arquivo',
      itens: [
        { rotulo: '&Novo', atalho: 'Ctrl+N', acao: novo },
        { rotulo: '&Abrir...', atalho: 'Ctrl+O', acao: abrir },
        { rotulo: '&Salvar', atalho: 'Ctrl+S', acao: salvar },
        { rotulo: 'Salvar &como...', acao: salvarComo },
        { sep: true },
        { rotulo: 'Visualizar i&mpressão', desabilitado: true },
        { rotulo: '&Imprimir...', atalho: 'Ctrl+P', desabilitado: true },
        { sep: true },
        { rotulo: 'Sai&r', atalho: 'Alt+F4', acao: () => jan.fechar() },
      ],
    },
    {
      rotulo: '&Editar',
      itens: [
        { rotulo: '&Desfazer', atalho: 'Ctrl+Z', acao: voltar },
        { rotulo: '&Repetir', atalho: 'Ctrl+Y', acao: avancar },
        { sep: true },
        { rotulo: '&Limpar seleção', atalho: 'Del', desabilitado: !selecao },
        { rotulo: 'Selecionar &tudo', atalho: 'Ctrl+A', acao: () => { setFerramenta('selecao'); const s = { x: 0, y: 0, w: tamanho.w, h: tamanho.h }; setSelecao(s); desenharSelecao(s) } },
      ],
    },
    {
      rotulo: '&Imagem',
      itens: [
        {
          rotulo: '&Inverter/girar',
          sub: [
            { rotulo: 'Inverter &horizontalmente', acao: transformar((c) => { c.translate(tamanho.w, 0); c.scale(-1, 1) }) },
            { rotulo: 'Inverter &verticalmente', acao: transformar((c) => { c.translate(0, tamanho.h); c.scale(1, -1) }) },
            { rotulo: '&Girar 180°', acao: transformar((c) => { c.translate(tamanho.w, tamanho.h); c.rotate(Math.PI) }) },
          ],
        },
        { rotulo: '&Alongar/inclinar...', atalho: 'Ctrl+W', desabilitado: true },
        { rotulo: 'In&verter cores', atalho: 'Ctrl+I', acao: inverterCores },
        { rotulo: 'A&tributos...', atalho: 'Ctrl+E', acao: atributos },
        { rotulo: '&Limpar imagem', atalho: 'Ctrl+Shft+N', acao: limparImagem },
      ],
    },
    { rotulo: '&Cores', itens: [{ rotulo: '&Editar cores...', acao: () => seletorCor.current?.click() }] },
    { rotulo: 'Aj&uda', itens: [{ rotulo: '&Tópicos da Ajuda', acao: () => sis.abrir('ajuda') }, { sep: true }, { rotulo: '&Sobre o Paint', acao: () => sis.abrir('sobre', { programa: 'Paint', icone: 'paint' }) }] },
  ]

  const opcoesAtuais = OPCOES[ferramenta === 'linha' || ferramenta === 'curva' ? 'linha' : ferramenta]
  const chaveOpcao = ferramenta === 'curva' ? 'linha' : ferramenta

  return (
    <div className="w98-paint">
      <MenuBarra menus={menus} />
      <div className="w98-paint-meio">
        <div className="w98-paint-ferramentas">
          <div className="w98-paint-grade" role="toolbar" aria-label="Ferramentas">
            {FERRAMENTAS.map(([id, nome, indisponivel]) => (
              <button key={id} type="button" title={indisponivel ? `${nome} (não disponível na recriação)` : nome} aria-label={nome} data-ferramenta={id} disabled={indisponivel} className={ferramenta === id ? 'sel' : ''} onClick={() => escolherFerramenta(id)}>
                <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
                  {GLIFOS[id]}
                </svg>
              </button>
            ))}
          </div>
          <div className="w98-paint-opcoes">
            {opcoesAtuais?.map((o) => (
              <button key={o} type="button" className={opcoes[chaveOpcao] === o ? 'sel' : ''} onClick={() => setOpcoes((x) => ({ ...x, [chaveOpcao]: o }))} aria-label={`Opção ${o}`}>
                {typeof o === 'number' ? (
                  ferramenta === 'lupa' ? (
                    <span style={{ fontSize: 9, lineHeight: 1 }}>{o}x</span>
                  ) : ferramenta === 'linha' || ferramenta === 'curva' ? (
                    <span style={{ display: 'block', width: 30, height: o, background: '#000' }} />
                  ) : (
                    <span style={{ display: 'block', width: o, height: o, background: '#000', borderRadius: ferramenta === 'pincel' || ferramenta === 'spray' ? '50%' : 0, transform: ferramenta === 'spray' ? 'scale(0.6)' : undefined }} />
                  )
                ) : (
                  <span style={{ display: 'block', width: 26, height: 9, border: o === 'cheio' ? 'none' : '1px solid #000', background: o === 'contorno' ? 'transparent' : '#808080' }} />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="w98-paint-area" onContextMenu={(e) => e.preventDefault()}>
          <div style={{ position: 'relative', width: tamanho.w * zoom, height: tamanho.h * zoom }}>
            <canvas
              ref={tela}
              width={tamanho.w}
              height={tamanho.h}
              style={{ width: tamanho.w * zoom, height: tamanho.h * zoom, cursor: ferramenta === 'texto' ? 'text' : 'crosshair' }}
              data-testid="w98-tela-paint"
              onPointerDown={baixar}
              onPointerMove={mover}
              onPointerUp={soltar}
              onPointerLeave={() => setPosicao('')}
              onDoubleClick={() => ferramenta === 'poligono' && fecharPoligono()}
            />
            <canvas ref={camada} className="camada" width={tamanho.w} height={tamanho.h} style={{ left: 0, top: 0, width: tamanho.w * zoom, height: tamanho.h * zoom }} />
            {texto && (
              <textarea
                className="w98-paint-texto"
                autoFocus
                style={{ left: texto.x * zoom, top: texto.y * zoom, color: texto.cor, fontSize: 13 * zoom }}
                value={texto.valor}
                onChange={(e) => setTexto({ ...texto, valor: e.target.value })}
                onBlur={gravarTexto}
                onKeyDown={(e) => e.key === 'Escape' && setTexto(null)}
              />
            )}
          </div>
        </div>
      </div>
      <div className="w98-paint-paleta">
        <div className="w98-paint-atuais" title="Cor do primeiro plano e cor da tela de fundo">
          <span className="w98-primaria" style={{ background: cor1 }} data-testid="w98-cor1" data-cor={cor1} />
          <span className="w98-secundaria" style={{ background: cor2 }} />
        </div>
        <div className="w98-paint-cores">
          {PALETA.map((c) => (
            <button
              key={c}
              type="button"
              style={{ background: c }}
              aria-label={`Cor ${c}`}
              data-cor={c}
              onClick={() => setCor1(c)}
              onContextMenu={(e) => {
                e.preventDefault()
                setCor2(c)
              }}
            />
          ))}
        </div>
        <input ref={seletorCor} type="color" value={cor1} onChange={(e) => setCor1(e.target.value)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} tabIndex={-1} aria-hidden="true" />
      </div>
      <div className="w98-status">
        <div>Para obter ajuda, clique em Tópicos da Ajuda no menu Ajuda.</div>
        <div style={{ width: 80 }} data-testid="w98-posicao">{posicao}</div>
        <div style={{ width: 80 }}>
          {tamanho.w}x{tamanho.h}
        </div>
      </div>
    </div>
  )
}

/* ---------- Atributos (Imagem > Atributos) ---------- */
export function Atributos({ w, h, responder }) {
  const jan = useJanela()
  const [v, setV] = useState({ w: String(w), h: String(h) })
  const respondeu = useRef(false)
  useEffect(() => {
    jan.registrarFechar(() => {
      if (!respondeu.current) responder?.(null)
      return true
    })
  }, [jan, responder])
  return (
    <form
      className="w98-dialogo"
      style={{ width: 300 }}
      onSubmit={(e) => {
        e.preventDefault()
        respondeu.current = true
        responder?.({ w: Number(v.w), h: Number(v.h) })
        jan.fecharJa()
      }}
    >
      <div>Última gravação do arquivo: não disponível</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="w98-linha">
          <u>L</u>argura:
          <input className="w98-campo" style={{ width: 56 }} value={v.w} onChange={(e) => setV({ ...v, w: e.target.value.replace(/\D/g, '') })} aria-label="Largura" />
        </label>
        <label className="w98-linha">
          <u>A</u>ltura:
          <input className="w98-campo" style={{ width: 56 }} value={v.h} onChange={(e) => setV({ ...v, h: e.target.value.replace(/\D/g, '') })} aria-label="Altura" />
        </label>
      </div>
      <fieldset className="w98-fieldset">
        <legend>Unidades</legend>
        <label className="w98-radio">
          <input type="radio" checked readOnly name="un" /> Pixels
        </label>
      </fieldset>
      <div className="w98-botoes-direita">
        <button type="submit" className="w98-botao padrao">
          <span>OK</span>
        </button>
        <button type="button" className="w98-botao" onClick={() => jan.fechar()}>
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  )
}
