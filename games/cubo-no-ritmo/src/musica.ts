// Música eletrônica produzida na hora (Web Audio), uma por fase, no tempo exato do jogo:
// o relógio do áudio é o relógio da física, então obstáculo e batida não se desencontram.
//
// Cadeia de mixagem: instrumentos → barramento da música (com "pumping": o volume abaixa a cada bumbo, como
// sidechain de EDM) + bateria → reverb e delay estéreo → compressor → limitador → saída.
// Arranjo por blocos de 8 compassos: intro, build-up (virada e riser), drop, breakdown, build-up, drop.

const freq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

type Estilo = 'house' | 'futurebass' | 'electro' | 'trance';

interface Trilha {
  estilo: Estilo;
  acordes: number[][]; // 4 acordes (notas MIDI), um por compasso
  melodia: number[]; // 32 semicolcheias (2 compassos), graus no acorde; -1 = pausa
}

const TRILHAS: Trilha[] = [
  // House: piano/pluck no contratempo, baixo saltando oitava.
  { estilo: 'house', acordes: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], melodia: [3, -1, 2, -1, 1, -1, 2, 3, -1, 2, -1, 1, 0, -1, -1, -1, 3, -1, 2, -1, 1, 2, -1, 3, -1, -1, 2, -1, 1, -1, 0, -1] },
  // Future bass: acordes largos de supersaw com pumping forte.
  { estilo: 'futurebass', acordes: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 66]], melodia: [2, -1, 3, -1, 2, 1, -1, 0, -1, -1, 1, 2, -1, 3, -1, -1, 2, -1, 3, -1, 4, -1, 3, 2, -1, -1, 1, -1, 2, -1, -1, -1] },
  // Electro: baixo "wobble" e bateria pesada.
  { estilo: 'electro', acordes: [[62, 65, 69, 72], [58, 62, 65, 69], [53, 57, 60, 64], [60, 64, 67, 70]], melodia: [0, 0, -1, 2, -1, 0, -1, 3, -1, 2, 0, -1, 1, -1, 2, -1, 0, 0, -1, 2, -1, 0, -1, 3, 2, -1, 1, -1, 0, -1, -1, -1] },
  // Trance: arpejo rápido, baixo galopado e lead épico.
  { estilo: 'trance', acordes: [[64, 67, 71, 74], [60, 64, 67, 71], [55, 59, 62, 66], [62, 66, 69, 73]], melodia: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1, 3, 2, 1, 0, 1, 2, 3, 4] },
];

/* ---------- Contexto e mixagem ---------- */

let ctx: AudioContext | null = null;
let mestre: GainNode; // volume geral (mudo)
let entradaComp: GainNode; // entra no compressor/limitador
let reverb: ConvolverNode;
let ruido: AudioBuffer;
let mudo = (() => {
  try {
    return localStorage.getItem('cubo.mudo') === '1';
  } catch {
    return false;
  }
})();

/** Resposta de impulso de uma sala (ruído estéreo que decai): reverb sem arquivo. */
function impulso(c: AudioContext, seg: number, queda: number): AudioBuffer {
  const n = Math.floor(c.sampleRate * seg);
  const b = c.createBuffer(2, n, c.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const d = b.getChannelData(canal);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, queda);
  }
  return b;
}

export function destravar(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    const c = ctx;
    mestre = c.createGain();
    mestre.gain.value = mudo ? 0 : 0.8;
    // Compressor de mixagem e um limitador no fim (sem distorcer quando soma tudo).
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.2;
    const limitador = c.createDynamicsCompressor();
    limitador.threshold.value = -3;
    limitador.ratio.value = 20;
    limitador.attack.value = 0.002;
    limitador.release.value = 0.1;
    entradaComp = c.createGain();
    entradaComp.connect(comp).connect(limitador).connect(mestre).connect(c.destination);
    reverb = c.createConvolver();
    reverb.buffer = impulso(c, 2.4, 3);
    const retornoReverb = c.createGain();
    retornoReverb.gain.value = 0.35;
    reverb.connect(retornoReverb).connect(entradaComp);
    ruido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
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
  if (ctx) mestre.gain.value = mudo ? 0 : 0.8;
  return mudo;
}

