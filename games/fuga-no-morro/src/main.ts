// Fuga no Morro: corrida infinita pelas ruas da favela com a viatura atrás. Quanto mais tempo, mais procurado e mais rápido.
// Controle pelo corpo (câmera): passo para o lado, pulo (ou braços para cima) e agachar. Ou teclado e toque.

import '../../comum/base.css';
import './estilo.css';
import { Camera, type Ponto, mensagemDeErro } from '../../comum/camera';
import { el, guardar, ler } from '../../comum/ui';
import { type Calibracao, type Comando, ControleCorpo, ControleTeclado } from './controle';
import { Jogo } from './jogo';
import { Mundo } from './mundo';
import { alternarSom, andamento, destravar, efeito, estaMudo, heliceVolume, pararMusica, silenciarPerseguicao, sireneVolume, tocarMusica } from './som';

type ModoControle = 'camera' | 'teclado';

const app = document.querySelector('#app') as HTMLElement;
const palco = el('div', { cls: 'palco' });
const giroflex = el('div', { cls: 'giroflex' });
const metrosEl = el('strong', { cls: 'metros' });
const moedasEl = el('span', { cls: 'moedas' });
const estrelasEl = el('span', { cls: 'estrelas' });
const somBtn = el('button', { cls: 'icone', title: 'Som', textContent: estaMudo() ? '🔇' : '🔊', onclick: () => (somBtn.textContent = alternarSom() ? '🔇' : '🔊') });
const hud = el(
  'div',
  { cls: 'hud', hidden: true },
  el('div', { cls: 'placar' }, metrosEl, moedasEl),
  estrelasEl,
  el('span', { cls: 'espaco' }),
  somBtn,
  el('button', { cls: 'icone', textContent: '❚❚', title: 'Pausar (P)', onclick: () => alternarPausa() }),
);
const popup = el('div', { cls: 'popup' });
const contagem = el('div', { cls: 'contagem' });
const pausa = el('div', { cls: 'tela', hidden: true });
const tela = el('div', { cls: 'tela' });
const previa = el('div', { cls: 'previa', hidden: true });
const previaCanvas = el('canvas', { width: 320, height: 240 });
previa.append(previaCanvas);
app.append(palco, giroflex, hud, popup, contagem, previa, pausa, tela);

const mundo = new Mundo(palco);
const camera = new Camera();
const teclado = new ControleTeclado();
let corpo: ControleCorpo | null = null;
let modo: ModoControle = ler('fuga.controle', 'camera' as ModoControle);
let jogo: Jogo | null = null;
let rodando = false;
let pausado = false;
let inicio = 0; // momento em que a contagem começou
let ultimoComando: Comando = { faixa: 0, pulo: false, abaixado: false };
let fimMostrado = false;

/* ---------- Menu ---------- */

