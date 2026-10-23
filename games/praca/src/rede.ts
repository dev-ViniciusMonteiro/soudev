// Conexão com o backend (Cloudflare): perfil de convidado, ranking, pedir sala, entrar por WebSocket
// e reconectar se a internet piscar.

import type { IdJogo, MsgCliente, MsgServidor, Perfil, Pose, RespostaNovoPerfil, RespostaRanking, RespostaSala, Skin } from './protocolo';

/** Endereço do backend: o publicado na Cloudflare; em desenvolvimento, o local do wrangler (npm run dev no backend-soudev). */
export const BACKEND = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:8787' : 'https://backend-soudev.backend-soudev.workers.dev');

/* ---------- Token do perfil (segredo deste aparelho) ---------- */

const CHAVE_TOKEN = 'praca.token';

function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

function guardarToken(t: string): void {
  try {
    localStorage.setItem(CHAVE_TOKEN, t);
  } catch {
    /* sem armazenamento: o perfil dura só esta visita */
  }
}

let token = lerToken();
export const temToken = (): boolean => Boolean(token);

async function api<T>(caminho: string, opcoes: { metodo?: string; dados?: unknown } = {}): Promise<T> {
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (opcoes.dados) h['Content-Type'] = 'application/json';
  const r = await fetch(`${BACKEND}${caminho}`, { method: opcoes.metodo ?? 'GET', headers: h, body: opcoes.dados ? JSON.stringify(opcoes.dados) : undefined });
  const d = (await r.json().catch(() => ({}))) as T & { erro?: string };
  if (!r.ok) throw Object.assign(new Error(d.erro ?? `O servidor respondeu ${r.status}`), { status: r.status });
  return d;
}

/** Perfil deste aparelho (null se ainda não criou ou se o token não vale mais). */
export async function meuPerfil(): Promise<Perfil | null> {
  if (!token) return null;
  try {
    return await api<Perfil>('/perfil');
  } catch (e) {
    if ((e as { status?: number }).status === 401) token = null;
    return null;
  }
}

export async function criarPerfil(apelido: string, skin: Skin): Promise<Perfil> {
  const r = await api<RespostaNovoPerfil>('/perfil', { metodo: 'POST', dados: { apelido, skin } });
  token = r.token;
  guardarToken(r.token);
  return r.perfil;
}

export const atualizarPerfil = (dados: { apelido?: string; skin?: Skin }): Promise<Perfil> => api<Perfil>('/perfil', { metodo: 'PATCH', dados });

export const pedirRanking = (por: string): Promise<RespostaRanking> => api<RespostaRanking>(`/ranking?por=${encodeURIComponent(por)}`);

export const pedirSala = async (publica: boolean): Promise<string> => (await api<RespostaSala>(publica ? '/jogar' : '/salas', { metodo: 'POST' })).codigo;

export async function online(): Promise<{ salas: number; jogadores: number } | null> {
  try {
    return await api('/online');
  } catch {
    return null;
  }
}

/* ---------- Sala ---------- */

type Ouvinte = (m: MsgServidor) => void;

export class Rede {
  private ws: WebSocket | null = null;
  private tentativas = 0;
  private encerrada = false;
  aoReceber: Ouvinte = () => {};
  /** Avisos de estado: 'conectando' | 'conectado' | 'reconectando' | 'caiu'. */
  aoEstado: (estado: 'conectando' | 'conectado' | 'reconectando' | 'caiu') => void = () => {};

  constructor(readonly codigo: string) {
    this.abrir();
  }

  private abrir(): void {
    this.aoEstado(this.tentativas ? 'reconectando' : 'conectando');
    const url = new URL(`${BACKEND.replace(/^http/, 'ws')}/sala/${this.codigo}`);
    url.searchParams.set('token', token ?? '');
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.tentativas = 0;
      this.aoEstado('conectado');
    };
    ws.onmessage = (e) => {
      let m: MsgServidor;
      try {
        m = JSON.parse(e.data as string) as MsgServidor;
      } catch {
        return;
      }
      // Sala cheia, código inválido ou aberta em outra aba: não adianta reconectar.
      if (m.k === 'erro' && m.motivo !== 'bloqueado') this.encerrada = true;
      this.aoReceber(m);
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.encerrada) return;
      if (this.tentativas >= 5) {
        this.aoEstado('caiu');
        return;
      }
      this.tentativas++;
      setTimeout(() => !this.encerrada && this.abrir(), 500 * 2 ** this.tentativas);
    };
  }

  private mandar(m: MsgCliente): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  pose(p: Pose): void {
    this.mandar({ k: 'pose', p });
  }

  emote(e: (MsgCliente & { k: 'emote' })['e']): void {
    this.mandar({ k: 'emote', e });
  }

  iniciar(jogo: IdJogo): void {
    this.mandar({ k: 'iniciar', jogo });
  }

  trocarSkin(s: Skin): void {
    this.mandar({ k: 'skin', s });
  }

  sair(): void {
    this.encerrada = true;
    this.ws?.close(1000, 'saiu');
  }
}
