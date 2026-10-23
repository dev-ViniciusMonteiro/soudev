// Roleta e caça-níqueis do Cassino. Perto da mesa da roleta (ou de uma máquina) aparece o botão; o painel abre
// e fecha sozinho quando você se afasta. O servidor sorteia, debita e paga; aqui só mostra e anima.

import { ALCANCE_ROLETA, ALCANCE_SLOT, APOSTAS_SLOT, type EstadoRoleta, type MsgClienteCartas, PAGA_ROLETA, PREMIOS_SLOT, ROLETA, SIMBOLOS_SLOT, SLOTS, type TipoApostaRoleta, VERMELHOS } from './protocolo';

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

const FICHAS = [10, 25, 50, 100, 250, 500];
const NOME_APOSTA: Record<TipoApostaRoleta, string> = { numero: 'nº', vermelho: 'Vermelho', preto: 'Preto', par: 'Par', impar: 'Ímpar', baixo: '1–18', alto: '19–36', duzia: 'Dúzia' };
const corDo = (n: number) => (n === 0 ? 'verde' : VERMELHOS.includes(n) ? 'vermelho' : 'preto');

export class CassinoUI {
  roleta: EstadoRoleta | null = null;
  private painel: HTMLElement;
  private botao: HTMLButtonElement;
  private aberto: 'roleta' | 'slot' | null = null;
  private ficha = 50;
  private apostaSlot = 25;
  private girando = false;
  private rolos = [0, 1, 2];
  private animacao = 0;
  private resultado: { rolos: number[]; ganho: number; aposta: number } | null = null;
  private ultimoGanho = '';

  constructor(private c: Contexto) {
    this.painel = c.el('div', { cls: 'mesa-cartas cassino', hidden: true });
    this.botao = c.el('button', { cls: 'botao-carro botao-mesa', hidden: true });
    c.app.append(this.painel, this.botao);
  }

  get emUso(): boolean {
    return this.aberto !== null;
  }

