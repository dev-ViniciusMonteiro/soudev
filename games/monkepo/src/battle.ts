// Motor de batalha (fórmulas da 3ª geração). Lógica pura: recebe ações e devolve eventos para a tela mostrar.
// O mesmo motor vai servir para as batalhas entre jogadores (com o mesmo gerador aleatório nos dois lados).

import { PHYSICAL_TYPES, getItem, getMove, typeEffectiveness, type Move, type StageStat, type Status } from '../shared/data';
import { statsOf } from '../shared/monster';
import { displayName, maxHp, randInt, species, type PartyMon, type Rng } from './monsters';

export type Action =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; to: number }
  | { kind: 'item'; item: string; target: number }
  | { kind: 'ball'; item: string }
  | { kind: 'run' };

export type BattleEvent =
  | { t: 'msg'; text: string }
  | { t: 'hp'; side: 0 | 1; hp: number }
  | { t: 'attack'; side: 0 | 1 }
  | { t: 'faint'; side: 0 | 1 }
  | { t: 'switch'; side: 0 | 1 }
  | { t: 'ball'; shakes: number; caught: boolean }
  | { t: 'end'; result: 'win' | 'lose' | 'run' | 'caught' };

interface Volatile {
  stages: Record<StageStat, number>;
  flinch: boolean;
  sleep: number; // turnos restantes dormindo
}

export interface Side {
  party: PartyMon[];
  active: number;
  v: Volatile;
  name: string; // "" = selvagem
  participants: Set<number>; // quem do time do jogador lutou contra o oponente atual
}

const STATUS_TEXT: Record<Status, string> = {
  queimado: 'foi queimado',
  envenenado: 'foi envenenado',
  paralisado: 'ficou paralisado',
  dormindo: 'adormeceu',
  congelado: 'foi congelado',
};
const STAT_TEXT: Record<StageStat, string> = { atk: 'Ataque', def: 'Defesa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidade', acc: 'Precisão', eva: 'Evasão' };
const STAT_INDEX: Partial<Record<StageStat, number>> = { atk: 1, def: 2, spa: 3, spd: 4, spe: 5 };
const ACC_TABLE = [33, 36, 43, 50, 60, 75, 100, 133, 166, 200, 233, 266, 300];

const freshVolatile = (): Volatile => ({ stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }, flinch: false, sleep: 0 });
const stageMult = (s: number): number => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

export function makeSide(party: PartyMon[], name = ''): Side {
  const active = Math.max(0, party.findIndex((p) => p.hp > 0));
  return { party, active, v: freshVolatile(), name, participants: new Set([active]) };
}

export class Battle {
  sides: [Side, Side];
  rng: Rng;
  runAttempts = 0;
  over: BattleEvent | null = null;
  private fainted = new Set<PartyMon>();

  constructor(player: Side, enemy: Side, rng: Rng = Math.random) {
    this.sides = [player, enemy];
    this.rng = rng;
  }

  get wild(): boolean {
    return this.sides[1].name === '';
  }
  mon(side: 0 | 1): PartyMon {
    const s = this.sides[side];
    return s.party[s.active];
  }
  label(side: 0 | 1): string {
    const name = displayName(this.mon(side).m);
    if (side === 0) return name;
    return this.wild ? `${name} selvagem` : `${name} inimigo`;
  }

  /** Atributo em batalha com estágios, paralisia (velocidade) e crítico (ignora estágios ruins). */
  stat(side: 0 | 1, stat: StageStat, crit = false): number {
    const p = this.mon(side);
    const base = statsOf(p.m)[STAT_INDEX[stat]!];
    let stage = this.sides[side].v.stages[stat];
    if (crit && (stat === 'atk' || stat === 'spa')) stage = Math.max(0, stage);
    if (crit && (stat === 'def' || stat === 'spd')) stage = Math.min(0, stage);
    let value = Math.floor(base * stageMult(stage));
    if (stat === 'spe' && p.status === 'paralisado') value = Math.floor(value / 4);
    return Math.max(1, value);
  }

