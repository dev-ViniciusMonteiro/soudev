import type { City } from '../world/City';

export type Mode = 'driving' | 'foot';

const MAP_SIZE = 190;
// Streamed world: the minimap is a player-centred radar spanning this many metres
// (the finite precomputed road/footprint map doesn't apply to an unbounded world).
const STREAM_VIEW_METERS = 320;

// Shared HUD design tokens so the widgets read as one designed overlay.
const ACCENT = '#54a0ff';
const CHIP =
  'padding:6px 12px;background:rgba(12,16,26,.55);border:1px solid rgba(255,255,255,.07);' +
  'border-radius:8px;backdrop-filter:blur(6px);';

/**
 * DOM overlay: speedometer, current mode, control legend, and a live minimap.
 * The static map (roads + footprints) is rendered once to an offscreen canvas
 * in the constructor; each frame only the dynamic dots are composited on top.
 */
export class HUD {
  private readonly speedEl: HTMLElement;
  private readonly modeEl: HTMLElement;
  private readonly mapCanvas: HTMLCanvasElement;
  private readonly mapCtx: CanvasRenderingContext2D;
  private readonly staticMap: HTMLCanvasElement;
  private readonly toWorld: number;
  private readonly healthFill: HTMLElement;
  private readonly wastedEl: HTMLElement;
  private readonly bustedEl: HTMLElement;
  private readonly moneyEl: HTMLElement;
  private readonly objectiveEl: HTMLElement;
  private readonly objectiveArrow: HTMLElement;
  private readonly objectiveText: HTMLElement;
  private readonly toastEl: HTMLElement;
  private toastTimer = 0;
  private target: { x: number; z: number; color: string } | null = null;
  private readonly carEl: HTMLElement;
  private readonly wantedEl: HTMLElement;
  private readonly clockEl: HTMLElement;
  private viewX = 0; // streamed-radar centre (the player), set each update
  private viewZ = 0;

