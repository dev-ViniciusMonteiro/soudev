/**
 * Pesca no Gelo: jogo original inspirado nos clássicos minigames de pesca no
 * gelo. Tudo é desenhado em código (sem imagens) e os sons são sintetizados.
 *
 * Regras: mexa a linha para cima e para baixo. Um peixe morde a minhoca, você
 * puxa até o buraco. Barril/bota derruba o peixe do anzol; água-viva dá choque
 * e leva a minhoca; tubarão come peixe e minhoca; caranguejo corta a linha.
 * 60 peixes chamam a Garoupa Gigante: fisgue-a com um peixe no anzol.
 */

const W = 800;
const H = 600;
const SURFACE = 158; // nível da água
const HOLE_X = 478;
const ROD_TIP = { x: 478, y: 72 };
const HOOK_MIN = SURFACE + 6;
const HOOK_MAX = H - 46;
const GOAL = 60;
const MAX_WORMS = 5;
const START_WORMS = 3;
const POINTS_FISH = 10;
const POINTS_GIANT = 150;
const BEST_KEY = 'pesca-no-gelo.recorde';

type Kind = 'fish' | 'jelly' | 'shark' | 'crab' | 'barrel' | 'boot' | 'can' | 'giant';
type Screen = 'menu' | 'playing' | 'paused' | 'over' | 'win';

interface Entity {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  t: number;
  color: string;
  dead?: boolean;
  fleeing?: boolean;
}

/* ---------- Canvas com escala (resolução lógica 800x600) ---------- */

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let scale = 1;
let offX = 0;
let offY = 0;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  scale = Math.min(canvas.width / W, canvas.height / H);
  offX = (canvas.width - W * scale) / 2;
  offY = (canvas.height - H * scale) / 2;
}
addEventListener('resize', resize);
resize();

/* ---------- Sons sintetizados ---------- */

let audio: AudioContext | null = null;
let muted = false;
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0): void {
  if (!audio || muted) return;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), audio.currentTime + dur);
  g.gain.setValueAtTime(vol, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  o.connect(g).connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + dur);
}
const sfx = {
  bite: () => tone(520, 0.12, 'triangle', 0.18, 300),
  catch: () => {
    tone(660, 0.1, 'triangle', 0.18);
    setTimeout(() => tone(880, 0.16, 'triangle', 0.18), 90);
  },
  zap: () => tone(1200, 0.35, 'sawtooth', 0.08, -900),
  chomp: () => tone(140, 0.25, 'square', 0.15, -80),
  snip: () => tone(1800, 0.08, 'square', 0.1, -600),
  clunk: () => tone(180, 0.18, 'triangle', 0.2, -60),
  worm: () => tone(400, 0.2, 'sine', 0.15, 400),
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.2), i * 140)),
  over: () => [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.18), i * 180)),
};

/* ---------- Estado ---------- */

let screen: Screen = 'menu';
let fishCount = 0;
let score = 0;
let worms = START_WORMS;
let hasBait = true;
let rebaitTimer = 0;
let hookY = 300;
let targetY = 300;
let hooked: Entity | null = null; // peixe (ou garoupa) no anzol
let entities: Entity[] = [];
let spawnTimers: Record<string, number> = {};
let giantSpawned = false;
let flash = 0;
let message = '';
let messageTimer = 0;
let time = 0;
let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY)) || 0;
} catch {
  best = 0;
}

const bubbles = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: SURFACE + Math.random() * (H - SURFACE), r: 1 + Math.random() * 3, s: 12 + Math.random() * 25 }));
const FISH_COLORS = ['#ffb347', '#7bd389', '#6ec6ff', '#ff8fab', '#f6e05e', '#c3a6ff'];

function say(text: string, seconds = 1.6): void {
  message = text;
  messageTimer = seconds;
}

function resetGame(): void {
  fishCount = 0;
  score = 0;
  worms = START_WORMS;
  hasBait = true;
  rebaitTimer = 0;
  hookY = targetY = 300;
  hooked = null;
  entities = [];
  spawnTimers = { fish: 0.4, barrel: 4, jelly: 3, shark: 6, crab: 5, can: 22 };
  giantSpawned = false;
  flash = 0;
  say('Mexa o mouse (ou o dedo) para subir e descer a linha', 3);
}