  /** IA: selvagem escolhe ao acaso; treinador prefere o golpe que causa mais dano. */
  enemyAction(): Action {
    const p = this.mon(1);
    const usable = p.m.moves.map((_, i) => i).filter((i) => p.pp[i] > 0);
    if (usable.length === 0) return { kind: 'move', index: -1 };
    if (this.wild || this.rng() < 0.25) return { kind: 'move', index: usable[Math.floor(this.rng() * usable.length)] };
    const score = (i: number): number => {
      const mv = getMove(p.m.moves[i])!;
      if (mv.poder === 0) return 10;
      return mv.poder * typeEffectiveness(mv.tipo, species(this.mon(0).m).tipos) * (species(p.m).tipos.includes(mv.tipo) ? 1.5 : 1);
    };
    return { kind: 'move', index: usable.sort((a, b) => score(b) - score(a))[0] };
  }

  /** Um turno completo. A ação do oponente é escolhida aqui se não vier (selvagem/treinador). */
  turn(playerAction: Action, enemyAction: Action = this.enemyAction()): BattleEvent[] {
    const ev: BattleEvent[] = [];
    if (this.over) return ev;
    this.sides[0].v.flinch = this.sides[1].v.flinch = false;
    const actions: [Action, Action] = [playerAction, enemyAction];

    // Trocar, itens, bolas e fugir vêm antes dos golpes.
    for (const side of [0, 1] as const) {
      const a = actions[side];
      if (a.kind === 'move') continue;
      this.nonMove(side, a, ev);
      if (this.over) return ev;
    }

    const order = this.moveOrder(actions);
    for (const side of order) {
      const a = actions[side];
      if (a.kind !== 'move') continue;
      const other = (1 - side) as 0 | 1;
      if (this.mon(side).hp <= 0 || this.mon(other).hp <= 0) continue;
      this.useMove(side, a.index, ev);
      if (this.checkFaints(ev)) return ev;
    }
    this.endOfTurn(ev);
    this.checkFaints(ev);
    return ev;
  }

  private moveOrder(actions: [Action, Action]): (0 | 1)[] {
    const prio = (side: 0 | 1): number => {
      const a = actions[side];
      return a.kind === 'move' && a.index >= 0 ? getMove(this.mon(side).m.moves[a.index])!.prioridade ?? 0 : 0;
    };
    const p0 = prio(0);
    const p1 = prio(1);
    if (p0 !== p1) return p0 > p1 ? [0, 1] : [1, 0];
    const s0 = this.stat(0, 'spe');
    const s1 = this.stat(1, 'spe');
    if (s0 !== s1) return s0 > s1 ? [0, 1] : [1, 0];
    return this.rng() < 0.5 ? [0, 1] : [1, 0];
  }

  private nonMove(side: 0 | 1, a: Action, ev: BattleEvent[]): void {
    const s = this.sides[side];
    if (a.kind === 'switch') {
      ev.push({ t: 'msg', text: side === 0 ? `Volte, ${displayName(this.mon(0).m)}!` : `${s.name} trocou de MonKePo.` });
      s.active = a.to;
      s.v = freshVolatile();
      if (side === 0) this.sides[0].participants.add(a.to);
      ev.push({ t: 'switch', side });
      ev.push({ t: 'msg', text: side === 0 ? `Vai, ${displayName(this.mon(0).m)}!` : `${s.name} mandou ${displayName(this.mon(1).m)}!` });
      ev.push({ t: 'hp', side, hp: this.mon(side).hp });
    } else if (a.kind === 'item') {
      const item = getItem(a.item)!;
      const target = s.party[a.target];
      if (item.cura) {
        target.hp = Math.min(maxHp(target.m), target.hp + item.cura);
        ev.push({ t: 'msg', text: `${displayName(target.m)} recuperou PS com ${item.nome}.` });
        if (a.target === s.active) ev.push({ t: 'hp', side, hp: target.hp });
      }
      if (item.curaStatus && target.status) {
        target.status = null;
        if (a.target === s.active) s.v.sleep = 0;
        ev.push({ t: 'msg', text: `${displayName(target.m)} ficou curado.` });
      }
    } else if (a.kind === 'ball') {
      this.throwBall(a.item, ev);
    } else if (a.kind === 'run') {
      if (!this.wild) {
        ev.push({ t: 'msg', text: 'Não dá para fugir de uma batalha contra treinador!' });
        return;
      }
      // Fórmula da 3ª geração.
      this.runAttempts++;
      const mine = this.stat(0, 'spe');
      const theirs = this.stat(1, 'spe');
      const f = Math.floor((mine * 128) / theirs + 30 * this.runAttempts) % 256;
      if (mine >= theirs || randInt(this.rng, 0, 255) < f) {
        ev.push({ t: 'msg', text: 'Você fugiu com segurança!' });
        this.finish(ev, 'run');
      } else ev.push({ t: 'msg', text: 'Não conseguiu fugir!' });
    }
  }

