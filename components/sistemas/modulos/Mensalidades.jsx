'use client'

// Mensalidades: gera as cobranças do mês a partir das matrículas, controla atrasos e cobra pelo WhatsApp.

import { useMemo, useState } from 'react'
import { Chips, Kpis, Modal, Selo, Topo, Vazio, useConfig, useMapa, useSistema, useTabela } from '../base'
import { FORMAS_PAGAMENTO } from '@/lib/sistemas/schema'
import { brl, dataBR, diasEntre, hojeISO, linkWhats, num, pad, parseValor, round2, vencimentoDoMes } from '@/lib/sistemas/regras'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export default function Mensalidades() {
  const { banco } = useSistema()
  const cfg = useConfig()
  const matriculas = useTabela('matriculas')
  const lancamentos = useTabela('lancamentos')
  const clientes = useMapa('clientes')
  const planos = useMapa('planos')
  const [mes, setMes] = useState(() => hojeISO().slice(0, 7))
  const [filtro, setFiltro] = useState('todas')
  const [receber, setReceber] = useState(null)
  const hoje = hojeISO()
  const [ano, m] = mes.split('-').map(Number)

  const doMes = useMemo(() => lancamentos.filter((l) => l.categoria === 'mensalidade' && String(l.ref_id || '').endsWith(`:${mes}`)), [lancamentos, mes])
  const ativas = matriculas.filter((x) => x.status === 'ativa')
  const faltam = ativas.filter((x) => !doMes.some((l) => l.ref_id === `${x.id}:${mes}`))
  const atraso = (l) => (!l.pago_em && l.vencimento < hoje ? diasEntre(l.vencimento, hoje) : 0)
  const comMulta = (l) => round2(Number(l.valor) * (1 + (atraso(l) ? (Number(cfg.multa_atraso) || 0) / 100 : 0)))

  const gerar = () => {
    banco.salvarVarios(
      faltam.map((x) => {
        const plano = planos.get(x.plano_id)
        const c = clientes.get(x.cliente_id)
        return [
          'lancamentos',
          {
            tipo: 'receita',
            descricao: `Mensalidade ${pad(m)}/${ano} - ${c?.nome ?? 'aluno'}`,
            valor: round2((Number(plano?.valor) || 0) - (Number(x.desconto) || 0)),
            vencimento: vencimentoDoMes(ano, m, x.dia_vencimento),
            categoria: 'mensalidade',
            cliente_id: x.cliente_id,
            ref_id: `${x.id}:${mes}`,
          },
        ]
      }),
    )
  }

  const lista = doMes
    .filter((l) => (filtro === 'pagas' ? l.pago_em : filtro === 'abertas' ? !l.pago_em && !atraso(l) : filtro === 'atrasadas' ? atraso(l) : true))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const previsto = doMes.reduce((s, l) => s + Number(l.valor), 0)
  const recebido = doMes.filter((l) => l.pago_em).reduce((s, l) => s + Number(l.valor), 0)
  const atrasadas = doMes.filter((l) => atraso(l))
  const todasAtrasadas = lancamentos.filter((l) => l.categoria === 'mensalidade' && atraso(l))

  return (
    <div className="sx-modulo">
      <Topo titulo="Mensalidades" sub={`${MESES[m - 1]} de ${ano} · ${ativas.length} matrículas ativas`}>
        <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Mês" />
        <button type="button" className="btn btn-primary" disabled={!faltam.length} onClick={gerar}>
          {faltam.length ? `Gerar ${faltam.length} mensalidades` : 'Mês já gerado'}
        </button>
      </Topo>
      <Kpis
        itens={[
          ['Previsto no mês', brl(previsto), `${doMes.length} cobranças`],
          ['Recebido', brl(recebido), previsto ? `${num((recebido / previsto) * 100, 0)}% do previsto` : '', 'ok'],
          ['Em atraso neste mês', brl(atrasadas.reduce((s, l) => s + Number(l.valor), 0)), `${atrasadas.length} alunos`, atrasadas.length ? 'erro' : null],
          ['Inadimplência total', todasAtrasadas.length, 'mensalidades vencidas', todasAtrasadas.length ? 'erro' : 'ok'],
        ]}
      />
      <Chips
        valor={filtro}
        onChange={setFiltro}
        opcoes={[
          ['todas', 'Todas', doMes.length],
          ['abertas', 'A vencer', doMes.filter((l) => !l.pago_em && !atraso(l)).length],
          ['atrasadas', 'Atrasadas', atrasadas.length],
          ['pagas', 'Pagas', doMes.filter((l) => l.pago_em).length],
        ]}
      />
      {doMes.length === 0 ? (
        <Vazio>Nenhuma mensalidade gerada para este mês. Clique em “Gerar mensalidades”.</Vazio>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const c = clientes.get(l.cliente_id)
                const dias = atraso(l)
                return (
                  <tr key={l.id}>
                    <td>{c?.nome}</td>
                    <td>{dataBR(l.vencimento)}</td>
                    <td>
                      {brl(l.valor)}
                      {dias > 0 && <small className="muted"> → {brl(comMulta(l))} c/ multa</small>}
                    </td>
                    <td>{l.pago_em ? <Selo tom="ok">Paga {dataBR(l.pago_em).slice(0, 5)}</Selo> : dias ? <Selo tom="erro">{dias} dias de atraso</Selo> : <Selo>A vencer</Selo>}</td>
                    <td className="sx-acoes-linha">
                      {!l.pago_em && (
                        <>
                          <button type="button" className="btn btn-ghost" onClick={() => setReceber(l)}>
                            Receber
                          </button>
                          {c?.telefone && (
                            <a
                              className="btn btn-ghost"
                              target="_blank"
                              rel="noopener noreferrer"
                              href={linkWhats(
                                c.telefone,
                                `Olá, ${c.nome.split(' ')[0]}! ${dias ? `Sua mensalidade venceu em ${dataBR(l.vencimento)}` : `Lembrete: sua mensalidade vence em ${dataBR(l.vencimento)}`} no valor de ${brl(dias ? comMulta(l) : l.valor)}.${cfg.pix_chave ? ` Pix: ${cfg.pix_chave}` : ''} Qualquer dúvida, estamos à disposição!`,
                              )}
                            >
                              Cobrar
                            </a>
                          )}
                        </>
                      )}
                      {l.pago_em && (
                        <button type="button" className="sx-link" onClick={() => banco.salvar('lancamentos', { id: l.id, pago_em: '', forma: '' })}>
                          Desfazer
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {receber && <Receber lancamento={receber} valorSugerido={comMulta(receber)} onFechar={() => setReceber(null)} />}
    </div>
  )
}

export function Receber({ lancamento, valorSugerido, onFechar, titulo = 'Registrar pagamento' }) {
  const { banco } = useSistema()
  const [forma, setForma] = useState('pix')
  const [data, setData] = useState(hojeISO)
  const [valor, setValor] = useState(Number(valorSugerido ?? lancamento.valor).toFixed(2).replace('.', ','))
  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      <p>{lancamento.descricao}</p>
      <div className="sx-form-grid">
        <label className="field">
          <span className="field-label">Valor recebido</span>
          <span className="sx-moeda">
            <span>R$</span>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </span>
        </label>
        <label className="field">
          <span className="field-label">Data</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Forma</span>
          <select value={forma} onChange={(e) => setForma(e.target.value)}>
            {FORMAS_PAGAMENTO.filter(([f]) => f !== 'fiado').map(([f, r]) => (
              <option key={f} value={f}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="sx-acoes">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            banco.salvar('lancamentos', { id: lancamento.id, pago_em: data, forma, valor: parseValor(valor) || lancamento.valor })
            onFechar()
          }}
        >
          Confirmar recebimento
        </button>
      </div>
    </Modal>
  )
}
