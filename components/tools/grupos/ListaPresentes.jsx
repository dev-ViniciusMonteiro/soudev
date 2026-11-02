'use client'

import { useCallback, useEffect, useState } from 'react'
import { hashParam } from '@/lib/compartilhar'
import { agir, apagarSala, chaveDe, criarSala, editarSala, esquecerSala, guardarSala, lerSala, meuId, meuNome, minhasSalas, temApi } from '@/lib/grupos-api'
import { Aviso, Carregando, Compartilhar, uid, useIntervalo } from './comum'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const OCASIOES = {
  'Chá de bebê': { ic: '🍼', itens: [['Fraldas RN (pacote)', 50, 4], ['Fraldas P (pacote)', 60, 6], ['Kit body manga longa', 90, 2], ['Banheira com suporte', 180, 1], ['Toalha com capuz', 45, 3], ['Lenço umedecido (caixa)', 70, 3], ['Carrinho de bebê', 900, 1], ['Mordedor', 30, 2]] },
  Casamento: { ic: '💍', itens: [['Jogo de panelas', 450, 1], ['Jogo de cama casal', 280, 2], ['Air fryer', 400, 1], ['Liquidificador', 220, 1], ['Jogo de taças', 160, 1], ['Aparelho de jantar', 380, 1], ['Toalhas de banho (kit)', 150, 2], ['Cota da lua de mel', 200, 10]] },
  'Chá de casa nova': { ic: '🏡', itens: [['Jogo de copos', 90, 1], ['Panela de pressão', 180, 1], ['Kit utensílios de cozinha', 120, 1], ['Tapete', 150, 1], ['Kit de toalhas', 140, 1], ['Organizadores', 60, 3]] },
  Aniversário: { ic: '🎂', itens: [['Livro', 70, 2], ['Fone Bluetooth', 250, 1], ['Perfume', 220, 1], ['Vale-presente', 100, 3], ['Camiseta', 80, 2]] },
  Natal: { ic: '🎄', itens: [['Amigo oculto até R$ 100', 100, 1], ['Panetone artesanal', 60, 2], ['Pijama', 90, 1]] },
  Outro: { ic: '🎁', itens: [] },
}
const linkDa = (id) => `${window.location.origin}${window.location.pathname}#l=${id}`
const itemVazio = () => ({ id: uid(), nome: '', preco: '', qtd: 1, link: '', categoria: '' })

