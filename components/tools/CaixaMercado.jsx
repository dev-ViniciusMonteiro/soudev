'use client'

// Controle de caixa de mercado (PDV) local e didático. Abas: Caixa (frente de caixa), Produtos,
// Relatórios e Configurar. Segue os padrões comuns de caixa: abertura com fundo de troco, vendas por
// forma de pagamento com troco, sangria/suprimento, fechamento com conferência, estoque e relatórios.
// Tudo salvo no navegador (localStorage) e exportável em JSON/CSV. Nada é enviado a servidores.

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { downloadBlob } from '@/lib/client'

const CHAVE = 'soudev-caixa-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const parseVal = (s) => { let v = String(s).trim().replace(/\s|R\$/g, ''); if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.'); return Math.abs(Number(v)) || 0 }
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }
const hora = () => new Date().toLocaleTimeString('pt-BR').slice(0, 5)
const CANAL = 'soudev-caixa-tela'

// Runtime da TELA DO CLIENTE (janela separada): recebe a venda ao vivo por BroadcastChannel e exibe
// grande, para ficar exposta ao cliente. Autocontido (embutido via .toString()).
function telaRuntime() {
  var S = { loja: 'Caixa', logo: '', itens: [], total: 0 }
  var brl = function (n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
  var css = '*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%}body{background:#0a0f1e;color:#fff;font-family:"Segoe UI",system-ui,sans-serif;overflow:hidden}'
    + '.t{height:100%;display:flex;flex-direction:column}'
    + '.hd{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:3vh 4vw;background:linear-gradient(180deg,#13351f,#0a0f1e);border-bottom:2px solid #22c55e}'
    + '.hd .loja{font-size:clamp(22px,4vw,46px);font-weight:800;display:flex;align-items:center;gap:16px}.hd .loja img{max-height:9vh;max-width:30vw;object-fit:contain}'
    + '.hd .hora{font-size:clamp(16px,2.4vw,28px);color:#9ec9b5;font-variant-numeric:tabular-nums}'
    + '.lista{flex:1;overflow:hidden;padding:2vh 4vw;display:flex;flex-direction:column;justify-content:flex-end;gap:1vh}'
    + '.li{display:flex;justify-content:space-between;gap:20px;font-size:clamp(20px,3.2vw,40px);animation:ent .25s}'
    + '.li .q{color:#9ec9b5} .li .v{font-variant-numeric:tabular-nums;font-weight:700}'
    + '@keyframes ent{from{opacity:0;transform:translateY(12px)}}'
    + '.vazio{margin:auto;text-align:center;color:#6b8;font-size:clamp(24px,5vw,56px);font-weight:800}'
    + '.ft{background:#0d1526;border-top:2px solid #22c55e;padding:3vh 4vw;display:flex;align-items:baseline;justify-content:space-between}'
    + '.ft span{font-size:clamp(18px,3vw,34px);letter-spacing:.2em;color:#9ec9b5;text-transform:uppercase}'
    + '.ft b{font-size:clamp(54px,12vw,150px);font-weight:900;color:#22c55e;font-variant-numeric:tabular-nums;line-height:1}'
    + '.ov{position:fixed;inset:0;background:rgba(6,20,12,.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3vh;text-align:center;padding:5vw}'
    + '.ov[hidden]{display:none}.ov .ob{font-size:clamp(30px,6vw,72px);font-weight:900}.ov .tr{font-size:clamp(28px,7vw,96px);font-weight:900;color:#22c55e}'
    + '.fs{position:fixed;top:10px;right:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:#fff;width:40px;height:40px;border-radius:8px;cursor:pointer;font-size:18px}'
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style)
  document.title = 'Tela do cliente'
  document.body.innerHTML = '<div class="t"><div class="hd"><div class="loja" id="loja"></div><div class="hora" id="hora"></div></div>'
    + '<div class="lista" id="lista"></div><div class="ft"><span>Total</span><b id="total">R$ 0,00</b></div></div>'
    + '<div class="ov" id="ov" hidden></div><button class="fs" id="fs" title="Tela cheia">⛶</button>'
  function render() {
    var loja = document.getElementById('loja')
    loja.innerHTML = (S.logo ? '<img src="' + S.logo + '" alt="">' : '') + '<span>' + (S.loja || 'Caixa') + '</span>'
    var lista = document.getElementById('lista')
    if (!S.itens.length) { lista.innerHTML = '<div class="vazio">Seja bem-vindo! 🛒</div>' }
    else { lista.innerHTML = S.itens.slice(-9).map(function (i) { return '<div class="li"><span><span class="q">' + i.qtd + '× </span>' + (i.nome || '') + '</span><span class="v">' + brl(i.preco * i.qtd) + '</span></div>' }).join('') }
    document.getElementById('total').textContent = brl(S.total)
  }
  function obrigado(troco) { var ov = document.getElementById('ov'); ov.innerHTML = '<div class="ob">Obrigado pela preferência! 🙏</div>' + (troco > 0 ? '<div class="tr">Troco: ' + brl(troco) + '</div>' : ''); ov.hidden = false; setTimeout(function () { ov.hidden = true }, 6000) }
  setInterval(function () { var h = document.getElementById('hora'); if (h) h.textContent = new Date().toLocaleTimeString('pt-BR') }, 1000)
  try { var ch = new BroadcastChannel('soudev-caixa-tela'); ch.onmessage = function (e) { var d = e.data || {}; if (d.status === 'finalizada') obrigado(d.troco || 0); S.loja = d.loja || S.loja; S.logo = d.logo || ''; S.itens = d.itens || []; S.total = d.total || 0; render() } } catch (e) {}
  document.getElementById('fs').onclick = function () { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen() } catch (e) {} }
  render()
}
const telaClienteHTML = () => '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>(' + telaRuntime.toString() + ')();<\/script></body></html>'

