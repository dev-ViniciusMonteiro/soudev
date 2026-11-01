'use client'

import { useEffect, useState } from 'react'
import { Barra, Cartao, Formulario, FotoDemo, FotoSessao, Janela, Kpi, Moldura, PlanoPro, Selo, Vazio, dataBr, diasAte, hojeIso, reais, somaDias, somaMeses, uid, useDemo } from './kit'

const LIMITE = 20
const CATEGORIAS = ['Eletrônicos', 'Eletrodomésticos', 'Informática', 'Celulares', 'Ferramentas', 'Móveis', 'Outros']
const ICONES = { Eletrônicos: '📺', Eletrodomésticos: '🧺', Informática: '💻', Celulares: '📱', Ferramentas: '🛠️', Móveis: '🛋️', Outros: '📦' }

// O que a "leitura" da nota devolve na demo (no app real viria do OCR / chave de acesso da NF-e).
const NOTAS_EXEMPLO = [
  { nome: 'Fritadeira Air Fryer 4 L', loja: 'Magazine Central', categoria: 'Eletrodomésticos', valor: 399.9, garantiaMeses: 12, numeroNota: '000.214.553' },
  { nome: 'Fone Bluetooth com cancelamento de ruído', loja: 'Loja do Som', categoria: 'Eletrônicos', valor: 549, garantiaMeses: 12, numeroNota: '000.087.120' },
  { nome: 'Furadeira de impacto 650 W', loja: 'Casa & Obra', categoria: 'Ferramentas', valor: 289.9, garantiaMeses: 24, numeroNota: '000.551.904' },
]

function demo() {
  const h = hojeIso()
  const p = (dias, nome, loja, categoria, valor, garantiaMeses, estendida = 0, semente = 1) => ({ id: uid(), nome, loja, categoria, dataCompra: somaDias(h, dias), valor, garantiaMeses, estendidaMeses: estendida, numeroNota: String(100000 + semente * 7919).replace(/(\d{3})(\d{3})/, '000.$1.$2'), semente, obs: '' })
  return {
    produtos: [
      p(-340, 'Geladeira Frost Free 450 L', 'Eletro Mais', 'Eletrodomésticos', 4299, 12, 24, 1),
      p(-355, 'Smart TV 55" 4K', 'Magazine Central', 'Eletrônicos', 3199, 12, 0, 2),
      p(-80, 'Notebook 15" Ryzen 7', 'InfoStore', 'Informática', 4899, 12, 0, 3),
      p(-200, 'Celular 256 GB', 'Loja Oficial', 'Celulares', 2799, 12, 0, 4),
      p(-420, 'Máquina de lavar 12 kg', 'Eletro Mais', 'Eletrodomésticos', 2399, 12, 0, 5),
      p(-25, 'Liquidificador 1200 W', 'Casa Prática', 'Eletrodomésticos', 229, 12, 0, 6),
      p(-300, 'Sofá retrátil 3 lugares', 'Móveis Bela', 'Móveis', 2690, 3, 0, 7),
      p(-150, 'Parafusadeira 12 V', 'Casa & Obra', 'Ferramentas', 349, 24, 0, 8),
    ],
  }
}

function status(p) {
  const fim = somaMeses(p.dataCompra, (p.garantiaMeses || 0) + (p.estendidaMeses || 0))
  const dias = diasAte(fim)
  const tom = dias < 0 ? 'ruim' : dias <= 30 ? 'alerta' : 'bom'
  const total = (new Date(fim) - new Date(p.dataCompra)) / 86400000
  return { fim, dias, tom, usado: total ? 1 - Math.max(0, dias) / total : 1 }
}

