// Tela, controles e janelas (diálogo e menus) no estilo dos jogos de GBA.
// Resolução lógica 480x320 (o dobro do GBA), ampliada sem borrar.

export const W = 480;
export const H = 320;

export const canvas = document.getElementById('game') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

function fit(): void {
  const scale = Math.min(innerWidth / W, (innerHeight - (touchMode ? 170 : 0)) / H);
  const s = scale >= 1 ? Math.floor(scale * 2) / 2 : scale;
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
}
export const touchMode = matchMedia('(pointer: coarse)').matches;
addEventListener('resize', fit);
fit();

/* ---------- Controles ---------- */

export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start';
const KEYMAP: Record<string, Button> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Enter: 'a', Space: 'a', KeyX: 'b', Backspace: 'b', Escape: 'b', ShiftLeft: 'b', KeyP: 'start', Tab: 'start',
};
const held = new Set<Button>();
const pressedQueue: Button[] = [];

export const isHeld = (b: Button): boolean => held.has(b);
export function press(b: Button): void {
  pressedQueue.push(b);
}
export function takePress(): Button | undefined {
  return pressedQueue.shift();
}
export function clearPresses(): void {
  pressedQueue.length = 0;
}

let typingInForm = false;
export function setFormMode(on: boolean): void {
  typingInForm = on;
}

addEventListener('keydown', (e) => {
  if (typingInForm) return;
  const b = KEYMAP[e.code];
  if (!b) return;
  e.preventDefault();
  if (!e.repeat) press(b);
  held.add(b);
});
addEventListener('keyup', (e) => {
  const b = KEYMAP[e.code];
  if (b) held.delete(b);
});
addEventListener('blur', () => held.clear());