/* ---------- Criação de entidades ---------- */

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const fromSide = (): { x: number; dir: number } => (Math.random() < 0.5 ? { x: -90, dir: 1 } : { x: W + 90, dir: -1 });
const difficulty = (): number => 1 + Math.min(fishCount, GOAL) / 40; // 1 → 2,5

function spawn(kind: Kind, x?: number, y?: number): Entity {
  // Posição dada (ex.: testes): nada em direção à linha.
  const side = x !== undefined ? { x, dir: x < HOLE_X ? 1 : -1 } : fromSide();
  const d = difficulty();
  const base: Entity = { kind, x: x ?? side.x, y: y ?? rand(SURFACE + 60, H - 70), vx: 0, vy: 0, w: 46, h: 22, t: Math.random() * 6, color: '#fff' };
  switch (kind) {
    case 'fish':
      Object.assign(base, { vx: side.dir * rand(55, 115) * d, w: 46, h: 22, color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)] });
      break;
    case 'jelly':
      Object.assign(base, { vx: side.dir * rand(35, 60) * Math.sqrt(d), w: 40, h: 46, color: '#ff7ad9' });
      break;
    case 'shark':
      Object.assign(base, { x: x ?? (side.dir > 0 ? -200 : W + 200), vx: side.dir * rand(150, 210) * Math.sqrt(d), w: 150, h: 54, color: '#7d8fa3' });
      break;
    case 'crab':
      Object.assign(base, { y: y ?? rand(SURFACE + 70, H - 120), vx: side.dir * rand(70, 110), w: 54, h: 30, color: '#e4573d' });
      break;
    case 'barrel':
    case 'boot':
      Object.assign(base, { x: x ?? HOLE_X + rand(-120, 120), y: y ?? SURFACE + 4, vx: rand(-18, 18), vy: rand(45, 75) * Math.sqrt(d), w: kind === 'barrel' ? 38 : 40, h: kind === 'barrel' ? 48 : 34, color: kind === 'barrel' ? '#8b5a2b' : '#5b4636' });
      break;
    case 'can':
      Object.assign(base, { x: x ?? HOLE_X + rand(-70, 70), y: y ?? SURFACE + 4, vx: rand(-10, 10), vy: 38, w: 30, h: 34, color: '#c9d4dd' });
      break;
    case 'giant':
      Object.assign(base, { x: x ?? -220, y: y ?? 380, vx: 55 * side.dir, w: 190, h: 82, color: '#d9534f' });
      break;
  }
  entities.push(base);
  return base;
}

/* ---------- Colisões ---------- */

const near = (e: Entity, x: number, y: number, pad = 0): boolean =>
  Math.abs(e.x - x) < e.w / 2 + pad && Math.abs(e.y - y) < e.h / 2 + pad;

/** Boca do peixe: na frente do corpo, conforme a direção. */
const mouth = (e: Entity): { x: number; y: number } => ({ x: e.x + Math.sign(e.vx || 1) * e.w * 0.48, y: e.y });

/** Solta o que está no anzol: volta a nadar (a garoupa volta a rondar, senão nunca mais daria para vencer). */
function releaseHooked(speed: number): void {
  if (!hooked) return;
  hooked.dead = false;
  hooked.fleeing = hooked.kind !== 'giant';
  hooked.vx = (Math.random() < 0.5 ? -1 : 1) * (hooked.kind === 'giant' ? 55 : speed);
  entities.push(hooked);
  hooked = null;
}

function loseWorm(reason: string): void {
  releaseHooked(160);
  if (!hasBait) return;
  hasBait = false;
  worms -= 1;
  say(reason, 1.8);
  if (worms > 0) rebaitTimer = 1.2;
  else setTimeout(() => endGame(false), 900);
}

function knockFishOff(): void {
  if (!hooked) return;
  releaseHooked(170);
  sfx.clunk();
  say('Pancada! O peixe escapou (a minhoca ficou)');
}

function endGame(won: boolean): void {
  if (screen !== 'playing') return;
  screen = won ? 'win' : 'over';
  if (score > best) {
    best = score;
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // sem armazenamento: o recorde vale só nesta sessão
    }
  }
  if (won) sfx.win();
  else sfx.over();
}

/* ---------- Atualização ---------- */

