'use client'

import { useEffect, useMemo, useState } from 'react'
import { linkCom, lerDoLink, limparHash } from '@/lib/compartilhar'
import { Aviso, BotaoCopiar, Compartilhar, uid, useLocal } from './comum'

const PALETA = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4b5563']
const curto = (n) => {
  const p = n.trim().split(/\s+/)
  return p.length > 1 ? `${p[0].slice(0, 6)} ${p[p.length - 1][0]}.` : p[0].slice(0, 8)
}

function demo() {
  const grupos = [
    { nome: 'Família da noiva', cor: PALETA[0] },
    { nome: 'Família do noivo', cor: PALETA[1] },
    { nome: 'Amigos', cor: PALETA[2] },
    { nome: 'Trabalho', cor: PALETA[3] },
  ]
  const nomes = {
    'Família da noiva': ['Helena Duarte', 'Roberto Duarte', 'Clara Duarte', 'Tia Marta', 'Tio Jorge', 'Vó Lourdes', 'Prima Lívia', 'Primo Davi', 'Tia Sônia', 'Tio Beto'],
    'Família do noivo': ['Sérgio Lima', 'Regina Lima', 'Lucas Lima', 'Tio Paulo', 'Tia Neide', 'Prima Bia', 'Vô Antônio', 'Vó Cida', 'Primo Rafa', 'Tia Lena'],
    Amigos: ['André Souza', 'Bianca Nunes', 'Caio Ferraz', 'Daniela Alves', 'Eduardo Reis', 'Gabriela Melo', 'Henrique Costa', 'Isabela Moura', 'João Victor', 'Larissa Pinto', 'Mateus Araújo', 'Natália Gomes'],
    Trabalho: ['Patrícia Ramos', 'Rafael Teixeira', 'Simone Dias', 'Vinícius Lopes', 'Yasmin Freitas', 'Otávio Prado', 'Kátia Rocha', 'Leandro Silva'],
  }
  const mesas = [
    { id: 'm0', nome: 'Noivos e pais', lugares: 6, forma: 'retangular' },
    ...[1, 2, 3, 4, 5].map((n) => ({ id: `m${n}`, nome: `Mesa ${n}`, lugares: 8, forma: 'redonda' })),
  ]
  const convidados = []
  for (const [g, l] of Object.entries(nomes)) l.forEach((nome) => convidados.push({ id: uid(), nome, grupo: g, mesa: null }))
  const coloca = (nome, mesa) => {
    const c = convidados.find((x) => x.nome === nome)
    if (c) c.mesa = mesa
  }
  ;['Helena Duarte', 'Roberto Duarte', 'Sérgio Lima', 'Regina Lima'].forEach((n) => coloca(n, 'm0'))
  nomes['Família da noiva'].slice(2, 9).forEach((n) => coloca(n, 'm1'))
  nomes['Família do noivo'].slice(2, 8).forEach((n) => coloca(n, 'm2'))
  nomes.Amigos.slice(0, 7).forEach((n) => coloca(n, 'm3'))
  return { evento: 'Casamento Ana & Pedro', grupos, mesas, convidados }
}

