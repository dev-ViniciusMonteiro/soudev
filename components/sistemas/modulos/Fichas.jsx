'use client'

// Ficha do cliente (barbearia e salão): preferências, números da máquina, produtos, alergias,
// histórico de atendimentos (agenda + anotações do profissional) e fotos só para quem autoriza.
// As fotos são de demonstração: a imagem escolhida aparece na hora e não é salva.

import { useMemo, useRef, useState } from 'react'
import { Chips, Modal, Selo, Topo, Vazio, useMapa, useSistema, useTabela } from '../base'
import { brl, dataBR, hojeISO, linkWhats } from '@/lib/sistemas/regras'

const CAMPOS = [
  ['corte_preferido', 'Corte preferido', 'Ex.: degradê navalhado'],
  ['maquina', 'Máquina / tesoura (números e altura)', 'Ex.: 0 na nuca, 1 e 2 nas laterais, tesoura 4 cm em cima'],
  ['barba', 'Barba', 'Ex.: desenhada, linha baixa'],
  ['produtos_usados', 'Produtos que usa / gosta', 'Ex.: pomada efeito seco'],
  ['alergias', 'Alergias / sensibilidade', 'Ex.: pele sensível, sem álcool'],
]

function FotoDemo({ rotulo, n }) {
  const cores = [['#334155', '#94a3b8'], ['#78350f', '#fbbf24'], ['#1e3a8a', '#60a5fa'], ['#3f3f46', '#a1a1aa']][n % 4]
  return (
    <div className="sx-foto-demo" role="img" aria-label={rotulo}>
      <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice">
        <rect width="120" height="120" fill={cores[0]} />
        <ellipse cx="60" cy="70" rx="30" ry="36" fill="#f1c9a5" />
        <path d={n % 2 ? 'M28 60 Q30 22 60 22 Q90 22 92 60 Q84 44 60 42 Q36 44 28 60Z' : 'M30 58 Q34 28 60 26 Q86 28 90 58 L84 50 Q60 36 36 50Z'} fill={cores[1]} />
        <path d="M40 92 Q60 108 80 92 Q76 104 60 106 Q44 104 40 92Z" fill={cores[1]} opacity={n % 3 ? 0.9 : 0} />
      </svg>
      <span>{rotulo}</span>
    </div>
  )
}

