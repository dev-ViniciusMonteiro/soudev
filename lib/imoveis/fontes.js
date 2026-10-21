// Fontes públicas do Radar de Imóveis, todas chamadas direto do navegador:
// OpenStreetMap (endereço, construções, comércios e o que tem no bairro), ViaCEP, IBGE e BrasilAPI (CNPJ e sócios).
// O dono de um imóvel só aparece em fonte oficial: a matrícula do cartório. Aqui ficam os caminhos para chegar nela.

import { BRASIL_API, distanciaKm, fetchJson } from '@/lib/apis'

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OVERPASS = 'https://overpass-api.de/api/interpreter'

/* ---------- Nominatim: no máximo 1 pedido por segundo (regra de uso do OpenStreetMap) ---------- */

let filaNominatim = Promise.resolve()
function nominatim(caminho) {
  const pedido = filaNominatim.then(async () => {
    const r = await fetchJson(`${NOMINATIM}${caminho}&accept-language=pt-BR`, { timeout: 12000 })
    await new Promise((ok) => setTimeout(ok, 1100))
    return r
  })
  filaNominatim = pedido.catch(() => {})
  return pedido
}

/** Endereço do ponto (o mais detalhado que o OpenStreetMap tiver). */
export async function enderecoDoPonto(lat, lon) {
  const r = await nominatim(`/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&zoom=18&extratags=1`)
  const a = r.address ?? {}
  return {
    rua: a.road ?? a.pedestrian ?? a.footway ?? '',
    numero: a.house_number ?? '',
    bairro: a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? '',
    cidade: a.city ?? a.town ?? a.village ?? a.municipality ?? '',
    uf: (a['ISO3166-2-lvl4'] ?? '').replace('BR-', ''),
    estado: a.state ?? '',
    cep: (a.postcode ?? '').replace(/\D/g, ''),
    nomeLugar: r.name ?? '',
    texto: r.display_name ?? '',
    tipoOsm: r.type ?? '',
  }
}

/** Busca por endereço, CEP ou lugar (só Brasil). */
export async function buscarEndereco(texto) {
  const so = String(texto).replace(/\D/g, '')
  if (so.length === 8) {
    const c = await cep(so).catch(() => null)
    if (c) texto = `${c.logradouro}, ${c.bairro}, ${c.localidade} - ${c.uf}`
  }
  const r = await nominatim(`/search?q=${encodeURIComponent(texto)}&format=jsonv2&limit=6&countrycodes=br&addressdetails=1`)
  return r.map((x) => ({ lat: Number(x.lat), lon: Number(x.lon), texto: x.display_name }))
}

/* ---------- CEP e município ---------- */

export const cep = (numero) => fetchJson(`https://viacep.com.br/ws/${String(numero).replace(/\D/g, '')}/json/`, { timeout: 8000 }).then((r) => (r.erro ? null : r))

/** CEP pela rua (quando o OpenStreetMap não tem o CEP do ponto). */
export async function cepPelaRua(uf, cidade, rua) {
  if (!uf || !cidade || !rua || rua.length < 3) return []
  const r = await fetchJson(`https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(rua)}/json/`, { timeout: 8000 }).catch(() => [])
  return Array.isArray(r) ? r.slice(0, 6) : []
}

/** Código IBGE do município (usado por cartórios e prefeituras). */
export async function codigoIbge(uf, cidade) {
  if (!uf || !cidade) return null
  const lista = await fetchJson(`${BRASIL_API}/ibge/municipios/v1/${uf}?providers=dados-abertos-br,gov,wikipedia`, { timeout: 10000 }).catch(() => [])
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  return lista.find((m) => norm(m.nome) === norm(cidade))?.codigo_ibge ?? null
}

/* ---------- Overpass: construções, comércios e o bairro ---------- */