function menu(erro = ''): void {
  rodando = false;
  fundoDoMenu();
  pararMusica();
  silenciarPerseguicao();
  hud.hidden = true;
  previa.hidden = true;
  pausa.hidden = true;
  const r = ler('fuga.recorde', { pontos: 0, metros: 0, estrelas: 0 });
  const opcao = (m: ModoControle, titulo: string, sub: string) =>
    el('button', { cls: m === modo ? 'opcao ativa' : 'opcao', onclick: () => ((modo = m), guardar('fuga.controle', m), menu()) }, el('strong', { textContent: titulo }), el('small', { textContent: sub }));
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: 'Fuga no Morro' }),
      el('p', { cls: 'sub', textContent: 'Corra pelas vielas da favela com a viatura atrás de você. Quanto mais tempo, mais procurado ★ e mais rápido fica.' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : null,
      el('div', { cls: 'opcoes' }, opcao('camera', '🏃 Com o corpo', 'Câmera: passo para o lado, pule e agache'), opcao('teclado', '⌨️ Teclado ou toque', 'Setas/WASD ou deslize o dedo')),
      el('p', { cls: 'recorde', textContent: r.pontos ? `Recorde: ${r.pontos} pontos · ${r.metros} m · ${'★'.repeat(r.estrelas)}` : 'Sem recorde ainda. Bora!' }),
      el('button', { cls: 'btn forte grande', textContent: modo === 'camera' ? 'Ligar a câmera e correr' : 'Correr', onclick: () => void comecar() }),
      el(
        'details',
        { cls: 'dicas' },
        el('summary', { textContent: 'Como jogar' }),
        el(
          'ul',
          {},
          ...[
            'Troque de pista para desviar de Kombi, barraca e caixa d’água.',
            'Pule barreira, tijolo e moto; abaixe no varal de roupa.',
            'Bateu? Você tropeça e a viatura encosta. Bater de novo com ela colada é ser pego.',
            'A cada 30 s sobe uma estrela de procurado: fica mais rápido e, com 4 ★, chega o helicóptero.',
            'Com o corpo: fique a uns 2–3 m da câmera. Um passo para o lado troca de pista; pular ou levantar os dois braços pula; agachar abaixa.',
            'Teclado: ← → trocam de pista, ↑ ou espaço pula, ↓ abaixa. No celular, deslize o dedo.',
          ].map((t) => el('li', { textContent: t })),
        ),
      ),
      el('p', { cls: 'nota', textContent: 'Jogo de ficção, só diversão. O vídeo da câmera é analisado no seu aparelho e não é enviado.' }),
    ),
  );
  tela.hidden = false;
}

/* ---------- Câmera e calibração ---------- */

async function comecar(): Promise<void> {
  destravar();
  if (modo === 'teclado') return correr();
  const msg = el('p', { textContent: 'Preparando…' });
  tela.replaceChildren(el('div', { cls: 'caixa centro' }, el('div', { cls: 'girando' }), msg));
  try {
    await camera.iniciar('pose', (t) => (msg.textContent = t), { filtro: [1.4, 2.5] });
  } catch (e) {
    console.error(e);
    camera.parar();
    menu(mensagemDeErro(e));
    return;
  }
  calibrar();
}

let laco = 0;

function desenharPrevia(pts: Ponto[] | undefined, mostrarFaixas: boolean): void {
  const c = previaCanvas.getContext('2d')!;
  const w = previaCanvas.width;
  const h = previaCanvas.height;
  c.save();
  c.translate(w, 0);
  c.scale(-1, 1);
  if (camera.video.readyState >= 2) c.drawImage(camera.video, 0, 0, w, h);
  c.restore();
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(0, 0, w, h);
  // As três pistas, a partir do meio dos ombros da calibração.
  if (mostrarFaixas && corpo) {
    const vw = camera.video.videoWidth || 640;
    const k = w / vw;
    const { cx, sw } = corpo.calib;
    c.fillStyle = 'rgba(255,210,63,0.12)';
    c.fillRect((cx - sw * 0.55) * k, 0, sw * 1.1 * k, h);
    c.strokeStyle = 'rgba(255,210,63,0.7)';
    c.setLineDash([6, 6]);
    for (const lim of [-0.55, 0.55]) {
      c.beginPath();
      c.moveTo((cx + sw * lim) * k, 0);
      c.lineTo((cx + sw * lim) * k, h);
      c.stroke();
    }
    c.setLineDash([]);
  }
  if (!pts) return;
  c.strokeStyle = '#7df9ff';
  c.lineWidth = 3;
  c.lineCap = 'round';
  for (const [a, b] of [
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [11, 23],
    [12, 24],
    [23, 24],
  ]) {
    if (pts[a].vis < 0.5 || pts[b].vis < 0.5) continue;
    c.beginPath();
    c.moveTo(pts[a].x * w, pts[a].y * h);
    c.lineTo(pts[b].x * w, pts[b].y * h);
    c.stroke();
  }
  if (pts[0].vis > 0.5) {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(pts[0].x * w, pts[0].y * h, 5, 0, Math.PI * 2);
    c.fill();
  }
}

