// Salas online: um jogador hospeda no próprio PC e os outros entram pelo código.
// O anfitrião guarda "todo o resto" de cada visitante (dinheiro, itens, posição, PS) no navegador dele;
// os monstros continuam salvos na conta de cada um. Também cuida de ver os outros no mapa e dos desafios.

import { decodeMonsters, encodeMonsters, validateMonster, type Monster } from '../shared/monster';
import { runPvpBattle, type PvpLink } from './battleScene';
import { H, W, box, choose, confirm, ctx, custom, press, say, setFormMode, text, uiBusy } from './engine';
import { buildTeam, collection, game, hooks, loadRoom, newRoom, saveRoom, toast, type Room } from './game';
import { connect, newRoomCode, type Net } from './net';
import { START_POS, T, drawCharacter, solidTile, type Dir } from './world';

interface Remote {
  user: string;
  host: boolean;
  x: number;
  y: number;
  dir: Dir;
  fx: number;
  fy: number;
  t: number; // início do passo (para animar)
  busy: boolean;
}

interface Challenge {
  peer: string;
  user: string;
  team: Monster[];
}

const MY_CODE_KEY = 'monkepo.minhasala';
const HOSTED_KEY = (code: string): string => `monkepo.hospedados.${code}`;
const STEP_MS = 200;

export const mp = {
  net: null as Net | null,
  code: '',
  role: null as null | 'host' | 'guest',
  hostPeer: '',
  hostUser: '',
  players: new Map<string, Remote>(),
  hosted: {} as Record<string, Room>, // salas dos visitantes (só no anfitrião)
  pending: null as Challenge | null,
  inPvp: false,
  lastBusy: false,
};

/* ---------- Fila de mensagens (para esperar respostas na batalha e nos desafios) ---------- */

const queues = new Map<string, { data: unknown }[]>();
const waiters = new Map<string, { resolve: (d: unknown) => void; reject: (e: Error) => void }>();
const qkey = (type: string, peer: string): string => `${type}|${peer}`;

function deliver(type: string, peer: string, data: unknown): void {
  const key = qkey(type, peer);
  const w = waiters.get(key);
  if (w) {
    waiters.delete(key);
    w.resolve(data);
  } else queues.set(key, [...(queues.get(key) ?? []), { data }]);
}

function recv<T>(type: string, peer: string, timeoutMs = 60000): Promise<T> {
  const key = qkey(type, peer);
  const q = queues.get(key);
  if (q?.length) return Promise.resolve(q.shift()!.data as T);
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      waiters.delete(key);
      reject(new Error('tempo esgotado'));
    }, timeoutMs);
    waiters.set(key, {
      resolve: (d) => {
        clearTimeout(timer);
        resolve(d as T);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
  });
}

function dropPeer(peer: string): void {
  for (const [key, w] of waiters) {
    if (key.endsWith(`|${peer}`)) {
      waiters.delete(key);
      w.reject(new Error('saiu'));
    }
  }
  for (const key of [...queues.keys()]) if (key.endsWith(`|${peer}`)) queues.delete(key);
}

const linkTo = (peer: string): PvpLink => ({
  send: (type, data) => mp.net?.send(type, data, peer),
  recv: <T,>(type: string, timeoutMs?: number) => recv<T>(type, peer, timeoutMs),
});

/* ---------- Estado e mensagens ---------- */

const isBusy = (): boolean => game.busy || game.scene !== 'world' || uiBusy() || mp.inPvp;

function hello(target?: string): void {
  const p = game.player;
  mp.net?.send('hi', { user: game.user, host: mp.role === 'host', x: p.x, y: p.y, dir: p.dir, busy: isBusy() }, target);
}

function persistHosted(): void {
  try {
    localStorage.setItem(HOSTED_KEY(mp.code), JSON.stringify(mp.hosted));
  } catch {
    /* sem armazenamento */
  }
}

