'use client'

import { useEffect, useRef, useState } from 'react'
import { Notice, Stats } from '../ui'
import { track } from '@/lib/analytics'
import { loadPoseLandmarker } from '@/lib/client'
import { EXERCICIOS, GRUPOS, OSSOS, criarTreino, getExercicio } from '@/lib/treino'

const CORES = { ok: '#4ade80', erro: '#f87171', neutro: 'rgba(226, 232, 240, 0.75)' }

function falar(texto) {
  if (typeof speechSynthesis === 'undefined' || !texto) return
  speechSynthesis.cancel()
  const fala = new SpeechSynthesisUtterance(texto)
  fala.lang = 'pt-BR'
  fala.rate = 1.05
  const voz = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('pt'))
  if (voz) fala.voice = voz
  speechSynthesis.speak(fala)
}

function mensagemDeErro(error) {
  if (error?.name === 'NotAllowedError') return 'Permissão da câmera negada. Libere a câmera nas configurações do navegador (no cadeado ao lado do endereço) e tente de novo.'
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'Nenhuma câmera encontrada neste aparelho.'
  if (error?.name === 'NotReadableError') return 'A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.'
  return 'Não foi possível carregar o detector de movimento. Verifique a internet e tente de novo.'
}

export default function CorrecaoTreino() {
  const [exercicioId, setExercicioId] = useState('agachamento')
  const [etapa, setEtapa] = useState('escolher') // escolher | carregando | treinando | resumo
  const [erro, setErro] = useState('')
  const [voz, setVoz] = useState(true)
  const [frontal, setFrontal] = useState(true)
  const [hud, setHud] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [telaCheia, setTelaCheia] = useState(false)

  const palcoRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const loop = useRef({})
  const vozRef = useRef(voz)
  vozRef.current = voz

  const exercicio = getExercicio(exercicioId)

  const pararCamera = () => {
    const l = loop.current
    cancelAnimationFrame(l.raf)
    l.raf = null
    l.stream?.getTracks().forEach((t) => t.stop())
    l.stream = null
    l.wakeLock?.release?.().catch(() => {})
    l.wakeLock = null
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }

  useEffect(() => {
    const onFullscreen = () => setTelaCheia(document.fullscreenElement === palcoRef.current)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen)
      pararCamera()
    }
  }, [])

  const abrirCamera = async (usarFrontal) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: usarFrontal ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    loop.current.stream?.getTracks().forEach((t) => t.stop())
    loop.current.stream = stream
    const video = videoRef.current
    video.srcObject = stream
    await video.play()
  }

  const iniciar = async () => {
    setErro('')
    setResumo(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro('Este navegador não permite usar a câmera. Use o Chrome, Edge, Safari ou Firefox atualizados.')
      return
    }
    falar(' ') // libera a voz no iPhone (precisa partir de um toque)
    setEtapa('carregando')
    requestAnimationFrame(() => palcoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    try {
      // Computador usa o modelo mais preciso; celular, o mais leve.
      const modelo = matchMedia('(pointer: coarse)').matches ? 'lite' : 'full'
      const [detector] = await Promise.all([loadPoseLandmarker(modelo), abrirCamera(frontal)])
      const l = loop.current
      l.detector = detector
      l.treino = criarTreino(exercicioId)
      l.ultimoVideo = -1
      l.ultimoHud = 0
      l.falas = { ultima: 0, porCodigo: {}, aviso: 0, prontoFalado: false, marcoSegundos: 0 }
      l.wakeLock = await navigator.wakeLock?.request('screen').catch(() => null)
      setEtapa('treinando')
      l.raf = requestAnimationFrame(quadro)
      track('workout_start', { exercise: exercicioId })
    } catch (error) {
      console.error(error)
      pararCamera()
      setErro(mensagemDeErro(error))
      setEtapa('escolher')
    }
  }

  const quadro = () => {
    const l = loop.current
    const video = videoRef.current
    if (!l.stream || !video) return
    l.raf = requestAnimationFrame(quadro)
    if (video.readyState < 2 || video.currentTime === l.ultimoVideo) return
    l.ultimoVideo = video.currentTime
    const agora = performance.now()
    let resultado
    try {
      resultado = l.detector.detectForVideo(video, agora)
    } catch {
      return
    }
    const estado = l.treino.processar(resultado, agora, { largura: video.videoWidth, altura: video.videoHeight })
    desenhar(estado, video)
    narrar(estado, agora)
    if (agora - l.ultimoHud > 100 || estado.eventos.length) {
      l.ultimoHud = agora
      setHud(estado)
    }
  }

  const desenhar = (estado, video) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const pts = estado.pontos
    if (!pts) return
    const w = canvas.width
    const h = canvas.height
    const espessura = Math.max(3, w / 220)
    const cor = (i) => (!estado.pronto ? CORES.neutro : estado.destacar.has(i) ? CORES.erro : CORES.ok)
    ctx.lineCap = 'round'
    for (const [a, b] of OSSOS) {
      if (pts[a].visibility < 0.5 || pts[b].visibility < 0.5) continue
      ctx.strokeStyle = estado.pronto && (estado.destacar.has(a) || estado.destacar.has(b)) ? CORES.erro : cor(a)
      ctx.lineWidth = espessura
      ctx.beginPath()
      ctx.moveTo(pts[a].x * w, pts[a].y * h)
      ctx.lineTo(pts[b].x * w, pts[b].y * h)
      ctx.stroke()
    }
    for (let i = 11; i < 33; i++) {
      if (pts[i].visibility < 0.5) continue
      ctx.fillStyle = cor(i)
      ctx.beginPath()
      ctx.arc(pts[i].x * w, pts[i].y * h, espessura * (estado.destacar.has(i) ? 2.2 : 1.4), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Voz: conta as repetições e fala a correção mais importante, sem repetir demais.
  const narrar = (estado, agora) => {
    if (!vozRef.current) return
    const f = loop.current.falas
    const pode = (espera) => agora - f.ultima > espera
    const dizer = (texto) => {
      falar(texto)
      f.ultima = agora
    }
    for (const evento of estado.eventos) {
      if (evento.tipo !== 'rep') continue
      const correcao = estado.ultimaRep?.vozes?.[0]
      dizer(evento.boa ? String(evento.numero) : `${evento.numero}. ${correcao}`)
      return
    }
    if (!estado.pronto) {
      if (estado.aviso && agora - f.aviso > 9000 && pode(2500)) {
        f.aviso = agora
        dizer(estado.aviso)
      }
      return
    }
    if (!f.prontoFalado) {
      f.prontoFalado = true
      dizer('Pronto, estou te vendo. Pode começar.')
      return
    }
    const ativo = estado.ativos[0]
    if (ativo && pode(2500) && agora - (f.porCodigo[ativo.codigo] || 0) > 6000) {
      f.porCodigo[ativo.codigo] = agora
      dizer(ativo.voz)
      return
    }
    if (exercicio.isometria && estado.segundosBons >= f.marcoSegundos + 10) {
      f.marcoSegundos = Math.floor(estado.segundosBons / 10) * 10
      if (pode(1500)) dizer(`${f.marcoSegundos} segundos`)
    }
  }

  const trocarCamera = async () => {
    const novo = !frontal
    setFrontal(novo)
    try {
      await abrirCamera(novo)
    } catch (error) {
      setErro(mensagemDeErro(error))
    }
  }

  const encerrar = () => {
    const r = loop.current.treino?.resumo()
    pararCamera()
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    setHud(null)
    setResumo(r)
    setEtapa('resumo')
    if (r) track('workout_end', { exercise: exercicioId, reps: r.reps, good_reps: r.repsBoas, seconds: r.duracao, top_error: r.erros[0]?.codigo || 'nenhum' })
  }

  const alternarTelaCheia = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await palcoRef.current?.requestFullscreen()
    } catch {
      // iPhone não tem tela cheia em elementos: a área do vídeo já ocupa a tela.
    }
  }

  const feedback = (() => {
    if (!hud) return { tipo: 'info', texto: 'Iniciando a câmera…' }
    if (hud.aviso) return { tipo: 'warn', texto: hud.aviso }
    if (hud.ativos.length) return { tipo: 'danger', texto: hud.ativos[0].texto }
    const rep = hud.ultimaRep
    if (rep && performance.now() - rep.ts < 2800) return rep.boa ? { tipo: 'ok', texto: `Repetição ${rep.numero} correta. Boa!` } : { tipo: 'danger', texto: rep.textos[0] }
    if (exercicio.isometria) return { tipo: 'ok', texto: 'Postura correta. Segure!' }
    return { tipo: 'info', texto: hud.reps ? 'Continue no mesmo ritmo.' : exercicio.dicaInicial }
  })()

  const treinando = etapa === 'treinando' || etapa === 'carregando'

  return (
    <div className="tool-stack">
      {!treinando && (
        <>
          <div className="treino-grupos" role="radiogroup" aria-label="Exercício">
            {GRUPOS.map(([grupo, titulo]) => (
              <div key={grupo} className="treino-grupo">
                <span className="treino-grupo-titulo">{titulo}</span>
                <div className="treino-opcoes">
                  {EXERCICIOS.filter((e) => e.grupo === grupo).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      role="radio"
                      aria-checked={exercicioId === e.id}
                      className={exercicioId === e.id ? 'treino-opcao active' : 'treino-opcao'}
                      onClick={() => setExercicioId(e.id)}
                    >
                      {e.nome}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="treino-instrucao">
            <strong>Como posicionar a câmera</strong>
            <p>{exercicio.posicao}</p>
            <p className="muted small">{exercicio.dicaInicial}</p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={iniciar}>
              {etapa === 'resumo' ? 'Treinar de novo' : 'Ligar a câmera e começar'}
            </button>
            <label className="check">
              <input type="checkbox" checked={voz} onChange={(e) => setVoz(e.target.checked)} /> Correções por voz
            </label>
            <label className="check">
              <input type="checkbox" checked={!frontal} onChange={(e) => setFrontal(!e.target.checked)} /> Usar câmera traseira
            </label>
          </div>
        </>
      )}

      <Notice kind="error">{erro}</Notice>

      <div ref={palcoRef} className={`treino-palco${treinando ? '' : ' oculto'}${frontal ? ' espelhar' : ''}${telaCheia ? ' cheia' : ''}`}>
        <video ref={videoRef} playsInline muted aria-label="Imagem da câmera" />
        <canvas ref={canvasRef} aria-hidden="true" />
        {etapa === 'carregando' && (
          <div className="treino-carregando">
            <span className="spinner" aria-hidden="true" /> Carregando o detector de movimento…
          </div>
        )}
        {etapa === 'treinando' && hud && (
          <>
            <div className="treino-placar" aria-live="polite">
              {exercicio.isometria ? (
                <>
                  <strong>{Math.floor(hud.segundosBons)}s</strong>
                  <span>de {Math.floor(hud.segundos)}s com postura certa</span>
                </>
              ) : (
                <>
                  <strong>{hud.reps}</strong>
                  <span>{hud.reps === 1 ? 'repetição' : 'repetições'} · {hud.repsBoas} certa{hud.repsBoas === 1 ? '' : 's'}</span>
                </>
              )}
            </div>
            {!exercicio.isometria && hud.pronto && (
              <div className="treino-barra" aria-hidden="true">
                <span style={{ height: `${Math.round(hud.progresso * 100)}%` }} />
              </div>
            )}
            <div className={`treino-feedback ${feedback.tipo}`} role="status">{feedback.texto}</div>
          </>
        )}
      </div>

      {treinando && (
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={encerrar} disabled={etapa !== 'treinando'}>Terminar e ver resultado</button>
          <button type="button" className="btn btn-ghost" onClick={alternarTelaCheia}>{telaCheia ? 'Sair da tela cheia' : '⛶ Tela cheia'}</button>
          <button type="button" className="btn btn-ghost" onClick={trocarCamera} disabled={etapa !== 'treinando'}>Trocar câmera</button>
          <label className="check">
            <input type="checkbox" checked={voz} onChange={(e) => setVoz(e.target.checked)} /> Voz
          </label>
        </div>
      )}

      {etapa === 'resumo' && resumo && <Resumo resumo={resumo} />}
    </div>
  )
}

function Resumo({ resumo }) {
  const minutos = `${Math.floor(resumo.duracao / 60)}min ${resumo.duracao % 60}s`
  const itens = resumo.isometria
    ? [['Tempo total', `${resumo.segundos}s`], ['Com postura certa', `${resumo.segundosBons}s`, true], ['Duração do treino', minutos]]
    : [['Repetições', String(resumo.reps)], ['Corretas', `${resumo.repsBoas}${resumo.reps ? ` (${Math.round((resumo.repsBoas / resumo.reps) * 100)}%)` : ''}`, true], ['Duração', minutos]]
  return (
    <section className="tool-stack" aria-label="Resultado do treino">
      <h2 className="tool-subtitle">Resultado: {resumo.exercicio}</h2>
      <Stats items={itens} />
      {resumo.erros.length ? (
        <>
          <h3 className="tool-subtitle">O que melhorar</h3>
          <ul className="signal-list">
            {resumo.erros.map((e) => (
              <li key={e.codigo} className="warn">
                {e.texto} <span className="muted">({resumo.isometria ? `${e.vezes}s` : `${e.vezes}x`})</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        resumo.reps + resumo.segundos > 0 && <Notice kind="ok">Nenhum erro de postura encontrado. Excelente execução!</Notice>
      )}
      {resumo.reps + resumo.segundos === 0 && (
        <Notice kind="warn">Nenhuma repetição foi contada. Confira se o corpo inteiro aparece na câmera e se você está na posição indicada.</Notice>
      )}
    </section>
  )
}
