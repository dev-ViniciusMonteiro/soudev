// Corte Neon: jogo de ritmo pela câmera. Modo Sabres (corte os blocos na direção da seta) e modo Desvio
// (abaixe e desvie das paredes, pegue os orbes). Fluxo: menu → câmera → calibração → partida → resultado.

import './estilo.css';
import { Cena } from './cena';
import { NIVEIS, type Modo, type Nivel } from './fases';
import { type Calibracao, Jogo, type Placar } from './jogo';
import { Musica, destravarAudio } from './musica';
import { P, type Ponto, Rastreador, ehCelular, mensagemDeErro } from './rastreio';

/* ---------- DOM ---------- */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...filhos: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { cls, ...resto } = props;
  if (cls) e.className = cls;
  Object.assign(e, resto);
  for (const f of filhos) if (f) e.append(f);
  return e;
}

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : (JSON.parse(v) as T);
  } catch {
    return padrao;
  }
}

function guardar(chave: string, v: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(v));
  } catch {
    /* sem armazenamento */
  }
}

const app = document.querySelector('#app') as HTMLElement;
const palco = el('div', { cls: 'palco' });
const hud = el('div', { cls: 'hud', hidden: true });
const tela = el('div', { cls: 'tela' });
const espelho = el('div', { cls: 'espelho', hidden: true });
const esqueleto = el('canvas', { cls: 'esqueleto' });
app.append(palco, hud, espelho, tela);

const rastreador = new Rastreador();
rastreador.video.className = 'video';
espelho.append(rastreador.video, esqueleto);

let cena: Cena | null = null;
let jogo: Jogo | null = null;
let musica: Musica | null = null;
let calibracao: Calibracao | null = null;
let rodando = false;

interface Escolha {
  modo: Modo;
  nivel: Nivel;
  semFalhar: boolean;
  brilho: boolean;
}
let escolha: Escolha = ler('corte.escolha', { modo: 'sabres', nivel: 'facil', semFalhar: true, brilho: !ehCelular() } as Escolha);

/* ---------- Esqueleto sobre o vídeo (calibração e miniatura) ---------- */

const LIGACOES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
];

function desenharEsqueleto(pts: Ponto[] | null): void {
  const w = rastreador.largura;
  const h = rastreador.altura;
  if (esqueleto.width !== w) esqueleto.width = w;
  if (esqueleto.height !== h) esqueleto.height = h;
  const ctx = esqueleto.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  if (!pts) return;
  ctx.lineWidth = Math.max(3, w / 220);
  ctx.lineCap = 'round';
  for (const [a, b] of LIGACOES) {
    if (pts[a].vis < 0.45 || pts[b].vis < 0.45) continue;
    // Braço esquerdo em vermelho e direito em azul, as cores dos sabres.
    ctx.strokeStyle = a === 13 || (a === 11 && b === 13) ? '#ff2d55' : a === 14 || (a === 12 && b === 14) ? '#2ea8ff' : '#7df9ff';
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  }
  for (const i of [P.nariz, P.pulsoEsq, P.pulsoDir]) {
    if (pts[i].vis < 0.45) continue;
    ctx.fillStyle = i === P.pulsoEsq ? '#ff2d55' : i === P.pulsoDir ? '#2ea8ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, Math.max(6, w / 110), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Menu ---------- */

const recordes = (): Record<string, number> => ler('corte.recordes', {});

function menu(erro = ''): void {
  pararTudo();
  const opcao = <T extends string>(grupo: string, valor: T, atual: T, rotulo: string, sub: string, aoEscolher: (v: T) => void) =>
    el('button', { cls: valor === atual ? 'opcao ativa' : 'opcao', onclick: () => aoEscolher(valor), ariaPressed: String(valor === atual), name: grupo }, el('strong', { textContent: rotulo }), el('small', { textContent: sub }));
  const mudar = (parcial: Partial<Escolha>): void => {
    escolha = { ...escolha, ...parcial };
    guardar('corte.escolha', escolha);
    menu();
  };
  const r = recordes();
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: 'Corte Neon' }),
      el('p', { cls: 'sub', textContent: 'Jogo de ritmo com o seu corpo: a câmera vê seus braços e eles viram sabres de luz.' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : '',
      el('h2', { textContent: 'Modo' }),
      el(
        'div',
        { cls: 'opcoes' },
        opcao('modo', 'sabres', escolha.modo, '⚔️ Sabres', 'Corte os blocos na direção da seta: vermelho com a mão esquerda, azul com a direita.', (modo) => mudar({ modo })),
        opcao('modo', 'desvio', escolha.modo, '🧱 Desvio', 'Abaixe, vá para o lado e pegue os orbes dourados com as mãos.', (modo) => mudar({ modo })),
      ),
      el('h2', { textContent: 'Nível' }),
      el(
        'div',
        { cls: 'opcoes tres' },
        ...(['facil', 'normal', 'dificil'] as Nivel[]).map((n) => opcao('nivel', n, escolha.nivel, NIVEIS[n].nome, `${NIVEIS[n].bpm} bpm · recorde ${(r[`${escolha.modo}.${n}`] ?? 0).toLocaleString('pt-BR')}`, (nivel) => mudar({ nivel }))),
      ),
      el(
        'label',
        { cls: 'marcar' },
        el('input', { type: 'checkbox', checked: escolha.semFalhar, onchange: (e: Event) => mudar({ semFalhar: (e.target as HTMLInputElement).checked }) }),
        'Treino: não perde quando a energia acaba',
      ),
      el(
        'label',
        { cls: 'marcar' },
        el('input', { type: 'checkbox', checked: escolha.brilho, onchange: (e: Event) => mudar({ brilho: (e.target as HTMLInputElement).checked }) }),
        'Efeito de brilho (desligue se o jogo ficar lento)',
      ),
      el('button', { cls: 'btn forte grande', textContent: 'Ligar a câmera e jogar', onclick: () => void comecar() }),
      el(
        'details',
        { cls: 'dicas' },
        el('summary', { textContent: 'Dicas para a câmera acertar melhor' }),
        el(
          'ul',
          {},
          ...[
            'Coloque o aparelho na altura do peito, a uns 2 metros, e fique de frente.',
            'Precisa aparecer da cintura para cima, com os braços abertos dentro da imagem.',
            'Luz na sua frente (não atrás, como uma janela). Roupa que contraste com a parede ajuda.',
            'No computador o detector é o mais preciso; no celular, o mais leve, para não travar.',
            'Golpes firmes e completos: o corte vale pelo caminho do braço, não só pela posição.',
            'Nada sai do seu aparelho: o vídeo é analisado no próprio navegador.',
          ].map((t) => el('li', { textContent: t })),
        ),
      ),
    ),
  );
  tela.hidden = false;
}

