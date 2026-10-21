// Som da fuga, tudo sintetizado: batida no estilo tamborzão, sirene (mais alta quando a viatura chega perto),
// hélice do helicóptero e os efeitos (moeda, pulo, tropeço).

let ctx: AudioContext | null = null;
let mestre: GainNode;
let ruido: AudioBuffer;
let timer: ReturnType<typeof setInterval> | null = null;
let passo = 0;
let proximo = 0;
let bpm = 128;
let sirene: { osc: OscillatorNode; lfo: OscillatorNode; ganho: GainNode } | null = null;
let helice: { src: AudioBufferSourceNode; ganho: GainNode } | null = null;
let mudo = (() => {
  try {
    return localStorage.getItem('fuga.mudo') === '1';
  } catch {
    return false;
  }
})();

export const estaMudo = (): boolean => mudo;
export function alternarSom(): boolean {
  mudo = !mudo;
  try {
    localStorage.setItem('fuga.mudo', mudo ? '1' : '0');
  } catch {
    /* sem armazenamento */
  }
  if (ctx) mestre.gain.value = mudo ? 0 : 0.6;
  return mudo;
}

/** Chame num clique: os navegadores só liberam som depois de um toque. */
export function destravar(): void {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    mestre = ctx.createGain();
    mestre.gain.value = mudo ? 0 : 0.6;
    mestre.connect(comp).connect(ctx.destination);
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  void ctx.resume();
}

function env(t: number, pico: number, dur: number): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(mestre);
  return g;
}

function tom(t: number, de: number, ate: number, dur: number, vol: number, tipo: OscillatorType = 'sine'): void {
  const o = ctx!.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(de, t);
  o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  o.connect(env(t, vol, dur));
  o.start(t);
  o.stop(t + dur + 0.02);
}

function chiado(t: number, dur: number, f: number, vol: number, tipo: BiquadFilterType = 'highpass'): void {
  const s = ctx!.createBufferSource();
  s.buffer = ruido;
  const filtro = ctx!.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = f;
  s.connect(filtro).connect(env(t, vol, dur));
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

/* ---------- Batida (16 semicolcheias por compasso) ---------- */

// Tamborzão simplificado: bumbo marcando o "tum… tum-tum", palmas no 2 e no 4, tambores graves no meio.
const BUMBO = [0, 3, 8, 11, 14];
const PALMA = [4, 12];
const TAMBOR = [6, 7, 10, 15];
const BAIXO = [45, 45, 48, 43]; // Lá, Lá, Dó, Sol (uma nota por compasso)

function agendar(): void {
  if (!ctx) return;
  const semi = 60 / bpm / 4;
  while (proximo < ctx.currentTime + 0.12) {
    const s = passo % 16;
    const compasso = Math.floor(passo / 16);
    const t = proximo;
    if (BUMBO.includes(s)) tom(t, 140, 45, 0.25, 0.9);
    if (PALMA.includes(s)) chiado(t, 0.16, 1400, 0.45, 'bandpass');
    if (TAMBOR.includes(s)) tom(t, s === 15 ? 260 : 190, 120, 0.12, 0.35);
    if (s % 2 === 0) chiado(t, 0.04, 7500, s % 4 === 2 ? 0.12 : 0.06);
    if (s === 0 || s === 8) {
      const f = 440 * Math.pow(2, (BAIXO[compasso % 4] - 69) / 12);
      tom(t, f, f * 0.98, 0.35, 0.25, 'sawtooth');
    }
    proximo += semi;
    passo++;
  }
}

export function tocarMusica(): void {
  if (!ctx) return;
  pararMusica();
  passo = 0;
  proximo = ctx.currentTime + 0.05;
  timer = setInterval(agendar, 25);
}

/** A música acelera junto com o nível de procurado. */
export function andamento(novo: number): void {
  bpm = novo;
}

export function pararMusica(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/* ---------- Sirene e helicóptero ---------- */

/** Liga a sirene; volume de 0 a 1 conforme a viatura chega perto. */
export function sireneVolume(v: number): void {
  if (!ctx) return;
  if (!sirene) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 900;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.45; // sobe e desce como sirene
    const lfoG = ctx.createGain();
    lfoG.gain.value = 320;
    lfo.connect(lfoG).connect(osc.frequency);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 1800;
    const ganho = ctx.createGain();
    ganho.gain.value = 0;
    osc.connect(filtro).connect(ganho).connect(mestre);
    osc.start();
    lfo.start();
    sirene = { osc, lfo, ganho };
  }
  sirene.ganho.gain.setTargetAtTime(0.02 + v * 0.1, ctx.currentTime, 0.2);
}

export function heliceVolume(v: number): void {
  if (!ctx) return;
  if (!helice) {
    const src = ctx.createBufferSource();
    src.buffer = ruido;
    src.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 300;
    const ganho = ctx.createGain();
    ganho.gain.value = 0;
    // "Tchuc-tchuc": o volume pulsa rápido como a hélice.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.5;
    const pulso = ctx.createGain();
    pulso.gain.value = 0.5;
    lfo.connect(lfoG).connect(pulso.gain);
    src.connect(filtro).connect(pulso).connect(ganho).connect(mestre);
    src.start();
    lfo.start();
    helice = { src, ganho };
  }
  helice.ganho.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.4);
}

export function silenciarPerseguicao(): void {
  if (!ctx) return;
  sirene?.ganho.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  helice?.ganho.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
}

/* ---------- Efeitos ---------- */

export const efeito = {
  moeda: () => ctx && [1319, 1760].forEach((f, i) => tom(ctx!.currentTime + i * 0.05, f, f, 0.1, 0.12, 'square')),
  pulo: () => ctx && tom(ctx.currentTime, 300, 700, 0.18, 0.15, 'triangle'),
  abaixo: () => ctx && chiado(ctx.currentTime, 0.25, 900, 0.25, 'lowpass'),
  tropeco: () => {
    if (!ctx) return;
    chiado(ctx.currentTime, 0.3, 400, 0.6, 'lowpass');
    tom(ctx.currentTime, 220, 90, 0.3, 0.35, 'sawtooth');
  },
  estrela: () => ctx && [523, 659, 784, 1047].forEach((f, i) => tom(ctx!.currentTime + i * 0.07, f, f, 0.15, 0.1, 'triangle')),
  preso: () => {
    if (!ctx) return;
    [392, 330, 262, 196].forEach((f, i) => tom(ctx!.currentTime + i * 0.15, f, f * 0.97, 0.3, 0.18, 'square'));
  },
};