function Leitor({ onPronto, onFechar }) {
  const [foto, setFoto] = useState(null)
  const [etapa, setEtapa] = useState('escolher') // escolher | lendo | pronto
  useEffect(() => {
    if (etapa !== 'lendo') return
    const t = setTimeout(() => setEtapa('pronto'), 1800)
    return () => clearTimeout(t)
  }, [etapa])
  const lido = NOTAS_EXEMPLO[Math.floor(Date.now() / 1000) % NOTAS_EXEMPLO.length]
  return (
    <Janela titulo="Cadastrar pela nota fiscal" onFechar={onFechar}>
      {etapa === 'escolher' && (
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
          <FotoDemo tema="nota" semente={3} className="gr-nota-grande" />
          <p className="dm-mudo" style={{ margin: 0 }}>Fotografe a nota fiscal ou o cupom. O app lê a data, a loja, o produto e o valor.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <FotoSessao rotulo="Fotografar nota" onFoto={(url) => { setFoto(url); setEtapa('lendo') }} />
            <button type="button" className="dm-btn" onClick={() => setEtapa('lendo')}>Usar nota de exemplo</button>
          </div>
          <small className="dm-mudo">Demonstração: a foto não é enviada nem salva; a leitura é simulada.</small>
        </div>
      )}
      {etapa === 'lendo' && (
        <div className="gr-lendo">
          {foto ? <img src={foto} alt="Sua nota" /> : <FotoDemo tema="nota" semente={3} />}
          <div className="gr-scanner" aria-hidden="true" />
          <p>Lendo a nota fiscal…</p>
        </div>
      )}
      {etapa === 'pronto' && (
        <>
          <p style={{ margin: '0 0 10px' }}>✓ Encontrei estes dados. Confira e salve:</p>
          <Formulario
            campos={[
              { k: 'nome', rotulo: 'Produto', largo: true, obrigatorio: true },
              { k: 'loja', rotulo: 'Loja' },
              { k: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: CATEGORIAS },
              { k: 'dataCompra', rotulo: 'Data da compra', tipo: 'data' },
              { k: 'valor', rotulo: 'Valor (R$)', tipo: 'numero' },
              { k: 'garantiaMeses', rotulo: 'Garantia do fabricante (meses)', tipo: 'numero' },
              { k: 'numeroNota', rotulo: 'Nº da nota' },
            ]}
            inicial={{ ...lido, dataCompra: hojeIso(), estendidaMeses: 0, semente: 9, obs: '' }}
            onSalvar={onPronto}
            rotuloSalvar="Salvar produto"
          />
        </>
      )}
    </Janela>
  )
}