function update(dt: number): void {
  time += dt;
  for (const b of bubbles) {
    b.y -= b.s * dt;
    if (b.y < SURFACE) {
      b.y = H;
      b.x = Math.random() * W;
    }
  }
  if (messageTimer > 0) messageTimer -= dt;
  if (flash > 0) flash -= dt;
  if (screen !== 'playing') return;

  // Linha: segue o alvo com velocidade limitada (com a garoupa fica pesada).
  const maxSpeed = hooked?.kind === 'giant' ? 150 : 560;
  const diff = targetY - hookY;
  hookY += Math.sign(diff) * Math.min(Math.abs(diff), maxSpeed * dt);
  hookY = Math.max(HOOK_MIN, Math.min(HOOK_MAX, hookY));
  const hookX = HOLE_X + Math.sin(time * 1.6) * 4;

  if (!hasBait && rebaitTimer > 0) {
    rebaitTimer -= dt;
    if (rebaitTimer <= 0 && worms > 0) {
      hasBait = true;
      sfx.worm();
    }
  }

  // Peixe chegou ao buraco.
  if (hooked && hookY <= HOOK_MIN + 4) {
    if (hooked.kind === 'giant') {
      score += POINTS_GIANT;
      say('🏆 Você pescou a Garoupa Gigante!', 3);
      hooked = null;
      endGame(true);
      return;
    }
    fishCount += 1;
    score += POINTS_FISH;
    hooked = null;
    sfx.catch();
    if (fishCount === GOAL) say('😮 Algo enorme se aproxima… fisgue com um PEIXE no anzol!', 3.5);
  }

  // Surgimento por progresso (mesma ordem do clássico: barris → águas-vivas → tubarões → caranguejos).
  const d = difficulty();
  for (const key of Object.keys(spawnTimers)) spawnTimers[key] -= dt;
  const count = (k: Kind): number => entities.filter((e) => e.kind === k && !e.dead).length;
  if (spawnTimers.fish <= 0) {
    if (count('fish') < 6) spawn('fish');
    spawnTimers.fish = rand(0.9, 1.8) / Math.sqrt(d);
  }
  if (spawnTimers.barrel <= 0) {
    spawn(Math.random() < 0.6 ? 'barrel' : 'boot');
    spawnTimers.barrel = rand(5, 9) / d;
  }
  if (fishCount >= 5 && spawnTimers.jelly <= 0) {
    if (count('jelly') < 3) spawn('jelly');
    spawnTimers.jelly = rand(4, 7) / d;
  }
  if (fishCount >= 20 && spawnTimers.shark <= 0) {
    if (count('shark') < 1) spawn('shark');
    spawnTimers.shark = rand(7, 12) / Math.sqrt(d);
  }
  if (fishCount >= 40 && spawnTimers.crab <= 0) {
    if (count('crab') < 1) spawn('crab');
    spawnTimers.crab = rand(8, 13);
  }
  if (spawnTimers.can <= 0) {
    if (worms < MAX_WORMS && count('can') === 0) spawn('can');
    spawnTimers.can = rand(18, 30);
  }
  if (fishCount >= GOAL && !giantSpawned) {
    giantSpawned = true;
    spawn('giant');
  }

  for (const e of entities) {
    e.t += dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.kind === 'jelly') e.y += Math.sin(e.t * 2) * 22 * dt;
    if (e.kind === 'fish' && !e.fleeing) e.y += Math.sin(e.t * 3) * 8 * dt;
    if (e.kind === 'giant') {
      // Vai e volta pela tela até ser fisgada.
      if (e.x > W - 120) e.vx = -Math.abs(e.vx);
      if (e.x < 120 && e.t > 4) e.vx = Math.abs(e.vx);
      e.y = 380 + Math.sin(e.t * 0.8) * 60;
    }
    if (e.x < -260 || e.x > W + 260 || e.y > H + 60) e.dead = true;
    if (e.kind === 'barrel' || e.kind === 'boot' || e.kind === 'can') {
      if (e.y > H - 30) {
        e.y = H - 30;
        e.vy = 0;
        e.vx = 0;
        if (e.t > 12) e.dead = true;
      }
    }
    if (e.dead) continue;

    switch (e.kind) {
      case 'fish':
        if (!e.fleeing && hasBait && !hooked) {
          const m = mouth(e);
          if (Math.hypot(m.x - hookX, m.y - hookY) < 22) {
            hooked = e;
            e.dead = true;
            sfx.bite();
          }
        }
        break;
      case 'jelly':
        if (near(e, hookX, hookY, 6) && (hasBait || hooked)) {
          flash = 0.35;
          sfx.zap();
          loseWorm('⚡ Choque da água-viva! Perdeu a minhoca');
        }
        break;
      case 'shark':
        if (hooked && hooked.kind !== 'giant' && near(e, hookX, hookY + 18, 4)) {
          sfx.chomp();
          hooked = null;
          loseWorm('🦈 O tubarão comeu o peixe e a minhoca!');
        }
        break;
      case 'crab':
        // Corta a linha quando passa por ela: o anzol está abaixo da altura do caranguejo.
        if (Math.abs(e.x - hookX) < e.w / 2 && hookY > e.y - e.h / 2 && (hasBait || hooked)) {
          sfx.snip();
          loseWorm('🦀 O caranguejo cortou a linha!');
        }
        break;
      case 'barrel':
      case 'boot':
        if (hooked && hooked.kind !== 'giant' && near(e, hookX, hookY + 18, 6)) knockFishOff();
        break;
      case 'can':
        if (near(e, hookX, hookY, 10)) {
          e.dead = true;
          worms = Math.min(MAX_WORMS, worms + 1);
          if (!hasBait) {
            hasBait = true;
            rebaitTimer = 0;
          }
          sfx.worm();
          say('🪱 Lata de minhocas! +1 minhoca');
        }
        break;
      case 'giant':
        if (hooked && hooked.kind === 'fish') {
          const m = mouth(e);
          if (Math.hypot(m.x - hookX, m.y - (hookY + 18)) < 40) {
            hooked = e;
            e.dead = true;
            sfx.bite();
            say('🎣 Fisgou a Garoupa Gigante! Puxe até o buraco!', 3);
          }
        }
        break;
    }
  }
  entities = entities.filter((e) => !e.dead);
}

