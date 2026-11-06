// Capa do Meu Jornal: jornal de papel, simples e limpo. Sem estado (serve no servidor e na prévia do editor).

import { fotoUrl } from '@/lib/jornal/api'
import { dataExtenso, edicao, organizarCapa, paragrafos, resumo } from '@/lib/jornal/formato'

export function classesPapel(config) {
  return ['jn', `jn-papel-${config.papel}`, config.fotosPB ? 'jn-pb' : ''].filter(Boolean).join(' ')
}

export function Cabecalho({ jornal, materias, compacto = false }) {
  const c = jornal.config
  const ed = edicao(jornal, materias)
  const href = `/j/${jornal.slug}`
  if (compacto) {
    return (
      <header className="jn-cab jn-cab-compacto">
        <a href={href} className={`jn-nome jn-letreiro-${c.letreiro}`}>{jornal.nome}</a>
        <p className="jn-linha-ed">{[c.cidade, dataExtenso(ed.data)].filter(Boolean).join(', ')}</p>
      </header>
    )
  }
  return (
    <header className="jn-cab">
      <div className="jn-linha-ed">
        <span>Ano {ed.ano} · Nº {ed.numero}</span>
        <span className="jn-data">{[c.cidade, dataExtenso(ed.data)].filter(Boolean).join(', ')}</span>
        <span>{c.preco || 'Distribuição gratuita'}</span>
      </div>
      <h1><a href={href} className={`jn-nome jn-letreiro-${c.letreiro}`}>{jornal.nome}</a></h1>
      {c.lema && <p className="jn-lema">{c.lema}</p>}
    </header>
  )
}

function Foto({ m, grande }) {
  if (!m.foto) return null
  return (
    <figure className={`jn-foto${grande ? ' grande' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fotoUrl(m.foto)} alt={m.legenda || m.titulo} loading="lazy" />
      {m.legenda && <figcaption>{m.legenda}</figcaption>}
    </figure>
  )
}

const Chapeu = ({ m }) => (m.secao ? <p className="jn-chapeu">{m.secao}</p> : null)

export default function Capa({ jornal, materias }) {
  const { manchete, destaques, normais, curtas, secoes } = organizarCapa(materias)
  const link = (m) => `/j/${jornal.slug}/${m.id}`
  const vazio = !manchete && !curtas.length

  return (
    <div className={classesPapel(jornal.config)}>
      <div className="jn-folha">
        <Cabecalho jornal={jornal} materias={materias.filter((m) => m.estado === 'publicada')} />
        {secoes.length > 0 && <nav className="jn-secoes" aria-label="Seções desta edição">Nesta edição: {secoes.join(' · ')}</nav>}

        {vazio && <p className="jn-vazio">Edição em preparação. Volte em breve para as primeiras notícias.</p>}

        {manchete && (
          <article className="jn-manchete">
            <Chapeu m={manchete} />
            <h2><a href={link(manchete)}>{manchete.titulo}</a></h2>
            {manchete.linha_fina && <p className="jn-fina">{manchete.linha_fina}</p>}
            <div className={`jn-manchete-corpo${manchete.foto ? ' com-foto' : ''}`}>
              <Foto m={manchete} grande />
              <div className="jn-colunas">
                {manchete.autor && <p className="jn-autor">Por {manchete.autor}</p>}
                {paragrafos(manchete.texto).slice(0, 3).map((p, i) => <p key={i}>{p}</p>)}
                {paragrafos(manchete.texto).length > 3 && <a className="jn-mais" href={link(manchete)}>Continua na página da matéria →</a>}
              </div>
            </div>
          </article>
        )}

        {(destaques.length > 0 || normais.length > 0 || curtas.length > 0) && (
          <div className={`jn-corpo${curtas.length ? ' com-curtas' : ''}`}>
            <div className="jn-principal">
              {destaques.length > 0 && (
                <div className="jn-destaques">
                  {destaques.map((m) => (
                    <article key={m.id} className="jn-destaque">
                      <Foto m={m} />
                      <Chapeu m={m} />
                      <h3><a href={link(m)}>{m.titulo}</a></h3>
                      {m.linha_fina && <p className="jn-fina">{m.linha_fina}</p>}
                      <p>{resumo(m.texto, 280)}</p>
                      <a className="jn-mais" href={link(m)}>Leia mais →</a>
                    </article>
                  ))}
                </div>
              )}
              {normais.length > 0 && (
                <div className="jn-normais">
                  {normais.map((m) => (
                    <article key={m.id} className="jn-normal">
                      <Chapeu m={m} />
                      <h4><a href={link(m)}>{m.titulo}</a></h4>
                      <Foto m={m} />
                      <p>{resumo(m.texto, 200)}</p>
                      <a className="jn-mais" href={link(m)}>Leia mais →</a>
                    </article>
                  ))}
                </div>
              )}
            </div>
            {curtas.length > 0 && (
              <aside className="jn-curtas" aria-label="Notas curtas">
                <h3 className="jn-curtas-titulo">Curtas</h3>
                {curtas.map((m) => (
                  <article key={m.id} className="jn-curta" id={`m-${m.id}`}>
                    <h5>{m.titulo}</h5>
                    {paragrafos(m.texto).map((p, i) => <p key={i}>{p}</p>)}
                  </article>
                ))}
              </aside>
            )}
          </div>
        )}

        <footer className="jn-rodape">
          <p><strong>{jornal.nome}</strong>{jornal.config.editor ? ` · Editado por ${jornal.config.editor}` : ''}{jornal.config.cidade ? ` · ${jornal.config.cidade}` : ''}</p>
          <p>Feito com o <a href="/jornal">Meu Jornal</a>, do soudev. Crie o seu de graça.</p>
        </footer>
      </div>
    </div>
  )
}
