'use client'

// Comunidades com fórum, como no Orkut: lista e busca, criar, página da comunidade (participar, tópicos,
// membros) e a página do tópico com as respostas.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/vinicut/api'
import { Avatar, Cartao, Carregando, Denunciar, Erro, Escrever, Nome, Texto, tempo, useDados, useVinicut } from './comum'

const CATEGORIAS = ['Humor', 'Música', 'Filmes e séries', 'Jogos', 'Esportes', 'Tecnologia', 'Cidades', 'Escola e faculdade', 'Trabalho', 'Comida', 'Outros']

function Icone({ nome, tamanho = 56 }) {
  return (
    <span className="vc-comunidade-icone" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.45 }} aria-hidden="true">
      {nome.trim()[0]?.toUpperCase()}
    </span>
  )
}

export function Comunidades() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [busca, setBusca] = useState('')
  const { dados, erro } = useDados(`/comunidades${busca ? `?q=${encodeURIComponent(busca)}` : ''}`)
  const [criar, setCriar] = useState(false)
  const [nova, setNova] = useState({ nome: '', descricao: '', categoria: 'Humor' })
  const [msg, setMsg] = useState('')
  return (
    <div className="vc-colunas vc-colunas-2">
      <section className="vc-meio">
        <Cartao
          titulo="comunidades"
          acao={
            <button type="button" className="vc-botao vc-botao-mini" onClick={() => setCriar((v) => !v)}>
              + criar comunidade
            </button>
          }
        >
          {criar && (
            <form
              className="vc-form"
              onSubmit={async (e) => {
                e.preventDefault()
                setMsg('')
                try {
                  const r = await api('/comunidades', { metodo: 'POST', dados: nova })
                  router.push(`/vinicut/c/${r.id}`)
                } catch (er) {
                  setMsg(er.message)
                }
              }}
            >
              <label>
                Nome
                <input required maxLength={80} value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} placeholder="Ex.: Eu odeio acordar cedo" />
              </label>
              <label>
                Categoria
                <select value={nova.categoria} onChange={(e) => setNova({ ...nova, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Descrição
                <textarea maxLength={1000} rows={3} value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} />
              </label>
              {msg && <p className="vc-erro">{msg}</p>}
              <button type="submit" className="vc-botao">
                criar
              </button>
            </form>
          )}
          <form
            className="vc-busca-local"
            onSubmit={(e) => {
              e.preventDefault()
              setBusca(q.trim())
            }}
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar comunidade" />
            <button type="submit" className="vc-botao vc-botao-claro">
              buscar
            </button>
          </form>
          {erro && <Erro erro={erro} />}
          {!dados && !erro && <Carregando />}
          <div className="vc-lista-comunidades">
            {dados?.comunidades.map((c) => (
              <Link key={c.id} href={`/vinicut/c/${c.id}`} className="vc-comunidade-linha">
                <Icone nome={c.nome} />
                <div>
                  <strong>{c.nome}</strong>
                  <span className="vc-mini">
                    {c.categoria && `${c.categoria} · `}
                    {c.membros} membro{c.membros === 1 ? '' : 's'}
                  </span>
                  {c.descricao && <span className="vc-mini vc-descricao">{c.descricao}</span>}
                </div>
              </Link>
            ))}
          </div>
          {dados && !dados.comunidades.length && <p className="vc-vazio">Nenhuma comunidade encontrada. Que tal criar?</p>}
        </Cartao>
      </section>
      <aside className="vc-direita">
        <Cartao titulo={`minhas comunidades (${dados?.minhas.length ?? 0})`}>
          {dados?.minhas.map((c) => (
            <Link key={c.id} href={`/vinicut/c/${c.id}`} className="vc-comunidade-linha vc-pequena">
              <Icone nome={c.nome} tamanho={36} />
              <span>{c.nome}</span>
            </Link>
          ))}
          {dados && !dados.minhas.length && <p className="vc-vazio">Você ainda não participa de nenhuma.</p>}
        </Cartao>
      </aside>
    </div>
  )
}

