'use client'

import { useMemo, useState } from 'react'
import { Barra, Barras, Cartao, Formulario, FotoDemo, FotoSessao, Janela, Kpi, Moldura, PlanoPro, Selo, Vazio, dataBr, diasAte, hojeIso, reais, somaDias, uid, useDemo } from './kit'

const CATEGORIAS = ['Material', 'Mão de obra', 'Serviço', 'Projeto e taxas', 'Outros']

function demo() {
  const h = hojeIso()
  const d = (n) => somaDias(h, n)
  const etapas = [
    { id: 'e1', nome: 'Fundação', previsto: 28000, inicio: d(-120), fim: d(-90), progresso: 100 },
    { id: 'e2', nome: 'Estrutura', previsto: 42000, inicio: d(-90), fim: d(-50), progresso: 100 },
    { id: 'e3', nome: 'Alvenaria', previsto: 30000, inicio: d(-55), fim: d(-15), progresso: 90 },
    { id: 'e4', nome: 'Elétrica', previsto: 14000, inicio: d(-20), fim: d(15), progresso: 45 },
    { id: 'e5', nome: 'Hidráulica', previsto: 12000, inicio: d(-10), fim: d(20), progresso: 30 },
    { id: 'e6', nome: 'Acabamento', previsto: 38000, inicio: d(20), fim: d(80), progresso: 0 },
  ]
  const g = (dias, descricao, etapa, categoria, fornecedor, valor, pago = true) => ({ id: uid(), data: d(dias), descricao, etapa, categoria, fornecedor, valor, pago })
  return {
    obra: { nome: 'Casa da Rua das Palmeiras', endereco: 'Rua das Palmeiras, 120 · Mogi Guaçu/SP', inicio: d(-120), fim: d(80), orcamento: 164000 },
    etapas,
    gastos: [
      g(-118, 'Escavação e gabarito', 'e1', 'Mão de obra', 'Construtora Base Firme', 6500),
      g(-112, 'Concreto usinado 12 m³', 'e1', 'Material', 'Concreteira Mogi', 9800),
      g(-105, 'Ferragem e arame', 'e1', 'Material', 'Depósito São José', 7400),
      g(-100, 'Impermeabilização baldrame', 'e1', 'Serviço', 'Impermeabiliza Já', 3900),
      g(-85, 'Pilares e vigas', 'e2', 'Mão de obra', 'Construtora Base Firme', 16000),
      g(-80, 'Laje treliçada', 'e2', 'Material', 'Lajes Paulista', 14500),
      g(-70, 'Concreto da laje', 'e2', 'Material', 'Concreteira Mogi', 11200),
      g(-52, 'Blocos cerâmicos (8 mil)', 'e3', 'Material', 'Depósito São José', 13600),
      g(-40, 'Pedreiro e servente (4 semanas)', 'e3', 'Mão de obra', 'Seu Antônio', 14800),
      g(-25, 'Argamassa e cimento', 'e3', 'Material', 'Depósito São José', 4300),
      g(-18, 'Fios, eletrodutos e caixas', 'e4', 'Material', 'Elétrica Luz', 5200),
      g(-6, 'Eletricista (1ª etapa)', 'e4', 'Mão de obra', 'Marcos Eletricista', 3800, false),
      g(-4, 'Tubos e conexões', 'e5', 'Material', 'Hidráulica Central', 2900, false),
      g(-130, 'Projeto e aprovação na prefeitura', 'e1', 'Projeto e taxas', 'Arq. Juliana Reis', 6800),
    ],
    fornecedores: [
      { id: uid(), nome: 'Construtora Base Firme', servico: 'Fundação e estrutura', telefone: '(19) 99811-2030', prazo: d(-50), status: 'Concluído' },
      { id: uid(), nome: 'Seu Antônio', servico: 'Alvenaria', telefone: '(19) 99733-1200', prazo: d(-12), status: 'Atrasado' },
      { id: uid(), nome: 'Marcos Eletricista', servico: 'Elétrica', telefone: '(19) 98822-4411', prazo: d(15), status: 'Em andamento' },
      { id: uid(), nome: 'Hidráulica Central', servico: 'Material hidráulico', telefone: '(19) 3811-2299', prazo: d(5), status: 'Aguardando entrega' },
      { id: uid(), nome: 'Gesso & Cia', servico: 'Forro e acabamento', telefone: '(19) 99100-7788', prazo: d(45), status: 'Orçamento aprovado' },
    ],
    fotos: [
      { id: uid(), data: d(-115), etapa: 'e1', legenda: 'Gabarito pronto', semente: 1 },
      { id: uid(), data: d(-98), etapa: 'e1', legenda: 'Baldrame concretado', semente: 2 },
      { id: uid(), data: d(-75), etapa: 'e2', legenda: 'Laje montada', semente: 3 },
      { id: uid(), data: d(-60), etapa: 'e2', legenda: 'Laje concretada', semente: 4 },
      { id: uid(), data: d(-30), etapa: 'e3', legenda: 'Paredes subindo', semente: 5 },
      { id: uid(), data: d(-8), etapa: 'e4', legenda: 'Tubulação elétrica', semente: 6 },
    ],
  }
}

