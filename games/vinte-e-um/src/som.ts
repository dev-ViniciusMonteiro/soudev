// Sons sintetizados na hora (Web Audio), sem arquivos: carta deslizando, ficha, vitória e derrota.

let ctx: AudioContext | null = null;
let mudo = (() => {
  try {
    return localStorage.getItem('vinteum.mudo') === '1';
  } catch {
    return false;
  }
})();

const audio = (): AudioContext | null => {
  if (mudo) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

export const estaMudo = (): boolean => mudo;

export function alternarSom(): boolean {
  mudo = !mudo;
  try {
    localStorage.setItem('vinteum.mudo', mudo ? '1' : '0');
  } catch {
    /* sem armazenamento */
  }
  return mudo;
}

function ruido(a: AudioContext, quando: number, dur: number, freq: number, volume: number): void {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filtro = a.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = volume;
  src.connect(filtro).connect(g).connect(a.destination);
  src.start(quando);
}

function nota(a: AudioContext, quando: number, freq: number, dur: number, volume = 0.12, tipo: OscillatorType = 'triangle'): void {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  o.connect(g).connect(a.destination);
  o.start(quando);
  o.stop(quando + dur + 0.05);
}

export function tocar(tipo: 'carta' | 'ficha' | 'vitoria' | 'derrota' | 'blackjack' | 'vez', atraso = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + Math.max(0, atraso);
  if (tipo === 'carta') ruido(a, t, 0.09, 2600, 0.5);
  else if (tipo === 'ficha') {
    nota(a, t, 2200, 0.05, 0.08, 'square');
    nota(a, t + 0.05, 2600, 0.05, 0.06, 'square');
  } else if (tipo === 'vitoria') [523, 659, 784].forEach((f, i) => nota(a, t + i * 0.09, f, 0.25));
  else if (tipo === 'blackjack') [523, 659, 784, 1047].forEach((f, i) => nota(a, t + i * 0.08, f, 0.35, 0.14));
  else if (tipo === 'derrota') [330, 247].forEach((f, i) => nota(a, t + i * 0.16, f, 0.3, 0.1, 'sine'));
  else if (tipo === 'vez') nota(a, t, 880, 0.15, 0.06, 'sine');
}
