'use client'

// Visualizador: formas geométricas infinitas no estilo dos efeitos antigos de player de música.
// Truque clássico de "feedback": a cada quadro, o quadro anterior é redesenhado um pouco ampliado e girado,
// e as formas novas vão por cima, criando túneis e rastros sem fim. Reage à música (arquivo ou microfone).

import { useCallback, useEffect, useRef, useState } from 'react'

const TAU = Math.PI * 2

/* ---------------------------- cenas ---------------------------- */
// Cada cena: fb = como o quadro anterior é reaproveitado (zoom, giro, quanto apaga); desenhar = formas novas.
const CENAS = [
  {
    nome: 'Túnel de polígonos',
    fb: (t, a) => ({ zoom: 1.03 + a.grave * 0.03, giro: 0.01 + Math.sin(t * 0.3) * 0.008, apaga: 0.035 }),
    passo: -1,
    desenhar(c, w, h, t, a, cor) {
      const passo = Math.floor(t * 7)
      if (passo === this.passo) return
      this.passo = passo
      const lados = 3 + (Math.floor(t / 6) % 5)
      const r = Math.min(w, h) * (0.05 + a.grave * 0.06)
      c.lineWidth = 2.5 + a.medio * 3
      c.strokeStyle = cor(passo * 9)
      poligono(c, w / 2, h / 2, r, lados, passo * 0.12)
      c.stroke()
    },
  },
  {
    nome: 'Caleidoscópio',
    fb: (t, a) => ({ zoom: 1.012, giro: -0.006, apaga: 0.07 }),
    desenhar(c, w, h, t, a, cor) {
      const fatias = 12
      const R = Math.min(w, h) * 0.48
      c.save()
      c.translate(w / 2, h / 2)
      for (let i = 0; i < fatias; i++) {
        c.save()
        c.rotate((i / fatias) * TAU)
        if (i % 2) c.scale(1, -1)
        for (let k = 0; k < 3; k++) {
          const d = R * (0.25 + 0.7 * ((Math.sin(t * (0.5 + k * 0.23) + k) + 1) / 2))
          const ang = Math.sin(t * 0.7 + k * 2) * 0.25
          c.fillStyle = cor(t * 30 + k * 60 + i * 4, 0.85)
          c.beginPath()
          c.arc(Math.cos(ang) * d, Math.sin(ang) * d, 3 + k * 2 + a.agudo * 10, 0, TAU)
          c.fill()
        }
        c.restore()
      }
      c.restore()
    },
  },
  {
    nome: 'Espirógrafo',
    fb: (t, a) => ({ zoom: 1.0, giro: 0.004, apaga: 0.012 }),
    desenhar(c, w, h, t, a, cor) {
      // hipotrocoide: o ponto de um círculo girando dentro de outro
      const R = Math.min(w, h) * 0.3, rr = R * (0.38 + 0.08 * Math.sin(t * 0.05)), d = R * (0.55 + a.grave * 0.4)
      c.lineWidth = 2 + a.medio * 3
      for (let copia = 0; copia < 3; copia++) {
        const rot = (copia / 3) * TAU
        c.beginPath()
        for (let i = 0; i <= 30; i++) {
          const s = t * 2.2 + (i / 30) * 0.5
          const x0 = (R - rr) * Math.cos(s) + d * Math.cos(((R - rr) / rr) * s)
          const y0 = (R - rr) * Math.sin(s) - d * Math.sin(((R - rr) / rr) * s)
          const x = x0 * Math.cos(rot) - y0 * Math.sin(rot), y = x0 * Math.sin(rot) + y0 * Math.cos(rot)
          if (i) c.lineTo(w / 2 + x, h / 2 + y); else c.moveTo(w / 2 + x, h / 2 + y)
        }
        c.strokeStyle = cor(t * 25 + copia * 120, 0.9)
        c.stroke()
      }
    },
  },
  {
    nome: 'Hiperespaço',
    fb: (t, a) => ({ zoom: 1.05 + a.grave * 0.05, giro: 0.003, apaga: 0.045 }),
    desenhar(c, w, h, t, a, cor) {
      const n = 14 + Math.round(a.agudo * 20)
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * TAU, d = Math.min(w, h) * (0.02 + Math.random() * 0.12)
        const tam = 2 + Math.random() * 2.5
        c.fillStyle = cor(t * 20 + Math.random() * 90, 1)
        c.beginPath(); c.arc(w / 2 + Math.cos(ang) * d, h / 2 + Math.sin(ang) * d, tam, 0, TAU); c.fill()
      }
    },
  },
  {
    nome: 'Anel de onda',
    fb: (t, a) => ({ zoom: 1.025, giro: Math.sin(t * 0.4) * 0.02, apaga: 0.06 }),
    desenhar(c, w, h, t, a, cor) {
      const R = Math.min(w, h) * 0.16, onda = a.onda
      c.lineWidth = 2.5
      c.strokeStyle = cor(t * 35)
      c.beginPath()
      const N = 128
      for (let i = 0; i <= N; i++) {
        const ang = (i / N) * TAU
        const v = onda ? onda[Math.floor((i % N) * (onda.length / N))] : Math.sin(ang * 6 + t * 4) * 0.4 * (0.5 + a.medio)
        const r = R * (1 + v * 0.6)
        const x = w / 2 + Math.cos(ang) * r, y = h / 2 + Math.sin(ang) * r
        if (i) c.lineTo(x, y); else c.moveTo(x, y)
      }
      c.stroke()
    },
  },
  {
    nome: 'Mandala',
    fb: (t, a) => ({ zoom: 0.985, giro: 0.01, apaga: 0.045 }),
    desenhar(c, w, h, t, a, cor) {
      // zoom < 1: as formas encolhem para o centro, como um ralo infinito
      const R = Math.min(w, h) * 0.5
      c.lineWidth = 1.5 + a.grave * 3
      for (let k = 0; k < 2; k++) {
        c.strokeStyle = cor(t * 30 + k * 180)
        poligono(c, w / 2, h / 2, R * (0.92 + a.grave * 0.1), 6 + k * 2, -t * (0.4 + k * 0.3))
        c.stroke()
      }
    },
  },
]

