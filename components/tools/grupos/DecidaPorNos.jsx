'use client'

import { useCallback, useEffect, useState } from 'react'
import { hashParam } from '@/lib/compartilhar'
import { agir, apagarSala, chaveDe, criarSala, editarSala, esquecerSala, guardarSala, lerSala, meuId, meuNome, minhasSalas, temApi } from '@/lib/grupos-api'
import { Aviso, BotaoCopiar, Carregando, Compartilhar, uid, useIntervalo } from './comum'

const MODELOS = [
  { nome: '✈️ Viagem', pergunta: 'Para onde vamos na viagem?', opcoes: ['Praia', 'Serra', 'Cidade histórica', 'Fazenda / campo'] },
  { nome: '🍕 Restaurante', pergunta: 'Onde vamos comer?', opcoes: ['Pizzaria', 'Japonês', 'Churrascaria', 'Hambúrguer'] },
  { nome: '🎁 Presente', pergunta: 'Qual presente vamos dar?', opcoes: ['Experiência (jantar, passeio)', 'Eletrônico', 'Roupa / acessório', 'Vaquinha em dinheiro'] },
  { nome: '📅 Data', pergunta: 'Qual o melhor dia para o encontro?', opcoes: ['Sexta à noite', 'Sábado à tarde', 'Sábado à noite', 'Domingo no almoço'], multipla: true },
]
const linkDa = (id) => `${window.location.origin}${window.location.pathname}#v=${id}`

