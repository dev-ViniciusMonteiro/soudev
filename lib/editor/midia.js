// Importação de arquivos: tipo, duração, tamanho, miniatura e forma de onda.
import { uid } from './modelo'

const esperar = (el, ev) => new Promise((ok, erro) => {
  el.addEventListener(ev, ok, { once: true })
  el.addEventListener('error', () => erro(new Error('Formato não suportado pelo navegador.')), { once: true })
})

export const tipoDoArquivo = (arq) => (arq.type.startsWith('video/') ? 'video' : arq.type.startsWith('audio/') ? 'audio' : arq.type.startsWith('image/') ? 'imagem' : /\.(mp4|webm|mov|mkv|m4v)$/i.test(arq.name) ? 'video' : /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(arq.name) ? 'audio' : /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(arq.name) ? 'imagem' : null)

async function miniaturaDe(el, w, h) {
  const esc = Math.min(1, 240 / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * esc))
  c.height = Math.max(1, Math.round(h * esc))
  c.getContext('2d').drawImage(el, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.7)
}

/** Picos da forma de onda (até 2000 valores entre 0 e 1). */
export async function formaDeOnda(blob) {
  try {
    const ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 2, 44100)
    const buf = await ac.decodeAudioData(await blob.arrayBuffer())
    const dados = buf.getChannelData(0)
    const n = Math.min(2000, Math.max(50, Math.round(buf.duration * 20)))
    const passo = Math.floor(dados.length / n) || 1
    const picos = []
    let max = 0
    for (let i = 0; i < n; i++) {
      let m = 0
      for (let k = i * passo; k < (i + 1) * passo && k < dados.length; k += 8) m = Math.max(m, Math.abs(dados[k]))
      picos.push(m)
      max = Math.max(max, m)
    }
    return picos.map((v) => Math.round((v / (max || 1)) * 100) / 100)
  } catch {
    return null
  }
}

export async function importarArquivo(arq, projeto) {
  const tipo = tipoDoArquivo(arq)
  if (!tipo) throw new Error(`"${arq.name}" não é vídeo, áudio nem imagem.`)
  const url = URL.createObjectURL(arq)
  const m = { id: uid(), projeto, nome: arq.name || `${tipo}-colado`, tipo, mime: arq.type, tamanho: arq.size, blob: arq, duracao: 0, largura: 0, altura: 0, miniatura: '', ondas: null, temAudio: false }
  try {
    if (tipo === 'imagem') {
      const img = new Image()
      img.src = url
      await esperar(img, 'load')
      m.largura = img.naturalWidth || 1080
      m.altura = img.naturalHeight || 1080
      m.duracao = 5
      m.miniatura = await miniaturaDe(img, m.largura, m.altura)
    } else {
      const el = document.createElement(tipo === 'video' ? 'video' : 'audio')
      el.preload = 'auto'
      el.muted = true
      el.src = url
      await esperar(el, 'loadedmetadata')
      m.duracao = Number.isFinite(el.duration) ? el.duration : 0
      if (!m.duracao) {
        // webm gravado sem duração: força o navegador a descobrir
        el.currentTime = 1e9
        await esperar(el, 'durationchange').catch(() => {})
        m.duracao = Number.isFinite(el.duration) ? el.duration : 10
      }
      if (tipo === 'video') {
        m.largura = el.videoWidth
        m.altura = el.videoHeight
        el.currentTime = Math.min(0.5, m.duracao / 2)
        await esperar(el, 'seeked')
        m.miniatura = await miniaturaDe(el, m.largura, m.altura)
      }
      m.ondas = await formaDeOnda(arq)
      m.temAudio = tipo === 'audio' || !!m.ondas
    }
  } finally {
    URL.revokeObjectURL(url)
  }
  m.duracao = Math.round(m.duracao * 1000) / 1000
  return m
}
