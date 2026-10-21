// Nocaute: boxe pela câmera. Contra a máquina (3 níveis) ou 2 pessoas lado a lado na mesma câmera, cada uma
// controlando o seu lutador com o próprio corpo. Também dá para jogar no teclado (para testar sem câmera).

import '../../comum/base.css';
import './estilo.css';
import { Camera, type Ponto, mensagemDeErro } from '../../comum/camera';
import { botaoSom, chiado, destravarSom, el, guardar, ler, tom } from '../../comum/ui';
import { type Calibracao, type Entrada, LeitorBoxe, TecladoBoxe } from './deteccao';
import { type Balao, desenharArena, desenharBaloes, desenharLutador } from './desenho';
import { Luta, Maquina, type Nivel, ROUNDS } from './luta';

type Modo = 'maquina' | 'dois' | 'teclado';

const CORES = ['#dc2626', '#2563eb'];
const NIVEIS: [Nivel, string][] = [
  ['facil', 'Fácil'],
  ['medio', 'Médio'],
  ['dificil', 'Difícil'],
];

const app = document.querySelector('#app') as HTMLElement;
const canvas = el('canvas', { cls: 'palco-canvas' });
const ctx = canvas.getContext('2d')!;
const previa = el('canvas', { cls: 'previa', width: 320, height: 240, hidden: true });
const topo = el('div', { cls: 'hud', hidden: true }, el('span', { cls: 'espaco' }), botaoSom(), el('button', { cls: 'icone', textContent: '✕', title: 'Sair', onclick: () => menu() }));
const aviso = el('div', { cls: 'aviso-camera', hidden: true });
const tela = el('div', { cls: 'tela' });
app.append(canvas, previa, topo, aviso, tela);

const camera = new Camera();
const teclado = new TecladoBoxe();
let leitores: (LeitorBoxe | null)[] = [null, null];
let luta: Luta | null = null;
let baloes: Balao[] = [];
let tremor = 0;
let laco = 0;
let modo: Modo = ler('nocaute.modo', 'maquina' as Modo);
let nivel: Nivel = ler('nocaute.nivel', 'medio' as Nivel);
let nomes: [string, string] = ler('nocaute.nomes', ['Jogador 1', 'Jogador 2'] as [string, string]);
let fimMostrado = false;

function ajustar(): void {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
}
addEventListener('resize', ajustar);
ajustar();

/* ---------- Som ---------- */

const som = {
  sino: () => [0, 0.35, 0.7].forEach((d) => (tom(1320, 0.9, 'sine', 0.18, d), tom(2640, 0.6, 'sine', 0.06, d))),
  vento: () => chiado(0.12, 1800, 0.18),
  acerto: (forte: boolean) => {
    tom(forte ? 90 : 120, 0.18, 'sine', 0.55, 0, 45);
    chiado(0.1, 700, 0.5, 'lowpass');
  },
  bloqueio: () => {
    tom(420, 0.06, 'square', 0.09);
    chiado(0.05, 3200, 0.2);
  },
  torcida: (forte = 1) => chiado(1.6, 900, 0.18 * forte, 'bandpass'),
  contagem: (n: number) => tom(n === 10 ? 330 : 660, 0.25, 'triangle', 0.15),
};

/* ---------- Menu ---------- */

