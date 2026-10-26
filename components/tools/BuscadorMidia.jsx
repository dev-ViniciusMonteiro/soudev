'use client'

// Buscador de filmes e séries (TMDB via /api/midia, que esconde a chave): busca por texto, filtros
// avançados (gênero, década, nota, "onde assistir" por streaming no Brasil), detalhes com elenco,
// trailer, onde assistir e recomendações.

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
  const [modo, setModo] = useState('explorar') // explorar | quiz
  const [tipo, setTipo] = useState('filme') // filme | serie
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
  const reqId = useRef(0)

  const generosDoTipo = tipo === 'serie' ? generos.tv : generos.movie

  useEffect(() => {
    fetchJson('/api/midia?action=genres').then(setGeneros).catch(() => {})
    fetchJson('/api/midia?action=providers').then((d) => Array.isArray(d) && setProviders(d)).catch(() => {})
  }, [])

  const carregar = useCallback(async (reset = true) => {
    const id = ++reqId.current
    const page = reset ? 1 : pagina + 1
    setCarregando(true); setErro(''); if (reset) setSemChave(false)
    try {
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
      let lista = (data.results || []).filter((x) => (busca.trim() ? x.media_type === 'movie' || x.media_type === 'tv' : true))
      lista = lista.map((x) => normalizarTmdb(x, busca.trim() ? undefined : tipo))
      setItens((prev) => (reset ? lista : [...prev, ...lista]))
      setTotalPag(data.total_pages || 1); setPagina(page)
    } catch (e) {
      if (id !== reqId.current) return
      if (e?.status === 503) { setSemChave(true); setItens([]) }
      else setErro('Não foi possível buscar agora. Tente novamente em instantes.')
    } finally {
      if (id === reqId.current) setCarregando(false)
    }
  }, [tipo, busca, filtros, pagina])

  useEffect(() => { carregar(true) /* eslint-disable-next-line */ }, [tipo, busca, filtros])

  const submit = (e) => { e.preventDefault(); setBusca(query.trim()); track('midia_buscar', { tipo, q: query.slice(0, 40) }) }
  const setF = (k, v) => setFiltros((f) => ({ ...f, [k]: v }))
  const toggleProv = (id) => setFiltros((f) => ({ ...f, providers: f.providers.includes(id) ? f.providers.filter((x) => x !== id) : [...f.providers, id] }))
  const limparFiltros = () => { setFiltros({ genero: '', decada: '', notaMin: '', sort: 'popularity.desc', providers: [] }); setQuery(''); setBusca('') }

  const abrir = async (item) => {
    setSel({ ...item, _carregando: true })
    try {
      const d = await fetchJson(`/api/midia?action=details&type=${item.tipo}&id=${item.id}`)
      setSel({ ...normalizarTmdb(d, item.tipo), raw: d, tipo: item.tipo })
    } catch { setSel({ ...item, erro: true }) }
  }

  const mudarTipo = (t) => { setTipo(t); setQuery(''); setBusca(''); setItens([]); setPagina(1) }

  return (
    <div className="bm">
      <style>{CSS}</style>

      <div className="bm-modo">
        <button className={'bm-modo-b' + (modo === 'explorar' ? ' sel' : '')} onClick={() => setModo('explorar')}>🔎 Explorar</button>
        <button className={'bm-modo-b' + (modo === 'quiz' ? ' sel' : '')} onClick={() => setModo('quiz')}>✨ Me recomende</button>
      </div>

      {modo === 'quiz' ? (
        <Quiz providers={providers} onAbrir={abrir} />
      ) : (
      <>
      <Tabs value={tipo} onChange={mudarTipo} tabs={[['filme', '🎬 Filmes'], ['serie', '📺 Séries']]} />

      <form className="bm-busca" onSubmit={submit}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tipo === 'serie' ? 'Buscar por nome da série…' : 'Buscar por nome do filme…'} aria-label="Buscar" />
        <button type="submit" className="btn btn-primary">Buscar</button>
        {busca && <button type="button" className="btn btn-ghost" onClick={() => { setQuery(''); setBusca('') }}>Limpar</button>}
      </form>

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

      {semChave && <Notice kind="warning">A busca de filmes e séries precisa da chave da TMDB configurada no servidor (variável <b>TMDB_BEARER</b>).</Notice>}
      {erro && <Notice kind="error">{erro}</Notice>}

      <div className="bm-grid" aria-busy={carregando}>
        {itens.map((x) => (
          <button className="bm-card" key={x.tipo + x.id} onClick={() => abrir(x)}>
            <span className="bm-poster">
              {x.poster ? <img src={x.poster} alt={x.titulo} loading="lazy" /> : <span className="bm-noposter">{x.tipo === 'serie' ? '📺' : '🎬'}</span>}
              {x.nota ? <span className="bm-nota">★ {x.nota}</span> : null}
            </span>
            <span className="bm-tit">{x.titulo}</span>
            <span className="bm-meta">{x.ano}</span>
          </button>
        ))}
      </div>

      {carregando && <p className="muted bm-info"><span className="spinner" aria-hidden="true" /> Carregando…</p>}
      {!carregando && !semChave && itens.length === 0 && <p className="muted bm-info">Nada encontrado. Tente outro termo ou ajuste os filtros.</p>}
      {!carregando && itens.length > 0 && pagina < totalPag && <div className="bm-mais"><button className="btn" onClick={() => carregar(false)}>Carregar mais</button></div>}
      </>
      )}

      {sel && <Modal item={sel} onClose={() => setSel(null)} onAbrir={abrir} />}
    </div>
  )
}

