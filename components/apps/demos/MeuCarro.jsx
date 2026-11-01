'use client'

import { useMemo, useState } from 'react'
import { Barra, Barras, Cartao, Formulario, FotoDemo, Janela, Kpi, Moldura, PlanoPro, Selo, Vazio, dataBr, diasAte, hojeIso, num, reais, somaDias, somaMeses, uid, useDemo } from './kit'

// Intervalos de manutenção (o que vier primeiro: km ou meses)
const REGRAS = {
  'Troca de óleo': { km: 10000, meses: 12, ic: '🛢️' },
  'Filtro de óleo': { km: 10000, meses: 12, ic: '🧴' },
  'Filtro de ar': { km: 15000, meses: 12, ic: '💨' },
  'Filtro de cabine': { km: 15000, meses: 12, ic: '❄️' },
  'Rodízio de pneus': { km: 10000, meses: null, ic: '🔄' },
  'Alinhamento e balanceamento': { km: 10000, meses: 12, ic: '🎯' },
  'Troca de pneus': { km: 50000, meses: 60, ic: '🛞' },
  'Revisão geral': { km: 20000, meses: 12, ic: '🔧' },
  'Pastilhas de freio': { km: 30000, meses: null, ic: '🛑' },
  'Correia dentada': { km: 60000, meses: 48, ic: '⚙️' },
  Outro: { km: null, meses: null, ic: '📝' },
}

function demo() {
  const h = hojeIso()
  const d = (n) => somaDias(h, n)
  const v1 = 'v1'
  const v2 = 'v2'
  const manut = (veiculoId, tipo, dias, km, valor, oficina) => ({ id: uid(), veiculoId, tipo, data: d(dias), km, valor, oficina, obs: '' })
  const abast = []
  let km = 46200
  for (let i = 0; i < 16; i++) {
    const rodou = 380 + ((i * 53) % 90)
    km += rodou
    const litros = Math.round((rodou / (11.4 + ((i * 7) % 10) / 10)) * 10) / 10
    abast.push({ id: uid(), veiculoId: v1, data: d(-150 + i * 9), km, litros, valor: Math.round(litros * (5.79 + (i % 4) * 0.06) * 100) / 100, cheio: true })
  }
  let km2 = 18300
  for (let i = 0; i < 6; i++) {
    km2 += 520
    abast.push({ id: uid(), veiculoId: v2, data: d(-140 + i * 24), km: km2, litros: 13.2, valor: 78.5, cheio: true })
  }
  return {
    veiculos: [
      { id: v1, apelido: 'Onix da família', modelo: 'Chevrolet Onix 1.0 Turbo', ano: 2021, placa: 'FBR-4C21', km: km, combustivel: 'Gasolina' },
      { id: v2, apelido: 'Moto do trabalho', modelo: 'Honda CG 160', ano: 2022, placa: 'GHT-7A09', km: km2, combustivel: 'Gasolina' },
    ],
    manutencoes: [
      manut(v1, 'Troca de óleo', -170, 45800, 289, 'Auto Center Silva'),
      manut(v1, 'Filtro de óleo', -170, 45800, 48, 'Auto Center Silva'),
      manut(v1, 'Filtro de ar', -330, 38200, 72, 'Auto Center Silva'),
      manut(v1, 'Rodízio de pneus', -95, 49300, 60, 'Pneus Já'),
      manut(v1, 'Alinhamento e balanceamento', -95, 49300, 140, 'Pneus Já'),
      manut(v1, 'Revisão geral', -380, 36000, 890, 'Concessionária'),
      manut(v1, 'Pastilhas de freio', -40, 51800, 320, 'Auto Center Silva'),
      manut(v2, 'Troca de óleo', -60, 19800, 65, 'Moto Peças Guaçu'),
      manut(v2, 'Revisão geral', -200, 16000, 210, 'Honda Mogi'),
    ],
    abastecimentos: abast,
  }
}

