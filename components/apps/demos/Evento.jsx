'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Cartao, Formulario, Janela, Kpi, Moldura, PlanoPro, Selo, Vazio, dataBr, diasAte, hojeIso, somaDias, uid, useDemo } from './kit'

const LIMITE = 50
const GRUPOS = ['Família da noiva', 'Família do noivo', 'Amigos', 'Trabalho', 'Padrinhos']
const TEMAS = {
  rose: { nome: 'Rosé', fundo: 'linear-gradient(160deg,#fff1f2,#fce7f3)', cor: '#be185d', fonte: 'Georgia, serif' },
  verde: { nome: 'Verde oliva', fundo: 'linear-gradient(160deg,#f7fee7,#ecfccb)', cor: '#3f6212', fonte: 'Georgia, serif' },
  noite: { nome: 'Noite', fundo: 'linear-gradient(160deg,#0f172a,#312e81)', cor: '#fbbf24', fonte: 'Georgia, serif', escuro: true },
  festa: { nome: 'Festa', fundo: 'linear-gradient(160deg,#fef3c7,#fde68a 40%,#fbcfe8)', cor: '#7c2d12', fonte: 'system-ui, sans-serif' },
}
const codigo = () => Math.random().toString(36).slice(2, 8).toUpperCase()

function demo() {
  const nomes = [
    ['Helena Duarte', 'Família da noiva', 1], ['Roberto Duarte', 'Família da noiva', 1], ['Clara Duarte', 'Família da noiva', 0], ['Tia Marta', 'Família da noiva', 1], ['Vó Lourdes', 'Família da noiva', 1],
    ['Sérgio Lima', 'Família do noivo', 1], ['Regina Lima', 'Família do noivo', 1], ['Lucas Lima', 'Família do noivo', 2], ['Tio Paulo', 'Família do noivo', 2], ['Prima Bia', 'Família do noivo', 1],
    ['Fernanda e Igor', 'Padrinhos', 0], ['Juliana Prado', 'Padrinhos', 1], ['Thiago Prado', 'Padrinhos', 1], ['Camila Rocha', 'Padrinhos', 1],
    ['André Souza', 'Amigos', 1], ['Bianca Nunes', 'Amigos', 1], ['Caio Ferraz', 'Amigos', 0], ['Daniela Alves', 'Amigos', 1], ['Eduardo Reis', 'Amigos', 1], ['Gabriela Melo', 'Amigos', 1],
    ['Henrique Costa', 'Amigos', 0], ['Isabela Moura', 'Amigos', 1], ['João Victor', 'Amigos', 0], ['Larissa Pinto', 'Amigos', 1], ['Mateus Araújo', 'Amigos', 1], ['Natália Gomes', 'Amigos', 0],
    ['Patrícia Ramos', 'Trabalho', 1], ['Rafael Teixeira', 'Trabalho', 0], ['Simone Dias', 'Trabalho', 1], ['Vinícius Lopes', 'Trabalho', 0], ['Yasmin Freitas', 'Trabalho', 1],
  ]
  const status = (i) => (i % 7 === 3 ? 'recusado' : i % 4 === 1 ? 'pendente' : 'confirmado')
  return {
    evento: { nome: 'Casamento Ana & Pedro', tipo: 'Casamento', data: somaDias(hojeIso(), 34), hora: '17:00', local: 'Chácara Recanto das Flores', endereco: 'Estrada Municipal, km 4 · Mogi Guaçu/SP', mensagem: 'Com muita alegria convidamos você para celebrar o nosso casamento! Confirme sua presença até 15 dias antes.', tema: 'rose', prazoRsvp: somaDias(hojeIso(), 19) },
    convidados: nomes.map(([nome, grupo, acomp], i) => {
      const st = status(i)
      return { id: uid(), nome, grupo, telefone: '', acompanhantes: acomp, status: st, vem: st === 'confirmado' ? Math.min(acomp, i % 3 === 0 ? acomp : Math.max(0, acomp - 1)) : 0, codigo: codigo(), checkin: null }
    }),
  }
}

