'use client'

import { useEffect, useRef, useState } from 'react'
import { calcular } from '@/lib/editor/modelo'

/**
 * Campo numérico: aceita contas (1920/2, 10+5*3), seta ↑/↓ soma o passo (Shift ×10),
 * e arrastar o rótulo para os lados ajusta o valor.
 */
export function Numero({ rotulo, valor, onMudar, passo = 1, min = -Infinity, max = Infinity, casas = 2, sufixo = '', onFim, extra = null }) {
  const [texto, setTexto] = useState(null)
  const arraste = useRef(null)
  const limitar = (v) => Math.min(max, Math.max(min, Math.round(v * 10 ** casas) / 10 ** casas))
  const confirmar = () => {
    if (texto === null) return
    const v = calcular(texto)
    if (Number.isFinite(v)) onMudar(limitar(v))
    setTexto(null)
    onFim?.()
  }
  return (
    <label className="ed-num">
      <span
        className="ed-num-rotulo"
        title="Arraste para os lados para ajustar"
        onPointerDown={(e) => {
          e.preventDefault()
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {}
          arraste.current = { x: e.clientX, v: Number(valor) || 0 }
        }}
        onPointerMove={(e) => {
          if (!arraste.current) return
          const dx = e.clientX - arraste.current.x
          onMudar(limitar(arraste.current.v + dx * passo * (e.shiftKey ? 10 : 1)))
        }}
        onPointerUp={() => {
          if (arraste.current) onFim?.()
          arraste.current = null
        }}
      >
        {rotulo}
      </span>
      <span className="ed-num-caixa">
        <input
          type="text"
          inputMode="decimal"
          value={texto ?? String(Number(valor ?? 0).toLocaleString('en-US', { maximumFractionDigits: casas, useGrouping: false }))}
          onFocus={(e) => {
            setTexto(e.target.value)
            requestAnimationFrame(() => e.target.select())
          }}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setTexto(null)
              e.currentTarget.blur()
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const base = Number.isFinite(calcular(texto ?? valor)) ? calcular(texto ?? valor) : Number(valor) || 0
              const v = limitar(base + (e.key === 'ArrowUp' ? 1 : -1) * passo * (e.shiftKey ? 10 : 1))
              setTexto(String(v))
              onMudar(v)
            }
          }}
          aria-label={typeof rotulo === 'string' ? rotulo : undefined}
        />
        {sufixo && <span className="ed-num-sufixo">{sufixo}</span>}
      </span>
      {extra}
    </label>
  )
}

/** Cor com campo hexadecimal e conta-gotas (pega uma cor de qualquer lugar da tela, onde o navegador permite). */
export function Cor({ rotulo, valor, onMudar, permitirVazio = false }) {
  const temConta = typeof window !== 'undefined' && 'EyeDropper' in window
  return (
    <div className="ed-cor">
      <span className="ed-num-rotulo">{rotulo}</span>
      <span className="ed-cor-linha">
        <input type="color" value={valor || '#000000'} onChange={(e) => onMudar(e.target.value)} aria-label={`${rotulo}: escolher`} />
        <input
          type="text"
          className="ed-cor-hex"
          value={valor || ''}
          placeholder={permitirVazio ? 'nenhuma' : '#000000'}
          onChange={(e) => {
            const v = e.target.value.trim()
            if (!v && permitirVazio) onMudar('')
            else if (/^#[0-9a-f]{6}$/i.test(v)) onMudar(v)
          }}
          aria-label={`${rotulo}: código`}
        />
        {temConta && (
          <button
            type="button"
            className="ed-icone"
            title="Conta-gotas: pegar cor da tela"
            onClick={async () => {
              try {
                const r = await new window.EyeDropper().open()
                onMudar(r.sRGBHex)
              } catch {}
            }}
          >
            💧
          </button>
        )}
        {permitirVazio && valor && (
          <button type="button" className="ed-icone" title="Sem cor" onClick={() => onMudar('')}>
            ⊘
          </button>
        )}
      </span>
    </div>
  )
}

/* ---------- Fontes do Google ---------- */

export const FONTES = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato', 'Oswald', 'Raleway', 'Nunito', 'Rubik', 'Work Sans', 'Ubuntu', 'Noto Sans', 'Quicksand', 'Mulish', 'Kanit', 'Barlow', 'Barlow Condensed', 'Manrope', 'DM Sans', 'Space Grotesk', 'Outfit', 'Archivo', 'Archivo Black', 'Anton', 'Bebas Neue', 'Fjalla One', 'Teko', 'Russo One', 'Black Ops One', 'Bungee', 'Righteous', 'Alfa Slab One', 'Abril Fatface', 'Playfair Display', 'Merriweather', 'Lora', 'Libre Baskerville', 'Cormorant Garamond', 'EB Garamond', 'DM Serif Display', 'Roboto Slab', 'Zilla Slab', 'Bitter', 'Pacifico', 'Lobster', 'Dancing Script', 'Great Vibes', 'Satisfy', 'Caveat', 'Kalam', 'Shadows Into Light', 'Indie Flower', 'Permanent Marker', 'Amatic SC', 'Patrick Hand', 'Gloria Hallelujah', 'Sacramento', 'Allura', 'Parisienne', 'Press Start 2P', 'VT323', 'Silkscreen', 'Orbitron', 'Audiowide', 'Monoton', 'Bungee Shade', 'Rubik Mono One', 'Fredoka', 'Baloo 2', 'Comfortaa', 'Chewy', 'Luckiest Guy', 'Bangers', 'Titan One', 'Carter One', 'Cinzel', 'Creepster', 'Nosifer', 'Special Elite', 'Courier Prime', 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Space Mono', 'IBM Plex Sans', 'IBM Plex Serif', 'Josefin Sans', 'Exo 2', 'Saira', 'Chakra Petch', 'Lexend', 'Sora', 'Plus Jakarta Sans', 'Urbanist', 'Red Hat Display', 'Figtree',
]