/** Pausa e volta o jogo inteiro (o relógio do áudio para junto). */
export const pausarAudio = (): Promise<void> => ctx?.suspend() ?? Promise.resolve();
export const continuarAudio = (): Promise<void> => ctx?.resume() ?? Promise.resolve();

/* ---------- Peças de síntese ---------- */

interface Barramentos {
  musica: GainNode; // passa pelo pumping
  bateria: GainNode;
  delay: GainNode; // envio para o delay
  reverb: GainNode; // envio para o reverb
  pump: GainNode;
}

function envelope(c: AudioContext, destino: AudioNode, t: number, a: number, pico: number, d: number, sustain: number, dur: number, r: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pico, t + a);
  g.gain.linearRampToValueAtTime(pico * sustain, t + a + d);
  g.gain.setValueAtTime(pico * sustain, t + Math.max(a + d, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r);
  g.connect(destino);
  return g;
}

function ruidoEm(c: AudioContext, destino: AudioNode, t: number, dur: number, tipo: BiquadFilterType, f: number, vol: number, q = 1): BiquadFilterNode {
  const s = c.createBufferSource();
  s.buffer = ruido;
  const filtro = c.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = f;
  filtro.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(filtro).connect(g).connect(destino);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
  return filtro;
}

/** Saturação leve (dá peso ao bumbo e ao baixo). */
let curvaSat: Float32Array | null = null;
function saturador(c: AudioContext, quanto = 2.5): WaveShaperNode {
  if (!curvaSat) {
    curvaSat = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curvaSat[i] = Math.tanh(x * quanto) / Math.tanh(quanto);
    }
  }
  const w = c.createWaveShaper();
  w.curve = curvaSat;
  return w;
}

