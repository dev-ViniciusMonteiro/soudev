'use client'

// Início: meu cartão à esquerda, feed no meio (com o "o que você está pensando?") e, à direita, sorte do dia,
// aniversariantes, sugestões de amigos e minhas comunidades. O cartão de post também é usado no perfil.

import { useState } from 'react'
import Link from 'next/link'
import { api, enviarFoto } from '@/lib/vinicut/api'
import { Avatar, Cartao, Carregando, Denunciar, Erro, Escrever, GradeComunidades, Nome, Texto, tempo, useDados, useVinicut } from './comum'

const REACOES = [
  ['curtir', '👍'],
  ['amei', '❤️'],
  ['haha', '😂'],
  ['uau', '😮'],
  ['triste', '😢'],
]
const EMOJI = Object.fromEntries(REACOES)

export function MeuCartao() {
  const { eu, contadores } = useVinicut()
  return (
    <Cartao className="vc-meu-cartao">
      <Avatar pessoa={eu} tamanho={140} />
      <Nome pessoa={eu} />
      <p className="vc-mini">
        {[eu.relacionamento, eu.cidade].filter(Boolean).join(' · ') || <Link href="/vinicut/editar">complete o seu perfil</Link>}
      </p>
      <nav className="vc-menu-lateral">
        <Link href={`/vinicut/u/${eu.usuario}`}>perfil</Link>
        <Link href={`/vinicut/u/${eu.usuario}/recados`}>recados</Link>
        <Link href={`/vinicut/u/${eu.usuario}/fotos`}>fotos</Link>
        <Link href={`/vinicut/u/${eu.usuario}#depoimentos`}>
          depoimentos{contadores.depoimentosPendentes > 0 && <span className="vc-bolinha">{contadores.depoimentosPendentes}</span>}
        </Link>
        <Link href="/vinicut/amigos">
          amigos{contadores.pedidos > 0 && <span className="vc-bolinha">{contadores.pedidos}</span>}
        </Link>
        <Link href="/vinicut/editar">editar perfil</Link>
      </nav>
    </Cartao>
  )
}

