// Cubo no Ritmo: plataforma de ritmo com cubo, nave, bola, ovni, onda, robô e aranha. Fases originais,
// modo prática com checkpoints, moedas, ícone personalizável e editor de fases com link para compartilhar.

import './estilo.css';
import { Desenho, type Icone, type Particula } from './desenho';
import { type FaseEditor, abrirEditor, codificar, decodificar, paraFase } from './editor';
import { FASES } from './fases';
import { type Fase, Indice, type Jogador, PASSO, copiar, novoJogador, passo } from './fisica';
import { Musica, alternarSom, continuarAudio, destravar, efeito, estaMudo, pausarAudio } from './musica';

/* ---------- DOM e armazenamento ---------- */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...filhos: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { cls, ...resto } = props;
  if (cls) e.className = cls;
  Object.assign(e, resto);
  for (const f of filhos) if (f) e.append(f);
  return e;
}

/** Aplica CSS inline num elemento recém-criado (o el() não aceita style como texto). */
const comEstilo = <E extends HTMLElement>(e: E, css: string): E => ((e.style.cssText = css), e);

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

interface Recorde {
  normal: number; // 0..1
  pratica: number;
  moedas: number[]; // ids das moedas já pegas (em partidas completas)
  tentativas: number;
}

const app = document.querySelector('#app') as HTMLElement;
const canvas = el('canvas', { cls: 'tela-jogo' });
const tela = el('div', { cls: 'tela' });
const hud = el('div', { cls: 'hud', hidden: true });
app.append(canvas, hud, tela);
const d = new Desenho(canvas);

const CORES_ICONE = ['#4ade80', '#facc15', '#38bdf8', '#f472b6', '#f87171', '#a78bfa', '#fb923c', '#ffffff'];
let icone: Icone = ler('cubo.icone', { cor1: '#4ade80', cor2: '#38bdf8', rosto: 0 });
const recordes = (): Record<string, Recorde> => ler('cubo.recordes', {});

/* ---------- Entrada (teclado, mouse, toque) ---------- */

let segurando = false;
const teclasPulo = new Set([' ', 'ArrowUp', 'w', 'W']);
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (teclasPulo.has(e.key)) {
    segurando = true;
    e.preventDefault();
  }
  if (estado === 'jogo') {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') alternarPausa();
    if (pratica && (e.key === 'z' || e.key === 'Z')) marcarCheckpoint();
    if (pratica && (e.key === 'x' || e.key === 'X')) checkpoints.pop();
  }
});
addEventListener('keyup', (e) => {
  if (teclasPulo.has(e.key)) segurando = false;
});
canvas.addEventListener('pointerdown', (e) => {
  if (estado !== 'jogo') return;
  e.preventDefault();
  segurando = true;
});
addEventListener('pointerup', () => (segurando = false));
addEventListener('pointercancel', () => (segurando = false));
addEventListener('blur', () => (segurando = false));

/* ---------- Partida ---------- */

type Estado = 'menu' | 'jogo' | 'editor';
let estado: Estado = 'menu';
let fase: Fase = FASES[0];
let chaveFase = '';
let idx = new Indice(fase);
let jog: Jogador = novoJogador();
let musica: Musica | null = null;
let pratica = false;
let pausado = false;
let tentativa = 1;
let morreuEm = 0;
let venceuEm = 0;
let particulas: Particula[] = [];
let rastro: { x: number; y: number }[] = [];
let checkpoints: { j: Jogador; t: number }[] = [];
let ultimoCheckpointT = 0;
let doEditor: FaseEditor | null = null;
let fecharEditor: (() => void) | null = null;
let antes = performance.now();

function jogar(f: Fase, chave: string, comPratica: boolean, editor: FaseEditor | null = null): void {
  destravar();
  fase = f;
  chaveFase = chave;
  idx = new Indice(fase);
  pratica = comPratica;
  doEditor = editor;
  tentativa = 1;
  checkpoints = [];
  musica?.parar();
  musica = new Musica(f.musica, f.bpm);
  estado = 'jogo';
  tela.hidden = true;
  desenharHud();
  hud.hidden = false;
  reiniciar();
}

