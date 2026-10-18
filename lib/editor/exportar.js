// Exportação: MP4 (H.264 + AAC) quadro a quadro com WebCodecs; sem WebCodecs, WebM em tempo real com MediaRecorder.
import { loadMp4Muxer } from '../client'
import { duracaoProjeto, esticarSemTom, valorEm } from './modelo'
import { desenharQuadro } from './render'

const TAXA = 48000
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export const suportaMp4 = () => typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined'

/* ---------- Áudio ---------- */

const buffers = new Map()
async function bufferDe(midia) {
  if (buffers.has(midia.id)) return buffers.get(midia.id)
  const p = (async () => {
    const ac = new OfflineAudioContext(2, 2, TAXA)
    try {
      return await ac.decodeAudioData(await midia.blob.arrayBuffer())
    } catch {
      return null
    }
  })()
  buffers.set(midia.id, p)
  return p
}

/** Mistura todas as trilhas de áudio (e o som dos vídeos) num AudioBuffer estéreo. */
export async function mixarAudio(p, midias, ate = duracaoProjeto(p)) {
  const total = Math.max(1, Math.ceil(ate * TAXA))
  const ctx = new OfflineAudioContext(2, total, TAXA)
  for (const tr of p.trilhas) {
    if (tr.mudo) continue
    for (const c of tr.itens) {
      if (c.tipo !== 'audio' && c.tipo !== 'video') continue
      if (c.mudo || (c.vol ?? 1) <= 0) continue
      const m = midias.get(c.midia)
      if (!m || (c.tipo === 'video' && m.temAudio === false)) continue
      const buf = await bufferDe(m)
      if (!buf) continue
      const vel = c.vel || 1
      const ini = Math.floor(c.corte * buf.sampleRate)
      const fimFonte = Math.min(buf.length, Math.floor((c.corte + c.dur * vel) * buf.sampleRate))
      if (fimFonte <= ini) continue
      let fonteBuf
      let rate = 1
      if (vel !== 1 && c.tom) {
        const canais = Array.from({ length: buf.numberOfChannels }, (_, k) => esticarSemTom(buf.getChannelData(k).subarray(ini, fimFonte), vel))
        fonteBuf = ctx.createBuffer(buf.numberOfChannels, canais[0].length, buf.sampleRate)
        canais.forEach((d, k) => fonteBuf.copyToChannel(d, k))
      } else {
        fonteBuf = ctx.createBuffer(buf.numberOfChannels, fimFonte - ini, buf.sampleRate)
        for (let k = 0; k < buf.numberOfChannels; k++) fonteBuf.copyToChannel(buf.getChannelData(k).subarray(ini, fimFonte), k)
        rate = vel
      }
      const src = ctx.createBufferSource()
      src.buffer = fonteBuf
      src.playbackRate.value = rate
      const ganho = ctx.createGain()
      const temKf = c.kf?.vol?.length
      if (temKf) {
        for (let t = 0; t <= c.dur; t += 1 / 30) ganho.gain.setValueAtTime(Math.max(0, valorEm(c, 'vol', t) / 100), c.inicio + t)
      } else ganho.gain.value = c.vol ?? 1
      src.connect(ganho).connect(ctx.destination)
      src.start(c.inicio)
      src.stop(c.inicio + c.dur)
    }
  }
  return ctx.startRendering()
}

/* ---------- Fontes de imagem para cada clipe ---------- */

async function prepararFontes(p, midias) {
  const urls = []
  const fontes = new Map()
  for (const tr of p.trilhas)
    for (const c of tr.itens) {
      const m = midias.get(c.midia)
      if (!m) continue
      if (c.tipo === 'imagem') {
        if (!fontes.has(`img:${m.id}`)) fontes.set(`img:${m.id}`, await createImageBitmap(m.blob))
        fontes.set(c.id, fontes.get(`img:${m.id}`))
      } else if (c.tipo === 'video') {
        const v = document.createElement('video')
        v.muted = true
        v.preload = 'auto'
        v.playsInline = true
        const u = URL.createObjectURL(m.blob)
        urls.push(u)
        v.src = u
        await new Promise((ok) => {
          v.onloadeddata = ok
          v.onerror = ok
        })
        fontes.set(c.id, v)
      }
    }
  return { fontes, liberar: () => urls.forEach((u) => URL.revokeObjectURL(u)) }
}

async function posicionarVideos(p, t, fontes) {
  const esperas = []
  for (const tr of p.trilhas)
    for (const c of tr.itens) {
      if (c.tipo !== 'video' || t < c.inicio || t >= c.inicio + c.dur) continue
      const v = fontes.get(c.id)
      if (!v) continue
      const alvo = Math.min(Math.max(0, c.corte + (t - c.inicio) * (c.vel || 1)), Math.max(0, v.duration - 0.001))
      if (Math.abs(v.currentTime - alvo) < 0.0005 && v.readyState >= 2) continue
      esperas.push(
        new Promise((ok) => {
          const fim = () => {
            v.removeEventListener('seeked', fim)
            ok()
          }
          v.addEventListener('seeked', fim)
          v.currentTime = alvo
          setTimeout(fim, 3000)
        }),
      )
    }
  await Promise.all(esperas)
}

const carregarFontesDeTexto = async (p) => {
  const familias = new Set()
  for (const tr of p.trilhas) for (const c of tr.itens) if (c.tipo === 'texto') familias.add(`${c.texto.italico ? 'italic ' : ''}${c.texto.peso || 400} 40px "${c.texto.fonte}"`)
  await Promise.all([...familias].map((f) => document.fonts.load(f).catch(() => {})))
}

/* ---------- MP4 ---------- */

function codecAvc(w, h) {
  const px = w * h
  return px > 2228224 ? 'avc1.640033' : px > 921600 ? 'avc1.640028' : 'avc1.64001f'
}

