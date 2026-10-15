// Jogo no mapa: andar, grama alta, treinadores, Centro de Cura, Loja, Caixa, menu e evolução.
// Só os MonKePos vão para a planilha. O resto (posição, dinheiro, mochila, PS) fica na "sala" deste PC.

import { ITEMS, STARTER_KIT, getItem, getSpecies, type Status } from '../shared/data';
import { decodeMonsters, type Monster } from '../shared/monster';
import { ranking, sair } from './api';
import { offerMove, runBattle, type BattleResult } from './battleScene';
import { H, W, box, choose, clearPresses, confirm, ctx, custom, image, isHeld, press, say, takePress, text, uiBusy, wait } from './engine';
import { createMonster, displayName, evolve, heal, maxHp, pendingEvolution, randInt, species, toParty, type PartyMon } from './monsters';
import { chooseParty, monIcon, showSummary } from './party';
import { SaveManager } from './save';
import {
  CENTRO_POS, DIRS, ENCOUNTERS, MAP_H, MAP_W, NPCS, SIGNS, START_POS, T, buildingDoorAt, drawCharacter, drawWaterAnim, grid,
  mapCanvas, solidTile, zoneAt, type Dir, type Npc, type Zone,
} from './world';

const TEAM_MAX = 6;
const ROOM_KEY = (user: string): string => `monkepo.sala.${user}`;

interface Room {
  x: number;
  y: number;
  dir: Dir;
  dinheiro: number;
  mochila: Record<string, number>;
  vencidos: string[]; // treinadores derrotados nesta sala
  insignias: string[];
  estado: Record<string, { hp: number; pp: number[]; status: Status | null }>; // PS/PP por uid
}

export const game = {
  user: '',
  party: [] as PartyMon[],
  box: [] as Monster[],
  room: null as unknown as Room,
  saver: null as unknown as SaveManager,
  scene: 'world' as 'world' | 'battle' | 'transition',
  transition: 0,
  player: { x: 0, y: 0, dir: 'down' as Dir, moving: null as null | { fx: number; fy: number; t: number; dur: number }, frame: 0 },
  exclaim: null as null | { id: string; until: number },
  toast: null as null | { text: string; until: number },
  declined: new Map<string, number>(), // evoluções recusadas: uid -> nível
  busy: false,
  results: [] as BattleResult[], // histórico (usado nos testes)
};

export const collection = (): Monster[] => [...game.party.map((p) => p.m), ...game.box];

/* ---------- Sala (dados locais) ---------- */

function newRoom(): Room {
  return { x: START_POS.x, y: START_POS.y, dir: START_POS.dir, dinheiro: STARTER_KIT.dinheiro, mochila: { ...STARTER_KIT.mochila }, vencidos: [], insignias: [], estado: {} };
}

export function saveRoom(): void {
  const r = game.room;
  r.x = game.player.x;
  r.y = game.player.y;
  r.dir = game.player.dir;
  r.estado = Object.fromEntries(game.party.map((p) => [p.m.uid, { hp: p.hp, pp: p.pp, status: p.status }]));
  try {
    localStorage.setItem(ROOM_KEY(game.user), JSON.stringify(r));
  } catch {
    /* sem armazenamento: a sala vale até fechar a aba */
  }
}

function loadRoom(user: string): Room {
  try {
    const raw = localStorage.getItem(ROOM_KEY(user));
    if (raw) return { ...newRoom(), ...JSON.parse(raw) };
  } catch {
    /* ignora sala corrompida */
  }
  return newRoom();
}

/** Monta o time (até 6) e a caixa a partir dos monstros da conta. */
function buildTeam(list: Monster[]): void {
  game.party = list.slice(0, TEAM_MAX).map((m) => {
    const p = toParty(m);
    const st = game.room.estado[m.uid];
    if (st && st.pp.length === m.moves.length) {
      p.hp = Math.min(maxHp(m), Math.max(0, st.hp));
      p.pp = st.pp;
      p.status = st.status;
    }
    return p;
  });
  game.box = list.slice(TEAM_MAX);
  if (game.party.every((p) => p.hp <= 0)) game.party.forEach(heal);
}

