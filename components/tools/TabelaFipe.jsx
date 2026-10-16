'use client'

import { useEffect, useMemo, useState } from 'react'
import { Field, Notice, NumberInput } from '../ui'
import { fetchJson } from '@/lib/apis'
import { brl, parseNumber } from '@/lib/br'

const API = 'https://parallelum.com.br/fipe/api/v1'
const TIPOS = [
  ['carros', 'Carros'],
  ['motos', 'Motos'],
  ['caminhoes', 'Caminhões'],
]
const valorNumero = (v) => parseNumber(String(v).replace(/[^\d,.-]/g, ''))

export default function TabelaFipe() {
  const [tipo, setTipo] = useState('carros')
  const [marcas, setMarcas] = useState([])
  const [marca, setMarca] = useState('')
  const [modelos, setModelos] = useState([])
  const [filtro, setFiltro] = useState('')
  const [modelo, setModelo] = useState('')
  const [anos, setAnos] = useState([])
  const [ano, setAno] = useState('')
  const [preco, setPreco] = useState(null)
  const [anunciado, setAnunciado] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = async (url, set) => {
    setBusy(true)
    setErro('')
    try {
      set(await fetchJson(url, { timeout: 15000 }))
    } catch {
      setErro('A tabela FIPE não respondeu agora. Tente de novo em instantes.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setMarcas([])
    setMarca('')
    void carregar(`${API}/${tipo}/marcas`, setMarcas)
  }, [tipo])
  useEffect(() => {
    setModelos([])
    setModelo('')
    setFiltro('')
    if (marca) void carregar(`${API}/${tipo}/marcas/${marca}/modelos`, (r) => setModelos(r.modelos ?? []))
  }, [tipo, marca])
  useEffect(() => {
    setAnos([])
    setAno('')
    if (modelo) void carregar(`${API}/${tipo}/marcas/${marca}/modelos/${modelo}/anos`, setAnos)
  }, [tipo, marca, modelo])
  useEffect(() => {
    setPreco(null)
    if (ano) void carregar(`${API}/${tipo}/marcas/${marca}/modelos/${modelo}/anos/${ano}`, setPreco)
  }, [tipo, marca, modelo, ano])

  const visiveis = useMemo(() => {
    const termo = filtro.trim().toLowerCase()
    return termo ? modelos.filter((m) => m.nome.toLowerCase().includes(termo)) : modelos
  }, [modelos, filtro])

  const fipe = preco ? valorNumero(preco.Valor) : 0
  const pedido = parseNumber(anunciado)
  const diff = fipe && pedido > 0 ? (pedido - fipe) / fipe : null

  return (
    <div className="tool-stack">
      <div className="chips">
        {TIPOS.map(([id, nome]) => (
          <button key={id} type="button" className={tipo === id ? 'chip active' : 'chip'} onClick={() => setTipo(id)}>{nome}</button>
        ))}
      </div>
      <div className="grid-2">
        <Field label="Marca">
          <select value={marca} onChange={(e) => setMarca(e.target.value)} disabled={!marcas.length}>
            <option value="">{marcas.length ? 'Escolha a marca' : 'Carregando…'}</option>
            {marcas.map((m) => (
              <option key={m.codigo} value={m.codigo}>{m.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Filtrar modelo" hint={modelos.length ? `${visiveis.length} de ${modelos.length} modelos` : ''}>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Ex.: Onix 1.0" disabled={!modelos.length} />
        </Field>
        <Field label="Modelo">
          <select value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={!modelos.length}>
            <option value="">{marca ? (modelos.length ? 'Escolha o modelo' : 'Carregando…') : 'Escolha a marca primeiro'}</option>
            {visiveis.map((m) => (
              <option key={m.codigo} value={m.codigo}>{m.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Ano e combustível">
          <select value={ano} onChange={(e) => setAno(e.target.value)} disabled={!anos.length}>
            <option value="">{modelo ? (anos.length ? 'Escolha o ano' : 'Carregando…') : 'Escolha o modelo primeiro'}</option>
            {anos.map((a) => (
              <option key={a.codigo} value={a.codigo}>{a.nome.replace(/^32000/, 'Zero km')}</option>
            ))}
          </select>
        </Field>
      </div>
      {busy && (
        <p className="muted">
          <span className="spinner" aria-hidden="true" /> Consultando a tabela FIPE…
        </p>
      )}
      <Notice kind="error">{erro}</Notice>
      {preco && (
        <>
          <div className="stats">
            <div className="stat highlight"><span>Preço médio FIPE</span><strong>{preco.Valor}</strong></div>
            <div className="stat"><span>Referência</span><strong>{preco.MesReferencia?.trim()}</strong></div>
            <div className="stat"><span>Código FIPE</span><strong>{preco.CodigoFipe}</strong></div>
            <div className="stat"><span>Combustível</span><strong>{preco.Combustivel}</strong></div>
          </div>
          <p className="muted">{preco.Marca} {preco.Modelo} • {preco.AnoModelo === 32000 ? 'Zero km' : preco.AnoModelo}</p>
          <Field label="Preço do anúncio (opcional)" hint="Compare o valor pedido com a FIPE.">
            <NumberInput value={anunciado} onChange={(e) => setAnunciado(e.target.value)} placeholder="R$ 0,00" />
          </Field>
          {diff !== null && (
            <div className={`verdict ${diff < -0.25 ? 'danger' : diff > 0.1 ? 'warn' : 'ok'}`}>
              <strong>{diff >= 0 ? `${Math.round(diff * 100)}% acima da FIPE` : `${Math.round(-diff * 100)}% abaixo da FIPE`} ({brl(pedido - fipe)})</strong>
              <span>
                {diff < -0.25
                  ? 'Preço bem abaixo do mercado é a isca mais comum do golpe do carro. Nunca pague sinal ou "reserva" antes de ver o carro e a documentação pessoalmente, e desconfie de intermediários.'
                  : diff > 0.1
                    ? 'Acima da média: dá para negociar, a não ser que tenha baixa quilometragem, opcionais ou estado excelente.'
                    : 'Preço dentro do normal para o mercado.'}
              </span>
            </div>
          )}
          <p className="muted small">A FIPE é a média de preços anunciados no país. O valor real varia com quilometragem, estado, cor, região e histórico (consulte multas, leilão e sinistro antes de fechar).</p>
        </>
      )}
    </div>
  )
}