  /** Captura da 3ª geração: valor "a" e até 4 balançadas. */
  private throwBall(itemId: string, ev: BattleEvent[]): void {
    const item = getItem(itemId)!;
    ev.push({ t: 'msg', text: `Você jogou uma ${item.nome}!` });
    if (!this.wild) {
      ev.push({ t: 'msg', text: 'Não se captura o MonKePo de outro treinador!' });
      return;
    }
    const target = this.mon(1);
    const max = maxHp(target.m);
    const statusBonus = target.status === 'dormindo' || target.status === 'congelado' ? 2 : target.status ? 1.5 : 1;
    const a = Math.floor((((3 * max - 2 * target.hp) * species(target.m).captura * (item.bola ?? 1)) / (3 * max)) * statusBonus);
    let shakes = 0;
    if (a >= 255) shakes = 4;
    else {
      const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
      while (shakes < 4 && randInt(this.rng, 0, 65535) < b) shakes++;
    }
    const caught = shakes === 4;
    ev.push({ t: 'ball', shakes: Math.min(shakes, 3), caught });
    if (caught) {
      ev.push({ t: 'msg', text: `Peguei! ${displayName(target.m)} foi capturado!` });
      this.finish(ev, 'caught');
    } else {
      ev.push({ t: 'msg', text: ['Ah, não! Ele escapou!', 'Quase! Faltou pouco!', 'Que pena! Parecia que ia dar!', 'Droga! Foi por um triz!'][shakes] });
    }
  }

