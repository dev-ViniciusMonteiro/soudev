'use client'

// Conta na nuvem: criar conta ou entrar com e-mail e senha, escolher (ou criar) a equipe e abrir o sistema.
// A equipe é o negócio: o dono convida os outros e-mails em Configurações → Equipe, dentro do sistema.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { chamarConta, lerConta, salvarConexao, salvarConta } from '@/lib/sistemas/api'
import { getNicho } from '@/lib/sistemas/nichos'
import { track } from '@/lib/analytics'

const NOME_PAPEL = { dono: 'Dono', gerente: 'Gerente', operador: 'Operador' }

export default function Equipe({ slug }) {
  const nicho = getNicho(slug)
  const [conta, setConta] = useState(null)
  const [equipes, setEquipes] = useState(null)
  const [trocar, setTrocar] = useState(false)
  const [msg, setMsg] = useState('')

  // Sessão salva neste navegador: já mostra as equipes.
  useEffect(() => {
    const c = lerConta()
    if (!c) {
      setEquipes([])
      return
    }
    setConta(c)
    chamarConta('equipes')
      .then((r) => setEquipes(r.equipes))
      .catch((e) => {
        setConta(lerConta())
        setEquipes([])
        if (e.codigo !== 'sessao') setMsg(e.message)
      })
  }, [])

  const entrou = (r) => {
    salvarConta({ email: r.email, token: r.token })
    setConta({ email: r.email, token: r.token })
    setEquipes(r.equipes)
    setTrocar(Boolean(r.trocarSenha))
  }

  const abrir = async (equipe, nova = false) => {
    const r = await chamarConta('abrir', { equipe: equipe.id })
    salvarConexao({ url: r.url, email: r.email, token: r.token, papel: r.papel, nuvem: true, equipe: equipe.id, empresa: r.empresa, nova })
    track('sistema_equipe_aberta', { sistema: slug, papel: r.papel, nova })
    window.location.href = `/sistemas/${slug}/app`
  }

  return (
    <main className="container tool-page sx-equipe" style={{ '--sx-cor': nicho.cor }}>
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/sistemas">Sistemas</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/sistemas/${slug}`}>{nicho.nome}</Link>
        <span aria-hidden="true">/</span>
        <span>Equipe</span>
      </nav>
      <header className="sx-equipe-topo">
        <span className="sx-nicho-icone grande" aria-hidden="true">
          {nicho.badge}
        </span>
        <div>
          <h1>{nicho.nome}</h1>
          <p className="muted">Grátis e sem limite: crie a conta, cadastre a sua equipe e convide quem trabalha com você pelo e-mail. Os dados ficam guardados na nuvem e aparecem em todos os aparelhos.</p>
        </div>
      </header>
      {msg && <p className="notice error">{msg}</p>}
      {equipes === null ? (
        <div className="sx-carregando">
          <span className="spinner" aria-hidden="true" /> Carregando…
        </div>
      ) : !conta ? (
        <Acesso aoEntrar={entrou} />
      ) : trocar ? (
        <TrocarSenha obrigatorio aoTrocar={() => setTrocar(false)} />
      ) : (
        <Equipes
          conta={conta}
          nicho={nicho}
          equipes={equipes}
          abrir={abrir}
          criada={(e) => abrir(e, true)}
          sair={async () => {
            await chamarConta('sair').catch(() => {})
            salvarConta(null)
            setConta(null)
          }}
        />
      )}
      <p className="muted small sx-equipe-pe">
        Só quer conhecer?{' '}
        <Link href={`/sistemas/${slug}/app?beta=1`}>Ver a versão beta com dados de exemplo</Link>, sem cadastro.
      </p>
    </main>
  )
}

