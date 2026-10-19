'use client'

// Páginas do cliente final: cardápio com carrinho, agendamento online e acompanhamento de pedido/OS.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { abrirLoja } from '@/lib/sistemas/publico'
import { ETAPAS_PEDIDO, STATUS_OS } from '@/lib/sistemas/schema'
import { addDias, brl, dataBR, horariosLivres, hojeISO, lerAdicionais, linkWhats, num, round2 } from '@/lib/sistemas/regras'
import { gerarPixPayload } from '@/lib/pix'
import { track } from '@/lib/analytics'

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function lerParam(nome) {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get(nome) || ''
}

function guardado(chave, padrao) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? padrao
  } catch {
    return padrao
  }
}

function guardar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* sem armazenamento: só não lembra os dados na próxima vez */
  }
}

export default function LojaPublica({ pagina }) {
  const [fonte, setFonte] = useState(null)
  const [api, setApi] = useState(null)
  const [loja, setLoja] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const s = lerParam('s')
    setFonte(s)
    abrirLoja(s)
      .then(async (a) => {
        setApi(a)
        if (pagina !== 'acompanhar') setLoja(await a.loja())
      })
      .catch((e) => setErro(e.message))
  }, [pagina])

  useEffect(() => {
    document.documentElement.classList.add('sx-tela-cheia')
    return () => document.documentElement.classList.remove('sx-tela-cheia')
  }, [])

  if (erro) return <div className="lp-pagina lp-centro"><p className="notice error">{erro}</p></div>
  if (!api || (pagina !== 'acompanhar' && !loja)) {
    return (
      <div className="lp-pagina lp-centro">
        <span className="spinner" aria-hidden="true" /> Carregando…
      </div>
    )
  }
  const cfg = loja?.config ?? {}
  return (
    <div className="lp-pagina">
      {api.demo && (
        <p className="lp-demo">
          Demonstração: os pedidos e agendamentos feitos aqui aparecem no sistema aberto neste mesmo navegador.
        </p>
      )}
      {pagina === 'cardapio' && <CardapioCliente api={api} loja={loja} fonte={fonte} />}
      {pagina === 'agendar' && <AgendarCliente api={api} loja={loja} />}
      {pagina === 'acompanhar' && <Acompanhar api={api} />}
      <footer className="lp-rodape">
        {cfg.empresa_nome && <strong>{cfg.empresa_nome}</strong>}
        {cfg.endereco && <span>{cfg.endereco}</span>}
        {cfg.empresa_telefone && <span>{cfg.empresa_telefone}</span>}
        <span className="muted small">
          Sistema feito por <a href="/sistemas">vinicius.dev/sistemas</a>
        </span>
      </footer>
    </div>
  )
}

function Cabecalho({ cfg, sub }) {
  return (
    <header className="lp-topo">
      <span className="lp-logo" aria-hidden="true">
        {(cfg.empresa_nome || 'L').slice(0, 1)}
      </span>
      <div>
        <h1>{cfg.empresa_nome || 'Nossa loja'}</h1>
        {sub}
      </div>
    </header>
  )
}

function PixCliente({ cfg, valor, txid }) {
  const [img, setImg] = useState('')
  const payload = cfg.pix_chave ? gerarPixPayload({ chave: cfg.pix_chave, nome: cfg.pix_nome || cfg.empresa_nome, cidade: cfg.cidade, valor, txid }) : ''
  useEffect(() => {
    if (payload) import('qrcode').then(({ default: QR }) => QR.toDataURL(payload, { width: 360, margin: 1 }).then(setImg))
  }, [payload])
  if (!payload) return null
  return (
    <div className="lp-pix">
      <p>Pague com Pix ({brl(valor)}):</p>
      {img && <img src={img} alt="QR Code Pix" width={180} height={180} />}
      <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(payload)}>
        Copiar Pix copia e cola
      </button>
    </div>
  )
}

/* ---------- Cardápio ---------- */

