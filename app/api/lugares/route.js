// Repasse para o OpenStreetMap (Overpass e Nominatim), que bloqueiam/limitam chamadas direto do
// navegador. O servidor identifica-se com User-Agent (exigido pela política do OSM), resolve CORS e
// guarda a resposta em cache. Usado pelo buscador de restaurantes e comida.

const UA = 'soudev/1.0 (ferramentas gratuitas; +https://soudev.vercel.app)'
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']

const num = (v, min, max) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

async function overpass(query) {
  let ultimo
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': UA, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        next: { revalidate: 300 },
      })
      if (!r.ok) { ultimo = new Error('overpass ' + r.status); continue }
      return await r.json()
    } catch (e) { ultimo = e }
  }
  throw ultimo || new Error('overpass indisponível')
}

export async function GET(request) {
  const p = new URL(request.url).searchParams
  const action = p.get('action')
  try {
    if (action === 'geocode') {
      const q = (p.get('q') || '').slice(0, 160)
      if (q.trim().length < 3) return Response.json({ erro: 'consulta curta' }, { status: 400 })
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&countrycodes=br`, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' },
        next: { revalidate: 86400 },
      })
      if (!r.ok) return Response.json({ erro: 'nominatim ' + r.status }, { status: 502 })
      const j = await r.json()
      return Response.json(j, { headers: { 'Cache-Control': 'public, s-maxage=86400' } })
    }

    if (action === 'overpass') {
      const lat = num(p.get('lat'), -90, 90)
      const lon = num(p.get('lon'), -180, 180)
      const raio = num(p.get('raio'), 100, 20000)
      if (lat === null || lon === null || raio === null) return Response.json({ erro: 'lat, lon e raio obrigatórios' }, { status: 400 })
      const q = `[out:json][timeout:25];(nwr(around:${raio},${lat},${lon})[amenity~"^(restaurant|fast_food|cafe|bar|pub|ice_cream|food_court)$"];nwr(around:${raio},${lat},${lon})[shop=bakery];);out center tags 400;`
      const j = await overpass(q)
      return Response.json(j, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } })
    }

    return Response.json({ erro: 'ação desconhecida' }, { status: 400 })
  } catch (e) {
    return Response.json({ erro: String(e.message || e) }, { status: 502 })
  }
}