// O servidor principal do Overpass vive cheio (erro 502 ou demora): tenta os espelhos públicos em seguida,
// começando pelo último que respondeu.
const ESPELHOS = [OVERPASS, 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
let melhorEspelho = 0

async function overpass(q) {
  let ultimoErro
  for (let k = 0; k < ESPELHOS.length; k++) {
    const i = (melhorEspelho + k) % ESPELHOS.length
    try {
      const r = await fetchJson(ESPELHOS[i], {
        timeout: 20000,
        retries: 0,
        init: { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      })
      melhorEspelho = i
      return r.elements ?? []
    } catch (e) {
      ultimoErro = e
    }
  }
  throw ultimoErro
}

/** Área (m²) de um polígono em latitude/longitude, aproximada no plano local. */
export function areaM2(geom) {
  if (!geom?.length) return 0
  const lat0 = (geom.reduce((s, p) => s + p.lat, 0) / geom.length) * (Math.PI / 180)
  const mx = 111320 * Math.cos(lat0)
  const my = 110540
  let a = 0
  for (let i = 0; i < geom.length; i++) {
    const p = geom[i]
    const q = geom[(i + 1) % geom.length]
    a += p.lon * mx * (q.lat * my) - q.lon * mx * (p.lat * my)
  }
  return Math.abs(a / 2)
}

const TIPOS_CONSTRUCAO = {
  house: 'Casa',
  residential: 'Residencial',
  apartments: 'Prédio de apartamentos',
  detached: 'Casa isolada',
  semidetached_house: 'Casa geminada',
  terrace: 'Casas em fileira',
  commercial: 'Comercial',
  retail: 'Loja / varejo',
  office: 'Escritórios',
  industrial: 'Industrial',
  warehouse: 'Galpão',
  garage: 'Garagem',
  garages: 'Garagens',
  church: 'Igreja',
  school: 'Escola',
  hospital: 'Hospital',
  hotel: 'Hotel',
  construction: 'Em obra',
  roof: 'Cobertura',
  shed: 'Depósito',
  yes: 'Construção',
}

export const tipoConstrucao = (t) => TIPOS_CONSTRUCAO[t] ?? (t ? t.replace(/_/g, ' ') : 'Construção')

/** Construções (contornos) num raio, com endereço, andares e área quando o OpenStreetMap tiver. */
export async function construcoes(lat, lon, raio = 160) {
  const els = await overpass(`[out:json][timeout:20];(way["building"](around:${raio},${lat},${lon}););out tags geom 400;`)
  return els
    .filter((e) => e.geometry?.length > 2)
    .map((e) => ({
      id: `w${e.id}`,
      osmId: e.id,
      geom: e.geometry,
      tags: e.tags ?? {},
      tipo: tipoConstrucao(e.tags?.building),
      andares: Number(e.tags?.['building:levels']) || null,
      area: Math.round(areaM2(e.geometry)),
      endereco: [e.tags?.['addr:street'], e.tags?.['addr:housenumber']].filter(Boolean).join(', '),
      nome: e.tags?.name ?? '',
    }))
}

const CATEGORIA_POI = (t) =>
  t.shop ? `Loja (${t.shop.replace(/_/g, ' ')})` : t.office ? `Escritório (${t.office.replace(/_/g, ' ')})` : t.amenity ? t.amenity.replace(/_/g, ' ') : t.craft ? `Serviço (${t.craft})` : t.tourism ?? t.leisure ?? 'Local'

/** Comércios, escritórios e serviços com nome perto do ponto (com telefone e site quando houver). */
export async function empresasPerto(lat, lon, raio = 60) {
  const els = await overpass(
    `[out:json][timeout:20];(nwr["name"]["shop"](around:${raio},${lat},${lon});nwr["name"]["office"](around:${raio},${lat},${lon});nwr["name"]["amenity"](around:${raio},${lat},${lon});nwr["name"]["craft"](around:${raio},${lat},${lon}););out tags center 60;`,
  )
  return els
    .map((e) => {
      const t = e.tags ?? {}
      const pLat = e.lat ?? e.center?.lat
      const pLon = e.lon ?? e.center?.lon
      return {
        id: `${e.type}${e.id}`,
        nome: t.name,
        categoria: CATEGORIA_POI(t),
        telefone: t.phone ?? t['contact:phone'] ?? t['contact:mobile'] ?? '',
        whatsapp: t['contact:whatsapp'] ?? '',
        site: t.website ?? t['contact:website'] ?? '',
        instagram: t['contact:instagram'] ?? '',
        email: t.email ?? t['contact:email'] ?? '',
        horario: t.opening_hours ?? '',
        cnpj: (t['ref:vatin'] ?? t['ref:CNPJ'] ?? t.cnpj ?? '').replace(/\D/g, ''),
        distancia: pLat ? distanciaKm(lat, lon, pLat, pLon) : 0,
      }
    })
    .sort((a, b) => a.distancia - b.distancia)
}

const VIZINHANCA = [
  ['Escolas', '["amenity"~"^(school|kindergarten)$"]', '🏫'],
  ['Mercados', '["shop"~"^(supermarket|convenience|greengrocer)$"]', '🛒'],
  ['Farmácias', '["amenity"="pharmacy"]', '💊'],
  ['Saúde', '["amenity"~"^(hospital|clinic|doctors)$"]', '🏥'],
  ['Padarias', '["shop"="bakery"]', '🥖'],
  ['Restaurantes', '["amenity"~"^(restaurant|fast_food|cafe)$"]', '🍽️'],
  ['Parques e praças', '["leisure"~"^(park|playground)$"]', '🌳'],
  ['Academias', '["leisure"="fitness_centre"]', '🏋️'],
  ['Ônibus', '["highway"="bus_stop"]', '🚌'],
  ['Metrô e trem', '["railway"~"^(station|subway_entrance)$"]', '🚇'],
  ['Bancos', '["amenity"="bank"]', '🏦'],
]

/** O que tem no bairro (até 1 km): quantidade e o mais perto de cada tipo, para o anúncio. */
export async function vizinhanca(lat, lon, raio = 1000) {
  const partes = VIZINHANCA.map(([, filtro]) => `nwr${filtro}(around:${raio},${lat},${lon});`).join('')
  const els = await overpass(`[out:json][timeout:25];(${partes});out tags center 900;`)
  return VIZINHANCA.map(([nome, filtro, icone]) => {
    const [, chave, op, valor] = filtro.match(/\["([^"]+)"([=~])"([^"]+)"\]/)
    const re = op === '~' ? new RegExp(valor) : null
    const daqui = els
      .filter((e) => {
        const v = e.tags?.[chave]
        return v && (re ? re.test(v) : v === valor)
      })
      .map((e) => ({ nome: e.tags?.name ?? '', d: distanciaKm(lat, lon, e.lat ?? e.center?.lat, e.lon ?? e.center?.lon) }))
      .sort((a, b) => a.d - b.d)
    return { nome, icone, qtd: daqui.length, maisPerto: daqui[0] ?? null }
  })
}

/* ---------- CNPJ (Receita, pela BrasilAPI): empresa, contato e sócios ---------- */

export async function consultarCnpj(cnpj) {
  const n = String(cnpj).replace(/\D/g, '')
  if (n.length !== 14) throw new Error('O CNPJ tem 14 números.')
  const r = await fetchJson(`${BRASIL_API}/cnpj/v1/${n}`, { timeout: 15000 })
  return {
    cnpj: n,
    razao: r.razao_social,
    fantasia: r.nome_fantasia,
    situacao: r.descricao_situacao_cadastral,
    abertura: r.data_inicio_atividade,
    atividade: r.cnae_fiscal_descricao,
    endereco: [r.descricao_tipo_de_logradouro, r.logradouro, r.numero, r.complemento, r.bairro, `${r.municipio}/${r.uf}`, r.cep].filter(Boolean).join(', '),
    telefone: [r.ddd_telefone_1, r.ddd_telefone_2].filter(Boolean).join(' · '),
    email: r.email ?? '',
    socios: (r.qsa ?? []).map((s) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio, desde: s.data_entrada_sociedade })),
  }
}

