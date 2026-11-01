'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { METODOS, STATUS, deCurl, dePostman, faltando, linhaVazia, montar, novaReq, paraCurl, paraFetch, paraPostman, paraPython, paramsDaUrl, tamanho, uid, urlComParams } from '@/lib/dev/http'
import { Codigo, Copiar, usePersistente } from './comum'

/* ------------------------------ dados iniciais ------------------------------ */
const EXEMPLOS = () => ({
  id: 'exemplos',
  nome: 'Exemplos (APIs públicas)',
  aberta: true,
  reqs: [
    novaReq({ nome: 'Listar posts', metodo: 'GET', url: '{{base_url}}/posts?userId=1', params: [{ k: 'userId', v: '1', on: true }] }),
    novaReq({ nome: 'Um post', metodo: 'GET', url: '{{base_url}}/posts/1' }),
    novaReq({ nome: 'Criar post', metodo: 'POST', url: '{{base_url}}/posts', body: { tipo: 'json', raw: '{\n  "title": "Olá do 4dev",\n  "body": "Testando o API Tester",\n  "userId": 1\n}', campos: [] } }),
    novaReq({ nome: 'Atualizar post', metodo: 'PATCH', url: '{{base_url}}/posts/1', body: { tipo: 'json', raw: '{\n  "title": "Título novo"\n}', campos: [] } }),
    novaReq({ nome: 'Apagar post', metodo: 'DELETE', url: '{{base_url}}/posts/1' }),
    novaReq({ nome: 'httpbin: eco dos headers', metodo: 'GET', url: 'https://httpbin.org/headers', headers: [{ k: 'X-Teste', v: '{{$guid}}', on: true }] }),
    novaReq({ nome: 'httpbin: Basic Auth', metodo: 'GET', url: 'https://httpbin.org/basic-auth/ana/1234', auth: { tipo: 'basic', token: '', user: 'ana', pass: '1234', key: 'X-API-Key', value: '', onde: 'header' } }),
    novaReq({ nome: 'httpbin: status 418', metodo: 'GET', url: 'https://httpbin.org/status/418' }),
  ],
})
const AMBIENTES = () => [{ id: 'amb-exemplo', nome: 'Exemplo', vars: [{ k: 'base_url', v: 'https://jsonplaceholder.typicode.com', on: true }, linhaVazia()] }]

const corMetodo = (m) => ({ GET: '#49cc90', POST: '#fca130', PUT: '#61affe', PATCH: '#50e3c2', DELETE: '#f93e3e', HEAD: '#9012fe', OPTIONS: '#0d5aa7' })[m] || '#999'
const corStatus = (s) => (!s ? '#f93e3e' : s < 300 ? '#49cc90' : s < 400 ? '#61affe' : s < 500 ? '#fca130' : '#f93e3e')