function Qr({ texto, tamanho = 160 }) {
  const [img, setImg] = useState('')
  useEffect(() => {
    let vivo = true
    import('qrcode').then(({ default: QR }) => QR.toDataURL(texto, { width: tamanho * 2, margin: 1 }).then((u) => vivo && setImg(u)))
    return () => {
      vivo = false
    }
  }, [texto, tamanho])
  return img ? <img src={img} alt={`QR Code ${texto}`} width={tamanho} height={tamanho} /> : <span style={{ width: tamanho, height: tamanho, display: 'inline-block' }} />
}

function Convite({ evento, convidado, children }) {
  const t = TEMAS[evento.tema] || TEMAS.rose
  return (
    <div className="ev-convite" style={{ background: t.fundo, color: t.escuro ? '#f8fafc' : '#1f2937', fontFamily: t.fonte, '--ev-cor': t.cor }}>
      <span className="ev-convite-orn" aria-hidden="true">✦ ✦ ✦</span>
      {convidado && <p className="ev-convite-para">Querido(a) {convidado.nome.split(' ')[0]},</p>}
      <h3>{evento.nome}</h3>
      <p className="ev-convite-msg">{evento.mensagem}</p>
      <div className="ev-convite-info">
        <b>{new Date(`${evento.data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
        <span>às {evento.hora}</span>
        <span>{evento.local}</span>
        <small>{evento.endereco}</small>
      </div>
      {children}
    </div>
  )
}

function ComoConvidado({ dados, setDados, onFechar }) {
  const [id, setId] = useState(dados.convidados.find((c) => c.status === 'pendente')?.id || dados.convidados[0].id)
  const c = dados.convidados.find((x) => x.id === id)
  const [vem, setVem] = useState(c?.acompanhantes || 0)
  const [feito, setFeito] = useState(null)
  useEffect(() => {
    setVem(c?.acompanhantes || 0)
    setFeito(null)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const responder = (status) => {
    setDados((d) => ({ ...d, convidados: d.convidados.map((x) => (x.id === id ? { ...x, status, vem: status === 'confirmado' ? vem : 0 } : x)) }))
    setFeito(status)
  }
  return (
    <Janela titulo="Como o convidado vê" onFechar={onFechar} largura={460}>
      <label className="dm-campo" style={{ marginBottom: 10 }}>
        <span>Simular o link pessoal de</span>
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {dados.convidados.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </label>
      <Convite evento={dados.evento} convidado={c}>
        {feito === 'confirmado' ? (
          <div className="ev-rsvp">
            <b>🎉 Presença confirmada!</b>
            <span>{vem ? `Você + ${vem} acompanhante(s)` : 'Só você'}. Mostre este QR Code na entrada:</span>
            <div className="ev-qr"><Qr texto={`EVENTO-${c.codigo}`} tamanho={150} /></div>
            <small>Código {c.codigo}</small>
          </div>
        ) : feito === 'recusado' ? (
          <div className="ev-rsvp"><b>Que pena! 💌</b><span>Avisamos os noivos que você não poderá ir.</span></div>
        ) : (
          <div className="ev-rsvp">
            <b>Você vem?</b>
            {c.acompanhantes > 0 && (
              <label className="ev-acomp">
                Acompanhantes (até {c.acompanhantes})
                <span>
                  <button type="button" onClick={() => setVem((v) => Math.max(0, v - 1))} aria-label="Menos">−</button>
                  <b>{vem}</b>
                  <button type="button" onClick={() => setVem((v) => Math.min(c.acompanhantes, v + 1))} aria-label="Mais">+</button>
                </span>
              </label>
            )}
            <div className="ev-rsvp-bts">
              <button type="button" className="dm-btn" style={{ background: 'var(--ev-cor)' }} onClick={() => responder('confirmado')}>Vou sim!</button>
              <button type="button" className="dm-btn dm-btn-sec" onClick={() => responder('recusado')}>Não poderei ir</button>
            </div>
          </div>
        )}
      </Convite>
    </Janela>
  )
}

function Checkin({ dados, setDados }) {
  const [cod, setCod] = useState('')
  const [msg, setMsg] = useState(null)
  const [camera, setCamera] = useState(false)
  const video = useRef(null)
  const fazer = (texto) => {
    const k = String(texto).toUpperCase().replace(/^EVENTO-/, '').trim()
    const c = dados.convidados.find((x) => x.codigo === k)
    if (!c) return setMsg({ tom: 'ruim', t: `Código ${k} não encontrado.` })
    if (c.status !== 'confirmado') return setMsg({ tom: 'alerta', t: `${c.nome} não confirmou presença. Libere se estiver na lista.` })
    if (c.checkin) return setMsg({ tom: 'alerta', t: `${c.nome} já entrou às ${new Date(c.checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` })
    setDados((d) => ({ ...d, convidados: d.convidados.map((x) => (x.id === c.id ? { ...x, checkin: Date.now() } : x)) }))
    setMsg({ tom: 'bom', t: `✓ Bem-vindo(a), ${c.nome}! ${c.vem ? `+${c.vem} acompanhante(s)` : ''}` })
    setCod('')
  }
  useEffect(() => {
    if (!camera) return
    let stream
    let parar = false
    ;(async () => {
      try {
        if (!('BarcodeDetector' in window)) throw new Error('Este navegador não lê QR pela câmera. Digite o código.')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        video.current.srcObject = stream
        await video.current.play()
        const det = new window.BarcodeDetector({ formats: ['qr_code'] })
        const loop = async () => {
          if (parar) return
          try {
            const r = await det.detect(video.current)
            if (r[0]) {
              fazer(r[0].rawValue)
              setCamera(false)
              return
            }
          } catch {}
          setTimeout(loop, 300)
        }
        loop()
      } catch (e) {
        setMsg({ tom: 'alerta', t: e.message })
        setCamera(false)
      }
    })()
    return () => {
      parar = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [camera]) // eslint-disable-line react-hooks/exhaustive-deps
  const confirmados = dados.convidados.filter((c) => c.status === 'confirmado')
  const chegaram = confirmados.filter((c) => c.checkin)
  const pessoas = (l) => l.reduce((s, c) => s + 1 + (c.vem || 0), 0)
  return (
    <>
      <div className="dm-kpis">
        <Kpi rotulo="Chegaram" valor={`${pessoas(chegaram)} / ${pessoas(confirmados)}`} tom="cor" sub="pessoas (com acompanhantes)" />
        <Kpi rotulo="Convites lidos" valor={chegaram.length} sub={`de ${confirmados.length} confirmados`} />
      </div>
      <div className="dm-duas">
        <Cartao titulo="Leitor da portaria">
          {camera ? (
            <video ref={video} className="ev-video" muted playsInline />
          ) : (
            <button type="button" className="dm-btn" onClick={() => { setMsg(null); setCamera(true) }}>📷 Ler QR Code com a câmera</button>
          )}
          <form onSubmit={(e) => { e.preventDefault(); fazer(cod) }} style={{ display: 'flex', gap: 8 }}>
            <input value={cod} onChange={(e) => setCod(e.target.value)} placeholder="Ou digite o código (ex.: A1B2C3)" aria-label="Código do convite" />
            <button type="submit" className="dm-btn dm-btn-sec">Entrar</button>
          </form>
          {msg && <div className="dm-pro" style={{ background: msg.tom === 'bom' ? '#f0fdf4' : msg.tom === 'ruim' ? '#fef2f2' : '#fffbeb', borderColor: 'transparent' }}><b>{msg.t}</b></div>}
          <p className="dm-mudo" style={{ margin: 0, fontSize: '.8rem' }}>Para testar: abra “Convidados”, toque num confirmado e use o código ou o QR dele.</p>
        </Cartao>
        <Cartao titulo="Quem já chegou">
          <ul className="dm-lista">
            {[...chegaram].sort((a, b) => b.checkin - a.checkin).map((c) => (
              <li key={c.id} className="dm-item" style={{ cursor: 'default' }}>
                <span className="dm-item-ic">✅</span>
                <span className="dm-item-txt"><b>{c.nome}</b><small>{new Date(c.checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {c.vem ? `+${c.vem}` : 'sozinho(a)'}</small></span>
              </li>
            ))}
          </ul>
          {!chegaram.length && <Vazio>Ninguém chegou ainda.</Vazio>}
        </Cartao>
      </div>
    </>
  )
}

export default function Evento() {
  const [dados, setDados, restaurar] = useDemo('demo-evento-v1', demo)
  const [secao, setSecao] = useState('painel')
  const [verConvidado, setVerConvidado] = useState(false)
  const [editar, setEditar] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [importar, setImportar] = useState(false)
  const [lote, setLote] = useState('')

  const calc = useMemo(() => {
    if (!dados) return null
    const l = dados.convidados
    const conf = l.filter((c) => c.status === 'confirmado')
    return {
      conf,
      pend: l.filter((c) => c.status === 'pendente'),
      rec: l.filter((c) => c.status === 'recusado'),
      pessoas: conf.reduce((s, c) => s + 1 + (c.vem || 0), 0),
      maxPessoas: l.reduce((s, c) => s + 1 + (c.acompanhantes || 0), 0),
      porGrupo: GRUPOS.map((g) => ({ g, n: l.filter((c) => c.grupo === g).length, conf: conf.filter((c) => c.grupo === g).length })),
    }
  }, [dados])

  if (!dados) return null
  const ev = dados.evento
  const cheio = dados.convidados.length >= LIMITE
  const linkPessoal = (c) => `${window.location.origin}/apps/evento-facil?convite=${c.codigo}`
  const zap = (c) => `https://wa.me/?text=${encodeURIComponent(`Oi, ${c.nome.split(' ')[0]}! 💌 Você está convidado(a) para o ${ev.nome}, dia ${dataBr(ev.data)} às ${ev.hora}. Confirme sua presença aqui: ${linkPessoal(c)}`)}`
  const lista = dados.convidados.filter((c) => (!filtro || c.status === filtro) && (!busca || c.nome.toLowerCase().includes(busca.toLowerCase())))
  const ST = { confirmado: ['bom', 'Confirmado'], pendente: ['alerta', 'Aguardando'], recusado: ['ruim', 'Não vai'] }

  return (
    <Moldura
      nome="Evento Fácil"
      icone="💌"
      cor="#db2777"
      secao={secao}
      onSecao={setSecao}
      onRestaurar={restaurar}
      secoes={[['painel', '📊', 'Painel'], ['convite', '💌', 'Convite'], ['convidados', '👥', 'Convidados'], ['checkin', '🎟️', 'Check-in']]}
    >
      <div className="dm-titulo">
        <h2>{ev.nome}</h2>
        <Selo tom="cor">faltam {diasAte(ev.data)} dias</Selo>
        <p>{dataBr(ev.data)} às {ev.hora} · {ev.local}</p>
      </div>

      {secao === 'painel' && (
        <>
          <div className="dm-kpis">
            <Kpi rotulo="Pessoas confirmadas" valor={calc.pessoas} tom="cor" sub={`de até ${calc.maxPessoas} com acompanhantes`} />
            <Kpi rotulo="Confirmaram" valor={calc.conf.length} tom="bom" />
            <Kpi rotulo="Aguardando resposta" valor={calc.pend.length} tom={calc.pend.length ? 'alerta' : 'bom'} sub={`prazo ${dataBr(ev.prazoRsvp)}`} />
            <Kpi rotulo="Não vão" valor={calc.rec.length} />
            <Kpi rotulo="Convites" valor={`${dados.convidados.length}/${LIMITE}`} sub="plano grátis" />
          </div>
          <div className="dm-duas">
            <Cartao titulo="Respostas por grupo">
              {calc.porGrupo.filter((g) => g.n).map((g) => (
                <div key={g.g} className="ev-grupo">
                  <span>{g.g}</span>
                  <div className="ev-grupo-barra"><span style={{ width: `${(g.conf / g.n) * 100}%` }} /></div>
                  <small>{g.conf}/{g.n}</small>
                </div>
              ))}
            </Cartao>
            <Cartao titulo="Ainda não responderam" acao={<button type="button" className="dm-btn dm-btn-sec dm-btn-p" onClick={() => setVerConvidado(true)}>Ver como convidado</button>}>
              <ul className="dm-lista">
                {calc.pend.slice(0, 6).map((c) => (
                  <li key={c.id} className="dm-item" style={{ cursor: 'default' }}>
                    <span className="dm-item-txt"><b>{c.nome}</b><small>{c.grupo}</small></span>
                    <a className="dm-btn dm-btn-sec dm-btn-p" href={zap(c)} target="_blank" rel="noopener noreferrer">Lembrar no WhatsApp</a>
                  </li>
                ))}
              </ul>
            </Cartao>
          </div>
        </>
      )}

      {secao === 'convite' && (
        <div className="dm-duas">
          <Convite evento={ev}>
            <div className="ev-rsvp"><button type="button" className="dm-btn" style={{ background: 'var(--ev-cor)' }} onClick={() => setVerConvidado(true)}>Confirmar presença</button></div>
          </Convite>
          <Cartao titulo="Personalizar">
            <div className="dm-chips">
              {Object.entries(TEMAS).map(([k, t]) => (
                <button key={k} type="button" className="dm-chip" aria-pressed={ev.tema === k} onClick={() => setDados((d) => ({ ...d, evento: { ...d.evento, tema: k } }))}>{t.nome}</button>
              ))}
            </div>
            <Formulario
              key={ev.tema}
              campos={[
                { k: 'nome', rotulo: 'Nome do evento', largo: true },
                { k: 'data', rotulo: 'Data', tipo: 'data' },
                { k: 'hora', rotulo: 'Horário' },
                { k: 'local', rotulo: 'Local', largo: true },
                { k: 'endereco', rotulo: 'Endereço', largo: true },
                { k: 'prazoRsvp', rotulo: 'Confirmar até', tipo: 'data' },
                { k: 'mensagem', rotulo: 'Mensagem', tipo: 'texto-longo', largo: true },
              ]}
              inicial={ev}
              rotuloSalvar="Atualizar convite"
              onSalvar={(v) => setDados((d) => ({ ...d, evento: { ...d.evento, ...v } }))}
            />
            <PlanoPro texto="No Pro: modelos exclusivos, sua foto no convite, domínio próprio e mais de 50 convidados." />
          </Cartao>
        </div>
      )}

      {secao === 'convidados' && (
        <Cartao
          titulo={`Lista de convidados (${dados.convidados.length})`}
          acao={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="dm-btn dm-btn-sec" disabled={cheio} onClick={() => setImportar(true)}>Colar lista</button>
              <button type="button" className="dm-btn" disabled={cheio} onClick={() => setEditar({ nome: '', grupo: 'Amigos', telefone: '', acompanhantes: 0, status: 'pendente', vem: 0, codigo: codigo(), checkin: null })}>＋ Convidado</button>
            </div>
          }
        >
          {cheio && <PlanoPro texto={`O plano grátis vai até ${LIMITE} convidados. No Pro: eventos grandes, sem limite.`} />}
          <div className="dm-filtros">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar convidado…" aria-label="Buscar" />
            <div className="dm-chips">
              {[['', 'Todos'], ['confirmado', 'Confirmados'], ['pendente', 'Aguardando'], ['recusado', 'Não vão']].map(([k, n]) => (
                <button key={k} type="button" className="dm-chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="dm-tabela-wrap">
            <table className="dm-tabela">
              <thead><tr><th>Nome</th><th>Grupo</th><th>Acompanhantes</th><th>Resposta</th><th>Código</th><th /></tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} onClick={() => setEditar(c)}>
                    <td><b>{c.nome}</b>{c.checkin && ' ✅'}</td>
                    <td>{c.grupo}</td>
                    <td>{c.status === 'confirmado' ? `${c.vem} de ${c.acompanhantes}` : `até ${c.acompanhantes}`}</td>
                    <td><Selo tom={ST[c.status][0]}>{ST[c.status][1]}</Selo></td>
                    <td><code>{c.codigo}</code></td>
                    <td onClick={(e) => e.stopPropagation()}><a className="dm-btn dm-btn-sec dm-btn-p" href={zap(c)} target="_blank" rel="noopener noreferrer">Enviar</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}

      {secao === 'checkin' && <Checkin dados={dados} setDados={setDados} />}

      {verConvidado && <ComoConvidado dados={dados} setDados={setDados} onFechar={() => setVerConvidado(false)} />}
      {editar && (
        <Janela titulo={editar.id ? editar.nome : 'Novo convidado'} onFechar={() => setEditar(null)}>
          {editar.id && editar.status === 'confirmado' && (
            <div className="ev-qr-linha">
              <Qr texto={`EVENTO-${editar.codigo}`} tamanho={110} />
              <span>QR Code de entrada de <b>{editar.nome}</b>. Código <code>{editar.codigo}</code>.</span>
            </div>
          )}
          <Formulario
            campos={[
              { k: 'nome', rotulo: 'Nome', obrigatorio: true, largo: true },
              { k: 'grupo', rotulo: 'Grupo', tipo: 'select', opcoes: GRUPOS },
              { k: 'telefone', rotulo: 'WhatsApp' },
              { k: 'acompanhantes', rotulo: 'Acompanhantes permitidos', tipo: 'numero' },
              { k: 'status', rotulo: 'Resposta', tipo: 'select', opcoes: [['pendente', 'Aguardando'], ['confirmado', 'Confirmado'], ['recusado', 'Não vai']] },
              { k: 'vem', rotulo: 'Acompanhantes confirmados', tipo: 'numero' },
            ]}
            inicial={editar}
            onSalvar={(v) => {
              const c = { ...v, acompanhantes: Number(v.acompanhantes) || 0, vem: Math.min(Number(v.vem) || 0, Number(v.acompanhantes) || 0) }
              setDados((d) => ({ ...d, convidados: c.id ? d.convidados.map((x) => (x.id === c.id ? c : x)) : [...d.convidados, { ...c, id: uid() }] }))
              setEditar(null)
            }}
            onApagar={editar.id ? () => { setDados((d) => ({ ...d, convidados: d.convidados.filter((x) => x.id !== editar.id) })); setEditar(null) } : null}
          />
        </Janela>
      )}
      {importar && (
        <Janela titulo="Colar lista de convidados" onFechar={() => setImportar(false)}>
          <p className="dm-mudo" style={{ marginTop: 0 }}>Um nome por linha. Para permitir acompanhantes, coloque “+2” no fim (ex.: “Maria Silva +1”).</p>
          <textarea rows={8} value={lote} onChange={(e) => setLote(e.target.value)} placeholder={'Maria Silva +1\nJoão Souza\nFamília Oliveira +3'} />
          <div className="dm-form-pe">
            <span className="dm-mudo">{Math.min(lote.split('\n').filter((l) => l.trim()).length, LIMITE - dados.convidados.length)} serão adicionados</span>
            <span className="dm-espaco" />
            <button
              type="button"
              className="dm-btn"
              onClick={() => {
                const novos = lote.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, LIMITE - dados.convidados.length).map((l) => {
                  const m = /\+(\d+)\s*$/.exec(l)
                  return { id: uid(), nome: l.replace(/\+\d+\s*$/, '').trim(), grupo: 'Amigos', telefone: '', acompanhantes: m ? Number(m[1]) : 0, status: 'pendente', vem: 0, codigo: codigo(), checkin: null }
                })
                setDados((d) => ({ ...d, convidados: [...d.convidados, ...novos] }))
                setLote('')
                setImportar(false)
              }}
            >
              Adicionar
            </button>
          </div>
        </Janela>
      )}
    </Moldura>
  )
}
