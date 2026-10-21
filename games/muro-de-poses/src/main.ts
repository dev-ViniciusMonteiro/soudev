// Muro de Poses: um muro vem na sua direção com um buraco no formato de uma pose. Encaixe o corpo antes de ele chegar.
// O buraco é desenhado a partir dos seus ombros e do tamanho dos seus braços, então serve para qualquer pessoa.

import '../../comum/base.css';
import './estilo.css';
import { Camera, type Ponto, mensagemDeErro } from '../../comum/camera';
import { Palco } from '../../comum/palco';
import { DICAS_CAMERA, type Flutuante, botaoSom, carregando, desenharFlutuantes, destravarSom, el, guardar, laco, ler, sons, tom } from '../../comum/ui';
import { POSES, type Pose, anguloDe, difAngulo } from './poses';

type Modo = 'normal' | 'treino';
interface Xy {
  x: number;
  y: number;
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

const muro = document.createElement('canvas');
const ctxMuro = muro.getContext('2d')!;

let modo: Modo = ler('muro.modo', 'normal' as Modo);
let pararLaco: (() => void) | null = null;
let fase: 'posicionar' | 'muro' | 'intervalo' | 'fim' = 'posicionar';
let pose: Pose = POSES[0];
let progresso = 0; // 0 = muro longe, 1 = muro em você
let duracao = 4.5;
let intervalo = 0;
let pontos = 0;
let vidas = 3;
let muros = 0;
let sequencia = 0;
let prontoDesde = 0;
let tremor = 0;
let flash: { cor: string; vida: number } | null = null;
let encaixeRecente = 0; // momento do último quadro em que a pose estava toda certa
let textos: Flutuante[] = [];
// Comprimento dos seus braços em larguras de ombro (atualizado aos poucos).
const braco = { l1: 0.85, l2: 0.75 };

/* ---------- Menu ---------- */

function menu(erro = ''): void {
  pararLaco?.();
  hud.hidden = true;
  aviso.hidden = true;
  const recorde = ler<Record<string, number>>('muro.recordes', {});
  const opcao = (m: Modo, titulo: string, sub: string) =>
    el('button', { cls: m === modo ? 'opcao ativa' : 'opcao', onclick: () => ((modo = m), guardar('muro.modo', m), menu()) }, el('strong', { textContent: titulo }), el('small', { textContent: sub }));
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: 'Muro de Poses' }),
      el('p', { cls: 'sub', textContent: 'Um muro vem na sua direção com um buraco em forma de pose. Faça a pose antes de ele chegar!' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : null,
      el('div', { cls: 'opcoes' }, opcao('normal', '🧱 Desafio', `3 vidas e o muro acelera · recorde ${recorde.normal ?? 0}`), opcao('treino', '🧘 Treino', 'Sem vidas, muro sempre devagar')),
      el('button', { cls: 'btn forte grande', textContent: 'Ligar a câmera e jogar', onclick: () => void comecar() }),
      el(
        'details',
        { cls: 'dicas' },
        el('summary', { textContent: 'Dicas' }),
        el(
          'ul',
          {},
          ...[
            'Afaste-se até aparecer da cintura para cima, com os braços abertos dentro da imagem.',
            'O contorno da pose fica verde em cada parte do braço que já está certa.',
            'Vale o ângulo dos braços, não o tamanho: serve para qualquer altura.',
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
  const progressoEl = carregando(tela, 'Preparando…');
  try {
    await camera.iniciar('pose', progressoEl, { filtro: [1.0, 1.2] });
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
  pontos = 0;
  vidas = 3;
  muros = 0;
  sequencia = 0;
  prontoDesde = 0;
  fase = 'posicionar';
  textos = [];
  atualizarHud();
}

function atualizarHud(): void {
  pontosEl.textContent = String(pontos);
  infoEl.textContent = modo === 'treino' ? `${muros} muros` : '❤️'.repeat(vidas) + '🖤'.repeat(3 - vidas);
}

function proximoMuro(): void {
  const opcoes = POSES.filter((p) => p !== pose);
  pose = opcoes[Math.floor(Math.random() * opcoes.length)];
  duracao = modo === 'treino' ? 5.5 : Math.max(2.3, 4.6 - muros * 0.13);
  progresso = 0;
  encaixeRecente = 0;
  fase = 'muro';
  tom(196, 0.4, 'sawtooth', 0.05, 0, 392);
}

/* ---------- Corpo e pose alvo ---------- */

interface Corpo {
  ombroE: Xy;
  ombroD: Xy;
  cotE: Xy | null;
  cotD: Xy | null;
  pulE: Xy | null;
  pulD: Xy | null;
  nariz: Xy | null;
  sw: number; // largura dos ombros em pixels
}

function lerCorpo(pts: Ponto[] | undefined): Corpo | null {
  if (!pts || pts[11].vis < 0.5 || pts[12].vis < 0.5) return null;
  const t = (i: number): Xy | null => (pts[i].vis >= 0.5 ? palco.tela(pts[i]) : null);
  const ombroE = palco.tela(pts[11]);
  const ombroD = palco.tela(pts[12]);
  const sw = Math.hypot(ombroE.x - ombroD.x, ombroE.y - ombroD.y);
  if (sw < 10) return null;
  const c: Corpo = { ombroE, ombroD, cotE: t(13), cotD: t(14), pulE: t(15), pulD: t(16), nariz: t(0), sw };
  // Mede o tamanho dos braços quando eles aparecem bem (média que muda devagar).
  for (const [o, cot, pul] of [
    [ombroE, c.cotE, c.pulE],
    [ombroD, c.cotD, c.pulD],
  ] as const) {
    if (cot && pul) {
      braco.l1 += (Math.min(1.3, Math.max(0.5, Math.hypot(cot.x - o.x, cot.y - o.y) / sw)) - braco.l1) * 0.02;
      braco.l2 += (Math.min(1.2, Math.max(0.45, Math.hypot(pul.x - cot.x, pul.y - cot.y) / sw)) - braco.l2) * 0.02;
    }
  }
  return c;
}

/** Ossos da pose alvo encaixados nos seus ombros (com a inclinação da pose, se houver). */
function alvo(c: Corpo, p: Pose): { ombroE: Xy; ombroD: Xy; ossos: [Xy, Xy][]; cabeca: Xy } {
  const meio = { x: (c.ombroE.x + c.ombroD.x) / 2, y: (c.ombroE.y + c.ombroD.y) / 2 };
  const inc = ((p.inclinacao ?? 0) * Math.PI) / 180;
  const meia = { x: (Math.cos(inc) * c.sw) / 2, y: (Math.sin(inc) * c.sw) / 2 };
  const ombroE = { x: meio.x - meia.x, y: meio.y - meia.y };
  const ombroD = { x: meio.x + meia.x, y: meio.y + meia.y };
  const passo = (de: Xy, graus: number, comp: number): Xy => ({ x: de.x + Math.cos((graus * Math.PI) / 180) * comp * c.sw, y: de.y + Math.sin((graus * Math.PI) / 180) * comp * c.sw });
  const cotE = passo(ombroE, p.esq[0], braco.l1);
  const pulE = passo(cotE, p.esq[1], braco.l2);
  const cotD = passo(ombroD, p.dir[0], braco.l1);
  const pulD = passo(cotD, p.dir[1], braco.l2);
  // Cabeça acima do meio dos ombros, perpendicular à linha deles.
  const cabeca = { x: meio.x + Math.sin(inc) * c.sw * 0.8, y: meio.y - Math.cos(inc) * c.sw * 0.8 };
  return {
    ombroE,
    ombroD,
    ossos: [
      [ombroE, cotE],
      [cotE, pulE],
      [ombroD, cotD],
      [cotD, pulD],
    ],
    cabeca,
  };
}

/** Quais partes estão certas: [braço esq, antebraço esq, braço dir, antebraço dir, inclinação]. */
function conferir(c: Corpo, p: Pose): boolean[] {
  const tol = modo === 'treino' ? 34 : 28;
  const ang = (a: Xy | null, b: Xy | null): number | null => (a && b ? anguloDe(a.x, a.y, b.x, b.y) : null);
  const ok = (medido: number | null, esperado: number): boolean => medido !== null && difAngulo(medido, esperado) <= tol;
  const r = [ok(ang(c.ombroE, c.cotE), p.esq[0]), ok(ang(c.cotE, c.pulE), p.esq[1]), ok(ang(c.ombroD, c.cotD), p.dir[0]), ok(ang(c.cotD, c.pulD), p.dir[1])];
  if (p.inclinacao !== undefined) {
    const inc = (Math.atan2(c.ombroD.y - c.ombroE.y, c.ombroD.x - c.ombroE.x) * 180) / Math.PI;
    r.push(Math.abs(inc - p.inclinacao) <= 9);
  }
  return r;
}

/* ---------- Desenho ---------- */

function desenharMuro(c: Corpo, a: ReturnType<typeof alvo>, prog: number): void {
  const { w, h, ctx } = palco;
  if (muro.width !== w || muro.height !== h) {
    muro.width = w;
    muro.height = h;
  }
  // Muro de tijolos neon com o buraco recortado (destination-out).
  const m = ctxMuro;
  m.globalCompositeOperation = 'source-over';
  const g = m.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2b0f4d');
  g.addColorStop(1, '#5a1a6e');
  m.fillStyle = g;
  m.fillRect(0, 0, w, h);
  const tij = palco.u * 7;
  m.strokeStyle = 'rgba(255, 120, 230, 0.35)';
  m.lineWidth = palco.u * 0.35;
  for (let y = 0, linha = 0; y < h; y += tij / 2, linha++) {
    m.beginPath();
    m.moveTo(0, y);
    m.lineTo(w, y);
    for (let x = (linha % 2) * (tij / 2); x < w; x += tij) {
      m.moveTo(x, y);
      m.lineTo(x, y + tij / 2);
    }
    m.stroke();
  }
  m.globalCompositeOperation = 'destination-out';
  m.lineCap = 'round';
  m.lineJoin = 'round';
  m.lineWidth = c.sw * 0.62;
  for (const [p, q] of a.ossos) {
    m.beginPath();
    m.moveTo(p.x, p.y);
    m.lineTo(q.x, q.y);
    m.stroke();
  }
  m.beginPath();
  m.arc(a.cabeca.x, a.cabeca.y, c.sw * 0.5, 0, Math.PI * 2);
  m.fill();
  // Tronco: dos ombros (um pouco mais largo) até o fim da tela.
  const folga = c.sw * 0.28;
  m.beginPath();
  m.moveTo(a.ombroE.x - folga, a.ombroE.y - folga);
  m.lineTo(a.ombroD.x + folga, a.ombroD.y - folga);
  m.lineTo(a.ombroD.x + folga * 1.4, h + 10);
  m.lineTo(a.ombroE.x - folga * 1.4, h + 10);
  m.closePath();
  m.fill();

  // O muro cresce vindo de longe, centrado em você.
  const meio = { x: (c.ombroE.x + c.ombroD.x) / 2, y: (c.ombroE.y + c.ombroD.y) / 2 };
  const s = 0.12 + 0.88 * Math.pow(Math.min(prog, 1.4), 2.2);
  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.35 + prog) * (prog > 1 ? Math.max(0, 1 - (prog - 1) * 3) : 1);
  ctx.translate(meio.x, meio.y);
  ctx.scale(s, s);
  ctx.translate(-meio.x, -meio.y);
  ctx.drawImage(muro, 0, 0);
  ctx.restore();
}

function desenharContorno(c: Corpo, a: ReturnType<typeof alvo>, certos: boolean[]): void {
  const { ctx, u } = palco;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([u * 1.5, u * 1.2]);
  ctx.lineWidth = u * 0.8;
  a.ossos.forEach(([p, q], i) => {
    ctx.strokeStyle = certos[i] ? '#4ade80' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  });
  ctx.strokeStyle = certos[4] === false ? '#ffffff' : 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(a.cabeca.x, a.cabeca.y, c.sw * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function desenharVoce(c: Corpo): void {
  const { ctx, u } = palco;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 1.4;
  ctx.shadowColor = '#3df5ff';
  ctx.shadowBlur = u * 2;
  ctx.strokeStyle = '#3df5ff';
  for (const [p, q] of [
    [c.ombroE, c.ombroD],
    [c.ombroE, c.cotE],
    [c.cotE, c.pulE],
    [c.ombroD, c.cotD],
    [c.cotD, c.pulD],
  ] as [Xy, Xy | null][]) {
    if (!q) continue;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.restore();
}

function texto(t: string, y: number, tam: number, cor: string): void {
  const { ctx, u, w } = palco;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${u * tam}px system-ui, sans-serif`;
  ctx.lineWidth = u * 0.8;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText(t, w / 2, y);
  ctx.fillStyle = cor;
  ctx.fillText(t, w / 2, y);
  ctx.restore();
}

/* ---------- Quadro ---------- */

function quadro(agora: number, dt: number): void {
  camera.atualizar(agora);
  const { ctx, u, w, h } = palco;
  ctx.save();
  if (tremor > 0) {
    tremor -= dt;
    ctx.translate((Math.random() - 0.5) * u * 3, (Math.random() - 0.5) * u * 3);
  }
  palco.desenharVideo(camera.video, 0.3);
  const c = lerCorpo(camera.leitura.grupos[0]);
  const perdido = agora - camera.vistoEm > 1200 || !c;
  aviso.hidden = !perdido || fase === 'fim';
  aviso.textContent = 'Não estou te vendo: fique de frente, com os ombros e os braços na imagem.';

  if (fase === 'posicionar') {
    const tudo = c && c.cotE && c.cotD && c.pulE && c.pulD;
    prontoDesde = tudo ? prontoDesde || agora : 0;
    texto(tudo ? 'Ótimo! Prepare-se…' : 'Abra os braços: ombros, cotovelos e mãos na imagem', h * 0.12 + u * 8, 4.2, '#ffffff');
    if (prontoDesde && agora - prontoDesde > 1200) {
      fase = 'intervalo';
      intervalo = 0.8;
    }
  } else if (fase === 'intervalo' && !perdido) {
    intervalo -= dt;
    if (intervalo <= 0) proximoMuro();
  }

  if (c && (fase === 'muro' || (fase === 'intervalo' && progresso > 1))) {
    const a = alvo(c, pose);
    const certos = conferir(c, pose);
    const tudoCerto = certos.every(Boolean);
    if (tudoCerto) encaixeRecente = agora;
    if (fase === 'muro' && !perdido) progresso += dt / duracao;
    else if (fase === 'intervalo') progresso += dt * 2;
    desenharMuro(c, a, progresso);
    if (fase === 'muro') {
      desenharContorno(c, a, certos);
      texto(pose.nome, h * 0.12 + u * 7, 6, '#ffd23f');
      // Medidor: quantas partes já estão certas.
      const fr = certos.filter(Boolean).length / certos.length;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(w / 2 - u * 20, h * 0.12 + u * 12, u * 40, u * 1.6);
      ctx.fillStyle = fr === 1 ? '#4ade80' : '#3df5ff';
      ctx.fillRect(w / 2 - u * 20, h * 0.12 + u * 12, u * 40 * fr, u * 1.6);
    }
    // Chegou: vale se a pose estava toda certa em algum quadro dos últimos 250 ms.
    if (fase === 'muro' && progresso >= 1) {
      muros++;
      if (agora - encaixeRecente < 250) {
        sequencia++;
        const ganho = 100 + Math.min(5, sequencia - 1) * 20;
        pontos += ganho;
        sons.acerto();
        flash = { cor: '74, 222, 128', vida: 0.35 };
        textos.push({ texto: `Encaixou! +${ganho}`, x: w / 2, y: h * 0.5, cor: '#4ade80', vida: 1.1, tamanho: 7 });
      } else {
        sequencia = 0;
        sons.explosao();
        tremor = 0.35;
        flash = { cor: '255, 60, 90', vida: 0.45 };
        textos.push({ texto: 'Bateu!', x: w / 2, y: h * 0.5, cor: '#ff4d6d', vida: 1.1, tamanho: 9 });
        if (modo === 'normal') vidas--;
      }
      atualizarHud();
      if (modo === 'normal' && vidas <= 0) fim();
      else {
        fase = 'intervalo';
        intervalo = 0.9;
      }
    }
  }
  if (c && fase !== 'fim') desenharVoce(c);
  if (flash) {
    flash.vida -= dt;
    ctx.fillStyle = `rgba(${flash.cor}, ${Math.max(0, flash.vida)})`;
    ctx.fillRect(-u * 5, -u * 5, w + u * 10, h + u * 10);
    if (flash.vida <= 0) flash = null;
  }
  textos = desenharFlutuantes(ctx, textos, dt, u);
  ctx.restore();
}

function fim(): void {
  fase = 'fim';
  const recordes = ler<Record<string, number>>('muro.recordes', {});
  const novo = pontos > (recordes.normal ?? 0);
  if (novo) guardar('muro.recordes', { ...recordes, normal: pontos });
  setTimeout(novo ? sons.vitoria : sons.derrota, 400);
  setTimeout(() => {
    tela.replaceChildren(
      el(
        'div',
        { cls: 'caixa centro' },
        el('h2', { textContent: novo ? 'Novo recorde!' : 'Fim de jogo' }),
        el('div', { cls: 'grande-numero', textContent: `${pontos} pontos` }),
        el('p', { cls: 'recorde', textContent: `${muros} muros · recorde ${Math.max(pontos, recordes.normal ?? 0)}` }),
        el('button', { cls: 'btn forte grande', textContent: 'Jogar de novo', onclick: () => ((tela.hidden = true), novaPartida()) }),
        el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
      ),
    );
    tela.hidden = false;
  }, 1200);
}

menu();