function Ficha({ cliente, onFechar }) {
  const { banco } = useSistema()
  const agendamentos = useTabela('agendamentos')
  const vendas = useTabela('vendas')
  const profs = useMapa('profissionais')
  const servicos = useMapa('produtos')
  const [prefs, setPrefs] = useState(() => Object.fromEntries([...CAMPOS.map(([k]) => [k, cliente[k] || '']), ['obs', cliente.obs || ''], ['autoriza_fotos', Boolean(cliente.autoriza_fotos)]]))
  const [novo, setNovo] = useState(null)
  const [fotosSessao, setFotosSessao] = useState([])
  const [salvo, setSalvo] = useState(false)
  const input = useRef(null)

  const anotacoes = cliente.atendimentos || []
  const daAgenda = agendamentos
    .filter((a) => a.cliente_id === cliente.id && a.status === 'concluido')
    .map((a) => ({ id: a.id, data: String(a.inicio).slice(0, 10), servico: servicos.get(a.servico_id)?.nome || 'Atendimento', profissional: profs.get(a.profissional_id)?.nome || '', agenda: true, valor: a.valor }))
  const historico = [...anotacoes.map((x) => ({ ...x, anotacao: true })), ...daAgenda.filter((a) => !anotacoes.some((x) => x.data === a.data))].sort((a, b) => String(b.data).localeCompare(String(a.data)))
  const gasto = vendas.filter((v) => v.cliente_id === cliente.id && !v.excluido).reduce((s, v) => s + (Number(v.total) || 0), 0)
  const ultima = historico[0]
  const diasDesde = ultima ? Math.round((new Date(`${hojeISO()}T12:00`) - new Date(`${ultima.data}T12:00`)) / 86400000) : null

  const salvarPrefs = () => {
    banco.salvar('clientes', { id: cliente.id, ...prefs })
    setSalvo(true)
    setTimeout(() => setSalvo(false), 1500)
  }
  const salvarAtendimento = () => {
    const a = { ...novo, id: novo.id || Math.random().toString(36).slice(2, 10) }
    banco.salvar('clientes', { id: cliente.id, atendimentos: [a, ...anotacoes.filter((x) => x.id !== a.id)].slice(0, 200) })
    setNovo(null)
  }
  const apagarAtendimento = (id) => banco.salvar('clientes', { id: cliente.id, atendimentos: anotacoes.filter((x) => x.id !== id) })
  const repetir = () => {
    const base = anotacoes[0]
    setNovo({ data: hojeISO(), servico: base?.servico || 'Corte masculino', profissional: base?.profissional || '', detalhe: base?.detalhe || prefs.maquina, produtos: base?.produtos || prefs.produtos_usados, obs: '' })
  }

  return (
    <Modal titulo={`Ficha · ${cliente.nome}`} onFechar={onFechar} largo>
      <div className="sx-ficha-topo">
        <div>
          <b>{cliente.nome}</b>
          <span className="muted small">
            {historico.length} atendimento(s) · gastou {brl(gasto)}
            {diasDesde !== null && ` · última visita há ${diasDesde} dia(s)`}
          </span>
        </div>
        {cliente.telefone && (
          <a className="btn btn-ghost" href={linkWhats(cliente.telefone, `Olá, ${cliente.nome.split(' ')[0]}! Já faz ${diasDesde ?? 'um tempo'} dias do seu último corte. Quer agendar o próximo?`)} target="_blank" rel="noopener noreferrer">
            Chamar no WhatsApp
          </a>
        )}
      </div>
      {prefs.alergias && <p className="notice error">⚠ {prefs.alergias}</p>}

      <div className="sx-ficha-grade">
        <section className="sx-ficha-sec">
          <h3>Preferências</h3>
          {CAMPOS.map(([k, rot, ph]) => (
            <label key={k} className="field">
              <span className="field-label">{rot}</span>
              <input value={prefs[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.value })} placeholder={ph} />
            </label>
          ))}
          <label className="field">
            <span className="field-label">Observações</span>
            <textarea rows={2} value={prefs.obs} onChange={(e) => setPrefs({ ...prefs, obs: e.target.value })} placeholder="Assunto preferido, time, se gosta de conversar…" />
          </label>
          <label className="check">
            <input type="checkbox" checked={prefs.autoriza_fotos} onChange={(e) => setPrefs({ ...prefs, autoriza_fotos: e.target.checked })} /> Cliente autoriza fotos do corte
          </label>
          <button type="button" className="btn btn-primary" onClick={salvarPrefs}>{salvo ? '✓ Salvo' : 'Salvar preferências'}</button>
        </section>

        <section className="sx-ficha-sec">
          <div className="sx-ficha-cab">
            <h3>Histórico</h3>
            <span className="sx-ficha-acoes">
              {anotacoes.length > 0 && <button type="button" className="btn btn-ghost" onClick={repetir}>↻ Repetir último</button>}
              <button type="button" className="btn btn-primary" onClick={() => setNovo({ data: hojeISO(), servico: 'Corte masculino', profissional: '', detalhe: prefs.maquina, produtos: '', obs: '' })}>＋ Anotar atendimento</button>
            </span>
          </div>
          {novo && (
            <div className="sx-ficha-novo">
              <div className="sx-form-grid">
                <label className="field"><span className="field-label">Data</span><input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} /></label>
                <label className="field"><span className="field-label">Serviço</span><input value={novo.servico} onChange={(e) => setNovo({ ...novo, servico: e.target.value })} /></label>
                <label className="field">
                  <span className="field-label">Profissional</span>
                  <select value={novo.profissional} onChange={(e) => setNovo({ ...novo, profissional: e.target.value })}>
                    <option value="">—</option>
                    {[...profs.values()].map((p) => <option key={p.id}>{p.nome}</option>)}
                  </select>
                </label>
                <label className="field"><span className="field-label">Produtos usados</span><input value={novo.produtos} onChange={(e) => setNovo({ ...novo, produtos: e.target.value })} /></label>
              </div>
              <label className="field"><span className="field-label">Como foi feito (máquina, tesoura, acabamento)</span><input value={novo.detalhe} onChange={(e) => setNovo({ ...novo, detalhe: e.target.value })} /></label>
              <label className="field"><span className="field-label">Observação</span><input value={novo.obs} onChange={(e) => setNovo({ ...novo, obs: e.target.value })} placeholder="Ex.: pediu mais curto em cima" /></label>
              <div className="sx-ficha-acoes">
                <button type="button" className="btn btn-primary" onClick={salvarAtendimento}>Salvar atendimento</button>
                <button type="button" className="btn btn-ghost" onClick={() => setNovo(null)}>Cancelar</button>
              </div>
            </div>
          )}
          {historico.length === 0 ? (
            <Vazio>Nenhum atendimento ainda.</Vazio>
          ) : (
            <ol className="sx-ficha-hist">
              {historico.map((h) => (
                <li key={h.id}>
                  <div>
                    <b>{dataBR(h.data)} · {h.servico}</b>
                    {h.profissional && <span className="muted small"> com {h.profissional}</span>}
                    {h.agenda && <Selo>agenda</Selo>}
                  </div>
                  {h.detalhe && <p className="small">✂️ {h.detalhe}</p>}
                  {h.produtos && <p className="small">🧴 {h.produtos}</p>}
                  {h.obs && <p className="small muted">“{h.obs}”</p>}
                  {h.anotacao && <button type="button" className="sx-ficha-x" onClick={() => apagarAtendimento(h.id)} aria-label="Apagar anotação">✕</button>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="sx-ficha-sec">
        <div className="sx-ficha-cab">
          <h3>Fotos do corte</h3>
          {prefs.autoriza_fotos && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => input.current?.click()}>📷 Tirar foto</button>
              <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setFotosSessao((l) => [URL.createObjectURL(f), ...l]) }} />
            </>
          )}
        </div>
        {!prefs.autoriza_fotos ? (
          <p className="muted small">O cliente não autorizou fotos. Marque a autorização nas preferências se ele concordar.</p>
        ) : (
          <>
            <div className="sx-fotos">
              {fotosSessao.map((u) => <div key={u} className="sx-foto-demo"><img src={u} alt="Foto do corte (não salva)" /><span>Agora · não salva</span></div>)}
              {anotacoes.slice(0, 4).map((a, i) => <FotoDemo key={a.id} n={i + cliente.nome.length} rotulo={`${dataBR(a.data)} · ${a.servico}`} />)}
            </div>
            <p className="muted small">Demonstração: as fotos de exemplo são ilustrações e a foto que você tira aparece só agora, sem ser salva.</p>
          </>
        )}
      </section>
    </Modal>
  )
}

