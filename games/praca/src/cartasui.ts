// Mesas de cartas na praça: 21 (contra a casa) e truco paulista, apostando moedas do jogo.
// Chegou perto da mesa → "Sentar". Sentado, o painel mostra as cartas e os botões; o servidor embaralha,
// distribui e confere tudo (cada um só recebe a própria mão do truco).

import { APOSTAS_TRUCO, type Carta, type EstadoBJ, type EstadoTruco, MESAS, type MsgClienteCartas, type TipoMesa } from './protocolo';

type El = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]> & { cls?: string }, ...filhos: (Node | string | null | false)[]) => HTMLElementTagNameMap[K];

interface Contexto {
  el: El;
  app: HTMLElement;
  euId: () => string;
  nome: (id: string) => string;
  mandar: (m: MsgClienteCartas) => void;
  pos: () => { x: number; z: number };
  aviso: (t: string) => void;
}

const nos = (...l: (Node | null | false)[]): Node[] => l.filter((x): x is Node => Boolean(x));
const NOME_VALOR: Record<number, string> = { 1: 'Truco!', 3: 'Seis!', 6: 'Nove!', 9: 'Doze!' };
const NOME_PEDIDO: Record<number, string> = { 3: 'TRUCO', 6: 'SEIS', 9: 'NOVE', 12: 'DOZE' };
const FICHAS = [10, 25, 50, 100, 250, 500];

export function pontos21(cartas: Carta[]): number {
  let total = 0;
  let ases = 0;
  for (const c of cartas) {
    if (c === '?') continue;
    const v = c.slice(0, -1);
    if (v === 'A') {
      total += 11;
      ases++;
    } else total += 'KQJ'.includes(v) ? 10 : Number(v);
  }
  while (total > 21 && ases--) total -= 10;
  return total;
}

export class CartasUI {
  bj: EstadoBJ | null = null;
  truco: EstadoTruco | null = null;
  private mao: Carta[] = [];
  private painel: HTMLElement;
  private botaoSentar: HTMLButtonElement;
  private aposta21 = 50;
  private apostaTruco = 100;
  private encoberta = false;

  constructor(private c: Contexto) {
    this.painel = c.el('div', { cls: 'mesa-cartas', hidden: true });
    this.botaoSentar = c.el('button', { cls: 'botao-carro botao-mesa', hidden: true });
    c.app.append(this.painel, this.botaoSentar);
  }

  /** Em que mesa estou sentado (ou null). */
  get sentado(): TipoMesa | null {
    const eu = this.c.euId();
    if (this.bj?.lugares.includes(eu)) return '21';
    if (this.truco?.lugares.includes(eu)) return 'truco';
    return null;
  }

  receber21(e: EstadoBJ | null): void {
    this.bj = e;
    this.desenhar();
  }

  receberTruco(e: EstadoTruco | null): void {
    const antes = this.truco;
    this.truco = e;
    if (e?.pedido && !antes?.pedido && this.sentado === 'truco') this.c.aviso(`🗣️ ${NOME_PEDIDO[e.pedido.valor]}!`);
    if (e?.fase === 'fim' && antes?.fase === 'jogando' && e.vencedor !== null && this.sentado === 'truco') {
      const meuTime = e.lugares.indexOf(this.c.euId()) % 2;
      this.c.aviso(meuTime === e.vencedor ? `🏆 Seu time venceu o truco! +${e.aposta * e.lugares.filter(Boolean).length / Math.max(1, e.lugares.filter((l, i) => l && i % 2 === e.vencedor).length)} moedas` : 'Perdeu o truco. Na próxima!');
    }
    this.desenhar();
  }

  receberMao(cartas: Carta[]): void {
    this.mao = cartas;
    this.desenhar();
  }

  /** A cada quadro: botão de sentar perto das mesas. */
  tick(ativo: boolean): void {
    const p = this.c.pos();
    const perto = (Object.keys(MESAS) as TipoMesa[]).find((m) => Math.hypot(p.x - MESAS[m][0], p.z - MESAS[m][1]) < 3.6);
    const mostrar = ativo && !this.sentado && perto;
    this.botaoSentar.hidden = !mostrar;
    if (mostrar && perto) {
      this.botaoSentar.textContent = perto === '21' ? '🃏 Sentar na mesa de 21' : '🂡 Sentar na mesa de truco';
      this.botaoSentar.onclick = () => this.c.mandar({ k: 'mesa', mesa: perto, a: 'sentar' });
    }
  }

  private carta(c: Carta | null, clicavel?: () => void): HTMLElement {
    const { el } = this.c;
    if (!c || c === '?') return el('div', { cls: 'carta verso' });
    const naipe = c.slice(-1);
    const vermelha = naipe === '♥' || naipe === '♦';
    const d = el('div', { cls: `carta${vermelha ? ' vermelha' : ''}${clicavel ? ' clicavel' : ''}` }, el('span', { textContent: c.slice(0, -1) }), el('span', { cls: 'naipe', textContent: naipe }));
    if (clicavel) d.onclick = clicavel;
    return d;
  }