/* ---------- Desenho ---------- */

function ellipse(x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawBackground(): void {
  // Céu e gelo.
  const sky = ctx.createLinearGradient(0, 0, 0, SURFACE);
  sky.addColorStop(0, '#bfe6ff');
  sky.addColorStop(1, '#eaf7ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, SURFACE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, SURFACE - 34, W, 34);
  ctx.fillStyle = '#d6ecf8';
  for (let i = 0; i < 9; i++) ellipse(40 + i * 95, SURFACE - 30, 60, 10, '#f4fbff');
  // Montanhas ao fundo.
  ctx.fillStyle = '#d9eefc';
  ctx.beginPath();
  ctx.moveTo(0, SURFACE - 34);
  for (let x = 0; x <= W; x += 80) ctx.lineTo(x + 40, SURFACE - 70 - ((x * 37) % 40));
  ctx.lineTo(W, SURFACE - 34);
  ctx.fill();

  // Água.
  const water = ctx.createLinearGradient(0, SURFACE, 0, H);
  water.addColorStop(0, '#3d8fd1');
  water.addColorStop(0.6, '#1b5c96');
  water.addColorStop(1, '#0b2a4a');
  ctx.fillStyle = water;
  ctx.fillRect(0, SURFACE, W, H - SURFACE);
  // Raios de luz.
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 150 + Math.sin(time * 0.4 + i) * 20;
    ctx.beginPath();
    ctx.moveTo(x, SURFACE);
    ctx.lineTo(x + 40, SURFACE);
    ctx.lineTo(x + 140, H);
    ctx.lineTo(x + 60, H);
    ctx.fill();
  }
  ctx.restore();
  // Bolhas.
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (const b of bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fundo: areia, pedras e algas.
  ctx.fillStyle = '#c8a96a';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H - 22 - Math.sin(x * 0.03) * 8);
  ctx.lineTo(W, H);
  ctx.fill();
  for (const [x, r] of [
    [90, 26],
    [600, 34],
    [720, 18],
  ]) ellipse(x, H - 18, r, r * 0.6, '#6b7b8c');
  ctx.strokeStyle = '#2f9e5b';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const x of [40, 170, 260, 560, 680, 760]) {
    ctx.beginPath();
    ctx.moveTo(x, H - 18);
    for (let s = 1; s <= 4; s++) ctx.lineTo(x + Math.sin(time * 1.5 + x + s) * 8, H - 18 - s * 22);
    ctx.stroke();
  }

  // Borda do gelo com o buraco.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, SURFACE - 6, HOLE_X - 46, 14);
  ctx.fillRect(HOLE_X + 46, SURFACE - 6, W - HOLE_X - 46, 14);
  ellipse(HOLE_X, SURFACE - 4, 50, 12, '#a6d8f5');
  ellipse(HOLE_X, SURFACE - 2, 42, 8, '#2a6fae');
}

