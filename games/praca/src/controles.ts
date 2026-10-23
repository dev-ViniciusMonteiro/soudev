// Controles: teclado (WASD/setas, Shift corre, Espaço pula, 1–4 emotes), arrastar para girar a câmera,
// roda do mouse para o zoom e, no celular, joystick na esquerda + botão de pulo na direita.

import { EMOTES, type Emote } from './protocolo';

export class Controles {
  /** Direção pedida (-1..1) no referencial da câmera: x = lado, y = frente. */
  readonly mover = { x: 0, y: 0 };
  correr = false;
  private pulo = false;
  yaw = 0; // câmera atrás do boneco, olhando para o chafariz
  pitch = 0.35;
  distancia = 7;
  /** Quanto dá para inclinar a câmera (o mata-mata em primeira pessoa usa mais). */
  limitePitch: [number, number] = [-0.1, 1.2];
  aoEmote: (e: Emote) => void = () => {};
  private _ativo = true;

  private teclas = new Set<string>();
  private joy = { id: -1, x0: 0, y0: 0, x: 0, y: 0 };
  private arrasto = { id: -1, x: 0, y: 0 };
  private base: HTMLElement;
  private botaoPulo: HTMLElement;
  readonly toque = matchMedia('(pointer: coarse)').matches;

  constructor(canvas: HTMLCanvasElement, raiz: HTMLElement) {
    this.base = Object.assign(document.createElement('div'), { className: 'joystick', hidden: !this.toque });
    this.base.append(Object.assign(document.createElement('div'), { className: 'joystick-bola' }));
    this.botaoPulo = Object.assign(document.createElement('button'), { className: 'botao-pulo', textContent: '⤒', hidden: !this.toque, ariaLabel: 'Pular' });
    raiz.append(this.base, this.botaoPulo);

    addEventListener('keydown', (e) => {
      if (!this.ativo || e.target instanceof HTMLInputElement) return;
      this.teclas.add(e.code);
      if (e.code === 'Space') {
        this.pulo = true;
        e.preventDefault();
      }
      const n = Number(e.key);
      if (n >= 1 && n <= EMOTES.length) this.aoEmote(EMOTES[n - 1]);
    });
    addEventListener('keyup', (e) => this.teclas.delete(e.code));
    addEventListener('blur', () => this.teclas.clear());

    this.botaoPulo.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.pulo = true;
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.ativo) return;
      // No celular, metade esquerda é o joystick; o resto gira a câmera.
      if (this.toque && e.clientX < innerWidth * 0.45 && this.joy.id < 0) {
        Object.assign(this.joy, { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, y: 0 });
        this.base.style.left = `${e.clientX - 60}px`;
        this.base.style.top = `${e.clientY - 60}px`;
        this.base.classList.add('ativo');
      } else if (this.arrasto.id < 0) Object.assign(this.arrasto, { id: e.pointerId, x: e.clientX, y: e.clientY });
      // Com o mouse travado (mata-mata) o navegador recusa a captura: tudo bem, o movimento vem de movementX/Y.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro travado */
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joy.id) {
        const dx = e.clientX - this.joy.x0;
        const dy = e.clientY - this.joy.y0;
        const d = Math.hypot(dx, dy);
        const k = d > 55 ? 55 / d : 1;
        this.joy.x = (dx * k) / 55;
        this.joy.y = (dy * k) / 55;
        (this.base.firstElementChild as HTMLElement).style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      } else if (e.pointerId === this.arrasto.id) {
        this.yaw -= (e.clientX - this.arrasto.x) * 0.006;
        this.pitch = Math.min(this.limitePitch[1], Math.max(this.limitePitch[0], this.pitch + (e.clientY - this.arrasto.y) * 0.005));
        this.arrasto.x = e.clientX;
        this.arrasto.y = e.clientY;
      }
    });
    const soltar = (e: PointerEvent): void => {
      if (e.pointerId === this.joy.id) {
        this.joy.id = -1;
        this.joy.x = this.joy.y = 0;
        this.base.classList.remove('ativo');
        (this.base.firstElementChild as HTMLElement).style.transform = '';
      }
      if (e.pointerId === this.arrasto.id) this.arrasto.id = -1;
    };
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);
    canvas.addEventListener('wheel', (e) => {
      this.distancia = Math.min(14, Math.max(3, this.distancia + e.deltaY * 0.01));
      e.preventDefault();
    }, { passive: false });
  }

  /** Fora do jogo (menu) os controles param e os botões da tela somem. */
  get ativo(): boolean {
    return this._ativo;
  }

  set ativo(v: boolean) {
    this._ativo = v;
    this.botaoPulo.hidden = !v || !this.toque;
    if (!v) this.teclas.clear();
  }

  /** Lê o estado deste quadro. */
  ler(): void {
    const t = this.teclas;
    let x = (t.has('KeyD') || t.has('ArrowRight') ? 1 : 0) - (t.has('KeyA') || t.has('ArrowLeft') ? 1 : 0);
    let y = (t.has('KeyW') || t.has('ArrowUp') ? 1 : 0) - (t.has('KeyS') || t.has('ArrowDown') ? 1 : 0);
    this.correr = t.has('ShiftLeft') || t.has('ShiftRight');
    if (this.joy.id >= 0) {
      x = this.joy.x;
      y = -this.joy.y;
      // Joystick quase no fim = correr.
      this.correr = Math.hypot(x, y) > 0.85;
    }
    const d = Math.hypot(x, y);
    if (d > 1) {
      x /= d;
      y /= d;
    }
    this.mover.x = this.ativo ? x : 0;
    this.mover.y = this.ativo ? y : 0;
  }

  /** Pulo pedido desde o último quadro (consome). */
  pegarPulo(): boolean {
    const p = this.pulo;
    this.pulo = false;
    return p && this.ativo;
  }
}