export default function Obra() {
  const [dados, setDados, restaurar] = useDemo('demo-obra-v1', demo)
  const [secao, setSecao] = useState('painel')
  const [editar, setEditar] = useState(null) // { tipo, item }
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [fotoTemp, setFotoTemp] = useState(null)

  const calc = useMemo(() => {
    if (!dados) return null
    const porEtapa = Object.fromEntries(dados.etapas.map((e) => [e.id, 0]))
    let total = 0
    let aPagar = 0
    for (const g of dados.gastos) {
      porEtapa[g.etapa] = (porEtapa[g.etapa] || 0) + g.valor
      total += g.valor
      if (!g.pago) aPagar += g.valor
    }
    const previsto = dados.etapas.reduce((s, e) => s + e.previsto, 0)
    const progresso = previsto ? dados.etapas.reduce((s, e) => s + e.previsto * e.progresso, 0) / previsto : 0
    const porCat = CATEGORIAS.map((c) => ({ rotulo: c.split(' ')[0], valor: dados.gastos.filter((g) => g.categoria === c).reduce((s, g) => s + g.valor, 0) }))
    // gasto por mês (últimos 6)
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const k = d.toISOString().slice(0, 7)
      meses.push({ rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), valor: dados.gastos.filter((g) => g.data.startsWith(k)).reduce((s, g) => s + g.valor, 0) })
    }
    return { porEtapa, total, aPagar, previsto, progresso, porCat, meses }
  }, [dados])

  if (!dados) return null
  const etapaNome = (id) => dados.etapas.find((e) => e.id === id)?.nome || '—'
  const atualizar = (campo, fn) => setDados((d) => ({ ...d, [campo]: fn(d[campo]) }))
  const salvarItem = (campo) => (v) => {
    atualizar(campo, (l) => (v.id ? l.map((x) => (x.id === v.id ? v : x)) : [...l, { ...v, id: uid() }]))
    setEditar(null)
  }
  const apagarItem = (campo, id) => () => {
    if (!confirm('Apagar este item?')) return
    atualizar(campo, (l) => l.filter((x) => x.id !== id))
    setEditar(null)
  }
  const saldo = dados.obra.orcamento - calc.total
  const atrasados = dados.fornecedores.filter((f) => f.status !== 'Concluído' && diasAte(f.prazo) < 0)

  const camposGasto = [
    { k: 'descricao', rotulo: 'Descrição', obrigatorio: true, largo: true, ph: 'Ex.: Cimento CP-II 50 sacos' },
    { k: 'valor', rotulo: 'Valor (R$)', tipo: 'numero', obrigatorio: true },
    { k: 'data', rotulo: 'Data', tipo: 'data' },
    { k: 'etapa', rotulo: 'Etapa', tipo: 'select', opcoes: dados.etapas.map((e) => [e.id, e.nome]) },
    { k: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: CATEGORIAS },
    { k: 'fornecedor', rotulo: 'Fornecedor', ph: 'Quem vendeu ou fez' },
    { k: 'pago', rotulo: 'Pagamento', tipo: 'check', texto: 'Já foi pago' },
  ]

  return (
    <Moldura
      nome="Obra Organizada"
      icone="🏗️"
      cor="#ea580c"
      secao={secao}
      onSecao={setSecao}
      onRestaurar={restaurar}
      secoes={[['painel', '📊', 'Painel'], ['gastos', '💸', 'Gastos'], ['etapas', '🧱', 'Etapas'], ['fornecedores', '🤝', 'Fornecedores'], ['fotos', '📸', 'Fotos']]}
    >
      <div className="dm-titulo">
        <h2>{dados.obra.nome}</h2>
        <Selo tom="cor">Obra ativa</Selo>
        <p>{dados.obra.endereco} · {dataBr(dados.obra.inicio)} até {dataBr(dados.obra.fim)}</p>
      </div>

      {secao === 'painel' && (
        <>
          <div className="dm-kpis">
            <Kpi rotulo="Orçamento" valor={reais(dados.obra.orcamento)} tom="cor" sub={`${Math.round((calc.total / dados.obra.orcamento) * 100)}% usado`} />
            <Kpi rotulo="Gasto até agora" valor={reais(calc.total)} sub={`${dados.gastos.length} lançamentos`} />
            <Kpi rotulo="Saldo" valor={reais(saldo)} tom={saldo < 0 ? 'ruim' : 'bom'} />
            <Kpi rotulo="A pagar" valor={reais(calc.aPagar)} tom={calc.aPagar ? 'alerta' : undefined} />
            <Kpi rotulo="Andamento" valor={`${Math.round(calc.progresso)}%`} sub={`termina em ${diasAte(dados.obra.fim)} dias`} />
          </div>
          {atrasados.length > 0 && (
            <Cartao titulo="⚠️ Atenção">
              {atrasados.map((f) => (
                <p key={f.id} style={{ margin: 0 }}><b>{f.nome}</b> ({f.servico}) passou do prazo de {dataBr(f.prazo)}.</p>
              ))}
            </Cartao>
          )}
          <div className="dm-duas">
            <Cartao titulo="Previsto x realizado por etapa">
              {dados.etapas.map((e) => {
                const real = calc.porEtapa[e.id] || 0
                const dif = real - e.previsto
                return (
                  <div key={e.id} style={{ display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <b>{e.nome}</b>
                      <span className="dm-mudo">{reais(real)} de {reais(e.previsto)} {real > e.previsto && <Selo tom="ruim">+{reais(dif)}</Selo>}</span>
                    </div>
                    <Barra valor={real} max={e.previsto} tom={real > e.previsto ? 'ruim' : real > e.previsto * 0.9 ? 'alerta' : undefined} />
                  </div>
                )
              })}
            </Cartao>
            <div className="dm-grade">
              <Cartao titulo="Gastos por mês"><Barras dados={calc.meses} formato={(v) => `${Math.round(v / 1000)}k`} /></Cartao>
              <Cartao titulo="Por categoria"><Barras dados={calc.porCat} formato={(v) => `${Math.round(v / 1000)}k`} altura={130} /></Cartao>
            </div>
          </div>
          <PlanoPro texto="Grátis: uma obra ativa. No Pro: várias obras ao mesmo tempo, relatório em PDF para o cliente e o banco, e acesso do mestre de obras." />
        </>
      )}

      {secao === 'gastos' && (
        <Cartao
          titulo="Gastos, materiais e pagamentos"
          acao={<button type="button" className="dm-btn" onClick={() => setEditar({ tipo: 'gasto', item: { descricao: '', valor: '', data: hojeIso(), etapa: dados.etapas[0].id, categoria: 'Material', fornecedor: '', pago: true } })}>＋ Lançar gasto</button>}
        >
          <div className="dm-filtros">
            <select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)} aria-label="Filtrar etapa">
              <option value="">Todas as etapas</option>
              {dados.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="dm-tabela-wrap">
            <table className="dm-tabela">
              <thead><tr><th>Data</th><th>Descrição</th><th>Etapa</th><th>Fornecedor</th><th>Situação</th><th className="dm-num">Valor</th></tr></thead>
              <tbody>
                {[...dados.gastos].filter((g) => !filtroEtapa || g.etapa === filtroEtapa).sort((a, b) => b.data.localeCompare(a.data)).map((g) => (
                  <tr key={g.id} onClick={() => setEditar({ tipo: 'gasto', item: g })}>
                    <td>{dataBr(g.data)}</td>
                    <td><b>{g.descricao}</b><br /><small className="dm-mudo">{g.categoria}</small></td>
                    <td>{etapaNome(g.etapa)}</td>
                    <td>{g.fornecedor}</td>
                    <td>{g.pago ? <Selo tom="bom">Pago</Selo> : <Selo tom="alerta">A pagar</Selo>}</td>
                    <td className="dm-num">{reais(g.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}

      {secao === 'etapas' && (
        <Cartao titulo="Etapas e cronograma" acao={<button type="button" className="dm-btn" onClick={() => setEditar({ tipo: 'etapa', item: { nome: '', previsto: '', inicio: hojeIso(), fim: somaDias(hojeIso(), 30), progresso: 0 } })}>＋ Etapa</button>}>
          <div className="ob-gantt">
            {(() => {
              const ini = Math.min(...dados.etapas.map((e) => new Date(e.inicio).getTime()))
              const fim = Math.max(...dados.etapas.map((e) => new Date(e.fim).getTime()))
              const tot = Math.max(1, fim - ini)
              const hoje = ((Date.now() - ini) / tot) * 100
              return (
                <>
                  {dados.etapas.map((e) => {
                    const a = ((new Date(e.inicio) - ini) / tot) * 100
                    const w = Math.max(3, ((new Date(e.fim) - new Date(e.inicio)) / tot) * 100)
                    const atrasada = e.progresso < 100 && diasAte(e.fim) < 0
                    return (
                      <button type="button" key={e.id} className="ob-gantt-linha" onClick={() => setEditar({ tipo: 'etapa', item: e })}>
                        <span className="ob-gantt-nome">{e.nome}<small>{e.progresso}%</small></span>
                        <span className="ob-gantt-trilho">
                          <span className="ob-gantt-barra" data-atrasada={atrasada || undefined} style={{ left: `${a}%`, width: `${w}%` }}>
                            <span style={{ width: `${e.progresso}%` }} />
                          </span>
                          {hoje >= 0 && hoje <= 100 && <span className="ob-gantt-hoje" style={{ left: `${hoje}%` }} />}
                        </span>
                      </button>
                    )
                  })}
                </>
              )
            })()}
          </div>
          <p className="dm-mudo" style={{ margin: 0, fontSize: '.8rem' }}>A linha vertical é hoje. Barras vermelhas: etapa atrasada. Clique numa etapa para editar o orçamento, as datas e o andamento.</p>
        </Cartao>
      )}

      {secao === 'fornecedores' && (
        <Cartao titulo="Fornecedores e prazos" acao={<button type="button" className="dm-btn" onClick={() => setEditar({ tipo: 'fornecedor', item: { nome: '', servico: '', telefone: '', prazo: somaDias(hojeIso(), 15), status: 'Em andamento' } })}>＋ Fornecedor</button>}>
          <ul className="dm-lista">
            {dados.fornecedores.map((f) => {
              const dias = diasAte(f.prazo)
              const gasto = dados.gastos.filter((g) => g.fornecedor === f.nome).reduce((s, g) => s + g.valor, 0)
              return (
                <li key={f.id}>
                  <button type="button" className="dm-item" onClick={() => setEditar({ tipo: 'fornecedor', item: f })}>
                    <span className="dm-item-ic">🤝</span>
                    <span className="dm-item-txt">
                      <b>{f.nome}</b>
                      <small>{f.servico} · {f.telefone} · {gasto ? `${reais(gasto)} pagos` : 'sem pagamentos'}</small>
                    </span>
                    <span style={{ textAlign: 'right', display: 'grid', gap: 4, justifyItems: 'end' }}>
                      <Selo tom={f.status === 'Concluído' ? 'bom' : dias < 0 ? 'ruim' : dias < 7 ? 'alerta' : undefined}>{f.status === 'Concluído' ? 'Concluído' : dias < 0 ? `${-dias} dias atrasado` : `prazo em ${dias} dias`}</Selo>
                      <small className="dm-mudo">{f.status}</small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Cartao>
      )}

      {secao === 'fotos' && (
        <Cartao titulo="Fotos do andamento" acao={<FotoSessao rotulo="Tirar/escolher foto" onFoto={(url) => setFotoTemp(url)} />}>
          {fotoTemp && (
            <div className="dm-pro" style={{ background: '#eff6ff', borderColor: '#93c5fd' }}>
              <img src={fotoTemp} alt="Sua foto" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10 }} />
              <span style={{ color: '#1e3a8a' }}>Na demo a sua foto aparece só agora e <b>não é salva</b>. No app de verdade ela entraria na linha do tempo da etapa.</span>
              <button type="button" className="dm-btn dm-btn-sec" onClick={() => setFotoTemp(null)}>Ok</button>
            </div>
          )}
          {dados.etapas.filter((e) => dados.fotos.some((f) => f.etapa === e.id)).map((e) => (
            <div key={e.id} style={{ display: 'grid', gap: 8 }}>
              <h4>{e.nome}</h4>
              <div className="dm-galeria">
                {dados.fotos.filter((f) => f.etapa === e.id).map((f) => (
                  <FotoDemo key={f.id} tema="obra" semente={f.semente} rotulo={`${f.legenda} · ${dataBr(f.data)}`} />
                ))}
              </div>
            </div>
          ))}
          {!dados.fotos.length && <Vazio>Nenhuma foto.</Vazio>}
        </Cartao>
      )}

      {editar?.tipo === 'gasto' && (
        <Janela titulo={editar.item.id ? 'Editar gasto' : 'Novo gasto'} onFechar={() => setEditar(null)}>
          <Formulario campos={camposGasto} inicial={editar.item} onSalvar={(v) => salvarItem('gastos')({ ...v, valor: Number(v.valor) || 0 })} onApagar={editar.item.id ? apagarItem('gastos', editar.item.id) : null} />
        </Janela>
      )}
      {editar?.tipo === 'etapa' && (
        <Janela titulo={editar.item.id ? 'Editar etapa' : 'Nova etapa'} onFechar={() => setEditar(null)}>
          <Formulario
            campos={[
              { k: 'nome', rotulo: 'Etapa', obrigatorio: true, largo: true },
              { k: 'previsto', rotulo: 'Orçamento previsto (R$)', tipo: 'numero' },
              { k: 'progresso', rotulo: 'Andamento (%)', tipo: 'numero', passo: 5 },
              { k: 'inicio', rotulo: 'Início', tipo: 'data' },
              { k: 'fim', rotulo: 'Fim previsto', tipo: 'data' },
            ]}
            inicial={editar.item}
            onSalvar={(v) => salvarItem('etapas')({ ...v, previsto: Number(v.previsto) || 0, progresso: Math.max(0, Math.min(100, Number(v.progresso) || 0)) })}
            onApagar={editar.item.id ? apagarItem('etapas', editar.item.id) : null}
          />
        </Janela>
      )}
      {editar?.tipo === 'fornecedor' && (
        <Janela titulo={editar.item.id ? 'Editar fornecedor' : 'Novo fornecedor'} onFechar={() => setEditar(null)}>
          <Formulario
            campos={[
              { k: 'nome', rotulo: 'Nome', obrigatorio: true, largo: true },
              { k: 'servico', rotulo: 'Serviço ou material' },
              { k: 'telefone', rotulo: 'Telefone' },
              { k: 'prazo', rotulo: 'Prazo combinado', tipo: 'data' },
              { k: 'status', rotulo: 'Situação', tipo: 'select', opcoes: ['Orçamento aprovado', 'Em andamento', 'Aguardando entrega', 'Atrasado', 'Concluído'] },
            ]}
            inicial={editar.item}
            onSalvar={salvarItem('fornecedores')}
            onApagar={editar.item.id ? apagarItem('fornecedores', editar.item.id) : null}
          />
        </Janela>
      )}
    </Moldura>
  )
}
