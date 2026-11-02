'use client'

import { useEffect, useState } from 'react'
import { linkCom, lerDoLink, limparHash } from '@/lib/compartilhar'
import { Barra, Cartao, FotoDemo, FotoSessao, Kpi, Moldura, Selo, Vazio, dataBr, hojeIso, somaDias, uid, useDemo, useRecarregarComLink } from '../demos/kit'

const AMBIENTES = {
  Cozinha: { ic: '🍳', tarefas: ['Lavar a louça', 'Limpar o fogão e as bocas', 'Limpar a pia e a bancada', 'Limpar por fora dos armários', 'Limpar o micro-ondas', 'Tirar o lixo', 'Passar pano no chão'] },
  Banheiro: { ic: '🚿', tarefas: ['Lavar o vaso sanitário', 'Limpar a pia e o espelho', 'Lavar o box e os azulejos', 'Trocar as toalhas', 'Repor papel higiênico', 'Passar pano no chão'] },
  Quartos: { ic: '🛏️', tarefas: ['Arrumar / trocar a roupa de cama', 'Tirar o pó dos móveis', 'Aspirar ou varrer', 'Organizar roupas espalhadas', 'Passar pano no chão'] },
  Sala: { ic: '🛋️', tarefas: ['Tirar o pó dos móveis e da TV', 'Aspirar o sofá', 'Organizar almofadas e objetos', 'Limpar vidros e janelas', 'Passar pano no chão'] },
  'Área de serviço': { ic: '🧺', tarefas: ['Lavar roupa', 'Estender / recolher roupa', 'Passar roupa', 'Limpar o tanque'] },
}
const novaFaxina = (cliente, ambientes) => ({
  id: uid(),
  clienteId: cliente.id,
  data: hojeIso(),
  inicio: null,
  fim: null,
  ambientes: ambientes.map((a) => ({ nome: a, ic: AMBIENTES[a]?.ic || '🧽', obs: '', tarefas: (AMBIENTES[a]?.tarefas || []).map((t) => ({ t, feito: false })) })),
  avisos: '',
  status: 'andamento',
})

function demo() {
  const clientes = [
    { id: 'c1', nome: 'Dona Marta', endereco: 'Rua das Acácias, 45', telefone: '11988887777', ambientes: ['Cozinha', 'Banheiro', 'Quartos', 'Sala', 'Área de serviço'], dia: 'Terças' },
    { id: 'c2', nome: 'Apto 71 · Ed. Solar', endereco: 'Av. Central, 900', telefone: '11977776666', ambientes: ['Cozinha', 'Banheiro', 'Sala', 'Quartos'], dia: 'Sextas' },
    { id: 'c3', nome: 'Escritório Contábil Lima', endereco: 'Rua XV, 210 · sala 3', telefone: '', ambientes: ['Cozinha', 'Banheiro', 'Sala'], dia: 'Seg e qui' },
  ]
  const passada = (c, dias) => {
    const f = novaFaxina(c, c.ambientes)
    f.data = somaDias(hojeIso(), -dias)
    f.ambientes.forEach((a, i) => a.tarefas.forEach((t, j) => (t.feito = (i + j + dias) % 6 !== 0)))
    f.inicio = new Date(`${f.data}T08:00`).getTime()
    f.fim = new Date(`${f.data}T12:${10 + dias}`).getTime()
    f.status = 'concluida'
    f.avisos = dias === 7 ? 'Acabou o desinfetante e o saco de lixo grande.' : ''
    return f
  }
  const atual = novaFaxina(clientes[0], clientes[0].ambientes)
  atual.inicio = Date.now() - 75 * 60000
  atual.ambientes[0].tarefas.forEach((t, i) => (t.feito = i < 5))
  atual.ambientes[1].tarefas.forEach((t, i) => (t.feito = i < 2))
  return { prestador: 'Joana Limpezas', clientes, faxinas: [atual, passada(clientes[0], 7), passada(clientes[1], 4), passada(clientes[2], 2)] }
}