/** Botões na tela para celular. */
export function setupTouchPad(): void {
  if (!touchMode) return;
  const pad = document.getElementById('pad')!;
  pad.hidden = false;
  for (const el of pad.querySelectorAll<HTMLElement>('[data-btn]')) {
    const b = el.dataset.btn as Button;
    const down = (e: Event): void => {
      e.preventDefault();
      press(b);
      held.add(b);
      el.classList.add('on');
    };
    const up = (e: Event): void => {
      e.preventDefault();
      held.delete(b);
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
  fit();
}

/* ---------- Desenho básico ---------- */

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export function text(str: string, x: number, y: number, opts: { size?: number; color?: string; align?: CanvasTextAlign; shadow?: string; bold?: boolean } = {}): void {
  const size = opts.size ?? 16;
  ctx.font = `${opts.bold === false ? '' : 'bold '}${size}px ${FONT}`;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  if (opts.shadow !== '') {
    ctx.fillStyle = opts.shadow ?? 'rgba(0,0,0,.18)';
    ctx.fillText(str, x + 1, y + 1);
  }
  ctx.fillStyle = opts.color ?? '#303030';
  ctx.fillText(str, x, y);
}

/** Janela branca com borda dupla, como nos jogos de GBA. */
export function box(x: number, y: number, w: number, h: number, fill = '#f8f8f8', border = '#4a6a9a'): void {
  ctx.fillStyle = '#283848';
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = border;
  roundRect(x + 3, y + 3, w - 6, h - 6, 6);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(x + 6, y + 6, w - 12, h - 12, 4);
  ctx.fill();
}

export function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Quebra o texto em linhas que cabem na largura. */
export function wrap(str: string, width: number, size = 16): string[] {
  ctx.font = `bold ${size}px ${FONT}`;
  const lines: string[] = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > width && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

/* ---------- Imagens ---------- */

const images = new Map<string, HTMLImageElement>();
export function image(src: string): HTMLImageElement {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    images.set(src, img);
  }
  return img;
}
export function preload(srcs: string[]): Promise<void> {
  return Promise.all(
    srcs.map(
      (s) =>
        new Promise<void>((resolve) => {
          const img = image(s);
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  ).then(() => undefined);
}

/* ---------- Janelas: diálogo e menus (com Promise) ---------- */

interface Widget {
  draw(t: number): void;
  input(b: Button): void;
}
const widgets: Widget[] = [];
export const uiBusy = (): boolean => widgets.length > 0;

export function drawWidgets(t: number): void {
  for (const w of widgets) w.draw(t);
}
export function feedWidgets(): boolean {
  const top = widgets[widgets.length - 1];
  if (!top) return false;
  let b: Button | undefined;
  while ((b = takePress())) top.input(b);
  return true;
}
function push(w: Widget): void {
  widgets.push(w);
}
function pop(w: Widget): void {
  const i = widgets.indexOf(w);
  if (i >= 0) widgets.splice(i, 1);
}

const TEXT_SPEED = 90; // letras por segundo

/** Caixa de diálogo embaixo. Resolve quando o jogador aperta A depois do texto aparecer. */
export function say(str: string, opts: { auto?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    const lines = wrap(str, W - 56);
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2));
    let page = 0;
    let start = performance.now();
    let autoTimer = 0;
    const total = (): number => pages[page].join(' ').length;
    const shown = (): number => Math.floor(((performance.now() - start) / 1000) * TEXT_SPEED);
    const next = (): void => {
      if (shown() < total()) {
        start = -1e9;
        return;
      }
      if (page < pages.length - 1) {
        page++;
        start = performance.now();
        return;
      }
      pop(w);
      clearTimeout(autoTimer);
      resolve();
    };
    const w: Widget = {
      draw(t) {
        box(0, H - 88, W, 88);
        let left = shown();
        pages[page].forEach((line, i) => {
          const part = line.slice(0, Math.max(0, left));
          left -= line.length + 1;
          text(part, 22, H - 52 + i * 26, { size: 17 });
        });
        if (shown() >= total() && !opts.auto) {
          ctx.fillStyle = '#d04040';
          const bob = Math.sin(t / 150) * 2;
          ctx.beginPath();
          ctx.moveTo(W - 34, H - 30 + bob);
          ctx.lineTo(W - 24, H - 30 + bob);
          ctx.lineTo(W - 29, H - 24 + bob);
          ctx.fill();
        }
      },
      input(b) {
        if (b === 'a' || b === 'b') next();
      },
    };
    push(w);
    if (opts.auto) {
      const tick = (): void => {
        if (shown() >= total() && page === pages.length - 1) {
          autoTimer = window.setTimeout(() => {
            pop(w);
            resolve();
          }, opts.auto);
        } else {
          if (shown() >= total()) {
            page++;
            start = performance.now();
          }
          autoTimer = window.setTimeout(tick, 120);
        }
      };
      tick();
    }
  });
}

export interface MenuOpts {
  x?: number;
  y?: number;
  w?: number;
  cancel?: boolean; // B devolve -1
  columns?: number;
  title?: string;
  start?: number;
  disabled?: boolean[];
  hint?: (i: number) => string | undefined; // texto de ajuda embaixo
  hintArea?: [number, number, number, number]; // onde mostrar a ajuda (padrão: faixa de baixo inteira)
  lineH?: number;
  h?: number; // altura fixa da janela
  keepOpen?: boolean;
}

/** Lista de opções com cursor. Resolve com o índice escolhido (ou -1 se cancelou). */
export function choose(options: string[], opts: MenuOpts = {}): Promise<number> {
  return new Promise((resolve) => {
    const cols = opts.columns ?? 1;
    const rows = Math.ceil(options.length / cols);
    const lineH = opts.lineH ?? 30;
    const w = opts.w ?? Math.max(120, ...options.map((o) => wrap(o, 999)[0].length * 9 + 60)) * (cols > 1 ? 1 : 1);
    const h = opts.h ?? rows * lineH + 26 + (opts.title ? 26 : 0);
    const x = opts.x ?? W - w - 6;
    const y = opts.y ?? H - 88 - h - 4;
    let cursor = opts.start ?? 0;
    const widget: Widget = {
      draw(t) {
        const hint = opts.hint?.(cursor);
        if (hint) {
          const [hx, hy, hw, hh] = opts.hintArea ?? [0, H - 88, W, 88];
          box(hx, hy, hw, hh);
          const size = hw < W ? 14 : 16;
          wrap(hint, hw - 40, size).slice(0, hh > 80 ? 3 : 2).forEach((line, i) => text(line, hx + 20, hy + (hw < W ? 30 : 36) + i * (size + 8), { size }));
        }
        box(x, y, w, h);
        let top = y + 34;
        if (opts.title) {
          text(opts.title, x + 18, y + 30, { size: 15, color: '#4a6a9a' });
          top += 26;
        }
        options.forEach((o, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const ox = x + 34 + col * ((w - 30) / cols);
          const oy = top + row * lineH;
          text(o, ox, oy, { size: 16, color: opts.disabled?.[i] ? '#a0a0a0' : '#303030' });
          if (i === cursor) {
            ctx.fillStyle = '#303030';
            const nudge = Math.sin(t / 160) > 0 ? 1 : 0;
            ctx.beginPath();
            ctx.moveTo(ox - 18 + nudge, oy - 13);
            ctx.lineTo(ox - 8 + nudge, oy - 7);
            ctx.lineTo(ox - 18 + nudge, oy - 1);
            ctx.fill();
          }
        });
      },
      input(b) {
        const move = (d: number): void => {
          cursor = (cursor + d + options.length) % options.length;
        };
        if (b === 'up') move(-cols);
        else if (b === 'down') move(cols);
        else if (b === 'left' && cols > 1) move(-1);
        else if (b === 'right' && cols > 1) move(1);
        else if (b === 'a') {
          if (opts.disabled?.[cursor]) return;
          pop(widget);
          resolve(cursor);
        } else if (b === 'b' && opts.cancel !== false) {
          pop(widget);
          resolve(-1);
        }
      },
    };
    push(widget);
  });
}

/** Sim/Não. */
export async function confirm(question: string): Promise<boolean> {
  return (await choose(['SIM', 'NÃO'], { w: 110, hint: () => question })) === 0;
}

/** Janela personalizada (lista de MonKePos, ranking etc.): fecha com A/B conforme o handler. */
export function custom(draw: (t: number) => void, onInput: (b: Button, close: (v: number) => void) => void): Promise<number> {
  return new Promise((resolve) => {
    const w: Widget = {
      draw,
      input(b) {
        onInput(b, (v) => {
          pop(w);
          resolve(v);
        });
      },
    };
    push(w);
  });
}

/** Espera um tempo (animações). */
export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
