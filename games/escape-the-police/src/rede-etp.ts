// Online do Escape The Police: mesmo backend e mesmo perfil de convidado da Praça (o token fica em
// localStorage 'praca.token', então quem já tem perfil na Praça entra com o mesmo apelido).

import type { ModoEtp, MsgClienteEtp, MsgServidorEtp, RespostaSalaEtp } from './protocolo-etp'

export const BACKEND = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:8787' : 'https://backend-soudev.backend-soudev.workers.dev')

const CHAVE_TOKEN = 'praca.token'
let token: string | null = null
try { token = localStorage.getItem(CHAVE_TOKEN) } catch { /* sem armazenamento */ }

async function api<T>(caminho: string, opcoes: { metodo?: string; dados?: unknown } = {}): Promise<T> {
  const h: Record<string, string> = {}
  if (token) h.Authorization = `Bearer ${token}`
  if (opcoes.dados) h['Content-Type'] = 'application/json'
  const r = await fetch(`${BACKEND}${caminho}`, { method: opcoes.metodo ?? 'GET', headers: h, body: opcoes.dados ? JSON.stringify(opcoes.dados) : undefined })
  const d = (await r.json().catch(() => ({}))) as T & { erro?: string }
  if (!r.ok) throw Object.assign(new Error(d.erro ?? `O servidor respondeu ${r.status}`), { status: r.status })
  return d
}

export interface Perfil { id: string; apelido: string }

export async function meuPerfil(): Promise<Perfil | null> {
  if (!token) return null
  try { return await api<Perfil>('/perfil') } catch (e) { if ((e as { status?: number }).status === 401) token = null; return null }
}

export async function criarPerfil(apelido: string): Promise<Perfil> {
  const r = await api<{ token: string; perfil: Perfil }>('/perfil', { metodo: 'POST', dados: { apelido } })
  token = r.token
  try { localStorage.setItem(CHAVE_TOKEN, r.token) } catch { /* só esta visita */ }
  return r.perfil
}

export const trocarApelido = (apelido: string) => api<Perfil>('/perfil', { metodo: 'PATCH', dados: { apelido } })

export const pedirSala = async (modo: ModoEtp, publica: boolean): Promise<string> =>
  (await api<RespostaSalaEtp>(publica ? '/etp/jogar' : '/etp/salas', { metodo: 'POST', dados: { modo } })).codigo

export class RedeEtp {
  private ws: WebSocket | null = null
  private tentativas = 0
  private encerrada = false
  aoReceber: (m: MsgServidorEtp) => void = () => {}
  aoEstado: (e: 'conectando' | 'conectado' | 'reconectando' | 'caiu') => void = () => {}

  constructor(readonly codigo: string) { this.abrir() }

  private abrir() {
    this.aoEstado(this.tentativas ? 'reconectando' : 'conectando')
    const url = new URL(`${BACKEND.replace(/^http/, 'ws')}/etp/sala/${this.codigo}`)
    url.searchParams.set('token', token ?? '')
    const ws = new WebSocket(url)
    this.ws = ws
    ws.onopen = () => { this.tentativas = 0; this.aoEstado('conectado') }
    ws.onmessage = (e) => {
      let m: MsgServidorEtp
      try { m = JSON.parse(e.data as string) as MsgServidorEtp } catch { return }
      if (m.k === 'erro') this.encerrada = true // sala cheia, fechada ou aberta em outra aba: não reconecta
      this.aoReceber(m)
    }
    ws.onclose = () => {
      if (this.ws !== ws || this.encerrada) return
      if (this.tentativas >= 5) { this.aoEstado('caiu'); return }
      this.tentativas++
      setTimeout(() => !this.encerrada && this.abrir(), 500 * 2 ** this.tentativas)
    }
  }

  mandar(m: MsgClienteEtp) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m))
  }

  sair() {
    this.encerrada = true
    this.ws?.close(1000, 'saiu')
  }
}
