// Utilitários que só rodam no navegador.

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`
}

export const baseName = (filename) => filename.replace(/\.[^.]+$/, '')

// Import em tempo de execução, fora do bundler: bibliotecas pesadas vêm do CDN só quando usadas.
const importUrl = (url) => new Function('url', 'return import(url)')(url)

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build'
let pdfjsPromise
export function loadPdfjs() {
  pdfjsPromise ??= importUrl(`${PDFJS}/pdf.min.mjs`)
    .then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`
      return lib
    })
    .catch((error) => {
      pdfjsPromise = undefined
      throw error
    })
  return pdfjsPromise
}

let backgroundPromise
export function loadBackgroundRemoval() {
  backgroundPromise ??= importUrl('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm').catch((error) => {
    backgroundPromise = undefined
    throw error
  })
  return backgroundPromise
}

export async function openPdf(file) {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  return pdfjs.getDocument({ data }).promise
}

export async function renderPdfPage(pdf, pageNumber, scale) {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: context, viewport }).promise
  const original = page.getViewport({ scale: 1 })
  return { canvas, width: original.width, height: original.height }
}

export const canvasToBlob = (canvas, type = 'image/jpeg', quality = 0.9) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem.'))), type, quality),
  )

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ image, url })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Não foi possível ler ${file.name}.`))
    }
    image.src = url
  })
}
