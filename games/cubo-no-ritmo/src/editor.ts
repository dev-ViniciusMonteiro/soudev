// Editor de fases: paleta com todos os objetos, grade de 1 bloco, arrastar para colocar vários, borracha,
// testar na hora, salvar no aparelho e compartilhar por link (a fase vai compactada no próprio link).

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { Desenho } from './desenho';
import type { Fase, Modo, Objeto, Tipo } from './fisica';

interface ItemPaleta {
  rotulo: string;
  icone: string;
  obj?: Omit<Objeto, 'x' | 'y'>;
  ferramenta?: 'apagar' | 'mover';
}

const CORREDOR: Partial<Record<Modo, number>> = { nave: 10, ovni: 10, bola: 7, onda: 9, aranha: 6 };

const PALETA: ItemPaleta[] = [
  { rotulo: 'Mover', icone: '✋', ferramenta: 'mover' },
  { rotulo: 'Apagar', icone: '🧽', ferramenta: 'apagar' },
  { rotulo: 'Bloco', icone: '⬛', obj: { t: 'bloco' } },
  { rotulo: 'Laje', icone: '▬', obj: { t: 'meio' } },
  { rotulo: 'Espinho', icone: '▲', obj: { t: 'espinho' } },
  { rotulo: 'Espinho ↓', icone: '▼', obj: { t: 'espinho', r: 180 } },
  { rotulo: 'Mini espinho', icone: '⏶', obj: { t: 'espinhoMini' } },
  { rotulo: 'Serra', icone: '✳', obj: { t: 'serra' } },
  { rotulo: 'Orbe amarela', icone: '🟡', obj: { t: 'orbeAmarela' } },
  { rotulo: 'Orbe rosa', icone: '🩷', obj: { t: 'orbeRosa' } },
  { rotulo: 'Orbe azul', icone: '🔵', obj: { t: 'orbeAzul' } },
  { rotulo: 'Orbe verde', icone: '🟢', obj: { t: 'orbeVerde' } },
  { rotulo: 'Orbe preta', icone: '⚫', obj: { t: 'orbePreta' } },
  { rotulo: 'Pad amarelo', icone: '⌒', obj: { t: 'padAmarelo' } },
  { rotulo: 'Pad rosa', icone: '⌒', obj: { t: 'padRosa' } },
  { rotulo: 'Pad azul', icone: '⌒', obj: { t: 'padAzul' } },
  ...(['cubo', 'nave', 'bola', 'ovni', 'onda', 'robo', 'aranha'] as Modo[]).map((modo) => ({ rotulo: `Portal ${modo}`, icone: '◯', obj: { t: 'portalModo' as Tipo, modo } })),
  { rotulo: 'Gravidade ↑', icone: '⇅', obj: { t: 'portalGravidade', grav: -1 } },
  { rotulo: 'Gravidade ↓', icone: '⇵', obj: { t: 'portalGravidade', grav: 1 } },
  ...([0.5, 1, 2, 3, 4] as const).map((vel) => ({ rotulo: `Velocidade ${vel}×`, icone: vel === 0.5 ? '<' : '>'.repeat(vel), obj: { t: 'portalVelocidade' as Tipo, vel } })),
  { rotulo: 'Mini', icone: '◦', obj: { t: 'portalTamanho', mini: true } },
  { rotulo: 'Normal', icone: '○', obj: { t: 'portalTamanho', mini: false } },
  { rotulo: 'Moeda', icone: '★', obj: { t: 'moeda' } },
];

export interface FaseEditor {
  nome: string;
  bpm: number;
  musica: number;
  objetos: Objeto[];
}

/** Transforma o que foi desenhado numa fase jogável (fim 10 blocos depois do último objeto). */
export function paraFase(f: FaseEditor): Fase {
  const fim = Math.max(40, ...f.objetos.map((o) => o.x)) + 12;
  return {
    nome: f.nome || 'Minha fase',
    dificuldade: 'Criada por você',
    bpm: f.bpm,
    musica: f.musica,
    comprimento: fim,
    objetos: f.objetos.map((o) => ({ ...o })),
    cores: [{ x: 0, fundo: '#1e3a8a', chao: '#2563eb' }],
  };
}

/* ---------- Link de compartilhamento ---------- */

const TIPOS: Tipo[] = ['bloco', 'meio', 'espinho', 'espinhoMini', 'serra', 'orbeAmarela', 'orbeRosa', 'orbeAzul', 'orbeVerde', 'orbePreta', 'padAmarelo', 'padRosa', 'padAzul', 'portalModo', 'portalGravidade', 'portalVelocidade', 'portalTamanho', 'moeda', 'checkpoint'];

