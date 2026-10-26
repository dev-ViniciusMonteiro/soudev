'use client'

// Buscador de filmes, séries e livros. Filmes/séries vêm da TMDB (via /api/midia, que esconde a
// chave) com busca por texto, filtros avançados (gênero, década, nota, "onde assistir" por streaming
// no Brasil), detalhes, elenco, trailer e recomendações. Livros vêm do Google Books (sem chave).

import { useCallback, useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { fetchJson } from '@/lib/apis'
import { Notice, Tabs } from '../ui'

const IMG = (path, size = 'w342') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null)
const DECADAS = [2020, 2010, 2000, 1990, 1980, 1970, 1960]
const SORTS = [
  ['popularity.desc', 'Mais populares'],
  ['vote_average.desc', 'Melhor avaliados'],
  ['primary_release_date.desc', 'Mais recentes'],
  ['revenue.desc', 'Maiores bilheterias'],
]
const ano = (d) => (d ? String(d).slice(0, 4) : '')

function normalizarTmdb(x, tipoForcado) {
  const mt = tipoForcado || (x.media_type === 'tv' ? 'serie' : 'filme')
  return {
    id: x.id, tipo: mt,
    titulo: x.title || x.name || 'Sem título',
    ano: ano(x.release_date || x.first_air_date),
    nota: x.vote_average ? Math.round(x.vote_average * 10) / 10 : null,
    poster: IMG(x.poster_path),
    overview: x.overview || '',
  }
}

