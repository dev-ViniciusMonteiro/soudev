'use client'

import { useEffect, useRef, useState } from 'react'
import { Cartao, Formulario, FotoDemo, Janela, Kpi, Moldura, Selo, Vazio, dataBr, hojeIso, reais, somaDias, uid, useDemo } from './kit'

const CATEGORIAS = { Documentos: '🪪', Chaves: '🔑', Celulares: '📱', Carteiras: '👛', Bolsas: '🎒', Animais: '🐶', Óculos: '👓', Joias: '💍', Eletrônicos: '🎧', Roupas: '🧥', Outros: '📦' }
const BAIRROS = ['Centro', 'Jardim Europa', 'Vila Nova', 'Parque das Flores', 'Zona Norte', 'Rodoviária', 'Shopping']

function demo() {
  const h = hojeIso()
  const a = (tipo, titulo, categoria, bairro, dias, descricao, secreta, autor, extra = {}) => ({ id: uid(), tipo, titulo, categoria, bairro, cidade: 'Mogi Guaçu/SP', data: somaDias(h, -dias), descricao, secreta, autor, status: 'Aberto', semente: titulo.length, ...extra })
  return {
    anuncios: [
      a('achado', 'Chaveiro com 3 chaves e controle de portão', 'Chaves', 'Centro', 1, 'Achei na calçada da Rua XV, perto da padaria.', 'Qual o chaveiro preso nas chaves?', 'Marina S.'),
      a('perdido', 'Cachorro caramelo, porte médio, coleira azul', 'Animais', 'Jardim Europa', 2, 'Fugiu no sábado à tarde. Atende por "Pipoca". Muito dócil.', 'Tem uma mancha branca numa das patas (qual?).', 'Família Rocha', { recompensa: 200 }),
      a('achado', 'Carteira marrom com documentos', 'Carteiras', 'Rodoviária', 3, 'Estava no banco da plataforma 4. Ainda não levei à polícia: estou esperando o dono aparecer.', 'Diga o nome no RG e o que mais tinha dentro.', 'Carlos P.'),
      a('perdido', 'Óculos de grau armação preta', 'Óculos', 'Shopping', 4, 'Esqueci no cinema, sessão das 19h.', 'Estojo vermelho com uma marca escrita.', 'Bruna L.'),
      a('achado', 'Celular com capinha transparente', 'Celulares', 'Parque das Flores', 0, 'Encontrado no banco perto do lago. Está bloqueado.', 'Qual o papel de parede da tela de bloqueio?', 'Seu Jorge'),
      a('perdido', 'Mochila preta com notebook', 'Bolsas', 'Vila Nova', 6, 'Esqueci no ônibus da linha 12, por volta das 7h40.', 'Tem um adesivo na tampa do notebook (qual?).', 'Diego M.', { recompensa: 300 }),
      a('achado', 'Aliança dourada', 'Joias', 'Centro', 9, 'Achei no estacionamento do mercado.', 'O que está gravado por dentro?', 'Ana Paula', { status: 'Devolvido' }),
      a('achado', 'RG e cartão do SUS', 'Documentos', 'Zona Norte', 5, 'Estavam num envelope perto do posto de saúde.', 'Nome completo e data de nascimento.', 'Unidade Básica Norte'),
    ],
    conversas: {},
  }
}

const RESPOSTAS = [
  'Oi! Obrigado por responder. A característica confere 👍 Podemos combinar a entrega num lugar público, tipo a praça ou a delegacia?',
  'Recebi sua mensagem. Pode me dizer mais um detalhe para eu ter certeza que é seu?',
  'Que bom! Posso entregar amanhã às 18h na frente da prefeitura. Fica bom?',
]

