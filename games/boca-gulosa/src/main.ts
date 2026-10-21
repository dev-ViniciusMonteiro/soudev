// Boca Gulosa: comida cai do alto e você come abrindo a boca de verdade, mexendo a cabeça para ir até ela.
// Detector de rosto do MediaPipe: posição da boca pelos pontos dos lábios e abertura pela expressão "jawOpen".

import '../../comum/base.css';
import './estilo.css';
import { Camera, type Ponto, mensagemDeErro } from '../../comum/camera';
import { Palco } from '../../comum/palco';
import { DICAS_CAMERA, type Flutuante, botaoSom, carregando, chiado, desenharFlutuantes, destravarSom, el, guardar, laco, ler, sons, tom } from '../../comum/ui';

type Modo = 'classico' | 'relogio';

const BOAS = ['🍩', '🍪', '🍕', '🍔', '🍟', '🍫', '🍬', '🍭', '🍓', '🍌', '🍇', '🍉', '🧁', '🌮'];
const RUINS: [string, string][] = [
  ['🌶️', 'Ardeu!'],
  ['🐛', 'Eca, uma lagarta!'],
  ['🧦', 'Uma meia?!'],
];
const ESTRELA = '⭐';
const TEMPO_RELOGIO = 60;
// Pontos do rosto: lábio de cima e de baixo (parte de dentro), cantos da boca e cantos externos dos olhos.
const LABIO_CIMA = 13;
const LABIO_BAIXO = 14;
const CANTO_E = 61;
const CANTO_D = 291;
const OLHO_E = 33;
const OLHO_D = 263;

interface Item {
  emoji: string;
  tipo: 'boa' | 'ruim' | 'estrela';
  aviso?: string;
  x: number;
  y: number;
  vy: number;
  vx: number;
  r: number;
  ang: number;
  giro: number;
  quicou?: boolean;
}

interface Migalha {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  cor: string;
}

const app = document.querySelector('#app') as HTMLElement;
const camera = new Camera();
const palco = new Palco(app);
const tela = el('div', { cls: 'tela' });
const pontosEl = el('span', { cls: 'pontos', textContent: '0' });
const infoEl = el('span', { cls: 'info' });
const hud = el('div', { cls: 'hud', hidden: true }, pontosEl, infoEl, el('span', { cls: 'espaco' }), botaoSom(), el('button', { cls: 'icone', textContent: '✕', title: 'Sair', onclick: () => menu() }));
const aviso = el('div', { cls: 'aviso-camera', hidden: true });
app.append(hud, aviso, tela);

let modo: Modo = ler('boca.modo', 'classico' as Modo);
let pararLaco: (() => void) | null = null;
let itens: Item[] = [];
let migalhas: Migalha[] = [];
let textos: Flutuante[] = [];
let pontos = 0;
let vidas = 3;
let combo = 0;
let tempo = 0;
let proximo = 0;
let jogando = false;
let comecou = false;
let abertaAntes = false;
let mastigando = 0;

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

/* ---------- Menu ---------- */

