'use client'

import { useEffect, useState } from 'react'
import { Field, NumberInput, Tabs } from '../ui'
import { brl, parseNumber, valorPorExtenso } from '@/lib/br'
import { DATA_INICIAL, parseDate, toInputDate } from '@/lib/trabalhista'

// O HTML do build usa uma data fixa; no navegador trocamos pela data de hoje.
const useDataDeHoje = (setF) =>
  useEffect(() => setF((current) => ({ ...current, data: toInputDate(new Date()) })), [setF])

const dataExtenso = (value) => {
  const date = parseDate(value)
  return date ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

function ReciboForm() {
  const [f, setF] = useState({
    pagador: '',
    pagadorDoc: '',
    recebedor: '',
    recebedorDoc: '',
    valor: '',
    referente: '',
    cidade: '',
    data: toInputDate(DATA_INICIAL),
    forma: 'Pix',
  })
  useDataDeHoje(setF)
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }))
  const valor = parseNumber(f.valor)

  return (
    <div className="tool-split">
      <div className="tool-form">
        <div className="grid-2">
          <Field label="Quem pagou">
            <input value={f.pagador} onChange={set('pagador')} />
          </Field>
          <Field label="CPF/CNPJ de quem pagou">
            <input value={f.pagadorDoc} onChange={set('pagadorDoc')} />
          </Field>
          <Field label="Quem recebeu">
            <input value={f.recebedor} onChange={set('recebedor')} />
          </Field>
          <Field label="CPF/CNPJ de quem recebeu">
            <input value={f.recebedorDoc} onChange={set('recebedorDoc')} />
          </Field>
          <Field label="Valor (R$)">
            <NumberInput value={f.valor} onChange={set('valor')} placeholder="0,00" />
          </Field>
          <Field label="Forma de pagamento">
            <select value={f.forma} onChange={set('forma')}>
              {['Pix', 'Dinheiro', 'Transferência bancária', 'Cartão', 'Boleto', 'Cheque'].map((forma) => (
                <option key={forma}>{forma}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Referente a">
          <textarea rows={2} value={f.referente} onChange={set('referente')} placeholder="Ex.: aluguel do mês de outubro de 2026" />
        </Field>
        <div className="grid-2">
          <Field label="Cidade">
            <input value={f.cidade} onChange={set('cidade')} />
          </Field>
          <Field label="Data">
            <input type="date" value={f.data} onChange={set('data')} />
          </Field>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Salvar em PDF / Imprimir</button>
      </div>

      <div className="paper print-area">
        <div className="paper-head">
          <h2>RECIBO</h2>
          <strong>{Number.isFinite(valor) ? brl(valor) : 'R$ 0,00'}</strong>
        </div>
        <p>
          Recebi(emos) de <strong>{f.pagador || '________________'}</strong>
          {f.pagadorDoc && `, CPF/CNPJ ${f.pagadorDoc}`}, a importância de <strong>{Number.isFinite(valor) ? brl(valor) : 'R$ ______'}</strong>
          {Number.isFinite(valor) && ` (${valorPorExtenso(valor)})`}, paga via {f.forma.toLowerCase()}, referente a {f.referente || '________________'}.
        </p>
        <p>Para maior clareza, firmo(amos) o presente recibo, dando plena quitação do valor recebido.</p>
        <p className="paper-date">{[f.cidade, dataExtenso(f.data)].filter(Boolean).join(', ')}</p>
        <div className="signature">
          <span />
          <strong>{f.recebedor || 'Nome de quem recebeu'}</strong>
          {f.recebedorDoc && <small>CPF/CNPJ {f.recebedorDoc}</small>}
        </div>
      </div>
    </div>
  )
}

const emptyItem = () => ({ descricao: '', qtd: '1', valor: '' })

function OrcamentoForm() {
  const [f, setF] = useState({ emissor: '', contato: '', cliente: '', validade: '15', desconto: '', obs: '', data: toInputDate(DATA_INICIAL), numero: '001' })
  useDataDeHoje(setF)
  const [items, setItems] = useState([emptyItem()])
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }))
  const setItem = (index, key) => (event) => setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: event.target.value } : item)))

  const linhas = items.map((item) => {
    const qtd = parseNumber(item.qtd) || 0
    const unit = parseNumber(item.valor) || 0
    return { ...item, qtdN: qtd, unit, total: qtd * unit }
  })
  const subtotal = linhas.reduce((t, l) => t + l.total, 0)
  const desconto = parseNumber(f.desconto) || 0
  const total = Math.max(0, subtotal - desconto)

  return (
    <div className="tool-split">
      <div className="tool-form">
        <div className="grid-2">
          <Field label="Sua empresa ou nome">
            <input value={f.emissor} onChange={set('emissor')} />
          </Field>
          <Field label="Contato (telefone, e-mail)">
            <input value={f.contato} onChange={set('contato')} />
          </Field>
          <Field label="Cliente">
            <input value={f.cliente} onChange={set('cliente')} />
          </Field>
          <Field label="Nº do orçamento">
            <input value={f.numero} onChange={set('numero')} />
          </Field>
        </div>
        <div className="items-editor">
          <span className="field-label">Itens</span>
          {items.map((item, index) => (
            <div key={index} className="item-row">
              <input value={item.descricao} onChange={setItem(index, 'descricao')} placeholder="Descrição" aria-label="Descrição" />
              <NumberInput value={item.qtd} onChange={setItem(index, 'qtd')} aria-label="Quantidade" />
              <NumberInput value={item.valor} onChange={setItem(index, 'valor')} placeholder="Valor unit." aria-label="Valor unitário" />
              <button type="button" className="icon-btn" onClick={() => setItems(items.filter((_, i) => i !== index))} disabled={items.length === 1} aria-label="Remover item">×</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setItems([...items, emptyItem()])}>+ Adicionar item</button>
        </div>
        <div className="grid-3">
          <Field label="Desconto (R$)">
            <NumberInput value={f.desconto} onChange={set('desconto')} placeholder="0,00" />
          </Field>
          <Field label="Validade (dias)">
            <NumberInput value={f.validade} onChange={set('validade')} inputMode="numeric" />
          </Field>
          <Field label="Data">
            <input type="date" value={f.data} onChange={set('data')} />
          </Field>
        </div>
        <Field label="Observações">
          <textarea rows={3} value={f.obs} onChange={set('obs')} placeholder="Prazo de entrega, forma de pagamento, garantia…" />
        </Field>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Salvar em PDF / Imprimir</button>
      </div>

      <div className="paper print-area">
        <div className="paper-head">
          <div>
            <h2>ORÇAMENTO Nº {f.numero}</h2>
            <small>{dataExtenso(f.data)}</small>
          </div>
          <div className="paper-issuer">
            <strong>{f.emissor || 'Sua empresa'}</strong>
            <small>{f.contato}</small>
          </div>
        </div>
        <p>
          Cliente: <strong>{f.cliente || '________________'}</strong>
        </p>
        <table className="paper-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Valor unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, index) => (
              <tr key={index}>
                <td>{l.descricao || '—'}</td>
                <td>{l.qtdN}</td>
                <td>{brl(l.unit)}</td>
                <td>{brl(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="paper-totals">
          <span>Subtotal: {brl(subtotal)}</span>
          {desconto > 0 && <span>Desconto: − {brl(desconto)}</span>}
          <strong>Total: {brl(total)}</strong>
        </div>
        {f.obs && <p className="paper-obs">{f.obs}</p>}
        <p className="paper-date">Orçamento válido por {f.validade || '—'} dias.</p>
      </div>
    </div>
  )
}

export default function Recibo() {
  const [mode, setMode] = useState('recibo')
  return (
    <div className="tool-stack">
      <Tabs tabs={[['recibo', 'Recibo'], ['orcamento', 'Orçamento']]} value={mode} onChange={setMode} />
      {mode === 'recibo' ? <ReciboForm /> : <OrcamentoForm />}
    </div>
  )
}
