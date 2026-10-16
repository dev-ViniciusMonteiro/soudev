'use client'

import { useEffect, useMemo, useState } from 'react'
import { Field, Notice, NumberInput } from '../ui'
import { fetchJson } from '@/lib/apis'
import { brl, fmt, parseNumber } from '@/lib/br'

// Séries do Banco Central (SGS): Selic meta, CDI anualizado, IPCA 12 meses e rendimento mensal da poupança.
const SERIES = { selic: 432, cdi: 4389, ipca: 13522, poupanca: 195 }
const PADRAO = { selic: 13.75, cdi: 13.65, ipca: 4.5, poupanca: 0.67 }

const aliquotaIR = (dias) => (dias <= 180 ? 0.225 : dias <= 360 ? 0.2 : dias <= 720 ? 0.175 : 0.15)

export default function OndeInvestir() {
  const [taxas, setTaxas] = useState(null)
  const [fonte, setFonte] = useState('')
  const [form, setForm] = useState({ valor: '10.000', meses: '12', cdb: '100', lci: '90', ipcaMais: '6,5', inflacao: '' })
  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.value }))

  useEffect(() => {
    let vivo = true
    Promise.all(
      Object.entries(SERIES).map(([k, cod]) =>
        fetchJson(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados/ultimos/1?formato=json`, { timeout: 10000 }).then((r) => [k, Number(r[0].valor), r[0].data]),
      ),
    )
      .then((lista) => {
        if (!vivo) return
        setTaxas(Object.fromEntries(lista.map(([k, v]) => [k, v])))
        setFonte(`Banco Central, atualizado em ${lista.find(([k]) => k === 'cdi')?.[2] ?? ''}`)
      })
      .catch(() => {
        if (!vivo) return
        setTaxas(PADRAO)
        setFonte('Não foi possível buscar as taxas do Banco Central agora: usando valores aproximados.')
      })
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    if (taxas && !form.inflacao) setForm((c) => ({ ...c, inflacao: fmt(taxas.ipca, 2) }))
  }, [taxas, form.inflacao])

  const sim = useMemo(() => {
    if (!taxas) return null
    const valor = parseNumber(form.valor)
    const meses = Math.round(parseNumber(form.meses))
    if (!(valor > 0) || !(meses > 0) || meses > 600) return null
    const anos = meses / 12
    const dias = Math.round(meses * 30.44)
    const ir = aliquotaIR(dias)
    const cdi = taxas.cdi / 100
    const inflacao = (parseNumber(form.inflacao) || taxas.ipca) / 100
    const cresce = (taxaAno) => valor * (1 + taxaAno) ** anos
    const comIR = (bruto, custos = 0) => {
      const ganho = Math.max(0, bruto - valor - custos)
      return valor + ganho * (1 - ir)
    }
    const custodia = (bruto, isento = 0) => Math.max(0, (valor + bruto) / 2 - isento) * 0.002 * anos

    const linhas = []
    const poup = valor * (1 + taxas.poupanca / 100) ** meses
    linhas.push({ nome: 'Poupança', liquido: poup, bruto: poup, obs: 'Isenta de IR, rende por mês completo' })
    const brutoCdb = cresce(cdi * (parseNumber(form.cdb) / 100))
    linhas.push({ nome: `CDB ${form.cdb}% do CDI`, liquido: comIR(brutoCdb), bruto: brutoCdb, obs: `IR de ${fmt(ir * 100, 1)}% sobre o lucro • FGC até R$ 250 mil` })
    const brutoLci = cresce(cdi * (parseNumber(form.lci) / 100))
    linhas.push({ nome: `LCI/LCA ${form.lci}% do CDI`, liquido: brutoLci, bruto: brutoLci, obs: 'Isenta de IR • FGC • costuma ter prazo mínimo' })
    const brutoSelic = cresce(taxas.selic / 100 - 0.001)
    const custoSelic = custodia(brutoSelic, 10000)
    linhas.push({ nome: 'Tesouro Selic', liquido: comIR(brutoSelic, custoSelic), bruto: brutoSelic, obs: 'IR regressivo • taxa B3 de 0,20% a.a. acima de R$ 10 mil' })
    const real = parseNumber(form.ipcaMais) / 100
    const brutoIpca = cresce((1 + real) * (1 + inflacao) - 1)
    const custoIpca = custodia(brutoIpca)
    linhas.push({ nome: `Tesouro IPCA+ ${form.ipcaMais}%`, liquido: comIR(brutoIpca, custoIpca), bruto: brutoIpca, obs: 'Protege da inflação se levado até o vencimento • taxa B3 0,20% a.a.' })

    const inflacaoTotal = (1 + inflacao) ** anos
    for (const l of linhas) {
      l.lucro = l.liquido - valor
      l.real = (l.liquido / inflacaoTotal / valor - 1) * 100
    }
    linhas.sort((a, b) => b.liquido - a.liquido)
    return { linhas, valor, ir, dias, max: linhas[0].liquido }
  }, [taxas, form])

  return (
    <div className="tool-stack">
      {taxas && (
        <div className="stats">
          <div className="stat"><span>Selic</span><strong>{fmt(taxas.selic, 2)}% a.a.</strong></div>
          <div className="stat"><span>CDI</span><strong>{fmt(taxas.cdi, 2)}% a.a.</strong></div>
          <div className="stat"><span>IPCA (12 meses)</span><strong>{fmt(taxas.ipca, 2)}%</strong></div>
          <div className="stat"><span>Poupança</span><strong>{fmt(taxas.poupanca, 4)}% a.m.</strong></div>
        </div>
      )}
      <p className="muted small">{fonte || 'Buscando as taxas do Banco Central…'}</p>
      <div className="grid-3">
        <Field label="Quanto vai investir (R$)"><NumberInput value={form.valor} onChange={set('valor')} /></Field>
        <Field label="Por quantos meses"><NumberInput value={form.meses} onChange={set('meses')} /></Field>
        <Field label="Inflação esperada (% ao ano)" hint="Começa com o IPCA dos últimos 12 meses."><NumberInput value={form.inflacao} onChange={set('inflacao')} /></Field>
        <Field label="CDB paga (% do CDI)"><NumberInput value={form.cdb} onChange={set('cdb')} /></Field>
        <Field label="LCI/LCA paga (% do CDI)"><NumberInput value={form.lci} onChange={set('lci')} /></Field>
        <Field label="Tesouro IPCA+ (taxa real % a.a.)"><NumberInput value={form.ipcaMais} onChange={set('ipcaMais')} /></Field>
      </div>
      {sim ? (
        <>
          <div className="verdict ok">
            <strong>Rende mais: {sim.linhas[0].nome}</strong>
            <span>{brl(sim.linhas[0].liquido)} no fim de {form.meses} meses, já descontado o imposto ({brl(sim.linhas[0].lucro)} de lucro).</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Investimento</th><th>Valor final líquido</th><th>Lucro</th><th>Ganho real</th></tr>
              </thead>
              <tbody>
                {sim.linhas.map((l) => (
                  <tr key={l.nome}>
                    <td>
                      <strong>{l.nome}</strong>
                      <div className="bar"><span style={{ width: `${(l.liquido / sim.max) * 100}%` }} /></div>
                      <small className="muted">{l.obs}</small>
                    </td>
                    <td>{brl(l.liquido)}</td>
                    <td>{brl(l.lucro)}</td>
                    <td className={l.real < 0 ? 'neg' : ''}>{fmt(l.real, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notice kind="info">
            "Ganho real" é quanto o dinheiro cresceu acima da inflação: se for negativo, você perdeu poder de compra. IR pela tabela regressiva ({fmt(sim.ir * 100, 1)}% para {sim.dias} dias). Simulação com taxas constantes; rentabilidade passada não garante a futura.
          </Notice>
        </>
      ) : (
        taxas && <Notice kind="warn">Informe um valor e um prazo (até 600 meses).</Notice>
      )}
    </div>
  )
}