function reiniciar(): void {
  const cp = pratica ? checkpoints[checkpoints.length - 1] : null;
  jog = cp ? copiar(cp.j) : novoJogador();
  jog.segurouAntes = segurando; // segurar não vira pulo instantâneo ao reaparecer
  particulas = [];
  rastro = [];
  morreuEm = 0;
  venceuEm = 0;
  ultimoCheckpointT = jog.t;
  musica!.tocar(jog.t, 0.05);
  d.cam.x = jog.x - (d.w * 0.3) / d.cam.esc;
}

function marcarCheckpoint(): void {
  if (!jog.morto && !jog.venceu) {
    checkpoints.push({ j: copiar(jog), t: jog.t });
    ultimoCheckpointT = jog.t;
  }
}

function explodir(cor: string): void {
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 3 + Math.random() * 9;
    particulas.push({ x: jog.x + 0.5, y: jog.y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.6 + Math.random() * 0.4, cor, tam: 0.12 + Math.random() * 0.15 });
  }
}

function salvarProgresso(final: boolean): void {
  if (!chaveFase) return;
  const r = recordes();
  const atual: Recorde = r[chaveFase] ?? { normal: 0, pratica: 0, moedas: [], tentativas: 0 };
  const fr = Math.min(1, jog.x / fase.comprimento);
  if (pratica) atual.pratica = Math.max(atual.pratica, fr);
  else {
    atual.normal = Math.max(atual.normal, fr);
    atual.tentativas++;
    // Moedas só contam numa partida completa, fora do modo prática.
    if (final) atual.moedas = [...new Set([...atual.moedas, ...jog.moedas])];
  }
  guardar('cubo.recordes', { ...r, [chaveFase]: atual });
}

function quadro(agora: number): void {
  requestAnimationFrame(quadro);
  const dt = Math.min(0.05, (agora - antes) / 1000);
  antes = agora;
  if (estado === 'menu') {
    desenharFundoMenu(agora / 1000);
    return;
  }
  if (estado !== 'jogo' || !musica) return;

  // A física anda até o tempo da música (240 passos por segundo).
  if (!pausado && !jog.morto && !jog.venceu) {
    const alvo = musica.tempo();
    let n = 0;
    while (jog.t + PASSO <= alvo && n < 60 && !jog.morto && !jog.venceu) {
      for (const ev of passo(jog, segurando, idx)) {
        if (ev.tipo === 'morte') {
          morreuEm = agora;
          efeito.morte();
          musica.parar();
          explodir(icone.cor1);
          salvarProgresso(false);
        } else if (ev.tipo === 'moeda') efeito.moeda();
        else if (ev.tipo === 'orbe' || ev.tipo === 'pad') efeito.orbe();
        else if (ev.tipo === 'portal') efeito.portal();
        else if (ev.tipo === 'fim') {
          venceuEm = agora;
          efeito.vitoria();
          salvarProgresso(true);
          setTimeout(fimDaFase, 1400);
        }
      }
      n++;
    }
    // Modo prática: checkpoint sozinho a cada ~2,5 s, quando estiver no chão.
    if (pratica && jog.noChao && jog.t - ultimoCheckpointT > 2.5) marcarCheckpoint();
    if (jog.modo === 'onda') {
      rastro.push({ x: jog.x + 0.3, y: jog.y + 0.3 });
      if (rastro.length > 90) rastro.shift();
    } else rastro = [];
  }
  if (jog.morto && agora - morreuEm > 700) {
    tentativa++;
    reiniciar();
  }

  // Desenho.
  d.seguir(jog, dt);
  const batida = 60 / fase.bpm;
  const t = musica.tempo();
  const pulso = t > 0 ? Math.pow(1 - (t % batida) / batida, 4) : 0;
  const rec = recordes()[chaveFase];
  d.fundo(fase, pulso, t);
  d.limites(fase, jog);
  if (tentativa > 0 && jog.x < 30) d.textoNoMundo(`Tentativa ${tentativa}`, 3, 6, 0.9);
  d.objetos(fase, t, jog.moedas, new Set(rec?.moedas ?? []), jog.usados);
  if (pratica) for (const cp of checkpoints) d.objeto({ t: 'checkpoint', x: cp.j.x, y: cp.j.y + 1.3 }, t);
  d.rastro(rastro, icone.cor2);
  if (!jog.morto) d.jogador(jog, icone, t);
  particulas = d.particulas(particulas, dt);
  d.progresso(Math.min(1, jog.x / fase.comprimento), pratica ? rec?.pratica ?? 0 : rec?.normal ?? 0, pratica);
  if (venceuEm) {
    d.c.fillStyle = `rgba(255,255,255,${Math.max(0, 0.6 - (agora - venceuEm) / 1500)})`;
    d.c.fillRect(0, 0, d.w, d.h);
  }
}

