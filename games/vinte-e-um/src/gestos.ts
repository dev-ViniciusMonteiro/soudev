// Controle por gestos do 21, pela câmera (MediaPipe Hands, a mesma base dos outros jogos de câmera).
// Sinais de cassino: 👆 pedir, ✋ parar, 🤟 (três dedos) dobrar, ✌️ dividir e 👍 apostar.
// O gesto só vale depois de segurado um instante (anel de progresso) e precisa mudar para valer de novo.
// Nas apostas, o indicador vira um cursor: parar sobre um botão por um instante aperta o botão.

import { Camera, type Ponto, mensagemDeErro } from '../../comum/camera';

export type Sinal = 'pedir' | 'parar' | 'dobrar' | 'dividir' | 'apostar';
export type ModoGesto = 'jogada' | 'cursor' | 'pausado';

export const ICONE: Record<Sinal, string> = { pedir: '👆', parar: '✋', dobrar: '🤟', dividir: '✌️', apostar: '👍' };
export const ROTULO: Record<Sinal, string> = { pedir: 'Pedir', parar: 'Parar', dobrar: 'Dobrar', dividir: 'Dividir', apostar: 'Apostar' };

const SEGURAR = 650; // ms segurando o gesto para valer
const PARADO_NO_BOTAO = 900; // ms com o cursor parado sobre um botão
const LIGACOES = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16],
  [13, 17, 18, 19, 20],
  [0, 17],
];

/** Lê o sinal da mão: dedos esticados medidos a partir do pulso (vale com a mão girada). */
export function classificar(m: Ponto[], aspecto: number): Sinal | null {
  const d = (a: Ponto, b: Ponto): number => Math.hypot((a.x - b.x) * aspecto, a.y - b.y);
  const pulso = m[0];
  const esticado = ([meio, ponta]: [number, number]): boolean => d(pulso, m[ponta]) > d(pulso, m[meio]) * 1.12;
  const [ind, med, anel, min] = ([
    [6, 8],
    [10, 12],
    [14, 16],
    [18, 20],
  ] as [number, number][]).map(esticado);
  const n = [ind, med, anel, min].filter(Boolean).length;
  if (n === 0) {
    // Joinha: polegar longe da mão e apontando para cima (a ponta acima de todas as juntas dos dedos).
    const palma = d(pulso, m[9]);
    const polegarLonge = d(m[4], m[5]) > palma * 0.55;
    const paraCima = m[4].y < Math.min(m[5].y, m[9].y, m[13].y, m[17].y) - palma * 0.25;
    return polegarLonge && paraCima ? 'apostar' : null;
  }
  if (ind && !med && !anel && !min) return 'pedir';
  if (ind && med && !anel && !min) return 'dividir';
  if (ind && med && anel && !min) return 'dobrar';
  if (n === 4) return 'parar';
  return null;
}

export class Gestos {
  private camera = new Camera();
  private raiz: HTMLElement;
  private previa: HTMLCanvasElement;
  private estado: HTMLElement;
  private anel: HTMLElement;
  private cursor: HTMLElement;
  private atual: Sinal | null = null;
  private desde = 0;
  private disparado: Sinal | null = null; // último gesto que valeu (precisa trocar para valer de novo)
  private soltouEm = 0;
  private alvoCursor: HTMLElement | null = null;
  private cursorDesde = 0;
  private parar: number | null = null;
  modo: ModoGesto = 'pausado';
  ligado = false;

  constructor(
    private aoSinal: (s: Sinal) => void,
    private permitidos: () => Sinal[],
  ) {
    this.previa = document.createElement('canvas');
    this.previa.width = 320;
    this.previa.height = 240;
    this.estado = document.createElement('div');
    this.estado.className = 'gestos-estado';
    this.anel = document.createElement('div');
    this.anel.className = 'gestos-anel';
    const legenda = document.createElement('div');
    legenda.className = 'gestos-legenda';
    legenda.innerHTML = (Object.keys(ICONE) as Sinal[]).map((s) => `<span data-sinal="${s}">${ICONE[s]} ${ROTULO[s]}</span>`).join('');
    this.raiz = document.createElement('div');
    this.raiz.className = 'gestos';
    this.raiz.hidden = true;
    this.raiz.append(this.previa, this.anel, this.estado, legenda);
    this.cursor = document.createElement('div');
    this.cursor.className = 'cursor-mao';
    this.cursor.hidden = true;
    document.body.append(this.raiz, this.cursor);
  }

  async ligar(): Promise<void> {
    this.raiz.hidden = false;
    this.estado.textContent = 'Ligando a câmera…';
    try {
      await this.camera.iniciar('maos', (t) => (this.estado.textContent = t), { maxMaos: 1, filtro: [1.2, 1.5] });
    } catch (e) {
      this.estado.textContent = mensagemDeErro(e);
      throw e;
    }
    this.ligado = true;
    this.estado.textContent = 'Mostre a mão para a câmera';
    const passo = (agora: number): void => {
      this.parar = requestAnimationFrame(passo);
      if (this.camera.atualizar(agora)) this.processar(agora);
    };
    this.parar = requestAnimationFrame(passo);
  }

