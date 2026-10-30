'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { getToken, setToken, temBackend, vc } from '@/lib/vinicut/api'

const fmt = (ms) => {
  try {
    return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function Vinicut() {
  const pathname = usePathname()
  const router = useRouter()
  const sp = useSearchParams()
  const [eu, setEu] = useState(undefined) // undefined=carregando, null=deslogado
  const [contadores, setContadores] = useState(null)

  const carregarEu = useCallback(async () => {
    if (!getToken()) { setEu(null); return }
    try {
      const d = await vc('/eu')
      setEu(d.perfil || null)
      setContadores(d.contadores || null)
    } catch {
      setToken('')
      setEu(null)
    }
  }, [])

  useEffect(() => { carregarEu() }, [carregarEu])

  // Esconde o cabeçalho/rodapé do soudev enquanto o Vinicut está aberto (fica imersivo).
  useEffect(() => {
    document.documentElement.classList.add('vc-full')
    return () => document.documentElement.classList.remove('vc-full')
  }, [])

  const sair = async () => {
    try { await vc('/sair', { metodo: 'POST' }) } catch {}
    setToken('')
    setEu(null)
    router.push('/vinicut')
  }

  if (!temBackend()) {
    return (
      <div className="vc-tela">
        <div className="vc-card" style={{ maxWidth: 440, margin: '40px auto' }}>
          <h2>Vinicut</h2>
          <p>O Vinicut precisa da variável <code>NEXT_PUBLIC_IDEIAS_API</code> configurada na Vercel.</p>
        </div>
      </div>
    )
  }
  if (eu === undefined) return <div className="vc-tela"><p className="vc-carregando">Carregando o Vinicut…</p></div>
  if (!eu) return <Entrar aoEntrar={(perfil) => { setEu(perfil); carregarEu() }} />

  const seg = pathname.replace(/^\/vinicut\/?/, '').split('/').filter(Boolean)
  let conteudo
  if (seg.length === 0) conteudo = <Inicio eu={eu} contadores={contadores} navegar={router.push} />
  else if (seg[0] === 'perfil') conteudo = <EditarPerfil eu={eu} aoSalvar={(p) => { setEu(p); router.push(`/vinicut/u/${p.usuario}`) }} />
  else if (seg[0] === 'pessoas') conteudo = <Pessoas navegar={router.push} inicial={sp.get('q') || ''} />
  else if (seg[0] === 'u' && seg[1]) conteudo = <PerfilView key={seg[1]} usuario={seg[1]} eu={eu} navegar={router.push} />
  else if (seg[0] === 'comunidades') conteudo = <Comunidades navegar={router.push} />
  else if (seg[0] === 'c' && seg[1]) conteudo = <Comunidade key={seg[1]} id={seg[1]} eu={eu} navegar={router.push} />
  else if (seg[0] === 't' && seg[1]) conteudo = <Topico key={seg[1]} id={seg[1]} eu={eu} navegar={router.push} />
  else conteudo = <p className="vc-card">Página não encontrada. <a href="/vinicut">Voltar ao início</a></p>

  return (
    <div className="vc-tela">
      <header className="vc-topo">
        <div className="vc-topo-in">
          <a className="vc-logo" href="/vinicut" onClick={nav(router, '/vinicut')}>vini<span>cut</span></a>
          <nav className="vc-nav">
            <a href="/vinicut" onClick={nav(router, '/vinicut')}>Início</a>
            <a href={`/vinicut/u/${eu.usuario}`} onClick={nav(router, `/vinicut/u/${eu.usuario}`)}>Meu perfil</a>
            <a href="/vinicut/pessoas" onClick={nav(router, '/vinicut/pessoas')}>Pessoas</a>
            <a href="/vinicut/comunidades" onClick={nav(router, '/vinicut/comunidades')}>Comunidades</a>
          </nav>
          <BuscaTopo navegar={router.push} />
          <div className="vc-eu">
            <b>{eu.nome}</b>
            <button type="button" onClick={sair}>sair</button>
          </div>
        </div>
      </header>
      <main className="vc-conteudo">{conteudo}</main>
      <footer className="vc-rodape">Vinicut · rede social de brincadeira, no estilo Orkut · só texto</footer>
    </div>
  )
}

function nav(router, to) {
  return (e) => { e.preventDefault(); router.push(to) }
}

/* ------------------------------- entrar ------------------------------- */
function Entrar({ aoEntrar }) {
  const [modo, setModo] = useState('login')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      const d = modo === 'login'
        ? await vc('/login', { metodo: 'POST', corpo: { usuario, senha } })
        : await vc('/cadastro', { metodo: 'POST', corpo: { usuario, senha, nome } })
      setToken(d.token)
      aoEntrar(d.perfil)
    } catch (err) {
      setErro(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="vc-entrar">
      <div className="vc-entrar-marca">
        <h1>vini<span>cut</span></h1>
        <p>Conecte-se aos seus amigos e conheça gente nova.<br />Recados, depoimentos e comunidades — só texto, de brincadeira.</p>
      </div>
      <div className="vc-card vc-entrar-box">
        <div className="vc-abas">
          <button type="button" className={modo === 'login' ? 'on' : ''} onClick={() => { setModo('login'); setErro('') }}>Entrar</button>
          <button type="button" className={modo === 'cadastro' ? 'on' : ''} onClick={() => { setModo('cadastro'); setErro('') }}>Criar conta</button>
        </div>
        <form onSubmit={enviar}>
          {modo === 'cadastro' && (
            <label>Seu nome<input value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} placeholder="Como vão te chamar" /></label>
          )}
          <label>Usuário<input value={usuario} maxLength={20} onChange={(e) => setUsuario(e.target.value.toLowerCase())} placeholder="ex.: vinicius" autoCapitalize="none" /></label>
          <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="sua senha" /></label>
          {erro && <p className="vc-erro">{erro}</p>}
          <button type="submit" className="vc-botao" disabled={ocupado}>{ocupado ? 'Aguarde…' : modo === 'login' ? 'Entrar' : 'Criar conta e entrar'}</button>
        </form>
        <p className="vc-dica">{modo === 'login' ? 'Não tem conta? Clique em “Criar conta”.' : 'Sem e-mail, sem complicação. Só escolher usuário e senha.'}</p>
      </div>
    </div>
  )
}

function BuscaTopo({ navegar }) {
  const [q, setQ] = useState('')
  return (
    <form className="vc-busca" onSubmit={(e) => { e.preventDefault(); navegar(`/vinicut/pessoas?q=${encodeURIComponent(q)}`) }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar pessoas" />
    </form>
  )
}

/* ------------------------------- início ------------------------------- */
function Inicio({ eu, contadores, navegar }) {
  const [recados, setRecados] = useState([])
  const [pessoas, setPessoas] = useState([])

  useEffect(() => {
    vc(`/u/${eu.usuario}/recados`).then((d) => setRecados(d.recados || [])).catch(() => {})
    vc('/pessoas').then((d) => setPessoas((d.pessoas || []).filter((p) => p.usuario !== eu.usuario).slice(0, 12))).catch(() => {})
  }, [eu.usuario])

  return (
    <div className="vc-grade">
      <aside className="vc-coluna">
        <div className="vc-card vc-perfil-mini">
          <div className="vc-avatar">{(eu.nome || eu.usuario).slice(0, 1).toUpperCase()}</div>
          <b>{eu.nome}</b>
          <span className="vc-user">@{eu.usuario}</span>
          {eu.status ? <p className="vc-status">“{eu.status}”</p> : <p className="vc-status vazio">sem recado no status</p>}
          <a className="vc-link" href={`/vinicut/u/${eu.usuario}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/u/${eu.usuario}`) }}>ver meu perfil</a>
          <a className="vc-link" href="/vinicut/perfil" onClick={(e) => { e.preventDefault(); navegar('/vinicut/perfil') }}>editar perfil</a>
        </div>
        {contadores && (
          <div className="vc-card vc-numeros">
            <span><b>{contadores.recados}</b> recados</span>
            <span><b>{contadores.amigos}</b> amigos</span>
            <span><b>{contadores.depoimentos}</b> depoimentos</span>
            <span><b>{contadores.comunidades}</b> comunidades</span>
          </div>
        )}
      </aside>

      <section className="vc-coluna vc-principal">
        <div className="vc-card">
          <h2 className="vc-titulo">Seus recados</h2>
          {recados.length === 0 ? <p className="vc-vazio">Nenhum recado ainda. Visite perfis e deixe recados que logo recebe de volta. 😉</p> : (
            <ul className="vc-recados">
              {recados.slice(0, 8).map((r) => (
                <li key={r.id}>
                  <a href={`/vinicut/u/${r.de_usuario}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/u/${r.de_usuario}`) }}>{r.de_nome}</a>
                  <span className="vc-data">{fmt(r.criado_em)}</span>
                  <p>{r.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="vc-card">
          <h2 className="vc-titulo">Gente no Vinicut</h2>
          <div className="vc-pessoas-grid">
            {pessoas.map((p) => (
              <a key={p.id} className="vc-pessoa" href={`/vinicut/u/${p.usuario}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/u/${p.usuario}`) }}>
                <div className="vc-avatar sm">{(p.nome || p.usuario).slice(0, 1).toUpperCase()}</div>
                <b>{p.nome}</b>
                <span>@{p.usuario}</span>
              </a>
            ))}
            {pessoas.length === 0 && <p className="vc-vazio">Você é dos primeiros por aqui!</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---------------------------- editar perfil --------------------------- */
function EditarPerfil({ eu, aoSalvar }) {
  const [f, setF] = useState({ nome: eu.nome || '', status: eu.status || '', quem_sou: eu.quem_sou || '', idade: eu.idade || '', cidade: eu.cidade || '', relacionamento: eu.relacionamento || '' })
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const salvar = async (e) => {
    e.preventDefault()
    setOcupado(true)
    setMsg('')
    try {
      const d = await vc('/perfil', { metodo: 'PATCH', corpo: f })
      setMsg('Perfil salvo!')
      aoSalvar(d.perfil)
    } catch (err) {
      setMsg(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="vc-card" style={{ maxWidth: 560 }}>
      <h2 className="vc-titulo">Editar perfil</h2>
      <form className="vc-form" onSubmit={salvar}>
        <label>Nome<input value={f.nome} maxLength={40} onChange={set('nome')} /></label>
        <label>Status (o recadinho do topo)<input value={f.status} maxLength={140} onChange={set('status')} placeholder="Ex.: saudades do Orkut" /></label>
        <label>Quem sou eu<textarea rows={5} value={f.quem_sou} maxLength={2000} onChange={set('quem_sou')} placeholder="Fale de você…" /></label>
        <div className="vc-form-linha">
          <label>Idade<input value={f.idade} maxLength={10} onChange={set('idade')} /></label>
          <label>Cidade<input value={f.cidade} maxLength={60} onChange={set('cidade')} /></label>
        </div>
        <label>Relacionamento<input value={f.relacionamento} maxLength={40} onChange={set('relacionamento')} placeholder="solteiro(a), namorando…" /></label>
        {msg && <p className={msg === 'Perfil salvo!' ? 'vc-ok' : 'vc-erro'}>{msg}</p>}
        <button type="submit" className="vc-botao" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar perfil'}</button>
      </form>
    </div>
  )
}

/* ------------------------------ pessoas ------------------------------- */
function Pessoas({ navegar, inicial }) {
  const [q, setQ] = useState(inicial)
  const [lista, setLista] = useState(null)
  const buscar = useCallback((termo) => {
    vc(`/pessoas${termo ? `?q=${encodeURIComponent(termo)}` : ''}`).then((d) => setLista(d.pessoas || [])).catch(() => setLista([]))
  }, [])
  useEffect(() => { buscar(inicial) }, [buscar, inicial])

  return (
    <div className="vc-card">
      <h2 className="vc-titulo">Pessoas</h2>
      <form className="vc-busca-grande" onSubmit={(e) => { e.preventDefault(); buscar(q) }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar por nome ou @usuário" />
        <button type="submit">buscar</button>
      </form>
      {lista === null ? <p className="vc-vazio">Carregando…</p> : (
        <div className="vc-pessoas-grid">
          {lista.map((p) => (
            <a key={p.id} className="vc-pessoa" href={`/vinicut/u/${p.usuario}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/u/${p.usuario}`) }}>
              <div className="vc-avatar sm">{(p.nome || p.usuario).slice(0, 1).toUpperCase()}</div>
              <b>{p.nome}</b>
              <span>@{p.usuario}</span>
              {p.cidade ? <small>{p.cidade}</small> : null}
            </a>
          ))}
          {lista.length === 0 && <p className="vc-vazio">Ninguém encontrado.</p>}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ perfil -------------------------------- */
function PerfilView({ usuario, eu, navegar }) {
  const [dados, setDados] = useState(null)
  const [recados, setRecados] = useState([])
  const [depoimentos, setDepoimentos] = useState([])
  const [amigos, setAmigos] = useState([])
  const [erro, setErro] = useState('')

  const recarregar = useCallback(() => {
    vc(`/u/${usuario}`).then(setDados).catch((e) => setErro(e.message))
    vc(`/u/${usuario}/recados`).then((d) => setRecados(d.recados || [])).catch(() => {})
    vc(`/u/${usuario}/depoimentos`).then((d) => setDepoimentos(d.depoimentos || [])).catch(() => {})
    vc(`/u/${usuario}/amigos`).then((d) => setAmigos(d.amigos || [])).catch(() => {})
  }, [usuario])
  useEffect(() => { recarregar() }, [recarregar])

  if (erro) return <p className="vc-card vc-erro">{erro}</p>
  if (!dados) return <p className="vc-card vc-vazio">Carregando perfil…</p>
  const p = dados.perfil
  const souEu = dados.sou_eu

  const amizade = async () => {
    try {
      await vc(`/u/${usuario}/amizade`, { metodo: dados.sou_amigo ? 'DELETE' : 'POST' })
      recarregar()
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="vc-grade">
      <aside className="vc-coluna">
        <div className="vc-card vc-perfil-mini">
          <div className="vc-avatar">{(p.nome || p.usuario).slice(0, 1).toUpperCase()}</div>
          <b>{p.nome}</b>
          <span className="vc-user">@{p.usuario}</span>
          {p.status && <p className="vc-status">“{p.status}”</p>}
          {!souEu && (
            <button type="button" className="vc-botao" onClick={amizade}>{dados.sou_amigo ? 'remover amigo' : 'adicionar amigo'}</button>
          )}
          {souEu && <a className="vc-link" href="/vinicut/perfil" onClick={(e) => { e.preventDefault(); navegar('/vinicut/perfil') }}>editar perfil</a>}
        </div>
        <div className="vc-card vc-numeros">
          <span><b>{dados.contadores.recados}</b> recados</span>
          <span><b>{dados.contadores.amigos}</b> amigos</span>
          <span><b>{dados.contadores.depoimentos}</b> depoimentos</span>
          <span><b>{dados.contadores.comunidades}</b> comunidades</span>
        </div>
        <div className="vc-card vc-sobre">
          <h3>sobre</h3>
          {p.idade && <p><b>Idade:</b> {p.idade}</p>}
          {p.cidade && <p><b>Cidade:</b> {p.cidade}</p>}
          {p.relacionamento && <p><b>Relacionamento:</b> {p.relacionamento}</p>}
          {p.quem_sou ? <p className="vc-quemsou">{p.quem_sou}</p> : <p className="vc-vazio">sem descrição ainda</p>}
        </div>
      </aside>

      <section className="vc-coluna vc-principal">
        <div className="vc-card vc-amigos">
          <h2 className="vc-titulo">amigos ({amigos.length})</h2>
          <div className="vc-pessoas-grid">
            {amigos.slice(0, 12).map((a) => (
              <a key={a.id} className="vc-pessoa" href={`/vinicut/u/${a.usuario}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/u/${a.usuario}`) }}>
                <div className="vc-avatar sm">{(a.nome || a.usuario).slice(0, 1).toUpperCase()}</div>
                <b>{a.nome}</b>
              </a>
            ))}
            {amigos.length === 0 && <p className="vc-vazio">sem amigos ainda</p>}
          </div>
        </div>

        <CaixaEnviar titulo="Recados" placeholder={`Deixe um recado para ${p.nome}…`} aoEnviar={async (texto) => { await vc(`/u/${usuario}/recados`, { metodo: 'POST', corpo: { texto } }); recarregar() }}>
          <Lista itens={recados} vazio="Nenhum recado ainda. Seja o primeiro!" navegar={navegar} />
        </CaixaEnviar>

        {!souEu && (
          <CaixaEnviar titulo="Depoimentos" placeholder={`Escreva um depoimento sobre ${p.nome}…`} aoEnviar={async (texto) => { await vc(`/u/${usuario}/depoimentos`, { metodo: 'POST', corpo: { texto } }); recarregar() }}>
            <Lista itens={depoimentos} vazio="Nenhum depoimento ainda." navegar={navegar} />
          </CaixaEnviar>
        )}
        {souEu && (
          <div className="vc-card">
            <h2 className="vc-titulo">Depoimentos</h2>
            <Lista itens={depoimentos} vazio="Ninguém escreveu um depoimento sobre você ainda." navegar={navegar} />
          </div>
        )}
      </section>
    </div>
  )
}

function CaixaEnviar({ titulo, placeholder, aoEnviar, children }) {
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const enviar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setOcupado(true)
    try { await aoEnviar(texto.trim()); setTexto('') } catch (err) { alert(err.message) } finally { setOcupado(false) }
  }
  return (
    <div className="vc-card">
      <h2 className="vc-titulo">{titulo}</h2>
      <form className="vc-enviar" onSubmit={enviar}>
        <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} />
        <button type="submit" className="vc-botao" disabled={ocupado || !texto.trim()}>{ocupado ? '…' : 'enviar'}</button>
      </form>
      {children}
    </div>
  )
}

function Lista({ itens, vazio, navegar }) {
  if (!itens.length) return <p className="vc-vazio">{vazio}</p>
  return (
    <ul className="vc-recados">
      {itens.map((r) => (
        <li key={r.id}>
          <a href={`/vinicut/u/${r.de_usuario}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/u/${r.de_usuario}`) }}>{r.de_nome}</a>
          <span className="vc-data">{fmt(r.criado_em)}</span>
          <p>{r.texto}</p>
        </li>
      ))}
    </ul>
  )
}

/* ---------------------------- comunidades ----------------------------- */
function Comunidades({ navegar }) {
  const [lista, setLista] = useState(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [criando, setCriando] = useState(false)

  const recarregar = () => vc('/comunidades').then((d) => setLista(d.comunidades || [])).catch(() => setLista([]))
  useEffect(() => { recarregar() }, [])

  const criar = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return
    setCriando(true)
    try {
      const d = await vc('/comunidades', { metodo: 'POST', corpo: { nome: nome.trim(), descricao: descricao.trim() } })
      navegar(`/vinicut/c/${d.id}`)
    } catch (err) { alert(err.message) } finally { setCriando(false) }
  }

  return (
    <div className="vc-grade">
      <aside className="vc-coluna">
        <div className="vc-card">
          <h2 className="vc-titulo">Criar comunidade</h2>
          <form className="vc-form" onSubmit={criar}>
            <label>Nome<input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Eu odeio acordar cedo" /></label>
            <label>Descrição<textarea rows={3} value={descricao} maxLength={1000} onChange={(e) => setDescricao(e.target.value)} /></label>
            <button type="submit" className="vc-botao" disabled={criando}>criar</button>
          </form>
        </div>
      </aside>
      <section className="vc-coluna vc-principal">
        <div className="vc-card">
          <h2 className="vc-titulo">Comunidades</h2>
          {lista === null ? <p className="vc-vazio">Carregando…</p> : lista.length === 0 ? <p className="vc-vazio">Nenhuma comunidade ainda. Crie a primeira!</p> : (
            <ul className="vc-comunidades">
              {lista.map((c) => (
                <li key={c.id}>
                  <a href={`/vinicut/c/${c.id}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/c/${c.id}`) }}>{c.nome}</a>
                  <span className="vc-data">{c.membros} membro(s)</span>
                  {c.descricao && <p>{c.descricao}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function Comunidade({ id, eu, navegar }) {
  const [d, setD] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [erro, setErro] = useState('')
  const recarregar = useCallback(() => { vc(`/c/${id}`).then(setD).catch((e) => setErro(e.message)) }, [id])
  useEffect(() => { recarregar() }, [recarregar])

  if (erro) return <p className="vc-card vc-erro">{erro}</p>
  if (!d) return <p className="vc-card vc-vazio">Carregando…</p>

  const participar = async () => { try { await vc(`/c/${id}/participar`, { metodo: 'POST' }); recarregar() } catch (e) { alert(e.message) } }
  const abrirTopico = async (e) => {
    e.preventDefault()
    if (!titulo.trim()) return
    try { const r = await vc(`/c/${id}/topicos`, { metodo: 'POST', corpo: { titulo: titulo.trim() } }); setTitulo(''); navegar(`/vinicut/t/${r.id}`) } catch (err) { alert(err.message) }
  }

  return (
    <div className="vc-card">
      <h2 className="vc-titulo">{d.comunidade.nome}</h2>
      {d.comunidade.descricao && <p className="vc-desc">{d.comunidade.descricao}</p>}
      <p className="vc-data">{d.membros} membro(s)</p>
      <button type="button" className="vc-botao" onClick={participar}>{d.sou_membro ? 'sair da comunidade' : 'participar'}</button>

      <h3 className="vc-sub">Fórum</h3>
      <form className="vc-enviar" onSubmit={abrirTopico}>
        <input value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} placeholder="Abrir um tópico novo…" />
        <button type="submit" className="vc-botao">abrir</button>
      </form>
      {d.topicos.length === 0 ? <p className="vc-vazio">Nenhum tópico ainda.</p> : (
        <ul className="vc-topicos">
          {d.topicos.map((t) => (
            <li key={t.id}>
              <a href={`/vinicut/t/${t.id}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/t/${t.id}`) }}>{t.titulo}</a>
              <span className="vc-data">por {t.autor_nome} · {fmt(t.criado_em)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Topico({ id, eu, navegar }) {
  const [d, setD] = useState(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const recarregar = useCallback(() => { vc(`/t/${id}`).then(setD).catch((e) => setErro(e.message)) }, [id])
  useEffect(() => { recarregar() }, [recarregar])

  if (erro) return <p className="vc-card vc-erro">{erro}</p>
  if (!d) return <p className="vc-card vc-vazio">Carregando…</p>

  const responder = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    try { await vc(`/t/${id}/respostas`, { metodo: 'POST', corpo: { texto: texto.trim() } }); setTexto(''); recarregar() } catch (err) { alert(err.message) }
  }

  return (
    <div className="vc-card">
      <a className="vc-voltar" href={`/vinicut/c/${d.topico.comunidade_id}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/c/${d.topico.comunidade_id}`) }}>← voltar à comunidade</a>
      <h2 className="vc-titulo">{d.topico.titulo}</h2>
      <p className="vc-data">aberto por {d.topico.autor_nome} · {fmt(d.topico.criado_em)}</p>
      <ul className="vc-respostas">
        {d.respostas.map((r) => (
          <li key={r.id}>
            <a href={`/vinicut/u/${r.autor_usuario}`} onClick={(e) => { e.preventDefault(); navegar(`/vinicut/u/${r.autor_usuario}`) }}>{r.autor_nome}</a>
            <span className="vc-data">{fmt(r.criado_em)}</span>
            <p>{r.texto}</p>
          </li>
        ))}
        {d.respostas.length === 0 && <p className="vc-vazio">Nenhuma resposta. Comece a conversa!</p>}
      </ul>
      <form className="vc-enviar" onSubmit={responder}>
        <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma resposta…" />
        <button type="submit" className="vc-botao" disabled={!texto.trim()}>responder</button>
      </form>
    </div>
  )
}