/* ---------- quiz de recomendação ---------- */
const ANO_ATUAL = new Date().getFullYear()
const MOODS = [
  { id: 'acao', label: 'Ação e aventura', emoji: '💥', g: { movie: '28|12', tv: '10759' } },
  { id: 'rir', label: 'Dar risada', emoji: '😂', g: { movie: '35', tv: '35' } },
  { id: 'romance', label: 'Romance', emoji: '💘', g: { movie: '10749', tv: '18' } },
  { id: 'medo', label: 'Medo e suspense', emoji: '😱', g: { movie: '27|53', tv: '9648' } },
  { id: 'emocao', label: 'Me emocionar', emoji: '😢', g: { movie: '18', tv: '18' } },
  { id: 'ficcao', label: 'Ficção e fantasia', emoji: '🚀', g: { movie: '878|14', tv: '10765' } },
  { id: 'familia', label: 'Para a família', emoji: '👨‍👩‍👧', g: { movie: '10751', tv: '10751|10762' } },
  { id: 'animacao', label: 'Animação', emoji: '🎨', g: { movie: '16', tv: '16' } },
  { id: 'documentario', label: 'Documentário', emoji: '🎥', g: { movie: '99', tv: '99' } },
  { id: 'surpresa', label: 'Me surpreenda', emoji: '🎲', g: { movie: '', tv: '' } },
]
const EPOCAS = [
  ['tanto', 'Tanto faz'], ['novo', 'Lançamentos'], ['d2010', 'Dos anos 2010'], ['d2000', 'Dos anos 2000'], ['classico', 'Clássicos (até 1999)'],
]
const DURACOES = [['tanto', 'Tanto faz'], ['curto', 'Curtinho (até 100 min)'], ['longo', 'Pode ser longo']]
const FAMAS = [['populares', 'Populares, do momento'], ['aclamados', 'Aclamados pela crítica'], ['cult', 'Joias escondidas']]