function Mesa({ mesa, ocupantes, corDe, alvo, selecionado, onSoltar, onTirar, onRenomear, onLugares, onRemover, soLeitura, destaque }) {
  const [sobre, setSobre] = useState(false)
  const n = mesa.lugares
  const cheia = ocupantes.length > n
  const r = mesa.forma === 'retangular' ? null : 76
  const pos = (i) => {
    if (r) {
      const a = (i / n) * 2 * Math.PI - Math.PI / 2
      return { left: 95 + r * Math.cos(a), top: 95 + r * Math.sin(a) }
    }
    // retangular: metade em cima, metade embaixo
    const cima = Math.ceil(n / 2)
    const lado = i < cima ? 0 : 1
    const k = lado === 0 ? i : i - cima
    const tot = lado === 0 ? cima : n - cima
    return { left: 24 + ((k + 0.5) * 142) / tot, top: lado === 0 ? 34 : 156 }
  }
  return (
    <div
      className="ms-mesa"
      data-alvo={(sobre || (alvo && selecionado)) || undefined}
      data-cheia={cheia || undefined}
      onDragOver={(e) => {
        if (soLeitura) return
        e.preventDefault()
        setSobre(true)
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault()
        setSobre(false)
        onSoltar(e.dataTransfer.getData('text/plain'))
      }}
      onClick={() => selecionado && onSoltar(selecionado)}
    >
      <div className="ms-mesa-cab">
        {soLeitura ? <b style={{ flex: 1 }}>{mesa.nome}</b> : <input value={mesa.nome} onChange={(e) => onRenomear(e.target.value)} onClick={(e) => e.stopPropagation()} aria-label="Nome da mesa" />}
        <small className="muted">{ocupantes.length}/{n}</small>
        {!soLeitura && (
          <>
            <button type="button" className="gp-x" onClick={(e) => { e.stopPropagation(); onLugares(-1) }} aria-label="Menos lugares">−</button>
            <button type="button" className="gp-x" onClick={(e) => { e.stopPropagation(); onLugares(1) }} aria-label="Mais lugares">+</button>
            <button type="button" className="gp-x" onClick={(e) => { e.stopPropagation(); onRemover() }} aria-label="Remover mesa">✕</button>
          </>
        )}
      </div>
      <div className="ms-roda" data-forma={mesa.forma}>
        <div className="ms-roda-centro">{mesa.nome.replace(/^Mesa\s+/, '')}</div>
        {Array.from({ length: n }, (_, i) => {
          const c = ocupantes[i]
          return (
            <span
              key={i}
              className="ms-lugar"
              data-ocupado={c ? '' : undefined}
              style={{ ...pos(i), background: c ? corDe(c.grupo) : undefined, outline: c && destaque === c.id ? '3px solid #facc15' : undefined }}
              title={c ? `${c.nome}${soLeitura ? '' : ' (toque para tirar da mesa)'}` : 'Lugar livre'}
              onClick={(e) => {
                if (!c || soLeitura) return
                e.stopPropagation()
                onTirar(c.id)
              }}
            >
              {c ? curto(c.nome).split(' ')[0] : ''}
            </span>
          )
        })}
      </div>
      {cheia && <small style={{ color: '#dc2626' }}>⚠ {ocupantes.length - n} pessoa(s) a mais que os lugares</small>}
      <div className="ms-nomes">
        {ocupantes.map((c) => (
          <span key={c.id} className="ms-chip" draggable={!soLeitura} onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)} style={destaque === c.id ? { outline: '2px solid #facc15' } : undefined}>
            <i style={{ background: corDe(c.grupo) }} />
            {c.nome}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function OrganizadorMesas() {
  const [local, setLocal] = useLocal('soudev-mesas-v1', demo)
  const [compartilhado, setCompartilhado] = useState(null)
  const [sel, setSel] = useState(null)
  const [sobreLivres, setSobreLivres] = useState(false)
  const [lote, setLote] = useState('')
  const [grupoNovo, setGrupoNovo] = useState('Amigos')
  const [busca, setBusca] = useState('')
  const [link, setLink] = useState('')

  useEffect(() => {
    const d = lerDoLink()
    if (d?.mesas) setCompartilhado(d)
  }, [])

  const dados = compartilhado || local
  const soLeitura = Boolean(compartilhado)
  const corDe = useMemo(() => {
    const m = Object.fromEntries((dados?.grupos || []).map((g) => [g.nome, g.cor]))
    return (g) => m[g] || '#6b7280'
  }, [dados])
  if (!dados) return null

  const mudar = (fn) => setLocal((d) => fn(structuredClone(d)))
  const mover = (cid, mesa) => {
    if (!cid) return
    mudar((d) => {
      const c = d.convidados.find((x) => x.id === cid)
      if (c) c.mesa = mesa
      return d
    })
    setSel(null)
  }
  const livres = dados.convidados.filter((c) => !c.mesa || !dados.mesas.some((m) => m.id === c.mesa))
  const lugares = dados.mesas.reduce((s, m) => s + m.lugares, 0)
  const sentados = dados.convidados.length - livres.length

  const adicionar = () => {
    const linhas = lote.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!linhas.length) return
    mudar((d) => {
      for (const l of linhas) {
        const [nome, g] = l.split(/[;,\t]/).map((x) => x.trim())
        const grupo = g || grupoNovo
        if (!d.grupos.some((x) => x.nome === grupo)) d.grupos.push({ nome: grupo, cor: PALETA[d.grupos.length % PALETA.length] })
        d.convidados.push({ id: uid(), nome, grupo, mesa: null })
      }
      return d
    })
    setLote('')
  }
  // Organização automática: mantém cada grupo junto, enchendo as mesas com mais espaço livre primeiro.
  const automatico = () => {
    if (!confirm('Organizar automaticamente quem está sem mesa, mantendo os grupos juntos?')) return
    mudar((d) => {
      const livre = (m) => m.lugares - d.convidados.filter((c) => c.mesa === m.id).length
      const porGrupo = {}
      for (const c of d.convidados) if (!c.mesa || !d.mesas.some((m) => m.id === c.mesa)) (porGrupo[c.grupo] ||= []).push(c)
      const gruposOrd = Object.values(porGrupo).sort((a, b) => b.length - a.length)
      for (const g of gruposOrd) {
        let resto = [...g]
        while (resto.length) {
          // mesa que já tem gente do grupo e espaço, senão a mais vazia
          const comGrupo = d.mesas.filter((m) => livre(m) > 0 && d.convidados.some((c) => c.mesa === m.id && c.grupo === resto[0].grupo))
          const m = (comGrupo.length ? comGrupo : [...d.mesas].filter((x) => livre(x) > 0)).sort((a, b) => livre(b) - livre(a))[0]
          if (!m) break
          const cabem = livre(m)
          resto.splice(0, cabem).forEach((c) => (c.mesa = m.id))
        }
      }
      return d
    })
  }
  const textoLista = dados.mesas.map((m) => `${m.nome}: ${dados.convidados.filter((c) => c.mesa === m.id).map((c) => c.nome).join(', ') || '—'}`).join('\n')
  const achado = busca.trim().length >= 2 ? dados.convidados.filter((c) => c.nome.toLowerCase().includes(busca.trim().toLowerCase())) : []

  return (
    <div className="gp">
      {soLeitura && (
        <Aviso tom="alerta">
          Mapa de mesas de <b>{dados.evento}</b> (somente leitura).{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Copiar este mapa para o seu navegador e editar?')) { setLocal(compartilhado); setCompartilhado(null); limparHash() } }}>Copiar e editar</button>
        </Aviso>
      )}

      <div className="gp-caixa">
        <label className="gp-campo">
          <span>🔎 Onde vou sentar?</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o seu nome" />
        </label>
        {achado.slice(0, 5).map((c) => {
          const m = dados.mesas.find((x) => x.id === c.mesa)
          return (
            <p key={c.id} className="ms-busca-res" style={{ margin: 0 }}>
              <b>{c.nome}</b>: {m ? <>está na <b>{m.nome}</b> ({dados.convidados.filter((x) => x.mesa === m.id && x.id !== c.id).slice(0, 4).map((x) => x.nome.split(' ')[0]).join(', ')}…)</> : 'ainda sem mesa'}
            </p>
          )
        })}
      </div>

      <div className="gp-barra">
        {soLeitura ? <h3 className="gp-titulo">{dados.evento}</h3> : <input value={dados.evento} onChange={(e) => setLocal((d) => ({ ...d, evento: e.target.value }))} style={{ maxWidth: 280, fontWeight: 700 }} aria-label="Nome do evento" />}
        <span className="gp-sub">{sentados} de {dados.convidados.length} com lugar · {lugares} lugares em {dados.mesas.length} mesas</span>
        <span className="gp-espaco" />
        {!soLeitura && (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => mudar((d) => { d.mesas.push({ id: uid(), nome: `Mesa ${d.mesas.length}`, lugares: 8, forma: 'redonda' }); return d })}>＋ Mesa redonda</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => mudar((d) => { d.mesas.push({ id: uid(), nome: `Mesa ${d.mesas.length}`, lugares: 10, forma: 'retangular' }); return d })}>＋ Mesa comprida</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={automatico} disabled={!livres.length}>✨ Organizar automático</button>
            <BotaoCopiar texto={textoLista} rotulo="Copiar lista por mesa" />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setLink(linkCom(dados))}>Compartilhar</button>
          </>
        )}
      </div>
      {link && !soLeitura && <Compartilhar link={link} mensagem={`Mapa de mesas do ${dados.evento}: procure o seu nome 💐`} titulo="Link do mapa de mesas" dica="Os convidados digitam o nome e veem a mesa. O mapa vai dentro do link (nada fica em servidor). Se mudar algo, gere o link de novo." />}

      <div className="ms-grupo-leg">
        {dados.grupos.map((g) => <span key={g.nome}><i style={{ background: g.cor }} />{g.nome}</span>)}
      </div>

      <div className={soLeitura ? '' : 'ms-layout'}>
        {!soLeitura && (
          <aside
            className="gp-caixa ms-livres"
            data-alvo={sobreLivres || undefined}
            onDragOver={(e) => { e.preventDefault(); setSobreLivres(true) }}
            onDragLeave={() => setSobreLivres(false)}
            onDrop={(e) => { e.preventDefault(); setSobreLivres(false); mover(e.dataTransfer.getData('text/plain'), null) }}
          >
            <b>Sem mesa ({livres.length})</b>
            <p className="gp-sub">Arraste para uma mesa. No celular: toque no nome e depois na mesa.</p>
            <div className="ms-nomes">
              {livres.map((c) => (
                <span
                  key={c.id}
                  className="ms-chip"
                  draggable
                  data-sel={sel === c.id || undefined}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                  onClick={() => setSel(sel === c.id ? null : c.id)}
                  role="button"
                  tabIndex={0}
                >
                  <i style={{ background: corDe(c.grupo) }} />
                  {c.nome}
                </span>
              ))}
              {!livres.length && <p className="gp-sub">Todo mundo tem lugar 🎉</p>}
            </div>
            <label className="gp-campo">
              <span>Adicionar convidados (um por linha)</span>
              <textarea rows={4} value={lote} onChange={(e) => setLote(e.target.value)} placeholder={'Maria Silva\nJoão Souza; Trabalho'} />
            </label>
            <div className="gp-linha">
              <select value={grupoNovo} onChange={(e) => setGrupoNovo(e.target.value)} aria-label="Grupo">
                {dados.grupos.map((g) => <option key={g.nome}>{g.nome}</option>)}
              </select>
              <button type="button" className="btn btn-primary btn-sm" onClick={adicionar}>Adicionar</button>
            </div>
            <div className="gp-barra">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirm('Tirar todo mundo das mesas?') && mudar((d) => { d.convidados.forEach((c) => (c.mesa = null)); return d })}>Esvaziar mesas</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirm('Voltar ao exemplo?') && setLocal(demo())}>Exemplo</button>
            </div>
          </aside>
        )}
        <div className="ms-salao">
          {dados.mesas.map((m) => (
            <Mesa
              key={m.id}
              mesa={m}
              soLeitura={soLeitura}
              ocupantes={dados.convidados.filter((c) => c.mesa === m.id)}
              corDe={corDe}
              alvo
              selecionado={sel}
              destaque={achado[0]?.id}
              onSoltar={(cid) => mover(cid, m.id)}
              onTirar={(cid) => mover(cid, null)}
              onRenomear={(nome) => mudar((d) => { d.mesas.find((x) => x.id === m.id).nome = nome; return d })}
              onLugares={(k) => mudar((d) => { const x = d.mesas.find((y) => y.id === m.id); x.lugares = Math.max(2, Math.min(24, x.lugares + k)); return d })}
              onRemover={() => confirm(`Remover ${m.nome}? Quem está nela volta para "Sem mesa".`) && mudar((d) => { d.mesas = d.mesas.filter((x) => x.id !== m.id); d.convidados.forEach((c) => c.mesa === m.id && (c.mesa = null)); return d })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