function menu(erro = ''): void {
  cancelAnimationFrame(laco);
  luta = null;
  topo.hidden = true;
  previa.hidden = true;
  aviso.hidden = true;
  fundo();
  const vit = ler<Record<string, number>>('nocaute.vitorias', {});
  const opcao = <T extends string>(atual: T, valor: T, titulo: string, sub: string, mudar: (v: T) => void) =>
    el('button', { cls: valor === atual ? 'opcao ativa' : 'opcao', onclick: () => mudar(valor) }, el('strong', { textContent: titulo }), el('small', { textContent: sub }));
  const nome1 = el('input', { value: nomes[0], maxLength: 14, ariaLabel: 'Nome do jogador 1' });
  const nome2 = el('input', { value: nomes[1], maxLength: 14, ariaLabel: 'Nome do jogador 2' });
  const salvarNomes = (): void => {
    nomes = [nome1.value.trim() || 'Jogador 1', nome2.value.trim() || 'Jogador 2'];
    guardar('nocaute.nomes', nomes);
  };
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: '🥊 Nocaute' }),
      el('p', { cls: 'sub', textContent: 'Boxe com o seu corpo pela câmera: soco, guarda e esquiva de verdade.' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : null,
      el(
        'div',
        { cls: 'opcoes' },
        opcao(modo, 'maquina', '🤖 Contra a máquina', 'Ela avisa antes de bater: defenda e contra-ataque', (m) => ((modo = m), guardar('nocaute.modo', m), menu())),
        opcao(modo, 'dois', '👥 2 pessoas', 'Lado a lado na frente da câmera', (m) => ((modo = m), guardar('nocaute.modo', m), menu())),
        opcao(modo, 'teclado', '⌨️ Teclado', 'Contra a máquina, sem câmera', (m) => ((modo = m), guardar('nocaute.modo', m), menu())),
      ),
      modo !== 'dois'
        ? el(
            'div',
            { cls: 'opcoes' },
            ...NIVEIS.map(([n, nome]) => opcao(nivel, n, nome, `${vit[n] ?? 0} vitórias`, (v) => ((nivel = v), guardar('nocaute.nivel', v), menu()))),
          )
        : null,
      el('div', { cls: 'nomes' }, el('span', { cls: 'tag vermelho', textContent: '🔴' }), nome1, modo === 'dois' ? el('span', { cls: 'tag azul', textContent: '🔵' }) : null, modo === 'dois' ? nome2 : null),
      el('button', {
        cls: 'btn forte grande',
        textContent: modo === 'teclado' ? 'Lutar' : 'Ligar a câmera e lutar',
        onclick: () => {
          salvarNomes();
          void comecar();
        },
      }),
      el(
        'details',
        { cls: 'dicas' },
        el('summary', { textContent: 'Como lutar' }),
        el(
          'ul',
          {},
          ...[
            'Soco reto (jab/direto): estique o braço rápido em direção à câmera ou ao adversário.',
            'Gancho: de lado, com o cotovelo dobrado. Uppercut: de baixo para cima.',
            'Mão na altura do rosto acerta a cabeça; mais baixa, o corpo (passa pela guarda e cansa o adversário).',
            'Guarda: as duas luvas na frente do rosto. Esquiva: incline o corpo para o lado ou agache.',
            'Fôlego: socar sem parar cansa e deixa os socos fracos. Errar também cansa.',
            'Caiu? Levante os dois braços antes do juiz contar 10. Três quedas é nocaute.',
            'Câmera: fique a uns 2 m, da cintura para cima, com os braços dentro da imagem. Em 2 pessoas, uma de cada lado.',
            'Teclado: J jab, K direto, L gancho, I uppercut (Shift = no corpo), espaço guarda, A/D esquiva, S abaixa, R levanta.',
          ].map((t) => el('li', { textContent: t })),
        ),
      ),
      el('p', { cls: 'nota', textContent: 'Afaste móveis e cuidado com quem está perto: os socos são no ar! O vídeo é analisado no seu aparelho.' }),
    ),
  );
  tela.hidden = false;
  tela.className = 'tela';
}

/* ---------- Câmera e calibração ---------- */

async function comecar(): Promise<void> {
  destravarSom();
  if (modo === 'teclado') return lutar();
  const msg = el('p', { textContent: 'Preparando…' });
  tela.replaceChildren(el('div', { cls: 'caixa centro' }, el('div', { cls: 'girando' }), msg));
  try {
    // Filtro mais solto que nos outros jogos: soco é rápido e não pode atrasar.
    await camera.iniciar('pose', (t) => (msg.textContent = t), { maxPessoas: modo === 'dois' ? 2 : 1, filtro: [1.6, 3.5] });
  } catch (e) {
    console.error(e);
    camera.parar();
    menu(mensagemDeErro(e));
    return;
  }
  calibrar();
}

/** Pessoas na imagem: em 2 jogadores, a da esquerda é o 1 (vermelho) e a da direita o 2 (azul). */
function pessoas(): (Ponto[] | undefined)[] {
  const g = camera.leitura.grupos;
  if (modo !== 'dois') return [g[0], undefined];
  if (g.length >= 2) return [g[0], g[1]];
  if (g.length === 1) return g[0][0].x < 0.5 ? [g[0], undefined] : [undefined, g[0]];
  return [undefined, undefined];
}