export function startGame(user: string, rev: number, data: string, monsters: Monster[]): void {
  game.user = user;
  game.room = loadRoom(user);
  buildTeam(monsters);
  game.player.x = game.room.x;
  game.player.y = game.room.y;
  game.player.dir = game.room.dir;
  if (solidTile(game.player.x, game.player.y)) Object.assign(game.player, { x: START_POS.x, y: START_POS.y });
  game.saver = new SaveManager(rev, data, collection);
  game.saver.onConflict = (reply) => void handleConflict(reply);
  game.saver.onError = (msg) => toast(`Não salvou: ${msg}`);
  setInterval(saveRoom, 4000);
  addEventListener('pagehide', saveRoom);
}

async function handleConflict(reply: Record<string, unknown>): Promise<void> {
  const list = decodeMonsters(String(reply.monstros ?? '')) ?? [];
  game.saver.reset(Number(reply.rev), String(reply.monstros ?? ''));
  buildTeam(list);
  await say('Sua conta foi salva em outro aparelho. Carregamos os MonKePos mais recentes.');
}

export function toast(msg: string): void {
  game.toast = { text: msg, until: performance.now() + 2600 };
}

/* ---------- Mapa: movimento ---------- */

const WALK_MS = 210;
const RUN_MS = 120;

const npcAt = (x: number, y: number): Npc | undefined => NPCS.find((n) => n.x === x && n.y === y);

function blocked(x: number, y: number): boolean {
  return solidTile(x, y) || !!npcAt(x, y);
}

export function updateWorld(now: number): void {
  if (game.scene !== 'world' || uiBusy() || game.busy) return;
  const pl = game.player;
  if (pl.moving) {
    const k = (now - pl.moving.t) / pl.moving.dur;
    if (k >= 1) {
      pl.moving = null;
      void afterStep();
    }
    return;
  }
  // Botões apertados (A, START)
  let b;
  while ((b = takePress())) {
    if (b === 'a') return void interact();
    if (b === 'start') return void startMenu();
  }
  const dir = (['up', 'down', 'left', 'right'] as Dir[]).find((d) => isHeld(d));
  if (!dir) return;
  if (pl.dir !== dir) {
    pl.dir = dir;
    // Só vira se for um toque rápido; segurando, já anda.
  }
  const [dx, dy] = DIRS[dir];
  const nx = pl.x + dx;
  const ny = pl.y + dy;
  const door = buildingDoorAt(nx, ny);
  if (door) {
    pl.dir = dir;
    return void enterBuilding(door.kind);
  }
  if (blocked(nx, ny)) return;
  pl.moving = { fx: pl.x, fy: pl.y, t: now, dur: isHeld('b') ? RUN_MS : WALK_MS };
  pl.x = nx;
  pl.y = ny;
  pl.frame++;
}

async function afterStep(): Promise<void> {
  const pl = game.player;
  // Treinador viu o jogador?
  for (const npc of NPCS) {
    if (!npc.trainer || game.room.vencidos.includes(npc.id)) continue;
    if (sees(npc, pl.x, pl.y)) return void trainerBattle(npc, true);
  }
  // Grama alta: chance de encontro a cada passo.
  const zone = zoneAt(pl.x, pl.y);
  if (zone && Math.random() < 0.11) await wildBattle(zone);
}

function sees(npc: Npc, x: number, y: number): boolean {
  const [dx, dy] = DIRS[npc.dir];
  for (let i = 1; i <= 5; i++) {
    const tx = npc.x + dx * i;
    const ty = npc.y + dy * i;
    if (tx === x && ty === y) return true;
    if (solidTile(tx, ty)) return false;
  }
  return false;
}