/**
 * Exporta o projeto. opcoes: { largura, altura, fps, bitrate, aoProgresso(0..1, texto), sinal: AbortSignal }
 */
export async function exportarMp4(p, midias, { largura = p.largura, altura = p.altura, fps = p.fps || 30, bitrate = 8e6, aoProgresso = () => {}, sinal } = {}) {
  const W = Math.round(largura / 2) * 2
  const H = Math.round(altura / 2) * 2
  const dur = duracaoProjeto(p)
  if (dur <= 0) throw new Error('A linha do tempo está vazia.')
  const codec = codecAvc(W, H)
  const sup = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate, framerate: fps })
  if (!sup.supported) throw new Error(`Este navegador não codifica H.264 em ${W}×${H}. Tente uma resolução menor.`)

  aoProgresso(0, 'Misturando o áudio…')
  const audio = await mixarAudio(p, midias, dur)
  const temAudio = typeof AudioEncoder !== 'undefined' && (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: TAXA, numberOfChannels: 2, bitrate: 160000 }).catch(() => ({ supported: false }))).supported

  const { Muxer, ArrayBufferTarget } = await loadMp4Muxer()
  const alvo = new ArrayBufferTarget()
  const muxer = new Muxer({
    target: alvo,
    video: { codec: 'avc', width: W, height: H, frameRate: fps },
    ...(temAudio ? { audio: { codec: 'aac', sampleRate: TAXA, numberOfChannels: 2 } } : {}),
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  })
  let erro = null
  const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (erro = e) })
  venc.configure({ codec, width: W, height: H, bitrate, framerate: fps, latencyMode: 'quality' })

  if (temAudio) {
    aoProgresso(0.02, 'Codificando o áudio…')
    const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => (erro = e) })
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: TAXA, numberOfChannels: 2, bitrate: 160000 })
    const L = audio.getChannelData(0)
    const R = audio.getChannelData(1)
    const BLOCO = 4800
    for (let i = 0; i < audio.length; i += BLOCO) {
      const n = Math.min(BLOCO, audio.length - i)
      const dados = new Float32Array(n * 2)
      dados.set(L.subarray(i, i + n), 0)
      dados.set(R.subarray(i, i + n), n)
      const ad = new AudioData({ format: 'f32-planar', sampleRate: TAXA, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / TAXA) * 1e6), data: dados })
      aenc.encode(ad)
      ad.close()
    }
    await aenc.flush()
  }

  await carregarFontesDeTexto(p)
  const { fontes, liberar } = await prepararFontes(p, midias)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { alpha: false })
  const total = Math.ceil(dur * fps)
  try {
    for (let i = 0; i < total; i++) {
      if (sinal?.aborted) throw new DOMException('Exportação cancelada.', 'AbortError')
      if (erro) throw erro
      const t = i / fps
      await posicionarVideos(p, t, fontes)
      desenharQuadro(ctx, p, t, (c) => fontes.get(c.id), { escala: W / p.largura, escalaY: H / p.altura })
      const quadro = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) })
      venc.encode(quadro, { keyFrame: i % (fps * 2) === 0 })
      quadro.close()
      while (venc.encodeQueueSize > 8) await dormir(4)
      if (i % 5 === 0) aoProgresso(0.05 + (i / total) * 0.93, `Quadro ${i + 1} de ${total}`)
    }
    await venc.flush()
    muxer.finalize()
  } finally {
    liberar()
    venc.state !== 'closed' && venc.close()
  }
  aoProgresso(1, 'Pronto!')
  return new Blob([alvo.buffer], { type: 'video/mp4' })
}

/* ---------- WebM em tempo real (navegadores sem WebCodecs) ---------- */

export async function exportarTempoReal(p, midias, { aoProgresso = () => {}, sinal } = {}) {
  const dur = duracaoProjeto(p)
  if (dur <= 0) throw new Error('A linha do tempo está vazia.')
  aoProgresso(0, 'Misturando o áudio…')
  const audio = await mixarAudio(p, midias, dur)
  await carregarFontesDeTexto(p)
  const { fontes, liberar } = await prepararFontes(p, midias)
  const canvas = document.createElement('canvas')
  canvas.width = p.largura
  canvas.height = p.altura
  const ctx = canvas.getContext('2d')
  const ac = new AudioContext({ sampleRate: TAXA })
  const destino = ac.createMediaStreamDestination()
  const src = ac.createBufferSource()
  src.buffer = audio
  src.connect(destino)
  const stream = new MediaStream([...canvas.captureStream(p.fps || 30).getVideoTracks(), ...destino.stream.getAudioTracks()])
  const mime = ['video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || ''
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 })
  const partes = []
  rec.ondataavailable = (e) => e.data.size && partes.push(e.data)
  const parado = new Promise((ok) => (rec.onstop = ok))
  rec.start(500)
  const inicio = ac.currentTime + 0.1
  src.start(inicio)
  try {
    for (;;) {
      if (sinal?.aborted) throw new DOMException('Exportação cancelada.', 'AbortError')
      const t = ac.currentTime - inicio
      if (t >= dur) break
      if (t >= 0) {
        await posicionarVideos(p, t, fontes)
        desenharQuadro(ctx, p, t, (c) => fontes.get(c.id))
        aoProgresso(t / dur, `Gravando em tempo real: ${Math.round((t / dur) * 100)}%`)
      }
      await new Promise((r) => requestAnimationFrame(r))
    }
  } finally {
    rec.state !== 'inactive' && rec.stop()
    await parado
    src.stop()
    ac.close()
    liberar()
  }
  return new Blob(partes, { type: mime.split(';')[0] || 'video/webm' })
}
