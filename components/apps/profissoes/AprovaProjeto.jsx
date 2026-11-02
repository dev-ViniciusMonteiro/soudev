'use client'

import { useEffect, useMemo, useState } from 'react'
import { linkCom, lerDoLink, limparHash } from '@/lib/compartilhar'
import { Cartao, Moldura, Selo, Vazio, dataBr, hojeIso, somaDias, uid, useDemo, useRecarregarComLink } from '../demos/kit'

const TIPOS = { logo: '🎨 Logo / identidade', planta: '📐 Planta / arquitetura', site: '🖥️ Site / app', peca: '🖼️ Peça gráfica' }
const STATUS = { aguardando: ['alerta', 'Aguardando o cliente'], alteracao: ['ruim', 'Pediu alterações'], aprovado: ['bom', 'Aprovado'] }

// Prévia de demonstração por tipo e versão (nenhum arquivo é guardado)
function Previa({ tipo, v, nome = '' }) {
  const h = (v * 67 + nome.length * 13) % 360
  const cor = `hsl(${h} 70% 45%)`
  if (tipo === 'logo')
    return (
      <svg className="pj-previa" viewBox="0 0 200 140" role="img" aria-label={`Versão ${v}`}>
        <rect width="200" height="140" fill="#f8fafc" />
        {v % 3 === 1 && <circle cx="100" cy="58" r="30" fill={cor} />}
        {v % 3 === 2 && <rect x="72" y="30" width="56" height="56" rx="14" fill={cor} transform="rotate(12 100 58)" />}
        {v % 3 === 0 && <path d="M100 26 L132 86 H68Z" fill={cor} />}
        <text x="100" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">{nome.slice(0, 2).toUpperCase()}</text>
        <text x="100" y="118" textAnchor="middle" fontSize="16" fontWeight={v % 2 ? 700 : 400} fill="#0f172a" fontFamily={v % 2 ? 'sans-serif' : 'serif'}>{nome}</text>
      </svg>
    )
  if (tipo === 'planta')
    return (
      <svg className="pj-previa" viewBox="0 0 200 140" role="img" aria-label={`Versão ${v}`}>
        <rect width="200" height="140" fill="#f8fafc" />
        <g fill="none" stroke="#0f172a" strokeWidth="2.5">
          <rect x="16" y="14" width="168" height="112" />
          <line x1={80 + v * 6} y1="14" x2={80 + v * 6} y2="126" />
          <line x1="16" y1={70 - v * 4} x2={80 + v * 6} y2={70 - v * 4} />
          <line x1={80 + v * 6} y1="78" x2="184" y2="78" />
        </g>
        <g fontSize="9" fill="#334155" textAnchor="middle">
          <text x={(16 + 80 + v * 6) / 2} y="44">Quarto</text>
          <text x={(16 + 80 + v * 6) / 2} y="104">Banho</text>
          <text x={(80 + v * 6 + 184) / 2} y="48">Sala / cozinha</text>
          <text x={(80 + v * 6 + 184) / 2} y="106">Varanda</text>
        </g>
        <rect x={130} y={18} width="24" height="10" fill={cor} opacity=".5" />
      </svg>
    )
  return (
    <svg className="pj-previa" viewBox="0 0 200 140" role="img" aria-label={`Versão ${v}`}>
      <rect width="200" height="140" fill="#f8fafc" />
      <rect x="0" y="0" width="200" height="18" fill={tipo === 'site' ? '#0f172a' : cor} />
      <rect x="14" y="30" width={v % 2 ? 110 : 172} height="46" rx="6" fill={cor} opacity=".85" />
      {v % 2 === 1 && <rect x="132" y="30" width="54" height="46" rx="6" fill="#cbd5e1" />}
      {[0, 1, 2].map((i) => <rect key={i} x={14 + i * 60} y="88" width="52" height="38" rx="5" fill="#e2e8f0" />)}
      <text x="22" y="58" fontSize="11" fontWeight="700" fill="#fff">{nome.slice(0, 18)}</text>
    </svg>
  )
}