function calibrar(): void {
  previa.hidden = false;
  previa.className = 'previa grande';
  const itens = {
    corpo: el('li', { textContent: 'Ombros e rosto' }),
    bracos: el('li', { textContent: 'Braços' }),
    distancia: el('li', { textContent: 'Distância' }),
  };
  const dica = el('p', { cls: 'dica-calib', textContent: 'Fique no meio, de frente, aparecendo da cintura para cima.' });
  const barra = el('div', { cls: 'barra-calib' }, el('span'));
  tela.replaceChildren(
    el(
      'div',
      { cls: 'painel-calib' },
      el('h2', { textContent: 'Fique no meio da imagem' }),
      el('ul', { cls: 'checklist' }, ...Object.values(itens)),
      dica,
      barra,
      el('p', { cls: 'nota', textContent: 'Depois: um passo para o lado troca de pista · pular ou braços para cima pula · agachar abaixa.' }),
      el('button', { cls: 'btn', textContent: 'Voltar', onclick: () => (cancelAnimationFrame(laco), menu()) }),
    ),
  );
  tela.className = 'tela transparente';
  let firme = 0;
  const amostras: Calibracao[] = [];
  cancelAnimationFrame(laco);
  const passo = (agora: number): void => {
    laco = requestAnimationFrame(passo);
    camera.atualizar(agora);
    const pts = camera.leitura.grupos[0];
    desenharPrevia(pts, false);
    const W = camera.video.videoWidth || 640;
    const H = camera.video.videoHeight || 480;
    const ok = (i: number): boolean => Boolean(pts && pts[i].vis > 0.6);
    const temCorpo = ok(0) && ok(11) && ok(12);
    const bracos = ok(13) && ok(14) && ok(15) && ok(16);
    let distancia = false;
    if (pts && temCorpo) {
      const sw = Math.hypot((pts[11].x - pts[12].x) * W, (pts[11].y - pts[12].y) * H) / W;
      distancia = sw > 0.07 && sw < 0.24;
      dica.textContent = sw >= 0.24 ? 'Afaste-se: você precisa de espaço para dar um passo para cada lado.' : sw <= 0.07 ? 'Chegue um pouco mais perto.' : bracos ? 'Ótimo! Parado um instante…' : 'Mostre os braços.';
    } else dica.textContent = pts ? 'Mostre os ombros e o rosto.' : 'Não estou te vendo: fique de frente para a câmera, com luz.';
    itens.corpo.className = temCorpo ? 'ok' : '';
    itens.bracos.className = bracos ? 'ok' : '';
    itens.distancia.className = distancia ? 'ok' : '';
    if (pts && temCorpo && bracos && distancia) {
      firme ||= agora;
      amostras.push({ cx: ((pts[11].x + pts[12].x) / 2) * W, cy: ((pts[11].y + pts[12].y) / 2) * H, sw: Math.hypot((pts[11].x - pts[12].x) * W, (pts[11].y - pts[12].y) * H) });
      if (amostras.length > 40) amostras.shift();
    } else {
      firme = 0;
      amostras.length = 0;
    }
    const prog = firme ? Math.min(1, (agora - firme) / 1300) : 0;
    (barra.firstElementChild as HTMLElement).style.width = `${prog * 100}%`;
    if (prog >= 1) {
      const media = (k: keyof Calibracao): number => amostras.reduce((s, a) => s + a[k], 0) / amostras.length;
      corpo = new ControleCorpo({ cx: media('cx'), cy: media('cy'), sw: media('sw') });
      tela.className = 'tela';
      correr();
    }
  };
  laco = requestAnimationFrame(passo);
}

/* ---------- Corrida ---------- */

