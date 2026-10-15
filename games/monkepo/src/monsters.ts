// Monstros em jogo: criação, experiência, golpes novos e evolução.

import { expForLevel, getMove, getSpecies, type Species, type Status } from '../shared/data';
import { MAX_EV, MAX_EV_TOTAL, MAX_LEVEL, statsOf, type Monster } from '../shared/monster';

/** Monstro no time durante a sessão: PS, PP e status ficam só na sala. */
export interface PartyMon {
  m: Monster;
  hp: number;
  pp: number[];
  status: Status | null;
}

export type Rng = () => number;
export const randInt = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

export const species = (m: Monster): Species => getSpecies(m.sp)!;
export const displayName = (m: Monster): string => m.nick || species(m).nome;
export const maxHp = (m: Monster): number => statsOf(m)[0];

export function newUid(rng: Rng = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(rng() * 36)];
  return s;
}

/** Os 4 últimos golpes aprendidos até o nível (como um selvagem da 3ª geração). */
export function defaultMoves(sp: number, lv: number): number[] {
  const s = getSpecies(sp)!;
  const list: number[] = [];
  for (const [level, move] of s.golpes) {
    if (level > lv || list.includes(move)) continue;
    list.push(move);
  }
  return list.slice(-4);
}

export function createMonster(sp: number, lv: number, rng: Rng = Math.random): Monster {
  const s = getSpecies(sp)!;
  return {
    uid: newUid(rng),
    sp,
    lv,
    xp: expForLevel(s.crescimento, lv),
    pid: Math.floor(rng() * 0x100000000) >>> 0,
    ivs: Array.from({ length: 6 }, () => randInt(rng, 0, 31)),
    evs: [0, 0, 0, 0, 0, 0],
    moves: defaultMoves(sp, lv),
  };
}

export function toParty(m: Monster): PartyMon {
  return { m, hp: maxHp(m), pp: m.moves.map((id) => getMove(id)!.pp), status: null };
}

export function heal(p: PartyMon): void {
  p.hp = maxHp(p.m);
  p.pp = p.m.moves.map((id) => getMove(id)!.pp);
  p.status = null;
}

/** Experiência da 3ª geração ao derrotar `defeated` (dividida entre quem lutou). */
export function expYield(defeated: Monster, trainer: boolean, participants: number): number {
  const base = Math.floor((species(defeated).expBase * defeated.lv) / 7);
  return Math.max(1, Math.floor((trainer ? Math.floor(base * 1.5) : base) / Math.max(1, participants)));
}

/** EVs ganhos ao derrotar `defeated`, respeitando 255 por atributo e 510 no total. */
export function gainEvs(p: PartyMon, defeated: Monster): void {
  const yieldEv = species(defeated).ev;
  for (let i = 0; i < 6; i++) {
    const total = p.m.evs.reduce((a, b) => a + b, 0);
    const add = Math.min(yieldEv[i], MAX_EV - p.m.evs[i], MAX_EV_TOTAL - total);
    if (add > 0) p.m.evs[i] += add;
  }
}

export interface LevelUp {
  level: number;
  newMoves: number[]; // golpes que a espécie aprende neste nível
}

/** Soma experiência; devolve cada nível novo (o PS sobe junto, mantendo o dano levado). */
export function addExp(p: PartyMon, amount: number): LevelUp[] {
  const s = species(p.m);
  const ups: LevelUp[] = [];
  p.m.xp = Math.min(p.m.xp + amount, expForLevel(s.crescimento, MAX_LEVEL));
  while (p.m.lv < MAX_LEVEL && p.m.xp >= expForLevel(s.crescimento, p.m.lv + 1)) {
    const before = maxHp(p.m);
    p.m.lv++;
    if (p.hp > 0) p.hp += maxHp(p.m) - before;
    ups.push({ level: p.m.lv, newMoves: s.golpes.filter(([lv, id]) => lv === p.m.lv && !p.m.moves.includes(id)).map(([, id]) => id) });
  }
  return ups;
}

/** Aprende um golpe; se já tem 4, troca o da posição `replace`. */
export function learnMove(p: PartyMon, move: number, replace?: number): void {
  const pp = getMove(move)!.pp;
  if (p.m.moves.length < 4) {
    p.m.moves.push(move);
    p.pp.push(pp);
  } else if (replace !== undefined) {
    p.m.moves[replace] = move;
    p.pp[replace] = pp;
  }
}

/** Espécie para a qual evolui agora, se o nível já permite. */
export function pendingEvolution(m: Monster): number | null {
  const evo = species(m).evolui;
  return evo && m.lv >= evo.nivel ? evo.para : null;
}

export function evolve(p: PartyMon, to: number): void {
  const before = maxHp(p.m);
  p.m.sp = to;
  if (p.hp > 0) p.hp += maxHp(p.m) - before;
}

/** Experiência que falta para o próximo nível, em 0..1 (barra azul). */
export function expProgress(m: Monster): number {
  const s = species(m);
  if (m.lv >= MAX_LEVEL) return 1;
  const a = expForLevel(s.crescimento, m.lv);
  const b = expForLevel(s.crescimento, m.lv + 1);
  return (m.xp - a) / (b - a);
}