function setupNet(net: Net): void {
  mp.net = net;
  net.onJoin((peer) => hello(peer));
  net.onLeave((peer) => {
    const who = mp.players.get(peer);
    mp.players.delete(peer);
    dropPeer(peer);
    if (mp.role === 'guest' && peer === mp.hostPeer) void hostGone();
    else if (who) toast(`${who.user} saiu da sala`);
  });
  net.on('hi', (d, peer) => {
    const h = d as Partial<Remote>;
    if (typeof h.user !== 'string' || !h.user || h.user === game.user) return;
    const old = mp.players.get(peer);
    const x = Number(h.x) || START_POS.x;
    const y = Number(h.y) || START_POS.y;
    mp.players.set(peer, { user: h.user.slice(0, 16), host: !!h.host, x, y, dir: (h.dir as Dir) ?? 'down', fx: x, fy: y, t: 0, busy: !!h.busy });
    if (!old) toast(`${h.user} entrou na sala`);
    if (h.host && mp.role === 'guest') {
      mp.hostPeer = peer;
      mp.hostUser = h.user;
    }
    if (mp.role === 'host' && !h.host && !old) {
      // Entrega ao visitante a sala dele (ou o kit, se for a primeira vez).
      const room = mp.hosted[h.user] ?? newRoom();
      mp.hosted[h.user] = room;
      persistHosted();
      net.send('welcome', { room, host: game.user }, peer);
      hello(peer);
    }
  });
  net.on('welcome', (d, peer) => deliver('welcome', peer, d));
  net.on('sync', (d, peer) => {
    if (mp.role !== 'host') return;
    const who = mp.players.get(peer);
    const room = (d as { room?: Room }).room;
    if (!who || !room || typeof room !== 'object') return;
    mp.hosted[who.user] = room;
    persistHosted();
  });
  net.on('pos', (d, peer) => {
    const r = mp.players.get(peer);
    const p = d as { x: number; y: number; dir: Dir; busy?: boolean };
    if (!r) return;
    const now = performance.now();
    if (p.x !== r.x || p.y !== r.y) {
      const k = Math.min(1, (now - r.t) / STEP_MS);
      r.fx = r.fx + (r.x - r.fx) * k;
      r.fy = r.fy + (r.y - r.fy) * k;
      r.t = now;
    }
    r.x = p.x;
    r.y = p.y;
    r.dir = p.dir;
    if (p.busy !== undefined) r.busy = p.busy;
  });
  net.on('close', (_d, peer) => {
    if (peer === mp.hostPeer) void hostGone();
  });
  net.on('chal', (d, peer) => {
    const who = mp.players.get(peer);
    const team = decodeTeam((d as { team?: string }).team);
    if (!who || !team) return net.send('chalr', { ok: false, motivo: 'time inválido' }, peer);
    if (isBusy() || mp.pending) return net.send('chalr', { ok: false, motivo: 'ocupado' }, peer);
    mp.pending = { peer, user: who.user, team };
  });
  for (const type of ['chalr', 'act', 'rep', 'evts']) net.on(type, (d, peer) => deliver(type, peer, d));
}

/** Time recebido de outro jogador: precisa ser válido pelas mesmas regras do servidor. */
function decodeTeam(raw: unknown): Monster[] | null {
  if (typeof raw !== 'string' || raw.length > 3000) return null;
  const list = decodeMonsters(raw);
  if (!list || list.length < 1 || list.length > 6) return null;
  return list.every((m) => validateMonster(m) === null) ? list : null;
}

/* ---------- Criar, entrar e sair ---------- */

async function createRoom(): Promise<void> {
  let code = '';
  try {
    code = localStorage.getItem(MY_CODE_KEY) ?? '';
  } catch {
    /* sem armazenamento */
  }
  if (!code) {
    code = newRoomCode();
    try {
      localStorage.setItem(MY_CODE_KEY, code);
    } catch {
      /* sem armazenamento */
    }
  }
  mp.code = code;
  mp.role = 'host';
  try {
    mp.hosted = JSON.parse(localStorage.getItem(HOSTED_KEY(code)) ?? '{}');
  } catch {
    mp.hosted = {};
  }
  setupNet(connect(code));
  await say(`Sala aberta no seu PC! Código: ${code}`);
  await say('Passe o código para os amigos entrarem. Deixe esta aba aberta: quando você sai, a sala fecha.');
}

