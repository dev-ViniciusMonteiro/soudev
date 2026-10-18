'use client'

import { useRef, useState } from 'react'
import { fmtTempo } from '@/lib/editor/modelo'
import { FORMAS, urlEmoji } from '@/lib/editor/render'

export const MODELOS_TEXTO = [
  ['Título', { conteudo: 'Título', tamanho: 140, peso: 900, fonte: 'Montserrat' }],
  ['Subtítulo', { conteudo: 'Subtítulo', tamanho: 72, peso: 400, fonte: 'Inter' }],
  ['Legenda', { conteudo: 'Legenda do vídeo', tamanho: 54, peso: 700, fonte: 'Inter', fundo: '#000000', cor: '#ffffff', sombra: false }, { y: 380 }],
  ['Destaque', { conteudo: 'UAU!', tamanho: 160, peso: 400, fonte: 'Bangers', cor: '#fde047', contorno: 6, corContorno: '#000000' }],
  ['Nome na tela', { conteudo: 'Maria Silva\nDesenvolvedora', tamanho: 54, peso: 700, fonte: 'Inter', alinhar: 'left', fundo: '#1e3a8a', sombra: false }, { x: -560, y: 340 }],
  ['Manuscrito', { conteudo: 'Feito com carinho', tamanho: 110, peso: 700, fonte: 'Caveat', cor: '#fda4af' }],
  ['Retrô', { conteudo: 'GAME OVER', tamanho: 90, peso: 400, fonte: 'Press Start 2P', cor: '#4ade80' }],
  ['Cinema', { conteudo: 'CAPÍTULO 1', tamanho: 110, peso: 400, fonte: 'Cinzel', cor: '#f5f5f4', letra: 12 }],
]

const bandeira = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
const PAISES = ['BR', 'PT', 'US', 'GB', 'ES', 'FR', 'IT', 'DE', 'AR', 'UY', 'PY', 'CL', 'CO', 'MX', 'PE', 'BO', 'VE', 'CA', 'JP', 'CN', 'KR', 'IN', 'AO', 'MZ', 'CV', 'NL', 'BE', 'CH', 'IE', 'AU', 'ZA', 'NG', 'EG', 'MA', 'IL', 'UA', 'RU', 'TR', 'SE', 'NO']
export const EMOJIS = {
  Reações: ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '🥳', '😮', '😱', '🤯', '😭', '😡', '🤔', '🙄', '😴', '🤡', '👻', '💀', '🙏', '👏', '👍', '👎', '👉', '👀', '💪', '🫶', '🤝'],
  Símbolos: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯', '🔥', '⭐', '🌟', '✨', '⚡', '💥', '💫', '✅', '❌', '⚠️', '❓', '❗', '➡️', '⬅️', '⬆️', '⬇️', '🔔', '📍', '🎯', '🏆'],
  Objetos: ['🎉', '🎁', '🎈', '🎂', '📷', '🎥', '🎬', '🎵', '🎧', '🎤', '📱', '💻', '💡', '📌', '📢', '💰', '🛒', '🍕', '🍔', '☕', '🍿', '⚽', '🏀', '🚗', '✈️', '🏠', '🌈', '☀️'],
  Bandeiras: PAISES.map(bandeira),
}

