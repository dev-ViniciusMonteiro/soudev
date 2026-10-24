'use client'

// Perfil estilo Orkut: cartão com foto e dados, amizade, "sou fã", karma, quem sou eu, recados, depoimentos,
// posts e fotos; à direita os amigos, as comunidades e (para o dono) quem visitou. Mais as páginas de recados,
// amigos e fotos de alguém.

import { useState } from 'react'
import Link from 'next/link'
import { api, enviarFoto } from '@/lib/vinicut/api'
import { Avatar, Cartao, Carregando, Denunciar, Erro, Escrever, GradeAmigos, GradeComunidades, Nome, Texto, tempo, useDados, useVinicut } from './comum'
import { ListaPosts } from './Inicio'

const KARMA = [
  ['confiavel', 'confiável', '😊'],
  ['legal', 'legal', '😎'],
  ['gente_boa', 'gente boa', '❤️'],
]

const aniversario = (mmdd) => {
  if (!mmdd) return ''
  const [m, d] = mmdd.split('-').map(Number)
  return new Date(2000, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function BotaoAmizade({ usuario, amizade, mudou }) {
  const pedir = async (acao) => {
    const r = await api(`/u/${usuario}/amizade`, { metodo: 'POST', dados: { acao } })
    mudou(r.amizade)
  }
  if (amizade === 'amigos')
    return (
      <button type="button" className="vc-botao vc-botao-claro" onClick={() => confirm('Desfazer a amizade?') && pedir('desfazer')}>
        ✓ amigos
      </button>
    )
  if (amizade === 'enviado')
    return (
      <button type="button" className="vc-botao vc-botao-claro" onClick={() => pedir('desfazer')} title="Cancelar o pedido">
        pedido enviado
      </button>
    )
  if (amizade === 'recebido')
    return (
      <>
        <button type="button" className="vc-botao" onClick={() => pedir('aceitar')}>
          aceitar amizade
        </button>
        <button type="button" className="vc-botao vc-botao-claro" onClick={() => pedir('recusar')}>
          recusar
        </button>
      </>
    )
  return (
    <button type="button" className="vc-botao" onClick={() => pedir('pedir')}>
      + adicionar amigo
    </button>
  )
}

/** Karma: a média de todos e, se não for o meu perfil, o meu voto (clique nos ícones). */
function Karma({ dados, usuario, meu }) {
  const [voto, setVoto] = useState(dados.meuKarma ?? { confiavel: 0, legal: 0, gente_boa: 0 })
  return (
    <div className="vc-karma">
      {KARMA.map(([k, rotulo, icone]) => (
        <div key={k} className="vc-karma-linha">
          <span className="vc-karma-rotulo">{rotulo}</span>
          <span className="vc-karma-icones" title={`média ${dados.karma[k].toFixed(1)} de 3 (${dados.karma.votos} votos)`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={Math.round(dados.karma[k]) >= n ? 'cheio' : 'vazio'}>
                {icone}
              </span>
            ))}
          </span>
          {!meu && (
            <span className="vc-karma-voto" aria-label={`Seu voto em ${rotulo}`}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={voto[k] >= n ? 'cheio' : 'vazio'}
                  title={`dar ${n}`}
                  onClick={async () => {
                    const novo = { ...voto, [k]: voto[k] === n ? n - 1 : n }
                    setVoto(novo)
                    await api(`/u/${usuario}/karma`, { metodo: 'POST', dados: novo })
                  }}
                >
                  {icone}
                </button>
              ))}
            </span>
          )}
        </div>
      ))}
      <span className="vc-mini">{dados.karma.votos} voto(s){!meu && ' · clique para votar'}</span>
    </div>
  )
}

function ItemRecado({ r, podeApagar, aoApagar }) {
  return (
    <div className="vc-recado">
      <Avatar pessoa={r.autor} tamanho={48} />
      <div className="vc-recado-corpo">
        <div>
          <Nome pessoa={r.autor} /> <span className="vc-mini">{tempo(r.criado_em)}</span>
        </div>
        <Texto>{r.texto}</Texto>
        <div className="vc-recado-acoes">
          <Link href={`/vinicut/u/${r.autor.usuario}/recados`} className="vc-mini">
            responder
          </Link>
          {podeApagar ? (
            <button
              type="button"
              className="vc-link-botao vc-mini"
              onClick={async () => {
                await api(`/recados/${r.id}`, { metodo: 'DELETE' })
                aoApagar(r.id)
              }}
            >
              apagar
            </button>
          ) : (
            <Denunciar tipo="recado" alvo={r.id} />
          )}
        </div>
      </div>
    </div>
  )
}