async function joinByCode(): Promise<void> {
  const code = (await askText('Código da sala (6 letras/números)'))?.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return;
  if (code.length !== 6) return void (await say('O código tem 6 letras ou números.'));
  saveRoom(); // guarda a sala local antes de trocar
  mp.code = code;
  mp.role = 'guest';
  const net = connect(code);
  setupNet(net);
  // Aviso "procurando" que fecha sozinho quando a busca termina.
  let found = false;
  const started = performance.now();
  const searching = custom(
    (t) => {
      box(0, H - 88, W, 88);
      text(`Procurando a sala ${code}${'.'.repeat(Math.floor(t / 400) % 4)}`, 22, H - 52, { size: 17 });
      text(`Pode levar alguns segundos (${Math.floor((t - started) / 1000)}s)`, 22, H - 26, { size: 13, color: '#707070' });
    },
    (_b, close) => {
      if (found) close(0);
    },
  );
  let welcome: { room: Room; host: string } | null = null;
  try {
    // A mensagem de boas-vindas vem do anfitrião, que ainda não sabemos quem é: aceita de qualquer par.
    welcome = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('tempo')), 30000);
      net.on('welcome', (d, peer) => {
        clearTimeout(timer);
        mp.hostPeer = peer;
        resolve(d as { room: Room; host: string });
      });
    });
  } catch {
    welcome = null;
  }
  found = true;
  press('a');
  await searching;
  if (!welcome) {
    net.leave();
    resetMp();
    return void (await say('Não encontrei essa sala. Confira o código e se o anfitrião está com o jogo aberto.'));
  }
  mp.hostUser = welcome.host;
  enterRemoteRoom(welcome.room);
  await say(`Você entrou na sala de ${welcome.host}! Seu dinheiro e seus itens ficam guardados com o anfitrião.`);
}

function enterRemoteRoom(room: Room): void {
  game.room = { ...newRoom(), ...room };
  buildTeam(collection());
  const r = game.room;
  const ok = !solidTile(r.x, r.y);
  Object.assign(game.player, { x: ok ? r.x : START_POS.x, y: ok ? r.y : START_POS.y, dir: r.dir ?? 'down', moving: null });
  let last = 0;
  hooks.roomSink = (room2) => {
    const now = Date.now();
    if (now - last < 3000) return;
    last = now;
    mp.net?.send('sync', { room: room2 }, mp.hostPeer);
  };
  hello();
}

function backToLocalRoom(): void {
  hooks.roomSink = null;
  game.room = loadRoom(game.user);
  buildTeam(collection());
  const r = game.room;
  Object.assign(game.player, { x: r.x, y: r.y, dir: r.dir, moving: null });
}

function resetMp(): void {
  mp.net = null;
  mp.role = null;
  mp.code = '';
  mp.hostPeer = '';
  mp.hostUser = '';
  mp.players.clear();
  mp.pending = null;
  queues.clear();
}

async function leaveRoom(): Promise<void> {
  if (mp.role === 'guest') {
    hooks.roomSink = null;
    saveRoomRemoteNow();
    mp.net?.leave();
    resetMp();
    backToLocalRoom();
    await say('Você saiu da sala e voltou para a sua sala local.');
  } else if (mp.role === 'host') {
    mp.net?.send('close', {});
    persistHosted();
    mp.net?.leave();
    resetMp();
    await say('Sala fechada. O progresso dos visitantes fica guardado aqui para a próxima vez.');
  }
}

function saveRoomRemoteNow(): void {
  const sink = hooks.roomSink;
  hooks.roomSink = (r) => mp.net?.send('sync', { room: r }, mp.hostPeer);
  saveRoom();
  hooks.roomSink = sink;
}

async function hostGone(): Promise<void> {
  if (mp.role !== 'guest') return;
  mp.net?.leave();
  resetMp();
  backToLocalRoom();
  await say('O anfitrião fechou a sala. Você voltou para a sua sala local.');
}

/* ---------- Desafios ---------- */

const peerAtTile = (x: number, y: number): [string, Remote] | undefined => [...mp.players].find(([, r]) => r.x === x && r.y === y);

