'use client'

// Vinicut: a rede social do site. Entrada (conta do site), criação do perfil, barra do topo e as telas por
// endereço (/vinicut, /vinicut/u/<usuario>, /vinicut/c/<id>…). Os dados vêm de lib/vinicut/api.js.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api, cadastrar, entrar, lerConta, sair, salvarConta } from '@/lib/vinicut/api'
import { Avatar, Carregando, Erro, VinicutContext, useVinicut } from './comum'
import { Inicio } from './Inicio'
import { Perfil, ListaAmigos, ListaFotos, Recados } from './Perfil'
import { Comunidade, Comunidades, Topico } from './Comunidades'
import { Amigos, Busca, Editar, Moderacao, Notificacoes, Regras } from './Outras'

export default function Vinicut() {
  const [conta, setConta] = useState(undefined)
  const [eu, setEu] = useState(null)
  const [erro, setErro] = useState(null)

  const carregarEu = useCallback(async () => {
    try {
      setEu(await api('/eu'))
      setErro(null)
    } catch (e) {
      if (e.status === 401) setConta(null)
      else setErro(e)
    }
  }, [])

  useEffect(() => setConta(lerConta()), [])
  useEffect(() => {
    if (!conta) return
    carregarEu()
    // Contadores (notificações, pedidos) atualizam sozinhos com a aba aberta.
    const t = setInterval(() => document.visibilityState === 'visible' && carregarEu(), 60000)
    return () => clearInterval(t)
  }, [conta, carregarEu])

  if (conta === undefined) return <Carregando />
  if (!conta) return <Entrada aoEntrar={(c) => setConta(c)} />
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!eu) return <Carregando />
  if (!eu.perfil) return <CriarPerfil email={eu.email} aoCriar={carregarEu} sairConta={async () => (await sair(), setConta(null))} />
  return (
    <VinicutContext.Provider value={{ eu: eu.perfil, contadores: eu, recarregarEu: carregarEu, sairConta: async () => (await sair(), setConta(null), setEu(null)) }}>
      <Casca />
    </VinicutContext.Provider>
  )
}

function Logo() {
  return (
    <Link href="/vinicut" className="vc-logo" aria-label="Vinicut, início">
      vinicut
    </Link>
  )
}

/** Tela de quem ainda não entrou: o que é o Vinicut + entrar ou criar conta. */
function Entrada({ aoEntrar }) {
  const [modo, setModo] = useState('cadastrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const cadastro = modo === 'cadastrar'
  return (
    <div className="vc-entrada">
      <div className="vc-entrada-texto">
        <div className="vc-logo vc-logo-grande">vinicut</div>
        <p className="vc-entrada-lead">A rede social com cara de Orkut e jeito de hoje.</p>
        <ul>
          <li>Recados, depoimentos e &quot;sou fã&quot;</li>
          <li>Comunidades com fórum, do jeito que eram</li>
          <li>Feed dos amigos com fotos, reações e comentários</li>
          <li>Quem visitou o seu perfil e a sorte do dia</li>
        </ul>
      </div>
      <form
        className="vc-cartao vc-entrada-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setErro('')
          setOcupado(true)
          try {
            const r = cadastro ? await cadastrar(email, senha) : await entrar(email, senha)
            salvarConta({ email: r.email, token: r.token })
            aoEntrar({ email: r.email, token: r.token })
          } catch (er) {
            setErro(er.message)
          } finally {
            setOcupado(false)
          }
        }}
      >
        <div className="vc-abas">
          <button type="button" className={cadastro ? 'ativa' : ''} onClick={() => setModo('cadastrar')}>
            Criar conta
          </button>
          <button type="button" className={!cadastro ? 'ativa' : ''} onClick={() => setModo('entrar')}>
            Entrar
          </button>
        </div>
        <label>
          E-mail
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha {cadastro && <small>(mínimo 6 caracteres)</small>}
          <input type="password" required minLength={cadastro ? 6 : undefined} autoComplete={cadastro ? 'new-password' : 'current-password'} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <p className="vc-erro">{erro}</p>}
        <button type="submit" className="vc-botao vc-botao-grande" disabled={ocupado}>
          {ocupado ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}
        </button>
        <p className="vc-mini">É a mesma conta dos sistemas do site. Ao continuar, você aceita as <Link href="/vinicut/regras">regras e a privacidade</Link> do Vinicut.</p>
      </form>
    </div>
  )
}