/* ---------- Câmera e calibração ---------- */

async function comecar(): Promise<void> {
  destravarAudio();
  tela.replaceChildren(el('div', { cls: 'caixa centro' }, el('div', { cls: 'girando' }), el('p', { id: 'progresso', textContent: 'Preparando…' })));
  try {
    if (!rastreador.pontos && !rastreador.video.srcObject) await rastreador.iniciar((texto) => ((document.getElementById('progresso') as HTMLElement).textContent = texto));
  } catch (e) {
    console.error(e);
    rastreador.parar();
    rastreador.video.srcObject = null;
    menu(mensagemDeErro(e));
    return;
  }
  calibrar();
}

let laco = 0;
function iniciarLaco(fn: (agora: number, novo: boolean) => void): void {
  cancelAnimationFrame(laco);
  const passo = (agora: number): void => {
    laco = requestAnimationFrame(passo);
    const novo = rastreador.atualizar(agora);
    fn(agora, novo);
  };
  laco = requestAnimationFrame(passo);
}

function calibrar(): void {
  espelho.hidden = false;
  espelho.className = 'espelho grande';
  const itens = {
    rosto: el('li', { textContent: 'Rosto' }),
    ombros: el('li', { textContent: 'Ombros' }),
    maos: el('li', { textContent: 'As duas mãos' }),
    distancia: el('li', { textContent: 'Distância' }),
  };
  const barra = el('div', { cls: 'barra-calib' }, el('span'));
  const dica = el('p', { cls: 'dica-calib', textContent: 'Fique de frente, da cintura para cima, com os braços abertos.' });
  tela.replaceChildren(
    el(
      'div',
      { cls: 'painel-calib' },
      el('h2', { textContent: 'Calibrando' }),
      el('ul', { cls: 'checklist' }, ...Object.values(itens)),
      dica,
      barra,
      el('button', { cls: 'btn', textContent: 'Voltar', onclick: () => menu() }),
    ),
  );
  let firmeDesde = 0;
  const amostras: Calibracao[] = [];
  iniciarLaco((agora) => {
    const pts = rastreador.pontos;
    desenharEsqueleto(pts);
    const ok = (i: number): boolean => Boolean(pts && pts[i].vis > 0.6);
    const rosto = ok(P.nariz);
    const ombros = ok(P.ombroEsq) && ok(P.ombroDir);
    const maos = ok(P.pulsoEsq) && ok(P.pulsoDir) && ok(P.cotoveloEsq) && ok(P.cotoveloDir);
    let distancia = false;
    let largura = 0;
    if (pts && ombros) {
      largura = Math.hypot(pts[P.ombroEsq].x - pts[P.ombroDir].x, pts[P.ombroEsq].y - pts[P.ombroDir].y) / rastreador.largura;
      distancia = largura > 0.09 && largura < 0.3;
      dica.textContent = largura >= 0.3 ? 'Afaste-se um pouco: os braços precisam caber na imagem.' : largura <= 0.09 ? 'Chegue um pouco mais perto da câmera.' : maos ? 'Ótimo! Fique parado um instante…' : 'Abra os braços para os lados, com as mãos dentro da imagem.';
    } else dica.textContent = pts ? 'Mostre os ombros: fique de frente para a câmera.' : 'Não estou te vendo. Fique de frente para a câmera, com luz no rosto.';
    for (const [k, v] of Object.entries({ rosto, ombros, maos, distancia })) itens[k as keyof typeof itens].className = v ? 'ok' : '';
    const tudo = rosto && ombros && maos && distancia;
    if (tudo && pts) {
      firmeDesde ||= agora;
      const a = pts[P.ombroEsq];
      const b = pts[P.ombroDir];
      amostras.push({ escala: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, nariz: pts[P.nariz].y });
      if (amostras.length > 40) amostras.shift();
    } else {
      firmeDesde = 0;
      amostras.length = 0;
    }
    const prog = firmeDesde ? Math.min(1, (agora - firmeDesde) / 1300) : 0;
    (barra.firstElementChild as HTMLElement).style.width = `${prog * 100}%`;
    if (prog >= 1) {
      // Média das últimas amostras: uma medida firme mesmo com pequenas oscilações.
      const media = (k: keyof Calibracao): number => amostras.reduce((s, x) => s + x[k], 0) / amostras.length;
      calibracao = { escala: media('escala'), cx: media('cx'), cy: media('cy'), nariz: media('nariz') };
      void jogar();
    }
  });
}

