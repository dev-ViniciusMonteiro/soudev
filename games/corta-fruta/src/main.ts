// Corta Fruta: frutas pulam na tela por cima da sua imagem e você corta com as mãos.
// Lâmina = ponta da mão (indicador do MediaPipe Pose); o corte vale pelo caminho da mão entre dois quadros.

import '../../comum/base.css';
import './estilo.css';
import { Camera, mensagemDeErro } from '../../comum/camera';
import { Palco } from '../../comum/palco';
import { DICAS_CAMERA, type Flutuante, botaoSom, carregando, chiado, desenharFlutuantes, destravarSom, el, guardar, laco, ler, sons, tom } from '../../comum/ui';

type Modo = 'classico' | 'zen';

const FRUTAS: [string, string][] = [
  ['🍉', '#ff3b5c'],
  ['🍊', '#ff9f1c'],
  ['🍎', '#e63946'],
  ['🍋', '#ffe66d'],
  ['🍍', '#ffd23f'],
  ['🍓', '#ff2e63'],
  ['🥝', '#8ac926'],
  ['🍑', '#ffa69e'],
  ['🍇', '#9d4edd'],
  ['🥥', '#f4f1ea'],
];
const BOMBA = '💣';
const MAOS = [
  { ponta: 19, pulso: 15, cor: '#ff3df2' }, // esquerda da pessoa
  { ponta: 20, pulso: 16, cor: '#3df5ff' },
];
const DURACAO_ZEN = 90;

interface Fruta {
  emoji: string;
  suco: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  giro: number;
  ang: number;
  bomba: boolean;
  inicial?: boolean; // a melancia do começo, que fica flutuando
}

interface Metade {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ang: number;
  giro: number;
  corte: number; // ângulo do corte
  lado: number;
  vida: number;
}

interface Gota {
  x: number;
  y: number;
  vx: number;
  vy: number;
  cor: string;
  vida: number;
  tam: number;
}

interface Mancha {
  x: number;
  y: number;
  r: number;
  cor: string;
  vida: number;
}

/* ---------- Emoji pré-desenhado (desenhar texto a cada quadro é lento) ---------- */