async function interact(): Promise<void> {
  const pl = game.player;
  const [dx, dy] = DIRS[pl.dir];
  const tx = pl.x + dx;
  const ty = pl.y + dy;
  const npc = npcAt(tx, ty);
  if (npc) {
    npc.dir = (Object.keys(DIRS) as Dir[]).find((d) => DIRS[d][0] === -dx && DIRS[d][1] === -dy)!;
    if (npc.trainer && !game.room.vencidos.includes(npc.id)) return trainerBattle(npc, false);
    for (const line of npc.trainer ? [npc.trainer.after] : npc.talk) await say(`${npc.name}: ${line}`);
    return;
  }
  const sign = SIGNS[`${tx},${ty}`];
  if (sign) await say(sign);
  const door = buildingDoorAt(tx, ty);
  if (door) await enterBuilding(door.kind);
}

/* ---------- Batalhas ---------- */

function pickEncounter(zone: Zone): { sp: number; lv: number } {
  const table = ENCOUNTERS[zone];
  let r = Math.random() * table.reduce((a, e) => a + e.peso, 0);
  for (const e of table) {
    r -= e.peso;
    if (r <= 0) return { sp: e.sp, lv: randInt(Math.random, e.min, e.max) };
  }
  const e = table[0];
  return { sp: e.sp, lv: e.min };
}

async function transition(): Promise<void> {
  game.scene = 'transition';
  for (let i = 0; i <= 12; i++) {
    game.transition = i / 12;
    await wait(28);
  }
  game.scene = 'battle';
}

async function wildBattle(zone: Zone): Promise<void> {
  const { sp, lv } = pickEncounter(zone);
  const enemy = toParty(createMonster(sp, lv));
  await battle([enemy], undefined, zone === 'monte');
}

async function trainerBattle(npc: Npc, spotted: boolean): Promise<void> {
  if (!npc.trainer) return;
  game.busy = true;
  if (spotted) {
    game.exclaim = { id: npc.id, until: performance.now() + 900 };
    await wait(900);
  }
  for (const line of npc.talk) await say(`${npc.name}: ${line}`);
  const team = npc.trainer.team.map(([sp, lv]) => toParty(createMonster(sp, lv)));
  const result = await battle(team, npc.name, npc.y <= 17);
  if (result === 'win') {
    const prize = npc.trainer.prize * team[team.length - 1].m.lv;
    game.room.dinheiro += prize;
    game.room.vencidos.push(npc.id);
    await say(`${npc.name}: ${npc.trainer.after}`);
    await say(`Você recebeu $${prize} pela vitória!`);
    if (npc.trainer.badge && !game.room.insignias.includes(npc.trainer.badge)) {
      game.room.insignias.push(npc.trainer.badge);
      await say(`Você conquistou a ${npc.trainer.badge}!`);
    }
  }
  game.busy = false;
}

async function battle(enemy: PartyMon[], trainer: string | undefined, snow: boolean): Promise<BattleResult> {
  game.busy = true;
  clearPresses();
  await transition();
  const levelsBefore = new Map(game.party.map((p) => [p.m.uid, p.m.lv]));
  const result = await runBattle({ party: game.party, bag: game.room.mochila, enemy, trainer, snow });
  game.results.push(result);
  game.scene = 'world';
  game.transition = 0;
  if (result === 'caught') await addCaught(enemy[0]);
  if (result === 'lose') await blackout();
  else await checkEvolutions(levelsBefore);
  saveRoom();
  game.busy = false;
  return result;
}

async function addCaught(p: PartyMon): Promise<void> {
  if (game.party.length < TEAM_MAX) game.party.push(p);
  else {
    game.box.unshift(p.m);
    await say(`${displayName(p.m)} foi enviado para a CAIXA.`);
  }
  await saveNow();
}

async function blackout(): Promise<void> {
  const lost = Math.floor(game.room.dinheiro / 2);
  game.room.dinheiro -= lost;
  await say(`Você perdeu $${lost} e correu de volta para o Centro de Cura...`);
  game.party.forEach(heal);
  Object.assign(game.player, { x: CENTRO_POS.x, y: CENTRO_POS.y, dir: CENTRO_POS.dir });
  await say('Seus MonKePos foram curados. Não desista!');
}