  private useMove(side: 0 | 1, index: number, ev: BattleEvent[]): void {
    const other = (1 - side) as 0 | 1;
    const user = this.mon(side);
    const v = this.sides[side].v;

    // Status que impedem de agir.
    if (user.status === 'dormindo') {
      if (v.sleep <= 0) v.sleep = randInt(this.rng, 2, 5);
      v.sleep--;
      if (v.sleep > 0) {
        ev.push({ t: 'msg', text: `${this.label(side)} está dormindo.` });
        return;
      }
      user.status = null;
      ev.push({ t: 'msg', text: `${this.label(side)} acordou!` });
    }
    if (user.status === 'congelado') {
      if (this.rng() < 0.2) {
        user.status = null;
        ev.push({ t: 'msg', text: `${this.label(side)} descongelou!` });
      } else {
        ev.push({ t: 'msg', text: `${this.label(side)} está congelado!` });
        return;
      }
    }
    if (v.flinch) {
      ev.push({ t: 'msg', text: `${this.label(side)} recuou e não atacou!` });
      return;
    }
    if (user.status === 'paralisado' && this.rng() < 0.25) {
      ev.push({ t: 'msg', text: `${this.label(side)} está paralisado! Não consegue se mexer!` });
      return;
    }

    // Sem PP em nada: Luta Desesperada (dano 50 e recuo de 1/4).
    let move: Move;
    if (index < 0) {
      move = { id: 0, nome: 'Luta Desesperada', tipo: 'Normal', poder: 50, precisao: 0, pp: 1 };
    } else {
      move = getMove(user.m.moves[index])!;
      user.pp[index] = Math.max(0, user.pp[index] - 1);
    }
    ev.push({ t: 'msg', text: `${this.label(side)} usou ${move.nome}!` });

    const target = this.mon(other);
    const targetsFoe = move.poder > 0 || (move.efeitos ?? []).some((e) => e.tipo === 'status' || (e.tipo === 'stat' && e.alvo === 'alvo'));
    if (targetsFoe && move.precisao > 0) {
      const stage = Math.max(-6, Math.min(6, v.stages.acc - this.sides[other].v.stages.eva));
      const chance = (move.precisao * ACC_TABLE[stage + 6]) / 100;
      if (randInt(this.rng, 1, 100) > chance) {
        ev.push({ t: 'msg', text: `${this.label(side)} errou o ataque!` });
        return;
      }
    }

    let damage = 0;
    if (move.poder > 0) {
      const eff = typeEffectiveness(move.tipo, species(target.m).tipos);
      if (eff === 0) {
        ev.push({ t: 'msg', text: `Não afeta ${this.label(other)}...` });
        return;
      }
      const fixed = move.efeitos?.find((e) => e.tipo === 'fixo');
      if (fixed && fixed.tipo === 'fixo') damage = fixed.dano;
      else {
        const highCrit = move.efeitos?.some((e) => e.tipo === 'critico');
        const crit = this.rng() < (highCrit ? 1 / 8 : 1 / 16);
        damage = this.damage(side, move, crit, eff);
        if (crit) ev.push({ t: 'msg', text: 'Um golpe crítico!' });
        if (eff > 1) ev.push({ t: 'msg', text: 'É super efetivo!' });
        if (eff < 1) ev.push({ t: 'msg', text: 'Não é muito efetivo...' });
      }
      damage = Math.min(damage, target.hp);
      target.hp -= damage;
      ev.push({ t: 'attack', side });
      ev.push({ t: 'hp', side: other, hp: target.hp });
      if (target.status === 'congelado' && move.tipo === 'Fogo') {
        target.status = null;
        ev.push({ t: 'msg', text: `${this.label(other)} descongelou!` });
      }
      if (index < 0) {
        user.hp = Math.max(0, user.hp - Math.max(1, Math.floor(damage / 4)));
        ev.push({ t: 'msg', text: `${this.label(side)} se machucou com o impacto!` });
        ev.push({ t: 'hp', side, hp: user.hp });
      }
    }

    for (const e of move.efeitos ?? []) {
      if (e.tipo === 'drena' && damage > 0 && user.hp > 0) {
        user.hp = Math.min(maxHp(user.m), user.hp + Math.max(1, Math.floor(damage * e.fracao)));
        ev.push({ t: 'msg', text: `${this.label(other)} teve a energia drenada!` });
        ev.push({ t: 'hp', side, hp: user.hp });
      } else if (e.tipo === 'recua' && target.hp > 0 && this.rng() * 100 < e.chance) {
        this.sides[other].v.flinch = true;
      } else if (e.tipo === 'status' && target.hp > 0 && this.rng() * 100 < e.chance) {
        this.inflict(other, e.status, ev, move.poder === 0);
      } else if (e.tipo === 'stat' && this.rng() * 100 < e.chance) {
        const who = e.alvo === 'self' ? side : other;
        if (this.mon(who).hp <= 0) continue;
        const stages = this.sides[who].v.stages;
        const before = stages[e.stat];
        stages[e.stat] = Math.max(-6, Math.min(6, before + e.delta));
        const name = `${STAT_TEXT[e.stat]} de ${this.label(who)}`;
        if (stages[e.stat] === before) ev.push({ t: 'msg', text: `${name} não pode ${e.delta > 0 ? 'subir' : 'cair'} mais!` });
        else ev.push({ t: 'msg', text: `${name} ${e.delta > 0 ? (e.delta > 1 ? 'subiu muito' : 'subiu') : e.delta < -1 ? 'caiu muito' : 'caiu'}!` });
      }
    }
  }

