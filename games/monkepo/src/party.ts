// Telas do time: lista de MonKePos e resumo (atributos, natureza e golpes).

import { NATURE_NAMES, STAT_NAMES, TYPE_COLORS, getMove } from '../shared/data';
import { abilitySlot, genderOf, isShiny, natureOf, statsOf, type Monster } from '../shared/monster';
import { H, W, box, ctx, custom, image, text, wrap } from './engine';
import { displayName, expProgress, maxHp, species, type PartyMon } from './monsters';

export function monIcon(m: Monster, x: number, y: number, t: number, size = 48): void {
  const img = image(`monstros/${species(m).sprite}.png`);
  if (!img.complete || !img.naturalWidth) return;
  const frame = Math.floor(t / 300) % 2;
  ctx.drawImage(img, frame * 24, 64, 24, 24, x, y, size, size);
}

function hpLine(p: PartyMon, x: number, y: number, w: number): void {
  const max = maxHp(p.m);
  const r = Math.max(0, p.hp / max);
  ctx.fillStyle = '#404850';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = r > 0.5 ? '#48c050' : r > 0.2 ? '#f0c020' : '#e04030';
  ctx.fillRect(x + 1, y + 1, Math.ceil((w - 2) * r), 6);
}

/** Lista do time. Resolve com o índice (ou -1 com B). */
export function chooseParty(party: PartyMon[], prompt: string, start = 0): Promise<number> {
  let cursor = Math.min(start, party.length - 1);
  return custom(
    (t) => {
      ctx.fillStyle = '#5a8ac8';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = i % 2 ? '#5282c0' : '#6294d0';
        ctx.fillRect(0, i * 18, W, 9);
      }
      party.forEach((p, i) => {
        const x = 8;
        const y = 6 + i * 44;
        const sel = i === cursor;
        box(x, y, W - 16, 42, p.hp <= 0 ? '#f0c8c8' : sel ? '#fff8d0' : '#f8f8f8', sel ? '#e07030' : '#4a6a9a');
        monIcon(p.m, x + 10, y - 2, sel ? t : 0, 44);
        text(displayName(p.m), x + 62, y + 26, { size: 16 });
        text(`Nv${p.m.lv}`, x + 210, y + 26, { size: 14 });
        hpLine(p, x + 268, y + 14, 120);
        text(`${p.hp}/${maxHp(p.m)}`, x + 450, y + 33, { size: 13, align: 'right' });
        if (p.status) text(p.status.slice(0, 3).toUpperCase(), x + 268, y + 34, { size: 12, color: '#c04040' });
      });
      box(0, H - 50, W, 50);
      text(prompt, 20, H - 20, { size: 15 });
    },
    (b, close) => {
      if (b === 'up') cursor = (cursor + party.length - 1) % party.length;
      else if (b === 'down') cursor = (cursor + 1) % party.length;
      else if (b === 'a') close(cursor);
      else if (b === 'b') close(-1);
    },
  ).then((v) => v);
}

/** Resumo de um MonKePo (fecha com A ou B; setas trocam de página). */
export function showSummary(p: PartyMon): Promise<number> {
  let page = 0;
  const m = p.m;
  const s = species(m);
  return custom(
    (t) => {
      ctx.fillStyle = '#f4ecd8';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#d06040';
      ctx.fillRect(0, 0, W, 40);
      text(page === 0 ? 'INFORMAÇÕES' : 'GOLPES', 16, 27, { size: 18, color: '#fff' });
      text('◀ ▶ página   B volta', W - 14, 27, { size: 12, color: '#ffe', align: 'right' });
      box(10, 50, 180, 200, '#ffffff');
      const img = image(`monstros/${s.sprite}.png`);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, 64, 64, 36, 70 + Math.sin(t / 300) * 2, 128, 128);
      text(`${displayName(m)}${isShiny(m) ? ' ★' : ''}`, 100, 222, { size: 16, align: 'center' });
      text(`Nv${m.lv}  ${genderOf(m) === 'F' ? '♀' : genderOf(m) === 'M' ? '♂' : ''}`, 100, 240, { size: 13, align: 'center' });
      if (page === 0) {
        const stats = statsOf(m);
        text(`${s.nome}`, 210, 70, { size: 16 });
        s.tipos.forEach((tp, i) => {
          ctx.fillStyle = TYPE_COLORS[tp];
          ctx.fillRect(210 + i * 90, 80, 84, 20);
          text(tp.toUpperCase(), 252 + i * 90, 95, { size: 12, color: '#fff', align: 'center', shadow: 'rgba(0,0,0,.4)' });
        });
        text(`Natureza ${NATURE_NAMES[natureOf(m)]}  •  Habilidade ${abilitySlot(m) + 1}`, 210, 124, { size: 13 });
        STAT_NAMES.forEach((name, i) => {
          text(name, 210, 152 + i * 22, { size: 14 });
          text(i === 0 ? `${p.hp}/${stats[0]}` : String(stats[i]), 460, 152 + i * 22, { size: 14, align: 'right' });
        });
        text('EXP', 210, 290, { size: 13 });
        ctx.fillStyle = '#404850';
        ctx.fillRect(250, 280, 210, 8);
        ctx.fillStyle = '#48a0f0';
        ctx.fillRect(251, 281, Math.floor(208 * expProgress(m)), 6);
      } else {
        m.moves.forEach((id, i) => {
          const mv = getMove(id)!;
          box(200, 50 + i * 62, 270, 58, '#ffffff');
          ctx.fillStyle = TYPE_COLORS[mv.tipo];
          ctx.fillRect(214, 64 + i * 62, 70, 18);
          text(mv.tipo.toUpperCase(), 249, 78 + i * 62, { size: 11, color: '#fff', align: 'center', shadow: 'rgba(0,0,0,.4)' });
          text(mv.nome, 292, 78 + i * 62, { size: 15 });
          text(`PP ${p.pp[i]}/${mv.pp}${mv.poder > 1 ? `   Poder ${mv.poder}` : ''}${mv.precisao ? `   Prec. ${mv.precisao}` : ''}`, 214, 98 + i * 62, { size: 12, color: '#606060' });
        });
        wrap(`Golpes aprendidos por nível, como no jogo original.`, 170, 12).forEach((l, i) => text(l, 14, 280 + i * 16, { size: 12, color: '#806040' }));
      }
    },
    (b, close) => {
      if (b === 'left' || b === 'right') page = 1 - page;
      else if (b === 'a' || b === 'b') close(0);
    },
  );
}
