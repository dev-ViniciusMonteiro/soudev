// Tela de batalha: desenho, menus e sequência de eventos do motor.

import { getMove, getSpecies, PHYSICAL_TYPES, ITEMS } from '../shared/data';
import { Battle, makeSide, type Action, type BattleEvent } from './battle';
import { H, W, box, choose, ctx, image, say, text, wait } from './engine';
import { addExp, displayName, expProgress, expYield, gainEvs, learnMove, maxHp, species, type PartyMon } from './monsters';
import { chooseParty } from './party';

export interface BattleContext {
  party: PartyMon[];
  bag: Record<string, number>;
  enemy: PartyMon[];
  trainer?: string; // nome do treinador; vazio = selvagem
  snow: boolean;
}

export type BattleResult = 'win' | 'lose' | 'run' | 'caught';

interface View {
  hp: [number, number]; // PS mostrados (animam até o real)
  visible: [boolean, boolean];
  offset: [number, number]; // deslocamento horizontal (ataque/entrada)
  drop: [number, number]; // desmaio
  flash: [number, number];
  ball: { shakes: number; t: number } | null;
}

let current: { b: Battle; view: View; ctx: BattleContext } | null = null;
export const inBattle = (): boolean => current !== null;
export const currentBattle = (): Battle | null => current?.b ?? null;

/* ---------- Desenho ---------- */

const spriteOf = (p: PartyMon): HTMLImageElement => image(`monstros/${species(p.m).sprite}.png`);

function hpColor(ratio: number): string {
  return ratio > 0.5 ? '#48c050' : ratio > 0.2 ? '#f0c020' : '#e04030';
}

function hpBar(x: number, y: number, w: number, hp: number, max: number): void {
  ctx.fillStyle = '#404850';
  ctx.fillRect(x - 30, y - 2, w + 34, 12);
  text('PS', x - 26, y + 9, { size: 11, color: '#f8d030', shadow: '' });
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x, y, w, 8);
  const r = Math.max(0, hp / max);
  ctx.fillStyle = hpColor(r);
  ctx.fillRect(x, y, Math.ceil(w * r), 8);
}

function statusTag(p: PartyMon, x: number, y: number): void {
  if (!p.status) return;
  const tags = { queimado: ['QUE', '#e06030'], envenenado: ['ENV', '#a040a0'], paralisado: ['PAR', '#d0b020'], dormindo: ['DOR', '#8888a0'], congelado: ['CON', '#60b0e0'] } as const;
  const [label, color] = tags[p.status];
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 12, 34, 14);
  text(label, x + 17, y - 1, { size: 11, color: '#fff', align: 'center', shadow: '' });
}

function genderMark(p: PartyMon): string {
  const s = getSpecies(p.m.sp)!;
  if (s.femea < 0) return '';
  return (p.m.pid & 0xff) < s.femea ? ' ♀' : ' ♂';
}

