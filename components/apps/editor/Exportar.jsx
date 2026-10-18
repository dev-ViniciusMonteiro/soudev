'use client'

import { useEffect, useRef, useState } from 'react'
import { downloadBlob, formatBytes } from '@/lib/client'
import { duracaoProjeto, fmtTempo } from '@/lib/editor/modelo'
import { exportarMp4, exportarTempoReal, suportaMp4 } from '@/lib/editor/exportar'

const QUALIDADES = [
  ['baixa', 'Menor arquivo', 0.06],
  ['media', 'Equilibrada', 0.1],
  ['alta', 'Alta', 0.16],
  ['maxima', 'Máxima', 0.26],
]

export default function Exportar({ projeto, midias, onFechar }) {
  const lado = Math.min(projeto.largura, projeto.altura)
  const opcoesRes = [
    ['1', `Original (${projeto.largura}×${projeto.altura})`],
    ...[2160, 1440, 1080, 720, 480].filter((r) => r < lado).map((r) => [String(r / lado), `${r}p (${Math.round((projeto.largura * r) / lado / 2) * 2}×${Math.round((projeto.altura * r) / lado / 2) * 2})`]),
  ]
  const [res, setRes] = useState('1')
  const [fps, setFps] = useState(projeto.fps)
  const [qual, setQual] = useState('alta')
  const [estado, setEstado] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const sinal = useRef(null)
  const url = useRef(null)
  const mp4 = suportaMp4()
  const dur = duracaoProjeto(projeto)
  const W = Math.round((projeto.largura * Number(res)) / 2) * 2
  const H = Math.round((projeto.altura * Number(res)) / 2) * 2
  const bitrate = Math.round(W * H * fps * QUALIDADES.find((q) => q[0] === qual)[2])
  const nomeArquivo = `${(projeto.nome || 'video').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'video'}`

  useEffect(() => () => url.current && URL.revokeObjectURL(url.current), [])

  const exportar = async () => {
    setErro('')
    setResultado(null)
    sinal.current = new AbortController()
    setEstado({ p: 0, texto: 'Preparando…' })
    const inicio = performance.now()
    try {
      const opcoes = { largura: W, altura: H, fps, bitrate, sinal: sinal.current.signal, aoProgresso: (p, texto) => setEstado({ p, texto }) }
      const blob = mp4 ? await exportarMp4(projeto, midias, opcoes) : await exportarTempoReal(projeto, midias, opcoes)
      url.current && URL.revokeObjectURL(url.current)
      url.current = URL.createObjectURL(blob)
      setResultado({ blob, url: url.current, seg: (performance.now() - inicio) / 1000 })
    } catch (e) {
      if (e.name !== 'AbortError') setErro(e.message || String(e))
    }
    setEstado(null)
  }

  const ext = resultado?.blob.type.includes('mp4') ? 'mp4' : 'webm'
  return (
    <div className="ed-modal-fundo" onPointerDown={(e) => e.target === e.currentTarget && !estado && onFechar()}>
      <div className="ed-modal" role="dialog" aria-modal="true" aria-label="Exportar vídeo">
        <header className="ed-modal-topo">
          <h2>Exportar vídeo</h2>
          {!estado && (
            <button type="button" className="ed-icone" onClick={onFechar} aria-label="Fechar">
              ✕
            </button>
          )}
        </header>
        <div className="ed-modal-corpo">
          {!mp4 && <p className="ed-aviso">Este navegador não tem WebCodecs: o vídeo será gravado em tempo real ({fmtTempo(dur)}) no formato WebM. Para MP4 rápido, use Chrome, Edge ou Safari recente.</p>}
          <div className="ed-linha2">
            <label className="ed-campo">
              <span>Resolução</span>
              <select value={res} onChange={(e) => setRes(e.target.value)} disabled={!!estado}>
                {opcoesRes.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="ed-campo">
              <span>Quadros por segundo</span>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={!!estado || !mp4}>
                {[24, 25, 30, 50, 60].map((v) => (
                  <option key={v} value={v}>
                    {v} fps
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="ed-campo">
            <span>Qualidade</span>
            <select value={qual} onChange={(e) => setQual(e.target.value)} disabled={!!estado}>
              {QUALIDADES.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <p className="ed-dica">
            {fmtTempo(dur)} de vídeo · {W}×{H} · H.264 + AAC · cerca de {formatBytes((bitrate / 8) * dur + 20000 * dur)} · sem marca d’água
          </p>
          {estado && (
            <div className="ed-progresso-caixa" role="status">
              <div className="ed-progresso">
                <span style={{ width: `${Math.round(estado.p * 100)}%` }} />
              </div>
              <span>
                {Math.round(estado.p * 100)}% · {estado.texto}
              </span>
            </div>
          )}
          {erro && (
            <p className="ed-erro" role="alert">
              {erro}
            </p>
          )}
          {resultado && (
            <div className="ed-resultado">
              <video src={resultado.url} controls playsInline />
              <p className="ed-dica">
                Pronto em {Math.round(resultado.seg)} s · {formatBytes(resultado.blob.size)}
              </p>
            </div>
          )}
        </div>
        <footer className="ed-modal-rodape">
          {estado ? (
            <button type="button" className="ed-btn ed-btn-perigo" onClick={() => sinal.current?.abort()}>
              Cancelar
            </button>
          ) : resultado ? (
            <>
              <button type="button" className="ed-btn" onClick={exportar}>
                Exportar de novo
              </button>
              <button type="button" className="ed-btn ed-btn-primario" onClick={() => downloadBlob(resultado.blob, `${nomeArquivo}.${ext}`)}>
                ⬇ Baixar {ext.toUpperCase()}
              </button>
            </>
          ) : (
            <button type="button" className="ed-btn ed-btn-primario" onClick={exportar} disabled={dur <= 0}>
              Exportar {mp4 ? 'MP4' : 'WebM'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
