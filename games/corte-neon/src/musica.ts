// Música eletrônica gerada na hora (Web Audio): bumbo, palma, chimbal, baixo e arpejo sobre Lá menor – Fá – Dó – Sol.
// O relógio do áudio é o relógio do jogo: os blocos chegam exatamente na batida.

const ACORDES = [
  [57, 60, 64], // Lá menor
  [53, 57, 60], // Fá
  [48, 52, 55], // Dó
  [55, 59, 62], // Sol
];
const freq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// Um AudioContext só, destravado no clique de "Ligar a câmera" (Safari e Chrome exigem um toque para tocar som).
let compartilhado: AudioContext | null = null;
export function destravarAudio(): AudioContext {
  compartilhado ??= new AudioContext({ latencyHint: 'interactive' });
  void compartilhado.resume();
  return compartilhado;
}

export class Musica {
  readonly ctx: AudioContext;
  private mestre: GainNode;
  private ruido: AudioBuffer;
  private inicio = 0;
  private proximaBatida = 0; // em semicolcheias (16 por compasso)
  private timer: ReturnType<typeof setInterval> | null = null;
  private fim = 0;

  constructor(
    readonly bpm: number,
    readonly duracao: number, // segundos de música
  ) {
    this.ctx = destravarAudio();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.mestre = this.ctx.createGain();
    this.mestre.gain.value = 0.55;
    this.mestre.connect(comp).connect(this.ctx.destination);
    this.ruido = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  get batida(): number {
    return 60 / this.bpm;
  }

  /** Segundos desde o começo da música (negativo durante a contagem). */
  tempo(): number {
    return this.ctx.currentTime - this.inicio;
  }

  async tocar(espera = 2): Promise<void> {
    await this.ctx.resume();
    this.inicio = this.ctx.currentTime + espera;
    this.proximaBatida = 0;
    this.fim = this.duracao;
    // Agenda um pouco à frente de cada vez: o som não depende do quadro do jogo.
    this.timer = setInterval(() => this.agendar(), 25);
    this.agendar();
  }

  private agendar(): void {
    const semi = this.batida / 4;
    while (this.inicio + this.proximaBatida * semi < this.ctx.currentTime + 0.15) {
      const n = this.proximaBatida++;
      const t = this.inicio + n * semi;
      if (n * semi >= this.fim) {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.prato(t);
        return;
      }
      this.passo(n, t);
    }
  }

  /** Uma semicolcheia: arranjo muda a cada 8 compassos (intro mais leve, refrão completo). */
  private passo(n: number, t: number): void {
    const compasso = Math.floor(n / 16);
    const s = n % 16;
    const acorde = ACORDES[compasso % 4];
    const parte = Math.floor(compasso / 8) % 4; // 0 intro, 1 verso, 2 refrão, 3 verso
    const intro = compasso < 2;
    if (s % 4 === 0 && !intro) this.bumbo(t);
    if ((s === 4 || s === 12) && compasso >= 2) this.palma(t);
    if (s % 2 === 0) this.chimbal(t, s % 4 === 2 ? 0.09 : 0.04);
    if (!intro && s % 2 === 0) this.baixo(t, freq(acorde[0] - 24 + (s % 8 === 6 ? 12 : 0)));
    if (parte !== 0 || compasso >= 4) {
      const nota = acorde[[0, 1, 2, 1][Math.floor(s / 2) % 4]] + (parte === 2 ? 12 : 0);
      if (s % 2 === 0) this.arpejo(t, freq(nota), parte === 2 ? 0.07 : 0.045);
    }
    if (s === 0 && parte === 2) this.pad(t, acorde);
    if (s === 0 && compasso % 8 === 0 && compasso > 0) this.prato(t);
  }

  private env(t: number, pico: number, queda: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + queda);
    g.connect(this.mestre);
    return g;
  }

  private bumbo(t: number): void {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    o.connect(this.env(t, 0.9, 0.3));
    o.start(t);
    o.stop(t + 0.32);
  }

  private barulho(t: number, dur: number, tipo: BiquadFilterType, f: number, vol: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.ruido;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.value = f;
    src.connect(filtro).connect(this.env(t, vol, dur));
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private palma(t: number): void {
    this.barulho(t, 0.18, 'bandpass', 1500, 0.35);
  }

  private chimbal(t: number, vol: number): void {
    this.barulho(t, 0.05, 'highpass', 8000, vol);
  }

  private prato(t: number): void {
    this.barulho(t, 1.4, 'highpass', 5000, 0.12);
  }

  private baixo(t: number, f: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(900, t);
    filtro.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    o.connect(filtro).connect(this.env(t, 0.22, 0.22));
    o.start(t);
    o.stop(t + 0.25);
  }

  private arpejo(t: number, f: number, vol: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 2400;
    o.connect(filtro).connect(this.env(t, vol, 0.16));
    o.start(t);
    o.stop(t + 0.18);
  }

  private pad(t: number, acorde: number[]): void {
    const dur = this.batida * 4;
    for (const nota of acorde) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq(nota);
      o.detune.value = Math.random() * 14 - 7;
      const filtro = this.ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 1100;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(filtro).connect(g).connect(this.mestre);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /* ---------- Efeitos do jogo ---------- */

  corte(forca = 1): void {
    const t = this.ctx.currentTime;
    this.barulho(t, 0.12, 'bandpass', 2800 + forca * 1500, 0.35);
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(500, t + 0.1);
    o.connect(this.env(t, 0.12, 0.12));
    o.start(t);
    o.stop(t + 0.14);
  }

  erro(): void {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.2);
    o.connect(this.env(t, 0.15, 0.22));
    o.start(t);
    o.stop(t + 0.24);
  }

  explosao(): void {
    const t = this.ctx.currentTime;
    this.barulho(t, 0.5, 'lowpass', 600, 0.6);
    this.bumbo(t);
  }

  orbe(): void {
    const t = this.ctx.currentTime;
    [988, 1319].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.frequency.value = f;
      o.connect(this.env(t + i * 0.06, 0.1, 0.2));
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.22);
    });
  }

  async pausar(): Promise<void> {
    await this.ctx.suspend();
  }

  async continuar(): Promise<void> {
    await this.ctx.resume();
  }

  async encerrar(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // Corta o som desta partida; o contexto fica para a próxima (sem precisar de outro toque).
    this.mestre.disconnect();
    await this.ctx.resume();
  }
}
