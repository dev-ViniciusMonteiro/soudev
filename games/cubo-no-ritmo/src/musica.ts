// Trilhas eletrônicas sintetizadas (Web Audio), uma por fase. O relógio do áudio é o relógio do jogo:
// a física anda até o tempo da música, então obstáculo e batida não se desencontram.
// Também os efeitos: morte, moeda, orbe, portal e fase completa.

const freq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

interface Trilha {
  acordes: number[][]; // notas MIDI (uma progressão de 4 compassos)
  baixo: 'pulsante' | 'quebrado' | 'wobble' | 'galope';
  lead: number[]; // índices no acorde, por semicolcheia (−1 = pausa)
  onda: OscillatorType;
}

const TRILHAS: Trilha[] = [
  { acordes: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], baixo: 'pulsante', lead: [0, -1, 1, 2, 0, -1, 2, 1, 0, -1, 1, 2, 2, 1, 0, -1], onda: 'square' },
  { acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], baixo: 'quebrado', lead: [2, 1, 0, 1, 2, -1, 2, 1, 0, 1, 2, 1, -1, 0, 1, 2], onda: 'triangle' },
  { acordes: [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]], baixo: 'wobble', lead: [0, 0, -1, 2, -1, 1, -1, 2, 0, -1, 2, -1, 1, -1, 0, 2], onda: 'sawtooth' },
  { acordes: [[64, 67, 71], [60, 64, 67], [55, 59, 62], [62, 66, 69]], baixo: 'galope', lead: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 2, 1, 0, 1], onda: 'square' },
];

let ctx: AudioContext | null = null;
let mestre: GainNode;
let ruido: AudioBuffer;
let mudo = (() => {
  try {
    return localStorage.getItem('cubo.mudo') === '1';
  } catch {
    return false;
  }
})();

export function destravar(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    mestre = ctx.createGain();
    mestre.gain.value = mudo ? 0 : 0.55;
    mestre.connect(comp).connect(ctx.destination);
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  void ctx.resume();
  return ctx;
}

export const estaMudo = (): boolean => mudo;
export function alternarSom(): boolean {
  mudo = !mudo;
  try {
    localStorage.setItem('cubo.mudo', mudo ? '1' : '0');
  } catch {
    /* sem armazenamento */
  }
  if (ctx) mestre.gain.value = mudo ? 0 : 0.55;
  return mudo;
}

function env(destino: AudioNode, t: number, pico: number, dur: number): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(destino);
  return g;
}

function osc(destino: AudioNode, t: number, f: number, dur: number, vol: number, tipo: OscillatorType, ate?: number): void {
  const o = ctx!.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  o.connect(env(destino, t, vol, dur));
  o.start(t);
  o.stop(t + dur + 0.02);
}

