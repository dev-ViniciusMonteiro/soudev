'use client'

import { useState } from 'react'
import { CopyButton, Field, Notice, NumberInput } from '../ui'
import { BRASIL_API, fetchJson } from '@/lib/apis'
import { lerBoleto } from '@/lib/boleto'
import { brl, parseNumber } from '@/lib/br'

const formatLinha = (n) =>
  n.length === 47
    ? `${n.slice(0, 5)}.${n.slice(5, 10)} ${n.slice(10, 15)}.${n.slice(15, 21)} ${n.slice(21, 26)}.${n.slice(26, 32)} ${n[32]} ${n.slice(33)}`
    : n.length === 48
      ? [0, 1, 2, 3].map((i) => `${n.slice(i * 12, i * 12 + 11)}-${n[i * 12 + 11]}`).join(' ')
      : n

export default function ConferirBoleto() {
  const [linha, setLinha] = useState('')
  const [valorEsperado, setValorEsperado] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [erro, setErro] = useState('')

  const conferir = async (event) => {
    event.preventDefault()
    setErro('')
    setRes(null)
    const b = lerBoleto(linha)
    if (b.erro) return setErro(b.erro)
    setBusy(true)
    let banco = null
    if (b.tipo === 'bancario') {
      try {
        banco = await fetchJson(`${BRASIL_API}/banks/v1/${Number(b.banco)}`)
      } catch {
        banco = null
      }
    }
    const alertas = [...b.problemas.map((p) => ['danger', p])]
    if (b.problemas.length) alertas.push(['danger', 'Se você copiou o código do PDF ou da foto e ele não confere, o boleto pode ter sido adulterado. Peça uma 2ª via direto no site ou app da empresa.'])
    const esperado = parseNumber(valorEsperado)
    if (esperado > 0 && b.valor && Math.abs(esperado - b.valor) > 0.009) {
      alertas.push(['danger', `O valor do código (${brl(b.valor)}) é diferente do que você esperava pagar (${brl(esperado)}). Golpistas alteram o valor e o banco.`])
    }
    if (b.tipo === 'bancario' && b.banco && !banco) alertas.push(['warn', `Não achamos o banco ${b.banco} na lista do Banco Central. Confira o boleto com a empresa.`])
    if (b.vencimento) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const dias = Math.round((b.vencimento - hoje) / 86400000)
      if (dias < 0) alertas.push(['warn', `O boleto venceu há ${-dias} dia(s). Pode ter multa e juros; prefira gerar uma 2ª via atualizada.`])
      if (dias > 400) alertas.push(['warn', 'O vencimento está muito longe no futuro, o que é incomum.'])
    }
    if (!alertas.length) alertas.push(['ok', 'Os dígitos verificadores conferem: o código não foi digitado errado nem alterado depois de gerado.'])
    setRes({ ...b, banco: banco ? { ...banco, codigo: b.banco } : b.banco ? { codigo: b.banco } : null, alertas })
    setBusy(false)
  }

  const nivel = res ? (res.alertas.some(([k]) => k === 'danger') ? 'danger' : res.alertas.some(([k]) => k === 'warn') ? 'warn' : 'ok') : null

  return (
    <div className="tool-stack">
      <form className="tool-stack" onSubmit={conferir}>
        <Field label="Linha digitável ou código de barras" hint="Os números embaixo ou em cima do código de barras (47 ou 48 números). Pode colar com pontos e espaços.">
          <textarea rows={2} value={linha} onChange={(e) => setLinha(e.target.value)} placeholder="34191.09123 45678.901234 56789.012345 1 23450000123456" inputMode="numeric" />
        </Field>
        <div className="grid-2">
          <Field label="Valor que você esperava pagar (opcional)" hint="Para conferir se o valor do código bate.">
            <NumberInput value={valorEsperado} onChange={(e) => setValorEsperado(e.target.value)} placeholder="R$ 0,00" />
          </Field>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Conferindo…' : 'Conferir boleto'}</button>
          </div>
        </div>
      </form>
      <Notice kind="error">{erro}</Notice>
      {res && (
        <>
          <div className={`verdict ${nivel}`}>
            <strong>{nivel === 'danger' ? 'Não pague antes de confirmar' : nivel === 'warn' ? 'Confira antes de pagar' : 'Código válido'}</strong>
            <span>
              {res.tipo === 'bancario'
                ? `Quem recebe este boleto é o banco ${res.banco?.fullName || res.banco?.name || res.banco?.codigo}. Ele precisa ser o banco da empresa que te cobrou.`
                : `Conta ou tributo do tipo: ${res.segmento}.`}
            </span>
          </div>
          <ul className="signal-list">
            {res.alertas.map(([k, t]) => (
              <li key={t} className={k}>{t}</li>
            ))}
          </ul>
          <div className="rows">
            <h2 className="tool-subtitle">O que está no código</h2>
            {res.tipo === 'bancario' ? (
              <>
                <div className="row"><span>Banco recebedor</span><strong>{res.banco?.codigo} {res.banco?.fullName || res.banco?.name || ''}</strong></div>
                <div className="row"><span>Valor</span><strong>{res.valor ? brl(res.valor) : 'Em aberto (definido na hora de pagar)'}</strong></div>
                <div className="row"><span>Vencimento</span><strong>{res.vencimento ? res.vencimento.toLocaleDateString('pt-BR') : 'Sem vencimento no código'}</strong></div>
                <div className="row"><span>Moeda</span><strong>{res.moeda}</strong></div>
              </>
            ) : (
              <>
                <div className="row"><span>Tipo</span><strong>{res.segmento}</strong></div>
                <div className="row"><span>Valor</span><strong>{res.valor !== null ? brl(res.valor) : 'Não informado no código'}</strong></div>
                <div className="row"><span>Código da empresa/órgão</span><strong>{res.empresa}</strong></div>
              </>
            )}
            <div className="row"><span>Linha digitável</span><strong className="mono">{formatLinha(res.linha ?? res.barras)}</strong></div>
          </div>
          <div className="actions">
            <CopyButton text={res.linha ?? res.barras} label="Copiar só os números" />
          </div>
          <Notice kind="warn">
            Sempre confira no app do banco, na tela de confirmação: o nome de quem vai receber (beneficiário), o CNPJ e o valor. Se for diferente da empresa que te cobrou, cancele. Boleto recebido por WhatsApp ou e-mail sem você pedir é o golpe mais comum.
          </Notice>
        </>
      )}
    </div>
  )
}