  /** Fórmula de dano da 3ª geração. */
  damage(side: 0 | 1, move: Move, crit: boolean, eff: number): number {
    const other = (1 - side) as 0 | 1;
    const user = this.mon(side);
    const physical = PHYSICAL_TYPES.includes(move.tipo);
    const atk = this.stat(side, physical ? 'atk' : 'spa', crit);
    const def = this.stat(other, physical ? 'def' : 'spd', crit);
    let dmg = Math.floor(Math.floor((Math.floor((2 * user.m.lv) / 5 + 2) * move.poder * atk) / def) / 50);
    if (physical && user.status === 'queimado') dmg = Math.floor(dmg / 2);
    dmg += 2;
    if (crit) dmg *= 2;
    if (species(user.m).tipos.includes(move.tipo)) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor(dmg * eff);
    dmg = Math.floor((dmg * randInt(this.rng, 85, 100)) / 100);
    return Math.max(1, dmg);
  }

  private inflict(side: 0 | 1, status: Status, ev: BattleEvent[], announceFail: boolean): void {
    const p = this.mon(side);
    const types = species(p.m).tipos;
    const immune =
      (status === 'queimado' && types.includes('Fogo')) ||
      (status === 'envenenado' && (types.includes('Venenoso') || types.includes('Metal'))) ||
      (status === 'congelado' && types.includes('Gelo'));
    if (p.status || immune) {
      if (announceFail) ev.push({ t: 'msg', text: 'Não funcionou!' });
      return;
    }
    p.status = status;
    if (status === 'dormindo') this.sides[side].v.sleep = randInt(this.rng, 2, 5);
    ev.push({ t: 'msg', text: `${this.label(side)} ${STATUS_TEXT[status]}!` });
  }

  private endOfTurn(ev: BattleEvent[]): void {
    for (const side of [0, 1] as const) {
      const p = this.mon(side);
      if (p.hp <= 0) continue;
      if (p.status === 'queimado' || p.status === 'envenenado') {
        p.hp = Math.max(0, p.hp - Math.max(1, Math.floor(maxHp(p.m) / 8)));
        ev.push({ t: 'msg', text: `${this.label(side)} sofreu ${p.status === 'queimado' ? 'com a queimadura' : 'com o veneno'}!` });
        ev.push({ t: 'hp', side, hp: p.hp });
      }
    }
  }

  /** Marca desmaios. Retorna true se a batalha precisa parar o turno (alguém desmaiou). */
  private checkFaints(ev: BattleEvent[]): boolean {
    let any = false;
    for (const side of [1, 0] as const) {
      const p = this.mon(side);
      if (p.hp > 0 || this.fainted.has(p)) continue;
      this.fainted.add(p);
      any = true;
      ev.push({ t: 'faint', side });
      ev.push({ t: 'msg', text: `${this.label(side)} desmaiou!` });
    }
    if (!any) return false;
    if (!this.sides[0].party.some((p) => p.hp > 0)) {
      ev.push({ t: 'msg', text: 'Todos os seus MonKePos desmaiaram...' });
      this.finish(ev, 'lose');
    } else if (!this.sides[1].party.some((p) => p.hp > 0)) {
      if (!this.wild) ev.push({ t: 'msg', text: `Você venceu ${this.sides[1].name}!` });
      this.finish(ev, 'win');
    }
    return true;
  }

  /** Oponente treinador manda o próximo MonKePo depois de um desmaio. */
  enemyNext(): BattleEvent[] {
    const s = this.sides[1];
    const next = s.party.findIndex((p) => p.hp > 0);
    if (next < 0) return [];
    s.active = next;
    s.v = freshVolatile();
    this.sides[0].participants = new Set([this.sides[0].active]);
    return [{ t: 'switch', side: 1 }, { t: 'msg', text: `${s.name} mandou ${displayName(this.mon(1).m)}!` }, { t: 'hp', side: 1, hp: this.mon(1).hp }];
  }

  /** Jogador escolhe quem entra depois de um desmaio (não gasta turno). */
  playerReplace(to: number): BattleEvent[] {
    const s = this.sides[0];
    s.active = to;
    s.v = freshVolatile();
    s.participants.add(to);
    return [{ t: 'switch', side: 0 }, { t: 'msg', text: `Vai, ${displayName(this.mon(0).m)}!` }, { t: 'hp', side: 0, hp: this.mon(0).hp }];
  }

  private finish(ev: BattleEvent[], result: 'win' | 'lose' | 'run' | 'caught'): void {
    this.over = { t: 'end', result };
    ev.push(this.over);
  }
}