function EditorItens({ itens, setItens }) {
  const set = (i, campo, v) => setItens(itens.map((x, j) => (j === i ? { ...x, [campo]: v } : x)))
  return (
    <div className="gp-campo">
      <span>Presentes</span>
      {itens.map((it, i) => (
        <div key={it.id} className="lp-editar-item">
          <input value={it.nome} onChange={(e) => set(i, 'nome', e.target.value)} placeholder="Presente" maxLength={100} aria-label="Presente" />
          <input value={it.preco} onChange={(e) => set(i, 'preco', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="R$" inputMode="decimal" aria-label="Preço aproximado" />
          <input type="number" min={1} max={50} value={it.qtd} onChange={(e) => set(i, 'qtd', e.target.value)} aria-label="Quantidade" title="Quantidade" />
          <input value={it.link} onChange={(e) => set(i, 'link', e.target.value)} placeholder="Link da loja (opcional)" aria-label="Link" />
          <button type="button" className="gp-x" onClick={() => setItens(itens.filter((_, j) => j !== i))} aria-label="Remover">✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => setItens([...itens, itemVazio()])}>＋ Presente</button>
    </div>
  )
}
const paraEnvio = (itens) => itens.filter((i) => i.nome.trim()).map((i) => ({ ...i, preco: Number(String(i.preco).replace(/\./g, '').replace(',', '.')) || 0, qtd: Number(i.qtd) || 1 }))

function Criar({ onCriada }) {
  const [f, setF] = useState({ titulo: '', ocasiao: 'Chá de bebê', data: '', mensagem: '', endereco: '', pix: '', surpresa: false })
  const [itens, setItens] = useState(() => OCASIOES['Chá de bebê'].itens.map(([nome, preco, qtd]) => ({ ...itemVazio(), nome, preco: String(preco), qtd })))
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const minhas = minhasSalas('presentes')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const trocarOcasiao = (o) => {
    setF({ ...f, ocasiao: o })
    if (!itens.some((i) => i.nome.trim()) || confirm('Trocar os presentes pela sugestão desta ocasião?')) setItens(OCASIOES[o].itens.length ? OCASIOES[o].itens.map(([nome, preco, qtd]) => ({ ...itemVazio(), nome, preco: String(preco), qtd })) : [itemVazio()])
  }
  const criar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!f.titulo.trim()) return setErro('Dê um nome à lista (ex.: Chá da Lara).')
    if (!paraEnvio(itens).length) return setErro('Coloque pelo menos um presente.')
    setEnviando(true)
    try {
      const r = await criarSala('presentes', { ...f, itens: paraEnvio(itens) })
      guardarSala('presentes', { id: r.id, chave: r.chave, titulo: f.titulo.trim(), em: Date.now() })
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
        {Object.entries(OCASIOES).map(([o, v]) => <button key={o} type="button" className="gp-chip" aria-pressed={f.ocasiao === o} onClick={() => trocarOcasiao(o)}>{v.ic} {o}</button>)}
      </div>
      <form className="gp-caixa" onSubmit={criar}>
        <div className="gp-grade2">
          <label className="gp-campo"><span>Nome da lista</span><input value={f.titulo} onChange={set('titulo')} placeholder="Ex.: Chá de bebê da Lara" maxLength={100} /></label>
          <label className="gp-campo"><span>Data do evento</span><input type="date" value={f.data} onChange={set('data')} /></label>
        </div>
        <label className="gp-campo"><span>Recado para os convidados</span><textarea rows={2} value={f.mensagem} onChange={set('mensagem')} placeholder="Ex.: Fraldas de tamanhos variados são sempre bem-vindas 💛" maxLength={600} /></label>
        <div className="gp-grade2">
          <label className="gp-campo"><span>Endereço para entrega (opcional)</span><input value={f.endereco} onChange={set('endereco')} maxLength={200} /></label>
          <label className="gp-campo"><span>Chave Pix para quem preferir (opcional)</span><input value={f.pix} onChange={set('pix')} maxLength={120} /></label>
        </div>
        <EditorItens itens={itens} setItens={setItens} />
        <label className="check"><input type="checkbox" checked={f.surpresa} onChange={set('surpresa')} /> Modo surpresa: eu não vejo quem vai dar cada presente</label>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Criando…' : 'Criar lista e pegar o link'}</button>
      </form>
      {minhas.length > 0 && (
        <div className="gp-caixa">
          <b>Suas listas neste aparelho</b>
          {minhas.map((m) => <a key={m.id} href={`#l=${m.id}`}>{m.titulo}</a>)}
        </div>
      )}
    </div>
  )
}

function Lista({ id, onSair }) {
  const [sala, setSala] = useState(null)
  const [erro, setErro] = useState('')
  const [nome, setNome] = useState('')
  const [filtro, setFiltro] = useState('')
  const [editando, setEditando] = useState(null)
  const [ocupado, setOcupado] = useState('')
  const eu = meuId()
  const chave = chaveDe('presentes', id)
  const carregar = useCallback(async () => {
    try {
      setSala(await lerSala(id, { eu, chave }))
      setErro('')
    } catch (e) {
      setErro(e.message)
    }
  }, [id, eu, chave])
  useEffect(() => {
    setNome(meuNome())
    carregar()
  }, [carregar])
  useIntervalo(carregar, 6000, Boolean(sala) && !editando)

  if (erro && !sala) return <Aviso tom="erro">{erro} <button type="button" className="btn btn-ghost btn-sm" onClick={onSair}>Criar uma lista</button></Aviso>
  if (!sala) return <Carregando />
  const d = sala.dados
  const ic = OCASIOES[d.ocasiao]?.ic || '🎁'
  const acao = async (a, itemId) => {
    if (a === 'reservar' && !nome.trim()) return setErro('Escreva o seu nome antes de escolher o presente.')
    setOcupado(itemId)
    try {
      meuNome(nome.trim())
      const r = await agir(id, { acao: a, itemId, participante: eu, nome: nome.trim() })
      setSala((s) => ({ ...s, dados: { ...r.dados, itens: r.dados.itens.map((i) => ({ ...i, quem: s.dados.itens.find((x) => x.id === i.id)?.quem || [] })) } }))
      setErro('')
      carregar()
    } catch (e) {
      setErro(e.message)
      carregar()
    } finally {
      setOcupado('')
    }
  }
  const mine = d.itens.filter((i) => i.minha)
  const lista = d.itens.filter((i) => (filtro === 'livres' ? i.reservados < i.qtd : filtro === 'meus' ? i.minha : true))
  const reservadosValor = d.itens.reduce((s, i) => s + i.preco * i.reservados, 0)

  return (
    <div className="gp">
      <div className="gp-barra">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSair}>← Criar outra lista</button>
      </div>
      <div className="lp-capa">
        <span style={{ fontSize: '2.2rem' }}>{ic}</span>
        <h3>{d.titulo}</h3>
        <p>{d.ocasiao}{d.data ? ` · ${new Date(`${d.data}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</p>
        {d.mensagem && <p style={{ whiteSpace: 'pre-line' }}>{d.mensagem}</p>}
        {d.endereco && <p><small>📦 Entrega: {d.endereco}</small></p>}
        {d.pix && <p><small>Prefere Pix? {d.pix}</small></p>}
      </div>

      {!sala.admin && (
        <div className="gp-caixa">
          <label className="gp-campo"><span>Seu nome (só quem organiza vê)</span><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Tia Rosa" maxLength={40} /></label>
          {mine.length > 0 && <p className="gp-sub" style={{ margin: 0 }}>✓ Você vai dar: <b>{mine.map((i) => i.nome).join(', ')}</b></p>}
        </div>
      )}
      {sala.admin && (
        <div className="gp-caixa">
          <b>Você organiza esta lista</b>
          <p className="gp-sub">{d.itens.filter((i) => i.reservados >= i.qtd).length} de {d.itens.length} presentes já escolhidos · cerca de {BRL.format(reservadosValor)}{d.surpresa ? ' · modo surpresa ligado (você não vê quem vai dar)' : ''}</p>
          <div className="gp-barra">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando({ ...d, itens: d.itens.map((i) => ({ ...i, preco: String(i.preco || '') })) })}>✏️ Editar lista</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={async () => setSala(await editarSala(id, chave, { surpresa: !d.surpresa }, eu))}>{d.surpresa ? 'Ver quem vai dar' : 'Ligar modo surpresa'}</button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={async () => { if (confirm('Apagar a lista para todo mundo?')) { await apagarSala(id, chave).catch(() => {}); esquecerSala('presentes', id); onSair() } }}>Apagar</button>
          </div>
        </div>
      )}
      {editando && (
        <div className="gp-caixa">
          <label className="gp-campo"><span>Recado</span><textarea rows={2} value={editando.mensagem} onChange={(e) => setEditando({ ...editando, mensagem: e.target.value })} /></label>
          <EditorItens itens={editando.itens} setItens={(itens) => setEditando({ ...editando, itens })} />
          <div className="gp-barra">
            <button type="button" className="btn btn-primary btn-sm" onClick={async () => { try { setSala(await editarSala(id, chave, { mensagem: editando.mensagem, itens: paraEnvio(editando.itens) }, eu)); setEditando(null) } catch (e) { setErro(e.message) } }}>Salvar</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <div className="gp-chips">
        {[['', 'Todos'], ['livres', 'Ainda disponíveis'], ...(sala.admin ? [] : [['meus', 'Os que vou dar']])].map(([k, n]) => <button key={k} type="button" className="gp-chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n}</button>)}
      </div>
      <div className="lp-grade">
        {lista.map((i) => {
          const restam = i.qtd - i.reservados
          const esgotado = restam <= 0 && !i.minha
          return (
            <div key={i.id} className="lp-item" data-esgotado={esgotado || undefined} data-meu={i.minha || undefined}>
              <span className="lp-ic">{ic}</span>
              <b>{i.nome}</b>
              {i.preco > 0 && <span className="lp-preco">~ {BRL.format(i.preco)}</span>}
              <span className="lp-faltam">{i.qtd > 1 ? `${i.reservados} de ${i.qtd} escolhidos` : i.reservados ? 'Já escolhido' : 'Disponível'}</span>
              {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow" className="small">Ver na loja ↗</a>}
              {sala.admin ? (
                i.quem.length > 0 && <small className="muted">Vão dar: {i.quem.join(', ')}</small>
              ) : i.minha ? (
                <button type="button" className="btn btn-ghost btn-sm" disabled={ocupado === i.id} onClick={() => acao('cancelar', i.id)}>✓ Vou dar · desistir</button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" disabled={esgotado || ocupado === i.id} onClick={() => acao('reservar', i.id)}>{esgotado ? 'Já escolhido' : ocupado === i.id ? '…' : 'Vou dar este'}</button>
              )}
            </div>
          )
        })}
      </div>
      <Compartilhar link={linkDa(id)} mensagem={`${ic} Lista de presentes: ${d.titulo}. Escolha o seu para não repetir!`} titulo="Mande para os convidados" dica="Cada um escolhe um presente e ele some para os outros. Ninguém precisa de cadastro." />
    </div>
  )
}

export default function ListaPresentes() {
  const [id, setId] = useState(null)
  useEffect(() => {
    const ler = () => setId(hashParam('l') || '')
    ler()
    window.addEventListener('hashchange', ler)
    return () => window.removeEventListener('hashchange', ler)
  }, [])
  if (!temApi()) return <Aviso tom="erro">Esta ferramenta precisa da variável NEXT_PUBLIC_IDEIAS_API.</Aviso>
  if (id === null) return <Carregando />
  if (!id) return <Criar onCriada={(n) => { window.location.hash = `l=${n}` }} />
  return <Lista key={id} id={id} onSair={() => { history.replaceState(null, '', window.location.pathname); setId('') }} />
}