function CriarPerfil({ email, aoCriar, sairConta }) {
  const [nome, setNome] = useState('')
  const [usuario, setUsuario] = useState('')
  const [maior18, setMaior18] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  return (
    <div className="vc-centro">
      <form
        className="vc-cartao vc-criar"
        onSubmit={async (e) => {
          e.preventDefault()
          setErro('')
          setOcupado(true)
          try {
            await api('/perfil', { metodo: 'POST', dados: { nome, usuario, maior18 } })
            await aoCriar()
          } catch (er) {
            setErro(er.message)
          } finally {
            setOcupado(false)
          }
        }}
      >
        <div className="vc-logo">vinicut</div>
        <h1>Crie o seu perfil</h1>
        <p className="vc-mini">Conta: {email}</p>
        <label>
          Seu nome
          <input required maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          Seu @ (endereço do perfil)
          <input required minLength={3} maxLength={24} value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="ex.: vinicius.m" />
        </label>
        <label className="vc-check">
          <input type="checkbox" checked={maior18} onChange={(e) => setMaior18(e.target.checked)} />
          Tenho 18 anos ou mais e aceito as <Link href="/vinicut/regras">regras do Vinicut</Link>.
        </label>
        {erro && <p className="vc-erro">{erro}</p>}
        <button type="submit" className="vc-botao vc-botao-grande" disabled={ocupado || !maior18}>
          {ocupado ? 'Criando…' : 'Entrar no Vinicut'}
        </button>
        <button type="button" className="vc-link-botao vc-mini" onClick={sairConta}>
          sair desta conta
        </button>
      </form>
    </div>
  )
}

/** Barra do topo + a tela do endereço atual. */
function Casca() {
  const caminho = usePathname()
  const router = useRouter()
  const partes = caminho.replace(/^\/vinicut\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  return (
    <div className="vc-app">
      <Topo partes={partes} buscar={(q) => router.push(`/vinicut/busca?q=${encodeURIComponent(q)}`)} />
      <main className="vc-conteudo">
        <Tela partes={partes} />
      </main>
      <footer className="vc-rodape">
        <Link href="/vinicut/regras">regras e privacidade</Link> · <Link href="/">vinicius monteiro</Link>
      </footer>
    </div>
  )
}

function Tela({ partes }) {
  const [a, b, c] = partes
  if (!a) return <Inicio />
  if (a === 'u' && b && !c) return <Perfil usuario={b} key={b} />
  if (a === 'u' && c === 'recados') return <Recados usuario={b} key={b} />
  if (a === 'u' && c === 'amigos') return <ListaAmigos usuario={b} key={b} />
  if (a === 'u' && c === 'fotos') return <ListaFotos usuario={b} key={b} />
  if (a === 'amigos') return <Amigos />
  if (a === 'comunidades') return <Comunidades />
  if (a === 'c' && b) return <Comunidade id={b} key={b} />
  if (a === 't' && b) return <Topico id={b} key={b} />
  if (a === 'notificacoes') return <Notificacoes />
  if (a === 'busca') return <Busca />
  if (a === 'editar') return <Editar />
  if (a === 'moderacao') return <Moderacao />
  if (a === 'regras') return <Regras />
  return (
    <div className="vc-centro">
      <p>Página não encontrada. <Link href="/vinicut">Voltar ao início</Link></p>
    </div>
  )
}

function Topo({ partes, buscar }) {
  const { eu, contadores, sairConta } = useVinicut()
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const ativo = (x) => (partes[0] ?? '') === x
  return (
    <header className="vc-topo">
      <div className="vc-topo-dentro">
        <Logo />
        <nav className="vc-nav">
          <Link href="/vinicut" className={ativo('') ? 'ativo' : ''}>
            início
          </Link>
          <Link href={`/vinicut/u/${eu.usuario}`} className={ativo('u') && partes[1] === eu.usuario ? 'ativo' : ''}>
            perfil
          </Link>
          <Link href={`/vinicut/u/${eu.usuario}/recados`}>recados</Link>
          <Link href="/vinicut/amigos" className={ativo('amigos') ? 'ativo' : ''}>
            amigos{contadores.pedidos > 0 && <span className="vc-bolinha">{contadores.pedidos}</span>}
          </Link>
          <Link href="/vinicut/comunidades" className={ativo('comunidades') || ativo('c') || ativo('t') ? 'ativo' : ''}>
            comunidades
          </Link>
        </nav>
        <form
          className="vc-busca"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) buscar(q.trim())
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar pessoas e comunidades" aria-label="Buscar" />
        </form>
        <Link href="/vinicut/notificacoes" className="vc-sino" aria-label={`Notificações (${contadores.naoLidas} novas)`}>
          🔔{contadores.naoLidas > 0 && <span className="vc-bolinha">{contadores.naoLidas}</span>}
        </Link>
        <div className="vc-menu">
          <button type="button" className="vc-menu-botao" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="Menu da conta">
            <Avatar pessoa={eu} tamanho={34} link={false} />
          </button>
          {menu && (
            <div className="vc-menu-lista" onClick={() => setMenu(false)}>
              <Link href={`/vinicut/u/${eu.usuario}`}>meu perfil</Link>
              <Link href="/vinicut/editar">editar perfil</Link>
              {contadores.admin && <Link href="/vinicut/moderacao">moderação</Link>}
              <Link href="/vinicut/regras">regras e privacidade</Link>
              <button type="button" onClick={sairConta}>
                sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