function chiado(destino: AudioNode, t: number, dur: number, f: number, vol: number, tipo: BiquadFilterType = 'highpass'): void {
  const s = ctx!.createBufferSource();
  s.buffer = ruido;
  const filtro = ctx!.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = f;
  s.connect(filtro).connect(env(destino, t, vol, dur));
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

/** Pausa e volta o jogo inteiro (o relógio do áudio para junto). */
export const pausarAudio = (): Promise<void> => ctx?.suspend() ?? Promise.resolve();
export const continuarAudio = (): Promise<void> => ctx?.resume() ?? Promise.resolve();

export class Musica {
  private inicio = 0;
  private offset = 0;
  private passo = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private saida: GainNode;
  private trilha: Trilha;

  constructor(
    indice: number,
    readonly bpm: number,
  ) {
    destravar();
    this.trilha = TRILHAS[indice % TRILHAS.length];
    this.saida = ctx!.createGain();
    this.saida.connect(mestre);
  }

  get semi(): number {
    return 60 / this.bpm / 4;
  }

  /** Toca a partir de "offset" segundos (modo prática volta do checkpoint com a música no lugar certo). */
  tocar(offset = 0, espera = 0.05): void {
    this.parar();
    this.saida = ctx!.createGain();
    this.saida.connect(mestre);
    this.offset = offset;
    this.inicio = ctx!.currentTime + espera;
    this.passo = Math.ceil(offset / this.semi);
    this.timer = setInterval(() => this.agendar(), 25);
    this.agendar();
  }

  /** Segundos de música tocados (o tempo da fase). */
  tempo(): number {
    return ctx ? ctx.currentTime - this.inicio + this.offset : 0;
  }

  private agendar(): void {
    const c = ctx!;
    while (this.inicio + this.passo * this.semi - this.offset < c.currentTime + 0.12) {
      const n = this.passo++;
      const t = this.inicio + n * this.semi - this.offset;
      if (t < c.currentTime - 0.01) continue;
      this.nota(n, t);
    }
  }

  private nota(n: number, t: number): void {
    const s = n % 16;
    const compasso = Math.floor(n / 16);
    const tr = this.trilha;
    const acorde = tr.acordes[compasso % 4];
    const intro = compasso < 2;
    const o = this.saida;
    if (s % 4 === 0) osc(o, t, 150, 0.25, intro ? 0.5 : 0.9, 'sine', 45);
    if (!intro && (s === 4 || s === 12)) chiado(o, t, 0.15, 1600, 0.4, 'bandpass');
    if (s % 2 === 0) chiado(o, t, 0.04, 8000, s % 4 === 2 ? 0.12 : 0.05);
    if (s === 0 && compasso % 8 === 0 && compasso > 0) chiado(o, t, 1.2, 5000, 0.15);
    // Baixo.
    const raiz = freq(acorde[0] - 24);
    if (!intro) {
      if (tr.baixo === 'pulsante' && s % 2 === 0) osc(o, t, raiz, 0.18, 0.25, 'sawtooth');
      if (tr.baixo === 'quebrado' && [0, 3, 6, 10, 12].includes(s)) osc(o, t, s === 6 ? raiz * 1.5 : raiz, 0.2, 0.28, 'sawtooth');
      if (tr.baixo === 'galope' && [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(s)) osc(o, t, raiz, 0.1, 0.24, 'square');
      if (tr.baixo === 'wobble' && s % 4 === 0) {
        const b = ctx!.createOscillator();
        b.type = 'sawtooth';
        b.frequency.value = raiz;
        const filtro = ctx!.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.Q.value = 8;
        const dur = this.semi * 4;
        filtro.frequency.setValueAtTime(200, t);
        filtro.frequency.linearRampToValueAtTime(1600, t + dur / 2);
        filtro.frequency.linearRampToValueAtTime(200, t + dur);
        b.connect(filtro).connect(env(o, t, 0.3, dur));
        b.start(t);
        b.stop(t + dur + 0.02);
      }
    }
    // Melodia (entra depois da introdução).
    const i = tr.lead[s];
    if (compasso >= 4 && i >= 0) osc(o, t, freq(acorde[i] + 12), 0.14, 0.07, tr.onda);
  }

  parar(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // Corta o que já estava agendado.
    try {
      this.saida.gain.setValueAtTime(0, ctx!.currentTime);
      this.saida.disconnect();
    } catch {
      /* já desligada */
    }
  }
}

/* ---------- Efeitos ---------- */

export const efeito = {
  morte: () => {
    const c = destravar();
    chiado(mestre, c.currentTime, 0.45, 900, 0.7, 'lowpass');
    osc(mestre, c.currentTime, 220, 0.3, 0.3, 'square', 60);
  },
  moeda: () => {
    const c = destravar();
    [1047, 1319, 1568].forEach((f, i) => osc(mestre, c.currentTime + i * 0.06, f, 0.18, 0.12, 'triangle'));
  },
  orbe: () => {
    const c = destravar();
    osc(mestre, c.currentTime, 700, 0.12, 0.1, 'sine', 1400);
  },
  portal: () => {
    const c = destravar();
    chiado(mestre, c.currentTime, 0.3, 2500, 0.15, 'bandpass');
  },
  vitoria: () => {
    const c = destravar();
    [523, 659, 784, 1047, 1319].forEach((f, i) => osc(mestre, c.currentTime + i * 0.1, f, 0.4, 0.13, 'triangle'));
  },
};
