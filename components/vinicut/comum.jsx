'use client'

// Peças do Vinicut usadas em todas as telas: contexto (quem sou eu), carregar dados, avatar, tempo relativo,
// texto com links, cartões, grades de amigos e comunidades e o botão de denunciar.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/vinicut/api'

export const VinicutContext = createContext(null)
export const useVinicut = () => useContext(VinicutContext)

/** Busca um caminho da API e recarrega quando ele muda. */
export function useDados(caminho) {
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: true })
  const carregar = useCallback(async () => {
    if (!caminho) return
    setEstado((e) => ({ ...e, carregando: true }))
    try {
      setEstado({ dados: await api(caminho), erro: null, carregando: false })
    } catch (e) {
      setEstado({ dados: null, erro: e, carregando: false })
    }
  }, [caminho])
  useEffect(() => {
    carregar()
  }, [carregar])
  return { ...estado, recarregar: carregar, setDados: (fn) => setEstado((e) => ({ ...e, dados: fn(e.dados) })) }
}

const CORES = ['#e0447d', '#3a63b0', '#16a34a', '#d97706', '#7c3aed', '#0891b2']

export function Avatar({ pessoa, tamanho = 48, link = true }) {
  if (!pessoa) return null
  const inicial = (pessoa.nome || pessoa.usuario || '?').trim()[0]?.toUpperCase() ?? '?'
  const cor = CORES[(pessoa.usuario || '').length % CORES.length]
  const conteudo = pessoa.foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={pessoa.foto} alt="" width={tamanho} height={tamanho} className="vc-avatar" style={{ width: tamanho, height: tamanho }} loading="lazy" />
  ) : (
    <span className="vc-avatar vc-avatar-letra" style={{ width: tamanho, height: tamanho, background: cor, fontSize: tamanho * 0.42 }} aria-hidden="true">
      {inicial}
    </span>
  )
  const comPonto = (
    <span className="vc-avatar-caixa" title={pessoa.online ? 'online agora' : undefined}>
      {conteudo}
      {pessoa.online && <span className="vc-online" />}
    </span>
  )
  return link ? <Link href={`/vinicut/u/${pessoa.usuario}`}>{comPonto}</Link> : comPonto
}

export function Nome({ pessoa }) {
  if (!pessoa) return null
  return (
    <Link href={`/vinicut/u/${pessoa.usuario}`} className="vc-nome">
      {pessoa.nome}
    </Link>
  )
}

export function tempo(ms) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return 'agora'
  const m = Math.round(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return d === 1 ? 'ontem' : `há ${d} dias`
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: d > 300 ? 'numeric' : undefined })
}

/** Texto das pessoas: mantém as quebras de linha e transforma links http(s) em links seguros. */
export function Texto({ children, className }) {
  const partes = String(children ?? '').split(/(https?:\/\/[^\s<]+)/g)
  return (
    <p className={`vc-texto ${className ?? ''}`}>
      {partes.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="nofollow ugc noopener noreferrer">
            {p.length > 50 ? `${p.slice(0, 47)}…` : p}
          </a>
        ) : (
          p
        ),
      )}
    </p>
  )
}

export function Cartao({ titulo, acao, children, className }) {
  return (
    <section className={`vc-cartao ${className ?? ''}`}>
      {(titulo || acao) && (
        <header className="vc-cartao-topo">
          {titulo && <h2>{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

export const Carregando = () => (
  <div className="vc-carregando">
    <span className="spinner" aria-hidden="true" /> Carregando…
  </div>
)

export const Erro = ({ erro }) => <p className="notice error">{erro?.message ?? String(erro)}</p>

export function GradeAmigos({ amigos, total, usuario }) {
  return (
    <Cartao titulo={`amigos (${total ?? amigos.length})`} acao={usuario && (total ?? 0) > amigos.length ? <Link href={`/vinicut/u/${usuario}/amigos`}>ver todos</Link> : null}>
      {amigos.length ? (
        <div className="vc-grade">
          {amigos.map((a) => (
            <Link key={a.id} href={`/vinicut/u/${a.usuario}`} className="vc-grade-item">
              <Avatar pessoa={a} tamanho={64} link={false} />
              <span>{a.nome}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="vc-vazio">Nenhum amigo ainda.</p>
      )}
    </Cartao>
  )
}

export function GradeComunidades({ comunidades, titulo = 'comunidades' }) {
  return (
    <Cartao titulo={`${titulo} (${comunidades.length})`} acao={<Link href="/vinicut/comunidades">ver</Link>}>
      {comunidades.length ? (
        <div className="vc-grade">
          {comunidades.map((c) => (
            <Link key={c.id} href={`/vinicut/c/${c.id}`} className="vc-grade-item">
              <span className="vc-comunidade-icone" aria-hidden="true">
                {c.nome.trim()[0]?.toUpperCase()}
              </span>
              <span>{c.nome}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="vc-vazio">Nenhuma comunidade ainda.</p>
      )}
    </Cartao>
  )
}

/** Denunciar qualquer coisa: pede o motivo e manda para a moderação. */
export function Denunciar({ tipo, alvo, rotulo = 'denunciar' }) {
  const [feito, setFeito] = useState(false)
  if (feito) return <span className="vc-mini">denunciado</span>
  return (
    <button
      type="button"
      className="vc-link-botao vc-mini"
      onClick={async () => {
        const motivo = prompt('Por que você está denunciando? (spam, ofensa, golpe, conteúdo impróprio…)')
        if (!motivo?.trim()) return
        try {
          await api('/denunciar', { metodo: 'POST', dados: { tipo, alvo, motivo } })
          setFeito(true)
        } catch (e) {
          alert(e.message)
        }
      }}
    >
      {rotulo}
    </button>
  )
}

/** Caixa de envio de texto (recado, comentário, resposta). */
export function Escrever({ placeholder, botao = 'enviar', max = 1000, linhas = 3, aoEnviar }) {
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  return (
    <form
      className="vc-escrever"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!texto.trim()) return
        setOcupado(true)
        setErro('')
        try {
          await aoEnviar(texto.trim())
          setTexto('')
        } catch (er) {
          setErro(er.message)
        } finally {
          setOcupado(false)
        }
      }}
    >
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} maxLength={max} rows={linhas} />
      <div className="vc-escrever-pe">
        {erro && <span className="vc-erro">{erro}</span>}
        <button type="submit" className="vc-botao" disabled={ocupado || !texto.trim()}>
          {ocupado ? '…' : botao}
        </button>
      </div>
    </form>
  )
}
