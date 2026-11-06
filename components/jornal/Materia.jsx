// Página de uma matéria do Meu Jornal.

import { fotoUrl } from '@/lib/jornal/api'
import { dataExtenso, paragrafos } from '@/lib/jornal/formato'
import { Cabecalho, classesPapel } from './Capa'

export default function Materia({ jornal, materias, materia: m }) {
  const outras = materias.filter((x) => x.id !== m.id && x.peso !== 'curta').slice(0, 6)
  const ps = paragrafos(m.texto)
  return (
    <div className={classesPapel(jornal.config)}>
      <div className="jn-folha">
        <Cabecalho jornal={jornal} materias={materias} compacto />
        <article className="jn-leitura">
          {m.secao && <p className="jn-chapeu">{m.secao}</p>}
          <h1>{m.titulo}</h1>
          {m.linha_fina && <p className="jn-fina">{m.linha_fina}</p>}
          <p className="jn-assina">
            {m.autor ? <>Por <strong>{m.autor}</strong> · </> : null}
            {dataExtenso(m.publicado_em || m.criado_em)}
          </p>
          {m.foto && (
            <figure className="jn-foto grande">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotoUrl(m.foto)} alt={m.legenda || m.titulo} />
              {m.legenda && <figcaption>{m.legenda}</figcaption>}
            </figure>
          )}
          <div className="jn-texto">
            {ps.map((p, i) => <p key={i} className={i === 0 ? 'jn-capitular' : undefined}>{p}</p>)}
          </div>
          <p className="jn-fim">■</p>
        </article>
        <nav className="jn-voltar"><a href={`/j/${jornal.slug}`}>← Voltar para a capa</a></nav>
        {outras.length > 0 && (
          <section className="jn-outras">
            <h2>Mais notícias</h2>
            <ul>
              {outras.map((x) => (
                <li key={x.id}>
                  {x.secao && <span className="jn-chapeu">{x.secao}</span>}
                  <a href={`/j/${jornal.slug}/${x.id}`}>{x.titulo}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
