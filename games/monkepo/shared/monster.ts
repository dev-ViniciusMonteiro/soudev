// Formato compacto dos MonKePos salvos na planilha, fórmulas de atributos e validação.
// Só os monstros são salvos; o resto (mochila, dinheiro, posição) fica na sala de quem hospeda.

import { SPECIES, STARTERS, evolvesInto, expForLevel, getMove, getSpecies, natureMultipliers } from './data';

export const MAX_MONSTERS = 240; // 6 no time + caixas
export const MAX_LEVEL = 100;
export const MAX_WILD_LEVEL = 60; // nível máximo de um monstro recém-capturado
export const MAX_EV = 255;
export const MAX_EV_TOTAL = 510;
export const MAX_SAVE_CHARS = 30000;
const NICK_RE = /^[\p{L}\p{N} ]{1,12}$/u;
const UID_RE = /^[0-9a-z]{8}$/;

export interface Monster {
  uid: string; // identificador único do monstro
  sp: number; // espécie
  lv: number;
  xp: number;
  pid: number; // personalidade (32 bits): natureza, gênero, habilidade e brilhante
  ivs: number[]; // 6 valores 0..31
  evs: number[]; // 6 valores 0..255, total até 510
  moves: number[]; // 1 a 4 golpes
  nick?: string;
}

/* ---------- Codificação: uid.esp.nv.xp.pid.ivs.evs.golpes[.apelido], separados por vírgula ---------- */

const b36 = (n: number): string => n.toString(36);
const fromB36 = (s: string): number => (/^[0-9a-z]+$/.test(s) ? parseInt(s, 36) : NaN);

export function encodeMonster(m: Monster): string {
  const ivBits = m.ivs.reduce((acc, iv, i) => acc + iv * 2 ** (5 * i), 0);
  const evs = m.evs.every((e) => e === 0) ? '0' : m.evs.map((e) => e.toString(16).padStart(2, '0')).join('');
  const parts = [m.uid, b36(m.sp), b36(m.lv), b36(m.xp), b36(m.pid >>> 0), b36(ivBits), evs, m.moves.map(b36).join('-')];
  if (m.nick) parts.push(m.nick);
  return parts.join('.');
}

export function decodeMonster(s: string): Monster | null {
  const p = s.split('.');
  if (p.length < 8 || p.length > 9) return null;
  const [uid, sp, lv, xp, pid, ivs, evs, moves, nick] = p;
  const ivBits = fromB36(ivs);
  let evList: number[];
  if (evs === '0') evList = [0, 0, 0, 0, 0, 0];
  else if (/^[0-9a-f]{12}$/.test(evs)) evList = Array.from({ length: 6 }, (_, i) => parseInt(evs.slice(i * 2, i * 2 + 2), 16));
  else return null;
  const m: Monster = {
    uid,
    sp: fromB36(sp),
    lv: fromB36(lv),
    xp: fromB36(xp),
    pid: fromB36(pid),
    ivs: Array.from({ length: 6 }, (_, i) => Math.floor(ivBits / 2 ** (5 * i)) % 32),
    evs: evList,
    moves: moves.split('-').map(fromB36),
  };
  if (nick !== undefined) m.nick = nick;
  if (!Number.isFinite(ivBits) || ivBits >= 2 ** 30) return null;
  return m;
}

export const encodeMonsters = (list: Monster[]): string => list.map(encodeMonster).join(',');

export function decodeMonsters(s: string): Monster[] | null {
  if (s === '') return [];
  const list: Monster[] = [];
  for (const part of s.split(',')) {
    const m = decodeMonster(part);
    if (!m) return null;
    list.push(m);
  }
  return list;
}

/* ---------- Mecânicas derivadas da personalidade (igual à 3ª geração) ---------- */

export const natureOf = (m: Monster): number => (m.pid >>> 0) % 25;
export const abilitySlot = (m: Monster): number => m.pid & 1;
export const isShiny = (m: Monster): boolean => (((m.pid >>> 16) ^ (m.pid & 0xffff)) & 0xffff) < 8;
export function genderOf(m: Monster): 'M' | 'F' | '-' {
  const s = getSpecies(m.sp);
  if (!s || s.femea < 0) return '-';
  return (m.pid & 0xff) < s.femea ? 'F' : 'M';
}

/** Atributos pela fórmula da 3ª geração. */
export function statsOf(m: Monster): number[] {
  const s = getSpecies(m.sp);
  if (!s) return [0, 0, 0, 0, 0, 0];
  const mult = natureMultipliers(natureOf(m));
  return s.base.map((b, i) => {
    const core = Math.floor(((2 * b + m.ivs[i] + Math.floor(m.evs[i] / 4)) * m.lv) / 100);
    return i === 0 ? core + m.lv + 10 : Math.floor((core + 5) * mult[i]);
  });
}

