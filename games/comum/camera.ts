// Base dos jogos de câmera: abre a câmera frontal e roda um detector do MediaPipe no próprio aparelho
// (corpo, mãos ou rosto). Os pontos saem normalizados (0..1) e já espelhados, como num espelho,
// e passam por um filtro One Euro: parado fica firme, em movimento rápido quase não atrasa.

const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const MODELOS = {
  poseLite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  poseFull: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  maos: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  rosto: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
};

export type Detector = 'pose' | 'maos' | 'rosto';

export interface Ponto {
  x: number; // 0..1, espelhado (0 = esquerda da tela)
  y: number; // 0..1 (0 = topo)
  z: number;
  vis: number; // confiança de que o ponto está visível (1 quando o detector não informa)
}

export interface Leitura {
  /** Uma lista de pontos por pessoa (pose/rosto) ou por mão. */
  grupos: Ponto[][];
  /** Rosto: expressões (jawOpen, eyeBlinkLeft…) de 0 a 1. */
  expressoes: Record<string, number>[];
}

/* ---------- Filtro One Euro (Casiez et al., 2012) ---------- */

export class UmEuro {
  private y: number | null = null;
  private dy = 0;
  private t: number | null = null;
  constructor(
    private corteMin = 1.2,
    private beta = 2,
    private corteD = 1,
  ) {}
  private static alfa(corte: number, dt: number): number {
    return 1 / (1 + 1 / (2 * Math.PI * corte * dt));
  }
  filtrar(x: number, t: number): number {
    if (this.y === null || this.t === null) {
      this.y = x;
      this.t = t;
      return x;
    }
    const dt = Math.max(1e-3, t - this.t);
    this.t = t;
    const derivada = (x - this.y) / dt;
    this.dy += UmEuro.alfa(this.corteD, dt) * (derivada - this.dy);
    const corte = this.corteMin + this.beta * Math.abs(this.dy);
    this.y += UmEuro.alfa(corte, dt) * (x - this.y);
    return this.y;
  }
  zerar(): void {
    this.y = null;
    this.t = null;
    this.dy = 0;
  }
}

/* ---------- Câmera ---------- */

const importarUrl = (url: string): Promise<any> => import(/* @vite-ignore */ url);
export const ehCelular = (): boolean => matchMedia('(pointer: coarse)').matches;

interface Opcoes {
  maxMaos?: number;
  maxPessoas?: number;
  /** Filtro: corte mínimo (Hz) e beta. Mais beta = menos atraso em movimento rápido. */
  filtro?: [number, number];
}

