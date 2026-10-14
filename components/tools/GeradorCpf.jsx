'use client'

import { useCallback, useEffect, useState } from 'react'
import { CopyButton, Field } from '../ui'
import { CPF_REGIOES, formatCpf, gerarCpf, validarCpf } from '@/lib/br'

export default function GeradorCpf() {
  const [quantidade, setQuantidade] = useState('5')
  const [regiao, setRegiao] = useState('')
  const [pontuacao, setPontuacao] = useState(true)
  const [lista, setLista] = useState(() => Array(5).fill(''))
  const [consulta, setConsulta] = useState('')

  const gerar = useCallback(() => {
    const n = Math.min(100, Math.max(1, Number(quantidade) || 1))
    setLista(Array.from({ length: n }, () => gerarCpf(regiao === '' ? null : Number(regiao))))
  }, [quantidade, regiao])
  useEffect(gerar, [gerar])

  const formatted = lista.map((cpf) => (pontuacao ? formatCpf(cpf) : cpf))
  const valido = validarCpf(consulta)

  return (
    <div className="tool-split">
      <div className="tool-form">
        <h2 className="tool-subtitle">Gerar CPF</h2>
        <div className="grid-2">
          <Field label="Quantidade">
            <select value={quantidade} onChange={(event) => setQuantidade(event.target.value)}>
              {['1', '5', '10', '20', '50', '100'].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Estado de emissão">
            <select value={regiao} onChange={(event) => setRegiao(event.target.value)}>
              <option value="">Qualquer</option>
              {CPF_REGIOES.map((r) => (
                <option key={r.digit} value={r.digit}>{r.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={pontuacao} onChange={(event) => setPontuacao(event.target.checked)} />
          Com pontuação
        </label>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={gerar}>Gerar novamente</button>
          <CopyButton text={formatted.join('\n')} label="Copiar todos" />
        </div>
        <hr />
        <h2 className="tool-subtitle">Validar CPF</h2>
        <Field label="CPF">
          <input value={consulta} onChange={(event) => setConsulta(event.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
        </Field>
        {consulta && <p className={`notice ${valido ? 'ok' : 'error'}`}>{valido ? 'CPF válido ✔' : 'CPF inválido ✘'}</p>}
      </div>
      <div className="tool-result">
        <ul className="output-list mono">
          {formatted.map((cpf, index) => (
            <li key={`${cpf}-${index}`}>
              <span>{cpf || '\u00a0'}</span>
              <CopyButton text={cpf} />
            </li>
          ))}
        </ul>
        <p className="muted small">Números fictícios, válidos apenas pelo dígito verificador. Use somente para testes de software.</p>
      </div>
    </div>
  )
}