function estadoInicial() {
  return {
    config: { loja: 'Meu Mercado', formas: ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'], controlarEstoque: true },
    produtos: [
      { id: uid(), nome: 'Arroz 5kg', preco: 24.9, estoque: 20, categoria: 'Mercearia', codigo: '' },
      { id: uid(), nome: 'Feijão 1kg', preco: 8.5, estoque: 30, categoria: 'Mercearia', codigo: '' },
      { id: uid(), nome: 'Leite 1L', preco: 5.49, estoque: 40, categoria: 'Laticínios', codigo: '' },
      { id: uid(), nome: 'Pão francês (kg)', preco: 14.9, estoque: 10, categoria: 'Padaria', codigo: '' },
      { id: uid(), nome: 'Refrigerante 2L', preco: 9.99, estoque: 25, categoria: 'Bebidas', codigo: '' },
      { id: uid(), nome: 'Sabão em pó 1kg', preco: 12.9, estoque: 15, categoria: 'Limpeza', codigo: '' },
    ],
    caixa: { aberto: false, fundo: 0, aberturaTs: 0, aberturaHora: '', movimentos: [] },
    vendas: [],
    historico: [],
  }
}

export default function CaixaMercado() {
  const [st, setSt] = useState(estadoInicial)
  const [aba, setAba] = useState('caixa')
  const carregou = useRef(false)

  useEffect(() => {
    try { const s = localStorage.getItem(CHAVE); if (s) { const d = JSON.parse(s); if (d && d.config) setSt((e) => ({ ...e, ...d, config: { ...e.config, ...d.config } })) } } catch { /* sem storage */ }
    carregou.current = true
  }, [])
  useEffect(() => {
    if (!carregou.current) return
    const t = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify(st)) } catch { /* cheio */ } }, 300)
    return () => clearTimeout(t)
  }, [st])

  const upd = (fn) => setSt((e) => { const c = JSON.parse(JSON.stringify(e)); fn(c); return c })

  return (
    <div className="cx">
      <style>{CSS}</style>
      <div className="cx-top">
        <b className="cx-loja">{st.config.loja || 'Caixa'}</b>
        <span className={'cx-status ' + (st.caixa.aberto ? 'on' : 'off')}>{st.caixa.aberto ? '● Caixa aberto' : '○ Caixa fechado'}</span>
      </div>
      <div className="cx-tabs">
        {[['caixa', '🧾 Caixa'], ['produtos', '📦 Produtos'], ['relatorios', '📊 Relatórios'], ['config', '⚙ Configurar']].map(([id, nome]) => (
          <button key={id} className={'cx-tab' + (aba === id ? ' sel' : '')} onClick={() => setAba(id)}>{nome}</button>
        ))}
      </div>

      {aba === 'caixa' && <Caixa st={st} upd={upd} />}
      {aba === 'produtos' && <Produtos st={st} upd={upd} />}
      {aba === 'relatorios' && <Relatorios st={st} />}
      {aba === 'config' && <Config st={st} upd={upd} setSt={setSt} />}
    </div>
  )
}