function mostrarPopup(texto: string, cor = '#ffd23f'): void {
  popup.textContent = texto;
  popup.style.color = cor;
  popup.classList.remove('ativo');
  void popup.offsetWidth;
  popup.classList.add('ativo');
}

function correr(): void {
  cancelAnimationFrame(laco);
  tela.hidden = true;
  pausa.hidden = true;
  hud.hidden = false;
  previa.hidden = modo !== 'camera';
  previa.className = 'previa';
  mundo.reiniciar();
  teclado.zerar();
  fimMostrado = false;
  pausado = false;
  jogo = new Jogo(mundo, {
    moeda: () => efeito.moeda(),
    pulo: () => efeito.pulo(),
    abaixou: () => efeito.abaixo(),
    tropeco: (t) => {
      efeito.tropeco();
      mostrarPopup(`${t} A viatura encostou!`, '#ff5c5c');
    },
    estrela: (n) => {
      efeito.estrela();
      andamento(124 + n * 4);
      mostrarPopup(`${'★'.repeat(n)} Procurado nível ${n}!${n === 4 ? ' Helicóptero!' : ''}`);
    },
    preso: () => {
      efeito.preso();
      mostrarPopup('Te pegaram!', '#ff5c5c');
    },
  });
  andamento(128);
  tocarMusica();
  rodando = true;
  inicio = performance.now();
  let antes = inicio;
  const passo = (agora: number): void => {
    laco = requestAnimationFrame(passo);
    const dt = Math.min(0.05, (agora - antes) / 1000);
    antes = agora;
    quadro(agora, dt);
  };
  laco = requestAnimationFrame(passo);
}

function quadro(agora: number, dt: number): void {
  if (!jogo) return;
  // Comando: corpo pela câmera ou teclado/toque.
  let perdido = false;
  if (modo === 'camera') {
    camera.atualizar(agora);
    const pts = camera.leitura.grupos[0];
    desenharPrevia(pts, true);
    const c = corpo?.ler(pts, camera.video.videoWidth || 640, camera.video.videoHeight || 480, agora);
    perdido = agora - camera.vistoEm > 1200 || !c;
    if (c) ultimoComando = c;
  } else ultimoComando = teclado.ler(agora);

  // Contagem "3, 2, 1, Corre!" com a viatura colada.
  const desde = (agora - inicio) / 1000;
  const contando = desde < 3;
  contagem.textContent = contando ? String(3 - Math.floor(desde)) : desde < 3.7 ? 'CORRE!' : '';

  const parado = contando || pausado || (modo === 'camera' && perdido && !jogo.preso);
  if (modo === 'camera' && perdido && !contando && !pausado && rodando) mostrarPausa('Não estou te vendo! Volte para a frente da câmera.');
  else if (!pausado) pausa.hidden = true;
  if (!parado) jogo.passo(dt, ultimoComando);

  // Desenho.
  const t = agora / 1000;
  mundo.corredorEm(jogo.x, jogo.y, jogo.abaixado, t, contando || parado ? 0 : 9 + jogo.velocidade * 0.6, jogo.tropeco);
  mundo.viaturaEm(jogo.x, jogo.viatura, t, true);
  mundo.helicopteroEm(jogo.estrelas >= 4 && !jogo.preso, jogo.x, t);
  const perto = Math.max(0, 1 - jogo.viatura / 9);
  sireneVolume(0.15 + perto * 0.85);
  heliceVolume(jogo.estrelas >= 4 ? 0.6 : 0);
  giroflex.style.opacity = String(Math.min(0.85, 0.12 + perto * 0.8 + (jogo.estrelas - 1) * 0.04));
  giroflex.dataset.fase = String(Math.floor(t * 6) % 2);
  metrosEl.textContent = `${Math.floor(jogo.distancia)} m`;
  moedasEl.textContent = `🪙 ${jogo.moedas}`;
  estrelasEl.textContent = '★'.repeat(jogo.estrelas) + '☆'.repeat(5 - jogo.estrelas);
  mundo.desenhar();

  if (jogo.preso && !fimMostrado && jogo.viatura < 0.5) {
    fimMostrado = true;
    setTimeout(() => fim(), 900);
  }
}