export class Camera {
  readonly video: HTMLVideoElement;
  private detector: any = null;
  private stream: MediaStream | null = null;
  private filtros = new Map<string, UmEuro>();
  private ultimoQuadro = -1;
  private tipo: Detector = 'pose';
  private filtro: [number, number] = [1.2, 2];
  leitura: Leitura = { grupos: [], expressoes: [] };
  vistoEm = 0;
  fps = 0;
  private contagem = { n: 0, desde: 0 };

  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
  }

  get pronta(): boolean {
    return Boolean(this.detector && this.stream);
  }

  async iniciar(tipo: Detector, aoProgresso: (texto: string) => void, opcoes: Opcoes = {}): Promise<void> {
    if (this.pronta && this.tipo === tipo) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador não permite usar a câmera. Use o Chrome, o Edge ou o Safari atualizados.');
    this.tipo = tipo;
    this.filtro = opcoes.filtro ?? this.filtro;
    const celular = ehCelular();
    aoProgresso('Pedindo acesso à câmera…');
    const camera = this.stream
      ? Promise.resolve(this.stream)
      : navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'user', width: { ideal: celular ? 640 : 1280 }, height: { ideal: celular ? 480 : 720 }, frameRate: { ideal: 60, max: 60 } },
        });
    aoProgresso('Carregando o detector (só a primeira vez demora)…');
    const [stream, detector] = await Promise.all([camera, this.carregar(tipo, celular, opcoes)]);
    this.stream = stream;
    this.detector = detector;
    this.video.srcObject = stream;
    await this.video.play();
  }

  private async carregar(tipo: Detector, celular: boolean, o: Opcoes): Promise<any> {
    const vision = await importarUrl(`${MEDIAPIPE}/vision_bundle.mjs`);
    const arquivos = await vision.FilesetResolver.forVisionTasks(`${MEDIAPIPE}/wasm`);
    const criar = (delegate: 'GPU' | 'CPU') => {
      const base = { runningMode: 'VIDEO' };
      if (tipo === 'pose')
        return vision.PoseLandmarker.createFromOptions(arquivos, {
          ...base,
          baseOptions: { modelAssetPath: celular ? MODELOS.poseLite : MODELOS.poseFull, delegate },
          numPoses: o.maxPessoas ?? 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.6,
        });
      if (tipo === 'maos')
        return vision.HandLandmarker.createFromOptions(arquivos, {
          ...base,
          baseOptions: { modelAssetPath: MODELOS.maos, delegate },
          numHands: o.maxMaos ?? 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      return vision.FaceLandmarker.createFromOptions(arquivos, {
        ...base,
        baseOptions: { modelAssetPath: MODELOS.rosto, delegate },
        numFaces: 1,
        outputFaceBlendshapes: true,
        minFaceDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    };
    try {
      return await criar('GPU');
    } catch {
      return criar('CPU'); // sem WebGL: mais lento, mas funciona
    }
  }

  /** Roda o detector se a câmera tem quadro novo. Devolve true quando a leitura mudou. */
  atualizar(agora: number): boolean {
    const v = this.video;
    if (!this.detector || v.readyState < 2 || v.currentTime === this.ultimoQuadro) return false;
    this.ultimoQuadro = v.currentTime;
    let r: any;
    try {
      r = this.detector.detectForVideo(v, agora);
    } catch {
      return false;
    }
    this.contarFps(agora);
    const brutos: { x: number; y: number; z?: number; visibility?: number }[][] = this.tipo === 'maos' ? r.landmarks : this.tipo === 'rosto' ? r.faceLandmarks : r.landmarks;
    const t = agora / 1000;
    const [corte, beta] = this.filtro;
    this.leitura = {
      grupos: (brutos ?? []).map((pts, g) =>
        pts.map((p, i) => {
          const chave = `${g}:${i}`;
          let fx = this.filtros.get(`${chave}x`);
          let fy = this.filtros.get(`${chave}y`);
          if (!fx || !fy) {
            this.filtros.set(`${chave}x`, (fx = new UmEuro(corte, beta)));
            this.filtros.set(`${chave}y`, (fy = new UmEuro(corte, beta)));
          }
          return { x: fx.filtrar(1 - p.x, t), y: fy.filtrar(p.y, t), z: p.z ?? 0, vis: p.visibility ?? 1 };
        }),
      ),
      expressoes: (r.faceBlendshapes ?? []).map((b: { categories: { categoryName: string; score: number }[] }) => Object.fromEntries(b.categories.map((c) => [c.categoryName, c.score]))),
    };
    if (this.leitura.grupos.length) this.vistoEm = agora;
    else for (const f of this.filtros.values()) f.zerar();
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
    this.detector = null;
  }
}

export function mensagemDeErro(e: unknown): string {
  const nome = (e as { name?: string })?.name;
  if (nome === 'NotAllowedError') return 'A câmera foi bloqueada. Libere o acesso no cadeado ao lado do endereço e tente de novo.';
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Não encontrei uma câmera neste aparelho.';
  if (nome === 'NotReadableError') return 'A câmera está sendo usada por outro programa. Feche-o e tente de novo.';
  return (e as Error)?.message || 'Não foi possível iniciar a câmera.';
}
