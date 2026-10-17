// Câmera do MEI na Mão: reconhecer produto pela imagem e ler código de barras/QR. Tudo no aparelho.
//
// Reconhecimento: cada foto vira um vetor (MobileNet via MediaPipe). Guardamos até 6 vetores por produto,
// em int8 + base64 (cabe numa célula da planilha), e comparamos o quadro da câmera por similaridade de cosseno.

import { loadImageEmbedder, loadZxing } from '../client'

export const LIMIAR = 0.72 // abaixo disso não sugerimos nada
export const MARGEM = 0.04 // o primeiro precisa ganhar do segundo por pelo menos isso
const LADO = 224

/** Recorta o centro da imagem num quadrado (o produto costuma estar no meio). */
function quadrado(fonte) {
  const w = fonte.videoWidth || fonte.naturalWidth || fonte.width
  const h = fonte.videoHeight || fonte.naturalHeight || fonte.height
  const lado = Math.min(w, h) * 0.8
  const c = document.createElement('canvas')
  c.width = LADO
  c.height = LADO
  c.getContext('2d').drawImage(fonte, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  return c
}

const paraBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes.buffer)))
const deBase64 = (s) => new Int8Array(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer)

export async function vetorDe(fonte) {
  const embedder = await loadImageEmbedder()
  const f = embedder.embed(quadrado(fonte)).embeddings[0].floatEmbedding
  let max = 0
  for (const x of f) max = Math.max(max, Math.abs(x))
  const q = new Int8Array(f.length)
  for (let i = 0; i < f.length; i++) q[i] = Math.round((f[i] / (max || 1)) * 127)
  return paraBase64(q)
}

const cache = new Map()
function vetor(b64) {
  if (!cache.has(b64)) cache.set(b64, deBase64(b64))
  return cache.get(b64)
}

export function similaridade(a, b) {
  const x = typeof a === 'string' ? vetor(a) : a
  const y = typeof b === 'string' ? vetor(b) : b
  let dot = 0
  let nx = 0
  let ny = 0
  for (let i = 0; i < x.length; i++) {
    dot += x[i] * y[i]
    nx += x[i] * x[i]
    ny += y[i] * y[i]
  }
  return nx && ny ? dot / Math.sqrt(nx * ny) : 0
}

/** Produtos ordenados pela parecença com o vetor da câmera. */
export function ranquear(vetorCamera, produtos) {
  const lista = []
  for (const p of produtos) {
    const vs = Array.isArray(p.visual) ? p.visual : []
    if (!vs.length) continue
    let melhor = 0
    for (const v of vs) melhor = Math.max(melhor, similaridade(vetorCamera, v))
    lista.push({ produto: p, nota: melhor })
  }
  return lista.sort((a, b) => b.nota - a.nota)
}

export function palpite(ranking) {
  const [a, b] = ranking
  if (!a || a.nota < LIMIAR) return null
  if (b && a.nota - b.nota < MARGEM) return null
  return a
}

/** Foto pequena do produto para mostrar nos cartões (JPEG ~160 px, poucos KB). */
export function miniatura(fonte, lado = 160) {
  const c = document.createElement('canvas')
  c.width = lado
  c.height = lado
  const w = fonte.videoWidth || fonte.naturalWidth || fonte.width
  const h = fonte.videoHeight || fonte.naturalHeight || fonte.height
  const l = Math.min(w, h)
  c.getContext('2d').drawImage(fonte, (w - l) / 2, (h - l) / 2, l, l, 0, 0, lado, lado)
  return c.toDataURL('image/jpeg', 0.7)
}

/* ---------- Código de barras e QR ---------- */

let detector
let zxing
const FORMATOS = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'code_39']

/** Lê um código do quadro atual (ou devolve null). */
export async function lerCodigo(video) {
  if ('BarcodeDetector' in globalThis) {
    try {
      detector ??= new globalThis.BarcodeDetector({ formats: (await globalThis.BarcodeDetector.getSupportedFormats()).filter((f) => FORMATOS.includes(f)) })
      const [c] = await detector.detect(video)
      return c?.rawValue ?? null
    } catch {
      /* cai no ZXing */
    }
  }
  const Z = await loadZxing()
  if (!zxing) {
    const dicas = new Map()
    dicas.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.QR_CODE, Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.UPC_A])
    dicas.set(Z.DecodeHintType.TRY_HARDER, true)
    zxing = new Z.MultiFormatReader()
    zxing.setHints(dicas)
  }
  const c = document.createElement('canvas')
  c.width = video.videoWidth
  c.height = video.videoHeight
  c.getContext('2d').drawImage(video, 0, 0)
  try {
    const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)))
    return zxing.decode(bitmap).getText()
  } catch {
    return null
  }
}

/** Conteúdo do QR das etiquetas que o MEI na Mão imprime. */
export const qrDoProduto = (p) => `SXP:${p.id}`
export const produtoDoQr = (texto) => (String(texto).startsWith('SXP:') ? String(texto).slice(4) : null)