/** Evolui quem subiu de nível na batalha e já atingiu o nível de evolução (B cancela). */
async function checkEvolutions(levelsBefore: Map<string, number>): Promise<void> {
  let evolved = false;
  for (const p of game.party) {
    const before = levelsBefore.get(p.m.uid);
    if (before === undefined || p.m.lv === before) continue;
    const to = pendingEvolution(p.m);
    if (!to || game.declined.get(p.m.uid) === p.m.lv) continue;
    const ok = await evolutionScene(p, to);
    if (!ok) {
      game.declined.set(p.m.uid, p.m.lv);
      await say(`Hã? ${displayName(p.m)} parou de evoluir.`);
      continue;
    }
    const oldName = displayName(p.m);
    evolve(p, to);
    evolved = true;
    await say(`Parabéns! ${oldName} evoluiu para ${species(p.m).nome}!`);
    for (const [lv, move] of species(p.m).golpes) if (lv === p.m.lv) await offerMove(p, move);
  }
  if (evolved) await saveNow();
}

function evolutionScene(p: PartyMon, to: number): Promise<boolean> {
  const from = species(p.m);
  const target = getSpecies(to)!;
  const start = performance.now();
  void say(`O quê? ${displayName(p.m)} está evoluindo! (B cancela)`, { auto: 2400 });
  const DURATION = 3200;
  const timer = setTimeout(() => press('a'), DURATION);
  return custom(
    (t) => {
      const k = Math.min(1, (t - start) / DURATION);
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(0, 0, W, H - 88);
      const flick = Math.sin((t - start) / (200 - k * 160)) > 0;
      const img = image(`monstros/${(flick && k > 0.25 ? target : from).sprite}.png`);
      ctx.save();
      if (k > 0.15 && k < 0.92) ctx.filter = 'brightness(4)';
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, 64, 64, W / 2 - 64, 40, 128, 128);
      ctx.restore();
    },
    (b, close) => {
      if (b === 'b') {
        clearTimeout(timer);
        close(0);
      } else if (b === 'a' && performance.now() - start >= DURATION - 50) close(1);
    },
  ).then((v) => v === 1);
}

/* ---------- Prédios ---------- */

async function enterBuilding(kind: 'centro' | 'loja' | 'casa'): Promise<void> {
  game.busy = true;
  if (kind === 'centro') await centro();
  else if (kind === 'loja') await loja();
  else await say('A porta está trancada. Parece que não tem ninguém em casa.');
  saveRoom();
  game.busy = false;
}

async function centro(): Promise<void> {
  await say('Bem-vindo ao Centro de Cura!');
  for (;;) {
    const pick = await choose(['CURAR', 'CAIXA', 'SAIR'], { w: 140, hint: () => 'O que você quer fazer?' });
    if (pick === 0) {
      game.party.forEach(heal);
      await say('Vou cuidar dos seus MonKePos... Prontinho! Estão todos curados.');
      const r = await saveNow();
      if (r) await say('Seus MonKePos foram salvos na sua conta.');
    } else if (pick === 1) await caixa();
    else return void (await say('Volte sempre!'));
  }
}