  constructor(
    container: HTMLElement,
    private readonly city: City,
    touch = false,
    private readonly streaming = false,
  ) {
    this.toWorld = streaming ? MAP_SIZE / STREAM_VIEW_METERS : MAP_SIZE / city.extent;

    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;inset:0;pointer-events:none;color:#e8ecf5;' +
      'font-family:ui-monospace,Menlo,Consolas,monospace;text-shadow:0 1px 3px #000;';
    container.appendChild(root);

    const speedBox = document.createElement('div');
    // On touch the action buttons own the bottom-right corner, so the readout
    // moves to the top-right (the decorative title is hidden there instead).
    speedBox.style.cssText = touch
      ? 'position:absolute;right:18px;top:12px;text-align:right;line-height:1;'
      : 'position:absolute;right:20px;bottom:20px;text-align:right;line-height:1;';
    this.speedEl = document.createElement('div');
    this.speedEl.style.cssText = `font-size:${touch ? 30 : 46}px;font-weight:700;letter-spacing:-1px;`;
    const unit = document.createElement('div');
    unit.textContent = 'KM/H';
    unit.style.cssText = `font-size:13px;opacity:.7;margin-top:2px;color:${ACCENT};letter-spacing:2px;`;
    speedBox.append(this.speedEl, unit);
    speedBox.style.cssText += CHIP;
    root.appendChild(speedBox);

    this.modeEl = document.createElement('div');
    this.modeEl.style.cssText =
      'position:absolute;left:20px;top:18px;font-size:14px;font-weight:700;letter-spacing:1px;' + CHIP;
    root.appendChild(this.modeEl);

    this.wantedEl = document.createElement('div');
    this.wantedEl.style.cssText =
      'position:absolute;left:20px;top:74px;font-size:18px;letter-spacing:3px;' +
      'color:#ffd24a;text-shadow:0 1px 4px #000;';
    const wantedStyle = document.createElement('style');
    wantedStyle.textContent = '@keyframes wantedFlash{0%{opacity:1}100%{opacity:.25}}';
    root.append(wantedStyle, this.wantedEl);

    const healthTrack = document.createElement('div');
    healthTrack.style.cssText =
      'position:absolute;left:20px;top:58px;width:182px;height:13px;' +
      'background:rgba(12,16,26,.6);border:1px solid rgba(255,255,255,.07);border-radius:7px;' +
      'overflow:hidden;backdrop-filter:blur(6px);';
    this.healthFill = document.createElement('div');
    this.healthFill.style.cssText =
      'height:100%;width:100%;background:linear-gradient(90deg,#3ad17a,#7dffa6);transition:width .1s linear;';
    healthTrack.appendChild(this.healthFill);
    root.appendChild(healthTrack);

    // Saldo das entregas (topo, centro).
    this.moneyEl = document.createElement('div');
    this.moneyEl.style.cssText =
      'position:absolute;left:50%;top:12px;transform:translateX(-50%);font-size:15px;font-weight:700;color:#7dffa6;' + CHIP;
    root.appendChild(this.moneyEl);

    // Objetivo da missão com seta apontando para o destino (relativa à câmera).
    this.objectiveEl = document.createElement('div');
    this.objectiveEl.style.cssText =
      'position:absolute;left:50%;top:52px;transform:translateX(-50%);font-size:13px;font-weight:700;' +
      'display:flex;align-items:center;gap:10px;max-width:86vw;white-space:nowrap;' + CHIP;
    this.objectiveArrow = document.createElement('div');
    this.objectiveArrow.textContent = '▲';
    this.objectiveArrow.style.cssText = 'font-size:18px;line-height:1;transition:transform .08s linear;';
    this.objectiveText = document.createElement('div');
    this.objectiveText.style.cssText = 'overflow:hidden;text-overflow:ellipsis;';
    this.objectiveEl.append(this.objectiveArrow, this.objectiveText);
    root.appendChild(this.objectiveEl);

    // Aviso rápido (entrega concluída, tempo esgotado…).
    this.toastEl = document.createElement('div');
    this.toastEl.style.cssText =
      'position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font-size:clamp(20px,4vw,34px);' +
      'font-weight:800;letter-spacing:1px;text-align:center;opacity:0;transition:opacity .35s ease;' +
      'font-family:ui-sans-serif,system-ui,sans-serif;text-shadow:0 2px 12px #000;';
    root.appendChild(this.toastEl);

    // Time-of-day clock. On touch the top-right is the speedo, so it sits on the
    // left under the wanted stars; on desktop it takes the free top-right corner.
    this.clockEl = document.createElement('div');
    this.clockEl.style.cssText =
      (touch
        ? 'position:absolute;left:20px;top:104px;'
        : 'position:absolute;right:20px;top:16px;') +
      'font-size:14px;font-weight:700;letter-spacing:1px;' + CHIP;
    root.appendChild(this.clockEl);

    // Current car make/model, above the speedometer (driving only).
    this.carEl = document.createElement('div');
    this.carEl.style.cssText = speedBox.style.cssText.includes('top:12px')
      ? 'position:absolute;right:18px;top:84px;font-size:12px;opacity:.7;text-align:right;'
      : 'position:absolute;right:20px;bottom:92px;font-size:13px;opacity:.7;text-align:right;';
    root.appendChild(this.carEl);

    const bigText =
      'position:absolute;inset:0;display:none;align-items:center;justify-content:center;' +
      'font-size:13vw;font-weight:800;letter-spacing:6px;' +
      'text-shadow:0 4px 24px #000;font-family:Georgia,"Times New Roman",serif;';
    this.wastedEl = document.createElement('div');
    this.wastedEl.textContent = 'K.O.';
    this.wastedEl.style.cssText =
      bigText + 'color:#c0202a;background:radial-gradient(circle,rgba(40,0,0,.35),rgba(0,0,0,.85));';
    root.appendChild(this.wastedEl);

    this.bustedEl = document.createElement('div');
    this.bustedEl.textContent = 'PRESO';
    this.bustedEl.style.cssText =
      bigText + 'color:#3aa0ff;background:radial-gradient(circle,rgba(0,16,40,.4),rgba(0,0,0,.85));';
    root.appendChild(this.bustedEl);

    // (Control legend now lives in the title/pause menu — keep the HUD clean.)

    // (Decorative wordmark dropped — the splash/title menu carry the name; the
    // top-right corner is the clock now.)

    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = this.mapCanvas.height = MAP_SIZE;
    this.mapCanvas.style.cssText =
      'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);' +
      'border:1px solid rgba(255,255,255,.18);border-radius:8px;background:rgba(8,10,16,.55);';
    if (touch) {
      // Shrink the radar so it clears the joystick/buttons; keep full internal resolution.
      this.mapCanvas.style.width = '128px';
      this.mapCanvas.style.height = '128px';
      this.mapCanvas.style.bottom = '12px';
    }
    root.appendChild(this.mapCanvas);
    this.mapCtx = this.mapCanvas.getContext('2d')!;

    this.staticMap = this.buildStaticMap();
  }

  private mapX(wx: number): number {
    return this.streaming ? MAP_SIZE / 2 + (wx - this.viewX) * this.toWorld : (wx + this.city.half) * this.toWorld;
  }
  private mapY(wz: number): number {
    return this.streaming ? MAP_SIZE / 2 + (wz - this.viewZ) * this.toWorld : (wz + this.city.half) * this.toWorld;
  }