/* ---------- Partida ---------- */

const elPontos = el('strong', { cls: 'pontos' });
const elCombo = el('span', { cls: 'combo' });
const elMult = el('span', { cls: 'mult' });
const elEnergia = el('div', { cls: 'energia' }, el('span'));
const elProgresso = el('div', { cls: 'progresso' }, el('span'));
const elPopup = el('div', { cls: 'popup' });
const elPausa = el('div', { cls: 'pausa', hidden: true });
const elContagem = el('div', { cls: 'contagem' });
hud.append(
  el('div', { cls: 'placar' }, elPontos, el('div', {}, elMult, elCombo)),
  el('div', { cls: 'barras' }, elEnergia, elProgresso),
  el('button', { cls: 'icone pausar', textContent: '❚❚', title: 'Pausar (P ou Esc)', onclick: () => jogo?.alternarPausa() }),
  elPopup,
  elContagem,
  elPausa,
);

function mostrarPlacar(p: Placar): void {
  elPontos.textContent = p.pontos.toLocaleString('pt-BR');
  elCombo.textContent = p.combo ? `${p.combo} em sequência` : '';
  elMult.textContent = `×${p.mult}`;
  elMult.dataset.mult = String(p.mult);
  const e = elEnergia.firstElementChild as HTMLElement;
  e.style.width = `${p.energia * 100}%`;
  e.className = p.energia < 0.25 ? 'baixa' : '';
}

let popupTimer: ReturnType<typeof setTimeout> | null = null;
function popup(texto: string, cor: string): void {
  elPopup.textContent = texto;
  elPopup.style.color = cor;
  elPopup.classList.remove('ativo');
  void elPopup.offsetWidth; // reinicia a animação
  elPopup.classList.add('ativo');
  if (popupTimer) clearTimeout(popupTimer);
  popupTimer = setTimeout(() => elPopup.classList.remove('ativo'), 700);
}

function mostrarPausa(motivo: 'camera' | 'voce' | null): void {
  elPausa.hidden = !motivo;
  if (!motivo) return;
  elPausa.replaceChildren(
    el(
      'div',
      { cls: 'caixa centro' },
      el('h2', { textContent: motivo === 'camera' ? 'Não estou te vendo' : 'Pausado' }),
      el('p', { textContent: motivo === 'camera' ? 'Volte para a frente da câmera: o jogo continua sozinho quando te enxergar.' : 'Respire. Quando quiser, continue.' }),
      motivo === 'voce' ? el('button', { cls: 'btn forte', textContent: 'Continuar', onclick: () => jogo?.alternarPausa() }) : '',
      el('button', { cls: 'btn', textContent: 'Calibrar de novo', onclick: () => void reiniciar(true) }),
      el('button', { cls: 'btn', textContent: 'Sair para o menu', onclick: () => menu() }),
    ),
  );
}

