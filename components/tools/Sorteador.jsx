'use client'

import { useState } from 'react'
import { CopyButton, Field, Notice, NumberInput, Tabs } from '../ui'
import { fmt, randomInt } from '@/lib/br'

function embaralhar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

const parseLista = (texto, removerDuplicados) => {
  const itens = texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
  if (!removerDuplicados) return itens
  const vistos = new Set()
  return itens.filter((item) => {
    const chave = item.toLocaleLowerCase('pt-BR')
    if (vistos.has(chave)) return false
    vistos.add(chave)
    return true
  })
}

function Numeros() {
  const [f, setF] = useState({ min: '1', max: '100', qtd: '1' })
  const [repetir, setRepetir] = useState(false)
  const [ordenar, setOrdenar] = useState(false)
  const [result, setResult] = useState([])
  const [error, setError] = useState('')
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }))

  const sortear = () => {
    const min = Math.trunc(Number(f.min))
    const max = Math.trunc(Number(f.max))
    const qtd = Math.trunc(Number(f.qtd))
    setError('')
    if (![min, max, qtd].every(Number.isFinite) || min > max || qtd < 1) return setError('Confira o intervalo e a quantidade.')
    const range = max - min + 1
    if (!repetir && qtd > range) return setError(`Sem repetição, dá para sortear no máximo ${fmt(range, 0)} números nesse intervalo.`)
    if (qtd > 10000) return setError('Sorteie no máximo 10.000 números por vez.')
    const sorteados = []
    const usados = new Set()
    while (sorteados.length < qtd) {
      const n = min + randomInt(range)
      if (!repetir && usados.has(n)) continue
      usados.add(n)
      sorteados.push(n)
    }
    setResult(ordenar ? sorteados.sort((a, b) => a - b) : sorteados)
  }

  return (
    <div className="tool-split">
      <div className="tool-form">
        <div className="grid-3">
          <Field label="De">
            <NumberInput value={f.min} onChange={set('min')} inputMode="numeric" />
          </Field>
          <Field label="Até">
            <NumberInput value={f.max} onChange={set('max')} inputMode="numeric" />
          </Field>
          <Field label="Quantidade">
            <NumberInput value={f.qtd} onChange={set('qtd')} inputMode="numeric" />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={repetir} onChange={(event) => setRepetir(event.target.checked)} />
          Permitir números repetidos
        </label>
        <label className="check">
          <input type="checkbox" checked={ordenar} onChange={(event) => setOrdenar(event.target.checked)} />
          Mostrar em ordem crescente
        </label>
        <button type="button" className="btn btn-primary btn-lg" onClick={sortear}>Sortear</button>
      </div>
      <div className="tool-result">
        <Notice kind="error">{error}</Notice>
        <Resultado itens={result.map(String)} vazio="Os números sorteados aparecem aqui." />
      </div>
    </div>
  )
}

function Nomes() {
  const [texto, setTexto] = useState('')
  const [qtd, setQtd] = useState('1')
  const [duplicados, setDuplicados] = useState(true)
  const [result, setResult] = useState([])
  const [error, setError] = useState('')
  const lista = parseLista(texto, duplicados)

  const sortear = () => {
    const n = Math.trunc(Number(qtd))
    setError('')
    if (lista.length < 1) return setError('Cole a lista de participantes, um por linha.')
    if (!(n >= 1) || n > lista.length) return setError(`Escolha entre 1 e ${lista.length} ganhador(es).`)
    setResult(embaralhar(lista).slice(0, n))
  }

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label={`Participantes (um por linha) · ${lista.length} válido(s)`}>
          <textarea rows={9} value={texto} onChange={(event) => setTexto(event.target.value)} placeholder={'Ana\nBruno\n@carla\nDiego'} />
        </Field>
        <div className="grid-2">
          <Field label="Quantos ganhadores?">
            <NumberInput value={qtd} onChange={(event) => setQtd(event.target.value)} inputMode="numeric" />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={duplicados} onChange={(event) => setDuplicados(event.target.checked)} />
          Remover nomes duplicados (útil para comentários do Instagram)
        </label>
        <button type="button" className="btn btn-primary btn-lg" onClick={sortear}>Sortear</button>
      </div>
      <div className="tool-result">
        <Notice kind="error">{error}</Notice>
        <Resultado itens={result} numerado vazio="Os ganhadores aparecem aqui, em ordem de sorteio." />
      </div>
    </div>
  )
}

function Grupos() {
  const [texto, setTexto] = useState('')
  const [modo, setModo] = useState('quantidade')
  const [valor, setValor] = useState('2')
  const [grupos, setGrupos] = useState([])
  const [error, setError] = useState('')
  const lista = parseLista(texto, true)

  const dividir = () => {
    const n = Math.trunc(Number(valor))
    setError('')
    if (lista.length < 2) return setError('Cole pelo menos 2 nomes, um por linha.')
    if (!(n >= 1)) return setError('Informe um número válido.')
    const total = modo === 'quantidade' ? Math.min(n, lista.length) : Math.ceil(lista.length / n)
    const result = Array.from({ length: total }, () => [])
    embaralhar(lista).forEach((nome, index) => result[index % total].push(nome))
    setGrupos(result)
  }

  const texto2 = grupos.map((g, i) => `Grupo ${i + 1}: ${g.join(', ')}`).join('\n')

  return (
    <div className="tool-split">
      <div className="tool-form">
        <Field label={`Nomes (um por linha) · ${lista.length}`}>
          <textarea rows={9} value={texto} onChange={(event) => setTexto(event.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="Dividir por">
            <select value={modo} onChange={(event) => setModo(event.target.value)}>
              <option value="quantidade">Número de grupos</option>
              <option value="tamanho">Pessoas por grupo</option>
            </select>
          </Field>
          <Field label={modo === 'quantidade' ? 'Quantos grupos?' : 'Pessoas por grupo'}>
            <NumberInput value={valor} onChange={(event) => setValor(event.target.value)} inputMode="numeric" />
          </Field>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={dividir}>Dividir em grupos</button>
      </div>
      <div className="tool-result">
        <Notice kind="error">{error}</Notice>
        {grupos.length ? (
          <>
            <div className="groups">
              {grupos.map((grupo, index) => (
                <div key={index} className="group">
                  <strong>Grupo {index + 1}</strong>
                  <span>{grupo.join(', ')}</span>
                </div>
              ))}
            </div>
            <CopyButton text={texto2} label="Copiar grupos" />
          </>
        ) : (
          <p className="muted">Os grupos aparecem aqui.</p>
        )}
      </div>
    </div>
  )
}

function Resultado({ itens, numerado = false, vazio }) {
  if (!itens.length) return <p className="muted">{vazio}</p>
  return (
    <>
      <div className="draw-result" aria-live="polite">
        {itens.map((item, index) => (
          <span key={`${item}-${index}`} className="draw-item">
            {numerado && <small>{index + 1}º</small>}
            {item}
          </span>
        ))}
      </div>
      <CopyButton text={itens.join('\n')} label="Copiar resultado" />
    </>
  )
}

export default function Sorteador() {
  const [mode, setMode] = useState('numeros')
  return (
    <div className="tool-stack">
      <Tabs tabs={[['numeros', 'Números'], ['nomes', 'Nomes'], ['grupos', 'Grupos']]} value={mode} onChange={setMode} />
      {mode === 'numeros' && <Numeros />}
      {mode === 'nomes' && <Nomes />}
      {mode === 'grupos' && <Grupos />}
    </div>
  )
}