function Quiz({ providers, onAbrir }) {
  const [tipo, setTipo] = useState('filme')
  const [resp, setResp] = useState({ mood: null, epoca: 'tanto', dur: 'tanto', fama: 'populares', provs: [] })
  const [step, setStep] = useState(0)
  const [fase, setFase] = useState('perguntas') // perguntas | carregando | resultado | vazio | erro | semchave
  const [pool, setPool] = useState([])
  const [idx, setIdx] = useState(0)
  const paginaRef = useRef({ page: 1, tot: 1 })

  const steps = tipo === 'filme' ? ['tipo', 'mood', 'epoca', 'dur', 'fama', 'prov'] : ['tipo', 'mood', 'epoca', 'fama', 'prov']
  const atual = steps[step]
  const avancar = () => setStep((s) => Math.min(s + 1, steps.length - 1))
  const voltar = () => setStep((s) => Math.max(s - 1, 0))
  const responder = (k, v, auto = true) => { setResp((r) => ({ ...r, [k]: v })); if (auto) setTimeout(avancar, 120) }

  const construir = (page) => {
    const key = tipo === 'serie' ? 'tv' : 'movie'
    const m = MOODS.find((x) => x.id === resp.mood)
    const p = new URLSearchParams({ action: 'discover', type: tipo, page: String(page) })
    const g = m?.g[key]
    if (g) p.set('genero', g)
    if (resp.epoca === 'novo') p.set('anoDe', String(ANO_ATUAL - 2))
    else if (resp.epoca === 'd2010') { p.set('anoDe', '2010'); p.set('anoAte', '2019') }
    else if (resp.epoca === 'd2000') { p.set('anoDe', '2000'); p.set('anoAte', '2009') }
    else if (resp.epoca === 'classico') p.set('anoAte', '1999')
    if (tipo === 'filme' && resp.dur === 'curto') p.set('runtimeMax', '100')
    if (resp.fama === 'populares') p.set('sort', 'popularity.desc')
    else if (resp.fama === 'aclamados') { p.set('sort', 'vote_average.desc'); p.set('notaMin', '7'); p.set('voteCountMin', '300') }
    else if (resp.fama === 'cult') { p.set('sort', 'vote_average.desc'); p.set('notaMin', '7'); p.set('voteCountMin', '50') }
    if (resp.provs.length) p.set('provider', resp.provs.join('|'))
    return p
  }

  const recomendar = async (reset = true) => {
    if (reset) setFase('carregando')
    const page = reset ? (1 + Math.floor(Math.random() * 2)) : paginaRef.current.page + 1 // varia um pouco o começo
    try {
      const d = await fetchJson('/api/midia?' + construir(page).toString())
      const lista = (d.results || []).filter((x) => x.poster_path).map((x) => normalizarTmdb(x, tipo))
      paginaRef.current = { page, tot: d.total_pages || 1 }
      if (reset) { setPool(lista); setIdx(0); setFase(lista.length ? 'resultado' : 'vazio') }
      else { setPool((prev) => { const base = prev.length; setIdx(base); return [...prev, ...lista] }) }
    } catch (e) { setFase(e?.status === 503 ? 'semchave' : 'erro') }
  }

  const outro = () => {
    if (idx + 1 < pool.length) setIdx(idx + 1)
    else if (paginaRef.current.page < paginaRef.current.tot) recomendar(false)
    else setIdx(0)
  }
  const refazer = () => { setFase('perguntas'); setStep(0); setPool([]); setIdx(0) }

  if (fase !== 'perguntas') {
    const pick = pool[idx]
    return (
      <div className="bm-quiz">
        {fase === 'carregando' && <p className="muted bm-info"><span className="spinner" aria-hidden="true" /> Procurando a recomendação certa…</p>}
        {fase === 'semchave' && <Notice kind="warning">A recomendação precisa da chave da TMDB configurada no servidor (<b>TMDB_BEARER</b>).</Notice>}
        {fase === 'erro' && <Notice kind="error">Não consegui buscar agora. Tente de novo.</Notice>}
        {fase === 'vazio' && <><Notice kind="info">Não achei nada com essa combinação. Afrouxe um filtro e tente de novo.</Notice><button className="btn btn-primary" onClick={refazer}>Refazer</button></>}
        {fase === 'resultado' && pick && (
          <div className="bm-pick">
            <button className="bm-pick-poster" onClick={() => onAbrir(pick)}>
              {pick.poster ? <img src={pick.poster} alt={pick.titulo} /> : <span className="bm-noposter">🎬</span>}
            </button>
            <div className="bm-pick-info">
              <span className="bm-pick-tag">Sua recomendação</span>
              <h3>{pick.titulo} {pick.ano && <span className="bm-ano">({pick.ano})</span>}</h3>
              {pick.nota ? <p className="bm-nota-inline">★ {pick.nota}</p> : null}
              {pick.overview && <p className="bm-pick-ov">{pick.overview}</p>}
              <div className="bm-pick-acoes">
                <button className="btn btn-primary" onClick={() => onAbrir(pick)}>Ver detalhes e onde assistir</button>
                <button className="btn" onClick={outro}>Quero outro</button>
                <button className="btn btn-ghost" onClick={refazer}>Refazer o quiz</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const escolhas = {
    tipo: [['filme', '🎬 Um filme'], ['serie', '📺 Uma série']],
    mood: MOODS.map((m) => [m.id, `${m.emoji} ${m.label}`]),
    epoca: EPOCAS, dur: DURACOES, fama: FAMAS,
  }
  const perguntaTxt = { tipo: 'O que você quer ver?', mood: 'Qual o clima de hoje?', epoca: 'De qual época?', dur: 'Quanto tempo você tem?', fama: 'Prefere o quê?', prov: 'Onde você quer assistir? (opcional)' }

  return (
    <div className="bm-quiz">
      <div className="bm-quiz-prog"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      <p className="bm-quiz-passo">Pergunta {step + 1} de {steps.length}</p>
      <h3 className="bm-quiz-q">{perguntaTxt[atual]}</h3>

      {atual === 'prov' ? (
        <>
          <div className="bm-prov">
            {providers.map((p) => (
              <button key={p.id} type="button" className={'bm-prov-chip' + (resp.provs.includes(p.id) ? ' sel' : '')} title={p.nome}
                onClick={() => setResp((r) => ({ ...r, provs: r.provs.includes(p.id) ? r.provs.filter((x) => x !== p.id) : [...r.provs, p.id] }))}>
                {p.logo ? <img src={IMG(p.logo, 'w45')} alt={p.nome} /> : p.nome}
              </button>
            ))}
          </div>
          <p className="muted bm-quiz-dica">Selecione os serviços que você tem, ou deixe em branco para ver de qualquer lugar.</p>
          <div className="bm-quiz-nav">
            <button className="btn btn-ghost" onClick={voltar}>← Voltar</button>
            <button className="btn btn-primary" onClick={() => recomendar(true)}>✨ Ver recomendação</button>
          </div>
        </>
      ) : (
        <>
          <div className="bm-quiz-ops">
            {escolhas[atual].map(([v, label]) => {
              const sel = atual === 'tipo' ? tipo === v : resp[atual] === v
              return (
                <button key={v} className={'bm-quiz-op' + (sel ? ' sel' : '')}
                  onClick={() => { if (atual === 'tipo') { setTipo(v); setTimeout(avancar, 120) } else responder(atual, v) }}>
                  {label}
                </button>
              )
            })}
          </div>
          {step > 0 && <div className="bm-quiz-nav"><button className="btn btn-ghost" onClick={voltar}>← Voltar</button></div>}
        </>
      )}
    </div>
  )
}

/* ---------- modal de detalhes ---------- */
function Modal({ item, onClose, onAbrir }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const d = item.raw
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
            {item.poster ? <img className="bm-modal-poster" src={item.poster} alt="" /> : <div className="bm-modal-poster bm-noposter">{item.tipo === 'serie' ? '📺' : '🎬'}</div>}
            <div className="bm-modal-info">
              <h3>{item.titulo} {item.ano && <span className="bm-ano">({item.ano})</span>}</h3>
              <p className="bm-sub">
                {item.nota ? <b className="bm-nota-inline">★ {item.nota}</b> : null}
                {[duracao, ...generos].filter(Boolean).join(' · ')}
              </p>
              <div className="bm-modal-acoes">
                {trailer && <a className="btn btn-primary btn-sm" href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener">▶ Trailer</a>}
                {wp?.link && <a className="btn btn-ghost btn-sm" href={wp.link} target="_blank" rel="noopener">Onde assistir (JustWatch)</a>}
              </div>
            </div>
          </div>

          {item._carregando && <p className="muted bm-info"><span className="spinner" aria-hidden="true" /> Carregando detalhes…</p>}
          {(item.overview || d?.overview) && <p className="bm-overview">{item.overview || d.overview}</p>}

          {wp && <OndeAssistir wp={wp} />}

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
.bm-modo{display:flex;gap:8px;margin:4px 0 14px}
.bm-modo-b{flex:1;padding:12px;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:var(--radius-lg);cursor:pointer;font:inherit;font-weight:700;font-size:15px}
.bm-modo-b.sel{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.bm-quiz{max-width:640px;margin:0 auto}
.bm-quiz-prog{height:7px;background:var(--panel-2);border-radius:999px;overflow:hidden;margin:6px 0 12px}
.bm-quiz-prog span{display:block;height:100%;background:var(--accent);transition:width .3s}
.bm-quiz-passo{font-size:12px;color:var(--muted);margin:0 0 4px}
.bm-quiz-q{font-size:22px;margin:0 0 16px}
.bm-quiz-ops{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.bm-quiz-op{padding:16px 14px;border:1px solid var(--line-strong);background:var(--panel);color:var(--text);border-radius:var(--radius-lg);cursor:pointer;font:inherit;font-size:15px;font-weight:600;text-align:left;transition:border-color .15s,background .15s}
.bm-quiz-op:hover{border-color:var(--accent)}
.bm-quiz-op.sel{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}
.bm-quiz-nav{display:flex;justify-content:space-between;gap:10px;margin-top:16px;flex-wrap:wrap}
.bm-quiz-dica{font-size:12px;margin:10px 0 0}
.bm-pick{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
.bm-pick-poster{flex:0 0 200px;max-width:200px;aspect-ratio:2/3;border:none;padding:0;background:var(--panel-2);border-radius:var(--radius-lg);overflow:hidden;cursor:pointer}
.bm-pick-poster img{width:100%;height:100%;object-fit:cover}
.bm-pick-info{flex:1;min-width:220px}
.bm-pick-tag{display:inline-block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--on-accent);background:var(--accent);padding:3px 10px;border-radius:999px;font-weight:700}
.bm-pick-info h3{font-size:24px;margin:10px 0 4px}
.bm-pick-ov{font-size:14px;line-height:1.6;margin:10px 0;color:var(--text)}
.bm-pick-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
@media(max-width:520px){.bm-pick-poster{flex-basis:140px;max-width:140px}}
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