  /** Perto da roleta? Perto de alguma máquina? */
  private perto(): 'roleta' | 'slot' | null {
    const p = this.c.pos();
    if (Math.hypot(p.x - ROLETA[0], p.z - ROLETA[1]) < ALCANCE_ROLETA - 0.3) return 'roleta';
    if (SLOTS.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < ALCANCE_SLOT - 0.2)) return 'slot';
    return null;
  }

  receberRoleta(e: EstadoRoleta | null): void {
    const antes = this.roleta;
    this.roleta = e;
    if (e?.fase === 'resultado' && antes?.fase !== 'resultado' && e.numero !== null) {
      const eu = this.c.euId();
      const minhas = e.apostas.filter((a) => a.id === eu);
      if (minhas.length) {
        const ganho = minhas.reduce((s, a) => s + (a.ganho ?? 0), 0);
        const apostado = minhas.reduce((s, a) => s + a.v, 0);
        this.c.aviso(ganho > 0 ? `🎡 Deu ${e.numero}! Você ganhou ${ganho} moedas (apostou ${apostado}).` : `🎡 Deu ${e.numero}. Não foi dessa vez.`);
      }
    }
    if (this.aberto === 'roleta') this.desenharRoleta();
  }

  resultadoSlot(rolos: number[], aposta: number, ganho: number): void {
    this.resultado = { rolos, aposta, ganho };
  }

  /** Erro do servidor na roleta ou na máquina: para a animação. */
  erro(): void {
    this.girando = false;
    this.resultado = null;
    if (this.aberto === 'slot') this.desenharSlot();
  }

  /** A cada quadro: botão perto da roleta/máquina, fecha o painel longe, anima os rolos. */
  tick(ativo: boolean, agora: number): void {
    const perto = ativo ? this.perto() : null;
    if (this.aberto && this.aberto !== perto) this.fechar();
    this.botao.hidden = !perto || this.aberto === perto;
    if (perto && this.aberto !== perto) {
      this.botao.textContent = perto === 'roleta' ? '🎡 Apostar na roleta' : '🎰 Jogar no caça-níquel';
      this.botao.onclick = () => this.abrir(perto);
    }
    if (this.aberto === 'roleta' && this.roleta?.restanteMs) {
      // Relógio da rodada: redesenha a cada meio segundo.
      if (agora - this.animacao > 500) {
        this.animacao = agora;
        this.desenharRoleta();
      }
    }
    if (this.girando && this.aberto === 'slot') {
      if (agora - this.animacao > 70) {
        this.animacao = agora;
        // Para os rolos um de cada vez quando o resultado chegou.
        const r = this.resultado;
        const passou = agora - this.inicioGiro;
        this.rolos = this.rolos.map((v, i) => (r && passou > 700 + i * 350 ? r.rolos[i] : (v + 1 + Math.floor(Math.random() * 3)) % SIMBOLOS_SLOT.length));
        if (r && passou > 700 + 2 * 350) {
          this.girando = false;
          this.ultimoGanho = r.ganho > 0 ? `🎉 Ganhou ${r.ganho} moedas!` : 'Nada dessa vez.';
          if (r.ganho >= r.aposta * 25) this.c.aviso(`🎰 JACKPOT! +${r.ganho} moedas`);
          this.resultado = null;
        }
        this.desenharSlot();
      }
    }
  }

  private inicioGiro = 0;

  private abrir(qual: 'roleta' | 'slot'): void {
    this.aberto = qual;
    this.painel.hidden = false;
    if (qual === 'roleta') this.desenharRoleta();
    else this.desenharSlot();
  }

  fechar(): void {
    this.aberto = null;
    this.painel.hidden = true;
    this.girando = false;
  }

  private topo(titulo: string, info: string): HTMLElement {
    const { el } = this.c;
    return el('div', { cls: 'mesa-topo' }, el('h3', { textContent: titulo }), el('span', { textContent: info }), el('button', { cls: 'btn', textContent: 'Fechar', onclick: () => this.fechar() }));
  }

  private fichas(atual: number, lista: readonly number[], escolher: (v: number) => void): HTMLElement {
    const { el } = this.c;
    return el('div', { cls: 'fichas' }, ...lista.map((v) => el('button', { cls: v === atual ? 'ficha ativa' : 'ficha', textContent: String(v), onclick: () => escolher(v) })));
  }

  private desenharRoleta(): void {
    const { el } = this.c;
    const e = this.roleta;
    const eu = this.c.euId();
    const fase = e?.fase ?? 'apostas';
    const seg = e?.restanteMs ? Math.ceil(e.restanteMs / 1000) : null;
    const info = fase === 'apostas' ? (seg ? `Façam suas apostas · ${seg}s` : 'Faça a primeira aposta para girar') : fase === 'girando' ? 'Girando… 🎡' : `Deu ${e!.numero} (${corDo(e!.numero!)})`;
    const apostar = (tipo: TipoApostaRoleta, alvo?: number) => this.c.mandar({ k: 'roleta', tipo, alvo, v: this.ficha });
    const pode = fase === 'apostas';
    const b = (texto: string, cls: string, tipo: TipoApostaRoleta, alvo?: number) => el('button', { cls: `roleta-b ${cls}`, textContent: texto, disabled: !pode, onclick: () => apostar(tipo, alvo) });
    const numeros = el(
      'div',
      { cls: 'roleta-numeros' },
      b('0', 'verde zero', 'numero', 0),
      ...Array.from({ length: 36 }, (_, i) => {
        // Na ordem da mesa: 3 linhas (3, 6, 9… em cima).
        const col = Math.floor(i / 3);
        const lin = i % 3;
        const n = col * 3 + (3 - lin);
        const botao = b(String(n), corDo(n), 'numero', n);
        botao.style.gridColumn = String(col + 2);
        botao.style.gridRow = String(lin + 1);
        return botao;
      }),
    );
    const minhas = (e?.apostas ?? []).filter((a) => a.id === eu);
    const outras = (e?.apostas ?? []).filter((a) => a.id !== eu);
    this.painel.replaceChildren(
      this.topo('🎡 Roleta', info),
      el('div', { cls: 'roleta-historico' }, el('small', { textContent: 'Últimos:' }), ...(e?.historico ?? []).map((n) => el('span', { cls: `bola ${corDo(n)}`, textContent: String(n) }))),
      this.fichas(this.ficha, FICHAS, (v) => {
        this.ficha = v;
        this.desenharRoleta();
      }),
      numeros,
      el(
        'div',
        { cls: 'roleta-fora' },
        b('1ª dúzia', '', 'duzia', 1),
        b('2ª dúzia', '', 'duzia', 2),
        b('3ª dúzia', '', 'duzia', 3),
        b('1–18', '', 'baixo'),
        b('Par', '', 'par'),
        b('🔴', 'vermelho', 'vermelho'),
        b('⚫', 'preto', 'preto'),
        b('Ímpar', '', 'impar'),
        b('19–36', '', 'alto'),
      ),
      el(
        'div',
        { cls: 'roleta-apostas' },
        el('small', { textContent: minhas.length ? 'Suas apostas:' : 'Escolha a ficha e clique onde apostar.' }),
        ...minhas.map((a) => el('span', { cls: `chip-aposta${a.ganho ? ' ganhou' : a.ganho === 0 ? ' perdeu' : ''}`, textContent: `${a.tipo === 'numero' ? `nº ${a.alvo}` : a.tipo === 'duzia' ? `${a.alvo}ª dúzia` : NOME_APOSTA[a.tipo]} · ${a.v}${a.ganho ? ` → +${a.ganho}` : ''}` })),
        outras.length ? el('small', { textContent: `+ ${outras.length} aposta(s) de ${new Set(outras.map((a) => a.id)).size} pessoa(s)` }) : null,
      ),
      el('p', { cls: 'nota', textContent: `Número paga ${PAGA_ROLETA.numero - 1} para 1, dúzia 2 para 1, cor/par/metade 1 para 1. No zero só ganha quem apostou no 0. Apostas de 10 a 500, até 10 por rodada.` }),
    );
  }

  private desenharSlot(): void {
    const { el } = this.c;
    const girar = () => {
      if (this.girando) return;
      this.girando = true;
      this.resultado = null;
      this.ultimoGanho = '';
      this.inicioGiro = performance.now();
      this.c.mandar({ k: 'slot', v: this.apostaSlot });
      this.desenharSlot();
    };
    this.painel.replaceChildren(
      this.topo('🎰 Caça-níquel', this.girando ? 'Girando…' : this.ultimoGanho || 'Boa sorte!'),
      el('div', { cls: `slot-rolos${this.girando ? ' girando' : ''}` }, ...this.rolos.map((r) => el('div', { cls: 'slot-rolo', textContent: SIMBOLOS_SLOT[r] }))),
      this.fichas(this.apostaSlot, APOSTAS_SLOT, (v) => {
        this.apostaSlot = v;
        this.desenharSlot();
      }),
      el('button', { cls: 'btn forte grande', textContent: this.girando ? '…' : `🎰 Girar (${this.apostaSlot} 🪙)`, disabled: this.girando, onclick: girar }),
      el('div', { cls: 'slot-tabela' }, ...SIMBOLOS_SLOT.map((s, i) => el('span', { textContent: `${s}${s}${s} ×${PREMIOS_SLOT[i]}` })), el('span', { textContent: '🍒🍒 devolve a aposta' })),
    );
  }
}