function alternarPausa(): void {
  if (estado !== 'jogo' || jog.morto || jog.venceu) return;
  pausado = !pausado;
  if (pausado) {
    void pausarAudio();
    tela.replaceChildren(
      el(
        'div',
        { cls: 'caixa centro' },
        el('h2', { textContent: 'Pausado' }),
        el('p', { cls: 'nota', textContent: `${fase.nome} · tentativa ${tentativa}${pratica ? ' · modo prática' : ''}` }),
        el('button', { cls: 'btn forte grande', textContent: 'Continuar', onclick: () => alternarPausa() }),
        el('button', { cls: 'btn', textContent: pratica ? 'Sair do modo prática' : 'Modo prática', onclick: () => ((pausado = false), void continuarAudio(), jogar(fase, chaveFase, !pratica, doEditor)) }),
        doEditor ? el('button', { cls: 'btn', textContent: 'Voltar ao editor', onclick: () => ((pausado = false), void continuarAudio(), editar(doEditor!)) }) : null,
        el('button', { cls: 'btn', textContent: 'Menu', onclick: () => ((pausado = false), void continuarAudio(), menu()) }),
      ),
    );
    tela.hidden = false;
  } else {
    void continuarAudio();
    tela.hidden = true;
  }
}

function fimDaFase(): void {
  if (estado !== 'jogo') return;
  musica?.parar();
  const total = fase.objetos.filter((o) => o.t === 'moeda').length;
  const proxima = FASES.findIndex((f) => f === fase) + 1;
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa centro' },
      el('div', { cls: 'grande', textContent: '🏆' }),
      el('h2', { textContent: pratica ? 'Fase completa no modo prática!' : 'Fase completa!' }),
      el('p', { textContent: `${fase.nome} em ${tentativa} ${tentativa === 1 ? 'tentativa' : 'tentativas'}` }),
      total ? el('p', { cls: 'moedas', textContent: `${'★'.repeat(jog.moedas.size)}${'☆'.repeat(total - jog.moedas.size)} moedas${pratica ? ' (contam só fora do modo prática)' : ''}` }) : null,
      el('button', { cls: 'btn forte grande', textContent: 'Jogar de novo', onclick: () => jogar(fase, chaveFase, pratica, doEditor) }),
      proxima > 0 && proxima < FASES.length ? el('button', { cls: 'btn', textContent: `Próxima: ${FASES[proxima].nome}`, onclick: () => jogar(FASES[proxima], FASES[proxima].nome, false) }) : null,
      doEditor ? el('button', { cls: 'btn', textContent: 'Voltar ao editor', onclick: () => editar(doEditor!) }) : null,
      el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
    ),
  );
  tela.hidden = false;
  hud.hidden = true;
}