export function codificar(f: FaseEditor): string {
  const compacto = {
    n: f.nome,
    b: f.bpm,
    m: f.musica,
    o: f.objetos.map((o) => [TIPOS.indexOf(o.t), o.x, o.y, o.r ?? 0, o.modo ?? '', o.grav ?? 0, o.vel ?? 0, o.mini ? 1 : 0, o.base ?? -1, o.altura ?? 0]),
  };
  const bin = deflateSync(strToU8(JSON.stringify(compacto)), { level: 9 });
  let s = '';
  for (const b of bin) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodificar(texto: string): FaseEditor {
  const b = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
  const bin = Uint8Array.from(b, (ch) => ch.charCodeAt(0));
  const c = JSON.parse(strFromU8(inflateSync(bin)));
  return {
    nome: String(c.n ?? 'Fase compartilhada').slice(0, 40),
    bpm: Number(c.b) || 128,
    musica: Number(c.m) || 0,
    objetos: (c.o as unknown[][]).slice(0, 5000).map(([t, x, y, r, modo, grav, vel, mini, base, altura]) => {
      const o: Objeto = { t: TIPOS[Number(t)] ?? 'bloco', x: Number(x), y: Number(y) };
      if (r) o.r = Number(r);
      if (modo) o.modo = modo as Modo;
      if (grav) o.grav = Number(grav) as 1 | -1;
      if (vel) o.vel = Number(vel);
      if (mini) o.mini = true;
      if (Number(base) >= 0) o.base = Number(base);
      if (altura) o.altura = Number(altura);
      return o;
    }),
  };
}

/* ---------- Editor ---------- */

export function abrirEditor(alvo: HTMLElement, d: Desenho, inicial: FaseEditor, acoes: { testar(f: FaseEditor): void; sair(): void; salvar(f: FaseEditor): void; compartilhar(f: FaseEditor): void }): () => void {
  const f: FaseEditor = { ...inicial, objetos: inicial.objetos.map((o) => ({ ...o })) };
  let item = PALETA[2];
  let arrastando = false;
  let ultimoPonto: { x: number; y: number } | null = null;
  let cursor: { x: number; y: number } | null = null;
  d.cam.x = -2;
  d.cam.y = 0;

  const raiz = document.createElement('div');
  raiz.className = 'editor';
  const nome = Object.assign(document.createElement('input'), { value: f.nome, placeholder: 'Nome da fase', maxLength: 40 });
  nome.oninput = () => (f.nome = nome.value);
  const bpm = document.createElement('select');
  for (const [v, t] of [
    [120, 'Trilha 1 · 120 bpm'],
    [128, 'Trilha 2 · 128 bpm'],
    [140, 'Trilha 3 · 140 bpm'],
    [150, 'Trilha 4 · 150 bpm'],
  ] as const) {
    const op = Object.assign(document.createElement('option'), { value: String(v), textContent: t });
    if (v === f.bpm) op.selected = true;
    bpm.append(op);
  }
  bpm.onchange = () => {
    f.bpm = Number(bpm.value);
    f.musica = bpm.selectedIndex;
  };
  const botao = (texto: string, fn: () => void, cls = 'btn') => Object.assign(document.createElement('button'), { textContent: texto, className: cls, onclick: fn });
  const topo = document.createElement('div');
  topo.className = 'editor-topo';
  topo.append(
    nome,
    bpm,
    botao('▶ Testar', () => acoes.testar(f), 'btn forte'),
    botao('💾 Salvar', () => acoes.salvar(f)),
    botao('🔗 Compartilhar', () => acoes.compartilhar(f)),
    botao('🗑 Limpar', () => {
      if (confirm('Apagar todos os objetos?')) f.objetos = [];
    }),
    botao('✕ Sair', () => acoes.sair()),
  );
  const paleta = document.createElement('div');
  paleta.className = 'editor-paleta';
  const botoesPaleta = PALETA.map((p) => {
    const b = botao('', () => {
      item = p;
      botoesPaleta.forEach((x) => x.classList.toggle('ativo', x === b));
    }, 'paleta-item');
    b.title = p.rotulo;
    b.innerHTML = `<span>${p.icone}</span><small>${p.rotulo}</small>`;
    if (p === item) b.classList.add('ativo');
    return b;
  });
  paleta.append(...botoesPaleta);
  const dica = document.createElement('p');
  dica.className = 'editor-dica';
  dica.textContent = 'Toque para colocar, arraste para pintar vários. Setas ou “Mover” andam pela fase. Clique direito apaga.';
  raiz.append(topo, dica, paleta);
  alvo.append(raiz);

  const mundo = (ev: PointerEvent): { x: number; y: number } => {
    const r = d.canvas.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * d.w;
    const py = ((ev.clientY - r.top) / r.height) * d.h;
    return { x: Math.floor(px / d.cam.esc + d.cam.x), y: Math.floor((d.chaoTela - py) / d.cam.esc + d.cam.y) };
  };

  const aplicar = (p: { x: number; y: number }, apagar: boolean): void => {
    if (p.y < 0 || p.x < 0) return;
    const i = f.objetos.findIndex((o) => Math.floor(o.x) === p.x && Math.floor(o.y) === p.y);
    if (apagar || item.ferramenta === 'apagar') {
      if (i >= 0) f.objetos.splice(i, 1);
      return;
    }
    if (!item.obj) return;
    if (i >= 0) f.objetos.splice(i, 1);
    const o: Objeto = { ...item.obj, x: p.x, y: p.y } as Objeto;
    if (o.t === 'portalModo' && o.modo && CORREDOR[o.modo]) {
      o.base = p.y;
      o.altura = CORREDOR[o.modo];
    }
    f.objetos.push(o);
  };

  const baixo = (ev: PointerEvent): void => {
    ev.preventDefault();
    arrastando = true;
    const p = mundo(ev);
    ultimoPonto = { x: ev.clientX, y: ev.clientY };
    if (item.ferramenta !== 'mover') aplicar(p, ev.button === 2);
  };
  const mover = (ev: PointerEvent): void => {
    cursor = mundo(ev);
    if (!arrastando) return;
    if (item.ferramenta === 'mover' && ultimoPonto) {
      const r = d.canvas.getBoundingClientRect();
      d.cam.x -= ((ev.clientX - ultimoPonto.x) / r.width) * (d.w / d.cam.esc);
      d.cam.y += ((ev.clientY - ultimoPonto.y) / r.height) * (d.h / d.cam.esc);
      d.cam.y = Math.max(0, d.cam.y);
      ultimoPonto = { x: ev.clientX, y: ev.clientY };
    } else aplicar(cursor, ev.buttons === 2);
  };
  const cima = (): void => {
    arrastando = false;
  };
  const tecla = (ev: KeyboardEvent): void => {
    if (ev.target instanceof HTMLInputElement) return;
    const passo = ev.shiftKey ? 10 : 2;
    if (ev.key === 'ArrowRight') d.cam.x += passo;
    else if (ev.key === 'ArrowLeft') d.cam.x = Math.max(-4, d.cam.x - passo);
    else if (ev.key === 'ArrowUp') d.cam.y += 1;
    else if (ev.key === 'ArrowDown') d.cam.y = Math.max(0, d.cam.y - 1);
    else return;
    ev.preventDefault();
  };
  const roda = (ev: WheelEvent): void => {
    d.cam.x = Math.max(-4, d.cam.x + (ev.deltaY + ev.deltaX) / 40);
    ev.preventDefault();
  };
  const semMenu = (ev: Event): void => ev.preventDefault();
  d.canvas.addEventListener('pointerdown', baixo);
  addEventListener('pointermove', mover);
  addEventListener('pointerup', cima);
  addEventListener('keydown', tecla);
  d.canvas.addEventListener('wheel', roda, { passive: false });
  d.canvas.addEventListener('contextmenu', semMenu);

  let vivo = true;
  const desenhar = (agora: number): void => {
    if (!vivo) return;
    requestAnimationFrame(desenhar);
    const fase = paraFase(f);
    fase.objetos.forEach((o, i) => (o.id = i));
    d.fundo(fase, 0, agora / 1000);
    // Grade.
    const c = d.c;
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1;
    for (let x = Math.floor(d.cam.x); x < d.cam.x + d.w / d.cam.esc + 1; x++) {
      c.beginPath();
      c.moveTo(d.sx(x), 0);
      c.lineTo(d.sx(x), d.h);
      c.stroke();
    }
    for (let y = Math.floor(d.cam.y); y < d.cam.y + d.h / d.cam.esc; y++) {
      c.beginPath();
      c.moveTo(0, d.sy(y));
      c.lineTo(d.w, d.sy(y));
      c.stroke();
    }
    d.limites(fase, null);
    d.objetos(fase, agora / 1000, new Set(), new Set(), new Set());
    // Início e fim.
    c.fillStyle = '#4ade80';
    c.fillRect(d.sx(0) - 2, 0, 4, d.chaoTela);
    c.fillStyle = '#facc15';
    c.fillRect(d.sx(fase.comprimento) - 2, 0, 4, d.chaoTela);
    if (cursor && item.ferramenta !== 'mover') {
      c.strokeStyle = item.ferramenta === 'apagar' ? '#ef4444' : '#fff';
      c.lineWidth = 2;
      c.strokeRect(d.sx(cursor.x), d.sy(cursor.y + 1), d.cam.esc, d.cam.esc);
    }
  };
  requestAnimationFrame(desenhar);

  return () => {
    vivo = false;
    raiz.remove();
    d.canvas.removeEventListener('pointerdown', baixo);
    removeEventListener('pointermove', mover);
    removeEventListener('pointerup', cima);
    removeEventListener('keydown', tecla);
    d.canvas.removeEventListener('wheel', roda);
    d.canvas.removeEventListener('contextmenu', semMenu);
  };
}

export { PALETA };