function desenharPrevia(alvo: HTMLCanvasElement, ps: (Ponto[] | undefined)[]): void {
  const c = alvo.getContext('2d')!;
  const w = alvo.width;
  const h = alvo.height;
  c.save();
  c.translate(w, 0);
  c.scale(-1, 1);
  if (camera.video.readyState >= 2) c.drawImage(camera.video, 0, 0, w, h);
  c.restore();
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(0, 0, w, h);
  ps.forEach((pts, i) => {
    if (!pts) return;
    c.strokeStyle = CORES[i];
    c.lineWidth = Math.max(3, w / 110);
    c.lineCap = 'round';
    for (const [a, b] of [
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 23],
      [12, 24],
    ]) {
      if (pts[a].vis < 0.5 || pts[b].vis < 0.5) continue;
      c.beginPath();
      c.moveTo(pts[a].x * w, pts[a].y * h);
      c.lineTo(pts[b].x * w, pts[b].y * h);
      c.stroke();
    }
    for (const k of [15, 16]) {
      if (pts[k].vis < 0.5) continue;
      c.fillStyle = CORES[i];
      c.beginPath();
      c.arc(pts[k].x * w, pts[k].y * h, w / 45, 0, Math.PI * 2);
      c.fill();
    }
  });
  if (modo === 'dois') {
    c.strokeStyle = 'rgba(255,255,255,0.4)';
    c.setLineDash([8, 8]);
    c.beginPath();
    c.moveTo(w / 2, 0);
    c.lineTo(w / 2, h);
    c.stroke();
    c.setLineDash([]);
  }
}

function calibrar(): void {
  cancelAnimationFrame(laco);
  const jogadores = modo === 'dois' ? [0, 1] : [0];
  previa.hidden = false;
  previa.className = 'previa grande';
  previa.width = 960;
  previa.height = 720;
  const linhas = jogadores.map((i) => {
    const li = { corpo: el('li', { textContent: 'Corpo' }), bracos: el('li', { textContent: 'Braços' }), distancia: el('li', { textContent: 'Distância' }) };
    const dica = el('p', { cls: 'dica-calib' });
    return { li, dica, bloco: el('div', { cls: 'calib-jogador' }, el('strong', { textContent: `${i ? '🔵' : '🔴'} ${nomes[i]}${modo === 'dois' ? (i ? ' (direita)' : ' (esquerda)') : ''}` }), el('ul', { cls: 'checklist' }, ...Object.values(li)), dica) };
  });
  const barra = el('div', { cls: 'barra-calib' }, el('span'));
  tela.replaceChildren(
    el(
      'div',
      { cls: 'painel-calib' },
      el('h2', { textContent: modo === 'dois' ? 'Um de cada lado, de frente para a câmera' : 'Fique de frente para a câmera, com guarda alta' }),
      ...linhas.map((l) => l.bloco),
      barra,
      el('button', { cls: 'btn', textContent: 'Voltar', onclick: () => menu() }),
    ),
  );
  tela.className = 'tela transparente';
  let firme = 0;
  const amostras: Calibracao[][] = jogadores.map(() => []);
  const passo = (agora: number): void => {
    laco = requestAnimationFrame(passo);
    camera.atualizar(agora);
    const ps = pessoas();
    desenharPrevia(previa, ps);
    const W = camera.video.videoWidth || 640;
    const H = camera.video.videoHeight || 480;
    const prontos = jogadores.map((i, k) => {
      const pts = ps[i];
      const { li, dica } = linhas[k];
      const ok = (j: number): boolean => Boolean(pts && pts[j].vis > 0.6);
      const corpo = ok(0) && ok(11) && ok(12);
      const bracos = ok(13) && ok(14) && ok(15) && ok(16);
      let distancia = false;
      if (pts && corpo) {
        const sw = Math.hypot((pts[11].x - pts[12].x) * W, (pts[11].y - pts[12].y) * H) / W;
        const [min, max] = modo === 'dois' ? [0.05, 0.2] : [0.07, 0.28];
        distancia = sw > min && sw < max;
        dica.textContent = sw >= max ? 'Afaste-se um pouco.' : sw <= min ? 'Chegue mais perto.' : bracos ? 'Pronto!' : 'Mostre os dois braços.';
      } else dica.textContent = pts ? 'Mostre os ombros e o rosto.' : 'Não estou te vendo.';
      li.corpo.className = corpo ? 'ok' : '';
      li.bracos.className = bracos ? 'ok' : '';
      li.distancia.className = distancia ? 'ok' : '';
      const pronto = corpo && bracos && distancia;
      if (pronto && pts) {
        amostras[k].push(LeitorBoxe.medir(pts, W, H));
        if (amostras[k].length > 40) amostras[k].shift();
      }
      return pronto;
    });
    if (prontos.every(Boolean)) firme ||= agora;
    else {
      firme = 0;
      amostras.forEach((a) => (a.length = 0));
    }
    const prog = firme ? Math.min(1, (agora - firme) / 1300) : 0;
    (barra.firstElementChild as HTMLElement).style.width = `${prog * 100}%`;
    if (prog >= 1) {
      leitores = [null, null];
      jogadores.forEach((i, k) => {
        const a = amostras[k];
        const media = (c: keyof Calibracao): number => a.reduce((s, x) => s + x[c], 0) / a.length;
        leitores[i] = new LeitorBoxe({ nx: media('nx'), ny: media('ny'), oy: media('oy'), sw: media('sw') });
      });
      lutar();
    }
  };
  laco = requestAnimationFrame(passo);
}

