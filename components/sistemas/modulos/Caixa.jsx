'use client'

// Abertura, sangria/suprimento e fechamento do caixa, com conferência do dinheiro na gaveta.

import { useMemo, useState } from 'react'
import { Kpis, Modal, Selo, Topo, Vazio, useSistema, useTabela } from '../base'
import { imprimir } from '../comuns'
import { caixaAberto } from '@/lib/sistemas/acoes'
import { FORMAS_PAGAMENTO } from '@/lib/sistemas/schema'
import { brl, dataBR, parseValor, resumoCaixa, round2 } from '@/lib/sistemas/regras'

const formaNome = (f) => FORMAS_PAGAMENTO.find(([id]) => id === f)?.[1] ?? f

export function AbrirCaixa() {
  const { banco, usuario } = useSistema()
  const [valor, setValor] = useState('150,00')
  return (
    <form
      className="sx-linha sx-centro"
      onSubmit={(e) => {
        e.preventDefault()
        banco.salvar('caixas', { aberto_em: new Date().toISOString(), valor_inicial: parseValor(valor), status: 'aberto', operador: usuario })
      }}
    >
      <div className="sx-moeda grande">
        <span>R$</span>
        <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Troco inicial" autoFocus />
      </div>
      <button type="submit" className="btn btn-primary btn-lg">
        Abrir caixa
      </button>
    </form>
  )
}

