// Proxy da TMDB (The Movie Database) para o buscador de filmes e séries: esconde a chave,
// resolve CORS, fixa pt-BR e região BR (para o "onde assistir"). Só ações previstas.
// A chave vem de TMDB_BEARER (token v4, preferido) ou TMDB_API_KEY (v3). Configure na Vercel.

const BASE = 'https://api.themoviedb.org/3'
const BEARER = process.env.TMDB_BEARER
const KEY = process.env.TMDB_API_KEY
const REGION = 'BR'

const num = (v, min, max) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

async function tmdb(path, params = {}, revalidate = 300) {
  const url = new URL(BASE + path)
  url.searchParams.set('language', 'pt-BR')
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') url.searchParams.set(k, String(v))
  const init = { headers: { accept: 'application/json' }, next: { revalidate } }
  if (BEARER) init.headers.Authorization = `Bearer ${BEARER}`
  else url.searchParams.set('api_key', KEY)
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(`tmdb ${r.status}`)
  return r.json()
}

const tipoTmdb = (t) => (t === 'serie' || t === 'tv' ? 'tv' : 'movie')

export async function GET(request) {
  if (!BEARER && !KEY) return Response.json({ erro: 'sem_chave' }, { status: 503 })
  const p = new URL(request.url).searchParams
  const action = p.get('action')
  try {
    let dados
    let cache = 300
    if (action === 'genres') {
      const [m, tv] = await Promise.all([tmdb('/genre/movie/list', {}, 86400), tmdb('/genre/tv/list', {}, 86400)])
      dados = { movie: m.genres || [], tv: tv.genres || [] }
      cache = 86400
    } else if (action === 'providers') {
      const [m, tv] = await Promise.all([tmdb('/watch/providers/movie', { watch_region: REGION }, 86400), tmdb('/watch/providers/tv', { watch_region: REGION }, 86400)])
      const mapa = new Map()
      ;[...(m.results || []), ...(tv.results || [])].forEach((x) => { if (!mapa.has(x.provider_id)) mapa.set(x.provider_id, { id: x.provider_id, nome: x.provider_name, logo: x.logo_path, ordem: x.display_priorities?.BR ?? x.display_priority ?? 999 }) })
      dados = [...mapa.values()].sort((a, b) => a.ordem - b.ordem).slice(0, 28)
      cache = 86400
    } else if (action === 'trending') {
      dados = await tmdb('/trending/all/week', { page: num(p.get('page'), 1, 500) || 1 }, 3600)
    } else if (action === 'search') {
      const q = (p.get('q') || '').slice(0, 120)
      if (!q.trim()) return Response.json({ results: [] })
      dados = await tmdb('/search/multi', { query: q, page: num(p.get('page'), 1, 500) || 1, include_adult: false })
    } else if (action === 'discover') {
      const type = tipoTmdb(p.get('type'))
      const params = {
        sort_by: ['popularity.desc', 'vote_average.desc', 'primary_release_date.desc', 'first_air_date.desc', 'revenue.desc'].includes(p.get('sort')) ? p.get('sort') : 'popularity.desc',
        page: num(p.get('page'), 1, 500) || 1,
        include_adult: false,
        watch_region: REGION,
        'vote_count.gte': 40,
      }
      const genero = num(p.get('genero'), 1, 100000)
      if (genero) params.with_genres = genero
      const voteMin = num(p.get('notaMin'), 0, 10)
      if (voteMin) params['vote_average.gte'] = voteMin
      const prov = num(p.get('provider'), 1, 100000)
      if (prov) { params.with_watch_providers = prov; params.with_watch_monetization_types = 'flatrate|free|ads|rent|buy' }
      const dec = num(p.get('decada'), 1900, 2100)
      if (dec) {
        const campo = type === 'tv' ? 'first_air_date' : 'primary_release_date'
        params[`${campo}.gte`] = `${dec}-01-01`
        params[`${campo}.lte`] = `${dec + 9}-12-31`
      }
      // ordenações por data precisam do tipo certo de campo
      if (params.sort_by === 'primary_release_date.desc' && type === 'tv') params.sort_by = 'first_air_date.desc'
      dados = await tmdb(`/discover/${type}`, params)
    } else if (action === 'details') {
      const type = tipoTmdb(p.get('type'))
      const id = num(p.get('id'), 1, 1e12)
      if (!id) return Response.json({ erro: 'id inválido' }, { status: 400 })
      const append = type === 'tv'
        ? 'credits,videos,watch/providers,recommendations,similar,content_ratings'
        : 'credits,videos,watch/providers,recommendations,similar,release_dates'
      dados = await tmdb(`/${type}/${id}`, { append_to_response: append }, 3600)
      cache = 3600
    } else {
      return Response.json({ erro: 'ação desconhecida' }, { status: 400 })
    }
    return Response.json(dados, { headers: { 'Cache-Control': `public, s-maxage=${cache}, stale-while-revalidate=${cache * 3}` } })
  } catch (e) {
    return Response.json({ erro: String(e.message || e) }, { status: 502 })
  }
}
