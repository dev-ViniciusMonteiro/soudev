'use client'

// Racha Conta: pessoas, divisão igual / por porcentagem / por item, 10% do garçom, couvert, desconto, extra,
// arredondamento, quem pagou (acertos) e vários cenários para comparar. Tudo salvo no aparelho.

import { useEffect, useMemo, useState } from 'react'
import { acertos, calcular, cenarioVazio, novoId, numero, reais, resumoTexto } from './calculo'

const CHAVE = 'racha-conta-v1'
const MODOS = [['igual', 'Igual para todos'], ['porcentagem', 'Por porcentagem'], ['itens', 'Por item consumido']]

// ?exemplo=1: jantar de exemplo (usado no banner); não grava no aparelho
function exemplo() {
  const ps = ['Ana', 'Bruno', 'Caio', 'Duda'].map((nome) => ({ id: novoId(), nome }))
  const c = cenarioVazio('Jantar de sexta', ps)
  c.modo = 'itens'
  c.itens = [
    { id: novoId(), nome: 'Pizza grande', valor: '120', qtd: '1', quem: null },
    { id: novoId(), nome: 'Cerveja', valor: '14', qtd: '6', quem: [ps[0].id, ps[1].id] },
    { id: novoId(), nome: 'Refrigerante', valor: '9', qtd: '2', quem: [ps[2].id, ps[3].id] },
  ]
  c.couvert = { valor: '12', quem: null }
  c.pagou = { modo: 'um', quem: ps[0].id, valores: {} }
  const igual = { ...structuredClone(c), id: novoId(), nome: 'Tudo igual', modo: 'igual', valor: '222', pagou: { modo: 'nenhum', quem: null, valores: {} } }
  return { cenarios: [c, igual], ativo: c.id }
}
const modoExemplo = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('exemplo') === '1'

function estadoInicial() {
  const c = cenarioVazio('Conta 1')
  return { cenarios: [c], ativo: c.id }
}

