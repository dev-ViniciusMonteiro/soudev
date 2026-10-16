// Chamadas a APIs públicas direto do navegador, com tempo limite e uma nova tentativa.

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

export async function fetchJson(url, { timeout = 12000, retries = 1, init } = {}) {
  let last
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      if (response.status === 404) throw new ApiError('não encontrado', 404)
      if (!response.ok) throw new ApiError(`erro ${response.status}`, response.status)
      return await response.json()
    } catch (error) {
      last = error
      if (error instanceof ApiError && error.status === 404) throw error
      if (attempt < retries) await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
    } finally {
      clearTimeout(timer)
    }
  }
  throw last instanceof ApiError ? last : new ApiError('sem conexão')
}

export const BRASIL_API = 'https://brasilapi.com.br/api'

/** Mensagem amigável para erros de rede. */
export const apiMessage = (error, notFound = 'Não encontrado.') =>
  error?.status === 404 ? notFound : 'Não foi possível consultar agora. Verifique sua conexão e tente novamente em instantes.'

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const rad = (x) => (x * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}

export const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`)

/** Posição atual do aparelho (pede permissão). */
export function minhaPosicao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Seu navegador não permite localização.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? 'Permissão de localização negada. Digite o endereço ou a cidade.' : 'Não foi possível obter sua localização. Digite o endereço ou a cidade.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}

export const dataBR = (d) => (d instanceof Date ? d : new Date(d)).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

/** "2005-03-02" -> "02/03/2005" (sem passar por fuso horário). */
export const isoParaBR = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '')

/** Idade em texto a partir de uma data: "3 anos e 2 meses", "12 dias". */
export function idadeTexto(desde, ate = new Date()) {
  const dias = Math.floor((ate - desde) / 86400000)
  if (dias < 60) return `${dias} dia${dias === 1 ? '' : 's'}`
  const meses = Math.floor(dias / 30.44)
  if (meses < 24) return `${meses} meses`
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  return `${anos} anos${resto ? ` e ${resto} ${resto === 1 ? 'mês' : 'meses'}` : ''}`
}