async function jogar(): Promise<void> {
  if (!calibracao) return;
  const cfg = NIVEIS[escolha.nivel];
  espelho.className = 'espelho mini';
  tela.hidden = true;
  hud.hidden = false;
  elPausa.hidden = true;
  if (!cena) cena = new Cena(palco, escolha.brilho);
  musica = new Musica(cfg.bpm, cfg.duracao);
  jogo = new Jogo(escolha.modo, escolha.nivel, cena, musica, rastreador, calibracao, escolha.semFalhar, {
    placar: mostrarPlacar,
    popup,
    pausa: mostrarPausa,
    fim: (p, falhou) => setTimeout(() => resultado(p, falhou), 600),
  });
  rodando = true;
  await musica.tocar(3);
  iniciarLaco((agora, novo) => {
    if (!jogo || !cena || !musica) return;
    desenharEsqueleto(rastreador.pontos);
    const t = musica.tempo();
    elContagem.textContent = t < 0 ? String(Math.ceil(-t)) : '';
    const r = jogo.quadro(agora, novo);
    cena.desenhar(r.dt, r.distancia, r.pulso);
    (elProgresso.firstElementChild as HTMLElement).style.width = `${(t / cfg.duracao) * 100}%`;
  });
}

async function reiniciar(recalibrar: boolean): Promise<void> {
  await encerrarPartida();
  if (recalibrar) {
    hud.hidden = true;
    tela.hidden = false;
    calibrar();
  } else void jogar();
}

async function encerrarPartida(): Promise<void> {
  rodando = false;
  cancelAnimationFrame(laco);
  jogo = null;
  const m = musica;
  musica = null;
  await m?.encerrar().catch(() => {});
  // A cena é recriada a cada partida para não acumular objetos.
  palco.replaceChildren();
  cena = null;
}

function resultado(p: Placar, falhou: boolean): void {
  if (!rodando) return;
  const modo = escolha.modo;
  const nivel = escolha.nivel;
  void encerrarPartida();
  hud.hidden = true;
  espelho.hidden = true;
  const precisao = p.total ? p.acertos / p.total : 0;
  const nota = falhou ? 'F' : precisao >= 0.95 ? 'S' : precisao >= 0.85 ? 'A' : precisao >= 0.7 ? 'B' : precisao >= 0.5 ? 'C' : 'D';
  const r = recordes();
  const chave = `${modo}.${nivel}`;
  const novo = !falhou && p.pontos > (r[chave] ?? 0);
  if (novo) guardar('corte.recordes', { ...r, [chave]: p.pontos });
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa centro' },
      el('h2', { textContent: falhou ? 'A energia acabou' : novo ? 'Novo recorde!' : 'Fim da música' }),
      el('div', { cls: `nota nota-${nota}`, textContent: nota }),
      el('p', { cls: 'grande', textContent: `${p.pontos.toLocaleString('pt-BR')} pontos` }),
      el(
        'ul',
        { cls: 'resumo' },
        el('li', { textContent: `${modo === 'sabres' ? 'Blocos cortados' : 'Obstáculos e orbes'}: ${p.acertos} de ${p.total} (${Math.round(precisao * 100)}%)` }),
        el('li', { textContent: `Maior sequência: ${p.maiorCombo}` }),
        el('li', { textContent: `${NIVEIS[nivel].nome} · ${modo === 'sabres' ? 'Sabres' : 'Desvio'}` }),
      ),
      falhou ? el('p', { cls: 'nota-texto', textContent: 'Dica: ligue o “Treino” no menu para jogar a música inteira sem perder.' }) : '',
      el('button', { cls: 'btn forte grande', textContent: 'Jogar de novo', onclick: () => void comecarDeNovo() }),
      el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
    ),
  );
  tela.hidden = false;
}

async function comecarDeNovo(): Promise<void> {
  espelho.hidden = false;
  calibrar();
}

function pararTudo(): void {
  void encerrarPartida();
  cancelAnimationFrame(laco);
  hud.hidden = true;
  espelho.hidden = true;
}

addEventListener('keydown', (e) => {
  if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && jogo) jogo.alternarPausa();
});

// Ao trocar de aba a música pausa junto (o navegador também congela o laço).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) jogo?.pausar();
});

menu();