/* ---------- Luta ---------- */

function lutar(): void {
  cancelAnimationFrame(laco);
  tela.hidden = true;
  topo.hidden = false;
  previa.hidden = modo === 'teclado';
  previa.className = 'previa';
  previa.width = 320;
  previa.height = 240;
  baloes = [];
  fimMostrado = false;
  const contraMaquina = modo !== 'dois';
  const n2 = contraMaquina ? `Máquina (${NIVEIS.find(([n]) => n === nivel)![1]})` : nomes[1];
  luta = new Luta(
    [nomes[0], n2],
    {
      soco: () => som.vento(),
      resultado: (quem, s, dano) => {
        const alvo = posicao(quem === 0 ? 1 : 0);
        const y = s.alvo === 'cabeca' ? alvo.cabeca : alvo.corpo;
        if (s.resultado === 'acerto') {
          som.acerto(dano >= 9);
          tremor = dano >= 9 ? 0.25 : 0.12;
          const textos = { jab: 'JAB!', direto: 'POW!', gancho: 'GANCHO!', uppercut: 'UPPERCUT!' };
          baloes.push({ texto: textos[s.tipo], x: alvo.x, y, cor: s.tipo === 'uppercut' ? '#f59e0b' : '#ef4444', vida: 0.9, tam: dano >= 9 ? 4.5 : 3.6 });
        } else if (s.resultado === 'bloqueio') {
          som.bloqueio();
          baloes.push({ texto: 'BLOQUEOU!', x: alvo.x, y, cor: '#64748b', vida: 0.7, tam: 3 });
        } else {
          baloes.push({ texto: 'ESQUIVOU!', x: alvo.x, y, cor: '#10b981', vida: 0.7, tam: 3 });
        }
      },
      queda: (quem) => {
        som.torcida(1.4);
        tremor = 0.5;
        baloes.push({ texto: 'CAIU!', x: posicao(quem).x, y: posicao(quem).cabeca, cor: '#f59e0b', vida: 1.4, tam: 6 });
      },
      contagem: (n) => som.contagem(n),
      levantou: () => som.torcida(0.6),
      sino: () => som.sino(),
      fim: (v, motivo) => {
        som.torcida(1.6);
        if (contraMaquina && v === 0) {
          const vit = ler<Record<string, number>>('nocaute.vitorias', {});
          guardar('nocaute.vitorias', { ...vit, [nivel]: (vit[nivel] ?? 0) + 1 });
        }
        if (!fimMostrado) {
          fimMostrado = true;
          setTimeout(() => resultado(v, motivo), 2200);
        }
      },
    },
    contraMaquina ? new Maquina(nivel) : null,
  );
  let antes = performance.now();
  const passo = (agora: number): void => {
    laco = requestAnimationFrame(passo);
    const dt = Math.min(0.05, (agora - antes) / 1000);
    antes = agora;
    quadro(agora, dt);
  };
  laco = requestAnimationFrame(passo);
}