function desenharHud(): void {
  const som = el('button', { cls: 'icone', title: 'Som', textContent: estaMudo() ? '🔇' : '🔊' });
  som.onclick = () => (som.textContent = alternarSom() ? '🔇' : '🔊');
  const itens: HTMLElement[] = [el('button', { cls: 'icone', title: 'Pausar (Esc)', textContent: '❚❚', onclick: () => alternarPausa() }), som];
  if (pratica) itens.push(el('button', { cls: 'icone', title: 'Marcar checkpoint (Z)', textContent: '◆', onclick: () => marcarCheckpoint() }), el('span', { cls: 'pratica', textContent: 'MODO PRÁTICA' }));
  hud.replaceChildren(...itens);
}

/* ---------- Menu ---------- */

function desenharFundoMenu(t: number): void {
  const f = FASES[Math.floor(t / 8) % FASES.length];
  d.cam.x = t * 4;
  d.cam.y = 0;
  d.fundo(f, Math.pow(1 - ((t * 2) % 1), 4), t);
  d.limites(f, null);
  d.objetos(f, t, new Set(), new Set(), new Set());
}

function menu(): void {
  fecharEditor?.();
  fecharEditor = null;
  musica?.parar();
  estado = 'menu';
  hud.hidden = true;
  const r = recordes();
  const cartao = (f: Fase) => {
    const rec = r[f.nome];
    const total = f.objetos.filter((o) => o.t === 'moeda').length;
    const pegas = rec?.moedas.length ?? 0;
    return el(
      'div',
      { cls: 'fase' },
      el('div', { cls: 'fase-topo' }, el('strong', { textContent: f.nome }), el('span', { cls: `dif dif-${f.dificuldade.toLowerCase()}`, textContent: f.dificuldade })),
      el('div', { cls: 'barra' }, comEstilo(el('span'), `width:${Math.round((rec?.normal ?? 0) * 100)}%`)),
      el('small', { textContent: `Recorde ${Math.round((rec?.normal ?? 0) * 100)}% · prática ${Math.round((rec?.pratica ?? 0) * 100)}% · ${'★'.repeat(pegas)}${'☆'.repeat(total - pegas)}` }),
      el('div', { cls: 'linha' }, el('button', { cls: 'btn forte', textContent: '▶ Jogar', onclick: () => jogar(f, f.nome, false) }), el('button', { cls: 'btn', textContent: 'Prática', onclick: () => jogar(f, f.nome, true) })),
    );
  };
  const amostra = el('canvas', { cls: 'amostra', width: 96, height: 96 });
  const pintarAmostra = (): void => {
    const c = amostra.getContext('2d')!;
    c.clearRect(0, 0, 96, 96);
    c.fillStyle = icone.cor1;
    c.fillRect(18, 18, 60, 60);
    c.strokeStyle = '#000';
    c.lineWidth = 5;
    c.strokeRect(18, 18, 60, 60);
    c.fillStyle = icone.cor2;
    c.fillRect(30, 30, 36, 36);
    c.fillStyle = '#000';
    const olho = icone.rosto === 2 ? 9 : 6;
    c.fillRect(36, 39, olho, icone.rosto === 3 ? olho / 2 : olho);
    c.fillRect(54, 39, olho, icone.rosto === 3 ? olho / 2 : olho);
    if (icone.rosto !== 1) c.fillRect(39, 54, 18, 4);
  };
  const paleta = (qual: 'cor1' | 'cor2') =>
    el(
      'div',
      { cls: 'cores' },
      ...CORES_ICONE.map((cor) =>
        comEstilo(
          el('button', {
            cls: icone[qual] === cor ? 'cor ativa' : 'cor',
            title: cor,
            onclick: () => {
              icone = { ...icone, [qual]: cor };
              guardar('cubo.icone', icone);
              menu();
            },
          }),
          `background:${cor}`,
        ),
      ),
    );
  const salvas = ler<FaseEditor[]>('cubo.editor', []);
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa larga' },
      el('h1', { textContent: 'Cubo no Ritmo' }),
      el('p', { cls: 'sub', textContent: 'Toque, clique ou aperte espaço no ritmo. Portais trocam o modo: cubo, nave, bola, ovni, onda, robô e aranha.' }),
      el('div', { cls: 'fases' }, ...FASES.map(cartao)),
      el(
        'section',
        { cls: 'icone-sec' },
        amostra,
        el('div', {}, el('strong', { textContent: 'Seu ícone' }), paleta('cor1'), paleta('cor2'), el('div', { cls: 'cores' }, ...[0, 1, 2, 3].map((rr) => el('button', { cls: icone.rosto === rr ? 'cor ativa rosto' : 'cor rosto', textContent: ['🙂', '😐', '😮', '😑'][rr], onclick: () => ((icone = { ...icone, rosto: rr }), guardar('cubo.icone', icone), menu()) })))),
      ),
      el(
        'section',
        { cls: 'editor-sec' },
        el('strong', { textContent: '🛠 Editor de fases' }),
        el('div', { cls: 'linha' }, el('button', { cls: 'btn', textContent: 'Criar fase', onclick: () => editar({ nome: '', bpm: 128, musica: 1, objetos: [] }) }), ...salvas.slice(0, 6).map((f) => el('button', { cls: 'btn', textContent: `✎ ${f.nome || 'sem nome'}`, onclick: () => editar(f) }))),
      ),
      el('p', { cls: 'nota', textContent: 'Controles: segurar faz o cubo pular sempre que tocar o chão, a nave subir e a onda ir para cima. No modo prática: Z marca checkpoint, X apaga. Esc pausa.' }),
    ),
  );
  pintarAmostra();
  tela.hidden = false;
}

