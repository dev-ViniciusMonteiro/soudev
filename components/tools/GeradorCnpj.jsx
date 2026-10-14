'use client'

import { useCallback, useEffect, useState } from 'react'
import { CopyButton, Field } from '../ui'
import { formatCnpj, gerarCnpj, limparCnpj, validarCnpj } from '@/lib/br'

export default function GeradorCnpj() {
  const [quantidade, setQuantidade] = useState('5')
  const [tipo, setTipo] = useState('numerico')
  const [matriz, setMatriz] = useState(true)
  const [pontuacao, setPontuacao] = useState(true)
  const [lista, setLista] = useState(() => Array(5).fill(''))
  const [consulta, setConsulta] = useState('')

  const gerar = useCallback(() => {
    const n = Math.min(100, Math.max(1, Number(quantidade) || 1))
    setLista(Array.from({ length: n }, () => gerarCnpj({ alfanumerico: tipo === 'alfanumerico', matriz })))
  }, [quantidade, tipo, matriz])
  useEffect(gerar, [gerar])

  const formatted = lista.map((cnpj) => (pontuacao ? formatCnpj(cnpj) : cnpj))
  const limpo = limparCnpj(consulta)
  const valido = validarCnpj(consulta)

  return (
    <div className="tool-split">
      <div className="tool-form">
        <h2 className="tool-subtitle">Gerar CNPJ</h2>
        <div className="grid-2">
          <Field label="Formato">
            <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
              <option value="numerico">Numérico (atual)</option>
              <option value="alfanumerico">Alfanumérico (2026)</option>
            </select>
          </Field>
          <Field label="Quantidade">
            <select value={quantidade} onChange={(event) => setQuantidade(event.target.value)}>
              {['1', '5', '10', '20', '50', '100'].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={matriz} onChange={(event) => setMatriz(event.target.checked)} />
          Matriz (final 0001)
        </label>
        <label className="check">
          <input type="checkbox" checked={pontuacao} onChange={(event) => setPontuacao(event.target.checked)} />
          Com pontuação
        </label>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={gerar}>Gerar novamente</button>
          <CopyButton text={formatted.join('\n')} label="Copiar todos" />
        </div>
        <hr />
        <h2 className="tool-subtitle">Validar CNPJ</h2>
        <Field label="CNPJ (numérico ou alfanumérico)">
          <input value={consulta} onChange={(event) => setConsulta(event.target.value)} placeholder="12.ABC.345/01DE-35" />
        </Field>
        {consulta && (
          <p className={`notice ${valido ? 'ok' : 'error'}`}>
            {valido ? `CNPJ ${/[A-Z]/.test(limpo) ? 'alfanumérico' : 'numérico'} válido ✔` : 'CNPJ inválido ✘'}
          </p>
        )}
      </div>
      <div className="tool-result">
        <ul className="output-list mono">
          {formatted.map((cnpj, index) => (
            <li key={`${cnpj}-${index}`}>
              <span>{cnpj || '\u00a0'}</span>
              <CopyButton text={cnpj} />
            </li>
          ))}
        </ul>
        <p className="muted small">
          No CNPJ alfanumérico, as 12 primeiras posições aceitam letras e números. O dígito verificador usa o código ASCII de cada caractere menos 48. Use apenas para testes.
        </p>
      </div>
    </div>
  )
}