/** Posição de cada lutador na tela (centro, altura da cabeça e do corpo). */
function posicao(q: 0 | 1): { x: number; cabeca: number; corpo: number; chao: number; escala: number } {
  const w = canvas.width;
  const h = canvas.height;
  const escala = Math.min(h / 480, w / 700);
  const chao = h * 0.8;
  return { x: w / 2 + (q ? 1 : -1) * 150 * escala, cabeca: chao - 246 * escala, corpo: chao - 170 * escala, chao, escala };
}

function quadro(agora: number, dt: number): void {
  if (!luta) return;
  const entradas: [Entrada | null, Entrada | null] = [null, null];
  let perdido = false;
  if (modo === 'teclado') entradas[0] = teclado.ler();
  else {
    const novo = camera.atualizar(agora);
    const ps = pessoas();
    desenharPrevia(previa, ps);
    const W = camera.video.videoWidth || 640;
    const H = camera.video.videoHeight || 480;
    for (const i of modo === 'dois' ? [0, 1] : [0]) {
      const e = novo ? leitores[i]?.ler(ps[i], W, H, agora) : null;
      if (e) entradas[i] = e;
      else if (!ps[i]) perdido = true;
    }
    perdido ||= agora - camera.vistoEm > 1200;
  }
  // Sem ver alguém, a luta para (o relógio também) até voltar.
  const pausado = perdido && luta.fase !== 'fim' && luta.fase !== 'apresentacao';
  aviso.hidden = !pausado;
  aviso.textContent = modo === 'dois' ? 'Não estou vendo os dois lutadores: fiquem de frente, um de cada lado.' : 'Não estou te vendo: volte para a frente da câmera.';
  if (!pausado) luta.passo(dt, entradas);

  const w = canvas.width;
  const h = canvas.height;
  const u = Math.min(w, h) / 100;
  ctx.save();
  if (tremor > 0) {
    tremor -= dt;
    ctx.translate((Math.random() - 0.5) * u * 2.5, (Math.random() - 0.5) * u * 2.5);
  }
  desenharArena(ctx, w, h, luta.t);
  for (const q of [0, 1] as const) {
    const p = posicao(q);
    desenharLutador(ctx, { l: luta.lutadores[q], x: p.x, chao: p.chao, escala: p.escala, lado: q ? -1 : 1, cor: CORES[q], t: luta.t, aviso: luta.avisoDe(q), venceu: luta.fase === 'fim' && luta.vencedor === q });
  }
  baloes = desenharBaloes(ctx, baloes, dt, u);
  ctx.restore();
  desenharHud(u);
}