function CardapioCliente({ api, loja, fonte }) {
  const cfg = loja.config
  const [carrinho, setCarrinho] = useState(() => guardado(`lp.carrinho.${fonte}`, []))
  const [escolher, setEscolher] = useState(null)
  const [fechar, setFechar] = useState(false)
  const [pronto, setPronto] = useState(null)
  const cats = loja.categorias.filter((c) => loja.produtos.some((p) => p.categoria_id === c.id && p.tipo !== 'servico'))
  const semCat = loja.produtos.filter((p) => p.tipo !== 'servico' && !cats.some((c) => c.id === p.categoria_id))
  const qtd = carrinho.reduce((s, i) => s + i.qtd, 0)
  const total = round2(carrinho.reduce((s, i) => s + i.preco * i.qtd, 0))

  useEffect(() => guardar(`lp.carrinho.${fonte}`, carrinho), [carrinho, fonte])

  if (pronto) return <PedidoFeito pedido={pronto} cfg={cfg} />

  const secoes = [...cats.map((c) => [c, loja.produtos.filter((p) => p.categoria_id === c.id && p.tipo !== 'servico')]), ...(semCat.length ? [[{ id: 'outros', nome: 'Outros' }, semCat]] : [])]

  return (
    <>
      <Cabecalho
        cfg={cfg}
        sub={
          <p className="lp-info">
            <span className={cfg.loja_aberta ? 'lp-aberto' : 'lp-fechado'}>{cfg.loja_aberta ? '● Aberto agora' : '● Fechado'}</span>
            {cfg.tempo_entrega && <span>🛵 {cfg.tempo_entrega}</span>}
            <span>Entrega {Number(cfg.taxa_entrega) ? brl(cfg.taxa_entrega) : 'grátis'}</span>
            {Number(cfg.pedido_minimo) > 0 && <span>Mínimo {brl(cfg.pedido_minimo)}</span>}
          </p>
        }
      />
      <nav className="lp-cats" aria-label="Categorias">
        {secoes.map(([c]) => (
          <a key={c.id} href={`#cat-${c.id}`}>
            {c.nome}
          </a>
        ))}
      </nav>
      {secoes.map(([c, itens]) => (
        <section key={c.id} id={`cat-${c.id}`} className="lp-secao">
          <h2>{c.nome}</h2>
          <div className="lp-produtos">
            {itens.map((p) => (
              <button key={p.id} type="button" className="lp-produto" onClick={() => setEscolher(p)} disabled={!cfg.loja_aberta}>
                <div>
                  <strong>{p.nome}</strong>
                  {p.descricao && <p>{p.descricao}</p>}
                  <span className="lp-preco">{brl(p.preco)}</span>
                </div>
                {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <span className="lp-foto-vazia" aria-hidden="true">{p.nome.slice(0, 1)}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
      {qtd > 0 && (
        <button type="button" className="lp-barra-carrinho" onClick={() => setFechar(true)}>
          <span>
            Ver carrinho · {qtd} {qtd === 1 ? 'item' : 'itens'}
          </span>
          <strong>{brl(total)}</strong>
        </button>
      )}
      {escolher && (
        <EscolherItem
          produto={escolher}
          onFechar={() => setEscolher(null)}
          onAdicionar={(item) => {
            setCarrinho((c) => [...c, item])
            setEscolher(null)
          }}
        />
      )}
      {fechar && (
        <Checkout
          api={api}
          cfg={cfg}
          carrinho={carrinho}
          setCarrinho={setCarrinho}
          onFechar={() => setFechar(false)}
          onPronto={(p) => {
            setCarrinho([])
            setFechar(false)
            setPronto(p)
            track('sistema_pedido_online', { modo: api.demo ? 'demo' : 'planilha' })
          }}
        />
      )}
    </>
  )
}

function Folha({ titulo, onFechar, children, rodape }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return (
    <div className="sx-modal-fundo" onPointerDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="sx-modal lp-folha" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="sx-modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onFechar}>
            ×
          </button>
        </header>
        <div className="sx-modal-corpo">{children}</div>
        {rodape && <footer className="sx-modal-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}

function EscolherItem({ produto, onFechar, onAdicionar }) {
  const adicionais = lerAdicionais(produto.adicionais)
  const [marcados, setMarcados] = useState([])
  const [qtd, setQtd] = useState(1)
  const [obs, setObs] = useState('')
  const unit = round2(Number(produto.preco) + adicionais.filter((a) => marcados.includes(a.nome)).reduce((s, a) => s + a.preco, 0))
  return (
    <Folha
      titulo={produto.nome}
      onFechar={onFechar}
      rodape={
        <div className="lp-add">
          <div className="sx-qtd">
            <button type="button" className="icon-btn" aria-label="Menos" onClick={() => setQtd((q) => Math.max(1, q - 1))}>
              −
            </button>
            <strong>{qtd}</strong>
            <button type="button" className="icon-btn" aria-label="Mais" onClick={() => setQtd((q) => Math.min(99, q + 1))}>
              +
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onAdicionar({ produto_id: produto.id, nome: produto.nome + (marcados.length ? ` (+ ${marcados.join(', ')})` : ''), adicionais: marcados, qtd, preco: unit, obs: obs.trim() })}
          >
            Adicionar {brl(unit * qtd)}
          </button>
        </div>
      }
    >
      {produto.descricao && <p className="muted">{produto.descricao}</p>}
      {adicionais.length > 0 && (
        <fieldset className="sx-fieldset">
          <legend>Adicionais</legend>
          {adicionais.map((a) => (
            <label key={a.nome} className="check lp-adicional">
              <input type="checkbox" checked={marcados.includes(a.nome)} onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, a.nome] : m.filter((x) => x !== a.nome)))} />
              <span>{a.nome}</span>
              <small>+ {brl(a.preco)}</small>
            </label>
          ))}
        </fieldset>
      )}
      <label className="field">
        <span className="field-label">Alguma observação?</span>
        <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sem cebola, ponto da carne…" maxLength={140} />
      </label>
    </Folha>
  )
}

function Checkout({ api, cfg, carrinho, setCarrinho, onFechar, onPronto }) {
  const [dados, setDados] = useState(() => guardado('lp.cliente', { nome: '', telefone: '', endereco: '', bairro: '' }))
  const [entrega, setEntrega] = useState('entrega')
  const [pagamento, setPagamento] = useState('Pix')
  const [troco, setTroco] = useState('')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const subtotal = round2(carrinho.reduce((s, i) => s + i.preco * i.qtd, 0))
  const taxa = entrega === 'entrega' ? Number(cfg.taxa_entrega) || 0 : 0
  const total = round2(subtotal + taxa)
  const set = (k, v) => setDados((d) => ({ ...d, [k]: v }))

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    guardar('lp.cliente', dados)
    try {
      const r = await api.pedir({
        cliente: dados,
        entrega,
        itens: carrinho.map((i) => ({ produto_id: i.produto_id, qtd: i.qtd, adicionais: i.adicionais, obs: i.obs })),
        pagamento: pagamento === 'Dinheiro' && troco ? `Dinheiro (troco para ${troco})` : pagamento,
        obs,
      })
      onPronto({ ...r, itens: carrinho, total: r.total ?? total, pagamento, cliente: dados, entrega })
    } catch (e2) {
      setErro(e2.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Folha titulo="Seu pedido" onFechar={onFechar}>
      <form onSubmit={enviar} className="sx-form">
        <ul className="lp-carrinho">
          {carrinho.map((i, k) => (
            <li key={k}>
              <div>
                <strong>
                  {i.qtd}x {i.nome}
                </strong>
                {i.obs && <small className="muted"> {i.obs}</small>}
              </div>
              <span>{brl(i.preco * i.qtd)}</span>
              <button type="button" className="icon-btn" aria-label="Remover" onClick={() => setCarrinho((c) => c.filter((_, j) => j !== k))}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="chips">
          {[
            ['entrega', `Entrega (${Number(cfg.taxa_entrega) ? brl(cfg.taxa_entrega) : 'grátis'})`],
            ['retirada', 'Retirar no local'],
          ].map(([id, r]) => (
            <button key={id} type="button" className={entrega === id ? 'chip active' : 'chip'} onClick={() => setEntrega(id)}>
              {r}
            </button>
          ))}
        </div>
        <div className="sx-form-grid">
          <label className="field">
            <span className="field-label">Seu nome</span>
            <input required value={dados.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" />
          </label>
          <label className="field">
            <span className="field-label">WhatsApp</span>
            <input required type="tel" value={dados.telefone} onChange={(e) => set('telefone', e.target.value)} autoComplete="tel" placeholder="(11) 99999-9999" />
          </label>
          {entrega === 'entrega' && (
            <>
              <label className="field">
                <span className="field-label">Endereço e número</span>
                <input required value={dados.endereco} onChange={(e) => set('endereco', e.target.value)} autoComplete="street-address" />
              </label>
              <label className="field">
                <span className="field-label">Bairro / complemento</span>
                <input value={dados.bairro} onChange={(e) => set('bairro', e.target.value)} />
              </label>
            </>
          )}
        </div>
        <div className="field">
          <span className="field-label">Pagamento</span>
          <div className="chips">
            {['Pix', 'Cartão na entrega', 'Dinheiro'].map((p) => (
              <button key={p} type="button" className={pagamento === p ? 'chip active' : 'chip'} onClick={() => setPagamento(p)}>
                {p}
              </button>
            ))}
          </div>
          {pagamento === 'Dinheiro' && <input value={troco} onChange={(e) => setTroco(e.target.value)} placeholder="Troco para quanto? (opcional)" />}
        </div>
        <label className="field">
          <span className="field-label">Observação do pedido</span>
          <input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={300} />
        </label>
        <ul className="sx-lista-valores">
          <li>
            <span>Subtotal</span>
            <strong>{brl(subtotal)}</strong>
          </li>
          {taxa > 0 && (
            <li>
              <span>Entrega</span>
              <strong>{brl(taxa)}</strong>
            </li>
          )}
          <li className="sx-total">
            <span>Total</span>
            <strong>{brl(total)}</strong>
          </li>
        </ul>
        {Number(cfg.pedido_minimo) > subtotal && <p className="notice warn">Pedido mínimo de {brl(cfg.pedido_minimo)}.</p>}
        {erro && <p className="notice error">{erro}</p>}
        <button type="submit" className="btn btn-primary btn-lg sx-largo" disabled={enviando || !carrinho.length || !cfg.loja_aberta}>
          {enviando ? 'Enviando pedido…' : `Fazer pedido · ${brl(total)}`}
        </button>
      </form>
    </Folha>
  )
}

function PedidoFeito({ pedido, cfg }) {
  const resumo = `Olá! Acabei de fazer o pedido #${pedido.numero || ''} pelo cardápio:\n${pedido.itens.map((i) => `${i.qtd}x ${i.nome}`).join('\n')}\nTotal: ${brl(pedido.total)} (${pedido.pagamento})\n${pedido.entrega === 'entrega' ? `Entrega: ${pedido.cliente.endereco} ${pedido.cliente.bairro || ''}` : 'Vou retirar no local'}\nNome: ${pedido.cliente.nome}`
  return (
    <div className="lp-feito">
      <span className="lp-feito-ok" aria-hidden="true">
        ✓
      </span>
      <h1>Pedido {pedido.numero ? `#${pedido.numero} ` : ''}enviado!</h1>
      <p>A loja já recebeu. Você pode acompanhar cada etapa pelo código abaixo.</p>
      <p className="lp-codigo">{pedido.codigo}</p>
      <div className="sx-acoes lp-centro">
        <a className="btn btn-primary" href={`/loja/acompanhar${window.location.search}&c=${pedido.codigo}`}>
          Acompanhar pedido
        </a>
        {cfg.whatsapp && (
          <a className="btn btn-ghost" href={linkWhats(cfg.whatsapp, resumo)} target="_blank" rel="noopener noreferrer">
            Mandar no WhatsApp da loja
          </a>
        )}
      </div>
      {pedido.pagamento === 'Pix' && <PixCliente cfg={cfg} valor={pedido.total} txid={`PED${pedido.numero || ''}`} />}
    </div>
  )
}

/* ---------- Agendamento ---------- */

function esquecerDia(mapa, dia) {
  const novo = new Map(mapa)
  novo.delete(dia)
  return novo
}

// A agenda das próximas semanas vem numa chamada só (todos os profissionais). Os horários livres e os dias
// lotados são calculados aqui; ao marcar, a resposta já traz a agenda atualizada, sem buscar de novo.
function AgendarCliente({ api, loja }) {
  const cfg = loja.config
  const servicos = loja.produtos.filter((p) => p.tipo === 'servico')
  const profs = loja.profissionais
  const [servico, setServico] = useState(null)
  const [prof, setProf] = useState(null) // { id: '' } = sem preferência
  const [dia, setDia] = useState(null)
  const [hora, setHora] = useState(null)
  const [agenda, setAgenda] = useState(null)
  const [legado, setLegado] = useState(null) // Code.gs antigo: Map dia -> ocupados, buscado dia a dia
  const [dados, setDados] = useState(() => guardado('lp.cliente', { nome: '', telefone: '', email: '' }))
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [feito, setFeito] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api
      .agenda()
      .then((a) => (a ? setAgenda(a) : setLegado(new Map())))
      .catch((e) => setErro(e.message))
  }, [api])

  // Só para planilhas com o Code.gs antigo: busca o dia escolhido de todos os profissionais.
  useEffect(() => {
    if (!legado || !dia || legado.has(dia)) return
    Promise.all(profs.map((p) => api.ocupados(dia, p.id)))
      .then((listas) => setLegado((m) => new Map(m).set(dia, listas.flat())))
      .catch((e) => setErro(e.message))
  }, [api, legado, dia, profs])

  const dias = useMemo(() => {
    const abertos = String(cfg.dias ?? '1,2,3,4,5,6').split(',').map(Number)
    const out = []
    for (let i = 0; out.length < 14 && i < 30; i++) {
      const d = addDias(hojeISO(), i)
      if (abertos.includes(new Date(`${d}T12:00`).getDay())) out.push(d)
    }
    return out
  }, [cfg.dias])

  const conhecido = (d) => (agenda ? d <= agenda.ate : legado?.has(d))
  const ocupadosDe = (d) => (agenda ? agenda.ocupados : legado?.get(d) ?? [])

  /** Horários livres no dia; com "sem preferência", junta todos e guarda quem atende cada horário. */
  const livresNoDia = (d) => {
    if (!servico || !prof || !conhecido(d)) return null
    const candidatos = prof.id ? [prof] : profs
    const quem = new Map()
    for (const p of candidatos) {
      for (const h of horariosLivres({ data: d, duracao: servico.duracao_min, profissionalId: p.id, agendamentos: ocupadosDe(d), config: cfg })) if (!quem.has(h)) quem.set(h, p)
    }
    return new Map([...quem].sort(([a], [b]) => a.localeCompare(b)))
  }

  const livres = dia ? livresNoDia(dia) : null

  const escolher = (fn) => {
    fn()
    setHora(null)
    setAviso('')
  }

  const confirmar = async (e) => {
    e.preventDefault()
    setErro('')
    setAviso('')
    setEnviando(true)
    guardar('lp.cliente', { ...guardado('lp.cliente', {}), ...dados })
    const atende = livres?.get(hora) ?? prof
    try {
      const r = await api.agendar({ servico_id: servico.id, profissional_id: atende.id, inicio: `${dia}T${hora}`, cliente: dados })
      track('sistema_agendamento_online', { modo: api.demo ? 'demo' : 'planilha' })
      if (r.agenda) setAgenda(r.agenda)
      else if (legado) setLegado((m) => esquecerDia(m, dia))
      setFeito({ codigo: r.codigo, prof: atende, dia, hora, servico })
    } catch (e2) {
      // Horário tomado: a resposta já vem com a agenda nova e a tela mostra o que sobrou.
      if (e2.dados?.agenda) setAgenda(e2.dados.agenda)
      else if (legado) setLegado((m) => esquecerDia(m, dia))
      setAviso(e2.message)
      setHora(null)
    } finally {
      setEnviando(false)
    }
  }

  if (feito) {
    const fonte = new URLSearchParams(window.location.search).get('s') || ''
    return (
      <div className="lp-feito">
        <span className="lp-feito-ok lp-feito-espera" aria-hidden="true">
          ⏳
        </span>
        <h1>Pedido enviado!</h1>
        <p>
          {feito.servico.nome} com {feito.prof.nome}
          <br />
          <strong>
            {SEMANA[new Date(`${feito.dia}T12:00`).getDay()]}, {dataBR(feito.dia)} às {feito.hora}
          </strong>
        </p>
        <p className="muted">O horário fica reservado para você. Agora é só esperar a confirmação da {cfg.empresa_nome || 'loja'}.</p>
        {feito.codigo && (
          <>
            <p>
              Código para acompanhar: <strong className="lp-codigo">{feito.codigo}</strong>
            </p>
            <a className="btn btn-primary" href={`/loja/acompanhar?s=${encodeURIComponent(fonte)}&c=${feito.codigo}`}>
              Acompanhar a confirmação
            </a>
          </>
        )}
        {cfg.whatsapp && (
          <a className="btn btn-ghost" href={linkWhats(cfg.whatsapp, `Olá! Pedi ${feito.servico.nome} com ${feito.prof.nome} em ${dataBR(feito.dia)} às ${feito.hora}. Nome: ${dados.nome}.${feito.codigo ? ` Código: ${feito.codigo}.` : ''}`)} target="_blank" rel="noopener noreferrer">
            Avisar no WhatsApp
          </a>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setFeito(null)
            setHora(null)
          }}
        >
          Marcar outro horário
        </button>
      </div>
    )
  }

  return (
    <>
      <Cabecalho cfg={cfg} sub={<p className="lp-info">Escolha o horário e espere a confirmação</p>} />
      <section className="lp-secao">
        <h2>1. Serviço</h2>
        <div className="lp-opcoes">
          {servicos.map((s) => (
            <button key={s.id} type="button" className={servico?.id === s.id ? 'lp-opcao ativo' : 'lp-opcao'} onClick={() => escolher(() => setServico(s))}>
              <strong>{s.nome}</strong>
              <span>
                {brl(s.preco)} · {s.duracao_min || 30} min
              </span>
            </button>
          ))}
          {servicos.length === 0 && <p className="muted">Nenhum serviço disponível para agendamento online.</p>}
        </div>
      </section>
      {servico && (
        <section className="lp-secao">
          <h2>2. Profissional</h2>
          <div className="lp-opcoes">
            {profs.length > 1 && (
              <button type="button" className={prof?.id === '' ? 'lp-opcao ativo' : 'lp-opcao'} onClick={() => escolher(() => setProf({ id: '', nome: 'Sem preferência' }))}>
                <strong>Sem preferência</strong>
                <span>Quem estiver livre</span>
              </button>
            )}
            {profs.map((p) => (
              <button key={p.id} type="button" className={prof?.id === p.id ? 'lp-opcao ativo' : 'lp-opcao'} onClick={() => escolher(() => setProf(p))}>
                <strong>{p.nome}</strong>
                {p.funcao && <span>{p.funcao}</span>}
              </button>
            ))}
          </div>
        </section>
      )}
      {servico && prof && (
        <section className="lp-secao">
          <h2>3. Dia</h2>
          {!agenda && !legado ? (
            <p className="muted">
              <span className="spinner" aria-hidden="true" /> Carregando a agenda…
            </p>
          ) : (
            <div className="lp-dias">
              {dias.map((d) => {
                const lotado = livresNoDia(d)?.size === 0
                return (
                  <button key={d} type="button" className={`lp-dia${dia === d ? ' ativo' : ''}${lotado ? ' lotado' : ''}`} disabled={lotado} aria-label={lotado ? `${dataBR(d)}: lotado` : dataBR(d)} onClick={() => escolher(() => setDia(d))}>
                    <small>{d === hojeISO() ? 'hoje' : SEMANA[new Date(`${d}T12:00`).getDay()]}</small>
                    <strong>{d.slice(8, 10)}</strong>
                    {lotado && <em>lotado</em>}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}
      {servico && prof && dia && (
        <section className="lp-secao">
          <h2>4. Horário</h2>
          {aviso && <p className="notice warn">{aviso} A agenda já foi atualizada.</p>}
          {livres === null ? (
            <p className="muted">
              <span className="spinner" aria-hidden="true" /> Buscando horários…
            </p>
          ) : livres.size === 0 ? (
            <p className="muted">Este dia lotou. Escolha outro dia ou profissional.</p>
          ) : (
            <div className="lp-horas">
              {[...livres.keys()].map((h) => (
                <button key={h} type="button" className={hora === h ? 'chip active' : 'chip'} onClick={() => setHora(h)}>
                  {h}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {hora && (
        <form className="lp-secao sx-form" onSubmit={confirmar}>
          <h2>5. Seus dados</h2>
          {!prof.id && livres?.get(hora) && <p className="muted small">Você será atendido por {livres.get(hora).nome}.</p>}
          <div className="sx-form-grid">
            <label className="field">
              <span className="field-label">Nome</span>
              <input required value={dados.nome || ''} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} autoComplete="name" />
            </label>
            <label className="field">
              <span className="field-label">WhatsApp</span>
              <input required type="tel" value={dados.telefone || ''} onChange={(e) => setDados((d) => ({ ...d, telefone: e.target.value }))} autoComplete="tel" />
            </label>
            <label className="field">
              <span className="field-label">E-mail (para receber o código)</span>
              <input type="email" value={dados.email || ''} onChange={(e) => setDados((d) => ({ ...d, email: e.target.value }))} autoComplete="email" />
            </label>
          </div>
          {erro && <p className="notice error">{erro}</p>}
          <button type="submit" className="btn btn-primary btn-lg sx-largo" disabled={enviando}>
            {enviando ? 'Enviando…' : `Pedir ${dataBR(dia)} às ${hora}`}
          </button>
        </form>
      )}
      {erro && !hora && <p className="notice error">{erro}</p>}
    </>
  )
}

/* ---------- Acompanhamento ---------- */

const ETAPAS_HORARIO = [
  ['pendente', 'Pedido enviado'],
  ['confirmado', 'Confirmado'],
  ['concluido', 'Atendido'],
]

const etapaHorario = (status) => (status === 'pendente' ? 'pendente' : status === 'concluido' ? 'concluido' : 'confirmado')

function Acompanhar({ api }) {
  const [codigo, setCodigo] = useState(() => lerParam('c'))
  const [res, setRes] = useState(null)
  const [erro, setErro] = useState('')

  const buscar = useCallback(
    async (c = codigo) => {
      if (!c) return
      setErro('')
      try {
        setRes(await api.acompanhar(c))
      } catch (e) {
        setRes(null)
        setErro(e.message)
      }
    },
    [api, codigo],
  )

  useEffect(() => {
    if (!codigo) return
    buscar()
    const t = setInterval(() => document.visibilityState === 'visible' && buscar(), 20000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const etapas = res?.tipo === 'pedido' ? ETAPAS_PEDIDO.filter(([e]) => res.entrega === 'entrega' || e !== 'saiu') : res?.tipo === 'agendamento' ? ETAPAS_HORARIO : STATUS_OS.filter(([s]) => s !== 'cancelada')
  const atual = res ? etapas.findIndex(([e]) => e === (res.tipo === 'pedido' ? (res.status === 'concluida' ? 'entregue' : res.etapa) : res.tipo === 'agendamento' ? etapaHorario(res.status) : res.status)) : -1

  return (
    <div className="lp-acomp">
      <h1>Acompanhe seu pedido, horário ou ordem de serviço</h1>
      <form
        className="sx-linha"
        onSubmit={(e) => {
          e.preventDefault()
          buscar()
        }}
      >
        <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Código de 6 letras" maxLength={6} aria-label="Código" />
        <button type="submit" className="btn btn-primary">
          Consultar
        </button>
      </form>
      {erro && <p className="notice error">{erro}</p>}
      {res && (
        <div className="lp-resultado">
          {res.tipo === 'agendamento' ? (
            <>
              <h2>Seu horário</h2>
              <p>
                {res.servico}
                {res.profissional && ` com ${res.profissional}`}
                <br />
                <strong>
                  {SEMANA[new Date(`${String(res.inicio).slice(0, 10)}T12:00`).getDay()]}, {dataBR(String(res.inicio).slice(0, 10))} às {String(res.inicio).slice(11, 16)}
                </strong>
              </p>
              {res.status === 'pendente' && <p className="notice warn">Aguardando a confirmação. O horário já está reservado para você.</p>}
              {['confirmado', 'agendado'].includes(res.status) && <p className="notice ok">Horário confirmado. Até lá!</p>}
            </>
          ) : (
            <>
              <h2>
                {res.tipo === 'pedido' ? 'Pedido' : 'Ordem de serviço'} #{res.numero || '—'}
              </h2>
              {res.equipamento && <p>{res.equipamento}</p>}
            </>
          )}
          {res.status === 'recusado' ? (
            <p className="notice error">Infelizmente este horário não pôde ser aceito. Faça um novo pedido em outro horário.</p>
          ) : res.status === 'faltou' ? (
            <p className="notice error">Marcado como falta.</p>
          ) : ['cancelada', 'cancelado'].includes(res.status) ? (
            <p className="notice error">Cancelado.</p>
          ) : (
            <ol className="lp-linha-tempo">
              {etapas.map(([e, nome], i) => (
                <li key={e} className={i < atual ? 'feito' : i === atual ? 'atual' : ''}>
                  {nome}
                </li>
              ))}
            </ol>
          )}
          {res.itens && (
            <ul className="lp-carrinho">
              {res.itens.map((i, k) => (
                <li key={k}>
                  {num(i.qtd)}x {i.nome}
                </li>
              ))}
            </ul>
          )}
          {res.laudo && <p>Laudo: {res.laudo}</p>}
          {res.previsao && <p>Previsão: {dataBR(res.previsao)}</p>}
          {Number(res.total) > 0 && (
            <p>
              Total: <strong>{brl(res.total)}</strong>
            </p>
          )}
          <p className="muted small">Atualiza sozinho a cada 20 segundos.</p>
        </div>
      )}
    </div>
  )
}
