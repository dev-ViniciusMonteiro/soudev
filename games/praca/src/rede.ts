// Conexão com o backend (Cloudflare): pedir sala, entrar por WebSocket e reconectar se a internet piscar.

import type { MsgCliente, MsgServidor, Pose, RespostaSala, Skin } from './protocolo';

/** Endereço do backend: o publicado na Cloudflare; em desenvolvimento, o local do wrangler (npm run dev no backend-soudev). */
export const BACKEND = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:8787' : 'https://backend-soudev.backend-soudev.workers.dev');

export async function pedirSala(publica: boolean): Promise<string> {
  const r = await fetch(`${BACKEND}/${publica ? 'jogar' : 'salas'}`, { method: 'POST' });
  if (!r.ok) throw new Error(`O servidor respondeu ${r.status}`);
  return ((await r.json()) as RespostaSala).codigo;
}

export async function online(): Promise<{ salas: number; jogadores: number } | null> {
  try {
    const r = await fetch(`${BACKEND}/online`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Id do jogador convidado: criado uma vez e guardado no navegador. */
export function meuId(): string {
  try {
    let id = localStorage.getItem('praca.id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('praca.id', id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type Ouvinte = (m: MsgServidor) => void;

export class Rede {
  private ws: WebSocket | null = null;
  private tentativas = 0;
  private encerrada = false;
  aoReceber: Ouvinte = () => {};
  /** Avisos de estado: 'conectando' | 'conectado' | 'reconectando' | 'caiu'. */
  aoEstado: (estado: 'conectando' | 'conectado' | 'reconectando' | 'caiu') => void = () => {};

  constructor(
    readonly codigo: string,
    private nome: string,
    private skin: Skin,
  ) {
    this.abrir();
  }

  private abrir(): void {
    this.aoEstado(this.tentativas ? 'reconectando' : 'conectando');
    const url = new URL(`${BACKEND.replace(/^http/, 'ws')}/sala/${this.codigo}`);
    url.searchParams.set('id', meuId());
    url.searchParams.set('nome', this.nome);
    url.searchParams.set('skin', this.skin);
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
      if (m.k === 'erro') this.encerrada = true;
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

  trocarSkin(s: Skin): void {
    this.skin = s;
    this.mandar({ k: 'skin', s });
  }

  sair(): void {
    this.encerrada = true;
    this.ws?.close(1000, 'saiu');
  }
}