/* ---------------- CAIXA (PDV) ---------------- */
function Caixa({ st, upd }) {
  const [busca, setBusca] = useState('')
  const [venda, setVenda] = useState({ itens: [], desconto: '' })
  const [pgto, setPgto] = useState(st.config.formas[0])
  const [recebido, setRecebido] = useState('')
  const [avulso, setAvulso] = useState({ nome: '', preco: '' })
  const [fundoIni, setFundoIni] = useState('')
  const [mov, setMov] = useState({ tipo: 'sangria', valor: '', desc: '' })
  const [contado, setContado] = useState('')
  const canal = useRef(null)
  useEffect(() => { try { canal.current = new BroadcastChannel(CANAL) } catch { /* sem suporte */ } return () => { try { canal.current && canal.current.close() } catch { /* ignora */ } } }, [])

  const abrir = () => { const f = parseVal(fundoIni); upd((c) => { c.caixa = { aberto: true, fundo: f, aberturaTs: Date.now(), aberturaHora: hora(), movimentos: [] } }); setFundoIni('') }

  const addItem = (p) => setVenda((v) => { const ex = v.itens.find((i) => i.produtoId === p.id); if (ex) return { ...v, itens: v.itens.map((i) => (i.produtoId === p.id ? { ...i, qtd: i.qtd + 1 } : i)) }; return { ...v, itens: [...v.itens, { produtoId: p.id, nome: p.nome, preco: p.preco, qtd: 1 }] } })
  const addAvulso = () => { const pr = parseVal(avulso.preco); if (!avulso.nome.trim() || !pr) return; setVenda((v) => ({ ...v, itens: [...v.itens, { produtoId: null, nome: avulso.nome.trim(), preco: pr, qtd: 1 }] })); setAvulso({ nome: '', preco: '' }) }
  const setQtd = (i, d) => setVenda((v) => ({ ...v, itens: v.itens.map((it, j) => (j === i ? { ...it, qtd: Math.max(1, it.qtd + d) } : it)) }))
  const delItem = (i) => setVenda((v) => ({ ...v, itens: v.itens.filter((_, j) => j !== i) }))

  const subtotal = venda.itens.reduce((a, i) => a + i.preco * i.qtd, 0)
  const desconto = parseVal(venda.desconto)
  const total = Math.max(0, subtotal - desconto)
  const troco = pgto === 'Dinheiro' ? Math.max(0, parseVal(recebido) - total) : 0

  const enviarTela = (extra) => { try { canal.current && canal.current.postMessage({ loja: st.config.loja, logo: st.config.logoTela || '', itens: venda.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco })), total, status: 'vendendo', ...extra }) } catch { /* ignora */ } }
  useEffect(() => { enviarTela() /* eslint-disable-next-line */ }, [venda, total, st.config.loja])
  const abrirTela = () => {
    const w = window.open('', 'telaClienteMercado', 'width=1024,height=640')
    if (!w) { alert('Permita abrir janelas (pop-up) para usar a tela do cliente, e arraste-a para o monitor virado ao cliente.'); return }
    w.document.open(); w.document.write(telaClienteHTML()); w.document.close()
    setTimeout(() => enviarTela(), 500)
    track('caixa_tela_cliente')
  }

  const finalizar = () => {
    if (!venda.itens.length) return
    if (pgto === 'Dinheiro' && parseVal(recebido) < total) { alert('Valor recebido menor que o total.'); return }
    upd((c) => {
      c.vendas.push({ id: uid(), itens: venda.itens, total, pgto, recebido: pgto === 'Dinheiro' ? parseVal(recebido) : total, troco, ts: Date.now(), data: hojeISO(), hora: hora() })
      if (c.config.controlarEstoque) venda.itens.forEach((i) => { if (i.produtoId) { const p = c.produtos.find((x) => x.id === i.produtoId); if (p) p.estoque -= i.qtd } })
    })
    track('caixa_venda', { pgto, total })
    enviarTela({ status: 'finalizada', troco, itens: [] })
    setVenda({ itens: [], desconto: '' }); setRecebido('')
  }

  const addMov = () => { const val = parseVal(mov.valor); if (!val) return; upd((c) => c.caixa.movimentos.push({ id: uid(), tipo: mov.tipo, valor: val, desc: mov.desc.trim(), hora: hora() })); setMov({ tipo: 'sangria', valor: '', desc: '' }) }

  // totais da sessão de caixa aberta
  const vendasSessao = st.vendas.filter((v) => v.ts >= st.caixa.aberturaTs)
  const porForma = {}
  vendasSessao.forEach((v) => (porForma[v.pgto] = (porForma[v.pgto] || 0) + v.total))
  const sangrias = st.caixa.movimentos.filter((m) => m.tipo === 'sangria').reduce((a, m) => a + m.valor, 0)
  const suprimentos = st.caixa.movimentos.filter((m) => m.tipo === 'suprimento').reduce((a, m) => a + m.valor, 0)
  const dinheiroEsperado = st.caixa.fundo + (porForma['Dinheiro'] || 0) + suprimentos - sangrias
  const totalVendido = vendasSessao.reduce((a, v) => a + v.total, 0)

  const fechar = () => {
    const resumo = { data: hojeISO(), hora: hora(), fundo: st.caixa.fundo, aberturaHora: st.caixa.aberturaHora, totalVendido, porForma: { ...porForma }, sangrias, suprimentos, dinheiroEsperado, contado: parseVal(contado), diferenca: parseVal(contado) - dinheiroEsperado, qtdVendas: vendasSessao.length }
    upd((c) => { c.historico.unshift(resumo); c.caixa = { aberto: false, fundo: 0, aberturaTs: 0, aberturaHora: '', movimentos: [] } })
    setContado('')
    alert(`Caixa fechado.\nEsperado em dinheiro: ${brl(dinheiroEsperado)}\nContado: ${brl(parseVal(contado))}\nDiferença: ${brl(parseVal(contado) - dinheiroEsperado)}`)
  }

  if (!st.caixa.aberto) {
    return (
      <div className="cx-pane">
        <div className="cx-abrir">
          <h3 className="cx-h3">Abrir o caixa</h3>
          <p className="muted">Informe o <b>fundo de troco</b> (dinheiro que fica na gaveta para dar troco). Só depois de abrir dá para registrar vendas.</p>
          <div className="cx-abrir-row">
            <input placeholder="Fundo de troco (ex.: 100,00)" inputMode="decimal" value={fundoIni} onChange={(e) => setFundoIni(e.target.value)} />
            <button className="btn btn-primary" onClick={abrir}>Abrir caixa</button>
          </div>
        </div>
        {st.historico[0] && <p className="muted small">Último fechamento: {st.historico[0].data} · vendido {brl(st.historico[0].totalVendido)} · diferença {brl(st.historico[0].diferenca)}.</p>}
      </div>
    )
  }

  const prodFiltrados = st.produtos.filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigo && p.codigo.includes(busca)))

  return (
    <div className="cx-pdv">
      {/* esquerda: produtos */}
      <div className="cx-prod">
        <input className="cx-busca" placeholder="Buscar produto ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
        <div className="cx-prod-grid">
          {prodFiltrados.map((p) => (
            <button key={p.id} className="cx-prod-btn" onClick={() => addItem(p)} disabled={st.config.controlarEstoque && p.estoque <= 0}>
              <span className="cx-prod-nome">{p.nome}</span>
              <span className="cx-prod-preco">{brl(p.preco)}</span>
              {st.config.controlarEstoque && <span className={'cx-prod-est' + (p.estoque <= 0 ? ' zero' : '')}>{p.estoque <= 0 ? 'sem estoque' : `${p.estoque} un`}</span>}
            </button>
          ))}
          {prodFiltrados.length === 0 && <p className="muted" style={{ gridColumn: '1/-1' }}>Nenhum produto. Cadastre na aba Produtos ou use item avulso.</p>}
        </div>
        <div className="cx-avulso">
          <input placeholder="Item avulso" value={avulso.nome} onChange={(e) => setAvulso((o) => ({ ...o, nome: e.target.value }))} />
          <input placeholder="Preço" inputMode="decimal" value={avulso.preco} onChange={(e) => setAvulso((o) => ({ ...o, preco: e.target.value }))} />
          <button className="btn btn-ghost btn-sm" onClick={addAvulso}>+ Avulso</button>
        </div>
      </div>

      {/* direita: venda atual */}
      <div className="cx-venda">
        <div className="cx-venda-head">
          <h3 className="cx-h3">Venda atual</h3>
          <button className="btn btn-ghost btn-sm" onClick={abrirTela} title="Abre uma janela para exibir ao cliente (arraste para a 2ª tela)">🖥 Tela do cliente</button>
        </div>
        <div className="cx-carrinho">
          {venda.itens.length === 0 && <p className="muted">Clique nos produtos para adicionar.</p>}
          {venda.itens.map((i, idx) => (
            <div className="cx-ci" key={idx}>
              <span className="cx-ci-nome">{i.nome}<small>{brl(i.preco)}</small></span>
              <span className="cx-ci-qtd"><button onClick={() => setQtd(idx, -1)}>−</button>{i.qtd}<button onClick={() => setQtd(idx, 1)}>+</button></span>
              <b className="cx-ci-tot">{brl(i.preco * i.qtd)}</b>
              <button className="cx-x" onClick={() => delItem(idx)} aria-label="Remover">×</button>
            </div>
          ))}
        </div>
        <div className="cx-tot-row"><span>Subtotal</span><b>{brl(subtotal)}</b></div>
        <div className="cx-tot-row"><span>Desconto</span><input className="cx-desc" inputMode="decimal" placeholder="0,00" value={venda.desconto} onChange={(e) => setVenda((v) => ({ ...v, desconto: e.target.value }))} /></div>
        <div className="cx-tot-row total"><span>Total</span><b>{brl(total)}</b></div>
        <div className="cx-pgto">
          {st.config.formas.map((f) => <button key={f} className={'cx-pg' + (pgto === f ? ' sel' : '')} onClick={() => setPgto(f)}>{f}</button>)}
        </div>
        {pgto === 'Dinheiro' && (
          <div className="cx-tot-row"><span>Recebido</span><input className="cx-desc" inputMode="decimal" placeholder="0,00" value={recebido} onChange={(e) => setRecebido(e.target.value)} /><b className="cx-troco">Troco: {brl(troco)}</b></div>
        )}
        <button className="btn btn-primary cx-finalizar" onClick={finalizar} disabled={!venda.itens.length}>Finalizar venda · {brl(total)}</button>
      </div>

      {/* rodapé: controle do caixa */}
      <div className="cx-controle">
        <div className="cx-ctile"><span>Vendido na sessão</span><b>{brl(totalVendido)}</b></div>
        <div className="cx-ctile"><span>Dinheiro esperado</span><b>{brl(dinheiroEsperado)}</b></div>
        <div className="cx-ctile"><span>Nº de vendas</span><b>{vendasSessao.length}</b></div>
        <details className="cx-mov">
          <summary>Sangria / Suprimento e fechar caixa</summary>
          <div className="cx-mov-form">
            <select value={mov.tipo} onChange={(e) => setMov((m) => ({ ...m, tipo: e.target.value }))}><option value="sangria">Sangria (retirada)</option><option value="suprimento">Suprimento (reforço)</option></select>
            <input placeholder="Valor" inputMode="decimal" value={mov.valor} onChange={(e) => setMov((m) => ({ ...m, valor: e.target.value }))} />
            <input placeholder="Motivo" value={mov.desc} onChange={(e) => setMov((m) => ({ ...m, desc: e.target.value }))} />
            <button className="btn btn-ghost btn-sm" onClick={addMov}>Registrar</button>
          </div>
          {st.caixa.movimentos.map((m) => <div className="cx-mov-item" key={m.id}>{m.hora} · {m.tipo === 'sangria' ? '− ' : '+ '}{brl(m.valor)} {m.desc && `· ${m.desc}`}</div>)}
          <div className="cx-fechar">
            <input placeholder="Dinheiro contado na gaveta" inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} />
            <button className="btn" onClick={fechar}>Fechar caixa</button>
          </div>
        </details>
      </div>
    </div>
  )
}