  desligar(): void {
    if (this.parar !== null) cancelAnimationFrame(this.parar);
    this.parar = null;
    this.camera.parar();
    this.ligado = false;
    this.raiz.hidden = true;
    this.cursor.hidden = true;
    this.limparCursor();
  }

  private processar(agora: number): void {
    const mao = this.camera.leitura.grupos[0];
    const v = this.camera.video;
    const aspecto = (v.videoWidth || 4) / (v.videoHeight || 3);
    this.desenharPrevia(mao);
    const permitidos = this.permitidos();
    for (const el of this.raiz.querySelectorAll<HTMLElement>('[data-sinal]')) el.classList.toggle('ativo', permitidos.includes(el.dataset.sinal as Sinal));

    if (!mao || this.modo === 'pausado') {
      this.atual = null;
      this.anel.style.setProperty('--p', '0');
      this.cursor.hidden = true;
      this.limparCursor();
      if (!mao) {
        this.estado.textContent = 'Mostre a mão para a câmera';
        if (!this.soltouEm) this.soltouEm = agora;
        if (agora - this.soltouEm > 250) this.disparado = null; // tirou a mão: pode repetir o gesto
      }
      return;
    }
    const sinal = classificar(mao, aspecto);

    // Cursor das apostas: o indicador aponta para os botões da tela.
    if (this.modo === 'cursor' && sinal === 'pedir') {
      this.moverCursor(mao[8], agora);
      this.anel.style.setProperty('--p', '0');
      this.estado.textContent = '👆 Aponte para uma ficha e segure';
      this.atual = null;
      return;
    }
    this.cursor.hidden = true;
    this.limparCursor();

    if (sinal !== this.atual) {
      this.atual = sinal;
      this.desde = agora;
      if (sinal !== this.disparado) this.soltouEm = agora;
    }
    if (sinal !== this.disparado && agora - this.soltouEm > 150) this.disparado = null;
    const vale = sinal && permitidos.includes(sinal) && sinal !== this.disparado;
    const prog = vale ? Math.min(1, (agora - this.desde) / SEGURAR) : 0;
    this.anel.style.setProperty('--p', String(prog));
    this.anel.textContent = sinal ? ICONE[sinal] : '';
    this.estado.textContent = !sinal ? 'Gesto não reconhecido' : !permitidos.includes(sinal) ? `${ICONE[sinal]} ${ROTULO[sinal]} não vale agora` : sinal === this.disparado ? `${ICONE[sinal]} ${ROTULO[sinal]}: troque de gesto para repetir` : `${ICONE[sinal]} ${ROTULO[sinal]}… segure`;
    if (vale && prog >= 1) {
      this.disparado = sinal;
      this.anel.style.setProperty('--p', '0');
      this.aoSinal(sinal);
    }
  }

  /** O meio da imagem (60%) cobre a tela inteira: não precisa esticar o braço até a borda. */
  private moverCursor(ponta: Ponto, agora: number): void {
    const x = Math.min(1, Math.max(0, (ponta.x - 0.2) / 0.6)) * innerWidth;
    const y = Math.min(1, Math.max(0, (ponta.y - 0.15) / 0.6)) * innerHeight;
    this.cursor.hidden = false;
    this.cursor.style.transform = `translate(${x}px, ${y}px)`;
    const alvo = (document.elementsFromPoint(x, y).find((e) => e instanceof HTMLButtonElement && !e.disabled) as HTMLButtonElement | undefined) ?? null;
    if (alvo !== this.alvoCursor) {
      this.limparCursor();
      this.alvoCursor = alvo;
      this.cursorDesde = agora;
      alvo?.classList.add('mira');
    }
    const prog = alvo ? Math.min(1, (agora - this.cursorDesde) / PARADO_NO_BOTAO) : 0;
    this.cursor.style.setProperty('--p', String(prog));
    if (alvo && prog >= 1) {
      alvo.click();
      this.cursorDesde = agora + 400; // pausa curta antes de apertar de novo o mesmo botão
    }
  }

  private limparCursor(): void {
    this.alvoCursor?.classList.remove('mira');
    this.alvoCursor = null;
    this.cursor.style.setProperty('--p', '0');
  }

  private desenharPrevia(mao: Ponto[] | undefined): void {
    const c = this.previa.getContext('2d')!;
    const { width: w, height: h } = this.previa;
    c.save();
    c.translate(w, 0);
    c.scale(-1, 1);
    if (this.camera.video.readyState >= 2) c.drawImage(this.camera.video, 0, 0, w, h);
    c.restore();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, 0, w, h);
    if (!mao) return;
    c.strokeStyle = '#f3d28a';
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (const linha of LIGACOES) {
      c.beginPath();
      linha.forEach((i, k) => (k ? c.lineTo(mao[i].x * w, mao[i].y * h) : c.moveTo(mao[i].x * w, mao[i].y * h)));
      c.stroke();
    }
  }
}
