// Contas geográficas do globo (sem Cesium, testáveis no Node).

const R = 6371008.8
const rad = (g) => (g * Math.PI) / 180
const grau = (r) => (r * 180) / Math.PI

/** Distância em metros entre dois pontos {lat, lon} (haversine). */
export function distancia(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const comprimento = (pts) => pts.slice(1).reduce((s, p, i) => s + distancia(pts[i], p), 0)

/** Área de um polígono na esfera, em m² (fórmula de excesso esférico por trapézios). */
export function area(pts) {
  if (pts.length < 3) return 0
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    s += rad(b.lon - a.lon) * (2 + Math.sin(rad(a.lat)) + Math.sin(rad(b.lat)))
  }
  return Math.abs((s * R * R) / 2)
}

export const fmtDistancia = (m) => (m >= 1000 ? `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: m >= 100000 ? 0 : 1 })} km` : `${Math.round(m)} m`)
export const fmtArea = (m2) => (m2 >= 1e6 ? `${(m2 / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km²` : `${Math.round(m2).toLocaleString('pt-BR')} m²`)

export function fmtCoord(lat, lon) {
  const f = (v, pos, neg) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`
  return `${f(lat, 'N', 'S')}, ${f(lon, 'L', 'O')}`
}

export const fmtDuracao = (s) => {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}

/**
 * Lê coordenadas digitadas: "-23.55, -46.63", "23°33'S 46°38'W", "23.5S 46.6W".
 * Devolve {lat, lon} ou null.
 */
export function lerCoordenadas(texto) {
  const t = String(texto).trim().toUpperCase().replace(/,(?=\d)/g, '.')
  const dms = [...t.matchAll(/(-?\d+(?:\.\d+)?)\s*°?\s*(?:(\d+(?:\.\d+)?)\s*['′])?\s*(?:(\d+(?:\.\d+)?)\s*["″])?\s*([NSLEOW])?/g)].filter((m) => m[1] !== undefined && m[0].trim())
  if (dms.length < 2) return null
  const val = (m) => {
    let v = Math.abs(Number(m[1])) + (Number(m[2]) || 0) / 60 + (Number(m[3]) || 0) / 3600
    if (m[1].startsWith('-') || ['S', 'O', 'W'].includes(m[4])) v = -v
    return { v, h: m[4] }
  }
  let [a, b] = dms.slice(0, 2).map(val)
  if (['L', 'E', 'O', 'W'].includes(a.h) && ['N', 'S'].includes(b.h)) [a, b] = [b, a]
  if (Math.abs(a.v) > 90 || Math.abs(b.v) > 180) return null
  return { lat: a.v, lon: b.v }
}

/** Raio em milhas náuticas que cobre a vista, a partir da altura da câmera (m). */
export const raioDaVista = (altura) => Math.max(10, Math.min(250, (altura / 1852) * 0.9))

/**
 * Próximas passagens de um satélite sobre o observador (precisa do satellite.js).
 * Devolve [{ inicio, fim, maxElev, maxEm }] com elevação mínima de 10°.
 */
export function passagens(sat, satrec, obs, { inicio = new Date(), horas = 24, passo = 20, minElev = 10 } = {}) {
  const local = { latitude: rad(obs.lat), longitude: rad(obs.lon), height: (obs.alt || 0) / 1000 }
  const out = []
  let atual = null
  for (let s = 0; s <= horas * 3600; s += passo) {
    const t = new Date(inicio.getTime() + s * 1000)
    const pv = sat.propagate(satrec, t)
    if (!pv.position) continue
    const ecf = sat.eciToEcf(pv.position, sat.gstime(t))
    const ang = sat.ecfToLookAngles(local, ecf)
    const elev = grau(ang.elevation)
    if (elev >= minElev) {
      if (!atual) atual = { inicio: t, maxElev: elev, maxEm: t, azInicio: grau(ang.azimuth) }
      if (elev > atual.maxElev) {
        atual.maxElev = elev
        atual.maxEm = t
      }
      atual.fim = t
      atual.azFim = grau(ang.azimuth)
    } else if (atual) {
      out.push(atual)
      atual = null
      if (out.length >= 8) break
    }
  }
  if (atual) out.push(atual)
  return out.map((p) => ({ ...p, maxElev: Math.round(p.maxElev) }))
}

export const pontoCardeal = (az) => ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'][Math.round((((az % 360) + 360) % 360) / 45) % 8]
