'use client'

import { useState } from 'react'
import { Field, Notice } from '../ui'
import { BRASIL_API, apiMessage, fetchJson } from '@/lib/apis'
import { onlyDigits } from '@/lib/br'

const UF_NOME = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco',
  PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

// Códigos de país que aparecem muito em golpes de "renda extra" e falsas vagas pelo WhatsApp.
const PAISES = {
  1: 'Estados Unidos/Canadá', 7: 'Rússia', 20: 'Egito', 44: 'Reino Unido', 51: 'Peru', 54: 'Argentina', 56: 'Chile', 57: 'Colômbia', 60: 'Malásia', 62: 'Indonésia',
  63: 'Filipinas', 84: 'Vietnã', 86: 'China', 91: 'Índia', 92: 'Paquistão', 93: 'Afeganistão', 212: 'Marrocos', 234: 'Nigéria', 254: 'Quênia', 351: 'Portugal',
  595: 'Paraguai', 598: 'Uruguai', 855: 'Camboja', 880: 'Bangladesh',
}

function analisar(entrada) {
  const bruto = entrada.trim()
  let d = onlyDigits(bruto)
  const internacional = bruto.startsWith('+') || d.startsWith('00')
  if (d.startsWith('00')) d = d.slice(2)
  if (internacional && !d.startsWith('55')) {
    const codigo = [3, 2, 1].map((n) => d.slice(0, n)).find((c) => PAISES[c]) ?? d.slice(0, 3)
    return { tipo: 'exterior', codigo, pais: PAISES[codigo] }
  }
  if (internacional || (d.startsWith('55') && d.length >= 12)) d = d.slice(2)
  if (/^0?(800|300|500|900)/.test(d)) return { tipo: 'especial', prefixo: d.replace(/^0/, '').slice(0, 3) }
  if (/^(4004|4003|4002|4020|4007|3003|3004)/.test(d)) return { tipo: 'capitais', prefixo: d.slice(0, 4) }
  if (d.length === 2) return { tipo: 'ddd', ddd: d }
  if (d.startsWith('0') && d.length >= 11) d = d.replace(/^0\d{2}/, '') // 0 + operadora (ex.: 015 11 ...)
  if (d.length === 10 || d.length === 11) {
    const ddd = d.slice(0, 2)
    const numero = d.slice(2)
    const celular = numero.length === 9 && numero[0] === '9'
    return { tipo: 'numero', ddd, numero, celular, fixo: numero.length === 8 && /[2-5]/.test(numero[0]) }
  }
  return { tipo: 'invalido' }
}

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', "d'"])
const nomeCidade = (c) =>
  c
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && MINUSCULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')

const DICAS = [
  'Banco nunca liga pedindo senha, código recebido por SMS, transferência ou "teste" de Pix. Desligue e ligue você para o número do cartão.',
  'O número que aparece na tela pode ser falsificado: mesmo que pareça o do banco, não confie só nisso.',
  'Mensagem de "parente com número novo" pedindo dinheiro: ligue para o número antigo ou faça uma pergunta que só ele saberia.',
  'Vaga para "curtir vídeos" ou "avaliar produtos" com pagamento por tarefa é golpe: no fim pedem depósito para "liberar" o saque.',
  'Falso entregador ou Correios pedindo taxa por link: confira o rastreio só no site oficial.',
]

export default function ConsultaDdd() {
  const [entrada, setEntrada] = useState('')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const consultar = async (event) => {
    event.preventDefault()
    setErro('')
    setRes(null)
    const a = analisar(entrada)
    if (a.tipo === 'invalido') return setErro('Digite um DDD (2 números) ou o telefone completo com DDD, por exemplo (11) 91234-5678 ou +62 812...')
    if (a.tipo === 'ddd' || a.tipo === 'numero') {
      setBusy(true)
      try {
        const info = await fetchJson(`${BRASIL_API}/ddd/v1/${a.ddd}`)
        setRes({ ...a, uf: info.state, cidades: [...info.cities].sort((x, y) => x.localeCompare(y, 'pt-BR')) })
      } catch (e) {
        setErro(apiMessage(e, `O DDD ${a.ddd} não existe no Brasil. Número com DDD inexistente é sinal de golpe ou de digitação errada.`))
      } finally {
        setBusy(false)
      }
      return
    }
    setRes(a)
  }

  return (
    <div className="tool-stack">
      <form className="grid-2" onSubmit={consultar}>
        <Field label="DDD ou número de telefone" hint="Aceita com ou sem +55, parênteses e traços.">
          <input value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="(11) 91234-5678" inputMode="tel" />
        </Field>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Consultando…' : 'Consultar'}</button>
        </div>
      </form>
      <Notice kind="error">{erro}</Notice>
      {res?.tipo === 'exterior' && (
        <div className="verdict danger">
          <strong>Número do exterior{res.pais ? `: ${res.pais}` : ''} (+{res.codigo})</strong>
          <span>Mensagens de números estrangeiros oferecendo emprego, renda extra, investimento ou prêmio são quase sempre golpe. Não responda, não clique em links e bloqueie.</span>
        </div>
      )}
      {res?.tipo === 'especial' && (
        <div className={`verdict ${res.prefixo === '900' ? 'danger' : 'warn'}`}>
          <strong>Número 0{res.prefixo}</strong>
          <span>
            {res.prefixo === '800' && 'Ligação gratuita para empresas (SAC). Mas golpistas também usam 0800 falso em mensagens: confira o número no site oficial.'}
            {res.prefixo === '300' && 'Número de empresas com custo dividido. Confira no site oficial da empresa se o número é dela.'}
            {res.prefixo === '500' && 'Usado para doações. Confirme a instituição antes de ligar.'}
            {res.prefixo === '900' && 'Ligação com tarifa alta (serviços pagos). Desconfie de mensagens pedindo para ligar para 0900.'}
          </span>
        </div>
      )}
      {res?.tipo === 'capitais' && (
        <div className="verdict warn">
          <strong>Número de empresa ({res.prefixo})</strong>
          <span>Bancos e grandes empresas usam números {res.prefixo}, mas golpistas falsificam esse número na tela. Se pedirem senha, código ou Pix, desligue e ligue você para o número oficial.</span>
        </div>
      )}
      {res?.uf && (
        <>
          <div className="stats">
            <div className="stat highlight"><span>DDD</span><strong>{res.ddd}</strong></div>
            <div className="stat"><span>Estado</span><strong>{UF_NOME[res.uf] ?? res.uf} ({res.uf})</strong></div>
            {res.tipo === 'numero' && <div className="stat"><span>Tipo</span><strong>{res.celular ? 'Celular' : res.fixo ? 'Telefone fixo' : 'Formato incomum'}</strong></div>}
            <div className="stat"><span>Cidades com este DDD</span><strong>{res.cidades.length}</strong></div>
          </div>
          {res.tipo === 'numero' && !res.celular && !res.fixo && <Notice kind="warn">O número não segue o formato brasileiro (celular com 9 dígitos começando em 9, ou fixo com 8 dígitos). Confira se foi digitado certo.</Notice>}
          <details className="details">
            <summary>Ver as {res.cidades.length} cidades do DDD {res.ddd}</summary>
            <p className="details-body muted">{res.cidades.map(nomeCidade).join(', ')}</p>
          </details>
        </>
      )}
      {res && (
        <div className="rows">
          <h2 className="tool-subtitle">Golpes comuns por telefone</h2>
          <ul className="signal-list">
            {DICAS.map((d) => (
              <li key={d} className="info">{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
