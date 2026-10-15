'use client'

import { useState } from 'react'
import { CopyButton, Field, Notice, Tabs } from '../ui'
import { onlyDigits } from '@/lib/br'

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

const formatCep = (cep) => onlyDigits(cep).replace(/^(\d{5})(\d{3})$/, '$1-$2')
const enderecoCompleto = (e) =>
  [e.logradouro, e.complemento, e.bairro, `${e.localidade}/${e.uf}`, `CEP ${e.cep}`].filter(Boolean).join(', ')

async function viacep(path) {
  const response = await fetch(`https://viacep.com.br/ws/${path}/json/`)
  if (!response.ok) throw new Error('consulta')
  return response.json()
}

function PorCep() {
  const [cep, setCep] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const search = async (event) => {
    event.preventDefault()
    const digits = onlyDigits(cep)
    setResult(null)
    setError('')
    if (digits.length !== 8) return setError('O CEP precisa ter 8 números.')
    setBusy(true)
    try {
      const data = await viacep(digits)
      if (data.erro) setError('CEP não encontrado. Confira os números.')
      else setResult(data)
    } catch {
      setError('Não foi possível consultar agora. Verifique sua conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-split">
      <form className="tool-form" onSubmit={search}>
        <Field label="CEP">
          <input value={cep} onChange={(event) => setCep(formatCep(event.target.value) || event.target.value)} inputMode="numeric" placeholder="01001-000" maxLength={9} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Buscando…' : 'Buscar endereço'}</button>
      </form>
      <div className="tool-result">
        <Notice kind="error">{error}</Notice>
        {result ? (
          <>
            <div className="rows">
              {[
                ['CEP', result.cep],
                ['Logradouro', result.logradouro || '— (CEP geral do município)'],
                ['Complemento', result.complemento],
                ['Bairro', result.bairro],
                ['Cidade', result.localidade],
                ['Estado', `${result.estado ? `${result.estado} ` : ''}(${result.uf})`],
                ['DDD', result.ddd],
                ['Código IBGE', result.ibge],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
            </div>
            <div className="actions">
              <CopyButton text={enderecoCompleto(result)} label="Copiar endereço completo" />
            </div>
          </>
        ) : (
          !error && <p className="muted">Digite um CEP para ver o endereço.</p>
        )}
      </div>
    </div>
  )
}

function PorEndereco() {
  const [f, setF] = useState({ uf: 'SP', cidade: '', rua: '' })
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }))

  const search = async (event) => {
    event.preventDefault()
    setResults(null)
    setError('')
    if (f.cidade.trim().length < 3 || f.rua.trim().length < 3) return setError('Digite pelo menos 3 letras da cidade e da rua.')
    setBusy(true)
    try {
      const data = await viacep(`${f.uf}/${encodeURIComponent(f.cidade.trim())}/${encodeURIComponent(f.rua.trim())}`)
      if (!Array.isArray(data) || !data.length) setError('Nenhum CEP encontrado. Confira a grafia ou tente só parte do nome da rua.')
      else setResults(data)
    } catch {
      setError('Não foi possível consultar agora. Verifique sua conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-stack">
      <form className="grid-3" onSubmit={search}>
        <Field label="Estado">
          <select value={f.uf} onChange={set('uf')}>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </Field>
        <Field label="Cidade">
          <input value={f.cidade} onChange={set('cidade')} placeholder="São Paulo" />
        </Field>
        <Field label="Rua, avenida…">
          <input value={f.rua} onChange={set('rua')} placeholder="Paulista" />
        </Field>
        <div className="actions span-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Buscando…' : 'Buscar CEP'}</button>
        </div>
      </form>
      <Notice kind="error">{error}</Notice>
      {results && (
        <>
          <p className="muted small">{results.length} resultado(s){results.length >= 50 ? ' (mostrando os 50 primeiros; refine a busca)' : ''}.</p>
          <ul className="output-list">
            {results.map((item) => (
              <li key={`${item.cep}-${item.logradouro}-${item.complemento}`}>
                <span>
                  <strong className="mono">{item.cep}</strong> · {[item.logradouro, item.complemento, item.bairro].filter(Boolean).join(', ')}
                </span>
                <CopyButton text={item.cep} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default function ConsultaCep() {
  const [mode, setMode] = useState('cep')
  return (
    <div className="tool-stack">
      <Tabs tabs={[['cep', 'Buscar endereço pelo CEP'], ['endereco', 'Buscar CEP pelo endereço']]} value={mode} onChange={setMode} />
      {mode === 'cep' ? <PorCep /> : <PorEndereco />}
    </div>
  )
}