/** Caixa: guardar e retirar MonKePos (o time precisa de pelo menos 1). */
async function caixa(): Promise<void> {
  for (;;) {
    const pick = await choose(['GUARDAR', 'RETIRAR', 'SAIR'], { w: 150, hint: () => `Caixa: ${game.box.length} MonKePo(s) guardado(s).` });
    if (pick === 0) {
      if (game.party.length <= 1) {
        await say('Você precisa ficar com pelo menos um MonKePo!');
        continue;
      }
      const i = await chooseParty(game.party, 'Guardar qual?');
      if (i < 0) continue;
      const [p] = game.party.splice(i, 1);
      heal(p);
      game.box.unshift(p.m);
      await say(`${displayName(p.m)} foi guardado na CAIXA.`);
    } else if (pick === 1) {
      if (game.box.length === 0) {
        await say('A CAIXA está vazia.');
        continue;
      }
      if (game.party.length >= TEAM_MAX) {
        await say('Seu time já tem 6 MonKePos.');
        continue;
      }
      const i = await choose(
        game.box.slice(0, 30).map((m) => `${displayName(m)}  Nv${m.lv}`),
        { w: 300, title: 'CAIXA', y: 6 },
      );
      if (i < 0) continue;
      const [m] = game.box.splice(i, 1);
      game.party.push(toParty(m));
      await say(`${displayName(m)} entrou no time!`);
    } else {
      await saveNow();
      return;
    }
  }
}

async function loja(): Promise<void> {
  await say('Olá! Posso ajudar?');
  for (;;) {
    const pick = await choose([...ITEMS.map((i) => `${i.nome}`.padEnd(12) + `  $${i.preco}`), 'SAIR'], {
      w: 280, y: 4, lineH: 24, title: `Dinheiro: ${game.room.dinheiro}`, hint: (i) => ITEMS[i]?.descricao ?? 'Até logo!',
    });
    if (pick < 0 || pick >= ITEMS.length) return void (await say('Volte sempre!'));
    const item = ITEMS[pick];
    const qty = [1, 5, 10];
    const q = await choose(qty.map((n) => `x${n}  $${n * item.preco}`), { w: 170, hint: () => `Quantas ${item.nome}?` });
    if (q < 0) continue;
    const cost = qty[q] * item.preco;
    if (cost > game.room.dinheiro) {
      await say('Você não tem dinheiro suficiente.');
      continue;
    }
    game.room.dinheiro -= cost;
    game.room.mochila[item.id] = (game.room.mochila[item.id] ?? 0) + qty[q];
    await say(`Aqui está! ${qty[q]}x ${item.nome}. Obrigado!`);
  }
}

/* ---------- Menu ---------- */

async function startMenu(): Promise<void> {
  game.busy = true;
  for (;;) {
    const pick = await choose(['MONKEPOS', 'MOCHILA', 'RANKING', 'SALVAR', 'CARTÃO', 'NOVA SALA', 'SAIR'], { x: W - 170, y: 6, w: 164 });
    if (pick === 0) await partyMenu();
    else if (pick === 1) await bagMenu();
    else if (pick === 2) await showRanking();
    else if (pick === 3) {
      const r = await saveNow();
      await say(r === null ? 'Nada novo para salvar. Seus MonKePos já estão na conta.' : r?.ok ? 'Seus MonKePos foram salvos na sua conta!' : `Não foi possível salvar: ${r?.erro ?? 'sem conexão'}`);
    } else if (pick === 4) await say(`Treinador ${game.user.toUpperCase()}  •  $${game.room.dinheiro}  •  Insígnias: ${game.room.insignias.length ? game.room.insignias.join(', ') : 'nenhuma'}`);
    else if (pick === 5) {
      if (await confirm('Começar uma sala nova? Dinheiro, itens e posição voltam ao kit inicial. Seus MonKePos continuam.')) {
        game.room = newRoom();
        game.party.forEach(heal);
        Object.assign(game.player, { x: START_POS.x, y: START_POS.y, dir: START_POS.dir });
        saveRoom();
        await say('Sala nova! Você recebeu o kit: $3000, 5 MonBolas e 3 Poções.');
        break;
      }
    } else if (pick === 6) {
      if (await confirm('Salvar e sair da conta?')) {
        await saveNow();
        saveRoom();
        await sair();
        location.reload();
        return;
      }
    } else break;
  }
  game.busy = false;
}