const inst = {
  bumbo(c: AudioContext, b: Barramentos, t: number, forte = 1): void {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    const sat = saturador(c, 2);
    o.connect(sat).connect(envelope(c, b.bateria, t, 0.002, 1.1 * forte, 0.08, 0.6, 0.12, 0.28));
    o.start(t);
    o.stop(t + 0.5);
    ruidoEm(c, b.bateria, t, 0.015, 'highpass', 3000, 0.5 * forte); // o "clique" do ataque
    // Pumping: a música abaixa no bumbo e volta (sidechain).
    b.pump.gain.cancelScheduledValues(t);
    b.pump.gain.setValueAtTime(0.25, t);
    b.pump.gain.linearRampToValueAtTime(1, t + 0.22);
  },
  caixa(c: AudioContext, b: Barramentos, t: number, vol = 1): void {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    o.connect(envelope(c, b.bateria, t, 0.001, 0.35 * vol, 0.05, 0.2, 0.05, 0.1));
    o.start(t);
    o.stop(t + 0.25);
    ruidoEm(c, b.bateria, t, 0.22, 'bandpass', 2200, 0.7 * vol, 0.8);
    ruidoEm(c, b.reverb, t, 0.2, 'bandpass', 2200, 0.35 * vol, 0.8);
  },
  palma(c: AudioContext, b: Barramentos, t: number): void {
    for (const [d, v] of [
      [0, 0.5],
      [0.011, 0.45],
      [0.023, 0.55],
    ])
      ruidoEm(c, b.bateria, t + d, 0.05, 'bandpass', 1300, v, 1.4);
    ruidoEm(c, b.bateria, t + 0.03, 0.25, 'bandpass', 1300, 0.35, 1.2);
    ruidoEm(c, b.reverb, t, 0.3, 'bandpass', 1500, 0.4, 1);
  },
  /** Chimbal metálico (6 quadradas desafinadas, como na bateria 808). */
  chimbal(c: AudioContext, b: Barramentos, t: number, aberto: boolean, vol = 1): void {
    const filtro = c.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = 7000;
    const g = envelope(c, b.bateria, t, 0.001, 0.12 * vol, aberto ? 0.25 : 0.04, 0.01, 0.001, aberto ? 0.12 : 0.02);
    filtro.connect(g);
    for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 40 * r * 7.3;
      o.connect(filtro);
      o.start(t);
      o.stop(t + (aberto ? 0.45 : 0.08));
    }
  },
  prato(c: AudioContext, b: Barramentos, t: number): void {
    ruidoEm(c, b.bateria, t, 1.8, 'highpass', 6000, 0.35);
    ruidoEm(c, b.reverb, t, 2, 'highpass', 5000, 0.3);
  },
  baixo(c: AudioContext, b: Barramentos, t: number, nota: number, dur: number, brilho = 1): void {
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.Q.value = 6;
    filtro.frequency.setValueAtTime(180, t);
    filtro.frequency.linearRampToValueAtTime(400 + 1400 * brilho, t + 0.02);
    filtro.frequency.exponentialRampToValueAtTime(220, t + Math.max(0.12, dur));
    const sat = saturador(c, 1.6);
    filtro.connect(sat).connect(envelope(c, b.musica, t, 0.004, 0.45, 0.1, 0.7, dur, 0.06));
    for (const [tipo, mult, det] of [
      ['sawtooth', 1, -7],
      ['sawtooth', 1, 7],
      ['square', 0.5, 0],
    ] as const) {
      const o = c.createOscillator();
      o.type = tipo;
      o.frequency.value = freq(nota) * mult;
      o.detune.value = det;
      o.connect(filtro);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  },
  wobble(c: AudioContext, b: Barramentos, t: number, nota: number, dur: number, velocidade: number): void {
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.Q.value = 10;
    filtro.frequency.value = 400;
    const lfo = c.createOscillator();
    lfo.frequency.value = velocidade;
    const lfoG = c.createGain();
    lfoG.gain.value = 900;
    lfo.connect(lfoG).connect(filtro.frequency);
    const sat = saturador(c, 3);
    filtro.connect(sat).connect(envelope(c, b.musica, t, 0.01, 0.4, 0.05, 0.9, dur, 0.05));
    for (const det of [-10, 10]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq(nota);
      o.detune.value = det;
      o.connect(filtro);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    const sub = c.createOscillator();
    sub.frequency.value = freq(nota - 12);
    sub.connect(envelope(c, b.musica, t, 0.01, 0.35, 0.05, 0.9, dur, 0.05));
    sub.start(t);
    sub.stop(t + dur + 0.1);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  },
  /** Supersaw: 7 serras desafinadas espalhadas no estéreo (o som "largo" de EDM). */
  supersaw(c: AudioContext, b: Barramentos, t: number, notas: number[], dur: number, vol: number, corte = 4500): void {
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = corte;
    const g = envelope(c, b.musica, t, 0.01, vol, 0.2, 0.75, dur, 0.25);
    filtro.connect(g);
    const envio = c.createGain();
    envio.gain.value = 0.5;
    filtro.connect(envio).connect(b.reverb);
    const espalhar = [-30, -18, -8, 0, 8, 18, 30];
    for (const n of notas) {
      espalhar.forEach((cents, i) => {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq(n);
        o.detune.value = cents;
        const pan = c.createStereoPanner();
        pan.pan.value = (i / (espalhar.length - 1)) * 1.6 - 0.8;
        o.connect(pan).connect(filtro);
        o.start(t);
        o.stop(t + dur + 0.35);
      });
    }
  },
  pluck(c: AudioContext, b: Barramentos, t: number, nota: number, vol: number, tipo: OscillatorType = 'sawtooth'): void {
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(5000, t);
    filtro.frequency.exponentialRampToValueAtTime(600, t + 0.18);
    const g = envelope(c, b.musica, t, 0.002, vol, 0.16, 0.0001, 0.001, 0.05);
    filtro.connect(g);
    const envio = c.createGain();
    envio.gain.value = 0.6;
    g.connect(envio).connect(b.delay);
    for (const det of [-6, 6]) {
      const o = c.createOscillator();
      o.type = tipo;
      o.frequency.value = freq(nota);
      o.detune.value = det;
      o.connect(filtro);
      o.start(t);
      o.stop(t + 0.3);
    }
  },
  pad(c: AudioContext, b: Barramentos, t: number, notas: number[], dur: number): void {
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 1400;
    const g = envelope(c, b.musica, t, dur * 0.3, 0.09, 0.1, 1, dur * 0.8, dur * 0.4);
    filtro.connect(g);
    filtro.connect(b.reverb);
    for (const n of notas)
      for (const det of [-12, 12]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq(n);
        o.detune.value = det;
        o.connect(filtro);
        o.start(t);
        o.stop(t + dur * 1.3);
      }
  },
  /** Riser: ruído que sobe de tom e volume antes do drop. */
  riser(c: AudioContext, b: Barramentos, t: number, dur: number): void {
    const s = c.createBufferSource();
    s.buffer = ruido;
    s.loop = true;
    const filtro = c.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 4;
    filtro.frequency.setValueAtTime(300, t);
    filtro.frequency.exponentialRampToValueAtTime(9000, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    s.connect(filtro).connect(g).connect(b.bateria);
    g.connect(b.reverb);
    s.start(t);
    s.stop(t + dur + 0.1);
  },
  impacto(c: AudioContext, b: Barramentos, t: number): void {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    o.connect(envelope(c, b.bateria, t, 0.005, 0.9, 0.2, 0.4, 0.3, 1));
    o.start(t);
    o.stop(t + 1.6);
    inst.prato(c, b, t);
  },
};

/* ---------- Arranjo ---------- */

type Parte = 'intro' | 'build' | 'drop' | 'quebra';

/** Parte da música em cada compasso (blocos de 8; depois do segundo drop, repete do primeiro build). */
function parteDo(compasso: number): { parte: Parte; dentro: number } {
  const ordem: Parte[] = ['intro', 'build', 'drop', 'drop', 'quebra', 'build', 'drop', 'drop'];
  let bloco = Math.floor(compasso / 8);
  if (bloco >= ordem.length) bloco = 1 + ((bloco - ordem.length) % (ordem.length - 1));
  return { parte: ordem[bloco], dentro: compasso % 8 };
}

export class Musica {
  private inicio = 0;
  private offset = 0;
  private passo = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private b: Barramentos | null = null;
  private saida: GainNode | null = null;
  private trilha: Trilha;

  constructor(
    indice: number,
    readonly bpm: number,
  ) {
    destravar();
    this.trilha = TRILHAS[indice % TRILHAS.length];
  }

  get semi(): number {
    return 60 / this.bpm / 4;
  }

  private montarBarramentos(): Barramentos {
    const c = ctx!;
    this.saida = c.createGain();
    this.saida.connect(entradaComp);
    const pump = c.createGain();
    const musica = c.createGain();
    musica.gain.value = 0.9;
    musica.connect(pump).connect(this.saida);
    const bateria = c.createGain();
    bateria.gain.value = 0.85;
    bateria.connect(this.saida);
    // Delay estéreo (3/16 de batida, ida e volta entre os lados).
    const delay = c.createGain();
    const esq = c.createDelay(1);
    const dir = c.createDelay(1);
    esq.delayTime.value = this.semi * 3;
    dir.delayTime.value = this.semi * 3;
    const fb = c.createGain();
    fb.gain.value = 0.35;
    const panE = c.createStereoPanner();
    panE.pan.value = -0.7;
    const panD = c.createStereoPanner();
    panD.pan.value = 0.7;
    const volDelay = c.createGain();
    volDelay.gain.value = 0.35;
    delay.connect(esq);
    esq.connect(panE).connect(volDelay);
    esq.connect(dir);
    dir.connect(panD).connect(volDelay);
    dir.connect(fb).connect(esq);
    volDelay.connect(pump);
    const envioReverb = c.createGain();
    envioReverb.connect(reverb);
    return { musica, bateria, delay, reverb: envioReverb, pump };
  }

  /** Toca a partir de "offset" segundos (o modo prática volta do checkpoint com a música no lugar certo). */
  tocar(offset = 0, espera = 0.05): void {
    this.parar();
    this.b = this.montarBarramentos();
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
    while (this.inicio + this.passo * this.semi - this.offset < c.currentTime + 0.15) {
      const n = this.passo++;
      const t = this.inicio + n * this.semi - this.offset;
      if (t < c.currentTime - 0.01) continue;
      this.semicolcheia(n, t);
    }
  }

  private semicolcheia(n: number, t: number): void {
    const c = ctx!;
    const b = this.b!;
    const tr = this.trilha;
    const s = n % 16;
    const compasso = Math.floor(n / 16);
    const { parte, dentro } = parteDo(compasso);
    const acorde = tr.acordes[compasso % 4];
    const raiz = acorde[0] - 24;
    const compassoDur = this.semi * 16;
    const meiaVelocidade = tr.estilo === 'electro' && parte === 'drop';

    /* Bateria */
    if (parte === 'drop' || (parte === 'build' && dentro < 6)) {
      if (meiaVelocidade ? s === 0 || s === 10 : s % 4 === 0) inst.bumbo(c, b, t);
      if (meiaVelocidade ? s === 8 : s === 4 || s === 12) (tr.estilo === 'house' ? inst.palma : inst.caixa)(c, b, t);
      if (tr.estilo === 'house' && s % 4 === 2) inst.chimbal(c, b, t, true, 0.8);
      else if (s % 2 === 0) inst.chimbal(c, b, t, false, s % 4 === 2 ? 1 : 0.6);
      if (tr.estilo === 'trance' && s % 2 === 1) inst.chimbal(c, b, t, false, 0.35);
    } else if (parte === 'intro' || parte === 'quebra') {
      if (s % 4 === 2) inst.chimbal(c, b, t, false, 0.5);
      if (parte === 'intro' && dentro >= 4 && s % 4 === 0) inst.bumbo(c, b, t, 0.6);
    }
    // Virada do build: caixas cada vez mais rápidas nos 2 últimos compassos, e o riser.
    if (parte === 'build' && dentro >= 6) {
      const k = (dentro - 6) * 16 + s;
      const cada = k < 8 ? 4 : k < 16 ? 2 : 1;
      if (s % cada === 0) inst.caixa(c, b, t, 0.4 + (k / 32) * 0.7);
      if (dentro === 6 && s === 0) inst.riser(c, b, t, compassoDur * 2);
    }
    if (parte === 'build' && dentro === 0 && s === 0) inst.prato(c, b, t);
    if (parte === 'drop' && dentro === 0 && s === 0 && parteDo(compasso - 1).parte === 'build') inst.impacto(c, b, t);

    /* Baixo */
    if (parte === 'drop' || (parte === 'build' && dentro < 6)) {
      if (tr.estilo === 'house' && s % 4 === 2) inst.baixo(c, b, t, raiz + (s === 6 ? 12 : 0), this.semi * 1.6, 0.8);
      if (tr.estilo === 'futurebass' && (s === 0 || s === 8)) inst.baixo(c, b, t, raiz, this.semi * 7, 0.5);
      if (tr.estilo === 'electro' && (s === 0 || s === 8)) inst.wobble(c, b, t, raiz, this.semi * 8, s === 8 && compasso % 2 ? 8 : 4);
      if (tr.estilo === 'trance' && s % 4 !== 0) inst.baixo(c, b, t, raiz, this.semi * 0.8, 1);
    }

    /* Harmonia */
    if (s === 0) {
      if (parte === 'intro' || parte === 'quebra') inst.pad(c, b, t, acorde, compassoDur);
      if (parte === 'build') inst.pad(c, b, t, acorde, compassoDur);
      if (parte === 'drop' && (tr.estilo === 'futurebass' || tr.estilo === 'trance')) inst.supersaw(c, b, t, acorde, compassoDur * 0.9, tr.estilo === 'futurebass' ? 0.06 : 0.035, tr.estilo === 'futurebass' ? 5200 : 3200);
    }
    if (tr.estilo === 'futurebass' && parte === 'drop' && [3, 6, 11, 14].includes(s)) inst.supersaw(c, b, t, acorde.map((x) => x + 12), this.semi * 1.2, 0.035, 6000);
    if (tr.estilo === 'house' && parte !== 'intro' && [2, 6, 10, 14].includes(s)) for (const nota of acorde.slice(0, 3)) inst.pluck(c, b, t, nota, 0.05, 'triangle');

    /* Melodia */
    const grau = tr.melodia[(compasso % 2) * 16 + s];
    if (grau >= 0) {
      const nota = acorde[grau % acorde.length] + 12 * (1 + Math.floor(grau / acorde.length));
      if (parte === 'drop') {
        if (tr.estilo === 'trance') inst.supersaw(c, b, t, [nota], this.semi * 1.5, 0.05, 6500);
        else inst.pluck(c, b, t, nota, tr.estilo === 'electro' ? 0.06 : 0.08, tr.estilo === 'electro' ? 'square' : 'sawtooth');
      } else if (parte === 'quebra' || (parte === 'build' && dentro < 6) || (parte === 'intro' && dentro >= 4)) inst.pluck(c, b, t, nota, 0.045, 'triangle');
    }
  }

  parar(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // Corta o que já estava agendado.
    if (this.saida && ctx) {
      try {
        this.saida.gain.setValueAtTime(0, ctx.currentTime);
        this.saida.disconnect();
      } catch {
        /* já desligada */
      }
    }
    this.saida = null;
  }
}

/* ---------- Efeitos do jogo ---------- */

function sfx(f: (c: AudioContext, destino: AudioNode) => void): void {
  const c = destravar();
  f(c, entradaComp);
}

const tomSimples = (c: AudioContext, destino: AudioNode, t: number, de: number, ate: number, dur: number, vol: number, tipo: OscillatorType): void => {
  const o = c.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(de, t);
  o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  o.connect(envelope(c, destino, t, 0.003, vol, dur * 0.3, 0.3, dur * 0.5, dur * 0.4));
  o.start(t);
  o.stop(t + dur + 0.1);
};

export const efeito = {
  morte: () =>
    sfx((c, d) => {
      ruidoEm(c, d, c.currentTime, 0.5, 'lowpass', 1200, 0.9);
      tomSimples(c, d, c.currentTime, 260, 50, 0.4, 0.4, 'sawtooth');
    }),
  moeda: () => sfx((c, d) => [1319, 1760, 2093].forEach((f, i) => tomSimples(c, d, c.currentTime + i * 0.06, f, f, 0.2, 0.12, 'triangle'))),
  orbe: () => sfx((c, d) => tomSimples(c, d, c.currentTime, 600, 1500, 0.15, 0.12, 'sine')),
  portal: () => sfx((c, d) => ruidoEm(c, d, c.currentTime, 0.35, 'bandpass', 2500, 0.25, 2)),
  vitoria: () => sfx((c, d) => [523, 659, 784, 1047, 1319].forEach((f, i) => tomSimples(c, d, c.currentTime + i * 0.1, f, f, 0.5, 0.14, 'triangle'))),
};