function desenharHud(u: number): void {
  if (!luta) return;
  const c = ctx;
  const w = canvas.width;
  const h = canvas.height;
  const largura = w * 0.36;
  luta.lutadores.forEach((l, q) => {
    const x = q ? w - u * 3 - largura : u * 3;
    const y = u * 9;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(x, y, largura, u * 3.2);
    const vida = c.createLinearGradient(x, 0, x + largura, 0);
    vida.addColorStop(0, l.vida > 30 ? '#22c55e' : '#ef4444');
    vida.addColorStop(1, l.vida > 30 ? '#84cc16' : '#f97316');
    c.fillStyle = vida;
    const fr = l.vida / 100;
    c.fillRect(q ? x + largura * (1 - fr) : x, y, largura * fr, u * 3.2);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(x, y + u * 3.8, largura, u * 1.1);
    c.fillStyle = '#38bdf8';
    const ff = l.folego / 100;
    c.fillRect(q ? x + largura * (1 - ff) : x, y + u * 3.8, largura * ff, u * 1.1);
    c.font = `800 ${u * 2.6}px system-ui, sans-serif`;
    c.textAlign = q ? 'right' : 'left';
    c.textBaseline = 'bottom';
    c.fillStyle = '#fff';
    c.fillText(`${q ? '' : '🔴 '}${l.nome}${q ? ' 🔵' : ''}${l.quedas ? `  ${'✖'.repeat(l.quedas)}` : ''}`, q ? x + largura : x, y - u * 0.6);
  });
  // Round e relógio.
  c.textAlign = 'center';
  c.textBaseline = 'top';
  c.fillStyle = '#fff';
  c.font = `900 ${u * 3}px system-ui, sans-serif`;
  c.fillText(`ROUND ${luta.round}/${ROUNDS}`, w / 2, u * 1.5);
  const s = Math.max(0, Math.ceil(luta.relogio));
  c.font = `900 ${u * 4.5}px system-ui, sans-serif`;
  c.fillStyle = s <= 10 && luta.fase === 'luta' ? '#f87171' : '#fde68a';
  c.fillText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, w / 2, u * 5);

  // Mensagens grandes no meio.
  const grande = (texto: string, cor: string, sub = ''): void => {
    c.font = `900 ${u * 11}px system-ui, sans-serif`;
    c.textBaseline = 'middle';
    c.lineWidth = u;
    c.strokeStyle = 'rgba(0,0,0,0.7)';
    c.strokeText(texto, w / 2, h * 0.42);
    c.fillStyle = cor;
    c.fillText(texto, w / 2, h * 0.42);
    if (sub) {
      c.font = `800 ${u * 3.2}px system-ui, sans-serif`;
      c.fillStyle = '#fff';
      c.fillText(sub, w / 2, h * 0.42 + u * 9);
    }
  };
  if (luta.fase === 'apresentacao') grande(`ROUND ${luta.round}`, '#fde68a', 'Lutem!');
  else if (luta.fase === 'queda') {
    const caido = luta.lutadores.findIndex((l) => l.caidoEm !== null);
    const humano = caido === 0 || modo === 'dois';
    const n = Math.min(10, Math.floor(luta.t - (luta.lutadores[caido]?.caidoEm ?? luta.t)));
    grande(n >= 1 ? String(n) : 'CAIU!', '#f59e0b', humano ? `${luta.lutadores[caido]?.nome}: levante os dois braços para levantar!` : '');
  } else if (luta.fase === 'intervalo') grande('Intervalo', '#93c5fd', 'Respire: vida e fôlego recuperando');
  else if (luta.fase === 'fim') grande(luta.motivo === 'nocaute' ? 'NOCAUTE!' : luta.motivo === 'pontos' ? 'FIM!' : 'EMPATE', '#fde68a', luta.vencedor === null ? '' : `${luta.lutadores[luta.vencedor].nome} venceu${luta.motivo === 'pontos' ? ' por pontos' : ''}!`);
  else if (luta.round === 1 && luta.relogio > TEMPO_DICA && modo !== 'teclado') {
    c.font = `700 ${u * 2.2}px system-ui, sans-serif`;
    c.textBaseline = 'bottom';
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText('Soco: estique o braço rápido · Guarda: luvas no rosto · Esquiva: incline ou agache', w / 2, h - u * 2);
  }
}

const TEMPO_DICA = 40; // mostra a dica nos primeiros 20 s do primeiro round

function resultado(v: 0 | 1 | null, motivo: 'nocaute' | 'pontos' | 'empate'): void {
  if (!luta) return;
  cancelAnimationFrame(laco);
  const [a, b] = luta.lutadores;
  const precisao = (l: typeof a) => (l.socos ? Math.round((l.acertos / l.socos) * 100) : 0);
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa centro' },
      el('div', { cls: 'grande-numero', textContent: v === null ? '🤝' : modo !== 'dois' && v === 1 ? '🤖' : '🏆' }),
      el('h2', { textContent: v === null ? 'Empate!' : `${luta.lutadores[v].nome} venceu ${motivo === 'nocaute' ? 'por nocaute' : 'por pontos'}!` }),
      el(
        'ul',
        { cls: 'resumo' },
        ...[a, b].map((l) => el('li', { textContent: `${l.nome}: ${l.acertos} de ${l.socos} socos (${precisao(l)}%) · ${Math.round(l.pontos)} de dano · ${l.quedas} quedas` })),
      ),
      el('button', { cls: 'btn forte grande', textContent: 'Revanche', onclick: () => lutar() }),
      el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
    ),
  );
  tela.className = 'tela';
  tela.hidden = false;
}

/** Fundo do menu: a arena vazia com a torcida. */
function fundo(): void {
  const passo = (agora: number): void => {
    if (luta) return;
    laco = requestAnimationFrame(passo);
    desenharArena(ctx, canvas.width, canvas.height, agora / 1000);
  };
  cancelAnimationFrame(laco);
  laco = requestAnimationFrame(passo);
}

menu();