function Criar({ onCriada }) {
  const [pergunta, setPergunta] = useState('')
  const [descricao, setDescricao] = useState('')
  const [opcoes, setOpcoes] = useState(['', '', ''])
  const [multipla, setMultipla] = useState(false)
  const [anonima, setAnonima] = useState(false)
  const [sugestoes, setSugestoes] = useState(true)
  const [prazo, setPrazo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const minhas = minhasSalas('votacao')

  const usarModelo = (m) => {
    setPergunta(m.pergunta)
    setOpcoes([...m.opcoes, ''])
    setMultipla(!!m.multipla)
  }
  const setOpcao = (i, v) => {
    const l = opcoes.map((o, j) => (j === i ? v : o))
    if (i === l.length - 1 && v.trim() && l.length < 30) l.push('')
    setOpcoes(l)
  }
  const criar = async (e) => {
    e.preventDefault()
    setErro('')
    const ops = opcoes.map((o) => o.trim()).filter(Boolean)
    if (!pergunta.trim()) return setErro('Escreva a pergunta.')
    if (ops.length < 2) return setErro('Coloque pelo menos duas opções.')
    setEnviando(true)
    try {
      const r = await criarSala('votacao', { pergunta, descricao, opcoes: ops.map((texto) => ({ id: uid(), texto })), multipla, anonima, sugestoes, prazo })
      guardarSala('votacao', { id: r.id, chave: r.chave, titulo: pergunta.trim(), em: Date.now() })
      onCriada(r.id)
    } catch (er) {
      setErro(er.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="gp">
      <div className="gp-chips">
        <span className="gp-sub">Começar de um modelo:</span>
        {MODELOS.map((m) => <button key={m.nome} type="button" className="gp-chip" onClick={() => usarModelo(m)}>{m.nome}</button>)}
      </div>
      <form className="gp-caixa" onSubmit={criar}>
        <label className="gp-campo"><span>Pergunta</span><input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex.: Onde vamos comemorar o aniversário?" maxLength={160} /></label>
        <label className="gp-campo"><span>Detalhes (opcional)</span><input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: dia 20, até R$ 80 por pessoa" maxLength={500} /></label>
        <div className="gp-campo">
          <span>Opções</span>
          {opcoes.map((o, i) => (
            <div key={i} className="gp-linha">
              <input value={o} onChange={(e) => setOpcao(i, e.target.value)} placeholder={`Opção ${i + 1}`} maxLength={120} />
              {opcoes.length > 2 && i < opcoes.length - 1 && <button type="button" className="gp-x" onClick={() => setOpcoes(opcoes.filter((_, j) => j !== i))} aria-label="Remover opção">✕</button>}
            </div>
          ))}
        </div>
        <div className="gp-chips">
          <label className="check"><input type="checkbox" checked={multipla} onChange={(e) => setMultipla(e.target.checked)} /> Pode escolher mais de uma</label>
          <label className="check"><input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} /> Votos anônimos</label>
          <label className="check"><input type="checkbox" checked={sugestoes} onChange={(e) => setSugestoes(e.target.checked)} /> Aceitar sugestões de opções</label>
        </div>
        <label className="gp-campo" style={{ maxWidth: 220 }}><span>Prazo para votar (opcional)</span><input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Criando…' : 'Criar votação e pegar o link'}</button>
        <p className="gp-sub">Ninguém precisa de cadastro: quem tem o link vota uma vez (dá para trocar o voto depois).</p>
      </form>
      {minhas.length > 0 && (
        <div className="gp-caixa">
          <b>Votações que você criou neste aparelho</b>
          {minhas.map((m) => (
            <div key={m.id} className="gp-linha">
              <a href={`#v=${m.id}`} style={{ flex: 1 }}>{m.titulo}</a>
              <small className="muted">{new Date(m.em).toLocaleDateString('pt-BR')}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Votacao({ id, onSair }) {
  const [sala, setSala] = useState(null)
  const [erro, setErro] = useState('')
  const [escolhas, setEscolhas] = useState([])
  const [nome, setNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sugestao, setSugestao] = useState('')
  const [mudar, setMudar] = useState(false)
  const eu = meuId()
  const chave = chaveDe('votacao', id)

  const carregar = useCallback(async () => {
    try {
      const r = await lerSala(id, { eu, chave })
      setSala(r)
      setErro('')
      return r
    } catch (e) {
      setErro(e.message)
    }
  }, [id, eu, chave])
  useEffect(() => {
    setNome(meuNome())
    carregar().then((r) => r?.dados.meuVoto && setEscolhas(r.dados.meuVoto.escolhas))
  }, [carregar])
  useIntervalo(carregar, 4000, Boolean(sala))

  if (erro && !sala) return <Aviso tom="erro">{erro} <button type="button" className="btn btn-ghost btn-sm" onClick={onSair}>Criar outra</button></Aviso>
  if (!sala) return <Carregando />
  const d = sala.dados
  const votou = Boolean(d.meuVoto) && !mudar
  const encerrada = d.fechada || (d.prazo && new Date(`${d.prazo}T23:59:59`) < new Date())
  const verResultado = votou || encerrada || sala.admin
  const max = Math.max(0, ...Object.values(d.contagem))
  const vencedores = d.opcoes.filter((o) => max > 0 && d.contagem[o.id] === max)
  const alternar = (oid) => setEscolhas((l) => (d.multipla ? (l.includes(oid) ? l.filter((x) => x !== oid) : [...l, oid]) : [oid]))

  const votar = async () => {
    if (!escolhas.length) return setErro('Escolha uma opção.')
    setEnviando(true)
    try {
      meuNome(nome.trim())
      const r = await agir(id, { acao: 'votar', participante: eu, nome: nome.trim(), escolhas })
      setSala((s) => ({ ...s, dados: r.dados }))
      setMudar(false)
      setErro('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }
  const sugerir = async (e) => {
    e.preventDefault()
    try {
      const r = await agir(id, { acao: 'sugerir', nome: nome.trim(), texto: sugestao, participante: eu })
      setSala((s) => ({ ...s, dados: r.dados }))
      setSugestao('')
    } catch (er) {
      setErro(er.message)
    }
  }
  const admin = async (dados) => {
    try {
      const r = await editarSala(id, chave, dados, eu)
      setSala(r)
    } catch (e) {
      setErro(e.message)
    }
  }
  const resumo = `${d.pergunta}\n\n${[...d.opcoes].sort((a, b) => d.contagem[b.id] - d.contagem[a.id]).map((o) => `${d.contagem[o.id] === max && max > 0 ? '🏆' : '•'} ${o.texto}: ${d.contagem[o.id]} voto(s)`).join('\n')}\n\nTotal: ${d.total} pessoa(s)`

  return (
    <div className="gp">
      <div className="gp-barra">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSair}>← Nova votação</button>
        <span className="gp-espaco" />
        {encerrada ? <span className="gp-chip">🔒 Encerrada</span> : <span className="gp-sub">● ao vivo · {d.total} voto(s)</span>}
      </div>
      <div className="gp-caixa">
        <h3 className="gp-titulo" style={{ fontSize: '1.35rem' }}>{d.pergunta}</h3>
        {d.descricao && <p className="gp-sub">{d.descricao}</p>}
        <p className="gp-sub">{d.multipla ? 'Pode escolher mais de uma opção.' : 'Escolha uma opção.'}{d.prazo ? ` Vota até ${new Date(`${d.prazo}T12:00:00`).toLocaleDateString('pt-BR')}.` : ''}{d.anonima ? ' Votos anônimos.' : ''}</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {d.opcoes.map((o) => {
            const n = d.contagem[o.id] || 0
            const pct = d.total ? Math.round((n / d.total) * 100) : 0
            const marcada = votou ? d.meuVoto.escolhas.includes(o.id) : escolhas.includes(o.id)
            return (
              <button key={o.id} type="button" className="vt-opcao" data-multi={d.multipla || undefined} aria-pressed={marcada} disabled={votou || encerrada} onClick={() => alternar(o.id)}>
                {verResultado && <span className="vt-barra" style={{ width: `${pct}%` }} />}
                <span className="vt-marca">{marcada ? '✓' : ''}</span>
                <span className="vt-texto">{o.texto}{o.por && <small className="muted"> · sugestão de {o.por}</small>}</span>
                {verResultado && vencedores.some((v) => v.id === o.id) && <span className="vt-vencedor">{encerrada ? 'Vencedor' : 'Na frente'}</span>}
                {verResultado && <span className="vt-pct">{pct}%<small>{n}</small></span>}
              </button>
            )
          })}
        </div>
        {!votou && !encerrada && (
          <div className="gp-linha" style={{ flexWrap: 'wrap' }}>
            {!d.anonima && <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome (aparece para o grupo)" maxLength={40} style={{ flex: '1 1 200px' }} />}
            <button type="button" className="btn btn-primary" onClick={votar} disabled={enviando || !escolhas.length}>{enviando ? 'Enviando…' : d.meuVoto ? 'Trocar meu voto' : 'Votar'}</button>
          </div>
        )}
        {votou && !encerrada && <p className="gp-sub">✓ Seu voto foi registrado. <button type="button" className="gp-chip" onClick={() => { setEscolhas(d.meuVoto.escolhas); setMudar(true) }}>Mudar voto</button></p>}
        {!verResultado && <p className="gp-sub">O resultado aparece depois que você vota.</p>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {d.sugestoes && !encerrada && (
          <form onSubmit={sugerir} className="gp-linha">
            <input value={sugestao} onChange={(e) => setSugestao(e.target.value)} placeholder="Sugerir outra opção…" maxLength={120} />
            <button type="submit" className="btn btn-ghost btn-sm" disabled={!sugestao.trim()}>Sugerir</button>
          </form>
        )}
      </div>

      {verResultado && d.total > 0 && (
        <div className="vt-cartao-resultado">
          <small>{encerrada ? 'Resultado final' : 'Por enquanto'}</small>
          <b>{vencedores.length === 1 ? `🏆 ${vencedores[0].texto}` : `Empate: ${vencedores.map((v) => v.texto).join(' × ')}`}</b>
          <small>{d.total} pessoa(s) votaram</small>
          <div><BotaoCopiar texto={resumo} rotulo="Copiar resultado" className="btn btn-sm vt-btn-claro" /></div>
        </div>
      )}
      {verResultado && d.votantes.length > 0 && (
        <div className="gp-caixa">
          <b>Quem votou</b>
          <div className="vt-votantes">
            {d.votantes.map((v, i) => <span key={i} title={v.escolhas.map((e) => d.opcoes.find((o) => o.id === e)?.texto).join(', ')}>{v.nome}: {v.escolhas.map((e) => d.opcoes.find((o) => o.id === e)?.texto).join(', ')}</span>)}
          </div>
        </div>
      )}

      <Compartilhar link={linkDa(id)} mensagem={`🗳️ Vota aqui: ${d.pergunta}`} titulo="Chame o grupo para votar" dica="Mande no grupo do WhatsApp. Não precisa de cadastro." />

      {sala.admin && (
        <div className="gp-caixa">
          <b>Você criou esta votação</b>
          <div className="gp-barra">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => admin({ fechada: !d.fechada })}>{d.fechada ? 'Reabrir votação' : '🔒 Encerrar votação'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => admin({ anonima: !d.anonima })}>{d.anonima ? 'Mostrar nomes' : 'Deixar anônima'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => admin({ sugestoes: !d.sugestoes })}>{d.sugestoes ? 'Parar sugestões' : 'Aceitar sugestões'}</button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#dc2626' }}
              onClick={async () => {
                if (!confirm('Apagar a votação para todo mundo?')) return
                await apagarSala(id, chave).catch(() => {})
                esquecerSala('votacao', id)
                onSair()
              }}
            >
              Apagar
            </button>
          </div>
          <p className="gp-sub">Só este navegador tem a chave de administrador.</p>
        </div>
      )}
    </div>
  )
}

export default function DecidaPorNos() {
  const [id, setId] = useState(null)
  useEffect(() => {
    const ler = () => setId(hashParam('v') || '')
    ler()
    window.addEventListener('hashchange', ler)
    return () => window.removeEventListener('hashchange', ler)
  }, [])
  if (!temApi()) return <Aviso tom="erro">Esta ferramenta precisa da variável NEXT_PUBLIC_IDEIAS_API.</Aviso>
  if (id === null) return <Carregando />
  if (!id) return <Criar onCriada={(nid) => { window.location.hash = `v=${nid}` }} />
  return <Votacao key={id} id={id} onSair={() => { history.replaceState(null, '', window.location.pathname); setId('') }} />
}
