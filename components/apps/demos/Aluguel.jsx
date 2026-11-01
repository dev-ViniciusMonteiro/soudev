'use client'

import { useMemo, useState } from 'react'
import { Barras, Cartao, Formulario, FotoDemo, Janela, Kpi, Moldura, PlanoPro, Selo, Vazio, dataBr, diasAte, hojeIso, lerNumero, num, reais, somaDias, somaMeses, uid, useDemo } from './kit'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const competenciaNome = (c) => `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(0, 4)}`
const vencimentoDe = (comp, dia) => {
  const [a, m] = comp.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return `${comp}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

function encargos(contrato, venc, pagoEm, valor) {
  const ref = pagoEm || hojeIso()
  const atraso = Math.round((new Date(`${ref}T12:00:00`) - new Date(`${venc}T12:00:00`)) / 86400000)
  if (atraso <= 0) return { atraso: 0, multa: 0, juros: 0, total: valor }
  const multa = valor * (contrato.multa / 100)
  const juros = valor * (contrato.juros / 100 / 30) * atraso
  return { atraso, multa, juros, total: valor + multa + juros }
}

function demo() {
  const h = hojeIso()
  const inicio = `${somaMeses(h, -14).slice(0, 7)}-05`
  const contrato = { inicio, meses: 30, valor: 1875.6, valorOriginal: 1800, dia: 10, indice: 'IGP-M', garantia: 'Seguro fiança', multa: 2, juros: 1, ultimoReajuste: somaMeses(inicio, 12) }
  const pagamentos = []
  for (let i = 0; i <= 14; i++) {
    const comp = somaMeses(inicio, i).slice(0, 7)
    const venc = vencimentoDe(comp, contrato.dia)
    const valor = i >= 12 ? contrato.valor : contrato.valorOriginal
    let pagoEm = null
    if (diasAte(venc) < -20 || i < 12) pagoEm = somaDias(venc, i === 7 ? 6 : i % 4 === 0 ? -1 : 0)
    if (i === 13) pagoEm = null // um mês em atraso para a demo
    if (i === 14) pagoEm = null
    const enc = pagoEm ? encargos(contrato, venc, pagoEm, valor) : null
    pagamentos.push({ id: uid(), competencia: comp, vencimento: venc, valor, pagoEm, valorPago: enc ? Math.round(enc.total * 100) / 100 : 0 })
  }
  return {
    imovel: { nome: 'Apto 32 · Edifício Jacarandá', endereco: 'Av. Brasil, 1500, apto 32 · Campinas/SP', tipo: 'Apartamento 2 quartos', iptu: 1260, condominio: 520 },
    inquilino: { nome: 'Rafael Mendes', telefone: '11988887777', email: 'rafael.mendes@exemplo.com', desde: inicio },
    contrato,
    pagamentos,
    ocorrencias: [
      { id: uid(), data: somaDias(h, -200), titulo: 'Vazamento na pia da cozinha', descricao: 'Sifão rachado. Encanador trocou.', status: 'Resolvido', custo: 180, quemPaga: 'Proprietário' },
      { id: uid(), data: somaDias(h, -60), titulo: 'Chuveiro queimado', descricao: 'Resistência. Troca é do inquilino (manutenção simples).', status: 'Resolvido', custo: 45, quemPaga: 'Inquilino' },
      { id: uid(), data: somaDias(h, -6), titulo: 'Infiltração no teto do banheiro', descricao: 'Mancha vindo do apto de cima. Síndico avisado.', status: 'Em andamento', custo: 0, quemPaga: 'Proprietário' },
    ],
    reajustes: [{ data: somaMeses(inicio, 12), indice: 'IGP-M', percentual: 4.2, de: 1800, para: 1875.6 }],
  }
}

export default function Aluguel() {
  const [dados, setDados, restaurar] = useDemo('demo-aluguel-v1', demo)
  const [secao, setSecao] = useState('painel')
  const [pagar, setPagar] = useState(null)
  const [ocorr, setOcorr] = useState(null)
  const [pct, setPct] = useState('4,5')

  const calc = useMemo(() => {
    if (!dados) return null
    const c = dados.contrato
    const lista = dados.pagamentos.map((p) => {
      const enc = encargos(c, p.vencimento, p.pagoEm, p.valor)
      const situacao = p.pagoEm ? (enc.atraso > 0 ? 'pago-atraso' : 'pago') : diasAte(p.vencimento) < 0 ? 'atrasado' : 'aberto'
      return { ...p, enc, situacao }
    })
    const ano = String(new Date().getFullYear())
    const recebidoAno = lista.filter((p) => p.pagoEm?.startsWith(ano)).reduce((s, p) => s + p.valorPago, 0)
    const emAtraso = lista.filter((p) => p.situacao === 'atrasado')
    const devido = emAtraso.reduce((s, p) => s + p.enc.total, 0)
    const proximo = lista.find((p) => p.situacao === 'aberto')
    const fimContrato = somaMeses(c.inicio, c.meses)
    const proxReajuste = somaMeses(c.ultimoReajuste || c.inicio, 12)
    const meses = lista.slice(-12).map((p) => ({ rotulo: MESES[Number(p.competencia.slice(5, 7)) - 1], valor: p.valorPago }))
    const pontuais = lista.filter((p) => p.pagoEm).length ? Math.round((lista.filter((p) => p.situacao === 'pago').length / lista.filter((p) => p.pagoEm).length) * 100) : 100
    return { lista, recebidoAno, emAtraso, devido, proximo, fimContrato, proxReajuste, meses, pontuais }
  }, [dados])

  if (!dados) return null
  const c = dados.contrato
  const zap = (p) => {
    const t = `Olá, ${dados.inquilino.nome.split(' ')[0]}! Tudo bem? O aluguel de ${competenciaNome(p.competencia)} (${dados.imovel.nome}) venceu em ${dataBr(p.vencimento)}. Com ${p.enc.atraso} dias de atraso, o valor atualizado é ${reais(p.enc.total)} (multa de ${c.multa}% e juros de ${c.juros}% ao mês, como no contrato). Pode me confirmar quando consegue pagar?`
    return `https://wa.me/55${dados.inquilino.telefone}?text=${encodeURIComponent(t)}`
  }
  const novoValor = Math.round(c.valor * (1 + lerNumero(pct) / 100) * 100) / 100
  const aplicarReajuste = () => {
    if (!confirm(`Reajustar de ${reais(c.valor)} para ${reais(novoValor)}?`)) return
    setDados((d) => {
      const hoje = hojeIso()
      return {
        ...d,
        contrato: { ...d.contrato, valor: novoValor, ultimoReajuste: hoje },
        reajustes: [{ data: hoje, indice: d.contrato.indice, percentual: lerNumero(pct), de: d.contrato.valor, para: novoValor }, ...d.reajustes],
        pagamentos: d.pagamentos.map((p) => (!p.pagoEm && p.vencimento >= hoje ? { ...p, valor: novoValor } : p)),
      }
    })
  }
  const gerarProximoMes = () =>
    setDados((d) => {
      const ult = d.pagamentos[d.pagamentos.length - 1]
      const comp = somaMeses(`${ult.competencia}-01`, 1).slice(0, 7)
      return { ...d, pagamentos: [...d.pagamentos, { id: uid(), competencia: comp, vencimento: vencimentoDe(comp, d.contrato.dia), valor: d.contrato.valor, pagoEm: null, valorPago: 0 }] }
    })
  const SIT = { pago: ['bom', 'Pago'], 'pago-atraso': ['alerta', 'Pago com atraso'], atrasado: ['ruim', 'Atrasado'], aberto: [undefined, 'Em aberto'] }

  return (
    <Moldura
      nome="Gestão de Aluguel"
      icone="🏠"
      cor="#0d9488"
      secao={secao}
      onSecao={setSecao}
      onRestaurar={restaurar}
      secoes={[['painel', '📊', 'Painel'], ['pagamentos', '💰', 'Pagamentos'], ['contrato', '📄', 'Contrato'], ['ocorrencias', '🛠️', 'Problemas'], ['imoveis', '🏢', 'Imóveis']]}
    >
      <div className="dm-titulo">
        <h2>{dados.imovel.nome}</h2>
        <Selo tom="cor">Alugado</Selo>
        <p>{dados.imovel.endereco} · inquilino: {dados.inquilino.nome}</p>
      </div>

      {secao === 'painel' && (
        <>
          <div className="dm-kpis">
            <Kpi rotulo="Aluguel" valor={reais(c.valor)} tom="cor" sub={`vence todo dia ${c.dia}`} />
            <Kpi rotulo="Recebido no ano" valor={reais(calc.recebidoAno)} />
            <Kpi rotulo="Em atraso" valor={reais(calc.devido)} tom={calc.devido ? 'ruim' : 'bom'} sub={calc.emAtraso.length ? `${calc.emAtraso.length} mês(es)` : 'nenhum'} />
            <Kpi rotulo="Pontualidade" valor={`${calc.pontuais}%`} tom={calc.pontuais >= 80 ? 'bom' : 'alerta'} sub="pagamentos em dia" />
            <Kpi rotulo="Próximo reajuste" valor={dataBr(calc.proxReajuste)} sub={`${c.indice} · em ${diasAte(calc.proxReajuste)} dias`} tom={diasAte(calc.proxReajuste) < 30 ? 'alerta' : undefined} />
          </div>
          {calc.emAtraso.map((p) => (
            <div key={p.id} className="dm-pro" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
              <b>⚠️ {competenciaNome(p.competencia)} em atraso</b>
              <span style={{ color: '#991b1b' }}>Venceu em {dataBr(p.vencimento)} · {p.enc.atraso} dias · valor atualizado {reais(p.enc.total)} (multa {reais(p.enc.multa)} + juros {reais(p.enc.juros)})</span>
              <a className="dm-btn" style={{ background: '#16a34a' }} href={zap(p)} target="_blank" rel="noopener noreferrer">Cobrar no WhatsApp</a>
              <button type="button" className="dm-btn dm-btn-sec" onClick={() => setPagar({ ...p, pagoEm: hojeIso() })}>Registrar pagamento</button>
            </div>
          ))}
          <div className="dm-duas">
            <Cartao titulo="Recebido nos últimos 12 meses"><Barras dados={calc.meses} formato={(v) => `${Math.round(v)}`} /></Cartao>
            <Cartao titulo="Contrato">
              <span>Vigência: <b>{dataBr(c.inicio)}</b> a <b>{dataBr(calc.fimContrato)}</b> ({c.meses} meses)</span>
              <span>Termina em <b>{diasAte(calc.fimContrato)} dias</b></span>
              <span>Garantia: <b>{c.garantia}</b></span>
              <span>Próximo vencimento: <b>{calc.proximo ? `${dataBr(calc.proximo.vencimento)} · ${reais(calc.proximo.valor)}` : '—'}</b></span>
              <span>Problemas em aberto: <b>{dados.ocorrencias.filter((o) => o.status !== 'Resolvido').length}</b></span>
            </Cartao>
          </div>
        </>
      )}

      {secao === 'pagamentos' && (
        <Cartao titulo="Histórico de pagamentos" acao={<button type="button" className="dm-btn dm-btn-sec" onClick={gerarProximoMes}>＋ Próximo mês</button>}>
          <div className="dm-tabela-wrap">
            <table className="dm-tabela">
              <thead><tr><th>Mês</th><th>Vencimento</th><th>Situação</th><th>Pago em</th><th className="dm-num">Valor</th><th className="dm-num">Recebido</th></tr></thead>
              <tbody>
                {[...calc.lista].reverse().map((p) => (
                  <tr key={p.id} onClick={() => setPagar({ ...p, pagoEm: p.pagoEm || hojeIso() })}>
                    <td><b>{competenciaNome(p.competencia)}</b></td>
                    <td>{dataBr(p.vencimento)}</td>
                    <td><Selo tom={SIT[p.situacao][0]}>{SIT[p.situacao][1]}{p.situacao === 'atrasado' ? ` · ${p.enc.atraso}d` : ''}</Selo></td>
                    <td>{p.pagoEm ? dataBr(p.pagoEm) : '—'}</td>
                    <td className="dm-num">{reais(p.valor)}</td>
                    <td className="dm-num">{p.pagoEm ? reais(p.valorPago) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}

      {secao === 'contrato' && (
        <div className="dm-duas">
          <Cartao titulo="Reajuste anual">
            <p style={{ margin: 0 }}>O contrato é reajustado pelo <b>{c.indice}</b> a cada 12 meses. Último reajuste: <b>{dataBr(c.ultimoReajuste)}</b>. Próximo: <b>{dataBr(calc.proxReajuste)}</b>.</p>
            <label className="dm-campo">
              <span>{c.indice} acumulado em 12 meses (%)</span>
              <input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="decimal" />
              <small>Consulte o índice do mês do aniversário do contrato (FGV para IGP-M, IBGE para IPCA). Na demo, digite o percentual.</small>
            </label>
            <div className="dm-kpis">
              <Kpi rotulo="Hoje" valor={reais(c.valor)} />
              <Kpi rotulo="Reajustado" valor={reais(novoValor)} tom="cor" sub={`+${reais(novoValor - c.valor)}/mês`} />
            </div>
            <button type="button" className="dm-btn" onClick={aplicarReajuste}>Aplicar reajuste</button>
            <h4>Histórico</h4>
            {dados.reajustes.map((r, i) => (
              <span key={i} className="dm-mudo">{dataBr(r.data)} · {r.indice} {num(r.percentual, 2)}% · {reais(r.de)} → {reais(r.para)}</span>
            ))}
          </Cartao>
          <Cartao titulo="Dados do contrato">
            <span>Início: <b>{dataBr(c.inicio)}</b> · Prazo: <b>{c.meses} meses</b></span>
            <span>Valor original: <b>{reais(c.valorOriginal)}</b></span>
            <span>Vencimento: todo dia <b>{c.dia}</b></span>
            <span>Multa por atraso: <b>{c.multa}%</b> + juros de <b>{c.juros}% ao mês</b></span>
            <span>Garantia: <b>{c.garantia}</b></span>
            <span>IPTU: <b>{reais(dados.imovel.iptu)}/ano</b> · Condomínio: <b>{reais(dados.imovel.condominio)}/mês</b></span>
            <hr style={{ border: 0, borderTop: '1px solid var(--dm-linha)', width: '100%' }} />
            <b>Inquilino</b>
            <span>{dados.inquilino.nome} · {dados.inquilino.email}</span>
            <span>Desde {dataBr(dados.inquilino.desde)}</span>
          </Cartao>
        </div>
      )}

      {secao === 'ocorrencias' && (
        <Cartao titulo="Problemas no imóvel" acao={<button type="button" className="dm-btn" onClick={() => setOcorr({ data: hojeIso(), titulo: '', descricao: '', status: 'Aberto', custo: 0, quemPaga: 'Proprietário' })}>＋ Registrar</button>}>
          <ul className="dm-lista">
            {[...dados.ocorrencias].sort((a, b) => b.data.localeCompare(a.data)).map((o) => (
              <li key={o.id}>
                <button type="button" className="dm-item" onClick={() => setOcorr(o)}>
                  <span className="dm-item-ic">{o.status === 'Resolvido' ? '✅' : '🛠️'}</span>
                  <span className="dm-item-txt"><b>{o.titulo}</b><small>{dataBr(o.data)} · {o.descricao}</small></span>
                  <span style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
                    <Selo tom={o.status === 'Resolvido' ? 'bom' : 'alerta'}>{o.status}</Selo>
                    {o.custo > 0 && <small className="dm-mudo">{reais(o.custo)} · {o.quemPaga}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!dados.ocorrencias.length && <Vazio>Nenhum problema registrado.</Vazio>}
        </Cartao>
      )}

      {secao === 'imoveis' && (
        <>
          <div className="dm-galeria">
            <div className="dm-cartao">
              <FotoDemo tema="casa" semente={3} rotulo={dados.imovel.tipo} />
              <b>{dados.imovel.nome}</b>
              <small className="dm-mudo">{dados.imovel.endereco}</small>
              <Selo tom="bom">Alugado · {reais(c.valor)}</Selo>
            </div>
          </div>
          <PlanoPro texto="Grátis: um imóvel. No Pro: carteira de imóveis, recibos automáticos, informe de rendimentos para o IR e repasse para sócios." />
        </>
      )}

      {pagar && (
        <Janela titulo={`Pagamento de ${competenciaNome(pagar.competencia)}`} onFechar={() => setPagar(null)}>
          {(() => {
            const enc = encargos(c, pagar.vencimento, pagar.pagoEm, pagar.valor)
            return (
              <div style={{ display: 'grid', gap: 10 }}>
                <span>Vencimento: <b>{dataBr(pagar.vencimento)}</b> · Valor: <b>{reais(pagar.valor)}</b></span>
                <label className="dm-campo"><span>Data do pagamento</span><input type="date" value={pagar.pagoEm || ''} onChange={(e) => setPagar({ ...pagar, pagoEm: e.target.value })} /></label>
                {enc.atraso > 0 ? (
                  <div className="dm-pro" style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
                    <span style={{ color: '#9a3412' }}>{enc.atraso} dias de atraso: multa {reais(enc.multa)} + juros {reais(enc.juros)}. <b>Total {reais(enc.total)}</b></span>
                  </div>
                ) : (
                  <Selo tom="bom">Em dia</Selo>
                )}
                <div className="dm-form-pe">
                  {pagar.pagoEm && dados.pagamentos.find((p) => p.id === pagar.id)?.pagoEm && (
                    <button type="button" className="dm-btn dm-btn-perigo" onClick={() => { setDados((d) => ({ ...d, pagamentos: d.pagamentos.map((p) => (p.id === pagar.id ? { ...p, pagoEm: null, valorPago: 0 } : p)) })); setPagar(null) }}>Desmarcar pago</button>
                  )}
                  <span className="dm-espaco" />
                  <button type="button" className="dm-btn dm-btn-sec" onClick={() => alert(`Demonstração: geraria o recibo de ${reais(enc.total)} em PDF para enviar ao inquilino.`)}>Recibo</button>
                  <button type="button" className="dm-btn" onClick={() => { setDados((d) => ({ ...d, pagamentos: d.pagamentos.map((p) => (p.id === pagar.id ? { ...p, pagoEm: pagar.pagoEm, valorPago: Math.round(enc.total * 100) / 100 } : p)) })); setPagar(null) }}>Marcar como pago</button>
                </div>
              </div>
            )
          })()}
        </Janela>
      )}
      {ocorr && (
        <Janela titulo={ocorr.id ? 'Problema no imóvel' : 'Registrar problema'} onFechar={() => setOcorr(null)}>
          <Formulario
            campos={[
              { k: 'titulo', rotulo: 'O que aconteceu', obrigatorio: true, largo: true },
              { k: 'data', rotulo: 'Data', tipo: 'data' },
              { k: 'status', rotulo: 'Situação', tipo: 'select', opcoes: ['Aberto', 'Em andamento', 'Resolvido'] },
              { k: 'custo', rotulo: 'Custo (R$)', tipo: 'numero' },
              { k: 'quemPaga', rotulo: 'Quem paga', tipo: 'select', opcoes: ['Proprietário', 'Inquilino', 'Condomínio'] },
              { k: 'descricao', rotulo: 'Detalhes', tipo: 'texto-longo', largo: true },
            ]}
            inicial={ocorr}
            onSalvar={(o) => { setDados((d) => ({ ...d, ocorrencias: o.id ? d.ocorrencias.map((x) => (x.id === o.id ? { ...o, custo: Number(o.custo) || 0 } : x)) : [...d.ocorrencias, { ...o, id: uid(), custo: Number(o.custo) || 0 }] })); setOcorr(null) }}
            onApagar={ocorr.id ? () => { setDados((d) => ({ ...d, ocorrencias: d.ocorrencias.filter((x) => x.id !== ocorr.id) })); setOcorr(null) } : null}
          />
        </Janela>
      )}
    </Moldura>
  )
}