function menu(erro = ''): void {
  pararLaco?.();
  jogando = false;
  hud.hidden = true;
  aviso.hidden = true;
  const recorde = ler<Record<string, number>>('boca.recordes', {});
  const opcao = (m: Modo, titulo: string, sub: string) =>
    el('button', { cls: m === modo ? 'opcao ativa' : 'opcao', onclick: () => ((modo = m), guardar('boca.modo', m), menu()) }, el('strong', { textContent: titulo }), el('small', { textContent: `${sub} · recorde ${recorde[m] ?? 0}` }));
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: 'Boca Gulosa' }),
      el('p', { cls: 'sub', textContent: 'A comida cai do céu: mexa a cabeça até ela e abra a boca para comer. Pimenta, lagarta e meia, não!' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : null,
      el('div', { cls: 'opcoes' }, opcao('classico', '😋 Clássico', '3 vidas e cada vez mais rápido'), opcao('relogio', '⏱️ Contra o relógio', `${TEMPO_RELOGIO} segundos para comer tudo`)),
      el('button', { cls: 'btn forte grande', textContent: 'Ligar a câmera e jogar', onclick: () => void comecar() }),
      el(
        'details',
        { cls: 'dicas' },
        el('summary', { textContent: 'Dicas' }),
        el(
          'ul',
          {},
          ...[
            'Fique a uns 50 cm a 1 m da câmera, de frente, com o rosto bem iluminado.',
            'Boca aberta come; fechada, a comida bate e cai. Use isso contra a pimenta!',
            'A estrela vale 50 pontos, e comer em sequência aumenta o multiplicador.',
            'Funciona sentado e com o celular na mão.',
            ...DICAS_CAMERA,
          ].map((t) => el('li', { textContent: t })),
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
    await camera.iniciar('rosto', progresso, { filtro: [1.5, 2.5] });
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
  itens = [];
  migalhas = [];
  textos = [];
  pontos = 0;
  vidas = 3;
  combo = 0;
  tempo = 0;
  proximo = 0;
  comecou = false;
  jogando = true;
  atualizarHud();
}

const mult = (): number => (combo >= 15 ? 4 : combo >= 8 ? 3 : combo >= 4 ? 2 : 1);

function atualizarHud(): void {
  pontosEl.textContent = String(pontos);
  const extra = mult() > 1 ? ` · ×${mult()}` : '';
  infoEl.textContent = !comecou ? 'Abra a boca para começar' : modo === 'classico' ? '❤️'.repeat(vidas) + '🖤'.repeat(3 - vidas) + extra : `${Math.max(0, Math.ceil(TEMPO_RELOGIO - tempo))} s${extra}`;
}

/* ---------- Boca ---------- */

interface Boca {
  x: number;
  y: number;
  largura: number; // largura da boca em pixels
  rosto: number; // distância entre os olhos (escala do rosto)
  aberta: boolean;
  abertura: number; // 0..1
}

function lerBoca(pts: Ponto[] | undefined, expr: Record<string, number> | undefined): Boca | null {
  if (!pts || pts.length < 300) return null;
  const t = (i: number) => palco.tela(pts[i]);
  const cima = t(LABIO_CIMA);
  const baixo = t(LABIO_BAIXO);
  const e = t(CANTO_E);
  const d = t(CANTO_D);
  const rosto = Math.hypot(t(OLHO_E).x - t(OLHO_D).x, t(OLHO_E).y - t(OLHO_D).y);
  const largura = Math.hypot(e.x - d.x, e.y - d.y);
  // Abertura pela expressão do modelo; sem ela, pela distância entre os lábios em relação ao rosto.
  const jaw = expr?.jawOpen;
  const abertura = jaw ?? Math.min(1, Math.hypot(cima.x - baixo.x, cima.y - baixo.y) / (rosto * 0.5));
  // Com histerese: abre acima de 0,32 e só fecha abaixo de 0,22 (não pisca entre aberto e fechado).
  const aberta = abertaAntes ? abertura > 0.22 : abertura > 0.32;
  abertaAntes = aberta;
  return { x: (cima.x + baixo.x) / 2, y: (cima.y + baixo.y) / 2, largura, rosto, aberta, abertura };
}

/* ---------- Comida ---------- */

function soltar(b: Boca | null): void {
  const { w, u } = palco;
  const nivel = modo === 'classico' ? Math.min(1, tempo / 90) : 0.5;
  const sorteio = Math.random();
  const ruim = sorteio < 0.18 + nivel * 0.12;
  const estrela = !ruim && sorteio > 0.95;
  const [emoji, avisoRuim] = ruim ? RUINS[Math.floor(Math.random() * RUINS.length)] : [estrela ? ESTRELA : BOAS[Math.floor(Math.random() * BOAS.length)], undefined];
  const r = (b ? b.rosto * 0.42 : u * 7) * (estrela ? 0.9 : 1);
  // Cai numa faixa alcançável: perto de onde a boca está, sem sair da tela.
  const centro = b ? b.x : w / 2;
  const faixa = w * 0.32;
  const x = Math.max(r * 1.5, Math.min(w - r * 1.5, centro + (Math.random() * 2 - 1) * faixa));
  itens.push({ emoji, tipo: ruim ? 'ruim' : estrela ? 'estrela' : 'boa', aviso: avisoRuim, x, y: -r * 2, vx: (Math.random() - 0.5) * u * 4, vy: palco.h * (0.18 + nivel * 0.22 + Math.random() * 0.08), r, ang: 0, giro: (Math.random() - 0.5) * 2 });
  proximo = tempo + Math.max(0.45, (modo === 'relogio' ? 0.75 : 1.3) - nivel * 0.6) + Math.random() * 0.4;
}

function comer(i: Item, b: Boca): void {
  itens = itens.filter((x) => x !== i);
  mastigando = 0.35;
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2;
    migalhas.push({ x: b.x, y: b.y, vx: Math.cos(a) * palco.u * 25, vy: Math.sin(a) * palco.u * 25 - palco.u * 10, vida: 0.6, cor: i.tipo === 'ruim' ? '#ff4d4d' : '#ffd166' });
  }
  if (i.tipo === 'ruim') {
    combo = 0;
    sons.erro();
    textos.push({ texto: i.aviso ?? 'Eca!', x: b.x, y: b.y - b.rosto, cor: '#ff4d6d', vida: 1.2, tamanho: 6 });
    if (modo === 'classico') {
      vidas--;
      if (vidas <= 0) fim();
    } else pontos = Math.max(0, pontos - 30);
  } else {
    combo++;
    const ganho = (i.tipo === 'estrela' ? 50 : 10) * mult();
    pontos += ganho;
    chiado(0.08, 900, 0.25, 'lowpass');
    chiado(0.08, 900, 0.2, 'lowpass', 0.12);
    if (i.tipo === 'estrela') sons.moeda();
    else tom(520 + Math.min(combo, 20) * 30, 0.08, 'triangle', 0.06);
    textos.push({ texto: `+${ganho}`, x: b.x, y: b.y - b.rosto * 0.8, cor: i.tipo === 'estrela' ? '#ffd23f' : '#ffffff', vida: 0.8, tamanho: 4.5 });
  }
  atualizarHud();
}

function fim(): void {
  if (!jogando) return;
  jogando = false;
  const recordes = ler<Record<string, number>>('boca.recordes', {});
  const novo = pontos > (recordes[modo] ?? 0);
  if (novo) guardar('boca.recordes', { ...recordes, [modo]: pontos });
  setTimeout(novo ? sons.vitoria : sons.derrota, 300);
  setTimeout(() => {
    tela.replaceChildren(
      el(
        'div',
        { cls: 'caixa centro' },
        el('div', { cls: 'grande-numero', textContent: '😋' }),
        el('h2', { textContent: novo ? 'Novo recorde!' : modo === 'relogio' ? 'Tempo esgotado!' : 'Fim de jogo' }),
        el('div', { cls: 'grande-numero', textContent: `${pontos} pontos` }),
        el('p', { cls: 'recorde', textContent: `Recorde: ${Math.max(pontos, recordes[modo] ?? 0)}` }),
        el('button', { cls: 'btn forte grande', textContent: 'Jogar de novo', onclick: () => ((tela.hidden = true), novaPartida()) }),
        el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
      ),
    );
    tela.hidden = false;
  }, 1000);
}

/* ---------- Quadro ---------- */

function quadro(agora: number, dt: number): void {
  camera.atualizar(agora);
  const { ctx, u, h } = palco;
  palco.desenharVideo(camera.video, 0.18);
  const b = lerBoca(camera.leitura.grupos[0], camera.leitura.expressoes[0]);
  const perdido = agora - camera.vistoEm > 1200 || !b;
  aviso.hidden = !perdido || !jogando;
  aviso.textContent = 'Não estou vendo seu rosto: fique de frente, com luz no rosto.';

  // Começa quando a pessoa abre a boca pela primeira vez.
  if (jogando && !comecou && b?.aberta) {
    comecou = true;
    sons.acerto();
    atualizarHud();
  }
  const passo = jogando && comecou && !perdido ? dt : 0;
  if (passo) {
    tempo += passo;
    if (tempo >= proximo) soltar(b);
    if (modo === 'relogio') {
      atualizarHud();
      if (tempo >= TEMPO_RELOGIO) fim();
    }
  }

  for (const i of [...itens]) {
    i.y += i.vy * passo;
    i.x += i.vx * passo;
    i.ang += i.giro * passo;
    if (i.quicou) i.vy += h * 1.8 * passo;
    if (b && !i.quicou && jogando) {
      const dist = Math.hypot(i.x - b.x, i.y - b.y);
      if (dist < Math.max(b.largura * 0.75, i.r)) {
        if (b.aberta) comer(i, b);
        else {
          // Boca fechada: bate e quica para o lado.
          i.quicou = true;
          i.vy = -h * 0.5;
          i.vx = (i.x < b.x ? -1 : 1) * u * 40;
          if (i.tipo === 'ruim') textos.push({ texto: 'Ufa!', x: b.x, y: b.y - b.rosto, cor: '#4ade80', vida: 0.8, tamanho: 4.5 });
          else {
            combo = 0;
            tom(300, 0.1, 'square', 0.05);
            atualizarHud();
          }
        }
      }
    }
  }
  // Comida boa que passou direto quebra a sequência.
  const passou = itens.filter((i) => i.y > h + i.r * 2);
  if (passou.some((i) => i.tipo !== 'ruim' && !i.quicou)) {
    combo = 0;
    atualizarHud();
  }
  itens = itens.filter((i) => !passou.includes(i));

  for (const i of itens) {
    const img = emojiCanvas(i.emoji, i.r * 2);
    const s = (i.r * 2) / (img.width / 1.3);
    ctx.save();
    ctx.translate(i.x, i.y);
    ctx.rotate(i.ang);
    if (i.tipo === 'estrela') {
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = u * 4;
    }
    ctx.drawImage(img, (-img.width / 2) * s, (-img.height / 2) * s, img.width * s, img.height * s);
    ctx.restore();
  }
  for (const m of migalhas) {
    m.vy += h * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vida -= dt;
    ctx.globalAlpha = Math.max(0, m.vida * 1.6);
    ctx.fillStyle = m.cor;
    ctx.beginPath();
    ctx.arc(m.x, m.y, u * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  migalhas = migalhas.filter((m) => m.vida > 0);

  // Indicador da boca: anel verde aberto, branco fechado; "mastiga" depois de comer.
  if (b) {
    mastigando = Math.max(0, mastigando - dt);
    const raio = b.largura * 0.75 * (1 + Math.sin(mastigando * 40) * 0.08 * Math.sign(mastigando));
    ctx.save();
    ctx.lineWidth = u * 0.7;
    ctx.strokeStyle = b.aberta ? '#4ade80' : 'rgba(255,255,255,0.6)';
    ctx.shadowColor = b.aberta ? '#4ade80' : 'transparent';
    ctx.shadowBlur = u * 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, raio, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (jogando && !comecou) {
      ctx.save();
      ctx.font = `900 ${u * 5}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = u * 0.8;
      ctx.strokeText('Abra a boca para começar!', palco.w / 2, h * 0.22);
      ctx.fillText('Abra a boca para começar!', palco.w / 2, h * 0.22);
      ctx.restore();
    }
  }
  textos = desenharFlutuantes(ctx, textos, dt, u);
}

menu();