const cacheEmoji = new Map<string, HTMLCanvasElement>();
function emojiCanvas(emoji: string, tam: number): HTMLCanvasElement {
  const t = Math.max(16, Math.round(tam / 8) * 8);
  const chave = `${emoji}:${t}`;
  let c = cacheEmoji.get(chave);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(t * 1.3);
    const x = c.getContext('2d')!;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = `${t}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.fillText(emoji, c.width / 2, c.height / 2 + t * 0.05);
    cacheEmoji.set(chave, c);
  }
  return c;
}

/* ---------- Estado ---------- */

const app = document.querySelector('#app') as HTMLElement;
const camera = new Camera();
const palco = new Palco(app);
const tela = el('div', { cls: 'tela' });
const pontosEl = el('span', { cls: 'pontos', textContent: '0' });
const infoEl = el('span', { cls: 'info' });
const hud = el('div', { cls: 'hud', hidden: true }, pontosEl, infoEl, el('span', { cls: 'espaco' }), botaoSom(), el('button', { cls: 'icone', textContent: '✕', title: 'Sair', onclick: () => menu() }));
const aviso = el('div', { cls: 'aviso-camera', hidden: true });
app.append(hud, aviso, tela);

let modo: Modo = ler('fruta.modo', 'classico' as Modo);
let frutas: Fruta[] = [];
let metades: Metade[] = [];
let gotas: Gota[] = [];
let manchas: Mancha[] = [];
let textos: Flutuante[] = [];
let rastros: { x: number; y: number; t: number }[][] = [[], []];
let pontos = 0;
let vidas = 3;
let jogando = false;
let comecou = false;
let tempo = 0;
let proximaOnda = 0;
let pararLaco: (() => void) | null = null;
let ultimoCorte = { t: 0, n: 0 };

/* ---------- Menu ---------- */

function menu(erro = ''): void {
  pararLaco?.();
  jogando = false;
  hud.hidden = true;
  aviso.hidden = true;
  const recorde = ler<Record<string, number>>('fruta.recordes', {});
  const opcao = (m: Modo, titulo: string, sub: string) =>
    el('button', { cls: m === modo ? 'opcao ativa' : 'opcao', onclick: () => ((modo = m), guardar('fruta.modo', m), menu()) }, el('strong', { textContent: titulo }), el('small', { textContent: `${sub} · recorde ${recorde[m] ?? 0}` }));
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: 'Corta Fruta' }),
      el('p', { cls: 'sub', textContent: 'As frutas pulam por cima da sua imagem e você corta com as mãos, pela câmera.' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : null,
      el('div', { cls: 'opcoes' }, opcao('classico', '🍉 Clássico', '3 vidas, cuidado com as bombas'), opcao('zen', '🧘 Zen', `${DURACAO_ZEN} segundos, sem bombas`)),
      el('button', { cls: 'btn forte grande', textContent: 'Ligar a câmera e jogar', onclick: () => void comecar() }),
      el(
        'details',
        { cls: 'dicas' },
        el('summary', { textContent: 'Como jogar e dicas' }),
        el(
          'ul',
          {},
          ...['Fique a 1,5–2 m da câmera, com os braços dentro da imagem.', 'Passe a mão rápido pela fruta: devagar não corta.', 'Cortar várias frutas no mesmo golpe vale combo.', ...DICAS_CAMERA].map((t) => el('li', { textContent: t })),
        ),
      ),
    ),
  );
  tela.hidden = false;
}

async function comecar(): Promise<void> {
  destravarSom();
  const progresso = carregando(tela, 'Preparando…');
  try {
    await camera.iniciar('pose', progresso, { filtro: [1.5, 3] });
  } catch (e) {
    console.error(e);
    camera.parar();
    menu(mensagemDeErro(e));
    return;
  }
  tela.hidden = true;
  hud.hidden = false;
  novaPartida();
  pararLaco?.();
  pararLaco = laco(quadro);
}

function novaPartida(): void {
  frutas = [];
  metades = [];
  gotas = [];
  manchas = [];
  textos = [];
  rastros = [[], []];
  pontos = 0;
  vidas = 3;
  tempo = 0;
  comecou = false;
  jogando = true;
  // A melancia de abertura: corte para começar.
  frutas.push({ emoji: '🍉', suco: '#ff3b5c', x: palco.w / 2, y: palco.h * 0.45, vx: 0, vy: 0, r: palco.u * 11, giro: 0.4, ang: 0, bomba: false, inicial: true });
  atualizarHud();
}

function atualizarHud(): void {
  pontosEl.textContent = String(pontos);
  infoEl.textContent = !comecou ? 'Corte a melancia para começar' : modo === 'classico' ? '❤️'.repeat(vidas) + '🖤'.repeat(3 - vidas) : `${Math.max(0, Math.ceil(DURACAO_ZEN - tempo))} s`;
}

/* ---------- Ondas de frutas ---------- */

function lancarOnda(): void {
  const { w, h, u } = palco;
  const nivel = Math.min(1, pontos / 120);
  const qtd = 1 + Math.floor(Math.random() * (2 + nivel * 4));
  for (let i = 0; i < qtd; i++) {
    const bomba = modo === 'classico' && Math.random() < 0.1 + nivel * 0.08 && i === qtd - 1;
    const [emoji, suco] = FRUTAS[Math.floor(Math.random() * FRUTAS.length)];
    const x = w * (0.15 + Math.random() * 0.7);
    // Velocidade para o topo do arco ficar entre 20% e 45% da altura da tela.
    const g = h * 1.25;
    const subida = h * (0.55 + Math.random() * 0.25);
    frutas.push({
      emoji: bomba ? BOMBA : emoji,
      suco: bomba ? '#ffffff' : suco,
      x,
      y: h + u * 8,
      vx: (w / 2 - x) * (0.25 + Math.random() * 0.3),
      vy: -Math.sqrt(2 * g * subida),
      r: u * (bomba ? 6.5 : 6 + Math.random() * 2.5),
      giro: (Math.random() - 0.5) * 4,
      ang: 0,
      bomba,
    });
  }
  proximaOnda = tempo + Math.max(0.9, 2.2 - nivel * 1.1) + Math.random() * 0.6;
}

/* ---------- Corte ---------- */

/** Distância do ponto ao segmento (para ver se a lâmina passou pela fruta). */
function distSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

function cortar(f: Fruta, dx: number, dy: number, agora: number): void {
  const corte = Math.atan2(dy, dx);
  frutas = frutas.filter((x) => x !== f);
  if (f.bomba) {
    sons.explosao();
    for (let i = 0; i < 70; i++) gotas.push(gota(f.x, f.y, i % 2 ? '#ffd166' : '#ff4d4d', palco.u * 1.6));
    textos.push({ texto: 'BUM!', x: f.x, y: f.y, cor: '#ff4d4d', vida: 1.2, tamanho: 9 });
    if (modo === 'classico') fim();
    return;
  }
  chiado(0.12, 3200, 0.35);
  tom(900, 0.08, 'triangle', 0.06, 0, 400);
  for (const lado of [-1, 1]) {
    const n = corte + Math.PI / 2;
    metades.push({ emoji: f.emoji, x: f.x, y: f.y, vx: f.vx + Math.cos(n) * lado * palco.u * 25, vy: f.vy * 0.3 + Math.sin(n) * lado * palco.u * 25, r: f.r, ang: f.ang, giro: f.giro + lado * 3, corte, lado, vida: 1.6 });
  }
  for (let i = 0; i < 18; i++) gotas.push(gota(f.x, f.y, f.suco, palco.u * 1.1));
  manchas.push({ x: f.x, y: f.y, r: f.r * (1.2 + Math.random() * 0.6), cor: f.suco, vida: 2.5 });
  if (f.inicial) {
    comecou = true;
    proximaOnda = tempo + 0.6;
    sons.acerto();
    atualizarHud();
    return;
  }
  // Várias frutas no mesmo golpe (até 250 ms) somam combo.
  ultimoCorte = agora - ultimoCorte.t < 250 ? { t: agora, n: ultimoCorte.n + 1 } : { t: agora, n: 1 };
  pontos += 1;
  if (ultimoCorte.n >= 3) {
    pontos += 1;
    textos.push({ texto: `Combo ×${ultimoCorte.n}!`, x: f.x, y: f.y - f.r, cor: '#ffd23f', vida: 1, tamanho: 6 });
    if (ultimoCorte.n === 3) sons.moeda();
  }
  atualizarHud();
}

const gota = (x: number, y: number, cor: string, tam: number): Gota => {
  const a = Math.random() * Math.PI * 2;
  const v = palco.u * (10 + Math.random() * 45);
  return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - palco.u * 10, cor, vida: 0.5 + Math.random() * 0.5, tam: tam * (0.5 + Math.random()) };
};

function fim(): void {
  jogando = false;
  const recordes = ler<Record<string, number>>('fruta.recordes', {});
  const novo = pontos > (recordes[modo] ?? 0);
  if (novo) guardar('fruta.recordes', { ...recordes, [modo]: pontos });
  setTimeout(novo ? sons.vitoria : sons.derrota, 300);
  setTimeout(() => {
    tela.replaceChildren(
      el(
        'div',
        { cls: 'caixa centro' },
        el('h2', { textContent: novo ? 'Novo recorde!' : modo === 'zen' ? 'Fim do tempo' : 'Fim de jogo' }),
        el('div', { cls: 'grande-numero', textContent: `${pontos} frutas` }),
        el('p', { cls: 'recorde', textContent: `Recorde: ${Math.max(pontos, recordes[modo] ?? 0)}` }),
        el('button', { cls: 'btn forte grande', textContent: 'Jogar de novo', onclick: () => ((tela.hidden = true), novaPartida()) }),
        el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
      ),
    );
    tela.hidden = false;
  }, 1100);
}

/* ---------- Quadro ---------- */

function quadro(agora: number, dt: number): void {
  const novo = camera.atualizar(agora);
  const { ctx, u, w, h } = palco;
  palco.desenharVideo(camera.video, 0.32);

  // Pausa se não estiver vendo ninguém (sem perder vida por isso).
  const perdido = agora - camera.vistoEm > 1500;
  aviso.hidden = !perdido || !jogando;
  aviso.textContent = 'Não estou te vendo: fique de frente para a câmera, com os braços na imagem.';
  const passo = jogando && perdido ? 0 : dt; // pausado: as frutas param no ar

  // Lâminas: ponta da mão (ou pulso, se a ponta sumir).
  const pose = camera.leitura.grupos[0];
  MAOS.forEach((m, i) => {
    const r = rastros[i];
    const p = pose ? (pose[m.ponta].vis > 0.5 ? pose[m.ponta] : pose[m.pulso].vis > 0.5 ? pose[m.pulso] : null) : null;
    if (p && novo) r.unshift({ ...palco.tela(p), t: agora });
    else if (!p) r.length = 0;
    while (r.length && agora - r[r.length - 1].t > 140) r.pop();
    if (r.length > 12) r.length = 12;
    // Corte: segmento entre as duas últimas posições, com velocidade mínima.
    if (jogando && novo && r.length >= 2) {
      const [a, b] = r;
      const dtl = Math.max(16, a.t - b.t) / 1000;
      const vel = Math.hypot(a.x - b.x, a.y - b.y) / dtl;
      if (vel > u * 70) for (const f of [...frutas]) if (distSegmento(f.x, f.y, b.x, b.y, a.x, a.y) < f.r * 0.95) cortar(f, a.x - b.x, a.y - b.y, agora);
    }
  });

  // Física.
  if (jogando && !perdido) {
    tempo += passo;
    if (comecou && tempo >= proximaOnda) lancarOnda();
    if (modo === 'zen' && comecou && tempo >= DURACAO_ZEN) fim();
    if (modo === 'zen' && comecou) atualizarHud();
  }
  const g = h * 1.25;
  for (const f of frutas) {
    if (f.inicial) {
      f.y = h * 0.45 + Math.sin(agora / 500) * u * 2;
      f.ang = Math.sin(agora / 900) * 0.2;
      continue;
    }
    f.vy += g * passo;
    f.x += f.vx * passo;
    f.y += f.vy * passo;
    f.ang += f.giro * passo;
  }
  // Fruta que caiu sem ser cortada: perde vida no clássico.
  const caiu = frutas.filter((f) => !f.inicial && f.vy > 0 && f.y > h + f.r * 2);
  if (caiu.length) {
    frutas = frutas.filter((f) => !caiu.includes(f));
    if (jogando && modo === 'classico') {
      for (const f of caiu) {
        if (f.bomba || !jogando) continue;
        vidas--;
        sons.erro();
        textos.push({ texto: '✖', x: Math.min(w - u * 6, Math.max(u * 6, f.x)), y: h - u * 8, cor: '#ff4d4d', vida: 1, tamanho: 9 });
        atualizarHud();
        if (vidas <= 0) fim();
      }
    }
  }
  for (const m of metades) {
    m.vy += g * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.ang += m.giro * dt;
    m.vida -= dt;
  }
  metades = metades.filter((m) => m.vida > 0 && m.y < h + m.r * 3);
  for (const p of gotas) {
    p.vy += g * 0.6 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vida -= dt;
  }
  gotas = gotas.filter((p) => p.vida > 0);

  // Desenho: manchas de suco, frutas, metades, gotas, lâminas e textos.
  for (const m of manchas) {
    m.vida -= dt;
    ctx.globalAlpha = Math.max(0, Math.min(0.45, m.vida / 3));
    ctx.fillStyle = m.cor;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  manchas = manchas.filter((m) => m.vida > 0);
  for (const f of frutas) {
    const img = emojiCanvas(f.emoji, f.r * 2.1);
    const s = (f.r * 2.1) / (img.width / 1.3);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang);
    if (f.inicial) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = u * 4;
    }
    ctx.drawImage(img, (-img.width / 2) * s, (-img.height / 2) * s, img.width * s, img.height * s);
    ctx.restore();
  }
  for (const m of metades) {
    const img = emojiCanvas(m.emoji, m.r * 2.1);
    const s = (m.r * 2.1) / (img.width / 1.3);
    ctx.save();
    ctx.globalAlpha = Math.min(1, m.vida * 1.5);
    ctx.translate(m.x, m.y);
    ctx.rotate(m.corte);
    ctx.beginPath();
    ctx.rect(-m.r * 2, m.lado < 0 ? -m.r * 2 : 0, m.r * 4, m.r * 2);
    ctx.clip();
    ctx.rotate(m.ang - m.corte);
    ctx.drawImage(img, (-img.width / 2) * s, (-img.height / 2) * s, img.width * s, img.height * s);
    ctx.restore();
  }
  for (const p of gotas) {
    ctx.globalAlpha = Math.min(1, p.vida * 2);
    ctx.fillStyle = p.cor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  MAOS.forEach((m, i) => {
    const r = rastros[i];
    if (r.length < 2) {
      if (r[0]) {
        ctx.fillStyle = m.cor;
        ctx.beginPath();
        ctx.arc(r[0].x, r[0].y, u * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = m.cor;
    ctx.shadowBlur = u * 3;
    for (let k = 0; k < r.length - 1; k++) {
      ctx.strokeStyle = k === 0 ? '#ffffff' : m.cor;
      ctx.globalAlpha = 1 - k / r.length;
      ctx.lineWidth = u * 2.2 * (1 - k / r.length) + u * 0.3;
      ctx.beginPath();
      ctx.moveTo(r[k].x, r[k].y);
      ctx.lineTo(r[k + 1].x, r[k + 1].y);
      ctx.stroke();
    }
    ctx.restore();
  });
  textos = desenharFlutuantes(ctx, textos, dt, u);
}

menu();