function baixar(nome, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ------------------------------ tabela chave/valor ------------------------------ */
function TabelaKV({ linhas, onChange, chave = 'Key', valor = 'Value', sugestoes }) {
  const lista = linhas.length && linhas[linhas.length - 1].k === '' && linhas[linhas.length - 1].v === '' ? linhas : [...linhas, linhaVazia()]
  const set = (i, campo, v) => {
    const nova = lista.map((l, j) => (j === i ? { ...l, [campo]: v } : l))
    onChange(nova.filter((l, j) => j === nova.length - 1 || l.k !== '' || l.v !== ''))
  }
  const listId = useMemo(() => `kv-${uid()}`, [])
  return (
    <table className="pm-kv">
      <thead>
        <tr><th aria-label="Ativo" /><th>{chave}</th><th>{valor}</th><th aria-label="Remover" /></tr>
      </thead>
      <tbody>
        {lista.map((l, i) => {
          const ultima = i === lista.length - 1
          return (
            <tr key={i} data-off={!l.on || undefined}>
              <td>{!ultima && <input type="checkbox" checked={l.on} onChange={(e) => set(i, 'on', e.target.checked)} aria-label="Ativar linha" />}</td>
              <td><input value={l.k} placeholder={ultima ? chave : ''} onChange={(e) => set(i, 'k', e.target.value)} list={sugestoes ? listId : undefined} spellCheck={false} /></td>
              <td><input value={l.v} placeholder={ultima ? valor : ''} onChange={(e) => set(i, 'v', e.target.value)} spellCheck={false} /></td>
              <td>{!ultima && <button type="button" className="pm-x" onClick={() => onChange(lista.filter((_, j) => j !== i && !(j === lista.length - 1)))} aria-label="Remover linha">✕</button>}</td>
            </tr>
          )
        })}
      </tbody>
      {sugestoes && (
        <datalist id={listId}>
          {sugestoes.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </table>
  )
}

const HEADERS_COMUNS = ['Accept', 'Accept-Language', 'Authorization', 'Cache-Control', 'Content-Type', 'Cookie', 'If-None-Match', 'Origin', 'User-Agent', 'X-API-Key', 'X-Request-Id']

/* ------------------------------ painel da requisição ------------------------------ */
function PainelReq({ req, set, vars }) {
  const [aba, setAba] = useState('params')
  const conta = (l) => l.filter((x) => x.on && x.k).length
  const abas = [
    ['params', 'Params', conta(req.params)],
    ['auth', 'Authorization', req.auth.tipo !== 'none' ? '●' : 0],
    ['headers', 'Headers', conta(req.headers)],
    ['body', 'Body', req.body.tipo !== 'none' ? '●' : 0],
  ]
  const falta = [...new Set([req.url, ...req.headers.map((h) => h.v), req.body.raw, req.auth.token].flatMap((t) => faltando(t || '', vars)))]
  return (
    <div className="pm-painel">
      <div className="pm-subabas" role="tablist">
        {abas.map(([id, nome, n]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}>
            {nome}
            {n ? <sup>{n}</sup> : null}
          </button>
        ))}
      </div>
      {falta.length > 0 && <p className="pm-falta">Variável sem valor no ambiente: {falta.map((f) => `{{${f}}}`).join(', ')}</p>}
      <div className="pm-painel-corpo">
        {aba === 'params' && (
          <>
            <p className="pm-titulo">Query Params</p>
            <TabelaKV linhas={req.params} onChange={(params) => set({ params, url: urlComParams(req.url, params) })} />
          </>
        )}
        {aba === 'auth' && (
          <div className="pm-auth">
            <label className="pm-campo">
              <span>Type</span>
              <select value={req.auth.tipo} onChange={(e) => set({ auth: { ...req.auth, tipo: e.target.value } })}>
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
              </select>
            </label>
            {req.auth.tipo === 'none' && <p className="pm-dica">Esta requisição não usa autenticação.</p>}
            {req.auth.tipo === 'bearer' && (
              <label className="pm-campo">
                <span>Token</span>
                <input value={req.auth.token} onChange={(e) => set({ auth: { ...req.auth, token: e.target.value } })} placeholder="eyJhbGciOi… ou {{token}}" spellCheck={false} />
              </label>
            )}
            {req.auth.tipo === 'basic' && (
              <>
                <label className="pm-campo"><span>Username</span><input value={req.auth.user} onChange={(e) => set({ auth: { ...req.auth, user: e.target.value } })} spellCheck={false} /></label>
                <label className="pm-campo"><span>Password</span><input type="password" value={req.auth.pass} onChange={(e) => set({ auth: { ...req.auth, pass: e.target.value } })} /></label>
              </>
            )}
            {req.auth.tipo === 'apikey' && (
              <>
                <label className="pm-campo"><span>Key</span><input value={req.auth.key} onChange={(e) => set({ auth: { ...req.auth, key: e.target.value } })} spellCheck={false} /></label>
                <label className="pm-campo"><span>Value</span><input value={req.auth.value} onChange={(e) => set({ auth: { ...req.auth, value: e.target.value } })} spellCheck={false} /></label>
                <label className="pm-campo">
                  <span>Add to</span>
                  <select value={req.auth.onde} onChange={(e) => set({ auth: { ...req.auth, onde: e.target.value } })}>
                    <option value="header">Header</option>
                    <option value="query">Query Params</option>
                  </select>
                </label>
              </>
            )}
          </div>
        )}
        {aba === 'headers' && (
          <>
            <p className="pm-titulo">Headers</p>
            <TabelaKV linhas={req.headers} onChange={(headers) => set({ headers })} sugestoes={HEADERS_COMUNS} />
            <p className="pm-dica">Content-Type e Authorization são colocados sozinhos pelas abas Body e Authorization. O navegador não deixa mudar alguns headers (Host, Cookie, Origin, User-Agent).</p>
          </>
        )}
        {aba === 'body' && (
          <>
            <div className="pm-radios" role="radiogroup" aria-label="Tipo do body">
              {[['none', 'none'], ['form', 'form-data'], ['urlencoded', 'x-www-form-urlencoded'], ['json', 'raw · JSON'], ['text', 'raw · Text']].map(([v, n]) => (
                <label key={v}>
                  <input type="radio" name={`body-${req.id}`} checked={req.body.tipo === v} onChange={() => set({ body: { ...req.body, tipo: v } })} />
                  {n}
                </label>
              ))}
              {req.body.tipo === 'json' && (
                <button
                  type="button"
                  className="pm-link"
                  onClick={() => {
                    try {
                      set({ body: { ...req.body, raw: JSON.stringify(JSON.parse(req.body.raw), null, 2) } })
                    } catch {}
                  }}
                >
                  Beautify
                </button>
              )}
            </div>
            {(req.metodo === 'GET' || req.metodo === 'HEAD') && req.body.tipo !== 'none' && <p className="pm-falta">{req.metodo} não envia body; mude o método para POST, PUT ou PATCH.</p>}
            {req.body.tipo === 'none' && <p className="pm-dica">Esta requisição não tem body.</p>}
            {(req.body.tipo === 'json' || req.body.tipo === 'text') && (
              <Codigo valor={req.body.raw} onChange={(raw) => set({ body: { ...req.body, raw } })} linhas={9} rotulo="Body" placeholder={req.body.tipo === 'json' ? '{\n  "chave": "valor"\n}' : 'Texto…'} />
            )}
            {(req.body.tipo === 'urlencoded' || req.body.tipo === 'form') && <TabelaKV linhas={req.body.campos} onChange={(campos) => set({ body: { ...req.body, campos } })} />}
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ painel da resposta ------------------------------ */
function realcarJson(txt) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return esc(txt).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (m, str, dois, lit) => {
    if (str) return dois ? `<span class="pm-jk">${str}</span>${dois}` : `<span class="pm-js">${str}</span>`
    if (lit) return `<span class="pm-jl">${m}</span>`
    return `<span class="pm-jn">${m}</span>`
  })
}

function PainelResp({ resp, enviando, onCancelar, montado }) {
  const [aba, setAba] = useState('body')
  const [modo, setModo] = useState('pretty')
  const [lingua, setLingua] = useState('curl')
  // chegou resposta nova: mostra o corpo (como o Postman)
  useEffect(() => {
    if (resp || enviando) setAba((a) => (a === 'code' ? 'body' : a))
  }, [resp, enviando])
  const codigo = montado ? (lingua === 'curl' ? paraCurl(montado) : lingua === 'fetch' ? paraFetch(montado) : paraPython(montado)) : ''

  let corpo = null
  if (resp?.ok !== undefined) {
    const ehJson = /json/i.test(resp.tipo) || /^\s*[[{]/.test(resp.texto || '')
    let pretty = resp.texto
    if (ehJson) {
      try {
        pretty = JSON.stringify(JSON.parse(resp.texto), null, 2)
      } catch {}
    }
    if (aba === 'body') {
      if (resp.imagem) corpo = <div className="pm-preview-img"><img src={resp.imagem} alt="Imagem da resposta" /></div>
      else if (modo === 'preview' && /html/i.test(resp.tipo)) corpo = <iframe className="pm-preview" sandbox="" srcDoc={resp.texto} title="Prévia do HTML" />
      else if (modo === 'pretty' && ehJson) corpo = <pre className="pm-corpo" dangerouslySetInnerHTML={{ __html: realcarJson(pretty) }} />
      else corpo = <pre className="pm-corpo">{resp.texto || <span className="pm-dica">(corpo vazio)</span>}</pre>
    }
  }

  return (
    <div className="pm-resp">
      <div className="pm-resp-topo">
        <div className="pm-subabas" role="tablist">
          {[['body', 'Body'], ['headers', `Headers${resp?.headers ? ` (${resp.headers.length})` : ''}`], ['code', 'Code']].map(([id, n]) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}>{n}</button>
          ))}
        </div>
        <span className="dv-espaco" />
        {resp?.ok !== undefined && (
          <div className="pm-metricas">
            <span>Status: <b style={{ color: corStatus(resp.status) }}>{resp.status} {resp.statusText || STATUS[resp.status] || ''}</b></span>
            <span>Time: <b style={{ color: '#49cc90' }}>{resp.ms} ms</b></span>
            <span>Size: <b style={{ color: '#49cc90' }}>{tamanho(resp.bytes)}</b></span>
          </div>
        )}
      </div>

      {enviando ? (
        <div className="pm-vazio">
          <span className="pm-girando" aria-hidden="true" />
          <p>Enviando requisição…</p>
          <button type="button" className="pm-btn-sec" onClick={onCancelar}>Cancelar</button>
        </div>
      ) : aba === 'code' ? (
        <div className="pm-code">
          <div className="pm-barra">
            <select value={lingua} onChange={(e) => setLingua(e.target.value)} aria-label="Linguagem">
              <option value="curl">cURL</option>
              <option value="fetch">JavaScript · fetch</option>
              <option value="python">Python · requests</option>
            </select>
            <span className="dv-espaco" />
            <Copiar texto={codigo} />
          </div>
          <pre className="pm-corpo">{codigo || 'Digite uma URL.'}</pre>
        </div>
      ) : resp?.erro ? (
        <div className="pm-erro">
          <p className="pm-erro-t">Não foi possível obter resposta</p>
          <p>{resp.erro}</p>
          {resp.dicas?.map((d) => <p key={d} className="pm-dica">• {d}</p>)}
          {montado && (
            <div className="pm-barra">
              <span className="pm-dica">Rode no terminal (sem CORS):</span>
              <Copiar texto={paraCurl(montado)} rotulo="Copiar como cURL" />
            </div>
          )}
        </div>
      ) : !resp ? (
        <div className="pm-vazio">
          <div className="pm-astronauta" aria-hidden="true">🚀</div>
          <p>Escreva a URL e clique em <b>Send</b> para ver a resposta.</p>
          <p className="pm-dica">Ctrl + Enter também envia.</p>
        </div>
      ) : aba === 'headers' ? (
        <>
          <table className="pm-kv pm-kv-ro">
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>
              {resp.headers.map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="pm-dica">O navegador só mostra os headers que a API libera em Access-Control-Expose-Headers.</p>
        </>
      ) : (
        <>
          <div className="pm-barra">
            <div className="pm-modos" role="radiogroup" aria-label="Formato">
              {['pretty', 'raw', 'preview'].map((m) => (
                <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => setModo(m)}>{m[0].toUpperCase() + m.slice(1)}</button>
              ))}
            </div>
            <span className="pm-dica">{resp.tipo || 'sem content-type'}</span>
            <span className="dv-espaco" />
            <Copiar texto={resp.texto || ''} />
          </div>
          {corpo}
        </>
      )}
    </div>
  )
}

/* ------------------------------ principal ------------------------------ */
export default function ApiTester() {
  const [colecoes, setColecoes] = usePersistente('4dev-api-colecoes', [EXEMPLOS()])
  const [ambientes, setAmbientes] = usePersistente('4dev-api-ambientes', AMBIENTES())
  const [ambAtivo, setAmbAtivo] = usePersistente('4dev-api-amb', 'amb-exemplo')
  const [historico, setHistorico] = usePersistente('4dev-api-hist', [])
  const [abas, setAbas] = usePersistente('4dev-api-abas', [{ req: { ...EXEMPLOS().reqs[0] }, origem: null, sujo: false }])
  const [ativa, setAtiva] = usePersistente('4dev-api-ativa', 0)
  const [lado, setLado] = useState('colecoes')
  const [respostas, setRespostas] = useState({})
  const [enviando, setEnviando] = useState(null)
  const [modal, setModal] = useState(null) // 'curl' | 'salvar' | 'ambiente'
  const [ladoAberto, setLadoAberto] = useState(true)
  const ctrl = useRef(null)
  const celular = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  useEffect(() => {
    if (celular()) setLadoAberto(false)
  }, [])

  const idx = Math.min(ativa, abas.length - 1)
  const aba = abas[idx]
  const req = aba?.req
  const amb = ambientes.find((a) => a.id === ambAtivo)
  const vars = useMemo(() => Object.fromEntries((amb?.vars || []).filter((v) => v.on && v.k).map((v) => [v.k, v.v])), [amb])
  const montado = useMemo(() => (req?.url ? montar(req, vars) : null), [req, vars])

  const setReq = useCallback(
    (parcial) => setAbas((l) => l.map((a, i) => (i === idx ? { ...a, req: { ...a.req, ...parcial }, sujo: true } : a))),
    [idx, setAbas],
  )
  const abrir = (r, origem = null) => {
    if (celular()) setLadoAberto(false)
    const ja = abas.findIndex((a) => a.req.id === r.id)
    if (ja >= 0) return setAtiva(ja)
    setAbas((l) => [...l, { req: structuredClone(r), origem, sujo: false }])
    setAtiva(abas.length)
  }
  const fecharAba = (i) => {
    if (abas[i].sujo && !confirm('Fechar sem salvar as alterações?')) return
    const nova = abas.filter((_, j) => j !== i)
    setAbas(nova.length ? nova : [{ req: novaReq(), origem: null, sujo: false }])
    setAtiva(Math.max(0, i <= idx ? idx - 1 : idx))
  }

  const enviar = useCallback(async () => {
    if (!req?.url.trim() || enviando) return
    const m = montar(req, vars)
    let u
    try {
      u = new URL(m.url)
    } catch {
      setRespostas((r) => ({ ...r, [req.id]: { erro: `URL inválida: ${m.url}`, dicas: [] } }))
      return
    }
    const c = new AbortController()
    ctrl.current = c
    setEnviando(req.id)
    const t0 = performance.now()
    let resp
    try {
      const r = await fetch(m.url, { method: m.metodo, headers: m.headers, body: m.body, signal: c.signal, redirect: 'follow', cache: 'no-store' })
      const buf = await r.arrayBuffer()
      const ms = Math.round(performance.now() - t0)
      const tipo = r.headers.get('content-type') || ''
      const headers = [...r.headers.entries()]
      let texto = ''
      let imagem = null
      if (/^image\//i.test(tipo)) imagem = URL.createObjectURL(new Blob([buf], { type: tipo }))
      else texto = new TextDecoder().decode(buf)
      resp = { ok: r.ok, status: r.status, statusText: r.statusText, ms, bytes: buf.byteLength, tipo, headers, texto, imagem }
    } catch (e) {
      const ms = Math.round(performance.now() - t0)
      const dicas = []
      if (e.name === 'AbortError') resp = { erro: 'Requisição cancelada.', dicas }
      else {
        if (location.protocol === 'https:' && u.protocol === 'http:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname)) dicas.push('A página é HTTPS e a URL é HTTP: o navegador bloqueia (mixed content). Use https://.')
        dicas.push('Bloqueio de CORS: a API precisa responder com Access-Control-Allow-Origin para este site (ou *). APIs de servidor (sem CORS) só funcionam pelo terminal ou backend.')
        dicas.push('Servidor fora do ar, endereço errado ou sem internet.')
        if (/^(localhost|127\.)/.test(u.hostname)) dicas.push('Para localhost, confira se a sua API está rodando e libera CORS.')
        resp = { erro: `${e.message} (${ms} ms)`, dicas }
      }
    }
    setRespostas((r) => ({ ...r, [req.id]: resp }))
    setEnviando(null)
    setHistorico((h) => [{ id: uid(), req: structuredClone(req), status: resp.status ?? 0, ms: resp.ms ?? 0, quando: Date.now() }, ...h].slice(0, 60))
  }, [req, vars, enviando, setHistorico])

  useEffect(() => {
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        enviar()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && document.querySelector('.pm')) {
        e.preventDefault()
        salvar()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const salvar = (colId, nomeNovo, novaColecao) => {
    const destino = novaColecao ? uid() : colId || aba.origem
    if (!destino) return setModal('salvar')
    const r = structuredClone(nomeNovo ? { ...req, nome: nomeNovo } : req)
    setColecoes((cs) => {
      const lista = novaColecao ? [...cs, { id: destino, nome: novaColecao, aberta: true, reqs: [] }] : cs
      return lista.map((c) => {
        if (c.id !== destino) return c
        const existe = c.reqs.some((x) => x.id === r.id)
        return { ...c, aberta: true, reqs: existe ? c.reqs.map((x) => (x.id === r.id ? r : x)) : [...c.reqs, r] }
      })
    })
    setAbas((l) => l.map((x, i) => (i === idx ? { ...x, req: r, origem: destino, sujo: false } : x)))
  }

  const importarArquivo = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    f.text().then((t) => {
      try {
        const c = dePostman(t)
        setColecoes((cs) => [...cs, { id: uid(), nome: c.nome, aberta: true, reqs: c.reqs }])
        if (c.vars.length) setAmbientes((as) => [...as, { id: uid(), nome: `${c.nome} (variáveis)`, vars: c.vars }])
        setLado('colecoes')
      } catch (er) {
        alert(er.message)
      }
    })
  }

  const resp = req ? respostas[req.id] : null

  return (
    <div className="pm" data-lado={ladoAberto || undefined}>
      {/* barra superior */}
      <div className="pm-topo">
        <button type="button" className="pm-ic" onClick={() => setLadoAberto((v) => !v)} aria-label="Mostrar/ocultar barra lateral" title="Barra lateral">☰</button>
        <button type="button" className="pm-btn-sec" onClick={() => abrir(novaReq())}>＋ New</button>
        <button type="button" className="pm-btn-sec" onClick={() => setModal('curl')}>Import</button>
        <span className="dv-espaco" />
        <select className="pm-amb" value={ambAtivo || ''} onChange={(e) => setAmbAtivo(e.target.value)} aria-label="Ambiente">
          <option value="">No Environment</option>
          {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <button type="button" className="pm-ic" onClick={() => setModal('ambiente')} aria-label="Editar ambientes" title="Variáveis do ambiente">👁</button>
      </div>

      <div className="pm-corpo-geral">
        {/* barra lateral */}
        {ladoAberto && (
          <aside className="pm-lado">
            <div className="pm-lado-abas" role="tablist">
              {[['colecoes', '🗂', 'Collections'], ['ambientes', '🌐', 'Environments'], ['historico', '🕘', 'History']].map(([id, ic, n]) => (
                <button key={id} type="button" role="tab" aria-selected={lado === id} onClick={() => setLado(id)} title={n}>
                  <span aria-hidden="true">{ic}</span>
                  <small>{n}</small>
                </button>
              ))}
            </div>
            <div className="pm-lado-lista">
              {lado === 'colecoes' && (
                <>
                  <div className="pm-lado-acoes">
                    <button type="button" className="pm-link" onClick={() => { const n = prompt('Nome da coleção:'); if (n) setColecoes((cs) => [...cs, { id: uid(), nome: n, aberta: true, reqs: [] }]) }}>＋ Coleção</button>
                    <label className="pm-link">Importar Postman<input type="file" accept=".json" hidden onChange={importarArquivo} /></label>
                  </div>
                  {colecoes.map((c) => (
                    <div key={c.id} className="pm-col">
                      <div className="pm-col-cab">
                        <button type="button" className="pm-col-nome" onClick={() => setColecoes((cs) => cs.map((x) => (x.id === c.id ? { ...x, aberta: !x.aberta } : x)))}>
                          <span aria-hidden="true">{c.aberta ? '▾' : '▸'}</span> {c.nome}
                        </button>
                        <button type="button" className="pm-x" title="Exportar (Postman v2.1)" onClick={() => baixar(`${c.nome}.postman_collection.json`, JSON.stringify(paraPostman(c), null, 2))}>⤓</button>
                        <button type="button" className="pm-x" title="Apagar coleção" onClick={() => confirm(`Apagar a coleção “${c.nome}”?`) && setColecoes((cs) => cs.filter((x) => x.id !== c.id))}>✕</button>
                      </div>
                      {c.aberta && (
                        <ul>
                          {c.reqs.map((r) => (
                            <li key={r.id} data-ativa={req?.id === r.id || undefined}>
                              <button type="button" onClick={() => abrir(r, c.id)}>
                                <span className="pm-met" style={{ color: corMetodo(r.metodo) }}>{r.metodo === 'DELETE' ? 'DEL' : r.metodo.slice(0, 4)}</span>
                                <span className="pm-req-nome">{r.nome}</span>
                              </button>
                              <button type="button" className="pm-x" title="Apagar" onClick={() => setColecoes((cs) => cs.map((x) => (x.id === c.id ? { ...x, reqs: x.reqs.filter((y) => y.id !== r.id) } : x)))}>✕</button>
                            </li>
                          ))}
                          {!c.reqs.length && <li className="pm-dica">Vazia. Salve uma requisição aqui (Ctrl+S).</li>}
                        </ul>
                      )}
                    </div>
                  ))}
                </>
              )}
              {lado === 'ambientes' && (
                <>
                  <div className="pm-lado-acoes">
                    <button type="button" className="pm-link" onClick={() => { const n = prompt('Nome do ambiente:', 'Desenvolvimento'); if (n) { const id = uid(); setAmbientes((as) => [...as, { id, nome: n, vars: [] }]); setAmbAtivo(id); setModal('ambiente') } }}>＋ Ambiente</button>
                  </div>
                  <ul>
                    {ambientes.map((a) => (
                      <li key={a.id} data-ativa={a.id === ambAtivo || undefined}>
                        <button type="button" onClick={() => { setAmbAtivo(a.id); setModal('ambiente') }}>
                          <span aria-hidden="true">{a.id === ambAtivo ? '✓' : '·'}</span>
                          <span className="pm-req-nome">{a.nome}</span>
                        </button>
                        <button type="button" className="pm-x" onClick={() => confirm(`Apagar “${a.nome}”?`) && setAmbientes((as) => as.filter((x) => x.id !== a.id))}>✕</button>
                      </li>
                    ))}
                  </ul>
                  <p className="pm-dica">Use {'{{nome}}'} na URL, headers, body e auth. Também existem {'{{$guid}}'}, {'{{$timestamp}}'} e {'{{$randomInt}}'}.</p>
                </>
              )}
              {lado === 'historico' && (
                <>
                  {historico.length > 0 && (
                    <div className="pm-lado-acoes"><button type="button" className="pm-link" onClick={() => setHistorico([])}>Limpar histórico</button></div>
                  )}
                  <ul>
                    {historico.map((h) => (
                      <li key={h.id}>
                        <button type="button" onClick={() => abrir({ ...h.req, id: uid() })} title={h.req.url}>
                          <span className="pm-met" style={{ color: corMetodo(h.req.metodo) }}>{h.req.metodo === 'DELETE' ? 'DEL' : h.req.metodo.slice(0, 4)}</span>
                          <span className="pm-req-nome">{h.req.url.replace(/^https?:\/\//, '')}</span>
                          <small style={{ color: corStatus(h.status) }}>{h.status || 'ERR'}</small>
                        </button>
                      </li>
                    ))}
                    {!historico.length && <li className="pm-dica">As requisições enviadas aparecem aqui.</li>}
                  </ul>
                </>
              )}
            </div>
          </aside>
        )}

        {/* área principal */}
        <div className="pm-main">
          <div className="pm-abas" role="tablist">
            {abas.map((a, i) => (
              <div key={a.req.id} className="pm-aba" data-ativa={i === idx || undefined}>
                <button type="button" role="tab" aria-selected={i === idx} onClick={() => setAtiva(i)} title={a.req.url}>
                  <span className="pm-met" style={{ color: corMetodo(a.req.metodo) }}>{a.req.metodo === 'DELETE' ? 'DEL' : a.req.metodo}</span>
                  <span className="pm-req-nome">{a.req.nome}</span>
                  {a.sujo && <span className="pm-sujo" title="Não salvo">●</span>}
                </button>
                <button type="button" className="pm-x" onClick={() => fecharAba(i)} aria-label="Fechar aba">✕</button>
              </div>
            ))}
            <button type="button" className="pm-aba-nova" onClick={() => abrir(novaReq())} aria-label="Nova aba">＋</button>
          </div>

          {req && (
            <>
              <div className="pm-nome-linha">
                <input className="pm-nome" value={req.nome} onChange={(e) => setReq({ nome: e.target.value })} aria-label="Nome da requisição" />
                <span className="dv-espaco" />
                <button type="button" className="pm-btn-sec" onClick={() => salvar()}>💾 Save</button>
              </div>
              <div className="pm-linha-url">
                <select className="pm-metodo" value={req.metodo} onChange={(e) => setReq({ metodo: e.target.value })} style={{ color: corMetodo(req.metodo) }} aria-label="Método">
                  {METODOS.map((m) => <option key={m} value={m} style={{ color: corMetodo(m) }}>{m}</option>)}
                </select>
                <input
                  className="pm-url"
                  value={req.url}
                  onChange={(e) => setReq({ url: e.target.value, params: [...paramsDaUrl(e.target.value), ...req.params.filter((p) => !p.on)] })}
                  onKeyDown={(e) => e.key === 'Enter' && enviar()}
                  placeholder="Enter URL or paste text"
                  spellCheck={false}
                  aria-label="URL"
                  onPaste={(e) => {
                    const t = e.clipboardData.getData('text')
                    if (/^\s*curl\s/.test(t)) {
                      e.preventDefault()
                      try {
                        const n = deCurl(t)
                        setReq({ ...n, id: req.id, nome: req.nome === 'Nova requisição' ? n.nome : req.nome })
                      } catch {}
                    }
                  }}
                />
                <button type="button" className="pm-send" onClick={enviando ? () => ctrl.current?.abort() : enviar} disabled={!req.url.trim()}>
                  {enviando === req.id ? 'Cancel' : 'Send'}
                </button>
              </div>
              <div className="pm-split">
                <PainelReq req={req} set={setReq} vars={vars} />
                <PainelResp resp={resp} enviando={enviando === req.id} onCancelar={() => ctrl.current?.abort()} montado={montado} />
              </div>
            </>
          )}
        </div>
      </div>

      {modal === 'curl' && <ModalCurl onFechar={() => setModal(null)} onImportar={(r) => { abrir(r); setModal(null) }} />}
      {modal === 'salvar' && (
        <ModalSalvar
          colecoes={colecoes}
          nome={req.nome}
          onFechar={() => setModal(null)}
          onSalvar={(colId, nome, nova) => {
            salvar(colId, nome, nova)
            setModal(null)
          }}
        />
      )}
      {modal === 'ambiente' && amb && (
        <div className="pm-modal" role="dialog" aria-modal="true" aria-label="Ambiente" onClick={() => setModal(null)}>
          <div className="pm-modal-caixa" onClick={(e) => e.stopPropagation()}>
            <input className="pm-nome" value={amb.nome} onChange={(e) => setAmbientes((as) => as.map((a) => (a.id === amb.id ? { ...a, nome: e.target.value } : a)))} aria-label="Nome do ambiente" />
            <TabelaKV chave="Variable" valor="Current value" linhas={amb.vars} onChange={(v) => setAmbientes((as) => as.map((a) => (a.id === amb.id ? { ...a, vars: v } : a)))} />
            <p className="pm-dica">As variáveis ficam só neste navegador.</p>
            <div className="pm-barra"><span className="dv-espaco" /><button type="button" className="pm-send" onClick={() => setModal(null)}>Pronto</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalCurl({ onFechar, onImportar }) {
  const [t, setT] = useState('')
  const [erro, setErro] = useState('')
  return (
    <div className="pm-modal" role="dialog" aria-modal="true" aria-label="Importar" onClick={onFechar}>
      <div className="pm-modal-caixa" onClick={(e) => e.stopPropagation()}>
        <h3>Import</h3>
        <p className="pm-dica">Cole um comando cURL (do “Copy as cURL” do DevTools, por exemplo). Para coleções do Postman, use “Importar Postman” na barra lateral.</p>
        <Codigo valor={t} onChange={setT} linhas={8} rotulo="cURL" placeholder={"curl -X POST 'https://api.exemplo.com/v1/itens' \\\n  -H 'Authorization: Bearer abc' \\\n  -H 'Content-Type: application/json' \\\n  --data-raw '{\"nome\":\"teste\"}'"} />
        {erro && <p className="pm-falta">{erro}</p>}
        <div className="pm-barra">
          <span className="dv-espaco" />
          <button type="button" className="pm-btn-sec" onClick={onFechar}>Cancelar</button>
          <button
            type="button"
            className="pm-send"
            onClick={() => {
              try {
                onImportar(deCurl(t))
              } catch (e) {
                setErro(e.message)
              }
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalSalvar({ colecoes, nome, onFechar, onSalvar }) {
  const [n, setN] = useState(nome)
  const [col, setCol] = useState(colecoes[0]?.id || '')
  const [nova, setNova] = useState('')
  return (
    <div className="pm-modal" role="dialog" aria-modal="true" aria-label="Salvar requisição" onClick={onFechar}>
      <div className="pm-modal-caixa" onClick={(e) => e.stopPropagation()}>
        <h3>Save request</h3>
        <label className="pm-campo"><span>Request name</span><input value={n} onChange={(e) => setN(e.target.value)} autoFocus /></label>
        <label className="pm-campo">
          <span>Save to</span>
          <select value={col} onChange={(e) => setCol(e.target.value)}>
            {colecoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            <option value="__nova">＋ Nova coleção…</option>
          </select>
        </label>
        {col === '__nova' && <label className="pm-campo"><span>Nome da coleção</span><input value={nova} onChange={(e) => setNova(e.target.value)} /></label>}
        <div className="pm-barra">
          <span className="dv-espaco" />
          <button type="button" className="pm-btn-sec" onClick={onFechar}>Cancel</button>
          <button type="button" className="pm-send" disabled={!n.trim() || (col === '__nova' && !nova.trim())} onClick={() => onSalvar(col === '__nova' ? null : col, n.trim(), col === '__nova' ? nova.trim() : null)}>Save</button>
        </div>
      </div>
    </div>
  )
}