  private tempo(ms: number): string {
    return `${Math.ceil(ms / 1000)}s`;
  }

  desenhar(): void {
    const mesa = this.sentado;
    this.painel.hidden = !mesa;
    if (mesa === '21') this.desenhar21();
    else if (mesa === 'truco') this.desenharTruco();
  }

  private desenhar21(): void {
    const e = this.bj!;
    const { el } = this.c;
    const eu = this.c.euId();
    const minha = e.maos[eu];
    const linhaMao = (id: string) => {
      const m = e.maos[id];
      const status = m ? { apostando: 'apostou', jogando: e.vez === id ? '🎯 jogando' : 'esperando', parou: 'parou', estourou: '💥 estourou', blackjack: '⭐ blackjack', fora: 'fora' }[m.status] : 'sem aposta';
      return el(
        'div',
        { cls: `mao21${e.vez === id ? ' vez' : ''}${id === eu ? ' eu' : ''}` },
        el('div', { cls: 'mao-topo' }, el('strong', { textContent: id === eu ? 'Você' : this.c.nome(id) }), el('small', { textContent: m ? `🪙 ${m.aposta} · ${status}${m.cartas.length ? ` · ${pontos21(m.cartas)}` : ''}` : status })),
        el('div', { cls: 'cartas' }, ...(m?.cartas ?? []).map((c) => this.carta(c))),
        m?.ganho !== undefined ? el('small', { cls: m.ganho > m.aposta ? 'ganhou' : m.ganho === m.aposta ? '' : 'perdeu', textContent: m.ganho > m.aposta ? `Ganhou +${m.ganho - m.aposta}` : m.ganho === m.aposta ? 'Empatou (aposta de volta)' : `Perdeu ${m.aposta}` }) : null,
      );
    };
    const controles: (HTMLElement | null)[] = [];
    if (e.fase === 'apostas' && !minha)
      controles.push(
        el('div', { cls: 'fichas' }, ...FICHAS.map((v) => el('button', { cls: v === this.aposta21 ? 'ficha ativa' : 'ficha', textContent: String(v), onclick: () => ((this.aposta21 = v), this.desenhar()) }))),
        el('button', { cls: 'btn forte', textContent: `Apostar ${this.aposta21} 🪙`, onclick: () => this.c.mandar({ k: 'bj', a: 'apostar', v: this.aposta21 }) }),
      );
    if (e.fase === 'jogando' && e.vez === eu)
      controles.push(
        el('button', { cls: 'btn forte', textContent: '➕ Pedir carta', onclick: () => this.c.mandar({ k: 'bj', a: 'pedir' }) }),
        el('button', { cls: 'btn', textContent: '✋ Parar', onclick: () => this.c.mandar({ k: 'bj', a: 'parar' }) }),
        minha?.cartas.length === 2 ? el('button', { cls: 'btn', textContent: `✖2 Dobrar (+${minha.aposta})`, onclick: () => this.c.mandar({ k: 'bj', a: 'dobrar' }) }) : null,
      );
    const fase = { apostas: `Façam suas apostas · ${this.tempo(e.restanteMs)}`, jogando: e.vez === eu ? `Sua vez · ${this.tempo(e.restanteMs)}` : `Vez de ${e.vez ? this.c.nome(e.vez) : '...'}`, casa: 'A casa está jogando…', resultado: 'Resultado da rodada' }[e.fase];
    this.painel.replaceChildren(
      ...nos(
        el('div', { cls: 'mesa-topo' }, el('h3', { textContent: '🃏 21 contra a casa' }), el('span', { textContent: fase }), el('button', { cls: 'btn', textContent: 'Levantar', onclick: () => this.c.mandar({ k: 'mesa', mesa: '21', a: 'levantar' }) })),
        el('div', { cls: 'mao21 casa' }, el('div', { cls: 'mao-topo' }, el('strong', { textContent: '🏦 Casa' }), el('small', { textContent: e.casa.length ? String(pontos21(e.casa)) + (e.casa.includes('?') ? ' + ?' : '') : '' })), el('div', { cls: 'cartas' }, ...e.casa.map((c) => this.carta(c)))),
        el('div', { cls: 'maos21' }, ...(e.lugares.filter(Boolean) as string[]).map(linhaMao)),
        controles.length ? el('div', { cls: 'linha controles-mesa' }, ...nos(...controles)) : null,
        el('p', { cls: 'nota', textContent: 'Chegue o mais perto de 21 sem passar. A casa compra até 17. Blackjack (Ás + figura) paga 3 para 2. Apostas de 10 a 500 moedas.' }),
      ),
    );
  }