export default function Garantia() {
  const [dados, setDados, restaurar] = useDemo('demo-garantia-v1', demo)
  const [secao, setSecao] = useState('produtos')
  const [editar, setEditar] = useState(null)
  const [leitor, setLeitor] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [ver, setVer] = useState(null)

  if (!dados) return null
  const lista = dados.produtos.map((p) => ({ ...p, st: status(p) }))
  const vigentes = lista.filter((p) => p.st.dias >= 0)
  const vencendo = lista.filter((p) => p.st.dias >= 0 && p.st.dias <= 30)
  const protegido = vigentes.reduce((s, p) => s + p.valor, 0)
  const salvar = (x) => {
    const item = { ...x, valor: Number(x.valor) || 0, garantiaMeses: Number(x.garantiaMeses) || 0, estendidaMeses: Number(x.estendidaMeses) || 0 }
    setDados((d) => ({ ...d, produtos: item.id ? d.produtos.map((p) => (p.id === item.id ? item : p)) : [{ ...item, id: uid() }, ...d.produtos] }))
    setEditar(null)
    setLeitor(false)
  }
  const cheio = dados.produtos.length >= LIMITE
  const filtrados = lista
    .filter((p) => (filtro === 'vigentes' ? p.st.dias >= 0 : filtro === 'vencendo' ? p.st.dias >= 0 && p.st.dias <= 30 : filtro === 'vencidas' ? p.st.dias < 0 : true))
    .filter((p) => !busca || `${p.nome} ${p.loja}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.st.dias - b.st.dias)

  return (
    <Moldura
      nome="Garantia Fácil"
      icone="🧾"
      cor="#7c3aed"
      secao={secao}
      onSecao={setSecao}
      onRestaurar={restaurar}
      secoes={[['produtos', '📦', 'Produtos'], ['alertas', '🔔', 'Alertas'], ['acionar', '🛟', 'Acionar'], ['plano', '☁️', 'Espaço']]}
    >
      <div className="dm-kpis">
        <Kpi rotulo="Na garantia" valor={vigentes.length} tom="cor" sub={`de ${lista.length} produtos`} />
        <Kpi rotulo="Valor protegido" valor={reais(protegido)} />
        <Kpi rotulo="Vencem em 30 dias" valor={vencendo.length} tom={vencendo.length ? 'alerta' : 'bom'} />
        <Kpi rotulo="Notas guardadas" valor={`${dados.produtos.length}/${LIMITE}`} sub="no plano grátis" />
      </div>

      {secao === 'produtos' && (
        <Cartao
          titulo="Meus produtos"
          acao={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="dm-btn" disabled={cheio} onClick={() => setLeitor(true)}>📷 Fotografar nota</button>
              <button type="button" className="dm-btn dm-btn-sec" disabled={cheio} onClick={() => setEditar({ nome: '', loja: '', categoria: 'Eletrônicos', dataCompra: hojeIso(), valor: '', garantiaMeses: 12, estendidaMeses: 0, numeroNota: '', semente: 5, obs: '' })}>Digitar</button>
            </div>
          }
        >
          <div className="dm-filtros">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou loja…" aria-label="Buscar" />
            <div className="dm-chips">
              {[['todos', 'Todos'], ['vigentes', 'Na garantia'], ['vencendo', 'Vencendo'], ['vencidas', 'Vencidas']].map(([k, n]) => (
                <button key={k} type="button" className="dm-chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="gr-grade">
            {filtrados.map((p) => (
              <button key={p.id} type="button" className="gr-card" onClick={() => setVer(p)}>
                <span className="gr-card-ic">{ICONES[p.categoria] || '📦'}</span>
                <span className="dm-item-txt">
                  <b>{p.nome}</b>
                  <small>{p.loja} · {dataBr(p.dataCompra)} · {reais(p.valor)}</small>
                </span>
                <Barra valor={p.st.usado} max={1} tom={p.st.tom} />
                <Selo tom={p.st.tom}>{p.st.dias < 0 ? `Venceu em ${dataBr(p.st.fim)}` : `Garantia até ${dataBr(p.st.fim)} · ${p.st.dias} dias`}</Selo>
              </button>
            ))}
          </div>
          {!filtrados.length && <Vazio>Nada por aqui.</Vazio>}
        </Cartao>
      )}

      {secao === 'alertas' && (
        <Cartao titulo="Alertas antes de vencer">
          <p className="dm-mudo" style={{ margin: 0 }}>Você recebe um aviso 30 e 7 dias antes de cada garantia acabar, para testar o produto e acionar o conserto ainda dentro do prazo.</p>
          <ul className="dm-lista">
            {lista.filter((p) => p.st.dias >= -30).sort((a, b) => a.st.dias - b.st.dias).map((p) => (
              <li key={p.id} className="dm-item" style={{ cursor: 'default' }}>
                <span className="dm-item-ic">{p.st.dias < 0 ? '⛔' : p.st.dias <= 30 ? '⏰' : '✅'}</span>
                <span className="dm-item-txt">
                  <b>{p.nome}</b>
                  <small>{p.st.dias < 0 ? `venceu há ${-p.st.dias} dias` : `vence em ${p.st.dias} dias (${dataBr(p.st.fim)})`}</small>
                </span>
                <Selo tom={p.st.tom}>{p.st.dias < 0 ? 'Vencida' : p.st.dias <= 30 ? 'Atenção' : 'Ok'}</Selo>
              </li>
            ))}
          </ul>
          <button type="button" className="dm-btn dm-btn-sec" onClick={() => alert('Demonstração: no app de verdade os avisos chegam por notificação e e-mail.')}>🔔 Receber avisos</button>
        </Cartao>
      )}

      {secao === 'acionar' && (
        <Cartao titulo="Como acionar a garantia">
          <ol className="gr-passos">
            <li><b>Confira o prazo.</b> Pelo Código de Defesa do Consumidor, todo produto durável tem 90 dias de garantia legal, que somam com a garantia do fabricante.</li>
            <li><b>Separe a nota fiscal.</b> Ela está guardada aqui: abra o produto e use “Ver nota”.</li>
            <li><b>Procure a assistência autorizada</b> ou a loja. O conserto tem que ser feito em até 30 dias.</li>
            <li><b>Passou de 30 dias sem conserto?</b> Você pode pedir a troca, o dinheiro de volta ou o abatimento do preço (art. 18 do CDC).</li>
            <li><b>Problema escondido</b> (vício oculto) conta a partir de quando aparece. Guarde fotos e protocolos.</li>
          </ol>
        </Cartao>
      )}

      {secao === 'plano' && (
        <Cartao titulo="Espaço de armazenamento">
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{dados.produtos.length} de {LIMITE} notas</b><span className="dm-mudo">plano grátis</span></div>
            <Barra valor={dados.produtos.length} max={LIMITE} tom={dados.produtos.length > LIMITE * 0.8 ? 'alerta' : undefined} />
          </div>
          <PlanoPro texto="No Pro: notas ilimitadas, família compartilhada (todo mundo da casa vê e cadastra) e exportação das notas em PDF." />
        </Cartao>
      )}

      {ver && (
        <Janela titulo={ver.nome} onFechar={() => setVer(null)} largura={560}>
          <div className="dm-duas">
            <FotoDemo tema="nota" semente={ver.semente || 1} rotulo={`Nota ${ver.numeroNota}`} />
            <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
              <span>{ICONES[ver.categoria]} {ver.categoria}</span>
              <span>Loja: <b>{ver.loja}</b></span>
              <span>Compra: <b>{dataBr(ver.dataCompra)}</b></span>
              <span>Valor: <b>{reais(ver.valor)}</b></span>
              <span>Garantia: <b>{ver.garantiaMeses} meses</b>{ver.estendidaMeses ? ` + ${ver.estendidaMeses} estendida` : ''}</span>
              <Selo tom={ver.st.tom}>{ver.st.dias < 0 ? 'Vencida' : `Até ${dataBr(ver.st.fim)}`}</Selo>
            </div>
          </div>
          <div className="dm-form-pe">
            <button type="button" className="dm-btn dm-btn-perigo" onClick={() => { if (confirm('Apagar produto?')) { setDados((d) => ({ ...d, produtos: d.produtos.filter((p) => p.id !== ver.id) })); setVer(null) } }}>Apagar</button>
            <span className="dm-espaco" />
            <button type="button" className="dm-btn dm-btn-sec" onClick={() => { const { st, ...p } = ver; setEditar(p); setVer(null) }}>Editar</button>
          </div>
        </Janela>
      )}
      {editar && (
        <Janela titulo={editar.id ? 'Editar produto' : 'Novo produto'} onFechar={() => setEditar(null)}>
          <Formulario
            campos={[
              { k: 'nome', rotulo: 'Produto', largo: true, obrigatorio: true },
              { k: 'loja', rotulo: 'Loja' },
              { k: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: CATEGORIAS },
              { k: 'dataCompra', rotulo: 'Data da compra', tipo: 'data' },
              { k: 'valor', rotulo: 'Valor (R$)', tipo: 'numero' },
              { k: 'garantiaMeses', rotulo: 'Garantia (meses)', tipo: 'numero' },
              { k: 'estendidaMeses', rotulo: 'Garantia estendida (meses)', tipo: 'numero' },
              { k: 'numeroNota', rotulo: 'Nº da nota' },
            ]}
            inicial={editar}
            onSalvar={salvar}
          />
        </Janela>
      )}
      {leitor && <Leitor onFechar={() => setLeitor(false)} onPronto={salvar} />}
    </Moldura>
  )
}