function poligono(c, x, y, r, lados, rot) {
  c.beginPath()
  for (let i = 0; i <= lados; i++) {
    const ang = rot + (i / lados) * TAU
    if (i) c.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); else c.moveTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r)
  }
}

const PALETAS = [
  ['Arco-íris', (h) => h],
  ['Neon', (h) => 280 + Math.sin(h / 60) * 60],
  ['Fogo', (h) => 10 + Math.sin(h / 50) * 30],
  ['Oceano', (h) => 190 + Math.sin(h / 50) * 35],
]

/* ---------------------------- componente ---------------------------- */
export default function Visualizador() {
  const tela = useRef(null)
  const palco = useRef(null)
  const audio = useRef({ ctx: null, analisador: null, fonte: null, el: null, stream: null })
  const cfg = useRef({ cena: 0, paleta: 0, auto: true, trocaEm: 0, transicao: 0 })
  const [cena, setCena] = useState(0)
  const [paleta, setPaleta] = useState(0)
  const [auto, setAuto] = useState(true)
  const [fonte, setFonte] = useState('nenhuma') // nenhuma | arquivo | microfone
  const [musica, setMusica] = useState('')
  const [tocando, setTocando] = useState(false)
  const [erro, setErro] = useState('')
  const [ocioso, setOcioso] = useState(false)
  const arquivo = useRef(null)

  useEffect(() => { cfg.current.cena = cena; cfg.current.transicao = 1 }, [cena])
  useEffect(() => { cfg.current.paleta = paleta }, [paleta])
  useEffect(() => { cfg.current.auto = auto }, [auto])

  /* laço de desenho */
  useEffect(() => {
    const cv = tela.current
    const c = cv.getContext('2d')
    const buf = document.createElement('canvas')
    const b = buf.getContext('2d')
    let w = 0, h = 0, raf = 0, t0 = performance.now(), ultimo = t0
    const freq = new Uint8Array(1024), onda = new Float32Array(1024)
    const suave = { grave: 0, medio: 0, agudo: 0 }

    const medir = () => {
      const esc = Math.min(window.devicePixelRatio || 1, 1.5)
      w = Math.max(1, Math.floor(cv.clientWidth * esc)); h = Math.max(1, Math.floor(cv.clientHeight * esc))
      cv.width = buf.width = w; cv.height = buf.height = h
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h)
    }
    medir()
    const ro = new ResizeObserver(medir); ro.observe(cv)

    const quadro = (agora) => {
      raf = requestAnimationFrame(quadro)
      const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora
      const t = (agora - t0) / 1000
      const k = cfg.current

      // energia do som (ou um pulso de 120 bpm quando não há música)
      const an = audio.current.analisador
      let g, m, a, temOnda = false
      if (an) {
        an.getByteFrequencyData(freq); an.getFloatTimeDomainData(onda)
        const n = an.frequencyBinCount
        const faixa = (i0, i1) => { let s = 0; for (let i = i0; i < i1; i++) s += freq[i]; return s / ((i1 - i0) * 255) }
        g = faixa(1, Math.floor(n * 0.03)); m = faixa(Math.floor(n * 0.03), Math.floor(n * 0.2)); a = faixa(Math.floor(n * 0.2), Math.floor(n * 0.6))
        temOnda = g + m > 0.02
      } else {
        const batida = Math.pow(Math.max(0, Math.cos(t * Math.PI * 2)), 8)
        g = 0.25 + batida * 0.5; m = 0.3 + Math.sin(t * 1.3) * 0.15; a = 0.3 + Math.sin(t * 2.1) * 0.2
      }
      for (const [chave, v] of [['grave', g], ['medio', m], ['agudo', a]]) suave[chave] += (v - suave[chave]) * Math.min(1, dt * 12)
      const amb = { ...suave, onda: temOnda ? onda : null }

      // troca automática de cena a cada 20 s
      if (k.auto && t - k.trocaEm > 20) { k.trocaEm = t; setCena((x) => (x + 1) % CENAS.length) }
      const sc = CENAS[k.cena]
      const ajuste = PALETAS[k.paleta][1]
      const cor = (hue, alfa = 1) => `hsla(${ajuste(hue) % 360}, 95%, ${55 + suave.agudo * 15}%, ${alfa})`

      // feedback: copia o quadro e redesenha ampliado/girado em volta do centro
      const { zoom, giro, apaga } = sc.fb(t, suave)
      b.globalCompositeOperation = 'copy'; b.drawImage(cv, 0, 0)
      c.save()
      c.translate(w / 2, h / 2); c.rotate(giro); c.scale(zoom, zoom); c.translate(-w / 2, -h / 2)
      c.drawImage(buf, 0, 0)
      c.restore()
      c.fillStyle = `rgba(0,0,0,${Math.min(1, apaga + k.transicao * 0.25)})`
      c.fillRect(0, 0, w, h)
      k.transicao = Math.max(0, k.transicao - dt * 1.5)

      c.save()
      c.globalCompositeOperation = 'lighter'
      sc.desenhar(c, w, h, t, amb, cor)
      c.restore()
    }
    raf = requestAnimationFrame(quadro)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  /* áudio */
  const garantirCtx = () => {
    const A = audio.current
    if (!A.ctx) {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)()
      A.analisador = A.ctx.createAnalyser()
      A.analisador.fftSize = 2048
      A.analisador.smoothingTimeConstant = 0.75
    }
    if (A.ctx.state === 'suspended') A.ctx.resume()
    return A
  }
  const pararFonte = () => {
    const A = audio.current
    A.stream?.getTracks().forEach((tr) => tr.stop()); A.stream = null
    if (A.el) { A.el.pause() }
    try { A.fonte?.disconnect() } catch {}
    try { A.analisador?.disconnect() } catch {}
    A.fonte = null
  }
  async function usarMicrofone() {
    setErro('')
    try {
      const A = garantirCtx()
      pararFonte()
      A.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } })
      A.fonte = A.ctx.createMediaStreamSource(A.stream)
      A.fonte.connect(A.analisador) // não vai para as caixas: só escuta
      setFonte('microfone'); setMusica('Ouvindo pelo microfone'); setTocando(true)
    } catch { setErro('Não consegui acessar o microfone. Libere a permissão no navegador.') }
  }
  function abrirArquivo(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErro('')
    const A = garantirCtx()
    pararFonte()
    if (!A.el) {
      A.el = new Audio()
      A.el.loop = true
      A.elFonte = A.ctx.createMediaElementSource(A.el)
      A.el.onplay = () => setTocando(true)
      A.el.onpause = () => setTocando(false)
    }
    if (A.el.src) URL.revokeObjectURL(A.el.src)
    A.el.src = URL.createObjectURL(f)
    A.fonte = A.elFonte
    A.fonte.connect(A.analisador)
    A.analisador.connect(A.ctx.destination)
    A.el.play().catch(() => setErro('Toque em ▶ para começar.'))
    setFonte('arquivo'); setMusica(f.name.replace(/\.[^.]+$/, ''))
  }
  const alternarPlay = () => { const el = audio.current.el; if (!el) return; if (el.paused) el.play(); else el.pause() }
  const semSom = () => { pararFonte(); setFonte('nenhuma'); setMusica(''); setTocando(false) }
  useEffect(() => () => { pararFonte(); audio.current.ctx?.close?.() }, [])

  /* tela cheia, teclado e esconder controles parado */
  const telaCheia = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else palco.current?.requestFullscreen?.().catch(() => {})
  }, [])
  const proxima = useCallback((d = 1) => { cfg.current.trocaEm = performance.now() / 1000; setCena((x) => (x + d + CENAS.length) % CENAS.length) }, [])
  useEffect(() => {
    let timer
    const mexeu = () => { setOcioso(false); clearTimeout(timer); timer = setTimeout(() => setOcioso(true), 3500) }
    const tecla = (e) => {
      if (e.target.closest?.('input, select, textarea')) return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); proxima(1) }
      else if (e.key === 'ArrowLeft') proxima(-1)
      else if (e.key === 'f' || e.key === 'F') telaCheia()
      else if (e.key === 'c' || e.key === 'C') setPaleta((p) => (p + 1) % PALETAS.length)
      mexeu()
    }
    mexeu()
    window.addEventListener('pointermove', mexeu)
    window.addEventListener('keydown', tecla)
    return () => { clearTimeout(timer); window.removeEventListener('pointermove', mexeu); window.removeEventListener('keydown', tecla) }
  }, [proxima, telaCheia])

  return (
    <div ref={palco} className={`vz${ocioso ? ' ocioso' : ''}`} onDoubleClick={telaCheia}>
      <canvas ref={tela} className="vz-tela" aria-label={`Animação: ${CENAS[cena].nome}`} role="img" />

      <header className="vz-topo">
        <a href="/apps/visualizador" className="vz-voltar" aria-label="Voltar">←</a>
        <div>
          <strong>{CENAS[cena].nome}</strong>
          <span>{musica || 'Sem música: no ritmo de 120 batidas por minuto'}</span>
        </div>
      </header>

      <div className="vz-controles">
        <div className="vz-grupo">
          <button onClick={() => proxima(-1)} aria-label="Cena anterior">◀</button>
          <button onClick={() => proxima(1)} aria-label="Próxima cena">▶</button>
          <button className={auto ? 'ativo' : ''} onClick={() => setAuto(!auto)} title="Troca de cena sozinho a cada 20 segundos">Auto</button>
          <button onClick={() => setPaleta((p) => (p + 1) % PALETAS.length)} title="Trocar cores (C)">🎨 {PALETAS[paleta][0]}</button>
        </div>
        <div className="vz-grupo">
          <button onClick={() => arquivo.current?.click()}>🎵 Tocar uma música</button>
          {fonte === 'arquivo' && <button onClick={alternarPlay} aria-label={tocando ? 'Pausar' : 'Tocar'}>{tocando ? '❚❚' : '▶'}</button>}
          <button className={fonte === 'microfone' ? 'ativo' : ''} onClick={fonte === 'microfone' ? semSom : usarMicrofone}>🎤 {fonte === 'microfone' ? 'Parar microfone' : 'Ouvir pelo microfone'}</button>
          <button onClick={telaCheia} title="Tela cheia (F ou dois cliques)">⛶ Tela cheia</button>
        </div>
        {erro && <p className="vz-erro">{erro}</p>}
        <input ref={arquivo} type="file" accept="audio/*" hidden onChange={abrirArquivo} />
      </div>
      <nav className="vz-pontos" aria-label="Cenas">
        {CENAS.map((s, i) => <button key={s.nome} className={i === cena ? 'ativo' : ''} onClick={() => { cfg.current.trocaEm = performance.now() / 1000; setCena(i) }} aria-label={s.nome} title={s.nome} />)}
      </nav>
    </div>
  )
}