/** Poder usado no ranking: soma dos atributos reais. */
export const powerOf = (m: Monster): number => statsOf(m).reduce((a, b) => a + b, 0);

/** Golpes que a espécie (ou as formas anteriores) aprende até o nível. */
export function learnableMoves(sp: number, lv: number): Set<number> {
  const allowed = new Set<number>();
  for (const s of SPECIES) {
    if (s.id !== sp && !evolvesInto(s.id, sp)) continue;
    for (const [level, move] of s.golpes) if (level <= lv) allowed.add(move);
  }
  return allowed;
}

/* ---------- Validação ---------- */

/** Confere um monstro isolado. Retorna o motivo do erro ou null. */
export function validateMonster(m: Monster): string | null {
  const s = getSpecies(m.sp);
  if (!UID_RE.test(m.uid)) return 'uid inválido';
  if (!s) return 'espécie inexistente';
  if (!Number.isInteger(m.lv) || m.lv < 1 || m.lv > MAX_LEVEL) return 'nível inválido';
  const min = expForLevel(s.crescimento, m.lv);
  const max = m.lv === MAX_LEVEL ? min : expForLevel(s.crescimento, m.lv + 1) - 1;
  if (!Number.isInteger(m.xp) || m.xp < min || m.xp > max) return 'experiência não bate com o nível';
  if (!Number.isInteger(m.pid) || m.pid < 0 || m.pid > 0xffffffff) return 'personalidade inválida';
  if (m.ivs.length !== 6 || m.ivs.some((v) => !Number.isInteger(v) || v < 0 || v > 31)) return 'IVs inválidos';
  if (m.evs.length !== 6 || m.evs.some((v) => !Number.isInteger(v) || v < 0 || v > MAX_EV)) return 'EVs inválidos';
  if (m.evs.reduce((a, b) => a + b, 0) > MAX_EV_TOTAL) return 'EVs acima do total';
  if (m.moves.length < 1 || m.moves.length > 4 || new Set(m.moves).size !== m.moves.length) return 'golpes inválidos';
  const allowed = learnableMoves(m.sp, m.lv);
  if (m.moves.some((id) => !getMove(id) || !allowed.has(id))) return 'golpe que a espécie não aprende';
  if (m.nick !== undefined && !NICK_RE.test(m.nick)) return 'apelido inválido';
  return null;
}

export interface ChangeLimits {
  minutes: number; // tempo desde o último salvamento
  firstSave: boolean;
}

/**
 * Confere a mudança entre o save anterior e o novo, para barrar edições absurdas:
 * monstro não troca de espécie (só evolui), não perde nível, não muda IVs/personalidade,
 * e o ganho de níveis e de monstros novos é limitado pelo tempo jogado.
 */
export function validateChange(prev: Monster[], next: Monster[], limits: ChangeLimits): string | null {
  if (next.length > MAX_MONSTERS) return 'monstros demais';
  const seen = new Set<string>();
  for (const m of next) {
    if (seen.has(m.uid)) return 'uid repetido';
    seen.add(m.uid);
    const err = validateMonster(m);
    if (err) return `${m.uid}: ${err}`;
  }
  const before = new Map(prev.map((m) => [m.uid, m]));
  let newOnes = 0;
  let levelsGained = 0;
  for (const m of next) {
    const old = before.get(m.uid);
    if (!old) {
      newOnes++;
      if (m.lv > MAX_WILD_LEVEL) return `${m.uid}: monstro novo com nível alto demais`;
      continue;
    }
    if (old.sp !== m.sp && !evolvesInto(old.sp, m.sp)) return `${m.uid}: mudou de espécie`;
    if (m.lv < old.lv || m.xp < old.xp) return `${m.uid}: perdeu nível`;
    if (old.pid !== m.pid || old.ivs.some((v, i) => v !== m.ivs[i])) return `${m.uid}: dados fixos alterados`;
    levelsGained += m.lv - old.lv;
  }
  // Primeiro salvamento: só o inicial escolhido, no nível 5.
  if (limits.firstSave && next.some((m) => !before.has(m.uid) && (!STARTERS.includes(m.sp) || m.lv !== 5))) return 'o primeiro monstro deve ser um inicial no nível 5';
  const minutes = Math.max(0, limits.minutes);
  const maxNew = limits.firstSave ? 1 : 3 + Math.floor(minutes * 2);
  if (newOnes > maxNew) return 'monstros novos demais para o tempo jogado';
  if (levelsGained > 10 + Math.floor(minutes * 6)) return 'níveis demais para o tempo jogado';
  return null;
}

/** Melhor monstro da lista (para o ranking). */
export function bestMonster(list: Monster[]): { monster: Monster; power: number } | null {
  let best: { monster: Monster; power: number } | null = null;
  for (const m of list) {
    const power = powerOf(m);
    if (!best || power > best.power) best = { monster: m, power };
  }
  return best;
}