/* ---------- Caminhos oficiais para descobrir o proprietário ---------- */

export const formatarCep = (c) => (c?.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c ?? '')

export function enderecoTexto(e) {
  if (!e) return ''
  return [[e.rua, e.numero].filter(Boolean).join(', '), e.bairro, e.cidade && `${e.cidade}${e.uf ? ` - ${e.uf}` : ''}`, formatarCep(e.cep)].filter(Boolean).join(' · ')
}

/** Links prontos para o ponto (abrem em outra aba). */
export function links(lat, lon, e) {
  const busca = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`
  const endereco = e ? [e.rua, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean).join(', ') : `${lat},${lon}`
  const cidade = e?.cidade ?? ''
  const paulistana = /^s[aã]o paulo$/i.test(cidade) && e?.uf === 'SP'
  return {
    onrMapa: 'https://mapa.onr.org.br/',
    riDigital: 'https://ridigital.org.br/',
    pesquisaBens: 'https://www.registradores.onr.org.br/',
    iptu: paulistana ? 'https://geosampa.prefeitura.sp.gov.br/' : busca(`consulta IPTU ${cidade} ${e?.uf ?? ''} inscrição imobiliária`),
    prefeituraDados: busca(`dados abertos cadastro imobiliário ${cidade} ${e?.uf ?? ''}`),
    streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    buscaEndereco: busca(`"${[e?.rua, e?.numero].filter(Boolean).join(', ')}" ${cidade}`),
    anuncios: busca(`${[e?.rua, e?.numero].filter(Boolean).join(' ')} ${e?.bairro ?? ''} ${cidade} venda OR aluguel imóvel`),
    cnpjNoEndereco: busca(`CNPJ "${[e?.rua, e?.numero].filter(Boolean).join(', ')}" ${cidade}`),
    endereco,
  }
}
