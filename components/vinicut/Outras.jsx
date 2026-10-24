'use client'

// Telas menores do Vinicut: amigos e pedidos, busca, notificações, editar perfil, moderação e regras.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api, enviarFoto } from '@/lib/vinicut/api'
import { Avatar, Cartao, Carregando, Erro, Nome, Texto, tempo, useDados, useVinicut } from './comum'
import { PessoaLinha } from './Inicio'

export function Amigos() {
  const { eu, recarregarEu } = useVinicut()
  const pedidos = useDados('/pedidos')
  const amigos = useDados(`/u/${eu.usuario}/amigos`)
  const responder = async (usuario, acao) => {
    await api(`/u/${usuario}/amizade`, { metodo: 'POST', dados: { acao } })
    pedidos.recarregar()
    amigos.recarregar()
    recarregarEu()
  }
  return (
    <div className="vc-uma-coluna">
      {pedidos.dados?.pedidos.length > 0 && (
        <Cartao titulo={`pedidos de amizade (${pedidos.dados.pedidos.length})`}>
          {pedidos.dados.pedidos.map((p) => (
            <PessoaLinha
              key={p.id}
              pessoa={p}
              extra={
                <span className="vc-perfil-acoes">
                  <button type="button" className="vc-botao vc-botao-mini" onClick={() => responder(p.usuario, 'aceitar')}>
                    aceitar
                  </button>
                  <button type="button" className="vc-link-botao vc-mini" onClick={() => responder(p.usuario, 'recusar')}>
                    recusar
                  </button>
                </span>
              }
            />
          ))}
        </Cartao>
      )}
      <Cartao titulo={`meus amigos (${amigos.dados?.amigos.length ?? 0})`}>
        {!amigos.dados && <Carregando />}
        <div className="vc-grade vc-grade-larga">
          {amigos.dados?.amigos.map((a) => (
            <Link key={a.id} href={`/vinicut/u/${a.usuario}`} className="vc-grade-item">
              <Avatar pessoa={a} tamanho={80} link={false} />
              <span>{a.nome}</span>
            </Link>
          ))}
        </div>
        {amigos.dados && !amigos.dados.amigos.length && <p className="vc-vazio">Nenhum amigo ainda. Use a busca ou veja as sugestões no início.</p>}
      </Cartao>
    </div>
  )
}

export function Busca() {
  const q = useSearchParams().get('q') ?? ''
  const { dados, erro } = useDados(`/busca?q=${encodeURIComponent(q)}`)
  return (
    <div className="vc-uma-coluna">
      <Cartao titulo={`busca: "${q}"`}>
        {erro && <Erro erro={erro} />}
        {!dados && !erro && <Carregando />}
        {dados && (
          <>
            <h3 className="vc-subtitulo">pessoas ({dados.pessoas.length})</h3>
            {dados.pessoas.map((p) => (
              <PessoaLinha key={p.id} pessoa={p} />
            ))}
            {!dados.pessoas.length && <p className="vc-vazio">Ninguém encontrado.</p>}
            <h3 className="vc-subtitulo">comunidades ({dados.comunidades.length})</h3>
            {dados.comunidades.map((c) => (
              <Link key={c.id} href={`/vinicut/c/${c.id}`} className="vc-comunidade-linha vc-pequena">
                <span className="vc-comunidade-icone" style={{ width: 36, height: 36, fontSize: 16 }} aria-hidden="true">
                  {c.nome.trim()[0]?.toUpperCase()}
                </span>
                <span>
                  {c.nome} <span className="vc-mini">· {c.membros} membros</span>
                </span>
              </Link>
            ))}
            {!dados.comunidades.length && <p className="vc-vazio">Nenhuma comunidade encontrada.</p>}
          </>
        )}
      </Cartao>
    </div>
  )
}

const FRASE = {
  recado: 'deixou um recado para você',
  depoimento: 'escreveu um depoimento para você (aprove no seu perfil)',
  amizade: 'quer ser seu amigo(a)',
  aceitou: 'aceitou o seu pedido de amizade',
  fa: 'virou seu fã ⭐',
  comentario: 'comentou no seu post',
  reacao: 'reagiu ao seu post',
  resposta: 'respondeu ao seu tópico',
}

function linkDa(n, eu) {
  if (n.tipo === 'recado') return `/vinicut/u/${eu.usuario}/recados`
  if (n.tipo === 'depoimento') return `/vinicut/u/${eu.usuario}#depoimentos`
  if (n.tipo === 'amizade') return '/vinicut/amigos'
  if (n.tipo === 'resposta') return `/vinicut/t/${n.ref}`
  if (n.tipo === 'comentario' || n.tipo === 'reacao') return `/vinicut/u/${eu.usuario}`
  return `/vinicut/u/${n.de.usuario}`
}