export default function Fichas() {
  const clientes = useTabela('clientes')
  const agendamentos = useTabela('agendamentos')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('recentes')
  const [aberto, setAberto] = useState(null)

  const linhas = useMemo(() => {
    const visitas = new Map()
    for (const a of agendamentos) {
      if (a.status !== 'concluido' || !a.cliente_id) continue
      const d = String(a.inicio).slice(0, 10)
      const v = visitas.get(a.cliente_id) || { n: 0, ultima: '' }
      v.n++
      if (d > v.ultima) v.ultima = d
      visitas.set(a.cliente_id, v)
    }
    return clientes
      .filter((c) => !c.excluido)
      .map((c) => {
        const v = visitas.get(c.id) || { n: 0, ultima: '' }
        const anot = (c.atendimentos || []).map((x) => x.data).sort().pop() || ''
        const ultima = anot > v.ultima ? anot : v.ultima
        return { ...c, visitas: v.n + (c.atendimentos?.length || 0), ultima, temFicha: Boolean(c.corte_preferido || c.maquina || c.atendimentos?.length) }
      })
  }, [clientes, agendamentos])
  const q = busca.trim().toLowerCase()
  const hoje = hojeISO()
  const sumidos = linhas.filter((c) => c.ultima && (new Date(`${hoje}T12:00`) - new Date(`${c.ultima}T12:00`)) / 86400000 > 35)
  const lista = (filtro === 'ficha' ? linhas.filter((c) => c.temFicha) : filtro === 'sumidos' ? sumidos : linhas)
    .filter((c) => !q || `${c.nome} ${c.telefone || ''} ${c.corte_preferido || ''}`.toLowerCase().includes(q))
    .sort((a, b) => String(b.ultima).localeCompare(String(a.ultima)))
  const atual = aberto ? clientes.find((c) => c.id === aberto) : null

  return (
    <div className="sx-modulo">
      <Topo titulo="Ficha do cliente" sub="Preferências, números da máquina, produtos e o histórico de cada atendimento" />
      <div>
        <input className="sx-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente" />
      </div>
      <Chips
        valor={filtro}
        onChange={setFiltro}
        opcoes={[
          ['recentes', 'Todos', linhas.length],
          ['ficha', 'Com ficha', linhas.filter((c) => c.temFicha).length],
          ['sumidos', 'Sumidos há +35 dias', sumidos.length],
        ]}
      />
      {lista.length === 0 ? (
        <Vazio>Nenhum cliente encontrado.</Vazio>
      ) : (
        <div className="sx-fichas">
          {lista.slice(0, 120).map((c) => (
            <button key={c.id} type="button" className="sx-ficha-card" onClick={() => setAberto(c.id)}>
              <span className="sx-ficha-ini" aria-hidden="true">{c.nome.split(' ').slice(0, 2).map((p) => p[0]).join('')}</span>
              <span className="sx-ficha-txt">
                <b>{c.nome}</b>
                <small>{c.corte_preferido || 'Sem preferência anotada'}</small>
                <small className="muted">{c.visitas} visita(s){c.ultima ? ` · última ${dataBR(c.ultima)}` : ''}</small>
              </span>
              {c.alergias && <Selo tom="aviso">alergia</Selo>}
            </button>
          ))}
        </div>
      )}
      {atual && <Ficha cliente={atual} onFechar={() => setAberto(null)} />}
    </div>
  )
}