/** Ursinho polar pescador (personagem original). */
function drawBear(): void {
  const x = 400;
  const y = SURFACE - 44;
  ellipse(x, y + 10, 34, 30, '#ffffff'); // corpo
  ellipse(x + 2, y + 18, 22, 18, '#f1f5f9'); // barriga
  ctx.fillStyle = '#d63b3b'; // cachecol
  ctx.fillRect(x - 24, y - 16, 50, 9);
  ctx.fillRect(x + 12, y - 12, 9, 22);
  ellipse(x + 4, y - 30, 24, 21, '#ffffff'); // cabeça
  ellipse(x - 12, y - 48, 8, 8, '#ffffff'); // orelhas
  ellipse(x + 20, y - 48, 8, 8, '#ffffff');
  ellipse(x - 12, y - 48, 4, 4, '#f3c6d3');
  ellipse(x + 20, y - 48, 4, 4, '#f3c6d3');
  ellipse(x + 14, y - 24, 10, 8, '#f1f5f9'); // focinho
  ellipse(x + 18, y - 27, 4, 3, '#1f2937'); // nariz
  ellipse(x + 2, y - 34, 3, 3.5, '#1f2937'); // olhos
  ellipse(x + 16, y - 36, 3, 3.5, '#1f2937');
  // Gorro.
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.ellipse(x + 4, y - 44, 22, 12, 0, Math.PI, 0);
  ctx.fill();
  ellipse(x + 4, y - 58, 6, 6, '#ffffff');
  // Vara.
  ctx.strokeStyle = '#7a4a24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 26, y + 4);
  ctx.lineTo(ROD_TIP.x, ROD_TIP.y);
  ctx.stroke();
  ellipse(x + 26, y + 6, 8, 7, '#ffffff'); // pata segurando
  // Reação ao peixe fisgado.
  if (hooked) {
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText('!', x - 6, y - 70);
  }
}

function drawFish(e: Entity, x = e.x, y = e.y, vertical = false): void {
  ctx.save();
  ctx.translate(x, y);
  if (vertical) ctx.rotate(-Math.PI / 2); // pendurado pela boca: cabeça para cima, no anzol
  else if (e.vx < 0) ctx.scale(-1, 1);
  const wiggle = Math.sin(e.t * 12) * 4;
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.moveTo(-e.w * 0.38, 0);
  ctx.lineTo(-e.w * 0.62, -e.h * 0.55 + wiggle);
  ctx.lineTo(-e.w * 0.62, e.h * 0.55 + wiggle);
  ctx.fill();
  ellipse(0, 0, e.w * 0.45, e.h * 0.5, e.color);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ellipse(-2, -e.h * 0.15, e.w * 0.25, e.h * 0.14, 'rgba(255,255,255,.35)');
  ellipse(e.w * 0.24, -e.h * 0.1, 4, 4, '#ffffff');
  ellipse(e.w * 0.26, -e.h * 0.1, 2, 2, '#111827');
  ctx.restore();
}

