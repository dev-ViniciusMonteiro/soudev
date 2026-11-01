'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Aviso, Codigo, Copiar, Seg } from './comum'

const API = (process.env.NEXT_PUBLIC_IDEIAS_API || '').replace(/\/$/, '')
const CHAVE = '4dev-webhook'

const corMetodo = (m) => ({ GET: '#49cc90', POST: '#fca130', PUT: '#61affe', PATCH: '#50e3c2', DELETE: '#f93e3e' })[m] || '#9aa0ad'
const hora = (t) => new Date(t).toLocaleTimeString('pt-BR')
const tamanho = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)
const sh = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`

function lerSalvo() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    return s && s.expira_em > Date.now() ? s : null
  } catch {
    return null
  }
}

function realcar(txt) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return esc(txt).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (m, str, dois, lit) => {
    if (str) return dois ? `<span class="pm-jk">${str}</span>${dois}` : `<span class="pm-js">${str}</span>`
    if (lit) return `<span class="pm-jl">${m}</span>`
    return `<span class="pm-jn">${m}</span>`
  })
}

function Detalhe({ r, base }) {
  const [modo, setModo] = useState('pretty')
  const [destino, setDestino] = useState('http://localhost:3000/api/webhook')
  const [reenvio, setReenvio] = useState(null)
  const tipo = r.headers.find(([k]) => k.toLowerCase() === 'content-type')?.[1] || ''
  let pretty = r.corpo || ''
  let ehJson = false
  try {
    if (pretty.trim()) {
      pretty = JSON.stringify(JSON.parse(pretty), null, 2)
      ehJson = true
    }
  } catch {}
  const form = /x-www-form-urlencoded/i.test(tipo) && r.corpo ? [...new URLSearchParams(r.corpo).entries()] : null
  const query = r.query ? [...new URLSearchParams(r.query).entries()] : []
  const urlCompleta = `${base}${r.caminho === '/' ? '' : r.caminho}${r.query ? `?${r.query}` : ''}`
  const ignorar = /^(host|content-length|connection|accept-encoding|x-real-ip|true-client-ip)$/i
  const curl = [`curl -X ${r.metodo} ${sh(urlCompleta)}`, ...r.headers.filter(([k]) => !ignorar.test(k)).map(([k, v]) => `-H ${sh(`${k}: ${v}`)}`), ...(r.corpo && !r.binario ? [`--data-raw ${sh(r.corpo)}`] : [])].join(' \\\n  ')

  const reenviar = async () => {
    setReenvio({ enviando: true })
    const t0 = performance.now()
    try {
      const h = r.headers.filter(([k]) => !/^(host|content-length|connection|accept-encoding|user-agent|origin|referer|cookie|x-forwarded-for|x-real-ip|true-client-ip)$/i.test(k))
      const resp = await fetch(destino + (r.query ? `?${r.query}` : ''), { method: r.metodo, headers: h, body: ['GET', 'HEAD'].includes(r.metodo) || r.binario ? undefined : r.corpo })
      setReenvio({ status: resp.status, ms: Math.round(performance.now() - t0), texto: (await resp.text()).slice(0, 2000) })
    } catch (e) {
      setReenvio({ erro: `${e.message}. Se for localhost, a sua API precisa liberar CORS para este site.` })
    }
  }

  return (
    <div className="wh-detalhe">
      <div className="wh-det-topo">
        <span className="wh-met" style={{ background: corMetodo(r.metodo) }}>{r.metodo}</span>
        <code className="wh-caminho">{r.caminho}{r.query ? `?${r.query}` : ''}</code>
        <span className="dv-espaco" />
        <span className="dv-muted">{new Date(r.criado_em).toLocaleString('pt-BR')}</span>
      </div>
      <div className="dv-chips">
        <span className="dv-chip">{tamanho(r.tamanho)}{r.truncado ? ' (cortado em 64 KB)' : ''}</span>
        {tipo && <span className="dv-chip">{tipo.split(';')[0]}</span>}
        {r.ip && <span className="dv-chip">IP {r.ip}{r.pais ? ` · ${r.pais}` : ''}</span>}
        <span className="dv-chip">{r.headers.length} headers</span>
      </div>

      {query.length > 0 && (
        <>
          <p className="dv-rotulo">Query string</p>
          <table className="dv-tabela wh-tab"><tbody>{query.map(([k, v], i) => <tr key={i}><td><code>{k}</code></td><td><code>{v}</code></td></tr>)}</tbody></table>
        </>
      )}

      <div className="dv-barra">
        <p className="dv-rotulo">Corpo</p>
        <span className="dv-espaco" />
        {!r.binario && r.corpo && <Seg rotulo="Formato" valor={modo} onChange={setModo} opcoes={[['pretty', 'Pretty'], ['raw', 'Raw']]} />}
        {r.corpo && <Copiar texto={r.corpo} />}
      </div>
      {!r.corpo ? (
        <p className="dv-dica">(sem corpo)</p>
      ) : r.binario ? (
        <Aviso>Conteúdo binário ({tamanho(r.tamanho)}), guardado em base64.</Aviso>
      ) : form && modo === 'pretty' ? (
        <table className="dv-tabela wh-tab"><tbody>{form.map(([k, v], i) => <tr key={i}><td><code>{k}</code></td><td><code>{v}</code></td></tr>)}</tbody></table>
      ) : ehJson && modo === 'pretty' ? (
        <pre className="pm-corpo wh-corpo" dangerouslySetInnerHTML={{ __html: realcar(pretty) }} />
      ) : (
        <pre className="pm-corpo wh-corpo">{r.corpo}</pre>
      )}

      <details className="wh-headers" open>
        <summary>Headers ({r.headers.length})</summary>
        <table className="dv-tabela wh-tab"><tbody>{r.headers.map(([k, v], i) => <tr key={i}><td><code>{k}</code></td><td><code>{v}</code></td></tr>)}</tbody></table>
      </details>

      <details className="wh-headers">
        <summary>Copiar como cURL</summary>
        <div className="dv-barra"><span className="dv-espaco" /><Copiar texto={curl} /></div>
        <pre className="pm-corpo">{curl}</pre>
      </details>

      <details className="wh-headers">
        <summary>Reenviar para outra URL (ex.: sua API local)</summary>
        <div className="dv-barra">
          <input className="dv-input" value={destino} onChange={(e) => setDestino(e.target.value)} spellCheck={false} aria-label="URL de destino" />
          <button type="button" className="dv-btn" onClick={reenviar} disabled={reenvio?.enviando}>Reenviar</button>
        </div>
        {reenvio?.erro && <Aviso tipo="erro">{reenvio.erro}</Aviso>}
        {reenvio?.status && (
          <>
            <p className="dv-dica">Resposta: <b>{reenvio.status}</b> em {reenvio.ms} ms</p>
            <pre className="pm-corpo">{reenvio.texto}</pre>
          </>
        )}
      </details>
    </div>
  )
}

export default function WebhookInspector() {
  const [bin, setBin] = useState(null)
  const [carregado, setCarregado] = useState(false)
  const [reqs, setReqs] = useState([])
  const [sel, setSel] = useState(null)
  const [erro, setErro] = useState('')
  const [criando, setCriando] = useState(false)
  const [resposta, setResposta] = useState({ status: 200, tipo: 'application/json', corpo: '{"ok":true}' })
  const [salvoResp, setSalvoResp] = useState('')
  const [agora, setAgora] = useState(Date.now())
  const ultimo = useRef(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    setBin(lerSalvo())
    setCarregado(true)
  }, [])

  const urlBase = bin ? `${API}/wh/r/${bin.id}` : ''
  const chamar = useCallback(
    async (caminho, opts = {}) => {
      const r = await fetch(`${API}/wh/${bin.id}${caminho}`, { ...opts, headers: { 'X-Chave': bin.chave, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } })
      const d = await r.json().catch(() => ({}))
      if (r.status === 404) {
        localStorage.removeItem(CHAVE)
        setBin(null)
        throw new Error(d.erro || 'A URL expirou.')
      }
      if (!r.ok) throw new Error(d.erro || 'Erro')
      return d
    },
    [bin],
  )

  // busca as novas a cada 2 s (pausa quando a aba está escondida)
  useEffect(() => {
    if (!bin) return
    let vivo = true
    ultimo.current = 0
    setReqs([])
    const buscar = async () => {
      if (document.hidden || pausado) return
      try {
        const d = await chamar(`/reqs?desde=${ultimo.current}`)
        if (!vivo) return
        if (ultimo.current === 0) setResposta(d.bin.resposta)
        if (d.reqs.length) {
          ultimo.current = d.reqs[0].criado_em
          setReqs((l) => [...d.reqs, ...l].slice(0, 100))
          setSel((s) => s ?? d.reqs[0].id)
        }
        setErro('')
      } catch (e) {
        if (vivo) setErro(e.message)
      }
    }
    buscar()
    const t = setInterval(buscar, 2000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [bin, chamar, pausado])

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const gerar = async () => {
    if (!API) return setErro('Falta configurar NEXT_PUBLIC_IDEIAS_API.')
    setCriando(true)
    setErro('')
    try {
      const r = await fetch(`${API}/wh/novo`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro || 'Não foi possível criar a URL.')
      localStorage.setItem(CHAVE, JSON.stringify(d))
      setSel(null)
      setBin(d)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCriando(false)
    }
  }

  const salvarResposta = async () => {
    try {
      await chamar('/config', { method: 'PUT', body: JSON.stringify(resposta) })
      setSalvoResp('✓ Salvo')
      setTimeout(() => setSalvoResp(''), 1500)
    } catch (e) {
      setErro(e.message)
    }
  }
  const limpar = async () => {
    await chamar('/reqs', { method: 'DELETE' }).catch((e) => setErro(e.message))
    setReqs([])
    setSel(null)
  }
  const apagar = async () => {
    if (!confirm('Apagar esta URL e tudo que ela recebeu?')) return
    await chamar('', { method: 'DELETE' }).catch(() => {})
    localStorage.removeItem(CHAVE)
    setBin(null)
    setReqs([])
  }
  const testar = async () => {
    await fetch(`${urlBase}/pedidos?origem=teste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Evento': 'pedido.pago' },
      body: JSON.stringify({ evento: 'pedido.pago', id: Math.floor(Math.random() * 9000) + 1000, valor: 149.9, cliente: { nome: 'Ana Souza', email: 'ana@exemplo.com' }, itens: [{ sku: 'CAM-01', qtd: 2 }] }),
    }).catch((e) => setErro(e.message))
  }

  const atual = useMemo(() => reqs.find((r) => r.id === sel), [reqs, sel])
  const restante = bin ? Math.max(0, bin.expira_em - agora) : 0

  if (!carregado) return <div className="dv-ferramenta" />
  if (!bin)
    return (
      <div className="dv-ferramenta wh-inicio">
        <div className="wh-hero">
          <span className="wh-hero-ic" aria-hidden="true">⇢</span>
          <h2>Gere uma URL para receber webhooks</h2>
          <p>Aponte o webhook do Stripe, GitHub, Mercado Pago, Asaas ou da sua API para ela e veja cada requisição chegar ao vivo, com headers e payload.</p>
          <button type="button" className="dv-btn dv-btn-g" onClick={gerar} disabled={criando}>{criando ? 'Gerando…' : 'Gerar URL temporária'}</button>
          <p className="dv-dica">Vale por 24 horas. Guarda as últimas 100 requisições (até 64 KB de corpo cada). Depois tudo é apagado.</p>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
        </div>
      </div>
    )

  return (
    <div className="dv-ferramenta wh">
      <div className="wh-url">
        <span className="wh-ao-vivo" data-pausado={pausado || undefined}>{pausado ? 'Pausado' : 'Ao vivo'}</span>
        <code>{urlBase}</code>
        <Copiar texto={urlBase} rotulo="Copiar URL" />
      </div>
      <div className="dv-barra">
        <span className="dv-muted">Expira em {Math.floor(restante / 3600000)}h {Math.floor((restante % 3600000) / 60000)}min · aceita qualquer método e qualquer caminho depois da URL</span>
        <span className="dv-espaco" />
        <button type="button" className="dv-btn" onClick={testar}>Enviar teste</button>
        <button type="button" className="dv-btn dv-btn-sec" onClick={() => setPausado((p) => !p)}>{pausado ? 'Retomar' : 'Pausar'}</button>
        <button type="button" className="dv-btn dv-btn-sec" onClick={limpar} disabled={!reqs.length}>Limpar</button>
        <button type="button" className="dv-btn dv-btn-sec" onClick={gerar}>Nova URL</button>
        <button type="button" className="dv-btn dv-btn-sec" onClick={apagar}>Apagar</button>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="wh-layout">
        <aside className="wh-lista" aria-label="Requisições recebidas">
          <p className="dv-rotulo">Requisições ({reqs.length})</p>
          {!reqs.length && (
            <div className="wh-esperando">
              <span className="pm-girando" aria-hidden="true" />
              <p>Esperando requisições…</p>
              <pre className="pm-corpo">{`curl -X POST ${urlBase} \\\n  -H 'Content-Type: application/json' \\\n  -d '{"ola":"mundo"}'`}</pre>
              <Copiar texto={`curl -X POST ${urlBase} -H 'Content-Type: application/json' -d '{"ola":"mundo"}'`} rotulo="Copiar cURL de teste" />
            </div>
          )}
          <ul>
            {reqs.map((r) => (
              <li key={r.id}>
                <button type="button" aria-pressed={sel === r.id} onClick={() => setSel(r.id)}>
                  <span className="wh-met" style={{ background: corMetodo(r.metodo) }}>{r.metodo}</span>
                  <span className="wh-item-txt">
                    <code>{r.caminho}{r.query ? `?${r.query}` : ''}</code>
                    <small>{hora(r.criado_em)} · {tamanho(r.tamanho)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="wh-conteudo">
          {atual ? <Detalhe key={atual.id} r={atual} base={urlBase} /> : <p className="dv-dica">Escolha uma requisição na lista.</p>}
          <details className="dv-caixa wh-resposta">
            <summary>Resposta que a URL devolve: <b>{resposta.status}</b> · {resposta.tipo}</summary>
            <div className="dv-barra">
              <label className="dv-check">Status <input className="dv-input dv-num" type="number" min={200} max={599} value={resposta.status} onChange={(e) => setResposta({ ...resposta, status: +e.target.value })} /></label>
              <label className="dv-check">Content-Type <input className="dv-input" value={resposta.tipo} onChange={(e) => setResposta({ ...resposta, tipo: e.target.value })} style={{ width: 200 }} /></label>
            </div>
            <Codigo valor={resposta.corpo} onChange={(corpo) => setResposta({ ...resposta, corpo })} linhas={5} rotulo="Corpo da resposta" />
            <div className="dv-barra">
              <button type="button" className="dv-btn" onClick={salvarResposta}>Salvar resposta</button>
              <span className="dv-muted">{salvoResp}</span>
              <span className="dv-dica">Use 500 para testar se o serviço tenta de novo (retry).</span>
            </div>
          </details>
        </section>
      </div>
    </div>
  )
}
