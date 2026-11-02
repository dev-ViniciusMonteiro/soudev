'use client'

import { useEffect, useMemo, useState } from 'react'
import { linkCom, lerDoLink, limparHash } from '@/lib/compartilhar'
import { Barra, Cartao, Kpi, Moldura, Selo, Vazio, dataBr, hojeIso, somaDias, uid, useDemo, useRecarregarComLink } from '../demos/kit'

const nomeArq = (n) => `IMG_${String(n).padStart(4, '0')}`
const CENAS = ['💍', '💐', '🥂', '👰', '🤵', '💃', '🎂', '🌅', '🕊️', '🎻', '👫', '✨']

// "Foto" de demonstração: cena gerada pelo número (nenhuma imagem é guardada)
function Foto({ n, className = '' }) {
  const h = (n * 47) % 360
  const vertical = n % 3 === 0
  return (
    <svg className={`af-foto ${className}`} viewBox={vertical ? '0 0 120 160' : '0 0 160 120'} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Foto ${nomeArq(n)}`}>
      <defs>
        <linearGradient id={`af${n}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${h} 45% 72%)`} />
          <stop offset="1" stopColor={`hsl(${(h + 40) % 360} 35% 32%)`} />
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill={`url(#af${n})`} />
      <circle cx={30 + (n % 5) * 18} cy={28 + (n % 3) * 6} r="12" fill="#fff8" />
      <path d={`M0 ${100 - (n % 4) * 6} Q40 ${80 - (n % 3) * 8} 80 ${96 - (n % 5) * 4} T160 ${88 + (n % 3) * 5} V160 H0Z`} fill={`hsl(${(h + 80) % 360} 30% 22% / .75)`} />
      <text x="50%" y="62%" textAnchor="middle" fontSize="34">{CENAS[n % CENAS.length]}</text>
    </svg>
  )
}

function demo() {
  return {
    fotografo: 'Studio Luz & Arte',
    telefone: '11988887777',
    galerias: [
      { id: 'g1', cliente: 'Ana & Pedro', evento: 'Casamento na Chácara', total: 48, limite: 20, prazo: somaDias(hojeIso(), 10), mensagem: 'Escolham até 20 fotos para o álbum. As outras vão em alta no pen drive.', escolhas: [2, 5, 8, 11, 14, 17, 21, 26, 30], comentarios: { 5: 'Clarear um pouco', 21: 'Tirar a pessoa do fundo' }, devolvido: somaDias(hojeIso(), -1) },
      { id: 'g2', cliente: 'Família Souza', evento: 'Ensaio de família no parque', total: 30, limite: 12, prazo: somaDias(hojeIso(), 6), mensagem: 'Escolham 12 para editar.', escolhas: [], comentarios: {}, devolvido: '' },
    ],
  }
}