function useEnvio() {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const enviar = async (fn) => {
    setErro('')
    setOcupado(true)
    try {
      await fn()
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, erro, enviar }
}

function Acesso({ aoEntrar }) {
  const [modo, setModo] = useState('cadastrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const { ocupado, erro, enviar } = useEnvio()
  const cadastro = modo === 'cadastrar'
  return (
    <form
      className="sx-cartao sx-acesso"
      onSubmit={(e) => {
        e.preventDefault()
        enviar(async () => {
          if (cadastro && senha !== confirma) throw new Error('As duas senhas não são iguais.')
          const r = await chamarConta(cadastro ? 'cadastrar' : 'entrar', { email, senha })
          track(cadastro ? 'sistema_conta_criada' : 'sistema_conta_entrou')
          aoEntrar(r)
        })
      }}
    >
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={cadastro} className={cadastro ? 'tab active' : 'tab'} onClick={() => setModo('cadastrar')}>
          Criar conta
        </button>
        <button type="button" role="tab" aria-selected={!cadastro} className={!cadastro ? 'tab active' : 'tab'} onClick={() => setModo('entrar')}>
          Já tenho conta
        </button>
      </div>
      <p className="muted small">{cadastro ? 'Recebeu um convite? Crie a conta com o mesmo e-mail que o dono cadastrou e a equipe já aparece.' : 'Entre com o e-mail e a senha da sua conta.'}</p>
      <label className="field">
        <span className="field-label">E-mail</span>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Senha {cadastro && <small className="muted">(mínimo 6 caracteres)</small>}</span>
        <input type="password" autoComplete={cadastro ? 'new-password' : 'current-password'} required minLength={cadastro ? 6 : undefined} value={senha} onChange={(e) => setSenha(e.target.value)} />
      </label>
      {cadastro && (
        <label className="field">
          <span className="field-label">Repita a senha</span>
          <input type="password" autoComplete="new-password" required value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        </label>
      )}
      {erro && <p className="notice error">{erro}</p>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={ocupado}>
        {ocupado ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}
      </button>
      {!cadastro && <p className="muted small">Esqueceu a senha? Peça ao dono da sua equipe uma senha provisória (Configurações → Equipe).</p>}
    </form>
  )
}

function Equipes({ conta, nicho, equipes, abrir, criada, sair }) {
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState(false)
  const { ocupado, erro, enviar } = useEnvio()
  const criar = (
    <form
      className="sx-criar-equipe"
      onSubmit={(e) => {
        e.preventDefault()
        enviar(async () => {
          const r = await chamarConta('criar_equipe', { nome, nicho: nicho.slug })
          track('sistema_equipe_criada', { sistema: nicho.slug })
          await criada(r.equipe)
        })
      }}
    >
      <label className="field">
        <span className="field-label">Nome do seu negócio</span>
        <input required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={`Ex.: ${nicho.exemploNome ?? 'Minha Empresa'}`} />
      </label>
      <button type="submit" className="btn btn-primary" disabled={ocupado}>
        {ocupado ? 'Criando…' : 'Cadastrar equipe e abrir o sistema'}
      </button>
    </form>
  )
  return (
    <section className="sx-cartao sx-equipes">
      <div className="sx-equipes-topo">
        <h2>Suas equipes</h2>
        <span className="muted small">{conta.email}</span>
      </div>
      {equipes.length ? (
        <ul className="sx-equipes-lista">
          {equipes.map((e) => (
            <li key={e.id}>
              <div>
                <strong>{e.nome}</strong>
                <small className="muted">{NOME_PAPEL[e.papel]}</small>
              </div>
              <button type="button" className="btn btn-primary" disabled={ocupado} onClick={() => enviar(() => abrir(e))}>
                Abrir {nicho.nome}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Você ainda não está em nenhuma equipe. Cadastre a sua abaixo, ou peça a quem é dono para adicionar o seu e-mail ({conta.email}).</p>
      )}
      {equipes.length ? (
        <details>
          <summary>Cadastrar outra equipe</summary>
          {criar}
        </details>
      ) : (
        criar
      )}
      {erro && <p className="notice error">{erro}</p>}
      <div className="sx-acoes">
        <button type="button" className="btn btn-ghost" onClick={() => setSenha((v) => !v)}>
          Trocar senha
        </button>
        <button type="button" className="btn btn-ghost" onClick={sair}>
          Sair
        </button>
      </div>
      {senha && <TrocarSenha aoTrocar={() => setSenha(false)} />}
    </section>
  )
}

function TrocarSenha({ obrigatorio, aoTrocar }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [ok, setOk] = useState(false)
  const { ocupado, erro, enviar } = useEnvio()
  return (
    <form
      className="sx-cartao"
      onSubmit={(e) => {
        e.preventDefault()
        enviar(async () => {
          await chamarConta('trocar_senha', { atual, nova })
          setOk(true)
          setTimeout(aoTrocar, 1200)
        })
      }}
    >
      <h2>{obrigatorio ? 'Crie uma senha nova' : 'Trocar senha'}</h2>
      {obrigatorio && <p className="muted small">Você entrou com uma senha provisória. Escolha a sua para continuar.</p>}
      <label className="field">
        <span className="field-label">{obrigatorio ? 'Senha provisória' : 'Senha atual'}</span>
        <input type="password" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Senha nova (mínimo 6 caracteres)</span>
        <input type="password" autoComplete="new-password" required minLength={6} value={nova} onChange={(e) => setNova(e.target.value)} />
      </label>
      {erro && <p className="notice error">{erro}</p>}
      {ok && <p className="notice ok">Senha trocada!</p>}
      <button type="submit" className="btn btn-primary" disabled={ocupado}>
        {ocupado ? 'Salvando…' : 'Salvar senha'}
      </button>
    </form>
  )
}
