'use client'

import { useEffect, useMemo, useState } from 'react'
import { Field, Notice, NumberInput } from '../ui'
import { fetchJson } from '@/lib/apis'
import { brl, fmt, parseNumber } from '@/lib/br'

const MOEDAS = [
  ['USD', 'Dólar americano', '🇺🇸'],
  ['EUR', 'Euro', '🇪🇺'],
  ['GBP', 'Libra esterlina', '🇬🇧'],
  ['ARS', 'Peso argentino', '🇦🇷'],
  ['CLP', 'Peso chileno', '🇨🇱'],
  ['UYU', 'Peso uruguaio', '🇺🇾'],
  ['PYG', 'Guarani paraguaio', '🇵🇾'],
  ['CAD', 'Dólar canadense', '🇨🇦'],
  ['AUD', 'Dólar australiano', '🇦🇺'],
  ['JPY', 'Iene japonês', '🇯🇵'],
  ['CNY', 'Yuan chinês', '🇨🇳'],
  ['CHF', 'Franco suíço', '🇨🇭'],
  ['BTC', 'Bitcoin', '₿'],
]
const IOF_CARTAO = 0.035

export default function ConversorMoedas() {
  const [cot, setCot] = useState(null)
  const [erro, setErro] = useState('')
  const [moeda, setMoeda] = useState('USD')
  const [valor, setValor] = useState('100')
  const [sentido, setSentido] = useState('paraReal')
  const [spread, setSpread] = useState('4')

  useEffect(() => {
    const pares = [...MOEDAS.map(([c]) => `${c}-BRL`), 'USD-BRLT', 'EUR-BRLT'].join(',')
    fetchJson(`https://economia.awesomeapi.com.br/json/last/${pares}`)
      .then(setCot)
      .catch(() => setErro('Não foi possível buscar as cotações agora. Tente de novo em instantes.'))
  }, [])

  const r = useMemo(() => {
    const c = cot?.[`${moeda}BRL`]
    if (!c) return null
    const taxa = Number(c.bid)
    const v = parseNumber(valor) || 0
    const turismo = Number(cot[`${moeda}BRLT`]?.ask ?? 0)
    const reais = sentido === 'paraReal' ? v * taxa : v
    const estrangeira = sentido === 'paraReal' ? v : v / taxa
    // Compra no cartão: cotação do banco (comercial + spread) e IOF de 3,5%.
    const cartao = estrangeira * taxa * (1 + parseNumber(spread) / 100) * (1 + IOF_CARTAO)
    return { taxa, reais, estrangeira, turismo, cartao, variacao: Number(c.pctChange), quando: c.create_date }
  }, [cot, moeda, valor, sentido, spread])

  const info = MOEDAS.find(([c]) => c === moeda)
  const casas = moeda === 'BTC' ? 6 : 2

  return (
    <div className="tool-stack">
      <Notice kind="error">{erro}</Notice>
      <div className="grid-3">
        <Field label="Moeda">
          <select value={moeda} onChange={(e) => setMoeda(e.target.value)}>
            {MOEDAS.map(([c, nome, flag]) => (
              <option key={c} value={c}>{flag} {nome} ({c})</option>
            ))}
          </select>
        </Field>
        <Field label={sentido === 'paraReal' ? `Valor em ${moeda}` : 'Valor em reais (R$)'}>
          <NumberInput value={valor} onChange={(e) => setValor(e.target.value)} />
        </Field>
        <Field label="Converter">
          <select value={sentido} onChange={(e) => setSentido(e.target.value)}>
            <option value="paraReal">{moeda} → Real</option>
            <option value="deReal">Real → {moeda}</option>
          </select>
        </Field>
      </div>
      {r && (
        <>
          <div className="stats">
            <div className="stat highlight">
              <span>{sentido === 'paraReal' ? 'Em reais' : `Em ${info[1].toLowerCase()}`}</span>
              <strong>{sentido === 'paraReal' ? brl(r.reais) : `${info[2]} ${fmt(r.estrangeira, casas)} ${moeda}`}</strong>
            </div>
            <div className="stat"><span>Cotação comercial</span><strong>1 {moeda} = {brl(r.taxa)}</strong></div>
            {r.turismo > 0 && <div className="stat"><span>Turismo (venda)</span><strong>{brl(r.turismo)}</strong></div>}
            <div className="stat"><span>Variação no dia</span><strong className={r.variacao < 0 ? 'neg' : 'pos'}>{r.variacao >= 0 ? '+' : ''}{fmt(r.variacao, 2)}%</strong></div>
          </div>
          {moeda !== 'BTC' && (
            <div className="rows">
              <h2 className="tool-subtitle">Quanto vai sair de verdade numa compra de {fmt(r.estrangeira, 2)} {moeda}</h2>
              <div className="row"><span>Na cotação comercial (sem taxas)</span><strong>{brl(r.estrangeira * r.taxa)}</strong></div>
              {r.turismo > 0 && <div className="row"><span>Comprando em espécie (turismo + IOF 3,5%)</span><strong>{brl(r.estrangeira * r.turismo * (1 + IOF_CARTAO))}</strong></div>}
              <div className="row total"><span>No cartão de crédito internacional (spread + IOF 3,5%)</span><strong>{brl(r.cartao)}</strong></div>
              <Field label="Spread do seu cartão (%)" hint="Margem que o banco cobra sobre o dólar comercial; costuma ficar entre 2% e 6%.">
                <NumberInput value={spread} onChange={(e) => setSpread(e.target.value)} />
              </Field>
            </div>
          )}
          <p className="muted small">Cotações da AwesomeAPI (mercado), atualizadas em {r.quando}. IOF de 3,5% em compras com cartão internacional e compra de moeda em espécie. O valor exato depende da cotação e das taxas do seu banco no dia.</p>
        </>
      )}
      {!r && !erro && (
        <p className="muted">
          <span className="spinner" aria-hidden="true" /> Buscando cotações…
        </p>
      )}
    </div>
  )
}
