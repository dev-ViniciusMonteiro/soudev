// Pedra, Papel e Tesoura pela câmera: contra a máquina (que aprende seus hábitos) ou 2 pessoas na mesma câmera.
// Contagem "Pedra, papel, tesoura, JÁ!" e o gesto é lido por votação nos quadros logo depois do JÁ.

import '../../comum/base.css';
import './estilo.css';
import { Camera, type Ponto, mensagemDeErro } from '../../comum/camera';
import { Palco } from '../../comum/palco';
import { DICAS_CAMERA, botaoSom, carregando, destravarSom, el, guardar, laco, ler, sons, tom } from '../../comum/ui';
import { Adversario, EMOJI, type Gesto, NOME, reconhecer, resultado } from './gestos';

type Modo = 'esperta' | 'sorte' | 'dois';
type Fase = 'esperando' | 'contando' | 'revelado' | 'final';

const VITORIAS_PARA_GANHAR = 3;
const BATIDA = 0.55; // segundos entre "Pedra", "Papel", "Tesoura" e "JÁ"
const LIGACOES = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16],
  [13, 17, 18, 19, 20],
  [0, 17],
];
const CORES = ['#3df5ff', '#ffb02e'];

const app = document.querySelector('#app') as HTMLElement;
const camera = new Camera();
const palco = new Palco(app);
const tela = el('div', { cls: 'tela' });
const placarEl = el('span', { cls: 'pontos' });
const infoEl = el('span', { cls: 'info' });
const hud = el('div', { cls: 'hud', hidden: true }, placarEl, infoEl, el('span', { cls: 'espaco' }), botaoSom(), el('button', { cls: 'icone', textContent: '✕', title: 'Sair', onclick: () => menu() }));
app.append(hud, tela);

let modo: Modo = ler('ppt.modo', 'esperta' as Modo);
let fase: Fase = 'esperando';
let adversario = new Adversario(true);
let placar = [0, 0];
let inicioContagem = 0;
let votos: (Gesto | null)[][] = [[], []];
let jogadas: (Gesto | null)[] = [null, null];
let mensagem = '';
let reveladoEm = 0;
let maoVistaDesde = 0;
let pararLaco: (() => void) | null = null;
let ultimaFala = -1;

const nomes = (): [string, string] => (modo === 'dois' ? ['Jogador 1', 'Jogador 2'] : ['Você', 'Máquina']);

/* ---------- Menu ---------- */