function drawEntity(e: Entity): void {
  switch (e.kind) {
    case 'fish':
      drawFish(e);
      break;
    case 'giant': {
      drawFish(e);
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.vx < 0) ctx.scale(-1, 1);
      ctx.fillStyle = '#b13c38';
      ctx.beginPath();
      ctx.moveTo(-30, -e.h * 0.45);
      ctx.lineTo(10, -e.h * 0.75);
      ctx.lineTo(30, -e.h * 0.42);
      ctx.fill();
      for (let i = 0; i < 4; i++) ellipse(-40 + i * 22, 6, 6, 5, 'rgba(120,20,20,.35)');
      ctx.restore();
      break;
    }
    case 'jelly': {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#ffb3ec';
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(e.x + i * 7, e.y);
        for (let s = 1; s <= 4; s++) ctx.lineTo(e.x + i * 7 + Math.sin(e.t * 4 + s + i) * 4, e.y + s * 7);
        ctx.stroke();
      }
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.w / 2, e.h / 2.2, 0, Math.PI, 0);
      ctx.fill();
      ellipse(e.x - 6, e.y - 10, 5, 3, 'rgba(255,255,255,.5)');
      ctx.restore();
      break;
    }
    case 'shark': {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.vx < 0) ctx.scale(-1, 1);
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.lineTo(-95, -24);
      ctx.lineTo(-88, 0);
      ctx.lineTo(-95, 24);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, -20);
      ctx.lineTo(10, -48);
      ctx.lineTo(24, -18);
      ctx.fill();
      ellipse(0, 0, 75, 26, e.color);
      ellipse(4, 8, 62, 13, '#d7dee6');
      ellipse(48, -6, 4, 4, '#111827');
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(52, 8);
      ctx.lineTo(70, 6);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'crab': {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 4;
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(s * 12, 4 + i * 4);
          ctx.lineTo(s * (26 + Math.sin(e.t * 10 + i) * 3), 12 + i * 5);
          ctx.stroke();
        }
      ellipse(0, 0, 24, 15, e.color);
      for (const s of [-1, 1]) {
        ellipse(s * 30, -14, 9, 7, e.color);
        ellipse(s * 34, -18, 4, 4, '#f7a089');
      }
      ellipse(-7, -14, 3, 4, '#ffffff');
      ellipse(7, -14, 3, 4, '#ffffff');
      ellipse(-7, -14, 1.5, 2, '#111827');
      ellipse(7, -14, 1.5, 2, '#111827');
      ctx.restore();
      break;
    }
    case 'barrel': {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.sin(e.t) * 0.3);
      ctx.fillStyle = e.color;
      ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(-e.w / 2, -e.h / 2 + 6, e.w, 5);
      ctx.fillRect(-e.w / 2, e.h / 2 - 11, e.w, 5);
      ctx.restore();
      break;
    }
    case 'boot': {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.sin(e.t * 1.3) * 0.4);
      ctx.fillStyle = e.color;
      ctx.fillRect(-10, -e.h / 2, 18, e.h - 8);
      ctx.fillRect(-10, e.h / 2 - 12, e.w - 6, 12);
      ctx.fillStyle = '#2d2219';
      ctx.fillRect(-10, e.h / 2 - 3, e.w - 6, 4);
      ctx.restore();
      break;
    }
    case 'can': {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = e.color;
      ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
      ctx.fillStyle = '#e85d75';
      ctx.fillRect(-e.w / 2, -6, e.w, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('ISCA', 0, 3);
      ctx.restore();
      break;
    }
  }
}

function drawLine(): void {
  const hookX = HOLE_X + Math.sin(time * 1.6) * 4;
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();
  // Anzol.
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(hookX - 5, hookY + 6, 6, 0, Math.PI);
  ctx.stroke();
  if (hooked) {
    hooked.t += 0.016;
    if (hooked.kind === 'giant') drawFish(hooked, hookX, hookY + 88, true);
    else drawFish(hooked, hookX, hookY + 22, true);
  } else if (hasBait) {
    // Minhoca.
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hookX - 8, hookY + 8);
    for (let i = 1; i <= 4; i++) ctx.lineTo(hookX - 8 + Math.sin(time * 8 + i) * 5, hookY + 8 + i * 5);
    ctx.stroke();
  }
}

function drawHud(): void {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 25, 45, .72)';
  roundRect(W - 238, 10, 228, 74, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`🐟 ${fishCount}/${GOAL}`, W - 224, 38);
  ctx.fillText(`⭐ ${score}`, W - 110, 38);
  ctx.font = '18px system-ui';
  ctx.fillText(`${'🪱'.repeat(Math.max(0, worms))}${worms <= 0 ? 'sem minhocas' : ''}`, W - 224, 70);
  ctx.fillStyle = 'rgba(8, 25, 45, .55)';
  roundRect(10, 10, 160, 32, 10);
  ctx.fill();
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '15px system-ui';
  ctx.fillText(`🏅 Recorde: ${best}`, 22, 32);
  if (messageTimer > 0 && message) {
    ctx.globalAlpha = Math.min(1, messageTimer * 2);
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    const w = ctx.measureText(message).width + 36;
    ctx.fillStyle = 'rgba(8, 25, 45, .8)';
    roundRect(W / 2 - w / 2, SURFACE + 14, w, 38, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, W / 2, SURFACE + 40);
  }
  ctx.restore();
}