const carregadas = new Set()
/** Injeta a folha da fonte do Google Fonts (qualquer uma das 1.700+) e espera carregar. */
export async function carregarFonte(nome, peso = 400, italico = false) {
  if (!nome) return
  if (!carregadas.has(nome)) {
    carregadas.add(nome)
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nome).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,700;0,900;1,400;1,700&display=swap`
    document.head.appendChild(l)
    await new Promise((ok) => {
      l.onload = ok
      l.onerror = ok
    })
  }
  try {
    await document.fonts.load(`${italico ? 'italic ' : ''}${peso} 40px "${nome}"`)
  } catch {}
}

export function useFontesDoProjeto(projeto, aoCarregar) {
  const chave = projeto
    ? [
        ...new Set(
          projeto.trilhas
            .flatMap((t) => t.itens)
            .filter((c) => c.tipo === 'texto')
            .map((c) => `${c.texto.fonte}|${c.texto.peso}|${c.texto.italico ? 1 : 0}`),
        ),
      ].join(',')
    : ''
  useEffect(() => {
    if (!chave) return
    let vivo = true
    Promise.all(chave.split(',').map((k) => k.split('|')).map(([f, p, i]) => carregarFonte(f, p, i === '1'))).then(() => vivo && aoCarregar())
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
}

export function SeletorFonte({ valor, onMudar }) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const lista = FONTES.filter((f) => f.toLowerCase().includes(busca.toLowerCase()))
  useEffect(() => {
    if (aberto) lista.slice(0, 40).forEach((f) => carregarFonte(f))
  }, [aberto, busca]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="ed-fonte">
      <span className="ed-num-rotulo">Fonte</span>
      <button type="button" className="ed-fonte-atual" style={{ fontFamily: `"${valor}"` }} onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        {valor} ▾
      </button>
      {aberto && (
        <div className="ed-fonte-lista">
          <input type="search" placeholder="Buscar ou digitar qualquer fonte do Google" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus aria-label="Buscar fonte" />
          {busca && !FONTES.some((f) => f.toLowerCase() === busca.toLowerCase()) && (
            <button
              type="button"
              onClick={() => {
                const nome = busca.trim().replace(/\b\w/g, (c) => c.toUpperCase())
                carregarFonte(nome).then(() => onMudar(nome))
                setAberto(false)
              }}
            >
              Usar “{busca}” do Google Fonts
            </button>
          )}
          {lista.map((f) => (
            <button
              key={f}
              type="button"
              style={{ fontFamily: `"${f}"` }}
              className={f === valor ? 'ativo' : ''}
              onClick={() => {
                onMudar(f)
                setAberto(false)
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