function demo() {
  return {
    profissional: 'Marina Duarte Design',
    telefone: '11988887777',
    projetos: [
      {
        id: 'pj1', cliente: 'Padaria Pão Quente', nome: 'Pão Quente', tipo: 'logo', status: 'alteracao',
        versoes: [
          { n: 1, titulo: 'Círculo e serifa', nota: 'Versão clássica, remete a padaria de bairro.', data: somaDias(hojeIso(), -9) },
          { n: 2, titulo: 'Selo moderno', nota: 'Mais moderno, funciona bem em embalagem.', data: somaDias(hojeIso(), -5) },
          { n: 3, titulo: 'Triângulo (trigo)', nota: 'Forma lembra uma espiga. Ajustei a cor para laranja.', data: somaDias(hojeIso(), -1) },
        ],
        historico: [
          { id: 'h1', data: somaDias(hojeIso(), -7), autor: 'Cliente', tipo: 'comentario', versao: 1, texto: 'Gostei da letra, mas achei antiga demais.' },
          { id: 'h2', data: somaDias(hojeIso(), -4), autor: 'Cliente', tipo: 'alteracao', versao: 2, texto: 'Pode testar uma cor mais quente?' },
        ],
      },
      {
        id: 'pj2', cliente: 'Família Ribeiro', nome: 'Reforma Apto 52', tipo: 'planta', status: 'aguardando',
        versoes: [
          { n: 1, titulo: 'Cozinha integrada', nota: 'Parede da cozinha derrubada.', data: somaDias(hojeIso(), -6) },
          { n: 2, titulo: 'Quarto maior', nota: 'Quarto ganhou 60 cm, banheiro mantido.', data: somaDias(hojeIso(), -2) },
        ],
        historico: [],
      },
    ],
  }
}

function VisaoCliente({ p, onVoltar }) {
  const [v, setV] = useState(p.versoes[p.versoes.length - 1].n)
  const [comparar, setComparar] = useState(null)
  const [nome, setNome] = useState(p.cliente)
  const [acoes, setAcoes] = useState([])
  const [texto, setTexto] = useState('')
  const enviar = (lista) => {
    const volta = linkCom({ resp: { pid: p.id, autor: nome, acoes: lista } })
    const resumo = lista.map((a) => `${a.tipo === 'aprovado' ? '✅ Aprovado' : a.tipo === 'alteracao' ? '✏️ Alteração' : '💬'} (v${a.versao}): ${a.texto}`).join('\n')
    window.open(`https://wa.me/${p.telefone ? `55${p.telefone}` : ''}?text=${encodeURIComponent(`Olá! Sobre "${p.nome}":\n${resumo}\n\nAbrir no app: ${volta}`)}`, '_blank', 'noopener')
  }
  const add = (tipo) => {
    if (tipo !== 'aprovado' && !texto.trim()) return alert('Escreva o comentário.')
    const a = { id: uid(), data: hojeIso(), autor: nome, tipo, versao: v, texto: tipo === 'aprovado' ? texto.trim() || `Aprovo a versão ${v}.` : texto.trim() }
    const nova = [...acoes, a]
    setAcoes(nova)
    setTexto('')
    if (tipo === 'aprovado' && confirm(`Aprovar a versão ${v} e avisar ${p.profissional} agora?`)) enviar(nova)
  }
  const atual = p.versoes.find((x) => x.n === v)
  return (
    <>
      <div className="dm-titulo"><h2>{p.nome}</h2><Selo tom="cor">{TIPOS[p.tipo]}</Selo><p>Enviado por {p.profissional} · {p.versoes.length} versão(ões)</p></div>
      <div className="dm-chips">
        {p.versoes.map((x) => <button key={x.n} type="button" className="dm-chip" aria-pressed={x.n === v} onClick={() => setV(x.n)}>v{x.n} · {x.titulo}</button>)}
        {p.versoes.length > 1 && <button type="button" className="dm-chip" aria-pressed={!!comparar} onClick={() => setComparar(comparar ? null : p.versoes.find((x) => x.n !== v)?.n)}>⇆ Comparar</button>}
      </div>
      <div className={comparar ? 'dm-duas' : ''}>
        <Cartao titulo={`Versão ${v} · ${atual.titulo}`}>
          <Previa tipo={p.tipo} v={v} nome={p.nome} />
          <p style={{ margin: 0 }}>{atual.nota}</p>
          <small className="dm-mudo">{dataBr(atual.data)}</small>
        </Cartao>
        {comparar && (
          <Cartao titulo={`Versão ${comparar}`} acao={<select value={comparar} onChange={(e) => setComparar(Number(e.target.value))} style={{ width: 'auto' }}>{p.versoes.filter((x) => x.n !== v).map((x) => <option key={x.n} value={x.n}>v{x.n}</option>)}</select>}>
            <Previa tipo={p.tipo} v={comparar} nome={p.nome} />
            <p style={{ margin: 0 }}>{p.versoes.find((x) => x.n === comparar)?.nota}</p>
          </Cartao>
        )}
      </div>
      <Cartao titulo="O que você acha?">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
        <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`Comentário sobre a versão ${v}…`} />
        <div className="dm-filtros">
          <button type="button" className="dm-btn dm-btn-sec" onClick={() => add('comentario')}>💬 Comentar</button>
          <button type="button" className="dm-btn dm-btn-sec" onClick={() => add('alteracao')}>✏️ Pedir alteração</button>
          <button type="button" className="dm-btn" style={{ background: '#16a34a' }} onClick={() => add('aprovado')}>✅ Aprovar v{v}</button>
        </div>
        {acoes.length > 0 && (
          <>
            <ul className="pj-hist">{acoes.map((a) => <li key={a.id} data-tipo={a.tipo}><b>v{a.versao}</b> {a.texto}</li>)}</ul>
            <button type="button" className="dm-btn" style={{ background: '#16a34a' }} onClick={() => enviar(acoes)}>Enviar {acoes.length} retorno(s) pelo WhatsApp</button>
          </>
        )}
      </Cartao>
      {p.historico?.length > 0 && (
        <Cartao titulo="Conversa até aqui">
          <ul className="pj-hist">{p.historico.map((h) => <li key={h.id} data-tipo={h.tipo}><b>{dataBr(h.data)} · {h.autor} · v{h.versao}</b> {h.texto}</li>)}</ul>
        </Cartao>
      )}
      {onVoltar && <button type="button" className="dm-link" onClick={onVoltar}>← Voltar</button>}
    </>
  )
}

