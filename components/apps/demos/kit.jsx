'use client'

// Kit das demos (Obra, Meu Carro, Garantia, Aluguel, Achei/Perdi, Evento Fácil).
// Tudo roda no navegador: os dados de exemplo ficam no localStorage e nada vai para servidor.

import { useEffect, useRef, useState } from 'react'

export const uid = () => Math.random().toString(36).slice(2, 10)
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const reais = (v) => BRL.format(Number(v) || 0)
export const num = (v, d = 0) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
export const dataBr = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR') : '—')
export const hojeIso = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
export const somaDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
export const somaMeses = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}
export const diasAte = (iso) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${hojeIso()}T12:00:00`)) / 86400000)
export const lerNumero = (t) => {
  let s = String(t ?? '').replace(/[^\d,.-]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  return Number(s) || 0
}

/** Estado salvo no navegador, com volta para a demo. */
export function useDemo(chave, gerarDemo) {
  const [dados, setDados] = useState(null)
  const pronto = useRef(false)
  useEffect(() => {
    let d = null
    try {
      d = JSON.parse(localStorage.getItem(chave) || 'null')
    } catch {}
    setDados(d || gerarDemo())
    pronto.current = true
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pronto.current || !dados) return
    try {
      localStorage.setItem(chave, JSON.stringify(dados))
    } catch {}
  }, [chave, dados])
  const restaurar = () => {
    if (!confirm('Voltar para os dados de exemplo? O que você mudou será apagado deste navegador.')) return
    try {
      localStorage.removeItem(chave)
    } catch {}
    setDados(gerarDemo())
  }
  return [dados, setDados, restaurar]
}

/** Moldura do app: topo, menu lateral (vira barra inferior no celular) e aviso de demo. */
export function Moldura({ nome, icone, cor, secoes, secao, onSecao, onRestaurar, children, extraTopo, demo = true, aviso }) {
  return (
    <div className="dm" style={{ '--dm-cor': cor }}>
      <header className="dm-topo">
        <a href="/apps" className="dm-voltar" aria-label="Voltar para os apps">←</a>
        <span className="dm-logo" aria-hidden="true">{icone}</span>
        <b className="dm-nome">{nome}</b>
        {demo && <span className="dm-selo" title="Versão de demonstração">DEMO</span>}
        <span className="dm-espaco" />
        {extraTopo}
        {onRestaurar && <button type="button" className="dm-btn dm-btn-sec dm-esconde-p" onClick={onRestaurar}>{demo ? '↺ Restaurar demo' : '↺ Exemplo'}</button>}
      </header>
      <div className="dm-corpo">
        <nav className="dm-menu" aria-label="Seções">
          {secoes.map(([id, ic, rot]) => (
            <button key={id} type="button" aria-current={secao === id ? 'page' : undefined} onClick={() => onSecao(id)}>
              <span aria-hidden="true">{ic}</span>
              <small>{rot}</small>
            </button>
          ))}
        </nav>
        <main className="dm-main">
          {demo ? (
            <p className="dm-aviso">
              <b>Demonstração.</b> Os dados são de exemplo e o que você muda fica só neste navegador (nada vai para servidor).{' '}
              <button type="button" className="dm-link" onClick={onRestaurar}>Restaurar exemplo</button>
            </p>
          ) : aviso ? (
            <p className="dm-aviso dm-aviso-info">{aviso}</p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}

export function Kpi({ rotulo, valor, sub, tom }) {
  return (
    <div className="dm-kpi" data-tom={tom}>
      <small>{rotulo}</small>
      <b>{valor}</b>
      {sub && <span>{sub}</span>}
    </div>
  )
}

export function Cartao({ titulo, acao, children, className = '' }) {
  return (
    <section className={`dm-cartao ${className}`}>
      {(titulo || acao) && (
        <div className="dm-cartao-topo">
          {titulo && <h3>{titulo}</h3>}
          {acao}
        </div>
      )}
      {children}
    </section>
  )
}

export function Barra({ valor, max, tom }) {
  const p = max > 0 ? Math.min(100, (valor / max) * 100) : 0
  return (
    <div className="dm-barra" data-tom={tom || (valor > max ? 'ruim' : undefined)}>
      <span style={{ width: `${p}%` }} />
    </div>
  )
}

export function Selo({ tom, children }) {
  return <span className="dm-tag" data-tom={tom}>{children}</span>
}

/** Gráfico de barras simples (SVG), valores por rótulo. */
export function Barras({ dados, formato = (v) => v, altura = 160 }) {
  const max = Math.max(1, ...dados.map((d) => d.valor))
  const w = 100 / Math.max(1, dados.length)
  return (
    <div className="dm-grafico" style={{ height: altura }}>
      {dados.map((d) => (
        <div key={d.rotulo} className="dm-grafico-col" style={{ width: `${w}%` }} title={`${d.rotulo}: ${formato(d.valor)}`}>
          <span className="dm-grafico-v">{d.valor ? formato(d.valor) : ''}</span>
          <div className="dm-grafico-b" style={{ height: `${(d.valor / max) * 100}%` }} />
          <small>{d.rotulo}</small>
        </div>
      ))}
    </div>
  )
}

/** Janela com formulário. */
export function Janela({ titulo, onFechar, children, largura = 520 }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return (
    <div className="dm-janela" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <div className="dm-janela-caixa" style={{ maxWidth: largura }} onClick={(e) => e.stopPropagation()}>
        <div className="dm-janela-topo">
          <h3>{titulo}</h3>
          <button type="button" className="dm-x" onClick={onFechar} aria-label="Fechar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ rotulo, children, dica, largo }) {
  return (
    <label className={`dm-campo${largo ? ' dm-campo-largo' : ''}`}>
      <span>{rotulo}</span>
      {children}
      {dica && <small>{dica}</small>}
    </label>
  )
}

/** Formulário genérico a partir de uma lista de campos. */
export function Formulario({ campos, inicial, onSalvar, onApagar, rotuloSalvar = 'Salvar' }) {
  const [v, setV] = useState(inicial)
  const set = (k, x) => setV((o) => ({ ...o, [k]: x }))
  return (
    <form
      className="dm-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSalvar(v)
      }}
    >
      <div className="dm-form-grade">
        {campos.map((c) => (
          <Campo key={c.k} rotulo={c.rotulo} dica={c.dica} largo={c.largo}>
            {c.tipo === 'select' ? (
              <select value={v[c.k] ?? ''} onChange={(e) => set(c.k, e.target.value)}>
                {c.opcoes.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
              </select>
            ) : c.tipo === 'texto-longo' ? (
              <textarea rows={3} value={v[c.k] ?? ''} onChange={(e) => set(c.k, e.target.value)} placeholder={c.ph} />
            ) : c.tipo === 'check' ? (
              <span className="dm-check"><input type="checkbox" checked={!!v[c.k]} onChange={(e) => set(c.k, e.target.checked)} /> {c.texto}</span>
            ) : (
              <input
                type={c.tipo === 'data' ? 'date' : c.tipo === 'numero' ? 'number' : 'text'}
                inputMode={c.tipo === 'dinheiro' ? 'decimal' : undefined}
                step={c.tipo === 'numero' ? c.passo || 'any' : undefined}
                value={v[c.k] ?? ''}
                onChange={(e) => set(c.k, c.tipo === 'numero' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                placeholder={c.ph}
                required={c.obrigatorio}
              />
            )}
          </Campo>
        ))}
      </div>
      <div className="dm-form-pe">
        {onApagar && <button type="button" className="dm-btn dm-btn-perigo" onClick={onApagar}>Apagar</button>}
        <span className="dm-espaco" />
        <button type="submit" className="dm-btn">{rotuloSalvar}</button>
      </div>
    </form>
  )
}

/** "Foto" de demonstração: ilustração em SVG (nenhuma imagem real é guardada). */
export function FotoDemo({ tema = 'obra', semente = 1, rotulo, className = '', emoji }) {
  const cores = {
    obra: ['#f59e0b', '#78350f', '#fde68a'],
    carro: ['#3b82f6', '#1e3a8a', '#bfdbfe'],
    nota: ['#e5e7eb', '#374151', '#ffffff'],
    produto: ['#8b5cf6', '#3b0764', '#ddd6fe'],
    achado: ['#10b981', '#064e3b', '#a7f3d0'],
    evento: ['#ec4899', '#831843', '#fbcfe8'],
    casa: ['#14b8a6', '#134e4a', '#99f6e4'],
  }[tema] || ['#94a3b8', '#1e293b', '#e2e8f0']
  const s = semente
  const ang = (s * 47) % 360
  return (
    <div className={`dm-foto ${className}`} role="img" aria-label={rotulo || 'Foto de demonstração'}>
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`g${tema}${s}`} gradientTransform={`rotate(${ang} .5 .5)`}>
            <stop offset="0" stopColor={cores[0]} />
            <stop offset="1" stopColor={cores[1]} />
          </linearGradient>
        </defs>
        <rect width="160" height="120" fill={`url(#g${tema}${s})`} />
        {tema === 'obra' && (
          <g fill={cores[2]} opacity=".85">
            <rect x={20 + (s % 3) * 8} y="60" width="50" height="40" />
            <rect x={80} y={40 + (s % 4) * 5} width="45" height={60 - (s % 4) * 5} />
            <path d="M15 62 L45 38 L75 62Z" />
            <rect x="0" y="100" width="160" height="20" fill={cores[1]} opacity=".5" />
            <line x1="130" y1="10" x2="130" y2="100" stroke={cores[2]} strokeWidth="3" />
            <line x1="100" y1="16" x2="150" y2="16" stroke={cores[2]} strokeWidth="3" />
          </g>
        )}
        {tema === 'carro' && (
          <g fill={cores[2]}>
            <path d="M25 78 Q30 55 55 52 L100 52 Q118 54 130 70 L140 74 Q145 80 140 86 L25 86 Q20 82 25 78Z" />
            <circle cx="52" cy="88" r="11" fill={cores[1]} stroke={cores[2]} strokeWidth="4" />
            <circle cx="115" cy="88" r="11" fill={cores[1]} stroke={cores[2]} strokeWidth="4" />
          </g>
        )}
        {tema === 'nota' && (
          <g>
            <rect x="40" y="8" width="80" height="104" fill="#fff" />
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x="48" y={20 + i * 9} width={i % 3 === 0 ? 40 : 64} height="3" fill="#9ca3af" />
            ))}
            <rect x="48" y="100" width="64" height="5" fill="#111" />
          </g>
        )}
        {(tema === 'produto' || tema === 'achado' || tema === 'evento' || tema === 'casa') && (
          <g fill={cores[2]} opacity=".9">
            <circle cx={60 + (s % 5) * 8} cy="55" r="26" />
            <rect x="85" y="50" width="40" height="40" rx={tema === 'evento' ? 20 : 6} opacity=".7" />
          </g>
        )}
      </svg>
      {emoji && <span className="dm-foto-emoji" aria-hidden="true">{emoji}</span>}
      {rotulo && <span className="dm-foto-rot">{rotulo}</span>}
    </div>
  )
}

/** Escolher foto só para ver (não salva nada). */
export function FotoSessao({ onFoto, rotulo = 'Escolher foto' }) {
  const ref = useRef(null)
  return (
    <>
      <button type="button" className="dm-btn dm-btn-sec" onClick={() => ref.current?.click()}>📷 {rotulo}</button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFoto(URL.createObjectURL(f), f)
        }}
      />
    </>
  )
}

export function Vazio({ children }) {
  return <p className="dm-vazio">{children}</p>
}

export function PlanoPro({ texto }) {
  return (
    <div className="dm-pro">
      <b>⭐ Plano Pro</b>
      <span>{texto}</span>
      <button type="button" className="dm-btn dm-btn-sec" onClick={() => alert('Demonstração: o plano pago ainda não existe. Aqui entraria a assinatura.')}>Conhecer</button>
    </div>
  )
}

/** Abriu outro link com dados (#d=...) na mesma aba: recarrega para ler o link novo. */
export function useRecarregarComLink() {
  useEffect(() => {
    const f = () => {
      if (window.location.hash.includes('d=')) window.location.reload()
    }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
}
