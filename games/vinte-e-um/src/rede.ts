// Rede das salas: conexão direta entre os navegadores (WebRTC via Trystero, sem servidor próprio).
// Com ?rede=local na URL usa BroadcastChannel (abas do mesmo navegador), para testes.

import { joinRoom, selfId as trysteroSelfId } from 'trystero';

export type Handler = (data: unknown, peer: string) => void;

export interface Net {
  selfId: string;
  send(type: string, data: unknown, target?: string): void;
  on(type: string, handler: Handler): void;
  onJoin(cb: (peer: string) => void): void;
  onLeave(cb: (peer: string) => void): void;
  leave(): void;
}

const APP_ID = 'vinteum.soudev.v1';

interface Envelope {
  t: string;
  d: unknown;
}

function base(): { handlers: Map<string, Handler[]>; dispatch: (env: Envelope, peer: string) => void; on: (type: string, h: Handler) => void } {
  const handlers = new Map<string, Handler[]>();
  return {
    handlers,
    dispatch: (env, peer) => {
      for (const h of handlers.get(env.t) ?? []) {
        try {
          h(env.d, peer);
        } catch (e) {
          console.warn('21: falha ao tratar mensagem', env.t, e);
        }
      }
    },
    on: (type, h) => handlers.set(type, [...(handlers.get(type) ?? []), h]),
  };
}

function trysteroNet(code: string): Net {
  // A senha (o próprio código) criptografa a troca de conexão entre os jogadores.
  const room = joinRoom({ appId: APP_ID, password: code }, code);
  const msg = room.makeAction<string>('msg');
  const b = base();
  msg.onMessage = (raw, ctx) => {
    try {
      b.dispatch(JSON.parse(raw) as Envelope, ctx.peerId);
    } catch {
      /* mensagem inválida */
    }
  };
  const joins: ((p: string) => void)[] = [];
  const leaves: ((p: string) => void)[] = [];
  room.onPeerJoin = (p) => joins.forEach((cb) => cb(p));
  room.onPeerLeave = (p) => leaves.forEach((cb) => cb(p));
  return {
    selfId: trysteroSelfId,
    send: (t, d, target) => void msg.send(JSON.stringify({ t, d }), target ? { target } : undefined).catch(() => {}),
    on: b.on,
    onJoin: (cb) => joins.push(cb),
    onLeave: (cb) => leaves.push(cb),
    leave: () => void room.leave(),
  };
}

function localNet(code: string): Net {
  const selfId = Math.random().toString(36).slice(2, 10);
  const ch = new BroadcastChannel(`vinteum-${code}`);
  const b = base();
  const peers = new Set<string>();
  const joins: ((p: string) => void)[] = [];
  const leaves: ((p: string) => void)[] = [];
  const post = (m: Record<string, unknown>): void => ch.postMessage({ ...m, from: selfId });
  const join = (p: string): void => {
    if (peers.has(p)) return;
    peers.add(p);
    joins.forEach((cb) => cb(p));
  };
  ch.onmessage = (e) => {
    const m = e.data as { from: string; to?: string; kind: string; env?: Envelope };
    if (m.from === selfId || (m.to && m.to !== selfId)) return;
    if (m.kind === 'join') {
      join(m.from);
      post({ kind: 'here', to: m.from });
    } else if (m.kind === 'here') join(m.from);
    else if (m.kind === 'leave') {
      if (peers.delete(m.from)) leaves.forEach((cb) => cb(m.from));
    } else if (m.kind === 'msg' && m.env && peers.has(m.from)) b.dispatch(m.env, m.from);
  };
  setTimeout(() => post({ kind: 'join' }), 50);
  const leave = (): void => {
    post({ kind: 'leave' });
    ch.close();
  };
  addEventListener('pagehide', leave);
  return {
    selfId,
    send: (t, d, target) => post({ kind: 'msg', to: target, env: { t, d } }),
    on: b.on,
    onJoin: (cb) => joins.push(cb),
    onLeave: (cb) => leaves.push(cb),
    leave,
  };
}

export const useLocalNet = new URLSearchParams(location.search).get('rede') === 'local';
export const connect = (code: string): Net => (useLocalNet ? localNet(code) : trysteroNet(code));

/** Código de sala fácil de ditar (sem 0/O, 1/I). */
export function newRoomCode(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const rnd = crypto.getRandomValues(new Uint32Array(6));
  for (const n of rnd) s += abc[n % abc.length];
  return s;
}
