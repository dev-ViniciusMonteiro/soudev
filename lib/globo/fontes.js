// Fontes de dados abertas do Globo ao vivo. Todas sem chave; aviões e ciclones passam por /api/globo (CORS).

const json = async (url, opts) => {
  const r = await fetch(url, opts)
  if (!r.ok) throw new Error(`${new URL(url, location.href).hostname} respondeu ${r.status}`)
  return r.json()
}

/* ---------- Aviões ---------- */

export const voosPerto = (lat, lon, raioNm) => json(`/api/globo?fonte=voos&lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&raio=${Math.round(Math.min(250, Math.max(5, raioNm)))}`)
export const voosMilitares = () => json('/api/globo?fonte=militares')
export const voosEmergencia = () => json('/api/globo?fonte=emergencias')

export const SQUAWK = { 7500: 'Sequestro (7500)', 7600: 'Falha de rádio (7600)', 7700: 'Emergência geral (7700)' }

/* ---------- Satélites (CelesTrak) ---------- */

export const GRUPOS_SAT = [
  ['stations', 'Estações espaciais (ISS, Tiangong)', 50],
  ['visual', 'Mais brilhantes (visíveis a olho nu)', 200],
  ['gps-ops', 'GPS', 40],
  ['galileo', 'Galileo', 40],
  ['weather', 'Meteorológicos', 100],
  ['science', 'Científicos', 150],
  ['starlink', 'Starlink (amostra)', 1500],
  ['active', 'Todos os ativos (amostra)', 2500],
]

export async function satelites(grupo) {
  const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(grupo)}&FORMAT=tle`)
  if (!r.ok) throw new Error(`CelesTrak respondeu ${r.status}`)
  const linhas = (await r.text()).split(/\r?\n/).filter((l) => l.trim())
  const out = []
  for (let i = 0; i + 2 < linhas.length + 1; i += 3) {
    if (!linhas[i + 2]) break
    out.push({ nome: linhas[i].trim(), l1: linhas[i + 1], l2: linhas[i + 2], id: linhas[i + 1].slice(2, 7).trim() })
  }
  const max = GRUPOS_SAT.find((g) => g[0] === grupo)?.[2] || 1000
  if (out.length <= max) return out
  const passo = out.length / max
  return Array.from({ length: max }, (_, i) => out[Math.floor(i * passo)])
}

/* ---------- Terremotos (USGS) ---------- */

export const PERIODOS_SISMO = [
  ['all_day', 'Últimas 24 h (todos)'],
  ['2.5_week', 'Última semana (2,5+)'],
  ['4.5_month', 'Último mês (4,5+)'],
  ['significant_month', 'Significativos do mês'],
]

export async function terremotos(periodo = 'all_day') {
  const j = await json(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${periodo}.geojson`)
  return j.features.map((f) => ({
    id: f.id,
    mag: f.properties.mag ?? 0,
    lugar: f.properties.place || '',
    quando: f.properties.time,
    url: f.properties.url,
    tsunami: !!f.properties.tsunami,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    prof: f.geometry.coordinates[2],
  }))
}

/* ---------- Eventos naturais (NASA EONET) ---------- */

export const CATEGORIAS_EONET = {
  wildfires: ['Incêndio', '🔥', '#f97316'],
  volcanoes: ['Vulcão', '🌋', '#ef4444'],
  severeStorms: ['Tempestade severa', '🌀', '#a78bfa'],
  seaLakeIce: ['Gelo marinho / iceberg', '🧊', '#7dd3fc'],
  floods: ['Enchente', '🌊', '#3b82f6'],
  drought: ['Seca', '🏜️', '#d97706'],
  dustHaze: ['Poeira e fumaça', '🌫️', '#a8a29e'],
  landslides: ['Deslizamento', '⛰️', '#92400e'],
  earthquakes: ['Terremoto', '〰️', '#fbbf24'],
  snow: ['Neve', '❄️', '#e0f2fe'],
  tempExtremes: ['Temperatura extrema', '🌡️', '#f43f5e'],
  waterColor: ['Cor da água', '💧', '#22d3ee'],
  manmade: ['Causado por pessoas', '🏭', '#94a3b8'],
}

export async function eventosNaturais(dias = 30) {
  const j = await json(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=${dias}`)
  return j.events.flatMap((e) => {
    const g = e.geometry?.[e.geometry.length - 1]
    if (!g) return []
    const [lon, lat] = g.type === 'Point' ? g.coordinates : g.coordinates[0][0]
    return [{ id: e.id, titulo: e.title, cat: e.categories?.[0]?.id || 'manmade', quando: g.date, lat, lon, fonte: e.sources?.[0]?.url || e.link, trilha: g.type === 'Point' ? e.geometry.filter((x) => x.type === 'Point').map((x) => x.coordinates) : [] }]
  })
}

/* ---------- Clima ---------- */

export async function radarQuadros() {
  const j = await json('https://api.rainviewer.com/public/weather-maps.json')
  return { host: j.host, radar: [...(j.radar?.past || []), ...(j.radar?.nowcast || []).map((f) => ({ ...f, previsao: true }))], nuvens: j.satellite?.infrared || [] }
}

/** Vento atual numa grade de pontos (Open-Meteo aceita várias coordenadas numa chamada). */
export async function ventoGrade(pontos) {
  if (!pontos.length) return []
  const lat = pontos.map((p) => p.lat.toFixed(2)).join(',')
  const lon = pontos.map((p) => p.lon.toFixed(2)).join(',')
  const j = await json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&wind_speed_unit=kmh`)
  const lista = Array.isArray(j) ? j : [j]
  return lista.map((x, i) => ({ ...pontos[i], vel: x.current?.wind_speed_10m ?? 0, dir: x.current?.wind_direction_10m ?? 0, raj: x.current?.wind_gusts_10m ?? 0, temp: x.current?.temperature_2m }))
}