export function Notificacoes() {
  const { eu, recarregarEu } = useVinicut()
  const { dados, erro } = useDados('/notificacoes')
  useEffect(() => {
    if (dados) api('/notificacoes/lidas', { metodo: 'POST' }).then(recarregarEu, () => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados])
  return (
    <div className="vc-uma-coluna">
      <Cartao titulo="notificações">
        {erro && <Erro erro={erro} />}
        {!dados && !erro && <Carregando />}
        {dados?.notificacoes.map((n) => (
          <Link key={n.id} href={linkDa(n, eu)} className={n.lida ? 'vc-notificacao' : 'vc-notificacao nova'}>
            <Avatar pessoa={n.de} tamanho={40} link={false} />
            <span>
              <strong>{n.de.nome}</strong> {FRASE[n.tipo] ?? n.tipo}
              <span className="vc-mini"> · {tempo(n.criado_em)}</span>
            </span>
          </Link>
        ))}
        {dados && !dados.notificacoes.length && <p className="vc-vazio">Nada por aqui ainda.</p>}
      </Cartao>
    </div>
  )
}

const RELACIONAMENTOS = ['', 'solteiro(a)', 'namorando', 'casado(a)', 'enrolado(a)', 'prefiro não dizer']

export function Editar() {
  const { eu, recarregarEu, sairConta } = useVinicut()
  const [f, setF] = useState({ nome: eu.nome, usuario: eu.usuario, cidade: eu.cidade, relacionamento: eu.relacionamento, aniversario: eu.aniversario, quem_sou_eu: eu.quem_sou_eu, interesses: eu.interesses })
  const [msg, setMsg] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const campo = (k) => ({ value: f[k] ?? '', onChange: (e) => setF({ ...f, [k]: e.target.value }) })
  return (
    <div className="vc-uma-coluna">
      <Cartao titulo="editar perfil">
        <div className="vc-editar-foto">
          <Avatar pessoa={eu} tamanho={120} link={false} />
          <label className="vc-botao vc-botao-claro">
            {enviando ? 'enviando…' : 'trocar foto'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={enviando}
              onChange={async (e) => {
                const arq = e.target.files?.[0]
                if (!arq) return
                setEnviando(true)
                try {
                  const r = await enviarFoto(arq, 'foto do perfil')
                  await api('/perfil', { metodo: 'PATCH', dados: { foto: r.chave } })
                  await recarregarEu()
                } catch (er) {
                  setMsg({ ok: false, texto: er.message })
                } finally {
                  setEnviando(false)
                }
              }}
            />
          </label>
        </div>
        <form
          className="vc-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setMsg(null)
            try {
              await api('/perfil', { metodo: 'PATCH', dados: f })
              await recarregarEu()
              setMsg({ ok: true, texto: 'Perfil salvo!' })
            } catch (er) {
              setMsg({ ok: false, texto: er.message })
            }
          }}
        >
          <label>
            Nome
            <input required maxLength={60} {...campo('nome')} />
          </label>
          <label>
            @ (endereço do perfil)
            <input required maxLength={24} {...campo('usuario')} />
          </label>
          <label>
            Cidade
            <input maxLength={60} {...campo('cidade')} />
          </label>
          <label>
            Relacionamento
            <select {...campo('relacionamento')}>
              {RELACIONAMENTOS.map((r) => (
                <option key={r} value={r}>
                  {r || '—'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Aniversário (dia e mês)
            <input
              type="date"
              value={f.aniversario ? `2000-${f.aniversario}` : ''}
              onChange={(e) => setF({ ...f, aniversario: e.target.value ? e.target.value.slice(5) : '' })}
            />
          </label>
          <label>
            Quem sou eu
            <textarea maxLength={2000} rows={5} {...campo('quem_sou_eu')} />
          </label>
          <label>
            Interesses
            <input maxLength={500} {...campo('interesses')} placeholder="música, viagens, programação…" />
          </label>
          {msg && <p className={msg.ok ? 'vc-ok' : 'vc-erro'}>{msg.texto}</p>}
          <button type="submit" className="vc-botao">
            salvar
          </button>
        </form>
      </Cartao>
      <Cartao titulo="conta">
        <p className="vc-mini">Sair desta conta neste aparelho, ou apagar o seu perfil do Vinicut com tudo o que você publicou (recados, posts, fotos, depoimentos). A conta do site continua.</p>
        <div className="vc-perfil-acoes">
          <button type="button" className="vc-botao vc-botao-claro" onClick={sairConta}>
            sair
          </button>
          <button
            type="button"
            className="vc-botao vc-botao-perigo"
            onClick={async () => {
              if (prompt('Isso apaga o seu perfil e tudo o que você publicou, para sempre. Digite APAGAR para confirmar.') !== 'APAGAR') return
              await api('/perfil', { metodo: 'DELETE' })
              location.href = '/vinicut'
            }}
          >
            apagar meu perfil
          </button>
        </div>
      </Cartao>
    </div>
  )
}

export function Moderacao() {
  const { dados, erro, recarregar } = useDados('/moderacao')
  if (erro) return <div className="vc-centro"><Erro erro={erro} /></div>
  if (!dados) return <Carregando />
  const decidir = async (id, acao) => {
    if (acao === 'banir' && !confirm('Banir o autor? O perfil some do Vinicut.')) return
    await api('/moderacao', { metodo: 'POST', dados: { id, acao } })
    recarregar()
  }
  return (
    <div className="vc-uma-coluna">
      <Cartao titulo={`moderação · ${dados.denuncias.length} denúncia(s) abertas`}>
        {dados.denuncias.map((d) => (
          <div key={d.id} className="vc-denuncia">
            <div className="vc-mini">
              {d.tipo} denunciado por <Nome pessoa={d.de} /> · {tempo(d.criado_em)}
            </div>
            <p>
              <strong>Motivo:</strong> {d.motivo}
            </p>
            {d.conteudo ? (
              <div className="vc-denuncia-conteudo">
                <span className="vc-mini">de @{d.conteudo.autor}</span>
                <Texto>{d.conteudo.texto}</Texto>
                {d.conteudo.foto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.conteudo.foto} alt="" />
                )}
              </div>
            ) : (
              <p className="vc-mini">O conteúdo já foi apagado.</p>
            )}
            <div className="vc-perfil-acoes">
              <button type="button" className="vc-botao vc-botao-mini" onClick={() => decidir(d.id, 'remover')}>
                remover conteúdo
              </button>
              <button type="button" className="vc-botao vc-botao-perigo vc-botao-mini" onClick={() => decidir(d.id, 'banir')}>
                remover e banir autor
              </button>
              <button type="button" className="vc-link-botao vc-mini" onClick={() => decidir(d.id, 'ignorar')}>
                ignorar
              </button>
            </div>
          </div>
        ))}
        {!dados.denuncias.length && <p className="vc-vazio">Nenhuma denúncia aberta. 🎉</p>}
      </Cartao>
    </div>
  )
}

export function Regras() {
  return (
    <div className="vc-uma-coluna">
      <Cartao titulo="regras e privacidade do vinicut" className="vc-regras">
        <h3>Quem pode usar</h3>
        <p>O Vinicut é para maiores de 18 anos. Use o seu nome de verdade ou um apelido, mas não se passe por outra pessoa.</p>
        <h3>O que não pode</h3>
        <ul>
          <li>Ofensas, ameaças, assédio, discurso de ódio ou discriminação.</li>
          <li>Golpes, spam, propaganda em massa e links maliciosos.</li>
          <li>Nudez, conteúdo sexual ou violento, e qualquer conteúdo envolvendo menores.</li>
          <li>Dados pessoais de outras pessoas sem autorização (telefone, endereço, documentos).</li>
          <li>Conteúdo que viole direitos autorais ou a lei.</li>
        </ul>
        <p>Quem descumprir pode ter o conteúdo removido e o perfil banido. Viu algo errado? Use &quot;denunciar&quot;: a moderação analisa.</p>
        <h3>Privacidade</h3>
        <ul>
          <li>Seu perfil, recados, depoimentos aprovados, posts, fotos e comunidades ficam visíveis para quem tem conta no Vinicut.</li>
          <li>&quot;Quem visitou meu perfil&quot; só o dono vê. Seu e-mail não aparece para ninguém.</li>
          <li>Você pode bloquear qualquer pessoa, apagar o que publicou e apagar o seu perfil inteiro em &quot;editar perfil&quot; (LGPD).</li>
          <li>Os dados ficam na Cloudflare (banco de dados e fotos). Não vendemos nem compartilhamos com terceiros.</li>
        </ul>
        <p className="vc-mini">
          Dúvidas: <Link href="/#contato">fale comigo</Link>.
        </p>
      </Cartao>
    </div>
  )
}