export function Perfil({ usuario }) {
  const { eu, recarregarEu } = useVinicut()
  const { dados: d, erro, setDados, recarregar } = useDados(`/u/${usuario}`)
  const [aba, setAba] = useState('perfil')
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!d) return <Carregando />
  const p = d.perfil
  const meu = d.meu
  const apagarRecado = (id) => setDados((x) => ({ ...x, recados: x.recados.filter((r) => r.id !== id), totalRecados: x.totalRecados - 1 }))

  return (
    <div className="vc-colunas">
      <aside className="vc-esquerda">
        <Cartao className="vc-meu-cartao">
          <Avatar pessoa={p} tamanho={160} link={false} />
          <strong className="vc-perfil-nome">{p.nome}</strong>
          <span className="vc-mini">@{p.usuario}{p.online ? ' · online' : ''}</span>
          <ul className="vc-dados">
            {p.relacionamento && <li>{p.relacionamento}</li>}
            {p.cidade && <li>{p.cidade}</li>}
            {p.aniversario && <li>🎂 {aniversario(p.aniversario)}</li>}
            <li className="vc-mini">no vinicut desde {new Date(p.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</li>
          </ul>
          {meu ? (
            <Link href="/vinicut/editar" className="vc-botao vc-botao-claro">
              editar perfil
            </Link>
          ) : (
            <div className="vc-perfil-acoes">
              <BotaoAmizade usuario={p.usuario} amizade={d.amizade} mudou={(a) => (setDados((x) => ({ ...x, amizade: a })), recarregarEu())} />
              <button
                type="button"
                className={d.souFa ? 'vc-botao vc-botao-fa ativo' : 'vc-botao vc-botao-fa'}
                onClick={async () => {
                  await api(`/u/${p.usuario}/fa`, { metodo: 'POST', dados: { sim: !d.souFa } })
                  setDados((x) => ({ ...x, souFa: !x.souFa, fas: x.fas + (x.souFa ? -1 : 1) }))
                }}
              >
                ⭐ {d.souFa ? 'sou fã' : 'virar fã'}
              </button>
            </div>
          )}
          <p className="vc-mini">
            ⭐ {d.fas} fã{d.fas === 1 ? '' : 's'} · {d.totalAmigos} amigo{d.totalAmigos === 1 ? '' : 's'}
          </p>
          <nav className="vc-menu-lateral">
            <Link href={`/vinicut/u/${p.usuario}/recados`}>recados ({d.totalRecados})</Link>
            <Link href={`/vinicut/u/${p.usuario}/fotos`}>fotos</Link>
            <Link href={`/vinicut/u/${p.usuario}/amigos`}>amigos ({d.totalAmigos})</Link>
          </nav>
          {!meu && (
            <div className="vc-perfil-seguranca">
              <Denunciar tipo="perfil" alvo={p.id} rotulo="denunciar perfil" />
              <button
                type="button"
                className="vc-link-botao vc-mini"
                onClick={async () => {
                  if (!confirm(`Bloquear ${p.nome}? Vocês deixam de ser amigos e ninguém vê ou fala com o outro.`)) return
                  await api(`/u/${p.usuario}/bloquear`, { metodo: 'POST', dados: { sim: true } })
                  location.href = '/vinicut'
                }}
              >
                bloquear
              </button>
            </div>
          )}
        </Cartao>
      </aside>

      <section className="vc-meio">
        <Cartao className="vc-perfil-topo">
          <h1>{p.nome}</h1>
          <Karma dados={d} usuario={p.usuario} meu={meu} />
          <div className="vc-abas vc-abas-perfil">
            {['perfil', 'posts'].map((a) => (
              <button key={a} type="button" className={aba === a ? 'ativa' : ''} onClick={() => setAba(a)}>
                {a}
              </button>
            ))}
          </div>
        </Cartao>

        {aba === 'posts' ? (
          <ListaPosts caminho={`/u/${p.usuario}/posts`} vazio="Nenhum post ainda." />
        ) : (
          <>
            <Cartao titulo="quem sou eu">
              {p.quem_sou_eu ? <Texto>{p.quem_sou_eu}</Texto> : <p className="vc-vazio">{meu ? <Link href="/vinicut/editar">Conte um pouco sobre você</Link> : 'Ainda não escreveu nada.'}</p>}
              {p.interesses && (
                <p className="vc-interesses">
                  <strong>interesses:</strong> {p.interesses}
                </p>
              )}
            </Cartao>

            <Cartao titulo={`recados (${d.totalRecados})`} acao={<Link href={`/vinicut/u/${p.usuario}/recados`}>ver todos</Link>}>
              {d.amizade !== 'bloqueado' && (
                <Escrever
                  placeholder={meu ? 'Escreva no seu mural…' : `Deixe um recado para ${p.nome.split(' ')[0]}…`}
                  botao="enviar recado"
                  aoEnviar={async (texto) => {
                    await api(`/u/${p.usuario}/recados`, { metodo: 'POST', dados: { texto } })
                    recarregar()
                  }}
                />
              )}
              {d.recados.map((r) => (
                <ItemRecado key={r.id} r={r} podeApagar={meu || r.autor.id === eu.id} aoApagar={apagarRecado} />
              ))}
              {!d.recados.length && <p className="vc-vazio">Nenhum recado ainda.</p>}
            </Cartao>

            <Cartao titulo="depoimentos" className="vc-depoimentos">
              <span id="depoimentos" />
              {d.depoimentos.map((dep) => (
                <div key={dep.id} className={dep.aprovado ? 'vc-depoimento' : 'vc-depoimento pendente'}>
                  <Avatar pessoa={dep.autor} tamanho={48} />
                  <div className="vc-recado-corpo">
                    <div>
                      <Nome pessoa={dep.autor} /> <span className="vc-mini">{tempo(dep.criado_em)}</span>
                      {!dep.aprovado && <span className="vc-etiqueta">esperando sua aprovação</span>}
                    </div>
                    <Texto>{dep.texto}</Texto>
                    <div className="vc-recado-acoes">
                      {meu && !dep.aprovado && (
                        <>
                          <button type="button" className="vc-botao vc-botao-mini" onClick={async () => (await api(`/depoimentos/${dep.id}`, { metodo: 'POST', dados: { aprovar: true } }), recarregar(), recarregarEu())}>
                            aprovar
                          </button>
                          <button type="button" className="vc-link-botao vc-mini" onClick={async () => (await api(`/depoimentos/${dep.id}`, { metodo: 'POST', dados: { aprovar: false } }), recarregar(), recarregarEu())}>
                            recusar
                          </button>
                        </>
                      )}
                      {(meu || dep.autor.id === eu.id) && dep.aprovado && (
                        <button type="button" className="vc-link-botao vc-mini" onClick={async () => (await api(`/depoimentos/${dep.id}`, { metodo: 'DELETE' }), recarregar())}>
                          apagar
                        </button>
                      )}
                      {!meu && dep.autor.id !== eu.id && <Denunciar tipo="depoimento" alvo={dep.id} />}
                    </div>
                  </div>
                </div>
              ))}
              {!d.depoimentos.length && <p className="vc-vazio">Nenhum depoimento ainda.</p>}
              {d.amizade === 'amigos' && (
                <details className="vc-escrever-depoimento">
                  <summary>escrever um depoimento</summary>
                  <Escrever
                    placeholder={`O que você acha de ${p.nome.split(' ')[0]}? Ele(a) aprova antes de aparecer.`}
                    botao="enviar depoimento"
                    max={2000}
                    linhas={4}
                    aoEnviar={async (texto) => {
                      await api(`/u/${p.usuario}/depoimentos`, { metodo: 'POST', dados: { texto } })
                      alert('Depoimento enviado! Ele aparece quando for aprovado.')
                    }}
                  />
                </details>
              )}
            </Cartao>

            {d.fotos.length > 0 && (
              <Cartao titulo="fotos" acao={<Link href={`/vinicut/u/${p.usuario}/fotos`}>ver álbum</Link>}>
                <div className="vc-fotos-grade">
                  {d.fotos.map((f) => (
                    <a key={f.chave} href={f.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={f.legenda || 'foto'} loading="lazy" />
                    </a>
                  ))}
                </div>
              </Cartao>
            )}
          </>
        )}
      </section>

      <aside className="vc-direita">
        <GradeAmigos amigos={d.amigos} total={d.totalAmigos} usuario={p.usuario} />
        <GradeComunidades comunidades={d.comunidades} />
        {meu && (
          <Cartao titulo="visitas recentes">
            {d.visitas.length ? (
              d.visitas.map((v) => (
                <div key={v.id} className="vc-pessoa-linha">
                  <Avatar pessoa={v} tamanho={36} />
                  <div>
                    <Nome pessoa={v} />
                    <span className="vc-mini">{tempo(v.em)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="vc-vazio">Ninguém visitou ainda.</p>
            )}
          </Cartao>
        )}
      </aside>
    </div>
  )
}

/** Página de recados (scrapbook) de alguém, com "ver mais". */
export function Recados({ usuario }) {
  const { eu } = useVinicut()
  const { dados, erro, recarregar, setDados } = useDados(`/u/${usuario}/recados`)
  const [acabou, setAcabou] = useState(false)
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!dados) return <Carregando />
  const meu = usuario === eu.usuario
  return (
    <div className="vc-uma-coluna">
      <Cartao titulo={meu ? 'meus recados' : `recados de @${usuario}`} acao={<Link href={`/vinicut/u/${usuario}`}>ver perfil</Link>}>
        <Escrever
          placeholder={meu ? 'Escreva no seu mural…' : 'Deixe um recado…'}
          botao="enviar recado"
          aoEnviar={async (texto) => {
            await api(`/u/${usuario}/recados`, { metodo: 'POST', dados: { texto } })
            recarregar()
          }}
        />
        {dados.recados.map((r) => (
          <ItemRecado key={r.id} r={r} podeApagar={meu || r.autor.id === eu.id} aoApagar={(id) => setDados((x) => ({ ...x, recados: x.recados.filter((y) => y.id !== id) }))} />
        ))}
        {!dados.recados.length && <p className="vc-vazio">Nenhum recado ainda.</p>}
        {dados.recados.length >= 30 && !acabou && (
          <button
            type="button"
            className="vc-botao vc-botao-claro vc-ver-mais"
            onClick={async () => {
              const r = await api(`/u/${usuario}/recados?antes=${dados.recados.at(-1).criado_em}`)
              setDados((x) => ({ ...x, recados: [...x.recados, ...r.recados] }))
              if (r.recados.length < 30) setAcabou(true)
            }}
          >
            ver mais
          </button>
        )}
      </Cartao>
    </div>
  )
}

export function ListaAmigos({ usuario }) {
  const { dados, erro } = useDados(`/u/${usuario}/amigos`)
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!dados) return <Carregando />
  return (
    <div className="vc-uma-coluna">
      <Cartao titulo={`amigos de @${usuario} (${dados.amigos.length})`} acao={<Link href={`/vinicut/u/${usuario}`}>ver perfil</Link>}>
        <div className="vc-grade vc-grade-larga">
          {dados.amigos.map((a) => (
            <Link key={a.id} href={`/vinicut/u/${a.usuario}`} className="vc-grade-item">
              <Avatar pessoa={a} tamanho={80} link={false} />
              <span>{a.nome}</span>
            </Link>
          ))}
        </div>
        {!dados.amigos.length && <p className="vc-vazio">Nenhum amigo ainda.</p>}
      </Cartao>
    </div>
  )
}

export function ListaFotos({ usuario }) {
  const { eu } = useVinicut()
  const { dados, erro, recarregar } = useDados(`/u/${usuario}/fotos`)
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!dados) return <Carregando />
  const meu = usuario === eu.usuario
  return (
    <div className="vc-uma-coluna">
      <Cartao
        titulo={meu ? 'minhas fotos' : `fotos de @${usuario}`}
        acao={
          meu ? (
            <label className="vc-botao vc-botao-mini">
              {enviando ? 'enviando…' : '+ enviar foto'}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={enviando}
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setEnviando(true)
                  setMsg('')
                  try {
                    await enviarFoto(f, prompt('Legenda da foto (opcional):') ?? '')
                    recarregar()
                  } catch (er) {
                    setMsg(er.message)
                  } finally {
                    setEnviando(false)
                  }
                }}
              />
            </label>
          ) : (
            <Link href={`/vinicut/u/${usuario}`}>ver perfil</Link>
          )
        }
      >
        {msg && <p className="vc-erro">{msg}</p>}
        <div className="vc-fotos-grade vc-fotos-album">
          {dados.fotos.map((f) => (
            <figure key={f.chave}>
              <a href={f.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.legenda || 'foto'} loading="lazy" />
              </a>
              <figcaption>
                {f.legenda}
                {meu ? (
                  <>
                    <button type="button" className="vc-link-botao vc-mini" onClick={async () => (await api('/perfil', { metodo: 'PATCH', dados: { foto: f.chave } }), alert('Foto do perfil trocada!'))}>
                      usar no perfil
                    </button>
                    <button type="button" className="vc-link-botao vc-mini" onClick={async () => confirm('Apagar esta foto?') && (await api(`/fotos/${f.chave}`, { metodo: 'DELETE' }), recarregar())}>
                      apagar
                    </button>
                  </>
                ) : (
                  <Denunciar tipo="foto" alvo={f.chave} />
                )}
              </figcaption>
            </figure>
          ))}
        </div>
        {!dados.fotos.length && <p className="vc-vazio">Nenhuma foto ainda.</p>}
      </Cartao>
    </div>
  )
}