export const ciclones = () => json('/api/globo?fonte=ciclones')

/* ---------- Lançamentos (Launch Library 2) ---------- */

export async function lancamentos() {
  const j = await json('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=30&mode=normal')
  return j.results
    .filter((l) => l.pad?.latitude)
    .map((l) => ({ id: l.id, nome: l.name, quando: l.net, status: l.status?.name || '', foguete: l.rocket?.configuration?.full_name || '', empresa: l.launch_service_provider?.name || '', missao: l.mission?.description || '', base: l.pad?.name || '', local: l.pad?.location?.name || '', lat: Number(l.pad.latitude), lon: Number(l.pad.longitude), imagem: l.image || '', video: l.vidURLs?.[0]?.url || '' }))
}

/* ---------- Rádios (Radio Browser) ---------- */

export async function radios() {
  const j = await json('https://de1.api.radio-browser.info/json/stations/search?has_geo_info=true&order=clickcount&reverse=true&limit=1500&hidebroken=true')
  return j
    .filter((r) => r.url_resolved?.startsWith('https://') && Number.isFinite(r.geo_lat))
    .map((r) => ({ id: r.stationuuid, nome: r.name.trim(), pais: r.country, tags: r.tags, url: r.url_resolved, lat: r.geo_lat, lon: r.geo_long, icone: r.favicon, codec: r.codec, kbps: r.bitrate }))
}

/* ---------- Bicicletas compartilhadas (CityBikes / GBFS) ---------- */

export async function redesBike() {
  const j = await json('https://api.citybik.es/v2/networks?fields=id,name,location,company')
  return j.networks.map((n) => ({ id: n.id, nome: n.name, cidade: n.location.city, pais: n.location.country, lat: n.location.latitude, lon: n.location.longitude, empresa: [].concat(n.company || []).join(', ') }))
}

export async function estacoesBike(rede) {
  const j = await json(`https://api.citybik.es/v2/networks/${encodeURIComponent(rede)}?fields=stations`)
  return j.network.stations.map((s) => ({ id: s.id, nome: s.name, lat: s.latitude, lon: s.longitude, livres: s.free_bikes, vagas: s.empty_slots }))
}

/* ---------- Câmeras e radares registrados no OpenStreetMap (Overpass) ---------- */

export async function camerasOsm({ sul, oeste, norte, leste }) {
  const q = `[out:json][timeout:20];(node["man_made"="surveillance"](${sul},${oeste},${norte},${leste});node["highway"="speed_camera"](${sul},${oeste},${norte},${leste}););out 800;`
  const j = await json('https://overpass-api.de/api/interpreter', { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  return j.elements.map((e) => ({ id: e.id, lat: e.lat, lon: e.lon, especie: e.tags?.highway === 'speed_camera' ? 'radar' : e.tags?.['surveillance:type'] === 'ALPR' ? 'alpr' : 'camera', operador: e.tags?.operator || '', zona: e.tags?.['surveillance:zone'] || '', descricao: e.tags?.description || '' }))
}

/* ---------- Busca e rotas ---------- */

// altura da câmera pelo tamanho do lugar (país, estado, cidade, bairro, endereço)
const alturaPorRank = (r) => (r <= 4 ? 3500000 : r <= 8 ? 700000 : r <= 12 ? 120000 : r <= 16 ? 25000 : r <= 20 ? 6000 : 1500)

/** Busca no Nominatim (entende nomes em português); se falhar, usa o Photon. */
export async function buscarLugar(texto) {
  try {
    const j = await json(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto)}&format=jsonv2&limit=6&accept-language=pt-BR`)
    if (j.length) return j.map((p) => ({ nome: p.display_name, tipo: p.addresstype || p.type, lat: Number(p.lat), lon: Number(p.lon), alt: alturaPorRank(p.place_rank) }))
  } catch {}
  const j = await json(`https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}&limit=6`)
  return j.features.map((f) => {
    const p = f.properties
    return { nome: [p.name, p.city !== p.name ? p.city : '', p.state, p.country].filter(Boolean).join(', '), tipo: p.osm_value, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], alt: p.osm_key === 'place' && ['country', 'state'].includes(p.osm_value) ? 1500000 : p.osm_value === 'city' ? 25000 : 3000 }
  })
}

export async function rota(a, b, modo = 'driving') {
  const j = await json(`https://router.project-osrm.org/route/v1/${modo}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson&steps=false`)
  const r = j.routes?.[0]
  if (!r) throw new Error('Não achei rota entre esses pontos.')
  return { pontos: r.geometry.coordinates, distancia: r.distance, duracao: r.duration }
}