/* ---------- Editor ---------- */

function editar(f: FaseEditor): void {
  musica?.parar();
  estado = 'editor';
  tela.hidden = true;
  hud.hidden = true;
  fecharEditor?.();
  fecharEditor = abrirEditor(app, d, f, {
    testar: (atual) => {
      fecharEditor?.();
      fecharEditor = null;
      const fase = paraFase(atual);
      jogar(fase, '', false, atual);
    },
    sair: () => menu(),
    salvar: (atual) => {
      const lista = ler<FaseEditor[]>('cubo.editor', []).filter((x) => x.nome !== atual.nome);
      guardar('cubo.editor', [{ ...atual, nome: atual.nome || `Fase ${lista.length + 1}` }, ...lista].slice(0, 20));
      alert('Fase salva neste aparelho.');
    },
    compartilhar: async (atual) => {
      const link = `${location.origin}${location.pathname}#fase=${codificar(atual)}`;
      try {
        await navigator.clipboard.writeText(link);
        alert('Link copiado! Quem abrir joga a sua fase.');
      } catch {
        prompt('Copie o link da sua fase:', link);
      }
    },
  });
}

/* ---------- Início ---------- */

document.addEventListener('visibilitychange', () => {
  if (document.hidden && estado === 'jogo' && !pausado) alternarPausa();
});

const doLink = location.hash.match(/#fase=([\w-]+)/);
if (doLink) {
  try {
    const f = decodificar(doLink[1]);
    tela.replaceChildren(
      el(
        'div',
        { cls: 'caixa centro' },
        el('h2', { textContent: `Fase compartilhada: ${f.nome}` }),
        el('p', { cls: 'nota', textContent: `${f.objetos.length} objetos` }),
        el('button', { cls: 'btn forte grande', textContent: '▶ Jogar', onclick: () => jogar(paraFase(f), `link:${f.nome}`, false) }),
        el('button', { cls: 'btn', textContent: 'Abrir no editor', onclick: () => editar(f) }),
        el('button', { cls: 'btn', textContent: 'Menu', onclick: () => menu() }),
      ),
    );
  } catch {
    menu();
  }
} else menu();
requestAnimationFrame(quadro);
