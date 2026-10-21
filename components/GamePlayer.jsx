'use client'

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'

// O jogo 3D só é carregado quando a pessoa clica em Jogar: a página fica leve
// para o Google e não gasta dados móveis de quem só está lendo.
export default function GamePlayer({ name, playUrl }) {
  const [playing, setPlaying] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const wrapRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (playing) frameRef.current?.focus()
  }, [playing])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else {
        track('game_fullscreen')
        await wrapRef.current?.requestFullscreen()
      }
    } catch {
      // iPhone não tem tela cheia em elementos: abrimos o jogo em uma página própria.
      window.open(playUrl, '_blank', 'noopener')
    }
  }

  return (
    <div className="game-player">
      <div ref={wrapRef} className={fullscreen ? 'game-frame is-fullscreen' : 'game-frame'}>
        {playing ? (
          <iframe
            ref={frameRef}
            src={playUrl}
            title={`Jogo ${name}`}
            allow="fullscreen; autoplay; gamepad; camera"
            allowFullScreen
          />
        ) : (
          <button type="button" className="game-start" onClick={() => {
            track('game_start')
            setPlaying(true)
          }}>
            <span className="game-start-title">{name}</span>
            <span className="game-start-play" aria-hidden="true">▶</span>
            <span>Clique para jogar</span>
          </button>
        )}
      </div>
      <div className="actions game-actions">
        {playing && (
          <button type="button" className="btn btn-primary" onClick={toggleFullscreen}>
            {fullscreen ? 'Sair da tela cheia' : '⛶ Tela cheia'}
          </button>
        )}
        <a className="btn btn-ghost" href={playUrl} target="_blank" rel="noopener" onClick={() => track('game_new_tab')}>
          Abrir em nova aba
        </a>
        <span className="muted small">No celular, use na horizontal e em tela cheia.</span>
      </div>
    </div>
  )
}
