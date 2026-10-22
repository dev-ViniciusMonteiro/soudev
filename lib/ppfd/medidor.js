// Leitura de luz no navegador, por dois caminhos:
//  1. Sensor de luz ambiente do aparelho (AmbientLightSensor): já vem em lux. Só alguns navegadores liberam.
//  2. Câmera com a exposição travada (Chrome no Android, via ImageCapture/applyConstraints): o brilho médio da imagem,
//     linearizado (sem a curva gama) e dividido pelo tempo de exposição × ISO, é proporcional à luz que chega.
//     Esse número vira lux com uma calibração por aparelho (uma leitura de referência).

/* ---------- Sensor de luz ---------- */

export const temSensorDeLuz = () => typeof window !== 'undefined' && 'AmbientLightSensor' in window

export function abrirSensor(aoLer, aoErro) {
  try {
    // eslint-disable-next-line no-undef
    const s = new AmbientLightSensor({ frequency: 4 })
    s.addEventListener('reading', () => aoLer(s.illuminance))
    s.addEventListener('error', (e) => aoErro(e.error?.name === 'NotAllowedError' ? 'O navegador bloqueou o sensor de luz.' : 'O sensor de luz não respondeu.'))
    s.start()
    return () => s.stop()
  } catch {
    aoErro('Este aparelho não liberou o sensor de luz para o navegador.')
    return () => {}
  }
}

/* ---------- Câmera ---------- */

const linear = (v) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const TABELA = Array.from({ length: 256 }, (_, i) => linear(i))

export class MedidorCamera {
  constructor() {
    this.video = document.createElement('video')
    this.video.playsInline = true
    this.video.muted = true
    this.canvas = document.createElement('canvas')
    this.canvas.width = 96
    this.canvas.height = 96
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    this.track = null
    this.manual = false
    this.exposicao = null // unidades do navegador (100 µs)
    this.iso = null
    this.caps = {}
    this.ultimoAjuste = 0
    this.instavelAte = 0 // logo depois de mudar a exposição, alguns quadros ainda vêm com a antiga
  }

  async abrir(frontal = true) {
    this.fechar()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: frontal ? 'user' : 'environment', width: { ideal: 640 }, height: { ideal: 480 } } })
    this.stream = stream
    this.track = stream.getVideoTracks()[0]
    this.video.srcObject = stream
    await this.video.play()
    this.caps = this.track.getCapabilities?.() ?? {}
    this.manual = await this.travar()
    return this.manual
  }

  /** Desliga a exposição automática (senão a câmera "corrige" a luz e a medida não serve). */
  async travar() {
    const c = this.caps
    if (!c.exposureMode?.includes('manual') || !c.exposureTime) return false
    try {
      await this.track.applyConstraints({ advanced: [{ exposureMode: 'manual' }] })
      // Começa com exposição curta e ISO mínimo: luz de cultivo é forte.
      this.iso = c.iso ? c.iso.min : null
      this.exposicao = Math.max(c.exposureTime.min, Math.min(c.exposureTime.max, 10))
      const ajuste = { exposureTime: this.exposicao }
      if (this.iso) ajuste.iso = this.iso
      if (c.whiteBalanceMode?.includes('manual')) ajuste.whiteBalanceMode = 'manual'
      await this.track.applyConstraints({ advanced: [ajuste] })
      const s = this.track.getSettings()
      this.exposicao = s.exposureTime ?? this.exposicao
      this.iso = s.iso ?? this.iso
      return s.exposureMode === 'manual' || s.exposureMode === undefined
    } catch {
      return false
    }
  }

  /** Lê o quadro atual: média linear do centro e quanto da imagem está estourado. */
  ler(agora) {
    if (this.video.readyState < 2) return null
    const { ctx, canvas, video } = this
    // Só o centro da imagem (o difusor de papel fica bem na frente da lente).
    const lado = Math.min(video.videoWidth, video.videoHeight) * 0.6
    ctx.drawImage(video, (video.videoWidth - lado) / 2, (video.videoHeight - lado) / 2, lado, lado, 0, 0, canvas.width, canvas.height)
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let soma = 0
    let estourados = 0
    for (let i = 0; i < d.length; i += 4) {
      // Luminância (pesos do olho humano, como o lux) sobre valores lineares.
      soma += 0.2126 * TABELA[d[i]] + 0.7152 * TABELA[d[i + 1]] + 0.0722 * TABELA[d[i + 2]]
      if (d[i] > 250 || d[i + 1] > 250 || d[i + 2] > 250) estourados++
    }
    const n = d.length / 4
    const media = soma / n
    const estouro = estourados / n
    if (this.manual) void this.ajustar(media, estouro, agora)
    if (!this.manual) return { media, estouro, relativo: media, manual: false }
    if (agora < this.instavelAte) return { media, estouro, relativo: null, manual: true }
    // Brilho por unidade de exposição: independe do tempo de exposição e do ISO escolhidos.
    const ganho = (this.exposicao || 1) * ((this.iso || 100) / 100)
    return { media, estouro, relativo: media / ganho, manual: true }
  }

  /** Mantém a imagem no meio da escala (nem escura, nem estourada) mexendo no tempo de exposição. */
  async ajustar(media, estouro, agora) {
    if (agora - this.ultimoAjuste < 600) return
    const alvo = 0.18
    if (estouro < 0.02 && media > 0.06 && media < 0.4) return
    const c = this.caps.exposureTime
    const fator = estouro > 0.05 ? 0.4 : Math.max(0.25, Math.min(4, alvo / Math.max(media, 0.002)))
    const nova = Math.max(c.min, Math.min(c.max, this.exposicao * fator))
    if (Math.abs(nova - this.exposicao) / this.exposicao < 0.05) return
    this.ultimoAjuste = agora
    this.instavelAte = agora + 450
    try {
      await this.track.applyConstraints({ advanced: [{ exposureTime: nova }] })
      this.exposicao = this.track.getSettings().exposureTime ?? nova
    } catch {
      /* mantém a exposição atual */
    }
  }

  get limiteDeLuz() {
    const c = this.caps.exposureTime
    return Boolean(c && this.exposicao && this.exposicao <= c.min * 1.01)
  }

  fechar() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.track = null
  }
}