  private buildStaticMap(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = MAP_SIZE;
    // Streamed world: nothing precomputed — the radar redraws live each frame
    // around the player (see update()).
    if (this.streaming) return c;
    const ctx = c.getContext('2d')!;

    ctx.strokeStyle = 'rgba(120,140,180,.55)';
    ctx.lineWidth = Math.max(1, this.city.config.roadWidth * this.toWorld * 0.6);
    for (const rc of this.city.roadCenters) {
      const p = this.mapX(rc);
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, MAP_SIZE);
      ctx.moveTo(0, p);
      ctx.lineTo(MAP_SIZE, p);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(180,200,235,.32)';
    for (const b of this.city.buildings) {
      ctx.fillRect(
        this.mapX(b.cx - b.width / 2),
        this.mapY(b.cz - b.depth / 2),
        b.width * this.toWorld,
        b.depth * this.toWorld,
      );
    }
    return c;
  }

  update(
    speedKmh: number,
    mode: Mode,
    player: { x: number; z: number; heading: number },
    cars: ReadonlyArray<{ x: number; z: number }>,
    health: number,
    wasted: boolean,
  ): void {
    this.speedEl.textContent = String(Math.round(speedKmh));
    this.modeEl.textContent = mode === 'driving' ? '🚗 DIRIGINDO' : '🚶 A PÉ';

    const h = Math.max(0, Math.min(100, health));
    this.healthFill.style.width = `${h}%`;
    this.healthFill.style.background = h > 50 ? '#54ff84' : h > 20 ? '#ffd24a' : '#ff5a4a';
    this.wastedEl.style.display = wasted ? 'flex' : 'none';

    const ctx = this.mapCtx;
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    if (this.streaming) {
      this.viewX = player.x; // centre the radar on the player
      this.viewZ = player.z;
    }
    ctx.drawImage(this.staticMap, 0, 0);

    ctx.fillStyle = '#ffd24a';
    for (const car of cars) {
      ctx.fillRect(this.mapX(car.x) - 1.5, this.mapY(car.z) - 1.5, 3, 3);
    }

    // Destino da missão (preso à borda do radar quando está fora da área visível).
    if (this.target) {
      const m = 6;
      const tx = Math.max(m, Math.min(MAP_SIZE - m, this.mapX(this.target.x)));
      const ty = Math.max(m, Math.min(MAP_SIZE - m, this.mapY(this.target.z)));
      ctx.fillStyle = this.target.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Player as a heading arrow.
    const px = this.mapX(player.x);
    const py = this.mapY(player.z);
    const fx = Math.cos(player.heading);
    const fz = -Math.sin(player.heading);
    ctx.fillStyle = mode === 'driving' ? '#54ff84' : '#54c8ff';
    ctx.beginPath();
    ctx.moveTo(px + fx * 6, py + fz * 6);
    ctx.lineTo(px - fz * 4 - fx * 3, py + fx * 4 - fz * 3);
    ctx.lineTo(px + fz * 4 - fx * 3, py - fx * 4 - fz * 3);
    ctx.closePath();
    ctx.fill();
  }

  setMoney(value: number): void {
    this.moneyEl.textContent = `💰 R$ ${value.toLocaleString('pt-BR')}`;
  }

  /**
   * Painel da missão. `arrowDeg` gira a seta no sentido horário (0 = em frente);
   * `urgent` deixa o painel vermelho nos últimos segundos.
   */
  setObjective(text: string, arrowDeg: number, color: string, urgent = false): void {
    this.objectiveText.textContent = text;
    this.objectiveArrow.style.transform = `rotate(${arrowDeg}deg)`;
    this.objectiveArrow.style.color = color;
    this.objectiveEl.style.color = urgent ? '#ff6b5a' : '#e8ecf5';
  }

  setTarget(target: { x: number; z: number; color: string } | null): void {
    this.target = target;
  }

  toast(text: string, color: string): void {
    this.toastEl.textContent = text;
    this.toastEl.style.color = color;
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.style.opacity = '0'), 2200);
  }

  setCarName(name: string | null): void {
    this.carEl.textContent = name ?? '';
  }

  /** Time-of-day clock from `t` in [0,1) (0 = midnight) → 🕐 HH:MM (24h). */
  setClock(t: number): void {
    const mins = Math.floor(t * 24 * 60) % (24 * 60);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    this.clockEl.textContent = `🕐 ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  setWanted(stars: number, cooling = false): void {
    this.wantedEl.textContent = stars > 0 ? '★'.repeat(stars) : '';
    // Flash the stars while you're shaking the cops (wanted cooling off).
    this.wantedEl.style.animation = cooling ? 'wantedFlash .5s steps(2) infinite' : 'none';
  }

  setBusted(on: boolean): void {
    this.bustedEl.style.display = on ? 'flex' : 'none';
  }
}