const progresso = (f) => {
  const t = f.ambientes.flatMap((a) => a.tarefas)
  return { feitas: t.filter((x) => x.feito).length, total: t.length }
}
const duracao = (f) => {
  if (!f.inicio) return '—'
  const min = Math.round(((f.fim || Date.now()) - f.inicio) / 60000)
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

function Relatorio({ dados }) {
  const f = dados.faxina
  const p = progresso(f)
  return (
    <div className="pr-rel">
      <div className="pr-rel-cab">
        <span style={{ fontSize: '2rem' }}>🧽</span>
        <div>
          <h2>Relatório da limpeza</h2>
          <p>{dados.cliente} · {dataBr(f.data)} · {dados.prestador}</p>
        </div>
      </div>
      <div className="dm-kpis">
        <Kpi rotulo="Concluído" valor={`${Math.round((p.feitas / Math.max(1, p.total)) * 100)}%`} sub={`${p.feitas} de ${p.total} tarefas`} tom="cor" />
        <Kpi rotulo="Tempo" valor={duracao(f)} />
      </div>
      {f.avisos && <div className="dm-pro"><b>⚠️ Avisos</b><span>{f.avisos}</span></div>}
      {f.ambientes.map((a) => (
        <Cartao key={a.nome} titulo={`${a.ic} ${a.nome}`}>
          <ul className="pr-check-ro">
            {a.tarefas.map((t) => <li key={t.t} data-feito={t.feito || undefined}>{t.feito ? '✅' : '⬜'} {t.t}</li>)}
          </ul>
          {a.obs && <p className="dm-mudo" style={{ margin: 0 }}>📝 {a.obs}</p>}
        </Cartao>
      ))}
      <div className="dm-galeria">
        {f.ambientes.slice(0, 3).map((a, i) => <FotoDemo key={a.nome} tema="casa" semente={i + 2} emoji={a.ic} rotulo={`${a.nome} · depois`} />)}
      </div>
      <p className="dm-mudo" style={{ fontSize: '.8rem' }}>As fotos são ilustrações de demonstração.</p>
    </div>
  )
}

export default function ChecklistLimpeza() {
  useRecarregarComLink()
  const [dados, setDados, restaurar] = useDemo('pf-limpeza-v1', demo)
  const [secao, setSecao] = useState('hoje')
  const [rel, setRel] = useState(null)
  const [link, setLink] = useState('')
  const [, setTique] = useState(0)
  const [fotos, setFotos] = useState([])

  useEffect(() => {
    const d = lerDoLink()
    if (d?.faxina) setRel(d)
    const t = setInterval(() => setTique((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  if (rel)
    return (
      <Moldura nome="Checklist de Limpeza" icone="🧽" cor="#0891b2" demo={false} secoes={[['rel', '📋', 'Relatório']]} secao="rel" onSecao={() => {}} aviso={<>Relatório enviado por {rel.prestador}. <button type="button" className="dm-link" onClick={() => { setRel(null); limparHash() }}>Usar o app</button></>}>
        <Relatorio dados={rel} />
      </Moldura>
    )
  if (!dados) return null

  const cliente = (id) => dados.clientes.find((c) => c.id === id)
  const atual = dados.faxinas.find((f) => f.status === 'andamento')
  const mudarFaxina = (id, fn) => setDados((d) => ({ ...d, faxinas: d.faxinas.map((f) => (f.id === id ? fn(structuredClone(f)) : f)) }))
  const iniciar = (c) => {
    if (atual && !confirm('Já tem uma limpeza em andamento. Começar outra mesmo assim?')) return
    const f = novaFaxina(c, c.ambientes)
    f.inicio = Date.now()
    setDados((d) => ({ ...d, faxinas: [f, ...d.faxinas.map((x) => (x.status === 'andamento' ? { ...x, status: 'concluida', fim: x.fim || Date.now() } : x))] }))
    setSecao('hoje')
    setLink('')
  }
  const gerarLink = (f) => setLink(linkCom({ prestador: dados.prestador, cliente: cliente(f.clienteId)?.nome || '', faxina: f }))
  const zap = (f) => {
    const c = cliente(f.clienteId)
    const p = progresso(f)
    const falt = f.ambientes.flatMap((a) => a.tarefas.filter((t) => !t.feito).map((t) => `${a.nome}: ${t.t}`))
    const txt = `Olá! Limpeza de hoje concluída ✨\n${p.feitas} de ${p.total} tarefas em ${duracao(f)}.${falt.length ? `\nFicou para a próxima: ${falt.slice(0, 5).join('; ')}.` : ''}${f.avisos ? `\nAviso: ${f.avisos}` : ''}${link ? `\nRelatório: ${link}` : ''}`
    return `https://wa.me/${c?.telefone ? `55${c.telefone}` : ''}?text=${encodeURIComponent(txt)}`
  }

  return (
    <Moldura nome="Checklist de Limpeza" icone="🧽" cor="#0891b2" demo={false} aviso="Tudo fica salvo neste aparelho. O relatório para o cliente vai por link, sem cadastro." secao={secao} onSecao={setSecao} onRestaurar={restaurar} secoes={[['hoje', '✅', 'Agora'], ['clientes', '🏠', 'Clientes'], ['historico', '🗓️', 'Histórico']]}>
      {secao === 'hoje' &&
        (!atual ? (
          <Cartao titulo="Nenhuma limpeza em andamento">
            <p className="dm-mudo" style={{ margin: 0 }}>Escolha o cliente para começar o checklist:</p>
            <div className="dm-chips">
              {dados.clientes.map((c) => <button key={c.id} type="button" className="dm-chip" onClick={() => iniciar(c)}>▶ {c.nome}</button>)}
            </div>
          </Cartao>
        ) : (
          (() => {
            const p = progresso(atual)
            const c = cliente(atual.clienteId)
            return (
              <>
                <div className="dm-titulo">
                  <h2>{c?.nome}</h2>
                  <Selo tom="cor">em andamento · {duracao(atual)}</Selo>
                  <p>{c?.endereco}</p>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <b>{p.feitas} de {p.total} tarefas</b>
                  <Barra valor={p.feitas} max={p.total} tom={p.feitas === p.total ? 'bom' : undefined} />
                </div>
                <div className="pr-ambientes">
                  {atual.ambientes.map((a, ai) => {
                    const feitas = a.tarefas.filter((t) => t.feito).length
                    return (
                      <Cartao key={a.nome} titulo={`${a.ic} ${a.nome}`} acao={<Selo tom={feitas === a.tarefas.length ? 'bom' : undefined}>{feitas}/{a.tarefas.length}</Selo>}>
                        {a.tarefas.map((t, ti) => (
                          <label key={t.t} className="pr-tarefa" data-feito={t.feito || undefined}>
                            <input type="checkbox" checked={t.feito} onChange={() => mudarFaxina(atual.id, (f) => { f.ambientes[ai].tarefas[ti].feito = !t.feito; return f })} />
                            <span>{t.t}</span>
                          </label>
                        ))}
                        <input value={a.obs} onChange={(e) => mudarFaxina(atual.id, (f) => { f.ambientes[ai].obs = e.target.value; return f })} placeholder="Observação (ex.: mancha no sofá não saiu)" />
                      </Cartao>
                    )
                  })}
                </div>
                <Cartao titulo="Fotos e avisos">
                  <div className="dm-galeria">
                    {fotos.map((u) => <div key={u} className="dm-foto"><img src={u} alt="Foto (não salva)" /><span className="dm-foto-rot">agora · não salva</span></div>)}
                    <FotoDemo tema="casa" semente={4} emoji="✨" rotulo="Exemplo: depois" />
                  </div>
                  <FotoSessao rotulo="Foto do antes/depois" onFoto={(u) => setFotos((l) => [...l, u])} />
                  <textarea rows={2} value={atual.avisos} onChange={(e) => mudarFaxina(atual.id, (f) => { f.avisos = e.target.value; return f })} placeholder="Avisos para o cliente (ex.: acabou o desinfetante)" />
                  <p className="dm-mudo" style={{ margin: 0, fontSize: '.8rem' }}>As fotos tiradas aparecem só agora e não são salvas nem enviadas.</p>
                </Cartao>
                <div className="dm-filtros">
                  <button type="button" className="dm-btn" onClick={() => { mudarFaxina(atual.id, (f) => ({ ...f, fim: Date.now(), status: 'concluida' })); gerarLink({ ...atual, fim: Date.now() }); setSecao('historico') }}>✔ Concluir e gerar relatório</button>
                  <button type="button" className="dm-btn dm-btn-sec" onClick={() => mudarFaxina(atual.id, (f) => { f.ambientes.forEach((a) => a.tarefas.forEach((t) => (t.feito = true))); return f })}>Marcar tudo</button>
                </div>
              </>
            )
          })()
        ))}

      {secao === 'clientes' && (
        <Cartao titulo="Clientes" acao={<button type="button" className="dm-btn" onClick={() => { const nome = prompt('Nome do cliente ou do imóvel:'); if (nome) setDados((d) => ({ ...d, clientes: [...d.clientes, { id: uid(), nome, endereco: '', telefone: '', ambientes: Object.keys(AMBIENTES), dia: '' }] })) }}>＋ Cliente</button>}>
          <ul className="dm-lista">
            {dados.clientes.map((c) => {
              const ultima = dados.faxinas.filter((f) => f.clienteId === c.id && f.status === 'concluida').sort((a, b) => b.data.localeCompare(a.data))[0]
              return (
                <li key={c.id} className="dm-item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                  <span className="dm-item-ic">🏠</span>
                  <span className="dm-item-txt"><b>{c.nome}</b><small>{c.endereco || 'sem endereço'} · {c.dia || 'sem dia fixo'} · última: {ultima ? dataBr(ultima.data) : '—'}</small></span>
                  <div className="dm-chips">
                    {Object.keys(AMBIENTES).map((a) => (
                      <button key={a} type="button" className="dm-chip" aria-pressed={c.ambientes.includes(a)} onClick={() => setDados((d) => ({ ...d, clientes: d.clientes.map((x) => (x.id === c.id ? { ...x, ambientes: x.ambientes.includes(a) ? x.ambientes.filter((y) => y !== a) : [...x.ambientes, a] } : x)) }))}>{AMBIENTES[a].ic}</button>
                    ))}
                  </div>
                  <button type="button" className="dm-btn dm-btn-p" onClick={() => iniciar(c)}>▶ Começar</button>
                </li>
              )
            })}
          </ul>
          <label className="dm-campo"><span>Seu nome no relatório</span><input value={dados.prestador} onChange={(e) => setDados((d) => ({ ...d, prestador: e.target.value }))} /></label>
        </Cartao>
      )}

      {secao === 'historico' && (
        <>
          {link && (
            <div className="dm-pro" style={{ background: '#ecfeff', borderColor: '#67e8f9' }}>
              <b>📋 Relatório pronto</b>
              <span style={{ color: '#155e75' }}>Mande para o cliente: ele abre o link e vê o checklist completo.</span>
              <button type="button" className="dm-btn dm-btn-sec" onClick={() => navigator.clipboard?.writeText(link)}>Copiar link</button>
            </div>
          )}
          <Cartao titulo="Limpezas feitas">
            <ul className="dm-lista">
              {dados.faxinas.filter((f) => f.status === 'concluida').sort((a, b) => b.data.localeCompare(a.data)).map((f) => {
                const p = progresso(f)
                return (
                  <li key={f.id} className="dm-item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                    <span className="dm-item-ic">🧽</span>
                    <span className="dm-item-txt"><b>{cliente(f.clienteId)?.nome}</b><small>{dataBr(f.data)} · {duracao(f)} · {p.feitas}/{p.total} tarefas{f.avisos ? ' · ⚠ aviso' : ''}</small></span>
                    <button type="button" className="dm-btn dm-btn-sec dm-btn-p" onClick={() => setRel({ prestador: dados.prestador, cliente: cliente(f.clienteId)?.nome, faxina: f })}>Ver</button>
                    <button type="button" className="dm-btn dm-btn-sec dm-btn-p" onClick={() => gerarLink(f)}>Link</button>
                    <a className="dm-btn dm-btn-p" style={{ background: '#16a34a' }} href={zap(f)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  </li>
                )
              })}
            </ul>
            {!dados.faxinas.some((f) => f.status === 'concluida') && <Vazio>Nenhuma limpeza concluída ainda.</Vazio>}
          </Cartao>
        </>
      )}
    </Moldura>
  )
}
