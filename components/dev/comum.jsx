'use client'

import { useEffect, useRef, useState } from 'react'

export function Abas({ abas, valor, onChange }) {
  return (
    <div className="dv-abas" role="tablist">
      {abas.map(([id, nome]) => (
        <button key={id} type="button" role="tab" aria-selected={valor === id} onClick={() => onChange(id)}>
          {nome}
        </button>
      ))}
    </div>
  )
}

export function Copiar({ texto, rotulo = 'Copiar', className = '' }) {
  const [ok, setOk] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      const t = document.createElement('textarea')
      t.value = texto
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setOk(true)
    setTimeout(() => setOk(false), 1400)
  }
  return (
    <button type="button" className={`dv-btn dv-btn-sec ${className}`} onClick={copiar} disabled={!texto}>
      {ok ? '✓ Copiado' : rotulo}
    </button>
  )
}

// Área de código com números de linha (a coluna de números rola junto).
export function Codigo({ valor, onChange, placeholder, linhas = 16, somenteLeitura, rotulo, erroLinha }) {
  const ta = useRef(null)
  const nums = useRef(null)
  const total = Math.max(1, String(valor || '').split('\n').length)
  const sync = () => {
    if (nums.current && ta.current) nums.current.scrollTop = ta.current.scrollTop
  }
  useEffect(sync, [valor])
  return (
    <div className="dv-codigo" style={{ '--linhas': linhas }}>
      <div className="dv-codigo-nums" ref={nums} aria-hidden="true">
        {Array.from({ length: Math.min(total, 5000) }, (_, i) => (
          <span key={i} data-erro={erroLinha === i + 1 || undefined}>{i + 1}</span>
        ))}
      </div>
      <textarea
        ref={ta}
        value={valor}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={somenteLeitura}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        aria-label={rotulo}
        onScroll={sync}
        onKeyDown={
          onChange
            ? (e) => {
                if (e.key !== 'Tab') return
                e.preventDefault()
                const el = e.target
                const { selectionStart: a, selectionEnd: b } = el
                const novo = el.value.slice(0, a) + '  ' + el.value.slice(b)
                onChange(novo)
                requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2))
              }
            : undefined
        }
      />
    </div>
  )
}

export function Aviso({ tipo = 'info', children }) {
  return <div className="dv-aviso" data-tipo={tipo}>{children}</div>
}

export function Seg({ valor, opcoes, onChange, rotulo }) {
  return (
    <div className="dv-seg" role="radiogroup" aria-label={rotulo}>
      {opcoes.map(([v, nome]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={valor === v} onClick={() => onChange(v)}>
          {nome}
        </button>
      ))}
    </div>
  )
}

export function usePersistente(chave, inicial) {
  const [v, setV] = useState(inicial)
  const pronto = useRef(false)
  useEffect(() => {
    try {
      const s = localStorage.getItem(chave)
      if (s !== null) setV(JSON.parse(s))
    } catch {}
    pronto.current = true
  }, [chave])
  useEffect(() => {
    if (!pronto.current) return
    try {
      localStorage.setItem(chave, JSON.stringify(v))
    } catch {}
  }, [chave, v])
  return [v, setV]
}

// Mostra o resultado de diffLinhas lado a lado em uma coluna só (estilo git).
export function VerDiff({ partes }) {
  if (!partes.length) return null
  return (
    <pre className="dv-diff">
      {partes.map((p, i) => (
        <div key={i} data-t={p.t}>
          <span className="dv-diff-sinal">{p.t === '+' ? '+' : p.t === '-' ? '−' : ' '}</span>
          {p.linha || ' '}
        </div>
      ))}
    </pre>
  )
}