function proximas(veiculo, manutencoes) {
  return Object.entries(REGRAS)
    .filter(([, r]) => r.km || r.meses)
    .map(([tipo, r]) => {
      const ultima = manutencoes.filter((m) => m.veiculoId === veiculo.id && m.tipo === tipo).sort((a, b) => b.data.localeCompare(a.data))[0]
      if (!ultima) return null
      const kmProx = r.km ? ultima.km + r.km : null
      const dataProx = r.meses ? somaMeses(ultima.data, r.meses) : null
      const faltaKm = kmProx ? kmProx - veiculo.km : null
      const faltaDias = dataProx ? diasAte(dataProx) : null
      const urgente = (faltaKm !== null && faltaKm <= 0) || (faltaDias !== null && faltaDias <= 0)
      const perto = (faltaKm !== null && faltaKm <= 1500) || (faltaDias !== null && faltaDias <= 30)
      return { tipo, ic: r.ic, ultima, kmProx, dataProx, faltaKm, faltaDias, tom: urgente ? 'ruim' : perto ? 'alerta' : 'bom', progresso: r.km ? (veiculo.km - ultima.km) / r.km : r.meses ? -diasAte(ultima.data) / (r.meses * 30) : 0 }
    })
    .filter(Boolean)
    .sort((a, b) => b.progresso - a.progresso)
}