/* ---------------- PRODUTOS ---------------- */
function Produtos({ st, upd }) {
  const [novo, setNovo] = useState({ nome: '', preco: '', estoque: '', categoria: '', codigo: '' })
  const add = () => { if (!novo.nome.trim() || !parseVal(novo.preco)) return; upd((c) => c.produtos.push({ id: uid(), nome: novo.nome.trim(), preco: parseVal(novo.preco), estoque: Number(novo.estoque) || 0, categoria: novo.categoria.trim(), codigo: novo.codigo.trim() })); setNovo({ nome: '', preco: '', estoque: '', categoria: '', codigo: '' }) }
  const setP = (id, k, v) => upd((c) => { const p = c.produtos.find((x) => x.id === id); if (p) p[k] = k === 'preco' ? parseVal(v) : k === 'estoque' ? (Number(v) || 0) : v })
  const del = (id) => upd((c) => { c.produtos = c.produtos.filter((x) => x.id !== id) })

  return (
    <div className="cx-pane">
      <p className="muted">Cadastre os produtos com preço e estoque. No caixa, eles viram botões de venda e o estoque baixa a cada venda.</p>
      <div className="cx-prodform">
        <input placeholder="Nome" value={novo.nome} onChange={(e) => setNovo((o) => ({ ...o, nome: e.target.value }))} />
        <input placeholder="Preço" inputMode="decimal" value={novo.preco} onChange={(e) => setNovo((o) => ({ ...o, preco: e.target.value }))} />
        <input placeholder="Estoque" inputMode="numeric" value={novo.estoque} onChange={(e) => setNovo((o) => ({ ...o, estoque: e.target.value }))} />
        <input placeholder="Categoria" value={novo.categoria} onChange={(e) => setNovo((o) => ({ ...o, categoria: e.target.value }))} />
        <input placeholder="Código" value={novo.codigo} onChange={(e) => setNovo((o) => ({ ...o, codigo: e.target.value }))} />
        <button className="btn btn-primary btn-sm" onClick={add}>+ Produto</button>
      </div>
      <div className="cx-prodtab">
        <div className="cx-prodtab-head"><span>Produto</span><span>Preço</span><span>Estoque</span><span>Categoria</span><span></span></div>
        {st.produtos.map((p) => (
          <div className={'cx-prodtab-row' + (st.config.controlarEstoque && p.estoque <= 0 ? ' zero' : '')} key={p.id}>
            <input value={p.nome} onChange={(e) => setP(p.id, 'nome', e.target.value)} />
            <input value={p.preco} onChange={(e) => setP(p.id, 'preco', e.target.value)} inputMode="decimal" />
            <input value={p.estoque} onChange={(e) => setP(p.id, 'estoque', e.target.value)} inputMode="numeric" />
            <input value={p.categoria} onChange={(e) => setP(p.id, 'categoria', e.target.value)} />
            <button className="cx-x" onClick={() => del(p.id)} aria-label="Remover">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- RELATÓRIOS ---------------- */
function Relatorios({ st }) {
  const [dia, setDia] = useState(hojeISO())
  const vendasDia = st.vendas.filter((v) => v.data === dia)
  const total = vendasDia.reduce((a, v) => a + v.total, 0)
  const ticket = vendasDia.length ? total / vendasDia.length : 0
  const porForma = {}; vendasDia.forEach((v) => (porForma[v.pgto] = (porForma[v.pgto] || 0) + v.total))
  const porProd = {}; vendasDia.forEach((v) => v.itens.forEach((i) => { porProd[i.nome] = (porProd[i.nome] || 0) + i.qtd }))
  const topProd = Object.entries(porProd).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxForma = Math.max(1, ...Object.values(porForma))
  const maxProd = Math.max(1, ...topProd.map((p) => p[1]))

  return (
    <div className="cx-pane">
      <div className="cx-rel-top">
        <label>Dia <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></label>
        <div className="cx-rel-tiles">
          <div className="cx-ctile"><span>Vendas</span><b>{vendasDia.length}</b></div>
          <div className="cx-ctile"><span>Faturamento</span><b>{brl(total)}</b></div>
          <div className="cx-ctile"><span>Ticket médio</span><b>{brl(ticket)}</b></div>
        </div>
      </div>
      <div className="cx-rel-cols">
        <div className="cx-graf">
          <h4>Por forma de pagamento</h4>
          {Object.keys(porForma).length === 0 ? <p className="muted">Sem vendas neste dia.</p> : Object.entries(porForma).map(([f, v]) => (
            <div className="cx-barra" key={f}><span className="cx-barra-l">{f}</span><span className="cx-barra-t"><span style={{ width: v / maxForma * 100 + '%' }} /></span><span className="cx-barra-v">{brl(v)}</span></div>
          ))}
        </div>
        <div className="cx-graf">
          <h4>Mais vendidos (unidades)</h4>
          {topProd.length === 0 ? <p className="muted">Sem vendas neste dia.</p> : topProd.map(([n, q]) => (
            <div className="cx-barra" key={n}><span className="cx-barra-l">{n}</span><span className="cx-barra-t"><span style={{ width: q / maxProd * 100 + '%' }} /></span><span className="cx-barra-v">{q}</span></div>
          ))}
        </div>
      </div>
      {st.historico.length > 0 && (
        <div className="cx-graf">
          <h4>Fechamentos de caixa</h4>
          {st.historico.slice(0, 10).map((h, i) => (
            <div className="cx-fech" key={i}><span>{h.data} {h.hora}</span><span className="muted">vendido {brl(h.totalVendido)} · esperado {brl(h.dinheiroEsperado)}</span><b className={h.diferenca < 0 ? 'cx-neg' : h.diferenca > 0 ? 'cx-pos' : ''}>dif. {brl(h.diferenca)}</b></div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- CONFIGURAR ---------------- */
function Config({ st, upd, setSt }) {
  const [novaForma, setNovaForma] = useState('')
  const fileRef = useRef(null)
  const exportJSON = () => downloadBlob(new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' }), 'caixa-backup.json')
  const exportProdCSV = () => { const l = [['Nome', 'Preço', 'Estoque', 'Categoria', 'Código']]; st.produtos.forEach((p) => l.push([p.nome, p.preco.toFixed(2), p.estoque, p.categoria, p.codigo])); baixarCSV(l, 'produtos.csv') }
  const exportVendCSV = () => { const l = [['Data', 'Hora', 'Total', 'Pagamento', 'Itens']]; st.vendas.forEach((v) => l.push([v.data, v.hora, v.total.toFixed(2), v.pgto, v.itens.map((i) => `${i.qtd}x ${i.nome}`).join(' | ')])); baixarCSV(l, 'vendas.csv') }
  const baixarCSV = (linhas, nome) => { const csv = linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n'); downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv' }), nome) }
  const importar = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d.config && d.produtos) setSt(d); else alert('Arquivo inválido.') } catch { alert('Arquivo inválido.') } }; r.readAsText(f); e.target.value = '' }

  return (
    <div className="cx-pane">
      <label className="cx-campo">Nome da loja<input value={st.config.loja} onChange={(e) => upd((c) => { c.config.loja = e.target.value })} /></label>
      <label className="cx-check"><input type="checkbox" checked={st.config.controlarEstoque} onChange={(e) => upd((c) => { c.config.controlarEstoque = e.target.checked })} /> Controlar estoque (baixa a cada venda)</label>

      <div className="cx-logo">
        <span className="cx-lbl">Logo da tela do cliente (opcional)</span>
        <div className="cx-logo-row">
          {st.config.logoTela && <img className="cx-logo-mini" src={st.config.logoTela} alt="" />}
          <label className="btn btn-ghost btn-sm">{st.config.logoTela ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 1.2 * 1024 * 1024) { alert('Logo muito grande (máx. ~1,2 MB).'); return } const r = new FileReader(); r.onload = () => upd((c) => { c.config.logoTela = r.result }); r.readAsDataURL(f) }} /></label>
          {st.config.logoTela && <button className="btn btn-ghost btn-sm" onClick={() => upd((c) => { c.config.logoTela = '' })}>Remover</button>}
        </div>
        <p className="muted small">Aparece no topo da tela virada ao cliente, junto do nome da loja.</p>
      </div>

      <div className="cx-formas">
        <span className="cx-lbl">Formas de pagamento</span>
        <div className="cx-formas-chips">
          {st.config.formas.map((f, i) => <span className="cx-chip" key={i}>{f}<button onClick={() => upd((c) => { c.config.formas.splice(i, 1) })} aria-label="Remover">×</button></span>)}
        </div>
        <div className="cx-add-forma">
          <input placeholder="Nova forma (ex.: Fiado)" value={novaForma} onChange={(e) => setNovaForma(e.target.value)} />
          <button className="btn btn-ghost btn-sm" onClick={() => { if (novaForma.trim()) { upd((c) => c.config.formas.push(novaForma.trim())); setNovaForma('') } }}>+ Forma</button>
        </div>
      </div>

      <div className="cx-backup">
        <span className="cx-lbl">Backup e planilhas</span>
        <div className="cx-backup-btns">
          <button className="btn btn-ghost btn-sm" onClick={exportJSON}>⬇ Backup (JSON)</button>
          <button className="btn btn-ghost btn-sm" onClick={exportProdCSV}>⬇ Produtos (CSV)</button>
          <button className="btn btn-ghost btn-sm" onClick={exportVendCSV}>⬇ Vendas (CSV)</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>⬆ Importar backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importar} />
        </div>
        <p className="muted small">Os CSV abrem no Excel/Google Planilhas. O backup JSON guarda tudo (produtos, vendas, config) para restaurar depois ou em outro computador.</p>
      </div>
    </div>
  )
}

const CSS = `
.cx{margin-top:14px;display:flex;flex-direction:column;gap:12px}
.cx .btn-sm{padding:6px 10px;font-size:13px}
.cx input,.cx select{padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.cx-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.cx-loja{font-size:18px}
.cx-status{font-size:13px;font-weight:700}
.cx-status.on{color:var(--green)} .cx-status.off{color:var(--muted)}
.cx-tabs{display:flex;gap:6px;flex-wrap:wrap}
.cx-tab{flex:1;min-width:110px;padding:10px;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:var(--radius-lg);cursor:pointer;font:inherit;font-weight:700;font-size:14px}
.cx-tab.sel{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.cx-pane{display:flex;flex-direction:column;gap:12px}
.cx-h3{font-size:16px;margin:0}
.cx-lbl{display:block;font-weight:600;font-size:14px;margin-bottom:6px}
.cx-abrir{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:16px;max-width:460px}
.cx-abrir-row{display:flex;gap:8px;margin-top:10px}.cx-abrir-row input{flex:1}

.cx-pdv{display:grid;grid-template-columns:1fr 360px;grid-template-areas:"prod venda" "controle controle";gap:14px}
@media(max-width:820px){.cx-pdv{grid-template-columns:1fr;grid-template-areas:"venda" "prod" "controle"}}
.cx-prod{grid-area:prod;display:flex;flex-direction:column;gap:10px}
.cx-busca{width:100%}
.cx-prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;max-height:360px;overflow:auto}
.cx-prod-btn{display:flex;flex-direction:column;gap:2px;text-align:left;padding:10px;border:1px solid var(--line-strong);background:var(--panel);color:var(--text);border-radius:var(--radius-lg);cursor:pointer}
.cx-prod-btn:disabled{opacity:.45;cursor:not-allowed}
.cx-prod-nome{font-weight:600;font-size:13px}
.cx-prod-preco{color:var(--accent);font-weight:700}
.cx-prod-est{font-size:11px;color:var(--muted)} .cx-prod-est.zero{color:var(--red)}
.cx-avulso{display:flex;gap:8px}.cx-avulso input{flex:1;min-width:0}

.cx-venda{grid-area:venda;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:14px;display:flex;flex-direction:column;gap:8px}
.cx-venda-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cx-logo-row{display:flex;gap:8px;align-items:center}
.cx-logo-mini{height:40px;max-width:120px;object-fit:contain;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:2px}
.cx-carrinho{display:flex;flex-direction:column;gap:6px;max-height:240px;overflow:auto;min-height:60px}
.cx-ci{display:flex;align-items:center;gap:8px}
.cx-ci-nome{flex:1;min-width:0;display:flex;flex-direction:column;font-size:14px}.cx-ci-nome small{color:var(--muted);font-size:11px}
.cx-ci-qtd{display:flex;align-items:center;gap:6px}.cx-ci-qtd button{width:26px;height:26px;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:6px;cursor:pointer}
.cx-ci-tot{font-variant-numeric:tabular-nums}
.cx-x{border:none;background:none;color:var(--muted);font-size:18px;cursor:pointer}.cx-x:hover{color:var(--red)}
.cx-tot-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:14px;border-top:1px solid var(--line);padding-top:8px}
.cx-tot-row.total{font-size:20px;font-weight:800}
.cx-desc{width:120px;text-align:right}
.cx-troco{color:var(--green)}
.cx-pgto{display:flex;flex-wrap:wrap;gap:6px}
.cx-pg{padding:8px 10px;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:8px;cursor:pointer;font-size:13px}
.cx-pg.sel{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.cx-finalizar{margin-top:6px;font-size:17px;padding:14px}

.cx-controle{grid-area:controle;display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
.cx-ctile{background:var(--panel);border:1px solid var(--line);border-top:3px solid var(--accent);border-radius:10px;padding:8px 14px;text-align:center;min-width:130px}
.cx-ctile span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}
.cx-ctile b{font-size:18px;font-variant-numeric:tabular-nums}
.cx-mov{flex:1 1 260px;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:10px 12px}
.cx-mov summary{cursor:pointer;font-weight:600;font-size:14px}
.cx-mov-form{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.cx-mov-form input,.cx-mov-form select{flex:1;min-width:90px}
.cx-mov-item{font-size:12px;color:var(--muted);padding:2px 0}
.cx-fechar{display:flex;gap:8px;margin-top:10px;border-top:1px dashed var(--line);padding-top:10px}.cx-fechar input{flex:1}

.cx-prodform,.cx-formas-chips,.cx-add-forma,.cx-backup-btns{display:flex;gap:8px;flex-wrap:wrap}
.cx-prodform input{flex:1;min-width:90px}
.cx-prodtab{display:flex;flex-direction:column;gap:4px;overflow-x:auto}
.cx-prodtab-head,.cx-prodtab-row{display:grid;grid-template-columns:2fr 1fr 0.8fr 1.2fr 34px;gap:6px;align-items:center;min-width:520px}
.cx-prodtab-head{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.cx-prodtab-row input{min-width:0}
.cx-prodtab-row.zero input{border-color:var(--red)}
.cx-campo{display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600;max-width:320px}
.cx-check{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600}.cx-check input{width:auto}
.cx-chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:4px 10px;font-size:13px}
.cx-chip button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px}
.cx-rel-top{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.cx-rel-top label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}
.cx-rel-tiles{display:flex;gap:10px;flex-wrap:wrap}
.cx-rel-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:620px){.cx-rel-cols{grid-template-columns:1fr}}
.cx-graf{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:14px}
.cx-graf h4{font-size:14px;margin:0 0 10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.cx-barra{display:grid;grid-template-columns:110px 1fr auto;gap:8px;align-items:center;font-size:13px;margin-bottom:6px}
.cx-barra-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-barra-t{height:12px;background:var(--panel-2);border-radius:6px;overflow:hidden}.cx-barra-t span{display:block;height:100%;background:var(--accent)}
.cx-barra-v{font-variant-numeric:tabular-nums;color:var(--muted)}
.cx-fech{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px;border-top:1px solid var(--line);padding:6px 0}
.cx-fech b{margin-left:auto;font-variant-numeric:tabular-nums}.cx-neg{color:var(--red)}.cx-pos{color:var(--green)}
`
