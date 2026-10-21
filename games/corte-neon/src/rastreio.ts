// Câmera + MediaPipe Pose (os mesmos 33 pontos do corpo da ferramenta de correção de exercícios), rodando no aparelho.
// Cada ponto passa por um filtro One Euro: parado fica firme (sem tremer), em movimento rápido quase não atrasa.
// As coordenadas saem em pixels já espelhados (como um espelho: sua mão direita aparece à direita).

const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const MODELOS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
};

/** Índices do MediaPipe Pose. "esq"/"dir" são da pessoa (não da imagem). */
export const P = {
  nariz: 0,
  ombroEsq: 11,
  ombroDir: 12,
  cotoveloEsq: 13,
  cotoveloDir: 14,
  pulsoEsq: 15,
  pulsoDir: 16,
  indicadorEsq: 19,
  indicadorDir: 20,
  quadrilEsq: 23,
  quadrilDir: 24,
} as const;

export interface Ponto {
  x: number;
  y: number;
  vis: number; // 0..1: quanto o MediaPipe confia que o ponto está visível
}

/* ---------- Filtro One Euro (Casiez et al., 2012) ---------- */

class FiltroBaixa {
  private y: number | null = null;
  filtrar(x: number, alfa: number): number {
    this.y = this.y === null ? x : alfa * x + (1 - alfa) * this.y;
    return this.y;
  }
  get ultimo(): number | null {
    return this.y;
  }
  zerar(): void {
    this.y = null;
  }
}

class UmEuro {
  private x = new FiltroBaixa();
  private dx = new FiltroBaixa();
  private t: number | null = null;
  constructor(
    private corteMin: number,
    private beta: number,
    private corteD = 1,
  ) {}
  private static alfa(corte: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * corte);
    return 1 / (1 + tau / dt);
  }
  filtrar(valor: number, t: number): number {
    const dt = this.t === null ? 1 / 30 : Math.max(1e-3, t - this.t);
    this.t = t;
    const anterior = this.x.ultimo;
    const derivada = anterior === null ? 0 : (valor - anterior) / dt;
    const dxF = this.dx.filtrar(derivada, UmEuro.alfa(this.corteD, dt));
    const corte = this.corteMin + this.beta * Math.abs(dxF);
    return this.x.filtrar(valor, UmEuro.alfa(corte, dt));
  }
  zerar(): void {
    this.x.zerar();
    this.dx.zerar();
    this.t = null;
  }
}

/* ---------- Câmera e detector ---------- */

type Detector = { detectForVideo(v: HTMLVideoElement, t: number): { landmarks: { x: number; y: number; visibility?: number }[][] } };

const importarUrl = (url: string): Promise<any> => import(/* @vite-ignore */ url);

export const ehCelular = (): boolean => matchMedia('(pointer: coarse)').matches;

async function carregarDetector(modelo: 'lite' | 'full'): Promise<Detector> {
  const vision = await importarUrl(`${MEDIAPIPE}/vision_bundle.mjs`);
  const arquivos = await vision.FilesetResolver.forVisionTasks(`${MEDIAPIPE}/wasm`);
  const opcoes = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODELOS[modelo], delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.6,
  });
  try {
    return await vision.PoseLandmarker.createFromOptions(arquivos, opcoes('GPU'));
  } catch {
    // Sem WebGL na GPU: roda no processador (mais lento, mas funciona).
    return vision.PoseLandmarker.createFromOptions(arquivos, opcoes('CPU'));
  }
}

export class Rastreador {
  readonly video: HTMLVideoElement;
  private detector: Detector | null = null;
  private stream: MediaStream | null = null;
  private filtros = new Map<number, [UmEuro, UmEuro]>();
  private ultimoQuadro = -1;
  /** Pontos filtrados do último quadro (null = ninguém na frente da câmera). */
  pontos: Ponto[] | null = null;
  /** Momento (performance.now) da última vez que viu alguém. */
  vistoEm = 0;
  /** Quadros de câmera processados por segundo (para o aviso de desempenho). */
  fps = 0;
  private contagem = { n: 0, desde: 0 };

  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
  }

  get largura(): number {
    return this.video.videoWidth || 1280;
  }

  get altura(): number {
    return this.video.videoHeight || 720;
  }

  async iniciar(aoProgresso: (texto: string) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador não permite usar a câmera. Use o Chrome, o Edge ou o Safari atualizados.');
    aoProgresso('Pedindo acesso à câmera…');
    const celular = ehCelular();
    const camera = navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: celular ? 640 : 1280 }, height: { ideal: celular ? 480 : 720 }, frameRate: { ideal: 60, max: 60 } },
    });
    aoProgresso('Carregando o detector de movimento (só na primeira vez demora)…');
    // Computador: modelo mais preciso; celular: o leve, que mantém mais quadros por segundo.
    const [stream, detector] = await Promise.all([camera, carregarDetector(celular ? 'lite' : 'full')]);
    this.stream = stream;
    this.detector = detector;
    this.video.srcObject = stream;
    await this.video.play();
  }

  /** Roda o detector se a câmera tem quadro novo. Devolve true quando atualizou. */
  atualizar(agora: number): boolean {
    const v = this.video;
    if (!this.detector || v.readyState < 2 || v.currentTime === this.ultimoQuadro) return false;
    this.ultimoQuadro = v.currentTime;
    let r;
    try {
      r = this.detector.detectForVideo(v, agora);
    } catch {
      return false;
    }
    this.contarFps(agora);
    const lm = r.landmarks?.[0];
    if (!lm) {
      this.pontos = null;
      for (const [fx, fy] of this.filtros.values()) {
        fx.zerar();
        fy.zerar();
      }
      return true;
    }
    const t = agora / 1000;
    const W = this.largura;
    const H = this.altura;
    this.pontos = lm.map((p, i) => {
      let f = this.filtros.get(i);
      // Corte mínimo baixo = parado sem tremer; beta = quanto o filtro "solta" quando a mão acelera.
      if (!f) this.filtros.set(i, (f = [new UmEuro(1.4, 0.006), new UmEuro(1.4, 0.006)]));
      return { x: f[0].filtrar((1 - p.x) * W, t), y: f[1].filtrar(p.y * H, t), vis: p.visibility ?? 1 };
    });
    this.vistoEm = agora;
    return true;
  }

  private contarFps(agora: number): void {
    const c = this.contagem;
    c.n++;
    if (agora - c.desde >= 1000) {
      this.fps = (c.n * 1000) / (agora - c.desde);
      c.n = 0;
      c.desde = agora;
    }
  }

  parar(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

export function mensagemDeErro(e: unknown): string {
  const nome = (e as { name?: string })?.name;
  if (nome === 'NotAllowedError') return 'A câmera foi bloqueada. Libere o acesso no cadeado ao lado do endereço e tente de novo.';
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Não encontrei uma câmera neste aparelho.';
  if (nome === 'NotReadableError') return 'A câmera está sendo usada por outro programa. Feche-o e tente de novo.';
  return (e as Error)?.message || 'Não foi possível iniciar a câmera.';
}
