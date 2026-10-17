'use client'

// Peças comuns dos sistemas: acesso ao banco pelo React, campos por tipo, modal, lista, gráfico de barras.

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { campo, camposDe, tabelas } from '@/lib/sistemas/schema'
import { brl, dataBR, num, parseValor } from '@/lib/sistemas/regras'

/* ---------- Banco no React ---------- */

export const SistemaContext = createContext(null)
export const useSistema = () => useContext(SistemaContext)

const vazio = []
export function useTabela(t) {
  const { banco } = useSistema()
  return useSyncExternalStore(
    banco.ouvir,
    () => banco.lista(t),
    () => vazio,
  )
}

export function useConfig() {
  const { banco } = useSistema()
  const lista = useTabela('config')
  return useMemo(() => banco.config(), [banco, lista])
}

export function useStatus(banco) {
  return useSyncExternalStore(
    banco.ouvirStatus,
    () => banco.status,
    () => banco.status,
  )
}

/** Mapa id -> registro, para mostrar nomes de referências. */
export function useMapa(t) {
  const lista = useTabela(t)
  return useMemo(() => new Map(lista.map((r) => [r.id, r])), [lista])
}

export function tituloDe(t, r) {
  if (!r) return ''
  const k = tabelas[t]?.titulo
  if (t === 'matriculas' || t === 'presencas') return r.cliente_id
  return k === 'numero' ? `#${r.numero || '—'}` : String(r[k] ?? '')
}

/* ---------- Valores ---------- */

export function mostrarValor(tabela, id, valor, mapas = {}) {
  const c = campo(tabela, id)
  if (valor === '' || valor === null || valor === undefined) return ''
  switch (c?.tipo) {
    case 'dinheiro':
      return brl(valor)
    case 'pct':
      return `${num(valor, 2)}%`
    case 'numero':
      return id === 'numero' ? `#${valor}` : num(valor, 3)
    case 'data':
      return dataBR(valor)
    case 'datahora':
      return dataBR(valor, true)
    case 'sim':
      return valor ? 'Sim' : 'Não'
    case 'opcao':
      return c.opcoes.find(([v]) => v === valor)?.[1] ?? valor
    case 'ref': {
      const r = mapas[c.ref]?.get(valor)
      return r ? tituloDe(c.ref, r) : ''
    }
    case 'cor':
      return <span className="sx-cor" style={{ background: valor }} />
    default:
      return String(valor)
  }
}

/** Converte o texto digitado para o tipo do campo. */
export function converter(c, valor) {
  if (['numero', 'dinheiro', 'pct'].includes(c.tipo)) return valor === '' ? '' : parseValor(valor)
  if (c.tipo === 'sim') return Boolean(valor)
  return typeof valor === 'string' ? valor.trim() : valor
}

export const paraInput = (c, valor) => {
  if (valor === null || valor === undefined) return c.tipo === 'sim' ? false : ''
  if (c.tipo === 'dinheiro' && valor !== '') return Number(valor).toFixed(2).replace('.', ',')
  if (['numero', 'pct'].includes(c.tipo) && valor !== '') return String(valor).replace('.', ',')
  if (c.tipo === 'datahora') return String(valor).slice(0, 16)
  return valor
}

/* ---------- Campos ---------- */

