// Repasse para as fontes do Globo ao vivo que não liberam CORS no navegador (aviões e ciclones).
// Só aceita os parâmetros previstos e guarda a resposta por alguns segundos no cache da Vercel.

const ADSB = 'https://api.adsb.lol/v2'
const num = (v, min, max) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

// Só os campos que o globo usa (a resposta original é bem maior).
const aviao = (a) => ({
  id: a.hex,
  voo: (a.flight || '').trim(),
  reg: a.r || '',
  modelo: a.t || '',
  lat: a.lat,
  lon: a.lon,
  alt: a.alt_baro === 'ground' ? 0 : Number(a.alt_geom ?? a.alt_baro) || 0,
  solo: a.alt_baro === 'ground',
  vel: a.gs ?? null,
  rumo: a.track ?? a.true_heading ?? 0,
  vs: a.baro_rate ?? a.geom_rate ?? 0,
  sq: a.squawk || '',
  emerg: a.emergency && a.emergency !== 'none' ? a.emergency : '',
  mil: !!(a.dbFlags & 1),
})

async function buscar(url, segundos) {
  const r = await fetch(url, { headers: { 'User-Agent': 'soudev-globo/1.0 (+https://github.com)' }, next: { revalidate: segundos } })
  if (!r.ok) throw new Error(`fonte respondeu ${r.status}`)
  return r.json()
}

export async function GET(request) {
  const p = new URL(request.url).searchParams
  const fonte = p.get('fonte')
  try {
    let dados
    let cache = 10
    if (fonte === 'voos') {
      const lat = num(p.get('lat'), -90, 90)
      const lon = num(p.get('lon'), -180, 180)
      const raio = num(p.get('raio'), 1, 250)
      if (lat === null || lon === null || raio === null) return Response.json({ erro: 'lat, lon e raio (1 a 250 milhas náuticas) são obrigatórios.' }, { status: 400 })
      const j = await buscar(`${ADSB}/point/${lat.toFixed(2)}/${lon.toFixed(2)}/${Math.round(raio)}`, 8)
      dados = (j.ac || []).filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon)).map(aviao)
      cache = 8
    } else if (fonte === 'militares') {
      const j = await buscar(`${ADSB}/mil`, 20)
      dados = (j.ac || []).filter((a) => Number.isFinite(a.lat)).map((a) => ({ ...aviao(a), mil: true }))
      cache = 20
    } else if (fonte === 'emergencias') {
      const lotes = await Promise.all(['7500', '7600', '7700'].map((sq) => buscar(`${ADSB}/sqk/${sq}`, 20).catch(() => ({ ac: [] }))))
      dados = lotes.flatMap((j) => (j.ac || []).filter((a) => Number.isFinite(a.lat)).map(aviao))
      cache = 20
    } else if (fonte === 'ciclones') {
      const j = await buscar('https://www.nhc.noaa.gov/CurrentStorms.json', 600)
      dados = (j.activeStorms || []).map((s) => ({ id: s.id, nome: s.name, classe: s.classification, intensidade: s.intensity, pressao: s.pressure, lat: Number(s.latitudeNumeric), lon: Number(s.longitudeNumeric), movimento: `${s.movementDir ?? ''}° ${s.movementSpeed ?? ''} mph`, atualizado: s.lastUpdate }))
      cache = 600
    } else {
      return Response.json({ erro: 'fonte desconhecida' }, { status: 400 })
    }
    return Response.json(dados, { headers: { 'Cache-Control': `public, s-maxage=${cache}, stale-while-revalidate=${cache * 3}` } })
  } catch (e) {
    return Response.json({ erro: String(e.message || e) }, { status: 502 })
  }
}