export function Post({ post, aoApagar }) {
  const { eu } = useVinicut()
  const [p, setP] = useState(post)
  const [abrir, setAbrir] = useState(false)
  const [escolher, setEscolher] = useState(false)
  const comentarios = useDados(abrir ? `/posts/${p.id}/comentarios` : null)

  const reagir = async (tipo) => {
    const nova = p.minha === tipo ? null : tipo
    setEscolher(false)
    setP((x) => ({ ...x, minha: nova, reacoes: x.reacoes + (x.minha ? 0 : 1) - (nova ? 0 : 1), tipos: nova && !x.tipos.includes(nova) ? [...x.tipos, nova] : x.tipos }))
    await api(`/posts/${p.id}/reacao`, { metodo: 'POST', dados: { tipo: nova } }).catch(() => {})
  }

  return (
    <article className="vc-cartao vc-post">
      <header className="vc-post-topo">
        <Avatar pessoa={p.autor} tamanho={44} />
        <div>
          <Nome pessoa={p.autor} />
          <span className="vc-mini">{tempo(p.criado_em)}</span>
        </div>
        <div className="vc-post-acoes">
          {p.autor.id === eu.id ? (
            <button
              type="button"
              className="vc-link-botao vc-mini"
              onClick={async () => {
                if (!confirm('Apagar este post?')) return
                await api(`/posts/${p.id}`, { metodo: 'DELETE' })
                aoApagar?.(p.id)
              }}
            >
              apagar
            </button>
          ) : (
            <Denunciar tipo="post" alvo={p.id} />
          )}
        </div>
      </header>
      {p.texto && <Texto>{p.texto}</Texto>}
      {p.foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.foto} alt="" className="vc-post-foto" loading="lazy" />
      )}
      <div className="vc-post-pe">
        <span className="vc-reacoes-resumo">
          {p.tipos.map((t) => EMOJI[t]).join('')} {p.reacoes > 0 && p.reacoes}
        </span>
        <div className="vc-reagir" onMouseLeave={() => setEscolher(false)}>
          <button type="button" className={p.minha ? 'vc-reagido' : ''} onClick={() => (p.minha ? reagir(p.minha) : setEscolher((v) => !v))}>
            {p.minha ? `${EMOJI[p.minha]} ${p.minha}` : '👍 reagir'}
          </button>
          {escolher && (
            <div className="vc-reacoes-lista">
              {REACOES.map(([t, e]) => (
                <button key={t} type="button" title={t} onClick={() => reagir(t)}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setAbrir((v) => !v)}>
          💬 {p.comentarios > 0 ? `${p.comentarios} comentário${p.comentarios > 1 ? 's' : ''}` : 'comentar'}
        </button>
      </div>
      {abrir && (
        <div className="vc-comentarios">
          {comentarios.carregando && !comentarios.dados && <Carregando />}
          {comentarios.dados?.comentarios.map((k) => (
            <div key={k.id} className="vc-comentario">
              <Avatar pessoa={k.autor} tamanho={32} />
              <div>
                <Nome pessoa={k.autor} /> <span className="vc-mini">{tempo(k.criado_em)}</span>
                <Texto>{k.texto}</Texto>
                {k.autor.id === eu.id || p.autor.id === eu.id ? (
                  <button
                    type="button"
                    className="vc-link-botao vc-mini"
                    onClick={async () => {
                      await api(`/comentarios/${k.id}`, { metodo: 'DELETE' })
                      comentarios.recarregar()
                      setP((x) => ({ ...x, comentarios: x.comentarios - 1 }))
                    }}
                  >
                    apagar
                  </button>
                ) : (
                  <Denunciar tipo="comentario" alvo={k.id} />
                )}
              </div>
            </div>
          ))}
          <Escrever
            placeholder="Escreva um comentário…"
            botao="comentar"
            max={500}
            linhas={2}
            aoEnviar={async (texto) => {
              await api(`/posts/${p.id}/comentarios`, { metodo: 'POST', dados: { texto } })
              comentarios.recarregar()
              setP((x) => ({ ...x, comentarios: x.comentarios + 1 }))
            }}
          />
        </div>
      )}
    </article>
  )
}

/** Lista de posts com "ver mais" (o feed e os posts de um perfil). */
export function ListaPosts({ caminho, vazio }) {
  const primeira = useDados(caminho)
  const [mais, setMais] = useState([])
  const [acabou, setAcabou] = useState(false)
  const [apagados, setApagados] = useState([])
  if (primeira.erro) return <Erro erro={primeira.erro} />
  if (!primeira.dados) return <Carregando />
  const posts = [...primeira.dados.posts, ...mais].filter((p) => !apagados.includes(p.id))
  return (
    <>
      {posts.map((p) => (
        <Post key={p.id} post={p} aoApagar={(id) => setApagados((a) => [...a, id])} />
      ))}
      {!posts.length && <p className="vc-vazio vc-cartao">{vazio}</p>}
      {posts.length >= 20 && !acabou && (
        <button
          type="button"
          className="vc-botao vc-botao-claro vc-ver-mais"
          onClick={async () => {
            const ultimo = posts.at(-1).criado_em
            const r = await api(`${caminho}${caminho.includes('?') ? '&' : '?'}antes=${ultimo}`)
            setMais((m) => [...m, ...r.posts])
            if (r.posts.length < 20) setAcabou(true)
          }}
        >
          ver mais
        </button>
      )}
    </>
  )
}

function NovoPost({ aoPublicar }) {
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  return (
    <form
      className="vc-cartao vc-novo-post"
      onSubmit={async (e) => {
        e.preventDefault()
        setOcupado(true)
        setErro('')
        try {
          const enviada = foto ? await enviarFoto(foto) : null
          await api('/posts', { metodo: 'POST', dados: { texto, foto: enviada?.chave } })
          setTexto('')
          setFoto(null)
          aoPublicar()
        } catch (er) {
          setErro(er.message)
        } finally {
          setOcupado(false)
        }
      }}
    >
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que você está pensando?" maxLength={2000} rows={3} />
      {foto && (
        <div className="vc-previa">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(foto)} alt="Prévia da foto" />
          <button type="button" className="vc-link-botao vc-mini" onClick={() => setFoto(null)}>
            tirar foto
          </button>
        </div>
      )}
      <div className="vc-escrever-pe">
        <label className="vc-botao vc-botao-claro">
          📷 foto
          <input type="file" accept="image/*" hidden onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        {erro && <span className="vc-erro">{erro}</span>}
        <button type="submit" className="vc-botao" disabled={ocupado || (!texto.trim() && !foto)}>
          {ocupado ? 'publicando…' : 'publicar'}
        </button>
      </div>
    </form>
  )
}

function PessoaLinha({ pessoa, extra }) {
  return (
    <div className="vc-pessoa-linha">
      <Avatar pessoa={pessoa} tamanho={40} />
      <div>
        <Nome pessoa={pessoa} />
        <span className="vc-mini">@{pessoa.usuario}</span>
      </div>
      {extra}
    </div>
  )
}

function Sugestao({ pessoa }) {
  const [feito, setFeito] = useState(false)
  return (
    <PessoaLinha
      pessoa={pessoa}
      extra={
        feito ? (
          <span className="vc-mini">pedido enviado</span>
        ) : (
          <button
            type="button"
            className="vc-botao vc-botao-claro vc-botao-mini"
            onClick={async () => {
              await api(`/u/${pessoa.usuario}/amizade`, { metodo: 'POST', dados: { acao: 'pedir' } })
              setFeito(true)
            }}
          >
            + amigo
          </button>
        )
      }
    />
  )
}

export function Inicio() {
  const { eu } = useVinicut()
  const inicio = useDados('/inicio')
  const [versao, setVersao] = useState(0)
  return (
    <div className="vc-colunas">
      <aside className="vc-esquerda">
        <MeuCartao />
      </aside>
      <section className="vc-meio">
        <h1 className="vc-boas-vindas">Bem-vindo(a), {eu.nome.split(' ')[0]}</h1>
        {inicio.dados && (
          <div className="vc-sorte">
            <strong>Sorte do dia:</strong> {inicio.dados.sorte}
          </div>
        )}
        <NovoPost aoPublicar={() => setVersao((v) => v + 1)} />
        <ListaPosts key={versao} caminho="/feed" vazio="Seu feed está vazio. Adicione amigos ou publique alguma coisa!" />
      </section>
      <aside className="vc-direita">
        {inicio.dados?.aniversariantes.length > 0 && (
          <Cartao titulo="🎂 aniversariantes de hoje">
            {inicio.dados.aniversariantes.map((p) => (
              <PessoaLinha key={p.id} pessoa={p} extra={<Link href={`/vinicut/u/${p.usuario}/recados`} className="vc-mini">dar parabéns</Link>} />
            ))}
          </Cartao>
        )}
        {inicio.dados?.sugestoes.length > 0 && (
          <Cartao titulo="pessoas no vinicut">
            {inicio.dados.sugestoes.map((p) => (
              <Sugestao key={p.id} pessoa={p} />
            ))}
          </Cartao>
        )}
        {inicio.dados && <GradeComunidades comunidades={inicio.dados.comunidades} titulo="minhas comunidades" />}
      </aside>
    </div>
  )
}

export { PessoaLinha }