export function Combo({ tabela, value, onChange, placeholder = 'Buscar…', filtro, rotulo, autoFocus }) {
  const lista = useTabela(tabela)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const caixa = useRef(null)
  const opcoes = useMemo(() => {
    const base = filtro ? lista.filter(filtro) : lista
    const q = busca.trim().toLowerCase()
    const achados = q ? base.filter((r) => [tituloDe(tabela, r), r.telefone, r.email, r.codigo_barras, r.empresa].some((v) => String(v ?? '').toLowerCase().includes(q))) : base
    return [...achados].sort((a, b) => tituloDe(tabela, a).localeCompare(tituloDe(tabela, b))).slice(0, 60)
  }, [lista, busca, filtro, tabela])
  const atual = lista.find((r) => r.id === value)
  const nome = (r) => (rotulo ? rotulo(r) : tituloDe(tabela, r))

  useEffect(() => {
    const fora = (e) => {
      if (!caixa.current?.contains(e.target)) setAberto(false)
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [])

  return (
    <div className="sx-combo" ref={caixa}>
      <input
        value={aberto ? busca : atual ? nome(atual) : ''}
        placeholder={atual ? nome(atual) : placeholder}
        autoFocus={autoFocus}
        onFocus={() => {
          setBusca('')
          setAberto(true)
        }}
        onChange={(e) => {
          setBusca(e.target.value)
          setAberto(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && aberto && opcoes[0]) {
            e.preventDefault()
            onChange(opcoes[0].id)
            setAberto(false)
          }
          if (e.key === 'Escape') setAberto(false)
        }}
      />
      {value && (
        <button type="button" className="sx-combo-limpar" aria-label="Limpar" onClick={() => onChange('')}>
          ×
        </button>
      )}
      {aberto && (
        <ul className="sx-combo-lista" role="listbox">
          {opcoes.length === 0 && <li className="muted">Nada encontrado</li>}
          {opcoes.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(r.id)
                  setAberto(false)
                }}
              >
                {nome(r)}
                {r.telefone && <small> · {r.telefone}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function CampoInput({ c, value, onChange, autoFocus }) {
  const comum = { value: value ?? '', onChange: (e) => onChange(e.target.value), autoFocus, required: c.obrigatorio }
  switch (c.tipo) {
    case 'longo':
      return <textarea rows={3} {...comum} />
    case 'numero':
    case 'pct':
      return <input type="text" inputMode="decimal" autoComplete="off" {...comum} />
    case 'dinheiro':
      return (
        <div className="sx-moeda">
          <span>R$</span>
          <input type="text" inputMode="decimal" autoComplete="off" {...comum} />
        </div>
      )
    case 'data':
      return <input type="date" {...comum} />
    case 'datahora':
      return <input type="datetime-local" {...comum} />
    case 'hora':
      return <input type="time" {...comum} />
    case 'email':
      return <input type="email" autoComplete="off" {...comum} />
    case 'tel':
      return <input type="tel" autoComplete="off" {...comum} />
    case 'url':
      return <input type="url" placeholder="https://…" {...comum} />
    case 'cor':
      return <input type="color" {...comum} value={value || '#67e8f9'} />
    case 'opcao':
      return (
        <select {...comum}>
          <option value="">—</option>
          {c.opcoes.map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
      )
    case 'ref':
      return <Combo tabela={c.ref} value={value} onChange={onChange} />
    case 'sim':
      return (
        <span className="sx-switch">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{value ? 'Sim' : 'Não'}</span>
        </span>
      )
    default:
      return <input type="text" autoComplete="off" {...comum} />
  }
}

export function Campo({ c, value, onChange, autoFocus }) {
  const id = useId()
  return (
    <div className={`field sx-campo sx-campo-${c.tipo}`}>
      <label className="field-label" htmlFor={id}>
        {c.rotulo}
        {c.obrigatorio && <span className="sx-obrig"> *</span>}
      </label>
      <div id={id}>
        <CampoInput c={c} value={value} onChange={onChange} autoFocus={autoFocus} />
      </div>
      {c.ajuda && <small className="field-hint">{c.ajuda}</small>}
    </div>
  )
}

/** Formulário de qualquer tabela, montado pelo esquema. */
export function Formulario({ tabela, registro, onSalvo, onCancelar, extras, padrao = {} }) {
  const { banco, nicho } = useSistema()
  const campos = camposDe(tabela, nicho.slug)
  const [valores, setValores] = useState(() => {
    const v = {}
    for (const c of campos) v[c.id] = paraInput(c, registro?.[c.id] ?? padrao[c.id] ?? c.padrao)
    return v
  })
  const [erro, setErro] = useState('')

  const salvar = (e) => {
    e.preventDefault()
    const dados = { ...(registro?.id ? { id: registro.id } : {}) }
    for (const c of campos) {
      const v = converter(c, valores[c.id])
      if (c.obrigatorio && (v === '' || v === null || v === undefined)) return setErro(`Preencha "${c.rotulo}".`)
      dados[c.id] = v
    }
    const salvo = banco.salvar(tabela, { ...padrao, ...dados })
    onSalvo?.(salvo)
  }

  return (
    <form className="sx-form" onSubmit={salvar}>
      <div className="sx-form-grid">
        {campos.map((c, i) => (
          <Campo key={c.id} c={c} value={valores[c.id]} autoFocus={i === 0 && !registro} onChange={(v) => setValores((s) => ({ ...s, [c.id]: v }))} />
        ))}
      </div>
      {extras}
      {erro && <p className="notice error">{erro}</p>}
      <div className="sx-acoes">
        <button type="submit" className="btn btn-primary">
          Salvar
        </button>
        {onCancelar && (
          <button type="button" className="btn btn-ghost" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

/* ---------- Estrutura ---------- */

export function Modal({ titulo, onFechar, children, largo = false, rodape }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return (
    <div className="sx-modal-fundo" onPointerDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={largo ? 'sx-modal largo' : 'sx-modal'} role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="sx-modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onFechar}>
            ×
          </button>
        </header>
        <div className="sx-modal-corpo">{children}</div>
        {rodape && <footer className="sx-modal-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}

export function Topo({ titulo, sub, children }) {
  return (
    <header className="sx-topo-modulo">
      <div>
        <h1>{titulo}</h1>
        {sub && <p className="muted small">{sub}</p>}
      </div>
      {children && <div className="sx-topo-acoes">{children}</div>}
    </header>
  )
}

export function Kpis({ itens }) {
  return (
    <div className="sx-kpis">
      {itens.filter(Boolean).map(([rotulo, valor, sub, tom]) => (
        <div key={rotulo} className={`sx-kpi ${tom ? `tom-${tom}` : ''}`}>
          <span>{rotulo}</span>
          <strong>{valor}</strong>
          {sub && <small>{sub}</small>}
        </div>
      ))}
    </div>
  )
}

export function Selo({ children, tom = 'neutro' }) {
  return <span className={`sx-selo tom-${tom}`}>{children}</span>
}

export function Vazio({ children }) {
  return <p className="sx-vazio">{children}</p>
}

export function Chips({ opcoes, valor, onChange }) {
  return (
    <div className="chips sx-chips">
      {opcoes.map(([id, rotulo, n]) => (
        <button key={id} type="button" className={valor === id ? 'chip active' : 'chip'} onClick={() => onChange(id)}>
          {rotulo}
          {n !== undefined && <span className="sx-chip-n">{n}</span>}
        </button>
      ))}
    </div>
  )
}

/** Colunas de barras de uma série só, com dica ao passar o mouse e tabela para leitores de tela. */
export function Barras({ dados, formato = brl, altura = 180, rotulo = 'Valor' }) {
  const [foco, setFoco] = useState(null)
  const max = Math.max(10, ...dados.map((d) => d.valor))
  const passo = niceStep(max)
  const topo = Math.ceil(max / passo) * passo
  const ticks = []
  for (let v = 0; v <= topo; v += passo) ticks.push(v)
  const compacto = (v) => (v >= 1000 ? `${num(v / 1000, 1)} mil` : num(v))
  const marcar = Math.max(1, Math.ceil(dados.length / 8))
  return (
    <figure className="sx-barras" style={{ '--h': `${altura}px` }}>
      <div className="sx-barras-area" onPointerLeave={() => setFoco(null)}>
        <div className="sx-barras-eixo" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / topo) * 100}%` }}>
              {compacto(t)}
            </span>
          ))}
        </div>
        <div className="sx-barras-plot">
          {ticks.map((t) => (
            <i key={t} className="sx-grade" style={{ bottom: `${(t / topo) * 100}%` }} />
          ))}
          {dados.map((d, i) => (
            <div key={d.rotulo + i} className={foco === i ? 'sx-coluna foco' : 'sx-coluna'} onPointerEnter={() => setFoco(i)} onFocus={() => setFoco(i)} tabIndex={-1}>
              <span className="sx-col-barra" style={{ height: `${(d.valor / topo) * 100}%` }} />
              <small className={i % marcar === 0 || i === dados.length - 1 ? '' : 'sx-oculto'}>{d.curto ?? d.rotulo}</small>
            </div>
          ))}
          {foco !== null && dados[foco] && (
            <div className="sx-dica" style={{ left: `${((foco + 0.5) / dados.length) * 100}%` }} role="status">
              <span>{dados[foco].rotulo}</span>
              <strong>{formato(dados[foco].valor)}</strong>
              {dados[foco].extra && <small>{dados[foco].extra}</small>}
            </div>
          )}
        </div>
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Período</th>
            <th>{rotulo}</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr key={i}>
              <td>{d.rotulo}</td>
              <td>{formato(d.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function niceStep(max) {
  const bruto = max / 4
  const p = 10 ** Math.floor(Math.log10(bruto))
  const n = bruto / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

/** Barras horizontais para comparar categorias (uma cor só, rótulo e valor em texto). */
export function BarrasH({ dados, formato = brl }) {
  const max = Math.max(1, ...dados.map((d) => d.valor))
  return (
    <ul className="sx-barrash">
      {dados.map((d) => (
        <li key={d.rotulo}>
          <span className="sx-barrash-rotulo">{d.rotulo}</span>
          <span className="sx-barrash-trilho">
            <span style={{ width: `${(d.valor / max) * 100}%` }} />
          </span>
          <strong>{formato(d.valor)}</strong>
          {d.extra && <small className="muted">{d.extra}</small>}
        </li>
      ))}
    </ul>
  )
}

/** Toque curto para avisar de pedido novo (sem arquivo de áudio). */
export function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const tocar = (freq, inicio) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, ctx.currentTime + inicio)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + inicio + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + 0.25)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + inicio)
      o.stop(ctx.currentTime + inicio + 0.3)
    }
    tocar(880, 0)
    tocar(1320, 0.18)
    setTimeout(() => ctx.close(), 800)
  } catch {
    /* sem áudio: o aviso visual basta */
  }
}