async function challenge(x: number, y: number): Promise<void> {
  const found = peerAtTile(x, y);
  if (!found) return;
  const [peer, r] = found;
  game.busy = true;
  try {
    if (r.busy) return void (await say(`${r.user} está ocupado agora.`));
    const pick = await choose(['BATALHAR', 'CANCELAR'], { w: 180, hint: () => `${r.user} está aqui. O que fazer?` });
    if (pick !== 0) return;
    const mine = game.party.map((p) => p.m);
    mp.net?.send('chal', { team: encodeMonsters(mine) }, peer);
    const answer = recv<{ ok: boolean; team?: string; motivo?: string }>('chalr', peer, 45000);
    await say(`Desafio enviado para ${r.user}. Esperando a resposta...`, { auto: 300 });
    let reply: { ok: boolean; team?: string; motivo?: string };
    try {
      reply = await answer;
    } catch {
      return void (await say(`${r.user} não respondeu.`));
    }
    if (!reply.ok) return void (await say(reply.motivo === 'ocupado' ? `${r.user} está ocupado agora.` : `${r.user} recusou o desafio.`));
    const theirs = decodeTeam(reply.team);
    if (!theirs) return void (await say('O time do outro jogador veio inválido.'));
    await fight(peer, r.user, mine, theirs, true);
  } finally {
    game.busy = false;
  }
}

async function answerChallenge(): Promise<void> {
  const c = mp.pending;
  if (!c) return;
  game.busy = true;
  try {
    const ok = await confirm(`${c.user} desafiou você para uma batalha! Aceitar?`);
    const still = mp.players.has(c.peer);
    mp.pending = null;
    if (!still) return;
    if (!ok) {
      mp.net?.send('chalr', { ok: false, motivo: 'recusou' }, c.peer);
      return;
    }
    const mine = game.party.map((p) => p.m);
    mp.net?.send('chalr', { ok: true, team: encodeMonsters(mine) }, c.peer);
    await fight(c.peer, c.user, mine, c.team, false);
  } finally {
    mp.pending = null;
    game.busy = false;
  }
}

async function fight(peer: string, foe: string, mine: Monster[], theirs: Monster[], authority: boolean): Promise<void> {
  mp.inPvp = true;
  sendPos();
  game.scene = 'battle';
  const result = await runPvpBattle({ mine, theirs, me: game.user, foe, authority, link: linkTo(peer) });
  game.scene = 'world';
  mp.inPvp = false;
  sendPos();
  const room = game.room as Room & { pvp?: { v: number; d: number } };
  room.pvp ??= { v: 0, d: 0 };
  if (result === 'win') room.pvp.v++;
  if (result === 'lose') room.pvp.d++;
  if (result !== 'abort') await say(`Batalhas online: ${room.pvp.v} vitória(s) e ${room.pvp.d} derrota(s). Os times voltam curados.`);
  saveRoom();
}

/* ---------- Menu da sala ---------- */

async function roomMenu(): Promise<void> {
  if (!mp.role) {
    const pick = await choose(['CRIAR SALA', 'ENTRAR NUMA SALA', 'VOLTAR'], {
      w: 260,
      hint: (i) => ['Abre uma sala no seu PC. Os outros entram com o código.', 'Entra na sala de um amigo com o código dele.', ''][i],
    });
    if (pick === 0) await createRoom();
    else if (pick === 1) await joinByCode();
    return;
  }
  const names = [...mp.players.values()].map((p) => `${p.user}${p.host ? ' (anfitrião)' : ''}${p.busy ? ' ⚔' : ''}`);
  const pick = await choose(['JOGADORES', 'CÓDIGO', mp.role === 'host' ? 'FECHAR SALA' : 'SAIR DA SALA', 'VOLTAR'], {
    w: 220,
    hint: () => `Sala ${mp.code} • ${mp.players.size + 1} jogador(es). Para batalhar, fique de frente para alguém e aperte A.`,
  });
  if (pick === 0) await say(names.length ? `Na sala: você, ${names.join(', ')}.` : 'Só você por enquanto. Passe o código para os amigos!');
  else if (pick === 1) await say(`O código da sala é ${mp.code}.`);
  else if (pick === 2 && (await confirm(mp.role === 'host' ? 'Fechar a sala para todos?' : 'Sair da sala?'))) await leaveRoom();
}