function mostrarPausa(texto: string): void {
  if (!pausa.hidden && pausa.dataset.texto === texto) return;
  pausa.dataset.texto = texto;
  pausa.replaceChildren(
    el(
      'div',
      { cls: 'caixa centro' },
      el('h2', { textContent: texto }),
      pausado ? el('button', { cls: 'btn forte grande', textContent: 'Continuar', onclick: () => alternarPausa() }) : el('p', { cls: 'nota', textContent: 'O jogo continua sozinho quando te enxergar.' }),
      modo === 'camera' ? el('button', { cls: 'btn', textContent: 'Calibrar de novo', onclick: () => (rodando = false, pararMusica(), silenciarPerseguicao(), (pausa.hidden = true), (hud.hidden = true), calibrar()) }) : null,
      el('button', { cls: 'btn', textContent: 'Sair para o menu', onclick: () => (cancelAnimationFrame(laco), menu()) }),
    ),
  );
  pausa.hidden = false;
}

function alternarPausa(): void {
  if (!rodando || !jogo || jogo.preso) return;
  pausado = !pausado;
  if (pausado) {
    pararMusica();
    silenciarPerseguicao();
    mostrarPausa('Pausado');
  } else {
    pausa.hidden = true;
    tocarMusica();
  }
}

addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key.toLowerCase() === 'p') alternarPausa();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && rodando && !pausado) alternarPausa();
});

function fim(): void {
  if (!jogo) return;
  rodando = false;
  cancelAnimationFrame(laco);
  pararMusica();
  silenciarPerseguicao();
  const r = ler('fuga.recorde', { pontos: 0, metros: 0, estrelas: 0 });
  const novo = jogo.pontos > r.pontos;
  if (novo) guardar('fuga.recorde', { pontos: jogo.pontos, metros: Math.floor(jogo.distancia), estrelas: jogo.estrelas });
  hud.hidden = true;
  previa.hidden = true;
  fundoDoMenu();
  tela.className = 'tela';
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa centro' },
      el('div', { cls: 'grande-numero', textContent: '🚓' }),
      el('h2', { textContent: novo ? 'Novo recorde! Mas te pegaram…' : 'Te pegaram!' }),
      el('div', { cls: 'grande-numero', textContent: `${jogo.pontos} pontos` }),
      el(
        'ul',
        { cls: 'resumo' },
        el('li', { textContent: `Correu ${Math.floor(jogo.distancia)} m em ${Math.floor(jogo.tempo)} s` }),
        el('li', { textContent: `🪙 ${jogo.moedas} moedas` }),
        el('li', { textContent: `Procurado: ${'★'.repeat(jogo.estrelas)}` }),
      ),
      el('p', { cls: 'recorde', textContent: `Recorde: ${Math.max(jogo.pontos, r.pontos)} pontos` }),
      el('button', { cls: 'btn forte grande', textContent: 'Fugir de novo', onclick: () => correr() }),
      el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
    ),
  );
  tela.hidden = false;
}

// Fora da corrida: a cena roda parada no fundo do menu, com a viatura de giroflex ligado.
let fundoAtivo = false;
function fundoDoMenu(): void {
  if (fundoAtivo) return;
  fundoAtivo = true;
  const passo = (agora: number): void => {
    if (rodando) {
      fundoAtivo = false;
      return;
    }
    requestAnimationFrame(passo);
    const t = agora / 1000;
    mundo.corredorEm(0, 0, false, t, 0, 0);
    mundo.viaturaEm(0, 3, t, true);
    mundo.helicopteroEm(false, 0, t);
    mundo.desenhar();
  };
  requestAnimationFrame(passo);
}

menu();
