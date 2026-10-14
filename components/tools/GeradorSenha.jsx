'use client'

import { useCallback, useEffect, useState } from 'react'
import { CopyButton, Field } from '../ui'
import { randomInt } from '@/lib/br'

const SETS = {
  upper: ['Letras maiúsculas', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  lower: ['Letras minúsculas', 'abcdefghijklmnopqrstuvwxyz'],
  digits: ['Números', '0123456789'],
  symbols: ['Símbolos', '!@#$%&*()-_=+[]{};:,.?/'],
}
const AMBIGUOS = /[O0Il1|]/g

function gerar(length, options) {
  const pools = Object.entries(SETS)
    .filter(([key]) => options[key])
    .map(([, [, chars]]) => (options.noAmbiguous ? chars.replace(AMBIGUOS, '') : chars))
  if (!pools.length) return ''
  const all = pools.join('')
  for (;;) {
    const password = Array.from({ length }, () => all[randomInt(all.length)]).join('')
    if (length < pools.length || pools.every((pool) => [...password].some((char) => pool.includes(char)))) return password
  }
}

function forca(length, options) {
  const size = Object.entries(SETS)
    .filter(([key]) => options[key])
    .reduce((total, [, [, chars]]) => total + (options.noAmbiguous ? chars.replace(AMBIGUOS, '') : chars).length, 0)
  const bits = size ? Math.round(length * Math.log2(size)) : 0
  if (bits < 40) return { bits, label: 'Fraca', tone: 'bad' }
  if (bits < 64) return { bits, label: 'Razoável', tone: 'warn' }
  if (bits < 90) return { bits, label: 'Forte', tone: 'ok' }
  return { bits, label: 'Muito forte', tone: 'ok' }
}

export default function GeradorSenha() {
  const [length, setLength] = useState(16)
  const [options, setOptions] = useState({ upper: true, lower: true, digits: true, symbols: true, noAmbiguous: false })
  const [passwords, setPasswords] = useState(() => Array(5).fill(''))

  const generate = useCallback(() => setPasswords(Array.from({ length: 5 }, () => gerar(length, options))), [length, options])
  useEffect(generate, [generate])

  const strength = forca(length, options)
  const toggle = (key) => setOptions((current) => ({ ...current, [key]: !current[key] }))

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label={`Tamanho: ${length} caracteres`}>
          <input type="range" min="4" max="64" value={length} onChange={(event) => setLength(Number(event.target.value))} />
        </Field>
        {Object.entries(SETS).map(([key, [label]]) => (
          <label key={key} className="check">
            <input type="checkbox" checked={options[key]} onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
        <label className="check">
          <input type="checkbox" checked={options.noAmbiguous} onChange={() => toggle('noAmbiguous')} />
          Evitar caracteres parecidos (O, 0, I, l, 1)
        </label>
        <button type="button" className="btn btn-primary" onClick={generate}>Gerar novas senhas</button>
      </div>
      <div className="tool-result">
        <p className={`strength ${strength.tone}`}>
          Força: <strong>{strength.label}</strong> ({strength.bits} bits de entropia)
        </p>
        {Object.keys(SETS).some((key) => options[key]) ? (
          <ul className="output-list mono">
            {passwords.map((password, index) => (
              <li key={`${password}-${index}`}>
                <span>{password || '\u00a0'}</span>
                <CopyButton text={password} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice warn">Selecione pelo menos um tipo de caractere.</p>
        )}
        <p className="muted small">As senhas são criadas no seu navegador com criptografia segura e não são salvas nem enviadas.</p>
      </div>
    </div>
  )
}