/* ---------- Texto digitado (código da sala) ---------- */

function askText(label: string): Promise<string | null> {
  const form = document.getElementById('pergunta') as HTMLFormElement;
  const input = document.getElementById('pergunta-campo') as HTMLInputElement;
  const cancel = document.getElementById('pergunta-cancelar') as HTMLButtonElement;
  (document.getElementById('pergunta-texto') as HTMLLabelElement).textContent = label;
  input.value = '';
  form.hidden = false;
  setFormMode(true);
  setTimeout(() => input.focus(), 30);
  return new Promise((resolve) => {
    const done = (v: string | null): void => {
      form.hidden = true;
      setFormMode(false);
      form.onsubmit = null;
      cancel.onclick = null;
      resolve(v);
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      done(input.value.trim());
    };
    cancel.onclick = () => done(null);
  });
}

/* ---------- Movimento e desenho ---------- */

let lastPosSent = '';
export function sendPos(): void {
  if (!mp.net) return;
  const p = game.player;
  const busy = isBusy();
  const key = `${p.x},${p.y},${p.dir},${busy}`;
  if (key === lastPosSent) return;
  lastPosSent = key;
  mp.net.send('pos', { x: p.x, y: p.y, dir: p.dir, busy });
}

const COLORS: [string, string, string][] = [
  ['#2a1a10', '#3a7ad8', '#303848'], ['#e8c050', '#40a060', '#504030'], ['#702020', '#f0a030', '#203040'],
  ['#101010', '#a050c0', '#404040'], ['#c06030', '#30a0a0', '#383050'], ['#f0e0c0', '#d04080', '#304060'],
];
const colorsFor = (user: string): [string, string, string] => COLORS[[...user].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function actors(camX: number, camY: number, now: number): { y: number; draw: () => void }[] {
  return [...mp.players.values()].map((r) => {
    const k = Math.min(1, (now - r.t) / STEP_MS);
    const x = (r.fx + (r.x - r.fx) * k) * T;
    const y = (r.fy + (r.y - r.fy) * k) * T;
    const walking = k < 1 ? Math.floor(k * 2) + 1 : 0;
    return {
      y,
      draw: () => {
        drawCharacter(x - camX, y - camY - 6, r.dir, walking, colorsFor(r.user), r.busy ? '⚔' : undefined);
        ctx.font = 'bold 11px sans-serif';
        const w = ctx.measureText(r.user).width + 8;
        ctx.fillStyle = 'rgba(20,30,50,.75)';
        ctx.fillRect(x - camX + 16 - w / 2, y - camY - 22, w, 14);
        text(r.user, x - camX + 16, y - camY - 11, { size: 11, color: r.host ? '#f8d030' : '#ffffff', align: 'center', shadow: '' });
      },
    };
  });
}

/** Liga a sala ao jogo (chamado uma vez no início). */
export function setupMultiplayer(): void {
  hooks.roomMenu = roomMenu;
  hooks.moved = sendPos;
  hooks.peerAt = (x, y) => !!peerAtTile(x, y);
  hooks.interactPeer = challenge;
  hooks.pending = () => !!mp.pending && !isBusy();
  hooks.handlePending = answerChallenge;
  hooks.actors = actors;
  hooks.hud = () => (mp.role ? `Sala ${mp.code} • ${mp.players.size + 1} online${mp.role === 'host' ? ' • anfitrião' : ''}` : null);
  // Avisa os outros quando entra/sai de batalha ou menu, e reenvia a posição de tempos em tempos.
  setInterval(() => {
    if (!mp.net) return;
    const busy = isBusy();
    if (busy !== mp.lastBusy) {
      mp.lastBusy = busy;
      sendPos();
    }
  }, 500);
  setInterval(() => mp.net && hello(), 15000);
  addEventListener('pagehide', () => {
    if (mp.role === 'host') mp.net?.send('close', {});
    if (mp.role === 'guest') saveRoomRemoteNow();
  });
}