export default function AcheiPerdi() {
  const [dados, setDados, restaurar] = useDemo('demo-achei-v1', demo)
  const [secao, setSecao] = useState('mural')
  const [tipo, setTipo] = useState('')
  const [cat, setCat] = useState('')
  const [bairro, setBairro] = useState('')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(null)
  const [publicar, setPublicar] = useState(null)
  const [chat, setChat] = useState(null)

  if (!dados) return null
  const lista = dados.anuncios
    .filter((a) => (!tipo || a.tipo === tipo) && (!cat || a.categoria === cat) && (!bairro || a.bairro === bairro))
    .filter((a) => !busca || `${a.titulo} ${a.descricao}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.status === 'Devolvido') - (b.status === 'Devolvido') || b.data.localeCompare(a.data))
  const meus = dados.anuncios.filter((a) => a.meu)
  const conversas = Object.entries(dados.conversas)

  return (
    <Moldura
      nome="Achei / Perdi"
      icone="🔎"
      cor="#059669"
      secao={secao}
      onSecao={setSecao}
      onRestaurar={restaurar}
      secoes={[['mural', '🗺️', 'Mural'], ['publicar', '➕', 'Publicar'], ['mensagens', '💬', 'Mensagens'], ['meus', '📌', 'Meus'], ['parceiros', '🏫', 'Parceiros']]}
    >
      {secao === 'mural' && (
        <>
          <div className="dm-kpis">
            <Kpi rotulo="Achados esperando dono" valor={dados.anuncios.filter((a) => a.tipo === 'achado' && a.status === 'Aberto').length} tom="cor" />
            <Kpi rotulo="Perdidos procurados" valor={dados.anuncios.filter((a) => a.tipo === 'perdido' && a.status === 'Aberto').length} />
            <Kpi rotulo="Já devolvidos" valor={dados.anuncios.filter((a) => a.status === 'Devolvido').length} tom="bom" />
          </div>
          <Cartao>
            <div className="dm-filtros">
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="O que você perdeu ou achou?" aria-label="Buscar" />
              <select value={bairro} onChange={(e) => setBairro(e.target.value)} aria-label="Região">
                <option value="">Toda a cidade</option>
                {BAIRROS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="dm-chips">
              {[['', 'Tudo'], ['achado', '🙌 Achados'], ['perdido', '😟 Perdidos']].map(([k, n]) => (
                <button key={k} type="button" className="dm-chip" aria-pressed={tipo === k} onClick={() => setTipo(k)}>{n}</button>
              ))}
              <span style={{ width: 8 }} />
              {Object.entries(CATEGORIAS).map(([c, ic]) => (
                <button key={c} type="button" className="dm-chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{ic} {c}</button>
              ))}
            </div>
          </Cartao>
          <div className="ap-grade">
            {lista.map((a) => (
              <button key={a.id} type="button" className="ap-card" onClick={() => setAberto(a)} data-devolvido={a.status === 'Devolvido' || undefined}>
                <FotoDemo tema="achado" semente={a.semente} emoji={CATEGORIAS[a.categoria]} rotulo={`${CATEGORIAS[a.categoria]} ${a.categoria}`} />
                <div className="ap-card-txt">
                  <Selo tom={a.status === 'Devolvido' ? 'bom' : a.tipo === 'achado' ? 'cor' : 'alerta'}>{a.status === 'Devolvido' ? '✓ Devolvido' : a.tipo === 'achado' ? 'Achado' : 'Perdido'}</Selo>
                  <b>{a.titulo}</b>
                  <small>📍 {a.bairro} · {a.data === hojeIso() ? 'hoje' : dataBr(a.data)}</small>
                  {a.recompensa ? <small className="ap-recompensa">Recompensa {reais(a.recompensa)}</small> : null}
                </div>
              </button>
            ))}
          </div>
          {!lista.length && <Vazio>Nenhum anúncio com esses filtros. Publique o seu: quanto mais gente, mais devoluções.</Vazio>}
        </>
      )}

      {secao === 'publicar' && (
        <Cartao titulo="Publicar um anúncio">
          <div className="dm-chips">
            <button type="button" className="dm-chip" aria-pressed={publicar?.tipo !== 'perdido'} onClick={() => setPublicar((p) => ({ ...(p || {}), tipo: 'achado' }))}>🙌 Achei algo</button>
            <button type="button" className="dm-chip" aria-pressed={publicar?.tipo === 'perdido'} onClick={() => setPublicar((p) => ({ ...(p || {}), tipo: 'perdido' }))}>😟 Perdi algo</button>
          </div>
          <Formulario
            key={publicar?.tipo || 'achado'}
            campos={[
              { k: 'titulo', rotulo: 'O que é', obrigatorio: true, largo: true, ph: 'Ex.: Chave de carro com chaveiro do Corinthians' },
              { k: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: Object.keys(CATEGORIAS) },
              { k: 'bairro', rotulo: 'Onde', tipo: 'select', opcoes: BAIRROS },
              { k: 'descricao', rotulo: 'Descrição pública', tipo: 'texto-longo', largo: true, ph: 'Onde e quando. Não conte tudo: guarde um detalhe para conferir o dono.' },
              {
                k: 'secreta',
                rotulo: publicar?.tipo === 'perdido' ? 'Detalhe que só você sabe (fica escondido)' : 'Pergunta para conferir o dono',
                largo: true,
                dica: 'Não aparece no anúncio. Serve para ter certeza de que está falando com o dono de verdade.',
                ph: publicar?.tipo === 'perdido' ? 'Ex.: tem um arranhão no canto da tela' : 'Ex.: qual a cor da capinha?',
              },
            ]}
            inicial={{ titulo: '', categoria: 'Chaves', bairro: 'Centro', descricao: '', secreta: '' }}
            rotuloSalvar="Publicar"
            onSalvar={(v) => {
              const novo = { ...v, id: uid(), tipo: publicar?.tipo || 'achado', cidade: 'Mogi Guaçu/SP', data: hojeIso(), autor: 'Você', status: 'Aberto', semente: v.titulo.length, meu: true }
              setDados((d) => ({ ...d, anuncios: [novo, ...d.anuncios] }))
              setSecao('meus')
            }}
          />
          <p className="dm-mudo" style={{ margin: 0, fontSize: '.8rem' }}>Na demo não dá para enviar fotos do objeto (e nem sempre é bom: uma foto detalhada ajuda golpistas a "provar" que são donos).</p>
        </Cartao>
      )}

      {secao === 'mensagens' && (
        <Cartao titulo="Conversas protegidas">
          <p className="dm-mudo" style={{ margin: 0 }}>Ninguém vê o seu telefone ou e-mail. Vocês conversam por aqui até combinar a entrega.</p>
          <ul className="dm-lista">
            {conversas.map(([id, msgs]) => {
              const a = dados.anuncios.find((x) => x.id === id)
              if (!a) return null
              return (
                <li key={id}>
                  <button type="button" className="dm-item" onClick={() => setChat(a)}>
                    <span className="dm-item-ic">{CATEGORIAS[a.categoria]}</span>
                    <span className="dm-item-txt"><b>{a.titulo}</b><small>{msgs[msgs.length - 1]?.texto}</small></span>
                  </button>
                </li>
              )
            })}
          </ul>
          {!conversas.length && <Vazio>Nenhuma conversa ainda. Abra um anúncio no mural e toque em “É meu!” ou “Eu vi”.</Vazio>}
        </Cartao>
      )}

      {secao === 'meus' && (
        <Cartao titulo="Meus anúncios">
          <ul className="dm-lista">
            {meus.map((a) => (
              <li key={a.id} className="dm-item" style={{ cursor: 'default' }}>
                <span className="dm-item-ic">{CATEGORIAS[a.categoria]}</span>
                <span className="dm-item-txt"><b>{a.titulo}</b><small>{a.tipo === 'achado' ? 'Achado' : 'Perdido'} · {a.bairro} · {dataBr(a.data)}</small></span>
                {a.status === 'Devolvido' ? (
                  <Selo tom="bom">Devolvido</Selo>
                ) : (
                  <button type="button" className="dm-btn dm-btn-sec dm-btn-p" onClick={() => setDados((d) => ({ ...d, anuncios: d.anuncios.map((x) => (x.id === a.id ? { ...x, status: 'Devolvido' } : x)) }))}>Marcar devolvido</button>
                )}
              </li>
            ))}
          </ul>
          {!meus.length && <Vazio>Você ainda não publicou nada.</Vazio>}
        </Cartao>
      )}

      {secao === 'parceiros' && (
        <Cartao titulo="Achados e perdidos de lugares parceiros">
          <p className="dm-mudo" style={{ margin: 0 }}>Condomínios, escolas, academias e lojas ganham uma página própria: o porteiro cadastra o que acha e os moradores buscam pelo celular.</p>
          <div className="dm-galeria">
            {[['🏢', 'Residencial Jacarandá', '12 itens'], ['🏫', 'Escola Estadual Central', '31 itens'], ['🏋️', 'Academia Força Total', '7 itens'], ['🛍️', 'Shopping Guaçu', '44 itens']].map(([ic, n, q]) => (
              <div key={n} className="dm-cartao">
                <span style={{ fontSize: '2rem' }}>{ic}</span>
                <b>{n}</b>
                <small className="dm-mudo">{q} esperando dono</small>
              </div>
            ))}
          </div>
          <div className="dm-pro"><b>🤝 Seja parceiro</b><span>Página com a sua marca, QR Code na portaria e relatório de devoluções. (Modelo de receita do produto.)</span></div>
        </Cartao>
      )}

      {aberto && (
        <Janela titulo={aberto.titulo} onFechar={() => setAberto(null)} largura={560}>
          <div style={{ display: 'grid', gap: 10 }}>
            <FotoDemo tema="achado" semente={aberto.semente} emoji={CATEGORIAS[aberto.categoria]} rotulo={`${CATEGORIAS[aberto.categoria]} ${aberto.categoria}`} />
            <div className="dm-chips">
              <Selo tom={aberto.tipo === 'achado' ? 'cor' : 'alerta'}>{aberto.tipo === 'achado' ? 'Achado' : 'Perdido'}</Selo>
              <Selo>📍 {aberto.bairro}, {aberto.cidade}</Selo>
              <Selo>{dataBr(aberto.data)}</Selo>
              {aberto.recompensa ? <Selo tom="bom">Recompensa {reais(aberto.recompensa)}</Selo> : null}
            </div>
            <p style={{ margin: 0 }}>{aberto.descricao}</p>
            <small className="dm-mudo">Publicado por {aberto.autor}. O contato é feito por mensagem protegida.</small>
            {aberto.status === 'Devolvido' ? (
              <Selo tom="bom">✓ Este item já voltou para o dono</Selo>
            ) : (
              <button type="button" className="dm-btn" onClick={() => { setChat(aberto); setAberto(null) }}>
                {aberto.tipo === 'achado' ? '🙋 É meu!' : '👀 Eu vi / encontrei'}
              </button>
            )}
          </div>
        </Janela>
      )}
      {chat && <Chat anuncio={chat} msgs={dados.conversas[chat.id] || []} onFechar={() => setChat(null)} onMsgs={(m) => setDados((d) => ({ ...d, conversas: { ...d.conversas, [chat.id]: m } }))} />}
    </Moldura>
  )
}

function Chat({ anuncio, msgs, onMsgs, onFechar }) {
  const [texto, setTexto] = useState('')
  const [digitando, setDigitando] = useState(false)
  const fim = useRef(null)
  const lista = msgs.length
    ? msgs
    : [{ de: 'sistema', texto: anuncio.tipo === 'achado' ? `Para provar que é seu, responda: “${anuncio.secreta}”` : `Conte onde e quando viu. A família vai conferir pelo detalhe: “${anuncio.secreta}”` }]
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' })
  }, [lista.length, digitando])
  const enviar = (e) => {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    const nova = [...lista, { de: 'eu', texto: t, hora: Date.now() }]
    onMsgs(nova)
    setTexto('')
    setDigitando(true)
    setTimeout(() => {
      setDigitando(false)
      onMsgs([...nova, { de: 'outro', texto: RESPOSTAS[nova.filter((m) => m.de === 'eu').length % RESPOSTAS.length], hora: Date.now() }])
    }, 1600)
  }
  return (
    <Janela titulo={`Conversa · ${anuncio.titulo}`} onFechar={onFechar} largura={480}>
      <div className="ap-chat">
        {lista.map((m, i) => (
          <div key={i} className="ap-msg" data-de={m.de}>{m.texto}</div>
        ))}
        {digitando && <div className="ap-msg" data-de="outro">digitando…</div>}
        <div ref={fim} />
      </div>
      <form onSubmit={enviar} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem…" aria-label="Mensagem" />
        <button type="submit" className="dm-btn">Enviar</button>
      </form>
      <p className="dm-mudo" style={{ fontSize: '.76rem', margin: '8px 0 0' }}>🔒 Demonstração: a outra pessoa é simulada. Dica de segurança: combine a entrega em lugar público e nunca pague “taxa” para receber algo de volta.</p>
    </Janela>
  )
}
