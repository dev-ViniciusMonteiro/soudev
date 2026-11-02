// Compartilhar sem banco de dados: os dados vão compactados dentro do próprio link (#d=...).
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'

function b64url(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function deB64url(t) {
  let s = t.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export const codificar = (obj) => b64url(deflateSync(strToU8(JSON.stringify(obj)), { level: 9 }))
export const decodificar = (txt) => JSON.parse(strFromU8(inflateSync(deB64url(txt))))

export const linkCom = (obj) => `${window.location.origin}${window.location.pathname}#d=${codificar(obj)}`

// Lê #d=... da URL. Devolve null se não houver ou se o link estiver quebrado.
export function lerDoLink() {
  if (typeof window === 'undefined') return null
  const d = new URLSearchParams(window.location.hash.slice(1)).get('d')
  if (!d) return null
  try {
    return decodificar(d)
  } catch {
    return null
  }
}

export const limparHash = () => history.replaceState(null, '', window.location.pathname + window.location.search)

// Lê outros parâmetros do hash (#v=...&k=...)
export function hashParam(nome) {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.hash.slice(1)).get(nome) || ''
}