export function drawBattle(t: number): void {
  if (!current) return;
  const { b, view, ctx: bc } = current;
  // Fundo
  const g = ctx.createLinearGradient(0, 0, 0, H - 88);
  g.addColorStop(0, bc.snow ? '#d8eef8' : '#f0f8e0');
  g.addColorStop(1, bc.snow ? '#a8d0e8' : '#b8e0a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H - 88);
  const plat = (x: number, y: number, rx: number): void => {
    ctx.fillStyle = bc.snow ? '#e8f4fa' : '#a8d088';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bc.snow ? '#c0dcea' : '#88b868';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, rx * 0.9, rx * 0.2, 0, 0, Math.PI);
    ctx.fill();
  };
  plat(360, 124, 92);
  plat(130, 226, 110);

  const enemy = b.mon(1);
  const me = b.mon(0);
  // Inimigo (frente)
  if (view.visible[1]) {
    const img = spriteOf(enemy);
    ctx.save();
    if (view.flash[1] > 0 && Math.floor(t / 60) % 2 === 0) ctx.globalAlpha = 0.25;
    if (view.ball) {
      // Dentro da bola: desenha a bola balançando.
      const shake = Math.sin((t - view.ball.t) / 90) * (view.ball.shakes > 0 ? 6 : 0);
      ctx.translate(360 + shake, 108);
      ctx.fillStyle = '#e03838';
      ctx.beginPath();
      ctx.arc(0, 0, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f8f8f8';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#303030';
      ctx.fillRect(-14, -2, 28, 4);
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8f8f8';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (img.complete && img.naturalWidth) {
      const h = 128 * (1 - view.drop[1]);
      ctx.drawImage(img, 0, 0, 64, 64 * (1 - view.drop[1]), 296 + view.offset[1], 128 - h, 128, h);
    }
    ctx.restore();
  }
  // Jogador (costas)
  if (view.visible[0]) {
    const img = spriteOf(me);
    ctx.save();
    if (view.flash[0] > 0 && Math.floor(t / 60) % 2 === 0) ctx.globalAlpha = 0.25;
    if (img.complete && img.naturalWidth) {
      const h = 128 * (1 - view.drop[0]);
      ctx.drawImage(img, 64, 0, 64, 64 * (1 - view.drop[0]), 66 + view.offset[0], 232 - h, 128, h);
    }
    ctx.restore();
  }

  // Caixa do inimigo
  box(14, 12, 230, 62);
  text(`${displayName(enemy.m)}${genderMark(enemy)}`, 28, 40, { size: 16 });
  text(`Nv${enemy.m.lv}`, 230, 40, { size: 14, align: 'right' });
  hpBar(78, 50, 150, view.hp[1], maxHp(enemy.m));
  statusTag(enemy, 186, 26);
  if (b.wild && bc.party.some((p) => p.m.sp === enemy.m.sp)) {
    ctx.fillStyle = '#e03838';
    ctx.beginPath();
    ctx.arc(22, 28, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Caixa do jogador
  box(240, 140, 230, 86);
  text(`${displayName(me.m)}${genderMark(me)}`, 254, 168, { size: 16 });
  text(`Nv${me.m.lv}`, 456, 168, { size: 14, align: 'right' });
  hpBar(304, 178, 150, view.hp[0], maxHp(me.m));
  text(`${Math.max(0, Math.round(view.hp[0]))}/${maxHp(me.m)}`, 454, 204, { size: 14, align: 'right' });
  statusTag(me, 254, 204);
  ctx.fillStyle = '#404850';
  ctx.fillRect(272, 210, 186, 6);
  ctx.fillStyle = '#48a0f0';
  ctx.fillRect(274, 211, Math.floor(182 * expProgress(me.m)), 4);

  // Faixa de baixo (o texto/menus aparecem por cima)
  box(0, H - 88, W, 88, '#f8f8f8', '#7a5a9a');
}

/* ---------- Animações ---------- */

async function animateHp(side: 0 | 1, target: number): Promise<void> {
  if (!current) return;
  const view = current.view;
  const start = view.hp[side];
  const steps = Math.min(30, Math.max(6, Math.abs(start - target)));
  for (let i = 1; i <= steps; i++) {
    view.hp[side] = start + ((target - start) * i) / steps;
    await wait(16);
  }
  view.hp[side] = target;
}

async function animateAttack(side: 0 | 1): Promise<void> {
  if (!current) return;
  const v = current.view;
  const dir = side === 0 ? 1 : -1;
  for (const o of [10, 20, 10, 0]) {
    v.offset[side] = o * dir;
    await wait(30);
  }
  const other = (1 - side) as 0 | 1;
  v.flash[other] = 1;
  await wait(360);
  v.flash[other] = 0;
}

async function play(events: BattleEvent[]): Promise<void> {
  if (!current) return;
  const v = current.view;
  for (const e of events) {
    if (e.t === 'msg') await say(e.text, { auto: 650 });
    else if (e.t === 'attack') await animateAttack(e.side);
    else if (e.t === 'hp') await animateHp(e.side, e.hp);
    else if (e.t === 'faint') {
      for (let i = 1; i <= 10; i++) {
        v.drop[e.side] = i / 10;
        await wait(25);
      }
      v.visible[e.side] = false;
    } else if (e.t === 'switch') {
      v.visible[e.side] = true;
      v.drop[e.side] = 0;
      v.hp[e.side] = current.b.mon(e.side).hp;
    } else if (e.t === 'ball') {
      v.ball = { shakes: 0, t: performance.now() };
      await wait(500);
      for (let i = 0; i < e.shakes; i++) {
        v.ball = { shakes: 1, t: performance.now() };
        await wait(600);
        v.ball = { shakes: 0, t: performance.now() };
        await wait(250);
      }
      if (!e.caught) v.ball = null;
    }
  }
}

/* ---------- Escolhas do jogador ---------- */

function moveHint(p: PartyMon, i: number): string | undefined {
  const mv = getMove(p.m.moves[i]);
  if (!mv) return undefined;
  const kind = mv.poder === 0 ? 'Status' : PHYSICAL_TYPES.includes(mv.tipo) ? 'Físico' : 'Especial';
  return `PP ${p.pp[i]}/${mv.pp}
TIPO/${mv.tipo.toUpperCase()}
${kind}${mv.poder > 1 ? ` • Poder ${mv.poder}` : ''}`;
}

async function chooseAction(b: Battle, bc: BattleContext): Promise<Action | null> {
  const me = b.mon(0);
  for (;;) {
    const top = await choose(['LUTAR', 'MOCHILA', 'MONKEPO', 'FUGIR'], {
      x: W - 250, y: H - 88, w: 250, columns: 2, cancel: false,
      hint: () => `O que ${displayName(me.m)} vai fazer?`,
    });
    if (top === 0) {
      if (me.pp.every((pp) => pp <= 0)) return { kind: 'move', index: -1 };
      const names = me.m.moves.map((id) => getMove(id)!.nome);
      const pick = await choose(names, {
        x: 0, y: H - 88, w: 320, h: 88, columns: 2, lineH: 28,
        disabled: me.pp.map((pp) => pp <= 0),
        hint: (i) => moveHint(me, i),
        hintArea: [320, H - 88, W - 320, 88],
      });
      if (pick >= 0) return { kind: 'move', index: pick };
    } else if (top === 1) {
      const items = ITEMS.filter((it) => (bc.bag[it.id] ?? 0) > 0);
      if (items.length === 0) {
        await say('A mochila está vazia.');
        continue;
      }
      const pick = await choose(items.map((it) => `${it.nome}  x${bc.bag[it.id]}`), {
        w: 260, title: 'MOCHILA', hint: (i) => items[i]?.descricao,
      });
      if (pick < 0) continue;
      const item = items[pick];
      if (item.bola) {
        if (!b.wild) {
          await say('Não dá para capturar o MonKePo de um treinador!');
          continue;
        }
        bc.bag[item.id]--;
        return { kind: 'ball', item: item.id };
      }
      const target = await chooseParty(bc.party, `Usar ${item.nome} em quem?`);
      if (target < 0) continue;
      const tp = bc.party[target];
      const useless = tp.hp <= 0 || (item.cura && !item.curaStatus && tp.hp >= maxHp(tp.m)) || (item.curaStatus && !item.cura && !tp.status);
      if (useless) {
        await say('Não vai fazer efeito.');
        continue;
      }
      bc.bag[item.id]--;
      return { kind: 'item', item: item.id, target };
    } else if (top === 2) {
      const pick = await chooseParty(bc.party, 'Escolha um MonKePo.');
      if (pick < 0) continue;
      if (pick === b.sides[0].active) {
        await say(`${displayName(me.m)} já está lutando!`);
        continue;
      }
      if (bc.party[pick].hp <= 0) {
        await say('Esse MonKePo não tem energia para lutar!');
        continue;
      }
      return { kind: 'switch', to: pick };
    } else if (top === 3) return { kind: 'run' };
  }
}

/** Escolhe quem entra depois de um desmaio. */
async function forcedSwitch(b: Battle, bc: BattleContext): Promise<void> {
  for (;;) {
    const pick = await chooseParty(bc.party, 'Quem vai entrar agora?', Math.max(0, bc.party.findIndex((p) => p.hp > 0)));
    if (pick >= 0 && bc.party[pick].hp > 0) {
      await play(b.playerReplace(pick));
      return;
    }
    await say('Escolha um MonKePo que ainda pode lutar.');
  }
}

/** Experiência e EVs para quem lutou contra o MonKePo derrotado; aprende golpes novos. */
async function awardExp(b: Battle, bc: BattleContext): Promise<void> {
  const defeated = b.mon(1).m;
  const ids = [...b.sides[0].participants].filter((i) => bc.party[i]?.hp > 0);
  for (const i of ids) {
    const p = bc.party[i];
    const amount = expYield(defeated, !b.wild, ids.length);
    gainEvs(p, defeated);
    await say(`${displayName(p.m)} ganhou ${amount} pontos de experiência!`, { auto: 700 });
    const ups = addExp(p, amount);
    if (i === b.sides[0].active && current) current.view.hp[0] = p.hp;
    for (const up of ups) {
      await say(`${displayName(p.m)} subiu para o nível ${up.level}!`);
      for (const move of up.newMoves) await offerMove(p, move);
    }
  }
}

export async function offerMove(p: PartyMon, move: number): Promise<void> {
  const mv = getMove(move)!;
  const name = displayName(p.m);
  if (p.m.moves.includes(move)) return;
  if (p.m.moves.length < 4) {
    learnMove(p, move);
    await say(`${name} aprendeu ${mv.nome}!`);
    return;
  }
  await say(`${name} quer aprender ${mv.nome}, mas já sabe 4 golpes.`);
  for (;;) {
    const forget = await choose([...p.m.moves.map((id) => getMove(id)!.nome), `Não aprender`], {
      w: 260, title: 'Esquecer qual golpe?',
      hint: (i) => (i < 4 ? moveHint(p, i) : `Não aprender ${mv.nome}.`),
    });
    if (forget >= 0 && forget < 4) {
      const old = getMove(p.m.moves[forget])!.nome;
      learnMove(p, move, forget);
      await say(`1, 2 e... Pronto! ${name} esqueceu ${old} e aprendeu ${mv.nome}!`);
      return;
    }
    await say(`${name} não aprendeu ${mv.nome}.`);
    return;
  }
}

/* ---------- Batalha completa ---------- */

export async function runBattle(bc: BattleContext): Promise<BattleResult> {
  const b = new Battle(makeSide(bc.party), makeSide(bc.enemy, bc.trainer ?? ''));
  const view: View = { hp: [b.mon(0).hp, b.mon(1).hp], visible: [false, true], offset: [0, 0], drop: [0, 0], flash: [0, 0], ball: null };
  current = { b, view, ctx: bc };
  try {
    if (b.wild) await say(`Um ${displayName(b.mon(1).m)} selvagem apareceu!`);
    else {
      await say(`${bc.trainer} quer batalhar!`);
      await say(`${bc.trainer} mandou ${displayName(b.mon(1).m)}!`, { auto: 600 });
    }
    view.visible[0] = true;
    await say(`Vai, ${displayName(b.mon(0).m)}!`, { auto: 500 });

    for (;;) {
      const action = await chooseAction(b, bc);
      if (!action) continue;
      const events = b.turn(action);
      await play(events);
      const enemyDown = events.some((e) => e.t === 'faint' && e.side === 1);
      if (enemyDown) await awardExp(b, bc);
      if (b.over && b.over.t === 'end') return b.over.result;
      if (b.mon(1).hp <= 0) await play(b.enemyNext());
      if (b.mon(0).hp <= 0) await forcedSwitch(b, bc);
    }
  } finally {
    current = null;
  }
}