function VisaoCliente({ g }) {
  const chave = `af-escolha-${g.id}`
  const [esc, setEsc] = useState([])
  const [com, setCom] = useState({})
  const [nome, setNome] = useState('')
  const [zoom, setZoom] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(chave) || 'null')
      if (s) {
        setEsc(s.esc || [])
        setCom(s.com || {})
        setNome(s.nome || '')
      }
    } catch {}
  }, [chave])
  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify({ esc, com, nome }))
    } catch {}
  }, [chave, esc, com, nome])
  const alternar = (n) => setEsc((l) => (l.includes(n) ? l.filter((x) => x !== n) : l.length >= g.limite ? (alert(`O limite é de ${g.limite} fotos. Tire alguma para escolher outra.`), l) : [...l, n].sort((a, b) => a - b)))
  const enviar = () => {
    const volta = linkCom({ resp: { gid: g.id, cliente: nome || g.cliente, escolhas: esc, comentarios: com, em: hojeIso() } })
    const txt = `Olá! Aqui é ${nome || g.cliente}. Escolhemos ${esc.length} foto(s) de "${g.evento}":\n${esc.map(nomeArq).join(', ')}${Object.keys(com).length ? `\n\nComentários:\n${Object.entries(com).filter(([, v]) => v).map(([k, v]) => `${nomeArq(k)}: ${v}`).join('\n')}` : ''}\n\nAbrir a escolha no app: ${volta}`
    window.open(`https://wa.me/${g.telefone ? `55${g.telefone}` : ''}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener')
  }
  const fotos = Array.from({ length: g.total }, (_, i) => i + 1).filter((n) => filtro === 'todas' || esc.includes(n))
  return (
    <>
      <div className="dm-titulo">
        <h2>{g.evento}</h2>
        <Selo tom="cor">{g.cliente}</Selo>
        <p>{g.mensagem} {g.prazo && `Escolha até ${dataBr(g.prazo)}.`}</p>
      </div>
      <div className="af-barra-fixa">
        <b>{esc.length} de {g.limite} escolhidas</b>
        <Barra valor={esc.length} max={g.limite} tom={esc.length === g.limite ? 'bom' : undefined} />
        <div className="dm-chips">
          <button type="button" className="dm-chip" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas ({g.total})</button>
          <button type="button" className="dm-chip" aria-pressed={filtro === 'minhas'} onClick={() => setFiltro('minhas')}>❤ Escolhidas ({esc.length})</button>
        </div>
      </div>
      <div className="af-grade">
        {fotos.map((n) => (
          <div key={n} className="af-item" data-sel={esc.includes(n) || undefined}>
            <button type="button" className="af-abrir" onClick={() => setZoom(n)} aria-label={`Ampliar ${nomeArq(n)}`}><Foto n={n} /></button>
            <button type="button" className="af-coracao" onClick={() => alternar(n)} aria-label={esc.includes(n) ? 'Tirar da escolha' : 'Escolher'}>{esc.includes(n) ? '❤' : '♡'}</button>
            <span className="af-nome">{nomeArq(n)}{com[n] ? ' 💬' : ''}</span>
          </div>
        ))}
      </div>
      {!fotos.length && <Vazio>Nenhuma foto escolhida ainda.</Vazio>}
      <Cartao titulo="Enviar a escolha">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
        <button type="button" className="dm-btn" style={{ background: '#16a34a' }} disabled={!esc.length} onClick={enviar}>Enviar para o fotógrafo pelo WhatsApp</button>
        <small className="dm-mudo">A sua escolha fica salva neste aparelho: dá para voltar e mudar até mandar.</small>
      </Cartao>
      {zoom && (
        <div className="dm-janela" onClick={() => setZoom(null)}>
          <div className="dm-janela-caixa af-zoom" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="dm-janela-topo"><h3>{nomeArq(zoom)}</h3><button type="button" className="dm-x" onClick={() => setZoom(null)} aria-label="Fechar">✕</button></div>
            <Foto n={zoom} className="af-foto-g" />
            <div className="dm-filtros">
              <button type="button" className="dm-btn dm-btn-sec" disabled={zoom <= 1} onClick={() => setZoom(zoom - 1)}>← Anterior</button>
              <button type="button" className="dm-btn" onClick={() => alternar(zoom)}>{esc.includes(zoom) ? '❤ Escolhida' : '♡ Escolher'}</button>
              <button type="button" className="dm-btn dm-btn-sec" disabled={zoom >= g.total} onClick={() => setZoom(zoom + 1)}>Próxima →</button>
            </div>
            <input value={com[zoom] || ''} onChange={(e) => setCom({ ...com, [zoom]: e.target.value })} placeholder="Comentário para a edição (ex.: clarear, tirar alguém do fundo)" />
          </div>
        </div>
      )}
    </>
  )
}

export default function AprovaFoto() {
  useRecarregarComLink()
  const [dados, setDados, restaurar] = useDemo('pf-aprovafoto-v1', demo)
  const [link, setLink] = useState(null)
  const [aberta, setAberta] = useState('g1')
  const [secao, setSecao] = useState('galerias')
  const [aviso, setAviso] = useState('')
  const recebido = useMemo(() => (typeof window !== 'undefined' ? lerDoLink() : null), [])
  const [clienteG, setClienteG] = useState(null)

  useEffect(() => {
    if (recebido?.g) setClienteG(recebido.g)
  }, [recebido])
  // o fotógrafo abriu o link de volta do cliente: junta a escolha na galeria
  useEffect(() => {
    if (!dados || !recebido?.resp) return
    const r = recebido.resp
    if (dados.galerias.some((g) => g.id === r.gid)) {
      setDados((d) => ({ ...d, galerias: d.galerias.map((g) => (g.id === r.gid ? { ...g, escolhas: r.escolhas, comentarios: r.comentarios, devolvido: r.em } : g)) }))
      setAberta(r.gid)
      setAviso(`✓ Escolha de ${r.cliente} recebida: ${r.escolhas.length} foto(s).`)
    } else setAviso('Esta escolha é de uma galeria que não está neste aparelho.')
    limparHash()
  }, [dados ? 1 : 0]) // eslint-disable-line react-hooks/exhaustive-deps

  if (clienteG)
    return (
      <Moldura nome="Aprova Foto" icone="📸" cor="#7c3aed" demo={false} secoes={[['g', '🖼️', 'Galeria']]} secao="g" onSecao={() => {}} aviso={`Galeria enviada por ${clienteG.fotografo}. Toque no ♡ para escolher e na foto para ampliar e comentar.`}>
        <VisaoCliente g={clienteG} />
      </Moldura>
    )
  if (!dados) return null
  const g = dados.galerias.find((x) => x.id === aberta) || dados.galerias[0]
  const mudarG = (parcial) => setDados((d) => ({ ...d, galerias: d.galerias.map((x) => (x.id === g.id ? { ...x, ...parcial } : x)) }))

  return (
    <Moldura nome="Aprova Foto" icone="📸" cor="#7c3aed" demo={false} aviso="As galerias ficam neste aparelho e vão para o cliente por link. Nesta versão as fotos são ilustrações de demonstração: nenhuma imagem é enviada ou salva." secao={secao} onSecao={setSecao} onRestaurar={restaurar} secoes={[['galerias', '🖼️', 'Galerias'], ['nova', '➕', 'Nova'], ['config', '⚙️', 'Estúdio']]}>
      {aviso && <div className="dm-pro" style={{ background: '#f0fdf4', borderColor: '#86efac' }}><b>{aviso}</b></div>}
      {secao === 'galerias' && g && (
        <>
          <div className="dm-chips">
            {dados.galerias.map((x) => <button key={x.id} type="button" className="dm-chip" aria-pressed={x.id === g.id} onClick={() => setAberta(x.id)}>{x.cliente}{x.devolvido ? ' ✓' : ''}</button>)}
          </div>
          <div className="dm-titulo"><h2>{g.evento}</h2><Selo tom={g.devolvido ? 'bom' : 'alerta'}>{g.devolvido ? `escolha recebida ${dataBr(g.devolvido)}` : 'aguardando o cliente'}</Selo><p>{g.cliente} · {g.total} fotos · limite {g.limite} · prazo {dataBr(g.prazo)}</p></div>
          <div className="dm-kpis">
            <Kpi rotulo="Escolhidas" valor={`${g.escolhas.length}/${g.limite}`} tom="cor" />
            <Kpi rotulo="Comentários" valor={Object.values(g.comentarios).filter(Boolean).length} />
            <Kpi rotulo="Prazo" valor={dataBr(g.prazo)} />
          </div>
          <div className="dm-filtros">
            <button type="button" className="dm-btn" onClick={() => setLink(linkCom({ g: { ...g, escolhas: undefined, comentarios: undefined, fotografo: dados.fotografo, telefone: dados.telefone } }))}>🔗 Link para o cliente</button>
            {g.escolhas.length > 0 && <button type="button" className="dm-btn dm-btn-sec" onClick={() => navigator.clipboard?.writeText(g.escolhas.map(nomeArq).join(', '))}>Copiar nomes ({g.escolhas.length})</button>}
            {g.escolhas.length > 0 && <button type="button" className="dm-btn dm-btn-sec" onClick={() => navigator.clipboard?.writeText(g.escolhas.map((n) => `${nomeArq(n)}.jpg`).join(' OR '))} title="Cole no filtro de texto do Lightroom">Copiar filtro do Lightroom</button>}
          </div>
          {link && (
            <div className="dm-pro" style={{ background: '#f5f3ff', borderColor: '#c4b5fd' }}>
              <span style={{ color: '#4c1d95' }}>O cliente abre, escolhe e manda de volta pelo WhatsApp. Ao tocar no link que ele mandar, a escolha aparece aqui.</span>
              <button type="button" className="dm-btn dm-btn-sec" onClick={() => navigator.clipboard?.writeText(link)}>Copiar link</button>
              <a className="dm-btn" style={{ background: '#16a34a' }} href={`https://wa.me/?text=${encodeURIComponent(`📸 Suas fotos de "${g.evento}" estão prontas! Escolha as suas favoritas aqui: ${link}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a className="dm-btn dm-btn-sec" href={link} target="_blank" rel="noopener noreferrer">Ver como cliente</a>
            </div>
          )}
          <Cartao titulo={g.escolhas.length ? 'Escolhidas pelo cliente' : 'Galeria'}>
            <div className="af-grade">
              {(g.escolhas.length ? g.escolhas : Array.from({ length: g.total }, (_, i) => i + 1)).map((n) => (
                <div key={n} className="af-item" data-sel={g.escolhas.includes(n) || undefined}>
                  <Foto n={n} />
                  <span className="af-nome">{nomeArq(n)}</span>
                  {g.comentarios[n] && <span className="af-com">💬 {g.comentarios[n]}</span>}
                </div>
              ))}
            </div>
          </Cartao>
          <button type="button" className="dm-link" onClick={() => { if (confirm('Apagar esta galeria?')) { setDados((d) => ({ ...d, galerias: d.galerias.filter((x) => x.id !== g.id) })); setAberta(null) } }}>Apagar galeria</button>
        </>
      )}
      {secao === 'galerias' && !g && <Vazio>Nenhuma galeria. Crie uma em “Nova”.</Vazio>}
      {secao === 'nova' && (
        <Cartao titulo="Nova galeria">
          <form className="dm-form-grade" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); const id = uid(); setDados((d) => ({ ...d, galerias: [{ id, cliente: f.get('cliente'), evento: f.get('evento'), total: Math.min(200, Math.max(1, Number(f.get('total')) || 24)), limite: Math.max(1, Number(f.get('limite')) || 10), prazo: f.get('prazo'), mensagem: f.get('mensagem'), escolhas: [], comentarios: {}, devolvido: '' }, ...d.galerias] })); setAberta(id); setSecao('galerias') }}>
            <label className="dm-campo"><span>Cliente</span><input name="cliente" required placeholder="Ex.: Ana & Pedro" /></label>
            <label className="dm-campo"><span>Trabalho</span><input name="evento" required placeholder="Ex.: Ensaio gestante" /></label>
            <label className="dm-campo"><span>Quantas fotos na galeria</span><input name="total" type="number" defaultValue={36} /></label>
            <label className="dm-campo"><span>Quantas o cliente pode escolher</span><input name="limite" type="number" defaultValue={15} /></label>
            <label className="dm-campo"><span>Prazo para escolher</span><input name="prazo" type="date" defaultValue={somaDias(hojeIso(), 7)} /></label>
            <label className="dm-campo dm-campo-largo"><span>Recado</span><input name="mensagem" defaultValue="Escolha as suas favoritas para a edição." /></label>
            <p className="dm-mudo dm-campo-largo" style={{ margin: 0, fontSize: '.8rem' }}>Nesta versão de demonstração a galeria usa fotos ilustrativas (IMG_0001, IMG_0002…), no lugar das suas fotos.</p>
            <button type="submit" className="dm-btn">Criar galeria</button>
          </form>
        </Cartao>
      )}
      {secao === 'config' && (
        <Cartao titulo="Seu estúdio">
          <label className="dm-campo"><span>Nome</span><input value={dados.fotografo} onChange={(e) => setDados((d) => ({ ...d, fotografo: e.target.value }))} /></label>
          <label className="dm-campo"><span>WhatsApp que recebe as escolhas</span><input value={dados.telefone} onChange={(e) => setDados((d) => ({ ...d, telefone: e.target.value.replace(/\D/g, '') }))} placeholder="11988887777" /></label>
        </Cartao>
      )}
    </Moldura>
  )
}
