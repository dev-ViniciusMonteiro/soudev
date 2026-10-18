// Compositor: desenha o quadro do instante t no canvas. A prévia e a exportação usam exatamente este código.
import { clipesEm, valorEm } from './modelo'

/* ---------- Figurinhas (Twemoji, CC-BY 4.0) ---------- */

const TWEMOJI = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/'
export function urlEmoji(emoji) {
  const cps = [...emoji].map((c) => c.codePointAt(0).toString(16))
  const temZwj = cps.includes('200d')
  return `${TWEMOJI}${cps.filter((c) => temZwj || c !== 'fe0f').join('-')}.svg`
}

const imagensEmoji = new Map()
export function imagemEmoji(emoji, aoCarregar) {
  if (imagensEmoji.has(emoji)) return imagensEmoji.get(emoji)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => aoCarregar?.()
  img.src = urlEmoji(emoji)
  imagensEmoji.set(emoji, img)
  return img
}

export const FORMAS = [
  ['circulo', 'Círculo'],
  ['quadrado', 'Quadrado'],
  ['arredondado', 'Quadrado arredondado'],
  ['triangulo', 'Triângulo'],
  ['estrela', 'Estrela'],
  ['coracao', 'Coração'],
  ['seta', 'Seta'],
  ['balao', 'Balão de fala'],
  ['linha', 'Linha'],
]

/* ---------- Caminhos (formas e máscaras) ---------- */

export function caminho(ctx, forma, w, h) {
  const rx = w / 2
  const ry = h / 2
  ctx.beginPath()
  switch (forma) {
    case 'circulo':
    case 'elipse':
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      break
    case 'arredondado':
      ctx.roundRect(-rx, -ry, w, h, Math.min(w, h) * 0.18)
      break
    case 'triangulo':
      ctx.moveTo(0, -ry)
      ctx.lineTo(rx, ry)
      ctx.lineTo(-rx, ry)
      ctx.closePath()
      break
    case 'losango':
      ctx.moveTo(0, -ry)
      ctx.lineTo(rx, 0)
      ctx.lineTo(0, ry)
      ctx.lineTo(-rx, 0)
      ctx.closePath()
      break
    case 'estrela':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? 0.42 : 1
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rx * r, Math.sin(a) * ry * r)
      }
      ctx.closePath()
      break
    case 'coracao': {
      ctx.moveTo(0, ry * 0.95)
      ctx.bezierCurveTo(-rx * 1.6, -ry * 0.1, -rx * 0.55, -ry * 1.25, 0, -ry * 0.45)
      ctx.bezierCurveTo(rx * 0.55, -ry * 1.25, rx * 1.6, -ry * 0.1, 0, ry * 0.95)
      ctx.closePath()
      break
    }
    case 'seta':
      ctx.moveTo(-rx, -ry * 0.3)
      ctx.lineTo(rx * 0.2, -ry * 0.3)
      ctx.lineTo(rx * 0.2, -ry)
      ctx.lineTo(rx, 0)
      ctx.lineTo(rx * 0.2, ry)
      ctx.lineTo(rx * 0.2, ry * 0.3)
      ctx.lineTo(-rx, ry * 0.3)
      ctx.closePath()
      break
    case 'balao':
      ctx.roundRect(-rx, -ry, w, h * 0.78, Math.min(w, h) * 0.15)
      ctx.moveTo(-rx * 0.4, ry * 0.56)
      ctx.lineTo(-rx * 0.55, ry)
      ctx.lineTo(-rx * 0.05, ry * 0.56)
      break
    case 'linha':
      ctx.rect(-rx, -Math.max(2, h * 0.08), w, Math.max(4, h * 0.16))
      break
    default:
      ctx.rect(-rx, -ry, w, h)
  }
}

/* ---------- Medidas ---------- */

const fonteCss = (tx) => `${tx.italico ? 'italic ' : ''}${tx.peso || 400} ${tx.tamanho}px "${tx.fonte}", system-ui, sans-serif`