export default function MeuCarro() {
  const [dados, setDados, restaurar] = useDemo('demo-carro-v1', demo)
  const [secao, setSecao] = useState('painel')
  const [vid, setVid] = useState('v1')
  const [editar, setEditar] = useState(null)

  const v = dados?.veiculos.find((x) => x.id === vid) || dados?.veiculos[0]
  const calc = useMemo(() => {
    if (!dados || !v) return null
    const ab = dados.abastecimentos.filter((a) => a.veiculoId === v.id).sort((a, b) => a.km - b.km)
    const mn = dados.manutencoes.filter((m) => m.veiculoId === v.id)
    // consumo: entre tanques cheios
    let kmTot = 0
    let lTot = 0
    for (let i = 1; i < ab.length; i++) {
      if (ab[i].cheio && ab[i - 1].cheio) {
        kmTot += ab[i].km - ab[i - 1].km
        lTot += ab[i].litros
      }
    }
    const consumo = lTot ? kmTot / lTot : 0
    const desde = somaDias(hojeIso(), -180)
    const combust6 = ab.filter((a) => a.data >= desde).reduce((s, a) => s + a.valor, 0)
    const manut6 = mn.filter((m) => m.data >= desde).reduce((s, m) => s + m.valor, 0)
    const kmIni = ab.find((a) => a.data >= desde)?.km
    const kmRod = kmIni ? v.km - kmIni : 0
    const custoKm = kmRod ? (combust6 + manut6) / kmRod : 0
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const k = d.toISOString().slice(0, 7)
      meses.push({
        rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        valor: ab.filter((a) => a.data.startsWith(k)).reduce((s, a) => s + a.valor, 0) + mn.filter((m) => m.data.startsWith(k)).reduce((s, m) => s + m.valor, 0),
      })
    }
    return { ab, mn, consumo, combust6, manut6, custoKm, meses, kmRod, lembretes: proximas(v, dados.manutencoes), precoMedio: ab.length ? ab.slice(-5).reduce((s, a) => s + a.valor / a.litros, 0) / Math.min(5, ab.length) : 0 }
  }, [dados, v])

  if (!dados || !v) return null
  const atualizar = (campo, fn) => setDados((d) => ({ ...d, [campo]: fn(d[campo]) }))
  const salvar = (campo, extra = {}) => (x) => {
    atualizar(campo, (l) => (x.id ? l.map((y) => (y.id === x.id ? { ...x, ...extra } : y)) : [...l, { ...x, ...extra, id: uid() }]))
    // km do veículo acompanha o maior km lançado
    if (campo !== 'veiculos' && x.km && Number(x.km) > v.km) atualizar('veiculos', (l) => l.map((y) => (y.id === v.id ? { ...y, km: Number(x.km) } : y)))
    setEditar(null)
  }
  const apagar = (campo, id) => () => {
    if (!confirm('Apagar?')) return
    atualizar(campo, (l) => l.filter((x) => x.id !== id))
    setEditar(null)
  }
  const urgentes = calc.lembretes.filter((l) => l.tom !== 'bom')

  return (
    <Moldura
      nome="Meu Carro"
      icone="🚗"
      cor="#2563eb"
      secao={secao}
      onSecao={setSecao}
      onRestaurar={restaurar}
      secoes={[['painel', '📊', 'Painel'], ['manutencao', '🔧', 'Manutenção'], ['abastecer', '⛽', 'Abastecer'], ['lembretes', '🔔', 'Lembretes'], ['veiculos', '🚘', 'Veículos']]}
      extraTopo={
        <select value={v.id} onChange={(e) => setVid(e.target.value)} style={{ width: 'auto', maxWidth: 200 }} aria-label="Veículo">
          {dados.veiculos.map((x) => <option key={x.id} value={x.id}>{x.apelido}</option>)}
        </select>
      }
    >
      <div className="dm-titulo">
        <h2>{v.apelido}</h2>
        <Selo tom="cor">{v.placa}</Selo>
        <p>{v.modelo} · {v.ano} · {num(v.km)} km</p>
      </div>

      {secao === 'painel' && (
        <>
          <div className="dm-kpis">
            <Kpi rotulo="Custo por km" valor={reais(calc.custoKm)} tom="cor" sub="combustível + manutenção (6 meses)" />
            <Kpi rotulo="Consumo médio" valor={`${num(calc.consumo, 1)} km/l`} sub={`preço médio ${reais(calc.precoMedio)}/l`} />
            <Kpi rotulo="Combustível (6 meses)" valor={reais(calc.combust6)} sub={`${num(calc.kmRod)} km rodados`} />
            <Kpi rotulo="Manutenção (6 meses)" valor={reais(calc.manut6)} />
            <Kpi rotulo="Avisos" valor={urgentes.length} tom={urgentes.some((u) => u.tom === 'ruim') ? 'ruim' : urgentes.length ? 'alerta' : 'bom'} sub={urgentes.length ? 'manutenções perto do prazo' : 'tudo em dia'} />
          </div>
          <div className="dm-duas">
            <Cartao titulo="Gastos por mês"><Barras dados={calc.meses} formato={(x) => reais(x).replace(',00', '')} altura={180} /></Cartao>
            <Cartao titulo="Próximas manutenções">
              {calc.lembretes.slice(0, 5).map((l) => (
                <div key={l.tipo} style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{l.ic} <b>{l.tipo}</b></span>
                    <Selo tom={l.tom}>{l.faltaKm !== null && l.faltaKm <= 0 ? 'vencida pelo km' : l.faltaDias !== null && l.faltaDias <= 0 ? 'vencida pelo tempo' : l.faltaKm !== null ? `faltam ${num(l.faltaKm)} km` : `faltam ${l.faltaDias} dias`}</Selo>
                  </div>
                  <Barra valor={Math.min(1, l.progresso)} max={1} tom={l.tom} />
                </div>
              ))}
            </Cartao>
          </div>
        </>
      )}

      {secao === 'manutencao' && (
        <Cartao titulo="Histórico de manutenção" acao={<button type="button" className="dm-btn" onClick={() => setEditar({ tipo: 'manut', item: { tipo: 'Troca de óleo', data: hojeIso(), km: v.km, valor: '', oficina: '', obs: '' } })}>＋ Registrar</button>}>
          <div className="dm-tabela-wrap">
            <table className="dm-tabela">
              <thead><tr><th>Data</th><th>Serviço</th><th>Km</th><th>Oficina</th><th className="dm-num">Valor</th></tr></thead>
              <tbody>
                {[...calc.mn].sort((a, b) => b.data.localeCompare(a.data)).map((m) => (
                  <tr key={m.id} onClick={() => setEditar({ tipo: 'manut', item: m })}>
                    <td>{dataBr(m.data)}</td>
                    <td>{REGRAS[m.tipo]?.ic} <b>{m.tipo}</b></td>
                    <td>{num(m.km)}</td>
                    <td>{m.oficina}</td>
                    <td className="dm-num">{reais(m.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!calc.mn.length && <Vazio>Nenhuma manutenção registrada.</Vazio>}
        </Cartao>
      )}

      {secao === 'abastecer' && (
        <Cartao titulo="Abastecimentos" acao={<button type="button" className="dm-btn" onClick={() => setEditar({ tipo: 'abast', item: { data: hojeIso(), km: v.km, litros: '', valor: '', cheio: true } })}>＋ Abasteci</button>}>
          <div className="dm-tabela-wrap">
            <table className="dm-tabela">
              <thead><tr><th>Data</th><th>Km</th><th>Litros</th><th>R$/l</th><th>Consumo</th><th className="dm-num">Total</th></tr></thead>
              <tbody>
                {[...calc.ab].reverse().map((a, i, arr) => {
                  const ant = arr[i + 1]
                  const cons = ant && a.cheio && ant.cheio ? (a.km - ant.km) / a.litros : null
                  return (
                    <tr key={a.id} onClick={() => setEditar({ tipo: 'abast', item: a })}>
                      <td>{dataBr(a.data)}</td>
                      <td>{num(a.km)}</td>
                      <td>{num(a.litros, 1)} {!a.cheio && <Selo>parcial</Selo>}</td>
                      <td>{reais(a.valor / a.litros)}</td>
                      <td>{cons ? `${num(cons, 1)} km/l` : '—'}</td>
                      <td className="dm-num">{reais(a.valor)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="dm-mudo" style={{ margin: 0, fontSize: '.8rem' }}>O consumo é calculado entre dois tanques cheios. Marque “tanque cheio” para a conta ficar certa.</p>
        </Cartao>
      )}

      {secao === 'lembretes' && (
        <Cartao titulo="Lembretes de revisão">
          <p className="dm-mudo" style={{ margin: 0 }}>Calculados pela última vez que cada serviço foi feito: vale o que chegar primeiro, quilometragem ou tempo.</p>
          <ul className="dm-lista">
            {calc.lembretes.map((l) => (
              <li key={l.tipo} className="dm-item" style={{ cursor: 'default' }}>
                <span className="dm-item-ic">{l.ic}</span>
                <span className="dm-item-txt">
                  <b>{l.tipo}</b>
                  <small>Última: {dataBr(l.ultima.data)} com {num(l.ultima.km)} km · próxima: {[l.kmProx && `${num(l.kmProx)} km`, l.dataProx && dataBr(l.dataProx)].filter(Boolean).join(' ou ')}</small>
                </span>
                <Selo tom={l.tom}>{l.tom === 'ruim' ? 'Fazer agora' : l.tom === 'alerta' ? 'Em breve' : 'Em dia'}</Selo>
              </li>
            ))}
          </ul>
          <button type="button" className="dm-btn dm-btn-sec" onClick={() => alert('Demonstração: no app de verdade você receberia a notificação no celular e no WhatsApp alguns dias antes.')}>🔔 Ativar avisos no celular</button>
        </Cartao>
      )}

      {secao === 'veiculos' && (
        <>
          <div className="dm-galeria">
            {dados.veiculos.map((x, i) => (
              <button key={x.id} type="button" className="dm-cartao" style={{ cursor: 'pointer', textAlign: 'left', borderColor: x.id === v.id ? 'var(--dm-cor)' : undefined }} onClick={() => setVid(x.id)}>
                <FotoDemo tema="carro" semente={i + 2} rotulo={x.placa} />
                <b>{x.apelido}</b>
                <small className="dm-mudo">{x.modelo} · {x.ano} · {num(x.km)} km</small>
                <span className="dm-btn dm-btn-sec dm-btn-p" onClick={(e) => { e.stopPropagation(); setEditar({ tipo: 'veiculo', item: x }) }}>Editar</span>
              </button>
            ))}
          </div>
          {dados.veiculos.length < 2 ? (
            <button type="button" className="dm-btn" onClick={() => setEditar({ tipo: 'veiculo', item: { apelido: '', modelo: '', ano: new Date().getFullYear(), placa: '', km: 0, combustivel: 'Gasolina' } })}>＋ Adicionar veículo</button>
          ) : (
            <PlanoPro texto="Grátis: até dois veículos. No Pro: frota ilimitada, motoristas, relatório mensal por veículo e exportação para a contabilidade." />
          )}
        </>
      )}

      {editar?.tipo === 'manut' && (
        <Janela titulo="Manutenção" onFechar={() => setEditar(null)}>
          <Formulario
            campos={[
              { k: 'tipo', rotulo: 'Serviço', tipo: 'select', opcoes: Object.keys(REGRAS), largo: true },
              { k: 'data', rotulo: 'Data', tipo: 'data' },
              { k: 'km', rotulo: 'Km no painel', tipo: 'numero' },
              { k: 'valor', rotulo: 'Valor (R$)', tipo: 'numero' },
              { k: 'oficina', rotulo: 'Oficina' },
              { k: 'obs', rotulo: 'Observação', tipo: 'texto-longo', largo: true },
            ]}
            inicial={editar.item}
            onSalvar={(x) => salvar('manutencoes', { veiculoId: v.id })({ ...x, km: Number(x.km) || 0, valor: Number(x.valor) || 0 })}
            onApagar={editar.item.id ? apagar('manutencoes', editar.item.id) : null}
          />
        </Janela>
      )}
      {editar?.tipo === 'abast' && (
        <Janela titulo="Abastecimento" onFechar={() => setEditar(null)}>
          <Formulario
            campos={[
              { k: 'data', rotulo: 'Data', tipo: 'data' },
              { k: 'km', rotulo: 'Km no painel', tipo: 'numero' },
              { k: 'litros', rotulo: 'Litros', tipo: 'numero' },
              { k: 'valor', rotulo: 'Total pago (R$)', tipo: 'numero' },
              { k: 'cheio', rotulo: 'Tanque', tipo: 'check', texto: 'Enchi o tanque' },
            ]}
            inicial={editar.item}
            onSalvar={(x) => salvar('abastecimentos', { veiculoId: v.id })({ ...x, km: Number(x.km) || 0, litros: Number(x.litros) || 0, valor: Number(x.valor) || 0 })}
            onApagar={editar.item.id ? apagar('abastecimentos', editar.item.id) : null}
          />
        </Janela>
      )}
      {editar?.tipo === 'veiculo' && (
        <Janela titulo="Veículo" onFechar={() => setEditar(null)}>
          <Formulario
            campos={[
              { k: 'apelido', rotulo: 'Apelido', obrigatorio: true },
              { k: 'placa', rotulo: 'Placa' },
              { k: 'modelo', rotulo: 'Modelo', largo: true },
              { k: 'ano', rotulo: 'Ano', tipo: 'numero' },
              { k: 'km', rotulo: 'Km atual', tipo: 'numero' },
              { k: 'combustivel', rotulo: 'Combustível', tipo: 'select', opcoes: ['Gasolina', 'Etanol', 'Flex', 'Diesel', 'GNV', 'Elétrico'] },
            ]}
            inicial={editar.item}
            onSalvar={(x) => salvar('veiculos')({ ...x, km: Number(x.km) || 0 })}
            onApagar={editar.item.id && dados.veiculos.length > 1 ? apagar('veiculos', editar.item.id) : null}
          />
        </Janela>
      )}
    </Moldura>
  )
}