function menu(erro = ''): void {
  pararLaco?.();
  hud.hidden = true;
  const stats = ler('ppt.stats', { vitorias: 0, derrotas: 0 });
  const opcao = (m: Modo, titulo: string, sub: string) =>
    el('button', { cls: m === modo ? 'opcao ativa' : 'opcao', onclick: () => ((modo = m), guardar('ppt.modo', m), menu()) }, el('strong', { textContent: titulo }), el('small', { textContent: sub }));
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: 'Pedra, Papel e Tesoura' }),
      el('p', { cls: 'sub', textContent: 'Mostre a mão para a câmera: ela reconhece o gesto na hora do “JÁ!”.' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : null,
      el(
        'div',
        { cls: 'opcoes' },
        opcao('esperta', '🧠 Máquina esperta', 'Aprende os seus hábitos durante a partida'),
        opcao('sorte', '🎲 Máquina na sorte', 'Joga totalmente ao acaso'),
        opcao('dois', '👥 2 pessoas', 'Cada um de um lado da câmera'),
      ),
      el('p', { cls: 'recorde', textContent: `Partidas contra a máquina: ${stats.vitorias} vitórias e ${stats.derrotas} derrotas. Ganha quem fizer ${VITORIAS_PARA_GANHAR} pontos.` }),
      el('button', { cls: 'btn forte grande', textContent: 'Ligar a câmera e jogar', onclick: () => void comecar() }),
      el(
        'details',
        { cls: 'dicas' },
        el('summary', { textContent: 'Dicas para a câmera reconhecer' }),
        el(
          'ul',
          {},
          ...[
            'Mostre a palma ou as costas da mão inteira, a uns 50 cm a 1 m da câmera.',
            'Pedra: mão fechada. Papel: dedos abertos. Tesoura: indicador e médio esticados.',
            'Faça o gesto e segure por meio segundo depois do “JÁ!”.',
            'Em 2 pessoas: um de cada lado da imagem, cada um com uma mão.',
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
    await camera.iniciar('maos', progresso, { maxMaos: 2, filtro: [1.0, 1.5] });
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
  adversario = new Adversario(modo === 'esperta');
  placar = [0, 0];
  fase = 'esperando';
  maoVistaDesde = 0;
  mensagem = '';
  jogadas = [null, null];
  atualizarHud();
}

function atualizarHud(): void {
  const [a, b] = nomes();
  placarEl.textContent = `${a} ${placar[0]} × ${placar[1]} ${b}`;
  infoEl.textContent = modo === 'esperta' ? '🧠' : modo === 'sorte' ? '🎲' : '👥';
}

/* ---------- Mãos ---------- */

/** Mãos visíveis: em 2 pessoas, a da esquerda da tela é do jogador 1 e a da direita do jogador 2. */
function maos(): (Ponto[] | null)[] {
  const grupos = camera.leitura.grupos;
  if (modo !== 'dois') return [grupos[0] ?? null, null];
  const out: (Ponto[] | null)[] = [null, null];
  for (const g of grupos) {
    const lado = g[0].x < 0.5 ? 0 : 1;
    if (!out[lado]) out[lado] = g;
  }
  return out;
}

const aspecto = (): number => (camera.video.videoWidth || 4) / (camera.video.videoHeight || 3);

function desenharMao(m: Ponto[], cor: string, gesto: Gesto | null): void {
  const { ctx, u } = palco;
  const p = m.map((x) => palco.tela(x));
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = u * 0.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = cor;
  ctx.shadowBlur = u * 1.5;
  for (const linha of LIGACOES) {
    ctx.beginPath();
    linha.forEach((i, k) => (k ? ctx.lineTo(p[i].x, p[i].y) : ctx.moveTo(p[i].x, p[i].y)));
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  for (const q of p) {
    ctx.beginPath();
    ctx.arc(q.x, q.y, u * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  // Etiqueta com o gesto reconhecido agora, acima da mão.
  const topo = p.reduce((a, b) => (b.y < a.y ? b : a));
  ctx.shadowBlur = 0;
  ctx.font = `800 ${u * 4}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = cor;
  ctx.fillText(gesto ? `${EMOJI[gesto]} ${NOME[gesto]}` : '?', topo.x, topo.y - u * 4);
  ctx.restore();
}

/* ---------- Rodada ---------- */

function iniciarContagem(agora: number): void {
  fase = 'contando';
  inicioContagem = agora;
  votos = [[], []];
  ultimaFala = -1;
  // A máquina escolhe antes de ver a sua mão (sem trapaça).
  jogadas = [null, modo === 'dois' ? null : adversario.escolher()];
}

function maisVotado(lista: (Gesto | null)[]): Gesto | null {
  const cont = new Map<Gesto, number>();
  for (const g of lista) if (g) cont.set(g, (cont.get(g) ?? 0) + 1);
  let melhor: Gesto | null = null;
  for (const [g, n] of cont) if (!melhor || n > (cont.get(melhor) ?? 0)) melhor = g;
  return melhor && (cont.get(melhor) ?? 0) >= 2 ? melhor : null;
}

function revelar(agora: number): void {
  const humanos = modo === 'dois' ? [0, 1] : [0];
  for (const i of humanos) jogadas[i] = maisVotado(votos[i]);
  reveladoEm = agora;
  fase = 'revelado';
  const [a, b] = jogadas;
  const [n1, n2] = nomes();
  if (!a || !b) {
    mensagem = modo !== 'dois' ? 'Não vi sua mão. De novo!' : !a && !b ? 'Não vi nenhuma mão. De novo!' : `Não vi a mão do ${!a ? 'Jogador 1' : 'Jogador 2'}. De novo!`;
    sons.erro();
    return;
  }
  const r = resultado(a, b);
  if (modo !== 'dois') adversario.registrar(a, b);
  if (r === 0) {
    mensagem = 'Empate!';
    tom(440, 0.2, 'sine', 0.1);
  } else {
    placar[r > 0 ? 0 : 1]++;
    const vencedor = r > 0 ? n1 : n2;
    mensagem = `${EMOJI[r > 0 ? a : b]} ${NOME[r > 0 ? a : b]} ganha de ${NOME[r > 0 ? b : a].toLowerCase()}: ${vencedor === 'Você' ? 'você ganhou!' : `${vencedor} ganhou!`}`;
    if (modo !== 'dois' && r < 0) sons.erro();
    else sons.acerto();
  }
  atualizarHud();
}

function fimDaPartida(): void {
  fase = 'final';
  const [n1, n2] = nomes();
  const venceu1 = placar[0] > placar[1];
  if (modo !== 'dois') {
    const s = ler('ppt.stats', { vitorias: 0, derrotas: 0 });
    guardar('ppt.stats', venceu1 ? { ...s, vitorias: s.vitorias + 1 } : { ...s, derrotas: s.derrotas + 1 });
  }
  (venceu1 || modo === 'dois' ? sons.vitoria : sons.derrota)();
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa centro' },
      el('div', { cls: 'grande-numero', textContent: venceu1 ? '🏆' : modo === 'dois' ? '🏆' : '🤖' }),
      el('h2', { textContent: modo === 'dois' ? `${venceu1 ? n1 : n2} venceu!` : venceu1 ? 'Você venceu a máquina!' : 'A máquina venceu' }),
      el('p', { cls: 'grande-numero', textContent: `${placar[0]} × ${placar[1]}` }),
      modo === 'esperta' && !venceu1 ? el('p', { cls: 'recorde', textContent: 'Ela percebe padrões: tente variar mais depois de ganhar ou perder.' }) : null,
      el('button', { cls: 'btn forte grande', textContent: 'Jogar de novo', onclick: () => ((tela.hidden = true), novaPartida()) }),
      el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
    ),
  );
  tela.hidden = false;
}

/* ---------- Quadro ---------- */

function textoCentral(texto: string, tamanho: number, cor: string, y = 0.42, escala = 1): void {
  const { ctx, u, w, h } = palco;
  ctx.save();
  ctx.translate(w / 2, h * y);
  ctx.scale(escala, escala);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${u * tamanho}px system-ui, sans-serif`;
  ctx.lineWidth = u;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(texto, 0, 0);
  ctx.fillStyle = cor;
  ctx.fillText(texto, 0, 0);
  ctx.restore();
}

function quadro(agora: number): void {
  const novo = camera.atualizar(agora);
  const { ctx, u, w, h } = palco;
  palco.desenharVideo(camera.video, 0.35);
  const asp = aspecto();
  const ms = maos();
  const gestos = ms.map((m) => (m ? reconhecer(m, asp) : null));
  ms.forEach((m, i) => m && desenharMao(m, CORES[i], gestos[i]));

  if (modo === 'dois') {
    // Linha do meio: cada jogador do seu lado.
    ctx.save();
    ctx.setLineDash([u * 2, u * 2]);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = u * 0.4;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.12);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.restore();
  }

  const humanos = modo === 'dois' ? [0, 1] : [0];
  const todasVistas = humanos.every((i) => ms[i]);

  if (fase === 'esperando') {
    if (todasVistas) maoVistaDesde ||= agora;
    else maoVistaDesde = 0;
    const falta = humanos.filter((i) => !ms[i]).map((i) => nomes()[i]);
    textoCentral(falta.length ? (modo === 'dois' ? `Mostrem as mãos: falta ${falta.join(' e ')}` : 'Mostre a mão para a câmera') : 'Prontos? Segure a mão…', 4.5, '#ffffff', 0.85);
    if (maoVistaDesde && agora - maoVistaDesde > 700) iniciarContagem(agora);
  }

  if (fase === 'contando') {
    const t = (agora - inicioContagem) / 1000;
    const batida = Math.floor(t / BATIDA);
    const frac = (t % BATIDA) / BATIDA;
    const palavras = ['Pedra…', 'Papel…', 'Tesoura…', 'JÁ!'];
    if (batida !== ultimaFala && batida < 4) {
      ultimaFala = batida;
      sons.contagem(batida === 3);
    }
    if (batida < 4) textoCentral(palavras[batida], batida === 3 ? 16 : 11, batida === 3 ? '#ffd23f' : '#ffffff', 0.42, 1 + (1 - frac) * 0.25);
    // Vota com os quadros logo depois do JÁ (o gesto costuma "chegar" um pouco depois da palavra).
    const desdeJa = t - 3 * BATIDA;
    if (desdeJa > 0.08 && desdeJa < 0.65 && novo) humanos.forEach((i) => votos[i].push(gestos[i]));
    if (desdeJa >= 0.65) revelar(agora);
  }

  // Máquina: mão que balança durante a contagem e mostra a jogada no JÁ.
  if (modo !== 'dois' && fase !== 'final') {
    const t = (agora - inicioContagem) / 1000;
    const balanca = fase === 'contando' && t < 3 * BATIDA ? Math.abs(Math.sin((t / BATIDA) * Math.PI)) : 0;
    const emoji = fase === 'revelado' && jogadas[1] ? EMOJI[jogadas[1]] : '✊';
    ctx.save();
    ctx.font = `${u * 18}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(w - u * 16, h * 0.32 - balanca * u * 8);
    ctx.scale(-1, 1); // a mão da máquina aponta para você
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
    ctx.font = `800 ${u * 3.5}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb02e';
    ctx.fillText('Máquina', w - u * 16, h * 0.32 + u * 13);
  }

  if (fase === 'revelado') {
    const [a, b] = jogadas;
    if (a && b && modo === 'dois') textoCentral(`${EMOJI[a]}   ×   ${EMOJI[b]}`, 14, '#ffffff', 0.4);
    textoCentral(mensagem, 5, '#ffd23f', 0.62);
    if (agora - reveladoEm > 2300) {
      if (placar[0] >= VITORIAS_PARA_GANHAR || placar[1] >= VITORIAS_PARA_GANHAR) fimDaPartida();
      else {
        fase = 'esperando';
        maoVistaDesde = 0;
      }
    }
  }
}

menu();