function medirTexto(ctx, tx) {
  ctx.save()
  ctx.font = fonteCss(tx)
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${tx.letra || 0}px`
  const linhas = String(tx.conteudo || '').split('\n')
  const larguras = linhas.map((l) => ctx.measureText(l || ' ').width)
  ctx.restore()
  const alturaLinha = tx.tamanho * (tx.espaco || 1.15)
  const pad = tx.fundo ? tx.tamanho * 0.35 : 0
  return { linhas, larguras, alturaLinha, w: Math.max(1, ...larguras) + pad * 2, h: linhas.length * alturaLinha + pad * 2, pad }
}

/** Tamanho "natural" do clipe no canvas, antes da escala do usuário. */
export function tamanhoBase(ctx, c, fonte, W, H) {
  if (c.tipo === 'texto') {
    const m = medirTexto(ctx, c.texto)
    return { w: m.w, h: m.h }
  }
  if (c.tipo === 'sticker') {
    const lado = Math.min(W, H) * 0.33
    return { w: lado, h: lado }
  }
  const nw = fonte?.videoWidth || fonte?.naturalWidth || fonte?.width || W
  const nh = fonte?.videoHeight || fonte?.naturalHeight || fonte?.height || H
  const f = Math.min(W / nw, H / nh)
  return { w: nw * f, h: nh * f }
}

/** Caixa do clipe no canvas (centro, tamanho e rotação), para desenhar as alças na prévia. */
export function caixaDoClipe(ctx, p, c, t, fonte) {
  const tl = t - c.inicio
  const b = tamanhoBase(ctx, c, fonte, p.largura, p.altura)
  const esc = valorEm(c, 'escala', tl)
  return {
    cx: p.largura / 2 + valorEm(c, 'x', tl),
    cy: p.altura / 2 + valorEm(c, 'y', tl),
    w: b.w * esc * (c.t.sx ?? 1),
    h: b.h * esc * (c.t.sy ?? 1),
    rot: valorEm(c, 'rot', tl),
  }
}

/* ---------- Desenho ---------- */

let camada = null
let camadaMascara = null
const canvasAux = (atual, w, h) => {
  const cv = atual || (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }))
  if (cv.width !== w || cv.height !== h) {
    cv.width = w
    cv.height = h
  }
  return cv
}

function conteudo(ctx, c, fonte, w, h, redesenhar) {
  if (c.tipo === 'video' || c.tipo === 'imagem') {
    if (fonte && (fonte.readyState === undefined || fonte.readyState >= 2)) ctx.drawImage(fonte, -w / 2, -h / 2, w, h)
    return
  }
  if (c.tipo === 'sticker') {
    const st = c.sticker
    if (st.tipo === 'emoji') {
      const img = imagemEmoji(st.valor, redesenhar)
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -w / 2, -h / 2, w, h)
      else {
        ctx.font = `${Math.min(w, h) * 0.8}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(st.valor, 0, 0)
      }
    } else {
      caminho(ctx, st.valor, w, h)
      ctx.fillStyle = st.cor || '#fbbf24'
      ctx.fill()
    }
    return
  }
  if (c.tipo === 'texto') {
    const tx = c.texto
    const m = medirTexto(ctx, tx)
    const ex = w / m.w
    const ey = h / m.h
    ctx.scale(ex, ey)
    if (tx.fundo) {
      ctx.fillStyle = tx.fundo
      ctx.beginPath()
      ctx.roundRect(-m.w / 2, -m.h / 2, m.w, m.h, tx.tamanho * 0.2)
      ctx.fill()
    }
    ctx.font = fonteCss(tx)
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${tx.letra || 0}px`
    ctx.textBaseline = 'middle'
    ctx.textAlign = tx.alinhar || 'center'
    const xTexto = tx.alinhar === 'left' ? -m.w / 2 + m.pad : tx.alinhar === 'right' ? m.w / 2 - m.pad : 0
    m.linhas.forEach((linha, i) => {
      const y = -m.h / 2 + m.pad + m.alturaLinha * (i + 0.5)
      if (tx.sombra && !tx.fundo) {
        ctx.shadowColor = 'rgba(0,0,0,.55)'
        ctx.shadowBlur = tx.tamanho * 0.12
        ctx.shadowOffsetY = tx.tamanho * 0.04
      }
      if (tx.contorno > 0) {
        ctx.lineJoin = 'round'
        ctx.lineWidth = tx.contorno * 2
        ctx.strokeStyle = tx.corContorno || '#000'
        ctx.strokeText(linha, xTexto, y)
        ctx.shadowColor = 'transparent'
      }
      ctx.fillStyle = tx.cor || '#fff'
      ctx.fillText(linha, xTexto, y)
      ctx.shadowColor = 'transparent'
    })
  }
}

function aplicarMascara(lc, c, w, h) {
  const m = c.mascara
  const mw = w * (m.l ?? 0.6)
  const mh = h * (m.a ?? 0.6)
  const ox = w * (m.x ?? 0)
  const oy = h * (m.y ?? 0)
  const mc = canvasAux(camadaMascara, lc.canvas.width, lc.canvas.height)
  camadaMascara = mc
  const mx = mc.getContext('2d')
  mx.setTransform(1, 0, 0, 1, 0, 0)
  mx.clearRect(0, 0, mc.width, mc.height)
  mx.setTransform(lc.getTransform())
  mx.filter = m.suave > 0 ? `blur(${m.suave}px)` : 'none'
  mx.fillStyle = '#fff'
  if (m.tipo === 'dividir') {
    mx.fillRect(-w / 2 + ox, -h / 2 - 2000, w * 0.5 + 4000, h + 4000)
  } else if (m.tipo === 'cinema') {
    const faixa = h * (m.a ?? 0.12)
    mx.fillRect(-w / 2 - 10, -h / 2 + faixa, w + 20, h - faixa * 2)
  } else {
    mx.translate(ox, oy)
    caminho(mx, m.tipo, mw, mh)
    mx.fill()
  }
  lc.save()
  lc.setTransform(1, 0, 0, 1, 0, 0)
  lc.globalCompositeOperation = m.inverter ? 'destination-out' : 'destination-in'
  lc.drawImage(mc, 0, 0)
  lc.restore()
  if (m.contorno > 0 && !['dividir', 'cinema'].includes(m.tipo)) {
    lc.save()
    lc.translate(ox, oy)
    caminho(lc, m.tipo, mw, mh)
    lc.lineWidth = m.contorno
    lc.strokeStyle = m.corContorno || '#ffffff'
    lc.stroke()
    lc.restore()
  }
}

function filtroDe(c, tl) {
  const f = []
  const blur = valorEm(c, 'desfoque', tl)
  if (blur > 0) f.push(`blur(${blur}px)`)
  const e = c.efeitos || {}
  if (e.brilho !== undefined && e.brilho !== 100) f.push(`brightness(${e.brilho}%)`)
  if (e.contraste !== undefined && e.contraste !== 100) f.push(`contrast(${e.contraste}%)`)
  if (e.saturacao !== undefined && e.saturacao !== 100) f.push(`saturate(${e.saturacao}%)`)
  if (e.pb) f.push('grayscale(1)')
  if (e.sepia) f.push('sepia(1)')
  return f.length ? f.join(' ') : 'none'
}

function desenharClipe(ctx, p, c, t, fonte, redesenhar) {
  const tl = t - c.inicio
  const cx = caixaDoClipe(ctx, p, c, t, fonte)
  const opac = Math.max(0, Math.min(1, valorEm(c, 'opac', tl) / 100))
  if (opac <= 0 || cx.w <= 0 || cx.h <= 0) return
  const destino = c.mascara?.tipo ? null : ctx
  let lc = destino
  if (!destino) {
    camada = canvasAux(camada, p.largura, p.altura)
    lc = camada.getContext('2d')
    lc.setTransform(1, 0, 0, 1, 0, 0)
    lc.clearRect(0, 0, p.largura, p.altura)
    lc.globalAlpha = 1
    lc.globalCompositeOperation = 'source-over'
  }
  lc.save()
  lc.translate(cx.cx, cx.cy)
  lc.rotate((cx.rot * Math.PI) / 180)
  if (destino) {
    lc.globalAlpha = opac
    lc.globalCompositeOperation = c.blend || 'source-over'
  }
  lc.filter = filtroDe(c, tl)
  conteudo(lc, c, fonte, cx.w, cx.h, redesenhar)
  lc.filter = 'none'
  if (!destino) aplicarMascara(lc, c, cx.w, cx.h)
  lc.restore()
  if (!destino) {
    ctx.save()
    ctx.globalAlpha = opac
    ctx.globalCompositeOperation = c.blend || 'source-over'
    ctx.drawImage(camada, 0, 0)
    ctx.restore()
  }
}

function desenharFundo(ctx, p, visiveis, fonteDe) {
  const W = p.largura
  const H = p.altura
  const f = p.fundo || { tipo: 'cor', cor: '#000' }
  ctx.save()
  if (f.tipo === 'gradiente') {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, f.cor)
    g.addColorStop(1, f.cor2 || '#000')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  } else {
    ctx.fillStyle = f.cor || '#000'
    ctx.fillRect(0, 0, W, H)
  }
  if (f.tipo === 'desfoque') {
    const base = visiveis.find(({ clipe }) => clipe.tipo === 'video' || clipe.tipo === 'imagem')
    const el = base && fonteDe(base.clipe)
    if (el && (el.readyState === undefined || el.readyState >= 2)) {
      const nw = el.videoWidth || el.naturalWidth || el.width
      const nh = el.videoHeight || el.naturalHeight || el.height
      const esc = Math.max(W / nw, H / nh) * 1.1
      ctx.filter = `blur(${f.desfoque || 40}px) brightness(70%)`
      ctx.drawImage(el, (W - nw * esc) / 2, (H - nh * esc) / 2, nw * esc, nh * esc)
    }
  }
  ctx.restore()
}

/**
 * Desenha o quadro do tempo t. fonteDe(clipe) devolve o <video>/<img>/ImageBitmap já posicionado nesse tempo.
 */
export function desenharQuadro(ctx, p, t, fonteDe, { redesenhar, escala = 1, escalaY = escala } = {}) {
  ctx.setTransform(escala, 0, 0, escalaY, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.filter = 'none'
  const visiveis = clipesEm(p, t).filter(({ clipe, trilha }) => !trilha.oculto && clipe.tipo !== 'audio')
  desenharFundo(ctx, p, visiveis, fonteDe)
  for (const { clipe } of visiveis) desenharClipe(ctx, p, clipe, t, fonteDe(clipe), redesenhar)
}
