// Salvamento dos MonKePos na planilha: só em momentos específicos (captura, evolução, Centro de Cura,
// a cada 5 minutos se algo mudou e ao sair da aba). Nunca a cada passo: o Apps Script leva 1 a 4 segundos.

import { encodeMonsters, type Monster } from '../shared/monster';
import { salvar, type ApiReply } from './api';

const AUTOSAVE_MS = 5 * 60 * 1000;

export class SaveManager {
  rev: number;
  private last: string;
  private saving: Promise<ApiReply | null> | null = null;
  private queued = false;
  onConflict: (reply: ApiReply) => void = () => {};
  onError: (msg: string) => void = () => {};

  constructor(
    rev: number,
    initial: string,
    private collection: () => Monster[],
  ) {
    this.rev = rev;
    this.last = initial;
    setInterval(() => {
      if (this.dirty()) void this.save();
    }, AUTOSAVE_MS);
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.dirty()) void this.save(true);
    });
  }

  dirty(): boolean {
    return encodeMonsters(this.collection()) !== this.last;
  }

  /** Salva se mudou algo. Se já estiver salvando, agenda mais um no fim. */
  async save(keepalive = false): Promise<ApiReply | null> {
    if (this.saving) {
      this.queued = true;
      return this.saving;
    }
    const data = encodeMonsters(this.collection());
    if (data === this.last) return null;
    this.saving = salvar(this.rev, data, keepalive).then((reply) => {
      if (reply.ok && typeof reply.rev === 'number') {
        this.rev = reply.rev;
        this.last = data;
      } else if (reply.codigo === 'conflito') this.onConflict(reply);
      else this.onError(reply.erro ?? 'Falha ao salvar');
      return reply;
    });
    try {
      return await this.saving;
    } finally {
      this.saving = null;
      if (this.queued) {
        this.queued = false;
        void this.save();
      }
    }
  }

  /** Depois de um conflito: adota o que está no servidor. */
  reset(rev: number, data: string): void {
    this.rev = rev;
    this.last = data;
  }
}