export default function RachaConta() {
  const [st, setSt] = useState(estadoInicial)
  const [carregou, setCarregou] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [comparar, setComparar] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (modoExemplo()) { setSt(exemplo()); return }
    try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d?.cenarios?.length) setSt(d) } catch { /* sem armazenamento */ }
    setCarregou(true)
  }, [])
  useEffect(() => { if (carregou) try { localStorage.setItem(CHAVE, JSON.stringify(st)) } catch { /* cheio */ } }, [st, carregou])

  const c = st.cenarios.find((x) => x.id === st.ativo) || st.cenarios[0]
  const r = useMemo(() => calcular(c), [c])
  const ac = useMemo(() => acertos(c, r.linhas), [c, r])

  /* edição do cenário ativo */
  const mudar = (fn) => setSt((s) => ({ ...s, cenarios: s.cenarios.map((x) => (x.id === c.id ? fn(structuredClone(x)) : x)) }))
  const campo = (caminho, valor) => mudar((x) => { const k = caminho.split('.'); let o = x; for (const p of k.slice(0, -1)) o = o[p]; o[k.at(-1)] = valor; return x })
  const alternar = (lista, id, todos) => { const base = lista ?? todos; return base.includes(id) ? base.filter((i) => i !== id) : [...base, id] }
  const ids = c.pessoas.map((p) => p.id)

  /* pessoas */
  function adicionarPessoas(e) {
    e.preventDefault()
    const nomes = nomeNovo.split(/[,;\n]/).map((n) => n.trim()).filter(Boolean)
    if (!nomes.length) return
    mudar((x) => { x.pessoas.push(...nomes.map((nome) => ({ id: novoId(), nome }))); return x })
    setNomeNovo('')
  }
  const removerPessoa = (id) => mudar((x) => {
    x.pessoas = x.pessoas.filter((p) => p.id !== id)
    const tira = (l) => (l ? l.filter((i) => i !== id) : l)
    x.participam = tira(x.participam); x.couvert.quem = tira(x.couvert.quem); x.servico.isentos = tira(x.servico.isentos)
    x.itens.forEach((it) => (it.quem = tira(it.quem))); delete x.pct[id]; delete x.pagou.valores[id]
    if (x.pagou.quem === id) x.pagou.quem = null
    return x
  })
  const renomear = (id, nome) => mudar((x) => { x.pessoas.find((p) => p.id === id).nome = nome; return x })

  /* cenários */
  const novoCenario = () => { const n = cenarioVazio(`Conta ${st.cenarios.length + 1}`, structuredClone(c.pessoas)); setSt((s) => ({ cenarios: [...s.cenarios, n], ativo: n.id })) }
  const duplicar = () => { const d = { ...structuredClone(c), id: novoId(), nome: `${c.nome} (cópia)` }; setSt((s) => ({ cenarios: [...s.cenarios, d], ativo: d.id })) }
  const apagarCenario = () => {
    if (st.cenarios.length === 1) { const n = cenarioVazio('Conta 1'); setSt({ cenarios: [n], ativo: n.id }); return }
    if (!confirm(`Apagar "${c.nome}"?`)) return
    setSt((s) => { const resto = s.cenarios.filter((x) => x.id !== c.id); return { cenarios: resto, ativo: resto[0].id } })
  }

  /* porcentagem: distribui o que falta igualmente entre quem está sem valor (ou todos) */
  function completarPct() {
    mudar((x) => {
      const semValor = x.pessoas.filter((p) => !numero(x.pct[p.id]))
      const alvo = semValor.length ? semValor : x.pessoas
      const usado = x.pessoas.filter((p) => !alvo.includes(p)).reduce((s, p) => s + numero(x.pct[p.id]), 0)
      const resto = Math.max(0, 100 - usado), cada = Math.floor((resto / alvo.length) * 100) / 100
      alvo.forEach((p, i) => (x.pct[p.id] = String(i === alvo.length - 1 ? Math.round((resto - cada * (alvo.length - 1)) * 100) / 100 : cada).replace('.', ',')))
      return x
    })
  }
  const somaPct = c.pessoas.reduce((s, p) => s + numero(c.pct[p.id]), 0)

  /* itens */
  const novoItem = () => mudar((x) => { x.itens.push({ id: novoId(), nome: '', valor: '', qtd: '1', quem: null }); return x })
  const item = (id, k, v) => mudar((x) => { x.itens.find((i) => i.id === id)[k] = v; return x })
  const tirarItem = (id) => mudar((x) => { x.itens = x.itens.filter((i) => i.id !== id); return x })

  /* compartilhar */
  const texto = resumoTexto(c, r, ac)
  async function copiar() { try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sem permissão */ } }
  const whatsapp = () => window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener')

  /* comparação de cenários */
  const todos = useMemo(() => st.cenarios.map((x) => ({ c: x, r: calcular(x) })), [st.cenarios])
  const nomesComparar = [...new Set(todos.flatMap((t) => t.c.pessoas.map((p) => p.nome)))]

  const chips = (lista, onToggle, rotulo) => (
    <div className="rc-chips" role="group" aria-label={rotulo}>
      {c.pessoas.map((p) => {
        const ligado = lista ? lista.includes(p.id) : true
        return <button key={p.id} type="button" className={ligado ? 'ligado' : ''} aria-pressed={ligado} onClick={() => onToggle(p.id)}>{p.nome}</button>
      })}
    </div>
  )

  return (
    <div className="rc">
      <header className="rc-topo">
        <a href="/apps/racha-conta" className="rc-voltar" aria-label="Voltar para a página do Racha Conta">←</a>
        <div><strong>🧾 Racha Conta</strong><span>Divida a conta do jeito que for mais justo</span></div>
      </header>

      <nav className="rc-cenarios" aria-label="Cenários">
        {st.cenarios.map((x) => (
          <button key={x.id} className={x.id === c.id && !comparar ? 'ativo' : ''} onClick={() => { setComparar(false); setSt((s) => ({ ...s, ativo: x.id })) }}>{x.nome}</button>
        ))}
        <button className="rc-acao" onClick={novoCenario} title="Novo cenário com as mesmas pessoas">+ Novo</button>
        {st.cenarios.length > 1 && <button className={`rc-acao${comparar ? ' ativo' : ''}`} onClick={() => setComparar(!comparar)}>⇆ Comparar</button>}
      </nav>

      {comparar ? (
        <main className="rc-corpo">
          <section className="rc-cartao">
            <h2>Comparar cenários</h2>
            <p className="rc-mu">Quanto cada pessoa paga em cada cenário.</p>
            <div className="rc-rolar">
              <table className="rc-tabela">
                <thead><tr><th>Pessoa</th>{todos.map((t) => <th key={t.c.id}>{t.c.nome}</th>)}</tr></thead>
                <tbody>
                  {nomesComparar.map((nome) => (
                    <tr key={nome}><td>{nome}</td>{todos.map((t) => { const l = t.r.linhas.find((x) => x.nome === nome); return <td key={t.c.id} className="n">{l ? reais(l.total) : '—'}</td> })}</tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Total</td>{todos.map((t) => <td key={t.c.id} className="n">{reais(t.r.totais.total)}</td>)}</tr></tfoot>
              </table>
            </div>
          </section>
        </main>
      ) : (
        <main className="rc-corpo">
          <div className="rc-col">
            <section className="rc-cartao">
              <div className="rc-titulo-cenario">
                <input value={c.nome} onChange={(e) => campo('nome', e.target.value)} aria-label="Nome do cenário" />
                <button className="rc-btn texto" onClick={duplicar} title="Copia este cenário para testar outra divisão">Duplicar</button>
                <button className="rc-btn texto" onClick={apagarCenario}>Apagar</button>
              </div>
            </section>

            <section className="rc-cartao">
              <h2>1. Quem está na conta <span className="rc-qtd">{c.pessoas.length}</span></h2>
              <form className="rc-linha" onSubmit={adicionarPessoas}>
                <input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} placeholder="Nome (ou vários separados por vírgula)" aria-label="Nome da pessoa" />
                <button className="rc-btn">Adicionar</button>
              </form>
              {c.pessoas.length > 0 && (
                <ul className="rc-pessoas">
                  {c.pessoas.map((p) => (
                    <li key={p.id}>
                      <input value={p.nome} onChange={(e) => renomear(p.id, e.target.value)} aria-label="Nome" />
                      <button onClick={() => removerPessoa(p.id)} aria-label={`Tirar ${p.nome}`}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rc-cartao">
              <h2>2. Como dividir</h2>
              <div className="rc-modos" role="radiogroup" aria-label="Como dividir">
                {MODOS.map(([k, n]) => <button key={k} role="radio" aria-checked={c.modo === k} className={c.modo === k ? 'ativo' : ''} onClick={() => campo('modo', k)}>{n}</button>)}
              </div>

              {c.modo !== 'itens' && (
                <label className="rc-campo">Valor consumido (sem os 10%)
                  <input value={c.valor} onChange={(e) => campo('valor', e.target.value)} inputMode="decimal" placeholder="R$ 0,00" />
                </label>
              )}
              {c.modo === 'igual' && c.pessoas.length > 0 && (
                <><p className="rc-mu">Quem entra na divisão (toque para tirar):</p>{chips(c.participam, (id) => campo('participam', alternar(c.participam, id, ids)), 'Quem entra')}</>
              )}
              {c.modo === 'porcentagem' && (
                <>
                  <div className="rc-pcts">
                    {c.pessoas.map((p) => (
                      <label key={p.id}>{p.nome}<span><input value={c.pct[p.id] ?? ''} onChange={(e) => campo(`pct.${p.id}`, e.target.value)} inputMode="decimal" placeholder="0" />%</span></label>
                    ))}
                  </div>
                  <div className="rc-linha"><span className={Math.abs(somaPct - 100) < 0.001 ? 'rc-ok' : 'rc-alerta'}>Soma: {somaPct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</span><button className="rc-btn claro" onClick={completarPct}>Completar até 100%</button></div>
                </>
              )}
              {c.modo === 'itens' && (
                <>
                  {c.itens.map((it) => (
                    <div key={it.id} className="rc-item">
                      <div className="rc-item-linha">
                        <input className="nome" value={it.nome} onChange={(e) => item(it.id, 'nome', e.target.value)} placeholder="Item (ex.: pizza)" aria-label="Item" />
                        <input className="valor" value={it.valor} onChange={(e) => item(it.id, 'valor', e.target.value)} inputMode="decimal" placeholder="R$" aria-label="Valor unitário" />
                        <input className="qtd" value={it.qtd} onChange={(e) => item(it.id, 'qtd', e.target.value)} inputMode="numeric" aria-label="Quantidade" />
                        <button onClick={() => tirarItem(it.id)} aria-label="Tirar item">✕</button>
                      </div>
                      {chips(it.quem, (id) => item(it.id, 'quem', alternar(it.quem, id, ids)), 'Quem consumiu')}
                    </div>
                  ))}
                  <button className="rc-btn claro" onClick={novoItem}>+ Item</button>
                  <p className="rc-mu">Valor × quantidade, dividido entre quem está marcado. Ex.: 5 cervejas de R$ 12 só para quem bebeu.</p>
                </>
              )}
            </section>

            <section className="rc-cartao">
              <h2>3. Restaurante e ajustes</h2>
              <div className="rc-ajuste">
                <label className="rc-check"><input type="checkbox" checked={c.servico.ativo} onChange={(e) => campo('servico.ativo', e.target.checked)} /> Taxa de serviço (garçom)</label>
                {c.servico.ativo && <span className="rc-pct"><input value={c.servico.pct} onChange={(e) => campo('servico.pct', e.target.value)} inputMode="decimal" aria-label="Porcentagem da taxa" />%</span>}
              </div>
              {c.servico.ativo && c.pessoas.length > 0 && (
                <><p className="rc-mu">Quem paga a taxa (toque em quem <b>não</b> quer pagar):</p>
                  {chips(ids.filter((i) => !c.servico.isentos.includes(i)), (id) => campo('servico.isentos', c.servico.isentos.includes(id) ? c.servico.isentos.filter((i) => i !== id) : [...c.servico.isentos, id]), 'Quem paga a taxa')}</>
              )}
              <div className="rc-grade2">
                <label className="rc-campo">Couvert por pessoa<input value={c.couvert.valor} onChange={(e) => campo('couvert.valor', e.target.value)} inputMode="decimal" placeholder="R$ 0,00" /></label>
                <label className="rc-campo">Desconto
                  <span className="rc-com-tipo">
                    <input value={c.desconto.valor} onChange={(e) => campo('desconto.valor', e.target.value)} inputMode="decimal" placeholder="0" />
                    <select value={c.desconto.tipo} onChange={(e) => campo('desconto.tipo', e.target.value)} aria-label="Tipo de desconto"><option>R$</option><option>%</option></select>
                  </span>
                </label>
                <label className="rc-campo">Gorjeta ou taxa extra (dividida igual)<input value={c.extra} onChange={(e) => campo('extra', e.target.value)} inputMode="decimal" placeholder="R$ 0,00" /></label>
                <label className="rc-campo">Arredondar cada parte
                  <select value={c.arredondar} onChange={(e) => campo('arredondar', Number(e.target.value))}><option value={0}>Não arredondar</option><option value={50}>Para cima, de R$ 0,50</option><option value={100}>Para cima, de R$ 1</option><option value={500}>Para cima, de R$ 5</option></select>
                </label>
              </div>
              {numero(c.couvert.valor) > 0 && c.pessoas.length > 0 && (<><p className="rc-mu">Quem paga o couvert:</p>{chips(c.couvert.quem, (id) => campo('couvert.quem', alternar(c.couvert.quem, id, ids)), 'Quem paga o couvert')}</>)}
            </section>
          </div>

          <div className="rc-col rc-lado">
            <section className="rc-cartao rc-resultado" id="rc-resultado">
              <h2>Quanto cada um paga</h2>
              {r.avisos.map((a) => <p key={a} className="rc-aviso">{a}</p>)}
              <ul className="rc-partes">
                {r.linhas.map((l) => (
                  <li key={l.id}>
                    <div><b>{l.nome}</b><small>{[l.consumo && `consumo ${reais(l.consumo)}`, l.servico && `serviço ${reais(l.servico)}`, l.couvert && `couvert ${reais(l.couvert)}`, l.desconto && `desconto −${reais(l.desconto)}`, l.extra && `extra ${reais(l.extra)}`, l.arredondamento && `arred. ${reais(l.arredondamento)}`].filter(Boolean).join(' · ')}</small></div>
                    <strong>{reais(l.total)}</strong>
                  </li>
                ))}
              </ul>
              <div className="rc-total"><span>Total da conta</span><strong>{reais(r.totais.total)}</strong></div>
              {r.totais.arredondamento > 0 && <p className="rc-mu">O arredondamento soma {reais(r.totais.arredondamento)} a mais (fica de gorjeta ou de troco).</p>}
              <div className="rc-linha">
                <button className="rc-btn" onClick={whatsapp} disabled={!r.linhas.length}>Enviar no WhatsApp</button>
                <button className="rc-btn claro" onClick={copiar} disabled={!r.linhas.length}>{copiado ? 'Copiado!' : 'Copiar resumo'}</button>
              </div>
            </section>

            {c.pessoas.length > 1 && (
              <section className="rc-cartao">
                <h2>Quem pagou a conta?</h2>
                <select value={c.pagou.modo} onChange={(e) => campo('pagou.modo', e.target.value)} aria-label="Quem pagou">
                  <option value="nenhum">Cada um paga a sua parte direto</option><option value="um">Uma pessoa pagou tudo</option><option value="varios">Cada um pagou um valor</option>
                </select>
                {c.pagou.modo === 'um' && (
                  <select value={c.pagou.quem || ''} onChange={(e) => campo('pagou.quem', e.target.value)} aria-label="Quem pagou tudo">
                    <option value="">Quem pagou?</option>{c.pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                )}
                {c.pagou.modo === 'varios' && (
                  <div className="rc-pcts">
                    {c.pessoas.map((p) => <label key={p.id}>{p.nome}<span><input value={c.pagou.valores[p.id] ?? ''} onChange={(e) => campo(`pagou.valores.${p.id}`, e.target.value)} inputMode="decimal" placeholder="R$ 0,00" /></span></label>)}
                  </div>
                )}
                {ac && (c.pagou.modo !== 'um' || c.pagou.quem) && (
                  <>
                    {ac.diferenca !== 0 && c.pagou.modo === 'varios' && <p className="rc-aviso">{ac.diferenca > 0 ? `Pagaram ${reais(ac.diferenca)} a mais que a conta.` : `Faltam ${reais(-ac.diferenca)} para fechar a conta.`}</p>}
                    {ac.transferencias.length ? (
                      <ul className="rc-acertos">{ac.transferencias.map((t, i) => <li key={i}><b>{t.de}</b> paga <strong>{reais(t.valor)}</strong> para <b>{t.para}</b></li>)}</ul>
                    ) : <p className="rc-ok">Ninguém deve nada a ninguém. 👍</p>}
                  </>
                )}
              </section>
            )}
          </div>
        </main>
      )}
      {!comparar && r.linhas.length > 0 && (
        <a className="rc-barra" href="#rc-resultado">
          <span>Total <strong>{reais(r.totais.total)}</strong></span>
          <b>Ver quanto cada um paga ↓</b>
        </a>
      )}
    </div>
  )
}