  private desenharTruco(): void {
    const e = this.truco!;
    const { el } = this.c;
    const eu = this.c.euId();
    const lugar = e.lugares.indexOf(eu);
    const meuTime = lugar % 2;
    const minhaVez = e.vez === lugar && !e.pedido;
    const respondo = e.pedido && e.pedido.de !== meuTime;
    const topo = el(
      'div',
      { cls: 'mesa-topo' },
      el('h3', { textContent: '🂡 Truco paulista' }),
      el('span', { cls: 'placar-truco', textContent: `Nós ${e.placar[meuTime]} x ${e.placar[1 - meuTime]} Eles` }),
      el('button', { cls: 'btn', textContent: 'Levantar', title: e.fase === 'jogando' ? 'Sair no meio entrega a partida' : '', onclick: () => this.c.mandar({ k: 'mesa', mesa: 'truco', a: 'levantar' }) }),
    );
    if (e.fase !== 'jogando') {
      const sentados = e.lugares.filter(Boolean).length;
      this.painel.replaceChildren(
        ...nos(
          topo,
          e.fase === 'fim' && e.vencedor !== null ? el('p', { cls: e.vencedor === meuTime ? 'ganhou' : 'perdeu', textContent: e.vencedor === meuTime ? '🏆 Vocês venceram!' : 'Vocês perderam.' }) : null,
          el('div', { cls: 'lugares-truco' }, ...e.lugares.map((id, i) => el('div', { cls: `lugar${i % 2 ? ' t1' : ' t0'}`, textContent: id ? (id === eu ? 'Você' : this.c.nome(id)) : 'livre' }))),
          el('p', { cls: 'nota', textContent: 'Lugares 1 e 3 são um time; 2 e 4 o outro. Joga 1 contra 1 (um de cada lado) ou 2 contra 2. Todos pagam a aposta e o time vencedor leva o pote.' }),
          el('div', { cls: 'fichas' }, ...APOSTAS_TRUCO.map((v) => el('button', { cls: v === this.apostaTruco ? 'ficha ativa' : 'ficha', textContent: `${v}`, onclick: () => ((this.apostaTruco = v), this.desenhar()) }))),
          el('button', { cls: 'btn forte', textContent: `Começar (${this.apostaTruco} 🪙 cada)`, disabled: !(sentados === 2 || sentados === 4), onclick: () => this.c.mandar({ k: 'mesa', mesa: 'truco', a: 'comecar', aposta: this.apostaTruco }) }),
        ),
      );
      return;
    }
    const nomeLugar = (l: number) => (e.lugares[l] === eu ? 'Você' : this.c.nome(e.lugares[l] ?? ''));
    const mostrar = e.mesa.length ? e.mesa : e.ultimaVaz ?? [];
    this.painel.replaceChildren(
      ...nos(
        topo,
        el(
          'div',
          { cls: 'truco-info' },
          el('div', { cls: 'vira' }, el('small', { textContent: 'Vira' }), this.carta(e.vira)),
          el('div', {}, el('strong', { textContent: `Mão vale ${e.valorMao}` }), el('small', { textContent: ` · vazes: ${e.vazas.map((v) => (v === null ? '=' : v === meuTime ? '✓' : '✗')).join(' ') || '—'}` })),
          el('small', { textContent: e.vez === null ? 'Próxima mão…' : e.pedido ? `Pediram ${NOME_PEDIDO[e.pedido.valor]}` : minhaVez ? `Sua vez · ${this.tempo(e.restanteMs)}` : `Vez de ${nomeLugar(e.vez)}` }),
        ),
        el('div', { cls: 'mesa-jogadas' }, ...mostrar.map((m) => el('div', { cls: 'jogada' }, this.carta(m.carta), el('small', { textContent: nomeLugar(m.lugar) })))),
        respondo
          ? el(
              'div',
              { cls: 'linha controles-mesa pedido' },
              el('strong', { textContent: `🗣️ ${NOME_PEDIDO[e.pedido!.valor]}!` }),
              el('button', { cls: 'btn forte', textContent: 'Aceitar', onclick: () => this.c.mandar({ k: 'truco', a: 'aceitar' }) }),
              el('button', { cls: 'btn', textContent: 'Correr', onclick: () => this.c.mandar({ k: 'truco', a: 'correr' }) }),
              e.pedido!.valor < 12 ? el('button', { cls: 'btn', textContent: NOME_VALOR[e.pedido!.valor] ?? 'Aumentar', onclick: () => this.c.mandar({ k: 'truco', a: 'trucar' }) }) : null,
            )
          : null,
        el('div', { cls: 'cartas mao-truco' }, ...this.mao.map((c, i) => this.carta(c, minhaVez ? () => this.c.mandar({ k: 'truco', a: 'jogar', i, encoberta: this.encoberta }) : undefined))),
        minhaVez
          ? el(
              'div',
              { cls: 'linha controles-mesa' },
              e.valorMao < 12 ? el('button', { cls: 'btn forte', textContent: NOME_VALOR[e.valorMao] ?? 'Truco!', onclick: () => this.c.mandar({ k: 'truco', a: 'trucar' }) }) : null,
              e.vazas.length > 0 ? el('label', { cls: 'encoberta' }, Object.assign(el('input', { type: 'checkbox', checked: this.encoberta }), { onchange: (ev: Event) => (this.encoberta = (ev.target as HTMLInputElement).checked) }), ' jogar encoberta') : null,
              el('small', { textContent: 'Clique numa carta para jogar.' }),
            )
          : null,
      ),
    );
  }
}