export function Comunidade({ id }) {
  const router = useRouter()
  const { dados: d, erro, recarregar } = useDados(`/c/${id}`)
  const [novo, setNovo] = useState(false)
  const [topico, setTopico] = useState({ titulo: '', texto: '' })
  const [msg, setMsg] = useState('')
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!d) return <Carregando />
  const c = d.comunidade
  return (
    <div className="vc-colunas vc-colunas-2">
      <section className="vc-meio">
        <Cartao className="vc-comunidade-topo">
          <Icone nome={c.nome} tamanho={96} />
          <div>
            <h1>{c.nome}</h1>
            <p className="vc-mini">
              {c.categoria && `${c.categoria} · `}
              {c.membros} membro{c.membros === 1 ? '' : 's'} · criada por <Nome pessoa={c.dono} />
            </p>
            {c.descricao && <Texto>{c.descricao}</Texto>}
            <div className="vc-perfil-acoes">
              {!d.souDono && (
                <button type="button" className={d.souMembro ? 'vc-botao vc-botao-claro' : 'vc-botao'} onClick={async () => (await api(`/c/${id}/participar`, { metodo: 'POST', dados: { sim: !d.souMembro } }), recarregar())}>
                  {d.souMembro ? '✓ participando (sair)' : '+ participar'}
                </button>
              )}
              <Denunciar tipo="comunidade" alvo={id} rotulo="denunciar comunidade" />
            </div>
          </div>
        </Cartao>
        <Cartao
          titulo={`fórum (${d.topicos.length})`}
          acao={
            d.souMembro && (
              <button type="button" className="vc-botao vc-botao-mini" onClick={() => setNovo((v) => !v)}>
                + novo tópico
              </button>
            )
          }
        >
          {novo && (
            <form
              className="vc-form"
              onSubmit={async (e) => {
                e.preventDefault()
                setMsg('')
                try {
                  const r = await api(`/c/${id}/topicos`, { metodo: 'POST', dados: topico })
                  router.push(`/vinicut/t/${r.id}`)
                } catch (er) {
                  setMsg(er.message)
                }
              }}
            >
              <label>
                Título
                <input required maxLength={120} value={topico.titulo} onChange={(e) => setTopico({ ...topico, titulo: e.target.value })} />
              </label>
              <label>
                Mensagem
                <textarea required maxLength={5000} rows={4} value={topico.texto} onChange={(e) => setTopico({ ...topico, texto: e.target.value })} />
              </label>
              {msg && <p className="vc-erro">{msg}</p>}
              <button type="submit" className="vc-botao">
                publicar tópico
              </button>
            </form>
          )}
          {!d.souMembro && <p className="vc-mini">Participe da comunidade para criar tópicos e responder.</p>}
          <table className="vc-forum">
            <thead>
              <tr>
                <th>tópico</th>
                <th>respostas</th>
                <th>última</th>
              </tr>
            </thead>
            <tbody>
              {d.topicos.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/vinicut/t/${t.id}`}>{t.titulo}</Link>
                    <span className="vc-mini"> por {t.autor.nome}</span>
                  </td>
                  <td>{t.respostas}</td>
                  <td className="vc-mini">{tempo(t.atualizado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!d.topicos.length && <p className="vc-vazio">Nenhum tópico ainda. Puxe o assunto!</p>}
        </Cartao>
      </section>
      <aside className="vc-direita">
        <Cartao titulo={`membros (${c.membros})`}>
          <div className="vc-grade">
            {d.membros.map((m) => (
              <Link key={m.id} href={`/vinicut/u/${m.usuario}`} className="vc-grade-item">
                <Avatar pessoa={m} tamanho={56} link={false} />
                <span>{m.nome}</span>
              </Link>
            ))}
          </div>
        </Cartao>
      </aside>
    </div>
  )
}

export function Topico({ id }) {
  const { eu } = useVinicut()
  const router = useRouter()
  const { dados: d, erro, recarregar } = useDados(`/t/${id}`)
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!d) return <Carregando />
  const t = d.topico
  return (
    <div className="vc-uma-coluna">
      <p className="vc-mini vc-trilha">
        <Link href="/vinicut/comunidades">comunidades</Link> › <Link href={`/vinicut/c/${t.comunidade.id}`}>{t.comunidade.nome}</Link>
      </p>
      <Cartao className="vc-topico">
        <h1>{t.titulo}</h1>
        <div className="vc-recado">
          <Avatar pessoa={t.autor} tamanho={48} />
          <div className="vc-recado-corpo">
            <div>
              <Nome pessoa={t.autor} /> <span className="vc-mini">{tempo(t.criado_em)}</span>
            </div>
            <Texto>{t.texto}</Texto>
            <div className="vc-recado-acoes">
              {d.podeApagar ? (
                <button type="button" className="vc-link-botao vc-mini" onClick={async () => confirm('Apagar o tópico e as respostas?') && (await api(`/topicos/${id}`, { metodo: 'DELETE' }), router.push(`/vinicut/c/${t.comunidade.id}`))}>
                  apagar tópico
                </button>
              ) : (
                <Denunciar tipo="topico" alvo={id} />
              )}
            </div>
          </div>
        </div>
      </Cartao>
      <Cartao titulo={`respostas (${d.respostas.length})`}>
        {d.respostas.map((r) => (
          <div key={r.id} className="vc-recado">
            <Avatar pessoa={r.autor} tamanho={40} />
            <div className="vc-recado-corpo">
              <div>
                <Nome pessoa={r.autor} /> <span className="vc-mini">{tempo(r.criado_em)}</span>
              </div>
              <Texto>{r.texto}</Texto>
              <div className="vc-recado-acoes">
                {r.autor.id === eu.id ? (
                  <button type="button" className="vc-link-botao vc-mini" onClick={async () => (await api(`/respostas/${r.id}`, { metodo: 'DELETE' }), recarregar())}>
                    apagar
                  </button>
                ) : (
                  <Denunciar tipo="resposta" alvo={r.id} />
                )}
              </div>
            </div>
          </div>
        ))}
        {!d.respostas.length && <p className="vc-vazio">Nenhuma resposta ainda.</p>}
        {d.souMembro ? (
          <Escrever
            placeholder="Escreva a sua resposta…"
            botao="responder"
            max={5000}
            aoEnviar={async (texto) => {
              await api(`/t/${id}/respostas`, { metodo: 'POST', dados: { texto } })
              recarregar()
            }}
          />
        ) : (
          <p className="vc-mini">
            <Link href={`/vinicut/c/${t.comunidade.id}`}>Participe da comunidade</Link> para responder.
          </p>
        )}
      </Cartao>
    </div>
  )
}
