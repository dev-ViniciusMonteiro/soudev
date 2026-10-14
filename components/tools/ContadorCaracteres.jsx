'use client'

import { useState } from 'react'
import { CopyButton, Stats } from '../ui'
import { fmt } from '@/lib/br'

const LIMITES = [
  ['Título SEO', 60],
  ['Meta description', 160],
  ['Post no X', 280],
  ['Bio do Instagram', 150],
  ['Legenda do Instagram', 2200],
]

const semAcentos = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '')
const capitalizar = (text) => text.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toLocaleUpperCase('pt-BR'))
const frase = (text) => text.toLocaleLowerCase('pt-BR').replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('pt-BR'))

const TRANSFORMS = [
  ['MAIÚSCULAS', (t) => t.toLocaleUpperCase('pt-BR')],
  ['minúsculas', (t) => t.toLocaleLowerCase('pt-BR')],
  ['Capitalizar Palavras', capitalizar],
  ['Tipo frase', frase],
  ['Remover acentos', semAcentos],
  ['Remover espaços extras', (t) => t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()],
  ['Remover quebras de linha', (t) => t.replace(/\s*\n+\s*/g, ' ').trim()],
]

export default function ContadorCaracteres() {
  const [text, setText] = useState('')

  const palavras = text.trim() ? text.trim().split(/\s+/).length : 0
  const frases = text.trim() ? (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).filter((s) => s.trim()).length : 0
  const paragrafos = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0
  const linhas = text ? text.split('\n').length : 0
  const leitura = Math.ceil(palavras / 200)

  return (
    <div className="tool-stack">
      <textarea className="big-textarea" rows={10} value={text} onChange={(event) => setText(event.target.value)} placeholder="Cole ou digite seu texto aqui…" />
      <Stats
        items={[
          ['Caracteres', fmt(text.length, 0), true],
          ['Sem espaços', fmt(text.replace(/\s/g, '').length, 0)],
          ['Palavras', fmt(palavras, 0)],
          ['Frases', fmt(frases, 0)],
          ['Parágrafos', fmt(paragrafos, 0)],
          ['Linhas', fmt(linhas, 0)],
        ]}
      />
      <p className="muted small">Tempo de leitura: cerca de {leitura} min.</p>
      <div className="chips">
        {TRANSFORMS.map(([label, fn]) => (
          <button key={label} type="button" className="chip" onClick={() => setText(fn(text))} disabled={!text}>
            {label}
          </button>
        ))}
        <CopyButton text={text} className="chip" label="Copiar texto" />
        <button type="button" className="chip" onClick={() => setText('')} disabled={!text}>Limpar</button>
      </div>
      <div className="limits">
        {LIMITES.map(([label, max]) => {
          const pct = Math.min(100, (text.length / max) * 100)
          const over = text.length > max
          return (
            <div key={label} className={over ? 'limit over' : 'limit'}>
              <span>{label}</span>
              <span className="limit-bar"><span style={{ width: `${pct}%` }} /></span>
              <span>{fmt(text.length, 0)}/{fmt(max, 0)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