export default function Painel({ projeto, midias, importar, inserirMidia, inserirTexto, inserirSticker, importarLegendas, apagarMidia, tempo }) {
  const [aba, setAba] = useState('midia')
  const [arrastando, setArrastando] = useState(false)
  const [estiloLeg, setEstiloLeg] = useState(2)
  const arquivo = useRef(null)
  const lista = [...midias.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  const usadas = new Set(projeto.trilhas.flatMap((t) => t.itens.map((c) => c.midia)))

  return (
    <aside className="ed-painel" aria-label="Mídias e elementos">
      <div className="ed-abas" role="tablist">
        {[
          ['midia', '🎞', 'Mídia'],
          ['texto', 'T', 'Texto'],
          ['figurinhas', '⭐', 'Figurinhas'],
          ['legendas', '💬', 'Legendas'],
        ].map(([id, ic, nome]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={aba === id ? 'ativo' : ''} onClick={() => setAba(id)}>
            <span aria-hidden="true">{ic}</span>
            {nome}
          </button>
        ))}
      </div>

      <div className="ed-painel-corpo">
        {aba === 'midia' && (
          <>
            <div
              className={`ed-soltar ${arrastando ? 'ativo' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setArrastando(true)
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault()
                setArrastando(false)
                importar([...e.dataTransfer.files])
              }}
              onClick={() => arquivo.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && arquivo.current?.click()}
            >
              <strong>+ Importar mídia</strong>
              <span>Vídeo, áudio ou imagem. Arraste aqui, clique ou cole (Ctrl+V).</span>
              <input ref={arquivo} type="file" multiple accept="video/*,audio/*,image/*" hidden onChange={(e) => (importar([...(e.target.files || [])]), (e.target.value = ''))} />
            </div>
            {!lista.length && <p className="ed-dica">Os arquivos ficam só neste navegador. Nada é enviado para servidor.</p>}
            <ul className="ed-midias">
              {lista.map((m) => (
                <li key={m.id} draggable onDragStart={(e) => e.dataTransfer.setData('application/x-ed-midia', m.id)}>
                  <span className="ed-midia-mini" style={m.miniatura ? { backgroundImage: `url(${m.miniatura})` } : undefined}>
                    {!m.miniatura && (m.tipo === 'audio' ? '🎵' : '🖼')}
                    {m.tipo !== 'imagem' && <span className="ed-midia-dur">{fmtTempo(m.duracao)}</span>}
                  </span>
                  <span className="ed-midia-nome" title={m.nome}>
                    {m.nome}
                    {!usadas.has(m.id) && <small> · não usada</small>}
                  </span>
                  <span className="ed-midia-acoes">
                    <button type="button" className="ed-icone" title="Pôr na linha do tempo, na agulha" onClick={() => inserirMidia(m)}>
                      +
                    </button>
                    <button type="button" className="ed-icone" title="Apagar mídia" onClick={() => apagarMidia(m)}>
                      🗑
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {aba === 'texto' && (
          <div className="ed-grade-botoes">
            {MODELOS_TEXTO.map(([nome, tx, pos]) => (
              <button key={nome} type="button" className="ed-modelo-texto" onClick={() => inserirTexto(tx, pos)} style={{ fontFamily: `"${tx.fonte}"`, color: tx.cor, fontWeight: tx.peso }}>
                {nome}
              </button>
            ))}
            <p className="ed-dica">Entra na agulha ({fmtTempo(tempo)}) com 5 segundos. Mude fonte, cor, contorno e animação no painel da direita.</p>
          </div>
        )}

        {aba === 'figurinhas' && (
          <>
            <h3 className="ed-subtitulo">Formas</h3>
            <div className="ed-grade-formas">
              {FORMAS.map(([id, nome]) => (
                <button key={id} type="button" className="ed-forma" onClick={() => inserirSticker({ tipo: 'forma', valor: id, cor: '#fbbf24' }, nome)} title={nome} aria-label={nome}>
                  <svg viewBox="-50 -50 100 100" aria-hidden="true">
                    <FormaSvg forma={id} />
                  </svg>
                </button>
              ))}
            </div>
            {Object.entries(EMOJIS).map(([grupo, lista]) => (
              <div key={grupo}>
                <h3 className="ed-subtitulo">{grupo}</h3>
                <div className="ed-grade-emoji">
                  {lista.map((em) => (
                    <button key={em} type="button" onClick={() => inserirSticker({ tipo: 'emoji', valor: em }, grupo === 'Bandeiras' ? 'Bandeira' : 'Emoji')} aria-label={`Figurinha ${em}`}>
                      <img src={urlEmoji(em)} alt="" loading="lazy" width="30" height="30" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="ed-dica">
              Figurinhas{' '}
              <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener noreferrer">
                Twemoji
              </a>{' '}
              (CC-BY 4.0).
            </p>
          </>
        )}

        {aba === 'legendas' && (
          <div className="ed-legendas">
            <p className="ed-dica">Importe um arquivo de legenda (.srt ou .vtt), como os gerados pelo YouTube, CapCut ou Whisper. Cada fala vira um texto na linha do tempo, no tempo certo.</p>
            <label className="ed-campo">
              <span>Estilo</span>
              <select value={estiloLeg} onChange={(e) => setEstiloLeg(Number(e.target.value))}>
                {MODELOS_TEXTO.map(([nome], i) => (
                  <option key={nome} value={i}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="ed-btn ed-btn-primario">
              Escolher arquivo de legenda
              <input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" hidden onChange={(e) => (importarLegendas(e.target.files?.[0], MODELOS_TEXTO[estiloLeg]), (e.target.value = ''))} />
            </label>
          </div>
        )}
      </div>
    </aside>
  )
}

function FormaSvg({ forma }) {
  const comum = { fill: '#fbbf24' }
  switch (forma) {
    case 'circulo':
      return <circle r="40" {...comum} />
    case 'quadrado':
      return <rect x="-40" y="-40" width="80" height="80" {...comum} />
    case 'arredondado':
      return <rect x="-40" y="-40" width="80" height="80" rx="15" {...comum} />
    case 'triangulo':
      return <path d="M0 -40 L40 40 L-40 40Z" {...comum} />
    case 'estrela':
      return <path d={Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 17 : 40; return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}` }).join(' ') + 'Z'} {...comum} />
    case 'coracao':
      return <path d="M0 38 C-64 -4 -22 -50 0 -18 C22 -50 64 -4 0 38Z" {...comum} />
    case 'seta':
      return <path d="M-40 -12 L8 -12 L8 -40 L40 0 L8 40 L8 12 L-40 12Z" {...comum} />
    case 'balao':
      return <path d="M-40 -40 H40 V22 H-2 L-22 40 L-16 22 H-40Z" {...comum} />
    case 'linha':
      return <rect x="-40" y="-5" width="80" height="10" {...comum} />
    default:
      return null
  }
}