export default function BuscadorMidia() {
  const [tipo, setTipo] = useState('filme') // filme | serie | livro
  const [query, setQuery] = useState('')
  const [busca, setBusca] = useState('') // termo efetivamente buscado
  const [filtros, setFiltros] = useState({ genero: '', decada: '', notaMin: '', sort: 'popularity.desc', providers: [] })
  const [generos, setGeneros] = useState({ movie: [], tv: [] })
  const [providers, setProviders] = useState([])
  const [itens, setItens] = useState([])
  const [pagina, setPagina] = useState(1)
  const [totalPag, setTotalPag] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [semChave, setSemChave] = useState(false)
  const [sel, setSel] = useState(null)
  const [selLoad, setSelLoad] = useState(false)
  const reqId = useRef(0)

  const generosDoTipo = tipo === 'serie' ? generos.tv : generos.movie

  /* carrega gêneros e provedores uma vez */
  useEffect(() => {
    fetchJson('/api/midia?action=genres').then(setGeneros).catch(() => {})
    fetchJson('/api/midia?action=providers').then((d) => Array.isArray(d) && setProviders(d)).catch(() => {})
  }, [])

  const carregar = useCallback(async (reset = true) => {
    const id = ++reqId.current
    const page = reset ? 1 : pagina + 1
    setCarregando(true); setErro(''); if (reset) setSemChave(false)
    try {
      if (tipo === 'livro') {
        const data = await buscarLivros(busca || 'mais vendidos', page)
        if (id !== reqId.current) return
        setItens((prev) => (reset ? data.itens : [...prev, ...data.itens]))
        setTotalPag(data.total); setPagina(page)
      } else {
        let url
        if (busca.trim()) url = `/api/midia?action=search&q=${encodeURIComponent(busca)}&page=${page}`
        else {
          const f = filtros
          const prov = f.providers.join('|')
          url = `/api/midia?action=discover&type=${tipo}&page=${page}` +
            (f.genero ? `&genero=${f.genero}` : '') + (f.decada ? `&decada=${f.decada}` : '') +
            (f.notaMin ? `&notaMin=${f.notaMin}` : '') + (prov ? `&provider=${encodeURIComponent(prov)}` : '') +
            `&sort=${encodeURIComponent(f.sort)}`
        }
        const data = await fetchJson(url)
        if (id !== reqId.current) return
        let lista = (data.results || []).filter((x) => busca.trim() ? (x.media_type === 'movie' || x.media_type === 'tv') : true)
        lista = lista.map((x) => normalizarTmdb(x, busca.trim() ? undefined : tipo))
        setItens((prev) => (reset ? lista : [...prev, ...lista]))
        setTotalPag(data.total_pages || 1); setPagina(page)
      }
    } catch (e) {
      if (id !== reqId.current) return
      if (e?.status === 503) { setSemChave(true); setItens([]) }
      else setErro('Não foi possível buscar agora. Tente novamente em instantes.')
    } finally {
      if (id === reqId.current) setCarregando(false)
    }
  }, [tipo, busca, filtros, pagina])

  /* busca inicial e quando muda tipo/filtros/termo */
  useEffect(() => { carregar(true) /* eslint-disable-next-line */ }, [tipo, busca, filtros])

  const submit = (e) => { e.preventDefault(); setBusca(query.trim()); track('midia_buscar', { tipo, q: query.slice(0, 40) }) }
  const setF = (k, v) => setFiltros((f) => ({ ...f, [k]: v }))
  const toggleProv = (id) => setFiltros((f) => ({ ...f, providers: f.providers.includes(id) ? f.providers.filter((x) => x !== id) : [...f.providers, id] }))
  const limparFiltros = () => { setFiltros({ genero: '', decada: '', notaMin: '', sort: 'popularity.desc', providers: [] }); setQuery(''); setBusca('') }

  const abrir = async (item) => {
    if (item.tipo === 'livro') { setSel(item); return }
    setSelLoad(true); setSel({ ...item, _carregando: true })
    try {
      const d = await fetchJson(`/api/midia?action=details&type=${item.tipo}&id=${item.id}`)
      setSel({ ...normalizarTmdb(d, item.tipo), raw: d, tipo: item.tipo })
    } catch { setSel({ ...item, erro: true }) } finally { setSelLoad(false) }
  }

  const mudarTipo = (t) => { setTipo(t); setQuery(''); setBusca(''); setItens([]); setPagina(1) }

  return (
    <div className="bm">
      <style>{CSS}</style>

      <Tabs value={tipo} onChange={mudarTipo} tabs={[['filme', '🎬 Filmes'], ['serie', '📺 Séries'], ['livro', '📚 Livros']]} />

      <form className="bm-busca" onSubmit={submit}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tipo === 'livro' ? 'Buscar por título, autor ou assunto…' : 'Buscar por nome do filme ou série…'} aria-label="Buscar" />
        <button type="submit" className="btn btn-primary">Buscar</button>
        {busca && <button type="button" className="btn btn-ghost" onClick={() => { setQuery(''); setBusca('') }}>Limpar</button>}
      </form>

      {tipo !== 'livro' && (
        <div className="bm-filtros">
          <p className="bm-filtros-ttl">Descobrir por filtros {busca && <span className="muted">(ignorados enquanto há uma busca por nome)</span>}</p>
          <div className="bm-filtros-row">
            <label>Gênero
              <select value={filtros.genero} onChange={(e) => setF('genero', e.target.value)}>
                <option value="">Todos</option>
                {generosDoTipo.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label>Década
              <select value={filtros.decada} onChange={(e) => setF('decada', e.target.value)}>
                <option value="">Qualquer</option>
                {DECADAS.map((d) => <option key={d} value={d}>{d}s</option>)}
              </select>
            </label>
            <label>Nota mínima
              <select value={filtros.notaMin} onChange={(e) => setF('notaMin', e.target.value)}>
                <option value="">Qualquer</option>
                {[9, 8, 7, 6, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <label>Ordenar
              <select value={filtros.sort} onChange={(e) => setF('sort', e.target.value)}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          {providers.length > 0 && (
            <div className="bm-prov">
              <span className="bm-prov-lbl">Onde assistir:</span>
              {providers.map((p) => (
                <button key={p.id} type="button" className={'bm-prov-chip' + (filtros.providers.includes(p.id) ? ' sel' : '')} onClick={() => toggleProv(p.id)} title={p.nome}>
                  {p.logo ? <img src={IMG(p.logo, 'w45')} alt={p.nome} /> : p.nome}
                </button>
              ))}
            </div>
          )}
          {(filtros.genero || filtros.decada || filtros.notaMin || filtros.providers.length > 0 || filtros.sort !== 'popularity.desc') &&
            <button type="button" className="btn btn-ghost btn-sm bm-limpar" onClick={limparFiltros}>Limpar filtros</button>}
        </div>
      )}

      {semChave && <Notice kind="warning">A busca de filmes e séries precisa da chave da TMDB configurada no servidor (variável <b>TMDB_BEARER</b>). A busca de livros funciona normalmente.</Notice>}
      {erro && <Notice kind="error">{erro}</Notice>}

      <div className="bm-grid" aria-busy={carregando}>
        {itens.map((x) => (
          <button className="bm-card" key={x.tipo + x.id} onClick={() => abrir(x)}>
            <span className="bm-poster">
              {x.poster ? <img src={x.poster} alt={x.titulo} loading="lazy" /> : <span className="bm-noposter">{x.tipo === 'livro' ? '📚' : '🎬'}</span>}
              {x.nota ? <span className="bm-nota">★ {x.nota}</span> : null}
            </span>
            <span className="bm-tit">{x.titulo}</span>
            <span className="bm-meta">{x.ano}{x.tipo === 'livro' && x.autor ? ` · ${x.autor}` : ''}</span>
          </button>
        ))}
      </div>

      {carregando && <p className="muted bm-info"><span className="spinner" aria-hidden="true" /> Carregando…</p>}
      {!carregando && !semChave && itens.length === 0 && <p className="muted bm-info">Nada encontrado. Tente outro termo ou ajuste os filtros.</p>}
      {!carregando && itens.length > 0 && pagina < totalPag && <div className="bm-mais"><button className="btn" onClick={() => carregar(false)}>Carregar mais</button></div>}

      {sel && <Modal item={sel} onClose={() => setSel(null)} onAbrir={abrir} />}
    </div>
  )
}

/* ---------- livros (Google Books, sem chave) ---------- */
async function buscarLivros(q, page) {
  const start = (page - 1) * 20
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&startIndex=${start}&langRestrict=pt&country=BR`
  const data = await fetchJson(url)
  const itens = (data.items || []).map((it) => {
    const v = it.volumeInfo || {}
    const img = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace('http://', 'https://')
    return {
      id: it.id, tipo: 'livro', titulo: v.title || 'Sem título', ano: ano(v.publishedDate),
      autor: (v.authors || []).join(', '), nota: v.averageRating || null, poster: img || null,
      overview: v.description || '', editora: v.publisher || '', paginas: v.pageCount || null,
      categorias: v.categories || [], link: v.infoLink || v.previewLink || '',
    }
  })
  return { itens, total: Math.min(Math.ceil((data.totalItems || 0) / 20), 50) }
}

/* ---------- modal de detalhes ---------- */
function Modal({ item, onClose, onAbrir }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const d = item.raw
  const livro = item.tipo === 'livro'
  const trailer = d?.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || d?.videos?.results?.find((v) => v.site === 'YouTube')
  const wp = d?.['watch/providers']?.results?.BR
  const elenco = (d?.credits?.cast || []).slice(0, 8)
  const recs = [...(d?.recommendations?.results || []), ...(d?.similar?.results || [])].slice(0, 12)
  const generos = (d?.genres || []).map((g) => g.name)
  const duracao = d ? (item.tipo === 'serie'
    ? `${d.number_of_seasons || '?'} temporada(s) · ${d.number_of_episodes || '?'} ep.`
    : d.runtime ? `${d.runtime} min` : '') : ''

  return (
    <div className="bm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.titulo}>
      <div className="bm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bm-fechar" onClick={onClose} aria-label="Fechar">×</button>
        {d?.backdrop_path && <div className="bm-backdrop" style={{ backgroundImage: `url(${IMG(d.backdrop_path, 'w780')})` }} />}
        <div className="bm-modal-body">
          <div className="bm-modal-head">
            {item.poster ? <img className="bm-modal-poster" src={item.poster} alt="" /> : <div className="bm-modal-poster bm-noposter">{livro ? '📚' : '🎬'}</div>}
            <div className="bm-modal-info">
              <h3>{item.titulo} {item.ano && <span className="bm-ano">({item.ano})</span>}</h3>
              <p className="bm-sub">
                {item.nota ? <b className="bm-nota-inline">★ {item.nota}</b> : null}
                {livro ? item.autor : [duracao, ...generos].filter(Boolean).join(' · ')}
              </p>
              {livro && <p className="bm-sub muted">{[item.editora, item.paginas && `${item.paginas} págs.`, (item.categorias || []).join(', ')].filter(Boolean).join(' · ')}</p>}
              <div className="bm-modal-acoes">
                {trailer && <a className="btn btn-primary btn-sm" href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener">▶ Trailer</a>}
                {wp?.link && <a className="btn btn-ghost btn-sm" href={wp.link} target="_blank" rel="noopener">Onde assistir (JustWatch)</a>}
                {livro && item.link && <a className="btn btn-ghost btn-sm" href={item.link} target="_blank" rel="noopener">Ver no Google Books</a>}
              </div>
            </div>
          </div>

          {item._carregando && <p className="muted bm-info"><span className="spinner" aria-hidden="true" /> Carregando detalhes…</p>}
          {(item.overview || d?.overview) && <p className="bm-overview">{item.overview || d.overview}</p>}

          {!livro && wp && <OndeAssistir wp={wp} />}

          {elenco.length > 0 && (
            <section className="bm-sec">
              <h4>Elenco</h4>
              <div className="bm-elenco">
                {elenco.map((a) => (
                  <div className="bm-ator" key={a.id}>
                    {a.profile_path ? <img src={IMG(a.profile_path, 'w185')} alt="" loading="lazy" /> : <span className="bm-noface">👤</span>}
                    <b>{a.name}</b><small>{a.character}</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recs.length > 0 && (
            <section className="bm-sec">
              <h4>Você também pode gostar</h4>
              <div className="bm-recs">
                {recs.map((r) => {
                  const n = normalizarTmdb(r, r.media_type === 'tv' ? 'serie' : r.media_type === 'movie' ? 'filme' : item.tipo)
                  return (
                    <button className="bm-rec" key={n.id} onClick={() => onAbrir(n)}>
                      {n.poster ? <img src={n.poster} alt="" loading="lazy" /> : <span className="bm-noposter">🎬</span>}
                      <span>{n.titulo}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function OndeAssistir({ wp }) {
  const grupos = [['Assinatura / grátis', [...(wp.flatrate || []), ...(wp.free || []), ...(wp.ads || [])]], ['Alugar', wp.rent || []], ['Comprar', wp.buy || []]]
  const temAlgo = grupos.some(([, l]) => l.length)
  if (!temAlgo) return <section className="bm-sec"><h4>Onde assistir</h4><p className="muted">Sem opções de streaming listadas no Brasil no momento.</p></section>
  const vistos = new Set()
  return (
    <section className="bm-sec">
      <h4>Onde assistir no Brasil</h4>
      {grupos.filter(([, l]) => l.length).map(([titulo, lista]) => (
        <div className="bm-wp-grupo" key={titulo}>
          <span className="bm-wp-lbl">{titulo}</span>
          <div className="bm-wp-logos">
            {lista.filter((p) => { if (vistos.has(p.provider_id)) return false; vistos.add(p.provider_id); return true }).map((p) => (
              <span className="bm-wp-logo" key={p.provider_id} title={p.provider_name}>
                {p.logo_path ? <img src={IMG(p.logo_path, 'w92')} alt={p.provider_name} /> : p.provider_name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

/* ---------- estilos ---------- */
const CSS = `
.bm{margin-top:14px}
.bm .btn-sm{padding:6px 10px;font-size:13px}
.bm-busca{display:flex;gap:8px;margin:14px 0;flex-wrap:wrap}
.bm-busca input{flex:1;min-width:200px;padding:11px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.bm-filtros{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:14px}
.bm-filtros-ttl{font-size:13px;color:var(--muted);margin:0 0 8px}
.bm-filtros-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.bm-filtros label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}
.bm-filtros select{padding:8px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit;font-weight:400}
.bm-prov{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
.bm-prov-lbl{font-size:13px;font-weight:600}
.bm-prov-chip{padding:3px;border:2px solid var(--line-strong);background:var(--bg-2);border-radius:10px;cursor:pointer;width:42px;height:42px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:11px}
.bm-prov-chip img{width:100%;height:100%;object-fit:cover;border-radius:7px}
.bm-prov-chip.sel{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.bm-limpar{margin-top:10px}

.bm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px;margin-top:8px}
.bm-card{display:flex;flex-direction:column;gap:5px;text-align:left;background:none;border:none;cursor:pointer;padding:0;color:var(--text)}
.bm-poster{position:relative;display:block;aspect-ratio:2/3;border-radius:var(--radius);overflow:hidden;background:var(--panel-2);border:1px solid var(--line)}
.bm-poster img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s}
.bm-card:hover .bm-poster img{transform:scale(1.04)}
.bm-noposter{display:flex;align-items:center;justify-content:center;height:100%;font-size:34px;opacity:.5}
.bm-nota{position:absolute;left:6px;bottom:6px;background:rgba(0,0,0,.72);color:#ffd45e;font-size:11px;font-weight:700;padding:2px 6px;border-radius:999px}
.bm-tit{font-size:13px;font-weight:600;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bm-meta{font-size:11px;color:var(--muted)}
.bm-info{text-align:center;padding:20px}
.bm-mais{text-align:center;margin-top:16px}

.bm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:flex-start;justify-content:center;padding:4vh 14px;z-index:1000;overflow:auto}
.bm-modal{position:relative;background:var(--bg);border:1px solid var(--line);border-radius:var(--radius-lg);max-width:760px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.bm-fechar{position:absolute;top:8px;right:8px;z-index:3;width:36px;height:36px;border-radius:50%;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:22px;cursor:pointer;line-height:1}
.bm-backdrop{height:180px;background-size:cover;background-position:center}
.bm-backdrop::after{content:"";display:block;height:100%;background:linear-gradient(to bottom,transparent 40%,var(--bg))}
.bm-modal-body{padding:0 18px 20px}
.bm-modal-head{display:flex;gap:16px;margin-top:-56px;position:relative;z-index:2}
.bm-modal-poster{width:120px;height:180px;object-fit:cover;border-radius:var(--radius);border:2px solid var(--bg);flex:none;background:var(--panel-2)}
.bm-modal-info{padding-top:60px;min-width:0}
.bm-modal-info h3{font-size:20px;margin:0}
.bm-ano{color:var(--muted);font-weight:400}
.bm-sub{font-size:13px;color:var(--text);margin:4px 0}
.bm-nota-inline{color:#c58b00;margin-right:8px}
.bm-modal-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.bm-overview{font-size:14px;line-height:1.6;margin:16px 0}
.bm-sec{margin-top:18px}
.bm-sec h4{font-size:15px;margin:0 0 10px}
.bm-wp-grupo{display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.bm-wp-lbl{font-size:12px;color:var(--muted);min-width:120px}
.bm-wp-logos{display:flex;flex-wrap:wrap;gap:8px}
.bm-wp-logo{width:42px;height:42px;border-radius:9px;overflow:hidden;border:1px solid var(--line);background:var(--panel-2);display:flex;align-items:center;justify-content:center;font-size:10px;text-align:center}
.bm-wp-logo img{width:100%;height:100%;object-fit:cover}
.bm-elenco{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px}
.bm-ator{display:flex;flex-direction:column;gap:3px;font-size:12px}
.bm-ator img,.bm-noface{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--radius);background:var(--panel-2)}
.bm-noface{display:flex;align-items:center;justify-content:center;font-size:28px;opacity:.5}
.bm-ator b{font-size:12px;line-height:1.2}
.bm-ator small{color:var(--muted)}
.bm-recs{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}
.bm-rec{flex:0 0 100px;display:flex;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;color:var(--text);text-align:left;padding:0}
.bm-rec img,.bm-rec .bm-noposter{width:100px;height:150px;object-fit:cover;border-radius:var(--radius);background:var(--panel-2)}
.bm-rec span{font-size:12px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
@media(max-width:520px){.bm-modal-head{flex-direction:column;margin-top:-70px}.bm-modal-info{padding-top:0}.bm-modal-poster{width:100px;height:150px}}
`