export default function AprovaProjeto() {
  useRecarregarComLink()
  const [dados, setDados, restaurar] = useDemo('pf-aprovaprojeto-v1', demo)
  const [secao, setSecao] = useState('projetos')
  const [aberto, setAberto] = useState('pj1')
  const [link, setLink] = useState('')
  const [aviso, setAviso] = useState('')
  const recebido = useMemo(() => (typeof window !== 'undefined' ? lerDoLink() : null), [])
  const [clienteP, setClienteP] = useState(null)
  useEffect(() => {
    if (recebido?.p) setClienteP(recebido.p)
  }, [recebido])
  useEffect(() => {
    if (!dados || !recebido?.resp) return
    const r = recebido.resp
    const proj = dados.projetos.find((x) => x.id === r.pid)
    if (proj) {
      const aprovado = r.acoes.find((a) => a.tipo === 'aprovado')
      setDados((d) => ({ ...d, projetos: d.projetos.map((x) => (x.id === r.pid ? { ...x, status: aprovado ? 'aprovado' : r.acoes.some((a) => a.tipo === 'alteracao') ? 'alteracao' : x.status, historico: [...x.historico, ...r.acoes.filter((a) => !x.historico.some((h) => h.id === a.id))] } : x)) }))
      setAberto(r.pid)
      setAviso(`✓ Retorno de ${r.autor} recebido (${r.acoes.length}).`)
    } else setAviso('Este retorno é de um projeto que não está neste aparelho.')
    limparHash()
  }, [dados ? 1 : 0]) // eslint-disable-line react-hooks/exhaustive-deps

  if (clienteP)
    return (
      <Moldura nome="Aprova Projeto" icone="✅" cor="#0f766e" demo={false} secoes={[['p', '🗂️', 'Projeto']]} secao="p" onSecao={() => {}} aviso={`Projeto enviado por ${clienteP.profissional}. Veja as versões, compare e aprove ou peça alterações.`}>
        <VisaoCliente p={clienteP} />
      </Moldura>
    )
  if (!dados) return null
  const p = dados.projetos.find((x) => x.id === aberto)
  const mudarP = (fn) => setDados((d) => ({ ...d, projetos: d.projetos.map((x) => (x.id === p.id ? fn(structuredClone(x)) : x)) }))

  return (
    <Moldura nome="Aprova Projeto" icone="✅" cor="#0f766e" demo={false} aviso="Os projetos ficam neste aparelho e vão para o cliente por link. Nesta versão as prévias são desenhos de demonstração: nenhum arquivo é enviado ou salvo." secao={secao} onSecao={setSecao} onRestaurar={restaurar} secoes={[['projetos', '🗂️', 'Projetos'], ['novo', '➕', 'Novo'], ['config', '⚙️', 'Perfil']]}>
      {aviso && <div className="dm-pro" style={{ background: '#f0fdf4', borderColor: '#86efac' }}><b>{aviso}</b></div>}
      {secao === 'projetos' && (
        <>
          <div className="dm-chips">
            {dados.projetos.map((x) => <button key={x.id} type="button" className="dm-chip" aria-pressed={x.id === aberto} onClick={() => { setAberto(x.id); setLink('') }}>{x.nome} {x.status === 'aprovado' ? '✓' : ''}</button>)}
          </div>
          {!p ? (
            <Vazio>Escolha ou crie um projeto.</Vazio>
          ) : (
            <>
              <div className="dm-titulo"><h2>{p.nome}</h2><Selo tom={STATUS[p.status][0]}>{STATUS[p.status][1]}</Selo><p>{p.cliente} · {TIPOS[p.tipo]}</p></div>
              <div className="dm-filtros">
                <button type="button" className="dm-btn" onClick={() => setLink(linkCom({ p: { ...p, profissional: dados.profissional, telefone: dados.telefone } }))}>🔗 Link para o cliente</button>
                <button
                  type="button"
                  className="dm-btn dm-btn-sec"
                  onClick={() => {
                    const titulo = prompt('Nome da nova versão:', `Ajustes da v${p.versoes.length}`)
                    if (!titulo) return
                    const nota = prompt('O que mudou?', '') || ''
                    mudarP((x) => { x.versoes.push({ n: x.versoes.length + 1, titulo, nota, data: hojeIso() }); x.status = 'aguardando'; return x })
                    setLink('')
                  }}
                >
                  ＋ Nova versão
                </button>
              </div>
              {link && (
                <div className="dm-pro" style={{ background: '#f0fdfa', borderColor: '#5eead4' }}>
                  <span style={{ color: '#134e4a' }}>O cliente vê todas as versões, compara e manda o retorno pelo WhatsApp. Toque no link que ele mandar para registrar aqui.</span>
                  <button type="button" className="dm-btn dm-btn-sec" onClick={() => navigator.clipboard?.writeText(link)}>Copiar link</button>
                  <a className="dm-btn" style={{ background: '#16a34a' }} href={`https://wa.me/?text=${encodeURIComponent(`Olá! A versão ${p.versoes.length} de "${p.nome}" está pronta para você ver: ${link}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  <a className="dm-btn dm-btn-sec" href={link} target="_blank" rel="noopener noreferrer">Ver como cliente</a>
                </div>
              )}
              <div className="pj-versoes">
                {[...p.versoes].reverse().map((v) => (
                  <Cartao key={v.n} titulo={`v${v.n} · ${v.titulo}`} acao={<small className="dm-mudo">{dataBr(v.data)}</small>}>
                    <Previa tipo={p.tipo} v={v.n} nome={p.nome} />
                    {v.nota && <p style={{ margin: 0 }}>{v.nota}</p>}
                    {p.historico.filter((h) => h.versao === v.n).map((h) => <span key={h.id} className="pj-hist-item" data-tipo={h.tipo}>{h.tipo === 'aprovado' ? '✅' : h.tipo === 'alteracao' ? '✏️' : '💬'} {h.autor}: {h.texto}</span>)}
                  </Cartao>
                ))}
              </div>
              <Cartao titulo="Histórico de alterações">
                {p.historico.length ? <ul className="pj-hist">{p.historico.map((h) => <li key={h.id} data-tipo={h.tipo}><b>{dataBr(h.data)} · {h.autor} · v{h.versao}</b> {h.texto}</li>)}</ul> : <Vazio>Sem retorno do cliente ainda.</Vazio>}
              </Cartao>
            </>
          )}
        </>
      )}
      {secao === 'novo' && (
        <Cartao titulo="Novo projeto">
          <form className="dm-form-grade" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); const id = uid(); setDados((d) => ({ ...d, projetos: [{ id, cliente: f.get('cliente'), nome: f.get('nome'), tipo: f.get('tipo'), status: 'aguardando', versoes: [{ n: 1, titulo: f.get('titulo') || 'Primeira proposta', nota: f.get('nota'), data: hojeIso() }], historico: [] }, ...d.projetos] })); setAberto(id); setSecao('projetos') }}>
            <label className="dm-campo"><span>Cliente</span><input name="cliente" required /></label>
            <label className="dm-campo"><span>Projeto</span><input name="nome" required placeholder="Ex.: Café Aroma" /></label>
            <label className="dm-campo"><span>Tipo</span><select name="tipo">{Object.entries(TIPOS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label className="dm-campo"><span>Nome da primeira versão</span><input name="titulo" placeholder="Primeira proposta" /></label>
            <label className="dm-campo dm-campo-largo"><span>Explicação para o cliente</span><input name="nota" /></label>
            <button type="submit" className="dm-btn">Criar projeto</button>
          </form>
        </Cartao>
      )}
      {secao === 'config' && (
        <Cartao titulo="Seu perfil">
          <label className="dm-campo"><span>Nome</span><input value={dados.profissional} onChange={(e) => setDados((d) => ({ ...d, profissional: e.target.value }))} /></label>
          <label className="dm-campo"><span>WhatsApp que recebe os retornos</span><input value={dados.telefone} onChange={(e) => setDados((d) => ({ ...d, telefone: e.target.value.replace(/\D/g, '') }))} /></label>
        </Cartao>
      )}
    </Moldura>
  )
}