async function partyMenu(): Promise<void> {
  let start = 0;
  for (;;) {
    const i = await chooseParty(game.party, 'Escolha um MonKePo.', start);
    if (i < 0) return;
    start = i;
    const opt = await choose(['RESUMO', 'TROCAR ORDEM', 'CANCELAR'], { w: 190 });
    if (opt === 0) await showSummary(game.party[i]);
    else if (opt === 1) {
      const j = await chooseParty(game.party, `Trocar ${displayName(game.party[i].m)} com quem?`, i);
      if (j >= 0 && j !== i) [game.party[i], game.party[j]] = [game.party[j], game.party[i]];
    }
  }
}

async function bagMenu(): Promise<void> {
  for (;;) {
    const items = ITEMS.filter((it) => (game.room.mochila[it.id] ?? 0) > 0);
    if (items.length === 0) return void (await say('A mochila está vazia.'));
    const pick = await choose(items.map((it) => `${it.nome}  x${game.room.mochila[it.id]}`), { w: 260, y: 6, title: `MOCHILA  $${game.room.dinheiro}`, hint: (i) => items[i]?.descricao });
    if (pick < 0) return;
    const item = getItem(items[pick].id)!;
    if (item.bola) {
      await say('Só dá para usar em batalha.');
      continue;
    }
    const t = await chooseParty(game.party, `Usar ${item.nome} em quem?`);
    if (t < 0) continue;
    const p = game.party[t];
    if (p.hp <= 0 || (item.cura && p.hp >= maxHp(p.m) && !(item.curaStatus && p.status)) || (item.curaStatus && !item.cura && !p.status)) {
      await say('Não vai fazer efeito.');
      continue;
    }
    if (item.cura) p.hp = Math.min(maxHp(p.m), p.hp + item.cura);
    if (item.curaStatus) p.status = null;
    game.room.mochila[item.id]--;
    await say(`${displayName(p.m)} foi tratado com ${item.nome}.`);
  }
}

async function showRanking(): Promise<void> {
  void say('Buscando o ranking...', { auto: 400 });
  const r = await ranking();
  const list = (r.ok ? (r.ranking as { usuario: string; poder: number; monstro: string }[]) : []) ?? [];
  await custom(
    () => {
      ctx.fillStyle = '#20304a';
      ctx.fillRect(0, 0, W, H);
      text('RANKING — MELHOR MONKEPO', W / 2, 32, { size: 18, color: '#f8d030', align: 'center', shadow: '#000' });
      if (!r.ok) text(`Não foi possível carregar: ${r.erro}`, W / 2, 80, { size: 14, color: '#fff', align: 'center' });
      list.slice(0, 10).forEach((e, i) => {
        const y = 66 + i * 24;
        const me = e.usuario === game.user;
        text(`${i + 1}.`, 30, y, { size: 15, color: me ? '#f8d030' : '#fff', shadow: '' });
        text(e.usuario, 62, y, { size: 15, color: me ? '#f8d030' : '#fff', shadow: '' });
        text(e.monstro, 250, y, { size: 14, color: '#a8c8f0', shadow: '' });
        text(String(e.poder), 450, y, { size: 15, color: me ? '#f8d030' : '#fff', align: 'right', shadow: '' });
      });
      text('Poder = soma dos atributos do seu melhor MonKePo.  A/B fecha.', W / 2, H - 12, { size: 12, color: '#8aa', align: 'center', shadow: '' });
    },
    (b, close) => {
      if (b === 'a' || b === 'b') close(0);
    },
  );
}

/** Salva na conta agora (só se mudou algo). */
export async function saveNow(): Promise<{ ok: boolean; erro?: string } | null> {
  saveRoom();
  toast('Salvando...');
  const r = await game.saver.save();
  if (r?.ok) toast('MonKePos salvos ✔');
  else if (r === null) game.toast = null;
  return r;
}

/* ---------- Desenho do mapa ---------- */