export default function Caixa() {
  const { banco } = useSistema()
  const caixas = useTabela('caixas')
  const vendas = useTabela('vendas')
  const movs = useTabela('caixa_mov')
  const caixa = useMemo(() => caixaAberto(banco), [banco, caixas])
  const [mov, setMov] = useState(null)
  const [fechar, setFechar] = useState(false)
  const historico = caixas.filter((c) => c.status === 'fechado').slice(0, 30)

  const resumo = caixa ? resumoCaixa(caixa, vendas, movs) : null
  const movsDoCaixa = caixa ? movs.filter((m) => m.caixa_id === caixa.id) : []

  return (
    <div className="sx-modulo">
      <Topo titulo="Caixa" sub={caixa ? `Aberto em ${dataBR(caixa.aberto_em, true)} por ${caixa.operador || '—'}` : 'Nenhum caixa aberto'}>
        {caixa && (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setMov('suprimento')}>
              Suprimento
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setMov('sangria')}>
              Sangria
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setFechar(true)}>
              Fechar caixa
            </button>
          </>
        )}
      </Topo>

      {!caixa && (
        <div className="sx-cartao sx-centro">
          <h2>Abrir caixa</h2>
          <p className="muted">Informe o troco inicial da gaveta.</p>
          <AbrirCaixa />
        </div>
      )}

      {caixa && resumo && (
        <>
          <Kpis
            itens={[
              ['Vendas no caixa', resumo.qtd, brl(resumo.total)],
              ['Dinheiro esperado na gaveta', brl(resumo.esperado), `troco inicial ${brl(caixa.valor_inicial)}`, 'ok'],
              ['Sangrias', brl(resumo.sangrias)],
              ['Suprimentos', brl(resumo.suprimentos)],
            ]}
          />
          <div className="sx-grade-2">
            <section className="sx-cartao">
              <h2>Por forma de pagamento</h2>
              <ul className="sx-lista-valores">
                {FORMAS_PAGAMENTO.map(([f, nome]) => (
                  <li key={f}>
                    <span>{nome}</span>
                    <strong>{brl(resumo.formas[f] || 0)}</strong>
                  </li>
                ))}
                <li>
                  <span>Troco devolvido</span>
                  <strong>− {brl(resumo.troco)}</strong>
                </li>
              </ul>
            </section>
            <section className="sx-cartao">
              <h2>Movimentos</h2>
              {movsDoCaixa.length === 0 ? (
                <Vazio>Nenhuma sangria ou suprimento.</Vazio>
              ) : (
                <ul className="sx-lista-valores">
                  {movsDoCaixa.map((m) => (
                    <li key={m.id}>
                      <span>
                        <Selo tom={m.tipo === 'sangria' ? 'erro' : 'ok'}>{m.tipo}</Selo> {m.motivo}
                      </span>
                      <strong>{brl(m.valor)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <section className="sx-cartao">
        <h2>Caixas anteriores</h2>
        {historico.length === 0 ? (
          <Vazio>Nenhum caixa fechado ainda.</Vazio>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                  <th>Vendas</th>
                  <th>Esperado</th>
                  <th>Contado</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((c) => {
                  const r = resumoCaixa(c, vendas, movs)
                  const esperado = c.valor_esperado !== '' && c.valor_esperado !== undefined ? Number(c.valor_esperado) : r.esperado
                  const contado = c.valor_contado !== '' && c.valor_contado !== undefined ? Number(c.valor_contado) : esperado
                  const dif = round2(contado - esperado)
                  return (
                    <tr key={c.id}>
                      <td>{dataBR(c.aberto_em, true)}</td>
                      <td>{dataBR(c.fechado_em, true)}</td>
                      <td>
                        {r.qtd} · {brl(r.total)}
                      </td>
                      <td>{brl(esperado)}</td>
                      <td>{brl(contado)}</td>
                      <td>
                        <Selo tom={Math.abs(dif) < 0.01 ? 'ok' : 'erro'}>{dif > 0 ? `+${brl(dif)}` : brl(dif)}</Selo>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mov && <MovCaixa tipo={mov} caixa={caixa} onFechar={() => setMov(null)} />}
      {fechar && <FecharCaixa caixa={caixa} resumo={resumo} onFechar={() => setFechar(false)} />}
    </div>
  )
}

function MovCaixa({ tipo, caixa, onFechar }) {
  const { banco } = useSistema()
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  return (
    <Modal titulo={tipo === 'sangria' ? 'Sangria (retirar dinheiro)' : 'Suprimento (colocar dinheiro)'} onFechar={onFechar}>
      <form
        className="sx-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!(parseValor(valor) > 0)) return
          banco.salvar('caixa_mov', { caixa_id: caixa.id, tipo, valor: parseValor(valor), motivo })
          onFechar()
        }}
      >
        <label className="field">
          <span className="field-label">Valor</span>
          <span className="sx-moeda">
            <span>R$</span>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
          </span>
        </label>
        <label className="field">
          <span className="field-label">Motivo</span>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === 'sangria' ? 'Ex.: depósito no banco, pagamento de fornecedor' : 'Ex.: troco extra'} />
        </label>
        <div className="sx-acoes">
          <button type="submit" className="btn btn-primary">
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FecharCaixa({ caixa, resumo, onFechar }) {
  const { banco } = useSistema()
  const [contado, setContado] = useState('')
  const dif = contado === '' ? null : round2(parseValor(contado) - resumo.esperado)
  const confirmar = () => {
    const fechado = banco.salvar('caixas', {
      id: caixa.id,
      status: 'fechado',
      fechado_em: new Date().toISOString(),
      valor_contado: contado === '' ? resumo.esperado : parseValor(contado),
      valor_esperado: resumo.esperado,
      resumo: resumo.formas,
    })
    imprimir(
      `<h1>Fechamento de caixa</h1><p>${dataBR(fechado.aberto_em, true)} até ${dataBR(fechado.fechado_em, true)}</p><hr><table>
      ${Object.entries(resumo.formas)
        .map(([f, v]) => `<tr><td>${formaNome(f)}</td><td>${brl(v)}</td></tr>`)
        .join('')}
      <tr><td>Troco inicial</td><td>${brl(caixa.valor_inicial)}</td></tr><tr><td>Sangrias</td><td>- ${brl(resumo.sangrias)}</td></tr><tr><td>Suprimentos</td><td>${brl(resumo.suprimentos)}</td></tr>
      <tr class="t"><td>Esperado</td><td>${brl(resumo.esperado)}</td></tr><tr><td>Contado</td><td>${brl(fechado.valor_contado)}</td></tr></table><hr><p>Vendas: ${resumo.qtd}</p>`,
      { cupom: true, titulo: 'Fechamento de caixa' },
    )
    onFechar()
  }
  return (
    <Modal
      titulo="Fechar caixa"
      onFechar={onFechar}
      rodape={
        <button type="button" className="btn btn-primary" onClick={confirmar}>
          Fechar e imprimir resumo
        </button>
      }
    >
      <p>
        Dinheiro esperado na gaveta: <strong>{brl(resumo.esperado)}</strong>
      </p>
      <label className="field">
        <span className="field-label">Quanto você contou?</span>
        <span className="sx-moeda grande">
          <span>R$</span>
          <input inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} autoFocus placeholder={resumo.esperado.toFixed(2).replace('.', ',')} />
        </span>
      </label>
      {dif !== null && (
        <p className={Math.abs(dif) < 0.01 ? 'notice ok' : 'notice warn'}>
          {Math.abs(dif) < 0.01 ? 'Caixa batendo certinho.' : dif > 0 ? `Sobrando ${brl(dif)}.` : `Faltando ${brl(-dif)}.`}
        </p>
      )}
    </Modal>
  )
}
