// Interface e sons em comum dos jogos de câmera: criação de elementos (sempre com textContent),
// armazenamento protegido, sons sintetizados e as telas de carregando, posicionamento e pausa.

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...filhos: (Node | string | null | false | undefined)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { cls, ...resto } = props;
  if (cls) e.className = cls;
  Object.assign(e, resto);
  for (const f of filhos) if (f) e.append(f);
  return e;
}

export function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : (JSON.parse(v) as T);
  } catch {
    return padrao;
  }
}

export function guardar(chave: string, v: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(v));
  } catch {
    /* sem armazenamento */
  }
}

/* ---------- Sons (Web Audio, sem arquivos) ---------- */

let ctx: AudioContext | null = null;
let ruido: AudioBuffer | null = null;
let mudo = ler('camjogos.mudo', false);

/** Chame dentro de um clique: navegadores só liberam som depois de um toque. */
export function destravarSom(): void {
  ctx ??= new AudioContext({ latencyHint: 'interactive' });
  void ctx.resume();
}

export const estaMudo = (): boolean => mudo;
export function alternarSom(): boolean {
  mudo = !mudo;
  guardar('camjogos.mudo', mudo);
  return mudo;
}

function audio(): AudioContext | null {
  if (mudo || !ctx) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function tom(freq: number, dur = 0.15, tipo: OscillatorType = 'triangle', vol = 0.15, atraso = 0, ate?: number): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + atraso;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function chiado(dur = 0.12, freq = 2500, vol = 0.3, tipo: BiquadFilterType = 'bandpass', atraso = 0): void {
  const a = audio();
  if (!a) return;
  if (!ruido) {
    ruido = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + atraso;
  const src = a.createBufferSource();
  src.buffer = ruido;
  const f = a.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export const sons = {
  acerto: () => [660, 880].forEach((f, i) => tom(f, 0.12, 'triangle', 0.12, i * 0.06)),
  erro: () => tom(220, 0.25, 'sawtooth', 0.1, 0, 110),
  explosao: () => {
    chiado(0.5, 500, 0.6, 'lowpass');
    tom(120, 0.3, 'sine', 0.4, 0, 40);
  },
  contagem: (ultimo = false) => tom(ultimo ? 1046 : 523, ultimo ? 0.35 : 0.12, 'square', 0.08),
  vitoria: () => [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.3, 'triangle', 0.13, i * 0.09)),
  derrota: () => [392, 330, 262].forEach((f, i) => tom(f, 0.3, 'sine', 0.12, i * 0.14)),
  moeda: () => [988, 1319].forEach((f, i) => tom(f, 0.15, 'square', 0.06, i * 0.07)),
};

/* ---------- Telas ---------- */

export const caixa = (...filhos: (Node | string | null | false | undefined)[]): HTMLElement => el('div', { cls: 'caixa' }, ...filhos);

export function carregando(alvo: HTMLElement, texto: string): (t: string) => void {
  const p = el('p', { textContent: texto });
  alvo.replaceChildren(el('div', { cls: 'caixa centro' }, el('div', { cls: 'girando' }), p));
  alvo.hidden = false;
  return (t) => (p.textContent = t);
}

export function botaoSom(): HTMLButtonElement {
  const b = el('button', { cls: 'icone', title: 'Som liga/desliga', textContent: estaMudo() ? '🔇' : '🔊' });
  b.onclick = () => (b.textContent = alternarSom() ? '🔇' : '🔊');
  return b;
}

/** Laço de quadros: chama fn com o tempo e se a câmera trouxe leitura nova. */
export function laco(fn: (agora: number, dt: number) => void): () => void {
  let id = 0;
  let antes = performance.now();
  const passo = (agora: number): void => {
    id = requestAnimationFrame(passo);
    const dt = Math.min(0.05, (agora - antes) / 1000);
    antes = agora;
    fn(agora, dt);
  };
  id = requestAnimationFrame(passo);
  return () => cancelAnimationFrame(id);
}

/** Texto que sobe e some sobre o canvas (pontos, avisos). */
export interface Flutuante {
  texto: string;
  x: number;
  y: number;
  cor: string;
  vida: number;
  tamanho: number;
}

export function desenharFlutuantes(c: CanvasRenderingContext2D, lista: Flutuante[], dt: number, u: number): Flutuante[] {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const f of lista) {
    f.vida -= dt;
    f.y -= dt * u * 8;
    c.globalAlpha = Math.max(0, Math.min(1, f.vida * 2));
    c.font = `900 ${f.tamanho * u}px system-ui, sans-serif`;
    c.lineWidth = u * 0.6;
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.strokeText(f.texto, f.x, f.y);
    c.fillStyle = f.cor;
    c.fillText(f.texto, f.x, f.y);
  }
  c.restore();
  return lista.filter((f) => f.vida > 0);
}

export const DICAS_CAMERA = [
  'Luz na sua frente (não atrás, como uma janela).',
  'Apoie o aparelho parado; no celular, deite na horizontal.',
  'O vídeo é analisado no seu navegador: nenhuma imagem sai do aparelho.',
];