export function drawWorld(now: number): void {
  const pl = game.player;
  let px = pl.x * T;
  let py = pl.y * T;
  if (pl.moving) {
    const k = Math.min(1, (now - pl.moving.t) / pl.moving.dur);
    px = (pl.moving.fx + (pl.x - pl.moving.fx) * k) * T;
    py = (pl.moving.fy + (pl.y - pl.moving.fy) * k) * T;
  }
  const camX = Math.max(0, Math.min(MAP_W * T - W, px - W / 2 + T / 2));
  const camY = Math.max(0, Math.min(MAP_H * T - H, py - H / 2 + T / 2));
  ctx.drawImage(mapCanvas, camX, camY, W, H, 0, 0, W, H);
  drawWaterAnim(camX, camY, now);

  const walking = pl.moving ? Math.floor((now - pl.moving.t) / (pl.moving.dur / 2)) + pl.frame * 2 : 0;
  const actors: { y: number; draw: () => void }[] = NPCS.filter((n) => Math.abs(n.x * T - camX - W / 2) < W && Math.abs(n.y * T - camY - H / 2) < H).map((n) => ({
    y: n.y * T,
    draw: () => drawCharacter(n.x * T - camX, n.y * T - camY - 6, n.dir, 0, n.colors, game.exclaim?.id === n.id && now < game.exclaim.until ? '!' : undefined),
  }));
  actors.push({ y: py, draw: () => drawCharacter(px - camX, py - camY - 6, pl.dir, pl.moving ? walking : 0, ['#382418', '#d83838', '#384878']) });
  actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
  // Grama alta cobre os pés.
  const ch = grid[pl.y]?.[pl.x];
  if ((ch === ',' || ch === ';') && !pl.moving) {
    ctx.fillStyle = ch === ',' ? '#2e8a3a' : '#5a9ab8';
    ctx.fillRect(px - camX + 4, py - camY + 20, 24, 6);
  }

  // Dinheiro e salvamento
  if (game.toast && now < game.toast.until) {
    box(W - 230, 6, 224, 40);
    text(game.toast.text, W - 118, 32, { size: 13, align: 'center' });
  }
}

export function drawTransition(): void {
  const k = game.transition;
  ctx.fillStyle = '#101018';
  const bars = 8;
  for (let i = 0; i < bars; i++) {
    const h = H / bars;
    const w = W * k;
    ctx.fillRect(i % 2 ? W - w : 0, i * h, w, h);
  }
}

/** Primeiro acesso: escolha do inicial (salvo na conta na hora). */
export async function chooseStarter(): Promise<Monster> {
  const starters = [1, 4, 7];
  let cursor = 0;
  await say('Bem-vindo ao mundo dos MonKePos! Escolha seu primeiro parceiro.');
  for (;;) {
    const pick = await custom(
      (t) => {
        ctx.fillStyle = '#e8f0f8';
        ctx.fillRect(0, 0, W, H);
        text('ESCOLHA SEU INICIAL', W / 2, 36, { size: 20, color: '#305080', align: 'center' });
        starters.forEach((sp, i) => {
          const s = getSpecies(sp)!;
          const x = 30 + i * 150;
          box(x, 56, 140, 170, i === cursor ? '#fff8d0' : '#ffffff', i === cursor ? '#e07030' : '#4a6a9a');
          const m = createMonster(sp, 5, () => 0.5);
          monIcon(m, x + 22, 70, i === cursor ? t : 0, 96);
          text(s.nome, x + 70, 190, { size: 17, align: 'center' });
          text(s.tipos.join('/'), x + 70, 212, { size: 13, color: '#607080', align: 'center' });
        });
        box(0, H - 88, W, 88);
        text('◀ ▶ escolhe   •   A confirma', 22, H - 40, { size: 16 });
      },
      (b, close) => {
        if (b === 'left') cursor = (cursor + 2) % 3;
        else if (b === 'right') cursor = (cursor + 1) % 3;
        else if (b === 'a') close(cursor);
      },
    );
    const s = getSpecies(starters[pick])!;
    if (await confirm(`Você escolhe ${s.nome}, do tipo ${s.tipos.join('/')}?`)) {
      const m = createMonster(s.id, 5);
      await say(`${s.nome} agora é seu parceiro! Cuide bem dele.`);
      return m;
    }
  }
}