function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawOverlay(title: string, lines: string[], button: string): void {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 20, 38, .72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px system-ui';
  ctx.fillText(title, W / 2, 170);
  ctx.font = '18px system-ui';
  ctx.fillStyle = '#d6ecff';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 222 + i * 30));
  const by = 230 + lines.length * 30 + 20;
  ctx.fillStyle = '#38bdf8';
  roundRect(W / 2 - 130, by, 260, 54, 27);
  ctx.fill();
  ctx.fillStyle = '#05203a';
  ctx.font = 'bold 22px system-ui';
  ctx.fillText(button, W / 2, by + 35);
  ctx.font = '13px system-ui';
  ctx.fillStyle = 'rgba(214,236,255,.7)';
  ctx.fillText(`${muted ? '🔇' : '🔊'} M liga/desliga o som · P pausa`, W / 2, H - 24);
  ctx.restore();
}

function render(): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#071a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  drawBackground();
  for (const e of entities) drawEntity(e);
  drawLine();
  drawBear();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,180,${flash})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (screen !== 'menu') drawHud();

  if (screen === 'menu')
    drawOverlay(
      'Pesca no Gelo',
      [
        'Mexa o mouse ou o dedo para subir e descer a linha.',
        'Deixe um peixe morder a minhoca e puxe até o buraco.',
        'Cuidado: barris, águas-vivas, tubarões e caranguejos!',
        `Pesque ${GOAL} peixes para enfrentar a Garoupa Gigante.`,
      ],
      '🎣 Jogar',
    );
  else if (screen === 'paused') drawOverlay('Pausado', ['Respire fundo, o peixe espera.'], '▶ Continuar');
  else if (screen === 'over') drawOverlay('Acabaram as minhocas!', [`Você pescou ${fishCount} peixes · ${score} pontos`, `Recorde: ${best}`], '🔁 Jogar de novo');
  else if (screen === 'win') drawOverlay('Garoupa Gigante! 🏆', [`Você venceu com ${fishCount} peixes`, `${score} pontos · Recorde: ${best}`], '🔁 Jogar de novo');
  ctx.restore();
}

/* ---------- Entrada ---------- */

function toLogicalY(clientY: number): number {
  const dpr = canvas.width / innerWidth;
  return (clientY * dpr - offY) / scale;
}

function startOrResume(): void {
  if (!audio) {
    try {
      audio = new AudioContext();
    } catch {
      audio = null;
    }
  }
  audio?.resume();
  if (screen === 'menu' || screen === 'over' || screen === 'win') {
    resetGame();
    screen = 'playing';
  } else if (screen === 'paused') {
    screen = 'playing';
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (screen !== 'playing') startOrResume();
  targetY = toLogicalY(e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  targetY = toLogicalY(e.clientY);
});

const keys = new Set<string>();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyM') muted = !muted;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (screen === 'playing') screen = 'paused';
    else if (screen === 'paused') screen = 'playing';
  }
  if ((e.code === 'Enter' || e.code === 'Space') && screen !== 'playing') startOrResume();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => {
  if (screen === 'playing') screen = 'paused';
});

/* ---------- Loop ---------- */

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (keys.has('ArrowUp') || keys.has('KeyW')) targetY = Math.max(HOOK_MIN, Math.min(targetY, hookY) - 420 * dt);
  if (keys.has('ArrowDown') || keys.has('KeyS')) targetY = Math.min(HOOK_MAX, Math.max(targetY, hookY) + 420 * dt);
  update(dt);
  render();
  requestAnimationFrame(frame);
}
resetGame();
screen = 'menu';
requestAnimationFrame(frame);

// Ganchos para testes automatizados.
declare global {
  interface Window {
    __pesca?: Record<string, unknown>;
  }
}
window.__pesca = {
  get state() {
    return { screen, fishCount, score, worms, hasBait, hookY, hooked: hooked?.kind ?? null, entities: entities.map((e) => e.kind), best };
  },
  spawn: (kind: Kind, x?: number, y?: number) => {
    const e = spawn(kind, x, y);
    return entities.indexOf(e);
  },
  setHook: (y: number) => {
    hookY = targetY = y;
  },
  setFishCount: (n: number) => {
    fishCount = n;
  },
  get raw() {
    return entities;
  },
  clear: () => {
    entities = [];
    for (const k of Object.keys(spawnTimers)) spawnTimers[k] = 999;
  },
  start: startOrResume,
};
